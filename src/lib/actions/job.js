"use server";

import anthropic from "../anthropic";
import { consigneLangueExtraction } from "@/lib/i18n/prompt";
import { DOMAIN_HARD_SKILLS, SOFT_SKILLS_LIST } from "../constants/skills";
import { createClient } from "@/lib/supabase/server";

/**
 * Analyzes a raw job description using Claude 3.5 Sonnet to extract structured criteria.
 * @param {string} rawDescription - The raw text of the job description pasted by the user.
 * @returns {Promise<Object>} The extracted structured data.
 */
export async function analyzeJobDescription(rawDescription) {
  if (!rawDescription || rawDescription.trim().length < 50) {
    throw new Error("La description est trop courte pour être analysée de manière fiable.");
  }

  // Fetch active tests from the library to pass to the AI
  const supabase = await createClient();

  // Langue d'interface du recruteur : les champs de texte libre extraits
  // sont relus par lui dans le formulaire, pas par le candidat.
  const { data: { user } } = await supabase.auth.getUser();
  let uiLocale = "fr";
  if (user) {
    const { data: profil } = await supabase.from("users").select("ui_locale").eq("id", user.id).single();
    if (profil?.ui_locale) uiLocale = profil.ui_locale;
  }

  const { data: activeTests } = await supabase
    .from("assessment_tests")
    .select("id, name, description")
    .eq("status", "active");

  const testCatalogStr = activeTests && activeTests.length > 0
    ? `\n\nVoici notre catalogue de tests métier globaux disponibles :\n<test_catalog>\n${JSON.stringify(activeTests, null, 2)}\n</test_catalog>`
    : "";

  const prompt = `${consigneLangueExtraction(uiLocale)}

Vous êtes un assistant IA expert en recrutement. Votre tâche est d'analyser une offre d'emploi brute et d'en extraire les informations clés dans un format JSON structuré.

Voici la description de l'offre d'emploi :
<job_description>
${rawDescription}
</job_description>${testCatalogStr}

Votre tâche est de générer un objet JSON avec la structure exacte suivante. N'ajoutez aucun texte avant ou après le JSON. Remplissez autant de champs que possible en vous basant UNIQUEMENT sur la description fournie. Si une information n'est pas mentionnée, laissez la valeur vide ("" ou []).

ATTENTION CRITIQUE : Vous devez IMPÉRATIVEMENT échapper les guillemets doubles (\\") à l'intérieur des chaînes de caractères (notamment dans les champs "evidence" et "clean_description"). Le JSON généré doit être 100% valide et parsable par JSON.parse(). Ne mettez jamais de sauts de ligne non échappés dans les chaînes de caractères.

Structure JSON attendue :
{
  "title": "Le titre précis du poste",
  "category": "La famille d'emploi (ex: Vente, Engineering, Finance, etc.)",
  "sub_family": "La sous-famille précise du poste (ex: Account Executive B2B, Backend Developer, etc.)",
  "role_type": "Le type de rôle parmi ces 4 choix EXACTS : 'Contributeur individuel (IC) — Pas de responsabilité managériale, expert de son domaine', 'Manager — Gère une équipe, évalue, décide des ressources', 'Senior IC / Lead — Expert senior sans équipe directe mais avec influence', 'Director / Executive — Management de managers, vision stratégique'",
  "talents_needed": "Nombre de personnes recherchées (ex: 1, 2, 3)",
  "contract_type": "Le type de contrat, en français : 'CDI', 'CDD', 'Freelance', 'Stage', 'Alternance' ou 'Intérim'. Un 'permanent contract' est un 'CDI'.",
  "work_mode": "onsite, remote, ou hybrid",
  "location": "La ville ou région",
  "experience_level": "junior, intermediate, senior, ou expert",
  "years_of_experience": "Nombre d'années d'expérience requises (ex: 3, 5, 1-3, ou laisser vide)",
  "education_level": "Niveau d'études requis. UNIQUEMENT l'une de ces trois valeurs exactes : 'Master', 'Bachelier', 'Indifférent'. Un Bac+5, un Master's degree ou un diplôme d'ingénieur donnent 'Master'. Si l'offre n'exige rien, 'Indifférent'.",
  "hard_skills": [
    { "name": "Nom de la compétence", "priority": "must_have", "evidence": "Citation exacte de l'offre justifiant cette compétence" }
  ],
  "soft_skills": [
    { "name": "Nom du savoir-être", "priority": "ambiguous", "evidence": "Citation exacte de l'offre" }
  ],
  "languages": [
    { "name": "Nom de la langue EN FRANÇAIS — 'Français', 'Anglais', 'Néerlandais', 'Allemand'… jamais 'English' ni 'Dutch'", "level": 3 }
  ],
  "selection_criteria": [
    { "name": "Critère de sélection pour le scoring CV (ex: Maîtrise de React.js)", "weight": 20 }
  ],
  "clean_description": "Un résumé propre et formaté (quelques paragraphes max) des missions et du profil recherché.",
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
`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      // 2500 était trop juste et coupait la réponse en plein JSON. Mesuré sur
      // une offre tech dense de 2,7 ko : 2 400 tokens de sortie, soit 100 de
      // marge. Le prompt réclame TOUTES les compétences avec une citation pour
      // chacune, donc la sortie grandit avec la densité de l'offre — une offre
      // à peine plus fournie dépassait le plafond, le JSON arrivait tronqué, et
      // JSON.parse levait. Le recruteur voyait un écran d'erreur, sans rien qui
      // dise pourquoi.
      max_tokens: 8000,
      temperature: 0.1, // Low temperature for consistent extraction
      system: "Vous êtes un expert en extraction de données structurées. Répondez UNIQUEMENT avec un JSON valide.",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    // Une réponse coupée au plafond ne produit JAMAIS de JSON valide. On le dit
    // ici, plutôt que de laisser JSON.parse échouer sur une accolade manquante
    // avec un message que personne ne peut relier à la cause.
    if (response.stop_reason === "max_tokens") {
      throw new Error(
        "L'offre est trop dense pour être analysée d'un seul tenant. " +
        "Raccourcissez-la, ou ne collez que la partie qui décrit les missions et le profil."
      );
    }

    // Le premier bloc n'est du texte que si rien d'autre ne le précède : on le
    // cherche plutôt que de l'indexer à l'aveugle.
    const textResponse = (response.content || []).find((b) => b.type === "text")?.text;
    if (!textResponse) throw new Error("L'IA n'a renvoyé aucun texte exploitable.");

    // Le modèle encadre volontiers sa réponse d'un bloc de code malgré la
    // consigne : on isole l'objet au lieu de parser la réponse brute.
    const debut = textResponse.indexOf("{");
    const fin = textResponse.lastIndexOf("}");
    if (debut === -1 || fin <= debut) {
      throw new Error("L'IA n'a pas renvoyé un format JSON valide.");
    }
    return JSON.parse(textResponse.slice(debut, fin + 1));
  } catch (error) {
    console.error("Error analyzing job description:", error);
    throw new Error(error.message || "Impossible d'analyser l'offre pour le moment. Veuillez réessayer.");
  }
}

