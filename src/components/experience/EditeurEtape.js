"use client";

// Édition d'UNE étape, en deux onglets : « Scénario » (ce que le candidat
// reçoit) et « Notation » (ce que l'IA vérifie, et comment ça compte dans la
// note). Ce sont les champs de l'ancienne carte d'étape, rangés : rien n'a été
// retiré, et l'enregistrement est le même (updateStep, versionnage compris).
//
// L'état local vit dans useEditionEtape, partagé par les deux onglets : on
// passe de l'un à l'autre sans perdre une modification, et un seul bouton
// enregistre le tout. Le composant appelant le remonte à chaque nouvelle
// version de l'étape (key = id + updated_at) — pas d'effet de resynchronisation.

import { useState } from "react";
import { Plus, Trash2, X, Info, Pencil, Check, ChevronRight } from "lucide-react";
import { updateStep } from "@/lib/actions/experience";
import {
  estCritereCheckpoints, etapeNoteeSansGrille, CHECKPOINTS_MAX, POIDS_ETAPE, poidsEtape,
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
import { inputStyle, labelStyle, Panneau, LigneReglage, Interrupteur } from "./ui";

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
// modifier sur place. Les données lourdes (pipeline, tableur, messages) restent
// derrière un repli ; la mécanique (format, assistant, voix…) dans « Réglages
// avancés ». Ce que l'IA sait pour noter est dans « Le corrigé », onglet
// Notation. Mise en page : maquette « D · Étape – Scénario » (octobre 2026).
export function OngletScenario({ edition, toast }) {
  const { t } = useI18n();
  const { local, set, setConfig, maj } = edition;
  const kind = local.sandbox_kind || "none";
  const isQcm = local.kind === "classic_qcm";
  const donnees = TYPES_DONNEES.includes(kind);
  const aContenu = !!CHAMPS_SCENE[kind] || donnees || isQcm;
  const commun = { stepId: local.id, toast };
  const r = (cle) => t(`dashboard.experienceEditor.recit.${cle}`);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Panneau id="ds-presentation" titre={t("dashboard.experienceEditor.stepPage.presentation")}>
        <SectionRecit titre={t("dashboard.experienceEditor.stepTitle")} valeur={local.title} lignes={1}
          onChange={(v) => set("title", v)} />
        <SectionRecit titre={r("brief")} aide={r("briefHelp")}
          valeur={local.prompt} lignes={5}
          onChange={(v) => set("prompt", v)} />
      </Panneau>

      {kind === "persona" && (
        <RecitPersona persona={local.config?.persona} onChange={(persona) => setConfig({ persona })} />
      )}

      {aContenu && (
        <Panneau id="ds-contenu" titre={t("dashboard.experienceEditor.stepPage.content")}>
          {CHAMPS_SCENE[kind] && <RecitScene {...commun} kind={kind} config={local.config} setConfig={setConfig} />}
          {donnees && (
            <>
              <ResumeDonnees kind={kind} config={local.config} />
              <Repli titre={r("data.edit")}>
                {kind === "crm" && <CrmEditor crm={local.config?.crm} onChange={(crm) => setConfig({ crm })} />}
                {kind === "sheet" && <SheetEditor sheet={local.config?.sheet} onChange={(sheet) => setConfig({ sheet })} />}
                {kind === "inbox" && <InboxEditor inbox={local.config?.inbox} onChange={(inbox) => setConfig({ inbox })} />}
                {kind === "board" && <BoardEditor board={local.config?.board} onChange={(board) => setConfig({ board })} />}
                {kind === "code" && <CodeExerciseEditor code={local.config?.code} onChange={(code) => setConfig({ code })} />}
              </Repli>
            </>
          )}
          {isQcm && <div style={{ padding: 14 }}><OptionsQcm local={local} maj={maj} /></div>}
        </Panneau>
      )}

      {/* La mécanique de l'étape : rarement touchée après la génération. */}
      <Panneau id="ds-reglages" titre={r("advanced")} sousTitre={r("advancedHelp")} defautOuvert={false}>
        <LigneReglage titre={t("dashboard.experienceEditor.responseFormat")} aide={r("formatHelp")}>
          <select value={local.response_format} onChange={(e) => set("response_format", e.target.value)} className="ds-select" style={{ height: 36, minWidth: 220, fontSize: 13 }}>
            {RESPONSE_FORMAT_VALUES.filter((v) => !enPause(v) || v === local.response_format).map((v) => <option key={v} value={v}>{t(`dashboard.experienceEditor.format.${v}`)}</option>)}
          </select>
        </LigneReglage>
        <LigneReglage titre={t("dashboard.experienceEditor.sandbox")} aide={r("sandboxHelp")}>
          <select value={kind} onChange={(e) => set("sandbox_kind", e.target.value)} className="ds-select" style={{ height: 36, minWidth: 220, fontSize: 13 }}>
            {/* Un type en pause reste affiché sur l'étape qui l'a déjà, nulle part ailleurs. */}
            {SANDBOX_KIND_VALUES.filter((v) => !enPause(v) || v === kind).map((v) => <option key={v} value={v}>{t(`dashboard.experienceEditor.sandboxKind.${v}`)}</option>)}
          </select>
        </LigneReglage>
        <LigneReglage titre={t("dashboard.experienceEditor.stepPage.assistant")} aide={r("assistantHelp")}>
          <Interrupteur
            actif={!!local.ai_assistant_allowed}
            onChange={(v) => set("ai_assistant_allowed", v)}
            label={t("dashboard.experienceEditor.stepPage.assistant")}
            texte={local.ai_assistant_allowed ? r("on") : r("off")}
          />
        </LigneReglage>
        {local.ai_assistant_allowed && (
          <LigneReglage titre={t("dashboard.experienceEditor.messageCap")}>
            <input
              type="number" min={1} max={200}
              value={local.config?.ai_max_messages ?? DEFAUT_ECHANGES_IA}
              onChange={(e) => setConfig({ ai_max_messages: e.target.value === "" ? "" : Math.max(1, parseInt(e.target.value, 10) || 1) })}
              className="ds-input ds-mono"
              style={{ width: 90, height: 36 }}
            />
          </LigneReglage>
        )}
        {kind === "persona" && (
          <PersonaReglages persona={local.config?.persona} onChange={(persona) => setConfig({ persona })} />
        )}
      </Panneau>
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
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {options.map((opt, oi) => (
          <div key={oi} style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="radio"
              name={`qcm-correct-${local.id}`}
              title={t("dashboard.experienceEditor.qcmCorrect")}
              checked={local.config?.correct_index === oi}
              onChange={() => setOptions(options, oi)}
              style={{ width: 16, height: 16, flexShrink: 0 }}
            />
            <input
              value={opt}
              onChange={(e) => setOptions(options.map((o, i) => (i === oi ? e.target.value : o)))}
              placeholder={`Option ${oi + 1}`}
              className="ds-input"
            />
            <button
              type="button"
              className="ds-icon-btn is-danger"
              aria-label={t("dashboard.experienceEditor.stepPage.delete")}
              onClick={() => {
                let correct = local.config?.correct_index;
                if (correct === oi) correct = 0;
                else if (correct > oi) correct--;
                setOptions(options.filter((_, i) => i !== oi), correct);
              }}
            ><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
      <button type="button" className="ds-add" onClick={() => setOptions([...options, ""])} style={{ width: "100%", marginTop: 8 }}>
        <Plus size={14} /> {t("dashboard.experienceEditor.addOption")}
      </button>
      <p className="ds-sub" style={{ marginTop: 8 }}>{t("dashboard.experienceEditor.qcmHelp")}</p>
    </div>
  );
}

// ─── Onglet « Notation » ─────────────────────────────────────────────────────
// La grille telle quelle — compétences, sous-compétences, checkpoints : c'est ce
// qui fait la précision de la note (décision de Remco, 12/10/2026) —, présentée
// pour être LUE avant d'être modifiée (maquette « D · Étape – Notation ») :
//   • en tête, la part de l'étape dans la note et son importance ; la méthode
//     (0/1/2, second avis, ×2) derrière « Comment l'IA note-t-elle ? » ;
//   • les compétences jugées, en pastilles ; puis chaque critère
//     (sous-compétence) UNE fois, fermé, qui dit quelles compétences il juge ;
//     un clic l'ouvre sur ses points de contrôle ;
//   • le câblage (renommer, relier une compétence, supprimer) derrière ✎ ;
//   • le corrigé, replié.
// Aucune mention « obligatoire / bonus / compte double » à l'écran (Remco :
// des lignes que les entreprises ne comprennent pas) : la règle reste dans la
// notation et s'explique sous « Comment l'IA note-t-elle ? ».
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
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* ── En tête : ce que pèse l'étape, et la méthode ──
          Quand elle fait toute la note (une seule étape notée), ni « 100 % »
          ni importance : on le sait, et la régler n'y changerait rien. */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px 16px", flexWrap: "wrap" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          {!seule && (
            <span className="ds-chip ds-chip-lg" style={{ fontWeight: 500, color: "var(--ds-ink)" }}>
              {part > 0 ? k("share", { part }) : k("shareNone")}
            </span>
          )}
          {/* L'importance : le seul réglage du poids dans la note. La part
              suit en direct (partsDeLaNote, même règle que la notation). */}
          {part > 0 && !seule && (
            <label className="ds-sort" title={k("importanceHelp")}>
              {k("importance")}
              <select value={poidsEtape(local)} onChange={(e) => setConfig({ poids_etape: Number(e.target.value) })}>
                {POIDS_ETAPE.map((v) => <option key={v} value={v}>{k(`importanceLevels.${CLES_IMPORTANCE[v]}`)}</option>)}
              </select>
            </label>
          )}
        </span>
        <button type="button" className="ds-btn ds-btn-ghost ds-btn-sm" onClick={() => setRegles((r) => !r)} aria-expanded={regles} style={{ color: "var(--ds-blue)" }}>
          <Info size={14} /> {k("howLink")}
        </button>
      </div>

      {regles && (
        <div className="ds-inset" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <ul style={{ margin: 0, paddingLeft: "1.1rem", display: "flex", flexDirection: "column", gap: 6, fontSize: 13, lineHeight: 1.55, color: "var(--ds-ink-2)" }}>
            {aCheckpoints && <li>{k("checkpointsRule")}</li>}
            {aCheckpoints && <li>{k("doubt")}</li>}
            {isQcm && <li>{k("autoQcm")}</li>}
            {crmFactuel && <li>{k("autoCrm")}</li>}
            {codeTeste && <li>{k("autoCode")}</li>}
            <li>{k("weightRule")}</li>
            {!seule && <li>{k("importanceHelp")}</li>}
          </ul>
          {aCheckpoints && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {[0, 1, 2].map((n) => (
                <span key={n} className="ds-chip">
                  <strong className="ds-mono" style={{ color: "var(--ds-blue)" }}>{n}</strong> {k(`level${n}`)}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── QCM : la compétence vérifiée ── */}
      {isQcm && competences.length > 0 && (
        <Panneau id="ds-qcm-competence" titre={t("dashboard.experienceEditor.qcmSkill")} repliable={false} lignes={false}>
          <select
            value={(local.config?.skills_tested || [])[0] || ""}
            onChange={(e) => maj((p) => ({ ...p, config: { ...(p.config || {}), skills_tested: e.target.value ? [e.target.value] : [] } }))}
            className="ds-select"
          >
            <option value="">{t("dashboard.experienceEditor.noSkill")}</option>
            {competences.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Panneau>
      )}

      {/* ── Compétences évaluées, puis critères d'évaluation ──
          (12/10/2026) On part des compétences — l'entreprise voit d'abord ce
          qui est jugé —, puis chaque critère n'apparaît qu'UNE fois et dit
          lui-même quelles compétences il juge. Un clic sur une compétence
          ouvre le ou les critères qui la jugent. Grille et notation inchangées. */}
      {!isQcm && (
        <>
          <Panneau id="ds-competences" titre={k("skillsTitle")} sousTitre={k("skillsHelp")} compte={idsNotes.length} lignes={false} styleCorps={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {idsNotes.map((id) => {
                const comp = competences.find((x) => x.id === id);
                const juges = criteria.map((c, i) => (idsDe(c).includes(id) ? i : -1)).filter((i) => i >= 0);
                return (
                  <button key={id} type="button" onClick={() => ouvrirCriteres(juges)} className="ds-btn ds-btn-sm" style={{ fontWeight: 400, paddingLeft: 8, gap: 7 }}>
                    <span style={{ width: 16, height: 16, borderRadius: 5, background: "var(--ds-blue)", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Check size={11} strokeWidth={3} />
                    </span>
                    {comp?.name || id}
                  </button>
                );
              })}
              <AjoutCompetence
                disponibles={competences.filter((c) => !idsNotes.includes(c.id))}
                onAjouter={(comp) => ajouterCritere(comp)}
              />
            </div>
            <div style={{ fontSize: 13, color: "var(--ds-ink-3)", display: "flex", gap: 6, alignItems: "baseline", flexWrap: "wrap" }}>
              <span>{k("mainSkill")}</span>
              <TexteEditable
                valeur={local.skill_assessed || ""}
                vide={t("dashboard.experienceEditor.skillAssessedHint")}
                onChange={(v) => set("skill_assessed", v)}
                style={{ fontWeight: 500, color: "var(--ds-ink)" }}
                uneLigne
              />
            </div>
          </Panneau>

          <Panneau id="ds-criteres" titre={k("criteriaTitle")} sousTitre={k("criteriaHelp")} compte={criteria.length} lignes={false} styleCorps={{ padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
            {!criteria.length && <p className="ds-sub" style={{ padding: "4px 4px 0" }}>{k("noCriteria")}</p>}
            {criteria.map((c, ci) => (
              <CarteCritere
                key={ci}
                ancre={`critere-${ci}`}
                ouvert={ouverts.includes(ci)}
                onToggle={() => setOuverts((o) => (o.includes(ci) ? o.filter((x) => x !== ci) : [...o, ci]))}
                critere={c}
                description={(descriptions || []).find((d) => d.name === (c.name || "") && d.texte)?.texte || ""}
                descriptionEnCours={descriptionsEnCours}
                skillsEtape={local.config?.skills_tested || []}
                competences={competences}
                onChange={(transform) => majCritere(ci, transform)}
                onRemove={() => {
                  // Les index se décalent : on referme tout plutôt que d'ouvrir le mauvais.
                  setOuverts([]);
                  maj((p) => ({ ...p, criteria: (p.criteria || []).filter((_, i) => i !== ci) }));
                }}
              />
            ))}
            <button type="button" className="ds-add" onClick={() => ajouterCritere()} style={{ borderRadius: 10 }}>
              <Plus size={15} strokeWidth={2.2} /> {k("addSubSkill")}
            </button>
          </Panneau>
        </>
      )}

      {/* Ce que l'IA sait pour noter — replié, ce n'est pas une seconde grille. */}
      {aUnCorrige(local) && <Corrige step={local} setConfig={setConfig} stepId={local.id} toast={toast} />}
    </div>
  );
}

// ─── « + Ajouter une compétence » ────────────────────────────────────────────
// Choisie dans la liste validée de l'offre : elle arrive avec un critère à
// son nom, ouvert, à remplir.
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
      className="ds-select"
      style={{ height: 32, width: "auto", fontSize: 13, borderStyle: "dashed" }}
    >
      <option value="">{t("dashboard.experienceEditor.scoring.pickSkill")}</option>
      {disponibles.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
    </select>
  ) : (
    <button type="button" className="ds-add" onClick={() => setChoix(true)} style={{ height: 32, padding: "0 11px", fontSize: 13 }}>
      <Plus size={14} strokeWidth={2.2} /> {t("dashboard.experienceEditor.scoring.addSkill")}
    </button>
  );
}

// ─── Un critère d'évaluation (une sous-compétence) ───────────────────────────
// Fermé : son nom, les compétences qu'il juge, son nombre de points de
// contrôle. Ouvert : ce qu'il évalue (description rédigée par l'IA,
// lib/descriptionsCriteres.js) et ses points numérotés — un clic sur un point
// l'ouvre à l'édition. ✎ ouvre le câblage : renommer, changer les compétences
// notées, supprimer.
function CarteCritere({ ancre, ouvert, onToggle, critere: c, description, descriptionEnCours, skillsEtape, competences, onChange, onRemove }) {
  const { t } = useI18n();
  const k = (cle, vars) => t(`dashboard.experienceEditor.scoring.${cle}`, vars);
  const aCheckpoints = Array.isArray(c.checkpoints);
  const nbPoints = aCheckpoints ? c.checkpoints.length : 0;
  const [cablage, setCablage] = useState(false);
  const ids = c.skill_ids?.length ? c.skill_ids : skillsEtape;
  const majCheckpoints = (f) => onChange((x) => ({ ...x, checkpoints: f([...(x.checkpoints || [])]) }));
  const libelleCablage = cablage ? t("dashboard.experienceEditor.recit.done") : t("dashboard.experienceEditor.recit.edit");

  return (
    <div id={ancre} style={{ borderRadius: 10, border: "1px solid var(--ds-line)", background: "#FFFFFF", overflow: "hidden", minWidth: 0, overflowWrap: "anywhere", scrollMarginTop: 16 }}>
      {/* En-tête : le critère, et les compétences qu'il juge. */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={ouvert}
        className="ds-critere-tete"
        style={{
          width: "100%", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, padding: "12px 14px",
          border: 0, background: "transparent", font: "inherit", color: "var(--ds-ink)", textAlign: "left", cursor: "pointer",
        }}
      >
        <ChevronRight size={15} strokeWidth={2} style={{ flex: "none", color: "var(--ds-ink-3)", transition: "transform .15s", transform: ouvert ? "rotate(90deg)" : "none" }} />
        <span style={{ flex: "1 1 280px", display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
          <span style={{ fontWeight: 500 }}>{c.name || "—"}</span>
          <span style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 5, fontSize: 12, color: "var(--ds-ink-3)" }}>
            {k("judges")}
            {ids.length ? ids.map((id) => {
              const comp = competences.find((x) => x.id === id);
              return (
                <span key={id} style={{ height: 22, display: "inline-flex", alignItems: "center", padding: "0 7px", borderRadius: 6, border: "1px solid var(--ds-line)", background: "var(--ds-soft)", color: comp ? "var(--ds-ink-2)" : "var(--ds-amber-ink)" }}>
                  {comp?.name || id}
                </span>
              );
            }) : <span style={{ color: "var(--ds-amber-ink)" }}>{t("dashboard.experienceEditor.noSkill")}</span>}
          </span>
        </span>
        {aCheckpoints && <span style={{ fontSize: 12, color: "var(--ds-ink-3)", whiteSpace: "nowrap" }}>{k("checkpointsCount", { count: nbPoints })}</span>}
      </button>

      {ouvert && (
        <div style={{ padding: "0 14px 12px 41px", display: "flex", flexDirection: "column", gap: 8 }}>
          {/* Câblage et description */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              {cablage && (
                <>
                  <input
                    value={c.name || ""}
                    onChange={(e) => onChange((x) => ({ ...x, name: e.target.value }))}
                    placeholder={t("dashboard.experienceEditor.subDimensionName")}
                    aria-label={t("dashboard.experienceEditor.subDimensionName")}
                    className="ds-input"
                    style={{ fontWeight: 500 }}
                  />
                  <SkillPicker ids={c.skill_ids || []} competences={competences} onChange={(v) => onChange((x) => ({ ...x, skill_ids: v }))} />
                </>
              )}
              {description ? (
                <p className="ds-sub" style={{ lineHeight: 1.6 }}>{description}</p>
              ) : descriptionEnCours ? (
                <p className="ds-sub bloc-etape-attente">{k("describing")}</p>
              ) : null}
              {c.added_for_coverage && (
                <p style={{ fontSize: 12, color: "var(--ds-blue)", margin: 0 }}>
                  {t("dashboard.experienceEditor.addedForCoverage", {
                    skill: competences.find((x) => x.id === c.added_for_coverage)?.name || c.added_for_coverage,
                  })}
                </p>
              )}
            </div>
            {cablage && (
              <button type="button" className="ds-icon-btn is-danger" onClick={onRemove} aria-label={t("dashboard.experienceEditor.stepPage.delete")} title={t("dashboard.experienceEditor.stepPage.delete")}>
                <Trash2 size={14} />
              </button>
            )}
            <button
              type="button"
              className="ds-icon-btn"
              onClick={() => setCablage((v) => !v)}
              aria-label={libelleCablage}
              title={libelleCablage}
              style={cablage ? { background: "var(--ds-blue-10)", color: "var(--ds-blue)" } : undefined}
            >
              {cablage ? <Check size={15} strokeWidth={2.2} /> : <Pencil size={14} strokeWidth={1.8} />}
            </button>
          </div>

          {/* Les points de contrôle */}
          {aCheckpoints ? (
            <>
              <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column" }}>
                {c.checkpoints.map((cp, ki) => (
                  <li key={cp.id || ki} className="checkpoint-ligne" style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "9px 0", borderTop: ki ? "1px solid var(--ds-line-3)" : 0 }}>
                    <span className="ds-mono" style={{ fontSize: 11, color: "var(--ds-blue)", paddingTop: 2, flex: "none" }}>{String(ki + 1).padStart(2, "0")}</span>
                    <TexteEditable
                      valeur={cp.description || ""}
                      vide={t("dashboard.experienceEditor.checkpointPlaceholder")}
                      onChange={(v) => majCheckpoints((cps) => cps.map((x, i) => (i === ki ? { ...x, description: v } : x)))}
                      style={{ flex: 1, color: "var(--ds-ink-2)", lineHeight: 1.5 }}
                    />
                    <span className="checkpoint-actions" style={{ display: "inline-flex" }}>
                      <button type="button" className="ds-icon-btn is-danger" style={{ width: 26, height: 26 }} onClick={() => majCheckpoints((cps) => cps.filter((_, i) => i !== ki))} aria-label={t("dashboard.experienceEditor.stepPage.delete")}>
                        <X size={13} />
                      </button>
                    </span>
                  </li>
                ))}
              </ol>
              {c.checkpoints.length < CHECKPOINTS_MAX && (
                <button type="button" className="ds-link" onClick={() => majCheckpoints((cps) => [...cps, { id: nouvelIdCheckpoint(cps), description: "" }])} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <Plus size={13} /> {t("dashboard.experienceEditor.addCheckpoint")}
                </button>
              )}
            </>
          ) : (
            <div>
              <p className="ds-sub" style={{ fontStyle: "italic", margin: "0 0 6px", fontSize: 12 }}>
                {t("dashboard.experienceEditor.legacyGrid")}
              </p>
              {(c.bars_levels || []).map((b, li) => (
                <div key={li} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 4 }}>
                  <span className="ds-mono" style={{ fontSize: 11, color: "var(--ds-ink-3)", width: 70, flexShrink: 0, paddingTop: 9 }}>N{b.level} {b.label}</span>
                  <AutoTextarea
                    value={b.description || ""}
                    onChange={(e) => onChange((x) => ({
                      ...x,
                      bars_levels: (x.bars_levels || []).map((l, i) => (i === li ? { ...l, description: e.target.value } : l)),
                    }))}
                    rows={2}
                    style={{ ...inputStyle, marginBottom: 0, fontSize: 13 }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
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
        style={{ ...inputStyle, marginBottom: 0, padding: "3px 8px", fontSize: 13, width: "auto", minWidth: 260, ...style }}
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
      style={{ cursor: "text", borderRadius: 6, ...style, ...(valeur.trim() ? {} : { fontStyle: "italic", color: "var(--ds-ink-4)" }) }}
    >
      {valeur.trim() || vide}
    </span>
  );
}

// Libellé de chaque importance (POIDS_ETAPE, lib/competences.js).
const CLES_IMPORTANCE = { 0.5: "low", 1: "normal", 1.5: "high", 2: "veryHigh" };
