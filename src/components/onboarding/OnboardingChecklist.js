"use client";

import { useT } from "@/lib/i18n/I18nProvider";
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Circle, ChevronRight, PartyPopper, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { LocaleLink as Link } from "@/lib/i18n/navigation";
import { getOnboardingStatus } from "@/lib/actions/onboarding";

// Le parcours réel d'un recruteur, dans l'ordre où il le vit. Il a changé avec
// la bascule Experience : le guide décrivait encore « importer un candidat »
// puis « lancer un scoring », deux gestes qui n'existent plus — on n'importe
// plus personne, le candidat arrive par son lien, et le scoring part tout seul.
//
// Chaque étape porte OÙ ALLER pour la franchir : un guide qui dit quoi faire
// sans y emmener oblige à chercher, et c'est exactement le moment où on
// abandonne. `href` est une fonction du premier job, parce que deux des cinq
// destinations n'existent qu'une fois une offre créée.
const ETAPES = [
  { id: "compte", cle: "account", href: () => null },
  { id: "entreprise", cle: "company", href: () => "/compte/profil" },
  { id: "offre", cle: "firstJob", href: (jobId) => (jobId ? `/jobs/${jobId}` : "/jobs/nouveau") },
  { id: "experience", cle: "firstExperience", href: (jobId) => (jobId ? `/jobs/${jobId}/experience` : "/jobs/nouveau") },
  { id: "candidat", cle: "firstCandidate", href: (jobId) => (jobId ? `/jobs/${jobId}` : "/jobs/nouveau") },
];

export default function OnboardingChecklist({ user }) {
  const t = useT();
  const [status, setStatus] = useState(null);
  const [firstJobId, setFirstJobId] = useState(null);
  const [minimized, setMinimized] = useState(false);
  // Dérivé, pas recopié dans un état depuis un effet : le guide est terminé
  // quand la base le dit, ou quand on vient de cliquer « faire disparaître ».
  const [masqueALaMain, setMasqueALaMain] = useState(false);
  const termine = !!user?.onboarding_completed_at || masqueALaMain;

  const rafraichir = useCallback(() => {
    getOnboardingStatus().then((res) => {
      if (!res.success) return;
      setStatus(res.status);
      setFirstJobId(res.firstJobId);
    });
  }, []);

  useEffect(() => {
    if (user?.onboarding_completed_at) return;
    rafraichir();

    // Le recruteur quitte le tableau de bord pour franchir une étape et y
    // revient : le retour de focus est le moment JUSTE pour recompter. Le
    // sondage toutes les dix secondes d'avant interrogeait trois tables en
    // boucle pour un état qui, l'essentiel du temps, ne bougeait pas.
    window.addEventListener("focus", rafraichir);
    return () => window.removeEventListener("focus", rafraichir);
  }, [user, rafraichir]);

  if (termine || !status) return null;

  const etapes = ETAPES.map((e) => ({
    ...e,
    label: t(`dashboard.onboarding.steps.${e.cle}`),
    done: !!status[e.id],
    href: e.href(firstJobId),
  }));

  const doneCount = etapes.filter((e) => e.done).length;
  const tout = doneCount === etapes.length;
  const progress = (doneCount / etapes.length) * 100;

  if (minimized) {
    return (
      <button
        type="button"
        onClick={() => setMinimized(false)}
        className="ds-btn ds-btn-primary"
        style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 100, height: 44, padding: "0 18px",
          borderRadius: 999, boxShadow: "0 10px 28px var(--ds-blue-30), inset 0 1px 0 rgba(255,255,255,0.2)",
        }}
      >
        {t("dashboard.onboarding.progress", { done: doneCount, total: etapes.length })}
      </button>
    );
  }

  return (
    <div className="ds-card" style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 100,
      width: 340, borderRadius: 16, boxShadow: "var(--ds-shadow-modal)",
      overflow: "hidden", animation: "slideUp 0.4s ease"
    }}>
      <div style={{ padding: "14px 12px 12px 16px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <h4 className="ds-h2" style={{ fontSize: 15 }}>{t("dashboard.onboarding.title")}</h4>
          <p className="ds-sub" style={{ fontSize: 12 }}>{t("dashboard.onboarding.ready")}</p>
        </div>
        <button type="button" className="ds-icon-btn" onClick={() => setMinimized(true)} aria-label={t("dashboard.onboarding.minimize")}>
          <X size={16} />
        </button>
      </div>

      <div style={{ padding: "0 16px 6px" }}>
        <span className="ds-meter"><span style={{ width: `${progress}%` }} /></span>
      </div>

      <div style={{ padding: 8, display: "flex", flexDirection: "column" }}>
        {etapes.map((etape) => {
          const contenu = (
            <>
              {etape.done
                ? <CheckCircle2 size={18} style={{ color: "var(--ds-green)", flexShrink: 0 }} />
                : <Circle size={18} style={{ color: "var(--ds-ink-6)", flexShrink: 0 }} />}
              <span style={{
                fontSize: 13, fontWeight: 500, flex: 1,
                textDecoration: etape.done ? "line-through" : "none",
                color: etape.done ? "var(--ds-ink-4)" : "var(--ds-ink)",
              }}>
                {etape.label}
              </span>
              {/* Le chevron ne s'affiche que là où il y a quelque chose à aller
                  faire : sur une étape franchie, il inviterait à revenir en
                  arrière sans raison. */}
              {!etape.done && etape.href && (
                <ChevronRight size={15} style={{ color: "var(--ds-ink-6)", flexShrink: 0 }} />
              )}
            </>
          );

          const style = {
            display: "flex", alignItems: "center", gap: "12px",
            padding: "8px 10px", borderRadius: 9, color: "var(--ds-ink)",
            opacity: etape.done ? 1 : 0.85, textDecoration: "none",
          };

          if (etape.done || !etape.href) {
            return <div key={etape.id} style={style}>{contenu}</div>;
          }
          return (
            <Link
              key={etape.id}
              href={etape.href}
              style={{ ...style, cursor: "pointer" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--ds-soft)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              {contenu}
            </Link>
          );
        })}
      </div>

      {tout && (
        <div style={{
          padding: "12px 16px", background: "var(--ds-green-bg)", display: "flex",
          flexDirection: "column", gap: 6, borderTop: "1px solid #D4EEE1"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <PartyPopper size={18} style={{ color: "var(--ds-green)" }} />
            <p style={{ fontSize: 13, fontWeight: 500, color: "var(--ds-green-ink)", margin: 0 }}>{t("dashboard.onboarding.done")}</p>
          </div>
          <button
            onClick={async () => {
              const supabase = createClient();
              await supabase.from('users').update({
                onboarding_completed_at: new Date().toISOString()
              }).eq('id', user.id);
              setMasqueALaMain(true);
            }}
            style={{
              background: "transparent", border: "none", color: "var(--ds-green-ink)",
              fontSize: "12px", textDecoration: "underline", cursor: "pointer",
              alignSelf: "flex-start", padding: 0
            }}
          >
            {t("dashboard.onboarding.dismiss")}
          </button>
        </div>
      )}
    </div>
  );
}
