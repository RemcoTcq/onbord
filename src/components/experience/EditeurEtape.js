"use client";

// Édition d'UNE étape, en deux onglets : « Scénario » (ce que le candidat
// reçoit) et « Scoring » (ce que l'IA vérifie, et comment ça compte dans la
// note). Ce sont les champs de l'ancienne carte d'étape, rangés : rien n'a été
// retiré, et l'enregistrement est le même (updateStep, versionnage compris).
//
// L'état local vit dans useEditionEtape, partagé par les deux onglets : on
// passe de l'un à l'autre sans perdre une modification, et un seul bouton
// enregistre le tout. Le composant appelant le remonte à chaque nouvelle
// version de l'étape (key = id + updated_at) — pas d'effet de resynchronisation.

import { useState } from "react";
import { Plus, Trash2, X, Bot, Info, Pencil, Check, ChevronDown } from "lucide-react";
import { updateStep } from "@/lib/actions/experience";
import {
  estCritereCheckpoints, etapeNoteeSansGrille, CHECKPOINTS_MAX, MUST, POIDS_ETAPE, poidsEtape,
} from "@/lib/competences";
import { DEFAUT_ECHANGES_IA } from "@/lib/constants/experience";
import { enPause } from "@/lib/constants/features";
import { useI18n } from "@/lib/i18n/I18nProvider";
import AutoTextarea from "@/components/ui/AutoTextarea";
import {
  CrmEditor, SheetEditor, InboxEditor, BoardEditor, CodeExerciseEditor, PersonaReglages, CHAMPS_SCENE,
} from "./EditeursScene";
import { SectionRecit, Repli } from "./Recit";
import { RecitPersona, RecitScene, ResumeDonnees } from "./RecitsScenes";
import Corrige, { aUnCorrige } from "./Corrige";
import { SkillPicker, nouvelIdCheckpoint, competencesDeLaGrille } from "./Competences";
import { inputStyle, selectStyle, labelStyle } from "./ui";

// Les `value` sont les valeurs STOCKÉES en base : elles restent en constantes.
// Les libellés se résolvent au rendu.
const RESPONSE_FORMAT_VALUES = ["text", "video", "qcm", "choice", "code"];
const SANDBOX_KIND_VALUES = ["none", "persona", "email", "client_reply", "document", "crm", "sheet", "inbox", "board", "code"];

/**
 * État d'édition d'une étape et son enregistrement.
 * @returns {{ local, dirty, saving, set, setConfig, maj, save, annuler }}
 */
export function useEditionEtape(step, competences, { onSaved, onForked, toast }) {
  const { t } = useI18n();
  const [local, setLocal] = useState(step);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  // Toute modification passe par ici : elle marque l'étape comme modifiée.
  function maj(transform) { setLocal(transform); setDirty(true); }
  function set(field, value) { maj((p) => ({ ...p, [field]: value })); }
  function setConfig(patch) { maj((p) => ({ ...p, config: { ...(p.config || {}), ...patch } })); }
  function annuler() { setLocal(step); setDirty(false); }

  async function save() {
    // Un checkpoint vide n'est pas un comportement : il partirait au correcteur
    // comme une ligne à noter sans rien à observer. Un critère qui n'a plus de
    // checkpoint disparaît avec eux, plutôt que de se faire passer pour une
    // grille à niveaux vide.
    const criteria = (local.criteria || [])
      .map((c) => (Array.isArray(c.checkpoints)
        ? { ...c, checkpoints: c.checkpoints.filter((cp) => (cp.description || "").trim()) }
        : c))
      .filter((c) => !Array.isArray(c.checkpoints) || c.checkpoints.length);

    // Ce que l'étape teste suit sa grille. Seule une étape corrigée sans grille
    // (QCM, tests, champs factuels) garde ses compétences déclarées — c'est
    // par elle-même qu'elle les teste.
    const grille = competencesDeLaGrille(criteria);
    const aGrilleCheckpoints = criteria.some(estCritereCheckpoints);
    const declarees = etapeNoteeSansGrille(local) || !aGrilleCheckpoints ? (local.config?.skills_tested || []) : [];
    const skills_tested = [...new Set([...declarees, ...grille])];
    const noms = new Map((competences || []).map((c) => [c.id, c.name]));
    const config = {
      ...(local.config || {}),
      skills_tested,
      targets_skills: skills_tested.map((id) => noms.get(id)).filter(Boolean),
    };

    setSaving(true);
    const res = await updateStep(step.id, {
      title: local.title, prompt: local.prompt,
      response_format: local.response_format, sandbox_kind: local.sandbox_kind,
      ai_assistant_allowed: local.ai_assistant_allowed,
      skill_assessed: local.skill_assessed, criteria,
      config,
    });
    setSaving(false);
    if (!res.success) { toast(res.error || t("dashboard.experienceEditor.error"), "error"); return false; }
    setLocal((p) => ({ ...p, criteria, config }));
    setDirty(false);
    toast(t("dashboard.experienceEditor.stepSaved"));
    // Nouvelle version : cette page désigne une étape de l'ancienne, qui n'est
    // plus modifiable. L'appelant recharge et suit la copie.
    if (res.forked) onForked?.(res);
    else onSaved?.({ ...local, criteria, config });
    return true;
  }

  return { local, dirty, saving, set, setConfig, maj, save, annuler };
}

