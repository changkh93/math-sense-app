export const chapters = {
 foundation: {order:'01', name:'처음 파이썬', accent:'#7ff0cd', hook:['코드 한 줄이,','나만의 그림으로.'], question:'각도를 바꾸면 어떤 꽃이 될까요?', captions:['숫자와 색을 정하고','반복문으로 거북이를 움직이면','내 생각이 눈앞의 그림이 됩니다.'], takeaway:['변수로 정하고','반복으로 만들고','결과를 관찰해요'], code:'for i in range(18):\n    t.circle(105)\n    t.left(20)', ending:'첫 코드에서 발견하는, 만드는 즐거움.'},
 lumi: {order:'02', name:'루미 프로토콜', accent:'#a4b5ff', hook:['명령을 내리면,','모험이 시작됩니다.'], question:'루미를 목표까지 보내려면?', captions:['항로를 관찰하고 순서를 생각해요.','앞으로 이동 → 회전 → 다시 이동','코드가 행동이 되는 게임형 미션'], takeaway:['상황을 관찰하고','명령을 조합하고','미션으로 확인해요'], code:'lumi.move(2)\nlumi.turn(90)\nlumi.move(1)', ending:'플레이를 넘어, 스스로 판단하는 코드로.'},
 advanced: {order:'04', name:'파이썬 심화', accent:'#ffc968', hook:['내가 쓰고 싶은 앱,','직접 만들어 볼까요?'], question:'버튼을 누르면 어떤 함수가 실행될까요?', captions:['화면과 버튼을 코드로 연결하고','함수를 실행해 카드의 뜻을 바꿉니다.','작은 기능들이 하나의 프로그램으로.'], takeaway:['함수와 객체','화면과 이벤트','파일과 데이터'], code:'def flip_card():\n    canvas.itemconfig(\n        word, text=cards[index][1])', ending:'배운 문법을, 쓸모 있는 프로그램으로.'},
 math: {order:'05', name:'파이썬 수학', accent:'#6fdaff', hook:['수학의 규칙,','눈으로 실험해요.'], question:'기울기가 달라도 만나는 점은?', captions:['NumPy로 수를 만들고','계수를 바꿔 그래프를 그려 봅니다.','관찰한 관계를 내 말로 설명해요.'], takeaway:['자료와 통계','함수와 그래프','확률과 분수'], code:'for a in [1, 2, -1]:\n    y = a * x + 1\n    plt.plot(x, y)', ending:'공식 너머의 관계를 발견하는 시간.'},
 algorithm: {order:'06', name:'생각의 항로', accent:'#dfb1ff', hook:['정답을 맞히기 전에,','규칙을 발견합니다.'], question:'0, 3, 6, 9… 다음 신호는 언제 열릴까요?', captions:['관측 기록에서 반복을 찾아요.','찾은 규칙을 나머지 연산으로 표현하고','새로운 입력에서도 맞는지 확인합니다.'], takeaway:['관찰과 예측','패턴의 코드화','다른 경우 검증'], code:'opened = time % 3 == 0\n\nprint(12 % 3 == 0)', ending:'생각의 과정을, 알고리즘으로 표현해요.'},
} as const;
export type CourseId = keyof typeof chapters;
export type Chapter = typeof chapters[CourseId];
