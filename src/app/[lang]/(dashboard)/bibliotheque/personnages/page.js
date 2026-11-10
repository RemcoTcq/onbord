"use client";

// Library → Personas (phase 1 de l'onboarding). Les personnages de
// l'organisation : ceux des simulations (rangés à la génération, migration
// 040) et ceux créés ici à partir d'une phrase. Chaque fiche s'ouvre et se
// modifie entièrement ; une simulation qui l'utilise garde sa propre copie.

import { useState, useEffect, useCallback } from "react";
import { Loader2, Sparkles, Video, Phone, MessageSquare } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useToast } from "@/components/ui/Toast";
import PageHeader from "@/components/layout/PageHeader";
import { LocaleLink as Link, useRouter } from "@/lib/i18n/navigation";
import { initials } from "@/components/ui/ds";
import { EXPERIENCE_LOCALES, LOCALE_LABELS } from "@/lib/i18n/config";
import { MODES_PERSONA } from "@/lib/persona";
import { listerPersonas, genererPersona } from "@/lib/actions/personas";

const ICONES = { call: Video, phone: Phone, chat: MessageSquare };

export default function PersonasPage() {
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const router = useRouter();
  const [archives, setArchives] = useState(false);
  const [liste, setListe] = useState(null);
  const [brief, setBrief] = useState("");
  const [role, setRole] = useState("");
  const [mode, setMode] = useState("call");
  const [langue, setLangue] = useState(locale);
  const [generation, setGeneration] = useState(false);
  const k = (cle, vars) => t(`dashboard.personas.${cle}`, vars);

  const charger = useCallback(async () => {
    const res = await listerPersonas({ archives });
    setListe(res.success ? res.personas : []);
  }, [archives]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    charger();
  }, [charger]);

  async function generer(e) {
    e.preventDefault();
    setGeneration(true);
    const res = await genererPersona({ brief, role, mode, langue });
    setGeneration(false);
    if (!res.success) return toast(k(`errors.${res.code || "generation"}`), "error");
    router.push(`/bibliotheque/personnages/${res.persona.id}`);
  }

  return (
    <>
      <PageHeader title={k("title")} />
      <div className="ds-body" style={{ maxWidth: 980, display: "flex", flexDirection: "column", gap: 16 }}>
        <p className="ds-sub">{k("subtitle")}</p>

        {/* ── Générer une fiche ─────────────────────────────────────────── */}
        <form onSubmit={generer} className="ds-panel">
          <div style={{ display: "flex", flexDirection: "column", gap: 2, padding: "10px 10px 0" }}>
            <h2 className="ds-h2">{k("generate.title")}</h2>
            <p className="ds-sub">{k("generate.hint")}</p>
          </div>
          <div className="ds-inset" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
            <label className="ds-field" style={{ gridColumn: "1 / -1" }}>
              <span className="ds-label">{k("generate.brief")}</span>
              <textarea className="ds-textarea" rows={3} required value={brief} onChange={(e) => setBrief(e.target.value)}
                placeholder={k("generate.briefPlaceholder")} />
            </label>
            <label className="ds-field">
              <span className="ds-label">{k("generate.role")}</span>
              <input className="ds-input" value={role} onChange={(e) => setRole(e.target.value)} placeholder={k("generate.rolePlaceholder")} />
            </label>
            <label className="ds-field">
              <span className="ds-label">{k("generate.mode")}</span>
              <select className="ds-select" value={mode} onChange={(e) => setMode(e.target.value)}>
                {MODES_PERSONA.map((m) => <option key={m} value={m}>{t(`dashboard.experienceEditor.persona.modes.${m}`)}</option>)}
              </select>
            </label>
            <label className="ds-field">
              <span className="ds-label">{k("generate.language")}</span>
              <select className="ds-select" value={langue} onChange={(e) => setLangue(e.target.value)}>
                {EXPERIENCE_LOCALES.map((l) => <option key={l} value={l}>{LOCALE_LABELS[l]}</option>)}
              </select>
            </label>
          </div>
          <div className="ds-panel-foot">
            <button type="submit" className="ds-btn ds-btn-primary" disabled={generation || !brief.trim()}>
              {generation ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Sparkles size={14} />}
              {generation ? k("generate.pending") : k("generate.submit")}
            </button>
          </div>
        </form>

        {/* ── La bibliothèque ───────────────────────────────────────────── */}
        <section className="ds-panel">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 10px 0" }}>
            <h2 className="ds-h2">{archives ? k("archived") : k("library")}</h2>
            <button type="button" className="ds-btn" onClick={() => setArchives((v) => !v)}>
              {archives ? k("showActive") : k("showArchived")}
            </button>
          </div>
          <div className="ds-inset" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 }}>
            {liste === null && <Loader2 size={20} style={{ color: "var(--ds-ink-5)", animation: "spin 1s linear infinite" }} />}
            {liste?.length === 0 && <p className="ds-sub">{archives ? k("noArchived") : k("empty")}</p>}
            {(liste || []).map((p) => {
              const Icone = ICONES[p.data?.mode] || Video;
              return (
                <Link key={p.id} href={`/bibliotheque/personnages/${p.id}`} className="ds-card"
                  style={{ display: "flex", gap: 12, padding: 14, borderRadius: 12, background: "#fff", border: "1px solid var(--ds-line)", textDecoration: "none", color: "inherit" }}>
                  <span className="ds-avatar">{initials(...String(p.name).split(" "))}</span>
                  <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                    <b style={{ fontSize: 14, fontWeight: 600 }}>{p.name}</b>
                    <span className="ds-muted" style={{ fontSize: 12 }}>{[p.role, p.company].filter(Boolean).join(" · ")}</span>
                    <span className="ds-muted" style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 5 }}>
                      <Icone size={12} /> {t(`dashboard.experienceEditor.persona.modes.${p.data?.mode || "call"}`)}
                      {p.data?.language ? ` · ${String(p.data.language).toUpperCase()}` : ""}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </>
  );
}
