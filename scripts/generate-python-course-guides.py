"""Build source-backed reading notes, not invented course lessons.
The source corpus and local verification results are versioned separately.
"""
import ast,builtins,collections,json,pathlib,re,urllib.parse,sys
ROOT=pathlib.Path(__file__).resolve().parents[1];D=ROOT/'content/python-guides';E=D/'expansion'
items=json.loads((E/'sources.json').read_text());checks={a['slug']:a for a in json.loads((E/'verification.json').read_text())}
# Editorial explanations describe the constructs actually present in each excerpt.
CONCEPTS=[
 ('pygame.image.load', '이미지 파일을 준비하는 단계', '이미지 경로는 현재 실행하는 프로젝트의 폴더를 기준으로 찾습니다. 파일 이름의 대소문자나 확장자가 다르면 읽지 못합니다. convert_alpha를 쓰는 경우 디스플레이가 먼저 준비되어 있어야 합니다.', '파일을 읽는 줄과 실제 화면에 붙이는 줄을 구분하세요. 이미지 로드 성공만으로 화면에 보이는 것은 아닙니다.'),
 ('pygame.display.set_mode', '게임 화면의 좌표 범위', '창 크기는 (가로, 세로) 순서입니다. 보통 왼쪽 위가 (0,0)이고 x는 오른쪽, y는 아래쪽으로 증가합니다. 화면 크기를 바꾸면 객체의 시작 위치와 경계 조건도 함께 검토해야 합니다.', '가로와 세로 값을 서로 바꾸었을 때 창의 비율과 중앙 좌표가 어떻게 달라질지 계산해 보세요.'),
 ('pygame.font', '글자도 먼저 그림으로 만듭니다', '폰트 객체의 render 결과는 글자가 그려진 Surface입니다. 문자열을 만드는 단계, Surface로 바꾸는 단계, 화면에 붙이는 단계를 분리해서 읽습니다. 한글 글꼴 파일은 프로젝트에 실제로 있어야 합니다.', '표시할 문장만 바꾸고 글자 그림의 크기와 배치가 달라지는지 확인하세요.'),
 ('pygame.mixer', '효과음과 배경음악', '소리 파일을 불러오는 작업과 재생하는 작업은 별개입니다. 같은 사건이 매 프레임 참이면 소리가 반복해서 시작될 수 있습니다. 재생을 한 번만 시작할 사건인지 계속 유지할 상태인지 구분합니다.', '볼륨을 낮춘 뒤 한 번의 사건에서 재생이 몇 번 호출되는지 먼저 출력으로 확인하세요.'),
 ('Vector2', '위치와 속도를 두 성분으로 나누기', '2차원 벡터는 가로와 세로 성분을 묶습니다. 위치에 속도를 더하고 속도에 가속도를 더하는 순서가 이동에 영향을 줍니다. 픽셀 단위 위치와 프레임당 변화량을 구분하세요.', '가로 성분을 고정하고 세로 성분만 바꾸었을 때 이동 방향을 예측해 보세요.'),
 ('self.vel', '속도가 위치를 바꾸는 순서', '속도는 현재 위치가 아니라 위치의 변화량입니다. 마찰이나 중력은 속도를 바꾸며, 그 속도가 다음 위치에 반영됩니다. 경계에서 위치를 보정하는 코드와 속도를 뒤집는 코드는 역할이 다릅니다.', '한 프레임 전후의 위치와 속도를 각각 적고 어떤 대입이 먼저 일어나는지 따라가세요.'),
 ('self.rect', '화면 속 객체의 사각형', 'rect는 객체가 놓인 위치와 크기를 나타냅니다. x·y, left·right, center를 같은 좌표라고 생각하면 배치가 달라집니다. 이미지의 크기가 바뀔 때 중심을 유지하는지도 확인합니다.', '객체의 중앙과 왼쪽 끝을 각각 표시하고, 이동 후 두 값이 같은 거리만큼 바뀌는지 확인하세요.'),
 ('to_dict(', '표를 카드 목록으로 바꾸기', 'DataFrame.to_dict의 orient가 records이면 행마다 딕셔너리 하나가 만들어집니다. 열 이름이 키가 되고, 여러 행은 리스트로 묶입니다. 표의 행과 카드 한 장이 어떻게 연결되는지 읽습니다.', '카드 한 장에서 English와 Korean 키를 각각 찾아 출력하고 원래 표의 같은 행과 대조하세요.'),
 ('random.choice', '무작위 선택과 목록의 상태', 'choice는 비어 있지 않은 목록에서 하나를 고릅니다. 학습한 카드를 제거한 뒤 목록이 비면 다음 선택을 할 수 없습니다. 선택 전에 빈 목록을 처리하는 경로가 있는지 확인합니다.', '카드가 한 장 남았을 때와 한 장도 없을 때의 다음 동작을 나누어 적어 보세요.'),
 ('append(', '목록 뒤에 하나씩 쌓기', 'append는 현재 목록의 맨 뒤에 항목 하나를 더합니다. 목록 전체를 인자로 주면 여러 항목으로 풀리는 것이 아니라 그 목록 하나가 들어갑니다. 반복 중 어느 시점에 append하는지에 따라 누적 결과가 달라집니다.', '반복 한 번 뒤의 목록과 두 번 뒤의 목록을 각각 적고 길이가 어떻게 늘어나는지 확인하세요.'),
 ('range(', '시작과 끝의 포함 여부', 'range의 끝값은 포함되지 않습니다. 반복 횟수를 정할 때 마지막으로 필요한 값과 끝 인자를 구분합니다. 간격이 음수이면 시작값과 끝값의 방향도 맞아야 합니다.', '작은 범위로 바꾸어 list(range(...))를 먼저 확인한 뒤 반복 횟수의 예측과 대조하세요.'),
 ('Fraction(', '분수를 소수로 바꾸기 전에', 'Fraction은 분자와 분모를 정수로 보관합니다. 1/3을 소수 근삿값으로 먼저 계산한 뒤 다시 분수로 바꾸는 것과, Fraction(1, 3)으로 만드는 것은 구분해야 합니다. 분모에는 0을 넣을 수 없습니다.', 'Fraction(1, 2)와 Fraction(2, 4)를 비교하고, 분자·분모가 달라도 같은 값이 되는 이유를 설명해 보세요.'),
 ('is_prime', '소수 판별의 반례', '1은 소수가 아닙니다. 2는 가장 작은 소수이고, 9처럼 작은 수의 제곱은 반드시 제외해야 합니다. 나누어떨어지는 수를 하나 찾았다는 사실과 끝까지 찾지 못했다는 사실을 서로 다른 반환 경로로 읽습니다.', '함수 정의가 준비되면 1·2·9·11을 각각 넣어 False·True·False·True가 나오는지 대조하세요. 작은 표본의 통과가 모든 입력의 검증을 대신하지는 않습니다.'),
 ('determinant', '연립방정식에서 먼저 확인할 값', '행렬식 a1*b2-a2*b1이 0이 아니면 두 식을 소거해 한 쌍의 해를 계산할 수 있습니다. 0이면 같은 직선인지 평행한 다른 직선인지 따로 보아야 합니다. 이 예제는 각 식의 x·y 계수가 둘 다 0인 퇴화한 식까지 일반적으로 처리하는 풀이기로 사용하지 않습니다.', '구한 x와 y를 원래 두 식 모두에 대입하세요. 한 식만 맞는 값은 연립방정식의 해가 아닙니다.'),
 ('def gcd', '나머지와 최대공약수', '양의 정수 a와 b에서 a를 b로 나눈 나머지를 r이라고 하면 gcd(a,b)=gcd(b,r)입니다. 마지막 나머지가 0일 때 남은 수를 반환합니다. 음수까지 허용하려면 반환값의 부호를 별도로 정해야 합니다.', '24와 10을 손으로 나누어 나머지 4, 2, 0을 적은 뒤 함수의 변수 이동과 대조하세요.'),
 ('def lcm', '최소공배수의 입력 범위', '여기서는 양의 정수를 다룹니다. 두 수의 곱을 최대공약수로 나누는 방식과 각 소인수의 최대 개수를 모으는 방식은 같은 양을 계산합니다. 0이나 음수를 넣을 때의 규칙은 이 연습의 범위와 분리합니다.', '12와 18의 결과가 36인지 확인하고, 36을 두 수로 각각 나누었을 때 나머지가 0인지 검산하세요.'),
 ('def factorization', '소인수분해에서 중복은 필요합니다', '12를 소인수분해하면 2, 2, 3입니다. 같은 소수 2가 두 번 나오는 정보를 지우면 원래 수를 되찾을 수 없습니다. 원본의 나눗셈이 /이면 중간값은 실수가 되므로 큰 정수까지 확장할 때는 나누어떨어지는 조건 안에서 //로 정수 연산을 유지하는 개선을 검토합니다.', '원본의 작은 양의 정수 예제로 먼저 확인하고, 반환된 소인수들을 모두 곱해 시작한 수가 되는지 검산하세요.'),
 ('fibonacci', '앞의 두 항을 기억하는 이유', '이 과정의 피보나치 수열은 첫째와 둘째 항을 1로 둡니다. 다음 항을 만들 때 바로 앞 두 항이 필요합니다. 수열의 번호를 0부터 시작하는 다른 정의와 섞으면 결과가 한 칸 어긋납니다.', '1, 1, 2, 3, 5, 8을 종이에 적고 6번째 항이 8인지 확인하세요.'),
 ('fibo_vars', '두 변수로 수열을 옮기기', 'a,b=b,a+b는 오른쪽을 먼저 계산한 뒤 두 변수에 함께 넣습니다. a=b를 먼저 실행하고 b=a+b를 다음 줄에 쓰면 원래 a가 사라져 다른 계산이 됩니다.', '각 반복이 끝난 뒤 (a,b)를 적어 보세요. 이전 b가 새 a가 되는지 확인하세요.'),
 ('n_base', '진법 변환의 범위', '나머지는 한 자리의 숫자이고 몫은 아직 처리하지 않은 부분입니다. 이 예제의 문자열 입력은 각 자리를 int로 읽으므로 A 같은 기호가 필요한 11진법 이상에는 그대로 사용할 수 없습니다. 0을 변환할 때 빈 목록이 되는지도 따로 확인해야 합니다.', '양의 정수 8을 2진수 1000으로 바꾼 뒤 각 자릿값을 더해 8로 돌아오는지 확인하세요. 밑은 2 이상으로 두세요.'),
 ('deci_to_bi', '2로 나눈 나머지를 뒤집는 이유', '처음 얻는 나머지는 가장 낮은 자리입니다. 높은 자리부터 읽으려면 마지막에 순서를 뒤집습니다. 현재 반복 조건이 num>0이면 0의 결과는 별도 처리가 필요합니다.', '8을 2로 계속 나누며 나머지 0,0,0,1을 적고, 뒤집은 1,0,0,0과 비교하세요.'),
 ('colliderect', '그림과 충돌 상자는 다를 수 있습니다', 'colliderect는 사각형 영역의 겹침을 판단합니다. 그림의 투명한 여백까지 사각형에 들어갈 수 있으므로 화면에서 닿아 보이는 순간과 판정 순간이 다른지 확인합니다. 충돌 직후 점수나 위치를 바꾸는 순서도 중요합니다.', '두 사각형이 떨어짐·겹침·경계만 맞닿음인 경우를 나누어 관찰하고, 한 번의 충돌에 점수가 몇 번 더해지는지 확인하세요.'),
 ('collide_mask', '마스크 충돌을 확인하는 법', '마스크는 이미지의 불투명한 부분을 기준으로 더 세밀하게 비교합니다. 같은 이미지를 써도 rect 위치가 틀리면 판정 위치가 어긋납니다. 애니메이션 이미지를 바꿀 때 마스크도 갱신해야 하는지 살펴봅니다.', '투명한 모서리끼리만 겹칠 때와 불투명한 부분이 겹칠 때를 구분해 시험하세요.'),
 ('get_pressed', '누르고 있는 키와 한 번 누른 사건', 'get_pressed는 현재 키가 눌린 상태를 읽습니다. KEYDOWN은 누르기 시작한 사건을 처리할 때 쓰입니다. 계속 이동할 동작과 한 번만 실행할 동작을 구분해야 합니다.', '방향키를 짧게 눌렀다가 길게 눌러 보세요. 이동을 매 프레임 처리하는지 한 번만 처리하는지 비교하세요.'),
 ('clock.tick', '프레임 속도를 제한하는 이유', 'Clock.tick은 루프가 지나치게 빠르게 돌지 않도록 제한합니다. 프레임마다 고정 거리만 움직이면 FPS 설정에 따라 초당 이동 거리가 달라질 수 있습니다. 시간차 기반 이동과 고정 프레임 이동을 섞지 않습니다.', 'FPS와 한 프레임 이동량을 기록하고, 1초 동안 예상한 이동 거리와 실제 이동을 비교하세요.'),
 ('pygame.event', '창 닫기 사건도 읽어야 합니다', '이벤트 큐를 매 프레임 읽어야 창 닫기나 키 입력을 처리할 수 있습니다. 화면을 그리는 코드만 반복하는 것과 사용자의 사건을 받아 게임 상태를 바꾸는 것은 별개의 작업입니다.', '프로젝트에서 창 닫기를 실행해 반복이 끝나는지 확인하세요. 중첩 반복이 있다면 break가 어느 반복을 끝내는지도 짚으세요.'),
 ('blit(', '화면에 붙일 것은 Surface입니다', 'blit은 그림이나 렌더링한 글자를 다른 Surface에 붙입니다. 위치만 바꾸었다고 이전 그림이 저절로 지워지지는 않습니다. 보통 배경을 다시 그리고 객체를 붙인 다음 화면을 갱신합니다.', '배경 지우기와 blit의 순서를 바꾸면 잔상이 생기는지 관찰한 뒤 원래 순서로 돌려놓으세요.'),
 ('pygame.sprite', '그룹과 객체의 역할', '스프라이트 객체는 그림과 위치, 갱신할 행동을 묶습니다. 그룹은 여러 객체를 함께 갱신하거나 그리는 통로입니다. 객체를 생성하는 것과 올바른 그룹에 등록하는 것을 구분하세요.', '생성한 객체가 어느 그룹에 들어가는지 표시하고, update와 draw가 그 그룹에 호출되는지 따라가세요.'),
 ('after(', '화면을 멈추지 않고 기다리기', 'tkinter의 after는 나중에 실행할 작업을 예약합니다. sleep으로 이벤트 처리를 멈추는 것과 다릅니다. 새 카드를 여러 번 고를 때 이전 예약이 남아 있으면 엉뚱한 카드가 뒤집힐 수 있습니다.', '버튼을 빠르게 두 번 눌렀을 때 예약된 뒤집기가 몇 번 실행되는지 확인하세요.'),
 ('command=', '버튼에는 함수의 결과가 아니라 함수를 연결합니다', 'command에 함수 이름을 전달하면 클릭했을 때 호출됩니다. 괄호를 붙여 먼저 호출하면 창을 만드는 순간 실행되고 반환값이 연결될 수 있습니다.', '버튼을 누르기 전과 후에 출력되는 시점을 기록하고 함수 이름 뒤 괄호의 유무를 대조하세요.'),
 ('grid(', '격자의 행과 열', 'grid는 위젯을 행과 열에 배치합니다. 같은 부모 안에서 pack과 grid를 섞으면 배치 충돌이 날 수 있습니다. 창 전체의 여백과 개별 위젯의 여백도 구분해서 조정합니다.', '한 위젯의 column만 바꾸어 보고 다른 위젯과 겹치는지 확인하세요.'),
 ('json.', 'JSON과 파이썬 객체 사이', 'JSON 문자열과 딕셔너리는 같은 것이 아닙니다. loads는 문자열을 객체로, dumps는 객체를 문자열로 바꿉니다. 변환 후 type을 확인해야 대괄호로 값을 찾을 수 있는 상태인지 알 수 있습니다.', '변환 전후 type과 실제 값을 함께 출력해 문자열을 딕셔너리처럼 다루는 실수를 찾아보세요.'),
 ('requests', 'API 응답을 쓰기 전에', '외부 서버 요청은 네트워크 상태와 응답 형식에 영향을 받습니다. 교재 예제의 주소가 항상 같은 내용을 반환한다고 가정하지 않습니다. 상태 코드, 타임아웃, 응답에 필요한 키가 있는지를 별도로 검사하는 것이 다음 개선 단계입니다.', '실제 호출을 늘리기 전에 교재의 예시 응답으로 키 경로를 확인하세요. 인증 정보는 코드나 게시물에 넣지 않습니다.'),
 ('histogram', '구간별 도수와 원자료', '히스토그램은 값이 어느 구간에 들어가는지 셉니다. 일반적으로 왼쪽 경계를 포함하고 오른쪽 경계를 제외하며 마지막 구간은 오른쪽 끝도 포함합니다. 구간을 바꾸면 막대 모양도 달라집니다.', '계급 경계에 정확히 걸리는 값 하나를 넣어 어느 구간에 세는지 확인하고 도수의 합을 원자료 개수와 비교하세요.'),
 ('Series(', '이름표에 맞추는 계산', 'Series는 값과 인덱스를 함께 가집니다. 두 Series를 더할 때 순서만 보는 것이 아니라 인덱스를 맞춥니다. 한쪽에만 있는 이름표에서는 결측값이 나올 수 있습니다.', '인덱스 순서를 바꾸어도 같은 이름표끼리 더해지는지 확인하세요. 위치로 고를 때와 이름표로 고를 때를 구분합니다.'),
 ('DataFrame(', '행과 열을 먼저 읽습니다', 'DataFrame은 열마다 의미가 있는 표입니다. loc는 이름표, iloc는 위치를 기준으로 선택합니다. 코드의 예제 이름과 점수는 학습용 자료이며 실제 학생의 성과 기록이 아닙니다.', '선택 결과가 한 값인지 Series인지 DataFrame인지 type과 모양을 확인하세요.'),
 ('reshape(', '모양을 바꾸어도 원소 수는 같습니다', 'reshape는 데이터를 새 행·열 모양으로 해석합니다. 원소 12개를 3×4로 바꿀 수 있지만 3×5로 바꿀 수는 없습니다. 행부터 채우는 기본 순서를 인덱스와 함께 확인합니다.', '원소 개수와 행×열을 먼저 계산하고, 바뀐 배열의 첫 행과 마지막 행을 적어 보세요.'),
 ('np.where', '조건별 값과 위치를 구분합니다', 'np.where에 조건만 전달할 때와 조건·참인 값·거짓인 값을 함께 전달할 때의 결과는 다릅니다. 코드가 원하는 것이 위치인지 바꾼 배열인지 먼저 확인합니다.', '조건을 만족하는 원소가 없는 배열도 넣어 보세요. 빈 위치 결과와 모두 대체된 배열을 구분하세요.'),
 ('itertools.product', '주사위 두 개를 구별해서 셉니다', 'product는 각 주사위에서 하나씩 고른 순서쌍을 만듭니다. 두 공정한 주사위에서는 36개 순서쌍의 가능성이 같습니다. (1,2)와 (2,1)을 같은 경우로 합치면 확률의 분모가 달라집니다.', '전체 경우가 36개인지 확인하고, 원하는 사건의 개수를 36으로 나누세요. 이 가정은 공정한 주사위에 해당합니다.'),
 ('permutations', '순열은 순서를 구별합니다', '같은 원소를 골라도 배치 순서가 다르면 다른 결과로 셉니다. 입력 자료에 중복된 값이 있으면 값이 같은 결과가 여러 번 나올 수 있습니다.', '서로 다른 세 항목에서 두 개를 뽑아 직접 나열하고 코드의 결과 개수와 대조하세요.'),
 ('combinations', '조합은 뽑힌 묶음을 봅니다', '조합은 뽑힌 원소의 순서를 바꾼 것을 새 결과로 세지 않습니다. 자리나 역할이 구별되는 문제인지 먼저 읽고 순열과 조합 중 무엇을 쓸지 정합니다.', '세 항목에서 두 개를 고르는 세 묶음을 적고, 순열 결과와 개수가 다른 이유를 설명하세요.'),
 ('begin_fill', '선을 그리는 구간과 채우는 구간', 'begin_fill과 end_fill 사이의 경로가 채울 도형을 만듭니다. 펜을 든 이동, 선 색, 채우기 색은 서로 다른 설정입니다. 색만 바꾸었다고 경로가 달라지는 것은 아닙니다.', '같은 이동 경로에서 채우기 색만 바꾸어 보세요. 도형의 크기는 그대로인지 확인하세요.'),
 ('circle(', '원의 반지름과 거북이 위치', 'circle의 크기는 반지름입니다. 원의 중심이 언제나 거북이의 현재 위치라고 생각하면 여러 원을 배치할 때 어긋납니다. 현재 방향과 원을 그리는 시작점을 함께 관찰합니다.', '반지름을 두 배로 바꿨을 때 지름도 두 배가 되는지 확인하고, 시작점은 그대로인지 비교하세요.'),
 ('penup', '움직임과 선을 분리합니다', 'penup 상태에서도 거북이의 위치는 바뀌지만 이동 선은 남지 않습니다. pendown 이후부터 다시 선이 생깁니다. 좌표 이동 전에 펜 상태를 확인하면 원하지 않는 연결선을 줄일 수 있습니다.', '같은 이동을 펜을 든 경우와 내린 경우로 나누어 실행하고 경로는 같지만 선은 다른지 확인하세요.'),
 ('enumerate(', '순서와 값을 함께 받습니다', 'enumerate는 순서 번호와 원소를 짝으로 돌려줍니다. 기본 번호는 0부터 시작합니다. 화면에 보여줄 1번과 리스트 인덱스 0을 구분해야 합니다.', '세 항목의 (번호,값)을 먼저 적고 start 값을 지정했을 때 번호만 달라지는지 확인하세요.'),
 ('zip(', '짧은 쪽에서 짝짓기가 끝납니다', '기본 zip은 입력 중 가장 짧은 길이까지만 짝을 만듭니다. 남은 항목이 자동으로 채워지는 것이 아닙니다. 명단과 점수를 묶는다면 두 길이를 먼저 비교해야 합니다.', '길이 3과 길이 2의 목록을 묶고 결과가 두 쌍인 이유를 설명하세요.'),
 ('sorted(', '새 목록과 원본 목록', 'sorted는 정렬된 새 목록을 반환합니다. list.sort는 원본을 바꾸고 반환값은 None입니다. 정렬 결과를 변수에 담을 때 두 방식을 혼동하지 않습니다.', '정렬 전후 원본과 반환값을 각각 출력해 어느 쪽이 바뀌는지 확인하세요.'),
 ('input(', '입력한 숫자도 처음에는 문자열입니다', 'input의 결과는 문자열입니다. 계산하려면 허용할 입력 범위를 정한 뒤 int나 float로 바꾸어야 합니다. 빈칸이나 글자를 넣으면 변환이 실패할 수 있으므로 성공 입력과 실패 입력을 구분해 시험합니다.', '숫자 입력 하나와 숫자가 아닌 입력 하나를 비교하고, 변환 오류가 어디서 발생하는지 찾으세요.'),
 ('open(', '파일 모드가 동작을 결정합니다', 'w는 기존 내용을 덮어쓰고 a는 뒤에 이어 씁니다. r은 읽기입니다. 예제는 따로 만든 연습 폴더와 복사한 파일에서 실행하고, 원본 파일을 실수로 덮어쓰지 않도록 경로와 모드를 먼저 읽습니다.', '짧은 연습 파일로 쓰기와 이어 쓰기를 각각 한 번 실행한 뒤 읽어 내용 차이를 확인하세요.'),
 ('return ', '출력과 반환은 다릅니다', 'print는 화면에 보여주고 return은 호출한 곳으로 값을 돌려줍니다. 반환한 값이 있어야 다음 계산에 이어 쓸 수 있습니다. 함수 안에서 return에 도달하면 그 호출의 나머지 문장은 실행되지 않습니다.', '함수의 반환값을 변수에 담아 type과 값을 확인하고, 화면 출력과 구분해 기록하세요.'),
]
def expression(n):return ast.unparse(n).replace('`','')
def brief(s,n=105):return s if len(s)<=n else s[:n]+'…'
def walkthrough(code):
 tree=ast.parse(code);result=[]
 for n in sorted(ast.walk(tree),key=lambda n:getattr(n,'lineno',10**8)):
  s=None
  if isinstance(n,ast.Assign):s=f"`{brief(', '.join(expression(t) for t in n.targets))}`에 `{brief(expression(n.value))}`의 값을 저장합니다."
  elif isinstance(n,ast.AugAssign):s=f"`{brief(expression(n.target))}`의 기존 값에 `{brief(expression(n.value))}`를 사용해 `{ {'Add':'+','Sub':'-','Mult':'*','Div':'/','FloorDiv':'//','Mod':'%','Pow':'**'}.get(type(n.op).__name__,type(n.op).__name__)}` 연산 결과를 반영합니다."
  elif isinstance(n,ast.For):s=f"`{brief(expression(n.iter))}`에서 값을 하나씩 꺼내 `{brief(expression(n.target))}`로 읽습니다. 들여쓴 본문이 반복 범위입니다."
  elif isinstance(n,ast.While):s=f"`{brief(expression(n.test))}`가 참인 동안 반복합니다. 조건을 바꾸는 줄이나 탈출하는 줄을 함께 찾아야 합니다."
  elif isinstance(n,ast.If):s=f"`{brief(expression(n.test))}`를 검사합니다. 참인 경로와 그렇지 않은 경로에서 바뀌는 값을 나누어 보세요."
  elif isinstance(n,ast.FunctionDef):s=f"`{n.name}({brief(expression(n.args))})` 함수를 정의합니다. 정의와 실제 호출 시점은 구분합니다."
  elif isinstance(n,ast.ClassDef):s=f"`{n.name}` 클래스에 상태와 행동을 묶습니다. 이 이름으로 만든 객체의 값은 객체마다 달라질 수 있습니다."
  elif isinstance(n,ast.Return):s=f"`{brief(expression(n.value)) if n.value else 'None'}`을 호출한 곳으로 돌려주고 이번 함수 실행을 끝냅니다."
  elif isinstance(n,ast.Expr) and isinstance(n.value,ast.Call):s=f"`{brief(expression(n.value))}`를 호출합니다."+(" 괄호 안의 값을 화면 출력과 연결해 읽으세요." if expression(n.value.func)=='print' else " 호출 앞뒤로 대상의 상태가 달라지는지 살펴보세요.")
  if s and (n.lineno,s) not in result:result.append((n.lineno,s))
  if len(result)==10:break
 return result

