import { SITE_URL } from "@/lib/i18n/config";

// robots.txt, servi sur /robots.txt.
//
// Le site public a vocation à être indexé — c'est même toute sa raison d'être,
// contrairement à l'application, qui n'a rien à faire dans un moteur de
// recherche.
//
// Attention aux préproductions : si NEXT_PUBLIC_SITE_URL n'est pas renseignée
// sur un déploiement de test, ce fichier annonce aux robots le sitemap de la
// PRODUCTION. Pour une préprod, poser la variable — et, tant qu'à faire,
// bloquer l'indexation par l'en-tête de la plateforme d'hébergement.

export default function robots() {
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
