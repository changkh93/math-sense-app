from tkinter import *

cards = [("imagine", "상상하다"), ("create", "만들다")]
index = 0
window = Tk()
window.title("내가 만든 단어 카드")
window.config(bg="#B1DDC6", padx=24, pady=24)
canvas = Canvas(width=600, height=380, bg="#B1DDC6")
canvas.grid(row=0, column=0, columnspan=2)

title = canvas.create_text(300, 90, text="ENGLISH",
    font=("Arial", 24), fill="#26483e")
word = canvas.create_text(300, 195, text="imagine",
    font=("Arial", 48, "bold"), fill="#152a24")

def flip_card():
    canvas.itemconfig(title, text="KOREAN")
    canvas.itemconfig(word, text=cards[index][1])

def next_card():
    global index
    index = (index + 1) % len(cards)
    canvas.itemconfig(title, text="ENGLISH")
    canvas.itemconfig(word, text=cards[index][0])

Button(text="뜻 확인", command=flip_card,
    font=("Arial", 22), padx=24, pady=12).grid(row=1, column=0)
Button(text="다음 단어", command=next_card,
    font=("Arial", 22), padx=24, pady=12).grid(row=1, column=1)
window.mainloop()
