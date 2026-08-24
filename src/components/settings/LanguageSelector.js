"use client";

import { useState, useTransition } from "react";
// Le routeur BRUT de Next, pas notre enveloppe : celle-ci préfixerait avec la
// locale courante, alors qu'on veut justement naviguer vers la nouvelle.
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Check, Globe, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { UI_LOCALES, LOCALE_LABELS } from "@/lib/i18n/config";
import { swapLocale } from "@/lib/i18n/navigation";
import { setUiLocale } from "@/lib/i18n/actions-user";

// Sélecteur de langue de L'INTERFACE RECRUTEUR uniquement.
//
// Il ne touche pas à la langue vue par les candidats : celle-là se règle offre
// par offre (jobs.experience_locale). Le texte d'aide le dit explicitement,
// parce que c'est la confusion naturelle — un recruteur qui passe son dashboard
// en anglais s'attend à ce que ses offres suivent, et ce n'est pas ce qu'on
// veut : ses offres belges restent en néerlandais.

export default function LanguageSelector() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [saving, setSaving] = useState(null);

  async function choisir(next) {
    if (next === locale || saving) return;
    setSaving(next);

    // 1) Persistance (colonne users.ui_locale + cookie). Le cookie doit être
    //    posé AVANT la navigation : c'est lui que lira le proxy sur les
    //    chemins sans préfixe (parcours candidat, /join).
    const res = await setUiLocale(next);
    if (!res.success) { setSaving(null); return; }

    // 2) On NAVIGUE vers l'URL de l'autre langue plutôt que de basculer le
    //    dictionnaire sur place. La langue est dans l'URL : la changer sans
    //    changer d'adresse produirait un /fr/jobs affiché en anglais, donc un
    //    lien qu'on ne peut plus partager — exactement ce que le préfixe est
    //    censé garantir.
    //
    //    Le rendu serveur qui suit recharge le bon dictionnaire, met à jour
    //    <html lang> et les métadonnées. Pas de setLocale() côté client ici :
    //    il ferait clignoter l'interface dans la nouvelle langue avant que la
    //    navigation ne la rende pour de bon.
    const query = searchParams.toString();
    const cible = swapLocale(pathname, next) + (query ? `?${query}` : "");

    startTransition(() => {
      router.replace(cible);
      setSaving(null);
    });
  }

  return (
    <div>
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
        <Globe size={15} style={{ color: "var(--muted-foreground)" }} />
        {t("dashboard.preferences.uiLanguage")}
      </label>

      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        {UI_LOCALES.map((code) => {
          const actif = code === locale;
          return (
            <button
              key={code}
              type="button"
              onClick={() => choisir(code)}
              disabled={!!saving || pending}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "0.6rem 1rem", borderRadius: 10, fontSize: 14,
                fontFamily: "inherit", fontWeight: actif ? 700 : 500,
                cursor: saving || pending ? "wait" : "pointer",
                border: `1px solid ${actif ? "var(--primary)" : "var(--border)"}`,
                background: actif ? "var(--accent)" : "transparent",
                color: actif ? "var(--primary)" : "var(--foreground)",
              }}
            >
              {saving === code
                ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} />
                : actif ? <Check size={15} /> : null}
              {LOCALE_LABELS[code]}
            </button>
          );
        })}
      </div>

      <p style={{ fontSize: 12.5, color: "var(--muted-foreground)", lineHeight: 1.5, margin: 0 }}>
        {t("dashboard.preferences.uiLanguageHelp")}
      </p>
    </div>
  );
}
