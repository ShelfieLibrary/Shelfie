from fastapi import APIRouter, Depends, HTTPException

from auth import service
from auth.schemas import LoginRequest, RefreshRequest, RegisterRequest
from core.auth import get_authenticated_user


router = APIRouter(prefix="/api", tags=["authentication"])


@router.post("/register")
def register(data: RegisterRequest):
    try:
        return service.register_user(data.email, data.password, data.display_name)
    except Exception as error:
        return {"success": False, "message": str(error)}


@router.post("/login")
def login(data: LoginRequest):
    try:
        return service.login_user(data.email, data.password)
    except Exception as error:
        return {"success": False, "message": str(error)}


@router.post("/refresh")
def refresh(data: RefreshRequest):
    try:
        return service.refresh_user_session(data.refresh_token)
    except Exception as error:
        raise HTTPException(status_code=401, detail=str(error)) from error


@router.get("/session")
def session(user=Depends(get_authenticated_user)):
    try:
        return {"success": True, "user": service.get_user_profile(user)}
    except ValueError as error:
        raise HTTPException(status_code=401, detail=str(error)) from error


@router.post("/logout")
def logout():
    try:
        return service.logout_user()
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error)) from error