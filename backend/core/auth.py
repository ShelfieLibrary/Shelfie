from fastapi import Header, HTTPException

from core.database import supabase


def get_authenticated_user(authorization: str = Header(...)):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header.")

    token = authorization.split(" ", 1)[1]

    try:
        supabase.postgrest.auth(token)
        response = supabase.auth.get_user(token)

        if not response.user:
            raise HTTPException(status_code=401, detail="Invalid or expired session.")

        return response.user
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired session.",
        ) from error
