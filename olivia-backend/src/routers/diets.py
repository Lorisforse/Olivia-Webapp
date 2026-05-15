from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId

from src.database import get_database
from src.schemas.diet import DietCreate, DietResponse, DietUpdate

router = APIRouter()


def _to_response(doc: dict) -> DietResponse:
    return DietResponse(
        id=str(doc["_id"]),
        name=doc.get("name", ""),
        tips=doc.get("tips", []),
        weekly_plan=doc.get("weekly_plan", {}),
        substitutions=doc.get("substitutions", ""),
    )


@router.get("/", response_model=list[DietResponse])
async def list_diets(db=Depends(get_database)):
    docs = await db["diet-plans"].find().to_list(length=None)
    return [_to_response(doc) for doc in docs]


@router.post("/", response_model=DietResponse, status_code=201)
async def create_diet(payload: DietCreate, db=Depends(get_database)):
    result = await db["diet-plans"].insert_one(payload.model_dump())
    doc = await db["diet-plans"].find_one({"_id": result.inserted_id})
    return _to_response(doc)


@router.get("/{diet_id}", response_model=DietResponse)
async def get_diet(diet_id: str, db=Depends(get_database)):
    try:
        oid = ObjectId(diet_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Diet not found")
    doc = await db["diet-plans"].find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Diet not found")
    return _to_response(doc)


@router.patch("/{diet_id}", response_model=DietResponse)
async def update_diet(diet_id: str, payload: DietUpdate, db=Depends(get_database)):
    try:
        oid = ObjectId(diet_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Diet not found")
    doc = await db["diet-plans"].find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Diet not found")

    updates = payload.model_dump(exclude_none=True)
    if updates:
        await db["diet-plans"].update_one({"_id": oid}, {"$set": updates})

    doc = await db["diet-plans"].find_one({"_id": oid})
    return _to_response(doc)


@router.delete("/{diet_id}", status_code=204)
async def delete_diet(diet_id: str, db=Depends(get_database)):
    try:
        oid = ObjectId(diet_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Diet not found")
    result = await db["diet-plans"].delete_one({"_id": oid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Diet not found")
