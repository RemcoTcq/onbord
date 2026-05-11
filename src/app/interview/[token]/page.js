"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { Send, Loader2, Bot } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import ConsentModal from "@/components/interview/ConsentModal";

export default function InterviewPage() {
  const params = useParams();
  const token = params.token;

  const [candidate, setCandidate] = useState(null);
  const [job, setJob] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [interviewEnded, setInterviewEnded] = useState(false);
  const [hasConsented, setHasConsented] = useState(false);
  const [error, setError] = useState(null);
  const [aiError, setAiError] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const hasStarted = useRef(false);

  useEffect(() => {
    loadInterview();
  }, [token]);

  useEffect(() => {
    if (hasConsented && messages.length === 0 && !loading && !hasStarted.current && candidate) {
      hasStarted.current = true;
      sendToAI([], candidate, job);
    }
  }, [hasConsented, loading, candidate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadInterview() {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: cand, error: candError } = await supabase
        .from("candidates")
        .select("*, jobs(*)")
        .eq("interview_token", token)
        .single();

      if (candError || !cand) {
        setError("Lien d'entretien invalide ou expiré.");
        setLoading(false);
        return;
      }

      setCandidate(cand);
      setJob(cand.jobs);

      if (cand.status === "interview_completed") {
        setInterviewEnded(true);
        if (cand.interview_transcript && cand.interview_transcript.length > 0) {
          setMessages(cand.interview_transcript);
        }
        setHasConsented(true);
        setLoading(false);
        return;
      }

      const transcript = cand.interview_transcript || [];
      if (transcript.length > 0) {
        setMessages(transcript);
        setHasConsented(true);
      } else if (cand.gdpr_consent_at) {
        setHasConsented(true);
      }

    } catch (err) {
      setError("Une erreur est survenue : " + (err.message || "Erreur inconnue"));
    }
    setLoading(false);
  }

  async function saveTranscript(updatedMessages, candidateId) {
    const supabase = createClient();
    await supabase
      .from("candidates")
      .update({ interview_transcript: updatedMessages })
      .eq("id", candidateId);
  }

  async function handleAcceptConsent() {
    if (sending || hasStarted.current) return;
    setSending(true);

    try {
      const supabase = createClient();
      await supabase
        .from("candidates")
        .update({ 
          gdpr_consent_at: new Date().toISOString(),
          status: "interview_started"
        })
        .eq("id", candidate.id);

      setHasConsented(true);
    } catch (err) {
      console.error("Consent error:", err);
    } finally {
      setSending(false);
    }
  }

  async function sendToAI(currentMessages, cand = candidate, jobData = job) {
    const criteria = jobData?.extracted_criteria || {};
    const customQuestions = criteria.custom_questions || [];

    const customQuestionsSection = customQuestions.length > 0
      ? `\nQuestions obligatoires à poser :\n${customQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n")}`
      : "";

    const systemPrompt = `Vous êtes Leo, recruteur IA chez Onbord. Vous menez un entretien pour le poste : ${criteria.title || jobData?.title || "Poste"}.
Candidat : ${cand?.first_name} ${cand?.last_name}.
Compétences techniques requises : ${criteria.hard_skills?.map(s => s.name).join(", ") || "Non spécifié"}.
Soft skills à évaluer : ${criteria.soft_skills?.map(s => s.name).join(", ") || "Non spécifié"}.${customQuestionsSection}

Règles d'entretien :
1. Présentez-vous brièvement.
2. Posez UNE SEULE question à la fois.
3. ÉVALUEZ les compétences techniques MAIS AUSSI le comportement : la clarté, la politesse, la capacité d'écoute et la structure de la pensée.
4. NE VOUS CONTENTEZ PAS de tester les points forts. Identifiez activement les zones d'ombre, les lacunes potentielles ou les points de vigilance par rapport au poste et demandez au candidat de clarifier ces points.
5. Challengez les réponses trop vagues.
6. Soyez professionnel et bienveillant. 

Après 6-8 échanges, terminez poliment avec le mot-clé [INTERVIEW_TERMINÉE] à la fin.
Formatage : texte brut uniquement, pas d'astérisques, pas d'emojis, pas de listes.`;

    setIsTyping(true);
    try {
      const response = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: systemPrompt,
          messages: currentMessages,
          candidateId: cand?.id,
        }),
      });

      if (!response.ok) throw new Error("Erreur IA");

      const data = await response.json();
      const aiMessage = data.content;

      const newMessages = [...currentMessages, { role: "assistant", content: aiMessage }];
      setMessages(newMessages);
      setAiError(false);

      await saveTranscript(newMessages, cand?.id);

      if (aiMessage.includes("[INTERVIEW_TERMINÉE]")) {
        setInterviewEnded(true);
        const supabase = createClient();
        await supabase
          .from("candidates")
          .update({ status: "interview_completed" })
          .eq("id", cand?.id);
      }

      return aiMessage;
    } catch (err) {
      console.error("AI Error:", err);
      setAiError(true);
      hasStarted.current = false;
      throw err;
    } finally {
      setIsTyping(false);
    }
  }

  async function handleSend() {
    if (!input.trim() || sending || isTyping || interviewEnded) return;

    const userMessage = input.trim();
    setInput("");
    setSending(true);

    const newMessages = [...messages, { role: "user", content: userMessage }];
    setMessages(newMessages);

    await saveTranscript(newMessages, candidate?.id);

    try {
      await sendToAI(newMessages);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Désolé, une erreur est survenue. Veuillez réessayer." }]);
    }

    setSending(false);
    inputRef.current?.focus();
  }

  if (loading) return null;

  if (error) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "var(--background)" }}>
        <div className="card" style={{ textAlign: "center", maxWidth: "400px", padding: "3rem" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "0.5rem" }}>Oops</h2>
          <p style={{ color: "var(--muted-foreground)" }}>{error}</p>
        </div>
      </div>
    );
  }

  if (!hasConsented) {
    return <ConsentModal candidate={candidate} job={job} onAccept={handleAcceptConsent} loading={sending} />;
  }

  return (
    <div className="chat-container">
      <div style={{
        padding: "16px 24px", borderBottom: "1px solid var(--border)",
        background: "var(--card)", display: "flex", alignItems: "center", gap: "12px"
      }}>
        <div style={{
          width: "40px", height: "40px", borderRadius: "50%",
          background: "var(--primary)", color: "white",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
        }}>
          <Bot size={22} />
        </div>
        <div>
          <h1 style={{ fontSize: "1rem", fontWeight: "600" }}>Leo — {job?.title || "Poste"}</h1>
          <p style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>Recruteur IA · Onbord</p>
        </div>
      </div>

      <div className="chat-messages">
        {messages.length === 0 && !isTyping && !aiError && (
          <div style={{ textAlign: "center", padding: "3rem", color: "var(--muted-foreground)" }}>
            <Loader2 size={24} style={{ animation: "spin 1s linear infinite", marginBottom: "0.5rem" }} />
            <p style={{ fontSize: "14px" }}>Leo prépare votre entretien...</p>
          </div>
        )}
        {messages.length === 0 && !isTyping && aiError && (
          <div style={{ textAlign: "center", padding: "3rem" }}>
            <p style={{ color: "var(--muted-foreground)", marginBottom: "1rem", fontSize: "14px" }}>Une erreur est survenue. Leo n'a pas pu démarrer.</p>
            <button 
              className="btn btn-primary btn-sm"
              onClick={() => { hasStarted.current = false; sendToAI([], candidate, job); }}
            >
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
            <span style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>Leo est en train d'écrire</span>
            <Loader2 size={14} style={{ animation: "spin 1s linear infinite", color: "var(--primary)" }} />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {interviewEnded && (
        <div style={{ padding: "20px 24px", background: "#f0fdf4", borderTop: "1px solid #bbf7d0", textAlign: "center" }}>
          <p style={{ fontWeight: "600", color: "#166534", marginBottom: "4px" }}>
            ✅ L'entretien est terminé
          </p>
          <p style={{ fontSize: "13px", color: "#15803d" }}>
            Merci pour votre participation ! Vous pouvez maintenant fermer cette page.
          </p>
        </div>
      )}

      {!interviewEnded && hasConsented && (
        <div className="chat-input-area">
          <div className="chat-input-wrapper">
            <input
              ref={inputRef}
              className="input-field"
              placeholder="Écrivez votre réponse..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
              disabled={sending || isTyping}
              style={{ flex: 1 }}
            />
            <button
              className="btn btn-primary btn-icon"
              onClick={handleSend}
              disabled={sending || isTyping || !input.trim()}
            >
              {(sending || isTyping) ? <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> : <Send size={18} />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
