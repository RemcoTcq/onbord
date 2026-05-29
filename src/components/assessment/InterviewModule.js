"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Send, Loader2, Bot, MessageSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function InterviewModule({ candidate, job, onComplete, onBack }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [interviewEnded, setInterviewEnded] = useState(false);
  const [aiError, setAiError] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const hasStarted = useRef(false);
  const cheatEventsRef = useRef([]);
  const lastQuestionTimeRef = useRef(null);

  useEffect(() => {
    initInterview();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function initInterview() {
    setLoading(true);
    const supabase = createClient();
    const { data: fresh } = await supabase
      .from("candidates")
      .select("interview_transcript, status")
      .eq("id", candidate.id)
      .single();

    if (fresh?.status === "interview_completed") {
      setInterviewEnded(true);
      if (fresh.interview_transcript?.length > 0) setMessages(fresh.interview_transcript);
      setLoading(false);
      return;
    }

    if (fresh?.interview_transcript?.length > 0) {
      setMessages(fresh.interview_transcript);
      hasStarted.current = true;
    }
    setLoading(false);
  }

  useEffect(() => {
    if (!loading && messages.length === 0 && !hasStarted.current) {
      hasStarted.current = true;
      sendToAI([]);
    }
  }, [loading]);

  function logCheat(event) {
    cheatEventsRef.current.push(event);
    const supabase = createClient();
    supabase.from("candidates").update({ anti_cheat_metrics: cheatEventsRef.current }).eq("id", candidate.id).then(() => {});
  }

  async function saveTranscript(msgs) {
    const supabase = createClient();
    await supabase.from("candidates").update({ interview_transcript: msgs }).eq("id", candidate.id);
  }

  async function sendToAI(currentMessages) {
    const criteria = job?.extracted_criteria || {};
    const aiConfig = job?.ai_interview_config || {};
    const customQuestions = criteria.custom_questions || aiConfig.questions || [];
    const contextAbout = aiConfig.context_about || "";
    const contextWhy = aiConfig.context_why || "";
    const contextMatters = aiConfig.context_what_matters || "";

    const customQuestionsSection = customQuestions.length > 0
      ? `\nQuestions obligatoires à poser :\n${customQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n")}`
      : "";

    const contextSection = [contextAbout, contextWhy, contextMatters].filter(Boolean).length > 0
      ? `\nContexte :\n${[contextAbout && `À propos : ${contextAbout}`, contextWhy && `Pourquoi ce recrutement : ${contextWhy}`, contextMatters && `Ce qui compte : ${contextMatters}`].filter(Boolean).join("\n")}`
      : "";

    const intro = (aiConfig.intro_text || "").replace("{title}", criteria.title || job?.title || "ce poste");

    const systemPrompt = `Vous êtes Leo, recruteur IA chez Onbord. Vous menez un entretien pour le poste : ${criteria.title || job?.title || "Poste"}.
Candidat : ${candidate.first_name} ${candidate.last_name}.
Compétences techniques requises : ${criteria.hard_skills?.map((s) => s.name).join(", ") || "Non spécifié"}.
Soft skills à évaluer : ${criteria.soft_skills?.map((s) => s.name).join(", ") || "Non spécifié"}.${contextSection}${customQuestionsSection}
${intro ? `\nMessage d'introduction à utiliser pour votre premier message : "${intro}"` : ""}

Règles d'entretien :
1. Présentez-vous brièvement.
2. Posez UNE SEULE question à la fois.
3. ÉVALUEZ les compétences techniques MAIS AUSSI le comportement.
4. Posez des questions anti-triche : exemples précis et personnels.
5. Challengez les réponses trop vagues.
6. Soyez professionnel et bienveillant.

Après 6-8 échanges, terminez poliment avec le mot-clé [INTERVIEW_TERMINÉE] à la fin.
Formatage : texte brut uniquement, pas d'astérisques, pas d'emojis, pas de listes.`;

    setIsTyping(true);
    try {
      const response = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ system: systemPrompt, messages: currentMessages, candidateId: candidate.id }),
      });
      if (!response.ok) throw new Error("Erreur IA");
      const data = await response.json();
      const aiMessage = data.content;
      const newMessages = [...currentMessages, { role: "assistant", content: aiMessage }];
      setMessages(newMessages);
      setAiError(false);
      lastQuestionTimeRef.current = Date.now();
      await saveTranscript(newMessages);
      if (aiMessage.includes("[INTERVIEW_TERMINÉE]")) {
        setInterviewEnded(true);
        const supabase = createClient();
        await supabase.from("candidates").update({ status: "interview_completed" }).eq("id", candidate.id);
      }
    } catch (err) {
      console.error("AI error:", err);
      setAiError(true);
      hasStarted.current = false;
    } finally {
      setIsTyping(false);
    }
  }

  async function handleSend() {
    if (!input.trim() || sending || isTyping || interviewEnded) return;
    if (lastQuestionTimeRef.current) {
      const t = Math.round((Date.now() - lastQuestionTimeRef.current) / 1000);
      logCheat({ type: "response_time", time_seconds: t, timestamp: new Date().toISOString() });
      lastQuestionTimeRef.current = null;
    }
    const msg = input.trim();
    setInput("");
    setSending(true);
    const newMessages = [...messages, { role: "user", content: msg }];
    setMessages(newMessages);
    await saveTranscript(newMessages);
    try {
      await sendToAI(newMessages);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Désolé, une erreur est survenue. Veuillez réessayer." }]);
    }
    setSending(false);
    inputRef.current?.focus();
  }

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <Loader2 size={32} style={{ color: "var(--primary)", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "var(--background)" }}>
      {/* Header */}
      <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)", background: "var(--card)", display: "flex", alignItems: "center", gap: "12px" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", padding: "4px", display: "flex" }}>
          <ArrowLeft size={18} />
        </button>
        <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "var(--primary)", color: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Bot size={20} />
        </div>
        <div>
          <h1 style={{ fontSize: "14px", fontWeight: "700" }}>Leo — {job?.title || "Poste"}</h1>
          <p style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>Recruteur IA · Onbord</p>
        </div>
      </div>

      {/* Messages */}
      <div className="chat-messages" style={{ flex: 1, overflowY: "auto", padding: "1.5rem" }}>
        {messages.length === 0 && !isTyping && !aiError && (
          <div style={{ textAlign: "center", padding: "3rem", color: "var(--muted-foreground)" }}>
            <Loader2 size={24} style={{ animation: "spin 1s linear infinite", marginBottom: "0.5rem" }} />
            <p style={{ fontSize: "14px" }}>Leo prépare votre entretien…</p>
          </div>
        )}
        {messages.length === 0 && !isTyping && aiError && (
          <div style={{ textAlign: "center", padding: "3rem" }}>
            <p style={{ color: "var(--muted-foreground)", marginBottom: "1rem", fontSize: "14px" }}>Une erreur est survenue.</p>
            <button className="btn btn-primary btn-sm" onClick={() => { hasStarted.current = false; sendToAI([]); }}>
              Réessayer
            </button>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`chat-bubble ${msg.role}`}>
            {msg.content.replace("[INTERVIEW_TERMINÉE]", "").trim()}
          </div>
        ))}
        {isTyping && (
          <div className="chat-bubble assistant" style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <span style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>Leo écrit</span>
            <Loader2 size={14} style={{ animation: "spin 1s linear infinite", color: "var(--primary)" }} />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Ended */}
      {interviewEnded && (
        <div style={{ padding: "16px 20px", background: "#f0fdf4", borderTop: "1px solid #bbf7d0" }}>
          <p style={{ fontWeight: "700", color: "#166534", marginBottom: "8px", textAlign: "center" }}>
            ✅ Assessment terminé
          </p>
          <button
            onClick={onComplete}
            style={{ width: "100%", padding: "10px", borderRadius: "var(--radius)", background: "#22c55e", color: "white", border: "none", fontWeight: "700", cursor: "pointer", fontSize: "14px" }}
          >
            Retour à l'assessment
          </button>
        </div>
      )}

      {/* Input */}
      {!interviewEnded && (
        <div className="chat-input-area">
          <div className="chat-input-wrapper">
            <input
              ref={inputRef}
              className="input-field"
              placeholder="Écrivez votre réponse…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              onPaste={() => logCheat({ type: "paste", timestamp: new Date().toISOString() })}
              disabled={sending || isTyping}
              style={{ flex: 1 }}
            />
            <button className="btn btn-primary btn-icon" onClick={handleSend} disabled={sending || isTyping || !input.trim()}>
              {sending || isTyping ? <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> : <Send size={18} />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
