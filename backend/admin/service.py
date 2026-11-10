from datetime import datetime, timezone

from core.database import admin_supabase


def _count(table: str, **filters):
    query = admin_supabase.table(table).select("*", count="exact", head=True)
    for column, value in filters.items():
        query = query.eq(column, value)
    return query.execute().count or 0


def platform_stats():
    return {
        "success": True,
        "stats": {
            "users": _count("profiles"),
            "books": _count("books"),
            "reviews": _count("book_reviews"),
            "pending_flags": _count("content_flags", status="pending"),
        },
    }


def list_users():
    profiles = (
        admin_supabase.table("profiles")
        .select("id, display_name, avatar_url, role, account_status, created_at")
        .order("created_at")
        .execute()
        .data
    )
    emails = {
        str(auth_user.id): auth_user.email
        for auth_user in admin_supabase.auth.admin.list_users(per_page=1000)
    }
    users = [{**profile, "email": emails.get(profile["id"])} for profile in profiles]
    return {"success": True, "users": users}


def update_user(admin_id: str, user_id: str, role: str | None, account_status: str | None):
    if user_id == admin_id:
        raise ValueError("You cannot change your own role or account status.")

    changes = {key: value for key, value in
               {"role": role, "account_status": account_status}.items() if value}
    if not changes:
        raise ValueError("There are no changes to save.")

    response = admin_supabase.table("profiles").update(changes).eq("id", user_id).execute()
    if not response.data:
        raise LookupError("This user no longer exists.")
    return {"success": True, "message": "User updated.", "user": response.data[0]}


def moderation_queue(status: str):
    flags = (
        admin_supabase.table("content_flags")
        .select("id, review_id, user_id, reason, status, reviewed_by, reviewed_at, created_at, "
                "book_reviews(id, user_id, rating, review_text, books(id, title))")
        .eq("status", status)
        .order("created_at", desc=True)
        .execute()
        .data
    )

    profile_ids = {flag["user_id"] for flag in flags}
    profile_ids |= {flag["book_reviews"]["user_id"] for flag in flags if flag.get("book_reviews")}
    profile_ids |= {flag["reviewed_by"] for flag in flags if flag.get("reviewed_by")}
    names = {
        row["id"]: row["display_name"]
        for row in admin_supabase.table("profiles")
        .select("id, display_name")
        .in_("id", list(profile_ids) or [""])
        .execute()
        .data
    }

    grouped = {}
    for flag in flags:
        review = flag.get("book_reviews")
        key = flag["review_id"] or f"deleted-{flag['id']}"
        item = grouped.setdefault(key, {
            "review_id": flag["review_id"],
            "status": flag["status"],
            "review": review and {
                "rating": review["rating"],
                "review_text": review["review_text"],
                "author": names.get(review["user_id"], "Shelfie Reader"),
                "book_title": (review.get("books") or {}).get("title"),
            },
            "reviewed_by": names.get(flag["reviewed_by"]),
            "reviewed_at": flag["reviewed_at"],
            "reports": [],
        })
        item["reports"].append({
            "reporter": names.get(flag["user_id"], "Shelfie Reader"),
            "reason": flag["reason"],
            "created_at": flag["created_at"],
        })

    return {"success": True, "items": list(grouped.values())}


def _close_flags(review_id: int, status: str, admin_id: str | None):
    admin_supabase.table("content_flags").update({
        "status": status,
        "reviewed_by": admin_id,
        "reviewed_at": datetime.now(timezone.utc).isoformat(),
    }).eq("review_id", review_id).eq("status", "pending").execute()


def resolve_review(admin_id: str, review_id: int):
    _close_flags(review_id, "resolved", admin_id)
    response = admin_supabase.table("book_reviews").delete().eq("id", review_id).execute()
    if not response.data:
        raise LookupError("This review no longer exists.")
    return {"success": True, "message": "Review removed and flags resolved."}


def dismiss_flags(admin_id: str, review_id: int):
    _close_flags(review_id, "dismissed", admin_id)
    return {"success": True, "message": "Flags dismissed. The review stays visible."}


def resolve_flags_for_deleted_review(review_id: int):
    if admin_supabase:
        _close_flags(review_id, "resolved", None)
