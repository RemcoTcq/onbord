"use client";

import { useState } from "react";
import { MailCheck, Loader2 } from "lucide-react";
import { LocaleLink as Link } from "@/lib/i18n/navigation";
import { useT } from "@/lib/i18n/I18nProvider";
import { createClient } from "@/lib/supabase/client";

/**
 * Écran d'attente affiché après une inscription qui exige une confirmation.
 *
 * ── Pourquoi il existe ───────────────────────────────────────────────────────
 * Quand la confirmation d'e-mail est activée, `signUp()` réussit mais ne rend
 * AUCUNE session. Les deux écrans d'inscription redirigeaient malgré tout vers
 * /accueil : le proxy n'y trouvait personne et renvoyait au login, sans un mot.
 * L'inscrit lisait un échec là où tout s'était bien passé, recommençait, et
 * s'entendait répondre que son adresse était déjà prise.
 *
 * Partagé entre /register et /join : deux copies de cet écran divergeraient, et
 * c'est le dernier endroit où on peut se permettre d'être approximatif.
 */
export default function ConfirmEmailNotice({ email }) {
  const t = useT();
  const [renvoi, setRenvoi] = useState("idle"); // idle | envoi | envoye | erreur
  const [erreur, setErreur] = useState(null);

  async function renvoyer() {
    setRenvoi("envoi");
    setErreur(null);
    const { error } = await createClient().auth.resend({ type: "signup", email });
    if (error) {
      // Le cas le plus fréquent est la limite de débit de l'envoi de mails :
      // le message de Supabase le dit mieux qu'une phrase générique.
      setErreur(error.message);
      setRenvoi("erreur");
    } else {
      setRenvoi("envoye");
    }
  }

  return (
    <div className="card" style={{ padding: "2rem", textAlign: "center" }}>
      <div style={{
        width: 56, height: 56, borderRadius: "50%", background: "#dcfce7", color: "#166534",
        display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.25rem",
      }}>
        <MailCheck size={28} />
      </div>

      <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--foreground)" }}>
        {t("common.auth.confirmTitle")}
      </h2>

      <p style={{ color: "var(--muted-foreground)", marginTop: "0.75rem", lineHeight: 1.6, fontSize: "0.95rem" }}>
        {t("common.auth.confirmBody", { email })}
      </p>
      <p style={{ color: "var(--muted-foreground)", marginTop: "0.75rem", lineHeight: 1.6, fontSize: "0.85rem" }}>
        {t("common.auth.confirmSpamHint")}
      </p>

      {renvoi === "envoye" ? (
        <p style={{ marginTop: "1.5rem", fontSize: "0.875rem", color: "#166534", fontWeight: 600 }}>
          {t("common.auth.confirmResent")}
        </p>
      ) : (
        <button
          type="button"
          className="btn btn-outline"
          onClick={renvoyer}
          disabled={renvoi === "envoi"}
          style={{ marginTop: "1.5rem", display: "inline-flex", alignItems: "center", gap: "8px" }}
        >
          {renvoi === "envoi" && <Loader2 size={16} className="spin" />}
          {t("common.auth.confirmResend")}
        </button>
      )}

      {erreur && (
        <p style={{ marginTop: "0.75rem", fontSize: "0.8rem", color: "var(--destructive)" }}>{erreur}</p>
      )}

      <div style={{ marginTop: "2rem", paddingTop: "1.25rem", borderTop: "1px solid var(--border)" }}>
        <p style={{ fontSize: "0.875rem", color: "var(--muted-foreground)" }}>
          {t("common.auth.confirmAlreadyDone")}{" "}
          <Link href="/login" style={{ color: "var(--primary)", fontWeight: 500 }}>
            {t("common.auth.signIn")}
          </Link>
        </p>
      </div>
    </div>
  );
}
