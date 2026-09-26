# Deux produits dans ce dépôt

Ce dépôt contient **deux applications Next.js indépendantes**. Elles ne
partagent aucun code, aucune base de données, aucun déploiement — seulement un
dépôt Git et une marque.

| | Application | Site public |
|---|---|---|
| Adresse | **app.onbord.be** | **onbord.be** |
| Dossier | `./` (ce dossier) | `site/` |
| Rôle | le produit : offres, candidats, évaluations, résultats | la vitrine commerciale |
| Public | recruteurs connectés, candidats invités par lien | visiteurs, prospects |
| Données | Supabase (PostgreSQL + RLS), IA, e-mails | aucune |
| Lancer | `npm run dev` → port **3000** | `cd site && npm run dev` → port **3001** |
| Documentation | `docs/application.md` | `site/AGENTS.md` |

**Avant d'écrire une ligne, sachez dans lequel des deux vous êtes.** Un
changement de style dans `src/app/globals.css` ne touche pas le site ; un
changement dans `site/src/app/globals.css` ne touche pas l'application. Les deux
fichiers existent, portent le même nom, et n'ont rien à voir l'un avec l'autre.

## Par où commencer

- **Travailler sur l'application** → lisez `docs/application.md`, puis
  `docs/i18n.md` si vous touchez à du texte.
- **Travailler sur le site** → lisez `site/AGENTS.md`. Tout y est.
- **Brancher les domaines, sortir de Framer** → `docs/deploiement-domaines.md`.

## Le seul point de contact entre les deux

L'application ouvre trois URL du site en dur, depuis l'écran de consentement du
candidat (`src/lib/constants/legal.js`) :

```
https://onbord.be/legal/terms
https://onbord.be/legal/privacy
https://onbord.be/legal/ai-transparency
```

Ces adresses sont un **contrat**. Elles sont déjà parties par e-mail à des
candidats. Les renommer d'un côté sans l'autre casse le consentement en
production. C'est la seule dépendance entre les deux projets : elle tient en
trois lignes, et elle mérite de rester aussi petite.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
