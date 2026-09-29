<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

# Le site public — `onbord.be`

**Vous êtes dans le SITE, pas dans l'application.** Ce dossier est un projet
Next.js autonome : son propre `package.json`, son propre `node_modules`, sa
propre feuille de style, son propre déploiement. Il ne partage **aucun code**
avec l'application qui vit à la racine du dépôt.

| | Site (ici) | Application (racine du dépôt) |
|---|---|---|
| Adresse | `onbord.be` | `app.onbord.be` |
| Rôle | vitrine commerciale | produit : offres, candidats, évaluations |
| Public | visiteurs, prospects | recruteurs connectés, candidats invités |
| Données | aucune (site statique) | Supabase, IA, e-mails |
| Lancer | `cd site && npm run dev` → port **3001** | `npm run dev` → port **3000** |

Les deux peuvent tourner en même temps, c'est fait pour.

## Démarrer

```bash
cd site
npm install      # la première fois seulement
npm run dev      # http://localhost:3001
```

## L'intention du site

Un site **clair, minimaliste, posé sur un quadrillage**. La référence, ce sont
les sites produit qui laissent respirer : fond blanc, trame technique en fond,
gros titres serrés en quasi-noir, et la couleur réservée à ce qui compte.

⚠️ **Le site a été SOMBRE jusqu'en septembre 2026** (fond bleu nuit, surfaces
en verre, halos radiaux). Il a basculé en clair sur demande directe, en
s'inspirant du style d'un gabarit que le client a envoyé — pas en le copiant.
Si vous croisez une valeur sombre en dur (`#0b1020`, un fond
`rgba(255,255,255,0.06)`, un `color: #fff` sur autre chose qu'un bloc bleu),
c'est un reste de cette époque : à convertir, jamais à imiter.

Les partis pris, à respecter en ajoutant quoi que ce soit :

- **la trame se partage en DEUX, et pas là où on croit.** Ce ne sont plus
  le hero d'un côté et le reste de la page de l'autre, mais le CENTRE et
  les CÔTÉS :

  - entre les deux filets verticaux, la trame est complète : verticales et
    horizontales, rien d'autre. ⚠️ **PLUS AUCUN CROISILLON.** Des « + »
    marquaient une intersection sur trois, dans le hero et dans la bande
    finale ; c'était le détail repris du gabarit de référence. Retirés des
    deux endroits, sur demande directe et en deux fois. Une trame nue se
    voit moins et se supporte plus longtemps ; les croix, elles, se
    comptent. La tuile SVG qui les dessinait a quitté la feuille, elle n'a
    pas été laissée en commentaire ni en classe morte ;
  - **au-delà des filets, les verticales s'arrêtent.** Il ne reste que les
    horizontales, qui traversent toute la fenêtre comme des lignes de
    portée. C'est ce contraste qui fait le décor du gabarit de référence,
    et une trame carrée continue d'un bord à l'autre fatigue et salit le
    blanc.

  La trame vit à deux endroits, le hero et la bande finale ; ailleurs il ne
  reste que les deux filets (`body::before`, un calque fixe).

  **La barre de navigation est DESSINÉE PAR la trame, pas posée dessus.**
  Elle fait donc **exactement un carreau de haut** : `--header-h` vaut
  `var(--grid-step)`.

  ⚠️ **Et le pas n'est plus un nombre : il se déduit de la hauteur
  d'écran**, `calc(100svh / 12)`. On veut que la barre et les rangées du
  hero remplissent le premier écran EXACTEMENT : une barre, onze rangées, et
  le bas du hero tombe pile sur le bas de la fenêtre. Comme la barre fait un
  carreau, ça s'écrit hauteur d'écran divisée par 12.

  La version d'avant rabotait la hauteur du hero au multiple inférieur
  (`round(down, …)`). Elle garantissait bien des rangées pleines, mais elle
  JETAIT jusqu'à un carreau entier : il restait une bande blanche entre la
  dernière rangée et le bas de l'écran. Conséquence à accepter en échange :
  le pas n'est plus rond (75px sur un écran de 900, 86,67 sur un de 1040) et
  il change d'une machine à l'autre. C'est sans importance, tout ce qui
  touche à la trame en dérive : hauteur de la barre, écart des deux filets,
  taille des cellules. **Ne le refixez pas en pixels** sans refaire ce
  calcul.

  ⚠️ **La barre ne dessine plus elle-même son filet en haut de page.** Elle
  en portait un, posé juste au-dessus de la première horizontale de la
  trame : deux traits d'un pixel collés l'un à l'autre, donc un filet qui
  paraissait deux fois trop épais. La trame le dessine seule ; la barre ne
  reprend le sien qu'une fois posée (`.header--stuck`), où elle est blanche
  opaque et recouvre la trame.

  ⚠️ **Le hero fait onze carreaux de haut**, par construction (`--hero-h`),
  et la hauteur est imposée, pas seulement minimale : le
  contenu dépassait de quelques dizaines de pixels et réimposait la sienne.
  Ce qui déborde est la fenêtre de l'application, déjà coupée par le bas du
  hero, donc la rogner d'un cran de plus ne change rien à ce qu'elle
  raconte. Sans ça, la DERNIÈRE rangée était coupée, exactement le même
  défaut que la première sous la barre. `overflow: clip` et non `hidden` :
  `hidden` ferait du hero un conteneur de défilement et neutraliserait le
  `sticky` de son titre.

  ⚠️ **Et c'est pour ça que LE CIEL N'EST PLUS DANS LE HERO** mais sur
  `.home`. Il était un pseudo du hero, débordant de 68px vers le haut pour
  passer derrière la barre, qui est transparente en haut de page. Le jour où
  le hero s'est mis à rogner ce qui dépasse de lui, ce débordement a été
  rogné aussi et la barre s'est retrouvée sur du blanc. Il couvre maintenant
  la barre ET le hero depuis `.home`, qui ne rogne rien. C'est aussi
  pourquoi `--hero-h` est déclarée sur `:root` et non sur le hero : le ciel
  en a besoin.

  ⚠️ **Et les rangées s'ancrent en HAUT, pas au centre.** Le motif des
  horizontales était positionné en `center` : la première rangée sous la
  barre tombait donc où elle voulait, et elle était presque toujours
  COUPÉE. On voyait un demi-bloc coincé entre la barre et la première vraie
  rangée, ce qui donnait à la barre l'air d'avoir un gros soulignement.
  Ancrées en haut, les rangées partent du filet de la barre : la première
  ligne EST ce filet, et toutes les suivantes font un bloc plein.
  Son filet du bas existe dès le haut de page (il n'apparaissait qu'au
  défilement) et il est peint à l'encre des lignes du haut du hero : c'est
  la première horizontale de la trame, pas une bordure de plus. Corollaire,
  et c'est l'autre moitié de la règle : **aucune verticale de la TRAME ne
  traverse la barre**. Elle commence sous elle, d'où les `inset` de
  `.colonnes--hero` et `.hero--full::after`. Une vingtaine de traits qui
  montent jusqu'en haut de l'écran hachent la navigation et lui font perdre
  son statut de barre.

  ⚠️ **Les DEUX FILETS, eux, la traversent** — mais ils y sont dessinés par
  la barre elle-même (`.header::after`), et non par le calque fixe
  (`body::before`), qui s'arrête sous elle. Ce n'est pas un doublon : c'est
  le seul moyen de les avoir BLANCS dans la barre et GRIS sur le reste de la
  page. Le calque fixe ne défile pas avec le contenu, donc il ne peut pas
  savoir s'il se trouve au-dessus du ciel du hero, où une encre blanche
  s'impose, ou au-dessus du blanc des sections suivantes, où elle serait
  invisible. La barre, elle, sait.

  Les deux se rejoignent sans décrochage parce qu'ils partagent les mêmes
  positions (`calc(50% ± var(--rule-x))`) et la même façon de dessiner le
  trait, décalée d'un demi-pixel. Une fois la barre posée, son fond blanc
  opaque passe par-dessus et les fait disparaître : c'est voulu, la barre
  devient alors une bande pleine.

  Ces deux filets ne sont pas des lignes de trame mais les bords de la
  page : ils l'encadrent d'un bout à l'autre, barre comprise. Deux traits ne
  hachent rien, ils cadrent. Ne confondez pas les calques, ils ont la même
  couleur et des rôles opposés.

  **Dans le hero, la trame CHANGE D'ENCRE en descendant** : blanche en haut,
  sur le bleu du ciel, grise en bas, sur le blanc de la page. Une seule
  encre devait sinon convenir aux deux fonds, et perdait dans les deux cas :
  le gris se noyait dans le bleu, le blanc disparaissait sur le blanc.

  ⚠️ **C'est un retournement de la technique habituelle, et il faut le voir
  avant de modifier ces règles** : ce n'est plus le fond qui dessine les
  lignes et le masque qui les estompe, c'est le FOND qui porte le dégradé
  d'encre et le MASQUE qui découpe les lignes dedans. Un motif de fond ne
  peut pas changer de couleur selon sa position ; un aplat dégradé masqué,
  si. Conséquence directe : **ne remettez pas de `mask-image` d'estompage**
  sur ces deux calques, il remplacerait celui qui dessine les lignes et
  toute la trame disparaîtrait d'un coup.

  ⚠️ **Et le dégradé couvre le bloc entier, il ne se répète pas.**
  `.colonnes` pose `background-size: var(--grid-step) var(--grid-step)`,
  hérité du temps où le fond dessinait lui-même les lignes. Depuis le
  retournement, cette taille DÉCOUPAIT LE DÉGRADÉ EN CARREAUX : chaque
  cellule de 85px rejouait le passage du blanc au gris, donc chaque petit
  trait allait du blanc en haut au gris en bas, et la page entière n'avait
  aucun dégradé. Le bug est invisible à la lecture de la règle, parce que la
  déclaration fautive est dans l'AUTRE. `100% 100%` + `no-repeat` étire le
  dégradé sur toute la hauteur : le blanc est en haut de la PAGE, le gris en
  bas de la PAGE.

  ⚠️ **Le dégradé va de blanc OPAQUE à gris clair OPAQUE**, et c'est le
  réglage qui a demandé le plus d'essais. Toutes les versions ratées
  interpolaient entre deux couleurs TRANSPARENTES, un blanc et un bleu
  nuit. Deux défauts qui se suivent : au milieu, l'opacité tombe et la ligne
  disparaît, ce qui se lit comme un bug d'affichage ; et si on remonte
  l'opacité de la teinte de passage pour la rattraper, elle vire au gris ou
  au bleu beaucoup trop tôt, alors que le fond est encore presque blanc.

  Les deux bouts sont donc opaques : blanc pur en haut, et en bas
  exactement la couleur que donne `--grid` posé sur du blanc (`#f1f3f5`),
  pour que le relais par les deux filets du site soit invisible.

  Vérifiez-le toujours sur une colonne étroite prise HORS du contenu : au
  milieu de la page, le titre et la fenêtre masquent justement la zone qui
  pose problème.

  **Sur téléphone (≤ 760px), le hero n'a pas de fenêtre d'application** :
réduite à cette largeur, elle ne montrait que des barres grises et
repoussait la page d'un écran. Il s'arrête à la barre de saisie. Le fondu du
titre (`AppPeek.js`) sort tôt quand la fenêtre est masquée : sans ce garde,
le rectangle d'un élément `display: none` vaut zéro, la marge calculée
devenait négative et le titre disparaissait dès l'arrivée.

**Le hero est FERMÉ par un filet**, qui répond à celui de la barre de
  navigation : la trame commence sous l'un et se termine sur l'autre, et le
  hero devient une bande fermée plutôt qu'une zone qui s'arrête. ⚠️ Il tombe
  pile sur la coupe de la fenêtre de l'application, et ce n'est pas une
  coïncidence à entretenir à la main : `.peek` est masquée sur le bas du
  hero, donc son bord visible EST le bas du hero. Un filet posé ailleurs,
  même de quelques pixels, donnerait deux horizontales presque superposées.

  ⚠️ **Il n'y a PLUS de couture floutée en bas du hero.** Elle y a vécu
  deux vies : d'abord avec un voile blanc qui effaçait purement et
  simplement les traits d'un pixel de la trame, puis en flou seul. Retirée
  entièrement : la trame n'a pas besoin de disparaître en bas du hero,
  puisque ses lignes s'y terminent déjà sur exactement l'encre des deux
  filets du site, qui prennent le relais. Le flou ne faisait donc plus
  qu'effacer la fin des lignes, ce qui se voyait comme une zone morte en bas
  de l'écran. Il reste UNE couture sur le site, à l'entrée de la bande
  finale.
  **Et la trame ne s'arrête plus.** Elle s'estompait avant le bas du hero ;
  elle descend maintenant jusqu'au bord, où la couture floutée la dissout,
  et les deux filets du site prennent le relais pour le reste de la page.

  Les verticales sont un ÉLÉMENT (`.colonnes`) et non un pseudo, aux trois
  endroits où elles servent : les pseudos de ces blocs sont déjà pris par le
  ciel, les horizontales et la couture floutée.

  ⚠️ **Les filets se placent tout seuls, ne les fixez plus à la main.**
  Ils étaient à une distance fixe du centre (8 pas), calculée pour tomber
  sur une ligne de la trame à 1440px de large ; sur un écran plus large la
  trame continuait bien au-delà d'eux. `--rule-x` se calcule maintenant :
  `round(down, …)` prend la dernière ligne qui tient à l'écran, PUIS on
  recule de DEUX carreaux. En quittant sa ligne, le filet fait aussi
  disparaître le trait de trame qui s'y trouvait, puisque la bande de
  verticales commence à lui. Le filet tombe donc toujours sur une ligne, quelle
  que soit la largeur, et il reste une colonne pleine de chaque côté, où
  seules courent les horizontales. Sans ce recul, le filet se collait à une
  trentaine de pixels du bord : la page n'avait plus de marge, elle était
  coupée net. Le `max()` de 7 pas est un plancher et non un réglage : sous
  1266px, le recul ferait passer le filet DANS le contenu. Un repli en
  `min()` reste déclaré avant, pour les navigateurs sans `round()`.

  ⚠️ **TOUT CE QUI TOUCHE AUX FILETS SE DÉDUIT DE LA FENÊTRE, rien n'est
  réglé à l'œil sur un seul écran.** Le site a été calé sur un grand écran
  (1912 × 912), et sur le portable de l'auteur (1920 × 1080 à 125 %, soit
  environ 1520 × 690 en pixels CSS) tout s'est décalé d'un coup : la barre de
  navigation avait une largeur FIXE (1320px) alors que les filets suivent la
  fenêtre, et le plancher des filets était en carreaux alors que le carreau
  suit la hauteur d'écran (58px sur ce portable). Les filets passaient donc
  à l'intérieur de la barre et du contenu. Aujourd'hui :

  - la barre fait exactement la largeur entre les deux filets
    (`max-width: calc(var(--rule-x) * 2)`), avec un retrait constant ;
  - le plancher des filets est en pixels (560px, soit la demi-colonne de
    contenu plus 30px), arrondi vers le haut à une ligne de la trame.

  Vérifié de 1280 × 720 à 2560 × 1440 : logo et bouton à 45–53px des
  filets, contenu toujours entre eux, aucun chevauchement. **Toute retouche
  de cette zone se vérifie sur plusieurs tailles, pas sur une.**

  ⚠️ **TOUT S'ANCRE À GAUCHE, ET RIEN N'EST CENTRÉ.** C'est la règle qui a
  demandé le plus d'allers-retours, et voici la version qui tient.

  La trame a longtemps empilé trois centrages : bord gauche de la bande à
  `50% - rule-x`, motif positionné en `center`, trait au milieu de sa tuile.
  Chacun se défend, mais ensemble ils tombaient à côté. Deux symptômes,
  qu'on ne rattachait pas à la même cause : la première verticale se
  retrouvait un carreau À L'INTÉRIEUR de la bande (la ligne du bord était
  rognée) alors que la dernière tombait pile sur le bord droit, donc la page
  n'était pas symétrique ; et le filet du calque fixe ne coïncidait plus
  avec la trame à gauche, ce qui donnait un trait gris épais d'un côté et un
  trait blanc fin de l'autre.

  Le réseau est maintenant défini une seule fois : **les lignes tombent à
  `50vw - 1px ± n × pas`**. Pour y arriver, le bord gauche de la bande EST
  la première ligne (`calc(50vw - var(--rule-x) - 1px)`), le trait est au
  BORD de sa tuile et le motif s'ancre à gauche (`left top`). Plus aucun
  centrage, donc plus rien à compenser.

  ⚠️ **`50vw` et non `50%` dans `background-position`.** Un pourcentage
  aligne le point 50% de l'IMAGE sur le point 50% du conteneur, ce qui pour
  une image d'1px donne `(largeur - 1) / 2` : un demi-pixel plus à gauche
  que le vrai milieu. Le trait tombait à cheval sur deux pixels, d'où son
  air épais et légèrement décalé. Une longueur se mesure bord à bord, sans
  cette subtilité.

  ⚠️ **Et dans le hero, la trame passe AU-DESSUS du calque fixe**
  (`.colonnes--hero`, `z-index: 1`). Les deux dessinent la même ligne au
  même pixel, l'une en blanc et l'autre en gris ; à égalité de `z-index`,
  c'était l'ordre du document qui tranchait, et il ne donnait pas le même
  gagnant à gauche et à droite.

  Vérifiez toujours ce genre de réglage en LISANT LES PIXELS, pas à l'œil :
  une capture, un canvas, et la liste des colonnes qui diffèrent de leurs
  voisines. Trois corrections d'affilée ont semblé bonnes à l'écran alors
  que la mesure montrait un décalage d'un demi-pixel.
  **Le bleu ne subsiste qu'à trois endroits** : le hero (le ciel, le halo,
  le mot accentué du titre, le bac à sable et son bouton), les BOUTONS
  d'action partout ailleurs, et les deux états système (`:focus-visible`,
  `::selection`). Rien d'autre. Si vous ajoutez une maquette, elle naît en
  noir et blanc ;

  ⚠️ Conséquences de nommage, pour ne pas chercher longtemps : `.tag--blue`
  a été renommée `.tag--ink` le jour où elle a cessé d'être bleue, et les
  dilutions de bleu des maquettes (`rgba(37, 99, 235, …)`) sont devenues
  des dilutions de bleu nuit (`rgba(7, 41, 75, …)`), la même famille que
  `--surface` et `--border`. L'échelle `--blue-*` reste déclarée : elle
  sert encore au hero et aux boutons ;
