import json,re,subprocess,os,hashlib
from pathlib import Path
from PIL import Image,ImageDraw
root=Path(__file__).resolve().parents[2]
out=root/'docs/collaboration/tasks/20260911-python-showcase/verification'
frames=Path(__file__).resolve().parent/'out/final-frames';frames.mkdir(exist_ok=True)
music=json.loads((root/'src/data/pythonCourseMusic.json').read_text())
report=json.loads((out/'media-checks.json').read_text()) if os.environ.get('VERIFY_COURSES') else []
report=[entry for entry in report if entry['id'] not in os.environ.get('VERIFY_COURSES','').split(',')]
for name in os.environ.get('VERIFY_COURSES','foundation,lumi,advanced,math,algorithm').split(','):
 file=root/f'public/python-showcase/{name}.mp4'
 data=json.loads(subprocess.check_output(['/opt/homebrew/bin/ffprobe','-v','error','-show_format','-show_streams','-of','json',str(file)]))
 v=next(s for s in data['streams'] if s['codec_type']=='video');a=next(s for s in data['streams'] if s['codec_type']=='audio')
 assert (v['width'],v['height'],v['avg_frame_rate'],v['codec_name'])==(1920,1080,'30/1','h264')
 assert abs(float(data['format']['duration'])-57)<0.1
 assert a['codec_name']=='aac' and a['sample_rate']=='48000' and a['channels']==2
 subprocess.run(['/opt/homebrew/bin/ffmpeg','-v','error','-i',str(file),'-f','null','-'],check=True)
 result=subprocess.run(['/opt/homebrew/bin/ffmpeg','-hide_banner','-i',str(file),'-vn','-af','loudnorm=I=-18:TP=-2:LRA=9:print_format=json','-f','null','-'],capture_output=True,text=True,check=True)
 loudness=json.loads(re.search(r'\{\s*"input_i"[\s\S]*?\}',result.stderr).group())
 assert -24<float(loudness['input_i'])<-16 and float(loudness['input_tp'])<-1
 sheet=Image.new('RGB',(1920,1695),'#111827');draw=ImageDraw.Draw(sheet)
 for i,t in enumerate([3,12,29,40,47,54]):
  frame=frames/f'{name}-{t}.png'
  subprocess.run(['/opt/homebrew/bin/ffmpeg','-y','-v','error','-ss',str(t),'-i',str(file),'-frames:v','1',str(frame)],check=True)
  image=Image.open(frame);x=(i%2)*960;y=(i//2)*565;sheet.paste(image.resize((960,540)),(x,y));draw.text((x+10,y+542),f'{name} / {t}s',fill='white')
 sheet.save(out/f'{name}-contact.jpg',quality=88)
 pcm=subprocess.check_output(['/opt/homebrew/bin/ffmpeg','-v','error','-i',str(file),'-vn','-f','s16le','-acodec','pcm_s16le','-'])
 report.append({'id':name,'music':music[name]['title'],'audioSHA256':hashlib.sha256(pcm).hexdigest(),'duration':float(data['format']['duration']),'resolution':[1920,1080],'fps':30,'video':'H.264','audio':'AAC stereo 48 kHz','sizeMB':round(file.stat().st_size/1024/1024,2),'integratedLUFS':float(loudness['input_i']),'truePeakDBFS':float(loudness['input_tp']),'decode':'pass'})
 print('PASS',report[-1],flush=True)
hashes=[entry['audioSHA256'] for entry in report if 'audioSHA256' in entry]
assert len(set(hashes)) == len(hashes)
if not os.environ.get('VERIFY_COURSES'): assert len(hashes) == 5
(out/'media-checks.json').write_text(json.dumps(report,indent=2))
