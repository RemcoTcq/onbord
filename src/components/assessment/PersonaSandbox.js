"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Send, Loader2, PhoneOff, Mic, MicOff, Phone, MessageSquareText, Timer, Hand } from "lucide-react";
import { DEFAULT_PRIMARY, getContrastColor, primaryBtn } from "./candidateUi";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { createClient } from "@/lib/supabase/client";
import { savePersonaCallVideo } from "@/lib/actions/run";

// Sandbox « persona » — un interlocuteur joué par l'IA : un prospect, un client
// mécontent, un collaborateur, un manager. Deux modes :
//   • APPEL (par défaut) : le candidat parle, le personnage répond à voix haute.
//     Écran façon visio — le personnage sans caméra, le candidat caméra
//     allumée, sous-titres des deux voix. La caméra est enregistrée pour le
//     recruteur ; c'est la transcription qui est notée.
//   • CHAT : une messagerie, pour les situations qui se vivent par écrit.
//
// Rien ici ne décide de ce que dit le personnage : chaque message part à
// /api/run/persona, qui détient la consigne de jeu, les informations cachées
// et l'historique. L'écran n'affiche que ce que le serveur renvoie.
//
// La VOIX du personnage vient d'ElevenLabs (/api/run/persona/voix), avec un
// accent qui colle au personnage — flamand, belge, français, anglais. Sans clé
// configurée ou en cas de panne, elle retombe sur la synthèse du navigateur :
// l'appel ne s'arrête jamais pour une question de voix. L'ÉCOUTE du candidat
// passe par la reconnaissance vocale du navigateur.

const LANGUES_VOIX = { fr: "fr-FR", nl: "nl-BE", en: "en-GB", de: "de-DE", es: "es-ES", it: "it-IT" };

// ── Fin de tour : la différence entre hésiter et avoir fini ──────────────────
// Un silence ne veut pas dire « j'ai terminé ». Quelqu'un qui cherche ses mots
// s'arrête souvent au milieu d'une phrase — sur « et », « parce que », « le » —
// et l'envoyer à ce moment-là, c'est lui couper la parole. Le délai s'adapte
// donc à la façon dont la phrase s'arrête ; et le candidat peut, à tout moment,
// passer en mode manuel et cliquer « J'ai terminé ».
const SILENCE_FIN_DE_TOUR_MS = 2000;        // phrase qui a l'air finie
const SILENCE_PHRASE_COURTE_MS = 2600;      // deux mots ou moins : peut-être un début
const SILENCE_HESITATION_MS = 4200;         // s'arrête sur un mot qui appelle une suite

// Mots sur lesquels une phrase ne se termine pas : hésitations, conjonctions,
// articles, prépositions — en français, anglais et néerlandais.
const MOTS_SUSPENDUS = new Set([
  // français
  "euh", "heu", "hum", "bah", "ben", "bon", "donc", "et", "mais", "ou", "alors", "enfin", "genre", "parce", "que", "qui",
  "car", "si", "quand", "comme", "puis", "ensuite", "le", "la", "les", "un", "une", "des", "du", "de", "à", "au", "aux",
  "pour", "avec", "sur", "dans", "par", "en", "mon", "ma", "mes", "votre", "vos", "notre", "nos", "ce", "cette", "ces",
  "je", "on", "nous", "vous", "il", "elle", "ils", "elles", "c'est", "est", "sont", "fait", "aussi", "très", "plus",
  // anglais
  "um", "uh", "erm", "so", "and", "but", "or", "because", "that", "which", "the", "a", "an", "to", "of", "for", "with",
  "on", "in", "at", "my", "your", "our", "i", "we", "you", "it's", "is", "are", "like", "if", "when", "then",
  // néerlandais
  "eh", "ehm", "uhm", "dus", "maar", "omdat", "want", "dat", "die", "het", "een", "van", "voor", "met", "op", "aan",
  "naar", "ik", "we", "jij", "u", "onze", "mijn", "uw", "als", "wanneer", "dan", "allez", "ja", "nou",
]);

function delaiFinDeTour(texte) {
  const mots = String(texte || "").toLowerCase().replace(/[.,!?…;:]+$/u, "").split(/\s+/).filter(Boolean);
  if (!mots.length) return SILENCE_HESITATION_MS;
  if (MOTS_SUSPENDUS.has(mots[mots.length - 1])) return SILENCE_HESITATION_MS;
  if (mots.length <= 2) return SILENCE_PHRASE_COURTE_MS;
  return SILENCE_FIN_DE_TOUR_MS;
}

