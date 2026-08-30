"use server";

import anthropic from "../anthropic";
import { buildJobExtractionPrompt, SYSTEME_EXTRACTION } from "@/lib/jobExtractionPrompt";
import { DOMAIN_HARD_SKILLS, SOFT_SKILLS_LIST } from "../constants/skills";
import { createClient } from "@/lib/supabase/server";
import { factureCreationOffre, chargeCredits } from "@/lib/utils/limits";
import { CREDIT_COSTS } from "@/lib/constants/plans";

/**
 * Analyzes a raw job description using Claude 3.5 Sonnet to extract structured criteria.
 *
 * DEUX langues en sortie, et elles ne se déduisent pas l'une de l'autre :
 * le titre et le résumé de l'offre suivent la langue DU POSTE, tout le reste du
 * texte libre suit la langue d'interface du recruteur (cf.
 * consigneLangueExtraction). Sans le second paramètre, un poste anglais analysé
 * par un recruteur francophone ressortait résumé en français.
 *
 * @param {string} rawDescription - The raw text of the job description pasted by the user.
 * @param {string} [contentLocale] - Langue du poste (jobs.experience_locale). Défaut : 'fr',
 *   qui est aussi le défaut de la colonne — les deux ne doivent jamais diverger.
 * @returns {Promise<Object>} The extracted structured data.
 */
export async function analyzeJobDescription(rawDescription, contentLocale = "fr") {
  if (!rawDescription || rawDescription.trim().length < 50) {
    throw new Error("La description est trop courte pour être analysée de manière fiable.");
  }

  // Fetch active tests from the library to pass to the AI
  const supabase = await createClient();

  // Langue d'interface du recruteur : elle commande les étiquettes de
  // classement (catégorie, compétences, critères), qu'il est seul à lire. Le
  // titre et le résumé, eux, suivent la langue du poste reçue en paramètre.
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  // ── Facturation : 6 crédits, ici et une seule fois ────────────────────────
  // C'est le forfait « création d'offre » en entier. L'extraction qui suit, le
  // choix des compétences, la génération de la simulation, ses régénérations et
  // sa publication ne coûtent plus rien : tout est déjà payé par ce débit.
  //
  // Il tombe AVANT l'appel au modèle, et il BLOQUE. Facturé plus loin — à la
  // publication, par exemple — un compte à sec aurait quand même consommé
  // l'extraction, puis la génération, puis les régénérations, gratuitement.
  const facture = await factureCreationOffre(user.id);
  if (!facture.success) throw new Error(facture.error || "Crédits insuffisants.");

  let uiLocale = "fr";
  {
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

  const prompt = buildJobExtractionPrompt({
    rawDescription,
    testCatalogStr,
    uiLocale,
    contentLocale,
  });

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
      system: SYSTEME_EXTRACTION,
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
    let factureFaite = false;
    if (description && description.trim().length >= 50) {
      // 'fr' explicite : cet écran n'offre pas de choix de langue, le poste est
      // donc créé avec le défaut de la colonne experience_locale. Analyser dans
      // une autre langue que celle qui sera stockée n'aurait aucun sens.
      // analyzeJobDescription porte déjà le débit des 6 crédits. Si elle échoue
      // APRÈS lui (modèle indisponible, JSON illisible), l'offre se crée quand
      // même et le forfait reste consommé : l'IA a bien tourné. Seul un refus
      // de facturation doit remonter au recruteur, d'où le test sur le message.
      try {
        criteria = await analyzeJobDescription(description, "fr");
        factureFaite = true;
      } catch (e) {
        if ((e.message || "").startsWith("Crédits insuffisants")) return { success: false, error: e.message };
        factureFaite = true;
        console.error("analyse offre (non bloquant):", e.message);
      }
    }

    // Offre créée sans extraction (description trop courte, ou absente) : le
    // forfait reste dû. La simulation qui suivra est le gros de ce qu'il paie.
    if (!factureFaite) {
      const facture = await chargeCredits(user.id, CREDIT_COSTS.job_creation);
      if (!facture.success) return { success: false, error: facture.error || "Crédits insuffisants." };
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

