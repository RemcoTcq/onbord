-- Migration pour le branding entreprise et les images de test

-- 1. Ajout de colonnes pour le branding dans la table 'users'
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS company_logo_url TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS brand_primary_color TEXT DEFAULT '#4f46e5';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS brand_secondary_color TEXT DEFAULT '#818cf8';

-- 2. Ajout de la colonne pour l'image dans la table 'assessment_questions'
ALTER TABLE public.assessment_questions ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 3. Initialisation optionnelle des buckets de stockage (Logos & Question Images)
-- Note : Il est recommandé de créer ces buckets manuellement en mode public depuis votre tableau de bord Supabase Storage
-- avec les identifiants 'logos' et 'test-questions'.
INSERT INTO storage.buckets (id, name, public) 
VALUES ('logos', 'logos', true) 
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('test-questions', 'test-questions', true) 
ON CONFLICT (id) DO NOTHING;

-- 4. Politiques de sécurité (RLS) pour les buckets de stockage
-- Permet aux utilisateurs authentifiés d'ajouter des fichiers, et à tout le monde de les lire en mode public.

-- RLS pour le bucket 'logos'
CREATE POLICY "Allow public read access for logos" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'logos');

CREATE POLICY "Allow authenticated insert access for logos" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'logos');

CREATE POLICY "Allow authenticated delete access for logos" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (bucket_id = 'logos');

-- RLS pour le bucket 'test-questions'
CREATE POLICY "Allow public read access for test-questions" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'test-questions');

CREATE POLICY "Allow authenticated insert access for test-questions" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'test-questions');

CREATE POLICY "Allow authenticated delete access for test-questions" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (bucket_id = 'test-questions');
