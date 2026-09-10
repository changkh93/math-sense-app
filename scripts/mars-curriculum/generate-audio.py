"""Original deterministic sound design and an original 16-second ambient loop."""
from pathlib import Path
import math
import random
import struct
import subprocess
import tempfile
import wave

ROOT = Path(__file__).resolve().parents[2] / 'public/mars-expedition/assets/sounds'
ROOT.mkdir(parents=True, exist_ok=True)
RATE = 22050


def write(name, values):
    peak = max(abs(value) for value in values) or 1
    gain = min(1, 0.72 / peak)
    with tempfile.TemporaryDirectory() as folder:
        path = Path(folder) / 'sound.wav'
        with wave.open(str(path), 'wb') as output:
            output.setparams((1, 2, RATE, 0, 'NONE', 'not compressed'))
            output.writeframes(b''.join(struct.pack('<h', round(value * gain * 32767)) for value in values))
        subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(path),
                        '-c:a', 'libvorbis', '-q:a', '4', str(ROOT / f'{name}.ogg')], check=True)


def effect(name, duration, start, end, noise=0):
    rng = random.Random(name)
    phase = 0.0
    values = []
    for index in range(round(duration * RATE)):
        time = index / RATE
        fraction = time / duration
        phase += 2 * math.pi * (start + (end - start) * fraction) / RATE
        envelope = min(1, time / 0.008) * (1 - fraction) ** 1.8
        values.append(envelope * (0.36 * math.sin(phase) + 0.08 * math.sin(2 * phase) + noise * rng.uniform(-1, 1)))
    write(name, values)


for spec in [('jump', .22, 320, 980, 0), ('pulse', .15, 1450, 480, .02),
             ('portal', .65, 180, 1250, .015), ('hurt', .3, 180, 75, .1),
             ('robot_down', .38, 480, 95, .06), ('robot_clear', .18, 850, 220, .08),
             ('collect', .42, 700, 1400, 0), ('signal_lost', .4, 600, 180, .015)]:
    effect(*spec)

# Frequencies are integer multiples of 1/16 Hz, so the sustained pad wraps smoothly.
values = []
notes = [220, 261.625, 329.625, 392, 329.625, 261.625, 293.625, 392]
for index in range(16 * RATE):
    time = index / RATE
    beat = time % 0.5
    pitch = notes[int(time / 0.5) % len(notes)]
    pluck = 0.09 * math.sin(2 * math.pi * pitch * beat) * min(1, beat / .01) * math.exp(-10 * beat)
    pad = sum(math.sin(2 * math.pi * frequency * time) for frequency in [110, 164.8125, 220]) * .035
    values.append(pad + pluck)
write('expedition', values)
print('Generated eight original effects and one original music loop')
