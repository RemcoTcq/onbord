"use client";

import { useState, useRef, useEffect } from "react";
import { Video, Square, RotateCcw, Loader2, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { saveVideoResponse } from "@/lib/actions/run";

// Composant réutilisable : un step en response_format="video" l'invoque au même
// titre qu'une zone de texte. Enregistre, upload, puis déclenche la transcription
// serveur. Rien de spécifique à un "module vidéo" — c'est un format de réponse.
export default function ResponseRecorder({ token, stepId, maxDuration = 120, existingVideoUrl, onSaved }) {
  const [phase, setPhase] = useState(existingVideoUrl ? "done" : "idle"); // idle | recording | review | uploading | done
  const [error, setError] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [blob, setBlob] = useState(null);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const startRef = useRef(0);
  const timerRef = useRef(null);

  useEffect(() => () => stopStream(), []);

  function stopStream() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
  }

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.muted = true; await videoRef.current.play(); }
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
    } catch (e) {
      setError("Impossible d'accéder à la caméra/au micro. Vérifiez les autorisations.");
    }
  }

  function stopRecording() {
    if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
    if (timerRef.current) clearInterval(timerRef.current);
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
      const { data: urlData } = supabase.storage.from("video-responses").getPublicUrl(path);
      const videoUrl = urlData?.publicUrl;

      const res = await saveVideoResponse(token, stepId, videoUrl, elapsed);
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
        <button className="btn btn-ghost btn-sm" onClick={reset} style={{ marginLeft: "auto" }}>Refaire</button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ background: "#0f172a", borderRadius: "10px", overflow: "hidden", aspectRatio: "16/9", marginBottom: "0.75rem", position: "relative" }}>
        <video ref={videoRef} playsInline controls={phase === "review"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        {phase === "recording" && (
          <div style={{ position: "absolute", top: 10, left: 10, background: "rgba(220,38,38,0.9)", color: "white", padding: "3px 10px", borderRadius: "99px", fontSize: "12px", fontWeight: 700 }}>
            ● {mm(elapsed)} / {mm(maxDuration)}
          </div>
        )}
      </div>
      {error && <p style={{ color: "#991b1b", fontSize: "13px", marginBottom: "0.5rem" }}>{error}</p>}
      <div style={{ display: "flex", gap: "0.5rem" }}>
        {phase === "idle" && <button className="btn btn-primary" onClick={startRecording} style={{ display: "flex", alignItems: "center", gap: "6px" }}><Video size={16} /> Enregistrer</button>}
        {phase === "recording" && <button className="btn btn-outline" onClick={stopRecording} style={{ display: "flex", alignItems: "center", gap: "6px" }}><Square size={16} /> Arrêter</button>}
        {phase === "review" && (
          <>
            <button className="btn btn-primary" onClick={validate} style={{ display: "flex", alignItems: "center", gap: "6px" }}><Check size={16} /> Valider</button>
            <button className="btn btn-ghost" onClick={reset} style={{ display: "flex", alignItems: "center", gap: "6px" }}><RotateCcw size={16} /> Refaire</button>
          </>
        )}
        {phase === "uploading" && <button className="btn btn-primary" disabled style={{ display: "flex", alignItems: "center", gap: "6px" }}><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Envoi…</button>}
      </div>
    </div>
  );
}
