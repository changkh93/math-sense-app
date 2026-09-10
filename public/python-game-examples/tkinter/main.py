from tkinter import *
import pandas as pd
import random

BACKGROUND_COLOR = "#B1DDC6"
current_card = {}

try:
    data = pd.read_csv("data/words_to_learn.csv")
except FileNotFoundError:
    original_data = pd.read_csv("data/english_word.csv")
    to_learn = original_data.to_dict(orient="records")
else:
    to_learn = data.to_dict(orient="records")


def next_card():
    global current_card, flip_timer
    window.after_cancel(flip_timer)
    # 모든 단어를 익힌 뒤에는 빈 목록에서 단어를 뽑지 않습니다.
    if not to_learn:
        canvas.itemconfig(card_title, text="완료!", fill="black")
        canvas.itemconfig(card_word, text="모두 익혔어요", fill="black")
        canvas.itemconfig(card_backgroud, image=card_front_image)
        wrong_button.config(state=DISABLED)
        right_button.config(state=DISABLED)
        return
    current_card = random.choice(to_learn)
    canvas.itemconfig(card_title, text="English", fill="black")
    canvas.itemconfig(card_word, text=current_card["English"], fill="black")
    canvas.itemconfig(card_backgroud, image=card_front_image)
    flip_timer = window.after(3000, func=flip_card)


def flip_card():
    canvas.itemconfig(card_title, text="Korean", fill="white")
    canvas.itemconfig(card_word, text=current_card["Korean"], fill="white")
    canvas.itemconfig(card_backgroud, image=card_back_image)


def is_known():
    to_learn.remove(current_card)
    # 0개가 되어도 열 이름은 남겨 다음 실행에서 읽을 수 있게 합니다.
    data = pd.DataFrame(to_learn, columns=["English", "Korean"])
    data.to_csv("data/words_to_learn.csv", index=False)
    next_card()


window = Tk()
window.title("Flash Card")
window.config(padx=50, pady=50, bg=BACKGROUND_COLOR)
flip_timer = window.after(3000, func=flip_card)

canvas = Canvas(width=800, height=526)
card_front_image = PhotoImage(file="images/card_front.png")
card_back_image = PhotoImage(file="images/card_back.png")
card_backgroud = canvas.create_image(400, 263, image=card_front_image)
card_title = canvas.create_text(400, 150, text="Title", font=("Arial", 40, "italic"), fill="black")
card_word = canvas.create_text(400, 253, text="Word", font=("Arial", 60, "bold"), fill="black")
canvas.config(bg=BACKGROUND_COLOR, highlightthickness=0)
canvas.grid(row=0, column=0, columnspan=2)

cross_image = PhotoImage(file="images/wrong.png")
wrong_button = Button(image=cross_image, highlightbackground=BACKGROUND_COLOR, command=next_card)
wrong_button.grid(row=1, column=0)
check_image = PhotoImage(file="images/right.png")
right_button = Button(image=check_image, highlightbackground=BACKGROUND_COLOR, command=is_known)
right_button.grid(row=1, column=1)

next_card()
window.mainloop()
