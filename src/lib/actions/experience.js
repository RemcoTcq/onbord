"use server";

import { createClient } from "@/lib/supabase/server";
import anthropic from "@/lib/anthropic";
import { computeAiCost } from "@/lib/constants/aiPricing";
import { chargeCredits } from "@/lib/utils/limits";
import { CREDIT_COSTS } from "@/lib/constants/plans";

const GENERATION_MODEL = "claude-sonnet-4-6";

// ─── Prompt de génération (offre + contexte entreprise → expérience) ──────────
// Interne : dans un module "use server", seuls des exports async sont permis.
// La démo hors repo garde une copie identique de ce prompt.
function buildExperienceGenerationPrompt({ title, description, criteria, companyContext, additionalContext }) {
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
${additionalContext ? `\nPRÉCISIONS DU RECRUTEUR (issues de l'échange — À PRENDRE EN COMPTE EN PRIORITÉ) :\n${additionalContext}\n` : ""}
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
   IMPORTANT pour les niveaux BARS :
   - Chaque description DOIT inclure un exemple concret de ce que le candidat fait ou écrit (un mini-verbatim fictif illustratif entre guillemets).
   - Exemple pour "Clarté de communication" niveau 3 : "Le candidat structure sa réponse avec des paragraphes logiques, ex. : « Je propose de procéder en 3 étapes : d'abord…, ensuite…, enfin… »"
   - Ne JAMAIS écrire de descriptions vagues comme "bonne qualité" ou "réponse adéquate".
7. Propose "ai_assistant_allowed" = true sur AU MOINS DEUX étapes de type "task" (le recruteur pourra désactiver ; on veut plusieurs points de mesure de l'usage de l'IA). Mets false pour les questions de connaissance pure et les QCM.
8. "sandbox_kind" : "email" | "client_reply" | "document" | "code" | "crm" pour les tâches, sinon "none".
   Quand sandbox_kind != "none", enrichis "config" avec le contexte de la sandbox :
   - Pour "email" : config.to, config.subject, config.context (ex: { "to": "client@example.com", "subject": "Suivi de votre demande", "context": "Email professionnel à un client mécontent" })
   - Pour "client_reply" : config.client_message (le message client auquel le candidat doit répondre, rédigé de manière réaliste)
   - Pour "document" : config.document_context (description du document à produire)
   - Pour "crm" : config.crm_brief — UNE SEULE PHRASE décrivant la situation (qui est le prospect/client, ce qu'il demande, par quels canaux l'information arrive). Le scénario détaillé sera produit dans un second temps ; ne génère PAS les sources ni les champs ici.
   QUAND CHOISIR "crm" : le poste consiste, au moins en partie, à RECEVOIR de l'information non structurée d'un tiers (email, appel, message) et à la CONSIGNER correctement dans un outil — vente, SDR, business developer, support/SAV, ADV, ops, office management, assistanat. C'est la seule sandbox qui teste l'EXTRACTION et l'ORGANISATION de l'information plutôt que la communication.
   NE PAS choisir "crm" pour un poste purement technique, créatif ou managérial. AU PLUS UN step "crm" par expérience (c'est le step le plus long à remplir), et son "response_format" doit être "text".
9. DIVERSITÉ DES KINDS : ne génère JAMAIS plus de 2 étapes du même kind "question" d'affilée. Varie entre task, question et classic_qcm.

RÈGLES QCM ANTI-BIAIS :
- TOUTES les options doivent avoir une longueur SIMILAIRE (±20% de caractères). Ne mets JAMAIS une option correcte significativement plus longue ou plus détaillée que les distracteurs.
- Chaque distracteur doit être PLAUSIBLE pour quelqu'un qui connaît partiellement le sujet. Pas de réponses absurdes.
- Formulation HOMOGÈNE : si la bonne réponse commence par "Le…", les distracteurs aussi.
- 4 options par QCM (ni plus, ni moins).

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
Pour "classic_qcm", mets dans "config": { "options": ["A","B","C","D"], "correct_index": 0 } — SANS critères BARS (criteria: []).`;
}

// ─── Prompt de la 2e passe : scénario complet d'un step "crm" ─────────────────
// Passe séparée à dessein : un config.crm complet (deux sources rédigées) pèse
// 600-900 tokens et refait dérailler la passe principale, qui a déjà été
// tronquée par le passé (d'où max_tokens 8000). On isole le risque.
function buildCrmScenarioPrompt({ title, description, companyContext, step }) {
  const ctx = companyContext || {};
  const companyBlock = [
    ctx.description && `Description : ${ctx.description}`,
    ctx.industry && `Secteur : ${ctx.industry}`,
    ctx.target_market && `Marché cible : ${ctx.target_market}`,
  ].filter(Boolean).join("\n") || "Aucun contexte entreprise fourni.";

  return `Tu conçois une MISE EN SITUATION "fiche CRM" pour une évaluation de recrutement.

Le candidat reçoit un brief réaliste et EN DÉSORDRE (comme dans la vraie vie), puis doit structurer cette information dans une fiche type CRM. On mesure sa capacité à EXTRAIRE et ORGANISER l'information — pas sa communication.

POSTE : ${title || "Non précisé"}
DESCRIPTION : ${(description || "").slice(0, 800) || "Non fournie"}
CONTEXTE ENTREPRISE :
${companyBlock}

ÉNONCÉ DE L'ÉTAPE (déjà écrit, lu au candidat) :
${step.prompt || "(non fourni)"}
SITUATION À METTRE EN SCÈNE : ${step.config?.crm_brief || "À toi de la choisir, cohérente avec le poste."}

RÈGLES DE CONCEPTION :
1. SOURCES : exactement 2 ou 3, de FORMATS DIFFÉRENTS (email, retranscription d'appel, message entrant). Elles doivent être RÉALISTES et DÉSORDONNÉES : l'information utile est noyée dans du bavardage, des digressions, des politesses. Pas de liste à puces qui donne les réponses. 120 à 250 mots par source.
2. CHAMPS : 5 à 7. Chaque champ a une "nature" :
   - "factual" : la réponse est une valeur COURTE (5 mots maximum) recopiable TELLE QUELLE depuis une source — nom du contact, société, effectif, montant, date, intitulé de poste, nom d'un concurrent. Fournis "expected" : { "value": …, "accept": [variantes acceptables] }, et "tolerance" pour les nombres si pertinent. L'"expected.value" doit apparaître MOT POUR MOT dans une source : il est corrigé par comparaison automatique, sans IA.
   - "judgment" : tout le reste — ce qui suppose de reformuler, résumer, synthétiser ou arbitrer (besoin exprimé, enjeu, priorité, étape du pipeline, prochaine action). PAS de "expected".
   RÈGLE DE TRANCHAGE : si deux bons candidats peuvent formuler la réponse différemment, le champ est "judgment", jamais "factual".
   Il faut AU MOINS 2 champs "factual" et AU MOINS 2 champs "judgment".
3. PIÈGE OBLIGATOIRE — exactement UN : une information CONTRADICTOIRE entre deux sources (l'email annonce un chiffre, l'appel plus récent en annonce un autre). Elle doit porter sur un champ "factual", et l'"expected" de ce champ doit être la valeur RÉSOLUE (celle qui fait foi). La règle de résolution doit être déductible des sources (une date, une mention "finalement", "après arbitrage", "je corrige"), jamais arbitraire.
4. Les valeurs attendues doivent être TEXTUELLEMENT PRÉSENTES dans les sources. N'invente jamais un attendu que le candidat ne pourrait pas trouver.
5. Pour un champ "select", les options doivent être un vocabulaire métier plausible (4 à 5 options), et l'attendu doit être EXACTEMENT l'une des options.
6. Le type "date" est réservé aux échéances DATÉES ; son "expected" doit alors être au format jj/mm/aaaa et cette date doit figurer dans une source. Si la source ne donne qu'une échéance vague ("fin juin", "avant l'été"), utilise le type "text".
7. ÉNONCÉ : réécris l'énoncé de l'étape ("step_prompt"). Il doit être COURT (2 à 3 phrases), poser la scène et demander de compléter la fiche à partir des documents affichés. Il ne doit SURTOUT PAS contenir les informations à extraire (ni le nom, ni les chiffres, ni l'échéance) : tout doit se trouver uniquement dans les sources, sinon l'exercice n'a plus d'objet. Il ne doit pas non plus mentionner qu'il y a une contradiction.
8. Aucun emoji. Vouvoiement. Français professionnel.

Réponds UNIQUEMENT avec un JSON valide :
{
  "step_prompt": "Énoncé court lu au candidat, sans aucune information à extraire.",
  "record_title": "Titre de la fiche, ex: Fiche prospect — nouvelle opportunité",
  "sources": [
    { "id": "s1", "type": "email", "from": "prenom.nom@societe.fr", "subject": "…", "received_at": "Lundi 14:32", "body": "…" },
    { "id": "s2", "type": "call_transcript", "title": "Appel — mardi 9h10", "body": "…" }
  ],
  "fields": [
    { "key": "contact_name", "label": "Contact", "type": "text", "nature": "factual", "expected": { "value": "…", "accept": ["…"] } },
    { "key": "budget", "label": "Budget annoncé", "type": "number", "unit": "€", "nature": "factual", "expected": { "value": 30000, "tolerance": 0 } },
    { "key": "priority", "label": "Priorité", "type": "select", "options": ["Basse","Moyenne","Haute"], "nature": "judgment" },
    { "key": "next_action", "label": "Prochaine action", "type": "textarea", "nature": "judgment" }
  ],
  "notes_field": true,
  "traps": [
    { "id": "…", "kind": "contradiction", "fields": ["budget"], "sources": ["s1","s2"],
      "description": "Ce que dit chaque source et en quoi elles se contredisent.",
      "resolution": "Quelle valeur fait foi et pourquoi.",
      "expected_signal": "Ce que fait un bon candidat (retient la bonne valeur ET/OU signale l'écart dans ses notes)." }
  ]
}
Types de champ autorisés : "text", "number", "select", "textarea", "date".`;
}

// Critère BARS ajouté d'office sur un step CRM : la justesse du champ piégé est
// corrigée automatiquement, mais VOIR la contradiction est un comportement
// distinct — un candidat peut avoir juste par chance. Les deux signaux comptent.
const CRM_CROSS_CHECK_CRITERION = {
  name: "Croisement des sources",
  bars_levels: [
    { level: 1, label: "Insuffisant", description: "Recopie une valeur d'une seule source sans voir qu'une autre la contredit, et ne mentionne aucun écart, ex. : notes vides ou « RAS, fiche complétée »." },
    { level: 3, label: "Attendu", description: "Retient la bonne valeur (celle qui fait foi) : il a lu les deux sources et tranché, même sans l'expliciter, ex. : le budget saisi correspond à l'information la plus récente." },
    { level: 5, label: "Excellent", description: "Retient la bonne valeur ET signale l'écart en indiquant laquelle fait foi, ex. : « Attention : 45 k€ annoncés par mail le 12, ramenés à 30 k€ lors de l'appel du 14 — je retiens 30 k€ »." },
  ],
};

// Génère le scénario complet d'un step "crm" (2e passe).
async function generateCrmScenario({ title, description, companyContext, step }) {
  const prompt = buildCrmScenarioPrompt({ title, description, companyContext, step });
  let lastErr = "";
  for (let attempt = 1; attempt <= 2; attempt++) {
    const response = await anthropic.messages.create({
      model: GENERATION_MODEL,
      max_tokens: 4000,
      temperature: 0.5,
      system: "Tu conçois des mises en situation de recrutement. Réponds UNIQUEMENT avec un JSON valide, sans texte avant ni après, sans bloc de code Markdown.",
      messages: [{ role: "user", content: prompt }],
    });
    const usage = computeAiCost(GENERATION_MODEL, response.usage);
    if (response.stop_reason === "max_tokens") { lastErr = "réponse tronquée"; continue; }
    const match = (response.content[0]?.text || "").match(/\{[\s\S]*\}/);
    if (!match) { lastErr = "aucun JSON dans la réponse"; continue; }
    try {
      const crm = JSON.parse(match[0]);
      if (!Array.isArray(crm.fields) || !crm.fields.length) { lastErr = "aucun champ généré"; continue; }
      return { success: true, crm, usage };
    } catch (e) {
      lastErr = e.message;
    }
  }
  return { success: false, error: `Scénario CRM invalide (${lastErr}).` };
}

// Additionne les usages de plusieurs appels en gardant la forme à plat attendue
// par la page Coûts API (generation_usage.cost_usd).
function mergeUsage(usages) {
  const list = usages.filter(Boolean);
  if (!list.length) return null;
  return {
    model: list[0].model,
    calls: list.length,
    input_tokens: list.reduce((s, u) => s + (u.input_tokens || 0), 0),
    output_tokens: list.reduce((s, u) => s + (u.output_tokens || 0), 0),
    cost_usd: Number(list.reduce((s, u) => s + (u.cost_usd || 0), 0).toFixed(6)),
  };
}

// ─── Génération pure (appelable hors DB pour tests/démo) ──────────────────────
export async function generateExperienceContent({ title, description, criteria, companyContext, additionalContext }) {
  const prompt = buildExperienceGenerationPrompt({ title, description, criteria: criteria || {}, companyContext, additionalContext });

  let lastErr = "";
  for (let attempt = 1; attempt <= 2; attempt++) {
    const response = await anthropic.messages.create({
      model: GENERATION_MODEL,
      // 8000 : une expérience complète (3-6 étapes + grilles BARS détaillées avec
      // exemples) dépasse largement 4000 tokens et se faisait tronquer -> JSON invalide.
      max_tokens: 8000,
      temperature: 0.4,
      system: "Tu es un concepteur d'évaluations par compétences. Réponds UNIQUEMENT avec un JSON valide, sans texte avant ni après, sans bloc de code Markdown.",
      messages: [{ role: "user", content: prompt }],
    });
    const text = response.content[0]?.text || "";
    const usage = computeAiCost(GENERATION_MODEL, response.usage);

    // Troncature : la réponse a atteint le plafond de tokens -> JSON incomplet.
    if (response.stop_reason === "max_tokens") {
      lastErr = "réponse tronquée (expérience trop longue) — réessai";
      continue;
    }

    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        // 2e passe : les steps "crm" n'ont qu'un brief d'une phrase ; on génère
        // maintenant leur scénario complet (sources, champs, piège).
        const extraUsages = [];
        for (const s of parsed.steps || []) {
          if (s.sandbox_kind !== "crm") continue;
          const scenario = await generateCrmScenario({ title, description, companyContext, step: s });
          if (!scenario.success) {
            // Pas de scénario = pas de sandbox : l'étape retombe en tâche texte
            // simple plutôt que d'exposer une fiche vide au candidat.
            console.error("generateCrmScenario failed:", scenario.error);
            s.sandbox_kind = "none";
            continue;
          }
          extraUsages.push(scenario.usage);
          s.response_format = "text";
          // L'énoncé de la 1re passe a été écrit sans connaître le scénario : il
          // re-livre souvent l'information à extraire (et peut la contredire).
          // Celui de la 2e passe est écrit en connaissance des sources.
          const { step_prompt, ...crmConfig } = scenario.crm;
          if (step_prompt) s.prompt = step_prompt;
          s.config = { ...(s.config || {}), crm: crmConfig };
          delete s.config.crm_brief;
          const hasCrossCheck = (s.criteria || []).some((c) => /crois|source/i.test(c.name || ""));
          if (!hasCrossCheck) s.criteria = [...(s.criteria || []), CRM_CROSS_CHECK_CRITERION];
        }
        return { success: true, experience: parsed, usage: mergeUsage([usage, ...extraUsages]) };
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
// `additionalContext` : précisions libres issues du chat-first (ton souhaité,
// type de client, spécificités du poste non couvertes par l'offre).
export async function generateExperience(jobId, additionalContext = "") {
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
      additionalContext: (additionalContext || "").slice(0, 4000),
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

// ─── Messages paramétrables de l'expérience (accueil + remerciements) ─────────
export async function updateExperienceMessages(experienceId, updates) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Non authentifié" };

    const { data: exp } = await supabase
      .from("experiences").select("id, jobs!inner(user_id)").eq("id", experienceId).single();
    if (!exp || exp.jobs?.user_id !== user.id) return { success: false, error: "Accès refusé" };

    const allowed = ["welcome_message", "thank_you_message"];
    const safe = {};
    for (const k of allowed) if (updates[k] !== undefined) safe[k] = updates[k];
    safe.updated_at = new Date().toISOString();

    const { error } = await supabase.from("experiences").update(safe).eq("id", experienceId);
    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error("updateExperienceMessages error:", err);
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

// Le rapport de preuves est désormais intégré à la fiche candidat
// (candidats/[candidatId]) via getCandidateDetail ; le scoring est déclenché à
// la soumission du run (submitRun). Plus de route/écran de rapport séparés.

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
