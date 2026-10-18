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
  const o = (k, vars) => t(`dashboard.experienceEditor.overview.${k}`, vars);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === "Enter") onOpen(); }}
      className="ds-panel bloc-etape"
      style={{ cursor: "pointer", minHeight: 200 }}
    >
      <span style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "9px 7px 0 9px" }}>
        <span className="ds-mono" style={{ width: 26, height: 26, flex: "none", borderRadius: 8, background: "var(--ds-blue)", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>{index + 1}</span>
        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
          <span style={{ fontWeight: 500, ...lignes(2) }}>{step.title || "—"}</span>
          <span style={{ fontSize: 13, color: "var(--ds-ink-3)", lineHeight: 1.5, ...lignes(3) }}>
            {recap || (recapEnCours ? <span className="bloc-etape-attente">{o("recapLoading")}</span> : null)}
          </span>
        </span>
        <span style={{ display: "inline-flex", gap: 0, flex: "none", marginTop: -4 }}>
          <button
            type="button"
            className="ds-icon-btn"
            disabled={index === 0}
            onClick={(e) => { e.stopPropagation(); onMove("up"); }}
            aria-label={o("moveEarlier")}
            title={o("moveEarlier")}
            style={{ width: 26, height: 26, opacity: index === 0 ? 0.35 : 1 }}
          ><ChevronLeft size={15} /></button>
          <button
            type="button"
            className="ds-icon-btn"
            disabled={index === total - 1}
            onClick={(e) => { e.stopPropagation(); onMove("down"); }}
            aria-label={o("moveLater")}
            title={o("moveLater")}
            style={{ width: 26, height: 26, opacity: index === total - 1 ? 0.35 : 1 }}
          ><ChevronRight size={15} /></button>
        </span>
      </span>

      <dl className="ds-inset ds-kv" style={{ padding: 12, marginTop: "auto" }}>
        <div>
          <dt>{o("type")}</dt>
          <dd className="ds-chip"><Icone size={13} /> {libelle.charAt(0).toUpperCase() + libelle.slice(1)}</dd>
        </div>
        {minutes > 0 && (
          <div>
            <dt>{o("duration")}</dt>
            <dd className="ds-chip"><Clock size={12} /> {o("minutes", { minutes })}</dd>
          </div>
        )}
        <div>
          <dt>{o("skillsAssessed")}</dt>
          <dd className="ds-chip">{nbCompetences}</dd>
        </div>
        {part < 100 && (
          <div>
            <dt>{o("gradeShare")}</dt>
            <dd className="ds-chip" style={part ? { color: "var(--ds-ink)", fontWeight: 500 } : undefined}>{part ? `${part} %` : o("noShare")}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}

// Coupe un texte à n lignes, avec points de suspension.
function lignes(n) {
  return { display: "-webkit-box", WebkitLineClamp: n, WebkitBoxOrient: "vertical", overflow: "hidden" };
}
