-- =========================================================
-- SHELFIE DATABASE RESET
-- Deletes every Shelfie table and all of its data.
-- Login accounts in Supabase Auth are kept.
-- Run 001_schema.sql right after this script.
-- =========================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

DROP TABLE IF EXISTS
    public.notifications,
    public.content_flags,
    public.book_reviews,
    public.user_books,
    public.user_activities,
    public.books,
    public.profiles
CASCADE;

DROP FUNCTION IF EXISTS
    public.handle_new_user(),
    public.set_updated_at(),
    public.set_book_reviews_updated_at();
