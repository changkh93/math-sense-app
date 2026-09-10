"""Two-pass audio normalization and fast-start export for the rendered reel."""
from pathlib import Path
import subprocess,json,re
p=Path(__file__).resolve().parent/'out';source=p/'master-render.mp4';target=p/'metasense-game-projects-vertical.mp4'
first=subprocess.run(['ffmpeg','-hide_banner','-i',str(source),'-af','loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json','-vn','-f','null','-'],capture_output=True,text=True,check=True)
stats=json.loads(re.findall(r'\{[^{}]+\}',first.stderr)[-1]);(p/'normalization-input.json').write_text(json.dumps(stats,indent=2))
options='loudnorm=I=-16:TP=-1.5:LRA=11:measured_I={input_i}:measured_TP={input_tp}:measured_LRA={input_lra}:measured_thresh={input_thresh}:offset={target_offset}:linear=true:print_format=json'.format(**stats)
tmp=p/'final-normalized.mp4'
r=subprocess.run(['ffmpeg','-y','-hide_banner','-i',str(source),'-map','0:v:0','-map','0:a:0','-c:v','copy','-af',options+',volume=-1.5dB','-ar','48000','-c:a','aac','-b:a','192k','-t','36','-movflags','+faststart',str(tmp)],capture_output=True,text=True,check=True)
(p/'normalization-output.log').write_text(r.stderr);tmp.replace(target);print(target)
