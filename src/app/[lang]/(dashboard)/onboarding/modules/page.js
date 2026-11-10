"use client";

// Onboarding → Modules (phase 2). La liste des modules d'entraînement de
// l'organisation, la création en quelques champs, et les suggestions pour un
// rôle (tirées du Company Knowledge) dont on garde ce qu'on veut. La
// simulation d'un module se génère sur sa page.

import { useState, useEffect, useCallback } from "react";
import { Loader2, Plus, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useToast } from "@/components/ui/Toast";
import PageHeader from "@/components/layout/PageHeader";
import { LocaleLink as Link, useRouter } from "@/lib/i18n/navigation";
import { EXPERIENCE_LOCALES, LOCALE_LABELS } from "@/lib/i18n/config";
import { listerModules, creerModule, proposerModules, creerModulesRetenus } from "@/lib/actions/modules";

const DIFFICULTES = ["easy", "medium", "hard"];
const VIDE = { title: "", target_role: "", situation: "", objective: "", difficulty: "medium", min_score: 70 };

export default function ModulesPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const router = useRouter();
  const k = (cle, vars) => t(`dashboard.onb.modules.${cle}`, vars);
  const [liste, setListe] = useState(null);
  const [form, setForm] = useState({ ...VIDE, locale: "en" });
  const [ouvert, setOuvert] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [role, setRole] = useState("");
  const [propositions, setPropositions] = useState(null);
  const [retenues, setRetenues] = useState(new Set());
  const [suggestion, setSuggestion] = useState(false);

  const charger = useCallback(async () => {
    const res = await listerModules();
    setListe(res.success ? res.modules : []);
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    charger();
  }, [charger]);

  const set = (cle) => (e) => setForm((f) => ({ ...f, [cle]: e.target.value }));

  async function creer(e) {
    e.preventDefault();
    setEnvoi(true);
    const res = await creerModule(form);
    setEnvoi(false);
    if (!res.success) return toast(k(`errors.${res.code || "generic"}`), "error");
    router.push(`/onboarding/modules/${res.id}?generer=1`);
  }

  async function proposer(e) {
    e.preventDefault();
    setSuggestion(true);
    setPropositions(null);
    const res = await proposerModules({ role, nombre: 5 });
    setSuggestion(false);
    if (!res.success) return toast(k("errors.suggestion"), "error");
    setPropositions(res.propositions);
    setRetenues(new Set(res.propositions.map((_, i) => i)));
  }

  async function garder() {
    setSuggestion(true);
    const res = await creerModulesRetenus({
      propositions: propositions.filter((_, i) => retenues.has(i)),
      role, locale: form.locale, min_score: 70,
    });
    setSuggestion(false);
    if (!res.success) return toast(k(`errors.${res.code || "generic"}`), "error");
    toast(k("created", { count: res.ids.length }), "success");
    setPropositions(null);
    charger();
  }

  const champ = (cle, libelle, props = {}) => (
    <label className="ds-field" style={props.plein ? { gridColumn: "1 / -1" } : undefined}>
      <span className="ds-label">{libelle}</span>
      {props.zone
        ? <textarea className="ds-textarea" rows={3} value={form[cle]} onChange={set(cle)} required={props.requis} placeholder={props.placeholder} />
        : <input className="ds-input" value={form[cle]} onChange={set(cle)} required={props.requis} placeholder={props.placeholder} type={props.type || "text"} min={props.min} max={props.max} />}
    </label>
  );

  return (
    <>
      <PageHeader title={k("title")} actions={
        <button type="button" className="ds-btn ds-btn-primary" onClick={() => setOuvert((v) => !v)}><Plus size={14} /> {k("new")}</button>
      } />
      <div className="ds-body" style={{ maxWidth: 980, display: "flex", flexDirection: "column", gap: 16 }}>
        <p className="ds-sub">{k("subtitle")}</p>

        {ouvert && (
          <form onSubmit={creer} className="ds-panel">
            <h2 className="ds-h2" style={{ padding: "10px 10px 0" }}>{k("new")}</h2>
            <div className="ds-inset" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
              {champ("title", k("fields.title"), { requis: true, placeholder: k("fields.titlePlaceholder") })}
              {champ("target_role", k("fields.role"), { placeholder: k("fields.rolePlaceholder") })}
              {champ("situation", k("fields.situation"), { requis: true, zone: true, plein: true, placeholder: k("fields.situationPlaceholder") })}
              {champ("objective", k("fields.objective"), { zone: true, plein: true, placeholder: k("fields.objectivePlaceholder") })}
              <label className="ds-field">
                <span className="ds-label">{k("fields.difficulty")}</span>
                <select className="ds-select" value={form.difficulty} onChange={set("difficulty")}>
                  {DIFFICULTES.map((d) => <option key={d} value={d}>{k(`difficulty.${d}`)}</option>)}
                </select>
              </label>
              {champ("min_score", k("fields.minScore"), { type: "number", min: 0, max: 100 })}
              <label className="ds-field">
                <span className="ds-label">{k("fields.language")}</span>
                <select className="ds-select" value={form.locale} onChange={set("locale")}>
                  {EXPERIENCE_LOCALES.map((l) => <option key={l} value={l}>{LOCALE_LABELS[l]}</option>)}
                </select>
              </label>
            </div>
            <div className="ds-panel-foot">
              <button type="submit" className="ds-btn ds-btn-primary" disabled={envoi}>
                {envoi && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}{k("createAndGenerate")}
              </button>
            </div>
          </form>
        )}

        {/* ── Suggestions pour un rôle ──────────────────────────────────── */}
        <section className="ds-panel">
          <form onSubmit={proposer} style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 12, padding: 10 }}>
            <div style={{ flex: "1 1 260px", display: "flex", flexDirection: "column", gap: 2 }}>
              <h2 className="ds-h2">{k("suggest.title")}</h2>
              <p className="ds-sub">{k("suggest.hint")}</p>
            </div>
            <input className="ds-input" style={{ flex: "0 1 260px" }} value={role} onChange={(e) => setRole(e.target.value)} placeholder={k("fields.rolePlaceholder")} required aria-label={k("fields.role")} />
            <button type="submit" className="ds-btn" disabled={suggestion || !role.trim()}>
              {suggestion ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Sparkles size={14} />} {k("suggest.submit")}
            </button>
          </form>
          {propositions && (
            <>
              <div className="ds-inset" style={{ display: "flex", flexDirection: "column", padding: 0 }}>
                {propositions.map((p, i) => (
                  <label key={i} style={{ display: "flex", gap: 12, padding: "12px 14px", borderTop: i ? "1px solid var(--ds-line)" : "none", cursor: "pointer" }}>
                    <input type="checkbox" checked={retenues.has(i)} onChange={() => setRetenues((s) => { const n = new Set(s); if (n.has(i)) n.delete(i); else n.add(i); return n; })} />
                    <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <b style={{ fontSize: 14, fontWeight: 600 }}>{p.title} <span className="ds-chip">{k(`difficulty.${p.difficulty}`)}</span></b>
                      <span style={{ fontSize: 13 }}>{p.situation}</span>
                      {p.objective && <span className="ds-muted" style={{ fontSize: 12 }}>{p.objective}</span>}
                    </span>
                  </label>
                ))}
              </div>
              <div className="ds-panel-foot">
                <button type="button" className="ds-btn ds-btn-primary" onClick={garder} disabled={suggestion || !retenues.size}>
                  {k("suggest.keep", { count: retenues.size })}
                </button>
              </div>
            </>
          )}
        </section>

        {/* ── La liste ──────────────────────────────────────────────────── */}
        <section className="ds-panel">
          <h2 className="ds-h2" style={{ padding: "10px 10px 0" }}>{k("list")}</h2>
          <div className="ds-inset" style={{ display: "flex", flexDirection: "column", padding: liste?.length ? 0 : 14 }}>
            {liste === null && <Loader2 size={20} style={{ color: "var(--ds-ink-5)", animation: "spin 1s linear infinite" }} />}
            {liste?.length === 0 && <p className="ds-sub">{k("empty")}</p>}
            {(liste || []).map((m, i) => (
              <Link key={m.id} href={`/onboarding/modules/${m.id}`} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderTop: i ? "1px solid var(--ds-line)" : "none", textDecoration: "none", color: "inherit" }}>
                <span style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, minWidth: 0 }}>
                  <b style={{ fontSize: 14, fontWeight: 600 }}>{m.title}</b>
                  <span className="ds-muted" style={{ fontSize: 12 }}>
                    {[m.target_role, k(`difficulty.${m.difficulty}`), k("minScoreShort", { score: m.min_score }), (m.locale || "").toUpperCase()].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <span className="ds-chip">{m.simulation ? t(`dashboard.onb.status.${m.simulation.status}`) : k("noSimulation")}</span>
                <span className="ds-muted" style={{ fontSize: 12, minWidth: 110, textAlign: "right" }}>{k("assignedStats", { valides: m.valides, assignes: m.assignes })}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
