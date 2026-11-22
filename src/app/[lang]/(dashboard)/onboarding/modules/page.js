"use client";

// Onboarding → Modules (20/11/2026, Remco). Les simulations d'onboarding ont
// rejoint « Simulations » le 16/11, et le menu Onboarding n'y menait plus : on
// ne trouvait un module qu'en passant par la fiche d'une personne. Ils ont
// retrouvé leur entrée : la liste, et sur chaque ligne « Assigner » — un module
// seul, envoyé à autant de personnes qu'on veut, sans passer par un programme.

import { useState, useEffect, useCallback } from "react";
import { Loader2, Plus, Search, UserPlus } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useToast } from "@/components/ui/Toast";
import { formatDateShort } from "@/lib/i18n/format";
import { LOCALE_LABELS } from "@/lib/i18n/config";
import { scoreTone } from "@/components/ui/ds";
import PageHeader from "@/components/layout/PageHeader";
import { LocaleLink as Link } from "@/lib/i18n/navigation";
import { listerSimulations } from "@/lib/actions/simulations";
import FenetreAssigner from "@/components/onboarding/FenetreAssigner";

const sansAccent = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const TONS_ETAT = {
  published: { chip: "ds-chip-green", dot: "ds-dot-green" },
  pending_review: { chip: "ds-chip-amber", dot: "ds-dot-amber" },
  toBuild: { chip: "ds-chip-blue", dot: "ds-dot-blue" },
};
const COULEUR_NOTE = { high: "var(--ds-green-ink)", mid: "var(--ds-amber-ink)", low: "var(--ds-red)" };

export default function ModulesPage() {
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const k = (cle, vars) => t(`dashboard.onb.modules.${cle}`, vars);
  const s = (cle, vars) => t(`dashboard.sims.${cle}`, vars);
  const [modules, setModules] = useState(null);
  const [erreur, setErreur] = useState(false);
  const [recherche, setRecherche] = useState("");
  const [assigne, setAssigne] = useState(null); // le module dont la fenêtre est ouverte

  const charger = useCallback(async () => {
    const r = await listerSimulations();
    if (r.success) setModules(r.simulations.filter((x) => x.usage === "onboarding"));
    else { setModules([]); setErreur(true); }
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    charger();
  }, [charger]);

  const fermer = useCallback(() => setAssigne(null), []);
  function apresAssignation(n, complet) {
    if (complet) setAssigne(null);
    toast(s("page.assigned", { count: n }), "success");
    charger();
  }

  const terme = sansAccent(recherche.trim());
  const visibles = (modules || []).filter((m) => !terme || sansAccent(`${m.titre} ${m.lien || ""}`).includes(terme));

  return (
    <>
      <PageHeader title={k("title")} actions={
        <Link href="/simulations/creer?usage=onboarding" className="ds-btn ds-btn-primary"><Plus size={15} strokeWidth={2.2} /> {k("new")}</Link>
      } />
      <div className="ds-body">
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
          <label className="ds-search" style={{ minWidth: 240 }}>
            <Search size={15} strokeWidth={2} />
            <span className="sr-only">{k("searchModules")}</span>
            <input type="search" placeholder={k("searchModules")} value={recherche} onChange={(e) => setRecherche(e.target.value)} />
          </label>
        </div>

        {modules === null ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
            <Loader2 size={22} style={{ color: "var(--ds-ink-5)", animation: "spin 1s linear infinite" }} />
          </div>
        ) : erreur ? (
          <div className="ds-card ds-empty"><span className="ds-empty-title">{t("dashboard.home.loadError")}</span></div>
        ) : visibles.length === 0 ? (
          <div className="ds-card ds-empty">
            <span className="ds-empty-title">{terme ? t("dashboard.search.noResults") : k("empty")}</span>
            {!terme && (
              <Link href="/simulations/creer?usage=onboarding" className="ds-btn ds-btn-primary ds-btn-md" style={{ marginTop: 10 }}>
                <Plus size={15} strokeWidth={2.2} /> {k("new")}
              </Link>
            )}
          </div>
        ) : (
          <div className="ds-table-wrap">
            <table className="ds-table" style={{ minWidth: 900 }}>
              <thead>
                <tr>
                  <th scope="col" style={{ minWidth: 260 }}>{k("colModule")}</th>
                  <th scope="col" style={{ width: 170 }}>{s("linkedRole")}</th>
                  <th scope="col" style={{ width: 130 }}>{s("colPassages")}</th>
                  <th scope="col" style={{ width: 100 }}>{s("colAverage")}</th>
                  <th scope="col" style={{ width: 130 }}>{s("colStatus")}</th>
                  <th scope="col" style={{ width: 96 }}>{s("colDate")}</th>
                  <th scope="col" style={{ width: 120 }}><span className="sr-only">{s("colActions")}</span></th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((m) => {
                  const ton = TONS_ETAT[m.etat] || { chip: "", dot: "ds-dot-grey" };
                  const pa = m.passages || { faits: 0, total: 0, moyenne: null };
                  const sousTitre = [LOCALE_LABELS[m.langue], m.canal && t(`dashboard.sims.channels.${m.canal}.title`), m.difficulte && k(`difficulty.${m.difficulte}`)].filter(Boolean).join(" · ");
                  const publie = m.etat === "published";
                  return (
                    <tr key={m.id}>
                      <th scope="row">
                        <Link href={m.href} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                          <span style={{ fontWeight: 500, color: "var(--ds-ink)", fontSize: 14 }}>{m.titre || "—"}</span>
                          {sousTitre && <span style={{ fontSize: 12, color: "var(--ds-ink-4)" }}>{sousTitre}</span>}
                        </Link>
                      </th>
                      <td style={{ fontSize: 13, color: m.lien ? "var(--ds-ink-2)" : "var(--ds-ink-5)" }}>{m.lien || s("noRole")}</td>
                      <td>
                        {pa.total > 0 ? (
                          <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            <span className="ds-mono" style={{ fontSize: 14, color: "var(--ds-ink)" }}>{pa.faits} / {pa.total}</span>
                            <span style={{ fontSize: 11.5, color: "var(--ds-ink-4)" }}>{s("passagesOnboarding")}</span>
                          </span>
                        ) : (
                          <span style={{ fontSize: 13, color: "var(--ds-ink-5)" }}>{s("nobodyOnboarding")}</span>
                        )}
                      </td>
                      <td>
                        {pa.moyenne != null
                          ? <span className="ds-mono" style={{ fontSize: 14, fontWeight: 600, color: COULEUR_NOTE[scoreTone(pa.moyenne)] || "var(--ds-ink)" }}>{pa.moyenne}%</span>
                          : <span style={{ color: "var(--ds-ink-5)" }}>—</span>}
                      </td>
                      <td><span className={`ds-chip ${ton.chip}`}><span className={`ds-dot ${ton.dot}`} /> {k(`etat.${m.etat}`)}</span></td>
                      <td style={{ fontSize: 13 }}>{formatDateShort(m.date, locale)}</td>
                      <td style={{ textAlign: "right" }}>
                        <button type="button" className="ds-btn" onClick={() => setAssigne(m)} disabled={!publie}
                          title={publie ? undefined : s("page.assignAfterPublish")}>
                          <UserPlus size={14} /> {k("assignOpen")}
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

      {assigne && <FenetreAssigner moduleId={assigne.id} titre={assigne.titre} onFermer={fermer} onAssigne={apresAssignation} />}
    </>
  );
}
