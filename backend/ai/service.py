import json
import logging
import time
from collections import defaultdict, deque
from threading import Lock

from openai import OpenAI

from books.service import search_books
from core.config import OPENAI_API_KEY, OPENAI_BASE_URL, OPENAI_MODEL
from core.database import supabase


CHAT_FALLBACK = (
    "Sorry, the Shelfie assistant isn't available right now. Please try again in a minute."
)
CHAT_SYSTEM_PROMPT = (
    "You are the help assistant for Shelfie, a website where readers search for books, "
    "keep a reading list (Want to Read, Reading, Completed), rate and review books from "
    "1 to 5 stars, flag inappropriate reviews, and get notifications. Answer questions "
    "about using Shelfie and about books and reading. Keep answers short and friendly. "
    "If a question is unrelated to books or Shelfie, say that you can only help with those."
)
RECOMMENDATION_PROMPT = (
    "Recommend {count} books for a reader. Their reading list and favorite books are:\n"
    "{books}\n"
    "Do not recommend any of those books. Reply with JSON in the form "
    '{{"books": [{{"title": "...", "author": "...", "reason": "..."}}]}}, '
    "where reason is one sentence explaining why this reader would enjoy the book."
)
RECOMMENDATION_COUNT = 10
RECOMMENDATION_CACHE_SECONDS = 24 * 60 * 60

logger = logging.getLogger("uvicorn.error")

client = OpenAI(api_key=OPENAI_API_KEY, base_url=OPENAI_BASE_URL) if OPENAI_API_KEY else None

RATE_LIMITS = {"chat": (10, 60), "recommendations": (3, 60)}
_requests = defaultdict(deque)
_requests_lock = Lock()
_recommendation_cache = {}


class RateLimitError(Exception):
    pass


def check_rate_limit(feature: str, key: str):
    limit, window = RATE_LIMITS[feature]
    now = time.time()
    with _requests_lock:
        times = _requests[(feature, key)]
        while times and now - times[0] > window:
            times.popleft()
        if len(times) >= limit:
            return False
        times.append(now)
        return True


def _ask(messages: list[dict], **options):
    if not client:
        raise RuntimeError("OPENAI_API_KEY is not configured.")
    response = client.chat.completions.create(model=OPENAI_MODEL, messages=messages, **options)
    return response.choices[0].message.content


def chat(message: str, history: list[dict]):
    messages = [{"role": "system", "content": CHAT_SYSTEM_PROMPT}, *history,
                {"role": "user", "content": message}]
    try:
        return {"success": True, "reply": _ask(messages)}
    except Exception:
        logger.exception("AI chat request failed")
        return {"success": True, "reply": CHAT_FALLBACK, "fallback": True}


def _reader_books(user_id: str):
    shelf = (
        supabase.table("user_books")
        .select("books(id, title, authors)")
        .eq("user_id", user_id)
        .execute()
        .data
    )
    favorites = (
        supabase.table("book_reviews")
        .select("books(id, title, authors)")
        .eq("user_id", user_id)
        .gte("rating", 4)
        .execute()
        .data
    )
    books = {row["books"]["id"]: row["books"] for row in shelf + favorites if row.get("books")}
    return list(books.values())


def _find_book(title: str, author: str):
    result = search_books(f"{title} {author}")
    if result.get("source") == "saved_books_fallback":
        return None
    return next(iter(result.get("books") or []), None)


def recommendations(user_id: str, refresh: bool = False):
    reader_books = _reader_books(user_id)
    if not reader_books:
        return {
            "success": True,
            "books": [],
            "message": "Add books to your reading list or rate books 4 or 5 stars "
                       "to get recommendations.",
        }

    reader_key = sorted(book["id"] for book in reader_books)
    cached = _recommendation_cache.get(user_id)
    if (not refresh and cached and cached["reader_key"] == reader_key
            and time.time() - cached["time"] < RECOMMENDATION_CACHE_SECONDS):
        return cached["result"]

    if not check_rate_limit("recommendations", user_id):
        raise RateLimitError("You've refreshed recommendations too often. Please wait a minute.")

    result = _generate_recommendations(reader_books)
    _recommendation_cache[user_id] = {
        "time": time.time(), "reader_key": reader_key, "result": result,
    }
    return result


def _generate_recommendations(reader_books: list[dict]):
    listed = "\n".join(
        f"- {book['title']} by {', '.join(book.get('authors') or ['unknown author'])}"
        for book in reader_books
    )
    prompt = RECOMMENDATION_PROMPT.format(count=RECOMMENDATION_COUNT, books=listed)
    reply = _ask([{"role": "user", "content": prompt}], response_format={"type": "json_object"})
    suggestions = json.loads(reply).get("books", [])

    seen = {book["id"] for book in reader_books}
    books = []
    for suggestion in suggestions:
        book = _find_book(suggestion.get("title", ""), suggestion.get("author", ""))
        if book and book["id"] not in seen:
            seen.add(book["id"])
            books.append({**book, "reason": suggestion.get("reason")})

    return {"success": True, "books": books}
