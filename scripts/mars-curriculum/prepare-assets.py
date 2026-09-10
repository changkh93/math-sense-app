"""Technical atlas slicing/downscaling; visual masters are built-in imagegen outputs."""
from pathlib import Path
import json
import shutil
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
ART = ROOT / 'docs/collaboration/tasks/20260910-zombie-knight-curriculum/art'
OUT = ROOT / 'public/mars-expedition/assets'
OUT.mkdir(parents=True, exist_ok=True)
records = []


def cells(name, columns, rows, keep_x=False):
    image = Image.open(ART / name)
    if image.mode != 'RGBA' or image.getextrema()[3][0] != 0:
        raise ValueError(f'{name}: actual alpha transparency required')
    result = []
    for row in range(rows):
        for column in range(columns):
            cell = image.crop((round(column * image.width / columns), round(row * image.height / rows),
                               round((column + 1) * image.width / columns), round((row + 1) * image.height / rows)))
            box = cell.getchannel('A').point(lambda alpha: 255 if alpha >= 128 else 0).getbbox()
            if not box:
                raise ValueError(f'{name}: empty frame')
            # Keep the cell's horizontal anchor. Cropping to the sprite width would
            # move the explorer left whenever a muzzle flash extends to the right.
            result.append(cell.crop((0, box[1], cell.width, box[3]) if keep_x else box))
    return result


def save(image, path):
    output = OUT / path
    output.parent.mkdir(parents=True, exist_ok=True)
    image.save(output, optimize=True)
    records.append({'path': path, 'size': list(image.size), 'bytes': output.stat().st_size,
                    'mode': image.mode, 'alphaBounds': image.getchannel('A').getbbox() if image.mode == 'RGBA' else None})


def anchored(sequence, names, size=64):
    # One shared scale preserves the body size when a pose crouches or lies down.
    ratio = (size - 2) / max(max(frame.size) for frame in sequence)
    for frame, name in zip(sequence, names):
        scaled = frame.resize((max(1, round(frame.width * ratio)), max(1, round(frame.height * ratio))), Image.Resampling.LANCZOS)
        canvas = Image.new('RGBA', (size, size))
        canvas.alpha_composite(scaled, ((size - scaled.width) // 2, size - scaled.height))
        save(canvas, name)


explorer = cells('explorer-unified-master.png', 4, 4, keep_x=True)
anchored(explorer, [f'explorer/{state}/{index}.png' for state in ['run', 'idle', 'jump', 'fire'] for index in range(4)])
for variant in ['teal', 'amber']:
    frames = cells(f'robot-{variant}-master.png', 4, 2, keep_x=True)
    anchored(frames, [f'robot/{variant}/{state}/{index}.png' for state in ['walk', 'down'] for index in range(4)])
for frame, number in zip(cells('terrain-master.png', 3, 2), range(1, 7)):
    save(frame.resize((32, 32), Image.Resampling.LANCZOS), f'tiles/{number}.png')
for frame, path in zip(cells('gate-master.png', 4, 2), [f'gate/{color}/{index}.png' for color in ['teal', 'violet'] for index in range(4)]):
    save(frame.resize((72, 72), Image.Resampling.LANCZOS), path)
items = cells('items-master.png', 4, 2)
anchored(items[:4], [f'crystal/{index}.png' for index in range(4)])
save(items[4].resize((32, 24), Image.Resampling.LANCZOS), 'pulse.png')
background = Image.open(ART / 'mars-background-master.png').convert('RGB')
save(background.resize((1280, 736), Image.Resampling.LANCZOS), 'background.png')
(OUT / 'fonts').mkdir(exist_ok=True)
shutil.copy2(ROOT / 'public/space-invaders/assets/DoHyeon-Regular.ttf', OUT / 'fonts/DoHyeon-Regular.ttf')
shutil.copy2(ROOT / 'public/space-invaders/OFL-DoHyeon.txt', OUT.parent / 'OFL-DoHyeon.txt')
(ART / 'normalized-assets.json').write_text(json.dumps(records, indent=2) + '\n')
print(f'Prepared {len(records)} images, {sum(row["bytes"] for row in records)} image bytes')
