"use client";

// « Depuis le recrutement » sur la fiche d'une recrue (phase 4) : les points
// qui lui ont manqué à sa simulation de recrutement — seulement si ELLE a
// accepté de les partager —, et des modules proposés pour les travailler. Le
// manager garde ceux qu'il veut : ils sont créés et assignés d'un coup ; leur
// simulation se génère ensuite depuis la page de chaque module, comme toujours.

import { useState } from "react";
import { Loader2, Sparkles, ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useToast } from "@/components/ui/Toast";
import { LocaleLink as Link } from "@/lib/i18n/navigation";
import { formatDateShort } from "@/lib/i18n/format";
import { proposerModules, creerModulesRetenus } from "@/lib/actions/modules";
import { assigner } from "@/lib/actions/personnes";

const COULEUR = ["var(--ds-red)", "var(--ds-amber-ink)"];

export default function LacunesRecrutement({ userId, recrutement, onAssigne }) {
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const k = (cle, vars) => t(`dashboard.onb.people.hiring.${cle}`, vars);
  const [propositions, setPropositions] = useState(null);
  const [retenues, setRetenues] = useState(new Set());
  const [occupe, setOccupe] = useState(false);
  const [crees, setCrees] = useState([]);

  if (!recrutement.accepte) {
    return (
      <section className="ds-panel">
        <h2 className="ds-h2" style={{ padding: "10px 10px 0" }}>{k("title")}</h2>
        <div className="ds-inset"><p className="ds-sub">{k("declined")}</p></div>
      </section>
    );
  }

  const lacunes = recrutement.lacunes || [];

  async function suggerer() {
    setOccupe(true);
    setPropositions(null);
    const res = await proposerModules({ learnerId: userId, nombre: 4 });
    setOccupe(false);
    if (!res.success) return toast(k("errors.suggestion"), "error");
    setPropositions(res.propositions);
    setRetenues(new Set(res.propositions.map((_, i) => i)));
  }

  async function garder() {
    setOccupe(true);
    const choisies = propositions.filter((_, i) => retenues.has(i));
    const cree = await creerModulesRetenus({ propositions: choisies, role: recrutement.poste, locale: recrutement.langue || locale, min_score: 70 });
    if (!cree.success) { setOccupe(false); return toast(t("dashboard.onb.people.errors.generic"), "error"); }
    const res = await assigner({ learnerId: userId, moduleIds: cree.ids });
    setOccupe(false);
    if (!res.success) return toast(t("dashboard.onb.people.errors.generic"), "error");
    toast(k("done", { count: cree.ids.length }), "success");
    setCrees(cree.ids.map((id, i) => ({ id, titre: choisies[i]?.title || "" })));
    setPropositions(null);
    onAssigne?.();
  }

  return (
    <section className="ds-panel">
      <div style={{ display: "flex", flexDirection: "column", gap: 2, padding: "10px 10px 0" }}>
        <h2 className="ds-h2">{k("title")}</h2>
        <p className="ds-sub">
          {k("subtitle", { poste: recrutement.poste || "—", score: recrutement.score ?? "—", date: recrutement.date ? formatDateShort(recrutement.date, locale) : "—" })}
        </p>
      </div>
      <div className="ds-inset" style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
        {!lacunes.length && <p className="ds-sub">{k("empty")}</p>}
        {lacunes.length > 0 && <p className="ds-help">{k("gapsHint")}</p>}
        {lacunes.map((l, i) => (
          <div key={i} style={{ display: "flex", gap: 10 }}>
            <span className="ds-mono" style={{ color: COULEUR[l.score], flexShrink: 0 }}>{l.score}/2</span>
            <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
              <span><b style={{ fontWeight: 600 }}>{l.competence}</b>{l.competence ? " · " : ""}{l.point}</span>
              {l.justification && <span style={{ color: "var(--ds-ink-3)" }}>{l.justification}</span>}
            </span>
          </div>
        ))}
      </div>

      {propositions && (
        <div className="ds-inset" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {propositions.map((p, i) => (
            <label key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer", fontSize: 13 }}>
              <input type="checkbox" checked={retenues.has(i)} style={{ marginTop: 3 }}
                onChange={() => setRetenues((s) => { const n = new Set(s); if (n.has(i)) n.delete(i); else n.add(i); return n; })} />
              <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <b style={{ fontWeight: 600, fontSize: 14 }}>{p.title}</b>
                <span>{p.situation}</span>
                {p.objective && <span style={{ color: "var(--ds-ink-3)" }}>{p.objective}</span>}
              </span>
            </label>
          ))}
        </div>
      )}

      {crees.length > 0 && (
        <div className="ds-inset" style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
          {crees.map((m) => (
            <Link key={m.id} href={`/onboarding/modules/${m.id}?generer=1`} className="ds-link" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              {m.titre} · {k("toGenerate")} <ArrowRight size={13} />
            </Link>
          ))}
        </div>
      )}

      {lacunes.length > 0 && (
        <div className="ds-panel-foot">
          {propositions
            ? <button type="button" className="ds-btn ds-btn-primary" disabled={occupe || !retenues.size} onClick={garder}>
                {occupe && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />} {k("keep", { count: retenues.size })}
              </button>
            : <button type="button" className="ds-btn" disabled={occupe} onClick={suggerer}>
                {occupe ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Sparkles size={14} />} {occupe ? k("suggesting") : k("suggest")}
              </button>}
        </div>
      )}
    </section>
  );
}
