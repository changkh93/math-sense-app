"""Record unchanged final game via deterministic clock and keyboard-only replay."""
import os,json,random,argparse,subprocess,hashlib,wave
from pathlib import Path
from unittest.mock import patch
os.environ.update(SDL_VIDEODRIVER='dummy',SDL_AUDIODRIVER='dummy',PYGAME_HIDE_SUPPORT_PROMPT='1')
import pygame
import numpy as np
ROOT=Path(__file__).resolve().parents[2]; HERE=Path(__file__).resolve().parent
p=argparse.ArgumentParser();p.add_argument('--record',action='store_true');p.add_argument('--seed',type=int,default=8);args=p.parse_args()
source=ROOT/'content/mars-expedition/checkpoints/final-main.py';code=source.read_text();os.chdir(ROOT/'public/mars-expedition');random.seed(args.seed)
ns={};frame=0;direction=0;events=[];poses=[];sounds=[];samples={};music_events=[];previous=None;pause_start=0;lastjump=-100;music_path=None
proc=None
if args.record:proc=subprocess.Popen(['ffmpeg','-y','-loglevel','error','-f','rawvideo','-pixel_format','rgb24','-video_size','1280x736','-framerate','30','-i','-','-an','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p',str(HERE/'public/gameplay-silent.mp4')],stdin=subprocess.PIPE)
RealSound=pygame.mixer.Sound
class Sound:
 def __init__(self,path):
  self.path=path;samples[path]=pygame.sndarray.array(RealSound(path)).copy()
 def play(self,*a,**kw):sounds.append((frame,self.path))
class Clock:
 def tick(self,*a):return 1000/60
class Keys:
 def __getitem__(self,k):return (k==pygame.K_LEFT and direction<0) or (k==pygame.K_RIGHT and direction>0)
def music_load(path):
 global music_path
 music_path=path

def get_events():
 global direction,previous,pause_start,lastjump
 m=ns['mission'];e=ns['explorer'];state=(m.state,m.score,e.health,m.round_number,len(ns['robots']),len(ns['crystals']))
 if state!=previous:
  if previous is None or state[0]!=previous[0]:pause_start=frame
  events.append({'frame':frame,'seconds':round(frame/60,3),'state':state});previous=state
 if frame>=65*60:return [pygame.event.Event(pygame.QUIT)]
 if m.state!='playing':return [pygame.event.Event(pygame.KEYDOWN,key=pygame.K_RETURN)] if frame-pause_start==120 else []
 out=[];t=frame/60
 if t<2.15:direction=0
 elif t<3.0:
  direction=-1
  if e.grounded and frame-lastjump>50:out.append(pygame.event.Event(pygame.KEYDOWN,key=pygame.K_SPACE));lastjump=frame
 elif t<7:direction=1
 else:
  # Read objects to choose inputs only. Never assign any game attributes.
  targets=list(ns['crystals'])+list(ns['robots'])
  if targets:
   target=min(targets,key=lambda r:abs(r.rect.centerx-e.rect.centerx)+abs(r.rect.bottom-e.rect.bottom)*2-(200 if getattr(r,'state','walking')!='walking' else 0))
   dx=target.rect.centerx-e.rect.centerx;dy=target.rect.bottom-e.rect.bottom
   direction=1 if dx>8 else -1 if dx < -8 else 0
   if dy < -60 and e.grounded and frame-lastjump>55:
    out.append(pygame.event.Event(pygame.KEYDOWN,key=pygame.K_SPACE));lastjump=frame
   if dy>70:
    # Walk to the nearest platform edge to descend to the target's level.
    supports=[s for s in ns['platforms'] if abs(s.rect.top-e.rect.bottom)<2]
    if supports:
     lo=min(s.rect.left for s in supports);hi=max(s.rect.right for s in supports)
     edge=lo-28 if abs(e.rect.centerx-lo)<abs(e.rect.centerx-hi) else hi+28
     direction=1 if edge>e.rect.centerx else -1
   if frame%10==0:out.append(pygame.event.Event(pygame.KEYDOWN,key=pygame.K_UP))
  else:direction=1
 return out

def display():
 global frame
 if frame%6==0:
  e=ns['explorer'];poses.append({'t':round(frame/60,2),'xy':list(e.rect.midbottom),'action':e.action,'facing':e.facing,'robots':[(list(r.rect.midbottom),r.state) for r in ns['robots']],'crystals':[list(c.rect.midbottom) for c in ns['crystals']]})
 if proc and frame%2==0:proc.stdin.write(pygame.image.tobytes(ns['screen'],'RGB'))
 frame+=1
with patch('pygame.mixer.Sound',Sound),patch('pygame.time.Clock',Clock),patch('pygame.event.get',get_events),patch('pygame.key.get_pressed',lambda:Keys()),patch('pygame.display.update',display),patch('pygame.mixer.music.load',music_load),patch('pygame.mixer.music.play',lambda *a:music_events.append((frame,'play'))),patch('pygame.mixer.music.pause',lambda:music_events.append((frame,'pause'))),patch('pygame.mixer.music.unpause',lambda:music_events.append((frame,'unpause'))),patch('pygame.mixer.music.stop',lambda:music_events.append((frame,'stop'))):
 exec(compile(code,str(source),'exec'),ns)
if proc:proc.stdin.close();assert proc.wait()==0
report={'source':str(source.relative_to(ROOT)),'sha256':hashlib.sha256(code.encode()).hexdigest(),'seed':args.seed,'simulation_fps':60,'video_fps':30,'seconds':frame/60,'events':events,'sounds':sounds,'music':music_events,'poses':poses,'method':'Unchanged final code; automated keyboard input and deterministic time; no game-state edits.'}
(HERE/'out/capture-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print('events:',events);print('sound types:',{p:sum(1 for _,s in sounds if s==p) for _,p in sounds})
if args.record:
 rate=44100;audio=np.zeros((int((frame/60+1)*rate),2),dtype=np.float32)
 for f,path in sounds:
  a=samples[path].astype(np.float32)
  if a.ndim==1:a=np.repeat(a[:,None],2,axis=1)
  start=round(f/60*rate);n=min(len(a),len(audio)-start);audio[start:start+n]+=a[:n]*.7
 music=np.frombuffer(subprocess.check_output(['ffmpeg','-loglevel','error','-i',music_path,'-f','f32le','-ar',str(rate),'-ac','2','-']),dtype='<f4').reshape(-1,2)*32768
 active=False;cursor=0;last=0
 for f,action in music_events+[(frame,'stop')]:
  end=round(f/60*rate)
  if active:
   n=end-last;audio[last:end]+=music[(np.arange(n)+cursor)%len(music)]*.6;cursor+=n
  if action=='play':active=True;cursor=0
  elif action=='unpause':active=True
  else:active=False
  last=end
 peak=float(np.abs(audio).max());audio*=min(1,29000/max(1,peak))
 with wave.open(str(HERE/'out/gameplay.wav'),'wb') as w:w.setnchannels(2);w.setsampwidth(2);w.setframerate(rate);w.writeframes(audio.astype('<i2').tobytes())
 subprocess.run(['ffmpeg','-y','-loglevel','error','-i',str(HERE/'public/gameplay-silent.mp4'),'-i',str(HERE/'out/gameplay.wav'),'-c:v','copy','-c:a','aac','-b:a','192k','-shortest',str(HERE/'public/gameplay.mp4')],check=True)
