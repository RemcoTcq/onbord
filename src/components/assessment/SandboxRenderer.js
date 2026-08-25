"use client";

import { MessageSquare, Layout } from "lucide-react";
import EmailComposer from "./EmailComposer";
import CrmSandbox from "./CrmSandbox";
import CodeSandbox from "./CodeSandbox";
import { field, DEFAULT_PRIMARY } from "./candidateUi";
import { useT } from "@/lib/i18n/I18nProvider";

// Renderers de mise en situation. Même langage visuel que l'onboarding : champs
// #fafafa (radius 12), focus-ring de marque (classe nodal-input), liseré de
// marque en haut du conteneur. L'éditeur de code vit dans CodeSandbox : il
// exécute réellement du code, ce n'est plus un simple renderer de saisie.
export default function SandboxRenderer({ format, value, onChange, primary = DEFAULT_PRIMARY, config, compact = false, onRun }) {
  const t = useT();
  if (format === "email_reply") {
    return <EmailComposer value={value} onChange={onChange} primary={primary} />;
  }

  // Seul renderer dont la valeur n'est pas une chaîne : la fiche CRM est un
  // objet { fields, notes } (cf. meta.crm de la réponse).
  if (format === "crm") {
    return <CrmSandbox crm={config?.crm} value={value} onChange={onChange} primary={primary} compact={compact} />;
  }

  if (format === "client_reply") {
    return (
      <div style={{ border: "1px solid var(--border)", borderTop: `3px solid ${primary}`, borderRadius: 16, overflow: "hidden", background: "#ffffff" }}>
        <div style={{ background: "#fafafa", padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
          <MessageSquare size={16} style={{ color: primary }} />
          <span style={{ fontSize: 13, fontWeight: 600 }}>{t("candidate.sandbox.chatTitle")}</span>
        </div>
        <div style={{ padding: "16px", minHeight: 100, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: "bold", flexShrink: 0 }}>C</div>
            <div style={{ background: "#fafafa", padding: "10px 14px", borderRadius: 12, borderTopLeftRadius: 0, fontSize: 14, border: "1px solid var(--border)", maxWidth: "80%" }}>
              {/* Le message client vient du scénario généré quand il existe ; le
                  texte d'exemple ci-dessous n'est qu'un repli, et il doit être
                  dans la langue de l'offre comme le reste du parcours. */}
              {config?.client_message || t("candidate.sandbox.chatSampleMessage")}
            </div>
          </div>
          <textarea
            className="nodal-input"
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={t("candidate.sandbox.chatPlaceholder")}
            style={{ ...field, minHeight: 96, maxHeight: 320, overflowY: "auto", resize: "vertical" }}
          />
        </div>
      </div>
    );
  }

  if (format === "technical_architecture") {
    return (
      <div style={{ border: "1px solid var(--border)", borderTop: `3px solid ${primary}`, borderRadius: 16, overflow: "hidden", background: "#ffffff" }}>
        <div style={{ background: "#fafafa", padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
          <Layout size={16} style={{ color: primary }} />
          <span style={{ fontSize: 13, fontWeight: 600 }}>{t("candidate.sandbox.docTitle")}</span>
        </div>
        <textarea
          className="nodal-input"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t("candidate.sandbox.docPlaceholder")}
          style={{ ...field, borderRadius: 0, border: "none", minHeight: 300, maxHeight: 480, overflowY: "auto", resize: "vertical", fontFamily: "monospace", background: "#ffffff" }}
        />
      </div>
    );
  }

  // Éditeur de code : composant à part, parce qu'il n'est plus un simple champ
  // de saisie — il exécute réellement le code et rend des résultats de tests.
  if (format === "code" || format === "code_editor") {
    return <CodeSandbox config={config?.code} value={value} onChange={onChange} onRun={onRun} primary={primary} />;
  }

  // Texte standard — champ de saisie de l'onboarding.
  return (
    <textarea
      className="nodal-input"
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      rows={8}
      placeholder={t("candidate.sandbox.defaultPlaceholder")}
      style={{ ...field, minHeight: 180, maxHeight: 460, overflowY: "auto", resize: "vertical" }}
    />
  );
}
