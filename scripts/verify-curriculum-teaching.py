"""Audit student-facing explanations, trace continuity and numeric answers."""
import contextlib
import io
import json
import re
import tokenize
from pathlib import Path
from curriculum_prediction_prompts import prompts
ROOT=Path(__file__).resolve().parents[1]

def tokens(s):
    return [(t.type,t.string) for t in tokenize.generate_tokens(io.StringIO(s+'\n').readline)
            if t.type not in (tokenize.COMMENT,tokenize.NL,tokenize.NEWLINE,tokenize.INDENT,tokenize.DEDENT,tokenize.ENDMARKER)]
results=[]
for course in ['space-invaders','mars-expedition']:
    root=ROOT/'content'/course
    manifest=json.loads((root/'manifest.json').read_text());bank=json.loads((root/'assessments.json').read_text())
    assert set(prompts(course))=={s['id'] for s in manifest['steps']}
    numeric=0;traces=0;step_count=0
    for unit,assessment in zip(manifest['units'],bank['units']):
        doc=(root/'data-log'/f"{unit['unitKey'][-2:]}.md").read_text()
        assert '주석은 따라 적지 않아도' in doc
        assert '\ufffd' not in doc
        assert 'udemy.com' not in doc, 'User-removed lecture links must stay removed'
        source_parts=[]
        for sid in unit['steps']:
            segment=doc.split(f'## {sid} - ',1)[1].split('\n## ',1)[0]
            assert '생각 확인:' in segment and '이 단계의 연결:' in segment
            assert '여기서 실행하세요' in segment and '예상과 다를 때' in segment
            code=(root/'checkpoints'/f'{sid}.py').read_text();assert '# ' in code,sid
            source_parts.append(tokens(code));step_count+=1
        for ex in assessment['exercises']:
            assert not any(line.lstrip().startswith('#') for line in ex['answerLines'])
            assert '단독 실행하지 않습니다' in ex['prompt']
            snippet='\n'.join(ex['answerLines'])
            compile('def exercise_context():\n    while True:\n'+''.join('        '+line+'\n' for line in ex['answerLines']), '<trace-context>', 'exec')
            target=tokens(snippet)
            assert any(any(source[i:i+len(target)]==target for i in range(len(source)-len(target)+1)) for source in source_parts),(course,unit['unitKey'],ex['title'],'not a stage excerpt')
            traces+=1
        for q in assessment['quizzes']:
            assert len(q['options'])==4 and sum(x['isCorrect'] for x in q['options'])==1
            assert len(set(o['text'] for o in q['options']))==4
            assert q['explanation']
            blocks=re.findall(r'```python\n(.*?)\n```',q['question'],re.S)
            if blocks:
                # Authored bounded arithmetic/list examples; no imports or external interaction.
                program='\n'.join(blocks)
                assert not re.search(r'\b(import|open|exec|eval|while)\b',program)
                output=io.StringIO()
                with contextlib.redirect_stdout(output):exec(program,{})
                answer=next(x['text'] for x in q['options'] if x['isCorrect'])
                assert output.getvalue().strip()==answer,(course,unit['unitKey'],answer)
                numeric+=1
    results.append(dict(course=course,units=len(manifest['units']),steps=step_count,traces=traces,quizzes=sum(len(u['quizzes']) for u in bank['units']),executedNumericAnswers=numeric))
report=ROOT/'docs/collaboration/tasks/20260910-curriculum-teaching-review/teaching-checks.json'
report.write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n')
print('PASS:',json.dumps(results,ensure_ascii=False))
