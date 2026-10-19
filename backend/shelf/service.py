from books.schemas import BookData
from core.database import supabase


VALID_STATUSES = {"want_to_read", "reading", "completed"}


def save_book(book: BookData):
    supabase.table("books").upsert(
        {
            "id": book.id,
            "title": book.title,
            "description": book.description,
            "isbn": book.isbn,
            "cover_url": book.cover_url,
            "published_date": book.published_date,
            "page_count": book.page_count,
            "preview_link": book.preview_link,
        }
    ).execute()


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