- **la typo est NOIRE, partout, sauf dans le hero.** Le dégradé bleu du mot
  accentué (`.em`) a été la signature du site pendant toute sa vie, sur
  chaque titre de chaque section. Il ne subsiste QUE dans le hero. Répété six
  fois dans une page, un mot en dégradé bleu est exactement ce que produit
  n'importe quel site généré ; gardé une seule fois, il redevient un accent.
  Les intitulés de section (`.eyebrow`) sont passés au gris pour la même
  raison : c'était le seul élément coloré qui revenait à chaque section ;
- **intitulés de section entre crochets** (`[ THE DIFFERENCE ]`), au-dessus
  d'un titre CENTRÉ et d'un sous-titre gris centré. La pastille lumineuse
  d'avant ne tenait que sur fond sombre. Les sections en `.duo` (texte à côté
  d'une maquette) gardent leur fer à gauche : ce n'est pas le même geste de
  lecture, et tout centrer donnerait une page en colonne de mariage ;
- **grille bento** : les cartes n'ont pas toutes la même largeur (7+5, 5+7,
  6+6). Six cartes de taille égale ne seraient qu'un tableau ;
- **maquettes d'interface en HTML**, jamais en image (voir plus bas).

⚠️ **Il n'y a PLUS AUCUN bloc sombre, et plus aucun texte blanc légitime.**
L'appel final (`.cta`) a été, jusqu'en septembre 2026, un pavé bleu nuit à
texte blanc. Il est maintenant clair, posé sur la trame du hero. Si vous
croisez un `color: #fff` ailleurs que sur un bouton bleu ou dans une
maquette, c'est un reste, pas une intention.

