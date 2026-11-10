import Link from "next/link";
import { FlagEU, Shield, Check, ArrowRight } from "./Icons";
import { IcUsers } from "./AppUi";

// ─────────────────────────────────────────────────────────────────────────────
// La confiance, à notre façon (09/11/2026, demande directe).
//
// Là où d'autres posent des logos ISO, SOC 2 ou « GDPR compliant », Onbord
// n'a pas encore de certification à montrer. Pas de faux sceau : quatre
// ENGAGEMENTS, chacun déjà écrit dans nos pages légales ou vrai dans le code
// de l'application (règle 2) :
//
//   - données dans l'UE       → /legal/privacy (Supabase, Paris)
//   - pas d'entraînement IA   → /legal/privacy et /legal/ai-transparency
//   - décision humaine        → /legal/ai-transparency, /legal/terms
//   - la preuve de chaque note → runScoring.js (`verifyVerbatim`)
//
// Une bande pleine largeur, d'un bord à l'autre de la fenêtre : c'est la
// section qui « coupe » la page entre les étapes et la FAQ. Les engagements
// sont en sceaux ronds, pour rappeler les pastilles de certification sans
// en imiter aucune.
// ─────────────────────────────────────────────────────────────────────────────

const ICONES = {
  eu: () => <FlagEU height={13} />,
  training: () => <Shield size={17} />,
  human: () => <IcUsers size={17} />,
  proof: () => <Check size={17} />,
};

export default function Confiance({ t, locale }) {
  return (
    <section className="section confiance" id="trust" aria-labelledby="trust-titre">
      <div className="wrap confiance__grid">
        <div className="confiance__head">
          <h2 className="h2" id="trust-titre">{t.title}</h2>
          <p className="lede">{t.lede}</p>
          <Link className="confiance__lien" href={`/${locale}/legal/ai-transparency`}>{t.link}<ArrowRight size={15} /></Link>
        </div>
        <ul className="confiance__items">
          {t.items.map((it) => {
            const Icone = ICONES[it.key];
            return (
              <li key={it.key}>
                <span className="confiance__sceau" aria-hidden="true"><Icone /></span>
                <h3>{it.title}</h3>
                <p>{it.body}</p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
