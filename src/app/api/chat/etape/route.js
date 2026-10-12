import { Anthropic } from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { listerCompetences } from "@/lib/competences";
import { computeAiCost } from "@/lib/constants/aiPricing";
import { ajouterUsageEcran } from "@/lib/usageEcran";
import { langueDeConversation } from "@/lib/i18n/detection";
import { UI_LOCALES, coerceUiLocale, LOCALE_NAMES_FR } from "@/lib/i18n/config";

// Le chat de la page d'une étape (12/10/2026, demande de Remco).
//
// Un EXPERT de la simulation, pas un bouton de réécriture : il répond aux
// questions du recruteur — ce que l'étape demande, comment elle est notée, ce
// que cache le personnage, si le niveau convient au poste — à partir de
// l'étape entière, de ses voisines et de l'offre. Répondre est GRATUIT.
//
// Il ne modifie jamais rien lui-même. Quand le recruteur demande un changement,
// il PROPOSE une réécriture (outil `proposer_modification`) : l'écran affiche
// un bouton « Appliquer · 2 crédits », et seul ce clic lance regenerateStep et
// débite. Pas de crédit sans décision explicite du recruteur.
//
// Le fil vit dans la page (texte seul, sans blocs de réflexion) : rien n'est
// stocké, rien n'est rejoué d'un tour sur l'autre que les mots échangés.

export const maxDuration = 60;

const MODELE = "claude-sonnet-5-5";
const MAX_MESSAGES = 16;     // l'extrémité du fil renvoyée au modèle
const MAX_CONFIG = 15000;    // caractères de la scène envoyés en contexte

const OUTIL = {
  name: "proposer_modification",
  description: "Propose au recruteur une réécriture de CETTE étape. Ne l'appelle que quand il demande un changement (ou accepte un changement que tu as suggéré) — jamais pour répondre à une question. Le recruteur verra un bouton de confirmation ; rien n'est modifié tant qu'il ne clique pas.",
  input_schema: {
    type: "object",
    properties: {
      resume: {
        type: "string",
        description: "La modification en UNE phrase, dans la langue de la conversation, lue par le recruteur sur le bouton de confirmation. Concrète : ce qui change.",
      },
      consigne: {
        type: "string",
        description: "La consigne de réécriture, EN FRANÇAIS, pour le concepteur qui réécrira l'étape sans voir cette conversation : ce qui doit changer ET ce qui doit être conservé. Reprends les mots du recruteur quand ils sont précis. 2 à 5 phrases.",
      },
    },
    required: ["resume", "consigne"],
  },
};

function blocEtape(step, position, total) {
  const config = JSON.stringify(step.config || {});
  const grille = (step.criteria || []).map((c) => {
    const points = Array.isArray(c.checkpoints)
      ? c.checkpoints.map((cp, i) => `      ${i + 1}. ${cp.description}`).join("\n")
      : "      (ancienne grille à niveaux)";
    return `  • ${c.name || "(sans nom)"} — compétences : ${(c.skill_ids || []).join(", ") || "celles de l'étape"}\n${points}`;
  }).join("\n");
  return `ÉTAPE ${position} SUR ${total} : « ${step.title || "(sans titre)"} »
Type : ${step.kind} · format de réponse : ${step.response_format} · mise en situation : ${step.sandbox_kind || "aucune"} · assistant IA autorisé : ${step.ai_assistant_allowed ? "oui" : "non"}
Consigne lue par le candidat :
${step.prompt || "(vide)"}

Compétence principale : ${step.skill_assessed || "(non précisée)"}
Grille (sous-compétences et checkpoints) :
${grille || "  (aucune — étape corrigée automatiquement ou non notée)"}

Contenu complet de la mise en situation (JSON — scène, notes cachées, corrigé) :
${config.length > MAX_CONFIG ? `${config.slice(0, MAX_CONFIG)}… (tronqué)` : config}`;
}

