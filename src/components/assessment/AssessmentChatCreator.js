"use client";

import { useT } from "@/lib/i18n/I18nProvider";
import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, X, PlusCircle, Check, Sparkles } from "lucide-react";
import { addTestToMyAssessments, selectQuestionsForJob } from "@/lib/actions/assessment";
import { getExperienceChat, resetExperienceChat } from "@/lib/actions/experienceChat";
import { regenerateStepByNumber } from "@/lib/actions/experience";
import { createCustomRequestAndNotify } from "@/lib/actions/custom-requests";
import GenerationFeed, { streamExperienceGeneration, translateFeedError } from "./GenerationFeed";
import { useToast } from "@/components/ui/Toast";

// Message d'ouverture quand une expérience existe déjà mais qu'aucune
// conversation n'a été enregistrée — le cas de tous les parcours générés avant
// que le fil ne soit persisté, et celui d'un fil remis à zéro.
// Il énonce l'état plutôt que de le sous-entendre : c'est ce que le recruteur
// venait vérifier en rouvrant le panneau.
// `titrePoste` plutôt que l'objet jobData : une chaîne se compare par valeur,
// donc l'effet de chargement ne se redéclenche pas à chaque rechargement de
// l'offre — un refetch y écraserait le fil en cours de frappe.
// `t` en paramètre : cette fonction est appelée depuis un effet du composant,
// qui l'a en portée. La liste des titres, elle, n'est PAS traduite — ce sont
// les intitulés d'étapes écrits par le modèle dans la langue de l'offre.
function accueilAjustement(t, etat, titrePoste) {
  const role = titrePoste || t("dashboard.chatCreator.thisRole");
  const liste = (etat.titres || []).map((titre, i) => `${i + 1}. ${titre}`).join("\n");
  const entete = t("dashboard.chatCreator.alreadyGenerated", {
    count: etat.nbEtapes,
    role,
    version: etat.version,
    published: etat.statut === "published" ? t("dashboard.chatCreator.publishedSuffix") : "",
  });
  return `${entete}\n\n${liste}\n\n${t("dashboard.chatCreator.adjustHint")}`;
}