// ─── Onglet « Scénario » ─────────────────────────────────────────────────────
// L'étape RACONTÉE (09/10/2026) : la consigne, puis la mise en situation telle
// qu'on la raconterait — qui, quoi, ce que cache le personnage — avec ✎ pour
// modifier sur place et ✨ pour une petite retouche par l'IA (1 crédit). Les
// données lourdes (pipeline, tableur, messages) restent derrière un repli ; la
// mécanique (format, assistant, voix…) dans « Réglages avancés ». Ce que l'IA
// sait pour noter est dans « Le corrigé », onglet Scoring.
export function OngletScenario({ edition, toast }) {
  const { t } = useI18n();
  const { local, set, setConfig, maj } = edition;
  const kind = local.sandbox_kind || "none";
  const isQcm = local.kind === "classic_qcm";
  const donnees = TYPES_DONNEES.includes(kind);
  const aRecit = kind === "persona" || !!CHAMPS_SCENE[kind] || donnees || isQcm;
  const commun = { stepId: local.id, toast };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <section className="card" style={sectionStyle}>
        <SectionRecit premier titre={t("dashboard.experienceEditor.stepTitle")} valeur={local.title} lignes={1}
          onChange={(v) => set("title", v)} />
        <SectionRecit {...commun} titre={t("dashboard.experienceEditor.recit.brief")} aide={t("dashboard.experienceEditor.recit.briefHelp")}
          valeur={local.prompt} lignes={5}
          onChange={(v) => set("prompt", v)} />
      </section>

      {aRecit && (
        <section className="card" style={sectionStyle}>
          <h3 style={titreSection}>{t("dashboard.experienceEditor.stepPage.content")}</h3>
          {kind === "persona" && (
            <RecitPersona {...commun} persona={local.config?.persona} onChange={(persona) => setConfig({ persona })} />
          )}
          {CHAMPS_SCENE[kind] && <RecitScene {...commun} kind={kind} config={local.config} setConfig={setConfig} />}
          {donnees && (
            <>
              <ResumeDonnees kind={kind} config={local.config} />
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: "0.7rem" }}>
                <Repli titre={t("dashboard.experienceEditor.recit.data.edit")}>
                  {kind === "crm" && <CrmEditor crm={local.config?.crm} onChange={(crm) => setConfig({ crm })} />}
                  {kind === "sheet" && <SheetEditor sheet={local.config?.sheet} onChange={(sheet) => setConfig({ sheet })} />}
                  {kind === "inbox" && <InboxEditor inbox={local.config?.inbox} onChange={(inbox) => setConfig({ inbox })} />}
                  {kind === "board" && <BoardEditor board={local.config?.board} onChange={(board) => setConfig({ board })} />}
                  {kind === "code" && <CodeExerciseEditor code={local.config?.code} onChange={(code) => setConfig({ code })} />}
                </Repli>
              </div>
            </>
          )}
          {isQcm && <OptionsQcm local={local} maj={maj} />}
        </section>
      )}

      {/* La mécanique de l'étape : rarement touchée après la génération. */}
      <section className="card" style={sectionStyle}>
        <Repli titre={t("dashboard.experienceEditor.recit.advanced")} aide={t("dashboard.experienceEditor.recit.advancedHelp")}>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 200px" }}>
              <label style={labelStyle}>{t("dashboard.experienceEditor.responseFormat")}</label>
              <select value={local.response_format} onChange={(e) => set("response_format", e.target.value)} style={selectStyle}>
                {RESPONSE_FORMAT_VALUES.filter((v) => !enPause(v) || v === local.response_format).map((v) => <option key={v} value={v}>{t(`dashboard.experienceEditor.format.${v}`)}</option>)}
              </select>
            </div>
            <div style={{ flex: "1 1 200px" }}>
              <label style={labelStyle}>{t("dashboard.experienceEditor.sandbox")}</label>
              <select value={kind} onChange={(e) => set("sandbox_kind", e.target.value)} style={selectStyle}>
                {/* Un type en pause reste affiché sur l'étape qui l'a déjà, nulle part ailleurs. */}
                {SANDBOX_KIND_VALUES.filter((v) => !enPause(v) || v === kind).map((v) => <option key={v} value={v}>{t(`dashboard.experienceEditor.sandboxKind.${v}`)}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap", marginTop: "0.9rem" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
              <input type="checkbox" checked={!!local.ai_assistant_allowed} onChange={(e) => set("ai_assistant_allowed", e.target.checked)} />
              <Bot size={15} style={{ color: local.ai_assistant_allowed ? "var(--primary)" : "var(--muted-foreground)" }} />
              {t("dashboard.experienceEditor.stepPage.assistant")}
            </label>
            {local.ai_assistant_allowed && (
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "12.5px", color: "var(--muted-foreground)" }}>
                {t("dashboard.experienceEditor.messageCap")}
                <input
                  type="number" min={1} max={200}
                  value={local.config?.ai_max_messages ?? DEFAUT_ECHANGES_IA}
                  onChange={(e) => setConfig({ ai_max_messages: e.target.value === "" ? "" : Math.max(1, parseInt(e.target.value, 10) || 1) })}
                  style={{ ...inputStyle, width: 80, marginBottom: 0 }}
                />
              </label>
            )}
          </div>
          {kind === "persona" && (
            <div style={{ marginTop: "0.9rem", borderTop: "1px solid var(--border)", paddingTop: "0.4rem" }}>
              <PersonaReglages persona={local.config?.persona} onChange={(persona) => setConfig({ persona })} />
            </div>
          )}
        </Repli>
      </section>
    </div>
  );
}

