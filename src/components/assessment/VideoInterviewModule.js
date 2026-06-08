"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ArrowLeft, Camera, Mic, CheckCircle2, AlertCircle, Video, Loader2, Play, Square, RefreshCw, ChevronRight, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  createVideoInterviewResponse,
  updateVideoResponseAfterUpload,
  markVideoInterviewCompleted,
} from "@/lib/actions/assessment";

// ─── Setup Screen ─────────────────────────────────────────────────────────────
function SetupScreen({ onReady }) {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);
  const [checking, setChecking] = useState(false);
  const [cameraOk, setCameraOk] = useState(false);
  const [micOk, setMicOk] = useState(false);

  async function startCheck() {
    setChecking(true);
    setError(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStream(s);
      if (videoRef.current) videoRef.current.srcObject = s;
      setCameraOk(true);
      setMicOk(true);
    } catch (err) {
      setError(
        err.name === "NotAllowedError"
          ? "Accès refusé. Autorisez la caméra et le microphone dans les paramètres de votre navigateur."
          : "Impossible d'accéder à la caméra/micro. Vérifiez qu'aucune autre application ne les utilise."
      );
    }
    setChecking(false);
  }

  useEffect(() => {
    return () => { if (stream) stream.getTracks().forEach(t => t.stop()); };
  }, [stream]);

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", padding: "2rem 1rem" }}>
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <div style={{ width: "64px", height: "64px", background: "var(--primary)", borderRadius: "16px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem", color: "white" }}>
          <Video size={32} />
        </div>
        <h1 style={{ fontSize: "1.75rem", fontWeight: "800", color: "var(--foreground)", marginBottom: "0.5rem" }}>
          Préparation de l&apos;entretien vidéo
        </h1>
        <p style={{ fontSize: "15px", color: "var(--muted-foreground)", lineHeight: "1.6" }}>
          Avant de commencer, vérifions que votre caméra et votre microphone fonctionnent correctement.
        </p>
      </div>

      {/* Camera preview */}
      <div style={{
        borderRadius: "12px", overflow: "hidden", background: "#000", aspectRatio: "16/9",
        marginBottom: "1.5rem", position: "relative", border: "2px solid var(--border)"
      }}>
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          style={{ width: "100%", height: "100%", objectFit: "cover", display: stream ? "block" : "none" }}
        />
        {!stream && (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#6b7280" }}>
            <Camera size={48} style={{ marginBottom: "0.5rem", opacity: 0.5 }} />
            <p style={{ fontSize: "14px" }}>Aperçu de votre caméra</p>
          </div>
        )}
        {stream && (
          <div style={{ position: "absolute", bottom: "12px", left: "12px", display: "flex", alignItems: "center", gap: "6px", background: "rgba(0,0,0,0.6)", borderRadius: "6px", padding: "4px 10px" }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#22c55e", animation: "pulse 2s infinite" }} />
            <span style={{ fontSize: "12px", color: "white", fontWeight: "600" }}>Live</span>
          </div>
        )}
      </div>

      {/* Status checklist */}
      {(cameraOk || micOk) && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "1.5rem" }}>
          <CheckRow ok={cameraOk} label="Caméra détectée et fonctionnelle" />
          <CheckRow ok={micOk} label="Microphone détecté et fonctionnel" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ display: "flex", gap: "10px", padding: "1rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "var(--radius)", marginBottom: "1.5rem" }}>
          <AlertCircle size={18} style={{ color: "#991b1b", flexShrink: 0 }} />
          <p style={{ fontSize: "13px", color: "#991b1b" }}>{error}</p>
        </div>
      )}

      {/* Tips */}
      <div style={{ background: "var(--secondary)", borderRadius: "var(--radius)", padding: "1rem 1.25rem", marginBottom: "1.5rem", fontSize: "13px", color: "var(--muted-foreground)", lineHeight: "1.7" }}>
        <strong style={{ color: "var(--foreground)" }}>Quelques conseils :</strong>
        <ul style={{ margin: "0.5rem 0 0", paddingLeft: "1.25rem" }}>
          <li>Placez-vous dans un endroit calme et bien éclairé</li>
          <li>Regardez la caméra, pas votre écran</li>
          <li>Parlez clairement et à un rythme naturel</li>
          <li>Vous avez un temps de préparation avant chaque réponse</li>
        </ul>
      </div>

      {!stream ? (
        <button
          className="btn btn-primary"
          onClick={startCheck}
          disabled={checking}
          style={{ width: "100%", padding: "1rem", fontSize: "15px", fontWeight: "700", gap: "8px" }}
        >
          {checking ? <><Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> Vérification...</> : <><Camera size={18} /> Tester ma caméra et mon micro</>}
        </button>
      ) : (
        <button
          className="btn btn-primary"
          onClick={() => { if (stream) stream.getTracks().forEach(t => t.stop()); onReady(); }}
          style={{ width: "100%", padding: "1rem", fontSize: "15px", fontWeight: "700", gap: "8px", background: "#22c55e" }}
        >
          <CheckCircle2 size={18} /> Tout est prêt, commencer l&apos;entretien
        </button>
      )}
    </div>
  );
}

