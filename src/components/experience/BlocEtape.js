"use client";

// Un bloc du parcours, dans la vue d'ensemble : de quoi comprendre l'étape sans
// l'ouvrir — sa nature, son titre, une phrase de scénario, sa durée, ce qu'elle
// note et ce qu'elle pèse. Un clic ouvre la page de l'étape.

import {
  Phone, MessageSquare, Mail, MessageCircle, FileText, Database, Sheet, Inbox,
  SquareKanban, Code2, Video, ListChecks, CircleHelp, Type, Clock, ChevronLeft, ChevronRight,
} from "lucide-react";
import { minutesEtape } from "@/lib/experienceDuree";
import { useI18n } from "@/lib/i18n/I18nProvider";

const ICONES = {
  email: Mail, client_reply: MessageCircle, document: FileText, crm: Database, sheet: Sheet,
  inbox: Inbox, board: SquareKanban, code: Code2, video: Video, qcm: ListChecks, choice: CircleHelp, text: Type,
};

// Le geste demandé au candidat : la mise en situation si elle existe, sinon le
// format de réponse. Un personnage se lit selon son mode (appel ou écrit).
function natureEtape(step) {
  if (step.kind === "classic_qcm") return { cle: "qcm", Icone: ListChecks };
  const sandbox = step.sandbox_kind && step.sandbox_kind !== "none" ? step.sandbox_kind : null;
  if (sandbox === "persona") {
    const appel = (step.config?.persona?.mode || "call") === "call";
    return { cle: appel ? "call" : "chat", Icone: appel ? Phone : MessageSquare };
  }
  const cle = sandbox || step.response_format || "text";
  return { cle, Icone: ICONES[cle] || Type };
}

export { natureEtape };

export default function BlocEtape({ step, index, total, recap, recapEnCours, part, nbCompetences, onOpen, onMove }) {
  const { t } = useI18n();
  const { cle, Icone } = natureEtape(step);
  const libelle = cle === "call" || cle === "chat"
    ? t(`dashboard.experienceEditor.overview.${cle}`)
    : t(`dashboard.experienceEditor.coverage.format.${cle}`);
  const minutes = minutesEtape(step);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === "Enter") onOpen(); }}
      className="card bloc-etape"
      style={{ padding: "1rem 1.05rem", cursor: "pointer", display: "flex", flexDirection: "column", gap: 8, minHeight: 190 }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{
          width: 24, height: 24, borderRadius: 99, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "12px", fontWeight: 800, background: "var(--primary)", color: "var(--primary-foreground, #fff)",
        }}>{index + 1}</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: "11.5px", fontWeight: 700, color: "var(--muted-foreground)", textTransform: "capitalize" }}>
          <Icone size={14} /> {libelle}
        </span>
      </div>

      <div style={{ fontSize: "14px", fontWeight: 800, lineHeight: 1.35, ...lignes(2) }}>{step.title || "—"}</div>

      <div style={{ fontSize: "12.5px", lineHeight: 1.5, color: "var(--muted-foreground)", flex: 1, ...lignes(3) }}>
        {recap || (recapEnCours
          ? <span className="bloc-etape-attente">{t("dashboard.experienceEditor.overview.recapLoading")}</span>
          : null)}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "11.5px", color: "var(--muted-foreground)", borderTop: "1px solid var(--border)", paddingTop: 8, flexWrap: "wrap" }}>
        {minutes > 0 && <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}><Clock size={12} /> {t("dashboard.experienceEditor.overview.minutes", { minutes })}</span>}
        <span>{t("dashboard.experienceEditor.overview.skills", { count: nbCompetences })}</span>
        {part < 100 && (
          <span style={{ fontWeight: 700, color: part ? "var(--foreground)" : undefined }}>
            {part ? t("dashboard.experienceEditor.overview.share", { part }) : t("dashboard.experienceEditor.overview.noShare")}
          </span>
        )}
        <span style={{ marginLeft: "auto", display: "inline-flex", gap: 2 }}>
          <button
            className="btn btn-ghost btn-sm"
            disabled={index === 0}
            onClick={(e) => { e.stopPropagation(); onMove("up"); }}
            title={t("dashboard.experienceEditor.overview.moveEarlier")}
            style={{ padding: 2 }}
          ><ChevronLeft size={15} /></button>
          <button
            className="btn btn-ghost btn-sm"
            disabled={index === total - 1}
            onClick={(e) => { e.stopPropagation(); onMove("down"); }}
            title={t("dashboard.experienceEditor.overview.moveLater")}
            style={{ padding: 2 }}
          ><ChevronRight size={15} /></button>
        </span>
      </div>
    </div>
  );
}

// Coupe un texte à n lignes, avec points de suspension.
function lignes(n) {
  return { display: "-webkit-box", WebkitLineClamp: n, WebkitBoxOrient: "vertical", overflow: "hidden" };
}
