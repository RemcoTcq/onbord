/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["pdfjs-dist"],

  // Les erreurs du NAVIGATEUR sont recopiées dans le terminal de `next dev`
  // (donc dans .next/dev/logs/next-development.log), avec leur emplacement
  // source. Sans ça, un plantage côté client — l'écran « This page couldn't
  // load » — ne laisse aucune trace lisible ailleurs que dans la console du
  // navigateur. Sans effet en production.
  logging: { browserToTerminal: "error" },
};

export default nextConfig;
