from turtle import *

screen = Screen()
screen.setup(700, 500)
screen.bgcolor("#10192e")
t = Turtle()
t.hideturtle()
t.speed(8)
t.penup()

# 0, 3, 6, 9초에 열리는 신호 다리
# 관찰한 규칙을 다른 시간에도 적용해요.
for time in range(12):
    opened = time % 3 == 0
    t.goto(-265 + (time % 6) * 105, 100 - (time // 6) * 180)
    t.dot(58, "#7ff0cd" if opened else "#34425b")
    t.goto(t.xcor(), t.ycor() - 62)
    t.color("white")
    t.write(str(time) + "초", align="center", font=("Arial", 16, "normal"))
    print(time, "열림" if opened else "닫힘")

print("12초는?", 12 % 3 == 0)
