import ast
import contextlib
import io
import json
import runpy
import textwrap
import sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'content/mars-expedition'
sys.path.insert(0,str(ROOT/'scripts'))
from curriculum_assessment_review import review_bank
src=runpy.run_path(str(Path(__file__).with_name('assessment-source.py')))
manifest=json.loads((OUT/'manifest.json').read_text())
focus=[('level_map','loop'),('Terrain.__init__','setup'),('Explorer.__init__','setup'),('Explorer.update','Explorer.__init__'),('Explorer.update','setup'),('Explorer.jump','Explorer.check_collisions'),('Explorer.animate','Explorer.update'),('Explorer.check_collisions','loop'),('Explorer.jump','Explorer.animate'),('header','loop'),('load_image','loop'),('Pulse.update','Gate.animate'),('level_map','setup'),('Terrain.__init__','setup'),('SignalSource.__init__','SignalSource.animate'),('Gate.__init__','Gate.animate'),('Expedition.update','Expedition.draw'),('Explorer.__init__','Explorer.__init__'),('Explorer.move','Explorer.update'),('Explorer.jump','Explorer.check_collisions'),('Pulse.update','Explorer.fire'),('Robot.__init__','Robot.__init__'),('Robot.move','Robot.check_collisions'),('Robot.animate','Expedition.check_collisions'),('Robot.check_animations','Expedition.check_collisions'),('Expedition.add_robot','Expedition.update'),('Crystal.move','Crystal.animate'),('Expedition.check_collisions','Crystal.check_collisions'),('Expedition.start_new_round','Expedition.pause_game'),('Expedition.check_game_over','Expedition.reset_game'),('Expedition.add_robot','Expedition.reset_game')]

def excerpt(code,target,alternate=False):
 code='\n'.join(line for line in code.splitlines() if not line.lstrip().startswith('#'))
 tree=ast.parse(code);lines=code.splitlines();nodes=tree.body;label=target
 if '.' in target:
  cls,fn=target.split('.');parent=next(n for n in nodes if isinstance(n,ast.ClassDef) and n.name==cls);node=next(n for n in parent.body if isinstance(n,ast.FunctionDef) and n.name==fn);nodes=node.body;label=f'{cls}.{fn} 메서드'
 elif target in ['load_image']:
  nodes=next(n for n in nodes if isinstance(n,ast.FunctionDef) and n.name==target).body
 elif target=='loop':
  nodes=next(n for n in nodes if isinstance(n,ast.While)).body;label='메인 반복문'
 elif target in ['setup','level_map']:
  start=next((i for i,n in enumerate(nodes) if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='level_map' for t in n.targets)),0)
  nodes=nodes[start:];label='지도와 객체 준비 구간'
 else: label='파일 위쪽 준비 구간'
 useful=[]
 for n in nodes:
  if isinstance(n,(ast.ClassDef,ast.FunctionDef,ast.While)) or (isinstance(n,ast.Expr) and isinstance(n.value,ast.Constant)):continue
  if n.end_lineno-n.lineno<17 and not isinstance(n,ast.Pass):useful.append(n)
 if alternate and len(useful)>5:useful=useful[len(useful)//2:]
 selected=[];count=0
 for n in useful:
  length=n.end_lineno-n.lineno+1
  if count+length>18 and selected:break
  selected.extend(lines[n.lineno-1:n.end_lineno]);count+=length
  if count>=8:break
 if not selected: # Blueprint unit: intentionally type the declared method, including pass.
  node=next(n for n in parent.body if isinstance(n,ast.FunctionDef) and n.name==fn)
  selected=lines[node.lineno-1:node.end_lineno];label=f'{cls} 클래스의 설계도'
 return label,textwrap.dedent('\n'.join(selected)).splitlines()

units=[]
for i,u in enumerate(manifest['units'],1):
 quizzes=[]
 concepts=src['CONCEPTS'][i].strip().splitlines();assert len(concepts)==5
 for row in concepts:
  question,answer,d1,d2,d3,explanation=row.split('|')
  quizzes.append(dict(question=question,options=[dict(text=x,isCorrect=j==0) for j,x in enumerate([answer,d1,d2,d3])],explanation=explanation,score=1))
 for program in src['PROGRAMS'][i]:
  # Keep decimal exercises about game logic, not binary floating-point spelling.
  if program=='print(4 / 6)':program='print(round(4 / 6, 2))'
  if program=='print(max(0, 0.4 - 0.1))':program='print(round(max(0, 0.4 - 0.1), 1))'
  output=io.StringIO();ns={}
  with contextlib.redirect_stdout(output):exec(program,ns)
  answer=output.getvalue().strip();value=float(answer)
  choices=[answer]
  for delta in [1,-1,2,-2,3]:
   val=value+delta;candidate=str(int(val)) if val.is_integer() else str(round(val,4))
   if candidate not in choices:choices.append(candidate)
   if len(choices)==4:break
  state=', '.join(f'{k}={v!r}' for k,v in ns.items() if not k.startswith('_') and isinstance(v,(int,float,bool,str,list)) and len(repr(v))<90)
  reason=f'코드를 위에서 아래로 실행하면 출력은 {answer}입니다.'+(f' 출력 직전의 관련 값은 {state}입니다.' if state else f' print 안의 식 `{program.splitlines()[-1][6:-1]}`을 먼저 계산합니다.')
  quizzes.append(dict(question=f'다음 코드의 출력 결과는 무엇인가요?\n\n```python\n{program}\n```',options=[dict(text=x,isCorrect=j==0) for j,x in enumerate(choices)],explanation=reason,score=1))
 assert len(quizzes)==10
 for j,q in enumerate(quizzes):
  rotation=(i+j)%4;q['options']=q['options'][rotation:]+q['options'][:rotation]
 code=(OUT/'checkpoints'/f'{u["steps"][-1]}.py').read_text()
 exercises=[]
 for j,target in enumerate(focus[i-1]):
  label,answer=excerpt(code,target,alternate=(j==1 and focus[i-1][0]==target))
  exercises.append(dict(title=f'{i:02}-{j+1} {label} 다시 작성',level=1 if i<=8 else 2,category='pygame',concepts=[u['title']],prompt=f'Data Log {i:02}의 마지막 실행 지점에서 확인한 {label}의 발췌 코드를 입력하세요. 이 발췌는 기존 main.py 안에서 사용하는 코드입니다. 전체 파일을 대체하지 않습니다. 변수 이름, 호출 순서와 들여쓰기를 확인하세요.',answerLines=answer,hints=[f'{u["steps"][-1]} 누적 코드의 {label}을 먼저 읽고 실행 결과를 떠올리세요.','파이썬 들여쓰기와 콜론을 유지하고, 실수 값과 정수 인덱스를 구분하세요.'],commonMistakes=[dict(message='코드 위치를 바꾸거나 같은 동작을 두 번 호출하지 않았는지 Data Log와 비교하세요.')]))
 units.append(dict(unitKey=u['unitKey'],quizzes=quizzes,exercises=exercises))
(OUT/'assessments.json').write_text(json.dumps(review_bank('mars-expedition',dict(units=units)),ensure_ascii=False,indent=2)+'\n')
print(f'{len(units)} units, {sum(len(u["quizzes"]) for u in units)} quizzes, {sum(len(u["exercises"]) for u in units)} Code Traces; all numeric predictions executed')
