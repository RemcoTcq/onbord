"use server";

// Persistance de la langue d'interface du recruteur.
//
// DEUX écritures, pas une :
//   • users.ui_locale — la source de vérité, elle suit le compte d'un appareil
//     à l'autre ;
//   • le cookie — ce que lit app/layout.js au rendu serveur. Sans lui, il
//     faudrait une requête base à chaque affichage de page, sur une route qui
//     sert aussi le parcours candidat (sans session).
//
// Le cookie n'est donc qu'un cache. En cas de désaccord, c'est la colonne qui
// gagne : la prochaine connexion réécrit le cookie.

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { LOCALE_COOKIE, UI_LOCALES, coerceUiLocale } from "./config";

const UN_AN = 60 * 60 * 24 * 365;

export async function setUiLocale(locale) {
  if (!UI_LOCALES.includes(locale)) {
    return { success: false, error: "Langue non prise en charge." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Pas de session : on pose quand même le cookie. C'est le cas des pages
  // d'authentification, où un visiteur peut vouloir lire l'écran de connexion
  // en anglais avant même d'avoir un compte.
  if (user) {
    const { error } = await supabase
      .from("users").update({ ui_locale: locale }).eq("id", user.id);
    if (error) {
      console.error("setUiLocale:", error.message);
      return { success: false, error: "Impossible d'enregistrer la langue." };
    }
  }

  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, locale, {
    maxAge: UN_AN,
    path: "/",
    sameSite: "lax",
    // Pas httpOnly : aucune donnée sensible, et un composant client peut avoir
    // besoin de lire la préférence sans aller-retour serveur.
    httpOnly: false,
  });

  return { success: true, locale };
}

/**
 * Aligne le cookie sur la colonne à la connexion. Appelé une fois, au montage
 * du dashboard : c'est ce qui fait qu'un recruteur retrouve SA langue sur une
 * machine où il ne s'était jamais connecté.
 */
export async function syncUiLocaleFromProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false };

  const { data } = await supabase
    .from("users").select("ui_locale").eq("id", user.id).single();

  const locale = coerceUiLocale(data?.ui_locale);
  const cookieStore = await cookies();

  if (cookieStore.get(LOCALE_COOKIE)?.value === locale) {
    return { success: true, locale, changed: false };
  }

  cookieStore.set(LOCALE_COOKIE, locale, {
    maxAge: UN_AN, path: "/", sameSite: "lax", httpOnly: false,
  });
  return { success: true, locale, changed: true };
}