/**
 * Crée un poste "à la volée" depuis le hub Expériences : offre + infos de base.
 * L'analyse IA de l'offre est best-effort (enrichit extracted_criteria) et non
 * bloquante — la génération d'expérience fonctionne même sans critères extraits.
 */
export async function createRoleQuick(title, description) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Non authentifié" };

    let criteria = {};
    if (description && description.trim().length >= 50) {
      try { criteria = await analyzeJobDescription(description); } catch (e) { console.error("analyse offre (non bloquant):", e.message); }
    }
    const finalTitle = (title && title.trim()) || criteria?.title || "Nouveau poste";

    const { data: job, error } = await supabase
      .from("jobs")
      .insert({
        user_id: user.id,
        title: finalTitle,
        description: description || null,
        extracted_criteria: criteria || {},
        status: "active",
      })
      .select("id, title, extracted_criteria")
      .single();
    if (error) throw error;
    return { success: true, job };
  } catch (err) {
    console.error("createRoleQuick error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Logs unmapped skills to the unmapped_skills_log table for future taxonomy enrichment.
 * Non-blocking — errors are caught and logged, never thrown.
 */
async function logUnmappedSkills(skillNames, jobTitle) {
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const rows = skillNames.map(name => ({
      skill_name: name,
      job_title: jobTitle || null,
    }));
    await supabase.from("unmapped_skills_log").insert(rows);
  } catch (err) {
    console.error("Failed to log unmapped skills (non-blocking):", err);
  }
}


export async function updateJobAiConfig(jobId, config) {
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Non authentifié");

    const { error } = await supabase
      .from('jobs')
      .update({ ai_interview_config: config })
      .eq('id', jobId)
      .eq('user_id', user.id);

    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error("Error updating AI config:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Génère automatiquement les questions d'interview et les critères décisifs (red flags) 
 * pour les compétences non-testables. (Phase 2.3)
 */
export async function generateInterviewQuestions(jobData, interviewSkills) {
  if (!interviewSkills || interviewSkills.length === 0) {
    return { success: true, questions: [], decisive_criteria: [] };
  }

  const title = jobData?.title || "Poste inconnu";
  const contextText = jobData?.description ? jobData.description.substring(0, 1000) : "Aucun contexte fourni";
  
  const skillsList = interviewSkills.map(s => {
    return `- ${s.name}`;
  }).join("\n");

  const prompt = `Tu es un expert en recrutement B2B. Tu dois rédiger des questions d'entretien spécifiques pour le poste de "${title}".

CONTEXTE DE L'OFFRE :
${contextText}...

COMPÉTENCES CLÉS À ÉVALUER EN ENTRETIEN (non testables techniquement) :
${skillsList}

RÈGLES :
1. Génère 1 à 2 questions ciblées et percutantes pour CHACUNE des compétences listées.
2. Formule les questions pour qu'elles puissent être lues telles quelles à l'oral par un assistant IA au candidat (tutoiement/vouvoiement neutre, ex: "Pouvez-vous me donner un exemple de...").
3. Identifie 1 à 3 critères décisifs (red flags ou points bloquants évidents) qui montreraient que le candidat n'a pas du tout le profil requis sur ces compétences.

Renvoie UNIQUEMENT un JSON valide, sans texte avant ou après :
{
  "questions": ["Question 1...", "Question 2..."],
  "decisive_criteria": ["Red flag 1...", "Red flag 2..."]
}`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1500,
      temperature: 0.2,
      system: "Tu es un assistant expert en structuration d'entretiens de recrutement. Réponds UNIQUEMENT avec un JSON valide.",
      messages: [{ role: "user", content: prompt }]
    });

    const textResponse = response.content[0].text;
    const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return { 
        success: true, 
        questions: parsed.questions || [], 
        decisive_criteria: parsed.decisive_criteria || [] 
      };
    }
    throw new Error("JSON non trouvé dans la réponse du LLM");
  } catch (err) {
    console.error("Error generating interview questions:", err);
    return { success: false, error: err.message, questions: [], decisive_criteria: [] };
  }
}

