import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { LOCALE_COOKIE, UI_LOCALES, DEFAULT_UI_LOCALE } from '@/lib/i18n/config'

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // Cette route est un point de RETOUR OAuth : son URL est enregistrée chez
  // Supabase et ne peut donc pas porter de préfixe de langue. On le rétablit
  // ici, depuis le cookie, plutôt que de laisser le proxy le faire — ça évite
  // une redirection de plus juste après l'échange du code.
  const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value
  const locale = UI_LOCALES.includes(cookieLocale) ? cookieLocale : DEFAULT_UI_LOCALE
  const next = searchParams.get('next') ?? '/compte'

  if (code) {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value
          },
          set(name, value, options) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name, options) {
            cookieStore.delete({ name, ...options })
          },
        },
      }
    )
    
    // Échanger le code contre une session valide (valide le changement d'email)
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}/${locale}${next}`)
    }
  }

  // S'il y a une erreur ou s'il n'y a pas de code
  return NextResponse.redirect(`${origin}/${locale}/login?error=true`)
}
