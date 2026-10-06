import json
import os
from urllib.parse import quote
from urllib.request import Request, urlopen

from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client, Client


# =========================================================
# ENVIRONMENT / SUPABASE SETUP
# =========================================================

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
GOOGLE_BOOKS_API_KEY = os.getenv("GOOGLE_BOOKS_API_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("Supabase environment variables are missing.")

supabase: Client = create_client(
    SUPABASE_URL,
    SUPABASE_KEY
)


# =========================================================
# FASTAPI SETUP
# =========================================================

app = FastAPI(title="Shelfie API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
	"http://localhost:5173",
	"https://shelfie-sepia.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# REQUEST MODELS
# =========================================================

class RegisterRequest(BaseModel):
    email: str
    password: str
    display_name: str


class LoginRequest(BaseModel):
    email: str
    password: str


class BookData(BaseModel):
    id: str
    title: str
    authors: list[str] = []
    description: str | None = None
    isbn: str | None = None
    cover_url: str | None = None
    published_date: str | None = None
    page_count: int | None = None
    preview_link: str | None = None


class ShelfRequest(BaseModel):
    book: BookData
    status: str


# =========================================================
# AUTHENTICATION / SESSION VALIDATION
# =========================================================

def get_authenticated_user(authorization: str = Header(...)):
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Invalid authorization header."
        )

    token = authorization.split(" ", 1)[1]

    try:
        # Set the user's JWT on the Supabase PostgREST client
        # so database operations are performed as the
        # authenticated user and RLS policies can apply.
        supabase.postgrest.auth(token)

        user_response = supabase.auth.get_user(token)

        if not user_response.user:
            raise HTTPException(
                status_code=401,
                detail="Invalid or expired session."
            )

        return user_response.user

    except HTTPException:
        raise

    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired session."
        )


# =========================================================
# BASIC ROUTES
# =========================================================

@app.get("/")
def home():
    return {
        "message": "Shelfie API is running"
    }


@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "database": "Supabase configured"
    }


# =========================================================
# REGISTRATION
# =========================================================

@app.post("/api/register")
def register_user(data: RegisterRequest):
    try:
        response = supabase.auth.sign_up({
            "email": data.email,
            "password": data.password,
            "options": {
                "data": {
                    "display_name": data.display_name
                }
            }
        })

        if not response.user:
            return {
                "success": False,
                "message": "Registration failed"
            }

        return {
            "success": True,
            "message": "Account created successfully",
            "user_id": str(response.user.id)
        }

    except Exception as error:
        return {
            "success": False,
            "message": str(error)
        }


# =========================================================
# LOGIN
# =========================================================

@app.post("/api/login")
def login_user(data: LoginRequest):
    try:
        response = supabase.auth.sign_in_with_password({
            "email": data.email,
            "password": data.password
        })

        if not response.user or not response.session:
            return {
                "success": False,
                "message": "Login failed"
            }

        user_id = str(response.user.id)

        profile_response = (
            supabase.table("profiles")
            .select(
                "display_name, role, account_status"
            )
            .eq("id", user_id)
            .execute()
        )

        if not profile_response.data:
            return {
                "success": False,
                "message": "User profile could not be found."
            }

        profile = profile_response.data[0]

        return {
            "success": True,
            "message": "Login successful",
            "access_token": response.session.access_token,
            "user": {
                "id": user_id,
                "email": response.user.email,
                "display_name": profile["display_name"],
                "role": profile["role"],
                "account_status": profile["account_status"]
            }
        }

    except Exception as error:
        return {
            "success": False,
            "message": str(error)
        }


# =========================================================
# SESSION
# =========================================================

@app.get("/api/session")
def get_session(authorization: str = Header(...)):
    user = get_authenticated_user(authorization)

    return {
        "success": True,
        "message": "Session is valid",
        "user_id": str(user.id),
        "email": user.email
    }


# =========================================================
# LOGOUT
# =========================================================

@app.post("/api/logout")
def logout_user():
    try:
        supabase.auth.sign_out()

        return {
            "success": True,
            "message": "Logout successful"
        }

    except Exception as error:
        return {
            "success": False,
            "message": str(error)
        }


# =========================================================
# DEMO BOOK DATA
# Used only when Google Books is unavailable.
# =========================================================

