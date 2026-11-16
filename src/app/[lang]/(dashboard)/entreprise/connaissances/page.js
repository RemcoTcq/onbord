"use client";

// Entreprise → Connaissances. Ce que l'entreprise apprend à Onbord, et que
// tous les agents lisent — recrutement comme onboarding (lib/knowledge.js) :
//   • le résumé du site (profil de l'entreprise) ;
//   • les RUBRIQUES (16/11/2026, migration 045) : offre, acheteurs types,
//     concurrents, marchés — pré-remplissables depuis le site —, puis comment
//     on vend, fait du support, recrute ;
//   • les documents : pitch deck, transcriptions d'appels, échanges écrits,
//     playbooks… Chacun peut être mis de côté sans être supprimé : seuls les
//     documents actifs nourrissent les simulations.
// Les objections ne sont pas ici : elles se disent à l'agent de conception,
// simulation par simulation.

import { useState, useEffect, useCallback } from "react";
import { Loader2, FileText, Trash2, Upload, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useToast } from "@/components/ui/Toast";
import PageHeader from "@/components/layout/PageHeader";
import { LocaleLink as Link } from "@/lib/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatDateShort } from "@/lib/i18n/format";
import { TYPES_DOCUMENT, RUBRIQUES, RUBRIQUES_DU_SITE } from "@/lib/knowledge";
import {
  getKnowledge, saveKnowledgeNotes, saveKnowledgeSections, brouillonsDuSite,
  addKnowledgeDocument, deleteKnowledgeDocument, setKnowledgeDocumentActive,
} from "@/lib/actions/knowledge";

const TAILLE_MAX = 20 * 1024 * 1024;
const ACCEPTE = ".pdf,.docx,.txt,.md";

/** Un nom de fichier sûr pour le chemin de stockage. */
const nomPropre = (nom) => String(nom || "document").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-80);

