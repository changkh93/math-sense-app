# 게임 스튜디오: 파이썬 수학 수업

## 실행 범위

- NumPy **1.26.4 실제 WASM 패키지**: array, zeros(1D/2D), 슬라이스·열 대입, 배열 산술, random.seed/randint, arange, histogram, multiply 등.
- Matplotlib **3.5.2 실제 WASM 패키지**: pyplot/Axes의 hist, bar, scatter, plot, text, 제목·축·눈금·격자·범례·범위·figsize·색/투명도. Agg가 그린 실제 픽셀을 PNG로 화면에 표시한다. 이 버전 Pillow WASM의 ImagingCore ABI 문제로 PNG 인코딩만 stdlib zlib/struct를 사용한다.
- itertools와 fractions는 CPython 표준 모듈. 순열·조합·데카르트 곱·정확한 분수 계산.
- pandas는 정식 패키지 전체가 아닌 **기존 수업용 호환 모듈**이다. CSV 수업 범위에 NumPy 1차원 열/2차원 배열, 행 튜플, Series(dtype=int/float/str/bool), `.loc`/`.iloc` 조회 및 단일 값 대입을 추가했다. 중복 인덱스, 일반 브로드캐스팅/정렬/고급 분석은 지원한다고 주장하지 않는다.

관련 Python 파일의 import를 검사해 필요한 패키지를 첫 사용에 준비하고, 같은 스튜디오 탭에서는 재사용한다. 새로고침하면 인터프리터는 다시 준비된다. 데이터/그림 자체를 Firebase에 보내지 않는다.

`plt.show()`와 정상 실행 종료 때 열린 그래프를 표시한다. 여러 그림은 결과 화면에서 스크롤한다. 다시 실행하거나 정지하면 이전 그림을 정리한다. `plt.show()`는 데스크톱 창을 띄우거나 클릭을 기다리지 않는다. 인터랙티브 확대/팬 및 Matplotlib GUI 이벤트/애니메이션은 이번 수업 지원 범위에 포함하지 않는다. 한 번에 20개, 그림당 8백만 픽셀/한 변 4096픽셀까지 표시한다.

기본 한글 글꼴은 저장소의 SIL OFL **Do Hyeon**이다. 라이선스는 `public/mars-expedition/OFL-DoHyeon.txt`. 프로젝트의 TTF/OTF는 font_manager에 등록된다. 해당 폰트의 family 이름을 `plt.rc('font', family='...')`로 지정한다. 수업에 사용한 Nanum 계열 이름이 실제로 설치되지 않았으면 Do Hyeon으로 대체한다. 원본 나눔 글꼴과 모양까지 동일한 것은 아니다.

## 수업 자료에서 바꿀 부분

1. `.py` 파일에서는 `e`, `Fraction(...)`, `data_array * 2`만 적으면 계산 결과를 출력하지 않는다. `print(e)`, `print(Fraction(...))`, `print(data_array * 2)`를 사용한다. 그래프는 별도로 자동 표시한다.
2. `h.몸무게[0]`처럼 문자열 인덱스에 정수 위치를 섞는 예전 pandas 문법 대신 `h.iloc[0, 0]` 또는 `h.loc['왕새우', '몸무게']`를 사용한다. 수정은 `h.loc['왕새우', '몸무게'] = 100`. 호환 모듈의 Series는 복사본이므로 연쇄 수정으로 원본 표를 바꾸지 않는다.
3. `np.arange(20, 55, 5)`의 마지막 값은 **50**. 20~54 전체 자료의 히스토그램 경계는 `np.arange(20, 56, 5)`로 55를 포함한다. 마지막 구간만 오른쪽 끝을 포함한다.
4. `sum(data[5:]) / len(weights)`는 비율이다. 백분율이면 `* 100`을 붙인다.
5. `1 / x`에서 x=0은 NumPy의 inf(무한대)이다. 그 점에서는 선이 끊긴다. 경고는 계산 중단 오류와 다르다.
6. 채팅에 붙여 넣으며 소실된 들여쓰기와 줄 끝 역슬래시는 Python 문법에 맞게 복구해야 한다. 편집기는 학생 소스를 임의로 수정하지 않는다.

수업 기준 예제: `public/python-game-examples/math/`의 main.py(배열/표), histograms.py(도수), graphs.py(함수), probability.py(확률). 기존 ‘프로젝트 가져오기’로 폴더를 선택하고 실행할 파일을 연다. 샘플이 새 학생 프로젝트에 자동 생성되지는 않는다.

## 검증

- `python3 -B scripts/test-python-game-math.py`: 실제 설치된 NumPy/pandas와 결과 대조, 행/열/슬라이스/단일 값 수정 및 잘못된 입력.
- `node scripts/qa-python-game-math.mjs`: Chrome 실제 WASM 패키지, 수업 예제, 한글 그래프 픽셀, 정상 종료 자동 표시, 패키지 재다운로드 없음, 인터프리터 재사용, 일반 print 전환, 편집기 자동완성.
- 기존 pandas/CSV, tkinter, turtle/동기 pygame 루프, 프로젝트 정책과 완성 모델 회귀 검증을 함께 수행한다. 실제 검증 결과와 제한은 협업 task STATE에 기록한다.
