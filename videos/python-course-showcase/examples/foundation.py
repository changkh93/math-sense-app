from turtle import *

screen = Screen()
screen.setup(700, 480)
screen.bgcolor("#10192e")

t = Turtle()
t.speed(8)
t.pensize(3)
colors = ["#7ff0cd", "#6fdaff", "#c4a1ff"]

# 각도를 바꾸면 어떤 꽃이 될까요?
for i in range(18):
    t.color(colors[i % 3])
    t.circle(105)
    t.left(20)

t.hideturtle()
print("18번의 반복으로 나만의 꽃 완성!")
