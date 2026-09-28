"""Musique, bruitages et mixage final.

Tout est synthétisé ici, sans échantillon ni banque de sons : aucune question
de droits sur la bande-son.

Deux humeurs, calées sur timeline.json :
  - le PROBLÈME (jusqu'à la scène « reveal ») : la mineur, nappe sourde,
    battement de cœur et tic-tac d'horloge ;
  - la SOLUTION (à partir de « reveal ») : do majeur, I-V-vi-IV, batterie
    complète, arpèges, basse. Une montée de bruit amène la bascule.

La musique s'efface sous la voix (compression latérale sur l'enveloppe de la
voix off), puis tout est écrit dans mix.wav.

Usage : python3 music.py <dossier de build>
"""
import json, os, sys
import numpy as np
import soundfile as sf
from scipy.signal import lfilter

SR = 44100
build = sys.argv[1]
tl = json.load(open(os.path.join(build, "timeline.json")))
BEAT = 60 / tl["bpm"]
BAR = 4 * BEAT
DUR = tl["duration"]
N = int(DUR * SR) + SR
scene = {s["id"]: s for s in tl["scenes"]}
DROP = scene["reveal"]["start"]
OUTRO = scene["outro"]["start"]
rng = np.random.default_rng(7)

L = np.zeros(N)
R = np.zeros(N)


def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def add(sig, t, gain=1.0, pan=0.0):
    i = int(t * SR)
    if i >= N:
        return
    sig = sig[: N - i]
    L[i:i + len(sig)] += sig * gain * np.sqrt((1 - pan) / 2)
    R[i:i + len(sig)] += sig * gain * np.sqrt((1 + pan) / 2)


def env(n, a=0.01, r=0.1):
    e = np.ones(n)
    na, nr = int(a * SR), int(r * SR)
    if na:
        e[:na] = np.linspace(0, 1, na)
    if nr:
        e[-nr:] *= np.linspace(1, 0, nr)
    return e


def additive(freq, dur, harmonics, detune=0.0, phase=None):
    t = np.arange(int(dur * SR)) / SR
    out = np.zeros_like(t)
    for h in range(1, harmonics + 1):
        f = freq * h * (1 + detune)
        if f > SR / 2.2:
            break
        ph = rng.uniform(0, 2 * np.pi) if phase is None else phase
        out += np.sin(2 * np.pi * f * t + ph) / h
    return out


def lowpass(x, cutoff):
    """Passe-bas à un pôle, appliqué deux fois (12 dB/oct)."""
    a = np.exp(-2 * np.pi * cutoff / SR)
    return lfilter([(1 - a) ** 2], [1, -2 * a, a * a], x)


def highpass(x, cutoff):
    return x - lowpass(x, cutoff)


# ---------------------------------------------------------------- instruments

def pad(notes, t, dur, bright):
    sig = np.zeros(int(dur * SR))
    for n in notes:
        for d in (-0.004, 0.0, 0.0045):
            sig += additive(midi(n), dur, bright, detune=d)
    sig *= env(len(sig), a=min(0.6, dur / 3), r=min(0.8, dur / 3)) / (len(notes) * 3)
    add(sig, t, 0.22, pan=-0.2)
    add(np.roll(sig, int(0.013 * SR)), t, 0.22, pan=0.2)


def pluck(n, t, gain=0.1, pan=0.0):
    dur = 0.5
    tt = np.arange(int(dur * SR)) / SR
    f = midi(n)
    sig = (np.sin(2 * np.pi * f * tt) + 0.5 * np.sin(4 * np.pi * f * tt) * np.exp(-tt * 18)
           + 0.25 * np.sin(6 * np.pi * f * tt) * np.exp(-tt * 30))
    sig *= np.exp(-tt * 7) * env(len(sig), 0.002, 0.05)
    add(sig, t, gain, pan)
    add(sig, t + 3 * BEAT / 4, gain * 0.35, -pan or 0.5)  # écho pointé


def bass(n, t, dur, gain=0.32):
    tt = np.arange(int(dur * SR)) / SR
    f = midi(n)
    sig = np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(4 * np.pi * f * tt) + 0.1 * np.sin(6 * np.pi * f * tt)
    sig *= env(len(sig), 0.005, 0.06) * np.exp(-tt * 1.5)
    add(sig, t, gain)


