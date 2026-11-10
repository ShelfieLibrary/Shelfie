from core.database import supabase


STATUSES = ("reading", "want_to_read", "completed")
AVATARS = {"book", "fox", "owl", "cat", "bear", "panda", "frog", "penguin", "rabbit", "koala"}


def get_profile(user_id: str):
    profile = (
        supabase.table("profiles")
        .select("id, display_name, avatar_url")
        .eq("id", user_id)
        .execute()
        .data
    )
    if not profile:
        raise LookupError("Profile not found.")

    shelf_rows = (
        supabase.table("user_books")
        .select("status, updated_at, books(*)")
        .eq("user_id", user_id)
        .order("updated_at", desc=True)
        .execute()
        .data
    )
    shelf = {status: [] for status in STATUSES}
    for row in shelf_rows:
        if row.get("books"):
            book = {**row["books"], "authors": row["books"].get("authors") or []}
            shelf[row["status"]].append(book)

    reviews = (
        supabase.table("book_reviews")
        .select("id, rating, review_text, created_at, books(*)")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
        .data
    )

    return {
        "success": True,
        "profile": profile[0],
        "shelf": shelf,
        "counts": {status: len(books) for status, books in shelf.items()},
        "reviews": reviews,
    }


def update_profile(user_id: str, display_name: str | None, avatar: str | None):
    changes = {}

    if display_name is not None:
        name = display_name.strip()
        if not name:
            raise ValueError("Display name cannot be empty.")
        changes["display_name"] = name

    if avatar is not None:
        if avatar not in AVATARS:
            raise ValueError("Please choose one of the preset avatars.")
        changes["avatar_url"] = avatar

    if not changes:
        raise ValueError("There are no changes to save.")

    response = (
        supabase.table("profiles")
        .update(changes)
        .eq("id", user_id)
        .execute()
    )
    if not response.data:
        raise LookupError("Profile not found.")

    return {"success": True, "message": "Profile updated.", "profile": response.data[0]}
