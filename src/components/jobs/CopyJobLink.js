"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";
import { useT } from "@/lib/i18n/I18nProvider";
import { useToast } from "@/components/ui/Toast";
import { getJobEntry } from "@/lib/actions/run";
import { entryIsOpen } from "@/lib/candidateEntry";

/** URL publique de candidature — l'origine locale en dev, la production sinon. */
export function lienPublic(jobId) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const isLocal = origin.includes("localhost") || origin.includes("127.0.0.1");
  return isLocal ? `${origin}/apply/${jobId}` : `https://app.onbord.be/apply/${jobId}`;
}

/**
 * Copie le lien public d'un job.
 *
 * Même digue que l'écran du job : tant qu'aucune simulation n'est publiée, le
 * lien mène à un écran d'attente, on refuse donc de le copier. Le verdict vient
 * du serveur au clic (getJobEntry), pas d'une donnée de liste qui pourrait être
 * périmée.
 *
 * `variant` : "icon" (bouton carré, listes) ou "button" (bouton plein, en-tête).
 * `open` : verdict déjà connu de l'appelant, pour éviter l'aller-retour.
 */
export default function CopyJobLink({ jobId, variant = "icon", open, className = "", style }) {
  const t = useT();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  async function copier(e) {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    let ouvert = open;
    if (ouvert == null) {
      setBusy(true);
      const res = await getJobEntry(jobId);
      setBusy(false);
      ouvert = entryIsOpen(res?.entry);
    }
    if (!ouvert) {
      toast(t("dashboard.jobDetail.publishFirst"), "error");
      return;
    }
    navigator.clipboard.writeText(lienPublic(jobId));
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
    toast(t("dashboard.jobDetail.publicLinkCopied"));
  }

  const label = copied ? t("dashboard.common.linkCopied") : t("dashboard.common.copyPublicLink");

  if (variant === "button") {
    return (
      <button
        type="button"
        onClick={copier}
        className={`ds-btn ${copied ? "ds-btn-success" : "ds-btn-primary"} ${className}`}
        disabled={open === false}
        title={open === false ? t("dashboard.jobDetail.publishFirst") : undefined}
        style={style}
      >
        {copied ? <Check size={15} strokeWidth={2.4} /> : <Link2 size={15} strokeWidth={2} />}
        {label}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={copier}
      aria-label={label}
      title={label}
      className={`ds-icon-btn ${copied ? "is-copied" : ""} ${className}`}
      style={style}
    >
      {copied ? <Check size={15} strokeWidth={2.4} /> : <Link2 size={15} strokeWidth={2} />}
    </button>
  );
}
