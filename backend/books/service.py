import json
import time
from urllib.parse import quote
from urllib.request import Request, urlopen

from books.schemas import BookData
from core.config import GOOGLE_BOOKS_API_KEY
from core.database import supabase


CACHE_SECONDS = 600
_search_cache = {}


def _get_json(url: str):
    request = Request(url, headers={"User-Agent": "Shelfie/1.0"})
    with urlopen(request, timeout=10) as response:
        return json.loads(response.read().decode("utf-8"))


def _format_google_book(item):
    info = item.get("volumeInfo", {})
    isbns = {
        value.get("type"): value.get("identifier")
        for value in info.get("industryIdentifiers", [])
    }

    cover_url = info.get("imageLinks", {}).get("thumbnail")
    if cover_url:
        cover_url = cover_url.replace("http://", "https://")

    return {
        "id": item.get("id"),
        "title": info.get("title", "Untitled"),
        "authors": info.get("authors", []),
        "description": info.get("description"),
        "isbn": isbns.get("ISBN_13") or isbns.get("ISBN_10"),
        "cover_url": cover_url,
        "published_date": info.get("publishedDate"),
        "page_count": info.get("pageCount"),
        "preview_link": info.get("previewLink"),
    }


def _format_open_library_book(doc):
    work_id = doc.get("key", "").split("/")[-1]
    cover_id = doc.get("cover_i")
    year = doc.get("first_publish_year")

    return {
        "id": f"ol-{work_id}",
        "title": doc.get("title", "Untitled"),
        "authors": doc.get("author_name", []),
        "description": None,
        "isbn": (doc.get("isbn") or [None])[0],
        "cover_url": f"https://covers.openlibrary.org/b/id/{cover_id}-M.jpg" if cover_id else None,
        "published_date": str(year) if year else None,
        "page_count": doc.get("number_of_pages_median"),
        "preview_link": f"https://openlibrary.org{doc.get('key')}" if doc.get("key") else None,
    }


def _fetch_google_books(query: str):
    url = f"https://www.googleapis.com/books/v1/volumes?q={quote(query, safe=':')}&maxResults=12"
    if GOOGLE_BOOKS_API_KEY:
        url += f"&key={GOOGLE_BOOKS_API_KEY}"

    data = _get_json(url)
    return [_format_google_book(item) for item in data.get("items", [])]


def _fetch_open_library(query: str):
    fields = "key,title,author_name,first_publish_year,isbn,cover_i,number_of_pages_median"
    url = f"https://openlibrary.org/search.json?q={quote(query, safe=':')}&limit=12&fields={fields}"

    data = _get_json(url)
    return [_format_open_library_book(doc) for doc in data.get("docs", [])]


def _search_saved_books(query: str):
    try:
        response = supabase.table("books").select("*").limit(1000).execute()
    except Exception:
        return []

    needle = query.casefold()
    return [
        {**book, "authors": book.get("authors") or []}
        for book in response.data
        if any(needle in str(book.get(field) or "").casefold()
               for field in ("title", "isbn", "id"))
    ]


SEARCH_SOURCES = {
    "google_books": _fetch_google_books,
    "open_library": _fetch_open_library,
}


def _find_books(search_term: str):
    query = search_term.strip()
    if not query:
        return {"success": False, "message": "Please enter a search term.", "books": []}

    cache_key = query.casefold()
    cached = _search_cache.get(cache_key)
    if cached and time.time() - cached["time"] < CACHE_SECONDS:
        return cached["result"]

    errors = {}
    for source, fetch in SEARCH_SOURCES.items():
        try:
            books = fetch(query)
        except Exception as error:
            errors[source] = str(error)
            continue

        if books:
            result = {"success": True, "source": source, "count": len(books), "books": books}
            _search_cache[cache_key] = {"time": time.time(), "result": result}
            return result

    books = _search_saved_books(query)
    return {
        "success": True,
        "source": "saved_books_fallback",
        "message": "Book search services are unavailable. Showing matching saved books.",
        "errors": errors,
        "count": len(books),
        "books": books,
    }


def _attach_ratings(books):
    ids = [book["id"] for book in books if book.get("id")]
    if not ids:
        return books

    try:
        response = (
            supabase.table("book_reviews")
            .select("book_id, rating")
            .in_("book_id", ids)
            .execute()
        )
    except Exception:
        return books

    ratings = {}
    for review in response.data:
        if review.get("rating") is not None:
            ratings.setdefault(review["book_id"], []).append(review["rating"])

    averages = {
        book_id: round(sum(values) / len(values), 1)
        for book_id, values in ratings.items()
    }

    return [
        {
            **book,
            "average_rating": averages.get(book["id"]),
            "rating_count": len(ratings.get(book["id"], [])),
        }
        for book in books
    ]


def search_books(search_term: str):
    result = _find_books(search_term)
    if result.get("books"):
        result = {**result, "books": _attach_ratings(result["books"])}
    return result


def featured_books(limit: int = 6):
    try:
        response = (
            supabase.table("books")
            .select("*")
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
    except Exception:
        return {"success": True, "count": 0, "books": []}

    books = [{**book, "authors": book.get("authors") or []} for book in response.data]
    return {"success": True, "count": len(books), "books": _attach_ratings(books)}


def save_book(book: BookData):
    supabase.table("books").upsert(
        {
            "id": book.id,
            "title": book.title,
            "authors": book.authors,
            "description": book.description,
            "isbn": book.isbn,
            "cover_url": book.cover_url,
            "published_date": book.published_date,
            "page_count": book.page_count,
            "preview_link": book.preview_link,
        }
    ).execute()