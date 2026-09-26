import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

// Même configuration que l'application (à la racine du dépôt), et pour la même
// raison : `eslint-config-next` laisse `no-undef` désactivé parce qu'il vise
// TypeScript, où le compilateur s'en charge. Ce projet est en JavaScript pur —
// sans cette règle, un identifiant jamais importé ne se voit qu'au moment où le
// composant se rend, sous la forme d'une page blanche.

const eslintConfig = defineConfig([
  ...nextVitals,

  {
    files: ["**/*.{js,jsx,mjs}"],
    rules: { "no-undef": "error" },
  },

  globalIgnores([".next/**", "out/**", "build/**"]),
]);

export default eslintConfig;
