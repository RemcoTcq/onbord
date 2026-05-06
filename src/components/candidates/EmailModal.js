"use client";

import { useState } from "react";
import { X, Copy, Check, Loader2 } from "lucide-react";
import { logMailSent } from "@/lib/actions/candidate";
import { useToast } from "@/components/ui/Toast";

const TEMPLATES = {
  interview_invitation: {
    label: "Invitation interview IA",
    subject: "Invitation à un entretien vidéo pour le poste de {{titre_du_poste}}",
    body: `Bonjour {{prénom_candidat}},

Merci pour votre intérêt pour le poste de {{titre_du_poste}} chez {{nom_entreprise}}.

Nous avons bien reçu votre candidature et nous souhaiterions en savoir plus sur votre profil. Pour cela, nous vous invitons à réaliser un court entretien en ligne (10-15 minutes), disponible ici : {{lien_interview}}

Cet entretien est disponible quand vous le souhaitez, depuis votre ordinateur.

À très bientôt,

{{prénom_recruteur}} — {{nom_entreprise}}`
  },
  selected: {
    label: "Candidat sélectionné",
    subject: "Votre candidature chez {{nom_entreprise}}",
    body: `Bonjour {{prénom_candidat}},

Nous avons le plaisir de vous informer que votre candidature pour le poste de {{titre_du_poste}} a retenu toute notre attention.

Nous allons revenir vers vous très prochainement pour convenir d'un entretien avec notre équipe.

Merci pour l'intérêt que vous portez à {{nom_entreprise}}.

À bientôt,

{{prénom_recruteur}} — {{nom_entreprise}}`
  },
  rejected: {
    label: "Candidat refusé",
    subject: "Votre candidature pour le poste de {{titre_du_poste}}",
    body: `Bonjour {{prénom_candidat}},

Nous vous remercions d'avoir postulé pour le poste de {{titre_du_poste}} chez {{nom_entreprise}} et du temps que vous y avez consacré.

Après examen de votre candidature, nous ne sommes malheureusement pas en mesure de donner une suite favorable à votre dossier pour ce poste.

Nous vous souhaitons plein succès dans votre recherche.

Cordialement,

{{prénom_recruteur}} — {{nom_entreprise}}`
  }
};

export default function EmailModal({ isOpen, onClose, candidate, job, currentUser, onLogged, existingLogs = [] }) {
  const [selectedType, setSelectedType] = useState("interview_invitation");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const isAlreadySent = existingLogs.some(log => log.mail_type === selectedType);

  if (!isOpen) return null;

  const variables = {
    "{{prénom_candidat}}": candidate.first_name,
    "{{titre_du_poste}}": job.title,
    "{{nom_entreprise}}": currentUser?.user_metadata?.company_name || "Onbord",
    "{{lien_interview}}": `${typeof window !== "undefined" ? window.location.origin : ""}/interview/${candidate.interview_token}`,
    "{{prénom_recruteur}}": currentUser?.user_metadata?.first_name || currentUser?.email?.split("@")[0] || "Recruteur",
  };

  const template = TEMPLATES[selectedType];
  let body = template.body;
  let subject = template.subject;

  Object.entries(variables).forEach(([key, value]) => {
    body = body.replaceAll(key, value);
    subject = subject.replaceAll(key, value);
  });

  const handleCopy = async () => {
    setLoading(true);
    try {
      const fullText = `Objet : ${subject}\n\n${body}`;
      await navigator.clipboard.writeText(fullText);
      
      const res = await logMailSent(candidate.id, job.id, selectedType);
      if (res.success) {
        setCopied(true);
        toast("Mail copié et enregistré dans l'historique !");
        if (onLogged) onLogged();
        setTimeout(() => setCopied(false), 2000);
      } else {
        toast("Mail copié, mais erreur lors de l'enregistrement de l'historique.", "error");
      }
    } catch (err) {
      toast("Erreur lors de la copie.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
      padding: "20px"
    }}>
      <div className="card fade-in" style={{ width: "100%", maxWidth: "600px", padding: 0, overflow: "hidden" }}>
        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h2 style={{ fontSize: "18px", fontWeight: "700" }}>Générer un mail</h2>
            <p style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>Pour {candidate.first_name} {candidate.last_name}</p>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-icon"><X size={20} /></button>
        </div>

        {/* Content */}
        <div style={{ padding: "24px" }}>
          {/* Template Selector */}
          <div style={{ display: "flex", gap: "8px", marginBottom: "24px" }}>
            {Object.entries(TEMPLATES).map(([type, t]) => (
              <button
                key={type}
                onClick={() => { setSelectedType(type); setCopied(false); }}
                style={{
                  flex: 1, padding: "10px", borderRadius: "10px", fontSize: "13px", fontWeight: "600",
                  background: selectedType === type ? "var(--primary)" : "var(--secondary)",
                  color: selectedType === type ? "white" : "var(--muted-foreground)",
                  border: "none", cursor: "pointer", transition: "all 0.2s"
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Preview Area */}
          <div style={{
            background: "var(--background)", border: "1px solid var(--border)", borderRadius: "12px",
            padding: "20px", display: "flex", flexDirection: "column", gap: "12px"
          }}>
            <div style={{ paddingBottom: "12px", borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Objet</span>
              <p style={{ fontSize: "14px", fontWeight: "600", marginTop: "4px" }}>{subject}</p>
            </div>
            <div style={{ whiteSpace: "pre-wrap", fontSize: "14px", lineHeight: "1.6", color: "var(--foreground)", maxHeight: "300px", overflowY: "auto" }}>
              {body}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "20px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: "12px", background: "var(--card)" }}>
          <button className="btn btn-ghost" onClick={onClose}>Annuler</button>
          <button
            className="btn btn-primary"
            onClick={handleCopy}
            disabled={loading || isAlreadySent}
            style={{ minWidth: "140px", opacity: isAlreadySent ? 0.6 : 1 }}
          >
            {loading ? <Loader2 size={18} className="spin" /> : copied ? <Check size={18} /> : isAlreadySent ? <Check size={18} /> : <Copy size={18} />}
            {copied ? "Copié !" : isAlreadySent ? "Mail déjà généré" : "Copier le mail"}
          </button>
        </div>
      </div>
    </div>
  );
}
