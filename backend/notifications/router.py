from fastapi import APIRouter, Depends, HTTPException

from core.auth import get_authenticated_user
from notifications import service


router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("")
def notifications(user=Depends(get_authenticated_user)):
    return service.list_notifications(str(user.id))


@router.get("/unread")
def unread(user=Depends(get_authenticated_user)):
    return service.unread_count(str(user.id))


@router.post("/read-all")
def read_all(user=Depends(get_authenticated_user)):
    return service.mark_all_read(str(user.id))


@router.post("/{notification_id}/read")
def read(notification_id: int, user=Depends(get_authenticated_user)):
    try:
        return service.mark_read(str(user.id), notification_id)
    except LookupError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
