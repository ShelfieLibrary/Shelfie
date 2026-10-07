-- =========================================================
-- SHELFIE - SPRINT 2 DATABASE SETUP
-- =========================================================
-- Tables implemented for Sprint 2:
-- 1. profiles
-- 2. books
-- 3. user_books
-- 4. book_reviews
-- =========================================================


-- =========================================================
-- PROFILES
-- =========================================================

CREATE TABLE public.profiles (
    id UUID PRIMARY KEY
        REFERENCES auth.users(id)
        ON DELETE CASCADE,

    display_name VARCHAR(100) NOT NULL,

    avatar VARCHAR(50) NOT NULL DEFAULT 'default',

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
-- USER BOOKS / READING LIST
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
-- BOOK REVIEWS
-- One 1-5 star review per user per book.
-- =========================================================

CREATE TABLE public.book_reviews (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    user_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    book_id VARCHAR(50) NOT NULL
        REFERENCES public.books(id)
        ON DELETE CASCADE,

    rating SMALLINT NOT NULL
        CHECK (rating BETWEEN 1 AND 5),

    review_text TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (user_id, book_id)
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
ALTER TABLE public.user_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_reviews ENABLE ROW LEVEL SECURITY;


-- =========================================================
-- PROFILE POLICIES
-- Authenticated users need profile information for login,
-- role identification, and application navigation.
-- =========================================================

CREATE POLICY "Authenticated users can read profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);


-- =========================================================
-- BOOK POLICIES
-- Anyone can read saved books. Logged-in users can save
-- books (upsert needs both insert and update).
-- =========================================================

CREATE POLICY "Anyone can read books"
ON public.books
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Authenticated users can add books"
ON public.books
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update books"
ON public.books
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);


-- =========================================================
-- READING LIST POLICIES
-- Reading lists are public. Users can only change their own.
-- =========================================================

CREATE POLICY "Anyone can read reading lists"
ON public.user_books
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Users can add to their own list"
ON public.user_books
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own list"
ON public.user_books
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove from their own list"
ON public.user_books
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);


-- =========================================================
-- BOOK REVIEW POLICIES
-- Reviews are public. Users can only write, edit, and delete
-- their own. Admins can delete any review.
-- =========================================================

CREATE POLICY "Anyone can read reviews"
ON public.book_reviews
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Users can write their own reviews"
ON public.book_reviews
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can edit their own reviews"
ON public.book_reviews
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users and admins can delete reviews"
ON public.book_reviews
FOR DELETE
TO authenticated
USING (
    auth.uid() = user_id
    OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);


-- =========================================================
-- TEST ADMIN ACCOUNT (run separately, after registering)
-- Register the admin account through the app first, then
-- replace the email below and run this statement.
-- =========================================================

-- UPDATE public.profiles
-- SET role = 'admin'
-- WHERE id = (
--     SELECT id FROM auth.users WHERE email = 'admin@test.com'
-- );
