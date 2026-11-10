"use client";

// L'accueil du learner (phase 3) : sa progression, le prochain module à
// faire, et tous ses modules assignés. Un clic lance un essai — ou reprend
// celui qui est en cours — sur l'écran du parcours (/run/<id de l'essai>).

import { useEffect, useState } from "react";
import { Loader2, Play, RotateCcw, ArrowRight, Clock } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useToast } from "@/components/ui/Toast";
import { LocaleLink as Link, useRouter } from "@/lib/i18n/navigation";
import { formatDateShort } from "@/lib/i18n/format";
import { maFormation, demarrerEssai } from "@/lib/actions/formation";

const CHIP = { validated: "ds-chip-green", passed: "ds-chip-blue", in_progress: "ds-chip-amber" };

export default function FormationPage() {
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const router = useRouter();
  const k = (cle, vars) => t(`dashboard.learner.${cle}`, vars);
  const [donnees, setDonnees] = useState(null);
  const [lance, setLance] = useState(null);

  useEffect(() => {
    let annule = false;
    maFormation().then((res) => { if (!annule) setDonnees(res.success ? res : { erreur: true }); });
    return () => { annule = true; };
  }, []);

  async function lancer(m) {
    setLance(m.id);
    const res = await demarrerEssai(m.id);
    if (!res.success) {
      setLance(null);
      return toast(k(`errors.${res.code || "generic"}`), "error");
    }
    // L'écran du parcours vit hors du préfixe de langue (/run), comme celui
    // des candidats : le routeur le laisse tel quel.
    router.push(`/run/${res.runId}`);
  }

  if (!donnees) return <div style={{ display: "flex", justifyContent: "center", padding: 48 }}><Loader2 size={22} style={{ animation: "spin 1s linear infinite" }} /></div>;
  if (donnees.erreur) return <p className="ds-sub">{k("errors.generic")}</p>;

  const { modules, prochain, progression, prenom } = donnees;
  const suivant = modules.find((m) => m.id === prochain);
  const pct = progression.total ? Math.round((progression.faits / progression.total) * 100) : 0;

  const bouton = (m, primaire) => {
    if (!m.jouable) return <span className="ds-chip">{k("notReady")}</span>;
    const libelle = m.enCours ? k("resume") : m.essais ? k("retry") : k("start");
    const Icone = m.enCours || !m.essais ? Play : RotateCcw;
    return (
      <button type="button" className={`ds-btn ${primaire ? "ds-btn-primary" : ""}`} disabled={lance === m.id} onClick={() => lancer(m)}>
        {lance === m.id ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Icone size={14} />} {libelle}
      </button>
    );
  };

  const details = (m) => [
    k(`difficulty.${m.difficulte}`),
    m.meilleur != null ? k("best", { score: m.meilleur }) : null,
    k("passMark", { min: m.minScore }),
    m.essais ? k("attempts", { count: m.essais }) : null,
    m.echeance ? k("due", { date: formatDateShort(m.echeance, locale) }) : null,
  ].filter(Boolean).join(" · ");

  return (
    <>
      <section className="ds-panel">
        <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: 10 }}>
          <h1 className="ds-h1">{k("title")}</h1>
          {prenom && <p className="ds-sub">{k("welcome", { name: prenom })}</p>}
        </div>
        {progression.total > 0 && (
          <div className="ds-inset" style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span className="ds-meter" style={{ flex: 1 }} role="meter" aria-valuemin={0} aria-valuemax={progression.total} aria-valuenow={progression.faits}>
              <span style={{ width: `${pct}%` }} />
            </span>
            <span style={{ fontSize: 13 }}>{k("progress", { faits: progression.faits, total: progression.total })}</span>
          </div>
        )}
        {!modules.length && <div className="ds-inset"><p className="ds-sub">{k("soon")}</p></div>}
      </section>

      {suivant && (
        <section className="ds-panel">
          <h2 className="ds-h2" style={{ padding: "10px 10px 0" }}>{k("next")}</h2>
          <div className="ds-inset" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <b style={{ fontSize: 16, fontWeight: 600 }}>{suivant.titre}</b>
            {suivant.situation && <p style={{ fontSize: 14, lineHeight: 1.55, color: "var(--ds-ink-2)" }}>{suivant.situation}</p>}
            {suivant.objectif && <p style={{ fontSize: 13, lineHeight: 1.5, color: "var(--ds-ink-3)" }}>{suivant.objectif}</p>}
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <span className="ds-muted" style={{ fontSize: 12, flex: 1 }}>{details(suivant)}</span>
              {bouton(suivant, true)}
            </div>
          </div>
        </section>
      )}

      {modules.length > 0 && (
        <section className="ds-panel">
          <h2 className="ds-h2" style={{ padding: "10px 10px 0" }}>{k("modules")}</h2>
          <div className="ds-inset" style={{ display: "flex", flexDirection: "column", padding: 0 }}>
            {modules.map((m, i) => (
              <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderTop: i ? "1px solid var(--ds-line)" : "none", flexWrap: "wrap" }}>
                <span style={{ flex: 1, minWidth: 200, display: "flex", flexDirection: "column", gap: 3 }}>
                  <b style={{ fontSize: 14, fontWeight: 600 }}>{m.titre}</b>
                  <span className="ds-muted" style={{ fontSize: 12 }}>{details(m)}</span>
                  {m.dernier && m.dernier.statut !== "in_progress" && (
                    <Link href={`/formation/essais/${m.dernier.id}`} className="ds-link" style={{ fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4 }}>
                      {m.dernier.note == null && <Clock size={12} />}
                      {k("lastFeedback")}{m.dernier.note != null ? ` · ${m.dernier.note} %` : ""} <ArrowRight size={12} />
                    </Link>
                  )}
                </span>
                <span className={`ds-chip ${CHIP[m.statut] || ""}`}>{k(`status.${m.statut}`)}</span>
                {m.statut !== "validated" && bouton(m, false)}
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
