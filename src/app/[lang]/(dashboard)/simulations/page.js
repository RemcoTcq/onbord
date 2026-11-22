"use client";

// Simulations (16/11/2026, colonnes le 17/11) : TOUTES les simulations de
// l'organisation au même endroit, quel que soit leur usage — recrutement (une
// par offre) ou onboarding. Le moteur est le même ; cette page est l'entrée
// commune, et « Créer une simulation » commence par demander l'usage.
//
// Chaque ligne dit à quoi la simulation sert, à quoi elle est liée (l'offre, ou
// le rôle entraîné), son format, combien de personnes l'ont passée et avec
// quelle note, son état. Elle ouvre la page qui la gère : l'offre pour le
// recrutement, le module pour l'onboarding. Chacune se supprime d'ici, après
// confirmation : une simulation d'onboarding part pour de bon, avec ses essais
// et leurs enregistrements ; une offre part en corbeille avec ses candidats et
// est effacée automatiquement sept jours plus tard (lib/jobPurge.js).

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Plus, Search, Briefcase, GraduationCap, Trash2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useToast } from "@/components/ui/Toast";
import { formatDateShort } from "@/lib/i18n/format";
import { LOCALE_LABELS } from "@/lib/i18n/config";
import { scoreTone } from "@/components/ui/ds";
import PageHeader from "@/components/layout/PageHeader";
import { LocaleLink as Link } from "@/lib/i18n/navigation";
import { useShell } from "@/components/layout/ShellContext";
import { supprimerModule, impactSuppressionModule } from "@/lib/actions/modules";
import { listerSimulations } from "@/lib/actions/simulations";
import { deleteJob } from "@/lib/actions/candidate";

const USAGES = ["all", "hiring", "onboarding"];
const sansAccent = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const TONS_ETAT = {
  published: { chip: "ds-chip-green", dot: "ds-dot-green" },
  pending_review: { chip: "ds-chip-amber", dot: "ds-dot-amber" },
  toBuild: { chip: "ds-chip-blue", dot: "ds-dot-blue" },
};
const COULEUR_NOTE = { high: "var(--ds-green-ink)", mid: "var(--ds-amber-ink)", low: "var(--ds-red)" };