def concepts(item):
 code=item['code'];chosen=[x for x in CONCEPTS if x[0] in code]
 if not chosen:
  if 'for ' in code: chosen=[('', '반복의 범위를 읽습니다','반복문은 같은 문장을 여러 번 실행합니다. 반복 바깥에 둔 문장은 반복 횟수와 별개로 실행됩니다. 들여쓰기를 먼저 표시하면 결과가 여러 번 나오는 이유를 확인할 수 있습니다.','반복 안과 밖의 출력이 각각 몇 번 실행될지 먼저 적고 확인하세요.')]
  elif 'class ' in code:chosen=[('', '객체의 상태를 읽습니다','클래스 정의만으로 모든 동작이 실행되는 것은 아닙니다. 객체를 생성하는 줄과 메서드를 호출하는 줄을 찾아서 값이 언제 만들어지고 바뀌는지 확인합니다.','객체 두 개를 만들고 한쪽의 속성을 바꾸었을 때 다른 객체 값도 달라지는지 확인하세요.')]
  else:chosen=[('', '값과 자료형을 함께 읽습니다','눈에 보이는 글자가 같아도 숫자와 문자열은 다른 연산을 합니다. 대입은 등식의 증명이 아니라 그 순간의 값을 이름에 연결하는 작업입니다. 출력이 없다면 코드가 실패했다고 단정하지 말고 값을 확인하는 출력문이 있는지 봅니다.','코드에 등장하는 값 하나의 type을 확인하고, 같은 내용을 따옴표로 감쌌을 때 어떤 연산이 달라지는지 비교하세요.')]
 return chosen[:3]

