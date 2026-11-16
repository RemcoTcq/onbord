"use client";

// Le retour d'un essai (phase 3) : le score face au seuil du module, la
// synthèse rédigée pour le learner, puis chaque compétence avec ses points
// attendus (0/1/2) et les phrases qui les prouvent. Tant que la notation
// tourne (≈ une minute après la soumission), la page se recharge seule.

import { useCallback, useEffect, useState, use } from "react";
import { Loader2, ArrowLeft, RotateCcw, Play } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useToast } from "@/components/ui/Toast";
import { LocaleLink as Link, useRouter } from "@/lib/i18n/navigation";
import { formatDateShort } from "@/lib/i18n/format";
import { getEssai, demarrerEssai } from "@/lib/actions/formation";
import RetourEssai from "@/components/essai/RetourEssai";

export default function EssaiPage({ params }) {
  const { id } = use(params);
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const router = useRouter();
  const k = (cle, vars) => t(`dashboard.learner.${cle}`, vars);
  const [donnees, setDonnees] = useState(null);
  const [lance, setLance] = useState(false);

  const charger = useCallback(async () => {
    const res = await getEssai(id);
    setDonnees(res.success ? res : { erreur: true });
    return res;
  }, [id]);

  useEffect(() => {
    let minuterie;
    let annule = false;
    let tours = 0;
    // Toutes les 5 s, cinq minutes au plus : une notation en échec ne doit pas
    // faire tourner la page indéfiniment.
    const tour = async () => {
      const res = await charger();
      if (!annule && res.success && res.essai.statut === "submitted" && ++tours < 60) minuterie = setTimeout(tour, 5000);
    };
    tour();
    return () => { annule = true; clearTimeout(minuterie); };
  }, [charger]);

  async function refaire() {
    setLance(true);
    const res = await demarrerEssai(donnees.essai.assignmentId);
    if (!res.success) {
      setLance(false);
      return toast(k(`errors.${res.code || "generic"}`), "error");
    }
    router.push(`/run/${res.runId}`);
  }

  const retour = (
    <Link href="/formation" className="ds-link" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13 }}>
      <ArrowLeft size={14} /> {k("title")}
    </Link>
  );
  if (!donnees) return <div style={{ display: "flex", justifyContent: "center", padding: 48 }}><Loader2 size={22} style={{ animation: "spin 1s linear infinite" }} /></div>;
  if (donnees.erreur) return <>{retour}<p className="ds-sub">{k("attempt.notFound")}</p></>;

  const { essai, module } = donnees;
  const minScore = module?.minScore ?? 70;
  const reussi = essai.note != null && essai.note >= minScore;
  const enTete = (
    <section className="ds-panel">
      <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: 10 }}>
        <span className="ds-eyebrow">{k("attempt.title", { n: essai.numero || "?" })} · {formatDateShort(essai.fin || essai.debut, locale)}</span>
        <h1 className="ds-h1">{module?.titre || "—"}</h1>
      </div>
    </section>
  );

  if (essai.statut === "in_progress") {
    return (
      <>{retour}{enTete}
        <section className="ds-panel"><div className="ds-inset" style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <p className="ds-sub" style={{ flex: 1 }}>{k("attempt.inProgress")}</p>
          <a href={`/run/${essai.id}`} className="ds-btn ds-btn-primary"><Play size={14} /> {k("attempt.continue")}</a>
        </div></section>
      </>
    );
  }

  if (essai.note == null) {
    return (
      <>{retour}{enTete}
        <section className="ds-panel"><div className="ds-inset" style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Loader2 size={18} style={{ animation: "spin 1s linear infinite", flexShrink: 0 }} />
          <p className="ds-sub">{k("attempt.scoring")}</p>
        </div></section>
      </>
    );
  }

  const indice = module?.statut === "validated" ? k("attempt.validatedHint") : reussi ? k("attempt.passedHint") : k("attempt.notPassedHint");
  return (
    <>
      {retour}
      {enTete}
      <RetourEssai
        essai={essai}
        minScore={minScore}
        indice={indice}
        action={module?.statut !== "validated" && essai.assignmentId && (
          <button type="button" className={`ds-btn ${reussi ? "" : "ds-btn-primary"}`} disabled={lance} onClick={refaire}>
            {lance ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <RotateCcw size={14} />} {k("attempt.retry")}
          </button>
        )}
      />
    </>
  );
}
