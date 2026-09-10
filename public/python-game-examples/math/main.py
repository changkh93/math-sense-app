# 배열과 도수분포표: 실행할 .py 파일을 열고 실행 버튼을 누르세요.
import numpy as np
import pandas as pd

np.random.seed(42)
values = np.array([3, 5, 2, 8, 4])
print('배열 두 배:', values * 2)
series = pd.Series(values, index=['a', 'b', 'c', 'd', 'e'])
print('a+b:', series['a'] + series['b'])
print('정수 인덱스:', pd.Series([1, 7, 3])[1])

scores = np.random.randint(4, 21, size=30) * 5
frequency = np.zeros(8)
for score in scores:
    # 100점도 마지막 구간(90~100)에 포함합니다.
    position = min((score - 20) // 10, 7)
    frequency[position] += 1
bins = ['20~30', '30~40', '40~50', '50~60', '60~70', '70~80', '80~90', '90~100']
table = pd.Series(frequency, index=bins, dtype=int)
table.name = '2-1반 수학성적 도수분포표'
print(scores)
print(table)
assert table.sum() == 30

weights = np.random.randint(40, 90, 24)
heights = np.random.randint(150, 190, 24)
dictionary_table = pd.DataFrame({'weight': weights, 'height': heights})
matrix = np.zeros((24, 2))
matrix[:, 0] = weights
matrix[:, 1] = heights
matrix_table = pd.DataFrame(matrix, columns=['weight', 'height'])
print(dictionary_table.head())
print(matrix_table.head())
assert matrix_table.shape == (24, 2)

h = pd.DataFrame(list(zip([34, 45, 76], [155, 164, 175])),
                 index=['왕새우', '금붕어', '너구리'], columns=['몸무게', '키'])
print('첫 몸무게:', h.iloc[0, 0])
# 행 이름과 열 이름을 지정하면 pandas 버전이 달라도 확실하게 수정됩니다.
h.loc['왕새우', '몸무게'] = 100
print(h)
assert h.loc['왕새우', '몸무게'] == 100

my_data = pd.DataFrame({'english': [100, 56, 46, 90, 75],
                        'math': [90, 85, 45, 30, 80],
                        'science': [95, 80, 75, 60, 88]},
                       index=['강형욱', '유재석', '금쪽이', '박명수', '손흥민'])
print(my_data.loc['박명수'])
print(my_data[my_data['english'] == 100].math)
print('배열·표 수업 확인 완료')
