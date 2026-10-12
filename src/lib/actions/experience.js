"use server";

import { createClient } from "@/lib/supabase/server";
import { runExperienceGeneration, runStepRegeneration, runCouvertureCompetence } from "@/lib/experienceGeneration";
import { chargerExperienceCourante } from "@/lib/experienceChat";
import { versionModifiable } from "@/lib/experienceVersion";
import { cleResume, rediger as redigerResumes } from "@/lib/resumeEtapes";
import { coerceUiLocale, coerceExperienceLocale } from "@/lib/i18n/config";
import { inventaire as inventaireNotes, traduire as traduireNotes } from "@/lib/notesRecruteur";
import { cleCritere, decrire as decrireCriteresIA } from "@/lib/descriptionsCriteres";
import { ajouterUsageEcran } from "@/lib/usageEcran";

// ─── Génération ───────────────────────────────────────────────────────────────
// Le pipeline (prompts, appels Claude, versionnage, insertion) vit dans
// lib/experienceGeneration.js : il doit être appelable aussi bien depuis cette
// server action que depuis la route de streaming, qui a besoin d'un callback
// pour pousser chaque étape réelle au client. Un module "use server" ne peut
// exporter que des fonctions async — d'où la séparation.
export async function generateExperience(jobId, additionalContext = "") {
  return runExperienceGeneration(jobId, additionalContext, null);
}

// Il y avait ici `generateExperienceContent(args)` : la génération SANS
// persistance, exposée pour « tests / démo hors repo ». Dans un module
// "use server", tout export est un point d'entrée HTTP public — celui-ci ne
// vérifiait ni session, ni offre, ni crédits : n'importe qui pouvait faire
// tourner le modèle aux frais d'Onbord. Personne ne l'appelait. Retiré le
// 25/09/2026. La fonction pure reste dans lib/experienceGeneration.js pour un
// banc local, qui l'importe directement, sans passer par HTTP.

// ─── Régénération ciblée d'une étape ──────────────────────────────────────────
// Le pendant assisté de updateStep : même écriture EN PLACE, même absence de
// versionnage. La seule différence est qu'un modèle rédige le contenu à partir
// d'une consigne, là où updateStep reçoit les champs déjà saisis.
export async function regenerateStep(stepId, instruction) {
  return runStepRegeneration(stepId, instruction);
}

// ─── Couverture d'une compétence must-have ────────────────────────────────────
// Le bouton du panneau « Couverture des compétences ». Session, propriété de
// l'offre et crédits sont vérifiés dans runCouvertureCompetence : tout export
// de ce module est un point d'entrée HTTP public.
export async function couvrirCompetence(experienceId, skillId) {
  return runCouvertureCompetence(experienceId, skillId);
}

/**
 * Variante appelée par le chat, qui ne connaît pas les identifiants d'étape :
 * il désigne « l'étape 3 », telle qu'elle lui a été présentée.
 *
 * La résolution du numéro se fait ICI, sur la même lecture triée que celle qui a
 * produit la liste envoyée au modèle. Lui faire recopier un identifiant aurait
 * été plus direct — et aurait réécrit l'étape d'une autre offre le jour où il en
 * invente un.
 */
export async function regenerateStepByNumber(jobId, stepNumber, instruction) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Non authentifié" };

    const { data: job } = await supabase
      .from("jobs").select("id").eq("id", jobId).eq("user_id", user.id).maybeSingle();
    if (!job) return { success: false, error: "Accès refusé" };

    const { experience, steps } = await chargerExperienceCourante(supabase, jobId);
    if (!experience || !steps.length) {
      return { success: false, error: "Aucune expérience à modifier : il faut d'abord la générer." };
    }

    const index = Number(stepNumber) - 1;
    if (!Number.isInteger(index) || index < 0 || index >= steps.length) {
      return { success: false, error: `L'étape ${stepNumber} n'existe pas : le parcours en compte ${steps.length}.` };
    }

    return runStepRegeneration(steps[index].id, instruction);
  } catch (err) {
    console.error("regenerateStepByNumber error:", err);
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

// ─── Fil rouge : la situation lue par le candidat avant la première étape ────
// Il vit dans `generated_from.fil_rouge` (aucune migration). Comme toute
// retouche, il passe par versionModifiable : un candidat déjà engagé garde le
// texte qu'il a lu. Un contexte vidé retire le fil rouge.
export async function updateFilRouge(experienceId, { contexte_candidat, univers } = {}) {
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

    const v = await versionModifiable(supabase, experienceId);
    const { data: cible } = await supabase
      .from("experiences").select("generated_from").eq("id", v.experienceId).single();

    const contexte = String(contexte_candidat || "").trim().slice(0, 1500);
    const filRouge = contexte
      ? { contexte_candidat: contexte, univers: String(univers || "").trim().slice(0, 4000) }
      : null;

    const { error } = await supabase
      .from("experiences")
      .update({ generated_from: { ...(cible?.generated_from || {}), fil_rouge: filRouge }, updated_at: new Date().toISOString() })
      .eq("id", v.experienceId);
    if (error) throw error;
    return { success: true, forked: v.forked, version: v.version, fil_rouge: filRouge };
  } catch (err) {
    console.error("updateFilRouge error:", err);
    return { success: false, error: err.message };
  }
}

