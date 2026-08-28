// Prompt d'extraction des critères d'une offre — module PUR.
//
// Pas de "use server" : il est appelé par la server action analyzeJobDescription
// (lib/actions/job.js) ET par le contrôle scripts/check-langue-extraction.mjs,
// qui le rejoue sur de vrais appels API. Un module "use server" ne peut exporter
// que des fonctions async, donc rien de testable sans passer par le réseau.
// Même motif que experienceGeneration.js et experienceChat.js.
//
// Ce prompt a été la source d'un bug tenace : ses exemples de valeurs étaient
// écrits en français (« ex: Vente, Engineering, Finance »), et le modèle les
// recopiait tels quels pour une offre anglaise analysée en interface anglaise.
// La langue est désormais nommée en tête, MARQUÉE SUR CHAQUE CHAMP, et rappelée
// en queue. Ne réintroduisez pas d'exemple de valeur rédigé dans une langue
// fixe : c'est exactement ce qui cassait.

import { consigneLangueExtraction, rappelLangueExtraction } from "@/lib/i18n/prompt";
import { coerceExperienceLocale, coerceUiLocale, LOCALE_NAMES_FR } from "@/lib/i18n/config";

export const SYSTEME_EXTRACTION =
  "Vous êtes un expert en extraction de données structurées. Répondez UNIQUEMENT avec un JSON valide. " +
  "Les valeurs textuelles sont rédigées dans la langue indiquée sur chaque champ du schéma — jamais en français par défaut.";

/**
 * @param {{rawDescription: string, testCatalogStr?: string, uiLocale: string, contentLocale: string}} p
 */