def kick(t, gain=0.75, soft=False):
    dur = 0.45
    tt = np.arange(int(dur * SR)) / SR
    f = 45 + (130 if not soft else 70) * np.exp(-tt * 30)
    ph = 2 * np.pi * np.cumsum(f) / SR
    sig = np.sin(ph) * np.exp(-tt * (7 if not soft else 10))
    add(sig, t, gain)


def noise_burst(dur, decay, hp=None, lp=None):
    sig = rng.standard_normal(int(dur * SR))
    if lp:
        sig = lowpass(sig, lp)
    if hp:
        sig = highpass(sig, hp)
    tt = np.arange(len(sig)) / SR
    return sig * np.exp(-tt * decay)


HAT = noise_burst(0.08, 60, hp=7000)
CLAP = noise_burst(0.25, 18, hp=900, lp=5000)
TICK = noise_burst(0.03, 150, hp=3000)


def hat(t, gain=0.07, pan=0.3):
    add(HAT, t, gain, pan)


def clap(t, gain=0.35):
    add(CLAP, t, gain, -0.1)
    add(CLAP, t + 0.012, gain * 0.6, 0.2)


# ---------------------------------------------------------------- composition

# Problème : la mineur, i - VI - III - VII.
MINOR = [(57, [57, 60, 64]), (53, [53, 57, 60]), (48, [55, 60, 64]), (55, [55, 59, 62])]
# Solution : do majeur, I - V - vi - IV.
MAJOR = [(48, [60, 64, 67, 71]), (55, [59, 62, 67, 69]), (57, [60, 64, 69, 71]), (53, [60, 65, 69, 72])]

bar_t = 0.0
i = 0
while bar_t < DUR - 0.01:
    solution = bar_t >= DROP - 1e-6
    outro_tail = bar_t >= OUTRO + 2 * BAR - 1e-6
    prog = MAJOR if solution else MINOR
    root, chord = prog[i % 4]
    bar_len = min(BAR, DUR - bar_t)

    if outro_tail:
        # Accord final tenu : do majeur, qui s'éteint.
        pad([48, 55, 60, 64, 67, 72], bar_t, DUR - bar_t + 0.5, 10)
        bass(36, bar_t, DUR - bar_t, 0.3)
        kick(bar_t, 0.8)
        add(noise_burst(3.0, 1.3, hp=4000), bar_t, 0.08)
        break

    if not solution:
        pad(chord + [chord[0] - 12], bar_t, bar_len + 0.3, 5)
        bass(root - 12, bar_t, bar_len, 0.22)
        for b in range(4):
            bt = bar_t + b * BEAT
            if bar_t >= 2 * BEAT:  # le tic-tac démarre avec la voix
                add(TICK, bt, 0.10, 0.4)
                add(TICK, bt + BEAT / 2, 0.05, -0.4)
            if b in (0, 2) and bar_t >= BAR:  # battement de cœur
                kick(bt, 0.45, soft=True)
                kick(bt + 0.22, 0.28, soft=True)
    else:
        pad(chord, bar_t, bar_len + 0.3, 12)
        for b in range(4):
            bt = bar_t + b * BEAT
            kick(bt, 0.6)
            if b in (1, 3):
                clap(bt, 0.28)
            hat(bt + BEAT / 2, 0.08)
            hat(bt + BEAT / 4, 0.03, -0.3)
            hat(bt + 3 * BEAT / 4, 0.03, -0.3)
            bass(root - 12, bt, BEAT / 2 - 0.02, 0.3)
            bass(root, bt + BEAT / 2, BEAT / 2 - 0.02, 0.18)
        arp = chord + [chord[1] + 12]
        for s in range(8):
            pluck(arp[s % len(arp)] + 12, bar_t + s * BEAT / 2, 0.075, pan=0.35 if s % 2 else -0.35)
    bar_t += BAR
    i += 1

# ---------------------------------------------------------------- bruitages

def riser(dur):
    tt = np.arange(int(dur * SR)) / SR
    sig = rng.standard_normal(len(tt))
    sig = highpass(sig, 1500) * (tt / dur) ** 2.5
    sweep = np.sin(2 * np.pi * np.cumsum(200 + 1600 * (tt / dur) ** 2) / SR) * (tt / dur) ** 3
    return sig * 0.5 + sweep * 0.25


def whoosh(dur=0.7):
    tt = np.arange(int(dur * SR)) / SR
    sig = lowpass(rng.standard_normal(len(tt)), 2500)
    shape = np.sin(np.pi * tt / dur) ** 2
    return sig * shape