⚠️ Attention à la SPÉCIFICITÉ CSS : `.card p` et `.card h3` habillent toutes les
cartes. Une règle plus précise doit passer devant — c'est pourquoi les styles de
plan tarifaire s'écrivent `.plan .plan__price` et non `.plan__price` : sans ça,
`.card p` l'emportait et le prix s'affichait en petit gris.

## Les règles à ne pas enfreindre

### 0. L'accueil MONTRE. Il ne raconte pas.

L'accueil est une **page d'accueil**, pas un mode d'emploi. Il doit répondre à
six questions, dans cet ordre, et sortir par une flèche à chaque fois qu'il
pourrait se mettre à expliquer :

| Section | La question du visiteur | La sortie |
|---|---|---|
| `hero` (plein écran) | qu'est-ce que c'est ? | le bac à sable, pour l'essayer |
| `compare` | pourquoi ça me concerne ? | — |
| `work` | c'est quoi, concrètement ? | — (ancre `#work`) |
| `how` | comment ça se passe pour moi ? | — (ancre `#how`) |
| `proof` | est-ce que je peux y croire ? | — (ancre `#proof`) |
| `answer` | et le candidat, lui ? | — |

⚠️ **CETTE RÈGLE A ÉTÉ AMENDÉE.** Elle disait : « le problème ne se nomme
pas, il se montre » — pas de section « Le problème », pas de cartes qui
énumèrent ce qui ne va pas dans le recrutement, seulement trois constats en
gros (`truth`) et la maquette `CvProof` à côté. C'est désormais l'inverse
qui est en place : la section `compare` ÉNUMÈRE, en deux colonnes barrées et
une cochée, et `truth` a été retirée (règle 4 decies).

Ce qui reste applicable, et qui comptait vraiment dans la règle d'origine :

- **aucune ligne n'invente un grief.** Chacune des six lignes de `compare`
  redit dans un autre format une chose que le site démontre ailleurs. Une
  critique du recrutement que rien ne prouve sur le site n'a rien à y faire ;
- **on ne met pas le visiteur en position d'élève.** Les cartes constatent
  (« des affirmations que personne ne vérifie »), elles n'expliquent pas au
  lecteur ce qu'il devrait penser de son métier ;
- **une seule fois.** Voir la règle 4 decies : la critique du CV s'est
  retrouvée faite deux fois sur la même page, et la seconde affaiblissait la
  première.

**Trois gestes, pas huit étapes.** `how` tient en trois colonnes : vous collez,
il construit, vous décidez. Le déroulé complet appartient à `/how-it-works`.

Six versions ont été écrites avant celle-ci, et ce qu'elles ont appris :

1. **trop longue.** Un site qui explique tout est un site que personne ne lit ;
2. **trop documentaire.** Elle décrivait un mécanisme au lieu de vendre ;
3. **une section « Problème », puis une section « Solution ».** Quatre cartes de
   texte pour nommer ce qui ne va pas dans le recrutement, six cartes de texte à
   icône pour y répondre. Le problème du CV ne se démontre pas : il se voit dès
   qu'on regarde un candidat écrire le vrai e-mail. Et un bénéfice sous une
   icône, tout le monde peut l'écrire, y compris ceux qui n'ont rien construit ;
4. **cinq blocs de bénéfices illustrés.** Les maquettes étaient là, mais dans le
   désordre : on voyait le candidat au travail avant d'avoir compris qui avait
   construit l'exercice. Le produit commençait au milieu de lui-même ;
5. **les huit étapes du produit, numérotées, une maquette chacune.** Juste,
   complet, et parfaitement à sa place… sur `/how-it-works`, où ce parcours vit
   désormais. Une page d'accueil ne déroule pas un mode d'emploi : personne
   n'arrive sur un site pour lire huit étapes avant de savoir s'il est au bon
   endroit ;
6. **celle-ci.** Elle fait comprendre, puis elle laisse partir vers le détail.

Avant d'ajouter un paragraphe à l'accueil, demandez-vous s'il ne serait pas
mieux sur `/how-it-works`, `/simulations` ou `/scoring`. **La réponse est
presque toujours oui** — ces pages existent exactement pour ça, et c'est là que
va le visiteur déjà convaincu.

**Aucun prix, aucun crédit sur l'accueil.** Ni « à partir de », ni « 6 crédits
par offre », ni le tableau de chiffres qui s'y trouvait. Une page qui chiffre
avant d'avoir convaincu se fait fermer sur le chiffre ; l'argent se discute sur
`/pricing`, où le visiteur arrive en le cherchant. Les seuls montants tolérés
sur `/` sont ceux qui vivent **dans les maquettes** (le budget d'une fiche CRM,
l'objection de prix d'un e-mail) : ce sont les données de l'exercice du
candidat, pas les nôtres.

### 0 bis ter. La page commence et finit sur le MÊME ciel

Le hero pose un ciel bleu en dégradé avec un quadrillage fin et ses « + » aux
intersections. **L'appel final et le pied de page reprennent exactement cette
trame**, le ciel retourné : blanc en haut, bleu en bas. C'est le geste du
gabarit de référence, et il a été demandé explicitement.

**Et ce n'est pas un bloc, c'est une BANDE.** L'appel final et le pied de
page ne forment qu'une seule surface quadrillée, pleine largeur, sans
interruption ni blanc entre eux. Trois états successifs, dont il faut
connaître les deux premiers pour ne pas y revenir :

1. un pavé **bleu nuit** à texte blanc, posé sur le blanc de la page ;
2. un **panneau** clair quadrillé, avec sa bordure et son ombre, toujours posé
   sur du blanc, et le pied de page quadrillé juste en dessous. Retour
   direct : on lisait deux rectangles à trame séparés par une bande de blanc,
   au lieu d'une fin de page ;
3. **celui-ci**, une seule bande.

Comment elle tient : `.section--tail` et `.footer` portent chacun un calque
`::before` pleine fenêtre (`left: calc(50% - 50vw); width: 100vw`), avec le
même motif et deux moitiés de dégradé qui se rejoignent sur la même valeur
(`#eef4ff`). Un seul élément aurait été plus simple, mais l'appel est rendu
par la page et le pied de page par le layout : ils n'ont aucun parent commun
sous la main.

⚠️ **Les deux moitiés doivent se toucher.** Le pied de page n'a donc NI marge
haute NI bordure haute, et le calque du haut déborde d'un pixel : l'un comme
l'autre rouvrirait la couture.

**Les deux frontières sont FLOUTÉES** (`.seam`). Là où la trame s'arrête,
en bas du hero, et là où elle reprend, en haut de la bande finale, une
bande de 150px floute ce qui est peint derrière elle. Un `backdrop-filter`
et un masque en dégradé : le flou naît progressivement au lieu d'être posé
en rectangle, et la trame se termine floue au lieu de se terminer pâle.

Trois pièges, tous rencontrés :

- **le flou ne doit pas mordre sur le contenu.** Dans le hero, la scène est
  en `z-index: 2` et la couture en 1, donc la fenêtre de l'application
  passe par-dessus, nette. En bas, la couture est un `::after`, donc peinte
  APRÈS `.wrap` : sans `.section--tail > .wrap { z-index: 1 }`, elle
  flouterait le titre de l'appel ;
- **`backdrop-filter` ne voit que ce qui est peint sous son contexte
  d'empilement.** Celle du bas vit dans `.section--tail`, qui est en
  `isolation: isolate` : elle floute la bande, pas la page derrière. C'est
  ce qu'on veut, mais ce n'est pas évident en lisant la règle ;
- **il faut quelque chose à flouter.** Le masque du quadrillage du hero
  s'arrêtait à 92%, donc la trame était déjà éteinte avant la frontière et
  la couture ne floutait rien. Il va maintenant jusqu'à 100%.

⚠️ **PAS DE TRAME SOUS LES VISUELS.** Une trame de cellules carrées a été
posée un moment derrière chaque `.figure`, pour imiter le gabarit où aucun
visuel ne flotte sur du blanc. Retirée aussitôt, sur retour direct : sur ce
site les maquettes portent DÉJÀ leurs propres lignes, colonnes et cadres, et
une trame derrière elles se lit comme du bruit, pas comme un support. La
trame n'existe qu'à deux endroits, le hero et la bande finale.

**Deux polices, pas trois : Geist et Geist Mono.** Une Instrument Serif était
chargée pour les grands titres, sous `--font-display` — une variable
RÉFÉRENCÉE NULLE PART dans la feuille de style : la police partait sur le
réseau à chaque visite sans jamais rien afficher. Retirée. Ne la remettez pas
pour « donner du caractère » aux titres : ici c'est leur taille et leur
crénage serré qui le font.

### 0 ter. Il n'y a plus que DEUX pages : l'accueil et `/pricing`

`/how-it-works`, `/simulations` et `/scoring` ont été **supprimées** en
septembre 2026, sur demande directe : leur contenu part dans le blog, qui n'est
pas encore construit. L'accueil ne renvoie donc plus nulle part, et ses trois
sections portent un `id` (`#how`, `#work`, `#proof`) qui sert de cible à la
navigation et au pied de page.

Ce que ça change pour qui écrit ici :

- **les règles 4 bis, 4 ter, 4 quater et 4 quinquies décrivent des pages qui
  n'existent plus.** Elles restent écrites parce que ces pages reviendront sous
  forme d'articles, et que les erreurs qu'elles racontent (le catalogue de
  formats, la maquette qui « montre trop », la classe CSS retirée sous une
  autre page) se referont sinon à l'identique ;
