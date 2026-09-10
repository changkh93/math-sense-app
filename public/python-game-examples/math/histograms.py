import numpy as np
import matplotlib.pyplot as plt

np.random.seed(42)
weights = np.random.randint(20, 55, 20)
# arange의 끝은 포함하지 않습니다. 55까지 경계를 만들려면 stop=56.
bins = np.arange(20, 56, 5)
hist, boundaries = np.histogram(weights, bins)
print('몸무게:', weights)
print('도수:', hist)
print('상대도수:', hist / len(weights))
assert hist.sum() == len(weights)

plt.figure(figsize=(6, 4))
plt.hist(weights, bins=bins, rwidth=0.8, color='green', alpha=0.5, edgecolor='y')
plt.xticks(bins, fontsize=14)
plt.yticks(fontsize=14)
plt.grid()
plt.title('우리 반 몸무게 히스토그램')
plt.xlabel('몸무게 (kg)')
plt.ylabel('도수')
plt.show()

centers = (boundaries[:-1] + boundaries[1:]) / 2
plt.figure(figsize=(6, 4))
plt.bar(centers, hist, width=4, edgecolor='y')
plt.xticks(bins)
plt.title('계급값을 이용한 막대그래프')
print('계급값으로 추정한 평균:', sum(np.multiply(hist, centers)) / len(weights))
# show()를 생략한 마지막 그래프도 실행 종료 시 표시됩니다.
