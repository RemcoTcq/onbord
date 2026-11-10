// Génération des MODULES d'onboarding — module SERVEUR (phase 2, docs/PLAN.md).
//
// Un module est une simulation d'entraînement : un rôle, une situation à
// travailler, un objectif, une difficulté, une langue. Il passe par le MÊME
// moteur qu'une simulation de recrutement (generateExperienceContent : étapes,
// scènes, personnages, critique, grille à checkpoints), avec trois
// différences :
//
//   • pas d'offre : la « description » est celle du module
//     (descriptionModule, lib/simulationSource.js), qui dit au moteur qu'il
//     s'agit d'un entraînement et non d'un recrutement ;
//   • les compétences travaillées ne viennent pas d'une offre analysée : elles
//     sont déduites de la situation (deduireCompetences) si le manager ne les
//     a pas données, puis gardées dans `modules.criteria` ;
//   • AUCUN crédit n'est contrôlé ni débité (décision de Remco du 10/11/2026).
//
// `suggererModules` propose une liste de modules pour un rôle, à partir du
// Company Knowledge ; le manager choisit et modifie.

import anthropic from "@/lib/anthropic";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { generateExperienceContent, lignesEtapes, BUDGET_GENERATION_MS } from "@/lib/experienceGeneration";
import { contexteEntreprise } from "@/lib/org";
import { blocEntreprise } from "@/lib/knowledge";
import { descriptionModule } from "@/lib/simulationSource";
import { listerCompetences } from "@/lib/competences";
import { estimerMinutes } from "@/lib/experienceDuree";
import { rangerPersonasDeLaSimulation } from "@/lib/personas";
import { coerceExperienceLocale, coerceUiLocale, LOCALE_NAMES_FR } from "@/lib/i18n/config";

const MODELE_PETIT = "claude-sonnet-5-5";

