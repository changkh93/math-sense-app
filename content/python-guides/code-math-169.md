## 이 코드가 놓인 수업

**파이썬 수학 → 방정식과 시각화 (51 ~ 60) → 임의의 부등식**에서 가져온 ‘세트 4: InequalitySolver 클래스로 부등식 문제 풀기’ 코드입니다. 단원 전체를 요약하는 대신 이 단계가 담당하는 작업을 한 가지씩 읽습니다. 코드 속 이름·점수·예시 자료는 교재의 연습 데이터이며 실제 학생의 기록이나 성과를 소개하는 자료가 아닙니다.

학습 목표는 코드를 그대로 입력하는 데서 멈추지 않고, 어떤 값이 준비되고 어떤 조건에서 결과가 달라지는지를 설명하는 것입니다. 다음 질문에 먼저 답을 적고 코드와 대조해 보세요.

> 조건 `self.coeffs[0] == 0`가 참일 때와 거짓일 때, 다음에 실행되는 줄은 무엇인가요?

## 원본 코드와 핵심 줄

```python
import numpy as np

class InequalitySolver:
    def __init__(self):
        self.coeffs = np.random.randint(-9, 10, 3)

        while self.coeffs[0] == 0:
            self.coeffs[0] = np.random.randint(-9, 10)

        if self.coeffs[0] == 0:
            self.coeffs[0] = 1

        self.operator_type = np.random.randint(2)
        self.inequality_type = np.random.randint(4)
        print('1차 부등식 문제 해결사 등장!')

    def display_question(self):
        a = self.coeffs[0]
        b = self.coeffs[1]
        c = self.coeffs[2]

        op_symbol = '+' if self.operator_type == 0 else '-'
        ineq_symbols = ['>', '>=', '<', '<=']
        ineq_symbol = ineq_symbols[self.inequality_type]

        print('오늘의 부등식 문제 x는 -10부터 10까지 정수')
        print(f'{a}x {op_symbol} {b} {ineq_symbol} {c}')

    def find_solutions(self):
        a = self.coeffs[0]
        b_orig = self.coeffs[1]
        c = self.coeffs[2]

        b_eff = b_orig if self.operator_type == 0 else -b_orig
        possible_x_values = range(-10, 11)

        if self.inequality_type == 0:
            solutions = list(filter(lambda x: a * x + b_eff > c, possible_x_values))
        elif self.inequality_type == 1:
            solutions = list(filter(lambda x: a * x + b_eff >= c, possible_x_values))
        elif self.inequality_type == 2:
            solutions = list(filter(lambda x: a * x + b_eff < c, possible_x_values))
        else:
            solutions = list(filter(lambda x: a * x + b_eff <= c, possible_x_values))

        print('정답')
        return solutions

ineq_solver = InequalitySolver()
ineq_solver.display_question()
print('해가 될 수 있는 정수들:', ineq_solver.find_solutions())
```

아래 행 번호는 위 코드 블록의 첫 줄을 1행으로 셉니다. 긴 예제에서는 주요 문장 10개까지 짚었습니다. 함수 안의 줄은 함수를 호출할 때 실행되므로, 행 번호 순서와 실제 실행 순서가 항상 같은 것은 아닙니다.

- **3행**: `InequalitySolver` 클래스에 상태와 행동을 묶습니다. 이 이름으로 만든 객체의 값은 객체마다 달라질 수 있습니다.
- **4행**: `__init__(self)` 함수를 정의합니다. 정의와 실제 호출 시점은 구분합니다.
- **5행**: `self.coeffs`에 `np.random.randint(-9, 10, 3)`의 값을 저장합니다.
- **7행**: `self.coeffs[0] == 0`가 참인 동안 반복합니다. 조건을 바꾸는 줄이나 탈출하는 줄을 함께 찾아야 합니다.
- **8행**: `self.coeffs[0]`에 `np.random.randint(-9, 10)`의 값을 저장합니다.
- **10행**: `self.coeffs[0] == 0`를 검사합니다. 참인 경로와 그렇지 않은 경로에서 바뀌는 값을 나누어 보세요.
- **11행**: `self.coeffs[0]`에 `1`의 값을 저장합니다.
- **13행**: `self.operator_type`에 `np.random.randint(2)`의 값을 저장합니다.
- **14행**: `self.inequality_type`에 `np.random.randint(4)`의 값을 저장합니다.
- **15행**: `print('1차 부등식 문제 해결사 등장!')`를 호출합니다. 괄호 안의 값을 화면 출력과 연결해 읽으세요.

## 실행 전에 준비할 것과 확인 결과

이 예제는 **앞 단계 코드 또는 별도 실행 환경이 필요한 코드 읽기 자료**입니다. 문법은 확인했지만 이 블록만의 완성 프로그램 실행은 확인하지 않았습니다. 확인한 실행 조건: 그래픽 또는 앞 단계 객체 필요.

## 결과를 이해하는 확인 활동

### 시작과 끝의 포함 여부

range의 끝값은 포함되지 않습니다. 반복 횟수를 정할 때 마지막으로 필요한 값과 끝 인자를 구분합니다. 간격이 음수이면 시작값과 끝값의 방향도 맞아야 합니다.

**확인 활동:** 작은 범위로 바꾸어 list(range(...))를 먼저 확인한 뒤 반복 횟수의 예측과 대조하세요.

### 출력과 반환은 다릅니다

print는 화면에 보여주고 return은 호출한 곳으로 값을 돌려줍니다. 반환한 값이 있어야 다음 계산에 이어 쓸 수 있습니다. 함수 안에서 return에 도달하면 그 호출의 나머지 문장은 실행되지 않습니다.

**확인 활동:** 함수의 반환값을 변수에 담아 type과 값을 확인하고, 화면 출력과 구분해 기록하세요.

## 한 번 바꾸고, 이유를 남기기

1. 원래 코드의 복사본을 준비하고 바꾸려는 줄을 하나 고릅니다. 위 확인 활동에 제시한 입력·조건·설정 중 하나만 선택하세요.
2. 바꾸기 전에 예상 결과를 한 문장으로 적습니다. 오류가 예상된다면 오류가 날 이유와 위치도 적어 둡니다.
3. 필요한 실행 환경과 앞 단계 정의를 준비한 뒤 실행합니다. 원본과 수정본을 번갈아 보면서 값·문자·그림 중 무엇이 달라졌는지 기록합니다.
4. ‘작동했다’ 대신 **바꾼 줄 → 관찰한 결과 → 그렇게 된 이유**를 남깁니다. 예상과 다르면 마지막 오류 메시지와 관련된 줄을 함께 가져와 질문합니다.

이 글의 확인 질문은 **조건 `self.coeffs[0] == 0`가 참일 때와 거짓일 때, 다음에 실행되는 줄은 무엇인가요?** 입니다. 보호자는 정답을 먼저 알려주기보다 아이가 실제 변수나 조건을 짚어 설명하는지 들어보세요. 어려워하면 단원 전체를 다시 시키기보다 위 핵심 줄 중 막힌 한 줄로 범위를 좁힙니다.

[같은 과정의 코드 노트 목록](/python/guides/courses/math/)에서 앞뒤 단계를 이어 볼 수 있습니다. 실행 환경이나 시작 단계가 궁금하면 [파이썬 과정 안내](/python)를 확인하세요.
