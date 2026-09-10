"""Original, deterministic arcade effects. Run by maintainers, never by learners."""
from pathlib import Path
import math
import random
import struct
import subprocess
import tempfile
import wave

ROOT = Path(__file__).resolve().parents[1] / "public/space-invaders/assets"
ROOT.mkdir(parents=True, exist_ok=True)
RATE = 44100


def synth(name, length, start, end, noise=0.0, notes=None):
    rng = random.Random(name)
    phase = 0.0
    samples = []
    for index in range(int(length * RATE)):
        time = index / RATE
        position = time / length
        frequency = start + (end - start) * position
        if notes:
            frequency = notes[min(len(notes) - 1, int(position * len(notes)))]
        phase += 2 * math.pi * frequency / RATE
        envelope = min(1, time / 0.008) * (1 - position) ** 1.5
        tone = 0.65 * math.sin(phase) + 0.15 * math.sin(phase * 2)
        value = 0.42 * envelope * (tone + noise * rng.uniform(-1, 1))
        samples.append(struct.pack('<h', int(max(-1, min(1, value)) * 32767)))
    with tempfile.TemporaryDirectory() as folder:
        wav = Path(folder) / 'effect.wav'
        with wave.open(str(wav), 'wb') as output:
            output.setparams((1, 2, RATE, 0, 'NONE', 'not compressed'))
            output.writeframes(b''.join(samples))
        subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(wav),
                        '-c:a', 'libvorbis', '-q:a', '4', str(ROOT / name)], check=True)


synth('scout_pulse.ogg', 0.18, 1150, 350)
synth('raider_pulse.ogg', 0.28, 310, 120, noise=0.06)
synth('raider_break.ogg', 0.30, 680, 85, noise=0.38)
synth('shield_hit.ogg', 0.48, 210, 65, noise=0.22)
synth('line_alert.ogg', 0.80, 0, 0, notes=[440, 330, 440, 220])
synth('wave_ready.ogg', 0.80, 0, 0, notes=[392, 494, 587, 784])
print('Generated six original OGG effects.')
