import ast
import copy
import json
import re
import sys
import zipfile
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts/mars-curriculum'))
from engine import render
from curriculum_teaching import executable_tokens
C=ROOT/'content/mars-expedition';P=ROOT/'public/mars-expedition'
m=json.loads((C/'manifest.json').read_text());ed=json.loads((C/'edits.json').read_text());bank=json.loads((C/'assessments.json').read_text())
assert len(m['units'])==31 and m['totalSteps']==59
model=copy.deepcopy(ed['initial'])
for step in ed['steps']:
 doc=(C/'data-log'/f'{step["id"][:2]}.md').read_text()
 segment=doc.split(f'## {step["id"]} - ',1)[1].split('\n## ',1)[0]
 blocks=re.findall(r'```python\n(.*?)\n```',segment,re.S)
 assert len(blocks)>=len([e for e in step['edits'] if e['after']])
 block_index=0
 for e in step['edits']:
  key=e['key']
  if '.' in key:
   cls,fn=key.split('.');assert model['classes'][cls].get(fn,'')==e['before'];model['classes'][cls][fn]=e['after']
  else:assert model[key]==e['before'];model[key]=e['after']
  if e['after']:
   expected=render(dict(header='',helpers='',classes=e['after'],setup='',loop='')).rstrip() if key=='classes' else e['after']
   assert executable_tokens(blocks[block_index].rstrip()+'\n')==executable_tokens(expected.rstrip()+'\n'),(step['id'],key,'document mismatch')
   block_index+=1
 actual=(C/'checkpoints'/f'{step["id"]}.py').read_text();assert executable_tokens(render(model))==executable_tokens(actual)
 assert (P/'checkpoints'/f'{step["id"]}.py').read_text()==actual
 assert len(actual.encode())<200*1024
 ast.parse(actual)
for step in m['steps']:
 if step['experiment']:
  code=(C/'checkpoints'/f'{step["id"]}.py').read_text()
  experiment=step['experiment']['code']+'\n\n'
  changed=(C/'experiments'/f'{step["id"]}.py').read_text()
  assert changed.replace(experiment,'',1)==code
  ast.parse(changed)
for u,b in zip(m['units'],bank['units']):
 n=int(u['unitKey'][-2:]);doc=(C/'data-log'/f'{n:02}.md').read_text()
 assert b['unitKey']==u['unitKey'] and len(b['quizzes'])==10 and len(b['exercises'])==2
 assert '\ufffd' not in doc and not re.search('[\u3040-\u30ff]',doc)
 assert (P/'data-log'/f'{n:02}.md').read_text()==doc
 for sid in u['steps']:
  segment=doc.split(f'## {sid} - ',1)[1].split('\n## ',1)[0]
  for label in ['수정 위치와 입력할 코드','코드가 하는 일','여기서 실행하세요','이 시점의 정상 상태','예상과 다를 때']:
   assert label in segment,(sid,label)
 for link in re.findall(r'\]\((/mars-expedition/[^)]+)\)',doc):assert (ROOT/'public'/link.lstrip('/')).exists(),link
 assert len(set(q['question'] for q in b['quizzes']))==10
 for q in b['quizzes']:
  assert len(q['options'])==4 and sum(o['isCorrect'] for o in q['options'])==1
  assert len(set(o['text'] for o in q['options']))==4
  assert q['explanation']
 for ex in b['exercises']:
  assert ex['answerLines'] and ex['hints'] and ex['commonMistakes']
for f in (P/'assets').rglob('*.png'):
 im=Image.open(f)
 if f.name!='background.png':assert im.mode=='RGBA' and im.getextrema()[-1][0]==0,f
assert ast.dump(ast.parse((C/'game.py').read_text()),include_attributes=False)==ast.dump(ast.parse((C/'checkpoints/final-main.py').read_text()),include_attributes=False)
with zipfile.ZipFile(P/'mars-expedition-course.zip') as z:
 assert len([n for n in z.namelist() if n.startswith('assets/')])==62
 assert 'assessments.json' in z.namelist()
 for name in ['starter','final']:assert f'mars-expedition-{name}.mspygame.json' in z.namelist()
print('PASS: 59 edit replays; 31 Data Logs; 5 reversible experiments; 310 unique-per-unit questions; 62 traces; final AST parity; assets and ZIP links')
