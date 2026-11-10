from fastapi import APIRouter, Depends, Query

from books.service import book_content, featured_books, home_feed, search_books
from core.auth import get_optional_user
from core.errors import database_error


router = APIRouter(prefix="/api/books", tags=["books"])


@router.get("/search")
def search(q: str, page: int = Query(default=1, ge=1, le=20)):
    return search_books(q, page)


@router.get("/featured")
def featured():
    return featured_books()


@router.get("/content")
def content(title: str, author: str = ""):
    try:
        return book_content(title, author)
    except Exception as error:
        return {"success": True, "available": False, "text": None, "errors": {"text": str(error)}}


@router.get("/home")
def home(user=Depends(get_optional_user)):
    try:
        return home_feed(str(user.id) if user else None)
    except Exception as error:
        database_error(error, "The home page could not be loaded.")