- **« va le mettre sur `/how-it-works` » n'est plus une sortie possible.** La
  règle 0 disait d'envoyer là-bas tout paragraphe de trop. La réponse est
  désormais de le COUPER, pas de le déplacer ;
- **dormants, à ne pas supprimer sans demander** : `HowVisuals.js` (les huit
  vignettes) et les blocs `how`, `sims`, `scoring` de `pages.js` dans les
  trois langues. C'est la matière des futurs articles. Même statut que
  `CvProof` (règle 4 decies) ;
- **nettoyé pour de bon** : les trois entrées de `SEGMENTS` dans `routes.js`
  (sans quoi le sitemap déclarerait trois 404), les trois liens `More` de
  l'accueil, et les clés `home.*.more` qui les alimentaient.

⚠️ Ne remettez pas ces entrées dans `SEGMENTS` « pour plus tard » : le
sitemap se construit à partir de ce fichier, et il annoncerait à Google des
URL qui n'existent pas.

### 0 bis. Les pages intérieures aussi : un bloc = un paragraphe court

`body` est un **tableau** dans les dictionnaires parce que la mise en page
accepte plusieurs paragraphes, pas parce qu'il en faut plusieurs. Le second ne
se justifie que s'il dit une chose que le premier ne dit pas.

La longueur est le premier réflexe quand on veut être crédible, et c'est le
mauvais. Ce qui rend le site crédible, ce sont les **maquettes** et les
**chiffres vérifiables** — pas le nombre de phrases autour. Une affirmation
juste dite en quinze mots est plus forte que la même en quarante.

Repères, tenus dans les trois langues :

| | Longueur |
|---|---|
| un lede (accueil ou page intérieure) | UNE phrase |
| une carte de l'accueil | une à deux phrases courtes |
| un bloc de page intérieure | un paragraphe, deux au maximum |
| une `note` | une phrase, et elle porte un fait (un coût, une garantie) |

Avant d'ajouter une phrase, vérifiez qu'elle apporte un **fait** que la page
n'a pas déjà. Sinon, elle répète — et c'est ce qui était arrivé aux six étapes
de `/how-it-works`, dont chaque second paragraphe redisait le premier en plus
long.

### 1. Les trois URL légales sont un contrat avec l'application

`/legal/terms`, `/legal/privacy` et `/legal/ai-transparency` sont écrites **en
dur** dans l'application (`src/lib/constants/legal.js`, à la racine du dépôt).
Elle les ouvre depuis l'écran de consentement du candidat, et ces liens sont
déjà partis par e-mail.

Les renommer, les **traduire** ou les supprimer casse le consentement en
production — à l'instant précis où on demande au candidat d'accepter ce qu'il ne
pourrait alors plus lire. C'est la seule exception à la traduction des URL
(`src/lib/i18n/routes.js`).

### 2. Tout ce qu'affirme le site doit être vrai dans le code de l'application

Le site ne vend pas des promesses : il décrit un mécanisme. Chaque chiffre et
chaque règle qu'il énonce se vérifie côté application —

| Ce que dit le site | Où c'est vrai (racine du dépôt) |
|---|---|
| 6 crédits par génération de simulation (refontes comprises), 1 par étape régénérée, 1 au démarrage, 2 à la notation | `src/lib/constants/plans.js` (`CREDIT_COSTS`) |
| Core 100 € (85 à l'année), Pro 300 € (255), 150 et 500 crédits, pas de crédit à l'unité | `src/lib/constants/plans.js` (`PLANS`) |
| En annuel, crédits non utilisés reportés ; solde à zéro au renouvellement | `src/lib/constants/plans.js` (`CYCLES`), `src/lib/utils/limits.js` (`calculerRecharge`) |
| Pas de question rétrospective, pas de version générique du métier | `src/lib/experienceGeneration.js` (`REGLES_ETAPE`, `REGLE_ANCRAGE_OFFRE`) |
| Sous-dimensions, échelles comportementales | `src/lib/experienceGeneration.js` (règle 6) |
| Notes en pourcentage : (niveau − 1) × 25, moyenne pour la note globale | `src/lib/runScoring.js` |
| Une simulation dure ~20 minutes | `src/lib/experienceDuree.js` |
| Règles anti-biais des QCM | `src/lib/experienceGeneration.js` (`REGLES_QCM`) |
| Citations vérifiées comme sous-chaînes réelles | `src/lib/runScoring.js` (`verifyVerbatim`) |
| Note plafonnée en cas de recopiage de l'assistant | `src/lib/runScoring.js` (`recopiageCap`) |
| Correction déterministe : QCM, code, champs CRM | `src/lib/runScoring.js`, `src/lib/crmScoring.js` |
| Retour candidat de 120 à 180 mots | `src/lib/actions/candidate.js` |

**N'ajoutez rien ici qui ne soit vrai là-bas.** Et quand le barème change de
l'autre côté, `src/lib/pricing.js` est à resynchroniser à la main — c'est la
seule recopie entre les deux projets, et elle est délibérée.

### 2 ter. Sur `/pricing`, l'unité facturée est la SIMULATION, pas le poste

Ce qui coûte 6 crédits, c'est la **création d'une simulation**, pas le fait
d'avoir un poste ouvert. Le tableau de calcul disait « jobs opened », et il
se lisait comme une pénalité : ouvrir plus de postes faisait baisser le
nombre de candidats testables (48 → 44 → 40 sur Core). Juste, mais présenté
comme si recruter davantage était puni. La colonne dit maintenant
« simulations created », la ligne du barème « Create a simulation ».

La règle de tri : **« simulation » partout où c'est le DÉCLENCHEUR du
coût ; « poste », « offre », « job » partout où ce n'est que le contexte**
(« For a team hiring steadily », « send us a real posting »). La clé
`CREDIT_COSTS.job` garde son nom dans `pricing.js` : c'est une recopie de
l'application, et un nom différent compliquerait la resynchronisation.

Trois autres décisions de cette page, à ne pas défaire :

- **le tableau est un PLANCHER, et la page le dit** (`maths.assumption`) :
  il suppose que chaque candidat invité va jusqu'au bout. Un abandon ne
  coûte qu'1 crédit sur 3, donc la réalité ne fait jamais moins bien ;
- **le bouton de Custom dit « Talk to sales » et ouvre `talkHref`**, pas
  `demoHref`. Sur ce plan, il faut fixer un tarif avec un commercial avant
  de montrer quoi que ce soit : ce n'est pas une démo produit. Ne
  l'harmonisez pas avec les deux autres ;
- **« Advanced analytics » et les durées d'historique (3 et 12 mois) ont
  été retirés.** Le premier ne recouvrait rien de concret ; ne remettez pas
  une ligne de fonctionnalité qui ne se montre pas dans l'application.

**Les cartes alignent leurs rangées d'un plan à l'autre.** Le bouton est
sous le prix, pas au bas de la carte : collé en bas, il laissait 180 à
210px de vide sous les listes courtes de Pro et Custom, et la carte Custom
avait l'air inachevée. Pour que prix, crédits et boutons tombent à la même
hauteur sur les trois cartes, dans les trois langues, trois hauteurs sont
réservées : la phrase « pour qui » (deux lignes), la ligne de facturation
et celle des crédits supplémentaires (vides sur Custom, mais présentes), et
la rangée des crédits (hauteur fixe, sinon « Tailored volume », sans
chiffre en gras, est plus basse). Mesuré, pas estimé.

### 2 bis. Deux mots, deux interdits

**On dit SIMULATION.** Jamais « assessment », jamais « évaluation », jamais
« test ». Un assessment est quelque chose qu'un candidat subit ; une simulation
est le métier qu'il fait pendant trente minutes. Le produit est le second, et
c'est tout l'argument : si le site dit « assessment », il se vend comme les
plateformes de test contre lesquelles il existe.

**Pas de tiret cadratin dans la copie.** Le « — » planté au milieu d'une phrase
est la signature typographique des textes écrits par un modèle, et un lecteur de
2026 la repère. Deux phrases courtes, une virgule ou un deux-points disent la
même chose sans faire hausser le sourcil. Même chose pour les listes à puces
médianes (« Écrit · Jugement · Ton ») : des virgules.

L'exception : les **maquettes**. Une vraie interface affiche « Étape 2 · Réponse
par e-mail », et la lui retirer la ferait sonner faux. Le titre d'onglet
« Onbord — … » reste lui aussi, c'est un séparateur de marque, pas une phrase.

### 3. Aucun bouton ne mène à une inscription

⚠️ **« Book a demo » mène désormais à la page `/demo`, plus à un `mailto:`.**
`demoHref()` renvoie l'adresse de cette page (avec `?plan=core|pro` depuis
les cartes de tarif). La page demande prénom, nom, entreprise et e-mail
professionnel, les envoie à `LEADS_EMAIL` (info@onbord.be) par la route
`/api/demo` AVANT d'ouvrir le calendrier Calendly, pré-rempli avec le nom
et l'e-mail. C'est le but de l'ordre : quelqu'un qui ferme le calendrier
sans réserver a quand même laissé ses coordonnées. Si l'envoi échoue, le
visiteur passe quand même au calendrier (`DemoForm.js`). `talkHref`
(Custom, « Talk to sales ») et `postingHref` (bac à sable) restent des
`mailto:`.

L'inscription publique de l'application est **fermée** : les comptes sont créés
à la main depuis `/admin`. Tous les appels à l'action passent donc par
`src/lib/contact.js`, qui produit un `mailto:`. Un bouton « Choisir Core » qui
ouvrirait un formulaire d'inscription enverrait le visiteur dans un mur.

Trois destinations, et elles ne disent pas la même chose :

| | Quand |
|---|---|
| `postingHref(locale, texte)` | « envoyez une offre », l'appel principal. Le texte écrit dans le bac à sable part en corps d'e-mail |
| `talkHref(locale)` | « parler à quelqu'un », pour qui n'a pas d'offre sous la main |
| `demoHref(locale, plan)` | la navigation et les cartes de tarif |

Envoyer les deux boutons d'un même bloc vers la même adresse, c'était ne
répondre à aucune des deux intentions.

