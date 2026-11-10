from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from auth.router import router as auth_router
from books.router import router as books_router
from core.config import FRONTEND_ORIGINS
from reviews.router import router as reviews_router
from shelf.router import router as shelf_router
from flags.router import router as flags_router
from profiles.router import router as profiles_router
from admin.router import router as admin_router
from notifications.router import router as notifications_router
from ai.router import router as ai_router

app = FastAPI(title="Shelfie API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(books_router)
app.include_router(shelf_router)
app.include_router(reviews_router)
app.include_router(flags_router)
app.include_router(profiles_router)
app.include_router(admin_router)
app.include_router(notifications_router)
app.include_router(ai_router)

@app.get("/")
def home():
    return {"message": "Shelfie API is running"}


@app.get("/api/health")
def health_check():
    return {"status": "ok", "database": "Supabase configured"}
