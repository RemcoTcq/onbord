import { Resend } from 'resend';

// Initialise Resend avec la clé d'API (à ajouter dans votre .env.local)
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

/**
 * Envoie un e-mail en utilisant Resend.
 * @param {Object} options - Les options de l'e-mail
 * @param {string|string[]} options.to - L'adresse e-mail du destinataire (ex: le candidat)
 * @param {string} options.subject - L'objet de l'e-mail
 * @param {string} [options.html] - Le contenu HTML de l'e-mail
 * @param {string} [options.text] - Le contenu texte de l'e-mail
 * @param {string} [options.replyTo] - L'adresse e-mail de réponse (ex: celle du recruteur)
 * @param {string} [options.from] - L'adresse de l'expéditeur (par défaut notifications@onbord.fr)
 */
export async function sendEmail({ 
  to, 
  subject, 
  html, 
  text, 
  replyTo, 
  from = 'Onbord <info@onbord.be>' 
}) {
  if (!resend) {
    console.warn('⚠️ RESEND_API_KEY n\'est pas définie. L\'envoi d\'e-mail est simulé.');
    console.log('\n--- Simulation d\'envoi d\'e-mail ---');
    console.log(`De       : ${from}`);
    console.log(`À        : ${to}`);
    if (replyTo) console.log(`Réponse à: ${replyTo}`);
    console.log(`Sujet    : ${subject}`);
    console.log('------------------------------------\n');
    return { success: true, mocked: true };
  }

  try {
    const data = await resend.emails.send({
      from,
      to,
      subject,
      html,
      text,
      reply_to: replyTo,
    });

    return { success: true, data };
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'e-mail via Resend:', error);
    return { success: false, error };
  }
}