// Les mises en situation faites de DONNÉES : résumées, puis éditées derrière un repli.
const TYPES_DONNEES = ["crm", "sheet", "inbox", "board", "code"];

function OptionsQcm({ local, maj }) {
  const { t } = useI18n();
  const options = local.config?.options || [];
  const setOptions = (opts, correct = local.config?.correct_index) =>
    maj((p) => ({ ...p, config: { ...(p.config || {}), options: opts, correct_index: correct } }));

  return (
    <div>
      <label style={{ ...labelStyle, marginTop: 0 }}>{t("dashboard.experienceEditor.qcmOptions")}</label>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {options.map((opt, oi) => (
          <div key={oi} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <input
              type="radio"
              name={`qcm-correct-${local.id}`}
              title={t("dashboard.experienceEditor.qcmCorrect")}
              checked={local.config?.correct_index === oi}
              onChange={() => setOptions(options, oi)}
              style={{ accentColor: "var(--primary)", width: 16, height: 16, flexShrink: 0 }}
            />
            <input
              value={opt}
              onChange={(e) => setOptions(options.map((o, i) => (i === oi ? e.target.value : o)))}
              placeholder={`Option ${oi + 1}`}
              style={{ ...inputStyle, marginBottom: 0 }}
            />
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                let correct = local.config?.correct_index;
                if (correct === oi) correct = 0;
                else if (correct > oi) correct--;
                setOptions(options.filter((_, i) => i !== oi), correct);
              }}
              style={{ padding: "4px", color: "#dc2626" }}
            ><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
      <button className="btn btn-ghost btn-sm" onClick={() => setOptions([...options, ""])} style={{ fontSize: "12px", display: "flex", alignItems: "center", gap: "4px", marginTop: "0.5rem" }}>
        <Plus size={13} /> {t("dashboard.experienceEditor.addOption")}
      </button>
      <p style={{ fontSize: "11.5px", color: "var(--muted-foreground)", marginTop: "0.5rem" }}>{t("dashboard.experienceEditor.qcmHelp")}</p>
    </div>
  );
}

// ─── Onglet « Scoring » ──────────────────────────────────────────────────────
// La grille telle quelle — compétences, sous-compétences, checkpoints : c'est ce
// qui fait la précision de la note (décision de Remco, 12/10/2026) —, présentée
// pour être LUE avant d'être modifiée :
//   • en tête, une ligne : la part de l'étape dans la note et son importance ;
//     la méthode (0/1/2, second avis, ×2) derrière « Comment l'IA note ? » ;
//   • les compétences jugées, en tuiles ; puis chaque critère (sous-compétence)
//     UNE fois, fermé, qui dit quelles compétences il juge ; un clic l'ouvre
//     sur sa description, comment il est noté et ses checkpoints ;
//   • le câblage (renommer, relier une compétence, supprimer) derrière ✎ ;
//   • le corrigé, replié.
// Aucune mention « obligatoire / bonus / compte double » à l'écran (Remco :
// des lignes que les entreprises ne comprennent pas) : la règle reste dans la
// notation et s'explique sous « Comment l'IA note ? ». La méthode n'est pas
// réglable : on règle ce qui est observé et le poids de l'étape.
export function OngletScoring({ edition, competences, part, toast, descriptions, descriptionsEnCours }) {
  const { t } = useI18n();
  const { local, set, setConfig, maj } = edition;
  const [regles, setRegles] = useState(false);
  const isQcm = local.kind === "classic_qcm";
  const criteria = local.criteria || [];
  const aCheckpoints = criteria.some(estCritereCheckpoints);
  const crmFactuel = local.sandbox_kind === "crm" && (local.config?.crm?.fields || []).some((f) => f?.nature === "factual");
  const codeTeste = local.sandbox_kind === "code" && (local.config?.code?.tests || []).length > 0;
  const k = (cle, vars) => t(`dashboard.experienceEditor.scoring.${cle}`, vars);
  const seule = part >= 100;
  const idsDe = (c) => (c.skill_ids?.length ? c.skill_ids : (local.config?.skills_tested || []));
  const idsNotes = [...new Set(criteria.flatMap(idsDe))];
  // Les critères ouverts (par index). Tenu ici : un clic sur une compétence
  // ouvre les critères qui la jugent. Un critère neuf, sans point écrit,
  // s'ouvre d'office.
  const [ouverts, setOuverts] = useState(() =>
    criteria.map((c, i) => (Array.isArray(c.checkpoints) && !c.checkpoints.some((cp) => (cp.description || "").trim()) ? i : -1)).filter((i) => i >= 0));
  function ouvrirCriteres(indices) {
    if (!indices.length) return;
    setOuverts((o) => [...new Set([...o, ...indices])]);
    // Après le rendu : amène le premier sous les yeux.
    setTimeout(() => document.getElementById(`critere-${indices[0]}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  function majCritere(ci, transform) {
    maj((p) => {
      const liste = [...(p.criteria || [])];
      liste[ci] = transform(liste[ci]);
      return { ...p, criteria: liste };
    });
  }

  // Un nouveau critère naît au format checkpoints. Ajouté depuis « + Ajouter
  // une compétence », il en porte le nom et ne note qu'elle ; sinon il est
  // rattaché aux compétences que l'étape teste déjà.
  function ajouterCritere(comp = null) {
    setOuverts((o) => [...o, criteria.length]);
    maj((p) => ({
      ...p,
      criteria: [...(p.criteria || []), {
        name: comp?.name || t("dashboard.experienceEditor.newSubDimension"),
        skill_ids: comp ? [comp.id] : [...(p.config?.skills_tested || [])],
        checkpoints: [1, 2, 3].map((n) => ({ id: `cp${n}`, description: "" })),
      }],
    }));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* ── En tête : ce que pèse l'étape ──
          Quand elle fait toute la note (une seule étape notée), ni « 100 % »
          ni importance : on le sait, et la régler n'y changerait rien. Seul
          reste le lien vers la méthode de notation. */}
      <section className={seule ? undefined : "card"} style={seule ? undefined : { padding: "0.9rem 1.2rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem 1.25rem", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 220px", minWidth: 0 }}>
            {!seule && (
              <div style={{ fontSize: "15px", fontWeight: 800 }}>
                {part > 0 ? k("share", { part }) : k("shareNone")}
              </div>
            )}
            <button
              type="button"
              onClick={() => setRegles((r) => !r)}
              style={{ background: "none", border: "none", padding: 0, marginTop: seule ? 0 : 3, cursor: "pointer", font: "inherit", fontSize: "12.5px", color: "var(--primary)", display: "inline-flex", alignItems: "center", gap: 4 }}
            >
              <Info size={13} /> {k("howLink")}
            </button>
          </div>
          {/* L'importance : le seul réglage du poids dans la note. La part
              suit en direct (partsDeLaNote, même règle que la notation).
              Masquée quand l'étape fait déjà toute la note (une seule étape
              notée) : la régler n'y changerait rien — 100 % d'office. */}
          {part > 0 && !seule && (
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "12.5px", fontWeight: 700 }}>
              {k("importance")}
              <select
                value={poidsEtape(local)}
                onChange={(e) => setConfig({ poids_etape: Number(e.target.value) })}
                title={k("importanceHelp")}
                style={{ ...selectStyle, width: "auto", marginBottom: 0, fontSize: "13px", padding: "6px 30px 6px 10px" }}
              >
                {POIDS_ETAPE.map((v) => <option key={v} value={v}>{k(`importanceLevels.${CLES_IMPORTANCE[v]}`)}</option>)}
              </select>
            </label>
          )}
        </div>

        {regles && (
          <div className={seule ? "card" : undefined} style={seule
            ? { marginTop: "0.6rem", padding: "0.9rem 1.2rem" }
            : { marginTop: "0.8rem", paddingTop: "0.8rem", borderTop: "1px solid var(--border)" }}>
            <ul style={{ margin: 0, paddingLeft: "1.1rem", display: "flex", flexDirection: "column", gap: 6, fontSize: "13px", lineHeight: 1.55 }}>
              {aCheckpoints && <li>{k("checkpointsRule")}</li>}
              {aCheckpoints && <li>{k("doubt")}</li>}
              {isQcm && <li>{k("autoQcm")}</li>}
              {crmFactuel && <li>{k("autoCrm")}</li>}
              {codeTeste && <li>{k("autoCode")}</li>}
              <li>{k("weightRule")}</li>
              {!seule && <li>{k("importanceHelp")}</li>}
            </ul>
            {aCheckpoints && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: "0.7rem" }}>
                {[0, 1, 2].map((n) => (
                  <span key={n} style={{ fontSize: "12px", fontWeight: 600, padding: "3px 10px", borderRadius: 99, background: "var(--secondary)" }}>
                    <strong>{n}</strong> · {k(`level${n}`)}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── QCM : la compétence vérifiée ── */}
      {isQcm && competences.length > 0 && (
        <section className="card" style={sectionStyle}>
          <label style={{ ...labelStyle, marginTop: 0 }}>{t("dashboard.experienceEditor.qcmSkill")}</label>
          <select
            value={(local.config?.skills_tested || [])[0] || ""}
            onChange={(e) => maj((p) => ({ ...p, config: { ...(p.config || {}), skills_tested: e.target.value ? [e.target.value] : [] } }))}
            style={selectStyle}
          >
            <option value="">{t("dashboard.experienceEditor.noSkill")}</option>
            {competences.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </section>
      )}

      {/* ── Compétences évaluées, puis critères d'évaluation ──
          (12/10/2026) On part des compétences — l'entreprise voit d'abord ce
          qui est jugé —, puis chaque critère n'apparaît qu'UNE fois et dit
          lui-même quelles compétences il juge. Regrouper les critères sous
          chaque compétence répétait le même critère sous trois compétences.
          Un clic sur une compétence ouvre le ou les critères qui la jugent ;
          un clic sur un critère ouvre sa carte. Grille et notation inchangées. */}
      {!isQcm && (
        <>
          <section className="card" style={sectionStyle}>
            <EnTeteSection titre={k("skillsTitle")} compte={idsNotes.length} aide={k("skillsHelp")} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 8 }}>
              {idsNotes.map((id) => {
                const comp = competences.find((x) => x.id === id);
                const juges = criteria.map((c, i) => (idsDe(c).includes(id) ? i : -1)).filter((i) => i >= 0);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => ouvrirCriteres(juges)}
                    className="tuile-competence"
                    style={{
                      display: "flex", alignItems: "flex-start", gap: 9, padding: "0.65rem 0.8rem", borderRadius: 12, textAlign: "left",
                      border: "1px solid var(--border)", background: "var(--background)", cursor: "pointer", font: "inherit", color: "var(--foreground)", minWidth: 0,
                    }}
                  >
                    <Check size={15} style={{ color: "var(--primary)", flexShrink: 0, marginTop: 2 }} />
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: "13px", fontWeight: 700, lineHeight: 1.35 }}>{comp?.name || id}</span>
                    </span>
                  </button>
                );
              })}
              <AjoutCompetence
                disponibles={competences.filter((c) => !idsNotes.includes(c.id))}
                onAjouter={(comp) => ajouterCritere(comp)}
              />
            </div>
            <div style={{ fontSize: "12px", color: "var(--muted-foreground)", marginTop: "0.8rem", display: "flex", gap: 6, alignItems: "baseline", flexWrap: "wrap" }}>
              <span>{k("mainSkill")}</span>
              <TexteEditable
                valeur={local.skill_assessed || ""}
                vide={t("dashboard.experienceEditor.skillAssessedHint")}
                onChange={(v) => set("skill_assessed", v)}
                style={{ fontWeight: 600, color: "var(--foreground)" }}
                uneLigne
              />
            </div>
          </section>

          <section className="card" style={sectionStyle}>
            <EnTeteSection titre={k("criteriaTitle")} compte={criteria.length} aide={k("criteriaHelp")} />
            {!criteria.length && (
              <p style={{ fontSize: "13px", color: "var(--muted-foreground)", margin: "0 0 0.75rem" }}>{k("noCriteria")}</p>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {criteria.map((c, ci) => (
                <CarteCritere
                  key={ci}
                  ancre={`critere-${ci}`}
                  ouvert={ouverts.includes(ci)}
                  onToggle={() => setOuverts((o) => (o.includes(ci) ? o.filter((x) => x !== ci) : [...o, ci]))}
                  critere={c}
                  description={(descriptions || []).find((d) => d.name === (c.name || "") && d.texte)?.texte || ""}
                  descriptionEnCours={descriptionsEnCours}
                  relu={k(`reviewed.${natureRelue(local)}`)}
                  skillsEtape={local.config?.skills_tested || []}
                  competences={competences}
                  stepId={local.id}
                  toast={toast}
                  onChange={(transform) => majCritere(ci, transform)}
                  onRemove={() => {
                    // Les index se décalent : on referme tout plutôt que d'ouvrir le mauvais.
                    setOuverts([]);
                    maj((p) => ({ ...p, criteria: (p.criteria || []).filter((_, i) => i !== ci) }));
                  }}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => ajouterCritere()}
              style={{
                width: "100%", marginTop: 10, padding: "0.6rem", borderRadius: 12, border: "1px dashed var(--border)",
                background: "transparent", color: "var(--muted-foreground)", cursor: "pointer", font: "inherit", fontSize: "13px", fontWeight: 600,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}
            >
              <Plus size={14} /> {k("addSubSkill")}
            </button>
          </section>
        </>
      )}

      {/* Ce que l'IA sait pour noter — replié, ce n'est pas une seconde grille. */}
      {aUnCorrige(local) && <Corrige step={local} setConfig={setConfig} stepId={local.id} toast={toast} />}
    </div>
  );
}

// ─── En-tête d'une section : titre, compteur, une ligne d'aide ───────────────
function EnTeteSection({ titre, compte, aide }) {
  return (
    <div style={{ marginBottom: "0.85rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <h3 style={{ ...titreSection, margin: 0, fontSize: "14.5px" }}>{titre}</h3>
        <span style={{ flex: 1, height: 1, background: "var(--border)" }} />
        <span style={{ fontSize: "12px", fontWeight: 600, padding: "2px 10px", borderRadius: 99, background: "var(--secondary)", color: "var(--muted-foreground)" }}>{compte}</span>
      </div>
      {aide && <p style={{ fontSize: "12.5px", color: "var(--muted-foreground)", fontStyle: "italic", margin: "6px 0 0", lineHeight: 1.5 }}>{aide}</p>}
    </div>
  );
}

// ─── « + Ajouter une compétence » ────────────────────────────────────────────
// Choisie dans la liste validée de l'offre : elle arrive avec un critère à
// son nom, ouvert, à remplir (à la main ou avec ✨ une fois un point écrit).
function AjoutCompetence({ disponibles, onAjouter }) {
  const { t } = useI18n();
  const [choix, setChoix] = useState(false);
  if (!disponibles.length) return null;
  return choix ? (
    <select
      autoFocus
      defaultValue=""
      onBlur={() => setChoix(false)}
      onChange={(e) => {
        const comp = disponibles.find((c) => c.id === e.target.value);
        if (comp) onAjouter(comp);
        setChoix(false);
      }}
      style={{ ...selectStyle, marginBottom: 0, alignSelf: "stretch", borderStyle: "dashed", fontSize: "13px" }}
    >
      <option value="">{t("dashboard.experienceEditor.scoring.pickSkill")}</option>
      {disponibles.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
    </select>
  ) : (
    <button
      type="button"
      onClick={() => setChoix(true)}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "0.75rem", borderRadius: 12,
        border: "1.5px dashed var(--primary)", background: "transparent", color: "var(--primary)", cursor: "pointer",
        font: "inherit", fontSize: "13px", fontWeight: 600,
      }}
    >
      <Plus size={15} /> {t("dashboard.experienceEditor.scoring.addSkill")}
    </button>
  );
}

// Ce que le correcteur relit pour cette étape : la réponse du candidat, sous
// la forme où il l'a donnée.
function natureRelue(step) {
  const sandbox = step?.sandbox_kind && step.sandbox_kind !== "none" ? step.sandbox_kind : null;
  if (sandbox === "persona") return (step.config?.persona?.mode || "call") === "chat" ? "chat" : "call";
  if (sandbox) return sandbox;
  return step?.response_format || "text";
}

// ─── Un critère d'évaluation (une sous-compétence) ───────────────────────────
// À gauche : son nom, ce qu'il évalue (description rédigée par l'IA,
// lib/descriptionsCriteres.js), la compétence qu'il note, et ses points
// vérifiés à déplier — un clic sur un point l'ouvre à l'édition. À droite :
// comment c'est noté (ce qui est relu, le barème, le poids). ✎ ouvre le
// câblage : renommer, changer les compétences notées, supprimer.
function CarteCritere({ ancre, ouvert, onToggle, critere: c, description, descriptionEnCours, relu, skillsEtape, competences, stepId, toast, onChange, onRemove }) {
  const { t } = useI18n();
  const k = (cle, vars) => t(`dashboard.experienceEditor.scoring.${cle}`, vars);
  const aCheckpoints = Array.isArray(c.checkpoints);
  const nbPoints = aCheckpoints ? c.checkpoints.length : 0;
  // Un critère neuf (aucun point écrit) montre d'office ses points à remplir.
  const [points, setPoints] = useState(() => aCheckpoints && !c.checkpoints.some((cp) => (cp.description || "").trim()));
  const [cablage, setCablage] = useState(false);
  const ids = c.skill_ids?.length ? c.skill_ids : skillsEtape;
  const majCheckpoints = (f) => onChange((x) => ({ ...x, checkpoints: f([...(x.checkpoints || [])]) }));
  const libelleSecondaire = { fontSize: "11px", fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: ".05em" };

  return (
    <div id={ancre} className="carte-critere" style={{ border: "1px solid var(--border)", borderRadius: 14, background: "var(--background)", minWidth: 0, overflowWrap: "anywhere", scrollMarginTop: 16 }}>
      {/* En-tête : le critère, et les compétences qu'il juge. */}
      <button
        type="button"
        onClick={onToggle}
        className="groupe-competence-tete"
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "0.75rem 1rem", borderRadius: ouvert ? "14px 14px 0 0" : 14,
          background: "none", border: "none", cursor: "pointer", font: "inherit", color: "var(--foreground)", textAlign: "left",
        }}
      >
        <ChevronDown size={15} style={{ flexShrink: 0, color: "var(--muted-foreground)", transform: ouvert ? "none" : "rotate(-90deg)", transition: "transform .15s" }} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: "14.5px", fontWeight: 800, lineHeight: 1.35 }}>{c.name || "—"}</span>
          <span style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap", marginTop: 4 }}>
            <span style={{ fontSize: "11.5px", color: "var(--muted-foreground)" }}>{k("judges")}</span>
            {ids.length ? ids.map((id) => {
              const comp = competences.find((x) => x.id === id);
              return (
                <span key={id} style={{
                  fontSize: "11.5px", fontWeight: 600, padding: "2px 9px", borderRadius: 99,
                  background: comp?.tier === MUST ? "#eef2ff" : "var(--secondary)", color: comp?.tier === MUST ? "#3730a3" : "var(--foreground)",
                }}>{comp?.name || id}</span>
              );
            }) : <span style={{ fontSize: "11.5px", color: "#b45309" }}>{t("dashboard.experienceEditor.noSkill")}</span>}
          </span>
        </span>
        {aCheckpoints && <span style={{ fontSize: "12px", color: "var(--muted-foreground)", whiteSpace: "nowrap" }}>{k("points", { count: nbPoints })}</span>}
      </button>

      {ouvert && (<>
      <div className="carte-critere-corps" style={{ borderTop: "1px solid var(--border)" }}>
        {/* ── Ce que le critère évalue ── */}
        <div style={{ padding: "1rem 1.1rem", minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            {cablage ? (
              <input
                value={c.name || ""}
                onChange={(e) => onChange((x) => ({ ...x, name: e.target.value }))}
                placeholder={t("dashboard.experienceEditor.subDimensionName")}
                style={{ ...inputStyle, fontWeight: 700, marginBottom: 0 }}
              />
            ) : (
              <span style={{ flex: 1, minWidth: 0, ...libelleSecondaire }}>{k("whatItAssesses")}</span>
            )}
            {cablage && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={onRemove} title={t("dashboard.experienceEditor.stepPage.delete")} style={{ padding: 4, color: "#dc2626" }}>
                <Trash2 size={14} />
              </button>
            )}
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setCablage((v) => !v)}
              title={t(cablage ? "dashboard.experienceEditor.recit.done" : "dashboard.experienceEditor.recit.edit")}
              style={{ padding: 4, color: cablage ? "var(--primary)" : "var(--muted-foreground)" }}
            >
              {cablage ? <Check size={14} /> : <Pencil size={13} />}
            </button>
          </div>

          {description ? (
            <p style={{ fontSize: "13.5px", color: "var(--muted-foreground)", lineHeight: 1.6, margin: "0.45rem 0 0" }}>{description}</p>
          ) : descriptionEnCours ? (
            <p className="bloc-etape-attente" style={{ fontSize: "13px", color: "var(--muted-foreground)", margin: "0.45rem 0 0" }}>{k("describing")}</p>
          ) : null}

          {cablage && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: "0.75rem" }}>
              <span style={libelleSecondaire}>{k("gradedSkill")}</span>
              <SkillPicker ids={c.skill_ids || []} competences={competences} onChange={(v) => onChange((x) => ({ ...x, skill_ids: v }))} />
            </div>
          )}
          {c.added_for_coverage && (
            <p style={{ fontSize: "11.5px", color: "#0369a1", margin: "6px 0 0" }}>
              {t("dashboard.experienceEditor.addedForCoverage", {
                skill: competences.find((x) => x.id === c.added_for_coverage)?.name || c.added_for_coverage,
              })}
            </p>
          )}
        </div>

        {/* ── Comment c'est noté ── */}
        <div className="carte-critere-note" style={{ padding: "1rem 1.1rem", display: "flex", flexDirection: "column", gap: 10, minWidth: 0, overflowWrap: "anywhere" }}>
          <span style={libelleSecondaire}>{k("howEvaluated")}</span>
          <div>
            <div style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>{k("whatReviewed")}</div>
            <div style={{ fontSize: "13px", fontWeight: 700 }}>{relu}</div>
          </div>
          {aCheckpoints && (
            <div>
              <div style={{ fontSize: "12px", color: "var(--muted-foreground)", marginBottom: 4 }}>{k("gradingPlan")}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                {c.checkpoints.map((cp, i) => (
                  <span key={cp.id || i} title={cp.description || ""} style={{ width: 13, height: 13, borderRadius: 99, background: "#ede9fe", border: "1.5px solid #a78bfa" }} />
                ))}
                <span style={{ fontSize: "12px", color: "var(--muted-foreground)", marginLeft: 4 }}>{k("pointsScale", { count: nbPoints })}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Les points vérifiés, à déplier ── */}
      <div style={{ borderTop: "1px solid var(--border)" }}>
        {aCheckpoints ? (
          <>
            <button
              type="button"
              onClick={() => setPoints((o) => !o)}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 6, padding: "0.6rem 1.1rem", background: "none", border: "none", cursor: "pointer", font: "inherit", fontSize: "12.5px", fontWeight: 600, color: "var(--primary)", textAlign: "left" }}
            >
              <ChevronDown size={14} style={{ transform: points ? "none" : "rotate(-90deg)", transition: "transform .15s" }} />
              {k(points ? "hidePoints" : "showPoints", { count: nbPoints })}
            </button>
            {points && (
              <div style={{ padding: "0 1.1rem 0.85rem" }}>
                <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                  {c.checkpoints.map((cp, ki) => (
                    <li key={cp.id || ki} className="checkpoint-ligne" style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "5px 6px", borderRadius: 8 }}>
                      <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--muted-foreground)", width: 14, flexShrink: 0, paddingTop: 1, textAlign: "right" }}>{ki + 1}.</span>
                      <TexteEditable
                        valeur={cp.description || ""}
                        vide={t("dashboard.experienceEditor.checkpointPlaceholder")}
                        onChange={(v) => majCheckpoints((cps) => cps.map((x, i) => (i === ki ? { ...x, description: v } : x)))}
                        style={{ flex: 1, fontSize: "13.5px", lineHeight: 1.5 }}
                      />
                      <span className="checkpoint-actions" style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => majCheckpoints((cps) => cps.filter((_, i) => i !== ki))} style={{ padding: 3, color: "var(--muted-foreground)" }}>
                          <X size={13} />
                        </button>
                      </span>
                    </li>
                  ))}
                </ol>
                {c.checkpoints.length < CHECKPOINTS_MAX && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => majCheckpoints((cps) => [...cps, { id: nouvelIdCheckpoint(cps), description: "" }])}
                    style={{ fontSize: "12px", display: "flex", alignItems: "center", gap: 4, marginLeft: 24, marginTop: 2 }}
                  >
                    <Plus size={13} /> {t("dashboard.experienceEditor.addCheckpoint")}
                  </button>
                )}
              </div>
            )}
          </>
        ) : (
          <div style={{ padding: "0.75rem 1.1rem" }}>
            <p style={{ fontSize: "11px", color: "var(--muted-foreground)", fontStyle: "italic", margin: "0 0 6px" }}>
              {t("dashboard.experienceEditor.legacyGrid")}
            </p>
            {(c.bars_levels || []).map((b, li) => (
              <div key={li} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 4 }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted-foreground)", width: 70, flexShrink: 0, paddingTop: 8 }}>N{b.level} {b.label}</span>
                <AutoTextarea
                  value={b.description || ""}
                  onChange={(e) => onChange((x) => ({
                    ...x,
                    bars_levels: (x.bars_levels || []).map((l, i) => (i === li ? { ...l, description: e.target.value } : l)),
                  }))}
                  rows={2}
                  style={{ ...inputStyle, marginBottom: 0, fontSize: "12px", lineHeight: 1.5 }}
                />
              </div>
            ))}
          </div>
        )}
      </div>
      </>)}
    </div>
  );
}

// ─── Un texte qu'on lit, et qu'un clic ouvre à l'édition ─────────────────────
// Vide, il affiche son invite en italique — cliquable comme le reste.
function TexteEditable({ valeur, vide, onChange, style, uneLigne = false }) {
  const [edition, setEdition] = useState(false);
  if (edition) {
    return uneLigne ? (
      <input
        autoFocus
        value={valeur}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setEdition(false)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") setEdition(false); }}
        style={{ ...inputStyle, marginBottom: 0, padding: "3px 8px", fontSize: "13px", width: "auto", minWidth: 260, ...style }}
      />
    ) : (
      <AutoTextarea
        autoFocus
        value={valeur}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setEdition(false)}
        rows={1}
        style={{ ...inputStyle, marginBottom: 0, ...style }}
      />
    );
  }
  return (
    <span
      role="button"
      tabIndex={0}
      onClick={() => setEdition(true)}
      onKeyDown={(e) => { if (e.key === "Enter") setEdition(true); }}
      className="texte-editable"
      style={{ cursor: "text", borderRadius: 6, ...style, ...(valeur.trim() ? {} : { fontStyle: "italic", color: "var(--muted-foreground)" }) }}
    >
      {valeur.trim() || vide}
    </span>
  );
}

const sectionStyle = { padding: "1.1rem 1.3rem" };
// Libellé de chaque importance (POIDS_ETAPE, lib/competences.js).
const CLES_IMPORTANCE = { 0.5: "low", 1: "normal", 1.5: "high", 2: "veryHigh" };
const titreSection = { fontSize: "13.5px", fontWeight: 800, margin: "0 0 0.6rem" };