Le jour où un vrai formulaire de démo existe, `src/lib/contact.js` est le
**seul** fichier à changer.

### 4. Les trois langues, et l'anglais d'abord

⚠️ **Depuis septembre 2026, le site est PUBLIÉ EN ANGLAIS SEULEMENT.**
`LOCALES` vaut `["en"]` ; le français et le néerlandais sont dans
`LOCALES_EN_SOMMEIL` (`src/lib/i18n/config.js`). Rien n'est supprimé : les
dictionnaires FR et NL restent complets et doivent **continuer à être tenus à
jour** avec l'anglais, et les traductions d'URL restent dans `routes.js`. Les
adresses `/fr/...` et `/nl/...` déjà publiées redirigent (307) vers leur
équivalent anglais, et le sélecteur de langue est masqué tant qu'il n'y a
qu'une langue. Pour rallumer : remettre les deux codes dans `LOCALES`, vider
`LOCALES_EN_SOMMEIL`. Tout le reste en découle.

`en` (référence), `fr`, `nl`. La copie s'écrit **en anglais d'abord** ; les deux
autres la suivent. Une clé ajoutée dans `en/` doit l'être dans `fr/` et `nl/`
dans la même modification — les trois dictionnaires ont la même forme, et un
composant lit `dict.hero.titleEm` sans savoir dans quelle langue il travaille.

Les **URL sont traduites** (`/fr/comment-ca-marche`, `/nl/hoe-het-werkt`) :
`src/lib/i18n/routes.js` tient la correspondance, et le proxy fait un *rewrite*
vers le chemin canonique anglais du système de fichiers.

Ce qui n'est **pas** dans les dictionnaires :
- les **prix** → `src/lib/pricing.js` (199 € est 199 € en néerlandais) ;
- les **slugs légaux** → identiques partout, voir la règle 1 ;
- le **bloc de code** de la maquette → du code se lit en anglais.

### 4 bis. `/how-it-works` déroule, et ses vignettes sont MINIMALISTES

Huit étapes, de la création du compte à la liste classée. La forme est fixe :
**numéro, titre, deux phrases à gauche ; une vignette à droite**, toujours du
même côté. Sur une séquence numérotée, l'œil descend la colonne des numéros, et
l'alternance lui fait perdre le fil — c'est l'inverse de `/simulations`, où les
formats n'ont pas d'ordre et où l'alternance donne le rythme.

Les vignettes vivent dans `HowVisuals.js`, **pas** dans `Mocks.js`, et la
différence n'est pas un détail de rangement : une maquette montre un écran, une
vignette montre une IDÉE en trois ou quatre éléments. Huit écrans détaillés
empilés font un mur que personne ne lit. Si une vignette a besoin d'une légende
pour s'expliquer, elle est ratée. Deux exceptions, réutilisées telles quelles
parce qu'elles sont déjà aussi simples qu'une vignette : le pipeline et la liste
classée.

Ce dont cette page **ne parle pas** :

- les **crédits**. Elle explique le déroulé, pas la facture ; l'argent se
  discute sur `/pricing`, où le visiteur arrive en le cherchant ;
- les fonctionnalités **à venir**. L'entretien en visio et l'entretien sur site
  figurent dans le pipeline pour ce qu'ils sont aujourd'hui, des étapes que
  l'équipe mène elle-même. Le jour où Onbord les prend en charge, c'est la
  maquette qui change, pas une promesse qu'on ajoute au texte.

Le titre de cette page utilise `.display--sm`, plus petit que le hero : un titre
de cinq rem au-dessus de huit étapes écrase tout ce qui suit. ⚠️ Cette règle doit
rester **après** `.display` dans la feuille de style : même spécificité, c'est
l'ordre qui tranche, et déclarée avant elle ne s'applique jamais.

### 4 ter. `/simulations` dit la CAPACITÉ, jamais un catalogue ni une liste d'exemples

Trois versions précédentes de cette page ont fait la même erreur sous trois
formes :

1. **cinq formats alignés** (e-mail, mise en situation, CRM, code, QCM) — un
   catalogue qui ne dit pas ce qu'on peut en faire, et vieillit à chaque
   ajout ;
2. **quatre gestes, puis une liste à puces de « situations »** en exemple
   (« une objection à traiter », « un cas à analyser »…) — plus subtil, mais le
   même défaut. Un recruteur qui lit six exemples cherche le septième qui
   correspond à SON métier, ne le trouve pas, et conclut que ce n'est pas pour
   lui ;
3. **quatre gestes, chacun avec une MAQUETTE détaillée** (un vrai e-mail à
   « Vandelaer NV », une vraie fiche CRM). Le texte autour disait « ce n'est
   qu'un exemple », mais la maquette elle-même restait une histoire précise —
   et une histoire précise dit malgré elle « c'est de ÇA qu'il s'agit ». Une
   image de recruteurs en visioconférence a servi de repoussoir ici : on ne
   copie ni son style (photos, personnes) ni son fond (un scénario par carte),
   mais elle a fait voir que même une maquette HTML fidèle au produit peut
   « trop montrer » quand la page parle de capacité et non de preuve.

**La page dit maintenant la capacité avec une ICÔNE, pas une maquette.** Quatre
cartes (`.grid4`, `.card`), chacune avec :

- une **icône abstraite** (`GestureIcon`, dans `Icons.js`) — un stylo, un
  micro, des chevrons de code, une fiche à lignes. Aucun texte de simulation
  dedans : rien à quoi rattacher « c'est un e-mail commercial ». L'icône montre
  le GESTE, jamais un exemple ;
- un **nom court** (« Writing », pas « The email nobody enjoys writing », qui
  figeait la capacité sur un seul cas) ;
- **une phrase**, pas un paragraphe : le corps de chaque carte tient en une
  ligne. Un scénario de plus est un mot dans cette phrase, jamais une carte de
  plus ni une maquette de plus.

⚠️ **Icône ≠ maquette, et ne les confondez pas.** Une maquette (`Mocks.js`,
règle 5) montre un exemple concret et détaillé ; une icône de geste
(`GestureIcon`) ne montre RIEN de la simulation elle-même, seulement l'action.
Les deux répondent à des rôles différents : la maquette PROUVE (« voici
exactement ce qui se passe »), l'icône ÉVOQUE (« on peut faire ça »). Ne
mettez pas une maquette détaillée sur cette page : c'est précisément l'erreur
de la version précédente.

C'est au recruteur d'imaginer son propre usage — et parfois d'en imaginer un
auquel on n'a pas pensé.

⚠️ **Ce que la page ne promet pas.** Les capacités annoncées doivent exister
dans l'application. Aujourd'hui elle sait capter du **texte**, de la **vidéo
enregistrée**, du **code exécuté**, des **champs structurés** (CRM) et des
**QCM** : voir `response_format` et `sandbox_kind` dans
`src/lib/experienceDuree.js`, à la racine du dépôt.

Il n'y a **pas de session en direct** — ni entretien live un à un, ni réunion à
plusieurs, ni simulation de comité. Aucun fournisseur de visioconférence n'est
installé dans le projet, et aucune trace de session live dans le code.

⚠️ **Dette laissée volontairement.** `EmailMock`, `LiveMock`, `CodeMock` et
`CrmMock` (dans `Mocks.js`) n'ont plus d'appelant sur cette page. `EmailMock`,
`LiveMock` et `CodeMock` restent vivants ailleurs : `WorkScenes.js` (accueil)
lit encore une partie de leurs données (`m.email.body`, `m.code.tests`,
`m.live.time`). `CrmMock`, lui, n'a plus AUCUN appelant nulle part sur le
site : composant et bloc `crm` du dictionnaire commun (trois langues) sont
orphelins. Laissés en place plutôt que supprimés — ce n'était pas la demande,
et du contenu trilingue ne se rejette pas sur un coup de tête — mais c'est une
dette à trancher, pas un oubli.

### 4 quater. La section « Ce qui s'ajoute » : une direction, jamais une promesse

Épilogue de la page, **PAS** un cinquième geste : aucune maquette ne l'illustre
(une maquette dit « ceci existe »), bordure en pointillés (`.roadmap`), fond
plus terne que les cartes du produit.

Chaque carte porte son **propre `tag`**, jamais un badge partagé sur toute la
section : le premier item peut être honnêtement plus avancé (« In progress »)
que les deux autres (« In the works »), et un badge commun aurait gommé cette
différence. Passez un item de « In the works » à « In progress » seulement
quand c'est vrai — c'est une promesse différente, pas une nuance de ton.

Le corps d'une carte peut couvrir PLUSIEURS scénarios apparentés en une phrase
plutôt qu'un par carte (« a one-to-one interview or role play today, a
situational scenario, a case discussed live, or a full board meeting […],
next ») : c'est la même logique que la règle 4 ter — dire la direction large,
pas égrener chaque variante en carte séparée.

### 4 quinquies. `/scoring` : liste `.mech` par défaut, `.duo` pour les DEUX blocs qui le méritent

Six points, deux formes, choisies bloc par bloc et non pour toute la page :

- les points **sans maquette** (structure, preuve, déterminisme, décision,
  ensuite) passent par `.mech`, une liste numérotée à un paragraphe : le
  pendant de `.rules` (déjà sur `/simulations`) pour un contenu un peu plus
  riche (numéro, `kicker`, titre, corps), plutôt qu'une troisième mise en page
  inventée pour l'occasion ;
- les **deux points qui s'appuient sur une maquette** (la grille à trois
  niveaux, le rapport à la note plafonnée) passent par `.duo` : texte à
  gauche, maquette en pleine largeur à droite. La maquette y respire au lieu
  d'être coincée sous un paragraphe à 560 px de large, comme avant.

Un bloc sans deuxième paragraphe (0 bis) tient donc en un seul `<p>`, sauf le
bloc « AI » (04), qui garde ses deux paragraphes : il a la place d'un `.duo`
à côté de lui, les autres non.

