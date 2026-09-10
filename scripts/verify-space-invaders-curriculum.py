"""Independent edit replay, document-code parity and bounded Pygame smoke checks."""
import ast, copy, json, os, re, sys
from pathlib import Path
from unittest.mock import patch
from curriculum_teaching import executable_tokens
os.environ['SDL_VIDEODRIVER']='dummy';os.environ['SDL_AUDIODRIVER']='dummy';os.environ['PYGAME_HIDE_SUPPORT_PROMPT']='1'
import pygame
ROOT=Path(__file__).resolve().parents[1];P=ROOT/'content/space-invaders'
edits=json.loads((P/'edits.json').read_text());m=edits['initial'];manifest=json.loads((P/'manifest.json').read_text())

def render(m):
 chunks=[m['intro']]
 for c,methods in m['classes'].items():chunks.append('class '+c+('' if c=='Mission' else '(pygame.sprite.Sprite)')+':\n'+'\n\n'.join(methods.values()))
 chunks += [m['setup'],m['loop']]
 return '\n\n'.join(c for c in chunks if c).rstrip()+'\n'

for s in edits['steps']:
 doc=(P/'data-log'/f"{s['id'][:2]}.md").read_text()
 section=doc.split('## '+s['id']+' - ',1)[1].split('\n## ',1)[0]
 for e in s['edits']:
  if e['kind']=='method':
   c,f=e['key'].split('.');assert m['classes'][c].get(f,'')==e['before'];m['classes'][c][f]=e['after'];expected=e['after']
  else:
   assert m[e['key']]==e['before'];m[e['key']]=e['after'];expected=e['after']
   if e['key']=='classes':expected=render(dict(intro='',classes=e['after'],setup='',loop='')).strip()
  assert any(executable_tokens(b.rstrip()+'\n')==executable_tokens(expected.rstrip()+'\n') for b in re.findall(r'```python\n(.*?)\n```',section,re.S)),(s['id'],e['key'],'document block mismatch')
 actual=(P/'checkpoints'/f"{s['id']}.py").read_text();assert executable_tokens(render(m))==executable_tokens(actual),s['id']
 ast.parse(actual)
print('PASS all '+str(len(edits['steps']))+' edit sequences reproduce checkpoints; every edit block matches executable tokens in its Data Log.',flush=True)
for path in list((P/'checkpoints').glob('*.py'))+list((P/'experiments').glob('*.py')):
 code=path.read_text();ast.parse(code)
 for asset in re.findall(r"['\"](assets/[^'\"]+)['\"]",code):assert (ROOT/'public/space-invaders'/asset).is_file(),asset
for u in json.loads((P/'assessments.json').read_text())['units']:
 assert 2<=len(u['exercises'])<=5 and len(u['quizzes'])==10
 for e in u['exercises']:
  assert 2<=len(e['answerLines'])<=8
  ast.parse('\n'.join(e['answerLines']))
 for q in u['quizzes']:assert len(q['options'])==4 and sum(o['isCorrect'] for o in q['options'])==1
print('PASS all Python syntax/assets and 29 trace/100 quiz structures.',flush=True)
os.chdir(ROOT/'public/space-invaders')
class Clock:
 def tick(self,*args):return 16
smoked=[]
for path in sorted((P/'checkpoints').glob('*.py')):
 calls=[0]
 def events():
  calls[0]+=1
  return [] if calls[0]==1 else [pygame.event.Event(pygame.QUIT)]
 with patch.object(pygame.event,'get',side_effect=events),patch.object(pygame.time,'Clock',return_value=Clock()):
  try:exec(compile(path.read_text(),str(path),'exec'),{'__name__':'__main__'})
  finally:pygame.quit()
 smoked.append(path.name)
print('PASS bounded real Pygame setup/update/draw/QUIT: '+str(len(smoked))+' files.',flush=True)
# Exercise the real event loop: paused input blocked; game-over Enter restarts in ONE key.
code=(P/'checkpoints/final-main.py').read_text()
for mode in ['paused-space','game-over-enter','quit-space']:
 setup=''
 if mode=='game-over-enter':setup="scout.lives=0\nmission.score=700\nmission.check_game_status('test','Enter')\n"
 prepared=code.replace('running = True',setup+'running = True',1);calls=[0]
 def events():
  calls[0]+=1
  if calls[0]>1:return [pygame.event.Event(pygame.QUIT)]
  if mode=='paused-space':return [pygame.event.Event(pygame.KEYDOWN,key=pygame.K_SPACE)]
  if mode=='game-over-enter':return [pygame.event.Event(pygame.KEYDOWN,key=pygame.K_RETURN)]
  return [pygame.event.Event(pygame.QUIT),pygame.event.Event(pygame.KEYDOWN,key=pygame.K_SPACE)]
 ns={}
 with patch.object(pygame.event,'get',side_effect=events),patch.object(pygame.time,'Clock',return_value=Clock()):exec(compile(prepared,'<event-test>','exec'),ns)
 if mode=='game-over-enter':
  assert ns['mission'].state=='playing';assert (ns['mission'].score,ns['mission'].round_number,ns['scout'].lives,len(ns['raiders']))==(0,1,5,55)
 else:assert len(ns['scout_pulses'])==0
 pygame.quit()
print('PASS actual loop events: paused Space blocked, one Enter restarts, QUIT ends.',flush=True)
