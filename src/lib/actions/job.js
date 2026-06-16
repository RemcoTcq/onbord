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
    { "name": "Nom de la compétence", "priority": "must_have" ou "nice_to_have", "evidence": "Citation exacte de l'offre justifiant cette compétence", "confidence": 1 à 5 }
  ],
  "soft_skills": [
    { "name": "Nom du savoir-être", "priority": "must_have" ou "nice_to_have", "evidence": "Citation exacte de l'offre", "confidence": 1 à 5 }
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
2. Soyez exhaustif : extrayez TOUTES les compétences (hard et soft) présentes ou sous-entendues dans le texte. Ne vous limitez pas.
3. Vous devez TOUJOURS inclure la "preuve" (le champ evidence) c'est-à-dire l'extrait exact du texte original qui justifie l'extraction de cette compétence, et un score de confiance de 1 à 5.
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
    
    // Parse the JSON safely (in case Claude adds formatting blocks like ```json)
    const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsedData = JSON.parse(jsonMatch[0]);
      return await mapSkillsToTaxonomy(parsedData);
    } else {
      throw new Error("L'IA n'a pas renvoyé un format JSON valide.");
    }
  } catch (error) {
    console.error("Error analyzing job description:", error);
    throw new Error(error.message || "Impossible d'analyser l'offre pour le moment. Veuillez réessayer.");
  }
}

// ─── Normalisation utilitaire pour le matching déterministe ─────────────────
const STOP_WORDS = new Set([
  'de', 'du', 'des', 'd', 'l', 'la', 'le', 'les', 'un', 'une', 'et', 'en', 'à', 'a', 'au', 'aux'
]);

/**
 * Normalize a string for fuzzy comparison:
 * - lowercase
 * - strip accents/diacritics
 * - remove stop words (articles, prepositions)
 * - naive singularization (trailing 's')
 * - returns sorted tokens for set-based comparison
 */
function normalizeForComparison(str) {
  if (!str) return { normalized: '', tokens: [] };
  const stripped = str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/['']/g, ' ')          // apostrophes → space
    .replace(/[^a-z0-9\s]/g, ' ')   // punctuation → space
    .trim();

  const tokens = stripped
    .split(/\s+/)
    .filter(t => t.length > 0 && !STOP_WORDS.has(t))
    .map(t => {
      // Naive singularization: remove trailing 's' unless word ends in ss, us, is
      if (t.length > 3 && t.endsWith('s') && !t.endsWith('ss') && !t.endsWith('us') && !t.endsWith('is')) {
        return t.slice(0, -1);
      }
      return t;
    });

  return {
    normalized: tokens.join(' '),
    tokens: [...tokens].sort(),
  };
}

/**
 * Compute token overlap ratio between two token arrays.
 * Returns a value between 0 and 1.
 * If the shorter set is fully contained in the longer, returns 1.0 (subset match).
 */
function tokenOverlap(tokensA, tokensB) {
  if (tokensA.length === 0 || tokensB.length === 0) return 0;
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  const common = tokensA.filter(t => setB.has(t)).length;

  // Subset check: if all tokens of the shorter set are in the longer, it's a strong match
  const shorter = tokensA.length <= tokensB.length ? tokensA : tokensB;
  const longerSet = tokensA.length <= tokensB.length ? setB : setA;
  const isSubset = shorter.every(t => longerSet.has(t));
  if (isSubset && shorter.length > 0) return 1.0;

  // Ratio = common / max(lenA, lenB)
  return common / Math.max(tokensA.length, tokensB.length);
}

// Pre-compute normalized taxonomy entries (done once at module load)
const TAXONOMY_NORMALIZED = TAXONOMIE_COMPETENCES.map(c => ({
  entry: c,
  comp: normalizeForComparison(c.Compétence),
  synonyms: (c['Compétences proches'] || '')
    .split(',')
    .map(s => normalizeForComparison(s.trim()))
    .filter(s => s.normalized.length > 0),
}));

/**
 * Etape B: Maps extracted skills to the internal taxonomy.
 * B1: Deterministic matching with normalization (3 passes)
 * B2: LLM semantic fallback (single call, temperature 0)
 * Logs unmapped skills to Supabase for future taxonomy enrichment.
 */
