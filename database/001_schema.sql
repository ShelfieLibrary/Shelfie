-- =========================================================
-- SHELFIE DATABASE SCHEMA
-- Run this script once in the Supabase SQL Editor of an empty
-- project, or after 000_reset.sql.
-- =========================================================


-- =========================================================
-- TABLES
-- =========================================================

CREATE TABLE public.profiles (
    id UUID PRIMARY KEY
        REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name VARCHAR(100) NOT NULL,
    avatar_url TEXT DEFAULT 'book',
    role VARCHAR(20) NOT NULL DEFAULT 'user'
        CHECK (role IN ('user', 'admin')),
    account_status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (account_status IN ('active', 'suspended')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.books (
    id VARCHAR(50) PRIMARY KEY,
    title TEXT NOT NULL,
    authors TEXT[] NOT NULL DEFAULT '{}',
    description TEXT,
    isbn VARCHAR(13),
    cover_url TEXT,
    published_date VARCHAR(10),
    page_count INTEGER CHECK (page_count >= 0),
    preview_link TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.user_books (
    user_id UUID NOT NULL
        REFERENCES public.profiles(id) ON DELETE CASCADE,
    book_id VARCHAR(50) NOT NULL
        REFERENCES public.books(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL
        CHECK (status IN ('want_to_read', 'reading', 'completed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, book_id)
);

CREATE TABLE public.book_reviews (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID NOT NULL
        REFERENCES public.profiles(id) ON DELETE CASCADE,
    book_id VARCHAR(50) NOT NULL
        REFERENCES public.books(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review_text TEXT
        CHECK (review_text IS NULL OR char_length(review_text) <= 2000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT one_review_per_user_book UNIQUE (user_id, book_id)
);

CREATE TABLE public.content_flags (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    review_id BIGINT
        REFERENCES public.book_reviews(id) ON DELETE SET NULL,
    user_id UUID NOT NULL
        REFERENCES public.profiles(id) ON DELETE CASCADE,
    reason TEXT CHECK (reason IS NULL OR char_length(reason) <= 500),
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'resolved', 'dismissed')),
    reviewed_by UUID
        REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT one_flag_per_user_review UNIQUE (user_id, review_id)
);

CREATE TABLE public.notifications (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID NOT NULL
        REFERENCES public.profiles(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL
        CHECK (type IN ('new_review', 'announcement')),
    message TEXT NOT NULL CHECK (char_length(message) BETWEEN 1 AND 500),
    book_id VARCHAR(50)
        REFERENCES public.books(id) ON DELETE SET NULL,
    review_id BIGINT
        REFERENCES public.book_reviews(id) ON DELETE SET NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX notifications_user_unread ON public.notifications (user_id, is_read);


-- =========================================================
-- TRIGGERS
-- =========================================================

-- Creates a profile whenever a new Supabase Auth user registers
CREATE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, display_name)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'display_name', 'Shelfie User')
    );
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER set_book_reviews_updated_at
BEFORE UPDATE ON public.book_reviews
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_user_books_updated_at
BEFORE UPDATE ON public.user_books
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Profiles: guests see only id, display name, and avatar
REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT (id, display_name, avatar_url) ON public.profiles TO anon;

CREATE POLICY "Anyone can read profiles"
ON public.profiles FOR SELECT TO anon, authenticated USING (true);

-- Users can change only their own display name and avatar
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (display_name, avatar_url) ON public.profiles TO authenticated;

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Books
CREATE POLICY "Anyone can read books"
ON public.books FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Authenticated users can add books"
ON public.books FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update books"
ON public.books FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Reading lists: public, users change only their own
CREATE POLICY "Anyone can read reading lists"
ON public.user_books FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Users can add to their own list"
ON public.user_books FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own list"
ON public.user_books FOR UPDATE TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove from their own list"
ON public.user_books FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Reviews: public, users change only their own
CREATE POLICY "Anyone can read reviews"
ON public.book_reviews FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Users can create their own reviews"
ON public.book_reviews FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews"
ON public.book_reviews FOR UPDATE TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reviews"
ON public.book_reviews FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Flags: users see and submit only their own
CREATE POLICY "Users can read their own flags"
ON public.content_flags FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can submit their own flags"
ON public.content_flags FOR INSERT TO authenticated
WITH CHECK (
    auth.uid() = user_id
    AND status = 'pending'
    AND reviewed_by IS NULL
    AND reviewed_at IS NULL
);

-- Notifications: users see and mark only their own.
-- They are created by the backend with the service role key.
CREATE POLICY "Users can read their own notifications"
ON public.notifications FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can mark their own notifications"
ON public.notifications FOR UPDATE TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);


-- =========================================================
-- EXISTING ACCOUNTS
-- Creates profiles for accounts that registered before this
-- script ran. Does nothing on a new project.
-- =========================================================

INSERT INTO public.profiles (id, display_name)
SELECT id, COALESCE(raw_user_meta_data->>'display_name', 'Shelfie User')
FROM auth.users
ON CONFLICT (id) DO NOTHING;
