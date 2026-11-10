from fastapi import APIRouter, Depends, HTTPException

from core.auth import get_authenticated_user, get_optional_user
from profiles.schemas import ProfileUpdateRequest
from profiles.service import get_profile, update_profile


router = APIRouter(prefix="/api/profiles", tags=["profiles"])


@router.put("/me")
def update_me(data: ProfileUpdateRequest, user=Depends(get_authenticated_user)):
    try:
        return update_profile(str(user.id), data.display_name, data.avatar)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except LookupError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error


@router.get("/{user_id}")
def profile(user_id: str, _viewer=Depends(get_optional_user)):
    try:
        return get_profile(user_id)
    except Exception as error:
        raise HTTPException(status_code=404, detail="Profile not found.") from error
