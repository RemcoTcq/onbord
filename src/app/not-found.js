// Cette page vit AU-DESSUS de app/[lang]/ : elle répond aussi bien à une URL
// du dashboard qu'à un lien candidat périmé. Elle ne peut donc pas lire de
// segment de langue — elle prend celle du provider racine, qui vient du
// cookie ou de l'Accept-Language. D'où le "use client" : c'est le seul moyen
// d'atteindre le contexte posé par app/layout.js.
"use client";

import { useT } from "@/lib/i18n/I18nProvider";
import { LocaleLink } from "@/lib/i18n/navigation";

export default function NotFound() {
  const t = useT();

  return (
    <div className="not-found-container">
      <div className="not-found-content fade-in">
        <h1 className="not-found-code">404</h1>
        <h2 className="not-found-title">{t("common.errors.notFound")}</h2>
        <p className="not-found-message">
          {t("common.errors.notFoundMessage")}
        </p>

        <div className="not-found-actions">
          <LocaleLink href="/" className="btn btn-primary btn-lg">
            {t("common.errors.backHome")}
          </LocaleLink>
        </div>
      </div>
    </div>
  );
}
