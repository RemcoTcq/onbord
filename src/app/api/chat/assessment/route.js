import { Anthropic } from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import {
  chargerFilEtDecouverte, enregistrerFil, bornerFil, MAX_MESSAGES_MODELE,
  chargerExperienceCourante, construireEtatExperience,
} from '@/lib/experienceChat';
import { extraireDecouverte, construireFicheDecouverte } from '@/lib/experienceDecouverte';
import { buildSystemPrompt, GENERATE_TOOL, REGENERATE_STEP_TOOL } from '@/lib/experienceChatPrompt';
import { langueDeConversation } from '@/lib/i18n/detection';
import { UI_LOCALES, coerceUiLocale } from '@/lib/i18n/config';

// Un tour de chat de conception, dans l'ordre : lire l'état (fil, fiche,
// étapes déjà générées), ÉCOUTER (dépouiller le dernier message du recruteur),
// puis parler. Ce que le chat est — ses outils, ses règles de conduite — vit
// dans lib/experienceChatPrompt.js ; cette route ne fait qu'orchestrer.
export async function POST(req) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: "Authentification requise." }, { status: 401 });

    const { messages, jobId } = await req.json();
    if (!jobId) return Response.json({ error: "jobId requis." }, { status: 400 });

    // Ownership + contexte offre
    const { data: job } = await supabase
      .from("jobs").select("id, user_id, title, extracted_criteria").eq("id", jobId).single();
    if (!job || job.user_id !== user.id) return Response.json({ error: "Accès refusé à cette offre." }, { status: 403 });

    // Un client qui rouvre le panneau sans avoir chargé le fil (ou après un
    // rechargement à mi-parcours) n'envoie rien : on repart de ce qui est en
    // base plutôt que d'ouvrir une conversation amnésique.
    // Le fil ET la fiche de découverte, en une lecture : le premier porte ce qui
    // s'est dit, la seconde ce qu'on en a retenu.
    const { messages: filEnBase, decouverte } = await chargerFilEtDecouverte(supabase, jobId);
    const filClient = Array.isArray(messages) ? messages : [];
    const fil = filClient.length ? filClient : filEnBase;
    if (!fil.length) return Response.json({ error: "Aucun message à traiter." }, { status: 400 });

    const { data: profile } = await supabase
      .from("users").select("company_ai_context, ui_locale").eq("id", user.id).single();

    const criteria = job.extracted_criteria || {};
    const allSkills = [];
    for (const key of ["hard_skills", "soft_skills", "skills"]) {
      if (Array.isArray(criteria[key])) allSkills.push(...criteria[key].map((s) => (typeof s === "string" ? s : s.name)).filter(Boolean));
    }
    const skillsStr = allSkills.length ? allSkills.join(", ") : "Aucune compétence extraite.";

    // Relu à CHAQUE tour, jamais mémorisé dans le fil : c'est ce qui garde le
    // chat juste quand le recruteur édite une étape à la main entre deux messages.
    const { experience, steps } = await chargerExperienceCourante(supabase, jobId);
    const etat = construireEtatExperience(experience, steps);

    // Le chat de conception s'adresse au RECRUTEUR, pas au candidat : il suit
    // la langue dans laquelle CELUI-CI écrit, pas celle de l'offre. Un recruteur
    // anglophone conçoit en anglais une expérience qui sortira en néerlandais —
    // la langue du parcours généré, elle, ne se décide pas ici : elle est lue en
    // base (jobs.experience_locale) au moment de générer.
    //
    // La détection ne regarde QUE les messages humains du fil : les tool_result
    // que le client y insère sont rédigés en français, et les prendre pour la
    // parole du recruteur ramenait tout l'échange au français dès la première
    // génération. Le fil complet est passé, pas seulement son extrémité : la
    // langue de l'échange ne doit pas changer parce qu'on a rogné le contexte.
    //
    // Deux langues candidates seulement, celles de l'interface : le recruteur
    // conçoit en français ou en anglais. Un message néerlandais ne trompe pas la
    // détection pour autant, il ne tranche simplement pas — et on retombe sur sa
    // langue d'interface.
    const langue = langueDeConversation(fil, {
      langues: UI_LOCALES,
      defaut: coerceUiLocale(profile?.ui_locale),
    });

    // ── L'écoute, avant la parole ────────────────────────────────────────────
    // On dépouille le dernier message du recruteur AVANT de décider quoi lui
    // dire. L'ordre est irréductible : c'est la fraîcheur de la fiche au moment
    // de choisir la suite qui sépare une écoute d'un questionnaire déroulé.
    //
    // Seulement en CONCEPTION : en mode ajustement, la conversation porte sur
    // des étapes à retoucher, pas sur le métier du recruteur — y faire tourner
    // l'extraction serait un appel payé par tour pour ne rien apprendre.
    const enConception = !etat.existe;
    const fiche = enConception
      ? await extraireDecouverte({ fiche: decouverte, fil, titrePoste: job.title })
      : decouverte;

    const system = buildSystemPrompt({
      title: job.title,
      skillsStr,
      companyContext: profile?.company_ai_context,
      blocEtat: etat.bloc,
      blocFiche: enConception ? construireFicheDecouverte(fiche) : null,
      experienceExiste: etat.existe,
      langue,
    });

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });

    // L'outil de régénération n'est proposé que s'il y a quelque chose à
    // régénérer : exposer un outil inapplicable, c'est s'exposer à le voir
    // appelé sur une étape 1 qui n'existe pas.
    const tools = etat.existe ? [REGENERATE_STEP_TOOL, GENERATE_TOOL] : [GENERATE_TOOL];

    // ── Réflexion interne avant chaque réponse ───────────────────────────────
    // Une écoute qui suit les fils plutôt qu'un script demande de peser, à
    // chaque tour, ce que la dernière réponse contenait vraiment et ce qu'il
    // reste à demander. Sans cet espace, le modèle retombe sur la question
    // suivante de sa liste implicite — le comportement même qu'on corrige.
    //
    // Le compromis n'est pas celui du parcours candidat : le recruteur conçoit
    // son offre, il n'est pas chronométré. Il coûte quand même une dizaine de
    // secondes par tour, d'où l'interrupteur.
    //
    // `display: "omitted"` : le client ne rend que les blocs `text`
    // (extractText), donc un résumé de raisonnement serait stocké dans le fil et
    // REPAYÉ en entrée à chaque tour suivant, sans que personne ne le lise.
    //
    // Sonnet 5.5 ne coupe plus la réflexion (`disabled` = 400) et refuse
    // `temperature`. L'interrupteur ne choisit donc plus entre réfléchir ou
    // non, mais entre "medium" et "low" : au plus bas, le modèle saute la
    // réflexion sur la plupart des messages simples.
    //
    // `block_binding: drop_block` : depuis Sonnet 5.5, un bloc de réflexion
    // n'est valide que si tout ce qui le précède (system, outils, messages)
    // est resté identique octet pour octet. Ici rien ne l'est : le prompt
    // système réinjecte la fiche et les étapes à chaque tour, et bornerFil
    // coupe le début du fil. Sans ce réglage, l'API peut refuser (400) chaque
    // tour qui renvoie un ancien bloc ; avec, elle écarte ces blocs et répond.
    const reflechit = process.env.ONBORD_REFLEXION_CHAT !== "0";
    const currentResponse = await anthropic.beta.messages.create({
      model: "claude-sonnet-5-5",
      betas: ["thinking-binding-controls-2026-08-01"],
      // La réflexion se prend sur ce plafond : à 1200, le modèle pouvait
      // dépenser son budget à réfléchir et rendre un message vide.
      max_tokens: 4000,
      thinking: {
        type: "adaptive",
        display: "omitted",
        block_binding: { prefix_mismatch_behavior: "drop_block" },
      },
      // `effort: "medium"` borne la réflexion. Au niveau "high", elle a fait
      // dépasser 16 000 tokens à la génération et tronqué sa réponse ; un
      // message de chat n'a pas plus besoin de délibérer.
      output_config: { effort: reflechit ? "medium" : "low" },
      system,
      // Le fil complet est conservé en base, mais seul son extrémité est
      // renvoyée au modèle : c'est ce qui est facturé à chaque tour, et l'état
      // qui compte vraiment (les étapes) est réinjecté ci-dessus depuis la base.
      messages: bornerFil(fil, MAX_MESSAGES_MODELE),
      tools,
    });

    const filApres = [...fil, { role: "assistant", content: currentResponse.content }];
    // Une seule écriture pour les deux : la fiche n'est enregistrée qu'une fois
    // le tour abouti. Un échec en amont laisse la fiche d'avant, et le message
    // du recruteur sera redépouillé au prochain essai — plutôt qu'une fiche
    // avancée sur un tour que le recruteur n'a jamais vu.
    // En mode ajustement, `fiche` vaut la valeur relue : on la réécrit à
    // l'identique plutôt que d'ajouter un chemin d'écriture de plus.
    await enregistrerFil(supabase, jobId, filApres, fiche ?? undefined);

    // Décision d'agir : on N'EXÉCUTE PAS ici (appeler une server action
    // "use server" depuis un route handler échoue en Next 16). On renvoie
    // l'intention au client, qui déclenche la server action et nous renvoie le
    // tool_result. Chemin éprouvé par la génération complète, réemployé tel quel
    // pour la régénération d'étape.
    if (currentResponse.stop_reason === "tool_use") {
      const gen = currentResponse.content.find((c) => c.type === "tool_use" && c.name === "generate_experience");
      if (gen) {
        return Response.json({
          message: currentResponse,
          messages: filApres,
          pendingGenerate: { toolUseId: gen.id, brief: gen.input?.brief || "" },
        });
      }
      const regen = currentResponse.content.find((c) => c.type === "tool_use" && c.name === "regenerate_step");
      if (regen) {
        return Response.json({
          message: currentResponse,
          messages: filApres,
          pendingRegenerate: {
            toolUseId: regen.id,
            stepNumber: regen.input?.step_number,
            instruction: regen.input?.instruction || "",
          },
        });
      }
    }

    return Response.json({ message: currentResponse, messages: filApres });
  } catch (error) {
    console.error("Chat API error:", error);
    const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
    return Response.json({ error: errorMessage }, { status: 500 });
  }
}
