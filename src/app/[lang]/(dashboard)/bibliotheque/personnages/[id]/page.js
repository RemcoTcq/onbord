"use client";

// Une fiche de personnage (16/11/2026) : la personne, telle qu'elle se
// réutilise d'une simulation à l'autre (components/personas/PersonaFiche.js).
// Enregistrer la fiche ne change PAS les simulations qui l'utilisent déjà —
// elles gardent leur copie.

import { useState, useEffect, use } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useToast } from "@/components/ui/Toast";
import PageHeader from "@/components/layout/PageHeader";
import { useRouter } from "@/lib/i18n/navigation";
import PersonaFiche from "@/components/personas/PersonaFiche";
import { getPersona, enregistrerPersona, supprimerPersona } from "@/lib/actions/personas";

export default function PersonaPage({ params }) {
  const { id } = use(params);
  const { t } = useI18n();
  const { toast } = useToast();
  const router = useRouter();
  const [fiche, setFiche] = useState(null);
  const [data, setData] = useState(null);
  const [erreur, setErreur] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const k = (cle, vars) => t(`dashboard.personas.${cle}`, vars);

  useEffect(() => {
    let actif = true;
    getPersona(id).then((res) => {
      if (!actif) return;
      if (!res.success) return setErreur(true);
      setFiche(res.persona);
      setData(res.persona.data);
    });
    return () => { actif = false; };
  }, [id]);

  async function enregistrer(e) {
    e.preventDefault();
    setEnvoi(true);
    const res = await enregistrerPersona({ id, data });
    setEnvoi(false);
    if (!res.success) return toast(k(`errors.${res.code || "generic"}`), "error");
    setFiche(res.persona);
    setData(res.persona.data);
    toast(k("saved"), "success");
  }

  async function supprimer() {
    if (!window.confirm(k("deleteConfirm", { name: fiche.name }))) return;
    const res = await supprimerPersona(id);
    if (!res.success) return toast(k("errors.generic"), "error");
    toast(k("deleted", { name: fiche.name }), "success");
    router.push("/bibliotheque/personnages");
  }

  const crumbs = [{ label: k("title"), href: "/bibliotheque/personnages" }];
  if (erreur) return (<><PageHeader crumbs={crumbs} title={k("notFound")} /><div className="ds-body"><p className="ds-sub">{k("notFound")}</p></div></>);
  if (!fiche) {
    return (
      <>
        <PageHeader crumbs={crumbs} title="…" />
        <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
          <Loader2 size={22} style={{ color: "var(--ds-ink-5)", animation: "spin 1s linear infinite" }} />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader crumbs={crumbs} title={data?.name || fiche.name} actions={
        <button type="button" className="ds-btn" onClick={supprimer}><Trash2 size={14} /> {k("deleteShort")}</button>
      } />
      <form onSubmit={enregistrer} className="ds-body" style={{ maxWidth: 820, display: "flex", flexDirection: "column", gap: 14 }}>
        <p className="ds-sub">{k("copyNote")}</p>
        <section className="ds-panel">
          <div className="ds-inset"><PersonaFiche value={data} onChange={setData} /></div>
          <div className="ds-panel-foot">
            <button type="submit" className="ds-btn ds-btn-primary" disabled={envoi || !String(data?.name || "").trim()}>
              {envoi && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
              {envoi ? t("common.states.saving") : k("save")}
            </button>
          </div>
        </section>
      </form>
    </>
  );
}
