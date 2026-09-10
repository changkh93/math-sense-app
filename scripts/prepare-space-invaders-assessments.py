from curriculum_assessment_review import review_bank
"""Curate the first returned bank against the coordinator-authored curriculum."""
import json, zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
TASK=ROOT/'docs/collaboration/tasks/20260909-space-invaders-curriculum'
with zipfile.ZipFile(TASK/'01-draft-reviewed.zip') as z:
    a=json.loads(z.read('draft/assessments.json'))
manifest=json.loads((ROOT/'content/space-invaders/manifest.json').read_text())

def q(unit,index,prompt,correct,wrong,reason):
    # Each distractor has its own concrete reason; avoid answer-index references.
    pos=(index+unit)%4
    opts=[{'text':t,'isCorrect':False} for t,why in wrong]
    opts.insert(pos,{'text':correct,'isCorrect':True})
    a['units'][unit-1]['quizzes'][index-1]={'question':prompt,'options':opts,'explanation':reason+'\n'+'\n'.join(f'오답 「{t}」: {why}' for t,why in wrong),'score':1}

def trace(unit,index,title,scope,code,concepts):
    e=a['units'][unit-1]['exercises'][index-1]
    e.update(title=title,prompt=scope+' 아래 코드를 입력하고 각 줄이 실행되는 순서를 설명하세요.',answerLines=code.split('\n'),concepts=concepts,hints=['Data Log의 같은 클래스·메서드와 비교합니다.','조건문 안과 밖의 들여쓰기를 구분합니다.'],commonMistakes=[{'message':'클래스 안 메서드는4칸, 메서드 본문은8칸입니다. 연습 조각은 제시된 문맥의 들여쓰기를 기준으로 입력합니다.'}])

