import { redirect } from "next/navigation";

// /fr → /fr/accueil. Le préfixe est conservé : sans lui, on renverrait le
// recruteur sur une URL non préfixée que le proxy devrait re-rediriger, avec un
// aller-retour visible dans la barre d'adresse.
export default async function Home({ params }) {
  const { lang } = await params;
  redirect(`/${lang}/accueil`);
}
