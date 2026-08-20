from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId

from src.database import get_database
from src.models.helpers import sanitize_bson
from src.schemas.diet import DietCreate, DietResponse, DietUpdate

router = APIRouter()

# Il bot (olivia-chatbot) salva i piani nutrizionali nella collection "nutrition-plans"
# con il campo "meal_plan". L'API della webapp espone questi stessi dati come
# "weekly_plan" per compatibilità col frontend esistente: la conversione avviene
# solo qui, al confine tra Mongo e l'API.


def _to_response(doc: dict) -> DietResponse:
    return DietResponse(
        id=str(doc["_id"]),
        name=doc.get("name", ""),
        tips=doc.get("tips", []),
        weekly_plan=doc.get("meal_plan", {}),
        # le regole di sostituzione vere hanno ObjectId annidati (rule_id):
        # vanno convertiti in stringa prima che pydantic provi a serializzarli
        substitutions=sanitize_bson(doc.get("substitutions", "")),
    )


def _to_mongo_doc(payload: DietCreate) -> dict:
    return {
        "name": payload.name,
        "tips": payload.tips,
        "meal_plan": payload.weekly_plan,
        "substitutions": payload.substitutions,
    }


@router.get("/", response_model=list[DietResponse])
async def list_diets(db=Depends(get_database)):
    docs = await db["nutrition-plans"].find().to_list(length=None)
    return [_to_response(doc) for doc in docs]


@router.post("/", response_model=DietResponse, status_code=201)
async def create_diet(payload: DietCreate, db=Depends(get_database)):
    result = await db["nutrition-plans"].insert_one(_to_mongo_doc(payload))
    doc = await db["nutrition-plans"].find_one({"_id": result.inserted_id})
    return _to_response(doc)


@router.get("/{diet_id}", response_model=DietResponse)
async def get_diet(diet_id: str, db=Depends(get_database)):
    try:
        oid = ObjectId(diet_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Diet not found")
    doc = await db["nutrition-plans"].find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Diet not found")
    return _to_response(doc)


@router.patch("/{diet_id}", response_model=DietResponse)
async def update_diet(diet_id: str, payload: DietUpdate, db=Depends(get_database)):
    try:
        oid = ObjectId(diet_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Diet not found")
    doc = await db["nutrition-plans"].find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Diet not found")

    updates = payload.model_dump(exclude_none=True)
    if "weekly_plan" in updates:
        updates["meal_plan"] = updates.pop("weekly_plan")
    if updates:
        await db["nutrition-plans"].update_one({"_id": oid}, {"$set": updates})

    doc = await db["nutrition-plans"].find_one({"_id": oid})
    return _to_response(doc)


@router.delete("/{diet_id}", status_code=204)
async def delete_diet(diet_id: str, db=Depends(get_database)):
    try:
        oid = ObjectId(diet_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Diet not found")
    result = await db["nutrition-plans"].delete_one({"_id": oid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Diet not found")
