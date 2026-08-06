-- ============================================================================
-- Migration 011 — RLS policies for Experience tables
-- ============================================================================
-- experiences & experience_steps : recruiter ownership via jobs.user_id
-- candidate_runs, run_step_responses, run_ai_messages, run_scores :
--   service_role only (no anon/user policy), accessed via createAdminClient().
-- ============================================================================

-- experiences : SELECT / INSERT / UPDATE for owner
CREATE POLICY "recruiter_select_own_experiences" ON public.experiences
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.jobs WHERE jobs.id = experiences.job_id AND jobs.user_id = auth.uid())
  );

CREATE POLICY "recruiter_insert_own_experiences" ON public.experiences
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.jobs WHERE jobs.id = experiences.job_id AND jobs.user_id = auth.uid())
  );

CREATE POLICY "recruiter_update_own_experiences" ON public.experiences
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.jobs WHERE jobs.id = experiences.job_id AND jobs.user_id = auth.uid())
  );

-- experience_steps : SELECT / INSERT / UPDATE / DELETE for owner
CREATE POLICY "recruiter_select_own_steps" ON public.experience_steps
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.experiences e
      JOIN public.jobs j ON j.id = e.job_id
      WHERE e.id = experience_steps.experience_id AND j.user_id = auth.uid()
    )
  );

CREATE POLICY "recruiter_insert_own_steps" ON public.experience_steps
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.experiences e
      JOIN public.jobs j ON j.id = e.job_id
      WHERE e.id = experience_steps.experience_id AND j.user_id = auth.uid()
    )
  );

CREATE POLICY "recruiter_update_own_steps" ON public.experience_steps
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.experiences e
      JOIN public.jobs j ON j.id = e.job_id
      WHERE e.id = experience_steps.experience_id AND j.user_id = auth.uid()
    )
  );

CREATE POLICY "recruiter_delete_own_steps" ON public.experience_steps
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.experiences e
      JOIN public.jobs j ON j.id = e.job_id
      WHERE e.id = experience_steps.experience_id AND j.user_id = auth.uid()
    )
  );
