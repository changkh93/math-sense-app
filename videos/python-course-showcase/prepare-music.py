"""Prepare distinct 57-second music excerpts; fade automation lives in Composition.tsx."""
import hashlib, json, re, subprocess
from pathlib import Path
root = Path(__file__).resolve().parent
tracks = json.loads((root.parents[1] / 'src/data/pythonCourseMusic.json').read_text())
report = []
for course, track in tracks.items():
    source = root / 'public/music' / f'{course}-source.mp3'
    output = root / 'public/music' / f'{course}.wav'
    base = ['/opt/homebrew/bin/ffmpeg', '-hide_banner', '-y', '-ss', str(track['start']), '-t', '57', '-i', str(source)]
    measured = subprocess.run(base + ['-af', 'loudnorm=I=-18:TP=-2:LRA=9:print_format=json', '-f', 'null', '-'], capture_output=True, text=True, check=True)
    stats = json.loads(re.search(r'\{\s*"input_i"[\s\S]*?\}', measured.stderr).group())
    filt = 'loudnorm=I=-18:TP=-2:LRA=9:linear=true:' + ':'.join(f'{key}={stats[value]}' for key,value in [('measured_I','input_i'),('measured_TP','input_tp'),('measured_LRA','input_lra'),('measured_thresh','input_thresh'),('offset','target_offset')])
    subprocess.run(base + ['-v', 'error', '-af', filt, '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s16le', str(output)], check=True)
    report.append({'course': course, **track, 'sourceSHA256': hashlib.sha256(source.read_bytes()).hexdigest(), 'preparedSHA256': hashlib.sha256(output.read_bytes()).hexdigest()})
    print('Prepared', course, track['title'], flush=True)
assert len({t['isrc'] for t in report}) == 5
assert len({t['sourceSHA256'] for t in report}) == 5
assert all(t['title'] != 'Pixelland' for t in report)
(root.parents[1] / 'docs/collaboration/tasks/20260911-python-showcase/verification/music-sources.json').write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n')
