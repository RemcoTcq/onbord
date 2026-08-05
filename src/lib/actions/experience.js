"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import anthropic from "@/lib/anthropic";
import { computeAiCost } from "@/lib/constants/aiPricing";
import { scoreRun } from "@/lib/runScoring";
import { chargeCredits } from "@/lib/utils/limits";
import { CREDIT_COSTS } from "@/lib/constants/plans";

const GENERATION_MODEL = "claude-sonnet-4-6";

// ─── Prompt de génération (offre + contexte entreprise → expérience) ──────────
// Interne : dans un module "use server", seuls des exports async sont permis.
// La démo hors repo garde une copie identique de ce prompt.
function buildExperienceGenerationPrompt({ title, description, criteria, companyContext }) {
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
- "question" : question ciblée sur une compétence (connaissance ou jugement appliqué), réponse courte — JAMAIS un récit d'expérience passée.
- "task" : tâche courte et réaliste inspirée du poste (rédiger un email client, répondre à une situation, produire un court document/analyse). C'est le cœur de la preuve.
- "classic_qcm" : QCM quand une connaissance se teste mieux ainsi et qu'aucune tâche n'est pertinente.

RÈGLES :
1. 3 à 6 étapes au total, durée cumulée 5–20 min. Mets les "qualifying" en premier.
2. Inclus AU MOINS DEUX "task" réalistes ancrées dans le métier et le contexte entreprise. C'est le cœur de la preuve.
3. INTERDICTION des questions rétrospectives auto-déclaratives ("décrivez une situation où vous avez…", "racontez une expérience passée…", "parlez-moi d'une fois où…"). Elles recréent le biais du CV déclaratif que ce produit doit éviter : on mesure ce que le candidat FAIT maintenant, pas ce qu'il dit avoir fait.
4. Pour un signal oral/relationnel, utilise une MISE EN SITUATION JOUÉE EN DIRECT : place le candidat dans une scène concrète et fais-le RÉPONDRE DANS L'INSTANT, comme s'il y était (ex. : "Un prospect vous dit en visio : '…'. Répondez-lui maintenant, directement."). Jamais un récit après coup.
5. Pour CHAQUE étape non-"qualifying", propose "response_format" par défaut :
   - "text" pour l'écrit (emails, analyses, réponses techniques),
   - "video" pour l'oral/le relationnel — TOUJOURS sous forme de mise en situation jouée en direct (règle 4),
   - "qcm" pour un QCM,
   - "code" uniquement si le poste est technique et qu'une tâche de code est pertinente.
   Le recruteur pourra changer ce défaut ; propose le plus pertinent.
6. Pour CHAQUE étape non-"qualifying", génère 2 à 3 critères BARS : nom court (2–4 mots) + grille à 3 niveaux (1 Insuffisant, 3 Attendu, 5 Excellent) avec des descriptions COMPORTEMENTALES et OBSERVABLES.
7. Propose "ai_assistant_allowed" = true sur AU MOINS DEUX étapes de type "task" (le recruteur pourra désactiver ; on veut plusieurs points de mesure de l'usage de l'IA). Mets false pour les questions de connaissance pure et les QCM.
8. "sandbox_kind" : "email" | "client_reply" | "document" | "code" pour les tâches, sinon "none".

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

    // Versionnage : une régénération crée TOUJOURS une nouvelle version. On ne
    // réécrit jamais une expérience existante — surtout pas une sur laquelle des
    // runs candidat existent (elle reste intacte, publiée ou non).
    const { data: latest } = await supabase
      .from("experiences").select("version").eq("job_id", job.id)
      .order("version", { ascending: false }).limit(1).maybeSingle();
    const nextVersion = (latest?.version ?? 0) + 1;

    // Nettoyage : on archive les brouillons précédents SANS run (superseded par
    // celui-ci). Les expériences avec des runs — ou publiées — ne sont pas touchées.
    const { data: priorDrafts } = await supabase
      .from("experiences").select("id").eq("job_id", job.id).in("status", ["draft", "pending_review"]);
    for (const d of priorDrafts || []) {
      const { count } = await supabase
        .from("candidate_runs").select("id", { count: "exact", head: true }).eq("experience_id", d.id);
      if (!count) {
        await supabase.from("experiences").update({ status: "archived", updated_at: new Date().toISOString() }).eq("id", d.id);
      }
    }

    // Crée la nouvelle version (registre du snapshot + coût de génération)
    const { data: experience, error: expErr } = await supabase
      .from("experiences")
      .insert({
        job_id: job.id,
        status: "pending_review",
        version: nextVersion,
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
      .select("id, job_id, jobs!inner(user_id)")
      .eq("id", experienceId)
      .single();
    if (!exp || exp.jobs?.user_id !== user.id) return { success: false, error: "Accès refusé" };

    // Setup facturé UNE fois par offre : vrai seulement si aucune autre version
    // de cette offre n'a jamais été publiée (regénérer/republier ne re-facture pas).
    const { count: priorPublished } = await supabase
      .from("experiences")
      .select("id", { count: "exact", head: true })
      .eq("job_id", exp.job_id)
      .not("published_at", "is", null)
      .neq("id", experienceId);
    const isFirstPublish = (priorPublished || 0) === 0;

    const { error } = await supabase
      .from("experiences")
      .update({ status: "published", published_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", experienceId);
    if (error) throw error;

    if (isFirstPublish) {
      // Non-bloquant : ne fait jamais échouer la publication.
      await chargeCredits(user.id, CREDIT_COSTS.experience_setup);
    }

    // Une seule version publiée à la fois pour une offre : on archive les autres
    // versions publiées. Leurs runs candidat existants restent intacts (FK
    // on delete restrict) — on ne fait que changer le statut, jamais supprimer.
    await supabase
      .from("experiences")
      .update({ status: "archived", updated_at: new Date().toISOString() })
      .eq("job_id", exp.job_id)
      .eq("status", "published")
      .neq("id", experienceId);

    return { success: true };
  } catch (err) {
    console.error("publishExperience error:", err);
    return { success: false, error: err.message };
  }
}

// ─── Ajout d'un step vide (relecture) ─────────────────────────────────────────
export async function addStep(experienceId) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Non authentifié" };

    const { data: exp } = await supabase
      .from("experiences").select("id, jobs!inner(user_id)").eq("id", experienceId).single();
    if (!exp || exp.jobs?.user_id !== user.id) return { success: false, error: "Accès refusé" };

    const { data: last } = await supabase
      .from("experience_steps").select("order_index")
      .eq("experience_id", experienceId).order("order_index", { ascending: false }).limit(1).maybeSingle();
    const nextIndex = (last?.order_index ?? -1) + 1;

    const { data: step, error } = await supabase.from("experience_steps").insert({
      experience_id: experienceId, order_index: nextIndex,
      kind: "question", response_format: "text", title: "Nouvelle étape",
      prompt: "", sandbox_kind: "none", ai_assistant_allowed: false, criteria: [], config: {},
    }).select().single();
    if (error) throw error;
    return { success: true, step };
  } catch (err) {
    console.error("addStep error:", err);
    return { success: false, error: err.message };
  }
}

// ─── Suppression d'un step (relecture) ────────────────────────────────────────
export async function deleteStep(stepId) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Non authentifié" };
    if (!(await assertStepOwnership(supabase, user.id, stepId))) return { success: false, error: "Accès refusé" };

    const { error } = await supabase.from("experience_steps").delete().eq("id", stepId);
    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error("deleteStep error:", err);
    return { success: false, error: err.message };
  }
}