trace(3,2,'이동 후 양쪽 경계 보정','Scout.update에서 좌우 이동을 처리한 뒤의 본문입니다.', 'if self.rect.left < 0:\n    self.rect.left = 0\nif self.rect.right > SCREEN_WIDTH:\n    self.rect.right = SCREEN_WIDTH',['Rect','경계 보정'])
trace(3,3,'Scout 중앙 복귀','Scout 클래스 내부에 작성하는 메서드입니다.', 'def reset(self):\n    self.rect.centerx = SCREEN_WIDTH // 2',['메서드','centerx'])
trace(6,3,'Raider 발사 연결','Raider 클래스 내부입니다. self.pulses는 적 탄환 그룹입니다.', 'def fire(self):\n    RaiderPulse(self.rect.centerx, self.rect.bottom, self.pulses)',['생성자','그룹 참조'])
trace(9,3,'상태 확인의 첫 단계: 전장 정돈','Mission.check_game_status 본문의 첫 부분입니다. 생명 분기는 이 코드 뒤에 이어집니다.', 'self.scout_pulses.empty()\nself.raider_pulses.empty()\nself.scout.reset()\nfor raider in self.raiders:\n    raider.reset()',['empty','reset','순서'])
trace(10,1,'게임오버 문구 유지','Mission 클래스 내부입니다. 새 게임 초기화는 Enter에서 restart_game으로 따로 실행합니다.', "def reset_game(self):\n    self.pause_game(f'최종 점수: {self.score}', 'Enter 키를 눌러 다시 도전하세요')\n    self.state = 'game_over'",['상태','게임오버'])
trace(10,2,'격추된 적 수만큼 점수 계산','Mission.check_collisions 본문 중 아군 탄환과 적의 검사입니다.', 'hits = pygame.sprite.groupcollide(self.scout_pulses, self.raiders, True, True)\nif hits:\n    self.raider_break_sound.play()\n    for killed_raiders in hits.values():\n        self.score += 100 * len(killed_raiders)',['groupcollide','목록 길이','점수'])
q(2,2,'clock.tick(60)의 역할로 알맞은 것은?','루프를 초당 최대60회로 제한한다.', [('항상 정확히60FPS를 보장한다.','기기 성능이 부족하면 실제 FPS는 낮아집니다.'),('모든 물체를60픽셀 이동시킨다.','이동거리는 update에서 정합니다.'),('60초 후 게임을 끝낸다.','종료 타이머가 아닙니다.')],'tick은 반복 속도의 상한을 조절합니다. 이 게임은 프레임당 이동거리로 작성해 실제 FPS가 낮으면 움직임도 느려질 수 있습니다.')
q(2,5,'이 게임의 종료 코드와 스튜디오 정지 버튼을 바르게 이해한 것은?','코드는 Pygame QUIT 이벤트를 처리하고, 스튜디오 정지 버튼은 실행기를 멈춘다.', [('스튜디오 정지가 반드시 QUIT을 보내야만 끝난다.','실행기를 중단하는 UI 동작과 Pygame 이벤트 처리는 구별합니다.'),('웹에서도 별도 게임창의 X를 찾아야 한다.','스튜디오에서는 정지 버튼을 사용합니다.'),('QUIT을 받으면 running을 True로 바꾼다.','반복 종료를 위해 False로 바꿉니다.')],'QUIT 처리에서는 running=False로 바꾸고 루프를 벗어납니다. 학생은 스튜디오 정지로 실행을 끝낼 수 있습니다.')
q(3,5,'left=1인 기체가 왼쪽으로8픽셀 이동했다. 이동 후 left<0이면 left=0으로 보정할 때 최종 left는?','0',[('-7','보정하기 전 좌표입니다.'),('1','이동 자체가 없었던 경우입니다.'),('8','이동거리를 위치로 혼동한 값입니다.')],'1-8=-7이지만 보정 조건이 참이어서 최종 left는0입니다.')
q(4,9,'아군 탄환 velocity=10, 기체 velocity=8일 때 올바른 해석은?','한 번의 update에서 탄환 y는10 감소하고 기체는 좌우 입력에 따라 x가8 변한다.', [('탄환이 기체보다 느리면 위로 갈 수 없다.','움직이는 축이 다르며 위쪽 이동은 y 감소로 정합니다.'),('모든 탄환이 초당10픽셀 움직인다.','10은 초당이 아니라 update당 값입니다.'),('기체도 위로8픽셀 이동한다.','기체는 수평으로만 이동합니다.')],'속도 값은 각 객체의 update에서 좌표를 바꾸는 양입니다. 서로 다른 축의 이동을 구별합니다.')
q(5,4,'random.randint(0,1000)>999의 확률과 대기시간 설명으로 알맞은 것은?','확률은1/1001이고,60FPS·한 적·탄환 제한이 없는 가정에서 평균 약16.7초다.', [('확률은1/1000이고 정확히16초마다 발사한다.','양끝 포함1001가지이며 고정 주기가 아닙니다.'),('1000보다 큰 수가 없어 발사하지 않는다.','조건은999보다 큰 수이며1000이 해당합니다.'),('적55기가 있어도 전체 발사는 항상16.7초 간격이다.','각 적이 따로 추첨하고 공통 탄환 제한도 적용됩니다.')],'0~1000의1001가지 중1000 하나만 조건을 만족합니다. 평균은 개별 발사 시간을 보장하지 않습니다.')
q(6,4,'적 탄환의 top=150일 때 실수로 if self.rect.top < SCREEN_HEIGHT: self.kill()을 실행했다. 높이는700이다. 결과는?','화면 안인데도150<700이 참이어서 탄환이 제거된다.', [('바닥을 넘은 뒤에만 제거된다.','이 조건은 바닥 이전 좌표에서도 참입니다.'),('탄환이 위로 이동한다.','조건은 제거 여부를 바꾸며 이동 부호와는 별개입니다.'),('700점이 추가된다.','kill은 점수를 더하는 함수가 아닙니다.')],'아래로 나간 전체 탄환을 검사하려면 top>SCREEN_HEIGHT를 사용합니다.')
q(7,1,'제공한 assets/DoHyeon-Regular.ttf를 직접 로드하는 이유는?','게임에 필요한 한글 폰트를 함께 제공하여 기기의 기본 폰트에 의존하지 않기 위해',[('세상의 모든 문자와 이모지를 보장하기 위해','폰트에 없는 글리프는 표시할 수 없습니다.'),('게임 FPS를 무조건60으로 올리기 위해','폰트 로딩은 프레임 속도 보장이 아닙니다.'),('글자 내용을 이미지 파일 이름으로 바꾸기 위해','문자열은 font.render에서 글자 표면으로 만듭니다.')],'프로젝트 안의 같은 폰트를 사용합니다. 게임에서는 확인된 한글과 ASCII 하이픈을 사용합니다.')
q(8,5,'방어선 y=600에서 raider.rect.bottom>=600이 처음 참이 되는 bottom 값은?','600',[('599','600보다 작아 조건이 거짓입니다.'),('601','참이지만 최초 값은600입니다.'),('700','화면 바닥과 방어선을 혼동했습니다.')],'이상(>=)이므로 방어선에 닿는 순간600부터 침범으로 판단합니다.')
q(8,8,'08단원에서 침범 후 다시 하강할 때 기체가 또 줄 수 있는 이유는?','check_game_status가 아직 pass여서 적 위치 복원과 대기가 구현되지 않았기 때문이다.', [('생명은 매 프레임 반드시 감소하도록 만들었다.','생명 차감은 경계 하강에서 침범을 확인했을 때입니다.'),('폰트를 로드하면 생명이 감소한다.','폰트와 생명 규칙은 관계없습니다.'),('Group은 항상 같은 Sprite를55번 복제한다.','그룹은 추가한 객체들을 관리합니다.')],'09단원에서 탄환 정리·위치 복원·일시정지를 연결합니다.08에서는 확인 후 임시 시험값을 복원합니다.')
q(9,1,'이 웹 실행기에서 별도의 동기 대기 while 대신 기존 메인 루프와 state를 쓰는 이유는?','최상위 루프의 제어권 양도를 유지하면서 게임 update만 건너뛰기 위해',[('state를 쓰면 모든 성능 문제가 없어진다.','상태 변수만으로 모든 지연이 해결되지는 않습니다.'),('Python에서는 while을 쓸 수 없기 때문에','게임의 최상위 while은 계속 사용합니다.'),('메서드는 변수 값을 바꿀 수 없기 때문에','메서드에서 상태와 안내 문구를 바꿉니다.')],'메서드 안의 동기 중첩 루프는 실행기가 최상위에서 양보하는 흐름을 우회해 브라우저 응답을 막을 수 있습니다.')
q(10,5,'적 격추 시 실제로 구현된 화면·소리 변화는?','적 스프라이트와 아군 탄환이 제거되고 raider_break.ogg가 재생된다.', [('파편 수백 개가 생성된다.','파편 애니메이션은 구현하지 않았습니다.'),('배경음악이 새 파일로 바뀐다.','배경음악 전환 기능은 없습니다.'),('적이 파란색으로만 바뀌고 남아 있다.','충돌한 적은 그룹에서 제거됩니다.')],'실제 코드의 제거와 Sound.play에 해당하는 관찰 결과입니다.')
q(10,10,'생명1,점수0에서 마지막 적을 격추하고 같은 프레임에 적 탄환에 맞았다. 처리 직후 결과는?','최종점수100과 game_over를 유지하고 라운드 보너스를 더하지 않는다.', [('점수1100으로 다음 라운드를 시작한다.','피격에서 상태가 바뀌면 이후 완료 검사를 중단합니다.'),('격추점수도 무조건0으로 돌아간다.','초기화는 Enter 새 게임 때 실행합니다.'),('적을 먼저 맞혔으므로 생명이 줄지 않는다.','같은 충돌 검사에서 기체 피격도 처리합니다.')],'아군 격추점수100을 더한 뒤 기체 피격으로 game_over가 됩니다. update의 상태 검사와 return이 라운드 완료로 덮이는 일을 막습니다.')
for i,u in enumerate(a['units']):
    u['title']=manifest['units'][i]['title']
    for e in u['exercises']:
        e['commonMistakes']=[{'message':x} if isinstance(x,str) else x for x in e.get('commonMistakes',[])]
        # Context is provided in the prompt; code fragments are not standalone games.
        if not e.get('prompt'):e['prompt']='Data Log의 같은 이름의 클래스와 메서드를 참고해 코드를 입력합니다.'
        assert 2<=len(e['answerLines'])<=8
    assert len(u['quizzes'])==10
    for quiz in u['quizzes']:
        assert len(quiz['options'])==4 and sum(o['isCorrect'] for o in quiz['options'])==1
(ROOT/'content/space-invaders/assessments.json').write_text(json.dumps(review_bank('space-invaders',a),ensure_ascii=False,indent=2)+'\n')
print('Curated 29 traces and 100 questions from the reviewed first bank; superseded second bank not imported.')
