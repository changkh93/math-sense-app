## 이 코드가 놓인 수업

**파이썬 심화 → tkinter로 Flash Card 만들기 → Flash Card 완성, zip 함수**에서 가져온 ‘세트 1: Flash Card 전체 코드’ 코드입니다. 단원 전체를 요약하는 대신 이 단계가 담당하는 작업을 한 가지씩 읽습니다. 코드 속 이름·점수·예시 자료는 교재의 연습 데이터이며 실제 학생의 기록이나 성과를 소개하는 자료가 아닙니다.

학습 목표는 코드를 그대로 입력하는 데서 멈추지 않고, 어떤 값이 준비되고 어떤 조건에서 결과가 달라지는지를 설명하는 것입니다. 다음 질문에 먼저 답을 적고 코드와 대조해 보세요.

> 조건 `len(to_learn) == 0`가 참일 때와 거짓일 때, 다음에 실행되는 줄은 무엇인가요?

## 원본 코드와 핵심 줄

```python
from tkinter import *
import pandas as pd
import random

try:
    data = pd.read_csv('data/word_to_learn.csv')
except FileNotFoundError:
    data = pd.read_csv('data/eng_word.csv')

to_learn = data.to_dict(orient='records')

BACKGROUND_COLOR = '#B1DDC6'

current_card = {}

def next_card():
    global current_card, flip_timer
    window.after_cancel(flip_timer)

    if len(to_learn) == 0:
        canvas.itemconfig(card_title, text='종료', fill='black')
        canvas.itemconfig(card_word, text='모든 단어를 학습했습니다.', fill='black')
    else:
        current_card = random.choice(to_learn)
        canvas.itemconfig(card_title, text='English', fill='black')
        canvas.itemconfig(card_word, text=current_card['English'], fill='black')
        canvas.itemconfig(background_image, image=front_image)
        flip_timer = window.after(3000, func=flip_card)

def flip_card():
    canvas.itemconfig(card_title, text='Korean', fill='white')
    canvas.itemconfig(card_word, text=current_card['Korean'], fill='white')
    canvas.itemconfig(background_image, image=back_image)

def is_known():
    if len(to_learn) > 0:
        to_learn.remove(current_card)
        data = pd.DataFrame(to_learn)
        data.to_csv('data/word_to_learn.csv', index=False)
    next_card()

window = Tk()
window.title('Flash Card')
window.config(padx=50, pady=50, bg=BACKGROUND_COLOR)

flip_timer = window.after(3000, func=flip_card)

canvas = Canvas(width=800, height=526, bg=BACKGROUND_COLOR, highlightthickness=0)
front_image = PhotoImage(file='image/card_front.png')
back_image = PhotoImage(file='image/card_back.png')

background_image = canvas.create_image(400, 526 / 2, image=front_image)
card_title = canvas.create_text(400, 150, text='Title', font=('Ariel', 40, 'italic'), fill='black')
card_word = canvas.create_text(400, 526 / 2, text='Word', font=('Ariel', 60, 'bold'), fill='black')
canvas.grid(row=0, column=0, columnspan=2)

cross_image = PhotoImage(file='image/wrong.png')
unknown_button = Button(image=cross_image, highlightbackground=BACKGROUND_COLOR, command=next_card)
unknown_button.grid(row=1, column=0)

check_image = PhotoImage(file='image/right.png')
check_button = Button(image=check_image, highlightbackground=BACKGROUND_COLOR, command=is_known)
check_button.grid(row=1, column=1)

next_card()

window.mainloop()
```

아래 행 번호는 위 코드 블록의 첫 줄을 1행으로 셉니다. 긴 예제에서는 주요 문장 10개까지 짚었습니다. 함수 안의 줄은 함수를 호출할 때 실행되므로, 행 번호 순서와 실제 실행 순서가 항상 같은 것은 아닙니다.

