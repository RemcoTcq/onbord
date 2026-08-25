// Catalogue des langages du sandbox code.
//
// Module PUR, séparé du client d'exécution à dessein : l'éditeur recruteur est
// un composant client et doit proposer la liste des langages, mais il n'a rien
// à faire d'un module qui parle au réseau. Ici il n'y a que des données.
//
// `wandbox` est l'identifiant de compilateur chez le fournisseur d'exécution.
// La version est ÉPINGLÉE : Wandbox publie plusieurs runtimes pour un même
// langage (deux "javascript", l'un Deno l'autre Node) et un identifiant flou
// choisirait pour nous.
//
// CE QUI N'EST PAS DANS LA LISTE, ET POURQUOI (vérifié par exécution réelle
// le 25/08/2026, ne pas rajouter sans re-tester) :
// - Go : correct mais ~9,5 s par exécution, la compilation à froid mange tout
//   le budget d'une requête serveur.
// - TypeScript : le programme tourne, mais aucune façon fiable d'y lire
//   l'entrée standard — or tous nos exercices lisent stdin.
export const CODE_LANGUAGES = {
  python: { wandbox: "cpython-3.14.0", label: "Python 3.14" },
  javascript: { wandbox: "nodejs-20.17.0", label: "JavaScript (Node.js 20)" },
  java: { wandbox: "openjdk-jdk-21+35", label: "Java 21" },
  csharp: { wandbox: "mono-6.12.0.199", label: "C# (Mono 6)" },
  cpp: { wandbox: "gcc-13.2.0", label: "C++ (GCC 13)" },
  php: { wandbox: "php-8.3.12", label: "PHP 8.3" },
  ruby: { wandbox: "ruby-3.3.11", label: "Ruby 3.3" },
};

export const DEFAULT_LANGUAGE = "python";

export function languageInfo(language) {
  return CODE_LANGUAGES[language] || CODE_LANGUAGES[DEFAULT_LANGUAGE];
}
