# Shelfie

Shelfie uses a React/Vite frontend, FastAPI backend, and PostgreSQL database hosted by Supabase.

## Database setup

1. Open the Supabase SQL Editor.
2. For a new database, run `database/001_sprint2_tables.sql` first.
3. Run `database/002_sprint3_reviews_flags.sql` to create `book_reviews` and `content_flags`.

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

On Windows, use `copy .env.example .env` instead of `cp`. Replace the values in `.env` with the project credentials before starting the server.

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

The deployed frontend is available at https://shelfie-sepia.vercel.app.