export default function KnowledgePage() {
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const k = (cle, vars) => t(`dashboard.knowledge.${cle}`, vars);
  const [donnees, setDonnees] = useState(null);
  const [rubriques, setRubriques] = useState({});
  const [notes, setNotes] = useState("");
  const [enregistrement, setEnregistrement] = useState(false);
  const [modifie, setModifie] = useState(false);
  const [preremplissage, setPreremplissage] = useState(false);
  const [fichier, setFichier] = useState(null);
  const [titre, setTitre] = useState("");
  const [type, setType] = useState("pitch_deck");
  const [envoi, setEnvoi] = useState(false);

  const charger = useCallback(async () => {
    const res = await getKnowledge();
    if (!res.success) return setDonnees({ erreur: true });
    setDonnees(res);
    setRubriques(res.rubriques || {});
    setNotes(res.notes || "");
    setModifie(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    charger();
  }, [charger]);

  function changer(r, valeur) {
    setRubriques((s) => ({ ...s, [r]: valeur }));
    setModifie(true);
  }

  async function enregistrer() {
    setEnregistrement(true);
    const [a, b] = await Promise.all([saveKnowledgeSections(rubriques), saveKnowledgeNotes(notes)]);
    setEnregistrement(false);
    if (!a.success || !b.success) return toast(k("errors.generic"), "error");
    setModifie(false);
    toast(k("sectionsSaved"), "success");
  }

  async function preremplir() {
    const vides = RUBRIQUES_DU_SITE.filter((r) => !String(rubriques[r] || "").trim());
    const remplacer = vides.length < RUBRIQUES_DU_SITE.length;
    if (remplacer && !window.confirm(k("prefill.confirm"))) return;
    setPreremplissage(true);
    const res = await brouillonsDuSite();
    setPreremplissage(false);
    if (!res.success) return toast(k(`prefill.errors.${res.code || "generation"}`), "error");
    const remplies = Object.entries(res.brouillons).filter(([, v]) => v);
    if (!remplies.length) return toast(k("prefill.nothing"), "error");
    setRubriques((s) => ({ ...s, ...Object.fromEntries(remplies) }));
    setModifie(true);
    toast(k("prefill.done"), "success");
  }

  async function deposer(e) {
    e.preventDefault();
    if (!fichier) return;
    if (fichier.size > TAILLE_MAX) return toast(k("errors.taille"), "error");
    setEnvoi(true);
    const chemin = `${donnees.orgId}/${Date.now()}-${nomPropre(fichier.name)}`;
    const { error } = await createClient().storage.from("knowledge").upload(chemin, fichier, { upsert: false, contentType: fichier.type || undefined });
    if (error) {
      setEnvoi(false);
      return toast(k("errors.upload"), "error");
    }
    const res = await addKnowledgeDocument({ path: chemin, title: titre || fichier.name, kind: type });
    setEnvoi(false);
    if (!res.success) return toast(k(`errors.${res.code || "generic"}`), "error");
    toast(k("added", { title: res.document.title }), "success");
    setFichier(null);
    setTitre("");
    e.target.reset();
    const maj = await getKnowledge();
    if (maj.success) setDonnees(maj);
  }

  async function basculer(doc) {
    const res = await setKnowledgeDocumentActive(doc.id, !doc.active);
    if (!res.success) return toast(k("errors.generic"), "error");
    setDonnees((d) => ({ ...d, documents: d.documents.map((x) => (x.id === doc.id ? { ...x, active: !doc.active } : x)) }));
  }

  async function supprimer(doc) {
    if (!window.confirm(k("deleteConfirm", { title: doc.title }))) return;
    const res = await deleteKnowledgeDocument(doc.id);
    if (!res.success) return toast(k("errors.generic"), "error");
    setDonnees((d) => ({ ...d, documents: d.documents.filter((x) => x.id !== doc.id) }));
  }

  const boutonEnregistrer = (
    <button type="button" className="ds-btn ds-btn-primary" onClick={enregistrer} disabled={enregistrement || !modifie}>
      {enregistrement && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
      {enregistrement ? t("common.states.saving") : k("save")}
    </button>
  );
  const entete = <PageHeader title={k("title")} actions={donnees && !donnees.erreur ? boutonEnregistrer : null} />;

  if (!donnees) {
    return (
      <>
        {entete}
        <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
          <Loader2 size={22} style={{ color: "var(--ds-ink-5)", animation: "spin 1s linear infinite" }} />
        </div>
      </>
    );
  }

  const resume = donnees.site?.resume || {};
  const lignesResume = [
    ["description", resume.description],
    ["industry", resume.industry],
    ["targetMarket", resume.target_market],
    ["domain", resume.domain],
  ].filter(([, v]) => v);
  const actifs = (donnees.documents || []).filter((d) => d.active !== false).length;

  const rubrique = (r) => (
    <label key={r} className="ds-field">
      <span className="ds-label">{k(`sections.${r}.title`)}</span>
      <span className="ds-help" style={{ marginTop: -2 }}>{k(`sections.${r}.hint`)}</span>
      <textarea className="ds-textarea" rows={4} value={rubriques[r] || ""} onChange={(e) => changer(r, e.target.value)}
        placeholder={k(`sections.${r}.placeholder`)} style={{ width: "100%", resize: "vertical" }} />
    </label>
  );

  return (
    <>
      {entete}
      <div className="ds-body" style={{ maxWidth: 860, display: "flex", flexDirection: "column", gap: 16 }}>
        <p className="ds-sub">{k("subtitle")}</p>

        {donnees.erreur ? (
          <div className="ds-panel"><p className="ds-sub" style={{ padding: 10 }}>{k("errors.generic")}</p></div>
        ) : (
          <>
            {/* ── Le résumé du site ─────────────────────────────────────── */}
            <section className="ds-panel">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 10px 0" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <h2 className="ds-h2">{k("site.title")}</h2>
                  <p className="ds-sub">{donnees.site.url || k("site.none")}</p>
                </div>
                <Link href="/compte/profil" className="ds-btn">{k("site.edit")}</Link>
              </div>
              <div className="ds-inset" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {lignesResume.length ? lignesResume.map(([cle, valeur]) => (
                  <p key={cle} style={{ fontSize: 13, lineHeight: 1.55 }}>
                    <b style={{ fontWeight: 600 }}>{k(`site.${cle}`)} : </b>{valeur}
                  </p>
                )) : <p className="ds-sub">{k("site.empty")}</p>}
              </div>
            </section>

            {/* ── Ce qui se lit sur le site ─────────────────────────────── */}
            <section className="ds-panel">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, padding: "10px 10px 0" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: "1 1 320px" }}>
                  <h2 className="ds-h2">{k("groups.market.title")}</h2>
                  <p className="ds-sub">{k("groups.market.hint")}</p>
                </div>
                <button type="button" className="ds-btn" onClick={preremplir} disabled={preremplissage || !donnees.site.url}
                  title={donnees.site.url ? undefined : k("prefill.noSite")}>
                  {preremplissage ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Sparkles size={14} />}
                  {preremplissage ? k("prefill.pending") : k("prefill.submit")}
                </button>
              </div>
              <div className="ds-inset" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {RUBRIQUES_DU_SITE.map(rubrique)}
              </div>
            </section>

            {/* ── Comment l'entreprise travaille ────────────────────────── */}
            <section className="ds-panel">
              <div style={{ display: "flex", flexDirection: "column", gap: 2, padding: "10px 10px 0" }}>
                <h2 className="ds-h2">{k("groups.ways.title")}</h2>
                <p className="ds-sub">{k("groups.ways.hint")}</p>
              </div>
              <div className="ds-inset" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {RUBRIQUES.filter((r) => !RUBRIQUES_DU_SITE.includes(r)).map(rubrique)}
                <label className="ds-field">
                  <span className="ds-label">{k("notes.title")}</span>
                  <span className="ds-help" style={{ marginTop: -2 }}>{k("notes.hint")}</span>
                  <textarea className="ds-textarea" rows={4} value={notes} onChange={(e) => { setNotes(e.target.value); setModifie(true); }}
                    placeholder={k("notes.placeholder")} style={{ width: "100%", resize: "vertical" }} />
                </label>
              </div>
              <div className="ds-panel-foot">{boutonEnregistrer}</div>
            </section>

            {/* ── Les documents ─────────────────────────────────────────── */}
            <section className="ds-panel">
              <div style={{ display: "flex", flexDirection: "column", gap: 2, padding: "10px 10px 0" }}>
                <h2 className="ds-h2">{k("documents.title")}</h2>
                <p className="ds-sub">{k("documents.hint")}</p>
              </div>
              <form onSubmit={deposer} className="ds-inset" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
                <label className="ds-field">
                  <span className="ds-label">{k("documents.file")}</span>
                  <input type="file" accept={ACCEPTE} className="ds-input" style={{ paddingTop: 8 }}
                    onChange={(e) => setFichier(e.target.files?.[0] || null)} required />
                </label>
                <label className="ds-field">
                  <span className="ds-label">{k("documents.kind")}</span>
                  <select className="ds-select" value={type} onChange={(e) => setType(e.target.value)}>
                    {TYPES_DOCUMENT.map((x) => <option key={x} value={x}>{k(`kinds.${x}`)}</option>)}
                  </select>
                </label>
                <label className="ds-field" style={{ gridColumn: "1 / -1" }}>
                  <span className="ds-label">{k("documents.titleLabel")}</span>
                  <input className="ds-input" value={titre} onChange={(e) => setTitre(e.target.value)}
                    placeholder={fichier?.name || k("documents.titlePlaceholder")} />
                </label>
                <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}>
                  <button type="submit" className="ds-btn ds-btn-primary" disabled={envoi || !fichier}>
                    {envoi ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Upload size={14} />}
                    {envoi ? k("documents.uploading") : k("documents.upload")}
                  </button>
                </div>
              </form>
              {donnees.documents.length > 0 && (
                <p className="ds-help" style={{ padding: "0 14px" }}>{k("documents.activeCount", { count: actifs, total: donnees.documents.length })}</p>
              )}
              <div className="ds-inset" style={{ display: "flex", flexDirection: "column", padding: donnees.documents.length ? 0 : 14 }}>
                {!donnees.documents.length && <p className="ds-sub">{k("documents.empty")}</p>}
                {donnees.documents.map((doc, i) => {
                  const actif = doc.active !== false;
                  return (
                    <div key={doc.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderTop: i ? "1px solid var(--ds-line)" : "none", opacity: actif ? 1 : 0.6 }}>
                      <FileText size={18} strokeWidth={1.8} style={{ color: "var(--ds-ink-4)", flex: "none" }} />
                      <span style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
                        <b style={{ fontSize: 14, fontWeight: 600 }}>{doc.title}</b>
                        <span className="ds-muted" style={{ fontSize: 12 }}>
                          {k(`kinds.${doc.kind}`)} · {k("documents.chars", { count: doc.caracteres })} · {formatDateShort(doc.created_at, locale)}
                        </span>
                      </span>
                      <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }} title={k("documents.activeHint")}>
                        <input type="checkbox" checked={actif} onChange={() => basculer(doc)} />
                        {actif ? k("documents.active") : k("documents.inactive")}
                      </label>
                      <button type="button" className="ds-btn" onClick={() => supprimer(doc)} aria-label={k("documents.delete", { title: doc.title })}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </div>
    </>
  );
}