// ─── Résumé des étapes, pour les blocs de la vue d'ensemble ──────────────────
// Lus dans le cache (generated_from.recaps), rédigés par Haiku pour les étapes
// qui n'en ont pas ou dont le contenu a changé (lib/resumeEtapes.js). Le cache
// est réécrit tel quel : une étape supprimée en sort, et l'écriture ne passe pas
// par versionModifiable — elle ne touche à rien de ce que voit un candidat.
// Un échec du modèle n'est pas une erreur pour l'écran : les blocs gardent
// leur titre, et le prochain affichage réessaie.
export async function resumerEtapes(experienceId) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Non authentifié" };

    const { data: exp } = await supabase
      .from("experiences")
      .select("id, generated_from, jobs!inner(user_id)")
      .eq("id", experienceId)
      .single();
    if (!exp || exp.jobs?.user_id !== user.id) return { success: false, error: "Accès refusé" };

    const [{ data: steps }, { data: profil }] = await Promise.all([
      supabase.from("experience_steps")
        .select("id, title, prompt, sandbox_kind, response_format")
        .eq("experience_id", experienceId).order("order_index"),
      supabase.from("users").select("ui_locale").eq("id", user.id).single(),
    ]);
    const uiLocale = coerceUiLocale(profil?.ui_locale);
    const cache = exp.generated_from?.recaps || {};

    const recaps = {};
    const aRediger = [];
    for (const s of steps || []) {
      const cle = cleResume(s, uiLocale);
      if (cache[s.id]?.cle === cle && cache[s.id]?.texte) recaps[s.id] = cache[s.id];
      else aRediger.push({ ...s, cle });
    }

    let usage = null;
    if (aRediger.length) {
      try {
        const res = await redigerResumes(aRediger, uiLocale);
        usage = res.usage;
        for (const s of aRediger) {
          const texte = res.resumes.get(s.id);
          if (texte) recaps[s.id] = { texte, cle: s.cle };
        }
      } catch (err) {
        console.error("resumerEtapes : rédaction en échec (non bloquant) —", err.message);
      }
    }

    const inchange = Object.keys(recaps).length === Object.keys(cache).length
      && Object.entries(recaps).every(([id, r]) => cache[id]?.cle === r.cle);
    if (!inchange) {
      const precedent = exp.generated_from?.recaps_usage || null;
      const recaps_usage = usage
        ? {
            model: usage.model,
            calls: (precedent?.calls || 0) + 1,
            input_tokens: (precedent?.input_tokens || 0) + (usage.input_tokens || 0),
            output_tokens: (precedent?.output_tokens || 0) + (usage.output_tokens || 0),
            cost_usd: Number(((precedent?.cost_usd || 0) + (usage.cost_usd || 0)).toFixed(6)),
          }
        : precedent;
      await supabase
        .from("experiences")
        .update({ generated_from: { ...(exp.generated_from || {}), recaps, recaps_usage } })
        .eq("id", experienceId);
    }

    return { success: true, recaps: Object.fromEntries(Object.entries(recaps).map(([id, r]) => [id, r.texte])) };
  } catch (err) {
    console.error("resumerEtapes error:", err);
    return { success: false, error: err.message };
  }
}

