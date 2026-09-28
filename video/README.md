# Le film Onbord

Un film de présentation en motion design, 1 min 22, 1920×1080, 30 i/s, avec
voix off française, sous-titres incrustés et musique originale.
Le résultat : **`onbord-film.mp4`**.

Ce dossier ne fait partie ni de l'application ni du site (voir `AGENTS.md` à
la racine). Il ne partage rien avec eux, sinon les couleurs, la police (Geist)
et le logo du site.

## Ce que raconte le film

| Temps | Scène | Voix off |
|---|---|---|
| 0:02 | `hook` | Un poste ouvert. Deux cent cinquante CV. Qui sait vraiment faire le travail ? |
| 0:11 | `cv` | Un CV, c'est ce que quelqu'un a écrit sur lui-même. |
| 0:17 | `interview` | Un entretien, c'est ce qu'il en dit sous pression. |
| 0:23 | `cost` | Ni l'un ni l'autre n'est le travail. Les meilleurs passent à travers. |
| 0:30 | `reveal` | Onbord change la question : on regarde ce qu'ils font. |
| 0:38 | `paste` | 1. Collez l'offre, Onbord en tire les compétences. |
| 0:44 | `build` | 2. Une simulation : vingt minutes du métier. |
| 0:53 | `send` | 3. Un lien, le vrai travail, l'assistant IA à côté. |
| 1:00 | `results` | Classés sur vos critères, la preuve derrière chaque note. |
| 1:06 | `answer` | Chaque candidat reçoit une réponse. |
| 1:12 | `outro` | Recrutez sur les compétences. Pas sur le CV. |

Le problème se joue **de nuit** (fond bleu nuit, la mineur, tic-tac et
battement de cœur) ; la solution **de jour** (le fond du site, do majeur,
batterie complète). La bascule se fait sur le logo, avec une montée et un
impact.

## Fabriquer le film

```bash
cd video
./build.sh          # ~5 min ; écrit onbord-film.mp4
```

Il faut Python 3, Node 18+ et Chromium pour Playwright. Le premier lancement
télécharge le modèle de voix (~350 Mo, depuis GitHub).

## Les pièces

| Fichier | Rôle |
|---|---|
| `script.json` | **le texte.** Une entrée par scène, une ligne par phrase. `say` corrige la prononciation (« I A ») sans toucher au sous-titre. |
| `voice.py` | synthétise la voix off (Kokoro, voix `ff_siwis`) et écrit `timeline.json` : chaque scène démarre sur un temps de la musique (100 BPM). |
| `music.py` | compose la musique, les bruitages, et mixe le tout (la musique s'efface sous la voix). Aucun échantillon : tout est synthétisé. |
| `index.html` | l'animation. `renderAt(t)` dessine l'image à l'instant `t`, rien ne dépend d'une horloge. |
| `render.mjs` | ouvre la page dans Chromium, capture chaque image, les passe à ffmpeg. `--stills 3,31.5` sort des images fixes pour vérifier une mise en page. |

**Changer le texte** : modifiez `script.json`, relancez `build.sh`. Tout se
recale seul (durées, sous-titres, musique), puisque tout lit `timeline.json`.
Les animations d'une scène suivent les débuts de ses phrases (`L[0]`, `L[1]`…
dans `index.html`) : si vous ajoutez ou retirez une phrase, relisez la
fonction `draw.<scène>` correspondante.

**Deux repères sont réglés à la main** et doivent rester d'accord entre
`index.html` et `music.py` : le clic sur « Copier » (1,35 s après le début de
`send`) et les notifications de `answer` (0,6 s puis toutes les 0,2 s).

## Licences

- Voix : modèle Kokoro-82M (Apache 2.0).
- Police : Geist et Geist Mono (SIL Open Font License), copiées dans `fonts/`.
- Musique et bruitages : générés par `music.py`, sans source extérieure.
- Les noms de candidats et les scores sont fictifs.
