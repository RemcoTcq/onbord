import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Can be ignored in Server Components
          }
        },
      },
    }
  );
}

export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  // Aucun repli sur la clé anon : celle-ci est soumise à RLS, ce qui ferait échouer
  // SILENCIEUSEMENT les opérations admin (crédits, quotas, lectures inter-utilisateurs)
  // au lieu de signaler une configuration incorrecte. Mieux vaut échouer franchement.
  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY absente : impossible d'exécuter une opération admin " +
      "(crédits, quotas, lectures inter-utilisateurs). Renseignez la vraie clé " +
      "service_role dans .env.local — une valeur placeholder est tout aussi invalide. " +
      "Aucun repli sur la clé anon n'est effectué."
    );
  }

  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL, serviceRoleKey);
}
