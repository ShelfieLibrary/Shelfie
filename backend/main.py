import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client, Client


# =========================================================
# ENVIRONMENT / SUPABASE SETUP
# =========================================================

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("Supabase environment variables are missing.")

supabase: Client = create_client(
    SUPABASE_URL,
    SUPABASE_KEY
)


# =========================================================
# FASTAPI SETUP
# =========================================================

app = FastAPI(title="Shelfie API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# REQUEST MODELS
# =========================================================

class RegisterRequest(BaseModel):
    email: str
    password: str
    display_name: str


class LoginRequest(BaseModel):
    email: str
    password: str


# =========================================================
# BASIC ROUTES
# =========================================================

@app.get("/")
def home():
    return {
        "message": "Shelfie API is running"
    }


@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "database": "Supabase configured"
    }


# =========================================================
# REGISTRATION
# =========================================================

@app.post("/api/register")
def register_user(data: RegisterRequest):
    try:
        response = supabase.auth.sign_up({
            "email": data.email,
            "password": data.password,
            "options": {
                "data": {
                    "display_name": data.display_name
                }
            }
        })

        if not response.user:
            return {
                "success": False,
                "message": "Registration failed"
            }

        return {
            "success": True,
            "message": "Account created successfully",
            "user_id": str(response.user.id)
        }

    except Exception as error:
        return {
            "success": False,
            "message": str(error)
        }


# =========================================================
# LOGIN
# =========================================================

@app.post("/api/login")
def login_user(data: LoginRequest):
    try:
        response = supabase.auth.sign_in_with_password({
            "email": data.email,
            "password": data.password
        })

        if not response.user or not response.session:
            return {
                "success": False,
                "message": "Login failed"
            }

        user_id = str(response.user.id)

        profile_response = (
            supabase.table("profiles")
            .select("display_name, role, account_status")
            .eq("id", user_id)
            .execute()
        )

        if not profile_response.data:
            return {
                "success": False,
                "message": "User profile could not be found."
            }

        profile = profile_response.data[0]

        return {
            "success": True,
            "message": "Login successful",
            "access_token": response.session.access_token,
            "user": {
                "id": user_id,
                "email": response.user.email,
                "display_name": profile["display_name"],
                "role": profile["role"],
                "account_status": profile["account_status"]
            }
        }

    except Exception as error:
        return {
            "success": False,
            "message": str(error)
        }


# =========================================================
# LOGOUT
# =========================================================

@app.post("/api/logout")
def logout_user():
    try:
        supabase.auth.sign_out()

        return {
            "success": True,
            "message": "Logout successful"
        }

    except Exception as error:
        return {
            "success": False,
            "message": str(error)
        }