// ─── Description des sous-compétences d'une étape ────────────────────────────
// Pour les cartes de l'onglet Scoring (lib/descriptionsCriteres.js). Lues dans
// le cache, rédigées pour les critères neufs ou modifiés. Rend, par critère, son
// nom et sa description : l'écran n'affiche une description que si le nom
// correspond encore (un critère renommé à l'écran attend son enregistrement).
// Un échec n'est jamais une erreur pour l'écran : les cartes restent sans texte.
export async function decrireCriteres(stepId) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Non authentifié" };

    const { data: step } = await supabase
      .from("experience_steps")
      .select("id, title, prompt, criteria, experience_id, experiences!inner(id, generated_from, jobs!inner(user_id))")
      .eq("id", stepId)
      .single();
    if (!step || step.experiences?.jobs?.user_id !== user.id) return { success: false, error: "Accès refusé" };

    const criteres = (step.criteria || []).filter((c) => Array.isArray(c?.checkpoints) && c.checkpoints.some((cp) => (cp?.description || "").trim()));
    if (!criteres.length) return { success: true, descriptions: [] };

    const { data: profil } = await supabase.from("users").select("ui_locale").eq("id", user.id).single();
    const uiLocale = coerceUiLocale(profil?.ui_locale);
    const generatedFrom = step.experiences.generated_from || {};
    const cache = generatedFrom.descriptions_criteres || {};
    const cle = (c) => `${step.id}:${cleCritere(c, uiLocale)}`;

    const manquants = criteres.filter((c) => !cache[cle(c)]);
    if (manquants.length) {
      try {
        const { descriptions, usage } = await decrireCriteresIA({ titreEtape: step.title, consigne: step.prompt, criteres: manquants }, uiLocale);
        // Le cache ne garde, pour cette étape, que les critères actuels.
        const neuf = Object.fromEntries(Object.entries(cache).filter(([k]) => !k.startsWith(`${step.id}:`)));
        for (const c of criteres) if (cache[cle(c)]) neuf[cle(c)] = cache[cle(c)];
        manquants.forEach((c, i) => { if (descriptions[i]) neuf[cle(c)] = descriptions[i]; });
        await supabase
          .from("experiences")
          .update({ generated_from: { ...generatedFrom, descriptions_criteres: neuf } })
          .eq("id", step.experience_id);
        Object.assign(cache, neuf);
        await ajouterUsageEcran(supabase, step.experience_id, usage);
      } catch (err) {
        console.error("decrireCriteres : rédaction en échec (non bloquant) —", err.message);
      }
    }

    return { success: true, descriptions: criteres.map((c) => ({ name: c.name || "", texte: cache[cle(c)] || "" })) };
  } catch (err) {
    console.error("decrireCriteres error:", err);
    return { success: false, error: err.message };
  }
}

