// Helper de transcription AssemblyAI, partagé par les steps en format "video".
// (Extrait de l'ancienne route /api/video-interview, vouée à disparaître.)
export async function transcribeAudio(audioUrl) {
  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) throw new Error("ASSEMBLYAI_API_KEY not configured");

  const submitRes = await fetch("https://api.assemblyai.com/v2/transcript", {
    method: "POST",
    headers: { authorization: apiKey, "content-type": "application/json" },
    body: JSON.stringify({ audio_url: audioUrl, language_detection: true, punctuate: true, format_text: true }),
  });
  const { id } = await submitRes.json();

  const pollUrl = `https://api.assemblyai.com/v2/transcript/${id}`;
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const pollRes = await fetch(pollUrl, { headers: { authorization: apiKey } });
    const data = await pollRes.json();
    if (data.status === "completed") return data.text || "";
    if (data.status === "error") throw new Error("Transcription error: " + data.error);
  }
  throw new Error("Transcription timeout");
}
