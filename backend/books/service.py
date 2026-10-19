import json
from urllib.parse import quote
from urllib.request import Request, urlopen

from core.config import GOOGLE_BOOKS_API_KEY
from core.database import supabase


DEMO_BOOKS = [
    {
        "id": "demo-harry-potter",
        "title": "Harry Potter and the Sorcerer's Stone",
        "authors": ["J. K. Rowling"],
        "description": "Harry discovers that he is a wizard and begins his first year at Hogwarts.",
        "isbn": "9780590353427",
        "cover_url": None,
        "published_date": "1998",
        "page_count": 309,
        "preview_link": None,
    },
    {
        "id": "demo-hunger-games",
        "title": "The Hunger Games",
        "authors": ["Suzanne Collins"],
        "description": "Katniss enters a dangerous competition that changes her life.",
        "isbn": "9780439023528",
        "cover_url": None,
        "published_date": "2008",
        "page_count": 374,
        "preview_link": None,
    },
]


def _demo_results(search_term: str):
    searchable = search_term.lower()
    matches = [
        book
        for book in DEMO_BOOKS
        if searchable in f"{book['title']} {' '.join(book['authors'])}".lower()
    ]
    return matches or DEMO_BOOKS


def search_books(search_term: str):
    query = search_term.strip()
    if not query:
        return {"success": False, "message": "Please enter a search term.", "books": []}

    try:
        url = f"https://www.googleapis.com/books/v1/volumes?q={quote(query)}&maxResults=12"
        if GOOGLE_BOOKS_API_KEY:
            url += f"&key={GOOGLE_BOOKS_API_KEY}"

        request = Request(url, headers={"User-Agent": "Shelfie/1.0"})
        with urlopen(request, timeout=10) as response:
            data = json.loads(response.read().decode("utf-8"))

        books = []
        for item in data.get("items", []):
            info = item.get("volumeInfo", {})
            identifiers = info.get("industryIdentifiers", [])
            isbn = next(
                (value.get("identifier") for value in identifiers if value.get("type") == "ISBN_13"),
                None,
            )
            if not isbn:
                isbn = next(
                    (value.get("identifier") for value in identifiers if value.get("type") == "ISBN_10"),
                    None,
                )

            cover_url = info.get("imageLinks", {}).get("thumbnail")
            if cover_url:
                cover_url = cover_url.replace("http://", "https://")

            books.append(
                {
                    "id": item.get("id"),
                    "title": info.get("title", "Untitled"),
                    "authors": info.get("authors", []),
                    "description": info.get("description"),
                    "isbn": isbn,
                    "cover_url": cover_url,
                    "published_date": info.get("publishedDate"),
                    "page_count": info.get("pageCount"),
                    "preview_link": info.get("previewLink"),
                }
            )

        return {"success": True, "source": "google_books", "count": len(books), "books": books}
    except Exception as error:
        response = supabase.table("books").select("*").limit(1000).execute()
        needle = query.casefold()
        books = [
            {**book, "authors": book.get("authors") or []}
            for book in response.data
            if any(needle in str(book.get(field) or "").casefold()
                   for field in ("title", "isbn", "id"))
        ]
        return {
            "success": True,
            "source": "saved_books_fallback",
            "message": "Google Books is temporarily unavailable. Showing matching saved books.",
            "google_error": str(error),
            "count": len(books),
            "books": books,
        }
