-- =========================================================
-- SHELFIE - SPRINT 3 BOOK REVIEWS AND CONTENT FLAGS
-- Run this script once in the Supabase SQL Editor.
-- =========================================================

CREATE TABLE IF NOT EXISTS public.book_reviews (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID NOT NULL
        REFERENCES public.profiles(id) ON DELETE CASCADE,
    book_id VARCHAR(50) NOT NULL
        REFERENCES public.books(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review_text TEXT NOT NULL
        CHECK (char_length(trim(review_text)) BETWEEN 1 AND 2000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT one_review_per_user_book UNIQUE (user_id, book_id)
);

CREATE TABLE IF NOT EXISTS public.content_flags (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    review_id BIGINT NOT NULL
        REFERENCES public.book_reviews(id) ON DELETE CASCADE,
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

CREATE FUNCTION public.set_book_reviews_updated_at()
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
FOR EACH ROW EXECUTE FUNCTION public.set_book_reviews_updated_at();

ALTER TABLE public.book_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read reviews"
ON public.book_reviews FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create their own reviews"
ON public.book_reviews FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews"
ON public.book_reviews FOR UPDATE TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reviews"
ON public.book_reviews FOR DELETE TO authenticated
USING (auth.uid() = user_id);

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
