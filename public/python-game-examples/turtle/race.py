# 파일마다 가져오기 구문이 필요합니다. 앞선 콜랩 셀의 상태에 의존하지 않습니다.
from ColabTurtlePlus.Turtle import *
import random

clearscreen()
screen_width = 800
screen_height = 500
screen = Screen()
screen.setup(screen_width, screen_height)
screen.bgcolor("green")

drawing = Turtle()
drawing.speed(15)
drawing.penup()
drawing.goto(-50, 215)
drawing.color("white")
drawing.write("거북이 경주", font=("Ariel", 30, "bold"))

# 운동장
drawing.goto(-screen_width/2 + 50, screen_height/2 - 50)
drawing.pendown()
drawing.color("peru")
drawing.begin_fill()
for i in range(2):
    drawing.forward(700)
    drawing.right(90)
    drawing.forward(400)
    drawing.right(90)
drawing.end_fill()

# 결승선
drawing.forward(600)
drawing.right(90)
drawing.pensize(5)
drawing.color("black")
drawing.forward(400)
drawing.hideturtle()

turtles = []
colors = ["blue", "pink", "purple", "red"]
for i, c in enumerate(colors):
    t = Turtle()
    t.color(c)
    t.shape("turtle")
    t.pensize(1.5)
    t.penup()
    t.goto(-300, 150 - 100 * i)
    t.pendown()
    turtles.append(t)

running = True
while running:
    turtles[0].forward(random.randint(1, 15))
    turtles[1].forward(random.randint(1, 15))
    turtles[2].forward(random.randint(1, 15))
    turtles[3].forward(random.randint(1, 15))
    if turtles[0].xcor() >= 240 or turtles[1].xcor() >= 240 or turtles[2].xcor() >= 240 or turtles[3].xcor() >= 240:
        running = False

def winner(c, str):
    drawing.color(c)
    drawing.write(f"{str} 거북이 승리", font=("Ariel", 30, "bold"))

drawing.penup()
drawing.goto(-150, 0)
if turtles[0].xcor() >= 240:
    winner("blue", "파란색")
elif turtles[1].xcor() >= 240:
    winner("pink", "핑크색")
elif turtles[2].xcor() >= 240:
    winner("purple", "보라색")
elif turtles[3].xcor() >= 240:
    winner("red", "빨간색")
