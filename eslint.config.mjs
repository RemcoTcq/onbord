import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,

  // eslint-config-next laisse no-undef désactivé (il vise TypeScript, où le
  // compilateur s’en charge). Ce projet est en JavaScript pur : sans cette
  // règle, un identifiant jamais importé ne se voit qu’au moment où le
  // composant se rend, sous la forme d’un écran « This page couldn’t load ».
  // Quatre l’ont fait — trois hooks i18n appelés sans import, et un paramètre
  // de boucle qui masquait la fonction de traduction.
  {
    files: ["**/*.{js,jsx,mjs}"],
    rules: { "no-undef": "error" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Le SITE public est un projet à part (voir AGENTS.md) : il a sa propre
    // configuration ESLint et son propre `npm run lint`. Sans cette ligne, le
    // lint de l'application irait juger un code qui ne suit pas ses règles.
    "site/**",
  ]),
]);

export default eslintConfig;