function CheckRow({ ok, label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      <CheckCircle2 size={18} style={{ color: ok ? "#22c55e" : "var(--muted-foreground)" }} />
      <span style={{ fontSize: "14px", color: ok ? "var(--foreground)" : "var(--muted-foreground)", fontWeight: ok ? "600" : "400" }}>{label}</span>
    </div>
  );
}

// ─── Recording Screen ─────────────────────────────────────────────────────────
function RecordingScreen({ question, questionIndex, totalQuestions, maxDuration, maxRetakes, candidate, job, onComplete, onNext }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  const [phase, setPhase] = useState("preview"); // preview | recording | reviewing | uploading | done
  const [timeLeft, setTimeLeft] = useState(maxDuration);
  const [elapsed, setElapsed] = useState(0);
  const [retakesUsed, setRetakesUsed] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [error, setError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [recordingStart, setRecordingStart] = useState(null);

  const startCamera = useCallback(async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = s;
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        videoRef.current.muted = true;
      }
    } catch (err) {
      setError("Impossible d'accéder à la caméra. Rechargez la page.");
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startCamera]);

  function startRecording() {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm";
    const recorder = new MediaRecorder(streamRef.current, { mimeType });
    recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      setRecordedBlob(blob);
      setPhase("reviewing");
      // Show recorded video for preview
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.src = URL.createObjectURL(blob);
        videoRef.current.muted = false;
      }
    };
    recorderRef.current = recorder;
    recorder.start(1000);
    setRecordingStart(Date.now());
    setPhase("recording");
    setTimeLeft(maxDuration);
    setElapsed(0);

    timerRef.current = setInterval(() => {
      setElapsed(prev => {
        const newElapsed = prev + 1;
        setTimeLeft(maxDuration - newElapsed);
        if (newElapsed >= maxDuration) {
          stopRecording();
          clearInterval(timerRef.current);
        }
        return newElapsed;
      });
    }, 1000);
  }

  function stopRecording() {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
  }

  function retake() {
    setRetakesUsed(prev => prev + 1);
    setRecordedBlob(null);
    if (videoRef.current) {
      videoRef.current.src = "";
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.muted = true;
    }
    setPhase("preview");
  }

  async function submitAnswer() {
    if (!recordedBlob) return;
    setPhase("uploading");
    setError(null);

    try {
      const supabase = createClient();
      const duration = Math.round((Date.now() - recordingStart) / 1000);

      // Create response record first
      const createRes = await createVideoInterviewResponse(
        candidate.id,
        job.id,
        questionIndex,
        question.text,
        question.evaluation_criteria || ""
      );
      if (!createRes.success) throw new Error(createRes.error);
      const responseId = createRes.response.id;

      // Upload video to Supabase Storage
      const ext = recordedBlob.type.includes("mp4") ? "mp4" : "webm";
      const filePath = `${candidate.id}/${job.id}/q${questionIndex}_${Date.now()}.${ext}`;
      setUploadProgress(20);

      const { error: uploadError } = await supabase.storage
        .from("video-responses")
        .upload(filePath, recordedBlob, { contentType: recordedBlob.type, upsert: true });

      if (uploadError) throw new Error("Upload failed: " + uploadError.message);
      setUploadProgress(60);

      const { data: urlData } = supabase.storage.from("video-responses").getPublicUrl(filePath);
      const videoUrl = urlData?.publicUrl;

      // Save path + url to DB
      await updateVideoResponseAfterUpload(responseId, filePath, videoUrl, duration);
      setUploadProgress(80);

      // Trigger transcription + evaluation (non-blocking, fire and forget)
      fetch("/api/video-interview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          responseId,
          videoUrl,
          questionText: question.text,
          evaluationCriteria: question.evaluation_criteria,
          jobContext: {
            title: job.title,
            hard_skills: job.extracted_criteria?.hard_skills?.map(s => s.name),
            soft_skills: job.extracted_criteria?.soft_skills?.map(s => s.name),
          },
        }),
      });

      setUploadProgress(100);
      setPhase("done");

      // Short delay then move on
      setTimeout(() => onNext(responseId), 1500);
    } catch (err) {
      console.error(err);
      setError(err.message || "Erreur lors de l'envoi. Veuillez réessayer.");
      setPhase("reviewing");
    }
  }

  const catStyle = { bg: "#eff6ff", color: "#1d4ed8" };
  const canRetake = retakesUsed < maxRetakes;

  return (
    <div style={{ maxWidth: "700px", margin: "0 auto", padding: "2rem 1rem" }}>
      {/* Progress */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "1.5rem" }}>
        {Array.from({ length: totalQuestions }).map((_, i) => (
          <div key={i} style={{
            flex: 1, height: "4px", borderRadius: "99px",
            background: i < questionIndex ? "var(--primary)" : i === questionIndex ? "var(--primary)" : "var(--border)",
            opacity: i === questionIndex ? 1 : i < questionIndex ? 0.5 : 1
          }} />
        ))}
        <span style={{ fontSize: "13px", fontWeight: "700", color: "var(--muted-foreground)", whiteSpace: "nowrap" }}>
          {questionIndex + 1} / {totalQuestions}
        </span>
      </div>

      {/* Question card */}
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "1.25rem", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "0.75rem" }}>
          <span style={{ fontSize: "12px", fontWeight: "700", color: catStyle.color, background: catStyle.bg, padding: "2px 10px", borderRadius: "99px" }}>
            Question {questionIndex + 1}
          </span>
        </div>
        <h2 style={{ fontSize: "1.25rem", fontWeight: "800", color: "var(--foreground)", lineHeight: "1.4" }}>
          {question.text}
        </h2>
        {question.hint && (
          <p style={{ fontSize: "13px", color: "var(--muted-foreground)", marginTop: "0.5rem", fontStyle: "italic" }}>
            💡 {question.hint}
          </p>
        )}
      </div>

      {/* Video area */}
      <div style={{ borderRadius: "12px", overflow: "hidden", background: "#000", aspectRatio: "16/9", marginBottom: "1rem", position: "relative" }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          controls={phase === "reviewing"}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />

        {/* Recording indicator */}
        {phase === "recording" && (
          <div style={{ position: "absolute", top: "12px", left: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "rgba(220,38,38,0.9)", borderRadius: "6px", padding: "4px 10px" }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "white", animation: "pulse 1s infinite" }} />
              <span style={{ fontSize: "12px", color: "white", fontWeight: "700" }}>REC</span>
            </div>
            <div style={{ background: "rgba(0,0,0,0.6)", borderRadius: "6px", padding: "4px 10px", display: "flex", alignItems: "center", gap: "5px" }}>
              <Clock size={12} style={{ color: timeLeft <= 30 ? "#ef4444" : "white" }} />
              <span style={{ fontSize: "13px", color: timeLeft <= 30 ? "#fca5a5" : "white", fontWeight: "700" }}>
                {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}
              </span>
            </div>
          </div>
        )}

        {/* Uploading overlay */}
        {phase === "uploading" && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "white", gap: "1rem" }}>
            <Loader2 size={40} style={{ animation: "spin 1s linear infinite" }} />
            <p style={{ fontSize: "15px", fontWeight: "700" }}>Envoi en cours… {uploadProgress}%</p>
            <div style={{ width: "200px", height: "4px", background: "rgba(255,255,255,0.2)", borderRadius: "99px" }}>
              <div style={{ height: "100%", background: "#22c55e", borderRadius: "99px", width: `${uploadProgress}%`, transition: "width 0.3s" }} />
            </div>
          </div>
        )}

        {/* Done overlay */}
        {phase === "done" && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "white", gap: "1rem" }}>
            <CheckCircle2 size={48} style={{ color: "#22c55e" }} />
            <p style={{ fontSize: "16px", fontWeight: "700" }}>Réponse enregistrée !</p>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div style={{ display: "flex", gap: "10px", padding: "1rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "var(--radius)", marginBottom: "1rem" }}>
          <AlertCircle size={16} style={{ color: "#991b1b", flexShrink: 0 }} />
          <p style={{ fontSize: "13px", color: "#991b1b" }}>{error}</p>
        </div>
      )}

      {/* Controls */}
      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
        {phase === "preview" && (
          <button
            className="btn btn-primary"
            onClick={startRecording}
            style={{ padding: "1rem 2rem", fontSize: "15px", fontWeight: "700", gap: "8px", background: "#dc2626" }}
          >
            <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "white" }} />
            Commencer l&apos;enregistrement
          </button>
        )}

        {phase === "recording" && (
          <button
            className="btn"
            onClick={stopRecording}
            style={{ padding: "1rem 2rem", fontSize: "15px", fontWeight: "700", gap: "8px", background: "#111", color: "white", border: "none" }}
          >
            <Square size={18} /> Terminer l&apos;enregistrement
          </button>
        )}

        {phase === "reviewing" && (
          <>
            {canRetake && (
              <button
                className="btn btn-outline"
                onClick={retake}
                style={{ gap: "8px" }}
              >
                <RefreshCw size={16} /> Recommencer ({maxRetakes - retakesUsed} restant{maxRetakes - retakesUsed > 1 ? "s" : ""})
              </button>
            )}
            <button
              className="btn btn-primary"
              onClick={submitAnswer}
              style={{ padding: "0.875rem 2rem", fontWeight: "700", gap: "8px" }}
            >
              Valider cette réponse <ChevronRight size={18} />
            </button>
          </>
        )}
      </div>

      {phase === "preview" && (
        <p style={{ textAlign: "center", fontSize: "13px", color: "var(--muted-foreground)", marginTop: "0.75rem" }}>
          Cliquez quand vous êtes prêt(e). Durée max : {Math.floor(maxDuration / 60)} min {maxDuration % 60 ? `${maxDuration % 60}s` : ""}.
        </p>
      )}
    </div>
  );
}

