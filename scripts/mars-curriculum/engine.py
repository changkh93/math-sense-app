"""Reviewed edit model shared by cumulative code, prose documents and replay tests."""
import ast
import copy
import json
import textwrap
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from curriculum_teaching import annotate, teaching_block, COMMENT_GUIDE
from curriculum_prediction_prompts import prediction, continuity
from curriculum_document_overrides import preserve_live_edits

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'content/mars-expedition'
SOURCE = ROOT / 'docs/collaboration/tasks/20260910-zombie-knight-curriculum/research/lecture-map.json'
LECTURES = json.loads(SOURCE.read_text())['lectures']
TITLES = [
    '숫자로 만드는 화성 지도', '타일을 조립해 지형 표시하기', '탐사원과 2차원 벡터 준비',
    '가속도와 마찰로 움직이기', '중력과 발판 착지', '점프와 화면 연결, 시작점 복귀',
    '탐사원 애니메이션', '투명한 부분과 충돌 마스크', '신호 복구 작전 미리 보기',
    '본 게임의 에셋과 프로젝트 준비', '게임 화면과 첫 설계도', '여섯 스프라이트의 역할 나누기',
    '한 화면을 순환하는 탐사 기지 설계', '지도를 읽어 타일 생성하기', '회전하는 신호원',
    '두 색의 이동 게이트', '탐사 정보와 남은 시간 표시', '탐사원 생성자 완성',
    '탐사원 등장과 가속도 이동', '바닥과 천장, 점프와 게이트', '행동 애니메이션과 펄스 발사',
    '두 종류의 고장 난 탐사 로봇', '로봇 이동과 임시 생성 시험', '걷기와 피격 정지 애니메이션',
    '로봇 재부팅과 에너지 피해', '일정 시간마다 로봇 생성', '신호 결정 만들기',
    '신호 결정을 먼저 회수하기', '탐사 성공과 다음 탐사', '탐사 종료와 새 게임, 정밀 판정',
    '임시 코드를 정리하고 최종 출격',
]
MODEL = dict(header='', helpers='', classes={}, setup='', loop='')
STEPS = []


def read_parts(filename):
    code = (OUT / filename).read_text()
    tree = ast.parse(code)
    lines = code.splitlines()
    classes = {}
    for node in tree.body:
        if isinstance(node, ast.ClassDef):
            classes[node.name] = {fn.name: '\n'.join(lines[fn.lineno - 1:fn.end_lineno]) for fn in node.body if isinstance(fn, ast.FunctionDef)}
    return code, classes


GAME, GAME_METHODS = read_parts('game.py')
TUTORIAL, TUTORIAL_METHODS = read_parts('tutorial.py')


def render(model=None):
    m = model if model is not None else MODEL
    chunks = [m['header'], m['helpers']]
    for name, methods in m['classes'].items():
        base = '' if name == 'Expedition' else '(pygame.sprite.Sprite)'
        chunks.append(f'class {name}{base}:\n' + '\n\n'.join(methods.values()))
    chunks.extend([m['setup'], m['loop']])
    return '\n\n'.join(chunk.rstrip() for chunk in chunks if chunk).rstrip() + '\n'


def part(key, value):
    return (key, copy.deepcopy(value))


def method(name, code=None, tutorial=False):
    cls, fn = name.split('.')
    return (name, code if code is not None else (TUTORIAL_METHODS if tutorial else GAME_METHODS)[cls][fn])


def body(name, text, tutorial=False, signature=None):
    cls, fn = name.split('.')
    signature = signature or (TUTORIAL_METHODS if tutorial else GAME_METHODS)[cls][fn].splitlines()[0]
    return method(name, signature + '\n' + textwrap.indent(textwrap.dedent(text).strip(), '        '))


def skeleton(names):
    return {name: {fn: code.splitlines()[0] + '\n        pass' for fn, code in GAME_METHODS[name].items()} for name in names}


def add(unit, title, why, changes, explanation, observe, normal, diagnose, experiment=None):
    count = sum(step['unit'] == unit for step in STEPS)
    sid = f'{unit:02}-{chr(65 + count)}'
    edits = []
    for key, value in changes:
        if '.' in key:
            cls, fn = key.split('.')
            old = MODEL['classes'][cls].get(fn, '')
            MODEL['classes'][cls][fn] = value
        else:
            old = MODEL[key]
            MODEL[key] = copy.deepcopy(value)
        edits.append(dict(key=key, before=copy.deepcopy(old), after=copy.deepcopy(value)))
    code = render()
    ast.parse(code)
    STEPS.append(dict(id=sid, unit=unit, title=title, why=why, edits=edits, explanation=explanation,
                      observe=observe, normal=normal, diagnose=diagnose, experiment=experiment,
                      previous=STEPS[-1]['id'] if STEPS else None, source=code))


