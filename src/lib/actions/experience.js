"use server";

import { createClient } from "@/lib/supabase/server";
import anthropic from "@/lib/anthropic";
import { computeAiCost } from "@/lib/constants/aiPricing";

const GENERATION_MODEL = "claude-sonnet-4-6";

// ─── Prompt de génération (offre + contexte entreprise → expérience) ──────────
// Exporté pour être réutilisé à l'identique par le script de démonstration hors
// repo (évite toute divergence de prompt entre la démo et la production).
export function buildExperienceGenerationPrompt({ title, description, criteria, companyContext }) {
  const hard = (criteria.hard_skills || []).map((s) => `- ${s.name}${s.priority ? ` (${s.priority})` : ""}`).join("\n");
  const soft = (criteria.soft_skills || []).map((s) => `- ${s.name}`).join("\n");
  const ctx = companyContext || {};
  const companyBlock = [
    ctx.description && `Description : ${ctx.description}`,
    ctx.industry && `Secteur : ${ctx.industry}`,
    ctx.target_market && `Marché cible : ${ctx.target_market}`,
    ctx.domain && `Modèle : ${ctx.domain}`,
  ].filter(Boolean).join("\n") || "Aucun contexte entreprise fourni.";

  return `Tu es un concepteur d'évaluations de recrutement par compétences. À partir d'une offre et du contexte de l'entreprise, tu génères une EXPÉRIENCE DE PRÉSÉLECTION courte (5 à 20 minutes) qui fait la PREUVE des compétences du candidat — pas un questionnaire théorique.

POSTE : ${title || "Non précisé"}
DESCRIPTION :
${(description || "").slice(0, 1200) || "Non fournie"}

COMPÉTENCES TECHNIQUES :
${hard || "Non précisées"}

SAVOIR-ÊTRE :
${soft || "Non précisés"}

CONTEXTE ENTREPRISE :
${companyBlock}

CONSTRUIS une expérience composée d'étapes ordonnées. Types d'étape ("kind") :
- "qualifying" : filtre binaire éliminatoire (langue, expérience min, diplôme, localisation). Réponse attendue oui/non. PAS de critères BARS.
- "question" : question ciblée sur une compétence, réponse déclarative courte.
- "task" : tâche courte et réaliste inspirée du poste (rédiger un email client, répondre à une situation, produire un court document/analyse). C'est le cœur de la preuve.
- "classic_qcm" : QCM quand une connaissance se teste mieux ainsi et qu'aucune tâche n'est pertinente.

RÈGLES :
1. 3 à 6 étapes au total, durée cumulée 5–20 min. Mets les "qualifying" en premier.
2. Inclus AU MOINS une "task" réaliste ancrée dans le métier et le contexte entreprise.
3. Pour CHAQUE étape non-"qualifying", propose "response_format" par défaut :
   - "text" pour l'écrit (emails, analyses, réponses techniques),
   - "video" pour l'oral/le relationnel (posture commerciale, communication),
   - "qcm" pour un QCM,
   - "code" uniquement si le poste est technique et qu'une tâche de code est pertinente.
   Le recruteur pourra changer ce défaut ; propose le plus pertinent.
4. Pour CHAQUE étape non-"qualifying", génère 2 à 3 critères BARS : nom court (2–4 mots) + grille à 3 niveaux (1 Insuffisant, 3 Attendu, 5 Excellent) avec des descriptions COMPORTEMENTALES et OBSERVABLES.
5. Propose "ai_assistant_allowed" = true quand l'usage d'un assistant IA reflète le travail réel sur cette étape (tâches de production), false pour les questions de connaissance pure ou les QCM.
6. "sandbox_kind" : "email" | "client_reply" | "document" | "code" pour les tâches, sinon "none".

Réponds UNIQUEMENT avec un JSON valide :
{
  "estimated_minutes": 12,
  "steps": [
    {
      "kind": "qualifying|question|task|classic_qcm",
      "title": "Titre court",
      "prompt": "Énoncé lu tel quel au candidat (vouvoiement)",
      "response_format": "text|video|qcm|choice",
      "sandbox_kind": "none|email|client_reply|document|code",
      "ai_assistant_allowed": true,
      "targets_skills": ["Compétence ciblée"],
      "config": {},
      "criteria": [
        { "name": "Nom du critère", "bars_levels": [
          { "level": 1, "label": "Insuffisant", "description": "..." },
          { "level": 3, "label": "Attendu", "description": "..." },
          { "level": 5, "label": "Excellent", "description": "..." }
        ] }
      ]
    }
  ]
}
Pour "qualifying", mets "criteria": [] et "config": { "expected_answer": "yes" }.
Pour "classic_qcm", mets dans "config": { "options": ["A","B","C","D"], "correct_index": 0 }.`;
}

// ─── Génération pure (appelable hors DB pour tests/démo) ──────────────────────
export async function generateExperienceContent({ title, description, criteria, companyContext }) {
  const prompt = buildExperienceGenerationPrompt({ title, description, criteria: criteria || {}, companyContext });

  let lastErr = "";
  for (let attempt = 1; attempt <= 2; attempt++) {
    const response = await anthropic.messages.create({
      model: GENERATION_MODEL,
      max_tokens: 4000,
      temperature: 0.4,
      system: "Tu es un concepteur d'évaluations par compétences. Réponds UNIQUEMENT avec un JSON valide.",
      messages: [{ role: "user", content: prompt }],
    });
    const text = response.content[0].text;
    const usage = computeAiCost(GENERATION_MODEL, response.usage);
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        return { success: true, experience: parsed, usage };
      } catch (e) {
        lastErr = e.message;
      }
    } else {
      lastErr = "aucun JSON dans la réponse";
    }
  }
  return { success: false, error: `Génération invalide (${lastErr}).` };
}

