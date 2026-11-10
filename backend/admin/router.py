from fastapi import APIRouter, Depends, HTTPException

from admin import service
from admin.schemas import AnnouncementRequest, UserUpdateRequest
from core.auth import get_authenticated_user
from core.database import admin_supabase, supabase
from notifications.service import send_announcement


router = APIRouter(prefix="/api/admin", tags=["admin"])


def require_admin(user=Depends(get_authenticated_user)):
    profile = (
        supabase.table("profiles")
        .select("role, account_status")
        .eq("id", str(user.id))
        .execute()
        .data
    )
    if not profile or profile[0]["role"] != "admin" or profile[0]["account_status"] != "active":
        raise HTTPException(status_code=403, detail="Administrator access is required.")
    if not admin_supabase:
        raise HTTPException(status_code=503, detail="SUPABASE_SERVICE_KEY is not configured.")
    return user


def run(action, *args):
    try:
        return action(*args)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except LookupError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error


@router.get("/stats")
def stats(_admin=Depends(require_admin)):
    return service.platform_stats()


@router.get("/users")
def users(_admin=Depends(require_admin)):
    return service.list_users()


@router.patch("/users/{user_id}")
def update_user(user_id: str, data: UserUpdateRequest, admin=Depends(require_admin)):
    return run(service.update_user, str(admin.id), user_id, data.role, data.account_status)


@router.get("/flags")
def flags(status: str = "pending", _admin=Depends(require_admin)):
    if status not in {"pending", "resolved", "dismissed"}:
        raise HTTPException(status_code=400, detail="Invalid status.")
    return service.moderation_queue(status)


@router.post("/reviews/{review_id}/resolve")
def resolve(review_id: int, admin=Depends(require_admin)):
    return run(service.resolve_review, str(admin.id), review_id)


@router.post("/reviews/{review_id}/dismiss")
def dismiss(review_id: int, admin=Depends(require_admin)):
    return run(service.dismiss_flags, str(admin.id), review_id)


@router.delete("/reviews/{review_id}")
def delete_review(review_id: int, admin=Depends(require_admin)):
    return run(service.resolve_review, str(admin.id), review_id)


@router.post("/announcements")
def announce(data: AnnouncementRequest, _admin=Depends(require_admin)):
    return run(send_announcement, data.message)
