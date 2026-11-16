"use client";

// Une étape de la simulation d'un MODULE (phase 2) : le même espace d'édition
// que pour une offre (EspaceEtape), lu depuis le module.

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "@/lib/i18n/navigation";
import { Loader2 } from "lucide-react";
import { getModule } from "@/lib/actions/modules";
import EspaceEtape from "@/components/experience/EspaceEtape";
import { useToast } from "@/components/ui/Toast";
import { useI18n } from "@/lib/i18n/I18nProvider";
import PageHeader from "@/components/layout/PageHeader";

export default function ModuleStepPage() {
  const { t } = useI18n();
  const { id, stepId } = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [donnees, setDonnees] = useState(null);
  const [onglet, setOnglet] = useState("scenario");
  const [fils, setFils] = useState({});

  // `rangASuivre` : après une nouvelle version, l'étape de ce rang remplace
  // celle de l'URL (même logique que la page d'étape d'une offre).
  const charger = useCallback(async (rangASuivre = null) => {
    const res = await getModule(id);
    if (!res.success) {
      toast(res.error || t("dashboard.experienceEditor.loadError"), "error");
      return setDonnees({ erreur: true });
    }
    if (rangASuivre != null && !res.steps.some((s) => s.id === stepId) && res.steps[rangASuivre]) {
      router.replace(`/onboarding/modules/${id}/etapes/${res.steps[rangASuivre].id}`);
    }
    setDonnees(res);
  }, [id, stepId, router, toast, t]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    charger();
  }, [charger]);

  if (!donnees) {
    return (<><PageHeader title="…" /><div style={{ display: "flex", justifyContent: "center", padding: 80 }}><Loader2 size={22} style={{ animation: "spin 1s linear infinite" }} /></div></>);
  }
  const retour = () => router.push(`/onboarding/modules/${id}`);
  const steps = donnees.steps || [];
  const index = steps.findIndex((s) => s.id === stepId);
  const step = steps[index];
  const crumbs = [
    { label: t("dashboard.sims.title"), href: "/simulations?usage=onboarding" },
    { label: donnees.module?.title || "—", href: `/onboarding/modules/${id}` },
  ];
  if (donnees.erreur || !step) {
    return (
      <>
        <PageHeader crumbs={crumbs} title={t("dashboard.experienceEditor.stepPage.notFound")} />
        <div className="ds-empty" style={{ padding: "64px 20px" }}>
          <button type="button" className="ds-btn ds-btn-md" onClick={retour}>{t("dashboard.experienceEditor.stepPage.back")}</button>
        </div>
      </>
    );
  }

  return (
    <EspaceEtape
      key={`${step.id}:${step.updated_at || ""}`}
      job={donnees.job}
      crumbs={crumbs}
      experience={donnees.experience}
      steps={steps}
      index={index}
      onglet={onglet}
      setOnglet={setOnglet}
      fil={fils[index] || []}
      setFil={(maj) => setFils((f) => ({ ...f, [index]: typeof maj === "function" ? maj(f[index] || []) : maj }))}
      onSaved={(saved) => setDonnees((d) => ({ ...d, steps: d.steps.map((s) => (s.id === saved.id ? { ...s, ...saved } : s)) }))}
      onVersion={(res) => {
        if (res?.forked) toast(t("dashboard.experienceEditor.forkedNotice", { version: res.version }));
        return charger(index);
      }}
      onRetour={retour}
      onAller={(sid) => router.push(`/onboarding/modules/${id}/etapes/${sid}`)}
      toast={toast}
    />
  );
}
