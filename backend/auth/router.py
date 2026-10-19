from fastapi import APIRouter, Depends, HTTPException

from auth import service
from auth.schemas import LoginRequest, RegisterRequest
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


@router.get("/session")
def session(user=Depends(get_authenticated_user)):
    return {
        "success": True,
        "message": "Session is valid",
        "user_id": str(user.id),
        "email": user.email,
    }


@router.post("/logout")
def logout():
    try:
        return service.logout_user()
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error)) from error
