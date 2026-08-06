"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Loader2, Sparkles, ChevronUp, ChevronDown, Trash2, Plus, Check,
  ArrowLeft, Bot, Video, Type, ListChecks, Code2, CircleHelp, ClipboardList,
} from "lucide-react";
import {
  getExperienceForJob, generateExperience, updateStep,
  addStep, deleteStep, moveStep, publishExperience,
  updateExperienceMessages,
} from "@/lib/actions/experience";
import { useToast } from "@/components/ui/Toast";

const RESPONSE_FORMATS = [
  { value: "text", label: "Texte", icon: Type },
  { value: "video", label: "Vidéo (mise en situation)", icon: Video },
  { value: "qcm", label: "QCM", icon: ListChecks },
  { value: "choice", label: "Choix (oui/non)", icon: CircleHelp },
  { value: "code", label: "Code (sandbox)", icon: Code2 },
];
const SANDBOX_KINDS = [
  { value: "none", label: "Aucun" },
  { value: "email", label: "📧  Email" },
  { value: "client_reply", label: "💬  Réponse client" },
  { value: "document", label: "📄  Document" },
  { value: "code", label: "💻  Code" },
];
const KIND_LABELS = {
  qualifying: "Qualificative",
  question: "Question ciblée",
  task: "Tâche",
  classic_qcm: "QCM",
};