DEMO_BOOKS = [
    {
        "id": "demo-harry-potter",
        "title": "Harry Potter and the Sorcerer's Stone",
        "authors": ["J. K. Rowling"],
        "description": (
            "Harry discovers that he is a wizard and "
            "begins his first year at Hogwarts."
        ),
        "isbn": "9780590353427",
        "cover_url": None,
        "published_date": "1998",
        "page_count": 309,
        "preview_link": None
    },
    {
        "id": "demo-hunger-games",
        "title": "The Hunger Games",
        "authors": ["Suzanne Collins"],
        "description": (
            "Katniss Everdeen enters a dangerous "
            "competition that changes her life."
        ),
        "isbn": "9780439023528",
        "cover_url": None,
        "published_date": "2008",
        "page_count": 374,
        "preview_link": None
    },
    {
        "id": "demo-great-gatsby",
        "title": "The Great Gatsby",
        "authors": ["F. Scott Fitzgerald"],
        "description": (
            "A classic novel about wealth, ambition, "
            "love, and the American dream."
        ),
        "isbn": "9780743273565",
        "cover_url": None,
        "published_date": "1925",
        "page_count": 180,
        "preview_link": None
    },
    {
        "id": "demo-to-kill-mockingbird",
        "title": "To Kill a Mockingbird",
        "authors": ["Harper Lee"],
        "description": (
            "A young girl observes injustice and "
            "morality in her Southern community."
        ),
        "isbn": "9780061120084",
        "cover_url": None,
        "published_date": "1960",
        "page_count": 336,
        "preview_link": None
    }
]


def search_demo_books(search_term):
    search_lower = search_term.lower()

    matching_books = []

    for book in DEMO_BOOKS:
        searchable_text = (
            book["title"]
            + " "
            + " ".join(book["authors"])
        ).lower()

        if search_lower in searchable_text:
            matching_books.append(book)

    if not matching_books:
        matching_books = DEMO_BOOKS

    return matching_books


# =========================================================
# GOOGLE BOOKS SEARCH
# =========================================================

@app.get("/api/books/search")
def search_books(q: str):
    search_term = q.strip()

    if not search_term:
        return {
            "success": False,
            "message": "Please enter a search term.",
            "books": []
        }

    try:
        encoded_query = quote(search_term)

        url = (
            "https://www.googleapis.com/books/v1/volumes"
            f"?q={encoded_query}"
            f"&maxResults=12"
        )

        if GOOGLE_BOOKS_API_KEY:
            url += f"&key={GOOGLE_BOOKS_API_KEY}"

        request = Request(
            url,
            headers={
                "User-Agent": "Shelfie/1.0"
            }
        )

        with urlopen(request, timeout=10) as response:
            data = json.loads(
                response.read().decode("utf-8")
            )

        books = []

        for item in data.get("items", []):
            volume_info = item.get(
                "volumeInfo",
                {}
            )

            identifiers = volume_info.get(
                "industryIdentifiers",
                []
            )

            isbn = None

            for identifier in identifiers:
                if identifier.get("type") == "ISBN_13":
                    isbn = identifier.get("identifier")
                    break

            if not isbn:
                for identifier in identifiers:
                    if identifier.get("type") == "ISBN_10":
                        isbn = identifier.get("identifier")
                        break

            image_links = volume_info.get(
                "imageLinks",
                {}
            )

            cover_url = image_links.get("thumbnail")

            if cover_url:
                cover_url = cover_url.replace(
                    "http://",
                    "https://"
                )

            books.append({
                "id": item.get("id"),
                "title": volume_info.get(
                    "title",
                    "Untitled"
                ),
                "authors": volume_info.get(
                    "authors",
                    []
                ),
                "description": volume_info.get(
                    "description"
                ),
                "isbn": isbn,
                "cover_url": cover_url,
                "published_date": volume_info.get(
                    "publishedDate"
                ),
                "page_count": volume_info.get(
                    "pageCount"
                ),
                "preview_link": volume_info.get(
                    "previewLink"
                )
            })

        return {
            "success": True,
            "source": "google_books",
            "count": len(books),
            "books": books
        }

    except Exception as error:
        demo_books = search_demo_books(search_term)

        return {
            "success": True,
            "source": "demo_fallback",
            "message": (
                "Google Books is temporarily unavailable. "
                "Showing demo results."
            ),
            "google_error": str(error),
            "count": len(demo_books),
            "books": demo_books
        }


# =========================================================
# ADD BOOK TO USER SHELF
# =========================================================

@app.post("/api/shelf")
def add_to_shelf(
    data: ShelfRequest,
    authorization: str = Header(...)
):
    user = get_authenticated_user(authorization)

    if data.status not in [
        "want_to_read",
        "reading",
        "completed"
    ]:
        raise HTTPException(
            status_code=400,
            detail="Invalid shelf status."
        )

    book_data = {
        "id": data.book.id,
        "title": data.book.title,
        "description": data.book.description,
        "isbn": data.book.isbn,
        "cover_url": data.book.cover_url,
        "published_date": data.book.published_date,
        "page_count": data.book.page_count,
        "preview_link": data.book.preview_link
    }

    try:
        supabase.table("books").upsert(
            book_data
        ).execute()

        shelf_data = {
            "user_id": str(user.id),
            "book_id": data.book.id,
            "status": data.status
        }

        supabase.table("user_books").upsert(
            shelf_data,
            on_conflict="user_id,book_id"
        ).execute()

        return {
            "success": True,
            "message": "Book added to shelf",
            "book_id": data.book.id,
            "status": data.status
        }

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=str(error)
        )