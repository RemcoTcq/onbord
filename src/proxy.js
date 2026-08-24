import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { UI_LOCALES, DEFAULT_UI_LOCALE, LOCALE_COOKIE, LOCALE_HEADER } from "@/lib/i18n/config";
import { localiserChemin, canoniserChemin } from "@/lib/i18n/routes";

// ─────────────────────────────────────────────────────────────────────────────
// Deux responsabilités, dans cet ordre : la LANGUE, puis la SESSION.
//
// La langue d'abord parce qu'une redirection de locale doit se produire avant
// qu'on décide où envoyer un visiteur non connecté — sinon on le renvoie vers
// /login, puis vers /fr/login, soit deux sauts au lieu d'un.
// ─────────────────────────────────────────────────────────────────────────────

// Chemins qui n'ont JAMAIS de préfixe de langue.
//
// Le parcours candidat en fait partie, à dessein : ses liens sont déjà partis
// par e-mail, et la langue d'une évaluation vient de l'offre (contenu stocké),
// pas de l'URL. Voir le commentaire de app/[lang]/layout.js.
const SANS_PREFIXE = [
  "/apply", "/assessment", "/interview", "/run",  // parcours candidat
  "/join",                                        // invitation recruteur (token en query)
  "/api", "/auth",                                // routes machine
  "/_next", "/favicon.ico", "/icon.svg", "/logo.png",
];

function estSansPrefixe(pathname) {
  return SANS_PREFIXE.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Renvoie la locale du chemin, ou null si le chemin n'est pas préfixé. */
function localeDuChemin(pathname) {
  const premier = pathname.split("/")[1];
  return UI_LOCALES.includes(premier) ? premier : null;
}

/** Meilleure correspondance entre Accept-Language et nos locales d'interface. */
function localeDuNavigateur(header) {
  if (!header) return null;
  const classes = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      return { tag: tag.trim().toLowerCase(), q: q ? parseFloat(q.split("=")[1]) || 0 : 1 };
    })
    .sort((a, b) => b.q - a.q);

  for (const { tag } of classes) {
    const base = tag.split("-")[0];
    if (UI_LOCALES.includes(base)) return base;
  }
  return null;
}

export async function proxy(request) {
  const { pathname, search } = request.nextUrl;

  // ── 1) Langue ─────────────────────────────────────────────────────────────
  const prefixe = localeDuChemin(pathname);

  if (!prefixe && !estSansPrefixe(pathname)) {
    // Ordre de priorité : choix explicite (cookie) > navigateur > français.
    const locale =
      (UI_LOCALES.includes(request.cookies.get(LOCALE_COOKIE)?.value)
        ? request.cookies.get(LOCALE_COOKIE).value
        : null) ||
      localeDuNavigateur(request.headers.get("accept-language")) ||
      DEFAULT_UI_LOCALE;

    // 307 et non 308 : la locale d'un même chemin peut changer (le recruteur
    // bascule sa langue), une redirection permanente serait mise en cache par
    // le navigateur et le figerait.
    // Le chemin est traduit AVANT la redirection : viser /en/accueil pour
    // rebondir ensuite sur /en/home ferait deux sauts, et le premier laisserait
    // un segment français dans l'historique du navigateur.
    const url = request.nextUrl.clone();
    const cible = pathname === "/" ? "" : localiserChemin(pathname, locale);
    url.pathname = `/${locale}${cible}`;
    return NextResponse.redirect(url, 307);
  }

  // La locale est transmise au rendu par un EN-TÊTE, pas seulement par l'URL :
  // app/layout.js est au-dessus du segment [lang] et ne peut pas lire params.
  // Sans ça, son <html lang> resterait figé sur le cookie et divergerait de
  // l'URL au premier partage de lien.
  const requestHeaders = new Headers(request.headers);
  if (prefixe) requestHeaders.set(LOCALE_HEADER, prefixe);

  // ── Segments traduits ─────────────────────────────────────────────────────
  // /en/home doit s'afficher tel quel dans la barre d'adresse, mais Next ne
  // sait faire correspondre qu'un chemin du système de fichiers, lequel est en
  // français. D'où un REWRITE, pas une redirection : le navigateur garde
  // /en/home, Next reçoit /en/accueil.
  const cheminSansPrefixe = prefixe ? pathname.slice(prefixe.length + 1) || "/" : pathname;
  const chemin = prefixe ? canoniserChemin(cheminSansPrefixe, prefixe) : pathname;
  const doitReecrire = prefixe && chemin !== cheminSansPrefixe;

  // Une seule fabrique de réponse : le client Supabase la reconstruit quand il
  // pose un cookie de session, et les deux versions doivent réécrire pareil —
  // sinon un simple rafraîchissement de session renverrait une 404.
  const reponseDeBase = () => {
    if (!doitReecrire) return NextResponse.next({ request: { headers: requestHeaders } });
    const url = request.nextUrl.clone();
    url.pathname = `/${prefixe}${chemin === "/" ? "" : chemin}`;
    return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
  };

  let supabaseResponse = reponseDeBase();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = reponseDeBase();
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ── 2) Session ────────────────────────────────────────────────────────────
  // Le chemin est comparé SANS son préfixe de langue : /fr/login et /en/login
  // sont la même page publique, et une comparaison sur le chemin brut les
  // aurait toutes deux prises pour des routes protégées.
  // `chemin` est calculé plus haut, en CANONIQUE : les routes publiques
  // ci-dessous sont donc écrites une seule fois, en français.

  // Routes publiques : tout le parcours candidat. Un candidat n'a PAS de compte —
  // son identité est son interview_token, vérifié côté serveur à chaque appel
  // (server actions et routes /api/run, client service_role, tables du run en RLS
  // deny-all). Le proxy n'est donc pas ce qui les protège, et l'exigence de session
  // renvoyait le candidat vers /login : /interview (public) redirige vers
  // /assessment puis /run, qui ne l'étaient pas — le parcours entier était
  // inatteignable sans session recruteur.
  const publicRoutes = [
    "/login", "/register", "/join",
    "/interview",       // ancien lien, redirige vers /assessment
    "/assessment",      // hub hérité + bascule vers /run
    "/run",             // expérience candidat (+ ses server actions)
    "/apply",           // formulaire de candidature public
    "/api/run",         // assistant IA du run (token vérifié serveur)
    "/api/transcribe",  // transcription des réponses vidéo (token vérifié serveur)
    // Purge quotidienne appelée par Vercel Cron. L'appelant est une MACHINE :
    // elle n'a pas de session, et sans cette entrée le proxy la renverrait vers
    // /login — le cron échouerait en silence, la corbeille ne se viderait
    // jamais. La route est gardée par CRON_SECRET, comparé à l'en-tête
    // Authorization, et refuse de s'exécuter si la variable est absente.
    "/api/cron",
  ];
  const isPublic = publicRoutes.some((route) => chemin.startsWith(route));

  // Redirect unauthenticated users to login
  if (!user && !isPublic && chemin !== "/") {
    const url = request.nextUrl.clone();
    const cible = prefixe || DEFAULT_UI_LOCALE;
    url.pathname = `/${cible}${localiserChemin("/login", cible)}`;
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth pages
  if (user && (chemin === "/login" || chemin === "/register" || chemin === "/")) {
    const url = request.nextUrl.clone();
    const cible = prefixe || DEFAULT_UI_LOCALE;
    url.pathname = `/${cible}${localiserChemin("/accueil", cible)}`;
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