/** Le premier objet JSON d'une réponse du modèle. */
function jsonDe(response) {
  const texte = (response.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
  const debut = texte.indexOf("{");
  const fin = texte.lastIndexOf("}");
  if (debut < 0 || fin <= debut) throw new Error("aucun JSON dans la réponse");
  return JSON.parse(texte.slice(debut, fin + 1));
}

/**
 * Les compétences qu'un module travaille, déduites de sa situation, dans la
 * forme de `jobs.extracted_criteria` (hard_skills / soft_skills, priorité,
 * preuve). Noms dans la langue du MANAGER : c'est lui qui les relit.
 */
export async function deduireCompetences({ module, uiLocale, companyContext }) {
  const nom = LOCALE_NAMES_FR[coerceUiLocale(uiLocale)];
  const response = await anthropic.messages.create({
    model: MODELE_PETIT,
    max_tokens: 3000,
    output_config: { effort: "low" },
    system: "Tu identifies les compétences qu'un module d'entraînement fait travailler. Réponds UNIQUEMENT avec un JSON valide.",
    messages: [{
      role: "user",
      content: `${descriptionModule(module)}

CONTEXTE ENTREPRISE :
${blocEntreprise(companyContext)}

Donne les 3 à 6 compétences que cette situation met réellement à l'épreuve : des comportements observables dans une conversation avec un client (découvrir le besoin, reconnaître une erreur, proposer une solution datée…), pas des traits de caractère. Noms RÉDIGÉS EN ${nom.toUpperCase()}, courts. "evidence" : en une phrase, pourquoi la situation l'exige.

{"hard_skills": [{"name": "…", "priority": "must_have", "evidence": "…"}], "soft_skills": [{"name": "…", "priority": "must_have", "evidence": "…"}]}`,
    }],
  });
  const brut = jsonDe(response);
  const liste = (v) => (Array.isArray(v) ? v : [])
    .filter((s) => String(s?.name || "").trim())
    .slice(0, 6)
    .map((s) => ({ name: String(s.name).trim(), priority: s.priority === "nice_to_have" ? "nice_to_have" : "must_have", evidence: String(s.evidence || "").trim() }));
  return { hard_skills: liste(brut.hard_skills), soft_skills: liste(brut.soft_skills) };
}

/**
 * Génère (ou régénère) la simulation d'un module. Chaque génération crée une
 * NOUVELLE version, comme pour une offre ; les brouillons précédents sans
 * essai sont archivés.
 * @returns {Promise<{success: boolean, experienceId?: string, error?: string}>}
 */
export async function runModuleGeneration(moduleId, onEvent = null) {
  const debut = Date.now();
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Non authentifié" };

    // Lecture sous RLS : seul un admin ou un manager de l'organisation lit le
    // module (migration 042).
    const { data: module } = await supabase.from("modules").select("*").eq("id", moduleId).maybeSingle();
    if (!module) return { success: false, error: "Module introuvable ou accès refusé" };

    const admin = createAdminClient();
    const { data: profil } = await admin.from("users").select("ui_locale").eq("id", user.id).maybeSingle();
    const uiLocale = coerceUiLocale(profil?.ui_locale);
    const locale = coerceExperienceLocale(module.locale);
    const ctx = await contexteEntreprise(user.id);

    // Les compétences : celles du manager, sinon déduites et gardées.
    let crit = module.criteria || {};
    if (!listerCompetences(crit).length) {
      onEvent?.({ kind: "skills_start" });
      crit = await deduireCompetences({ module, uiLocale, companyContext: ctx });
      await admin.from("modules").update({ criteria: crit, updated_at: new Date().toISOString() }).eq("id", module.id);
    }
    onEvent?.({ kind: "module", title: module.title, nbSkills: listerCompetences(crit).length });
    onEvent?.({ kind: "design_start" });

    const gen = await generateExperienceContent({
      title: module.title,
      description: descriptionModule(module),
      criteria: crit,
      companyContext: ctx,
      additionalContext: [
        "C'EST UN MODULE D'ONBOARDING, PAS UN RECRUTEMENT : la personne est déjà dans l'équipe et s'entraîne. Il pourra recommencer autant de fois qu'il le faut.",
        "Concentre le module sur LA situation décrite : 1 à 3 étapes, la conversation avec le client au centre. Pas de questions de présélection, pas de QCM de culture générale.",
        "Les faits de l'entreprise (produit, tarifs, politiques, objections) viennent du contexte entreprise : un bon entraînement oblige à les utiliser, sans en inventer.",
      ].join("\n"),
      locale,
      uiLocale,
      onEvent,
      echeance: debut + BUDGET_GENERATION_MS,
    });
    if (!gen.success) return gen;

    const { steps = [] } = gen.experience;
    const estimated_minutes = estimerMinutes(steps.map((s) => ({
      kind: s.kind,
      response_format: s.response_format || "text",
      sandbox_kind: s.sandbox_kind || "none",
      ai_assistant_allowed: !!s.ai_assistant_allowed,
    })));

    const { data: derniere } = await supabase
      .from("experiences").select("version").eq("module_id", module.id)
      .order("version", { ascending: false }).limit(1).maybeSingle();
    const version = (derniere?.version ?? 0) + 1;

    // Les brouillons précédents sans essai partent en archive (jamais supprimés).
    const { data: brouillons } = await supabase
      .from("experiences").select("id").eq("module_id", module.id).in("status", ["draft", "pending_review"]);
    for (const b of brouillons || []) {
      const { count } = await supabase
        .from("candidate_runs").select("id", { count: "exact", head: true }).eq("experience_id", b.id);
      if (!count) await supabase.from("experiences").update({ status: "archived", updated_at: new Date().toISOString() }).eq("id", b.id);
    }

    const { data: experience, error: expErr } = await supabase
      .from("experiences")
      .insert({
        module_id: module.id,
        status: "pending_review",
        version,
        estimated_minutes,
        generated_from: { criteria: crit, company_ai_context: ctx, fil_rouge: gen.experience.fil_rouge || null, module: true },
        generation_usage: gen.usage,
      })
      .select("id")
      .single();
    if (expErr) throw expErr;

    const rows = lignesEtapes(steps, experience.id, crit);
    if (rows.length) {
      const { error: stepsErr } = await supabase.from("experience_steps").insert(rows);
      if (stepsErr) throw stepsErr;
    }
    await rangerPersonasDeLaSimulation(experience.id, user.id);

    onEvent?.({ kind: "saved", nbEtapes: rows.length, nbSubDims: rows.reduce((n, r) => n + (r.criteria || []).length, 0) });
    onEvent?.({ kind: "done" });
    return { success: true, experienceId: experience.id, usage: gen.usage };
  } catch (err) {
    console.error("runModuleGeneration error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Des modules proposés pour un rôle, tirés du Company Knowledge : ce qu'une
 * nouvelle recrue de ce rôle doit savoir affronter. Le manager choisit, modifie,
 * puis crée ceux qu'il garde.
 * @returns {Promise<Array<{title, situation, objective, difficulty}>>}
 */
export async function suggererModules({ role, nombre = 5, uiLocale, companyContext, lacunes = [] }) {
  const nom = LOCALE_NAMES_FR[coerceUiLocale(uiLocale)];
  // Les lacunes constatées au recrutement (phase 4) : les premiers modules
  // proposés les travaillent, chacun en nomme une ou plusieurs.
  const blocLacunes = lacunes.length
    ? `\n\nLACUNES CONSTATÉES CHEZ CETTE RECRUE À SA SIMULATION DE RECRUTEMENT (point attendu, noté 0 = absent ou 1 = partiel sur 2) :
${lacunes.slice(0, 20).map((l) => `- [${l.competence || "—"}] ${l.point} (${l.score}/2)${l.justification ? ` — ${l.justification}` : ""}`).join("\n")}

Les modules proposés travaillent EN PRIORITÉ ces lacunes, les points à 0 d'abord : chaque situation est construite pour que la recrue doive précisément faire ce qui lui a manqué. Regroupe les lacunes proches dans un même module.`
    : "";
  const response = await anthropic.messages.create({
    model: MODELE_PETIT,
    max_tokens: 4000,
    output_config: { effort: "low" },
    system: "Tu conçois des parcours d'onboarding par simulations pour des équipes commerciales et customer success / support. Réponds UNIQUEMENT avec un JSON valide.",
    messages: [{
      role: "user",
      content: `RÔLE DE LA NOUVELLE RECRUE : ${role || "non précisé"}

CONTEXTE ENTREPRISE :
${blocEntreprise(companyContext)}${blocLacunes}

Propose ${nombre} modules d'entraînement : les conversations qu'une nouvelle recrue de ce rôle doit savoir mener AVANT de rencontrer de vrais clients, ${lacunes.length ? "en commençant par celles qui travaillent ses lacunes" : "du plus courant au plus délicat"}. Chacun est une SITUATION concrète avec un client (ou un prospect), tirée de ce que fait cette entreprise — ses produits, ses tarifs, ses objections, ses politiques — jamais une situation générique.
Tout est RÉDIGÉ EN ${nom.toUpperCase()}.

{"modules": [{"title": "titre court", "situation": "la situation en une ou deux phrases", "objective": "ce que la recrue doit obtenir, en une phrase", "difficulty": "easy | medium | hard"}]}`,
    }],
  });
  const brut = jsonDe(response);
  return (Array.isArray(brut.modules) ? brut.modules : [])
    .filter((m) => String(m?.title || "").trim() && String(m?.situation || "").trim())
    .slice(0, 10)
    .map((m) => ({
      title: String(m.title).trim().slice(0, 160),
      situation: String(m.situation).trim().slice(0, 1000),
      objective: String(m.objective || "").trim().slice(0, 500),
      difficulty: ["easy", "medium", "hard"].includes(m.difficulty) ? m.difficulty : "medium",
    }));
}
