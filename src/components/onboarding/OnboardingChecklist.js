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
        onClick={() => setMinimized(false)}
        style={{
          position: "fixed", bottom: "24px", right: "24px", zIndex: 100,
          background: "var(--primary)", color: "white", padding: "12px 20px",
          borderRadius: "30px", border: "none", cursor: "pointer", fontWeight: "700",
          boxShadow: "0 10px 25px rgba(0,0,0,0.15)", display: "flex", alignItems: "center", gap: "8px"
        }}
      >
        {t("dashboard.onboarding.progress", { done: doneCount, total: etapes.length })}
      </button>
    );
  }

  return (
    <div style={{
      position: "fixed", bottom: "24px", right: "24px", zIndex: 100,
      width: "340px", background: "var(--card)", border: "1px solid var(--border)",
      borderRadius: "16px", boxShadow: "0 10px 40px rgba(0,0,0,0.12)",
      overflow: "hidden", animation: "slideUp 0.4s ease"
    }}>
      <div style={{ padding: "20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
        <div>
          <h4 style={{ fontSize: "15px", fontWeight: "700" }}>{t("dashboard.onboarding.title")}</h4>
          <p style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>{t("dashboard.onboarding.ready")}</p>
        </div>
        <button onClick={() => setMinimized(true)} style={{ background: "transparent", border: "none", color: "var(--muted-foreground)", cursor: "pointer" }}>
          <X size={18} />
        </button>
      </div>

      <div style={{ height: "4px", background: "var(--secondary)" }}>
        <div style={{ height: "100%", width: `${progress}%`, background: "var(--primary)", transition: "width 0.6s ease" }} />
      </div>

      <div style={{ padding: "8px", display: "flex", flexDirection: "column" }}>
        {etapes.map((etape) => {
          const contenu = (
            <>
              {etape.done
                ? <CheckCircle2 size={20} style={{ color: "#22c55e", flexShrink: 0 }} />
                : <Circle size={20} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />}
              <span style={{
                fontSize: "13px", fontWeight: etape.done ? "600" : "500", flex: 1,
                textDecoration: etape.done ? "line-through" : "none",
                color: etape.done ? "var(--muted-foreground)" : "var(--foreground)",
              }}>
                {etape.label}
              </span>
              {/* Le chevron ne s'affiche que là où il y a quelque chose à aller
                  faire : sur une étape franchie, il inviterait à revenir en
                  arrière sans raison. */}
              {!etape.done && etape.href && (
                <ChevronRight size={15} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
              )}
            </>
          );

          const style = {
            display: "flex", alignItems: "center", gap: "12px",
            padding: "8px 10px", borderRadius: "8px",
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
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--secondary)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              {contenu}
            </Link>
          );
        })}
      </div>

      {tout && (
        <div style={{
          padding: "16px", background: "#f0fdf4", display: "flex",
          flexDirection: "column", gap: "8px", borderTop: "1px solid #bbf7d0"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <PartyPopper size={20} style={{ color: "#22c55e" }} />
            <p style={{ fontSize: "13px", fontWeight: "600", color: "#166534" }}>{t("dashboard.onboarding.done")}</p>
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
              background: "transparent", border: "none", color: "#166534",
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
