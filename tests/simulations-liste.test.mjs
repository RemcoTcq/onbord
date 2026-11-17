// La liste des simulations (17/11/2026) : les colonnes de /simulations, lib/simulationsListe.js.
import test from "node:test";
import assert from "node:assert/strict";
import { versionsCourantes, etatSimulation, passagesOffre, passagesModule } from "../src/lib/simulationsListe.js";

test("simulations : la version courante est la plus récente non archivée", () => {
  const v = versionsCourantes([
    { job_id: "j1", status: "published", created_at: "2026-11-01" },
    { job_id: "j1", status: "archived", created_at: "2026-11-10" },
    { job_id: "j1", status: "pending_review", created_at: "2026-11-05" },
    { job_id: "j2", status: "archived", created_at: "2026-11-02" },
  ], "job_id");
  assert.equal(v.get("j1").status, "pending_review");
  assert.equal(v.has("j2"), false, "une simulation toute archivée n'a pas de version courante");
});

test("simulations : l'état dit d'abord ce qui empêche de la passer", () => {
  assert.equal(etatSimulation({ usage: "hiring", statutOffre: "active", experience: null }), "toBuild");
  assert.equal(etatSimulation({ usage: "hiring", statutOffre: "closed", experience: { status: "published" } }), "jobClosed");
  assert.equal(etatSimulation({ usage: "hiring", statutOffre: "draft", experience: { status: "published" } }), "jobDraft");
  assert.equal(etatSimulation({ usage: "hiring", statutOffre: "active", experience: { status: "published" } }), "published");
  assert.equal(etatSimulation({ usage: "onboarding", experience: { status: "pending_review" } }), "pending_review");
  assert.equal(etatSimulation({ usage: "onboarding", experience: { status: "bizarre" } }), "draft");
});

test("simulations : passages et note moyenne, recrutement et onboarding", () => {
  assert.deepEqual(passagesOffre([
    { score_global: 80 }, { assessment_submitted_at: "2026-11-10", score_global: null }, { score_global: 61 }, {},
  ]), { faits: 3, total: 4, moyenne: 71 });
  assert.deepEqual(passagesOffre([]), { faits: 0, total: 0, moyenne: null });
  assert.deepEqual(passagesModule([
    { status: "validated", best_score: 90 }, { status: "in_progress", best_score: 40 }, { status: "assigned", best_score: null }, { status: "passed", best_score: null },
  ]), { faits: 3, total: 4, moyenne: 65 });
});
