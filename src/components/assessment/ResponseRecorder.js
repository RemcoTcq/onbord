"use client";

import { useState, useRef, useEffect } from "react";
import { Video, Square, RotateCcw, Loader2, Check, Mic } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { saveVideoResponse } from "@/lib/actions/run";
import { primaryBtn, ghostBtn, DEFAULT_PRIMARY } from "./candidateUi";

// Bouton neutre bordé (esprit champ onboarding) pour les actions secondaires.
const outlineBtn = { display: "inline-flex", alignItems: "center", gap: "0.5rem", background: "#fafafa", color: "var(--foreground)", border: "1px solid var(--border)", borderRadius: 8, padding: "0.875rem 1.5rem", fontSize: "1rem", fontWeight: 600, cursor: "pointer" };

// Composant réutilisable : un step en response_format="video" l'invoque au même
// titre qu'une zone de texte. Flux : test caméra/micro (aperçu + niveau sonore,
// confirmation explicite) -> enregistrement -> relecture -> upload -> transcription.
export default function ResponseRecorder({ token, stepId, maxDuration = 120, existingVideoUrl, onSaved, primary = DEFAULT_PRIMARY }) {
  const [phase, setPhase] = useState(existingVideoUrl ? "done" : "idle"); // idle | testing | recording | review | uploading | done
  const [error, setError] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [blob, setBlob] = useState(null);
  const [level, setLevel] = useState(0); // niveau sonore 0-100 (écran de test)

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const startRef = useRef(0);
  const timerRef = useRef(null);
  const audioCtxRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => () => stopStream(), []);

  function stopMeter() {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (audioCtxRef.current) { audioCtxRef.current.close().catch(() => {}); audioCtxRef.current = null; }
    setLevel(0);
  }

  function stopStream() {
    if (timerRef.current) clearInterval(timerRef.current);
    stopMeter();
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  // Analyse du niveau sonore du micro pour l'indicateur de l'écran de test.
  function startMeter(stream) {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) { const v = (data[i] - 128) / 128; sum += v * v; }
        const rms = Math.sqrt(sum / data.length);
        setLevel(Math.min(100, Math.round(rms * 320)));
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch { /* pas de niveau sonore : non bloquant */ }
  }

  // Étape 1 : ouvre la caméra/le micro pour le test (aperçu live + niveau sonore).
  async function startTest() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.muted = true; await videoRef.current.play(); }
      startMeter(stream);
      setPhase("testing");
    } catch {
      setError("Impossible d'accéder à la caméra/au micro. Vérifiez les autorisations du navigateur.");
    }
  }

  // Étape 2 : le candidat a confirmé que ça fonctionne → enregistrement réel,
  // en réutilisant le flux déjà ouvert pendant le test.
  function beginRecording() {
    setError(null);
    const stream = streamRef.current;
    if (!stream) { startTest(); return; }
    stopMeter(); // on coupe l'indicateur de test, on garde le flux
    if (videoRef.current) videoRef.current.muted = true;
    chunksRef.current = [];
    const rec = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported("video/webm") ? "video/webm" : "" });
    rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    rec.onstop = () => {
      const b = new Blob(chunksRef.current, { type: "video/webm" });
      setBlob(b);
      stopStream();
      if (videoRef.current) { videoRef.current.srcObject = null; videoRef.current.src = URL.createObjectURL(b); videoRef.current.muted = false; }
      setPhase("review");
    };
    recorderRef.current = rec;
    rec.start();
    startRef.current = Date.now();
    setElapsed(0);
    setPhase("recording");
    timerRef.current = setInterval(() => {
      const s = Math.floor((Date.now() - startRef.current) / 1000);
      setElapsed(s);
      if (s >= maxDuration) stopRecording();
    }, 500);
  }

  function stopRecording() {
    if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
    if (timerRef.current) clearInterval(timerRef.current);
  }

  function cancelTest() {
    stopStream();
    if (videoRef.current) { videoRef.current.srcObject = null; videoRef.current.src = ""; }
    setPhase("idle");
  }

  function reset() {
    setBlob(null); setElapsed(0); setPhase("idle");
    if (videoRef.current) videoRef.current.src = "";
  }

  async function validate() {
    if (!blob) return;
    setPhase("uploading");
    setError(null);
    try {
      const supabase = createClient();
      const ext = blob.type.includes("mp4") ? "mp4" : "webm";
      const path = `${token}/${stepId}_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("video-responses").upload(path, blob, { contentType: blob.type, upsert: true });
      if (upErr) throw new Error(upErr.message);
      // Bucket PRIVÉ : on enregistre le chemin de l'objet. Le serveur signe une
      // URL temporaire quand il en a besoin (transcription, rapport recruteur).
      const res = await saveVideoResponse(token, stepId, path, elapsed);
      if (!res.success) throw new Error(res.error);

      // Transcription serveur (fire and forget — l'URL est relue en DB côté serveur)
      fetch("/api/transcribe", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, responseId: res.responseId }),
      });

      setPhase("done");
      onSaved?.();
    } catch (e) {
      setError("Échec de l'envoi : " + e.message);
      setPhase("review");
    }
  }

  const mm = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  if (phase === "done") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#166534", fontSize: "14px", fontWeight: 600 }}>
        <Check size={18} /> Réponse vidéo enregistrée
        <button onClick={reset} style={{ ...ghostBtn, marginLeft: "auto" }}>Refaire</button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ background: "#0f172a", borderRadius: "16px", overflow: "hidden", aspectRatio: "16/9", marginBottom: "0.75rem", position: "relative" }}>
        <video ref={videoRef} playsInline controls={phase === "review"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        {phase === "recording" && (
          <div style={{ position: "absolute", top: 10, left: 10, background: "rgba(220,38,38,0.9)", color: "white", padding: "3px 10px", borderRadius: "99px", fontSize: "12px", fontWeight: 700 }}>
            ● {mm(elapsed)} / {mm(maxDuration)}
          </div>
        )}
        {phase === "testing" && (
          <div style={{ position: "absolute", top: 10, left: 10, background: "rgba(15,23,42,0.75)", color: "white", padding: "3px 10px", borderRadius: "99px", fontSize: "12px", fontWeight: 700 }}>
            Test — aperçu en direct
          </div>
        )}
      </div>

      {/* Écran de test : indicateur de niveau sonore + confirmation explicite */}
      {phase === "testing" && (
        <div style={{ marginBottom: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, fontSize: 13, color: "var(--muted-foreground)" }}>
            <Mic size={15} /> Niveau du micro — parlez pour vérifier que la barre bouge
          </div>
          <div style={{ height: 10, background: "#e2e8f0", borderRadius: 99, overflow: "hidden" }}>
            <div style={{ width: `${level}%`, height: "100%", background: level > 8 ? "#16a34a" : "#94a3b8", transition: "width .1s linear" }} />
          </div>
          <p style={{ fontSize: 13, color: "var(--foreground)", marginTop: 10 }}>
            Vous voyez votre image et la barre de son réagit ? Démarrez l'enregistrement quand vous êtes prêt·e.
          </p>
        </div>
      )}

      {error && <p style={{ color: "#991b1b", fontSize: "13px", marginBottom: "0.5rem" }}>{error}</p>}

      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
        {phase === "idle" && (
          <button onClick={startTest} style={primaryBtn(primary)}>
            <Video size={16} /> Tester caméra &amp; micro
          </button>
        )}
        {phase === "testing" && (
          <>
            <button onClick={beginRecording} style={primaryBtn(primary)}>
              <Video size={16} /> Ça fonctionne — démarrer l'enregistrement
            </button>
            <button onClick={cancelTest} style={ghostBtn}>Annuler</button>
          </>
        )}
        {phase === "recording" && <button onClick={stopRecording} style={outlineBtn}><Square size={16} /> Arrêter</button>}
        {phase === "review" && (
          <>
            <button onClick={validate} style={primaryBtn(primary)}><Check size={16} /> Valider</button>
            <button onClick={reset} style={ghostBtn}><RotateCcw size={16} /> Refaire</button>
          </>
        )}
        {phase === "uploading" && <button disabled style={primaryBtn(primary, true)}><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Envoi…</button>}
      </div>
    </div>
  );
}