- **6행**: `data`에 `pd.read_csv('data/word_to_learn.csv')`의 값을 저장합니다.
- **8행**: `data`에 `pd.read_csv('data/eng_word.csv')`의 값을 저장합니다.
- **10행**: `to_learn`에 `data.to_dict(orient='records')`의 값을 저장합니다.
- **12행**: `BACKGROUND_COLOR`에 `'#B1DDC6'`의 값을 저장합니다.
- **14행**: `current_card`에 `{}`의 값을 저장합니다.
- **16행**: `next_card()` 함수를 정의합니다. 정의와 실제 호출 시점은 구분합니다.
- **18행**: `window.after_cancel(flip_timer)`를 호출합니다. 호출 앞뒤로 대상의 상태가 달라지는지 살펴보세요.
- **20행**: `len(to_learn) == 0`를 검사합니다. 참인 경로와 그렇지 않은 경로에서 바뀌는 값을 나누어 보세요.
- **21행**: `canvas.itemconfig(card_title, text='종료', fill='black')`를 호출합니다. 호출 앞뒤로 대상의 상태가 달라지는지 살펴보세요.
- **22행**: `canvas.itemconfig(card_word, text='모든 단어를 학습했습니다.', fill='black')`를 호출합니다. 호출 앞뒤로 대상의 상태가 달라지는지 살펴보세요.

## 실행 전에 준비할 것과 확인 결과

이 예제는 **앞 단계 코드 또는 별도 실행 환경이 필요한 코드 읽기 자료**입니다. 문법은 확인했지만 이 블록만의 완성 프로그램 실행은 확인하지 않았습니다. 확인한 실행 조건: 별도 환경 필요: tkinter.

## 결과를 이해하는 확인 활동

### 표를 카드 목록으로 바꾸기

DataFrame.to_dict의 orient가 records이면 행마다 딕셔너리 하나가 만들어집니다. 열 이름이 키가 되고, 여러 행은 리스트로 묶입니다. 표의 행과 카드 한 장이 어떻게 연결되는지 읽습니다.

**확인 활동:** 카드 한 장에서 English와 Korean 키를 각각 찾아 출력하고 원래 표의 같은 행과 대조하세요.

### 무작위 선택과 목록의 상태

choice는 비어 있지 않은 목록에서 하나를 고릅니다. 학습한 카드를 제거한 뒤 목록이 비면 다음 선택을 할 수 없습니다. 선택 전에 빈 목록을 처리하는 경로가 있는지 확인합니다.

**확인 활동:** 카드가 한 장 남았을 때와 한 장도 없을 때의 다음 동작을 나누어 적어 보세요.

### 화면을 멈추지 않고 기다리기

tkinter의 after는 나중에 실행할 작업을 예약합니다. sleep으로 이벤트 처리를 멈추는 것과 다릅니다. 새 카드를 여러 번 고를 때 이전 예약이 남아 있으면 엉뚱한 카드가 뒤집힐 수 있습니다.

**확인 활동:** 버튼을 빠르게 두 번 눌렀을 때 예약된 뒤집기가 몇 번 실행되는지 확인하세요.

## 한 번 바꾸고, 이유를 남기기

1. 원래 코드의 복사본을 준비하고 바꾸려는 줄을 하나 고릅니다. 위 확인 활동에 제시한 입력·조건·설정 중 하나만 선택하세요.
2. 바꾸기 전에 예상 결과를 한 문장으로 적습니다. 오류가 예상된다면 오류가 날 이유와 위치도 적어 둡니다.
3. 필요한 실행 환경과 앞 단계 정의를 준비한 뒤 실행합니다. 원본과 수정본을 번갈아 보면서 값·문자·그림 중 무엇이 달라졌는지 기록합니다.
4. ‘작동했다’ 대신 **바꾼 줄 → 관찰한 결과 → 그렇게 된 이유**를 남깁니다. 예상과 다르면 마지막 오류 메시지와 관련된 줄을 함께 가져와 질문합니다.

이 글의 확인 질문은 **조건 `len(to_learn) == 0`가 참일 때와 거짓일 때, 다음에 실행되는 줄은 무엇인가요?** 입니다. 보호자는 정답을 먼저 알려주기보다 아이가 실제 변수나 조건을 짚어 설명하는지 들어보세요. 어려워하면 단원 전체를 다시 시키기보다 위 핵심 줄 중 막힌 한 줄로 범위를 좁힙니다.

[같은 과정의 코드 노트 목록](/python/guides/courses/advanced/)에서 앞뒤 단계를 이어 볼 수 있습니다. 실행 환경이나 시작 단계가 궁금하면 [파이썬 과정 안내](/python)를 확인하세요.
