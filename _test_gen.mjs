import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth:{persistSession:false} });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const { data: J } = await admin.from("jobs").select("title, description, extracted_criteria").limit(1).single();

const prompt = `Conçois une EXPÉRIENCE DE PRÉSÉLECTION pour "${J.title}". 6 étapes, dont ≥2 tâches réalistes. Pour CHAQUE étape non-qualifying, génère 2-3 critères BARS : chaque niveau (1,3,5) avec une description comportementale ET un exemple concret (mini-verbatim entre guillemets). Description offre: ${(J.description||"").slice(0,800)}. PRÉCISIONS RECRUTEUR: ton direct, clients PME belges exigeants, éviter le jargon, tâches ancrées sur des cas réels de relance et de closing. Réponds UNIQUEMENT en JSON: {"estimated_minutes":N,"steps":[{"kind","title","prompt","response_format","sandbox_kind","ai_assistant_allowed","criteria":[{"name","bars_levels":[{"level","label","description"}]}]}]}`;

for (const mt of [4000, 8000]) {
  const r = await anthropic.messages.create({ model:"claude-sonnet-4-6", max_tokens:mt, temperature:0.4, system:"Réponds UNIQUEMENT avec un JSON valide.", messages:[{role:"user",content:prompt}] });
  const text = r.content[0]?.text || "";
  let parseOk=false, steps=0;
  const m = text.match(/\{[\s\S]*\}/);
  if (m) { try { const p=JSON.parse(m[0]); parseOk=true; steps=(p.steps||[]).length; } catch{} }
  console.log(`max_tokens=${mt} | stop_reason=${r.stop_reason} | chars=${text.length} | JSON parse=${parseOk?"OK ✅ ("+steps+" steps)":"ÉCHEC ❌"}`);
}
