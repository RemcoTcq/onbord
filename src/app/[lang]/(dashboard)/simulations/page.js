"use client";

// Simulations (16/11/2026) : TOUTES les simulations de l'organisation au même
// endroit, quel que soit leur usage — recrutement (une par offre) ou
// onboarding (une par module). Le moteur est le même ; cette page est l'entrée
// commune, et « Créer une simulation » commence par demander l'usage.
//
// Chaque ligne ouvre la page qui la gère : l'offre pour le recrutement, le
// module pour l'onboarding.

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Plus, Search, Briefcase, GraduationCap } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { formatDateShort } from "@/lib/i18n/format";
import PageHeader from "@/components/layout/PageHeader";
import { LocaleLink as Link } from "@/lib/i18n/navigation";
import { useShell } from "@/components/layout/ShellContext";
import { listerModules } from "@/lib/actions/modules";

const USAGES = ["all", "hiring", "onboarding"];
const sansAccent = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default function SimulationsPage() {
  const { t, locale } = useI18n();
  const { jobs } = useShell();
  const k = (cle, vars) => t(`dashboard.sims.${cle}`, vars);
  const demande = useSearchParams().get("usage");
  const [usage, setUsage] = useState(USAGES.includes(demande) ? demande : "all");
  const [modules, setModules] = useState(null);
  const [recherche, setRecherche] = useState("");

  useEffect(() => {
    let actif = true;
    listerModules().then((r) => { if (actif) setModules(r.success ? r.modules : []); });
    return () => { actif = false; };
  }, []);

  const lignes = [
    ...jobs.map((j) => ({
      cle: `job-${j.id}`, usage: "hiring", titre: j.title || t("dashboard.jobs.untitled"),
      href: `/jobs/${j.id}`, date: j.created_at,
      statut: ["active", "draft", "closed"].includes(j.status) ? k(`jobStatus.${j.status}`) : "—",
      detail: j.location || "",
    })),
    ...(modules || []).map((m) => ({
      cle: `module-${m.id}`, usage: "onboarding", titre: m.title,
      href: `/onboarding/modules/${m.id}`, date: m.updated_at,
      statut: m.simulation ? t(`dashboard.onb.status.${m.simulation.status}`) : t("dashboard.onb.modules.noSimulation"),
      detail: [m.target_role, t("dashboard.onb.modules.assignedStats", { valides: m.valides, assignes: m.assignes })].filter(Boolean).join(" · "),
    })),
  ].sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));

  const terme = sansAccent(recherche.trim());
  const visibles = lignes.filter((l) => (usage === "all" || l.usage === usage) && (!terme || sansAccent(`${l.titre} ${l.detail}`).includes(terme)));
  const compte = (u) => lignes.filter((l) => u === "all" || l.usage === u).length;

  return (
    <>
      <PageHeader title={k("title")} actions={
        <Link href="/simulations/creer" className="ds-btn ds-btn-primary"><Plus size={15} strokeWidth={2.2} /> {k("create")}</Link>
      } />
      <div className="ds-body">
        <p className="ds-sub" style={{ maxWidth: 760 }}>{k("subtitle")}</p>
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

        {modules === null ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
            <Loader2 size={22} style={{ color: "var(--ds-ink-5)", animation: "spin 1s linear infinite" }} />
          </div>
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
            <table className="ds-table" style={{ minWidth: 660 }}>
              <thead>
                <tr>
                  <th scope="col">{k("colSimulation")}</th>
                  <th scope="col" style={{ width: 150 }}>{k("colUsage")}</th>
                  <th scope="col" style={{ width: 170 }}>{k("colStatus")}</th>
                  <th scope="col" style={{ width: 110 }}>{k("colDate")}</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((l) => {
                  const Icone = l.usage === "hiring" ? Briefcase : GraduationCap;
                  return (
                    <tr key={l.cle}>
                      <th scope="row">
                        <Link href={l.href} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                          <span style={{ fontWeight: 500, color: "var(--ds-ink)", fontSize: 14 }}>{l.titre}</span>
                          {l.detail && <span style={{ fontSize: 13, color: "var(--ds-ink-3)" }}>{l.detail}</span>}
                        </Link>
                      </th>
                      <td>
                        <span className="ds-chip" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <Icone size={12} strokeWidth={2} /> {k(`usage.${l.usage}`)}
                        </span>
                      </td>
                      <td>{l.statut}</td>
                      <td>{formatDateShort(l.date, locale)}</td>
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
