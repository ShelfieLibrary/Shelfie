from fastapi import APIRouter

from books.service import featured_books, search_books


router = APIRouter(prefix="/api/books", tags=["books"])


@router.get("/search")
def search(q: str):
    return search_books(q)


@router.get("/featured")
def featured():
    return featured_books()