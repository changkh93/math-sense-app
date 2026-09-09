# 설치 없이 실행할 수 있습니다. 콜랩의 아래 설치 줄이 남아 있어도 지원합니다.
!pip install ColabTurtlePlus
from ColabTurtlePlus.Turtle import *

clearscreen()
screen = Screen()
screen_width = 800
screen_height = 600
screen.setup(screen_width, screen_height)
screen.bgcolor("green")

t = Turtle()
t.speed(15)
t.pensize(5)

# 하늘
t.penup()
t.goto(-screen_width/2, -screen_height/6)
t.color("deep sky blue")
t.begin_fill()
for i in range(2):
    t.forward(screen_width)
    t.left(90)
    t.forward(screen_height/3 * 2)
    t.left(90)
t.end_fill()

# 태양
t.goto(-screen_width/2 + 70, screen_height/2 - 80)
t.color("yellow")
t.begin_fill()
t.circle(30)
t.end_fill()

# 구름
def cloud(x, y):
    t.goto(x, y)
    t.color("white")
    t.begin_fill()
    t.circle(25)
    t.end_fill()

cloud(200, 200)
cloud(220, 240)
cloud(235, 210)
cloud(250, 230)

# 집 몸체
t.goto(-100, -screen_height/6)
t.pendown()
t.color("saddle brown", "peru")
t.begin_fill()
for i in range(4):
    t.forward(170)
    t.left(90)
t.end_fill()

# 굴뚝
t.penup()
t.goto(20, 130)
t.pendown()
t.color("firebrick", "gray")
t.begin_fill()
for i in range(2):
    t.forward(20)
    t.left(90)
    t.forward(100)
    t.left(90)
t.end_fill()

# 지붕
t.penup()
t.goto(-127, 70)
t.pendown()
t.begin_fill()
for i in range(3):
    t.forward(224)
    t.left(120)
t.end_fill()

# 창틀
def frame(x, y):
    t.penup()
    t.goto(x, y)
    t.pendown()
    t.color("black", "white")
    t.begin_fill()
    for i in range(4):
        t.forward(50)
        t.left(90)
    t.end_fill()

frame(-80, 0)
frame(0, 0)

def window_horizontal(x, y):
    t.penup()
    t.goto(x, y)
    t.pendown()
    t.forward(50)

window_horizontal(-80, 25)
window_horizontal(0, 25)

def window_vertical(x, y):
    t.penup()
    t.goto(x, y)
    t.pendown()
    t.left(90)
    t.forward(50)

window_vertical(-55, 0)
t.right(90)
window_vertical(25, 0)

# 현관문
t.penup()
t.goto(-40, -97)
t.pendown()
t.color("sea green", "medium sea green")
t.begin_fill()
for i in range(2):
    t.forward(80)
    t.right(90)
    t.forward(50)
    t.right(90)
t.end_fill()

# 손잡이
t.penup()
t.goto(-25, -50)
t.pendown()
t.color("white")
t.begin_fill()
t.circle(5)
t.end_fill()
t.hideturtle()