function initiales(nom) {
  return String(nom || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((m) => m[0]).join("").toUpperCase();
}

// ─── La conversation, commune aux deux modes ─────────────────────────────────
function usePersonaConversation({ persona, token, stepId, onChange }) {
  const { t } = useI18n();
  const [messages, setMessages] = useState(persona?.opening_message ? [{ role: "persona", content: persona.opening_message }] : []);
  const [remaining, setRemaining] = useState(persona?.max_turns ?? null);
  const [ended, setEnded] = useState(false);
  const [endedBy, setEndedBy] = useState(null);
  const [sending, setSending] = useState(false);
  const [streaming, setStreaming] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [turns, setTurns] = useState(0);

  // Le parent ne connaît que ce qui conditionne « Suivant ». Son `onChange`
  // change d'identité à chaque rendu : passé en dépendance, il relancerait le
  // chargement de l'historique en boucle. On le lit par une référence.
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; });

  const appliquer = useCallback((etat) => {
    if (Array.isArray(etat.messages)) setMessages(etat.messages);
    if (typeof etat.remaining === "number") setRemaining(etat.remaining);
    if (typeof etat.turns === "number") setTurns(etat.turns);
    setEnded(!!etat.ended);
    setEndedBy(etat.endedBy || null);
    return etat;
  }, []);

  // Signaler au parent est séparé d'appliquer : en mode appel, la fin n'est
  // annoncée qu'une fois la vidéo enregistrée.
  const signaler = useCallback((etat) => {
    onChangeRef.current?.({ turns: etat.turns || 0, ended: !!etat.ended });
  }, []);

  useEffect(() => {
    let annule = false;
    (async () => {
      try {
        const res = await fetch(`/api/run/persona?token=${encodeURIComponent(token)}&stepId=${encodeURIComponent(stepId)}`);
        const data = await res.json();
        if (!annule && res.ok) signaler(appliquer(data));
      } catch { /* l'historique se rechargera au prochain envoi */ }
      if (!annule) setLoaded(true);
    })();
    return () => { annule = true; };
  }, [token, stepId, appliquer, signaler]);

  // Envoie un message ; `onDelta` reçoit le texte du personnage au fil du flux
  // (la voix commence à parler avant la fin de la réponse). Renvoie l'état
  // final, ou null en cas d'échec.
  const envoyer = useCallback(async (texte, { onDelta, signalerFin = true } = {}) => {
    setMessages((m) => [...m, { role: "candidate", content: texte }]);
    setSending(true);
    setStreaming("");
    let acc = "";
    let final = null;
    try {
      const res = await fetch("/api/run/persona", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, stepId, message: texte }),
      });
      const type = res.headers.get("content-type") || "";
      if (!res.ok || !res.body || type.includes("application/json")) {
        const data = await res.json().catch(() => ({}));
        if (data.messages) { final = appliquer(data); if (signalerFin || !data.ended) signaler(final); }
        else setMessages((m) => [...m, { role: "system", content: t("candidate.persona.error") }]);
        return final;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lignes = buffer.split("\n");
        buffer = lignes.pop() || "";
        for (const ligne of lignes) {
          if (!ligne.trim()) continue;
          let msg;
          try { msg = JSON.parse(ligne); } catch { continue; }
          if (msg.type === "delta") { acc += msg.text; setStreaming(acc); onDelta?.(msg.text); }
          else if (msg.type === "done") {
            final = appliquer(msg);
            if (signalerFin || !msg.ended) signaler(final);
            acc = "";
          } else if (msg.type === "error") {
            setMessages((m) => [...m, { role: "system", content: t("candidate.persona.error") }]);
          }
        }
      }
    } catch {
      setMessages((m) => [...m, { role: "system", content: t("candidate.persona.error") }]);
    } finally {
      if (acc) setMessages((m) => [...m, { role: "persona", content: acc }]);
      setStreaming("");
      setSending(false);
    }
    return final;
  }, [token, stepId, appliquer, signaler, t]);

  const terminer = useCallback(async ({ signalerFin = true } = {}) => {
    try {
      const res = await fetch("/api/run/persona", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, stepId, end: true }),
      });
      const data = await res.json();
      if (res.ok) { const etat = appliquer(data); if (signalerFin) signaler(etat); return etat; }
    } catch { /* le bouton reste disponible */ }
    return null;
  }, [token, stepId, appliquer, signaler]);

  return { messages, remaining, ended, endedBy, sending, streaming, loaded, turns, envoyer, terminer, signaler };
}

