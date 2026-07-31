from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends

from ..activity import build_activity_feed
from ..ranking import build_global_ranking
from ..session import require_session

router = APIRouter()


@router.get("/ranking")
def get_ranking(_: str = Depends(require_session)) -> dict[str, Any]:
    return {"ranking": build_global_ranking()}


@router.get("/activity")
def get_activity(account_id: str = Depends(require_session)) -> dict[str, Any]:
    return {"activity": build_activity_feed(account_id)}