⚠️ **Ce qui s'est cassé, et comment ne pas le refaire.** Cette page utilisait
`.stage`/`.stage__idx`/`.stage__name`. Ces classes ont été retirées de
`globals.css` en même temps que `/how-it-works` passait à `.step` (règle
4 bis) — et `/scoring` s'est retrouvée sans AUCUNE mise en page, des murs de
texte à plat, pendant tout le temps qui a séparé les deux changements. Une
classe partagée entre plusieurs pages ne se retire jamais sur la seule
vérification de la page qu'on a sous les yeux : `grep` le nom de la classe sur
tout `src/app` avant de la supprimer de `globals.css`.

### 4 sexies. Le bloc « IA » (04) : un seul mécanisme montré, pas un bandeau générique

`ScoreCard m={m.score} capped={m.score.scoreCapped}` disait « note plafonnée »
sans montrer pourquoi, avec un bandeau générique collé sur la même maquette que
l'accueil. `AiUsageMock` (`Mocks.js`, dictionnaire `mocks.aiUsage`) le remplace
par les deux bulles de l'échange candidat-assistant, puis UN `.dim` : l'usage
de l'IA (`ai_usage_score` dans `runScoring.js`, racine du dépôt), qui ne juge
pas SI l'assistant a été utilisé mais COMMENT — cadrage du problème,
itération, regard critique sur ce qui revient.

Une première version montrait AUSSI le plafond de recopiage (`SEUIL_PLAFOND
= 0.7`, qui plafonne la note d'une compétence précise quand le texte recopié
dépasse 70 % — un mécanisme réel, mais séparé de `ai_usage_score`) en second
`.dim`, avec sa citation qui reprenait le message de l'assistant. Retiré sur
retour direct (« enlève Offering a way forward et tout ce qui suit ») : plus
simple à lire avec un seul chiffre par maquette qu'avec une comparaison entre
deux notes. Le plafond de recopiage reste vrai et mentionné dans le texte du
bloc (second paragraphe), simplement plus montré dans la maquette. Les champs
`capped` du dictionnaire `mocks.aiUsage` ont donc quitté les trois locales —
dette évitée, pas laissée.

**Autres nettoyages faits sur cette même page, sur retour direct** (« mieux
expliquer pourquoi », « plus minimaliste », « enlève les petites bulles » et
« tous les trucs verts ») :

- le `why` du bloc IA commence par le chiffre et sa raison — « 78 %,
  because... » — plutôt que de laisser le pourcentage sans l'expliquer
  explicitement ;
- les étiquettes `.ui__tag` (« Candidate report · AI usage »,
  « Scoring grid · one sub-dimension ») et le sous-titre `m.skill`
  (« Attention to detail ») dans `GridMock` ont disparu : ce que le texte à
  côté dit déjà n'a pas besoin d'être répété en petit au-dessus de la
  maquette — les champs `window`/`skill` correspondants ont donc quitté
  `mocks.grid` dans les trois dictionnaires ;
- les blocs 02 (« Evidence ») et 04 (« AI ») ont perdu leur bandeau `.claim`
  vert, et le bloc 03 (« Determinism ») sa liste à coche : trois éléments
  passent maintenant par UNE phrase de prose. `Corps()` dans
  `scoring/page.js` a donc perdu son rendu `list`/`highlight`, gardant
  seulement `body`/`after` — un bloc, un paragraphe, sans ornement qui ne
  porte pas d'information neuve.

### 4 septies. Plus aucune étiquette flottante (`.ui__tag`) sur une maquette, nulle part

Retiré sur retour direct, SITE ENTIER : « ça fait trop IA, pas assez naturel,
pas assez humain ». La petite pastille posée à cheval sur le bord haut d'une
maquette (« Candidate report », « Hiring pipeline », « Scoring grid · one
sub-dimension »...) existait depuis le tout début du site ; elle imitait une
barre de titre de logiciel, et c'est précisément ce qui sonnait faux — un
détail de chrome d'interface, pas un détail humain.

Ce qui a disparu, dans l'ordre :

- `Frame` (`Mocks.js`) a perdu son prop `title` — et avec lui `tone`, qui
  n'existait que pour teinter l'étiquette en vert/rouge sur `FeedbackTabs`
  (« Moving forward » / « Not selected » restent verts/rouges, mais via les
  onglets eux-mêmes, pas via un panneau teinté) ;
- `Viz` (`HowVisuals.js`, les huit vignettes de `/how-it-works`) a perdu la
  sienne ;
- `CvProof` (les deux panneaux CV/preuve de l'accueil) avait DEUX étiquettes
  écrites à la main, hors de `Frame` — retirées pareil ;
- en CSS, `.ui__tag` et ses quatre variantes de contexte
  (`.step__viz .ui__tag`, `.cvp__proof .ui__tag`, `.ui--next .ui__tag`,
  `.ui--no .ui__tag`) ont toutes disparu de `globals.css`, plutôt que de
  rester comme classes mortes.

Ce qui reste : le `label` passé à `Frame`/`Viz` sert encore, mais seulement en
`aria-label` — un texte pour le lecteur d'écran, jamais affiché. Certains
champs `window`/`skill`/`proofWindow` du dictionnaire n'avaient plus d'autre
rôle que d'alimenter l'étiquette retirée ; ils ont quitté les trois locales
plutôt que de rester en dette (`mocks.score.skill` a un autre usage et reste,
`mocks.score.window`, `mocks.cv.proofWindow`, `mocks.grid.window/skill`
ont disparu — voir aussi 4 sexies pour `mocks.aiUsage`).

Pour la prochaine maquette : pas d'étiquette flottante au-dessus du panneau.
Le texte à côté de la maquette dit déjà ce qu'elle montre.

### 4 octies. L'aperçu de plateforme du hero, et pourquoi il est vide

`AppPeek.js` pose sous la barre de saisie une fenêtre d'application COUPÉE en
bas par un masque en dégradé. Ce n'est pas une maquette au sens de la règle 5 :
une maquette prouve quelque chose et se lit mot à mot ; celle-ci ne prouve rien,
elle SITUE, et personne n'est censé la lire.

D'où les trois choses à ne pas défaire :

- **presque aucun texte.** Des barres grises partout où le mot n'apporte rien
  (la navigation de gauche n'a aucun libellé). Un aperçu lisible demande qu'on
  le lise, et vole alors l'attention de la barre de saisie juste au-dessus,
  qui est le vrai sujet du hero ;
- **les deux seuls mots viennent du dictionnaire** (`hero.peek`), parce qu'un
  aperçu en anglais sur la version néerlandaise dirait qu'on montre le produit
  de quelqu'un d'autre ;
- **les candidats sont ceux de `mocks.shortlist`**, pas une seconde série
  inventée : deux jeux de faux noms sur la même page finissent par se
  contredire.

Le masque (`mask-image`) fait tout l'effet. Une fenêtre entière posée dans le
hero se lit comme une capture d'écran de plus ; une fenêtre dont on ne voit que
le haut se lit comme « la suite est de l'autre côté ».

### 4 nonies. Le problème énuméré (`.vs`), et ce qu'il reste de la règle 0

La règle 0 dit que **le problème ne se nomme pas**. La section `compare` de
l'accueil le nomme : deux colonnes barrées (le CV, l'entretien) et une cochée
(la simulation). C'est un ajout demandé explicitement, sur le modèle des sites
qui posent cette comparaison en trois cartes.

Les deux coexistent au lieu de se remplacer, et c'est voulu : l'énumération se
parcourt en trois secondes et ACCROCHE, la démonstration `CvProof` juste
au-dessus demande qu'on s'arrête et CONVAINC. Ce qui reste de la règle 0 :
**aucune de ces lignes n'invente un reproche**. Chacune redit dans un autre
format une chose que la page affirme déjà ailleurs. N'y ajoutez pas un grief
qui ne serait démontré nulle part.

Côté style, la carte cochée est la seule des trois à porter une couleur, une
ombre et un fond blanc ; les deux autres restent plates et grises. Sur fond
blanc, c'est ce décalage de MATIÈRE qui dit « celle-ci est la bonne », pas la
coche toute seule.

### 4 decies. La critique du CV ne se fait QU'UNE FOIS, et `CvProof` dort

L'accueil a porté pendant un temps **deux critiques du CV** à quarante lignes
d'écart : la section `truth` (trois constats en gros, puis la maquette
`CvProof` — le CV éteint contre la preuve en couleur) et la section
`compare` (deux colonnes barrées, une cochée). C'était la même idée servie
deux fois, et la seconde affaiblissait la première.

**`truth` a été retirée.** Ce qui reste est `compare`, parce qu'elle se
parcourt en trois secondes. Conséquences à connaître avant de toucher à quoi
que ce soit :

- **`CvProof` n'est plus appelé nulle part.** Le composant et son CSS
  (`.cvp`) restent en place, volontairement : c'est la maquette la plus
  travaillée du site, elle a sa règle 5, et elle resservira si une page
  `/pourquoi-pas-le-cv` voit le jour. Ne la supprimez pas sans demander ;
- **`home.truth` (lignes, lede, `cvLabel`, `proofLabel`) n'est plus lu.**
  Même raison, même précaution. C'est la seule dette de dictionnaire assumée
  du site avec `mocks.crm` ;
- si vous remettez une démonstration du CV quelque part, **ne la remettez pas
  sur l'accueil à côté de `compare`** : c'est exactement ce qu'on vient de
  défaire.

### 4 undecies. La scène du hero : barre de saisie POSÉE SUR la fenêtre

Les deux objets du hero — le champ où l'on décrit un poste et la fenêtre de
l'application — étaient l'un sous l'autre, séparés par du blanc. Ils se
lisaient comme deux illustrations sans rapport. Ils se CHEVAUCHENT maintenant
(`.stage`) : la fenêtre remonte de 30px sous la barre, qui la couvre à peu
près à mi-hauteur, et l'ensemble se lit comme un seul bloc — on écrit en haut,
ça se passe en dessous.

Trois choses tiennent cette composition, à ne pas retirer une par une :

