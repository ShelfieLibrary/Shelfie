-- Guests can read reviews
CREATE POLICY "Anyone can read reviews"
ON public.book_reviews FOR SELECT TO anon USING (true);

-- Guests can read reviewer display names, but not role or account status
REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT (id, display_name) ON public.profiles TO anon;

CREATE POLICY "Anyone can read profile names"
ON public.profiles FOR SELECT TO anon USING (true);

ALTER TABLE public.books
ADD COLUMN IF NOT EXISTS authors TEXT[] NOT NULL DEFAULT '{}';

CREATE POLICY "Anyone can read books"
ON public.books
FOR SELECT
TO anon
USING (true);