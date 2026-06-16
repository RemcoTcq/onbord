-- Migration: Create unmapped_skills_log table
-- Purpose: Log skills that could not be mapped to the taxonomy for future enrichment

CREATE TABLE IF NOT EXISTS public.unmapped_skills_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  skill_name TEXT NOT NULL,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  job_title TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for querying most frequent unmapped skills
CREATE INDEX IF NOT EXISTS idx_unmapped_skills_name ON public.unmapped_skills_log(skill_name);

-- RLS: allow authenticated users to insert (server-side only in practice)
ALTER TABLE public.unmapped_skills_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated insert on unmapped_skills_log"
  ON public.unmapped_skills_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated select on unmapped_skills_log"
  ON public.unmapped_skills_log FOR SELECT
  TO authenticated
  USING (true);