export async function mapSkillsToTaxonomy(extractedData) {
  const data = { ...extractedData };
  const allSkills = [...(data.hard_skills || []), ...(data.soft_skills || [])];

  // ── B1: Deterministic matching ──────────────────────────────────────────────
  for (const skill of allSkills) {
    if (!skill.name) continue;

    const skillNorm = normalizeForComparison(skill.name);

    // Pass 1: Exact normalized match on Compétence
    let match = TAXONOMY_NORMALIZED.find(t => t.comp.normalized === skillNorm.normalized);

    // Pass 2: Token overlap ≥ 70% on Compétence
    if (!match) {
      let bestScore = 0;
      let bestMatch = null;
      for (const t of TAXONOMY_NORMALIZED) {
        const score = tokenOverlap(skillNorm.tokens, t.comp.tokens);
        if (score >= 0.7 && score > bestScore) {
          bestScore = score;
          bestMatch = t;
        }
      }
      match = bestMatch;
    }

    // Pass 3: Normalized synonym match (check each synonym individually)
    if (!match) {
      match = TAXONOMY_NORMALIZED.find(t =>
        t.synonyms.some(syn => {
          // Exact synonym match
          if (syn.normalized === skillNorm.normalized) return true;
          // Token overlap on synonyms
          if (syn.tokens.length > 0 && skillNorm.tokens.length > 0) {
            if (tokenOverlap(skillNorm.tokens, syn.tokens) >= 0.7) return true;
          }
          // Single-token synonym contained in skill tokens (e.g. "CRM" in "Gestion CRM")
          if (syn.tokens.length === 1 && skillNorm.tokens.includes(syn.tokens[0])) return true;
          // Single-token skill contained in synonym tokens
          if (skillNorm.tokens.length === 1 && syn.tokens.includes(skillNorm.tokens[0])) return true;
          return false;
        })
      );
    }

    if (match) {
      skill.taxonomy_id = match.entry.ID;
    }
  }

  // ── B2: LLM semantic fallback (single call) ────────────────────────────────
  const unmappedSkills = allSkills.filter(s => s.name && !s.taxonomy_id);

  if (unmappedSkills.length > 0) {
    const prompt = `Tu es un expert en recrutement commercial B2B. Voici des compétences extraites d'une offre d'emploi qui n'ont pas pu être associées automatiquement à notre taxonomie interne.

Compétences à mapper :
${JSON.stringify(unmappedSkills.map(s => s.name))}

Taxonomie complète (ID + nom + synonymes) :
${JSON.stringify(TAXONOMIE_COMPETENCES.map(c => ({ ID: c.ID, Compétence: c.Compétence, Proches: c["Compétences proches"] })))}

RÈGLES :
- Pour chaque compétence, trouve l'ID taxonomie qui correspond le MIEUX sémantiquement.
- Si aucune correspondance n'est pertinente (la compétence n'a pas d'équivalent dans la taxonomie), renvoie "NONE".
- Ne force JAMAIS un mapping douteux. "NONE" est une réponse valide.

Renvoie UNIQUEMENT un JSON valide, sans texte avant ou après :
{"mappings": [{"skill_name": "...", "taxonomy_id": "C0XX ou NONE"}]}`;

    try {
      const response = await anthropic.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 1500,
        temperature: 0,
        system: "Tu es un assistant de mapping de compétences. Réponds UNIQUEMENT avec un JSON valide.",
        messages: [{ role: "user", content: prompt }]
      });

      const textResponse = response.content[0].text;
      const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.mappings) {
          for (const mapping of parsed.mappings) {
            const skill = unmappedSkills.find(s => s.name === mapping.skill_name);
            if (skill && mapping.taxonomy_id && mapping.taxonomy_id !== "NONE") {
              // Verify the taxonomy_id actually exists
              const exists = TAXONOMIE_COMPETENCES.find(c => c.ID === mapping.taxonomy_id);
              if (exists) {
                skill.taxonomy_id = mapping.taxonomy_id;
              }
            }
          }
        }
      }
    } catch (err) {
      console.error("Error in LLM taxonomy mapping:", err);
    }
  }

  // ── Fallback: mark remaining skills as unmapped ─────────────────────────────
  const finalUnmapped = [];
  for (const skill of allSkills) {
    if (!skill.taxonomy_id) {
      skill.taxonomy_id = 'unmapped';
      finalUnmapped.push(skill.name);
    }
  }

  // ── Log unmapped skills to Supabase (non-blocking) ─────────────────────────
  if (finalUnmapped.length > 0) {
    logUnmappedSkills(finalUnmapped, data.title).catch(console.error);
  }

  return data;
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
    const name = s.name;
    const def = s.taxonomyData?.Définition || "Aucune définition disponible";
    return `- ${name} : ${def}`;
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

