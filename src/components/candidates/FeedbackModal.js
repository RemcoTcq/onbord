"use client";

// Fenêtre Feedback de la fiche candidat. Deux clics une fois la décision prise :
// ouvrir, puis « Envoyer ». Le texte est modifiable jusque-là ; une fois parti,
// il se relit en lecture seule, tel qu'il a été envoyé.

import { useState, useEffect } from "react";
import { X, Loader2, Send, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { LOCALE_LABELS } from "@/lib/i18n/config";
import { formatDateLong } from "@/lib/i18n/format";
import { getCandidateFeedback, sendCandidateFeedback } from "@/lib/actions/candidateFeedback";

const compterMots = (s) => s.split(/\s+/).filter(Boolean).length;

export default function FeedbackModal({ isOpen, onClose, candidateId, candidateName, onSent }) {
  const { t, locale } = useI18n();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  // La fiche ne monte la fenêtre qu'ouverte, et la démonte à la fermeture :
  // chaque ouverture repart de l'état initial (chargement), sans remise à zéro.
  // La rédaction part au clic sur la décision : ouvrir la fenêtre juste après
  // tombe sur « generating ». On redemande alors toutes les quelques secondes,
  // sans relancer de rédaction (le serveur tient un verrou), jusqu'à ~3 min.
  useEffect(() => {
    if (!isOpen) return;
    let annule = false;
    let minuteur;
    let essais = 0;
    const charger = () => getCandidateFeedback(candidateId).then((res) => {
      if (annule) return;
      if (res.success && res.state === "generating" && essais++ < 45) {
        minuteur = setTimeout(charger, 4000);
        return;
      }
      if (res.success && res.state !== "generating") {
        setData(res);
        if (res.state === "draft") { setSubject(res.subject || ""); setBody(res.body || ""); }
      } else {
        setError(t("dashboard.feedback.loadError"));
      }
      setLoading(false);
    });
    charger();
    return () => { annule = true; clearTimeout(minuteur); };
    // `t` exclu : un changement de langue ne doit pas relancer la génération.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, candidateId]);

  async function handleSend() {
    setSending(true);
    setError(null);
    const res = await sendCandidateFeedback(candidateId, { subject, body });
    setSending(false);
    if (res.success) {
      setData({ success: true, state: "sent", sent: res.sent });
      onSent?.(res.sent.at);
      return;
    }
    const cles = { noEmail: "noEmail", needsDecision: "needsDecision", alreadySentOrNoDraft: "alreadySent", empty: "empty", tooLong: "tooLong" };
    setError(t(`dashboard.feedback.errors.${cles[res.error] || "send"}`));
  }

  if (!isOpen) return null;

  const etat = data?.state;
  const peutEnvoyer = etat === "draft" && !!data.to && subject.trim() && body.trim() && !sending;

  return (
    <div style={{
      position: "fixed", inset: 0, backgroundColor: "rgba(0, 0, 0, 0.5)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem",
    }}>
      <div className="card" style={{
        width: "100%", maxWidth: "680px", background: "var(--background)", borderRadius: "12px",
        overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: "90vh",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)", padding: 0,
      }}>
        <div style={{
          padding: "1.25rem 1.5rem", borderBottom: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--card)",
        }}>
          <div>
            <h2 style={{ fontSize: "16px", fontWeight: "700", margin: 0 }}>
              {t("dashboard.feedback.title", { name: candidateName })}
            </h2>
            {etat === "draft" && (
              <p style={{ fontSize: "12px", color: "var(--muted-foreground)", margin: "4px 0 0" }}>
                {t(`dashboard.feedback.version.${data.version}`)}
                {" · "}
                {t("dashboard.feedback.localeNotice", { locale: LOCALE_LABELS[data.locale] })}
              </p>
            )}
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: "4px" }} aria-label={t("dashboard.feedback.close")}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: "1.5rem", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "1rem" }}>
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "3rem 0", gap: "1rem", color: "var(--muted-foreground)" }}>
              <Loader2 size={28} className="spin" style={{ color: "var(--primary)" }} />
              <p style={{ fontSize: "14px", margin: 0 }}>{t("dashboard.feedback.loading")}</p>
            </div>
          ) : etat === "needsDecision" ? (
            <Notice>{t("dashboard.feedback.needsDecision")}</Notice>
          ) : etat === "notScored" ? (
            <Notice>{t("dashboard.feedback.notScored")}</Notice>
          ) : etat === "noMaterial" ? (
            <Notice>{t("dashboard.feedback.noMaterial")}</Notice>
          ) : etat === "sent" ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#166534" }}>
                <CheckCircle2 size={16} />
                {t("dashboard.feedback.sentOn", { date: formatDateLong(data.sent.at, locale), email: data.sent.to })}
              </div>
              <Champ label={t("dashboard.feedback.subject")}>
                <div style={{ fontSize: "14px", fontWeight: "600" }}>{data.sent.subject}</div>
              </Champ>
              <div style={{
                whiteSpace: "pre-wrap", fontSize: "14px", lineHeight: "1.6", padding: "1rem",
                border: "1px solid var(--border)", borderRadius: "8px", background: "var(--card)",
              }}>
                {data.sent.body}
              </div>
            </>
          ) : etat === "draft" ? (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 12px", fontSize: "12px" }}>
                <span style={{ color: "var(--muted-foreground)" }}>{t("dashboard.feedback.to")}</span>
                <span>{data.to || <em style={{ color: "#991b1b" }}>{t("dashboard.feedback.errors.noEmail")}</em>}</span>
                <span style={{ color: "var(--muted-foreground)" }}>{t("dashboard.feedback.from")}</span>
                <span>{data.from}</span>
                <span style={{ color: "var(--muted-foreground)" }}>{t("dashboard.feedback.replyTo")}</span>
                <span>{data.replyTo}</span>
              </div>

              {data.warnings?.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {data.warnings.map((w) => (
                    <div key={w} style={{ display: "flex", gap: "8px", fontSize: "12px", color: "#92400e", background: "#fef3c7", padding: "8px 10px", borderRadius: "6px" }}>
                      <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: "1px" }} />
                      {t(`dashboard.feedback.warnings.${w}`)}
                    </div>
                  ))}
                </div>
              )}

              <Champ label={t("dashboard.feedback.subject")}>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  maxLength={200}
                  className="input-field"
                  style={{ width: "100%", fontSize: "14px" }}
                />
              </Champ>
              <Champ label={t("dashboard.feedback.message")} aside={t("dashboard.feedback.words", { count: compterMots(body) })}>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  maxLength={6000}
                  rows={14}
                  style={{
                    width: "100%", padding: "1rem", borderRadius: "8px", border: "1px solid var(--border)",
                    fontSize: "14px", lineHeight: "1.6", fontFamily: "inherit", resize: "vertical",
                    backgroundColor: "var(--background)", color: "var(--foreground)",
                  }}
                />
              </Champ>
            </>
          ) : null}

          {error && (
            <div style={{ padding: "0.75rem 1rem", background: "#fee2e2", color: "#991b1b", borderRadius: "8px", fontSize: "13px" }}>
              {error}
            </div>
          )}
        </div>

        <div style={{
          padding: "1rem 1.5rem", borderTop: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "0.75rem", background: "var(--card)",
        }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>{t("dashboard.feedback.close")}</button>
          {etat === "draft" && (
            <button
              className="btn btn-primary btn-sm"
              onClick={handleSend}
              disabled={!peutEnvoyer}
              style={{ display: "flex", alignItems: "center", gap: "6px" }}
            >
              {sending ? <Loader2 size={14} className="spin" /> : <Send size={14} />}
              {sending ? t("dashboard.feedback.sending") : t("dashboard.feedback.send")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Notice({ children }) {
  return (
    <div style={{ display: "flex", gap: "10px", padding: "1rem", background: "var(--secondary)", borderRadius: "8px", fontSize: "14px", lineHeight: "1.5" }}>
      <Info size={18} style={{ flexShrink: 0, color: "var(--muted-foreground)", marginTop: "1px" }} />
      <span>{children}</span>
    </div>
  );
}

function Champ({ label, aside, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", fontWeight: "700", color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        <span>{label}</span>
        {aside && <span style={{ textTransform: "none", fontWeight: "500", letterSpacing: 0 }}>{aside}</span>}
      </div>
      {children}
    </div>
  );
}