// ─── Génère et persiste une expérience (draft → pending_review) ───────────────
export async function generateExperience(jobId) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Non authentifié" };

    const { data: job } = await supabase
      .from("jobs")
      .select("id, user_id, title, description, extracted_criteria")
      .eq("id", jobId)
      .eq("user_id", user.id)
      .single();
    if (!job) return { success: false, error: "Offre introuvable ou accès refusé" };

    const { data: profile } = await supabase
      .from("users")
      .select("company_ai_context")
      .eq("id", user.id)
      .single();

    const gen = await generateExperienceContent({
      title: job.title,
      description: job.description,
      criteria: job.extracted_criteria || {},
      companyContext: profile?.company_ai_context || {},
    });
    if (!gen.success) return gen;

    const { steps = [], estimated_minutes = null } = gen.experience;

    // Crée l'expérience (registre du snapshot + coût de génération)
    const { data: experience, error: expErr } = await supabase
      .from("experiences")
      .insert({
        job_id: job.id,
        status: "pending_review",
        estimated_minutes,
        generated_from: { criteria: job.extracted_criteria || {}, company_ai_context: profile?.company_ai_context || {} },
        generation_usage: gen.usage,
      })
      .select()
      .single();
    if (expErr) throw expErr;

    // Insère les steps (le format de réponse est bien une colonne par step)
    const rows = steps.map((s, i) => ({
      experience_id: experience.id,
      order_index: i,
      kind: s.kind,
      response_format: s.response_format || (s.kind === "qualifying" ? "choice" : "text"),
      title: s.title || null,
      prompt: s.prompt || null,
      sandbox_kind: s.sandbox_kind || "none",
      ai_assistant_allowed: !!s.ai_assistant_allowed,
      criteria: s.criteria || [],
      config: { ...(s.config || {}), targets_skills: s.targets_skills || [] },
    }));
    if (rows.length > 0) {
      const { error: stepsErr } = await supabase.from("experience_steps").insert(rows);
      if (stepsErr) throw stepsErr;
    }

    return { success: true, experienceId: experience.id, usage: gen.usage };
  } catch (err) {
    console.error("generateExperience error:", err);
    return { success: false, error: err.message };
  }
}

// ─── Lecture d'une expérience + ses steps (recruteur propriétaire) ────────────
export async function getExperienceForJob(jobId) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Non authentifié" };

    // Ownership vérifiée via le job
    const { data: job } = await supabase.from("jobs").select("id").eq("id", jobId).eq("user_id", user.id).single();
    if (!job) return { success: false, error: "Accès refusé" };

    const { data: experience } = await supabase
      .from("experiences")
      .select("*")
      .eq("job_id", jobId)
      .neq("status", "archived")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (!experience) return { success: true, experience: null, steps: [] };

    const { data: steps } = await supabase
      .from("experience_steps")
      .select("*")
      .eq("experience_id", experience.id)
      .order("order_index");

    return { success: true, experience, steps: steps || [] };
  } catch (err) {
    console.error("getExperienceForJob error:", err);
    return { success: false, error: err.message };
  }
}

// ─── Vérifie que l'appelant possède le step (via experience → job) ────────────
async function assertStepOwnership(supabase, userId, stepId) {
  const { data } = await supabase
    .from("experience_steps")
    .select("id, experience_id, experiences!inner(id, job_id, jobs!inner(user_id))")
    .eq("id", stepId)
    .single();
  const ownerId = data?.experiences?.jobs?.user_id;
  return ownerId && ownerId === userId ? data : null;
}

// ─── Édition d'un step à la relecture ─────────────────────────────────────────
export async function updateStep(stepId, updates) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Non authentifié" };
    if (!(await assertStepOwnership(supabase, user.id, stepId))) return { success: false, error: "Accès refusé" };

    // Champs éditables uniquement (dont response_format, choisi par step)
    const allowed = ["title", "prompt", "response_format", "sandbox_kind", "ai_assistant_allowed", "criteria", "config", "order_index"];
    const safe = {};
    for (const k of allowed) if (updates[k] !== undefined) safe[k] = updates[k];
    safe.updated_at = new Date().toISOString();

    const { error } = await supabase.from("experience_steps").update(safe).eq("id", stepId);
    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error("updateStep error:", err);
    return { success: false, error: err.message };
  }
}

// ─── Publication (gate de validation : rien n'est visible candidat avant ça) ──
export async function publishExperience(experienceId) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Non authentifié" };

    const { data: exp } = await supabase
      .from("experiences")
      .select("id, jobs!inner(user_id)")
      .eq("id", experienceId)
      .single();
    if (!exp || exp.jobs?.user_id !== user.id) return { success: false, error: "Accès refusé" };

    const { error } = await supabase
      .from("experiences")
      .update({ status: "published", published_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", experienceId);
    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error("publishExperience error:", err);
    return { success: false, error: err.message };
  }
}
