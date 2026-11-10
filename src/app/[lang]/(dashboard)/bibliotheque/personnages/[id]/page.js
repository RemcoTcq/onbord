"use client";

// Une fiche de personnage de la bibliothèque (phase 1 de l'onboarding).
// Les mêmes éditeurs que dans une étape de simulation (RecitPersona pour ce
// qu'il est et ce qu'il cache, PersonaReglages pour le canal et la voix) :
// un personnage se modifie pareil, où qu'il soit. Enregistrer la fiche ne
// change PAS les simulations qui l'utilisent déjà — elles gardent leur copie.

import { useState, useEffect, use } from "react";
import { Loader2, Archive, ArchiveRestore } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useToast } from "@/components/ui/Toast";
import PageHeader from "@/components/layout/PageHeader";
import { RecitPersona } from "@/components/experience/RecitsScenes";
import { PersonaReglages } from "@/components/experience/EditeursScene";
import { Panneau } from "@/components/experience/ui";
import { getPersona, enregistrerPersona, archiverPersona } from "@/lib/actions/personas";

export default function PersonaPage({ params }) {
  const { id } = use(params);
  const { t } = useI18n();
  const { toast } = useToast();
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

  async function enregistrer() {
    setEnvoi(true);
    const res = await enregistrerPersona({ id, data });
    setEnvoi(false);
    if (!res.success) return toast(k(`errors.${res.code || "generic"}`), "error");
    setFiche(res.persona);
    setData(res.persona.data);
    toast(k("saved"), "success");
  }

  async function basculerArchive() {
    const res = await archiverPersona(id, !fiche.archived_at);
    if (!res.success) return toast(k("errors.generic"), "error");
    setFiche({ ...fiche, archived_at: fiche.archived_at ? null : new Date().toISOString() });
  }

  const crumbs = [{ label: k("title"), href: "/bibliotheque/personnages" }];

  if (erreur) {
    return (
      <>
        <PageHeader crumbs={crumbs} title={k("notFound")} />
        <div className="ds-body"><p className="ds-sub">{k("notFound")}</p></div>
      </>
    );
  }
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
      <PageHeader
        crumbs={crumbs}
        title={data?.name || fiche.name}
        actions={
          <>
            <button type="button" className="ds-btn" onClick={basculerArchive}>
              {fiche.archived_at ? <ArchiveRestore size={14} /> : <Archive size={14} />}
              {fiche.archived_at ? k("unarchive") : k("archive")}
            </button>
            <button type="button" className="ds-btn ds-btn-primary" onClick={enregistrer} disabled={envoi}>
              {envoi && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
              {envoi ? t("common.states.saving") : k("save")}
            </button>
          </>
        }
      />
      <div className="ds-body" style={{ maxWidth: 820, display: "flex", flexDirection: "column", gap: 14 }}>
        <p className="ds-sub">{k("copyNote")}</p>
        <RecitPersona persona={data} onChange={setData} />
        <Panneau id="ds-reglages-personnage" titre={k("settings")}>
          <PersonaReglages persona={data} onChange={setData} />
        </Panneau>
      </div>
    </>
  );
}
