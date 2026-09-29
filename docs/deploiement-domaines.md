# Mise en ligne : deux domaines, un dépôt, et la sortie de Framer

Objectif :

| Adresse | Sert | Projet Vercel | Root Directory |
|---|---|---|---|
| `onbord.be` + `www.onbord.be` | le site public | **onbord-site** (à créer) | `site` |
| `app.onbord.be` | l'application | celui qui existe déjà | `.` (racine) |

Un seul dépôt Git, deux projets Vercel. C'est le fonctionnement normal de
Vercel : chaque projet a un « Root Directory » et ignore le reste du dépôt.

---

## 1. Créer le projet Vercel du site

1. Vercel → **Add New → Project** → importer **le même dépôt** que
   l'application.
2. **Root Directory : `site`** ← l'étape à ne pas rater. Sans elle, Vercel
   construit l'application une deuxième fois.
3. Framework : Next.js (détecté tout seul).
4. Variables d'environnement :

   | Nom | Valeur |
   |---|---|
   | `NEXT_PUBLIC_SITE_URL` | `https://onbord.be` |
   | `NEXT_PUBLIC_APP_URL` | `https://app.onbord.be` |

   Les deux ont une valeur par défaut correcte dans le code
   (`site/src/lib/i18n/config.js`) ; les poser explicitement évite qu'une
   préproduction annonce les URL de production aux moteurs de recherche.

5. Déployer. Vercel donne une adresse en `*.vercel.app` : **tout vérifier
   dessus avant de toucher au DNS.** Le site y est déjà pleinement
   fonctionnel, dans les trois langues.

## 2. Vérifier l'application

Rien à faire si `app.onbord.be` pointe déjà sur le projet existant. Sinon,
ajouter le domaine `app.onbord.be` à ce projet dans **Settings → Domains**.

Vérifier aussi que ce projet a bien `NEXT_PUBLIC_APP_URL=https://app.onbord.be`,
qui sert à fabriquer les liens de candidature envoyés aux candidats.

## 3. Basculer le domaine depuis Framer

L'ordre compte. Fait dans le mauvais sens, le site est injoignable pendant
quelques heures.

1. **D'abord**, dans le projet Vercel du site : **Settings → Domains** →
   ajouter `onbord.be`, puis `www.onbord.be`. Vercel affiche alors les
   enregistrements DNS exacts à créer, et se plaint qu'ils pointent ailleurs :
   c'est normal, Framer les occupe encore.
2. **Chez le registrar** (là où le nom de domaine est acheté), remplacer les
   enregistrements de Framer par ceux que **Vercel affiche**. En général un
   `A` sur l'apex et un `CNAME` sur `www` — recopier ce que le tableau de bord
   indique, pas une valeur trouvée ailleurs : Vercel en change parfois.
3. **Attendre.** La propagation DNS prend de quelques minutes à quelques
   heures. Vercel passe les domaines en « Valid Configuration » et émet le
   certificat HTTPS tout seul.
4. **Vérifier** : `https://onbord.be` affiche le nouveau site,
   `https://www.onbord.be` y redirige, `https://app.onbord.be` affiche toujours
   l'application.
5. **Seulement ensuite**, retirer le domaine du site Framer, puis résilier
   l'abonnement. Résilier d'abord ferait tomber le site pendant la propagation.

### État au 23 septembre 2026

Fait côté Vercel : `onbord.be` et `www.onbord.be` sont rattachés au projet
**onbord-site**, et `www` redirige en 308 vers l'apex. Reste le DNS, géré chez
**Hostinger** (serveurs de noms `ns1/ns2.dns-parking.com`) :

| Type | Nom | Valeur | Remplace |
|---|---|---|---|
| A | `@` | `216.198.79.1` | les A de Framer, `31.43.160.6` et `31.43.161.6` |
| A | `@` | `64.29.17.1` | (idem) |
| CNAME | `www` | `173a4dd28c6b8f2b.vercel-dns-017.com.` | `sites.framer.app.` |

⚠️ **Ne changez PAS les serveurs de noms**, même si Vercel le propose : la
zone Hostinger porte aussi `app.onbord.be` (l'application) et les MX
`mx1/mx2.hostinger.com` (la boîte `hello@onbord.be`, vers laquelle pointent
TOUS les boutons du site). Basculer les serveurs de noms les ferait tomber.
Ne touchez qu'aux trois lignes du tableau.

Vérifier ensuite avec `vercel domains verify onbord.be` (et `www.onbord.be`),
depuis la racine du dépôt. Sous Git Bash, préfixer les appels `vercel api` de
`MSYS_NO_PATHCONV=1`, sinon le chemin `/v9/...` est réécrit en chemin Windows.

## 4. Vérifications après bascule

```
https://onbord.be                      → redirige vers /en, /fr ou /nl
https://onbord.be/legal/terms          → redirige vers /{langue}/legal/terms
https://onbord.be/legal/privacy        → idem
https://onbord.be/legal/ai-transparency → idem
https://onbord.be/fr/tarifs            → la page des tarifs en français
https://onbord.be/nl/tarieven          → la même en néerlandais
https://www.onbord.be                  → redirige (308) vers https://onbord.be
https://onbord.be/robots.txt           → annonce onbord.be/sitemap.xml
https://onbord.be/sitemap.xml          → les trois langues
https://app.onbord.be                  → l'application, intacte
```

Les trois adresses `/legal/*` sont les plus importantes de la liste : ce sont
celles que l'application ouvre depuis l'écran de consentement du candidat
(`src/lib/constants/legal.js`). Aujourd'hui, sur Framer, elles renvoient un 404.

## 5. Référencement — ce qui change en partant de Framer

- Les **URL changent de forme** : le site Framer servait probablement `/` sans
  préfixe de langue, le nouveau site sert `/en`, `/fr`, `/nl`, et ses pages
  intérieures ont une adresse traduite par langue (`/fr/comment-ca-marche`,
  `/nl/hoe-het-werkt`). La racine redirige, donc aucun lien entrant ne se perd,
  mais les positions acquises mettent quelques semaines à se reporter.
- Le **sitemap** est généré automatiquement (`site/src/app/sitemap.js`) à partir
  de `routes.js`, avec les balises `hreflang` qui disent aux moteurs que les
  trois langues sont la même page. À soumettre dans Google Search Console après la bascule.
- Les **pages légales sont en `noindex`** tant qu'elles sont à l'état de
  brouillon — voir `BROUILLON` dans
  `site/src/app/[lang]/legal/[doc]/page.js`.

## À faire avant d'ouvrir au public

1. **Les tarifs** de `site/src/lib/pricing.js` sont recopiés du barème réel de
   l'application (`src/lib/constants/plans.js`). Vérifier qu'ils sont toujours
   à jour — c'est la seule recopie entre les deux projets.
2. ~~**Les pages légales**~~ : fait le 29 septembre 2026. Les trois textes
   définitifs sont en ligne (anglais seulement), indexables, sans bandeau de
   brouillon. Le mécanisme `BROUILLON` a été retiré avec eux.
3. **La demande de démo** ouvre un `mailto:`. Si un formulaire est préféré,
   un seul fichier à changer : `site/src/lib/contact.js`.
4. **Une image de partage** (OpenGraph) : aujourd'hui un lien partagé sur
   LinkedIn ou WhatsApp affiche le titre et la description, sans visuel.