def block(code):
    return teaching_block(code)


def edit_text(edit):
    key, before, after = edit['key'], edit['before'], edit['after']
    if not after:
        return {'classes': '기존 클래스 정의 구간 전체', 'helpers': '기존 준비 함수 구간 전체', 'setup': '기존 그룹·지도·객체 준비 구간 전체'}.get(key, key) + '를 삭제합니다. 새 빈 프로젝트여서 해당 구간이 없으면 추가하지 않고 넘어갑니다. 이 단계에서는 빈 구간으로 남깁니다.\n'
    if '.' in key:
        cls, fn = key.split('.')
        if not before:
            return f'`class {cls}` 안에서 기존 메서드 뒤에 새 `{fn}` 메서드를 추가합니다. 다른 class가 시작되기 전에 넣고 def 앞 4칸을 유지합니다.\n\n' + block(after)
        return f'`class {cls}` 안의 `{fn}` 메서드 전체를 아래 코드로 교체합니다. 다음 `def` 직전까지가 교체 범위입니다. `def` 앞 4칸, 본문 앞 8칸을 유지합니다.\n\n' + block(after)
    if key == 'classes':
        complete = render(dict(header='', helpers='', classes=after, setup='', loop=''))
        return ('준비 함수 아래, 그룹과 지도 코드 위의 **클래스 정의 구간 전체**를 아래로 ' + ('교체' if before else '추가') + '합니다.\n\n' + block(complete))
    markers = {'header': '파일 맨 위에서 준비 함수 또는 첫 class가 나오기 전까지의 준비 구간(별도 함수·클래스가 없으면 running = True 바로 위까지)',
               'helpers': 'clock 아래에서 첫 class 위까지의 그림·소리 준비 함수 구간',
               'setup': '마지막 클래스 아래에서 running = True 위까지의 그룹·지도·객체 준비 구간',
               'loop': 'running = True부터 파일 마지막 pygame.quit()까지의 실행 루프 전체'}
    return '**수정 위치:** ' + markers[key] + '. 아래 코드로 ' + ('교체' if before else '추가') + '합니다. 클래스나 메서드 안에 넣지 않습니다.\n\n' + block(after)


