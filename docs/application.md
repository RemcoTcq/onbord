# L'application — `app.onbord.be`

Le produit : transformer une offre d'emploi en évaluation, faire passer cette
évaluation à des candidats, et rendre des résultats justifiés.

**Ce document ne parle pas du site public.** Le site (`onbord.be`) est un projet
distinct, dans `site/`, avec sa propre documentation (`site/AGENTS.md`). Voir
`AGENTS.md` à la racine pour la répartition.

## Lancer en local

```bash
npm install
npm run dev      # http://localhost:3000
```

Il faut un `.env.local` renseigné (voir `.env.example`).

> ⚠️ **Le projet Supabase configuré est la PRODUCTION.** Il n'y a pas
> d'environnement de développement séparé. Une migration lancée en local
> s'applique aux vraies données. Une suppression aussi.

## La pile

| Brique | Rôle |
|---|---|
| Next.js 16 (App Router) | rendu, routage, server actions |
| Supabase | PostgreSQL, authentification, RLS |
| Anthropic (Claude) | extraction des compétences, génération, correction |
| Resend | e-mails transactionnels |
| Vercel | hébergement, et le cron de purge quotidien |

## Les deux parcours

L'application sert **deux publics qui ne se ressemblent pas**, et c'est ce qui
explique la forme du routage.

### Le recruteur — connecté, URL préfixées par la langue

```
/[lang]/(auth)/login
/[lang]/(dashboard)/accueil
                   /jobs        offres et leur expérience générée
                   /assessments évaluations
                   /compte      profil, facturation
                   /admin       création de comptes, invitations
```

### Le candidat — pas de compte, URL sans préfixe de langue

```
/apply/[job_id]        candidature publique
/assessment/[token]    hub historique
/run/[token]           l'expérience : c'est là que tout se passe
/interview/[token]     ancien lien, redirige
/join                  invitation recruteur (jeton en query)
```

Un candidat **n'a pas de compte**. Son identité est son `interview_token`,
vérifié côté serveur à chaque appel. La langue de son parcours vient de
l'**offre** (`jobs.experience_locale`), pas de son navigateur — d'où l'absence de
préfixe de langue dans ces URL. Le raisonnement complet est dans `src/proxy.js`,
qui mérite d'être lu en entier avant d'y toucher.

## Les deux axes de langue

C'est l'erreur la plus coûteuse à défaire du projet, parce qu'elle se propage
jusque dans le schéma de la base et dans les prompts :

- `ui_locale` — la langue du **recruteur** dans son tableau de bord. FR / EN.
- `experience_locale` — la langue de **l'offre** et du parcours candidat.
  FR / EN / NL. Choisie à la création de l'offre, figée ensuite : l'expérience
  générée est stockée rédigée dans cette langue.

Les deux ne se déduisent pas l'un de l'autre. Tout est expliqué dans
`docs/i18n.md` et `src/lib/i18n/config.js`.

Vérifications automatiques :

```bash
npm run check:i18n     # chaînes en dur, clés manquantes
npm run check:langue
```

Un hook `pre-commit` (`githooks/pre-commit`, activé par `npm install`) les passe
avant chaque commit.

## Où se trouve quoi

```
src/
├── proxy.js                  Langue, PUIS session. L'ordre compte.
├── app/
│   ├── globals.css           Style de l'APPLICATION (pas du site)
│   ├── layout.js             Layout racine
│   ├── [lang]/               Recruteur : (auth) et (dashboard)
│   ├── apply|assessment|run|interview|join/   Parcours candidat
│   └── api/                  chat, cron/purge, experience/generate,
│                             run/assistant, transcribe
├── components/               assessment, auth, billing, candidates, jobs,
│                             layout, onboarding, settings, ui
└── lib/
    ├── actions/              Server actions — le cœur métier
    ├── constants/legal.js    ⚠️ Les trois URL du site public
    ├── emails/, resend.js    E-mails transactionnels
    ├── i18n/                 Dictionnaires, détection, prompts traduits
    ├── interview/, supabase/, utils/
migrations/                   SQL numéroté, appliqué à la main
scripts/                      Vérifications i18n, extraction
```

## Base de données et migrations

Les migrations sont dans `migrations/`, numérotées. **Elles ne s'appliquent pas
toutes seules** : il faut les passer à la main dans le SQL Editor de Supabase.
Une migration écrite n'est donc pas une migration appliquée — vérifier l'état
réel avant de supposer qu'une colonne existe.

Les tables candidats sont protégées par des politiques **RLS** dont certaines
sont contre-intuitives (le jeton d'un candidat ne peut pas être vérifié en SQL).
Ne pas supprimer une politique sans comprendre ce qu'elle garde ouvert.

## Ce qui surprend, et qu'il vaut mieux savoir avant

- **L'inscription publique est fermée.** Les comptes sont créés depuis `/admin`
  en `service_role`. Retirer la page `/register` ne ferme rien : la vraie
  fermeture est un réglage du tableau de bord Supabase, parce que le navigateur
  appelle Supabase directement avec la clé anon, qui est publique par
  construction. Conséquence : les liens d'invitation `/join` ne fonctionnent pas
  tant que l'inscription est fermée.
- **Supprimer un compte échoue** tant que les lignes de `public.users` et
  `user_usage` n'ont pas été effacées avant : elles référencent `auth.users`
  sans `ON DELETE CASCADE`.
- **Deux circuits d'e-mail** coexistent : ceux de l'authentification Supabase et
  ceux de l'application via Resend. Un diagnostic qui les confond ne trouve rien.

## Vérifier avant de livrer

```bash
npm run build
npm run lint
npm run check:i18n
```
