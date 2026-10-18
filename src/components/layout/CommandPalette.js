"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Briefcase, Plus, Settings, CornerDownLeft } from "lucide-react";
import { useRouter } from "@/lib/i18n/navigation";
import { useT } from "@/lib/i18n/I18nProvider";
import { createClient } from "@/lib/supabase/client";
import { jobDot, initials, scoreTone } from "@/components/ui/ds";

const NB_JOBS = 6;
const NB_CANDIDATS = 8;

// Les caractères qui structurent un filtre PostgREST `or=(…)` : laissés dans la
// saisie, ils casseraient la requête (ou en changeraient le sens).
function nettoyer(q) {
  return q.replace(/[,()%*\\:."']/g, " ").trim();
}

/**
 * Recherche globale (⌘K / Ctrl K) : jobs et candidats du recruteur.
 * Les jobs viennent de la liste déjà chargée par le cadre ; les candidats d'une
 * requête — la RLS ne renvoie que ceux des jobs du recruteur.
 */
// Montée seulement quand elle est ouverte (cf. DashboardShell) : chaque
// ouverture repart d'une saisie vide.
export default function CommandPalette({ onClose, jobs }) {
  const t = useT();
  const router = useRouter();
  const inputRef = useRef(null);
  const [q, setQ] = useState("");
  // Résultats candidats rangés avec le terme qui les a produits : une réponse
  // qui ne correspond plus à la saisie n'est simplement pas affichée.
  const [reponse, setReponse] = useState({ terme: "", lignes: [] });
  const [actif, setActif] = useState(0);
  const terme = nettoyer(q);
  const candidats = terme.length >= 2 && reponse.terme === terme ? reponse.lignes : [];

  useEffect(() => { inputRef.current?.focus(); }, []);

  // Candidats : requête différée, la dernière saisie gagne.
  useEffect(() => {
    if (terme.length < 2) return;
    let annule = false;
    const id = setTimeout(async () => {
      const { data } = await createClient()
        .from("candidates")
        .select("id, first_name, last_name, email, job_id, score_global, jobs!inner(title)")
        .or(`first_name.ilike.%${terme}%,last_name.ilike.%${terme}%,email.ilike.%${terme}%`)
        .order("created_at", { ascending: false })
        .limit(NB_CANDIDATS);
      if (!annule) setReponse({ terme, lignes: data || [] });
    }, 180);
    return () => { annule = true; clearTimeout(id); };
  }, [terme]);

  const resultats = useMemo(() => {
    const terme = q.trim().toLowerCase();
    const lignes = [];
    if (!terme) {
      lignes.push({ groupe: "pages", id: "new", label: t("dashboard.nav.newJob"), href: "/jobs/nouveau", icon: <Plus size={15} /> });
      lignes.push({ groupe: "pages", id: "jobs", label: t("dashboard.nav.jobs"), href: "/jobs", icon: <Briefcase size={15} strokeWidth={1.8} /> });
      lignes.push({ groupe: "pages", id: "settings", label: t("dashboard.nav.settings"), href: "/compte", icon: <Settings size={15} strokeWidth={1.8} /> });
    }
    jobs
      .filter((j) => !terme || (j.title || "").toLowerCase().includes(terme))
      .slice(0, NB_JOBS)
      .forEach((j) => lignes.push({
        groupe: "jobs", id: j.id, label: j.title || t("dashboard.jobs.untitled"), href: `/jobs/${j.id}`,
        icon: <span className="ds-square" style={{ background: jobDot(j.id) }} />,
        meta: j.location || null,
      }));
    candidats.forEach((c) => lignes.push({
      groupe: "candidats", id: c.id,
      label: `${c.first_name || ""} ${c.last_name || ""}`.trim() || c.email,
      href: `/jobs/${c.job_id}/candidats/${c.id}`,
      icon: <span className="ds-avatar" style={{ width: 24, height: 24, borderRadius: 7, fontSize: 10 }}>{initials(c.first_name, c.last_name, c.email)}</span>,
      meta: c.jobs?.title,
      score: c.score_global,
    }));
    return lignes;
  }, [q, jobs, candidats, t]);

  function ouvrir(ligne) {
    if (!ligne) return;
    onClose();
    router.push(ligne.href);
  }

  function onKeyDown(e) {
    if (e.key === "ArrowDown") { e.preventDefault(); setActif((i) => Math.min(i + 1, resultats.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActif((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); ouvrir(resultats[actif]); }
    else if (e.key === "Escape") { e.preventDefault(); onClose(); }
  }

  const titres = { pages: t("dashboard.search.pages"), jobs: t("dashboard.nav.jobs"), candidats: t("dashboard.search.candidates") };
  let groupePrecedent = null;

  return (
    <div className="ds-overlay" style={{ alignItems: "flex-start", paddingTop: "14vh" }} onMouseDown={onClose}>
      <div className="ds-modal" role="dialog" aria-modal="true" aria-label={t("dashboard.nav.search")} style={{ width: 600 }} onMouseDown={(e) => e.stopPropagation()}>
        <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 16px", height: 54, borderBottom: "1px solid var(--ds-line-2)", color: "var(--ds-ink-5)" }}>
          <Search size={17} strokeWidth={2} />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => { setQ(e.target.value); setActif(0); }}
            onKeyDown={onKeyDown}
            placeholder={t("dashboard.search.placeholder")}
            aria-label={t("dashboard.nav.search")}
            style={{ flex: 1, border: 0, outline: 0, font: "inherit", fontSize: 15, color: "var(--ds-ink)", background: "transparent" }}
          />
          <kbd className="ds-mono" style={{ fontSize: 11, padding: "1px 6px", borderRadius: 5, border: "1px solid var(--ds-line)", color: "var(--ds-ink-3)" }}>Esc</kbd>
        </label>
        <div role="listbox" style={{ maxHeight: "50vh", overflowY: "auto", padding: 6 }}>
          {resultats.length === 0 && (
            <div className="ds-empty" style={{ padding: "28px 16px" }}>{t("dashboard.search.noResults")}</div>
          )}
          {resultats.map((r, i) => {
            const entete = r.groupe !== groupePrecedent ? titres[r.groupe] : null;
            groupePrecedent = r.groupe;
            const tone = scoreTone(r.score);
            return (
              <div key={`${r.groupe}-${r.id}`}>
                {entete && <div style={{ padding: "8px 10px 4px", fontSize: 12, color: "var(--ds-ink-4)" }}>{entete}</div>}
                <button
                  type="button"
                  role="option"
                  aria-selected={i === actif}
                  onMouseEnter={() => setActif(i)}
                  onClick={() => ouvrir(r)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, width: "100%", minHeight: 40, padding: "6px 10px",
                    border: 0, borderRadius: 9, font: "inherit", textAlign: "left", cursor: "pointer",
                    background: i === actif ? "var(--ds-soft-2)" : "transparent", color: "var(--ds-ink)",
                  }}
                >
                  <span style={{ width: 24, display: "flex", justifyContent: "center", color: "var(--ds-ink-3)" }}>{r.icon}</span>
                  <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
                    <span style={{ fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.label}</span>
                    {r.meta && <span style={{ fontSize: 12, color: "var(--ds-ink-4)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.meta}</span>}
                  </span>
                  {r.score != null && <span className={`ds-tag ds-tag-${tone}`}>{r.score} %</span>}
                  {i === actif && <CornerDownLeft size={14} color="var(--ds-ink-6)" />}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
