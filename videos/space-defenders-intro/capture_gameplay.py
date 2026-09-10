"""Replay keyboard inputs against the unchanged curriculum final code.
No game state or rules are modified. SDL surfaces and actual Sound.play calls
are recorded at deterministic 60 Hz; output is 30 fps with original effects.
"""
import os, json, random, argparse, subprocess, hashlib, wave
from pathlib import Path
from unittest.mock import patch
os.environ.update(SDL_VIDEODRIVER='dummy', SDL_AUDIODRIVER='dummy', PYGAME_HIDE_SUPPORT_PROMPT='1')
import pygame
import numpy as np
ROOT=Path(__file__).resolve().parents[2]
HERE=Path(__file__).resolve().parent
parser=argparse.ArgumentParser(); parser.add_argument('--record',action='store_true'); parser.add_argument('--scenario',default='gameplay',choices=['gameplay','damage']); args=parser.parse_args(); take=args.scenario
source=ROOT/'content/space-invaders/checkpoints/final-main.py'
code=source.read_text(); os.chdir(ROOT/'public/space-invaders')
random.seed(32)
ns={}; frame=0; events=[]; sounds=[]; samples={}; previous=None; pause_start=0; round2=None; target=600
proc=None
if args.record:
    proc=subprocess.Popen(['ffmpeg','-y','-loglevel','error','-f','rawvideo','-pixel_format','rgb24','-video_size','1200x700','-framerate','30','-i','-','-an','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p',str(HERE/f'public/{take}-silent.mp4')],stdin=subprocess.PIPE)
RealSound=pygame.mixer.Sound
class Sound:
    def __init__(self,path):
        self.path=path
        sound=RealSound(path)
        samples[path]=pygame.sndarray.array(sound).copy()
    def play(self,*a,**kw): sounds.append((frame,self.path))
class Clock:
    def tick(self,*a):
        global frame
        frame+=1
        return 1000/60
class Keys:
    def __getitem__(self,k):
        x=ns['scout'].rect.centerx
        return (k==pygame.K_LEFT and x>target+4) or (k==pygame.K_RIGHT and x<target-4)
def get_events():
    global target,pause_start,previous,round2
    m=ns['mission']; s=ns['scout']; enemies=list(ns['raiders'])
    state=(m.state,m.score,s.lives,m.round_number,len(enemies))
    if state!=previous:
        if not previous or state[0]!=previous[0]: pause_start=frame
        events.append({'frame':frame,'seconds':round(frame/60,3),'state':state})
        previous=state
    if m.round_number==2 and round2 is None: round2=frame
    if (take=='damage' and frame>=18*60) or frame>180*60 or (round2 is not None and frame>round2+60*8):
        return [pygame.event.Event(pygame.QUIT)]
    if m.state!='playing':
        return [pygame.event.Event(pygame.KEYDOWN,key=pygame.K_RETURN)] if frame-pause_start==120 else []
    if take=='damage':
        bullets=list(ns['raider_pulses'])
        if bullets: target=max(bullets,key=lambda p:p.rect.y).rect.centerx
        return []
    # Lead the nearest low target by the pulse travel time; send only keyboard input.
    candidates=[]
    for e in enemies:
        lead=(s.rect.top-e.rect.bottom)/10
        aim=max(32,min(1168,e.rect.centerx+lead*e.direction*e.velocity))
        candidates.append((abs(aim-s.rect.centerx)+(700-e.rect.bottom)*.10,aim))
    if candidates: target=min(candidates)[1]
    # Evade threatening enemy fire after the opening demonstration.
    threats=[p for p in ns['raider_pulses'] if p.rect.bottom>475 and abs(p.rect.centerx-s.rect.centerx)<65]
    if threats and frame>900:
        p=max(threats,key=lambda b:b.rect.y)
        target=max(32,min(1168,p.rect.centerx+(-95 if s.rect.centerx<p.rect.centerx else 95)))
    return [pygame.event.Event(pygame.KEYDOWN,key=pygame.K_SPACE)] if frame%8==0 else []
def display():
    if proc and frame%2==0:
        proc.stdin.write(pygame.image.tobytes(ns['screen'],'RGB'))
with patch('pygame.mixer.Sound',Sound),patch('pygame.time.Clock',Clock),patch('pygame.event.get',get_events),patch('pygame.key.get_pressed',lambda:Keys()),patch('pygame.display.update',display):
    exec(compile(code,str(source),'exec'),ns)
if proc: proc.stdin.close(); assert proc.wait()==0
report={'source':str(source.relative_to(ROOT)),'sha256':hashlib.sha256(code.encode()).hexdigest(),'seed':32,'simulation_fps':60,'video_fps':30,'frames':frame,'seconds':frame/60,'events':events,'sound_events':len(sounds),'method':'Unmodified final code, deterministic clock, automated keyboard input; no game-state edits.'}
(HERE/f'out/{take}-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps({k:v for k,v in report.items() if k!='events'},ensure_ascii=False))
print('pause/round transitions:',[e for i,e in enumerate(events) if i==0 or e['state'][0]!=events[i-1]['state'][0] or e['state'][3]!=events[i-1]['state'][3]])
if args.record:
    rate=44100
    audio=np.zeros((int((frame/60+2)*rate),2),dtype=np.float32)
    for f,path in sounds:
        a=samples[path].astype(np.float32)
        if a.ndim==1: a=np.repeat(a[:,None],2,axis=1)
        start=round(f/60*rate); n=min(len(a),len(audio)-start)
        audio[start:start+n]+=a[:n]*.60
    peak=float(np.max(np.abs(audio))); audio*=min(1,30000/max(1,peak))
    with wave.open(str(HERE/f'out/{take}.wav'),'wb') as w:
        w.setnchannels(2);w.setsampwidth(2);w.setframerate(rate);w.writeframes(audio.astype('<i2').tobytes())
    subprocess.run(['ffmpeg','-y','-loglevel','error','-i',str(HERE/f'public/{take}-silent.mp4'),'-i',str(HERE/f'out/{take}.wav'),'-c:v','copy','-c:a','aac','-b:a','192k','-shortest',str(HERE/f'public/{take}.mp4')],check=True)
