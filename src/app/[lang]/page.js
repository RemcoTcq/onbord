import { redirect } from "next/navigation";
import { localiserChemin } from "@/lib/i18n/routes";

// /fr → /fr/accueil, /en → /en/home. Le préfixe est conservé : sans lui, on
// renverrait le recruteur sur une URL non préfixée que le proxy devrait
// re-rediriger, avec un aller-retour visible dans la barre d'adresse.
// Et le chemin est traduit ICI plutôt que laissé au proxy, pour la même
// raison : un seul saut.
export default async function Home({ params }) {
  const { lang } = await params;
  redirect(`/${lang}${localiserChemin("/accueil", lang)}`);
}
