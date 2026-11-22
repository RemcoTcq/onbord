"use client";

// Hiring → Candidates (phase 5) : tous les candidats de l'organisation, toutes
// offres confondues, avec une recherche et un filtre par offre. Chaque ligne
// ouvre la fiche candidat habituelle, sous son offre. Le filtre « À décider »
// (17/11/2026, ?filtre=adecider depuis l'accueil) ne garde que ceux qui ont
// terminé sans décision, les meilleurs scores d'abord.

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Search, ChevronRight } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import PageHeader from "@/components/layout/PageHeader";
import { LocaleLink as Link } from "@/lib/i18n/navigation";
import { formatDateShort } from "@/lib/i18n/format";
import { scoreTone, initials, candidateStatusLabel } from "@/components/ui/ds";
import { listerCandidatsOrganisation } from "@/lib/actions/candidate";
import Select from "@/components/ui/Select";
import { estADecider } from "@/lib/accueil";

// Mêmes tons que la liste des candidats d'une offre (jobs/[id]/page.js).
const TON_STATUT = {
  invited: "blue", in_progress: "amber",
  soumis: "green", scored: "green", shortlisted: "green", next_step: "green",
  rejected: "red", disqualified: "red",
};
const ENCRE_SCORE = { high: "var(--ds-green-ink)", mid: "var(--ds-amber-ink)", low: "var(--ds-red)" };

const sansAccents = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default function CandidatsPage() {
  const { t, locale } = useI18n();
  const k = (cle, vars) => t(`dashboard.candidatesAll.${cle}`, vars);
  const [candidats, setCandidats] = useState(null);
  const [recherche, setRecherche] = useState("");
  const [offre, setOffre] = useState("");
  const [aDecider, setADecider] = useState(useSearchParams().get("filtre") === "adecider");

  useEffect(() => {
    let annule = false;
    listerCandidatsOrganisation().then((res) => { if (!annule) setCandidats(res.success ? res.candidats : []); });
    return () => { annule = true; };
  }, []);

  const offres = useMemo(() => {
    const parId = new Map();
    for (const c of candidats || []) if (!parId.has(c.job_id)) parId.set(c.job_id, c.poste);
    return [...parId].sort((a, b) => String(a[1]).localeCompare(String(b[1]), locale));
  }, [candidats, locale]);

  const visibles = useMemo(() => {
    const q = sansAccents(recherche.trim());
    const l = (candidats || []).filter((c) => (!offre || c.job_id === offre)
      && (!aDecider || estADecider(c))
      && (!q || sansAccents(`${c.first_name} ${c.last_name} ${c.email} ${c.poste}`).includes(q)));
    return aDecider ? l.sort((a, b) => (b.score_global ?? -1) - (a.score_global ?? -1)) : l;
  }, [candidats, recherche, offre, aDecider]);
  const nbADecider = useMemo(() => (candidats || []).filter(estADecider).length, [candidats]);

  return (
    <>
      <PageHeader title={k("title")} />
      <div className="ds-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div role="radiogroup" aria-label={k("filter")} className="ds-seg" style={{ height: 34 }}>
            {[[false, k("filterAll")], [true, k("filterToDecide", { count: nbADecider })]].map(([v, l]) => (
              <button key={String(v)} type="button" role="radio" aria-checked={aDecider === v} className="ds-seg-item" style={{ height: 28, fontSize: 13 }} onClick={() => setADecider(v)}>{l}</button>
            ))}
          </div>
          <label className="ds-search" style={{ minWidth: 280, flex: "0 1 360px" }}>
            <Search size={15} strokeWidth={2} />
            <input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder={k("search")} aria-label={k("search")} />
          </label>
          {offres.length > 1 && (
            <Select className="ds-select" value={offre} onChange={(e) => setOffre(e.target.value)} style={{ width: "auto", height: 34 }}>
              <option value="">{k("allJobs")}</option>
              {offres.map(([id, titre]) => <option key={id} value={id}>{titre || "—"}</option>)}
            </Select>
          )}
        </div>

        {!candidats ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 48 }}><Loader2 size={22} style={{ animation: "spin 1s linear infinite" }} /></div>
        ) : !visibles.length ? (
          <div className="ds-empty" style={{ padding: "48px 20px" }}>
            <span className="ds-empty-title">{!candidats.length ? k("empty") : aDecider && !nbADecider ? k("noneToDecide") : k("noMatch")}</span>
          </div>
        ) : (
          <div className="ds-table-wrap">
            <table className="ds-table" style={{ minWidth: 760 }}>
              <thead>
                <tr>
                  <th scope="col">{k("colCandidate")}</th>
                  <th scope="col">{k("colJob")}</th>
                  <th scope="col" style={{ width: 90 }}>{k("colScore")}</th>
                  <th scope="col" style={{ width: 150 }}>{k("colStatus")}</th>
                  <th scope="col" style={{ width: 110 }}>{k("colDate")}</th>
                  <th scope="col" style={{ width: 40 }}><span className="sr-only">—</span></th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((c) => {
                  const nom = `${c.first_name || ""} ${c.last_name || ""}`.trim() || c.email;
                  const ton = TON_STATUT[c.status];
                  const href = `/jobs/${c.job_id}/candidats/${c.id}`;
                  return (
                    <tr key={c.id}>
                      <th scope="row">
                        <Link href={href} style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                          <span className="ds-avatar">{initials(c.first_name, c.last_name, c.email)}</span>
                          <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                            <span style={{ fontWeight: 500, color: "var(--ds-ink)", fontSize: 14 }}>{nom}</span>
                            <span style={{ fontSize: 13, color: "var(--ds-ink-3)" }}>{c.email || "—"}</span>
                          </span>
                        </Link>
                      </th>
                      <td><Link href={`/jobs/${c.job_id}`} style={{ fontSize: 13, color: "var(--ds-ink-2)" }}>{c.poste || "—"}</Link></td>
                      <td>
                        {c.score_global != null
                          ? <span className="ds-mono" style={{ fontWeight: 500, color: ENCRE_SCORE[scoreTone(c.score_global)] }}>{c.score_global} %</span>
                          : <span style={{ color: "var(--ds-ink-5)" }}>—</span>}
                      </td>
                      <td>
                        <span className={`ds-chip ${ton ? `ds-chip-${ton}` : ""}`}>
                          <span className={`ds-dot ds-dot-${ton || "grey"}`} />
                          {candidateStatusLabel(t, c.status)}
                        </span>
                      </td>
                      <td style={{ fontSize: 13, color: "var(--ds-ink-3)" }}>{formatDateShort(c.created_at, locale)}</td>
                      <td><Link href={href} aria-label={nom} style={{ color: "var(--ds-ink-4)", display: "flex" }}><ChevronRight size={16} /></Link></td>
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
