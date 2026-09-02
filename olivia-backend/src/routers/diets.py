import urllib.parse
from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import Response
from starlette.concurrency import run_in_threadpool

from src.database import get_database
from src.models.helpers import sanitize_bson
from src.nutrition_plan_pdf import MAX_PDF_BYTES, PdfParsingError, parse_nutrition_plan_pdf
from src.schemas.diet import DietCreate, DietPdfInfo, DietResponse, DietUpdate, ParsedPlanResponse

router = APIRouter()

# Il bot (olivia-chatbot) salva i piani nutrizionali nella collection "nutrition-plans"
# con il campo "meal_plan". L'API della webapp espone questi stessi dati come
# "weekly_plan" per compatibilità col frontend esistente: la conversione avviene
# solo qui, al confine tra Mongo e l'API.
#
# Il PDF originale del piano NON sta in "nutrition-plans" (il bot non lo usa e non
# lo conosce): sta nella collection solo-webapp "webapp-diet-pdfs", un documento
# per piano, con `plan_id` -> "nutrition-plans". Vedi src/database.py.

_PLANS = "nutrition-plans"
_PDFS = "webapp-diet-pdfs"


def _oid(diet_id: str) -> ObjectId:
    try:
        return ObjectId(diet_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Diet not found")


def _created_at(doc: dict) -> datetime | None:
    _id = doc.get("_id")
    return _id.generation_time if isinstance(_id, ObjectId) else None


def _to_response(doc: dict, *, has_pdf: bool) -> DietResponse:
    return DietResponse(
        id=str(doc["_id"]),
        name=doc.get("name", ""),
        tips=doc.get("tips", []),
        weekly_plan=doc.get("meal_plan", {}),
        # le regole di sostituzione vere hanno ObjectId annidati (rule_id):
        # vanno convertiti in stringa prima che pydantic provi a serializzarli
        substitutions=sanitize_bson(doc.get("substitutions", "")),
        created_at=_created_at(doc),
        has_pdf=has_pdf,
    )


def _to_mongo_doc(payload: DietCreate) -> dict:
    return {
        "name": payload.name,
        "tips": payload.tips,
        "meal_plan": payload.weekly_plan,
        "substitutions": payload.substitutions,
    }


def _validate_pdf_bytes(data: bytes) -> None:
    if not data:
        raise HTTPException(status_code=400, detail="File vuoto")
    if len(data) > MAX_PDF_BYTES:
        raise HTTPException(status_code=413, detail="Il PDF supera i 10 MB")
    if not data.startswith(b"%PDF"):
        raise HTTPException(status_code=400, detail="Il file non è un PDF")


async def _plan_has_pdf(db, oid: ObjectId) -> bool:
    return await db[_PDFS].find_one({"plan_id": oid}, {"_id": 1}) is not None


@router.get("/", response_model=list[DietResponse])
async def list_diets(db=Depends(get_database)):
    docs = await db[_PLANS].find().to_list(length=None)
    with_pdf = set(await db[_PDFS].distinct("plan_id"))
    return [_to_response(doc, has_pdf=doc["_id"] in with_pdf) for doc in docs]


@router.post("/", response_model=DietResponse, status_code=201)
async def create_diet(payload: DietCreate, db=Depends(get_database)):
    result = await db[_PLANS].insert_one(_to_mongo_doc(payload))
    doc = await db[_PLANS].find_one({"_id": result.inserted_id})
    return _to_response(doc, has_pdf=False)


@router.post("/parse-pdf", response_model=ParsedPlanResponse)
async def parse_diet_pdf(file: UploadFile = File(...)):
    """Estrae la griglia settimanale + i consigli da un PDF, SENZA salvare nulla.
    Il frontend pre-compila l'editor con il risultato; il medico rivede e poi
    crea il piano via POST /diets/."""
    data = await file.read()
    _validate_pdf_bytes(data)
    try:
        parsed = await run_in_threadpool(parse_nutrition_plan_pdf, data)
    except PdfParsingError as exc:
        raise HTTPException(status_code=422, detail=f"PDF non leggibile: {exc}")
    return ParsedPlanResponse(
        weekly_plan=parsed.weekly_plan,
        tips=parsed.tips,
        warnings=parsed.warnings,
    )


@router.get("/{diet_id}", response_model=DietResponse)
async def get_diet(diet_id: str, db=Depends(get_database)):
    oid = _oid(diet_id)
    doc = await db[_PLANS].find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Diet not found")
    return _to_response(doc, has_pdf=await _plan_has_pdf(db, oid))


@router.patch("/{diet_id}", response_model=DietResponse)
async def update_diet(diet_id: str, payload: DietUpdate, db=Depends(get_database)):
    oid = _oid(diet_id)
    doc = await db[_PLANS].find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Diet not found")

    updates = payload.model_dump(exclude_none=True)
    if "weekly_plan" in updates:
        updates["meal_plan"] = updates.pop("weekly_plan")
    if updates:
        await db[_PLANS].update_one({"_id": oid}, {"$set": updates})

    doc = await db[_PLANS].find_one({"_id": oid})
    return _to_response(doc, has_pdf=await _plan_has_pdf(db, oid))


@router.delete("/{diet_id}", status_code=204)
async def delete_diet(diet_id: str, db=Depends(get_database)):
    oid = _oid(diet_id)
    result = await db[_PLANS].delete_one({"_id": oid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Diet not found")
    # cascade: via anche il PDF archiviato per questo piano
    await db[_PDFS].delete_many({"plan_id": oid})


@router.post("/{diet_id}/pdf", response_model=DietPdfInfo)
async def upload_diet_pdf(diet_id: str, file: UploadFile = File(...), db=Depends(get_database)):
    """Archivia (o sostituisce) il PDF originale del piano nella collection
    solo-webapp "webapp-diet-pdfs". Un solo PDF per piano."""
    oid = _oid(diet_id)
    if not await db[_PLANS].find_one({"_id": oid}, {"_id": 1}):
        raise HTTPException(status_code=404, detail="Diet not found")

    data = await file.read()
    _validate_pdf_bytes(data)

    now = datetime.now(timezone.utc)
    doc = {
        "plan_id": oid,
        "filename": (file.filename or "dieta.pdf").strip() or "dieta.pdf",
        "content_type": "application/pdf",
        "size": len(data),
        "content": data,
        "uploaded_at": now,
    }
    await db[_PDFS].replace_one({"plan_id": oid}, doc, upsert=True)
    return DietPdfInfo(filename=doc["filename"], size=doc["size"], uploaded_at=now)


@router.get("/{diet_id}/pdf")
async def download_diet_pdf(diet_id: str, db=Depends(get_database)):
    oid = _oid(diet_id)
    doc = await db[_PDFS].find_one({"plan_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Nessun PDF per questo piano")

    filename = (doc.get("filename") or "dieta.pdf").replace('"', "")
    ascii_name = filename.encode("ascii", "ignore").decode() or "dieta.pdf"
    disposition = f"inline; filename=\"{ascii_name}\"; filename*=UTF-8''{urllib.parse.quote(filename)}"
    return Response(
        content=bytes(doc["content"]),
        media_type="application/pdf",
        headers={"Content-Disposition": disposition},
    )
