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
};

export default nextConfig;
