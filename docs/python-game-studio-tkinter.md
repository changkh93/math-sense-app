# tkinter 플래시카드 수업 지원

스튜디오의 동일한 실행 버튼으로 `from tkinter import *`와 아래 수업용 API를 사용할 수 있다. 별도 설치 명령이나 시작 버튼은 필요 없다. 데스크톱 Tcl/Tk 전체가 아니라 브라우저 안에서 동작하는 제한된 호환 계층이다.

## 예제 열기

`public/python-game-examples/tkinter` 폴더를 ‘내 프로젝트 → 프로젝트 가져오기’에서 선택한다. `main.py`, `data/english_word.csv`, `images/`의 PNG 네 장이 필요하다. 학생이 가진 동일 이름 이미지로 교체할 수 있다. 기본 제공 그림은 검증용으로 직접 만든 단순 카드·버튼이다.

단어가 표시된 뒤 3초가 지나면 한국어가 나온다. X 버튼은 다음 단어로 넘어가고, 체크 버튼은 현재 단어를 학습 목록에서 지운 뒤 CSV에 저장한다. 예제에는 마지막 단어를 익힌 경우의 완료 처리와 CSV 열 이름 보존을 추가했다. 이 두 처리는 원래 코드에서 `random.choice([])` 오류와 빈 CSV 문제가 생기는 것을 막는다. 실행기는 학생 소스를 몰래 고치지 않는다.

## 지원 범위

- `Tk`: `title`, `config/configure`(padx/pady/bg), `after(ms, func, *args)`, `after_cancel`, `mainloop`, `quit`, `destroy`.
- `Canvas`: 크기·배경 설정, `grid`, `create_image`, `create_text`, `itemconfig/itemconfigure`로 image/text/font/fill/anchor/state 변경.
- `PhotoImage(file=...)`: PNG, width/height. 이미지 5 MB 이하, 가로·세로 각각 8192픽셀 이하.
- `Button`: image/text/command/state, config/configure, grid. 키보드 Enter/Space와 마우스 클릭.
- `grid`: row/column/columnspan/rowspan/padx/pady/sticky(좌우 정렬). 화면이 작으면 창 전체를 축소한다.
- 학생 변수·객체를 포함한 Tk/pandas 자동완성, 인자 설명, 이미지·CSV 경로 추천.

`mainloop()`는 코드 마지막에 놓는다. 브라우저 이벤트 처리는 실행기가 담당하므로 데스크톱처럼 호출에서 Python 흐름을 막는 중첩 mainloop는 지원하지 않는다. 하나의 Tk 창만 지원한다. Frame/Entry/Label/Toplevel/ttk, pack/place, bind, 파일 대화상자 등은 이번 범위에 없다. 지원하지 않는 옵션은 오류로 알려 준다. 콜백에서 예외가 나면 출력·오류 영역에 원래 Python 줄 번호를 표시하고 실행을 종료한다. 정지·재실행 시 창·예약·콜백이 모두 정리된다.

## 수업용 pandas와 CSV

현재 고정된 pygame-web CPython 3.12 패키지 목록에는 pandas가 없다. 별도의 수업용 호환 모듈을 제공한다. 이후 날씨 데이터 수업에 맞춰 `studio-classroom-subset-2`로 확장했으며, [현재 pandas 지원 범위](python-game-studio-pandas.md)를 기준으로 한다.

- `pd.read_csv(path, encoding='utf-8', dtype=None)`: UTF-8/BOM CSV. 숫자 열은 정수·실수로 인식한다. 숫자 모양 단어도 문자열로 보존하려면 `dtype=str`를 지정한다.
- `pd.DataFrame(list_of_dicts, columns=None)` 및 열별 리스트 사전, 열 선택·Series·조건 조회·기본 통계.
- `data.to_dict(orient='records')`는 기존 카드 수업과 동일하게 행별 사전 목록을 반환한다. 인자를 생략한 `to_dict()`도 지원한다.
- `data.to_csv(path, index=False, encoding='utf-8')`는 기존 플래시카드와 동일하게 프로젝트 CSV에 저장한다.

CSV 업로드/폴더 가져오기/미리보기/파일 다운로드를 지원한다. CSV는 UTF-8 텍스트, 200 KB 이하이며 전체 프로젝트 6 MB 제한에 포함된다. 출력 경로의 상위 폴더는 있어야 한다. 잘못된 경로/인코딩/열 개수는 오류로 알린다.

`to_csv`로 프로젝트 안에 쓴 CSV는 검증된 메시지를 통해 현재 프로젝트에 추가·갱신되고 기존 IndexedDB 자동 저장으로 보관된다. 원래 컴퓨터 폴더를 직접 수정하지 않으며 Firebase에 자동 업로드하지 않는다. 새로고침 후 같은 브라우저·계정의 프로젝트에서 이어서 읽을 수 있다. 브라우저 데이터 삭제 시 사라질 수 있으므로 필요한 CSV/프로젝트는 다운로드한다. `open(...).write()` 등 다른 파일 쓰기까지 자동 저장하는 기능은 아니다.

실행 중 CSV를 교체·이동·삭제했다면 실행 시점/직전 저장본과 비교해 충돌을 알리고 덮어쓰지 않는다. 다른 프로젝트나 `.py`/이미지 파일은 런타임 저장 메시지로 수정할 수 없다. 저장 공간 부족 및 다른 탭 충돌은 기존 초안 오류 안내로 처리한다. 과제 제출의 ‘코드 스튜디오에서 추가’는 이전 요청대로 `.py`만 선택한다.

## 검증

- `npm run test:python-game-tkinter`: 타이머 취소, 버튼 호출, 이미지·캔버스 명령, 오류 전파, CSV 따옴표·줄바꿈·BOM·빈 목록.
- `npm run test:python-game-studio`: CSV 형식/크기와 실행 저장의 경로·프로젝트·동시수정 검사 포함.
- `npm run test:python-game-completion`: Tk/pandas 객체·CSV/이미지 경로 추천 포함.
- `scripts/qa-python-game-tkinter.mjs`: 실제 Chrome 수업 예제, 3초 뒤집기/취소, 버튼, IndexedDB 저장·새로고침, 완료 상태, 콜백 오류, 동일 엔진 재실행.

Safari/Firefox 및 실물 태블릿은 별도 검증 전이다.
