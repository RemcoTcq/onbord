"use server";

import anthropic from "../anthropic";
import { DOMAIN_HARD_SKILLS, SOFT_SKILLS_LIST } from "../constants/skills";
import { TAXONOMIE_COMPETENCES } from "../constants/taxonomie";

/**
 * Analyzes a raw job description using Claude 3.5 Sonnet to extract structured criteria.
 * @param {string} rawDescription - The raw text of the job description pasted by the user.
 * @returns {Promise<Object>} The extracted structured data.
 */
export async function analyzeJobDescription(rawDescription) {
  if (!rawDescription || rawDescription.trim().length < 50) {
    throw new Error("La description est trop courte pour être analysée de manière fiable.");
  }

  const prompt = `
Vous êtes un assistant IA expert en recrutement. Votre tâche est d'analyser une offre d'emploi brute et d'en extraire les informations clés dans un format JSON structuré.

Voici la description de l'offre d'emploi :
<job_description>
${rawDescription}
</job_description>

Votre tâche est de générer un objet JSON avec la structure exacte suivante. N'ajoutez aucun texte avant ou après le JSON. Remplissez autant de champs que possible en vous basant UNIQUEMENT sur la description fournie. Si une information n'est pas mentionnée, laissez la valeur vide ("" ou []).

Structure JSON attendue :
{
  "title": "Le titre précis du poste",
  "category": "La catégorie générale (ex: IT, Finance, Vente, etc.)",
  "talents_needed": "Nombre de personnes recherchées (ex: 1, 2, 3)",
  "contract_type": "Le type de contrat (CDI, CDD, Freelance, Stage, etc.)",
  "work_mode": "onsite, remote, ou hybrid",
  "location": "La ville ou région",
  "experience_level": "junior, intermediate, senior, ou expert",
  "years_of_experience": "Nombre d'années d'expérience requises (ex: 3, 5, 1-3, ou laisser vide)",
  "education_level": "Niveau d'études requis (ex: Bac+5, Master, Bachelier, Indifférent)",
  "hard_skills": [
    { "name": "Nom de la compétence", "priority": "must_have" ou "nice_to_have", "taxonomy_id": "ID de la taxonomie correspondante, ex: C001, ou null si aucune", "evidence": "Citation exacte de l'offre justifiant cette compétence", "confidence": 1 à 5 }
  ],
  "soft_skills": [
    { "name": "Nom du savoir-être", "priority": "must_have" ou "nice_to_have", "taxonomy_id": "ID de la taxonomie correspondante, ou null", "evidence": "Citation exacte de l'offre", "confidence": 1 à 5 }
  ],
  "languages": [
    { "name": "Nom de la langue", "level": "Niveau requis si mentionné de 1 à 5" }
  ],
  "selection_criteria": [
    { "name": "Critère de sélection pour le scoring CV (ex: Maîtrise de React.js)", "weight": 20 }
  ],
  "clean_description": "Un résumé propre et formaté (quelques paragraphes max) des missions et du profil recherché."
}
Règles pour selection_criteria : Générez exactement 5 critères pertinents basés sur l'offre. Les poids doivent totaliser 100.

RÈGLE ABSOLUE POUR LES SKILLS — LISEZ ATTENTIVEMENT :
1. Si l'utilisateur a fourni une description courte avec des mots-clés de compétences (ex: React, SQL, Python), vous DEVEZ ABSOLUMENT les extraire dans hard_skills. Ne les ignorez jamais.
2. Pour chaque compétence (hard et soft), vous devez la relier à une compétence de notre référentiel (Taxonomie) ci-dessous, en renseignant son \`taxonomy_id\`.
3. Si la compétence correspond à une compétence de la taxonomie (même si le wording est légèrement différent), utilisez EXACTEMENT le nom ("Compétence") et l'ID de la taxonomie correspondante.
4. Si la compétence n'existe absolument pas dans la taxonomie, mettez \`taxonomy_id: null\` et gardez le nom explicite.
5. Vous devez TOUJOURS inclure la "preuve" (\`evidence\`) c'est-à-dire l'extrait exact du texte original qui justifie l'extraction de cette compétence, et un score de confiance de 1 à 5.

Taxonomie Canonique (Référentiel des compétences pour le mapping) :
${JSON.stringify(TAXONOMIE_COMPETENCES.map(c => ({ ID: c.ID, Compétence: c.Compétence, Catégorie: c.Catégorie, "Définition courte": c["Définition courte"], "Compétences proches": c["Compétences proches"] })), null, 2)}

Si la compétence est technique mais absente de la taxonomie, vous pouvez utiliser la liste de référence suivante pour trouver le nom exact approprié :
Liste des Hard Skills de secours :
${JSON.stringify(DOMAIN_HARD_SKILLS, null, 2)}

Liste des Soft Skills de secours :
${JSON.stringify(SOFT_SKILLS_LIST, null, 2)}
`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2500,
      temperature: 0.1, // Low temperature for consistent extraction
      system: "Vous êtes un expert en extraction de données structurées. Répondez UNIQUEMENT avec un JSON valide.",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const textResponse = response.content[0].text;
    
    // Parse the JSON safely (in case Claude adds formatting blocks like \`\`\`json)
    const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    } else {
      throw new Error("L'IA n'a pas renvoyé un format JSON valide.");
    }
  } catch (error) {
    console.error("Error analyzing job description:", error);
    throw new Error(error.message || "Impossible d'analyser l'offre pour le moment. Veuillez réessayer.");
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

export async function generateAiInterviewText(type, jobData, tonality = 'Neutre') {
  const title = jobData?.title || "ce poste";
  const category = jobData?.category ? `(${jobData.category})` : "";
  let prompt = "";
  if (type === 'intro') {
    prompt = `Rédige un court message d'introduction (maximum 400 caractères) pour une interview IA. Le poste est : ${title}. Le ton doit être ${tonality}. Laisse un espace type "[Nom de l'entreprise]" pour que l'on puisse le remplacer.`;
  } else if (type === 'outro') {
    prompt = `Rédige un court message de clôture (maximum 300 caractères) pour une interview IA. Le poste est : ${title}. Le ton doit être ${tonality}. Remercie le candidat et indique qu'on le recontactera bientôt.`;
  } else if (type === 'context_about') {
    prompt = `Rédige un court paragraphe (maximum 50 mots) pour briefer une IA sur le contexte de l'entreprise qui recrute pour le poste : ${title} ${category}. Utilise un ton professionnel. Sois générique et laisse des placeholders si besoin.`;
  } else if (type === 'context_why') {
    prompt = `Rédige un court paragraphe (maximum 50 mots) pour briefer une IA sur le pourquoi de ce recrutement : ${title} ${category}. Exemple : croissance, nouvelle équipe, etc. Laisse des placeholders.`;
  } else if (type === 'context_what_matters') {
    prompt = `Rédige un court paragraphe (maximum 50 mots) pour briefer une IA sur ce qui compte vraiment humainement pour le poste : ${title}. Inspire-toi des soft skills typiques pour ce rôle.`;
  } else {
    throw new Error("Type inconnu");
  }

  try {
    const response = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 300,
      temperature: 0.7,
      system: "Tu es un expert en recrutement. Réponds directement avec le texte demandé, sans aucune phrase d'introduction ou de conclusion comme 'Voici le texte :'.",
      messages: [{ role: "user", content: prompt }],
    });
    return { success: true, text: response.content[0].text.trim() };
  } catch (err) {
    console.error("Error generating text:", err);
    return { success: false, error: "Erreur de génération" };
  }
}