// ─── Main VideoInterviewModule ────────────────────────────────────────────────
export default function VideoInterviewModule({ candidate, job, onComplete, onBack }) {
  const [phase, setPhase] = useState("setup"); // setup | interview | finished
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [completedResponseIds, setCompletedResponseIds] = useState([]);

  const videoConfig = job?.assessment_config?.modules?.video_interview || {};
  const questions = videoConfig.questions || [];
  const maxDuration = videoConfig.max_duration_seconds || 120;
  const maxRetakes = videoConfig.max_retakes ?? 1;

  async function handleNext(responseId) {
    const updated = [...completedResponseIds, responseId];
    setCompletedResponseIds(updated);

    if (currentQuestionIndex + 1 >= questions.length) {
      // All questions answered — compute average and finish
      setPhase("finished");
      // Mark as completed (score will be computed asynchronously by the API)
      await markVideoInterviewCompleted(candidate.id, 0);
      setTimeout(() => onComplete(), 2000);
    } else {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  }

  if (phase === "setup") {
    return (
      <div style={{ minHeight: "100vh", background: "var(--background)" }}>
        <div style={{ padding: "1.5rem 2rem" }}>
          <button
            onClick={onBack}
            style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", fontSize: "14px" }}
          >
            <ArrowLeft size={16} /> Retour
          </button>
        </div>
        <SetupScreen onReady={() => setPhase("interview")} />
      </div>
    );
  }

  if (phase === "interview" && questions[currentQuestionIndex]) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--background)" }}>
        <RecordingScreen
          question={questions[currentQuestionIndex]}
          questionIndex={currentQuestionIndex}
          totalQuestions={questions.length}
          maxDuration={maxDuration}
          maxRetakes={maxRetakes}
          candidate={candidate}
          job={job}
          onNext={handleNext}
          onComplete={onComplete}
        />
      </div>
    );
  }

  // Finished screen
  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
      <div style={{ textAlign: "center", maxWidth: "480px" }}>
        <div style={{ width: "80px", height: "80px", background: "#dcfce7", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem" }}>
          <CheckCircle2 size={40} style={{ color: "#22c55e" }} />
        </div>
        <h2 style={{ fontSize: "1.75rem", fontWeight: "800", marginBottom: "1rem" }}>Entretien vidéo terminé !</h2>
        <p style={{ fontSize: "15px", color: "var(--muted-foreground)", lineHeight: "1.7" }}>
          Toutes vos réponses ont été envoyées. L&apos;équipe recrutement les analysera prochainement.
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "center", marginTop: "1rem" }}>
          <Loader2 size={16} style={{ animation: "spin 1s linear infinite", color: "var(--muted-foreground)" }} />
          <span style={{ fontSize: "14px", color: "var(--muted-foreground)" }}>Retour au tableau de bord…</span>
        </div>
      </div>
    </div>
  );
}