export default function ExperienceReviewPage() {
  const { id: jobId } = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genStep, setGenStep] = useState(0);
  const [publishing, setPublishing] = useState(false);
  const [experience, setExperience] = useState(null);
  const [steps, setSteps] = useState([]);

  useEffect(() => { load(); }, [jobId]);

  async function load() {
    setLoading(true);
    const res = await getExperienceForJob(jobId);
    if (res.success) {
      setExperience(res.experience);
      setSteps(res.steps || []);
    } else {
      toast(res.error || "Erreur de chargement", "error");
    }
    setLoading(false);
  }

  async function handleGenerate() {
    setGenerating(true);
    setGenStep(0);
    
    const interval = setInterval(() => {
      setGenStep(prev => prev < 4 ? prev + 1 : prev);
    }, 2500);

    const res = await generateExperience(jobId);
    
    clearInterval(interval);
    setGenStep(5); // Marquer toutes les étapes comme finies
    
    if (res.success) {
      toast("Expérience générée — à relire avant publication");
      await load();
    } else {
      toast(res.error || "Échec de la génération", "error");
    }
    setGenerating(false);
    setGenStep(0);
  }

  async function handlePublish() {
    setPublishing(true);
    const res = await publishExperience(experience.id);
    if (res.success) {
      toast("Expérience publiée — visible par les candidats");
      await load();
    } else {
      toast(res.error || "Échec de la publication", "error");
    }
    setPublishing(false);
  }

  async function handleAddStep() {
    const res = await addStep(experience.id);
    if (res.success) { await load(); } else { toast(res.error || "Erreur", "error"); }
  }

  async function handleMove(stepId, direction) {
    const res = await moveStep(stepId, direction);
    if (res.success) { await load(); } else { toast(res.error || "Erreur", "error"); }
  }

  async function handleDelete(stepId) {
    if (!confirm("Supprimer cette étape ?")) return;
    const res = await deleteStep(stepId);
    if (res.success) { await load(); } else { toast(res.error || "Erreur", "error"); }
  }

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "5rem" }}>
        <Loader2 size={28} style={{ color: "var(--primary)", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "820px", margin: "0 auto", paddingBottom: "4rem" }}>
      <button className="btn btn-ghost btn-sm" onClick={() => router.push(`/jobs/${jobId}`)} style={{ marginBottom: "1rem", display: "flex", alignItems: "center", gap: "6px" }}>
        <ArrowLeft size={16} /> Retour à l'offre
      </button>

      {/* Aucune expérience → génération */}
      {!experience && (
        <div className="card" style={{ padding: "2.5rem", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
          {!generating ? (
            <>
              <Sparkles size={32} style={{ color: "var(--primary)", marginBottom: "1rem" }} />
              <h2 style={{ fontSize: "1.25rem", fontWeight: 800, marginBottom: "0.5rem" }}>Générer l'expérience de présélection</h2>
              <p style={{ color: "var(--muted-foreground)", fontSize: "14px", maxWidth: "460px", margin: "0 auto 1.5rem" }}>
                L'IA construit un parcours court (5–20 min) à partir de l'offre et du contexte de votre entreprise.
                Vous relisez et validez chaque étape avant qu'un candidat ne la voie.
              </p>
              <button className="btn btn-primary" onClick={handleGenerate} style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                <Sparkles size={16} /> Générer avec l'IA
              </button>
            </>
          ) : (
            <div style={{ width: "100%", maxWidth: "400px", margin: "0 auto", textAlign: "left" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "2rem", justifyContent: "center" }}>
                <div style={{ padding: "12px", background: "#f0fdf4", borderRadius: "50%", color: "#166534", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Sparkles size={24} style={{ animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" }} />
                </div>
                <div>
                  <h3 style={{ fontSize: "15px", fontWeight: "700", margin: 0 }}>L'IA travaille…</h3>
                  <p style={{ fontSize: "12px", color: "var(--muted-foreground)", margin: "4px 0 0" }}>Génération en cours (~15-20s)</p>
                </div>
              </div>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {[
                  "Analyse de l'offre d'emploi…",
                  "Identification des compétences clés…",
                  "Construction des mises en situation…",
                  "Calibrage des critères BARS…",
                  "Finalisation de l'expérience…"
                ].map((text, i) => {
                  const isActive = genStep === i;
                  const isDone = genStep > i;
                  return (
                    <div key={i} style={{ 
                      display: "flex", alignItems: "center", gap: "12px", 
                      opacity: isDone || isActive ? 1 : 0.4,
                      transition: "opacity 0.3s ease" 
                    }}>
                      <div style={{ 
                        width: "24px", height: "24px", borderRadius: "50%", 
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: isDone ? "#dcfce7" : isActive ? "var(--primary)" : "var(--secondary)",
                        color: isDone ? "#166534" : isActive ? "white" : "var(--muted-foreground)"
                      }}>
                        {isDone ? <Check size={14} /> : isActive ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <span style={{ fontSize: "11px", fontWeight: 700 }}>{i + 1}</span>}
                      </div>
                      <span style={{ fontSize: "14px", fontWeight: isActive ? 600 : 500, color: isActive ? "var(--foreground)" : "var(--muted-foreground)" }}>
                        {text}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {experience && (
        <>
          {/* En-tête + gate de publication */}
          <div className="card" style={{ padding: "1.25rem 1.5rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
            <div>
              <h1 style={{ fontSize: "1.15rem", fontWeight: 800, display: "flex", alignItems: "center", gap: "8px" }}>
                <ClipboardList size={18} style={{ color: "var(--primary)" }} /> Relecture de l'expérience
              </h1>
              <p style={{ fontSize: "13px", color: "var(--muted-foreground)", marginTop: "4px" }}>
                {steps.length} étape{steps.length > 1 ? "s" : ""}
                {experience.estimated_minutes ? ` · ~${experience.estimated_minutes} min` : ""}
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <StatusBadge status={experience.status} />
              {experience.status !== "published" ? (
                <button className="btn btn-primary btn-sm" onClick={handlePublish} disabled={publishing} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  {publishing ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Check size={14} />}
                  Publier
                </button>
              ) : (
                <button className="btn btn-outline btn-sm" onClick={handleGenerate} disabled={generating}>
                  Regénérer
                </button>
              )}
            </div>
          </div>

          {experience.status === "published" && (
            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", borderRadius: "10px", padding: "10px 14px", fontSize: "13px", marginBottom: "1.5rem" }}>
              ✓ Publiée — les candidats voient cette version. Toute modification sera visible immédiatement.
            </div>
          )}

          {experience.locked_at && (
            <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", color: "#c2410c", borderRadius: "10px", padding: "10px 14px", fontSize: "13px", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "8px" }}>
              ⚠️ Au moins un candidat a déjà commencé cette expérience. Vos modifications seront prises en compte pour les <strong>prochains</strong> candidats uniquement.
            </div>
          )}

          {/* Messages candidat (accueil + remerciement) */}
          <MessagesCard experience={experience} toast={toast} />

          {/* Steps */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {steps.map((step, i) => (
              <StepCard
                key={step.id}
                step={step}
                index={i}
                total={steps.length}
                onMove={handleMove}
                onDelete={handleDelete}
                toast={toast}
              />
            ))}
          </div>

          <button className="btn btn-outline" onClick={handleAddStep} style={{ marginTop: "1.5rem", display: "flex", alignItems: "center", gap: "6px" }}>
            <Plus size={16} /> Ajouter une étape
          </button>
        </>
      )}
    </div>
  );
}

// Messages paramétrables affichés au candidat : accueil (avant la 1re étape)
// et remerciement (page de fin). Vides = messages par défaut côté candidat.
function MessagesCard({ experience, toast }) {
  const [welcome, setWelcome] = useState(experience.welcome_message || "");
  const [thanks, setThanks] = useState(experience.thank_you_message || "");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setWelcome(experience.welcome_message || "");
    setThanks(experience.thank_you_message || "");
    setDirty(false);
  }, [experience.id, experience.welcome_message, experience.thank_you_message]);

  async function save() {
    setSaving(true);
    const res = await updateExperienceMessages(experience.id, {
      welcome_message: welcome.trim() || null,
      thank_you_message: thanks.trim() || null,
    });
    if (res.success) { setDirty(false); toast("Messages enregistrés"); }
    else { toast(res.error || "Erreur", "error"); }
    setSaving(false);
  }

  return (
    <div className="card" style={{ padding: "1.25rem 1.5rem", marginBottom: "1.5rem", borderLeft: dirty ? "3px solid var(--primary)" : "3px solid transparent" }}>
      <h2 style={{ fontSize: "0.95rem", fontWeight: 800, marginBottom: "0.25rem" }}>Messages candidat</h2>
      <p style={{ fontSize: "12px", color: "var(--muted-foreground)", marginBottom: "1rem" }}>
        Personnalisez l'accueil (avant la 1re étape) et le remerciement (page de fin). Laissez vide pour utiliser un texte par défaut.
      </p>

      <label style={labelStyle}>Message d'accueil (invitation à démarrer)</label>
      <textarea value={welcome} onChange={(e) => { setWelcome(e.target.value); setDirty(true); }} rows={3}
        placeholder="Bienvenue ! Voici une courte mise en situation…"
        style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }} />

      <label style={labelStyle}>Message de remerciement (fin du parcours)</label>
      <textarea value={thanks} onChange={(e) => { setThanks(e.target.value); setDirty(true); }} rows={3}
        placeholder="Merci d'avoir pris le temps ! Nous revenons vers vous rapidement."
        style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }} />

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.75rem" }}>
        <button className="btn btn-primary btn-sm" onClick={save} disabled={!dirty || saving} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {saving ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Check size={14} />}
          {dirty ? "Enregistrer" : "Enregistré"}
        </button>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    draft: { label: "Brouillon", bg: "#f1f5f9", color: "#475569" },
    pending_review: { label: "À valider", bg: "#fef3c7", color: "#92400e" },
    published: { label: "Publiée", bg: "#dcfce7", color: "#166534" },
    archived: { label: "Archivée", bg: "#f1f5f9", color: "#94a3b8" },
  };
  const s = map[status] || map.draft;
  return (
    <span style={{ fontSize: "11px", fontWeight: 700, padding: "4px 10px", borderRadius: "99px", background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

function StepCard({ step, index, total, onMove, onDelete, toast }) {
  const [local, setLocal] = useState(step);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => { setLocal(step); setDirty(false); }, [step.id, step.updated_at]);

  function set(field, value) { setLocal((p) => ({ ...p, [field]: value })); setDirty(true); }

  function setCriterion(ci, field, value) {
    setLocal((p) => {
      const criteria = [...(p.criteria || [])];
      criteria[ci] = { ...criteria[ci], [field]: value };
      return { ...p, criteria };
    });
    setDirty(true);
  }
  function setLevel(ci, li, value) {
    setLocal((p) => {
      const criteria = [...(p.criteria || [])];
      const levels = [...(criteria[ci].bars_levels || [])];
      levels[li] = { ...levels[li], description: value };
      criteria[ci] = { ...criteria[ci], bars_levels: levels };
      return { ...p, criteria };
    });
    setDirty(true);
  }
  function addCriterion() {
    setLocal((p) => ({
      ...p,
      criteria: [...(p.criteria || []), {
        name: "Nouveau critère",
        bars_levels: [
          { level: 1, label: "Insuffisant", description: "" },
          { level: 3, label: "Attendu", description: "" },
          { level: 5, label: "Excellent", description: "" },
        ],
      }],
    }));
    setDirty(true);
  }
  function removeCriterion(ci) {
    setLocal((p) => ({ ...p, criteria: (p.criteria || []).filter((_, i) => i !== ci) }));
    setDirty(true);
  }

  async function save() {
    setSaving(true);
    const res = await updateStep(step.id, {
      title: local.title, prompt: local.prompt,
      response_format: local.response_format, sandbox_kind: local.sandbox_kind,
      ai_assistant_allowed: local.ai_assistant_allowed, criteria: local.criteria,
      config: local.config,
    });
    if (res.success) { setDirty(false); toast("Étape enregistrée"); }
    else { toast(res.error || "Erreur", "error"); }
    setSaving(false);
  }

  const isQualifying = local.kind === "qualifying";
  const isQcm = local.kind === "classic_qcm";

  return (
    <div className="card" style={{ padding: "1.25rem 1.5rem", borderLeft: dirty ? "3px solid var(--primary)" : "3px solid transparent" }}>
      {/* Barre du haut */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "12px", fontWeight: 800, color: "var(--muted-foreground)" }}>#{index + 1}</span>
          <span style={{ fontSize: "11px", fontWeight: 700, padding: "3px 9px", borderRadius: "99px", background: "var(--secondary)", color: "var(--foreground)" }}>
            {KIND_LABELS[local.kind] || local.kind}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <button className="btn btn-ghost btn-sm" disabled={index === 0} onClick={() => onMove(step.id, "up")} style={{ padding: "4px" }}><ChevronUp size={16} /></button>
          <button className="btn btn-ghost btn-sm" disabled={index === total - 1} onClick={() => onMove(step.id, "down")} style={{ padding: "4px" }}><ChevronDown size={16} /></button>
          <button className="btn btn-ghost btn-sm" onClick={() => onDelete(step.id)} style={{ padding: "4px", color: "#dc2626" }}><Trash2 size={15} /></button>
        </div>
      </div>

      {/* Titre */}
      <input
        value={local.title || ""}
        onChange={(e) => set("title", e.target.value)}
        placeholder="Titre de l'étape"
        style={inputStyle}
      />

      {/* Énoncé */}
      <label style={labelStyle}>Énoncé lu au candidat</label>
      <textarea
        value={local.prompt || ""}
        onChange={(e) => set("prompt", e.target.value)}
        rows={4}
        placeholder="Consigne / mise en situation"
        style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
      />

      {/* Format + sandbox + assistant */}
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginTop: "0.75rem" }}>
        <div style={{ flex: "1 1 200px" }}>
          <label style={labelStyle}>Format de réponse</label>
          <select value={local.response_format} onChange={(e) => set("response_format", e.target.value)} style={selectStyle}>
            {RESPONSE_FORMATS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </div>
        <div style={{ flex: "1 1 160px" }}>
          <label style={labelStyle}>Sandbox</label>
          <select value={local.sandbox_kind || "none"} onChange={(e) => set("sandbox_kind", e.target.value)} style={selectStyle}>
            {SANDBOX_KINDS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: "2px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
            <input type="checkbox" checked={!!local.ai_assistant_allowed} onChange={(e) => set("ai_assistant_allowed", e.target.checked)} />
            <Bot size={15} style={{ color: local.ai_assistant_allowed ? "var(--primary)" : "var(--muted-foreground)" }} />
            Assistant IA
          </label>
        </div>
      </div>

      {/* Critères BARS (non qualifying, non QCM) */}
      {!isQualifying && !isQcm && (
        <div style={{ marginTop: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
            <label style={{ ...labelStyle, margin: 0 }}>Critères d'évaluation (BARS)</label>
            <button className="btn btn-ghost btn-sm" onClick={addCriterion} style={{ fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }}>
              <Plus size={13} /> Critère
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {(local.criteria || []).map((c, ci) => (
              <div key={ci} style={{ border: "1px solid var(--border)", borderRadius: "8px", padding: "0.75rem" }}>
                <div style={{ display: "flex", gap: "8px", marginBottom: "0.5rem" }}>
                  <input value={c.name || ""} onChange={(e) => setCriterion(ci, "name", e.target.value)} placeholder="Nom du critère" style={{ ...inputStyle, fontWeight: 700, marginBottom: 0 }} />
                  <button className="btn btn-ghost btn-sm" onClick={() => removeCriterion(ci)} style={{ padding: "4px", color: "#dc2626" }}><Trash2 size={14} /></button>
                </div>
                {(c.bars_levels || []).map((b, li) => (
                  <div key={li} style={{ display: "flex", gap: "8px", alignItems: "flex-start", marginBottom: "4px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted-foreground)", width: "70px", flexShrink: 0, paddingTop: "8px" }}>N{b.level} {b.label}</span>
                    <textarea value={b.description || ""} onChange={(e) => setLevel(ci, li, e.target.value)} rows={2} style={{ ...inputStyle, marginBottom: 0, fontSize: "12px", resize: "vertical" }} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* QCM Editor */}
      {isQcm && (
        <div style={{ marginTop: "1.25rem" }}>
          <label style={{ ...labelStyle, margin: "0 0 0.5rem" }}>Options QCM</label>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {(local.config?.options || []).map((opt, oi) => (
              <div key={oi} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", flexShrink: 0 }} title="Bonne réponse">
                  <input
                    type="radio"
                    name={`qcm-correct-${step.id}`}
                    checked={local.config?.correct_index === oi}
                    onChange={() => {
                      setLocal((p) => ({ ...p, config: { ...p.config, correct_index: oi } }));
                      setDirty(true);
                    }}
                    style={{ accentColor: "var(--primary)", width: "16px", height: "16px" }}
                  />
                  <span style={{ fontSize: "11px", fontWeight: 700, color: local.config?.correct_index === oi ? "#166534" : "var(--muted-foreground)" }}>
                    {local.config?.correct_index === oi ? "✓" : ""}
                  </span>
                </label>
                <input
                  value={opt}
                  onChange={(e) => {
                    const newOpts = [...(local.config?.options || [])];
                    newOpts[oi] = e.target.value;
                    setLocal((p) => ({ ...p, config: { ...p.config, options: newOpts } }));
                    setDirty(true);
                  }}
                  placeholder={`Option ${oi + 1}`}
                  style={{ ...inputStyle, marginBottom: 0 }}
                />
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    const newOpts = (local.config?.options || []).filter((_, i) => i !== oi);
                    let newCorrect = local.config?.correct_index;
                    if (newCorrect === oi) newCorrect = 0;
                    else if (newCorrect > oi) newCorrect--;
                    setLocal((p) => ({ ...p, config: { ...p.config, options: newOpts, correct_index: newCorrect } }));
                    setDirty(true);
                  }}
                  style={{ padding: "4px", color: "#dc2626" }}
                ><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              const newOpts = [...(local.config?.options || []), ""];
              setLocal((p) => ({ ...p, config: { ...p.config, options: newOpts } }));
              setDirty(true);
            }}
            style={{ fontSize: "12px", display: "flex", alignItems: "center", gap: "4px", marginTop: "0.5rem" }}
          >
            <Plus size={13} /> Ajouter une option
          </button>
          <p style={{ fontSize: "11px", color: "var(--muted-foreground)", marginTop: "0.5rem" }}>
            Sélectionnez la bonne réponse avec le bouton radio. Le candidat sera noté automatiquement (correct/incorrect).
          </p>
        </div>
      )}

      {/* Enregistrer */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
        <button className="btn btn-primary btn-sm" onClick={save} disabled={!dirty || saving} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {saving ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Check size={14} />}
          {dirty ? "Enregistrer" : "Enregistré"}
        </button>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid var(--border)",
  fontSize: "14px", fontFamily: "inherit", background: "var(--background)", color: "var(--foreground)", marginBottom: "2px",
};
const selectStyle = {
  ...inputStyle,
  appearance: "none",
  WebkitAppearance: "none",
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 10px center",
  paddingRight: "32px",
  cursor: "pointer",
};
const labelStyle = {
  display: "block", fontSize: "11px", fontWeight: 700, textTransform: "uppercase",
  letterSpacing: "0.05em", color: "var(--muted-foreground)", margin: "0.5rem 0 4px",
};
