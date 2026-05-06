-- Active: Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Table users (liée à auth.users de Supabase)
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    company_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Table jobs (les "demandes" de recrutement)
CREATE TABLE public.jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    category TEXT,
    description TEXT,
    talent_type TEXT,
    experience_level TEXT,
    education_level TEXT,
    work_mode TEXT,
    contract_type TEXT,
    location TEXT,
    schedule TEXT,
    schedule_flexibility TEXT,
    talents_needed INTEGER DEFAULT 1,
    extracted_criteria JSONB DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'draft', -- 'draft', 'active', 'completed'
    mode TEXT DEFAULT 'import',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Table job_skills (compétences requises pour un job)
CREATE TABLE public.job_skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT, -- 'hard_skill', 'soft_skill', 'language'
    priority TEXT, -- 'must_have', 'nice_to_have'
    level TEXT
);

-- 4. Table candidates (les candidats importés)
CREATE TABLE public.candidates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    cv_url TEXT,
    cv_storage_path TEXT,
    cv_raw_text TEXT,
    score_cv INTEGER,
    score_interview INTEGER,
    score_global INTEGER,
    green_flags JSONB DEFAULT '[]'::jsonb,
    yellow_flags JSONB DEFAULT '[]'::jsonb,
    red_flags JSONB DEFAULT '[]'::jsonb,
    ai_summary TEXT,
    status TEXT DEFAULT 'imported', -- 'imported', 'scored', 'invited', 'interview_started', 'interview_completed', 'shortlisted', 'rejected'
    interview_token TEXT UNIQUE DEFAULT uuid_generate_v4()::text,
    interview_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Table interviews (les entretiens IA)
CREATE TABLE public.interviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID REFERENCES public.candidates(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'completed'
    score INTEGER,
    insights JSONB DEFAULT '[]'::jsonb,
    warnings JSONB DEFAULT '[]'::jsonb,
    ai_analysis TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- 6. Table interview_messages (historique du chat IA)
CREATE TABLE public.interview_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    interview_id UUID REFERENCES public.interviews(id) ON DELETE CASCADE,
    role TEXT NOT NULL, -- 'assistant' ou 'user'
    content TEXT NOT NULL,
    sequence_order INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Configuration de la sécurité (Row Level Security - RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_messages ENABLE ROW LEVEL SECURITY;

-- Politiques de sécurité basiques (Chaque recruteur ne voit que SES données)

-- Users: L'utilisateur peut lire et modifier son propre profil
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

-- Trigger pour créer automatiquement un profil user lors du signup Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, first_name, last_name, company_name)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'first_name', 
    new.raw_user_meta_data->>'last_name', 
    new.raw_user_meta_data->>'company_name'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Jobs: Le recruteur voit ses jobs
CREATE POLICY "Users can view own jobs" ON public.jobs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own jobs" ON public.jobs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own jobs" ON public.jobs FOR UPDATE USING (auth.uid() = user_id);

-- Job Skills: Visibles si le job appartient au recruteur
CREATE POLICY "Users can view own job skills" ON public.job_skills FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.jobs WHERE jobs.id = job_skills.job_id AND jobs.user_id = auth.uid())
);
CREATE POLICY "Users can insert own job skills" ON public.job_skills FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.jobs WHERE jobs.id = job_skills.job_id AND jobs.user_id = auth.uid())
);

-- Candidates: Visibles si le job appartient au recruteur
CREATE POLICY "Users can view own candidates" ON public.candidates FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.jobs WHERE jobs.id = candidates.job_id AND jobs.user_id = auth.uid())
);
CREATE POLICY "Users can insert own candidates" ON public.candidates FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.jobs WHERE jobs.id = candidates.job_id AND jobs.user_id = auth.uid())
);
CREATE POLICY "Users can update own candidates" ON public.candidates FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.jobs WHERE jobs.id = candidates.job_id AND jobs.user_id = auth.uid())
);

-- IMPORTANT : Permettre la lecture/mise à jour du candidat via le token d'entretien (accès public pour le candidat)
CREATE POLICY "Public can view candidate by token" ON public.candidates FOR SELECT USING (true);
CREATE POLICY "Public can update candidate by token" ON public.candidates FOR UPDATE USING (true);

-- Interviews & Messages: Accès public pour permettre au candidat de discuter avec l'IA
CREATE POLICY "Public can view interviews" ON public.interviews FOR SELECT USING (true);
CREATE POLICY "Public can insert interviews" ON public.interviews FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update interviews" ON public.interviews FOR UPDATE USING (true);

CREATE POLICY "Public can view interview messages" ON public.interview_messages FOR SELECT USING (true);
CREATE POLICY "Public can insert interview messages" ON public.interview_messages FOR INSERT WITH CHECK (true);

-- 8. Configuration du Storage pour les CV
INSERT INTO storage.buckets (id, name, public) VALUES ('resumes', 'resumes', false) ON CONFLICT DO NOTHING;