def impact():
    tt = np.arange(int(2.2 * SR)) / SR
    boom = np.sin(2 * np.pi * np.cumsum(38 + 80 * np.exp(-tt * 12)) / SR) * np.exp(-tt * 2.2)
    air = highpass(rng.standard_normal(len(tt)), 3000) * np.exp(-tt * 3)
    return boom + 0.25 * air


def ding(n=84):
    tt = np.arange(int(1.2 * SR)) / SR
    f = midi(n)
    sig = (np.sin(2 * np.pi * f * tt) + 0.4 * np.sin(2 * np.pi * f * 2.76 * tt) * np.exp(-tt * 6)) * np.exp(-tt * 4)
    return sig * env(len(sig), 0.002, 0.05)


def click():
    return noise_burst(0.025, 220, hp=2000) + 0.5 * np.sin(2 * np.pi * 1800 * np.arange(int(0.025 * SR)) / SR) * np.exp(-np.arange(int(0.025 * SR)) / SR * 200)


add(riser(2 * BAR), DROP - 2 * BAR, 0.35)
add(impact(), DROP, 0.9)
for s in tl["scenes"][1:]:
    if s["id"] != "reveal":
        add(whoosh(), s["start"] - 0.35, 0.16, pan=rng.uniform(-0.5, 0.5))
# Repères synchronisés avec l'animation (voir index.html, même décalage).
add(click(), scene["send"]["start"] + 1.35, 0.5)
add(ding(88), scene["send"]["start"] + 1.4, 0.12)
for k in range(5):
    add(ding([79, 83, 86, 88, 91][k]), scene["answer"]["start"] + 0.6 + 0.2 * k, 0.09, pan=-0.6 + 0.3 * k)
add(impact(), OUTRO, 0.45)

# ---------------------------------------------------------------- réverbération

def reverb(x, secs=1.8, mix=0.18):
    n = int(secs * SR)
    ir = rng.standard_normal(n) * np.exp(-np.arange(n) / SR * 3.2)
    ir = lowpass(ir, 6000)
    size = 1 << int(np.ceil(np.log2(len(x) + n)))
    wet = np.fft.irfft(np.fft.rfft(x, size) * np.fft.rfft(ir, size), size)[: len(x)]
    wet *= np.sqrt(np.mean(x ** 2)) / (np.sqrt(np.mean(wet ** 2)) + 1e-9)
    return x + mix * wet


music = np.stack([reverb(L), reverb(R)], axis=1)

# Fondu d'entrée court, fondu de sortie sur les deux dernières secondes.
fade_in = np.minimum(1, np.arange(N) / (0.3 * SR))
fade_out = np.clip((DUR - np.arange(N) / SR) / 2.5, 0, 1)
music *= (fade_in * fade_out)[:, None]

# ---------------------------------------------------------------- voix off

vo = np.zeros(N)
for s in tl["scenes"]:
    for line in s["lines"]:
        v, sr = sf.read(line["wav"])
        if sr != SR:
            idx = np.arange(0, len(v), sr / SR)
            v = np.interp(idx, np.arange(len(v)), v)
        i0 = int(line["start"] * SR)
        vo[i0:i0 + len(v)] += v[: N - i0]
vo = highpass(vo, 90)
vo *= 0.5 / (np.max(np.abs(vo)) + 1e-9)
vo_st = np.stack([vo, vo], axis=1)
vo_st = reverb(vo_st[:, 0], 0.6, 0.04)[:, None].repeat(2, axis=1)

# Compression latérale : la musique baisse de ~9 dB quand la voix parle.
level = lowpass(np.abs(vo), 6)
duck = 1 - 0.65 * np.clip(level / (np.percentile(level[level > 1e-4], 60) + 1e-9), 0, 1)
music *= duck[:, None]

music *= 0.5 / (np.max(np.abs(music)) + 1e-9)
mix = music * 0.55 + vo_st
mix /= np.max(np.abs(mix)) * 1.05
mix = mix[: int(DUR * SR)]
sf.write(os.path.join(build, "mix.wav"), mix, SR)
sf.write(os.path.join(build, "music.wav"), music[: int(DUR * SR)] / (np.max(np.abs(music)) + 1e-9) * 0.9, SR)
print("mix.wav", round(len(mix) / SR, 2), "s")
