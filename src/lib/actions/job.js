"use server";

import anthropic from "../anthropic";

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
  "talent_type": "etudiant ou jeune_diplome",
  "talents_needed": "Nombre de personnes recherchées (ex: 1, 2, 3)",
  "contract_type": "Le type de contrat (CDI, CDD, Freelance, Stage, etc.)",
  "work_mode": "onsite, remote, ou hybrid",
  "location": "La ville ou région",
  "experience_level": "junior, intermediate, senior, ou expert",
  "years_of_experience": "Nombre d'années d'expérience requises (ex: 3, 5, 1-3, ou laisser vide)",
  "education_level": "Niveau d'études requis (ex: Bac+5, Master, Bachelier, Indifférent)",
  "hard_skills": [
    { "name": "Nom de la compétence technique", "priority": "must_have" ou "nice_to_have" }
  ],
  "soft_skills": [
    { "name": "Nom du savoir-être", "priority": "must_have" ou "nice_to_have" }
  ],
  "languages": [
    { "name": "Nom de la langue", "level": "Niveau requis si mentionné de 1 à 5" }
  ],
  "clean_description": "Un résumé propre et formaté (quelques paragraphes max) des missions et du profil recherché."
}
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


/**
 * Met à jour le statut de l'agence pour une demande.
 */
export async function updateJobAgencyStatus(jobId, newStatus) {
  try {
    const { createClient } = await import("../supabase/server");
    const supabase = await createClient();
    
    // 1. Récupérer le job actuel pour avoir ses critères
    const { data: job, error: getError } = await supabase
      .from('jobs')
      .select('extracted_criteria')
      .eq('id', jobId)
      .single();
    
    if (getError) throw getError;

    // 2. Mettre à jour le JSON
    const updatedCriteria = {
      ...job.extracted_criteria,
      agency_status: newStatus
    };

    const { error: updateError } = await supabase
      .from('jobs')
      .update({ extracted_criteria: updatedCriteria })
      .eq('id', jobId);

    if (updateError) throw updateError;
    return { success: true };
  } catch (error) {
    console.error("Update Agency Status Error:", error);
    return { success: false, error: error.message };
  }
}
