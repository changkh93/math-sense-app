import numpy as np
import matplotlib.pyplot as plt

x = np.arange(-5, 6)

plt.figure(figsize=(6, 4.4))
for a in [1, 2, -1]:
    y = a * x + 1
    plt.plot(x, y, label=f"y = {a}x + 1")

plt.axhline(0, color="gray", linewidth=0.8)
plt.axvline(0, color="gray", linewidth=0.8)
plt.scatter(0, 1, s=100, color="tomato")
plt.title("기울기가 달라도 만나는 점은?")
plt.grid(alpha=0.25)
plt.legend()
plt.show()
print("모든 직선은 (0, 1)을 지나갑니다.")
