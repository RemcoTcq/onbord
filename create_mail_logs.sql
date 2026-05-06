-- Table pour l'historique des mails envoyés (copiés)
CREATE TABLE IF NOT EXISTS public.mail_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID REFERENCES public.candidates(id) ON DELETE CASCADE,
    job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    mail_type TEXT NOT NULL, -- 'interview_invitation', 'selected', 'rejected'
    sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activation de la RLS
ALTER TABLE public.mail_logs ENABLE ROW LEVEL SECURITY;

-- Politiques de sécurité
DROP POLICY IF EXISTS "Users can view own mail logs" ON public.mail_logs;
CREATE POLICY "Users can view own mail logs" ON public.mail_logs FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.jobs WHERE jobs.id = mail_logs.job_id AND jobs.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can insert own mail logs" ON public.mail_logs;
CREATE POLICY "Users can insert own mail logs" ON public.mail_logs FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.jobs WHERE jobs.id = mail_logs.job_id AND jobs.user_id = auth.uid())
);