export default function AssessmentChatCreator({ onClose, context = "global", jobId = null, jobData = null, standalone = false, initialPrompt = "", onTestCreated, onGenerated, onStepRegenerated, onUserMessage }) {
  const t = useT();
  const [genActive, setGenActive] = useState(false); // génération en cours
  const [genEvents, setGenEvents] = useState([]);    // flux réel poussé par le serveur
  const [regenActive, setRegenActive] = useState(null); // n° d'étape en cours de réécriture
  const [regenFaites, setRegenFaites] = useState([]);   // trace des réécritures du tour
  const [filCharge, setFilCharge] = useState(!jobId);   // fil persisté chargé ?
  const [etatExp, setEtatExp] = useState(null);         // état de l'expérience en base
  const notifiedUserMsg = useRef(false);
  const titrePoste = jobData?.title || jobData?.role || "";
  const [messages, setMessages] = useState(() => {
    if (standalone && initialPrompt) {
      return [];
    }

    if (context === "job" && jobData) {
      const role = jobData.title || jobData.role || t("dashboard.chatCreator.thisRole");
      return [
        { role: "assistant", content: [{ type: "text", text: t("dashboard.chatCreator.greetingForJob", { role }) }] }
      ];
    }

    return [
      { role: "assistant", content: [{ type: "text", text: t("dashboard.chatCreator.greeting") }] }
    ];
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const { toast } = useToast();
  const hasInitialized = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Le fil vit en base, plus dans le seul état React : fermer le panneau ne
  // l'efface plus. On le recharge au montage, avec l'état de l'expérience —
  // deux informations dont le composant a besoin au même instant, d'où le seul
  // aller-retour.
  useEffect(() => {
    if (!jobId) return;
    let annule = false;
    (async () => {
      const res = await getExperienceChat(jobId);
      if (annule) return;
      if (res?.success) {
        setEtatExp(res.etat);
        if (res.messages?.length) setMessages(res.messages);
        else if (res.etat?.existe) {
          setMessages([{ role: "assistant", content: [{ type: "text", text: accueilAjustement(t, res.etat, titrePoste) }] }]);
        }
      }
      setFilCharge(true);
    })();
    return () => { annule = true; };
    // Pas de `t` en dépendance : cet effet écrit dans le fil. Le relancer à
    // un changement de langue écraserait un message en cours de frappe, ce que
    // le passage par `titrePoste` (une chaîne) cherchait déjà à éviter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, titrePoste]);

  const submitMessage = async (msgText, currentMessages, isToolResult = false) => {
    let newMessages;
    if (isToolResult) {
      newMessages = currentMessages;
    } else {
      const lastMsg = currentMessages[currentMessages.length - 1];
      let content = [];
      
      if (lastMsg?.role === 'assistant' && Array.isArray(lastMsg.content)) {
        const toolUses = lastMsg.content.filter(c => c.type === 'tool_use');
        toolUses.forEach(t => {
          content.push({ type: "tool_result", tool_use_id: t.id, content: "Ignoré." });
        });
      }
      
      content.push({ type: "text", text: msgText });
      const userMsg = { role: "user", content };
      newMessages = [...currentMessages, userMsg];
    }
    
    setMessages(newMessages);
    setLoading(true);

    try {
      const res = await fetch("/api/chat/assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, jobContext: jobData, jobId }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || t("dashboard.chatCreator.connectionError"));
      }

      const data = await res.json();
      
      // La route renvoie toujours le fil complet, réponse de l'assistant
      // comprise (c'est ce qu'elle vient d'enregistrer). Plus de reconstruction
      // côté client : les trois branches d'avant divergeaient du fil persisté.
      const fil = data.messages || [...newMessages, { role: "assistant", content: data.message.content }];
      setMessages(fil);

      if (data.pendingGenerate) await runGeneration(data.pendingGenerate, fil);
      else if (data.pendingRegenerate) await runRegeneration(data.pendingRegenerate, fil);

    } catch (err) {
      console.error("Chat Error:", err);
      toast(err.message || t("dashboard.chatCreator.sendError"), "error");
    } finally {
      setLoading(false);
    }
  };

  // Lance la génération en STREAMING : chaque ligne du flux est une étape réelle
  // du pipeline serveur, affichée au moment où elle se produit. Le feed n'avance
  // donc pas à vitesse constante — une étape lente se voit.
  const runGeneration = async (pending, baseMessages) => {
    setGenActive(true);
    setGenEvents([]);

    const res = await streamExperienceGeneration(
      jobId,
      pending.brief || "",
      (event) => setGenEvents((prev) => [...prev, event])
    );
    setGenActive(false);

    if (res.success && onGenerated) onGenerated();
    else if (!res.success) toast(translateFeedError(t, res.error) || t("dashboard.chatCreator.generationFailed"), "error");

    // Renvoie le résultat de l'outil pour la réponse de clôture de l'assistant.
    const toolResultMsg = {
      role: "user",
      content: [{
        type: "tool_result",
        tool_use_id: pending.toolUseId,
        is_error: !res.success,
        content: res.success
          ? "Expérience générée avec succès. L'écran de relecture est maintenant ouvert pour le recruteur."
          : `Échec de la génération : ${res.error || "erreur inconnue"}.`,
      }],
    };
    await submitMessage(null, [...baseMessages, toolResultMsg], true);
  };

  // Réécriture d'UNE étape. Même circuit que la génération complète — la route
  // décide, le client exécute et renvoie le tool_result — mais sans streaming :
  // un appel unique de quelques secondes n'a pas de déroulé à montrer.
  const runRegeneration = async (pending, baseMessages) => {
    setRegenActive(pending.stepNumber);

    const res = await regenerateStepByNumber(jobId, pending.stepNumber, pending.instruction);
    setRegenActive(null);

    if (res.success) {
      setRegenFaites((prev) => [...prev, { n: res.position ?? pending.stepNumber, titre: res.step?.title, resume: res.resume }]);
      // Même rappel que la génération : l'écran de relecture doit montrer
      // l'étape réécrite, pas celle d'avant. Repli sur onGenerated pour les
      // appelants qui n'ont qu'un seul rechargement à proposer.
      (onStepRegenerated || onGenerated)?.();
    } else {
      toast(res.error || t("dashboard.chatCreator.rewriteFailed"), "error");
    }

    const toolResultMsg = {
      role: "user",
      content: [{
        type: "tool_result",
        tool_use_id: pending.toolUseId,
        is_error: !res.success,
        content: res.success
          ? `Étape ${res.position} réécrite en place, les autres étapes n'ont pas bougé. Nouveau titre : « ${res.step?.title || ""} ». Ce qui a changé : ${res.resume || "non précisé"}.`
          : `Échec de la réécriture : ${res.error || "erreur inconnue"}.`,
      }],
    };
    await submitMessage(null, [...baseMessages, toolResultMsg], true);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!input.trim() || loading) return;
    const msg = input;
    setInput("");
    if (!notifiedUserMsg.current) { notifiedUserMsg.current = true; onUserMessage?.(); }
    await submitMessage(msg, messages);
  };

  // Le prompt d'entrée (arrivée depuis l'écran Assessments) ne s'auto-envoie
  // qu'au tout premier échange. Sans l'attente du fil ET sans la vérification
  // qu'aucun message du recruteur n'existe déjà, chaque réouverture du panneau
  // le rejouerait — un message envoyé, et payé, à chaque visite.
  useEffect(() => {
    const aDejaParle = messages.some((m) => m.role === "user");
    if (filCharge && initialPrompt && !hasInitialized.current && !aDejaParle) {
      hasInitialized.current = true;
      submitMessage(initialPrompt, messages);
    }
  }, [initialPrompt, filCharge]);

  // Repart d'une conversation vierge. L'expérience générée n'est PAS touchée :
  // c'est le fil qui s'est enlisé, pas le parcours.
  const handleReset = async () => {
    if (!jobId || loading || genActive) return;
    if (!confirm(t("dashboard.chatCreator.clearConfirm"))) return;
    const res = await resetExperienceChat(jobId);
    if (!res.success) { toast(res.error || t("dashboard.chatCreator.error"), "error"); return; }
    hasInitialized.current = true; // pas de rejeu du prompt d'entrée après un reset
    notifiedUserMsg.current = false;
    setGenEvents([]);
    setRegenFaites([]);
    setMessages(etatExp?.existe
      ? [{ role: "assistant", content: [{ type: "text", text: accueilAjustement(etatExp, titrePoste) }] }]
      : [{ role: "assistant", content: [{ type: "text", text: t("dashboard.chatCreator.cleared") }] }]);
  };

  const extractText = (content) => {
    if (Array.isArray(content)) {
      return content.filter(c => c.type === 'text').map(c => c.text).join('\n');
    }
    return content;
  };

  const handleCustomConfirm = async (toolUseId, role, skills, summary) => {
    try {
      setLoading(true);
      const res = await createCustomRequestAndNotify(role, skills, summary);
      if (res.success) {
        toast(t("dashboard.chatCreator.requestSaved"));
        if (onTestCreated) onTestCreated({ custom: true, role, skills });
        
        const currentMessages = [...messages];
        const lastMsg = currentMessages[currentMessages.length - 1];
        const toolResults = [];
        
        if (lastMsg?.role === 'assistant' && Array.isArray(lastMsg.content)) {
          lastMsg.content.filter(c => c.type === 'tool_use').forEach(tu => {
            toolResults.push({
              type: "tool_result",
              tool_use_id: tu.id,
              content: tu.id === toolUseId ? "L'utilisateur a cliqué sur 'Je confirme'. L'action a été exécutée avec succès en base de données et l'équipe a été notifiée." : "Action ignorée."
            });
          });
        } else {
          toolResults.push({ type: "tool_result", tool_use_id: toolUseId, content: "L'utilisateur a cliqué sur 'Je confirme'. L'action a été exécutée avec succès en base de données et l'équipe a été notifiée." });
        }

        currentMessages.push({
          role: "user",
          content: toolResults
        });
        
        await submitMessage(null, currentMessages, true);
      } else {
        toast(res.error || t("dashboard.chatCreator.requestError"), "error");
      }
    } catch (err) {
      toast(t("dashboard.chatCreator.unexpectedError"), "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAddConfirm = async (toolUseId, testId) => {
    try {
      setLoading(true);
      const res = await addTestToMyAssessments(testId);
      if (res.success) {
        toast(t("dashboard.chatCreator.testAdded"));

        // Auto-lier le test au job quand on est en contexte job
        if (context === "job" && jobId) {
          const syncRes = await selectQuestionsForJob(jobId, testId);
          if (syncRes.success) {
            toast(t("dashboard.chatCreator.testAttached"));
          } else {
            toast(t("dashboard.chatCreator.testAttachError"), "error");
          }
        }

        if (onTestCreated) onTestCreated(testId);
        
        const currentMessages = [...messages];
        const lastMsg = currentMessages[currentMessages.length - 1];
        const toolResults = [];
        
        if (lastMsg?.role === 'assistant' && Array.isArray(lastMsg.content)) {
          lastMsg.content.filter(c => c.type === 'tool_use').forEach(tu => {
            toolResults.push({
              type: "tool_result",
              tool_use_id: tu.id,
              content: tu.id === toolUseId ? "Le test a été ajouté avec succès aux assessments de l'utilisateur et lié à l'offre." : "Action ignorée."
            });
          });
        } else {
          toolResults.push({ type: "tool_result", tool_use_id: toolUseId, content: "Le test a été ajouté avec succès aux assessments de l'utilisateur et lié à l'offre." });
        }

        currentMessages.push({
          role: "user",
          content: toolResults
        });
        await submitMessage(null, currentMessages, true);
      } else {
        toast(res.error || t("dashboard.chatCreator.addError"), "error");
      }
    } catch (err) {
      toast(t("dashboard.chatCreator.unexpectedError"), "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelTool = async (toolUseId) => {
    const currentMessages = [...messages];
    const lastMsg = currentMessages[currentMessages.length - 1];
    const toolResults = [];
    
    if (lastMsg?.role === 'assistant' && Array.isArray(lastMsg.content)) {
      lastMsg.content.filter(c => c.type === 'tool_use').forEach(t => {
        toolResults.push({
          type: "tool_result",
          tool_use_id: t.id,
          content: t.id === toolUseId ? "L'utilisateur a annulé l'action." : "Action ignorée."
        });
      });
    } else {
      toolResults.push({ type: "tool_result", tool_use_id: toolUseId, content: "L'utilisateur a annulé l'action." });
    }

    currentMessages.push({
      role: "user",
      content: toolResults
    });
    await submitMessage(null, currentMessages, true);
  };

  const lastMessage = messages[messages.length - 1];
  let pendingToolUse = null;
  if (lastMessage?.role === 'assistant' && Array.isArray(lastMessage.content)) {
    pendingToolUse = lastMessage.content.find(c => c.type === 'tool_use' && (c.name === 'propose_custom_creation' || c.name === 'propose_add_assessment'));
  }

  const renderToolCard = (toolUse) => {
    if (toolUse.name === 'propose_custom_creation') {
      const { role, skills, summary } = toolUse.input;
      return (
        <div style={{
          background: 'var(--primary-light, #f0fdf4)',
          padding: '16px',
          borderRadius: '12px',
          border: '1px solid var(--success, #22c55e)',
          marginTop: '8px',
          width: '100%',
          maxWidth: '500px',
          alignSelf: 'flex-start'
        }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600', color: 'var(--primary)' }}>{t("dashboard.chatCreator.customNeeded")}</h4>
          <p style={{ margin: '0 0 8px 0', fontSize: '14px' }}><strong>{t("dashboard.chatCreator.role")}</strong> {role}</p>
          <p style={{ margin: '0 0 8px 0', fontSize: '14px' }}><strong>{t("dashboard.chatCreator.skills")}</strong> {skills?.join(', ')}</p>
          <p style={{ margin: '0 0 16px 0', fontSize: '14px' }}><strong>{t("dashboard.chatCreator.summary")}</strong> {summary}</p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              onClick={() => handleCustomConfirm(toolUse.id, role, skills, summary)}
              disabled={loading}
              style={{
                flex: 1, padding: '10px 16px', background: 'var(--foreground)', color: 'white',
                border: 'none', borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: '500'
              }}
            >
              {t("dashboard.chatCreator.confirmRequest")}
            </button>
            <button 
              onClick={() => handleCancelTool(toolUse.id)}
              disabled={loading}
              style={{
                padding: '10px 16px', background: 'transparent', color: 'var(--foreground)',
                border: '1px solid var(--border)', borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: '500'
              }}
            >
              {t("common.actions.cancel")}
            </button>
          </div>
        </div>
      );
    }
    
    if (toolUse.name === 'propose_add_assessment') {
      const { testId, testName } = toolUse.input;
      return (
        <div style={{
          background: 'var(--primary-light, #f0fdf4)',
          padding: '16px',
          borderRadius: '12px',
          border: '1px solid var(--success, #22c55e)',
          marginTop: '8px',
          width: '100%',
          maxWidth: '500px',
          alignSelf: 'flex-start'
        }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600', color: 'var(--primary)' }}>{t("dashboard.chatCreator.testFound")}</h4>
          <p style={{ margin: '0 0 16px 0', fontSize: '14px' }}><strong>{t("dashboard.chatCreator.testSelected")}</strong> {testName}</p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              onClick={() => handleAddConfirm(toolUse.id, testId)}
              disabled={loading}
              style={{
                flex: 1, padding: '10px 16px', background: 'var(--foreground)', color: 'white',
                border: 'none', borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: '500'
              }}
            >
              {t("dashboard.chatCreator.addToAssessments")}
            </button>
            <button 
              onClick={() => handleCancelTool(toolUse.id)}
              disabled={loading}
              style={{
                padding: '10px 16px', background: 'transparent', color: 'var(--foreground)',
                border: '1px solid var(--border)', borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: '500'
              }}
            >
              {t("dashboard.chatCreator.noThanks")}
            </button>
          </div>
        </div>
      );
    }
    return null;
  };

  const renderMessages = () => {
    if (!filCharge) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
          <Loader2 size={20} className="spin" color="var(--muted-foreground)" />
        </div>
      );
    }
    return messages.map((msg, idx) => {
      if (msg.role !== 'assistant' && msg.role !== 'user') return null;
      if (msg.role === 'user' && msg.content[0]?.type === 'tool_result') return null;

      const isBot = msg.role === 'assistant';
      let toolUse = null;
      if (isBot && Array.isArray(msg.content)) {
        toolUse = msg.content.find(c => c.type === 'tool_use' && (c.name === 'propose_custom_creation' || c.name === 'propose_add_assessment'));
      }
      
      const text = extractText(msg.content);
      if (!text && !toolUse) return null;

      return (
        <div key={idx} style={{
          display: 'flex', 
          flexDirection: 'column',
          alignItems: isBot ? 'flex-start' : 'flex-end', 
          width: '100%',
          marginBottom: '16px'
        }}>
            {text && (
              <div style={{
                background: isBot ? 'transparent' : 'var(--foreground)',
                color: isBot ? 'var(--foreground)' : 'white',
                padding: isBot ? '8px 0' : '12px 16px', 
                borderRadius: isBot ? '0' : '16px',
                fontSize: '15px', lineHeight: '1.6',
                maxWidth: '60%', whiteSpace: 'pre-wrap'
              }}>
                {text}
              </div>
            )}
            
            {toolUse && idx === messages.length - 1 && (
              renderToolCard(toolUse)
            )}
        </div>
      );
    });
  };

  if (standalone) {
    return (
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', 
        background: 'transparent', width: '100%', height: '100%'
      }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column' }}>
          {renderMessages()}

          {/* Le feed reste affiché après coup : c'est la trace de ce qui a été fait. */}
          {genEvents.length > 0 && <GenerationFeed events={genEvents} active={genActive} />}

          {(regenFaites.length > 0 || regenActive !== null) && (
            <div style={{ padding: '4px 0 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {regenFaites.map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12.5, lineHeight: 1.5 }}>
                  <Check size={13} style={{ color: '#166534', flexShrink: 0, marginTop: 2 }} />
                  <span>Étape {r.n} réécrite{r.titre ? ` — « ${r.titre} »` : ''}{r.resume ? ` : ${r.resume}` : ''}</span>
                </div>
              ))}
              {regenActive !== null && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--primary)', fontWeight: 600 }}>
                  <Loader2 size={13} className="spin" />
                  Réécriture de l&apos;étape {regenActive}…
                </div>
              )}
            </div>
          )}

          {loading && !genActive && (
            <div style={{ display: 'flex', width: '100%' }}>
               <div style={{ width: '100%', padding: '8px 0' }}>
                  <Loader2 size={20} className="spin" color="var(--muted-foreground)" />
               </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div style={{ padding: '24px', display: 'flex', justifyContent: 'center', background: 'linear-gradient(to top, var(--background) 80%, transparent)' }}>
          <form onSubmit={handleSubmit} style={{
            display: 'flex', gap: '12px', alignItems: 'center',
            width: '100%', maxWidth: '700px',
            background: 'white', border: '1px solid var(--border)', 
            borderRadius: '24px', padding: '8px 12px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.04)'
          }} className="focus-ring">
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', background: 'transparent',
            padding: '4px 8px'
          }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={pendingToolUse ? t("dashboard.chatCreator.confirmFirst") : t("dashboard.chatCreator.placeholder")}
              style={{
                flex: 1, padding: '8px 4px', border: 'none', background: 'transparent',
                outline: 'none', fontSize: '15px', color: 'var(--foreground)',
                opacity: pendingToolUse ? 0.5 : 1
              }}
              disabled={loading || !!pendingToolUse}
            />
          </div>
          <button type="submit" disabled={loading || !input.trim() || !!pendingToolUse} style={{
            background: 'var(--foreground)', color: 'white', border: 'none',
            borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: (loading || !input.trim() || !!pendingToolUse) ? 'not-allowed' : 'pointer', 
            opacity: (loading || !input.trim() || !!pendingToolUse) ? 0.5 : 1,
            transition: 'all 200ms ease'
          }}>
            <Send size={16} />
          </button>
          </form>
        </div>

        {jobId && filCharge && messages.some((m) => m.role === 'user') && (
          <div style={{ textAlign: 'center', paddingBottom: '12px' }}>
            <button
              type="button"
              onClick={handleReset}
              disabled={loading || genActive}
              style={{
                background: 'transparent', border: 'none', cursor: (loading || genActive) ? 'not-allowed' : 'pointer',
                color: 'var(--muted-foreground)', fontSize: '12px', textDecoration: 'underline',
                opacity: (loading || genActive) ? 0.5 : 1,
              }}
            >
              {t("dashboard.chatCreator.clearConversation")}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{
        background: 'white', width: '500px', height: '600px',
        borderRadius: '12px', display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
      }}>
        <div style={{
          padding: '16px', borderBottom: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bot size={20} color="var(--primary)" />
            <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>{t("dashboard.chatCreator.title")}</h3>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
          {renderMessages()}
          
          {loading && (
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <Loader2 size={16} className="spin" color="var(--muted-foreground)" />
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSubmit} style={{
          padding: '16px', borderTop: '1px solid var(--border)', background: 'white',
          display: 'flex', gap: '12px'
        }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={pendingToolUse
              ? t("dashboard.chatCreator.confirmFirstShort")
              : t("dashboard.chatCreator.placeholderShort")}
            style={{
              flex: 1, padding: '10px 16px', borderRadius: '8px',
              border: '1px solid var(--border)', outline: 'none', fontSize: '14px',
              opacity: pendingToolUse ? 0.5 : 1
            }}
            disabled={loading || !!pendingToolUse}
          />
          <button type="submit" disabled={loading || !input.trim() || !!pendingToolUse} style={{
            background: 'var(--foreground)', color: 'white', border: 'none',
            borderRadius: '8px', width: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: (loading || !input.trim() || !!pendingToolUse) ? 'not-allowed' : 'pointer', 
            opacity: (loading || !input.trim() || !!pendingToolUse) ? 0.5 : 1
          }}>
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}

