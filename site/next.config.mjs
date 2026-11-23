import { fileURLToPath } from "url";
import { dirname } from "path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ce dossier est la racine du projet, POINT.
  //
  // Sans cette ligne, Turbopack remonte l'arborescence, trouve le
  // package-lock.json de l'application à la racine du dépôt, et décide que la
  // racine du site est là-haut. Il compilerait alors le site avec le contexte
  // d'un autre projet. Deux applications dans un même dépôt, c'est le prix à
  // payer : il faut le dire explicitement.
  turbopack: { root: dirname(fileURLToPath(import.meta.url)) },

  // Les erreurs du NAVIGATEUR sont recopiées dans le terminal de `next dev`,
  // avec leur emplacement source. Même réglage que l'application, pour la même
  // raison : sans ça, un plantage côté client ne laisse aucune trace lisible
  // ailleurs que dans la console du navigateur. Sans effet en production.
  logging: { browserToTerminal: "error" },

  // La page des métiers tech a été en ligne du 13 au 14/10/2026, puis retirée
  // (elle n'est plus qu'une entrée « bientôt » du menu). Son adresse renvoie
  // vers les métiers business plutôt que sur une 404. Temporaire (307) et non
  // permanente : la page reviendra, et une 308 resterait en cache.
  async redirects() {
    return [
      { source: "/tech-roles", destination: "/en/business-roles", permanent: false },
      { source: "/:lang/tech-roles", destination: "/:lang/business-roles", permanent: false },
      // Les comparaisons, retirées le 10/11/2026 « pour l'instant » : leur
      // catégorie et leurs deux articles renvoient à toutes les ressources.
      { source: "/:lang/resources/comparisons", destination: "/:lang/resources", permanent: false },
      { source: "/:lang/resources/comparisons/:slug", destination: "/:lang/resources", permanent: false },
      // La page des tarifs, retirée le 23/11/2026 « pour le moment » : le
      // barème est recalculé. Ses adresses (et les anciennes traduites)
      // mènent à la démo, où le prix se discute de vive voix.
      { source: "/pricing", destination: "/en/demo", permanent: false },
      { source: "/:lang/pricing", destination: "/:lang/demo", permanent: false },
      { source: "/:lang/tarifs", destination: "/:lang/demo", permanent: false },
      { source: "/:lang/tarieven", destination: "/:lang/demo", permanent: false },
    ];
  },
};

export default nextConfig;