// ─── Les notes du recruteur, dans sa langue ──────────────────────────────────
// Appelée à l'ouverture de la simulation (vue d'ensemble, page d'une étape).
// Détection gratuite ; traduction (Haiku 5.5, ≈ 0,001 $) seulement si un champ
// lu par le seul recruteur est dans une autre langue que son interface — les
// simulations générées avant le 09/10/2026, ou un recruteur qui a changé de
// langue (lib/notesRecruteur.js). Non facturée : c'est notre erreur, pas une
// demande du recruteur.
//
// Écrite EN PLACE, sans nouvelle version : rien de ce que voit le candidat ne
// change, et le sens des notes non plus. Un candidat déjà engagé garde la même
// scène ; seul l'outil de notation et le personnage relisent une note traduite.
export async function harmoniserNotesRecruteur(jobId) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Non authentifié" };

    const { data: job } = await supabase.from("jobs").select("id").eq("id", jobId).eq("user_id", user.id).maybeSingle();
    if (!job) return { success: false, error: "Accès refusé" };

    const { experience, steps } = await chargerExperienceCourante(supabase, jobId);
    if (!experience) return { success: true, changed: 0 };

    const { data: profil } = await supabase.from("users").select("ui_locale").eq("id", user.id).single();
    const cible = coerceUiLocale(profil?.ui_locale);

    // chargerExperienceCourante ne rend pas toujours `config` complet : on
    // relit les étapes entières pour écrire sans rien perdre.
    const { data: completes } = await supabase
      .from("experience_steps").select("id, sandbox_kind, config").eq("experience_id", experience.id);
    const { data: exp } = await supabase
      .from("experiences").select("generated_from").eq("id", experience.id).single();

    const aTraduire = inventaireNotes(completes || steps, exp?.generated_from?.fil_rouge, cible);
    if (!aTraduire.length) return { success: true, changed: 0 };

    const { traductions, usage } = await traduireNotes(aTraduire.map((x) => x.valeur), cible);

    // Applique, étape par étape, toutes les traductions d'une même étape.
    const configs = new Map((completes || []).map((s) => [s.id, s.config || {}]));
    let univers = null;
    aTraduire.forEach((x, i) => {
      if (x.univers) { univers = traductions[i]; return; }
      configs.set(x.stepId, x.ecrire(configs.get(x.stepId), traductions[i]));
    });
    const touchees = [...new Set(aTraduire.filter((x) => x.stepId).map((x) => x.stepId))];
    for (const id of touchees) {
      // updated_at bouge : un éditeur déjà ouvert sur l'étape repart de la traduction.
      const { error } = await supabase.from("experience_steps")
        .update({ config: configs.get(id), updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    }

    if (univers) {
      await supabase.from("experiences")
        .update({ generated_from: { ...(exp.generated_from || {}), fil_rouge: { ...exp.generated_from.fil_rouge, univers } } })
        .eq("id", experience.id);
    }
    await ajouterUsageEcran(supabase, experience.id, usage);

    return { success: true, changed: aTraduire.length };
  } catch (err) {
    // Jamais bloquant : l'écran s'ouvre avec les notes telles quelles.
    console.error("harmoniserNotesRecruteur error:", err);
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
    const possede = await assertStepOwnership(supabase, user.id, stepId);
    if (!possede) return { success: false, error: "Accès refusé" };

    // Une version déjà commencée par un candidat ne se modifie plus : la
    // retouche porte sur une copie (lib/experienceVersion.js).
    const v = await versionModifiable(supabase, possede.experience_id);
    const cible = v.forked ? v.correspondance.get(stepId) : stepId;

    // Champs éditables uniquement (dont response_format, choisi par step)
    // `criteria` : colonne historique, contient les sous-dimensions de skill_assessed.
    const allowed = ["title", "prompt", "response_format", "sandbox_kind", "ai_assistant_allowed", "skill_assessed", "criteria", "config", "order_index"];
    const safe = {};
    for (const k of allowed) if (updates[k] !== undefined) safe[k] = updates[k];
    safe.updated_at = new Date().toISOString();

    const { error } = await supabase.from("experience_steps").update(safe).eq("id", cible);
    if (error) throw error;
    return { success: true, forked: v.forked, version: v.version };
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

    // Publier ne facture rien : la création de l'offre a déjà payé le forfait
    // de 6 crédits, qui couvre tout jusqu'ici — extraction, compétences,
    // génération, régénérations, relecture, publication.
    const { error } = await supabase
      .from("experiences")
      .update({ status: "published", published_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", experienceId);
    if (error) throw error;

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

    const v = await versionModifiable(supabase, experienceId);

    const { data: last } = await supabase
      .from("experience_steps").select("order_index")
      .eq("experience_id", v.experienceId).order("order_index", { ascending: false }).limit(1).maybeSingle();
    const nextIndex = (last?.order_index ?? -1) + 1;

    const { data: step, error } = await supabase.from("experience_steps").insert({
      experience_id: v.experienceId, order_index: nextIndex,
      kind: "question", response_format: "text", title: "Nouvelle étape",
      prompt: "", sandbox_kind: "none", ai_assistant_allowed: false,
      skill_assessed: "", criteria: [], config: {},
    }).select().single();
    if (error) throw error;
    return { success: true, step, forked: v.forked, version: v.version };
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
    const possede = await assertStepOwnership(supabase, user.id, stepId);
    if (!possede) return { success: false, error: "Accès refusé" };

    // Sur une version commencée, supprimer l'étape effaçait en cascade les
    // réponses que les candidats y avaient déjà données (run_step_responses,
    // ON DELETE CASCADE). La suppression porte désormais sur la copie.
    const v = await versionModifiable(supabase, possede.experience_id);
    const cible = v.forked ? v.correspondance.get(stepId) : stepId;

    const { error } = await supabase.from("experience_steps").delete().eq("id", cible);
    if (error) throw error;
    return { success: true, forked: v.forked, version: v.version };
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
    const possede = await assertStepOwnership(supabase, user.id, stepId);
    if (!possede) return { success: false, error: "Accès refusé" };

    const v = await versionModifiable(supabase, possede.experience_id);
    const cible = v.forked ? v.correspondance.get(stepId) : stepId;

    const { data: current } = await supabase
      .from("experience_steps").select("id, order_index, experience_id").eq("id", cible).single();

    let neighborQuery = supabase
      .from("experience_steps").select("id, order_index").eq("experience_id", current.experience_id);
    neighborQuery = direction === "up"
      ? neighborQuery.lt("order_index", current.order_index).order("order_index", { ascending: false })
      : neighborQuery.gt("order_index", current.order_index).order("order_index", { ascending: true });
    const { data: neighbor } = await neighborQuery.limit(1).maybeSingle();
    if (!neighbor) return { success: true, forked: v.forked, version: v.version }; // déjà en bout de liste

    await supabase.from("experience_steps").update({ order_index: neighbor.order_index }).eq("id", current.id);
    await supabase.from("experience_steps").update({ order_index: current.order_index }).eq("id", neighbor.id);
    return { success: true, forked: v.forked, version: v.version };
  } catch (err) {
    console.error("moveStep error:", err);
    return { success: false, error: err.message };
  }
}
