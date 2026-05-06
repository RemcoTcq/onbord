/**
 * Vérifie si l'utilisateur possède les droits d'administration.
 * Pour l'instant, tout utilisateur avec une adresse e-mail se terminant par @onbord.be est considéré comme admin.
 * @param {Object} user - L'objet utilisateur provenant de Supabase Auth
 * @returns {boolean}
 */
export function isAdmin(user) {
  if (!user || !user.email) return false;
  const email = user.email.toLowerCase();
  return email.endsWith("@onbord.be") || email === "rem.tacq@gmail.com";
}
