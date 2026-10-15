// ─────────────────────────────────────────────────────────────────────────────
// L'image de partage (15/10/2026) : ce qui s'affiche quand un lien du site est
// collé dans LinkedIn, Slack, WhatsApp ou un e-mail. Sans elle, la balise
// `twitter:card` annonçait une grande image qui n'existait pas, et le lien
// partait nu.
//
// `public/og.png`, 1200 × 630 : le ciel du hero, le titre, et « job
// simulations ». Dessinée en HTML puis capturée ; pour la refaire, changer le
// visuel et réécraser le fichier, il n'y a pas une ligne de code à toucher.
//
// ⚠️ À DÉCLARER DANS CHAQUE `openGraph`. Next ne fusionne pas les objets de
// métadonnées : une page qui pose son propre `openGraph` (l'accueil, les
// articles) REMPLACE celui du layout, image comprise. D'où cette constante,
// importée partout où un `openGraph` est écrit.
//
// Pas la convention de fichier `opengraph-image.png` de Next : posée sous
// [lang], elle sortait à une adresse « /-/opengraph-image.png », et les
// articles la perdaient quand même pour la raison ci-dessus.
// ─────────────────────────────────────────────────────────────────────────────

export const IMAGE_PARTAGE = {
  url: "/og.png",
  width: 1200,
  height: 630,
  alt: "Onbord: hire on real skills, not CVs. Job simulations built from your job posting.",
};
