// Les e-mails de l'application envoyés aux MEMBRES d'une organisation :
// invitation, nouveau module assigné, module validé. Module PUR : il compose,
// il n'envoie pas (l'envoi passe par lib/resend.js).
//
// Le texte vient des dictionnaires (`dashboard.emails.*`), dans la langue du
// destinataire (traduireServeur.js). La mise en page est volontairement
// sobre : une colonne, un bouton, et la même chose en texte brut pour les
// messageries qui n'affichent pas le HTML.

const echapper = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/** Enveloppe commune : un titre, des paragraphes, un bouton, une note. */
export function enveloppe({ titre, paragraphes, bouton, lien, note }) {
  const corps = paragraphes.map((p) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#3D4866">${echapper(p)}</p>`).join("");
  const html = `<!doctype html><html><body style="margin:0;padding:32px 16px;background:#EEF1F7;font-family:Geist,Arial,sans-serif">
<div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px">
<h1 style="margin:0 0 18px;font-size:20px;line-height:1.3;color:#14204A">${echapper(titre)}</h1>
${corps}
<p style="margin:24px 0"><a href="${echapper(lien)}" style="display:inline-block;background:#1B45C4;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 22px;border-radius:999px">${echapper(bouton)}</a></p>
${note ? `<p style="margin:0;font-size:13px;line-height:1.5;color:#5A6685">${echapper(note)}</p>` : ""}
</div></body></html>`;
  const text = [titre, "", ...paragraphes, "", `${bouton} : ${lien}`, note ? `\n${note}` : ""].join("\n");
  return { html, text };
}

/** De nouveaux modules assignés à un learner. */
export function emailNouveauxModules({ t, prenom, organisation, titres, lien }) {
  const vars = { organisation, prenom, count: titres.length };
  return {
    subject: t("dashboard.emails.newModules.subject", vars),
    ...enveloppe({
      titre: t("dashboard.emails.newModules.title", vars),
      paragraphes: [
        t(prenom ? "dashboard.emails.newModules.hello" : "dashboard.emails.newModules.helloAnonymous", vars),
        t("dashboard.emails.newModules.body", vars),
        ...titres.map((x) => `• ${x}`),
      ],
      bouton: t("dashboard.emails.newModules.button"),
      lien,
    }),
  };
}

/** Un module validé, par le manager ou automatiquement. */
export function emailModuleValide({ t, prenom, organisation, module, score, lien }) {
  const vars = { organisation, prenom, module, score: score ?? "—" };
  return {
    subject: t("dashboard.emails.moduleValidated.subject", vars),
    ...enveloppe({
      titre: t("dashboard.emails.moduleValidated.title", vars),
      paragraphes: [
        t(prenom ? "dashboard.emails.newModules.hello" : "dashboard.emails.newModules.helloAnonymous", vars),
        t("dashboard.emails.moduleValidated.body", vars),
      ],
      bouton: t("dashboard.emails.moduleValidated.button"),
      lien,
    }),
  };
}

/** L'invitation à rejoindre une organisation. */
export function emailInvitation({ t, organisation, invitePar, role, lien, depuisRecrutement = false }) {
  const vars = { organisation: organisation || "Onbord", invitePar: invitePar || organisation || "Onbord" };
  const titre = t(`dashboard.emails.invitation.title_${role}`, vars);
  return {
    subject: t(`dashboard.emails.invitation.subject_${role}`, vars),
    ...enveloppe({
      titre,
      paragraphes: [
        t(`dashboard.emails.invitation.body_${role}`, vars),
        // Venue du recrutement : la recrue sait, dès l'e-mail, ce qui lui sera
        // demandé à l'activation.
        ...(depuisRecrutement ? [t("dashboard.emails.invitation.body_hiring", vars)] : []),
      ],
      bouton: t("dashboard.emails.invitation.button"),
      lien,
      note: t("dashboard.emails.invitation.note"),
    }),
  };
}
