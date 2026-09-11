import json, subprocess
from PIL import Image
from pathlib import Path
root=Path(__file__).resolve().parent
public=root/'public'
web=root.parent.parent/'public/python-showcase'
def ff(*args): subprocess.run(['/opt/homebrew/bin/ffmpeg','-y','-v','error',*map(str,args)],check=True)
import os
for folder in os.environ.get('CAPTURE_FOLDERS','captures,captures-2,captures-3,captures-4').split(','):
    report=json.loads((root/'out'/folder/'report.json').read_text())
    for s in report['segments']:
        name=s['id']
        ff('-ss',s['start'],'-t',s['end']-s['start'],'-i',report['video'],'-t',32,'-vf','tpad=stop_mode=clone:stop_duration=4,fps=30','-an','-c:v','libx264','-preset','fast','-crf',20,'-pix_fmt','yuv420p','-movflags','+faststart',public/f'{name}-capture.mp4')
        screen=root/'out'/folder/f'{name}-screen.png'
        Image.open(screen).save(web/f'{name}-screen.webp',quality=88)
        crop=(390,95,1030,805) if name=='lumi' else (884,227,1596,707)
        Image.open(screen).crop(crop).save(public/f'{name}-result.webp',quality=92)
observe=json.loads((root/'out/observe/report.json').read_text())
ff('-ss',observe['start'],'-i',observe['video'],'-t',8,'-vf','fps=30','-an','-c:v','libx264','-preset','fast','-crf',20,'-pix_fmt','yuv420p',public/'algorithm-observe.mp4')
ff('-ss',2,'-i',root.parent/'metasense-game-projects-reel/public/space.mp4','-frames:v',1,root/'out/game-poster.png')

Image.open(root/'out/game-poster.png').save(web/'game-poster.webp',quality=90)
