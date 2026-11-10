from books.schemas import BookData
from books.service import save_book
from core.database import supabase


VALID_STATUSES = {"want_to_read", "reading", "completed"}


def add_to_shelf(user_id: str, book: BookData, status: str):
    if status not in VALID_STATUSES:
        raise ValueError("Invalid shelf status.")

    save_book(book)
    supabase.table("user_books").upsert(
        {"user_id": user_id, "book_id": book.id, "status": status},
        on_conflict="user_id,book_id",
    ).execute()

    return {
        "success": True,
        "message": "Reading list updated.",
        "book_id": book.id,
        "status": status,
    }


def get_shelf_status(user_id: str, book_id: str):
    response = (
        supabase.table("user_books")
        .select("status")
        .eq("user_id", user_id)
        .eq("book_id", book_id)
        .execute()
    )
    return {"success": True, "status": response.data[0]["status"] if response.data else None}


def remove_from_shelf(user_id: str, book_id: str):
    supabase.table("user_books").delete().eq("user_id", user_id).eq("book_id", book_id).execute()
    return {"success": True, "message": "Book removed from your reading list."}
