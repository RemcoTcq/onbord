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
    <div className="ds-overlay" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="ds-feedback-titre" className="ds-modal" style={{ width: 680, maxHeight: "90vh" }} onMouseDown={(e) => e.stopPropagation()}>
        <div className="ds-modal-head">
          <div style={{ minWidth: 0 }}>
            <h2 id="ds-feedback-titre" className="ds-h2">
              {t("dashboard.feedback.title", { name: candidateName })}
            </h2>
            {etat === "draft" && (
              <p className="ds-sub" style={{ margin: "2px 0 0" }}>
                {t(`dashboard.feedback.version.${data.version}`)}
                {" · "}
                {t("dashboard.feedback.localeNotice", { locale: LOCALE_LABELS[data.locale] })}
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} className="ds-icon-btn ds-icon-btn-outline" aria-label={t("dashboard.feedback.close")}>
            <X size={16} />
          </button>
        </div>

        <div className="ds-modal-body">
          {loading ? (
            <div className="ds-empty" style={{ padding: "48px 0" }}>
              <Loader2 size={24} style={{ color: "var(--ds-blue)", animation: "spin 1s linear infinite" }} />
              <span>{t("dashboard.feedback.loading")}</span>
            </div>
          ) : etat === "needsDecision" ? (
            <Notice>{t("dashboard.feedback.needsDecision")}</Notice>
          ) : etat === "notScored" ? (
            <Notice>{t("dashboard.feedback.notScored")}</Notice>
          ) : etat === "noMaterial" ? (
            <Notice>{t("dashboard.feedback.noMaterial")}</Notice>
          ) : etat === "sent" ? (
            <>
              <div className="ds-chip ds-chip-green ds-chip-lg" style={{ alignSelf: "flex-start", height: "auto", minHeight: 28, padding: "4px 10px", whiteSpace: "normal" }}>
                <CheckCircle2 size={14} style={{ flex: "none" }} />
                {t("dashboard.feedback.sentOn", { date: formatDateLong(data.sent.at, locale), email: data.sent.to })}
              </div>
              <Champ label={t("dashboard.feedback.subject")}>
                <div style={{ fontWeight: 500 }}>{data.sent.subject}</div>
              </Champ>
              <div className="ds-inset" style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                {data.sent.body}
              </div>
            </>
          ) : etat === "draft" ? (
            <>
              <dl className="ds-inset ds-kv" style={{ padding: 12 }}>
                <div><dt>{t("dashboard.feedback.to")}</dt><dd>{data.to || <em style={{ color: "var(--ds-red)" }}>{t("dashboard.feedback.errors.noEmail")}</em>}</dd></div>
                <div><dt>{t("dashboard.feedback.from")}</dt><dd>{data.from}</dd></div>
                <div><dt>{t("dashboard.feedback.replyTo")}</dt><dd>{data.replyTo}</dd></div>
              </dl>

              {data.warnings?.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {data.warnings.map((w) => (
                    <div key={w} style={{ display: "flex", gap: 8, fontSize: 13, color: "var(--ds-amber-ink)", background: "var(--ds-amber-bg)", padding: "8px 10px", borderRadius: 9 }}>
                      <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 2 }} />
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
                  className="ds-input"
                />
              </Champ>
              <Champ label={t("dashboard.feedback.message")} aside={t("dashboard.feedback.words", { count: compterMots(body) })}>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  maxLength={6000}
                  rows={14}
                  className="ds-textarea"
                  style={{ lineHeight: 1.6, padding: "12px 14px" }}
                />
              </Champ>
            </>
          ) : null}

          {error && (
            <div role="alert" style={{ padding: "10px 12px", background: "var(--ds-red-bg)", color: "var(--ds-red)", borderRadius: 9, fontSize: 13 }}>
              {error}
            </div>
          )}
        </div>

        <div className="ds-modal-foot">
          <button type="button" className="ds-btn ds-btn-ghost" onClick={onClose}>{t("dashboard.feedback.close")}</button>
          {etat === "draft" && (
            <button type="button" className="ds-btn ds-btn-primary" onClick={handleSend} disabled={!peutEnvoyer}>
              {sending ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Send size={14} />}
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
    <div className="ds-inset" style={{ display: "flex", gap: 10, lineHeight: 1.55 }}>
      <Info size={16} style={{ flexShrink: 0, color: "var(--ds-ink-4)", marginTop: 2 }} />
      <span>{children}</span>
    </div>
  );
}

function Champ({ label, aside, children }) {
  return (
    <div className="ds-field">
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span className="ds-label">{label}</span>
        {aside && <span className="ds-help">{aside}</span>}
      </div>
      {children}
    </div>
  );
}
