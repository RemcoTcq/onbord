-- ============================================
-- ÉTAPE 1 : Nettoyage Stripe dans Supabase
-- ============================================

-- Supprimer les colonnes Stripe de la table users
ALTER TABLE public.users DROP COLUMN IF EXISTS stripe_customer_id;
ALTER TABLE public.users DROP COLUMN IF EXISTS stripe_subscription_id;

-- Supprimer l'ancienne table invite_codes (remplacée par invite_tokens)
DROP TABLE IF EXISTS public.invite_codes;

-- ============================================
-- ÉTAPE 2 : Nouveau système invite_tokens
-- ============================================

-- S'assurer que la colonne plan existe
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'none';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS beta_expires_at TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- Remettre tous les comptes existants en admin (votre compte)
UPDATE public.users SET plan = 'admin' WHERE plan = 'none' OR plan IS NULL;

-- Table invite_tokens
CREATE TABLE IF NOT EXISTS public.invite_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token TEXT UNIQUE NOT NULL,
    plan TEXT NOT NULL DEFAULT 'core',            -- 'beta', 'core', 'pro', 'enterprise'
    used BOOLEAN NOT NULL DEFAULT false,
    used_by UUID REFERENCES public.users(id),
    expires_at TIMESTAMPTZ NOT NULL,              -- 7 jours après création
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.invite_tokens ENABLE ROW LEVEL SECURITY;

-- Politique : n'importe qui peut lire un token (pour le valider à l'inscription)
DROP POLICY IF EXISTS "Public can read tokens" ON public.invite_tokens;
CREATE POLICY "Public can read tokens" ON public.invite_tokens FOR SELECT USING (true);

-- Politique : n'importe qui peut marquer un token comme utilisé (à l'inscription)
DROP POLICY IF EXISTS "Public can update tokens" ON public.invite_tokens;
CREATE POLICY "Public can update tokens" ON public.invite_tokens FOR UPDATE USING (true);

-- Politique : seul un admin peut insérer des tokens (via service role ou dashboard)
-- En pratique, l'insertion se fait via la page admin côté serveur
DROP POLICY IF EXISTS "Authenticated can insert tokens" ON public.invite_tokens;
CREATE POLICY "Authenticated can insert tokens" ON public.invite_tokens FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Politique DELETE pour les admins
DROP POLICY IF EXISTS "Authenticated can delete tokens" ON public.invite_tokens;
CREATE POLICY "Authenticated can delete tokens" ON public.invite_tokens FOR DELETE USING (auth.uid() IS NOT NULL);

-- Vérification finale
SELECT id, email, plan FROM public.users;
