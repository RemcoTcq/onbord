"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, X, PlusCircle } from "lucide-react";
import { addTestToMyAssessments, selectQuestionsForJob } from "@/lib/actions/assessment";
import { createCustomRequestAndNotify } from "@/lib/actions/custom-requests";
import { useToast } from "@/components/ui/Toast";

export default function AssessmentChatCreator({ onClose, context = "global", jobId = null, jobData = null, standalone = false, initialPrompt = "", onTestCreated, onGenerated }) {
  const [messages, setMessages] = useState(() => {
    if (standalone && initialPrompt) {
      return [];
    }

    if (context === "job" && jobData) {
      const role = jobData.title || jobData.role || "ce poste";
      return [
        { role: "assistant", content: [{ type: "text", text: `On conçoit ensemble l'expérience de présélection pour ${role}. Dites-moi votre intention en quelques mots — par ex. le type de mise en situation qui compte le plus, le ton attendu, ou le profil de client typique. Je vous poserai quelques questions puis je génère.` }] }
      ];
    }

    return [
      { role: "assistant", content: [{ type: "text", text: "Bonjour ! On conçoit ensemble l'expérience de présélection. Décrivez votre besoin en langage libre." }] }
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
        throw new Error(errData.error || "Erreur de communication avec l'assistant.");
      }

      const data = await res.json();
      
      // Update history with any intermediate tool calls if present
      if (data.messages && data.messages.length > newMessages.length) {
        setMessages([...data.messages, { role: "assistant", content: data.message.content }]);
      } else {
        setMessages([...newMessages, { role: "assistant", content: data.message.content }]);
      }

      // Le chat a déclenché la génération de l'expérience → le parent ouvre/
      // rafraîchit l'écran de relecture (flow chat-first, étapes B→C).
      if (data.generated && onGenerated) onGenerated();

    } catch (err) {
      console.error("Chat Error:", err);
      toast(err.message || "Erreur lors de l'envoi du message", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!input.trim() || loading) return;
    const msg = input;
    setInput("");
    await submitMessage(msg, messages);
  };

  useEffect(() => {
    if (initialPrompt && !hasInitialized.current) {
      hasInitialized.current = true;
      submitMessage(initialPrompt, messages);
    }
  }, [initialPrompt]);

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
        toast("Demande enregistrée avec succès !");
        if (onTestCreated) onTestCreated({ custom: true, role, skills });
        
        const currentMessages = [...messages];
        const lastMsg = currentMessages[currentMessages.length - 1];
        const toolResults = [];
        
        if (lastMsg?.role === 'assistant' && Array.isArray(lastMsg.content)) {
          lastMsg.content.filter(c => c.type === 'tool_use').forEach(t => {
            toolResults.push({
              type: "tool_result",
              tool_use_id: t.id,
              content: t.id === toolUseId ? "L'utilisateur a cliqué sur 'Je confirme'. L'action a été exécutée avec succès en base de données et l'équipe a été notifiée." : "Action ignorée."
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
        toast(res.error || "Erreur lors de la demande", "error");
      }
    } catch (err) {
      toast("Erreur inattendue", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAddConfirm = async (toolUseId, testId) => {
    try {
      setLoading(true);
      const res = await addTestToMyAssessments(testId);
      if (res.success) {
        toast("Test ajouté à Mes Assessments !");

        // Auto-lier le test au job quand on est en contexte job
        if (context === "job" && jobId) {
          const syncRes = await selectQuestionsForJob(jobId, testId);
          if (syncRes.success) {
            toast("Test attaché à l'offre avec succès !");
          } else {
            toast("Test ajouté mais erreur lors de la liaison à l'offre", "error");
          }
        }

        if (onTestCreated) onTestCreated(testId);
        
        const currentMessages = [...messages];
        const lastMsg = currentMessages[currentMessages.length - 1];
        const toolResults = [];
        
        if (lastMsg?.role === 'assistant' && Array.isArray(lastMsg.content)) {
          lastMsg.content.filter(c => c.type === 'tool_use').forEach(t => {
            toolResults.push({
              type: "tool_result",
              tool_use_id: t.id,
              content: t.id === toolUseId ? "Le test a été ajouté avec succès aux assessments de l'utilisateur et lié à l'offre." : "Action ignorée."
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
        toast(res.error || "Erreur lors de l'ajout", "error");
      }
    } catch (err) {
      toast("Erreur inattendue", "error");
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
          <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600', color: 'var(--primary)' }}>Création sur-mesure requise</h4>
          <p style={{ margin: '0 0 8px 0', fontSize: '14px' }}><strong>Poste :</strong> {role}</p>
          <p style={{ margin: '0 0 8px 0', fontSize: '14px' }}><strong>Compétences :</strong> {skills?.join(', ')}</p>
          <p style={{ margin: '0 0 16px 0', fontSize: '14px' }}><strong>Résumé :</strong> {summary}</p>
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
              Confirmer la demande
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
              Annuler
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
          <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600', color: 'var(--primary)' }}>Test trouvé !</h4>
          <p style={{ margin: '0 0 16px 0', fontSize: '14px' }}><strong>Test sélectionné :</strong> {testName}</p>
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
              Ajouter à mes assessments
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
              Non merci
            </button>
          </div>
        </div>
      );
    }
    return null;
  };

  const renderMessages = () => {
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
          
          {loading && (
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
              placeholder={pendingToolUse ? "Veuillez confirmer ou annuler l'action ci-dessus..." : "Tapez votre message..."}
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
            <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>Expert Assessment</h3>
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
            placeholder={pendingToolUse ? "Veuillez confirmer l'action..." : "RǸpondre..."}
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
