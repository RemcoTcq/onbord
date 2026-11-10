import { Plus, ArrowRight } from "./Icons";

// ─────────────────────────────────────────────────────────────────────────────
// La FAQ de l'accueil (09/11/2026, demande directe) : quelques questions très
// simples, en accordéon. Des <details> natifs : aucun JavaScript, le
// navigateur ouvre et ferme, et tout reste lisible et indexé.
//
// Même mise en page que « Two moments that matter » : le titre à gauche, les
// questions à droite.
//
// ⚠️ Le lien « Try a roleplay » (dernière question) N'EST PAS ENCORE BRANCHÉ :
// il mènera à un essai où le visiteur laisse son e-mail et son téléphone
// (des leads pour l'équipe) puis parle à un client simulé. En attendant, il a
// l'air d'un lien mais ne mène nulle part (pas de `href`, `aria-disabled`).
// Le jour où la page existe : un `href`, et on retire `aria-disabled`.
// ─────────────────────────────────────────────────────────────────────────────

export default function Faq({ t }) {
  return (
    <section className="section" id="faq" aria-labelledby="faq-titre">
      <div className="wrap questions">
        <h2 className="h2" id="faq-titre">{t.title}</h2>
        <div className="questions__list">
          {t.items.map((it) => (
            <details className="questions__item" key={it.q}>
              <summary>
                <span>{it.q}</span>
                <i aria-hidden="true"><Plus size={16} /></i>
              </summary>
              <p>
                {it.a}
                {it.link ? <a className="questions__lien" aria-disabled="true">{it.link}<ArrowRight size={14} /></a> : null}
                {it.after}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
