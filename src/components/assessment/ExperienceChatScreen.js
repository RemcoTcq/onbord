"use client";

import { ArrowLeft } from "lucide-react";
import AssessmentChatCreator from "./AssessmentChatCreator";
import PageHeader from "@/components/layout/PageHeader";

// Écran du chat de conception d'expérience.
//
// Il occupe toute la carte de page du tableau de bord, sous l'en-tête commun :
// le chat n'est enfermé dans aucune autre carte, comme un vrai assistant. Le
// menu de gauche reste accessible.
//
// Un seul composant pour tous les points d'entrée (hub Expériences, conception
// et ajustement depuis une offre) : c'est ce qui garantit que le chat est le
// même écran partout.
//
// `crumbs` + `pageTitle` : fil d'Ariane de l'en-tête (depuis un job). Sans eux,
// l'en-tête affiche `title` et un bouton retour (`backLabel`, `onBack`).
export default function ExperienceChatScreen({
  jobId,
  jobData,
  title,
  backLabel,
  onBack,
  crumbs,
  pageTitle,
  actions = null,
  initialPrompt = "",
  onGenerated,
  onStepRegenerated,
  onUserMessage,
}) {
  const retour = !crumbs && onBack ? (
    <button type="button" onClick={onBack} className="ds-btn ds-btn-ghost ds-btn-sm">
      <ArrowLeft size={15} /> {backLabel}
    </button>
  ) : null;

  return (
    // Hauteur de la carte de page (100vh moins le cadre) : la zone de messages
    // défile seule, la saisie reste en bas.
    <div style={{ height: "calc(100vh - 22px)", display: "flex", flexDirection: "column" }}>
      <PageHeader
        crumbs={crumbs}
        title={pageTitle || title}
        actions={(retour || actions) ? <>{retour}{actions}</> : null}
      />

      {/* minHeight:0 : sans ça, l'enfant flex ne rétrécit pas et la zone de
          messages déborde au lieu de scroller. */}
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        <AssessmentChatCreator
          standalone context="job"
          jobId={jobId}
          jobData={jobData}
          initialPrompt={initialPrompt}
          onGenerated={onGenerated}
          onStepRegenerated={onStepRegenerated}
          onUserMessage={onUserMessage}
        />
      </div>
    </div>
  );
}
