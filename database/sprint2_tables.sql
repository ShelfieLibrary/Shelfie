-- =========================================================
-- SHELFIE - SPRINT 2 DATABASE SETUP
-- =========================================================
-- Tables implemented for Sprint 2:
-- 1. profiles
-- 2. books
-- 3. user_activities
-- 4. user_books
-- =========================================================


-- =========================================================
-- PROFILES
-- =========================================================

CREATE TABLE public.profiles (
    id UUID PRIMARY KEY
        REFERENCES auth.users(id)
        ON DELETE CASCADE,

    display_name VARCHAR(100) NOT NULL,

    avatar_url TEXT,

    role VARCHAR(20) NOT NULL DEFAULT 'user'
        CHECK (role IN ('user', 'admin')),

    account_status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (account_status IN ('active', 'suspended')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =========================================================
-- BOOKS
-- =========================================================

CREATE TABLE public.books (
    id VARCHAR(50) PRIMARY KEY,

    title TEXT NOT NULL,

    description TEXT,

    isbn VARCHAR(13),

    cover_url TEXT,

    published_date VARCHAR(10),

    page_count INTEGER
        CHECK (page_count >= 0),

    preview_link TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =========================================================
-- USER ACTIVITIES
-- =========================================================

CREATE TABLE public.user_activities (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    user_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    book_id VARCHAR(50) NOT NULL
        REFERENCES public.books(id)
        ON DELETE CASCADE,

    activity_type VARCHAR(30) NOT NULL
        CHECK (
            activity_type IN (
                'viewed_book',
                'submitted_review',
                'posted_discussion'
            )
        ),

    reference_id BIGINT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =========================================================
-- USER BOOKS / READING SHELVES
-- =========================================================

CREATE TABLE public.user_books (
    user_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    book_id VARCHAR(50) NOT NULL
        REFERENCES public.books(id)
        ON DELETE CASCADE,

    status VARCHAR(20) NOT NULL
        CHECK (
            status IN (
                'want_to_read',
                'reading',
                'completed'
            )
        ),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (user_id, book_id)
);


-- =========================================================
-- AUTOMATIC PROFILE CREATION
-- Creates a profile whenever a new Supabase Auth user is
-- registered.
-- =========================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN

    INSERT INTO public.profiles (
        id,
        display_name,
        role,
        account_status
    )
    VALUES (
        NEW.id,
        COALESCE(
            NEW.raw_user_meta_data->>'display_name',
            'Shelfie User'
        ),
        'user',
        'active'
    );

    RETURN NEW;

END;
$$;


CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();


-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_books ENABLE ROW LEVEL SECURITY;


-- =========================================================
-- PROFILE POLICIES
-- =========================================================
-- Authenticated Shelfie users need profile information for
-- login, role identification, and application navigation.
-- =========================================================

CREATE POLICY "Authenticated users can read profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);