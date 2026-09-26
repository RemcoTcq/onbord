# Site public Onbord — `onbord.be`

La vitrine commerciale. **L'application est un autre projet**, à la racine du
dépôt, et vit sur `app.onbord.be`.

## Lancer en local

```bash
cd site
npm install      # la première fois seulement
npm run dev
```

→ **http://localhost:3001**

La racine redirige vers `/en`, `/fr` ou `/nl` selon la langue du navigateur.
Pour forcer une langue : `http://localhost:3001/fr`.

L'application se lance depuis la racine du dépôt avec `npm run dev` et répond
sur le port 3000. Les deux tournent en parallèle sans se gêner.

## Les pages

**L'anglais est la langue de référence** — la copie s'y écrit d'abord. Les URL
sont traduites dans chaque langue.

| Page | EN | FR | NL |
|---|---|---|---|
| Accueil | `/en` | `/fr` | `/nl` |
| Comment ça marche | `/how-it-works` | `/comment-ca-marche` | `/hoe-het-werkt` |
| Simulations | `/simulations` | `/simulations` | `/simulaties` |
| Notation | `/scoring` | `/notation` | `/beoordeling` |
| Tarifs | `/pricing` | `/tarifs` | `/tarieven` |

Plus trois pages légales, dont les adresses sont **identiques dans les trois
langues** : `/legal/terms`, `/legal/privacy`, `/legal/ai-transparency`. Elles
sont aussi accessibles sans préfixe de langue — `onbord.be/legal/terms` redirige
vers la bonne. C'est ce que l'application utilise : **ne pas casser ces
adresses** (voir `AGENTS.md`, règle 1).

## Ce que raconte le site

Il ne vend pas une promesse, il décrit un mécanisme — et tout ce qu'il affirme
est vérifiable dans le code de l'application : le barème de crédits, les formats
de simulation, l'interdiction des questions rétrospectives, la vérification des
citations, le plafonnement de la note en cas de recopiage de l'assistant IA.

Le tableau de correspondance complet est dans `AGENTS.md`, règle 2. Si le
produit change, c'est là qu'il faut regarder avant de modifier une phrase.

## Le design, en deux mots

Sombre, premium, l'IA mise en avant : fond bleu nuit, halos de lumière, cartes
en verre, titres en dégradé. Tout est dans `src/app/globals.css`, commenté par
section.

## L'accueil reste court, exprès

Une section = un titre + une phrase, et le **problème** avant les bénéfices. Le
détail vit sur les quatre pages intérieures : un paragraphe de plus sur
l'accueil a presque toujours sa place sur « Comment ça marche », « Simulations »
ou « Notation » à la place.

## Modifier un texte

Tout le contenu rédactionnel est dans `src/lib/i18n/dictionaries/{en,fr,nl}/` :

- `common.js` — navigation, pied de page, **et le contenu des maquettes**
- `home.js` — la page d'accueil
- `pages.js` — les quatre pages intérieures
- `legal.js` — les trois pages légales

Les trois langues ont exactement la même structure : trouvez la phrase dans
`en/`, modifiez-la dans les trois.

Les **prix** n'y sont pas — ils sont dans `src/lib/pricing.js`, recopiés du
barème de l'application (`src/lib/constants/plans.js`, à la racine). À
resynchroniser à la main quand les tarifs changent.

## Points ouverts

1. **Les pages légales** portent un encart « document de travail » et sont en
   `noindex`. Une fois relues par un juriste et les mentions « à compléter »
   remplies, passer `BROUILLON` à `false` dans
   `src/app/[lang]/legal/[doc]/page.js`.
2. **La demande de démo** ouvre un `mailto:`. Pour un vrai formulaire, un seul
   fichier à changer : `src/lib/contact.js`.
3. **Aucune image de partage** (OpenGraph) : un lien posté sur LinkedIn affiche
   le titre et la description, sans visuel.

## Mise en ligne

Voir `../docs/deploiement-domaines.md` : deux projets Vercel sur le même dépôt,
`onbord.be` sur celui-ci et `app.onbord.be` sur l'application, plus la sortie de
Framer.

## Construire

```bash
npm run build     # prérend les 29 pages
npm run start     # sert la version construite sur le port 3001
npm run lint
```
