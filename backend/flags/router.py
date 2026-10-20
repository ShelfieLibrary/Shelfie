from fastapi import APIRouter, Depends, HTTPException

from core.auth import get_authenticated_user
from core.errors import database_error
from flags import service
from flags.schemas import FlagCreateRequest


router = APIRouter(prefix="/api", tags=["flags"])


@router.post("/reviews/{review_id}/flags", status_code=201)
def flag_review(
    review_id: int,
    data: FlagCreateRequest,
    user=Depends(get_authenticated_user),
):
    try:
        return service.flag_review(str(user.id), review_id, data.reason)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except LookupError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except Exception as error:
        database_error(error, "You have already flagged this review.")