1. **la plaque de VERRE** sous les deux (`.stage::before`) : un fond presque
   transparent, un `backdrop-filter` qui floute le ciel derrière, une bordure
   blanche et un liseré clair en haut. C'est ce liseré qui fait « plaque »
   plutôt que « rectangle gris ». Le halo bleu diffus (`.stage::after`) vient
   par-dessus : sans lui le verre est propre mais mort.
   ⚠️ Un `backdrop-filter` n'a d'effet que s'il y a quelque chose DERRIÈRE :
   le verre ne vit que dans le hero, au-dessus du ciel. Posé sur du blanc
   plat, il ne se verrait pas ;
2. **le masque en dégradé** sur `.peek`. Une fenêtre entière se lit comme une
   capture d'écran de plus ; une fenêtre coupée se lit comme « la suite est de
   l'autre côté » ;
3. **le hero ne centre PAS son contenu** (`justify-content: flex-start`).
   Centré, le titre descendait au milieu de l'écran et la fenêtre passait
   sous le pli.

⚠️ **Piège rencontré ici, et coûteux à retrouver.** La règle qui remonte le
contenu au-dessus du ciel visait `.hero--full > *`. Elle a la même
spécificité que `.glow` et elle est déclarée plus bas : elle écrasait donc le
`position: absolute` du halo, qui redevenait un élément de flux et poussait le
titre de 320px vers le bas. Elle vise maintenant `.hero--full > .wrap`. Si
vous ajoutez un décor en `position: absolute` dans le hero, vérifiez qu'aucune
règle plus tardive ne le repasse en `relative`.

### 4 duodecies. Ce que la fenêtre du hero doit montrer

`AppPeek.js` imite une **capture d'écran de l'application**, pas une maquette
au sens de la règle 5 : elle situe, elle ne démontre pas.

Elle a d'abord montré une conversation avec l'assistant. Ça se confondait avec
n'importe quel outil de chat. Elle montre maintenant **l'écran d'une offre** :
son pipeline en haut, ses candidats classés en dessous. C'est ce qui ne
ressemble qu'à Onbord, et c'est ce qu'un recruteur cherche à voir avant de
cliquer.

- **lisible** : le nom de l'offre, les étapes du pipeline, les noms et les
  notes. **Illisible** : la navigation de gauche et les méta-données, rendues
  en barres grises. Une fenêtre entièrement lisible demande à être lue, et
  vole alors l'attention de la barre de saisie juste au-dessus ;
- **des barres, pas du texte flouté.** Un `filter: blur()` coûte une couche de
  composition à chaque image pour un rendu que trois rectangles donnent ;
- **les candidats viennent de `mocks.shortlist`**, pas d'une seconde série
  inventée : deux jeux de faux noms sur la même page finissent par se
  contredire ;
- ⚠️ **elle ne suit PLUS la souris.** Elle s'inclinait sous le pointeur (deux
  variables CSS, `--tx` et `--ty`) ; c'était le seul élément du site qui
  réagissait à la souris. Retiré sur demande directe. Une carte qui bascule au
  survol est l'effet le plus répandu des gabarits, et il entrait surtout en
  conflit avec le VRAI mouvement de cette fenêtre : deux inclinaisons sur le
  même objet, l'une sous la souris et l'autre sous le défilement, se
  contrarient dès qu'on approche le curseur du hero ;
- **elle arrive COUCHÉE à 18°** (11° auparavant) et se redresse sur 130px de
  défilement, en courbe et non en ligne droite : le carré de la progression
  démarre lentement puis accélère, si bien que les premiers pixels ne
  redressent presque rien et que la fenêtre finit de se lever d'un coup. Un
  rapport linéaire donnait un mouvement plat, qui se lit comme un réglage
  plutôt que comme un geste. Neutralisé sous `prefers-reduced-motion`.

### 4 terdecies. Les trois étapes sont des ONGLETS, pas trois cartes

Les étapes de l'accueil se cliquent, et la maquette de droite suit
(`Steps.js`). Trois raisons de préférer ça à trois maquettes empilées :

1. la page ne s'allonge pas de trois écrans pour trois idées ;
2. on lit la séquence dans l'ordre, au lieu de voir trois résultats côte à
   côte et de devoir deviner lequel vient d'où ;
3. cliquer, c'est déjà manipuler l'outil — la même raison qui met un bac à
   sable dans le hero.

**C'est un vrai jeu d'onglets** : `role="tablist"`, un `role="tab"` par carte,
`aria-selected`, panneau lié par `aria-controls`. Au lecteur d'écran, le bloc
s'annonce comme trois onglets et un panneau, pas comme trois boutons qui font
on ne sait quoi. Sans JavaScript, la première étape s'affiche avec sa maquette
et les clics ne font rien : la page reste lisible.

Les trois visuels vivent dans `Steps.js` et tirent leur texte de
`home.how.viz`, sauf le deuxième qui réutilise `common.mocks.chat` : le site
raconte le même moment à deux endroits, et une seconde version du texte
finirait par diverger.

⚠️ **Les trois visuels partagent une hauteur minimale** (`.sv`). Sans elle, la
colonne de droite sautait d'une taille à l'autre à chaque changement d'étape
et toute la page tressautait sous le clic.

### 5. Les maquettes sont du HTML, jamais des images

`src/components/Mocks.js` contient douze maquettes d'interface écrites en HTML.
Côté recruteur : compétences extraites de l'offre, pipeline de recrutement, chat
de cadrage, journal de génération, grille de notation, rapport de notation,
liste courte classée. Côté candidat : composeur d'e-mail, fiche CRM, exercice de
code, mise en situation filmée. Le retour écrit au candidat a quitté ce fichier
pour `FeedbackTabs.js` : il lui faut un état, voir plus bas.

**L'exception qui porte la démonstration** : `CvProof` est la seule maquette qui
montre autre chose qu'Onbord. C'est **un seul panneau coupé en deux**, et tout
l'argument est dans le TRAITEMENT des deux moitiés :

- à gauche le **CV, en `grayscale(1)` et à 62 % d'opacité**. Il reste lisible,
  mais il a perdu sa vie. Chaque ligne porte un `?` plutôt qu'une étiquette à
  lire : un point d'interrogation se comprend d'un coup d'œil, « invérifiable »
  demande qu'on s'arrête cinq fois ;
- à droite **la preuve en couleur**, sur un lavis bleu léger : la phrase que la
  candidate a réellement écrite, son pourcentage, et la justification.

Quatre choses à ne pas casser :

1. c'est la **même personne** et la **même compétence** des deux côtés. Le CV
   affirme « à l'aise avec les clients exigeants », la preuve montre ce qu'elle a
   écrit à un client exigeant. Sans ce lien, ce sont deux images côte à côte, pas
   une démonstration ;
2. la citation vient de `score.dims[0]`, **pas d'une copie dans le
   dictionnaire** : le site raconte le même moment à deux endroits, et une
   seconde version du texte finirait par diverger ;
3. le bloc occupe **toute la largeur du `.wrap`**, il n'est pas dans la colonne
   d'un `.duo`. C'est une correction, pas un caprice de mise en page : coupé en
   deux à l'intérieur d'une colonne déjà réduite de moitié, chaque moitié
   tombait sous 230 px, « Names the gap » passait à la ligne, le bandeau du CV
   se cassait sur trois lignes, et le trait du milieu ne séparait plus que du
   texte à l'étroit. À 1124 px, chaque moitié dispose de ~560 px et tout tient
   sur une ligne, dans les trois langues. Sous 1080 px les moitiés s'empilent
   et la flèche tourne de 90° ;
4. le trait du milieu s'éteint en dégradé **avant les bords haut et bas**, et la
   moitié droite est **centrée verticalement** (`align-content: center`). Un
   1px d'un bord à l'autre donne un panneau qu'on a COUPÉ en deux ; le même
   trait en dégradé donne un panneau COMPOSÉ en deux. Et la preuve tient en
   quatre lignes quand le CV en fait douze : alignée en haut, elle laissait un
   trou sous elle et la flèche ne tombait en face de rien.

Ne l'égayez pas : c'est l'écart entre les deux traitements qui fait l'argument.
Et ne durcissez pas son texte non plus, les lignes du CV sont des phrases
honnêtes que n'importe qui écrirait — le reproche porte sur ce qu'un CV ne peut
pas montrer, jamais sur la personne qui l'a écrit.

**La composition du candidat** (`WorkScenes.js`) n'est pas une maquette de
logiciel mais une **image composée** : la consigne en bulle par-dessus tout,
l'e-mail en train de s'écrire dessous, l'appel en face à face qui mord sur son
bord droit, médaillon et minuteur compris. Le chevauchement EST le propos : trois
panneaux bien alignés auraient dit « trois fonctionnalités », ceux-ci disent
« plusieurs choses, dans la même demi-heure ». Gardez le recouvrement à une
soixantaine de pixels : au-delà, l'appel cache la réponse qui s'écrit, et on perd
la moitié de ce qu'on voulait montrer.

**Ce qui fait l'appel, ce sont les SIGNES.** Deux visages côte à côte ne sont pas
un appel : c'est une photo de deux personnes. Ce qui le fait comprendre en une
demi-seconde, ce sont la pastille de nom sur chaque vignette, le **micro barré en
rouge** sur celui qui écoute, le point d'enregistrement avec son minuteur, et la
barre de commandes dont le **bouton rouge** est le seul point chaud de toute la
composition. Ne les retirez pas pour « alléger » : sans eux, l'image ne dit plus
rien.

Ces commandes sont des `<span>`, **jamais des boutons**. Un vrai bouton dans une
image décorative promet une action qui n'existe pas, et un lecteur d'écran
l'annonce comme cliquable.

⚠️ **LES DEUX PHOTOS SONT DES GABARITS.** `public/people/portrait-1.jpg` (la
grande vignette, celui qui parle) et `portrait-2.jpg` (le médaillon, celui qui
écoute) sont des silhouettes, et une silhouette ne vend rien. Il faut là deux
vraies photos de personnes en visio : c'est le seul endroit du site où une image
battra toujours du HTML, et le seul élément que le code ne peut pas fabriquer.

