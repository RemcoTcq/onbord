-- Add experience_rating and experience_comment to candidates table
ALTER TABLE public.candidates
ADD COLUMN IF NOT EXISTS experience_rating INT CHECK (experience_rating >= 1 AND experience_rating <= 5),
ADD COLUMN IF NOT EXISTS experience_comment TEXT;
