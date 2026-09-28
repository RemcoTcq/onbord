"""Voix off et minutage.

Synthétise chaque phrase de script.json (Kokoro, voix française ff_siwis),
puis cale le tout sur la grille rythmique de la musique : chaque scène
commence sur un temps fort, et tout le reste (musique, mixage, animation)
lit timeline.json.

Usage : python3 voice.py <dossier des modèles> <dossier de build>
"""
import json, math, os, sys
import soundfile as sf
from kokoro_onnx import Kokoro

HERE = os.path.dirname(os.path.abspath(__file__))
BPM = 100
BEAT = 60 / BPM
LEAD = 0.45      # silence avant la première phrase d'une scène
GAP = 0.32       # respiration entre deux phrases
TAIL = 0.55      # silence minimal après la dernière phrase
STEP = 2 * BEAT  # les scènes se calent sur des demi-mesures
TAIL_SCENES = {"reveal": 1.2, "outro": 4.0}  # laisser respirer la musique

models, build = sys.argv[1], sys.argv[2]
vo_dir = os.path.join(build, "vo")
os.makedirs(vo_dir, exist_ok=True)
k = Kokoro(os.path.join(models, "kokoro-v1.0.onnx"), os.path.join(models, "voices-v1.0.bin"))

# Une intro instrumentale de deux mesures avant la première phrase.
t = 4 * BEAT
scenes = []
for scene in json.load(open(os.path.join(HERE, "script.json"))):
    start = t
    cursor = start + LEAD
    lines = []
    for i, line in enumerate(scene["lines"]):
        samples, sr = k.create(line.get("say", line["text"]), voice="ff_siwis", speed=0.97, lang="fr-fr")
        path = os.path.join(vo_dir, f"{scene['id']}-{i}.wav")
        sf.write(path, samples, sr)
        dur = len(samples) / sr
        lines.append({"text": line["text"], "wav": path, "start": round(cursor, 3), "end": round(cursor + dur, 3)})
        cursor += dur + GAP
    end_speech = cursor - GAP
    length = math.ceil((end_speech - start + TAIL_SCENES.get(scene["id"], TAIL)) / STEP) * STEP
    t = start + length
    scenes.append({"id": scene["id"], "start": round(start, 3), "end": round(t, 3), "lines": lines})
    print(f"{scene['id']:10s} {start:6.2f} → {t:6.2f}")

json.dump({"bpm": BPM, "duration": round(t, 3), "scenes": scenes},
          open(os.path.join(build, "timeline.json"), "w"), ensure_ascii=False, indent=2)
print("total", round(t, 2), "s")
