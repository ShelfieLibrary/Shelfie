from fastapi import APIRouter, Depends, HTTPException

from core.auth import get_authenticated_user
from shelf.schemas import ShelfRequest
from shelf.service import add_to_shelf


router = APIRouter(prefix="/api/shelf", tags=["reading lists"])


@router.post("")
def add(data: ShelfRequest, user=Depends(get_authenticated_user)):
    try:
        return add_to_shelf(str(user.id), data.book, data.status)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error)) from error
