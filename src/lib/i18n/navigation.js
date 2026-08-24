"use client";

// Navigation qui conserve le préfixe de langue.
//
// Sans ces enveloppes, un `router.push("/jobs")` depuis /en/jobs/123 renvoie sur
// /jobs, que le proxy re-redirige vers /fr/jobs ou /en/jobs selon le cookie.
// Deux conséquences, toutes deux mauvaises :
//   • un aller-retour visible dans la barre d'adresse à chaque clic ;
//   • une URL qui perd sa langue, donc un lien qu'on ne peut plus partager.
//
// On ne réécrit QUE les chemins de l'interface recruteur. Les URL du parcours
// candidat (/run, /apply, /assessment, /interview, /join) n'ont pas de préfixe
// par conception — voir app/[lang]/layout.js — et les toucher ici casserait
// justement ce qu'on cherche à préserver.

import Link from "next/link";
import { useRouter as useNextRouter } from "next/navigation";
import { useCallback, useMemo } from "react";
import { useI18n } from "./I18nProvider";
import { UI_LOCALES } from "./config";

const SANS_PREFIXE = ["/apply", "/assessment", "/interview", "/run", "/join", "/api", "/auth"];

/** Un chemin doit-il rester tel quel ? (externe, ancre, route candidat, déjà préfixé) */
function resteTelQuel(href) {
  if (typeof href !== "string") return true;            // objet Url : laissé au routeur
  if (!href.startsWith("/")) return true;               // externe, #ancre, mailto:
  if (SANS_PREFIXE.some((p) => href === p || href.startsWith(`${p}/`))) return true;
  const premier = href.split("/")[1];
  return UI_LOCALES.includes(premier);                  // déjà préfixé
}

/** "/jobs" + "en" → "/en/jobs". Idempotent. */
export function withLocale(href, locale) {
  if (resteTelQuel(href)) return href;
  return href === "/" ? `/${locale}` : `/${locale}${href}`;
}

/** Retire le préfixe : "/en/jobs" → "/jobs". Sert au changement de langue. */
export function stripLocale(pathname) {
  const premier = (pathname || "").split("/")[1];
  if (!UI_LOCALES.includes(premier)) return pathname || "/";
  return pathname.slice(premier.length + 1) || "/";
}

/** Remplace la locale d'un chemin : ("/en/jobs/12", "fr") → "/fr/jobs/12". */
export function swapLocale(pathname, locale) {
  return withLocale(stripLocale(pathname), locale);
}

/** `useRouter` de next/navigation, mais push/replace préfixent le chemin. */
export function useRouter() {
  const router = useNextRouter();
  const { locale } = useI18n();

  return useMemo(() => ({
    ...router,
    push: (href, options) => router.push(withLocale(href, locale), options),
    replace: (href, options) => router.replace(withLocale(href, locale), options),
    prefetch: (href, options) => router.prefetch(withLocale(href, locale), options),
  }), [router, locale]);
}

/** `Link` de next/link, mais `href` est préfixé. */
export function LocaleLink({ href, ...props }) {
  const { locale } = useI18n();
  return <Link href={withLocale(href, locale)} {...props} />;
}

/** Pour les `<a href>` bruts encore présents dans le code. */
export function useLocaleHref() {
  const { locale } = useI18n();
  return useCallback((href) => withLocale(href, locale), [locale]);
}
