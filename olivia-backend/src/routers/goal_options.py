import re
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException

from src.database import get_database, get_goal_options_col
from src.schemas.goal_option import GoalOptionCreate, GoalOptionResponse

router = APIRouter()


@router.get("", response_model=list[GoalOptionResponse])
async def list_goal_options(db=Depends(get_database)):
    col = get_goal_options_col(db)
    docs = await col.find().sort("value", 1).to_list(length=None)
    return [GoalOptionResponse(id=str(d["_id"]), value=d["value"], created_at=d["created_at"]) for d in docs]


@router.post("", response_model=GoalOptionResponse, status_code=201)
async def create_goal_option(payload: GoalOptionCreate, db=Depends(get_database)):
    value = payload.value.strip()
    if not value:
        raise HTTPException(status_code=400, detail="Il valore non può essere vuoto")

    col = get_goal_options_col(db)
    # Case-insensitive: evita duplicati tipo "Perdita peso" / "perdita peso".
    existing = await col.find_one({"value": {"$regex": f"^{re.escape(value)}$", "$options": "i"}})
    if existing:
        return GoalOptionResponse(id=str(existing["_id"]), value=existing["value"], created_at=existing["created_at"])

    doc = {"value": value, "created_at": datetime.now()}
    result = await col.insert_one(doc)
    return GoalOptionResponse(id=str(result.inserted_id), value=value, created_at=doc["created_at"])
