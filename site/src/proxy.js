import { NextResponse } from "next/server";
import { LOCALES, LOCALES_EN_SOMMEIL, DEFAULT_LOCALE, LOCALE_COOKIE, COOKIE_MAX_AGE, isLocale } from "@/lib/i18n/config";
import { localiserChemin, canoniserChemin } from "@/lib/i18n/routes";

// ─────────────────────────────────────────────────────────────────────────────
// Deux responsabilités, et pas une de plus : la LANGUE, puis les SEGMENTS
// TRADUITS. Pas de session, pas de base de données — le site public n'a
// personne à authentifier.
//
// (En Next 16, `middleware.js` s'appelle `proxy.js` ; même fonctionnement, voir
// node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md.)
//
// Ordre de priorité de la langue, du plus explicite au plus vague :
//   1. le préfixe déjà présent dans l'URL — un lien partagé gagne toujours ;
//   2. le cookie, c'est-à-dire un clic dans le sélecteur de langue ;
//   3. l'en-tête Accept-Language du navigateur ;
//   4. l'anglais, langue de référence du site.
//
// Le cookie passe AVANT le navigateur : un Flamand qui choisit l'anglais
// verrait sinon son choix annulé au rechargement suivant.
// ─────────────────────────────────────────────────────────────────────────────

/** Meilleure correspondance entre Accept-Language et nos trois langues. */
function localeDuNavigateur(header) {
  if (!header) return null;

  const demandes = header
    .split(",")
    .map((morceau) => {
      const [tag, ...params] = morceau.trim().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      return { tag: tag.trim().toLowerCase(), q: q ? parseFloat(q.split("=")[1]) || 0 : 1 };
    })
    .sort((a, b) => b.q - a.q);

  for (const { tag } of demandes) {
    // « nl-BE » comme « nl » doivent tomber sur "nl".
    const base = tag.split("-")[0];
    if (LOCALES.includes(base)) return base;
  }
  return null;
}

export function proxy(request) {
  const { pathname } = request.nextUrl;

  const premier = pathname.split("/")[1];

  // ── Langue en sommeil : vers la page anglaise equivalente ─────────────────
  // /fr/tarifs et /nl/tarieven ont ete en ligne : un lien partage ou une
  // page deja indexee ne doit pas tomber sur une erreur. Le chemin traduit
  // est d'abord ramene a sa forme canonique (/fr/tarifs -> /pricing), puis
  // prefixe en anglais. 307 et non 308 : ces langues reviendront, et une
  // redirection permanente resterait en cache chez les visiteurs.
  if (LOCALES_EN_SOMMEIL.includes(premier)) {
    const reste = pathname.slice(premier.length + 1) || "/";
    const canonique = canoniserChemin(reste, premier);
    const url = request.nextUrl.clone();
    url.pathname = `/${DEFAULT_LOCALE}${canonique === "/" ? "" : canonique}`;
    return NextResponse.redirect(url, 307);
  }

  const prefixe = isLocale(premier) ? premier : null;

  // ── URL sans préfixe : on redirige ────────────────────────────────────────
  // Y compris /legal/terms, /legal/privacy et /legal/ai-transparency, que
  // l'APPLICATION ouvre en dur depuis l'écran de consentement du candidat
  // (src/lib/constants/legal.js, à la racine du dépôt). Ces liens sont déjà
  // partis par e-mail : ils doivent continuer de fonctionner sans préfixe.
  if (!prefixe) {
    const cookie = request.cookies.get(LOCALE_COOKIE)?.value;
    const locale =
      (isLocale(cookie) ? cookie : null) ||
      localeDuNavigateur(request.headers.get("accept-language")) ||
      DEFAULT_LOCALE;

    const url = request.nextUrl.clone();
    // Le chemin est TRADUIT avant la redirection : viser /fr/how-it-works pour
    // rebondir ensuite sur /fr/comment-ca-marche ferait deux sauts, et le
    // premier laisserait un segment anglais dans l'historique du navigateur.
    const cible = pathname === "/" ? "" : localiserChemin(pathname, locale);
    url.pathname = `/${locale}${cible}`;

    // 307 et non 308 : la langue d'un même chemin peut changer d'une visite à
    // l'autre. Une redirection permanente serait mise en cache par le navigateur
    // et figerait le premier choix pour toujours.
    return NextResponse.redirect(url, 307);
  }

  // ── URL préfixée ──────────────────────────────────────────────────────────
  // On mémorise la langue au passage : c'est ce qui fait qu'un lien reçu en
  // néerlandais rend le reste de la visite néerlandophone, sans un clic.
  const cheminSansPrefixe = pathname.slice(prefixe.length + 1) || "/";
  const canonique = canoniserChemin(cheminSansPrefixe, prefixe);

  // Segments traduits : /fr/comment-ca-marche doit s'afficher tel quel dans la
  // barre d'adresse, mais Next ne sait faire correspondre qu'un chemin du
  // système de fichiers, lequel est en anglais. D'où un REWRITE, pas une
  // redirection : le navigateur garde /fr/comment-ca-marche, Next reçoit
  // /fr/how-it-works.
  const reponse =
    canonique === cheminSansPrefixe
      ? NextResponse.next()
      : NextResponse.rewrite(
          Object.assign(request.nextUrl.clone(), {
            pathname: `/${prefixe}${canonique === "/" ? "" : canonique}`,
          })
        );

  if (request.cookies.get(LOCALE_COOKIE)?.value !== prefixe) {
    reponse.cookies.set(LOCALE_COOKIE, prefixe, {
      maxAge: COOKIE_MAX_AGE,
      path: "/",
      sameSite: "lax",
    });
  }
  return reponse;
}

export const config = {
  matcher: [
    // Tout, sauf les fichiers internes de Next et ceux servis tels quels depuis
    // public/ — un logo n'a pas de langue.
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)",
  ],
};
