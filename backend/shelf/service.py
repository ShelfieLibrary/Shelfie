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
        "message": "Book added to shelf",
        "book_id": book.id,
        "status": status,
    }