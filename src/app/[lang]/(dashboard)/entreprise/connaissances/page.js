"use client";

// Company → Knowledge (phase 1 de l'onboarding). Ce que l'entreprise apprend
// à Onbord : le résumé de son site (déjà là), des notes libres, et des
// documents (pitch deck, produit, tarifs, objections, politiques, FAQ). Tous
// les générateurs les lisent (lib/knowledge.js), recrutement comme onboarding.

import { useState, useEffect, useCallback } from "react";
import { Loader2, FileText, Trash2, Upload } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useToast } from "@/components/ui/Toast";
import PageHeader from "@/components/layout/PageHeader";
import { LocaleLink as Link } from "@/lib/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatDateShort } from "@/lib/i18n/format";
import { TYPES_DOCUMENT } from "@/lib/knowledge";
import { getKnowledge, saveKnowledgeNotes, addKnowledgeDocument, deleteKnowledgeDocument } from "@/lib/actions/knowledge";

const TAILLE_MAX = 20 * 1024 * 1024;
const ACCEPTE = ".pdf,.docx,.txt,.md";

/** Un nom de fichier sûr pour le chemin de stockage. */
const nomPropre = (nom) => String(nom || "document").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-80);

export default function KnowledgePage() {
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const [donnees, setDonnees] = useState(null);
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [fichier, setFichier] = useState(null);
  const [titre, setTitre] = useState("");
  const [type, setType] = useState("pitch_deck");
  const [envoi, setEnvoi] = useState(false);

  const charger = useCallback(async () => {
    const res = await getKnowledge();
    if (!res.success) return setDonnees({ erreur: true });
    setDonnees(res);
    setNotes(res.notes || "");
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    charger();
  }, [charger]);

  async function enregistrerNotes() {
    setSavingNotes(true);
    const res = await saveKnowledgeNotes(notes);
    setSavingNotes(false);
    toast(res.success ? t("dashboard.knowledge.notesSaved") : t("dashboard.knowledge.errors.generic"), res.success ? "success" : "error");
  }

  async function deposer(e) {
    e.preventDefault();
    if (!fichier) return;
    if (fichier.size > TAILLE_MAX) return toast(t("dashboard.knowledge.errors.taille"), "error");
    setEnvoi(true);
    const chemin = `${donnees.orgId}/${Date.now()}-${nomPropre(fichier.name)}`;
    const { error } = await createClient().storage.from("knowledge").upload(chemin, fichier, { upsert: false, contentType: fichier.type || undefined });
    if (error) {
      setEnvoi(false);
      return toast(t("dashboard.knowledge.errors.upload"), "error");
    }
    const res = await addKnowledgeDocument({ path: chemin, title: titre || fichier.name, kind: type });
    setEnvoi(false);
    if (!res.success) return toast(t(`dashboard.knowledge.errors.${res.code || "generic"}`), "error");
    toast(t("dashboard.knowledge.added", { title: res.document.title }), "success");
    setFichier(null);
    setTitre("");
    e.target.reset();
    charger();
  }

  async function supprimer(doc) {
    if (!window.confirm(t("dashboard.knowledge.deleteConfirm", { title: doc.title }))) return;
    const res = await deleteKnowledgeDocument(doc.id);
    if (!res.success) return toast(t("dashboard.knowledge.errors.generic"), "error");
    charger();
  }

  const entete = <PageHeader title={t("dashboard.knowledge.title")} />;

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

  return (
    <>
      {entete}
      <div className="ds-body" style={{ maxWidth: 820, display: "flex", flexDirection: "column", gap: 16 }}>
        <p className="ds-sub">{t("dashboard.knowledge.subtitle")}</p>

        {donnees.erreur ? (
          <div className="ds-panel"><p className="ds-sub" style={{ padding: 10 }}>{t("dashboard.knowledge.errors.generic")}</p></div>
        ) : (
          <>
            {/* ── Le résumé du site ─────────────────────────────────────── */}
            <section className="ds-panel">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 10px 0" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <h2 className="ds-h2">{t("dashboard.knowledge.site.title")}</h2>
                  <p className="ds-sub">{donnees.site.url || t("dashboard.knowledge.site.none")}</p>
                </div>
                <Link href="/compte/profil" className="ds-btn">{t("dashboard.knowledge.site.edit")}</Link>
              </div>
              <div className="ds-inset" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {lignesResume.length ? lignesResume.map(([cle, valeur]) => (
                  <p key={cle} style={{ fontSize: 13, lineHeight: 1.55 }}>
                    <b style={{ fontWeight: 600 }}>{t(`dashboard.knowledge.site.${cle}`)} : </b>{valeur}
                  </p>
                )) : <p className="ds-sub">{t("dashboard.knowledge.site.empty")}</p>}
              </div>
            </section>

            {/* ── Les notes ─────────────────────────────────────────────── */}
            <section className="ds-panel">
              <div style={{ display: "flex", flexDirection: "column", gap: 2, padding: "10px 10px 0" }}>
                <h2 className="ds-h2">{t("dashboard.knowledge.notes.title")}</h2>
                <p className="ds-sub">{t("dashboard.knowledge.notes.hint")}</p>
              </div>
              <div className="ds-inset">
                <textarea className="ds-textarea" rows={8} value={notes} onChange={(e) => setNotes(e.target.value)}
                  placeholder={t("dashboard.knowledge.notes.placeholder")} aria-label={t("dashboard.knowledge.notes.title")}
                  style={{ width: "100%", resize: "vertical" }} />
              </div>
              <div className="ds-panel-foot">
                <button type="button" className="ds-btn ds-btn-primary" onClick={enregistrerNotes} disabled={savingNotes}>
                  {savingNotes && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
                  {savingNotes ? t("common.states.saving") : t("dashboard.knowledge.notes.save")}
                </button>
              </div>
            </section>

            {/* ── Les documents ─────────────────────────────────────────── */}
            <section className="ds-panel">
              <div style={{ display: "flex", flexDirection: "column", gap: 2, padding: "10px 10px 0" }}>
                <h2 className="ds-h2">{t("dashboard.knowledge.documents.title")}</h2>
                <p className="ds-sub">{t("dashboard.knowledge.documents.hint")}</p>
              </div>
              <form onSubmit={deposer} className="ds-inset" style={{ display: "grid", gridTemplateColumns: "minmax(200px, 2fr) minmax(150px, 1fr)", gap: 14 }}>
                <label className="ds-field">
                  <span className="ds-label">{t("dashboard.knowledge.documents.file")}</span>
                  <input type="file" accept={ACCEPTE} className="ds-input" style={{ paddingTop: 8 }}
                    onChange={(e) => setFichier(e.target.files?.[0] || null)} required />
                </label>
                <label className="ds-field">
                  <span className="ds-label">{t("dashboard.knowledge.documents.kind")}</span>
                  <select className="ds-select" value={type} onChange={(e) => setType(e.target.value)}>
                    {TYPES_DOCUMENT.map((k) => <option key={k} value={k}>{t(`dashboard.knowledge.kinds.${k}`)}</option>)}
                  </select>
                </label>
                <label className="ds-field" style={{ gridColumn: "1 / -1" }}>
                  <span className="ds-label">{t("dashboard.knowledge.documents.titleLabel")}</span>
                  <input className="ds-input" value={titre} onChange={(e) => setTitre(e.target.value)}
                    placeholder={fichier?.name || t("dashboard.knowledge.documents.titlePlaceholder")} />
                </label>
                <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}>
                  <button type="submit" className="ds-btn ds-btn-primary" disabled={envoi || !fichier}>
                    {envoi ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Upload size={14} />}
                    {envoi ? t("dashboard.knowledge.documents.uploading") : t("dashboard.knowledge.documents.upload")}
                  </button>
                </div>
              </form>
              <div className="ds-inset" style={{ display: "flex", flexDirection: "column", padding: donnees.documents.length ? 0 : 14 }}>
                {!donnees.documents.length && <p className="ds-sub">{t("dashboard.knowledge.documents.empty")}</p>}
                {donnees.documents.map((doc, i) => (
                  <div key={doc.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderTop: i ? "1px solid var(--ds-line)" : "none" }}>
                    <FileText size={18} strokeWidth={1.8} style={{ color: "var(--ds-ink-4)", flex: "none" }} />
                    <span style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
                      <b style={{ fontSize: 14, fontWeight: 600 }}>{doc.title}</b>
                      <span className="ds-muted" style={{ fontSize: 12 }}>
                        {t(`dashboard.knowledge.kinds.${doc.kind}`)} · {t("dashboard.knowledge.documents.chars", { count: doc.caracteres })} · {formatDateShort(doc.created_at, locale)}
                      </span>
                    </span>
                    <button type="button" className="ds-btn" onClick={() => supprimer(doc)} aria-label={t("dashboard.knowledge.documents.delete", { title: doc.title })}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </>
  );
}
