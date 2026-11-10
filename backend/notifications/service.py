from core.database import admin_supabase, supabase


def list_notifications(user_id: str):
    notifications = (
        supabase.table("notifications")
        .select("id, type, message, is_read, created_at, review_id, books(*)")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(100)
        .execute()
        .data
    )
    unread = sum(1 for notification in notifications if not notification["is_read"])
    return {"success": True, "unread": unread, "notifications": notifications}


def unread_count(user_id: str):
    response = (
        supabase.table("notifications")
        .select("id", count="exact", head=True)
        .eq("user_id", user_id)
        .eq("is_read", False)
        .execute()
    )
    return {"success": True, "unread": response.count or 0}


def mark_read(user_id: str, notification_id: int):
    response = (
        supabase.table("notifications")
        .update({"is_read": True})
        .eq("id", notification_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not response.data:
        raise LookupError("Notification not found.")
    return {"success": True}


def mark_all_read(user_id: str):
    supabase.table("notifications").update({"is_read": True}).eq("user_id", user_id).eq(
        "is_read", False
    ).execute()
    return {"success": True, "message": "All notifications marked as read."}


def notify_new_review(author_id: str, author_name: str, book: dict, review_id: int):
    if not admin_supabase:
        return

    readers = (
        admin_supabase.table("user_books")
        .select("user_id")
        .eq("book_id", book["id"])
        .neq("user_id", author_id)
        .execute()
        .data
    )
    rows = [
        {
            "user_id": reader["user_id"],
            "type": "new_review",
            "message": f"{author_name} reviewed {book['title']}, a book on your reading list.",
            "book_id": book["id"],
            "review_id": review_id,
        }
        for reader in readers
    ]
    if rows:
        admin_supabase.table("notifications").insert(rows).execute()


def send_announcement(message: str):
    text = message.strip()
    if not text:
        raise ValueError("The announcement cannot be empty.")

    users = admin_supabase.table("profiles").select("id").execute().data
    rows = [{"user_id": user["id"], "type": "announcement", "message": text} for user in users]
    if rows:
        admin_supabase.table("notifications").insert(rows).execute()
    return {"success": True, "message": f"Announcement sent to {len(rows)} users."}
