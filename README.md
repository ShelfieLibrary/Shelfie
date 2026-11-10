# Shelfie

Shelfie is a book platform where readers search for books, keep a reading list, rate and review books, and get AI recommendations. It uses a React/Vite frontend, a FastAPI backend, and a PostgreSQL database hosted by Supabase.

The deployed site is available at https://shelfie-sandy-beta.vercel.app

## Features

- Search books from Google Books, with Open Library as a backup
- Reading list with Want to Read, Reading, and Completed shelves
- Ratings and reviews, with flagging for inappropriate reviews
- Notifications for new reviews and admin announcements
- Admin dashboard for statistics, user roles and account status, and flagged reviews
- AI chatbot and AI book recommendations
- Read and listen to public-domain books

## Requirements

- Python 3.10 or newer
- Node.js 22 or newer, with npm
- A Supabase project, a Google Books API key, and a Groq API key (free at https://console.groq.com)

## Database setup

1. Open the Supabase SQL Editor.
2. For a new database, run `database/001_schema.sql` to create all tables.
3. To rebuild an existing database from scratch, run `database/000_reset.sql` first, then `database/001_schema.sql`. This deletes all existing data.

New accounts are regular users. To make an account an administrator, sign up first, copy the user's id from Authentication → Users in Supabase, and run:

```sql
UPDATE public.profiles SET role = 'admin' WHERE id = '<user id>';
```

## Run the backend

These commands do not require an IDE.

```bash
cd backend
python -m venv venv
```

Activate the environment:

```bash
# Windows PowerShell
venv\Scripts\Activate.ps1

# macOS or Linux
source venv/bin/activate
```

Install dependencies, create the environment file, and start FastAPI:

```bash
python -m pip install -r requirements.txt
cp .env.example .env
python -m uvicorn main:app --reload --port 8000
```

On Windows, use `copy .env.example .env` instead of `cp`. Restart the server after changing `.env`.

### Environment variables

Fill in `backend/.env` before starting the server:

| Variable | Where to get it | Used for |
|---|---|---|
| `SUPABASE_URL` | Supabase → Project Settings → API | Database and sign-in |
| `SUPABASE_KEY` | Supabase → Project Settings → API (anon key) | Database and sign-in |
| `SUPABASE_SERVICE_KEY` | Supabase → Project Settings → API (service role key) | Admin dashboard |
| `GOOGLE_BOOKS_API_KEY` | Google Cloud Console, with the Books API enabled | Book search and previews |
| `OPENAI_API_KEY` | Groq console → API Keys | AI chatbot and recommendations |
| `OPENAI_BASE_URL` | Use `https://api.groq.com/openai/v1` | AI chatbot and recommendations |
| `OPENAI_MODEL` | Use `openai/gpt-oss-120b` | AI chatbot and recommendations |

Only the two Supabase values are required to start the server. Without the others, the admin dashboard returns an error, search uses Open Library and previews are unavailable, and the AI features show a fallback message. Keep `SUPABASE_SERVICE_KEY` private, since it bypasses row level security.

## Run the frontend

Open a second terminal:

```bash
cd frontend
npm ci
npm run dev
```

The frontend opens at `http://localhost:5173`. To make it use the local backend, create `frontend/.env.local` containing:

```text
VITE_API_URL=http://localhost:8000
```

## Production build checks

```bash
cd frontend
npm run lint
npm run build
```

## Deployment

The frontend is hosted on Vercel and the backend on Render.

- On Render, set the same environment variables as `backend/.env`.
- On Vercel, set `VITE_API_URL` to the Render backend's URL.
- The frontend's URL must be listed in `FRONTEND_ORIGINS` in `backend/core/config.py`, or the browser will block its requests with a CORS error.