Elles sont en `.jpg` et pas en `.svg` **exprès** : pour les remplacer, on écrase
les deux fichiers, et il n'y a pas une ligne de code à toucher. Cadrage portrait
3/4, regard vers l'objectif, fond neutre.

Leurs libellés suivent le **vocabulaire réel de l'application**
(`src/lib/i18n/dictionaries/en/dashboard.js` à la racine du dépôt) : « Hard
skills », « Must have », « Screening questions », « Candidate experience ». Une
maquette qui invente un libellé promet une interface que la démo ne montrera
pas, et c'est le genre d'écart qu'un prospect repère en trente secondes.

Trois raisons de ne pas les remplacer par des captures : elles se **traduisent**,
elles restent **nettes** partout pour quelques kilo-octets, et elles ne
**vieillissent** pas en silence — une capture finit par montrer un produit qui
n'existe plus.

**Pas de bandeau d'étiquettes sous les maquettes.** Chaque panneau se terminait
par une barre de pastilles colorées (« assistant IA · 9 échanges », « citations
vérifiées », « autorisé sur cette étape »). Elles répétaient en petit ce que la
maquette montre en grand, et elles faisaient du bruit sur une page qui en compte
quatre. Retirées partout. Ce qui portait une VRAIE information a été remonté
dans la carte : le plafonnement de note, par exemple, s'affiche maintenant en
bandeau d'avertissement à l'intérieur de la fiche.

**Pas de fenêtre façon macOS.** Les trois pastilles grises en haut à gauche et
la barre de titre ont été retirées de tout le site : elles disaient « voici une
capture d'écran de logiciel », ce que tous les sites SaaS disent. Ce qui reste,
c'est `.ui__tag`, une **étiquette posée à cheval sur le bord haut** du panneau,
comme la légende d'un schéma. Elle nomme ce qu'on regarde, et le contenu fait le
reste. Ne les réintroduisez pas, même « juste pour cette maquette-là ».

Les panneaux partagent le même traitement (`.ui` : verre, liseré, étiquette) :
ils doivent avoir l'air de venir du même logiciel, sans quoi personne n'y croit.

**Les notes s'affichent en POURCENTAGE**, jamais en « 3 sur 5 ». Ce n'est pas
cosmétique : l'application convertit un niveau BARS en pourcentage,
`(niveau − 1) × 25`, et la note globale est la moyenne de ces pourcentages (voir
`src/lib/runScoring.js` à la racine). Le site montre donc le chiffre que le
recruteur a réellement sous les yeux, et un pourcentage se compare sans mode
d'emploi. Vérifiez la cohérence en changeant un chiffre : les sous-dimensions de
la fiche de notation (75, 50, 75) doivent avoir pour moyenne la note affichée
(67 %), et la même candidate doit porter la même note dans la liste courte.

### 5 bis. Le bac à sable du hero ne calcule rien, et ne doit jamais le laisser croire

`src/components/Playground.js` est l'un des **deux composants client** du site,
avec `FeedbackTabs.js`. Le visiteur décrit le poste qu'il a réellement à
pourvoir, la construction se déroule ligne à ligne, et l'écran d'arrivée lui
propose d'envoyer son offre, avec ce qu'il a écrit déjà glissé dans l'e-mail.

L'autre, `FeedbackTabs.js`, montre le retour envoyé au candidat en **deux
onglets**, retenu et refusé. Avec un seul, celui du refus, on pouvait
comprendre que le retour est la politesse qu'on réserve au « non » ; les deux
disent l'inverse. Chaque onglet porte la COULEUR de son issue : vert pour celui qui avance,
rouge pour celui qui est écarté, et l'étiquette du panneau prend la même teinte.
C'est le seul endroit du site où le rouge veut dire « refusé » et non « erreur ».
La pastille reste colorée sur l'onglet inactif, pour qu'on lise les deux issues
sans cliquer. Le sens ne repose jamais sur la couleur seule : les libellés
disent « retenu » et « non retenu ».

Les deux e-mails citent des faits précis de la simulation, et
c'est la règle : un « merci de votre candidature » dans l'onglet de gauche
ruinerait la démonstration, qui est qu'il y a quelque chose à dire et qu'on le
dit. Sans JavaScript, le premier onglet s'affiche et les boutons sont inertes.

Les étapes sont une **animation**, pas une génération. Le site est statique
(règle 6) et n'a ni clé d'API ni serveur. D'où trois règles :

- les étapes décrivent ce qui **se passerait**, jamais un résultat obtenu. Pas
  de « nous avons lu votre offre », pas de compétences affichées, pas de note ;
- rien ne s'ouvre tout seul à la fin. Un `mailto:` déclenché sans clic est une
  fenêtre qui surgit ; le dernier écran pose le bouton, le visiteur l'actionne ;
- si un jour ce bloc appelle un modèle, il faudra une clé, donc un serveur, donc
  une fonctionnalité d'application dans la vitrine. Voir la règle 6.

### 6. Pas de base de données, pas de session, pas de secret

⚠️ **Une exception, une seule : `src/app/api/demo/route.js`.** Elle relaie
la demande de démo en e-mail via l'API de Resend, et lit donc un secret,
`RESEND_API_KEY`, à poser dans les variables d'environnement du projet
Vercel du site (et dans `site/.env.local` pour tester en local). Elle ne
stocke rien. Sans la clé, elle répond 503 et le visiteur passe quand même
au calendrier : la demande est alors perdue, d'où les `console.error`, à
lire dans les journaux Vercel. `/api/` est exclu du proxy des langues
(`proxy.js`, `matcher`), sinon il serait redirigé vers `/en/api/...`.

Le site est entièrement **statique** (`next build` prérend les 29 pages). S'il
lui faut un jour un appel serveur, c'est le signe qu'on est en train de
construire une fonctionnalité d'application dans la vitrine.

## Où se trouve quoi

```
site/
├── src/
│   ├── proxy.js                  Langue + réécriture des URL traduites
│   ├── app/
│   │   ├── globals.css           TOUT le style, commenté par section
│   │   ├── robots.js, sitemap.js Référencement (hreflang inclus)
│   │   └── [lang]/
│   │       ├── layout.js         Layout RACINE (<html>, polices, chrome)
│   │       ├── page.js           Accueil — six questions, six sorties
│   │       ├── how-it-works/     Les huit étapes, chacune avec sa vignette
│   │       ├── simulations/      Quatre gestes, les situations, et les règles
│   │       ├── scoring/          La page de la confiance
│   │       ├── pricing/          Tarifs, barème, arithmétique à découvert
│   │       └── legal/[doc]/      Les trois pages légales (voir règle 1)
│   ├── components/
│   │   ├── Bits.js               Briques de mise en page (Split, Title, Rule…)
│   │   ├── Playground.js         Le bac à sable du hero (composant client)
│   │   ├── WorkScenes.js         La composition : code, e-mail, appel filmé
│   │   ├── HowVisuals.js         Les vignettes minimalistes de /how-it-works
│   │   ├── FeedbackTabs.js       Le retour candidat, retenu/refusé (client)
│   │   ├── Mocks.js              Les maquettes d'interface
│   │   ├── Header.js / Footer.js / Reveal.js / PlanTable.js / Icons.js
│   └── lib/
│       ├── contact.js            Destination de TOUS les appels à l'action
│       ├── pricing.js            Tarifs et barème, recopiés de l'application
│       └── i18n/
│           ├── config.js         Langues, URL du site et de l'app
│           ├── routes.js         Segments d'URL traduits
│           └── dictionaries/     en/ fr/ nl/ × common, home, pages, legal
├── public/logo-onbord.svg
└── public/people/            Les deux portraits de l'appel (.jpg) — GABARITS à écraser
```

Le layout racine est dans `app/[lang]/`, pas dans `app/`. C'est volontaire :
Next 16 autorise un segment dynamique **au-dessus** du layout racine, ce qui
donne accès à la langue sans la faire transiter par un en-tête.
Voir `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/next-root-params.md`.

## Tâches courantes

**Changer un texte** → `src/lib/i18n/dictionaries/{en,fr,nl}/`. Les trois.

**Changer un prix** → `src/lib/pricing.js` uniquement, après avoir vérifié
`src/lib/constants/plans.js` côté application.

**Changer une couleur** → le bloc « 1. JETONS » en tête de `src/app/globals.css`.

**Ajouter une page** → un dossier sous `src/app/[lang]/`, une entrée dans
`SEGMENTS` de `src/lib/i18n/routes.js` (les trois traductions), une entrée dans
`PAGES` de `src/components/Header.js`, et le contenu dans `dictionaries/*/pages.js`.
Le sitemap se met à jour tout seul à partir de `routes.js`.

**Ajouter une section** → composer avec les briques de `Bits.js` (`Split`,
`Title`, `Rule`, `Kicker`) pour rester aligné sur la grille d'index, et poser
`data-reveal` sur les blocs à faire apparaître au défilement.

## Vérifier avant de livrer

```bash
npm run build     # doit passer sans avertissement
npm run lint
```

⚠️ **Ne lancez pas `npm run build` pendant que `npm run dev` tourne.** Les
deux écrivent dans le même dossier `.next`, et le serveur de développement
finit par servir un JavaScript périmé : le HTML est rendu avec le code neuf,
le navigateur hydrate avec l'ancien, et React lève une erreur « Hydration
failed » qui n'a rien à voir avec le code. Si ça arrive : arrêter le serveur,
`rm -rf .next`, le relancer, puis recharger la page avec Ctrl+Maj+R.

Puis, à l'œil, **sur les trois langues** : le néerlandais est la langue la plus
longue et c'est lui qui fait déborder boutons, étiquettes et colonnes. Vérifier
aussi à 390 px de large — les grilles à `1fr` nu refusent de rétrécir sous leur
contenu (utiliser `minmax(0, 1fr)`, voir les commentaires du bloc « 17. MOBILE »).