// ─── Rapport de preuves d'un run (recruteur) ─────────────────────────────────
// Scoring paresseux : si le run est soumis mais pas encore noté, on le note à la
// première ouverture (évite de faire attendre le candidat à la soumission).
export async function getRunReport(runId) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Non authentifié" };

    // Les tables du run sont RLS deny-all : lecture via service_role, ownership
    // vérifiée en comparant jobs.user_id à l'utilisateur authentifié.
    const admin = createAdminClient();
    const { data: run } = await admin
      .from("candidate_runs")
      .select("id, status, submitted_at, scored_at, candidate_id, experience_id, experiences!inner(job_id, jobs!inner(user_id, title)), candidates!inner(first_name, last_name, email)")
      .eq("id", runId).single();
    if (!run || run.experiences?.jobs?.user_id !== user.id) return { success: false, error: "Accès refusé" };

    if (run.status === "submitted") {
      try { await scoreRun(runId); } catch (e) { console.error("lazy scoreRun failed:", e); }
    }

    const [{ data: scores }, { data: steps }, { data: responses }] = await Promise.all([
      admin.from("run_scores").select("*").eq("run_id", runId).maybeSingle(),
      admin.from("experience_steps").select("id, order_index, kind, title, response_format").eq("experience_id", run.experience_id).order("order_index"),
      admin.from("run_step_responses").select("step_id, response_format, text_answer, transcript, meta, status, video_url").eq("run_id", runId),
    ]);

    return {
      success: true,
      candidate: { name: `${run.candidates.first_name || ""} ${run.candidates.last_name || ""}`.trim(), email: run.candidates.email },
      jobTitle: run.experiences?.jobs?.title,
      run: { id: run.id, status: run.status },
      scores: scores || null,
      steps: steps || [],
      responses: responses || [],
    };
  } catch (err) {
    console.error("getRunReport error:", err);
    return { success: false, error: err.message };
  }
}

// ─── Déplacement d'un step (échange l'order_index avec le voisin) ─────────────
export async function moveStep(stepId, direction) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Non authentifié" };
    if (!(await assertStepOwnership(supabase, user.id, stepId))) return { success: false, error: "Accès refusé" };

    const { data: current } = await supabase
      .from("experience_steps").select("id, order_index, experience_id").eq("id", stepId).single();

    let neighborQuery = supabase
      .from("experience_steps").select("id, order_index").eq("experience_id", current.experience_id);
    neighborQuery = direction === "up"
      ? neighborQuery.lt("order_index", current.order_index).order("order_index", { ascending: false })
      : neighborQuery.gt("order_index", current.order_index).order("order_index", { ascending: true });
    const { data: neighbor } = await neighborQuery.limit(1).maybeSingle();
    if (!neighbor) return { success: true }; // déjà en bout de liste

    await supabase.from("experience_steps").update({ order_index: neighbor.order_index }).eq("id", current.id);
    await supabase.from("experience_steps").update({ order_index: current.order_index }).eq("id", neighbor.id);
    return { success: true };
  } catch (err) {
    console.error("moveStep error:", err);
    return { success: false, error: err.message };
  }
}
