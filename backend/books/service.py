import json
import re
import time
from urllib.parse import quote
from urllib.request import Request, urlopen

import httpx

from books.schemas import BookData
from core.config import GOOGLE_BOOKS_API_KEY
from core.database import supabase


CACHE_SECONDS = 600
PAGE_SIZE = 12
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


def _fetch_google_books(query: str, page: int):
    url = (
        f"https://www.googleapis.com/books/v1/volumes?q={quote(query, safe=':')}"
        f"&maxResults={PAGE_SIZE}&startIndex={(page - 1) * PAGE_SIZE}"
    )
    if GOOGLE_BOOKS_API_KEY:
        url += f"&key={GOOGLE_BOOKS_API_KEY}"

    data = _get_json(url)
    return [_format_google_book(item) for item in data.get("items", [])]


def _fetch_open_library(query: str, page: int):
    fields = "key,title,author_name,first_publish_year,isbn,cover_i,number_of_pages_median"
    url = (
        f"https://openlibrary.org/search.json?q={quote(query, safe=':')}"
        f"&limit={PAGE_SIZE}&page={page}&fields={fields}"
    )

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


def _find_books(search_term: str, page: int):
    query = search_term.strip()
    if not query:
        return {"success": False, "message": "Please enter a search term.", "books": []}

    cache_key = (query.casefold(), page)
    cached = _search_cache.get(cache_key)
    if cached and time.time() - cached["time"] < CACHE_SECONDS:
        return cached["result"]

    errors = {}
    for source, fetch in SEARCH_SOURCES.items():
        try:
            books = fetch(query, page)
        except Exception as error:
            errors[source] = str(error)
            continue

        if books:
            result = {
                "success": True,
                "source": source,
                "count": len(books),
                "books": books,
                "has_more": len(books) == PAGE_SIZE,
            }
            _search_cache[cache_key] = {"time": time.time(), "result": result}
            return result

    books = _search_saved_books(query) if page == 1 else []
    return {
        "success": True,
        "source": "saved_books_fallback",
        "message": "Book search services are unavailable. Showing matching saved books.",
        "errors": errors,
        "count": len(books),
        "books": books,
        "has_more": False,
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


def _edition_key(book):
    title = book["title"].split(":")[0].casefold()
    title = re.sub(r"[^a-z0-9]+", " ", title).strip()
    author = (book.get("authors") or [""])[0].casefold()
    return title, author


def _edition_score(book):
    return (
        bool(book.get("cover_url")),
        bool(book.get("description")),
        bool(book.get("page_count")),
        bool(book.get("isbn")),
    )


def _merge_editions(books):
    best = {}
    for book in books:
        key = _edition_key(book)
        if key not in best or _edition_score(book) > _edition_score(best[key]):
            best[key] = book
    return list(best.values())


def search_books(search_term: str, page: int = 1):
    result = _find_books(search_term, page)
    if result.get("books"):
        books = _merge_editions(result["books"])
        result = {**result, "count": len(books), "books": _attach_ratings(books)}
    return result


_preview_cache = {}


def book_preview(book_id: str):
    if book_id not in _preview_cache:
        url = (
            f"https://www.googleapis.com/books/v1/volumes/{quote(book_id)}"
            "?fields=accessInfo(embeddable,viewability)"
        )
        if GOOGLE_BOOKS_API_KEY:
            url += f"&key={GOOGLE_BOOKS_API_KEY}"
        access = _get_json(url).get("accessInfo", {})
        _preview_cache[book_id] = bool(
            access.get("embeddable") and access.get("viewability") != "NO_PAGES"
        )
    return {"success": True, "embeddable": _preview_cache[book_id]}


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

def _books_by_id(ids):
    if not ids:
        return {}
    response = supabase.table("books").select("*").in_("id", list(ids)).execute()
    return {book["id"]: {**book, "authors": book.get("authors") or []} for book in response.data}


# Trending score: a review counts twice as much as a shelf add, plus the book's average rating.
REVIEW_WEIGHT = 2


def _trending_books(limit: int):
    reviews = supabase.table("book_reviews").select("book_id, rating").execute().data
    shelved = supabase.table("user_books").select("book_id").execute().data

    ratings = {}
    for review in reviews:
        ratings.setdefault(review["book_id"], []).append(review["rating"])

    scores = {}
    for row in shelved:
        scores[row["book_id"]] = scores.get(row["book_id"], 0) + 1
    for book_id, values in ratings.items():
        average = sum(values) / len(values)
        scores[book_id] = scores.get(book_id, 0) + REVIEW_WEIGHT * len(values) + average

    ranked = sorted(scores, key=scores.get, reverse=True)[:limit]
    books = _books_by_id(ranked)
    return _attach_ratings([books[book_id] for book_id in ranked if book_id in books])


def _latest_reviews(limit: int):
    response = (
        supabase.table("book_reviews")
        .select("id, user_id, book_id, rating, review_text, created_at")
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    books = _books_by_id({review["book_id"] for review in response.data})
    names = (
        supabase.table("profiles")
        .select("id, display_name")
        .in_("id", list({review["user_id"] for review in response.data}))
        .execute()
        .data
        if response.data
        else []
    )
    names = {row["id"]: row["display_name"] for row in names}

    return [
        {
            **review,
            "display_name": names.get(review["user_id"], "Shelfie Reader"),
            "book": books.get(review["book_id"]),
        }
        for review in response.data
    ]


def _user_shelf(user_id: str):
    response = (
        supabase.table("user_books")
        .select("status, updated_at, books(*)")
        .eq("user_id", user_id)
        .order("updated_at", desc=True)
        .execute()
    )

    counts = {"want_to_read": 0, "reading": 0, "completed": 0}
    current = None
    for row in response.data:
        counts[row["status"]] += 1
        if current is None and row["status"] == "reading" and row.get("books"):
            current = {**row["books"], "authors": row["books"].get("authors") or []}

    return {"counts": counts, "current": current}


def home_feed(user_id: str | None):
    return {
        "success": True,
        "recent": featured_books(16)["books"],
        "trending": _trending_books(6),
        "latest_reviews": _latest_reviews(4),
        "shelf": _user_shelf(user_id) if user_id else None,
    }


GUTENDEX_URL = "https://gutendex.com/books"
GUTENBERG_SEARCH_URL = "https://www.gutenberg.org/ebooks/search.opds/"
GUTENBERG_TEXT_URLS = (
    "https://www.gutenberg.org/cache/epub/{id}/pg{id}.txt",
    "https://www.gutenberg.org/ebooks/{id}.txt.utf-8",
)
MAX_CONTENT_CHARS = 300_000
_content_cache = {}


def _read_text(url: str, timeout: int = 30):
    response = httpx.get(
        url,
        headers={"User-Agent": "Shelfie/1.0"},
        timeout=timeout,
        follow_redirects=True,
    )
    response.raise_for_status()
    return response.text


def _strip_gutenberg_boilerplate(text: str):
    start = text.find("*** START OF")
    if start != -1:
        text = text[text.find("\n", start) + 1:]
    end = text.find("*** END OF")
    if end != -1:
        text = text[:end]
    return text.strip()


def _gutendex_id(query: str):
    data = json.loads(_read_text(f"{GUTENDEX_URL}/?search={quote(query)}"))
    results = data.get("results", [])
    return results[0]["id"] if results else None


def _gutenberg_search_id(query: str):
    feed = _read_text(f"{GUTENBERG_SEARCH_URL}?query={quote(query)}")
    match = re.search(r"/ebooks/(\d+)", feed)
    return int(match.group(1)) if match else None


def book_content(title: str, author: str):
    query = f"{title} {author}".strip()
    cache_key = query.casefold()
    if cache_key in _content_cache:
        return _content_cache[cache_key]

    errors = {}
    book_id = None
    for source, find_id in (("gutendex", _gutendex_id), ("gutenberg", _gutenberg_search_id)):
        try:
            book_id = find_id(query)
        except Exception as error:
            errors[source] = str(error)
            continue
        if book_id:
            break

    if not book_id:
        result = {"success": True, "available": False, "text": None, "errors": errors}
        if not errors:
            _content_cache[cache_key] = result
        return result

    text = None
    for url in GUTENBERG_TEXT_URLS:
        try:
            text = _read_text(url.format(id=book_id))
            break
        except Exception as error:
            errors[url] = str(error)

    if text is None:
        return {"success": True, "available": False, "text": None, "errors": errors}

    result = {
        "success": True,
        "available": True,
        "gutenberg_id": book_id,
        "text": _strip_gutenberg_boilerplate(text)[:MAX_CONTENT_CHARS],
    }
    _content_cache[cache_key] = result
    return result
