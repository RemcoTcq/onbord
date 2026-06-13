"use server";

import anthropic from "../anthropic";
import { DOMAIN_HARD_SKILLS, SOFT_SKILLS_LIST } from "../constants/skills";

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
    { "name": "Nom de la compétence technique", "priority": "must_have" ou "nice_to_have" }
  ],
  "soft_skills": [
    { "name": "Nom du savoir-être", "priority": "must_have" ou "nice_to_have" }
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
2. Vous DEVEZ utiliser les noms de notre liste de référence en copiant-collant EXACTEMENT le texte, caractère par caractère, majuscules, minuscules, points, slashs et espaces compris.
Exemples corrects : "React.js" (pas "React" ni "ReactJS"), "HTML/CSS" (pas "HTML & CSS"), "Node.js" (pas "NodeJS"), "Microsoft Excel" (pas "Excel"), "Google Analytics" (pas "GA").
3. Si une compétence correspond conceptuellement à un élément de notre liste, utilisez TOUJOURS le nom exact de notre liste.
4. Si une compétence n'existe vraiment pas dans notre liste, seulement dans ce cas, ajoutez-la telle quelle.

Liste des Hard Skills par domaine (copiez-collez exactement ces noms) :
${JSON.stringify(DOMAIN_HARD_SKILLS, null, 2)}

Liste des Soft Skills (copiez-collez exactement ces noms) :
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
