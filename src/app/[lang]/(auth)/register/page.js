import { redirect } from "next/navigation";

// L'inscription publique est fermée. Le formulaire qui vivait ici est parti
// avec, et la page ne fait plus que renvoyer vers la connexion.
//
// ── Pourquoi une redirection, et pas une suppression ─────────────────────────
// L'URL circule : elle a été partagée, indexée, mise en favori. Un 404 laisse
// croire à une panne du site ; la connexion, elle, est ce que la personne
// cherche neuf fois sur dix.
//
// ── Ce que cette page NE ferme PAS ───────────────────────────────────────────
// Rien. L'inscription ne passe pas par ce serveur : le navigateur appelle
// directement /auth/v1/signup chez Supabase, avec la clé anon, qui est publique
// par construction. La vraie fermeture est le réglage « Allow new users to sign
// up » du dashboard Supabase. Cette redirection ne fait qu'accorder l'interface
// à cette décision — ne jamais la prendre pour la protection elle-même.
//
// Pour rouvrir : rétablir le réglage Supabase, restaurer le formulaire (il est
// dans l'historique git) et remettre le lien retiré du bas de /login.
export default async function RegisterPage({ params }) {
  const { lang } = await params;
  redirect(`/${lang}/login`);
}
