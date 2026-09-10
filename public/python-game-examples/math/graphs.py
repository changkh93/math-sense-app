import numpy as np
import matplotlib.pyplot as plt

# Colab에서 쓰던 폰트가 없으면 기본 한글 폰트로 표시합니다.
# 직접 올린 TTF/OTF가 있다면 그 폰트의 family 이름도 사용할 수 있습니다.
plt.rc('font', family='NanumBarunGothic')
x = range(1, 6)
y = list(map(lambda value: 2 * value + 1, x))
plt.figure(figsize=(6, 6))
plt.title('일차함수 y = 2x + 1', fontsize=20, color='black')
plt.scatter(x, y, c='g', s=100, label='dot graph')
plt.plot(x, y, c='c', linewidth=1.5, alpha=0.5, label='line graph')
plt.xticks(fontsize=14, c='b')
plt.yticks(fontsize=16, c='r')
plt.legend(fontsize=14, loc=4)
plt.grid()
plt.xlabel('Sun light', color='m', fontsize=19)
plt.ylabel('Apple sweet', c='r', fontsize=20)
plt.axvline(x=5)
plt.axhline(3)
plt.show()

fig = plt.figure(figsize=(6, 4))
ax = plt.axes()
x = np.arange(-10, 10)
for intercept in np.arange(-5, 5, 2):
    ax.plot(x, x + intercept, label=f'y=x + {intercept}')
    ax.scatter(0, intercept)
    ax.text(0.2, intercept + 0.2, f'(0, {intercept})')
ax.grid()
ax.legend()
ax.axvline(0, color='black')
ax.set_title('y절편을 비교해 보세요')
ax.set_xlim(-10, 10)
ax.set_ylim(-15, 15)
plt.show()

plt.figure(figsize=(5, 8))
x = np.arange(-10, 11)
for coefficient in [1, 2, 3]:
    # x=0이면 NumPy는 경고와 inf를 반환합니다. 그래프는 그 점에서 끊깁니다.
    y = coefficient / x
    plt.scatter(x, y)
    plt.plot(x, y, label=f'y = {coefficient}/x')
plt.axvline(x=0)
plt.axhline(y=0)
plt.grid()
plt.legend()
plt.show()
