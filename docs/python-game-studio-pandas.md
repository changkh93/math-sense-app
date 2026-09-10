# CSV·pandas 수업 지원

게임 스튜디오의 수업용 pandas 모듈을 `studio-classroom-subset-2`로 확장했다. 사용자가 제공한 날씨 데이터 실습과 퀴즈 1–5를 대상으로 한다. 정식 pandas 패키지 전체가 아닌, 브라우저 실행기에 포함된 호환 모듈이다.

## 수업에서 사용하는 코드

| 기능 | 지원 예 |
|---|---|
| 표 만들기 | `pd.DataFrame({"name": ["왕새우", "홍길동"], "scores": [80, 90]})`, 사전 목록도 유지 |
| CSV 읽기 | `pd.read_csv("weather.csv")`, UTF-8 및 UTF-8 BOM |
| 숫자 인식 | 열 전체를 기준으로 정수·소수·지수 표기를 인식. 텍스트와 섞인 열은 문자열 유지 |
| 문자열 지정 | `pd.read_csv("codes.csv", dtype=str)` 또는 `dtype={"코드": str}`로 `007` 보존 |
| 열 선택 | `data["온도"]`, `data.온도` → Series |
| 값 선택 | `data["온도"][0]` → 행 번호 0의 값. 필터 후에도 원래 행 번호 유지 |
| 조건 선택 | `data[data.요일 == "월"]`, `data[data.population >= 3000000]` |
| 비교 | `==`, `!=`, `<`, `<=`, `>`, `>=`; 조건 Series끼리 `&`, `|`, `~` |
| 계산 | `Series.mean()`, `max()`, `min()`, 숫자 `sum()`; 기본은 빠진 값 제외 |
| 변환 | Series `to_list()/tolist()/to_dict()`, DataFrame `to_dict()` 및 `records/list/index/split` |
| 출력 | `print(data)`, `print(data["온도"])`로 열·행 번호·값 표시; 긴 표는 일부 표시 |
| 저장 | `data.to_csv("cities.csv")`; 기본 행 번호 포함, `index=False`이면 제외 |
| 기본 탐색 | `head(n=5)`, `shape`, `empty`, `index`, DataFrame `columns`, Series `dtype` 표시 |

`to_dict()` 기본값은 `{열 이름: {행 번호: 값}}`이다. 기존 플래시카드의 `to_dict(orient="records")`는 행별 사전 목록으로 계속 동작한다. 숫자 열의 빈 값과 흔한 NA 표기는 NaN으로 읽고, mean/max 등은 기본적으로 이를 제외한다. `skipna=False`도 지원한다. 문자열 열의 평균은 숫자로 억지 변환하지 않고 오류로 표시한다.

조건으로 고른 행은 인덱스를 초기화하지 않는다. 예를 들어 홍길동의 원래 행 번호가 1이면 `selected_data["scores"][1]`은 90, `[0]`은 KeyError다. 참/거짓 조건 Series는 원래 행 번호를 기준으로 정렬해 적용하고, 일치하지 않는 인덱스나 잘못된 길이는 오류로 알린다. 리스트 열 길이가 다른 DataFrame 입력도 오류다.

한글 열 이름을 자동완성에 표시하며 `data.온도.` 또는 `data["온도"].`에서 Series 메서드를 추천한다. CSV 파일 변경 후 열 이름도 갱신한다. 딕셔너리로 생성한 표의 열 이름과 필터링한 표의 형식도 추론한다. 실행하지 않고 정적으로 분석하므로 동적으로 생성한 모든 열 이름을 알아내지는 않는다.

## 바로 실행할 예제

`public/python-game-examples/pandas` 폴더를 ‘내 프로젝트 → 프로젝트 가져오기’로 연다.

