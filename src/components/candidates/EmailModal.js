"use client";

import { useState } from "react";
import { X, Copy, Check, Loader2, Mail, Lock } from "lucide-react";
import { logMailSent, sendCandidateEmail } from "@/lib/actions/candidate";
import { useToast } from "@/components/ui/Toast";
import { PLANS, planVisible } from "@/lib/constants/plans";
import { useT } from "@/lib/i18n/I18nProvider";
import { coerceExperienceLocale, LOCALE_LABELS } from "@/lib/i18n/config";
import { templatesFor, EMAIL_TOKENS } from "@/lib/emails/templates";

// Les modèles vivent dans lib/emails/templates.js : ils suivent la langue de
// l'OFFRE (jobs.experience_locale), pas celle du dashboard, parce que c'est le
// candidat qui les lit.

// Le modèle « Partager les résultats » et sa variable {{lien_resultats}} ont été
// retirés avec la page /results/[token] : elle affichait les candidate_test_sessions
// de l'ancien modèle d'évaluation, et n'était lisible que via une policy RLS
// ouverte à tous sur candidates (voir migration 014). Sous Experience V1, le
// rapport de preuves vit sur la fiche candidat, côté recruteur.

export default function EmailModal({ isOpen, onClose, candidate, job, currentUser, onLogged, existingLogs = [] }) {
  const t = useT();
  const [selectedType, setSelectedType] = useState("selected");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const isAlreadySent = existingLogs.some(log => log.mail_type === selectedType);
  // planVisible : un bêta-testeur est un Core, ici comme partout côté client.
  const userPlan = planVisible(currentUser?.user_metadata?.plan);
  const canSendDirectly = !!PLANS[userPlan]?.features?.automatedEmails;

  if (!isOpen) return null;

  const variables = {
    [EMAIL_TOKENS.candidateFirstName]: candidate.first_name,
    [EMAIL_TOKENS.jobTitle]: job.title,
    [EMAIL_TOKENS.companyName]: currentUser?.user_metadata?.company_name || "Onbord",
    [EMAIL_TOKENS.interviewLink]: `${typeof window !== "undefined" ? window.location.origin : ""}/interview/${candidate.interview_token}`,
    [EMAIL_TOKENS.recruiterFirstName]:
      currentUser?.user_metadata?.first_name || currentUser?.email?.split("@")[0] || t("dashboard.emails.recruiterFallback"),
  };

  // Langue de L'OFFRE, pas de l'interface : ce message part au candidat. Un
  // recruteur en dashboard anglais qui écrit à un candidat néerlandophone
  // obtient un brouillon en néerlandais, qu'il reste libre de retoucher.
  const jobLocale = coerceExperienceLocale(job?.experience_locale);
  const templates = templatesFor(jobLocale);
  const template = templates[selectedType];
  let body = template.body;
  let subject = template.subject;

  Object.entries(variables).forEach(([key, value]) => {
    body = body.replaceAll(key, value);
    subject = subject.replaceAll(key, value);
  });

  const handleCopy = async () => {
    try {
      const fullText = `${t("dashboard.emails.subject")} : ${subject}\n\n${body}`;
      await navigator.clipboard.writeText(fullText);
      toast(t("dashboard.emails.copied"));
    } catch (err) {
      toast(t("dashboard.emails.copyError"), "error");
    }
  };

  const handleSend = async () => {
    if (!candidate.email) {
      toast(t("dashboard.emails.noEmail"), "error");
      return;
    }

    setLoading(true);
    try {
      const replyTo = currentUser?.email;
      
      const res = await sendCandidateEmail(
        candidate.id,
        job.id,
        selectedType,
        candidate.email,
        subject,
        body,
        replyTo
      );
      
      if (res.success) {
        setCopied(true); // Reuse copied state for "sent" feedback
        toast(t("dashboard.emails.sent"));
        if (onLogged) onLogged();
        setTimeout(() => {
          setCopied(false);
          onClose(); // Auto-close on success
        }, 2000);
      } else {
        toast(res.error || t("dashboard.emails.sendError"), "error");
      }
    } catch (err) {
      toast(t("dashboard.emails.genericSendError"), "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
      padding: "20px"
    }}>
      <div className="card fade-in" style={{ width: "100%", maxWidth: "600px", padding: 0, overflow: "hidden" }}>
        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h2 style={{ fontSize: "18px", fontWeight: "700" }}>{t("dashboard.emails.title")}</h2>
            <p style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>
              {t("dashboard.emails.forCandidate", { name: `${candidate.first_name} ${candidate.last_name}` })}
              {" · "}
              {/* La langue du brouillon n'est pas celle du dashboard : on le dit,
                  sinon un recruteur anglophone croit à un bug en voyant du
                  néerlandais s'afficher. */}
              <span style={{ opacity: 0.8 }}>
                {t("dashboard.emails.localeNotice", { locale: LOCALE_LABELS[jobLocale] })}
              </span>
            </p>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-icon"><X size={20} /></button>
        </div>

        {/* Content */}
        <div style={{ padding: "24px" }}>
          {/* Template Selector */}
          <div style={{ display: "flex", gap: "8px", marginBottom: "24px" }}>
            {/* `tpl` et non `t` : le nom court masquerait la fonction de
                traduction dans toute la portée de ce map. */}
            {Object.entries(templates).map(([type, tpl]) => (
              <button
                key={type}
                onClick={() => { setSelectedType(type); setCopied(false); }}
                style={{
                  flex: 1, padding: "10px", borderRadius: "10px", fontSize: "13px", fontWeight: "600",
                  background: selectedType === type ? "var(--primary)" : "var(--secondary)",
                  color: selectedType === type ? "white" : "var(--muted-foreground)",
                  border: "none", cursor: "pointer", transition: "all 0.2s"
                }}
              >
                {tpl.label}
              </button>
            ))}
          </div>

          {/* Preview Area */}
          <div style={{
            background: "var(--background)", border: "1px solid var(--border)", borderRadius: "12px",
            padding: "20px", display: "flex", flexDirection: "column", gap: "12px"
          }}>
            <div style={{ paddingBottom: "12px", borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{t("dashboard.emails.subject")}</span>
              <p style={{ fontSize: "14px", fontWeight: "600", marginTop: "4px" }}>{subject}</p>
            </div>
            <div style={{ whiteSpace: "pre-wrap", fontSize: "14px", lineHeight: "1.6", color: "var(--foreground)", maxHeight: "300px", overflowY: "auto" }}>
              {body}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "20px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: "12px", background: "var(--card)" }}>
          <button className="btn btn-ghost" onClick={onClose}>{t("common.actions.cancel")}</button>
          <button className="btn btn-outline" onClick={handleCopy}>
            <Copy size={18} /> {t("common.actions.copy")}
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSend}
            disabled={loading || isAlreadySent || !candidate.email || !canSendDirectly}
            style={{ minWidth: "140px", opacity: (isAlreadySent || !candidate.email || !canSendDirectly) ? 0.6 : 1 }}
            title={!canSendDirectly ? t("dashboard.emails.proUpsell") : ""}
          >
            {!canSendDirectly ? <Lock size={18} /> : loading ? <Loader2 size={18} className="spin" /> : copied ? <Check size={18} /> : isAlreadySent ? <Check size={18} /> : <Mail size={18} />}
            {!canSendDirectly
              ? t("dashboard.emails.proRequired")
              : copied
                ? t("dashboard.emails.sentBadge")
                : isAlreadySent
                  ? t("dashboard.emails.alreadySent")
                  : t("dashboard.emails.send")}
          </button>
        </div>
      </div>
    </div>
  );
}
