# Onbord

Recruter sur ce que les gens savent faire, pas sur ce qu'ils écrivent dans un CV.

Ce dépôt contient **deux applications Next.js indépendantes**.

## Le produit — `app.onbord.be`

Dans ce dossier (`./`). Offres, candidats, évaluations, résultats. Supabase, IA,
e-mails.

```bash
npm install
npm run dev      # http://localhost:3000
```

📖 `docs/application.md` — 🌍 `docs/i18n.md`

> ⚠️ Le projet Supabase configuré est la **production**. Il n'y a pas
> d'environnement de développement séparé.

## Le site public — `onbord.be`

Dans `site/`. La vitrine commerciale, en français, néerlandais et anglais. Aucune
base de données, entièrement statique.

```bash
cd site
npm install
npm run dev      # http://localhost:3001
```

📖 `site/README.md` — 🤖 `site/AGENTS.md`

## Mettre en ligne

📖 `docs/deploiement-domaines.md` — deux projets Vercel sur ce dépôt, la bascule
des domaines, et la sortie de Framer.

## Le seul lien entre les deux

L'application ouvre `onbord.be/legal/terms`, `/legal/privacy` et
`/legal/ai-transparency` depuis l'écran de consentement du candidat. Ces adresses
sont un contrat : voir `AGENTS.md`.