export function buildJobExtractionPrompt({ rawDescription, testCatalogStr = "", uiLocale, contentLocale }) {
  // Nom des deux langues, injecté SUR CHAQUE CHAMP du schéma plus bas. Une
  // consigne globale en tête ne tient pas la distance : cinquante lignes de
  // schéma français plus loin, le modèle rendait « Vente » pour une offre
  // anglaise. Marquer le champ lui-même met la consigne là où la valeur
  // s'écrit.
  const contenu = coerceExperienceLocale(contentLocale);
  const nomUi = LOCALE_NAMES_FR[coerceUiLocale(uiLocale)];
  const nomContenu = LOCALE_NAMES_FR[contenu];

  return `${consigneLangueExtraction(uiLocale, contenu)}

Vous êtes un assistant IA expert en recrutement. Votre tâche est d'analyser une offre d'emploi brute et d'en extraire les informations clés dans un format JSON structuré.

Voici la description de l'offre d'emploi :
<job_description>
${rawDescription}
</job_description>${testCatalogStr}

Votre tâche est de générer un objet JSON avec la structure exacte suivante. N'ajoutez aucun texte avant ou après le JSON. Remplissez autant de champs que possible en vous basant UNIQUEMENT sur la description fournie. Si une information n'est pas mentionnée, laissez la valeur vide ("" ou []).

ATTENTION CRITIQUE : Vous devez IMPÉRATIVEMENT échapper les guillemets doubles (\\") à l'intérieur des chaînes de caractères (notamment dans les champs "evidence" et "clean_description"). Le JSON généré doit être 100% valide et parsable par JSON.parse(). Ne mettez jamais de sauts de ligne non échappés dans les chaînes de caractères.

Structure JSON attendue :
{
  "title": "Le titre précis du poste — RÉDIGÉ EN ${nomContenu}",
  "category": "La famille d'emploi : le grand domaine du métier, un ou deux mots — RÉDIGÉE EN ${nomUi}. Les mots « vente », « ingénierie », « finance », « marketing », « opérations », « ressources humaines » disent le NIVEAU DE GRANULARITÉ attendu, ils ne sont pas des valeurs à recopier : rends l'équivalent en ${nomUi}.",
  "sub_family": "La sous-famille précise du poste, au niveau d'un intitulé de métier — RÉDIGÉE EN ${nomUi}.",
  "role_type": "Le type de rôle parmi ces 4 choix EXACTS : 'Contributeur individuel (IC) — Pas de responsabilité managériale, expert de son domaine', 'Manager — Gère une équipe, évalue, décide des ressources', 'Senior IC / Lead — Expert senior sans équipe directe mais avec influence', 'Director / Executive — Management de managers, vision stratégique'",
  "talents_needed": "Nombre de personnes recherchées (ex: 1, 2, 3)",
  "contract_type": "Le type de contrat, en français : 'CDI', 'CDD', 'Freelance', 'Stage', 'Alternance' ou 'Intérim'. Un 'permanent contract' est un 'CDI'.",
  "work_mode": "onsite, remote, ou hybrid",
  "location": "La ville ou région",
  "experience_level": "junior, intermediate, senior, ou expert",
  "years_of_experience": "Nombre d'années d'expérience requises (ex: 3, 5, 1-3, ou laisser vide)",
  "education_level": "Niveau d'études requis. UNIQUEMENT l'une de ces trois valeurs exactes : 'Master', 'Bachelier', 'Indifférent'. Un Bac+5, un Master's degree ou un diplôme d'ingénieur donnent 'Master'. Si l'offre n'exige rien, 'Indifférent'.",
  "hard_skills": [
    { "name": "Nom de la compétence — RÉDIGÉ EN ${nomUi}, même si l'offre la nomme dans une autre langue", "priority": "must_have", "evidence": "Citation exacte de l'offre justifiant cette compétence" }
  ],
  "soft_skills": [
    { "name": "Nom du savoir-être — RÉDIGÉ EN ${nomUi}, même si l'offre le nomme dans une autre langue", "priority": "ambiguous", "evidence": "Citation exacte de l'offre" }
  ],
  "languages": [
    { "name": "Nom de la langue EN FRANÇAIS — 'Français', 'Anglais', 'Néerlandais', 'Allemand'… jamais 'English' ni 'Dutch'", "level": 3 }
  ],
  "selection_criteria": [
    { "name": "Critère de sélection pour le scoring CV — RÉDIGÉ EN ${nomUi}", "weight": 20 }
  ],
  "clean_description": "Un résumé propre et formaté (quelques paragraphes max) des missions et du profil recherché — RÉDIGÉ EN ${nomContenu}.",
  "recommended_test_ids": ["UUID_1", "UUID_2"]
}
Règles pour selection_criteria : Générez exactement 5 critères pertinents basés sur l'offre. Les poids doivent totaliser 100.
Pour le champ "priority" des skills, utilisez UNIQUEMENT "must_have", "nice_to_have", ou "ambiguous" (si l'offre ne permet pas de déterminer l'importance de la compétence).

RÈGLE ABSOLUE POUR LES SKILLS ET LES LANGUES — LISEZ ATTENTIVEMENT :
1. Si l'utilisateur a fourni une description courte avec des mots-clés de compétences (ex: React, SQL, Python), vous DEVEZ ABSOLUMENT les extraire dans hard_skills. Ne les ignorez jamais.
2. Soyez exhaustif : extrayez TOUTES les compétences (hard et soft) présentes ou sous-entendues dans le texte. Ne vous limitez pas.
3. Vous devez TOUJOURS inclure la "preuve" (le champ evidence) c'est-à-dire l'extrait exact du texte original qui justifie l'extraction de cette compétence.
4. INTERDICTION FORMELLE de lister les langues (ex: Anglais, Français, Néerlandais, English, etc.) dans les "hard_skills" ou "soft_skills". Les langues doivent figurer UNIQUEMENT dans le tableau "languages".

RÈGLE POUR RECOMMENDED_TEST_IDS :
En vous basant sur la description de l'offre et le <test_catalog> fourni, choisissez jusqu'à 2 tests globaux (maximum) qui correspondent le mieux au métier recherché. Retournez UNIQUEMENT la liste de leurs "id" (ex: "f575da89-..."). Si aucun test métier global ne correspond à l'offre, laissez la liste vide []. Ne proposez un test que s'il évalue directement le métier ou les compétences principales du poste.

${rappelLangueExtraction(uiLocale, contenu)}
`;
}
