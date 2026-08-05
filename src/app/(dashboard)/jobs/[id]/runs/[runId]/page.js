"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Loader2, ArrowLeft, CheckCircle2, AlertTriangle, Bot, Quote } from "lucide-react";
import { getRunReport } from "@/lib/actions/experience";

const BARS_LABEL = { 1: "Insuffisant", 2: "En deçà", 3: "Attendu", 4: "Solide", 5: "Excellent" };

function scoreColor(score) {
  if (score == null) return { bg: "#f1f5f9", fg: "#64748b" };
  if (score >= 75) return { bg: "#dcfce7", fg: "#166534" };
  if (score >= 50) return { bg: "#fef9c3", fg: "#854d0e" };
  return { bg: "#fee2e2", fg: "#991b1b" };
}

export default function RunReportPage() {
  const { id: jobId, runId } = useParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await getRunReport(runId);
      if (!res.success) setError(res.error);
      else setData(res);
      setLoading(false);
    })();
  }, [runId]);

  if (loading) {
    return (
      <Center>
        <Loader2 size={30} style={{ color: "var(--primary)", animation: "spin 1s linear infinite" }} />
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 12 }}>Analyse de la trajectoire du candidat…</p>
      </Center>
    );
  }
  if (error) return <Center><p style={{ color: "#991b1b", fontSize: 14 }}>{error}</p></Center>;

  const { candidate, jobTitle, scores, steps, responses } = data;
  const stepById = Object.fromEntries(steps.map((s) => [s.id, s]));
  const respByStep = Object.fromEntries(responses.map((r) => [r.step_id, r]));

  // Critères groupés par step, dans l'ordre des steps
  const critByStep = {};
  for (const c of scores?.criterion_scores || []) { (critByStep[c.step_id] ||= []).push(c); }
  const oc = scoreColor(scores?.overall);

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "2rem 1.5rem" }}>
      <Link href={`/jobs/${jobId}`} className="btn btn-ghost btn-sm" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: "1rem" }}>
        <ArrowLeft size={15} /> Retour à l'offre
      </Link>

      {/* En-tête + score global */}
      <div className="card" style={{ padding: "1.75rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1.5rem", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>{candidate.name || "Candidat"}</h1>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 2 }}>{candidate.email}{jobTitle ? ` · ${jobTitle}` : ""}</p>
          {scores?.summary && <p style={{ fontSize: 14, lineHeight: 1.6, marginTop: "1rem", maxWidth: 560 }}>{scores.summary}</p>}
        </div>
        <div style={{ textAlign: "center", flexShrink: 0 }}>
          <div style={{ width: 92, height: 92, borderRadius: "50%", background: oc.bg, color: oc.fg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 30, fontWeight: 800, lineHeight: 1 }}>{scores?.overall ?? "—"}</span>
            <span style={{ fontSize: 10, opacity: 0.8 }}>/ 100</span>
          </div>
          <p style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 6 }}>Score global</p>
        </div>
      </div>

      {/* Usage de l'IA (distinct du score métier) */}
      {scores?.ai_usage_used && (
        <div className="card" style={{ padding: "1.25rem 1.5rem", marginBottom: "1.5rem", borderLeft: "3px solid #3b82f6" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Bot size={18} style={{ color: "#3b82f6" }} />
            <strong style={{ fontSize: 14 }}>Usage de l'assistant IA</strong>
            {scores.ai_usage_score != null && (
              <span style={{ marginLeft: "auto", fontSize: 20, fontWeight: 800, color: scoreColor(scores.ai_usage_score).fg }}>{scores.ai_usage_score}<span style={{ fontSize: 11, opacity: 0.7 }}>/100</span></span>
            )}
          </div>
          <p style={{ fontSize: 12.5, color: "var(--muted-foreground)", marginTop: 8 }}>Mesure <em>comment</em> le candidat a piloté l'IA (cadrage, itération, regard critique) — pas s'il l'a utilisée.</p>
        </div>
      )}

      {/* Preuves par critère, groupées par étape */}
      <h2 style={{ fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--muted-foreground)", marginBottom: "0.75rem" }}>Preuves par critère</h2>

      {steps.filter((s) => critByStep[s.id]?.length).map((s) => (
        <div key={s.id} style={{ marginBottom: "1.5rem" }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: "0.6rem" }}>{s.title || s.kind}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {critByStep[s.id].map((c, i) => {
              const cc = scoreColor(c.score);
              return (
                <div key={i} className="card" style={{ padding: "1.1rem 1.25rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                    <strong style={{ fontSize: 14 }}>{c.criterion_name}</strong>
                    <span style={{ flexShrink: 0, background: cc.bg, color: cc.fg, borderRadius: 99, padding: "3px 11px", fontSize: 12, fontWeight: 700 }}>
                      N{c.bars_level} · {BARS_LABEL[c.bars_level] || ""} · {c.score}/100
                    </span>
                  </div>
                  {c.justification && <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--foreground)", marginTop: 8 }}>{c.justification}</p>}
                  {c.verbatim && (
                    <div style={{ display: "flex", gap: 8, marginTop: 10, padding: "8px 12px", background: "#f8fafc", borderRadius: 8, borderLeft: "3px solid var(--border)" }}>
                      <Quote size={14} style={{ color: "var(--muted-foreground)", flexShrink: 0, marginTop: 3 }} />
                      <div>
                        <p style={{ fontSize: 13, fontStyle: "italic", color: "var(--foreground)", lineHeight: 1.5 }}>« {c.verbatim} »</p>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, marginTop: 4, color: c.verbatim_verified ? "#166534" : "#b45309" }}>
                          {c.verbatim_verified ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                          {c.verbatim_verified ? "Extrait vérifié dans la réponse" : "Extrait non retrouvé tel quel — à vérifier"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {!scores?.criterion_scores?.length && (
        <div className="card" style={{ padding: "2rem", textAlign: "center", color: "var(--muted-foreground)", fontSize: 14 }}>
          Aucun score disponible pour ce run.
        </div>
      )}
    </div>
  );
}

function Center({ children }) {
  return <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", padding: "2rem" }}>{children}</div>;
}
