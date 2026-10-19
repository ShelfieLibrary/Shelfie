from core.database import supabase


def register_user(email: str, password: str, display_name: str):
    response = supabase.auth.sign_up(
        {
            "email": email,
            "password": password,
            "options": {"data": {"display_name": display_name.strip()}},
        }
    )

    if not response.user:
        raise ValueError("Registration failed.")

    return {
        "success": True,
        "message": "Account created successfully",
        "user_id": str(response.user.id),
    }


def login_user(email: str, password: str):
    response = supabase.auth.sign_in_with_password(
        {"email": email, "password": password}
    )

    if not response.user or not response.session:
        raise ValueError("Login failed.")

    user_id = str(response.user.id)
    profile_response = (
        supabase.table("profiles")
        .select("display_name,role,account_status")
        .eq("id", user_id)
        .execute()
    )

    if not profile_response.data:
        raise ValueError("User profile could not be found.")

    profile = profile_response.data[0]
    if profile["account_status"] != "active":
        raise ValueError("This account is not active.")

    return {
        "success": True,
        "message": "Login successful",
        "access_token": response.session.access_token,
        "user": {
            "id": user_id,
            "email": response.user.email,
            "display_name": profile["display_name"],
            "role": profile["role"],
            "account_status": profile["account_status"],
        },
    }


def logout_user():
    supabase.auth.sign_out()
    return {"success": True, "message": "Logout successful"}
