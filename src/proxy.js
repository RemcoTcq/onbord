import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

export async function proxy(request) {
  let supabaseResponse = NextResponse.next({ request });

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
          supabaseResponse = NextResponse.next({ request });
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

  const { pathname } = request.nextUrl;

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
  ];
  const isPublic = publicRoutes.some((route) => pathname.startsWith(route));

  // Redirect unauthenticated users to login
  if (!user && !isPublic && pathname !== "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth pages
  if (
    user &&
    (pathname === "/login" || pathname === "/register" || pathname === "/")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/accueil";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
