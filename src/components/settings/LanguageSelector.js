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
    <section className="ds-panel">
      <h2 className="ds-h2" style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 10px 0" }}>
        <Globe size={16} style={{ color: "var(--ds-blue)" }} />
        {t("dashboard.preferences.uiLanguage")}
      </h2>
      <div className="ds-inset" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <p className="ds-sub" style={{ flex: "1 1 260px", lineHeight: 1.5 }}>{t("dashboard.preferences.uiLanguageHelp")}</p>
        <span role="radiogroup" aria-label={t("dashboard.preferences.uiLanguage")} style={{ display: "inline-flex", padding: 3, gap: 2, borderRadius: 9, background: "#FFFFFF", border: "1px solid var(--ds-line)" }}>
          {UI_LOCALES.map((code) => {
            const actif = code === locale;
            return (
              <button
                key={code}
                type="button"
                role="radio"
                aria-checked={actif}
                onClick={() => choisir(code)}
                disabled={!!saving || pending}
                style={{
                  display: "flex", alignItems: "center", gap: 6, height: 30, padding: "0 12px", border: 0, borderRadius: 7,
                  font: "inherit", fontSize: 13, cursor: saving || pending ? "wait" : "pointer",
                  background: actif ? "var(--ds-blue)" : "transparent", color: actif ? "#FFFFFF" : "var(--ds-ink-2)", fontWeight: actif ? 500 : 400,
                }}
              >
                {saving === code
                  ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                  : actif ? <Check size={14} /> : null}
                {LOCALE_LABELS[code]}
              </button>
            );
          })}
        </span>
      </div>
    </section>
  );
}
