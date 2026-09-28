#!/usr/bin/env bash
# Fabrique onbord-film.mp4 de bout en bout : voix off → musique et mixage →
# animation image par image → assemblage. Voir README.md.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
BUILD="${BUILD:-$HERE/.build}"
MODELS="${MODELS:-$BUILD/models}"
mkdir -p "$BUILD" "$MODELS"

pip install -q numpy scipy soundfile kokoro-onnx imageio-ffmpeg
[ -d "$HERE/node_modules/playwright" ] || (cd "$HERE" && npm install --no-save playwright@1.56.1)
FFMPEG="${FFMPEG:-$(command -v ffmpeg || python3 -c 'import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())')}"

# Modèle de synthèse vocale (Kokoro, licence Apache 2.0), ~350 Mo, une seule fois.
REL=https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0
for f in kokoro-v1.0.onnx voices-v1.0.bin; do
  [ -s "$MODELS/$f" ] || curl -sSL -o "$MODELS/$f" "$REL/$f"
done

python3 "$HERE/voice.py" "$MODELS" "$BUILD"
python3 "$HERE/music.py" "$BUILD"
FFMPEG="$FFMPEG" node "$HERE/render.mjs" "$BUILD"

"$FFMPEG" -y -loglevel error -i "$BUILD/frames.mp4" -i "$BUILD/mix.wav" \
  -c:v copy -c:a aac -b:a 192k -af "loudnorm=I=-14:TP=-1.5:LRA=11" -ar 48000 -shortest \
  -movflags +faststart "$HERE/onbord-film.mp4"
echo "→ $HERE/onbord-film.mp4"