- `main.py`: 사용자의 csv.reader 및 pandas 날씨 실습. `.py` 실행에서 보이도록 수식·선택 결과에 print를 붙였다.
- `quizzes.py`: 사용자의 퀴즈 1–5. 설명문을 주석 처리하고 들여쓰기를 복원했다.
- `weather.csv`, `weather_data.csv`: 같은 예시 날씨 자료. 두 파일명 모두 기존 수업 코드와 맞춘다.

기대 결과: 퀴즈 1·2는 행 번호 1의 홍길동/90점, 퀴즈 4는 서울·부산. 퀴즈 5는 `cities.csv`를 프로젝트에 생성하며 기본 행 번호를 포함한다. 저장 확인 문구를 출력하고, 기존 IndexedDB 자동 저장으로 새로고침 후에도 파일을 읽는다. 원래 컴퓨터 폴더를 직접 바꾸거나 Firebase에 자동 업로드하지 않는다.

콜랩과 달리 `.py`의 마지막 수식은 자동 출력하지 않는다. `print(data["온도"].mean())`처럼 작성한다. ‘가장 높은 온도 row’ 등 설명문은 `#`로 주석 처리한다. 학생 원본 코드를 실행기에서 자동으로 고치지 않는다.

## 범위와 제한

- CSV는 200 KB 이하 UTF-8 쉼표 구분 텍스트. 기존 프로젝트 전체 6 MB 제한, 파일 충돌·프로젝트 전환 보호 유지.
- CSV `encoding`, `dtype` 외 고급 옵션, 다중 인덱스, 중복 행/열 라벨, 전체 열 대입, groupby/merge/plot/Excel, 날짜·확장 dtype 등은 지원 범위 밖이다. NumPy 배열 입력과 .loc/.iloc 조회·단일 값 수정은 수학 과정 확장에서 추가했다. 범용 pandas 대체 패키지로 표시하지 않는다.
- CSV의 숫자 인식은 일반 수업용 정수/실수와 NA에 맞춘 제한된 추론이다. 임의의 모든 pandas dtype·문자열·결측 규칙과 완전히 같다는 보장은 아니다. dtype=str는 입력 문자열을 보존한다.
- 출력 모양은 한글 가독성을 위한 텍스트 표다. 정식 pandas의 HTML 표·정확한 출력 서식 복제는 아니다. 원본 데이터는 그대로 유지하며 출력 길이만 제한한다.
- 저장 동기화는 `to_csv`에 적용한다. 일반 `open(...).write()` 파일까지 자동 반영하지 않는다.

## 검증

- `npm run test:python-game-pandas`: 날씨 실습·퀴즈, 숫자/문자열/빈 값, 인덱스·필터, 변환·출력·CSV·오류 검사. 설치된 정식 pandas가 있으면 수업 결과와 CSV를 대조한다. 이번 환경은 pandas 2.2.2로 대조 통과.
- `npm run test:python-game-completion`: 실제 CSV 헤더·한글 열·Series 메서드·필터·헤더 갱신·조건 문자열 오추천 방지.
- `scripts/qa-python-game-pandas.mjs`: Chrome 폴더 가져오기 → 수업 실행 → 퀴즈 결과 → CSV 저장 → 새로고침 → 숫자로 재읽기 → 자동완성·인자 안내 확인.
- `scripts/qa-python-game-tkinter.mjs`: v2에서도 카드·타이머·버튼·기록 저장·새로고침·완료 상태·정지 회귀 통과.

참고한 공식 의미: [열 선택과 조건 필터링](https://pandas.pydata.org/docs/getting_started/intro_tutorials/03_subset_data.html), [to_dict](https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.to_dict.html), [Series.mean](https://pandas.pydata.org/docs/reference/api/pandas.Series.mean.html), [read_csv](https://pandas.pydata.org/docs/reference/api/pandas.read_csv.html).


2026-09-10 수학 과정 확장: NumPy 배열 입력, Series dtype, loc/iloc 조회·단일 값 수정을 추가했습니다. 최신 범위와 기존 문법 수정은 [수학 수업 문서](python-game-studio-math.md)를 따릅니다.
