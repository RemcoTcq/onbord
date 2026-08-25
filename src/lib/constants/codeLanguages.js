// Catalogue des langages du sandbox code.
//
// Module PUR, séparé de lib/judge0.js à dessein : l'éditeur recruteur est un
// composant client et doit proposer la liste des langages, mais il n'a rien à
// faire d'un module qui parle à un fournisseur d'exécution (fetch, Buffer, clé
// d'API). Ici il n'y a que des données.
//
// Les `judge0_id` sont ceux de l'instance Judge0 CE : stables, mais ce sont
// leurs identifiants, pas les nôtres — d'où la table explicite.
export const CODE_LANGUAGES = {
  python: { judge0_id: 71, label: "Python 3.8" },
  javascript: { judge0_id: 93, label: "JavaScript (Node.js 18)" },
  typescript: { judge0_id: 74, label: "TypeScript 5" },
  java: { judge0_id: 62, label: "Java (OpenJDK 13)" },
  csharp: { judge0_id: 51, label: "C# (Mono 6)" },
  cpp: { judge0_id: 54, label: "C++ (GCC 9)" },
  php: { judge0_id: 68, label: "PHP 7.4" },
  ruby: { judge0_id: 72, label: "Ruby 2.7" },
  go: { judge0_id: 60, label: "Go 1.13" },
};

export const DEFAULT_LANGUAGE = "python";

export function languageInfo(language) {
  return CODE_LANGUAGES[language] || CODE_LANGUAGES[DEFAULT_LANGUAGE];
}