function systeme({ titrePoste, competences, filRouge, voisines, etape, langue }) {
  return `LANGUE DE LA CONVERSATION : ${LOCALE_NAMES_FR[langue]}. Tu réponds toujours dans cette langue, quelle que soit la langue des contenus ci-dessous.

Tu es l'expert d'une simulation de recrutement Onbord, intégré à la page d'UNE étape, face au recruteur qui l'a conçue. Tu connais le métier du poste et tu donnes un avis de professionnel : ce que l'étape demande vraiment, si le niveau convient, ce qu'une excellente réponse ferait, ce qui pourrait manquer.

COMMENT ONBORD NOTE (à expliquer si on te le demande) : après la simulation, une IA relit la réponse du candidat et note chaque checkpoint 0 (absent), 1 (présent mais faible) ou 2 (présent et bien fait), en citant le passage qui le prouve. En cas de doute, un second avis indépendant est demandé, et un troisième si les deux divergent. Le score d'une sous-compétence est la somme de ses checkpoints, en % du maximum. La note finale est la moyenne des sous-compétences de toutes les étapes ; une sous-compétence liée à une compétence obligatoire de l'offre compte double, et l'importance d'une étape (×0,5 à ×2, réglable par le recruteur) multiplie le poids de toutes ses sous-compétences. Le « corrigé » (signes de réussite, piège, analyse attendue) n'est pas noté à part : il aide l'IA à attribuer les points.

CE QUE TU FAIS :
- Une question → tu réponds, court et concret (3 à 6 phrases, sans titres ni longues listes, aucun emoji). Répondre est gratuit pour le recruteur.
- Une demande de changement → tu appelles proposer_modification. Le recruteur confirme d'un clic ; la réécriture coûte 2 crédits. Ne modifie jamais rien toi-même, et ne prétends jamais qu'une modification est faite.
- Un changement minime (un mot, un nom, un checkpoint) → dis-lui qu'il peut le faire directement à l'écran, gratuitement (✎ dans l'onglet Scénario ou Scoring) ; propose quand même la réécriture s'il la préfère.
- Tu peux suggérer une amélioration de toi-même, mais tu ne la proposes en modification que s'il l'accepte.

LE POSTE : ${titrePoste || "(non précisé)"}
Compétences validées de l'offre : ${competences.map((c) => `${c.name} [${c.id}]${c.tier === "must_have" ? " (obligatoire)" : ""}`).join(" ; ") || "(aucune)"}
${filRouge ? `Fil rouge du parcours (lu par le candidat) : ${filRouge}\n` : ""}Les étapes du parcours : ${voisines}

${etape}`;
}

export async function POST(req) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: "Authentification requise." }, { status: 401 });

    const { stepId, messages } = await req.json();
    const fil = (Array.isArray(messages) ? messages : [])
      .filter((m) => (m?.role === "user" || m?.role === "assistant") && typeof m.text === "string" && m.text.trim())
      .map((m) => ({ role: m.role, content: m.text.slice(0, 4000) }))
      .slice(-MAX_MESSAGES);
    if (!stepId || !fil.length || fil[fil.length - 1].role !== "user") {
      return Response.json({ error: "Aucun message à traiter." }, { status: 400 });
    }

    // Propriété vérifiée par la jointure : l'étape appartient à l'offre du recruteur.
    const { data: step } = await supabase
      .from("experience_steps")
      .select("*, experiences!inner(id, generated_from, jobs!inner(user_id, title, extracted_criteria))")
      .eq("id", stepId)
      .single();
    const job = step?.experiences?.jobs;
    if (!step || !job || job.user_id !== user.id) return Response.json({ error: "Accès refusé" }, { status: 403 });

    const [{ data: fratrie }, { data: profil }] = await Promise.all([
      supabase.from("experience_steps").select("id, title, sandbox_kind, response_format").eq("experience_id", step.experience_id).order("order_index"),
      supabase.from("users").select("ui_locale").eq("id", user.id).single(),
    ]);
    const liste = fratrie || [];
    const position = liste.findIndex((s) => s.id === step.id) + 1;
    const voisines = liste.map((s, i) => `${i + 1}. ${s.title || "—"} (${s.sandbox_kind && s.sandbox_kind !== "none" ? s.sandbox_kind : s.response_format})`).join(" ; ");

    // Le recruteur choisit sa langue en écrivant ; à défaut, celle de son interface.
    const langue = langueDeConversation(fil, { langues: UI_LOCALES, defaut: coerceUiLocale(profil?.ui_locale) });

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });
    const r = await anthropic.messages.create({
      model: MODELE,
      max_tokens: 2500,
      // Sonnet 5.5 ne coupe pas la réflexion : l'effort la borne. Aucun bloc de
      // réflexion n'est rejoué (le fil ne garde que le texte).
      thinking: { type: "adaptive", display: "omitted" },
      output_config: { effort: "low" },
      system: systeme({
        titrePoste: job.title,
        competences: listerCompetences(job.extracted_criteria || {}),
        filRouge: step.experiences.generated_from?.fil_rouge?.contexte_candidat || null,
        voisines,
        etape: blocEtape(step, position, liste.length),
        langue,
      }),
      messages: fil,
      tools: [OUTIL],
    });

    const reply = (r.content || []).filter((c) => c.type === "text").map((c) => c.text).join("\n").trim();
    const outil = (r.content || []).find((c) => c.type === "tool_use" && c.name === OUTIL.name);
    const proposition = outil?.input?.consigne
      ? { resume: String(outil.input.resume || "").slice(0, 400), consigne: String(outil.input.consigne).slice(0, 2000) }
      : null;

    // Coût suivi (page Coûts), jamais facturé : répondre est gratuit.
    await ajouterUsageEcran(supabase, step.experience_id, { ...computeAiCost(MODELE, r.usage), calls: 1 });

    return Response.json({ reply, proposition });
  } catch (error) {
    console.error("chat étape error:", error);
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