export default function SimulationsPage() {
  const { t, locale } = useI18n();
  const { refreshJobs } = useShell();
  const { toast } = useToast();
  const k = (cle, vars) => t(`dashboard.sims.${cle}`, vars);
  const [suppression, setSuppression] = useState(null);
  const demande = useSearchParams().get("usage");
  const [usage, setUsage] = useState(USAGES.includes(demande) ? demande : "all");
  const [simulations, setSimulations] = useState(null);
  const [erreur, setErreur] = useState(false);
  const [recherche, setRecherche] = useState("");

  useEffect(() => {
    let actif = true;
    listerSimulations().then((r) => {
      if (!actif) return;
      if (r.success) setSimulations(r.simulations);
      else { setSimulations([]); setErreur(true); }
    });
    return () => { actif = false; };
  }, []);

  async function supprimer(l) {
    const titre = l.titre || t("dashboard.jobs.untitled");
    if (l.usage === "hiring") {
      if (!window.confirm(k("deleteJobConfirm", { titre }))) return;
      setSuppression(l.cle);
      const res = await deleteJob(l.id);
      setSuppression(null);
      if (!res.success) return toast(t("dashboard.jobs.deleteError"), "error");
      setSimulations((s) => (s || []).filter((x) => x.cle !== l.cle));
      refreshJobs();
      return toast(k("deletedJob"), "success");
    }
    const impact = await impactSuppressionModule(l.id);
    const message = impact.success && (impact.essais || impact.assignations)
      ? k("page.deleteConfirmData", { titre, essais: impact.essais, assignations: impact.assignations })
      : k("page.deleteConfirm", { titre });
    if (!window.confirm(message)) return;
    setSuppression(l.cle);
    const res = await supprimerModule(l.id);
    setSuppression(null);
    if (!res.success) return toast(t("dashboard.onb.modules.errors.generic"), "error");
    setSimulations((s) => (s || []).filter((x) => x.cle !== l.cle));
    toast(k("page.deleted"), "success");
  }

  const lignes = (simulations || []).map((s) => ({
    ...s,
    cle: `${s.usage}-${s.id}`,
    titre: s.titre || (s.usage === "hiring" ? t("dashboard.jobs.untitled") : "—"),
    format: s.usage === "hiring"
      ? [s.etapes ? k("stepsCount", { count: s.etapes }) : null, s.minutes ? k("minutes", { n: s.minutes }) : null].filter(Boolean).join(" · ")
      : [s.canal && t(`dashboard.sims.channels.${s.canal}.title`), s.difficulte && t(`dashboard.onb.modules.difficulty.${s.difficulte}`)].filter(Boolean).join(" · "),
  })).map((l) => ({ ...l, sousTitre: [LOCALE_LABELS[l.langue], l.format].filter(Boolean).join(" · ") }));

  const terme = sansAccent(recherche.trim());
  const visibles = lignes.filter((l) => (usage === "all" || l.usage === usage) && (!terme || sansAccent(`${l.titre} ${l.lien || ""} ${l.detail || ""}`).includes(terme)));
  const compte = (u) => lignes.filter((l) => u === "all" || l.usage === u).length;

  return (
    <>
      <PageHeader title={k("title")} actions={
        <Link href="/simulations/creer" className="ds-btn ds-btn-primary"><Plus size={15} strokeWidth={2.2} /> {k("create")}</Link>
      } />
      <div className="ds-body">
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div role="tablist" aria-label={k("filterLabel")} className="ds-seg">
            {USAGES.map((u) => (
              <button key={u} type="button" role="tab" aria-selected={usage === u} onClick={() => setUsage(u)} className="ds-seg-item">
                {k(`usage.${u}`)}
                {compte(u) > 0 && <span className="ds-seg-count">{compte(u)}</span>}
              </button>
            ))}
          </div>
          <label className="ds-search" style={{ minWidth: 240 }}>
            <Search size={15} strokeWidth={2} />
            <span className="sr-only">{k("search")}</span>
            <input type="search" placeholder={k("search")} value={recherche} onChange={(e) => setRecherche(e.target.value)} />
          </label>
        </div>

        {simulations === null ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
            <Loader2 size={22} style={{ color: "var(--ds-ink-5)", animation: "spin 1s linear infinite" }} />
          </div>
        ) : erreur ? (
          <div className="ds-card ds-empty"><span className="ds-empty-title">{t("dashboard.home.loadError")}</span></div>
        ) : visibles.length === 0 ? (
          <div className="ds-card ds-empty">
            <span className="ds-empty-title">{terme ? t("dashboard.search.noResults") : k("empty")}</span>
            {!terme && <span>{k("emptyHint")}</span>}
            {!terme && (
              <Link href="/simulations/creer" className="ds-btn ds-btn-primary ds-btn-md" style={{ marginTop: 10 }}>
                <Plus size={15} strokeWidth={2.2} /> {k("create")}
              </Link>
            )}
          </div>
        ) : (
          <div className="ds-table-wrap">
            <table className="ds-table" style={{ minWidth: 1000 }}>
              <thead>
                <tr>
                  <th scope="col" style={{ minWidth: 260 }}>{k("colSimulation")}</th>
                  <th scope="col" style={{ width: 136 }}>{k("colUsage")}</th>
                  <th scope="col" style={{ width: 180 }}>{k("colLinked")}</th>
                  <th scope="col" style={{ width: 140 }}>{k("colPassages")}</th>
                  <th scope="col" style={{ width: 100 }}>{k("colAverage")}</th>
                  <th scope="col" style={{ width: 140 }}>{k("colStatus")}</th>
                  <th scope="col" style={{ width: 100 }}>{k("colDate")}</th>
                  <th scope="col" style={{ width: 52 }}><span className="sr-only">{k("colActions")}</span></th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((l) => {
                  const Icone = l.usage === "hiring" ? Briefcase : GraduationCap;
                  const ton = TONS_ETAT[l.etat] || { chip: "", dot: "ds-dot-grey" };
                  const p = l.passages || { faits: 0, total: 0, moyenne: null };
                  return (
                    <tr key={l.cle}>
                      <th scope="row">
                        <Link href={l.href} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                          <span style={{ fontWeight: 500, color: "var(--ds-ink)", fontSize: 14 }}>{l.titre}</span>
                          {(l.sousTitre) && <span style={{ fontSize: 12, color: "var(--ds-ink-4)" }}>{l.sousTitre}</span>}
                        </Link>
                      </th>
                      <td>
                        <span className="ds-chip" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <Icone size={12} strokeWidth={2} /> {k(`usage.${l.usage}`)}
                        </span>
                      </td>
                      <td>
                        <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--ds-ink-5)" }}>
                            {l.usage === "hiring" ? k("linkedJob") : k("linkedRole")}
                          </span>
                          <span style={{ fontSize: 13, color: l.lien ? "var(--ds-ink-2)" : "var(--ds-ink-5)" }}>
                            {l.lien || (l.usage === "hiring" ? t("dashboard.jobs.untitled") : k("noRole"))}
                            {l.detail ? <span style={{ color: "var(--ds-ink-4)" }}> · {l.detail}</span> : null}
                          </span>
                        </span>
                      </td>
                      <td>
                        {p.total > 0 ? (
                          <span style={{ display: "flex", flexDirection: "column", gap: 2 }} title={k(l.usage === "hiring" ? "passagesHiring" : "passagesOnboarding")}>
                            <span className="ds-mono" style={{ fontSize: 14, color: "var(--ds-ink)" }}>{p.faits} / {p.total}</span>
                            <span style={{ fontSize: 11.5, color: "var(--ds-ink-4)" }}>{k(l.usage === "hiring" ? "passagesHiring" : "passagesOnboarding")}</span>
                          </span>
                        ) : (
                          <span style={{ fontSize: 13, color: "var(--ds-ink-5)" }}>{k(l.usage === "hiring" ? "nobodyHiring" : "nobodyOnboarding")}</span>
                        )}
                      </td>
                      <td>
                        {p.moyenne != null
                          ? <span className="ds-mono" style={{ fontSize: 14, fontWeight: 600, color: COULEUR_NOTE[scoreTone(p.moyenne)] || "var(--ds-ink)" }}>{p.moyenne}%</span>
                          : <span style={{ color: "var(--ds-ink-5)" }}>—</span>}
                      </td>
                      <td>
                        <span className={`ds-chip ${ton.chip}`}><span className={`ds-dot ${ton.dot}`} /> {k(`etat.${l.etat}`)}</span>
                      </td>
                      <td style={{ fontSize: 13 }}>{formatDateShort(l.date, locale)}</td>
                      <td>
                        <button type="button" className="ds-icon-btn" onClick={() => supprimer(l)} disabled={suppression === l.cle}
                          aria-label={k("deleteRow", { titre: l.titre })} title={k("deleteRow", { titre: l.titre })}>
                          {suppression === l.cle ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> : <Trash2 size={15} />}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
