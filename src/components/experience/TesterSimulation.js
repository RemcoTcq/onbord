"use client";

// « Tester » une simulation avant de la publier ou de l'assigner (16/11/2026) :
// celui qui la construit la joue en entier, sur l'écran du parcours, puis lit
// son retour. Un test complet par simulation (lib/actions/tests.js) : le
// bouton lance le test, le reprend s'il est en cours, puis mène à son retour.
//
//   <TesterSimulation moduleId={id} />   module d'onboarding
//   <TesterSimulation jobId={id} />      simulation d'une offre
//
// `signal` : une valeur qui change quand la simulation change (régénération),
// pour relire l'état.

import { useEffect, useState } from "react";
import { Loader2, Play, FileText } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useToast } from "@/components/ui/Toast";
import { LocaleLink as Link, useRouter } from "@/lib/i18n/navigation";
import { etatTest, demarrerTest } from "@/lib/actions/tests";

export default function TesterSimulation({ moduleId = null, jobId = null, signal = null, disabled = false }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const router = useRouter();
  const k = (cle, vars) => t(`dashboard.sims.test.${cle}`, vars);
  const [etat, setEtat] = useState(null);
  const [lance, setLance] = useState(false);

  useEffect(() => {
    let actif = true;
    etatTest({ moduleId, jobId }).then((r) => { if (actif) setEtat(r.success ? r : null); });
    return () => { actif = false; };
  }, [moduleId, jobId, signal]);

  if (!etat?.pret) return null;

  async function tester() {
    setLance(true);
    const res = await demarrerTest({ moduleId, jobId });
    if (!res.success) {
      setLance(false);
      return toast(k(`errors.${res.code || "generic"}`), "error");
    }
    router.push(`/run/${res.runId}`);
  }

  // Le test est fait : il ne reste qu'à lire son retour.
  if (!etat.reprendre && etat.restants === 0 && etat.dernier) {
    return (
      <Link href={`/simulations/tests/${etat.dernier.id}`} className="ds-btn" title={k("usedHint")}>
        <FileText size={14} /> {etat.dernier.note != null ? k("seeScore", { score: etat.dernier.note }) : k("see")}
      </Link>
    );
  }

  return (
    <button type="button" className="ds-btn" onClick={tester} disabled={lance || disabled} title={k("hint")}>
      {lance ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Play size={14} />}
      {etat.reprendre ? k("resume") : k("start")}
    </button>
  );
}
