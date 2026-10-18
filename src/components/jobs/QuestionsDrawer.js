"use client";

import { useEffect, useState } from "react";
import { X, Trash2, Plus, Loader2 } from "lucide-react";
import { useT } from "@/lib/i18n/I18nProvider";

/**
 * Questions de présélection — panneau latéral (maquette « D · Job – Questions »).
 *
 * Format des questions (lib/questionsPreselection.js) :
 * `{ id, text, expectedAnswer: "yes" | "no" }`. Les modifications restent
 * locales et partent en une fois, à la fermeture du panneau — « Terminé », la
 * croix, Échap ou un clic à côté. Une question laissée vide n'est pas gardée.
 */
export default function QuestionsDrawer({ jobTitle, questions: initiales, onSave, onClose }) {
  const t = useT();
  const [questions, setQuestions] = useState(() => (initiales || []).map((q) => ({ ...q })));
  const [saving, setSaving] = useState(false);

  async function fermer() {
    if (saving) return;
    const propres = questions
      .map((q) => ({ ...q, text: (q.text || "").trim() }))
      .filter((q) => q.text);
    const avant = JSON.stringify((initiales || []).map(({ id, text, expectedAnswer }) => ({ id, text, expectedAnswer })));
    const apres = JSON.stringify(propres.map(({ id, text, expectedAnswer }) => ({ id, text, expectedAnswer })));
    if (avant !== apres) {
      setSaving(true);
      const ok = await onSave(propres);
      setSaving(false);
      if (!ok) return;
    }
    onClose();
  }

  useEffect(() => {
    const echap = (e) => { if (e.key === "Escape") fermer(); };
    document.addEventListener("keydown", echap);
    return () => document.removeEventListener("keydown", echap);
  });

  const maj = (i, champ, valeur) => setQuestions((qs) => qs.map((q, j) => (j === i ? { ...q, [champ]: valeur } : q)));
  const ajouter = () => setQuestions((qs) => [...qs, { id: Date.now().toString(), text: "", expectedAnswer: "yes" }]);
  const retirer = (i) => setQuestions((qs) => qs.filter((_, j) => j !== i));

  const grille = { display: "grid", gridTemplateColumns: "24px minmax(0, 1fr) 96px 32px", gap: 8, alignItems: "center" };

  return (
    <>
      <div className="ds-drawer-overlay" onClick={fermer} />
      <section role="dialog" aria-modal="true" aria-labelledby="ds-titre-questions" className="ds-drawer">
        <header className="ds-drawer-head">
          <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
            <h2 id="ds-titre-questions" className="ds-h1">{t("dashboard.jobDetail.questions.title")}</h2>
            <span className="ds-sub">{t("dashboard.jobDetail.questions.subtitle", { job: jobTitle })}</span>
          </div>
          <button type="button" onClick={fermer} aria-label={t("common.actions.close")} className="ds-icon-btn ds-icon-btn-outline" style={{ width: 36, height: 36, borderRadius: 10 }}>
            <X size={17} strokeWidth={2} />
          </button>
        </header>

        <div className="ds-drawer-body">
          <p className="ds-sub">{t("dashboard.jobDetail.questions.intro")}</p>

          <div className="ds-inset" style={{ display: "flex", flexDirection: "column", gap: 8, padding: 10, borderRadius: 12 }}>
            {questions.length > 0 && (
              <div aria-hidden="true" style={{ ...grille, padding: "0 2px", fontSize: 12, color: "var(--ds-ink-4)" }}>
                <span /><span>{t("dashboard.jobDetail.questions.question")}</span><span>{t("dashboard.jobDetail.questions.expected")}</span><span />
              </div>
            )}
            {questions.map((q, i) => {
              const n = String(i + 1).padStart(2, "0");
              return (
                <div key={q.id} style={grille}>
                  <span className="ds-mono" style={{ fontSize: 11, color: "var(--ds-ink-5)", textAlign: "center" }}>{n}</span>
                  <label style={{ minWidth: 0 }}>
                    <span className="sr-only">{t("dashboard.jobDetail.questions.questionN", { n })}</span>
                    <input
                      type="text"
                      className="ds-input"
                      value={q.text}
                      placeholder={t("dashboard.jobDetail.questions.placeholder")}
                      onChange={(e) => maj(i, "text", e.target.value)}
                      autoFocus={!q.text && i === questions.length - 1}
                    />
                  </label>
                  <label>
                    <span className="sr-only">{t("dashboard.jobDetail.questions.expectedN", { n })}</span>
                    <select className="ds-select" value={q.expectedAnswer || "yes"} onChange={(e) => maj(i, "expectedAnswer", e.target.value)}>
                      <option value="yes">{t("dashboard.qualifyingConfig.yes")}</option>
                      <option value="no">{t("dashboard.qualifyingConfig.no")}</option>
                    </select>
                  </label>
                  <button type="button" className="ds-icon-btn is-danger" onClick={() => retirer(i)} aria-label={t("dashboard.jobDetail.questions.deleteN", { n })} title={t("dashboard.jobs.delete")}>
                    <Trash2 size={15} strokeWidth={1.8} />
                  </button>
                </div>
              );
            })}
            <button type="button" className="ds-add" onClick={ajouter} style={{ marginTop: 2 }}>
              <Plus size={15} strokeWidth={2.2} /> {t("dashboard.qualifyingConfig.addQuestion")}
            </button>
          </div>
        </div>

        <footer className="ds-drawer-foot">
          <span className="ds-sub">{t("dashboard.jobDetail.questions.count", { count: questions.filter((q) => (q.text || "").trim()).length })}</span>
          <button type="button" className="ds-btn ds-btn-primary" onClick={fermer} disabled={saving}>
            {saving && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
            {t("dashboard.jobDetail.questions.done")}
          </button>
        </footer>
      </section>
    </>
  );
}
