"use client";

// Entreprise → Personnages. Les personnes que vos équipes rencontrent en
// simulation : chacune a son nom, son entreprise, sa fonction, son caractère,
// sa langue et sa voix, et se réutilise dans n'importe quelle simulation
// (16/11/2026). On en crée une ici ou pendant la création d'une simulation ;
// on la supprime d'ici.

import { useState, useEffect, useCallback } from "react";
import { Loader2, Plus, Trash2, X } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useToast } from "@/components/ui/Toast";
import PageHeader from "@/components/layout/PageHeader";
import { LocaleLink as Link } from "@/lib/i18n/navigation";
import { initials } from "@/components/ui/ds";
import PersonaFiche from "@/components/personas/PersonaFiche";
import { listerPersonas, enregistrerPersona, supprimerPersona } from "@/lib/actions/personas";

export default function PersonasPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const k = (cle, vars) => t(`dashboard.personas.${cle}`, vars);
  const v = (cle, vars) => t(`dashboard.experienceEditor.voices.${cle}`, vars);
  const [liste, setListe] = useState(null);
  const [nouvelle, setNouvelle] = useState(null); // la fiche en cours de création
  const [envoi, setEnvoi] = useState(false);

  const charger = useCallback(async () => {
    const res = await listerPersonas();
    setListe(res.success ? res.personas : []);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    charger();
  }, [charger]);

  async function creer(e) {
    e.preventDefault();
    setEnvoi(true);
    const res = await enregistrerPersona({ data: nouvelle });
    setEnvoi(false);
    if (!res.success) return toast(k(`errors.${res.code || "generic"}`), "error");
    toast(k("created", { name: res.persona.name }), "success");
    setNouvelle(null);
    charger();
  }

  async function supprimer(p) {
    if (!window.confirm(k("deleteConfirm", { name: p.name }))) return;
    const res = await supprimerPersona(p.id);
    if (!res.success) return toast(k("errors.generic"), "error");
    toast(k("deleted", { name: p.name }), "success");
    charger();
  }

  const voix = (d) => {
    if (!d?.language) return "";
    const langue = v(`lang.${d.language}`);
    return [d.gender === "m" ? v("male") : v("female"), d.accent ? v("variant", { lang: langue, region: v(`region.${d.language}_${d.accent}`) }) : langue].join(" · ");
  };

  return (
    <>
      <PageHeader title={k("title")} actions={!nouvelle && (
        <button type="button" className="ds-btn ds-btn-primary" onClick={() => setNouvelle({ name: "" })}><Plus size={15} /> {k("new")}</button>
      )} />
      <div className="ds-body" style={{ maxWidth: 980, display: "flex", flexDirection: "column", gap: 16 }}>
        <p className="ds-sub">{k("subtitle")}</p>

        {nouvelle && (
          <form onSubmit={creer} className="ds-panel">
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 10px 0" }}>
              <h2 className="ds-h2" style={{ flex: 1 }}>{k("new")}</h2>
              <button type="button" className="ds-icon-btn" onClick={() => setNouvelle(null)} aria-label={t("common.actions.cancel")}><X size={16} /></button>
            </div>
            <div className="ds-inset"><PersonaFiche value={nouvelle} onChange={setNouvelle} /></div>
            <div className="ds-panel-foot">
              <button type="submit" className="ds-btn ds-btn-primary" disabled={envoi || !String(nouvelle.name || "").trim()}>
                {envoi && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}{k("create")}
              </button>
            </div>
          </form>
        )}

        <section className="ds-panel">
          <h2 className="ds-h2" style={{ padding: "10px 10px 0" }}>{k("library")}</h2>
          <div className="ds-inset" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
            {liste === null && <Loader2 size={20} style={{ color: "var(--ds-ink-5)", animation: "spin 1s linear infinite" }} />}
            {liste?.length === 0 && <p className="ds-sub">{k("empty")}</p>}
            {(liste || []).map((p) => (
              <div key={p.id} style={{ display: "flex", gap: 12, padding: 14, borderRadius: 12, background: "#fff", border: "1px solid var(--ds-line)" }}>
                <span className="ds-avatar">{initials(...String(p.name).split(" "))}</span>
                <Link href={`/bibliotheque/personnages/${p.id}`} style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0, flex: 1, textDecoration: "none", color: "inherit" }}>
                  <b style={{ fontSize: 14, fontWeight: 600 }}>{p.name}</b>
                  <span className="ds-muted" style={{ fontSize: 12 }}>{[p.role, p.company].filter(Boolean).join(" · ")}</span>
                  {voix(p.data) && <span className="ds-muted" style={{ fontSize: 12 }}>{voix(p.data)}</span>}
                  {p.data?.personality && <span style={{ fontSize: 12, color: "var(--ds-ink-3)", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{p.data.personality}</span>}
                </Link>
                <button type="button" className="ds-icon-btn" onClick={() => supprimer(p)} aria-label={k("delete", { name: p.name })} title={k("delete", { name: p.name })}>
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
