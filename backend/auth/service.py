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

    return {
        "success": True,
        "message": "Login successful",
        "access_token": response.session.access_token,
        "refresh_token": response.session.refresh_token,
        "user": get_user_profile(response.user),
    }


def refresh_user_session(refresh_token: str):
    response = supabase.auth.refresh_session(refresh_token)

    if not response.user or not response.session:
        raise ValueError("Session expired. Please sign in again.")

    return {
        "success": True,
        "access_token": response.session.access_token,
        "refresh_token": response.session.refresh_token,
        "user": get_user_profile(response.user),
    }


def get_user_profile(auth_user):
    user_id = str(auth_user.id)
    profile_response = (
        supabase.table("profiles")
        .select("display_name,avatar_url,role,account_status")
        .eq("id", user_id)
        .execute()
    )

    if not profile_response.data:
        raise ValueError("User profile could not be found.")

    return {"id": user_id, "email": auth_user.email, **profile_response.data[0]}


def logout_user():
    supabase.auth.sign_out()
    return {"success": True, "message": "Logout successful"}