def code_question(item):
 tree=ast.parse(item['code'])
 for n in ast.walk(tree):
  if isinstance(n,ast.Compare):return f"조건 `{brief(expression(n),80)}`가 참일 때와 거짓일 때, 다음에 실행되는 줄은 무엇인가요?"
 for n in ast.walk(tree):
  if isinstance(n,ast.For):return f"`{brief(expression(n.iter),80)}`의 첫 값과 마지막 값을 구분하고, `{brief(expression(n.target),40)}`가 어느 순서로 바뀌는지 말해 보세요."
 for n in ast.walk(tree):
  if isinstance(n,ast.Assign):return f"`{brief(expression(n.targets[0]),45)}`에 들어갈 값은 무엇이며, 그 값을 확인하려면 어디에 print를 놓으면 좋을까요?"
 return '첫 호출과 마지막 호출의 순서를 바꾸면 무엇이 달라질지 코드의 실제 명령을 짚어 설명해 보세요.'

catalog=json.loads((D/'catalog.json').read_text());previous={a['slug']:a['status'] for a in catalog};catalog=[a for a in catalog if not a.get('courseNote')]
used={a['title'] for a in catalog};rows=[]
for item in items:
 slug=item['slug'];code=item['code'];v=checks[slug];notes=concepts(item);question=code_question(item)
 title=f"{item['courseName']}: {item['focus']}"
 if title in used:title+=f" — {item['unit']}"
 if title in used:title+=f" ({item['number']})"
 used.add(title)
 description=f"{item['unit']} 단원의 실제 코드로 ‘{item['focus']}’ 항목을 살펴봅니다. 핵심 줄, 준비 조건, 확인 질문과 바꿔 보는 활동을 함께 정리했습니다."
 answer=f"이번 코드는 ‘{item['focus']}’를 다룹니다. {notes[0][2].split('. ')[0]}."
 if v['runtime']=='passed-smoke':
  status='본문 코드의 로컬 실행에서 오류 없이 끝나는 것을 확인했습니다. 이는 해당 예제의 1회 실행 확인이며 모든 입력·학습 효과를 검증했다는 뜻은 아닙니다.'
  output=v['stdout'].strip()
  if output:status+=' 난수를 사용하는 경우 아래 출력은 seed 7을 고정한 확인 예시입니다.\n\n```text\n'+output+'\n```'
  else:status+=' 화면 출력이 없는 코드입니다. 정의·초기화가 끝난 것과 함수의 모든 동작을 시험한 것을 구분하세요.'
 else:
  if v['syntaxContext'] if 'syntaxContext' in v else v.get('context'):
   status='프로젝트 반복문 또는 메서드 **내부에 들어가는 코드 조각**입니다. 이 블록만 새 파일에 붙여 실행하는 예제가 아닙니다. 원래 수업 파일의 해당 위치에 넣어 읽으세요. 필요한 문맥을 덧붙인 문법 검사만 통과했으며 실제 화면 동작은 이 글의 자동 검증 범위에 포함하지 않았습니다.'
  else:status='이 예제는 **앞 단계 코드 또는 별도 실행 환경이 필요한 코드 읽기 자료**입니다. 문법은 확인했지만 이 블록만의 완성 프로그램 실행은 확인하지 않았습니다.'
  reason=v['reason']
  m=re.search(r"name '([^']+)' is not defined",reason)
  if m:status+=f" 특히 `{m.group(1)}`의 정의를 원래 단원의 앞 단계에서 먼저 준비해야 합니다."
  elif '시간 제한' in reason:status+=' 로컬 실행 확인이 시간 제한에 걸려 출력 결과를 확정하지 않았습니다.'
  else:status+=f" 확인한 실행 조건: {reason}."
  if item['course']=='games':status+=' Pygame 프로젝트의 이미지·폰트·소리 파일과 클래스 정의는 원래 프로젝트에서 함께 준비하세요.'
  if any(s in code for s in ['Turtle','turtle','forward','circle','penup']):status+=' 거북이 그래픽은 수업에서 사용하는 그래픽 지원 실행 환경이 필요합니다.'
 sourceurl='/python'
 if item['pdf'] and (ROOT/('public'+item['pdf'])).is_file():sourceurl=urllib.parse.quote(item['pdf'],safe='/')
 elif 'mars' in item['unitId']:sourceurl='/mars-expedition/final-main.py'
 elif 'space_invaders' in item['unitId']:sourceurl='/space-invaders/starter.mspygame.json'
 steps='\n'.join(f"- **{line}행**: {desc}" for line,desc in walkthrough(code))
 lessons='\n\n'.join(f"### {heading}\n\n{body}\n\n**확인 활동:** {activity}" for _,heading,body,activity in notes)
 same=[a for a in items if a['course']==item['course']];idx=same.index(item)
 related=[a['slug'] for a in same[max(0,idx-1):idx+2] if a['slug']!=slug]
 if len(related)<2:related.append('read-python-errors')
 md=f"""## 이 코드가 놓인 수업\n\n**{item['courseName']} → {item['chapter']} → {item['unit']}**에서 가져온 ‘{item['exerciseTitle']}’ 코드입니다. 단원 전체를 요약하는 대신 이 단계가 담당하는 작업을 한 가지씩 읽습니다. 코드 속 이름·점수·예시 자료는 교재의 연습 데이터이며 실제 학생의 기록이나 성과를 소개하는 자료가 아닙니다.\n\n학습 목표는 코드를 그대로 입력하는 데서 멈추지 않고, 어떤 값이 준비되고 어떤 조건에서 결과가 달라지는지를 설명하는 것입니다. 다음 질문에 먼저 답을 적고 코드와 대조해 보세요.\n\n> {question}\n\n## 원본 코드와 핵심 줄\n\n```python\n{code}\n```\n\n아래 행 번호는 위 코드 블록의 첫 줄을 1행으로 셉니다. 긴 예제에서는 주요 문장 10개까지 짚었습니다. 함수 안의 줄은 함수를 호출할 때 실행되므로, 행 번호 순서와 실제 실행 순서가 항상 같은 것은 아닙니다.\n\n{steps}\n\n## 실행 전에 준비할 것과 확인 결과\n\n{status}\n\n## 결과를 이해하는 확인 활동\n\n{lessons}\n\n## 한 번 바꾸고, 이유를 남기기\n\n1. 원래 코드의 복사본을 준비하고 바꾸려는 줄을 하나 고릅니다. 위 확인 활동에 제시한 입력·조건·설정 중 하나만 선택하세요.\n2. 바꾸기 전에 예상 결과를 한 문장으로 적습니다. 오류가 예상된다면 오류가 날 이유와 위치도 적어 둡니다.\n3. 필요한 실행 환경과 앞 단계 정의를 준비한 뒤 실행합니다. 원본과 수정본을 번갈아 보면서 값·문자·그림 중 무엇이 달라졌는지 기록합니다.\n4. ‘작동했다’ 대신 **바꾼 줄 → 관찰한 결과 → 그렇게 된 이유**를 남깁니다. 예상과 다르면 마지막 오류 메시지와 관련된 줄을 함께 가져와 질문합니다.\n\n이 글의 확인 질문은 **{question}** 입니다. 보호자는 정답을 먼저 알려주기보다 아이가 실제 변수나 조건을 짚어 설명하는지 들어보세요. 어려워하면 단원 전체를 다시 시키기보다 위 핵심 줄 중 막힌 한 줄로 범위를 좁힙니다.\n\n[같은 과정의 코드 노트 목록](/python/guides/courses/{item['course']}/)에서 앞뒤 단계를 이어 볼 수 있습니다. 실행 환경이나 시작 단계가 궁금하면 [파이썬 과정 안내](/python)를 확인하세요.\n"""
 (D/(slug+'.md')).write_text(md)
 record={'slug':slug,'title':title,'category':item['courseName'],'description':description,'answer':answer,'published':'2026-09-22','updated':'2026-09-22','status':('published' if '--publish' in sys.argv else previous.get(slug,'draft')),'author':'메타센스 편집','image':None,'faq':[{'question':'이 코드만 붙여 넣으면 바로 실행되나요?','answer':'본문의 실행 조건을 먼저 확인하세요. 앞 단계 변수, 그래픽 환경, 프로젝트 파일이 필요한 조각은 원래 단원 안에서 실행합니다.'},{'question':'이 단계에서 무엇을 설명하면 되나요?','answer':question}],'related':related,'sources':[{'title':f"메타센스 {item['courseName']} · {item['unit']}",'url':sourceurl}],'courseNote':{'course':item['course'],'number':item['number'],'unit':item['unit'],'exercise':item['exerciseTitle'],'sourceSha256':item['sha256'],'verification':v['runtime']}}
 catalog.append(record);rows.append(f"| {item['course']} {item['number']:03d} | {item['focus']} | {item['unit']} | {v['runtime']} |")
(D/'catalog.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n')
(ROOT/'docs/marketing/python-expansion/CONTENT-MAP.md').write_text('# 파이썬 400편 제작 대장\n\n상태: 원본 기반 코드 노트400편 작성. 공개·검수 상태는 RELEASE.md를 기준으로 한다.\n\n| 번호 | 주제 | 실제 단원 | 코드 확인 |\n|---|---|---|---|\n'+'\n'.join(rows)+'\n')
print('Wrote',len(items),'source-based articles. Existing articles preserved.')
