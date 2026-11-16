"use client";

// Le retour d'un TEST (16/11/2026) : ce que recevra la personne qui jouera la
// simulation, lu par celui qui la construit avant de la publier. Tant que la
// notation tourne (≈ une minute après la soumission), la page se recharge
// seule.

import { useCallback, useEffect, useState, use } from "react";
import { Loader2, Play } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { formatDateShort } from "@/lib/i18n/format";
import PageHeader from "@/components/layout/PageHeader";
import { LocaleLink as Link } from "@/lib/i18n/navigation";
import { getTest } from "@/lib/actions/tests";
import RetourEssai from "@/components/essai/RetourEssai";

export default function TestPage({ params }) {
  const { id } = use(params);
  const { t, locale } = useI18n();
  const k = (cle, vars) => t(`dashboard.sims.test.${cle}`, vars);
  const [donnees, setDonnees] = useState(null);

  const charger = useCallback(async () => {
    const res = await getTest(id);
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

  const crumbs = [{ label: t("dashboard.sims.title"), href: "/simulations" }];
  if (!donnees) return (<><PageHeader crumbs={crumbs} title={k("pageTitle")} /><div style={{ display: "flex", justifyContent: "center", padding: 48 }}><Loader2 size={22} style={{ animation: "spin 1s linear infinite" }} /></div></>);
  if (donnees.erreur) return (<><PageHeader crumbs={crumbs} title={k("pageTitle")} /><div className="ds-body"><p className="ds-sub">{k("notFound")}</p></div></>);

  const { essai, simulation } = donnees;
  return (
    <>
      <PageHeader
        crumbs={[...crumbs, { label: simulation.titre || "—", href: simulation.retour }]}
        title={k("pageTitle")}
        actions={<Link href={simulation.retour} className="ds-btn">{k("back")}</Link>}
      />
      <div className="ds-body" style={{ maxWidth: 860, display: "flex", flexDirection: "column", gap: 16 }}>
        <section className="ds-panel">
          <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: 10 }}>
            <span className="ds-eyebrow">{k("pageTitle")} · {formatDateShort(essai.fin || essai.debut, locale)}</span>
            <h2 className="ds-h1">{simulation.titre || "—"}</h2>
          </div>
        </section>

        {essai.statut === "in_progress" && (
          <section className="ds-panel"><div className="ds-inset" style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <p className="ds-sub" style={{ flex: 1 }}>{k("inProgress")}</p>
            {essai.aMoi && <a href={`/run/${essai.id}`} className="ds-btn ds-btn-primary"><Play size={14} /> {k("resume")}</a>}
          </div></section>
        )}

        {essai.statut !== "in_progress" && essai.note == null && (
          <section className="ds-panel"><div className="ds-inset" style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Loader2 size={18} style={{ animation: "spin 1s linear infinite", flexShrink: 0 }} />
            <p className="ds-sub">{k("scoring")}</p>
          </div></section>
        )}

        {essai.note != null && <RetourEssai essai={essai} minScore={simulation.minScore} indice={k("feedbackHint")} />}
      </div>
    </>
  );
}