def emit():
    for name in ['checkpoints', 'experiments', 'data-log']:
        (OUT / name).mkdir(exist_ok=True)
    manifest = dict(title='화성 탐사대: 신호 복구', version=1,
                    regionId='reg_python_game_project', units=[], steps=[])
    for number, title in enumerate(TITLES, 1):
        steps = [step for step in STEPS if step['unit'] == number]
        if not steps:
            raise ValueError(f'Missing lesson {number}')
        lecture = LECTURES[number - 1]
        md = f'# Data Log {number:02} - {title}\n\n'
        md += f'원강의 {lecture["number"]}강의 제작 순서에 대응합니다. 영상 없이 이 문서만 보고 작성합니다. [강의 위치]({lecture.get("url", "https://www.udemy.com/course/the-art-of-doing-video-game-creation-with-python-and-pygame/learn/lecture/" + lecture["lectureId"])})는 순서를 확인하기 위한 참고입니다.\n\n'
        md += '파이썬 → **게임 스튜디오**에서 실습합니다. 정지 → main.py 수정 → 실행 → 게임 화면 클릭 순서로 진행하세요. 게임 화면에 포커스가 있어야 방향키와 Space가 전달됩니다. 각 단계의 편집을 모두 마친 다음 실행합니다. 게임이 작거나 아래쪽 HUD가 잘리면 게임 화면 오른쪽 위의 **크게 보기** 버튼으로 전체 화면에서 확인하세요.\n\n'
        if number == 1:
            md += '**내 프로젝트 → 화성 탐사대 수업 준비**로 빈 main.py와 에셋을 준비합니다. 프로젝트 이름에 기초 실험을 붙이고 01~08에서 같은 파일을 이어서 고칩니다. 매 단계 새 수업 준비를 누르지 않습니다.\n\n'
        elif number == 10:
            md += '**프로젝트 다운로드**로 기초 실험을 백업하고, **화성 탐사대 수업 준비**를 한 번 눌러 본 게임용 새 프로젝트를 만듭니다. 기존 기초 실험은 보존됩니다. 이번 단원의 에셋 확인 코드를 실행하고 11부터 본 게임을 작성합니다.\n\n'
        else:
            md += '이전 단원의 마지막 main.py에서 이어갑니다. 누적 코드는 스크롤 창에서 읽거나, 스튜디오의 **화성 탐사대 단계 비교·수업 자료**에서 에셋을 포함한 별도 프로젝트로 열 수 있습니다. 직접 작성한 초안을 먼저 백업하세요.\n\n'
        md += COMMENT_GUIDE + '\n'
        md += '[게임 스튜디오 열기](/python-game-studio) · [전체 수업 자료 ZIP](/mars-expedition/mars-expedition-course.zip) · [에셋 안내](/mars-expedition/ASSETS.html)\n'
        for step in steps:
            md += f'\n## {step["id"]} - {step["title"]}\n\n{step["why"]}\n\n'
            md += continuity(step) + prediction('mars-expedition', step) + '### 수정 위치와 입력할 코드\n\n'
            for index, edit in enumerate(step['edits'], 1):
                md += f'**편집 {index}.** ' + edit_text(edit) + '\n'
            if not step['edits']:
                md += '정식 코드 변경은 없습니다. 아래 실행 관찰을 순서대로 확인합니다.\n'
            md += '\n### 코드가 하는 일\n\n' + step['explanation']
            md += '\n\n### 여기서 실행하세요\n\n' + step['observe']
            md += '\n\n**이 시점의 정상 상태:** ' + step['normal']
            md += '\n\n**예상과 다를 때:** ' + step['diagnose'] + '\n'
            if step['experiment']:
                test = step['experiment']
                md += '\n### 잠깐 시험하고 복원하기\n\n정지한 뒤 `running = True` 바로 위에 아래 블록을 추가합니다.\n\n' + block(test['code'])
                md += '\n' + test['observe'] + '\n\n**복원:** 정지 → 방금 넣은 시험 블록만 삭제 → 다시 실행합니다. 다음 단계로 시험 설정을 가져가지 않습니다.\n'
                experiment_code = annotate(step['source']).replace('running = True', test['code'] + '\n\nrunning = True', 1)
                ast.parse(experiment_code)
                (OUT / 'experiments' / f'{step["id"]}.py').write_text(experiment_code)
            md += f'\n[이 단계 누적 코드 {step["id"]}.py](/mars-expedition/checkpoints/{step["id"]}.py)\n'
            (OUT / 'checkpoints' / f'{step["id"]}.py').write_text(annotate(step['source']))
            manifest['steps'].append({key: value for key, value in step.items() if key not in ['edits', 'source']})
        md += '\n## 확인하고 다음 단원으로\n\n- [ ] 실행 지점마다 화면과 조작 결과를 확인했습니다.\n- [ ] 임시 시험을 복원하고 프로젝트를 백업했습니다.\n- [ ] Code Trace에서 핵심 코드를 다시 입력했습니다.\n- [ ] Field Test 10문항에서 결과를 예측하고 해설을 확인했습니다.\n- [ ] Quiz Battle에서는 **현재 유닛만**을 선택해 이번 단원의 10문항으로 복습합니다. 이전 과정 전체를 선택하면 다른 단원도 출제됩니다.\n'
        (OUT / 'data-log' / f'{number:02}.md').write_text(preserve_live_edits('mars-expedition', number, md))
        manifest['units'].append(dict(unitKey=f'mars{number:02}', title=title, lectureId=lecture['lectureId'],
                                      lectureNumber=lecture['number'], section=lecture['section'], steps=[step['id'] for step in steps]))
    manifest['totalSteps'] = len(STEPS)
    (OUT / 'checkpoints/final-main.py').write_text(annotate(STEPS[-1]['source']))
    (OUT / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    (OUT / 'edits.json').write_text(json.dumps(dict(initial=dict(header='', helpers='', classes={}, setup='', loop=''),
                                                  steps=[{key: step[key] for key in ['id', 'previous', 'edits']} for step in STEPS]), ensure_ascii=False, indent=2) + '\n')
    print(f'Built {len(STEPS)} checkpoints and {len(TITLES)} Data Logs')