// ─── Mode CHAT ───────────────────────────────────────────────────────────────
function PersonaChat({ persona, conv, primary, compact }) {
  const { t } = useI18n();
  const [input, setInput] = useState("");
  const [confirmEnd, setConfirmEnd] = useState(false);
  const listRef = useRef(null);
  const { messages, remaining, ended, endedBy, sending, streaming, loaded, envoyer, terminer } = conv;

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, streaming]);

  async function soumettre() {
    const texte = input.trim();
    if (!texte || sending || ended) return;
    setInput("");
    setConfirmEnd(false);
    await envoyer(texte);
  }

  async function clore() {
    if (!confirmEnd) { setConfirmEnd(true); return; }
    setConfirmEnd(false);
    await terminer();
  }

  const candidatParle = messages.some((m) => m.role === "candidate");
  const finTexte = endedBy === "persona" ? t("candidate.persona.endedByPersona", { name: persona?.name || "" })
    : endedBy === "limit" ? t("candidate.persona.endedByLimit")
      : t("candidate.persona.endedByYou");

  return (
    <div style={{ border: "1px solid var(--border)", borderTop: `3px solid ${primary}`, borderRadius: 16, overflow: "hidden", background: "#ffffff", display: "flex", flexDirection: "column" }}>
      <div style={{ background: "#fafafa", padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#e2e8f0", color: "#334155", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
          {initiales(persona?.name)}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{persona?.name}</div>
          <div style={{ fontSize: 12, color: "var(--muted-foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {[persona?.role, persona?.company].filter(Boolean).join(" · ")}
          </div>
        </div>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 600, color: ended ? "var(--muted-foreground)" : "#166534" }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: ended ? "#cbd5e1" : "#22c55e" }} />
          {ended ? t("candidate.persona.statusEnded") : t("candidate.persona.statusOnline")}
        </span>
      </div>

      {persona?.context && (
        <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)", background: "#fcfcfd", fontSize: 13, lineHeight: 1.55, color: "var(--muted-foreground)", whiteSpace: "pre-wrap", overflowWrap: "break-word" }}>
          <strong style={{ color: "var(--foreground)" }}>{t("candidate.persona.contextLabel")} </strong>{persona.context}
        </div>
      )}

      <div ref={listRef} style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 10, overflowY: "auto", minHeight: 220, maxHeight: compact ? 360 : 460 }}>
        {!candidatParle && !persona?.opening_message && loaded && (
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", textAlign: "center", margin: "auto 0" }}>{t("candidate.persona.youStart")}</p>
        )}
        {messages.map((m, i) => {
          if (m.role === "system") return <p key={i} style={{ fontSize: 12.5, color: "#b91c1c", textAlign: "center", margin: 0 }}>{m.content}</p>;
          const moi = m.role === "candidate";
          return (
            <div key={i} style={{ display: "flex", justifyContent: moi ? "flex-end" : "flex-start" }}>
              <div style={{
                maxWidth: "80%", padding: "9px 13px", borderRadius: 14, fontSize: 14, lineHeight: 1.55,
                whiteSpace: "pre-wrap", overflowWrap: "break-word",
                background: moi ? primary : "#f1f5f9", color: moi ? getContrastColor(primary) : "var(--foreground)",
                borderBottomRightRadius: moi ? 4 : 14, borderBottomLeftRadius: moi ? 14 : 4,
              }}>{m.content}</div>
            </div>
          );
        })}
        {sending && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div style={{ maxWidth: "80%", padding: "9px 13px", borderRadius: 14, borderBottomLeftRadius: 4, background: "#f1f5f9", fontSize: 14, lineHeight: 1.55, whiteSpace: "pre-wrap", overflowWrap: "break-word", color: streaming ? "var(--foreground)" : "var(--muted-foreground)" }}>
              {streaming || t("candidate.persona.typing", { name: persona?.name || "" })}
            </div>
          </div>
        )}
      </div>

      {ended ? (
        <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)", background: "#f8fafc", fontSize: 13, color: "var(--muted-foreground)", textAlign: "center" }}>{finTexte}</div>
      ) : (
        <div style={{ borderTop: "1px solid var(--border)", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <textarea
              className="nodal-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); soumettre(); } }}
              rows={2}
              disabled={sending || !loaded}
              placeholder={t("candidate.persona.placeholder", { name: persona?.name || "" })}
              style={{ flex: 1, minWidth: 0, resize: "none", border: "1px solid var(--border)", borderRadius: 12, padding: "10px 12px", fontSize: 14, fontFamily: "inherit", lineHeight: 1.5, background: "#fafafa", outline: "none", maxHeight: 160 }}
            />
            <button type="button" onClick={soumettre} disabled={sending || !input.trim()} aria-label={t("candidate.persona.send")}
              style={{ width: 42, height: 42, borderRadius: 12, border: "none", background: primary, color: getContrastColor(primary), display: "flex", alignItems: "center", justifyContent: "center", cursor: sending || !input.trim() ? "not-allowed" : "pointer", opacity: sending || !input.trim() ? 0.5 : 1, flexShrink: 0 }}>
              {sending ? <Loader2 size={17} style={{ animation: "spin 1s linear infinite" }} /> : <Send size={17} />}
            </button>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11.5, color: "var(--muted-foreground)" }}>
              {typeof remaining === "number" ? t("candidate.persona.remaining", { count: remaining }) : ""}
            </span>
            {candidatParle && (
              <button type="button" onClick={clore} disabled={sending}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, padding: "5px 10px", borderRadius: 8, border: `1px solid ${confirmEnd ? "#fca5a5" : "var(--border)"}`, background: confirmEnd ? "#fef2f2" : "#ffffff", color: confirmEnd ? "#b91c1c" : "var(--foreground)", cursor: "pointer", fontFamily: "inherit" }}>
                <PhoneOff size={13} /> {confirmEnd ? t("candidate.persona.confirmEnd") : t("candidate.persona.end")}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Voix du navigateur ──────────────────────────────────────────────────────

function reconnaissanceDisponible() {
  return typeof window !== "undefined" && !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}
// Le serveur ne connaît pas le navigateur : il rend « pas de reconnaissance »,
// le client corrige sans décalage d'hydratation.
const sAbonnerARien = () => () => {};
const pasDeReconnaissanceCoteServeur = () => false;

// La voix la plus naturelle disponible pour la langue : les voix « Natural »,
// « Online » ou Google sont nettement moins robotiques que les voix système.
function choisirVoix(lang) {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voix = window.speechSynthesis.getVoices().filter((v) => v.lang?.toLowerCase().startsWith(lang.slice(0, 2).toLowerCase()));
  const score = (v) => (/natural|online|neural/i.test(v.name) ? 3 : 0) + (/google/i.test(v.name) ? 2 : 0) + (v.lang?.toLowerCase() === lang.toLowerCase() ? 1 : 0);
  return voix.sort((a, b) => score(b) - score(a))[0] || null;
}

// ─── Mode APPEL ──────────────────────────────────────────────────────────────
function PersonaCall({ persona, conv, token, stepId, primary }) {
  const { t, locale } = useI18n();
  const { messages, remaining, ended, endedBy, sending, loaded, envoyer, terminer, signaler, turns } = conv;
  // Langue de la reconnaissance vocale : celle du personnage, à l'accent près
  // (nl-BE pour un Flamand, fr-BE pour un Bruxellois) — le candidat lui répond
  // dans sa langue.
  const lang = persona?.language && persona?.accent
    ? `${persona.language}-${persona.accent}`
    : LANGUES_VOIX[persona?.language] || LANGUES_VOIX[locale] || "fr-FR";

  // lobby → appel → enregistrement de la vidéo → terminé
  const [phase, setPhase] = useState("lobby");
  const [erreurCamera, setErreurCamera] = useState(null);
  const [cameraPrete, setCameraPrete] = useState(false);
  const [micCoupe, setMicCoupe] = useState(false);
  const [sousTitre, setSousTitre] = useState("");        // ce que le candidat est en train de dire
  const [parleIA, setParleIA] = useState(false);
  const [debut, setDebut] = useState(null);
  const [maintenant, setMaintenant] = useState(0);
  const [saisie, setSaisie] = useState("");
  const [transcriptionVisible, setTranscriptionVisible] = useState(false);
  // Envoi automatique après un silence, ou manuel (« J'ai terminé »).
  const [envoiAuto, setEnvoiAuto] = useState(true);
  // Compte à rebours visible avant l'envoi automatique : { ms, cle }.
  const [finTour, setFinTour] = useState(null);
  const [transcription, setTranscription] = useState(false); // le tour part à la transcription
  const vocal = useSyncExternalStore(sAbonnerARien, reconnaissanceDisponible, pasDeReconnaissanceCoteServeur);

  const videoRef = useRef(null);
  const fluxRef = useRef(null);
  const enregistreurRef = useRef(null);
  const morceauxRef = useRef([]);
  const reconnaissanceRef = useRef(null);
  const ecouteRef = useRef(false);        // la reconnaissance doit-elle tourner ?
  const phraseRef = useRef("");           // paroles du tour en cours, phrases finales
  const silenceRef = useRef(null);
  const tamponRef = useRef("");           // texte du personnage pas encore prononcé
  const chaineRef = useRef(Promise.resolve()); // lecture des phrases, dans l'ordre
  const audioRef = useRef(null);          // phrase en cours de lecture (pour couper)
  const voixServeurRef = useRef(true);    // ElevenLabs disponible ? (faux au premier « non configuré »)
  const sttServeurRef = useRef(true);     // transcription ElevenLabs disponible ?
  const tourEnregistreurRef = useRef(null); // audio du tour de parole en cours
  const tourMorceauxRef = useRef([]);
  const envoiAutoRef = useRef(true);
  const enAppelRef = useRef(false);

  // ── Caméra et micro (dès le lobby : le candidat se voit avant d'entrer) ──
  useEffect(() => {
    let annule = false;
    (async () => {
      try {
        const flux = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 360 }, audio: true });
        if (annule) { flux.getTracks().forEach((p) => p.stop()); return; }
        fluxRef.current = flux;
        if (videoRef.current) videoRef.current.srcObject = flux;
        setCameraPrete(true);
      } catch {
        if (!annule) setErreurCamera(t("candidate.call.cameraError"));
      }
    })();
    return () => {
      annule = true;
      fluxRef.current?.getTracks().forEach((p) => p.stop());
      fluxRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- une seule acquisition par montage
  }, []);

  // La vidéo se rebranche quand l'élément change (lobby → appel).
  useEffect(() => {
    if (videoRef.current && fluxRef.current && videoRef.current.srcObject !== fluxRef.current) {
      videoRef.current.srcObject = fluxRef.current;
    }
  });

  // Appel déjà passé (le candidat revient sur l'étape) : la caméra s'éteint.
  useEffect(() => {
    if (ended && phase === "lobby") {
      fluxRef.current?.getTracks().forEach((p) => p.stop());
      fluxRef.current = null;
    }
  }, [ended, phase, cameraPrete]);

  // Chronomètre de l'appel.
  useEffect(() => {
    if (phase !== "appel") return undefined;
    const id = setInterval(() => setMaintenant(Date.now()), 1000);
    return () => clearInterval(id);
  }, [phase]);

  // Tout s'arrête si le candidat quitte l'étape en plein appel.
  useEffect(() => () => {
    enAppelRef.current = false;
    ecouteRef.current = false;
    try { reconnaissanceRef.current?.abort(); } catch { /* déjà arrêtée */ }
    try { window.speechSynthesis?.cancel(); } catch { /* rien à couper */ }
    try { audioRef.current?.pause(); } catch { /* rien à couper */ }
    clearTimeout(silenceRef.current);
  }, []);

  // ── Audio du tour de parole ──
  // Enregistré pendant que le candidat parle, transcrit à la fin du tour par
  // ElevenLabs : c'est cette transcription, plus fidèle que celle du
  // navigateur, qui part au personnage et au correcteur.
  const demarrerTour = useCallback(() => {
    if (!sttServeurRef.current || tourEnregistreurRef.current?.state === "recording") return;
    const pistes = fluxRef.current?.getAudioTracks() || [];
    if (!pistes.length) return;
    try {
      const type = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((m) => window.MediaRecorder?.isTypeSupported?.(m));
      const rec = new MediaRecorder(new MediaStream(pistes), type ? { mimeType: type } : undefined);
      tourMorceauxRef.current = [];
      rec.ondataavailable = (e) => { if (e.data?.size) tourMorceauxRef.current.push(e.data); };
      rec.start(250);
      tourEnregistreurRef.current = rec;
    } catch { /* sans audio du tour, le texte du navigateur fera foi */ }
  }, []);

  const arreterTour = useCallback(() => new Promise((resolve) => {
    const rec = tourEnregistreurRef.current;
    tourEnregistreurRef.current = null;
    if (!rec || rec.state === "inactive") { resolve(null); return; }
    rec.onstop = () => resolve(tourMorceauxRef.current.length
      ? new Blob(tourMorceauxRef.current, { type: rec.mimeType || "audio/webm" })
      : null);
    rec.stop();
  }), []);

  const transcrireTour = useCallback(async (blob) => {
    // Moins de 2 Ko : une fraction de seconde, rien à transcrire de mieux.
    if (!blob || blob.size < 2000 || !sttServeurRef.current) return null;
    try {
      const fd = new FormData();
      fd.append("token", token);
      fd.append("stepId", stepId);
      fd.append("audio", blob, blob.type.includes("mp4") ? "tour.mp4" : "tour.webm");
      const res = await fetch("/api/run/persona/transcrire", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if ([503, 403].includes(res.status)) sttServeurRef.current = false;
      return res.ok ? (String(data.text || "").trim() || null) : null;
    } catch {
      return null;
    }
  }, [token, stepId]);

  // ── Écoute ──
  const demarrerEcoute = useCallback(() => {
    ecouteRef.current = true;
    demarrerTour();
    try { reconnaissanceRef.current?.start(); } catch { /* déjà démarrée */ }
  }, [demarrerTour]);
  const suspendreEcoute = useCallback(() => {
    ecouteRef.current = false;
    clearTimeout(silenceRef.current);
    setFinTour(null);
    try { reconnaissanceRef.current?.stop(); } catch { /* déjà arrêtée */ }
  }, []);

  // ── Voix du personnage : phrase par phrase, au fil du flux ──
  // Chaque phrase est demandée à ElevenLabs dès qu'elle arrive (l'audio se
  // prépare pendant que la précédente est lue), puis lue dans l'ordre.
  const chargerAudio = useCallback(async (texte) => {
    if (!voixServeurRef.current) return null;
    try {
      const res = await fetch("/api/run/persona/voix", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, stepId, text: texte }),
      });
      if ((res.headers.get("content-type") || "").includes("audio") && res.ok) {
        return URL.createObjectURL(await res.blob());
      }
      // « Non configuré » ou refusé : inutile de redemander pour les phrases
      // suivantes. Une panne passagère, elle, ne coupe que cette phrase.
      if ([503, 403].includes(res.status)) voixServeurRef.current = false;
    } catch { /* réseau : voix du navigateur pour cette phrase */ }
    return null;
  }, [token, stepId]);

  const lireAudio = useCallback((url) => new Promise((resolve) => {
    const a = new Audio(url);
    audioRef.current = a;
    const fin = () => { URL.revokeObjectURL(url); resolve(); };
    a.onended = fin;
    a.onerror = fin;
    a.play().catch(fin);
  }), []);

  const direNavigateur = useCallback((texte) => new Promise((resolve) => {
    const synth = window.speechSynthesis;
    if (!synth) { resolve(); return; }
    const u = new SpeechSynthesisUtterance(texte);
    u.lang = lang;
    const v = choisirVoix(lang);
    if (v) u.voice = v;
    u.rate = 1.03;
    u.onend = resolve;
    u.onerror = resolve;
    synth.speak(u);
  }), [lang]);

  const prononcer = useCallback((texte) => {
    const propre = texte.trim();
    if (!propre) return;
    setParleIA(true);
    const audio = chargerAudio(propre);
    chaineRef.current = chaineRef.current.then(async () => {
      if (!enAppelRef.current) return;
      const url = await audio;
      if (!enAppelRef.current) return;
      if (url) await lireAudio(url);
      else await direNavigateur(propre);
    });
  }, [chargerAudio, lireAudio, direNavigateur]);

  const recevoirTexteIA = useCallback((delta) => {
    tamponRef.current += delta;
    // Une phrase complète part tout de suite : le personnage commence à parler
    // pendant qu'il « réfléchit » encore à la suite.
    for (;;) {
      const m = tamponRef.current.match(/^([\s\S]*?[.!?…]+)(\s+)/);
      if (!m) break;
      prononcer(m[1]);
      tamponRef.current = tamponRef.current.slice(m[0].length);
    }
  }, [prononcer]);

  // Fin d'une réplique du personnage : on dit le reste, puis on rend la parole
  // une fois la dernière phrase lue.
  const finRepliqueIA = useCallback((apres) => {
    if (tamponRef.current.trim()) prononcer(tamponRef.current);
    tamponRef.current = "";
    chaineRef.current = chaineRef.current.then(() => {
      setParleIA(false);
      apres?.();
    });
  }, [prononcer]);

  // ── Enregistrement et fin d'appel ──
  const cloreAppel = useCallback(async ({ parCandidat }) => {
    if (!enAppelRef.current) return;
    enAppelRef.current = false;
    suspendreEcoute();
    try { reconnaissanceRef.current?.abort(); } catch { /* déjà arrêtée */ }
    try { audioRef.current?.pause(); window.speechSynthesis?.cancel(); } catch { /* rien à couper */ }
    await arreterTour();
    setParleIA(false);
    setPhase("enregistrement");

    let etat = null;
    if (parCandidat) etat = await terminer({ signalerFin: false });

    const enregistreur = enregistreurRef.current;
    const duree = debut ? (Date.now() - debut) / 1000 : 0;
    if (enregistreur && enregistreur.state !== "inactive") {
      await new Promise((resolve) => { enregistreur.onstop = resolve; enregistreur.stop(); });
    }
    const blob = morceauxRef.current.length ? new Blob(morceauxRef.current, { type: enregistreur?.mimeType || "video/webm" }) : null;
    if (blob && blob.size) {
      try {
        const supabase = createClient();
        const ext = blob.type.includes("mp4") ? "mp4" : "webm";
        const path = `${token}/${stepId}_appel_${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from("video-responses").upload(path, blob, { contentType: blob.type, upsert: true });
        if (!error) await savePersonaCallVideo(token, stepId, path, duree);
      } catch { /* l'appel reste noté sur sa transcription, même sans vidéo */ }
    }
    fluxRef.current?.getTracks().forEach((p) => p.stop());
    setPhase("termine");
    signaler(etat || { turns, ended: true });
  }, [debut, suspendreEcoute, terminer, signaler, token, stepId, turns, arreterTour]);

  // Un tour du candidat : on envoie, le personnage répond à voix haute, puis
  // on rend la parole — ou on raccroche s'il a mis fin à l'appel.
  const envoyerTour = useCallback(async (texte) => {
    const propre = texte.trim();
    if (!propre || !enAppelRef.current) return;
    suspendreEcoute();
    phraseRef.current = "";
    tamponRef.current = "";
    // La transcription ElevenLabs de l'audio du tour l'emporte sur celle du
    // navigateur ; sans elle (pas de clé, panne), le texte du navigateur part.
    const audio = await arreterTour();
    let texteFinal = propre;
    if (audio) {
      setTranscription(true);
      texteFinal = (await transcrireTour(audio)) || propre;
      setTranscription(false);
    }
    setSousTitre("");
    const etat = await envoyer(texteFinal, { onDelta: recevoirTexteIA, signalerFin: false });
    finRepliqueIA(() => {
      if (etat?.ended) cloreAppel({ parCandidat: false });
      else if (enAppelRef.current && !micCoupe) demarrerEcoute();
    });
  }, [envoyer, recevoirTexteIA, finRepliqueIA, suspendreEcoute, demarrerEcoute, cloreAppel, micCoupe, arreterTour, transcrireTour]);

  const envoyerTourRef = useRef(envoyerTour);
  useEffect(() => { envoyerTourRef.current = envoyerTour; });

  // ── Démarrage de l'appel ──
  // Sans caméra (refusée ou absente), l'appel reste possible : la
  // reconnaissance vocale écoute le micro de son côté. Seule la vidéo manquera.
  function rejoindre() {
    enAppelRef.current = true;
    setDebut(Date.now());
    setMaintenant(Date.now());
    setPhase("appel");

    // Enregistrement de la caméra et du micro du candidat, tout l'appel.
    if (fluxRef.current) try {
      const type = ["video/webm;codecs=vp8,opus", "video/webm", "video/mp4"].find((m) => window.MediaRecorder?.isTypeSupported?.(m));
      const enregistreur = new MediaRecorder(fluxRef.current, type ? { mimeType: type, videoBitsPerSecond: 600_000 } : undefined);
      morceauxRef.current = [];
      enregistreur.ondataavailable = (e) => { if (e.data?.size) morceauxRef.current.push(e.data); };
      enregistreur.start(1000);
      enregistreurRef.current = enregistreur;
    } catch { /* sans enregistrement, l'appel reste noté sur sa transcription */ }

    if (vocal) {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      const r = new SR();
      r.lang = lang;
      r.continuous = true;
      r.interimResults = true;
      r.onresult = (e) => {
        if (!ecouteRef.current) return;
        let provisoire = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const res = e.results[i];
          if (res.isFinal) phraseRef.current = `${phraseRef.current} ${res[0].transcript}`.trim();
          else provisoire += res[0].transcript;
        }
        setSousTitre(`${phraseRef.current} ${provisoire}`.trim());
        // Fin de tour : un silence après une phrase reconnue — plus long si la
        // phrase s'arrête sur un mot qui appelle une suite. Tant que le
        // candidat parle (résultat provisoire), rien ne part.
        clearTimeout(silenceRef.current);
        if (phraseRef.current && !provisoire && envoiAutoRef.current) {
          const delai = delaiFinDeTour(phraseRef.current);
          setFinTour({ ms: delai, cle: Date.now() });
          silenceRef.current = setTimeout(() => {
            const texte = phraseRef.current;
            phraseRef.current = "";
            setFinTour(null);
            envoyerTourRef.current(texte);
          }, delai);
        } else {
          setFinTour(null);
        }
      };
      // Le navigateur coupe l'écoute continue de lui-même au bout d'un temps :
      // on la relance tant que c'est au candidat de parler.
      r.onend = () => { if (ecouteRef.current && enAppelRef.current) { try { r.start(); } catch { /* déjà relancée */ } } };
      r.onerror = () => { /* « no-speech » et consorts : onend relance */ };
      reconnaissanceRef.current = r;
    }

    // Le personnage décroche : s'il a une réplique d'ouverture, il la dit.
    const ouverture = persona?.opening_message && !messages.some((m) => m.role === "candidate") ? persona.opening_message : "";
    if (ouverture) {
      tamponRef.current = "";
      recevoirTexteIA(`${ouverture} `);
      finRepliqueIA(() => { if (vocal && enAppelRef.current) demarrerEcoute(); });
    } else if (vocal) {
      demarrerEcoute();
    }
  }

  // Auto ↔ manuel. En manuel, rien ne part tant que le candidat n'a pas cliqué
  // « J'ai terminé » : pour qui réfléchit à voix haute, c'est la seule garantie
  // de ne jamais être coupé.
  function basculerEnvoi() {
    const auto = !envoiAuto;
    setEnvoiAuto(auto);
    envoiAutoRef.current = auto;
    if (!auto) { clearTimeout(silenceRef.current); setFinTour(null); }
  }

  function envoyerMaintenant() {
    clearTimeout(silenceRef.current);
    setFinTour(null);
    const texte = phraseRef.current || sousTitre;
    phraseRef.current = "";
    envoyerTour(texte);
  }

  function basculerMicro() {
    const coupe = !micCoupe;
    setMicCoupe(coupe);
    fluxRef.current?.getAudioTracks().forEach((p) => { p.enabled = !coupe; });
    if (coupe) suspendreEcoute();
    else if (!sending && !parleIA) demarrerEcoute();
  }

  function envoyerSaisie() {
    const texte = saisie.trim();
    if (!texte || sending || parleIA) return;
    setSaisie("");
    envoyerTour(texte);
  }

  const duree = debut ? Math.max(0, Math.floor((maintenant - debut) / 1000)) : 0;
  const chrono = `${Math.floor(duree / 60)}:${String(duree % 60).padStart(2, "0")}`;
  const derniereIA = [...messages].reverse().find((m) => m.role === "persona");
  const etatIA = parleIA ? t("candidate.call.speaking")
    : transcription ? t("candidate.call.transcribing")
      : sending ? t("candidate.call.thinking") : t("candidate.call.listening");

  // ── Appel déjà passé (rechargement de la page) ou terminé ──
  if (phase === "termine" || (ended && phase === "lobby")) {
    const finTexte = endedBy === "persona" ? t("candidate.persona.endedByPersona", { name: persona?.name || "" })
      : endedBy === "limit" ? t("candidate.persona.endedByLimit")
        : t("candidate.call.ended");
    return (
      <div style={{ border: "1px solid var(--border)", borderTop: `3px solid ${primary}`, borderRadius: 16, background: "#ffffff", padding: "1.5rem", textAlign: "center" }}>
        <PhoneOff size={22} style={{ color: "var(--muted-foreground)", marginBottom: 8 }} />
        <p style={{ fontSize: 14, margin: 0 }}>{finTexte}</p>
        <p style={{ fontSize: 12.5, color: "var(--muted-foreground)", margin: "6px 0 0" }}>{t("candidate.call.endedHint")}</p>
      </div>
    );
  }

  if (phase === "enregistrement") {
    return (
      <div style={{ border: "1px solid var(--border)", borderRadius: 16, background: "#ffffff", padding: "1.5rem", textAlign: "center", fontSize: 14 }}>
        <Loader2 size={20} style={{ animation: "spin 1s linear infinite", marginBottom: 8 }} />
        <p style={{ margin: 0 }}>{t("candidate.call.saving")}</p>
      </div>
    );
  }

  const tuileIA = (grande) => (
    <div style={{ position: "relative", background: "#3c4043", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", aspectRatio: "16 / 9", minWidth: 0 }}>
      <div style={{
        width: grande ? 96 : 64, height: grande ? 96 : 64, borderRadius: "50%", background: "#5f6368", color: "#ffffff",
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: grande ? 34 : 22, fontWeight: 600,
        boxShadow: parleIA ? `0 0 0 4px ${primary}, 0 0 0 9px ${primary}55` : "none", transition: "box-shadow .2s",
      }}>{initiales(persona?.name)}</div>
      <span style={{ position: "absolute", left: 12, bottom: 10, color: "#ffffff", fontSize: 13, fontWeight: 600, textShadow: "0 1px 2px rgba(0,0,0,.6)" }}>
        {persona?.name}{persona?.role ? ` · ${persona.role}` : ""}
      </span>
    </div>
  );

  const tuileCandidat = (
    <div style={{ position: "relative", background: "#202124", borderRadius: 14, overflow: "hidden", aspectRatio: "16 / 9", minWidth: 0 }}>
      <video ref={videoRef} autoPlay muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }} />
      {erreurCamera && <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, textAlign: "center", color: "#e8eaed", fontSize: 13 }}>{erreurCamera}</span>}
      <span style={{ position: "absolute", left: 12, bottom: 10, color: "#ffffff", fontSize: 13, fontWeight: 600, textShadow: "0 1px 2px rgba(0,0,0,.6)", display: "flex", alignItems: "center", gap: 6 }}>
        {micCoupe && <MicOff size={14} />} {t("candidate.call.you")}
      </span>
    </div>
  );

  // ── Lobby : on se voit, on lit la situation, on rejoint ──
  if (phase === "lobby") {
    return (
      <div style={{ border: "1px solid var(--border)", borderTop: `3px solid ${primary}`, borderRadius: 16, background: "#ffffff", padding: "1.25rem", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14, alignItems: "center" }}>
          {tuileCandidat}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted-foreground)", marginBottom: 6 }}>{t("candidate.call.lobbyTitle")}</div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>{persona?.name}</div>
            <div style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 10 }}>{[persona?.role, persona?.company].filter(Boolean).join(" · ")}</div>
            {persona?.context && <p style={{ fontSize: 13.5, lineHeight: 1.55, margin: "0 0 12px", whiteSpace: "pre-wrap", overflowWrap: "break-word" }}>{persona.context}</p>}
            <button type="button" onClick={rejoindre} disabled={!loaded || (!cameraPrete && !erreurCamera)}
              style={{ ...primaryBtn(primary, !loaded || (!cameraPrete && !erreurCamera)), borderRadius: 99, padding: "0.75rem 1.6rem" }}>
              <Phone size={16} /> {t("candidate.call.join")}
            </button>
          </div>
        </div>
        <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: 0, lineHeight: 1.5 }}>
          {vocal ? t("candidate.call.howItWorks") : t("candidate.call.noSpeechSupport")}
        </p>
      </div>
    );
  }

  // ── En appel ──
  return (
    <div style={{ background: "#202124", borderRadius: 16, padding: 12, display: "flex", flexDirection: "column", gap: 10, color: "#e8eaed" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12.5, padding: "0 4px" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ea4335" }} /> {t("candidate.call.recording")} · {chrono}
        </span>
        <span>{etatIA}</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>
        {tuileIA(true)}
        {tuileCandidat}
      </div>

      {/* Sous-titres : la dernière réplique du personnage, et ce que dit le candidat. */}
      <div style={{ background: "rgba(0,0,0,.35)", borderRadius: 10, padding: "10px 14px", fontSize: 14.5, lineHeight: 1.5, minHeight: 64 }}>
        {derniereIA && <div><strong style={{ color: "#ffffff" }}>{persona?.name} :</strong> {derniereIA.content}</div>}
        {sousTitre && <div style={{ marginTop: 4, color: "#bdc1c6" }}><strong style={{ color: "#ffffff" }}>{t("candidate.call.you")} :</strong> {sousTitre}</div>}
        {/* Compte à rebours avant l'envoi : le candidat voit que son silence va
            être pris pour une fin — il lui suffit de reprendre la parole. */}
        {finTour && (
          <div style={{ marginTop: 8 }}>
            <style>{"@keyframes onbord-fin-tour { from { width: 100%; } to { width: 0%; } }"}</style>
            <div style={{ height: 3, background: "rgba(255,255,255,.12)", borderRadius: 99, overflow: "hidden" }}>
              <div key={finTour.cle} style={{ height: "100%", background: "#8ab4f8", animation: `onbord-fin-tour ${finTour.ms}ms linear forwards` }} />
            </div>
            <div style={{ fontSize: 11.5, color: "#9aa0a6", marginTop: 4 }}>{t("candidate.call.sendingSoon")}</div>
          </div>
        )}
        {!envoiAuto && sousTitre && !sending && !parleIA && (
          <div style={{ fontSize: 11.5, color: "#9aa0a6", marginTop: 8 }}>{t("candidate.call.manualHint")}</div>
        )}
      </div>

      {/* Sans reconnaissance vocale (Firefox) : le candidat tape, le personnage parle. */}
      {!vocal && (
        <div style={{ display: "flex", gap: 8 }}>
          <input value={saisie} onChange={(e) => setSaisie(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") envoyerSaisie(); }}
            placeholder={t("candidate.call.typeInstead")}
            style={{ flex: 1, minWidth: 0, borderRadius: 10, border: "1px solid #5f6368", background: "#303134", color: "#e8eaed", padding: "10px 12px", fontSize: 14, fontFamily: "inherit" }} />
          <button type="button" onClick={envoyerSaisie} disabled={sending || parleIA || !saisie.trim()}
            style={{ borderRadius: 10, border: "none", background: primary, color: getContrastColor(primary), padding: "0 14px", cursor: "pointer" }}><Send size={16} /></button>
        </div>
      )}

      {/* Barre de commandes */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, paddingTop: 2 }}>
        {vocal && (
          <button type="button" onClick={basculerMicro} aria-label={micCoupe ? t("candidate.call.unmute") : t("candidate.call.mute")}
            style={{ width: 48, height: 48, borderRadius: "50%", border: "none", background: micCoupe ? "#ea4335" : "#3c4043", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            {micCoupe ? <MicOff size={20} /> : <Mic size={20} />}
          </button>
        )}
        {vocal && (
          <button type="button" onClick={basculerEnvoi} title={t(envoiAuto ? "candidate.call.autoHint" : "candidate.call.manualHint")}
            style={{ height: 48, borderRadius: 24, border: "none", background: envoiAuto ? "#3c4043" : "#8ab4f8", color: envoiAuto ? "#ffffff" : "#202124", padding: "0 14px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>
            {envoiAuto ? <Timer size={16} /> : <Hand size={16} />}
            {envoiAuto ? t("candidate.call.autoSend") : t("candidate.call.manualSend")}
          </button>
        )}
        {vocal && sousTitre && !sending && !parleIA && !transcription && (
          <button type="button" onClick={envoyerMaintenant}
            style={{ height: 48, borderRadius: 24, border: "none", background: envoiAuto ? "#3c4043" : primary, color: envoiAuto ? "#ffffff" : getContrastColor(primary), padding: "0 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            {t("candidate.call.doneSpeaking")}
          </button>
        )}
        <button type="button" onClick={() => cloreAppel({ parCandidat: true })} aria-label={t("candidate.call.hangUp")}
          style={{ width: 64, height: 48, borderRadius: 24, border: "none", background: "#ea4335", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <PhoneOff size={20} />
        </button>
        <button type="button" onClick={() => setTranscriptionVisible((v) => !v)} aria-label={t("candidate.call.transcript")}
          style={{ width: 48, height: 48, borderRadius: "50%", border: "none", background: transcriptionVisible ? "#8ab4f8" : "#3c4043", color: transcriptionVisible ? "#202124" : "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <MessageSquareText size={20} />
        </button>
      </div>
      <div style={{ textAlign: "center", fontSize: 11.5, color: "#9aa0a6" }}>
        {typeof remaining === "number" ? t("candidate.persona.remaining", { count: remaining }) : ""}
      </div>

      {transcriptionVisible && (
        <div style={{ background: "#303134", borderRadius: 10, padding: "10px 14px", maxHeight: 220, overflowY: "auto", fontSize: 13, lineHeight: 1.55 }}>
          {messages.filter((m) => m.role !== "system").map((m, i) => (
            <div key={i} style={{ marginBottom: 6 }}>
              <strong style={{ color: m.role === "candidate" ? "#8ab4f8" : "#ffffff" }}>{m.role === "candidate" ? t("candidate.call.you") : persona?.name} :</strong> {m.content}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PersonaSandbox({ persona, token, stepId, onChange, primary = DEFAULT_PRIMARY, compact = false }) {
  const conv = usePersonaConversation({ persona, token, stepId, onChange });
  if (persona?.mode === "chat") return <PersonaChat persona={persona} conv={conv} primary={primary} compact={compact} />;
  return <PersonaCall persona={persona} conv={conv} token={token} stepId={stepId} primary={primary} />;
}
