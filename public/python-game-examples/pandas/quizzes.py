import pandas as pd

# 퀴즈 1: 이름이 홍길동인 행을 선택하고 출력
data_dict = {
    "name": ["왕새우", "홍길동", "박명수"],
    "scores": [80, 90, 60],
}
data = pd.DataFrame(data_dict)
selected_data = data[data['name'] == '홍길동']
print(selected_data)

# 퀴즈 2: 점수가 가장 높은 사람의 이름과 점수
max_score_data = data[data['scores'] == data['scores'].max()]
print(max_score_data)

# 퀴즈 3: 딕셔너리를 데이터프레임으로 변환
data_dict = {
    "city": ["서울", "부산", "인천"],
    "population": [9904312, 3448737, 2890451],
    "area": [605.21, 770.04, 1063.49],
}
city_data = pd.DataFrame(data_dict)
print(city_data)

# 퀴즈 4: 인구가 300만 이상인 도시
large_cities = city_data[city_data['population'] >= 3000000]
print(large_cities)

# 퀴즈 5: CSV 파일로 저장
city_data.to_csv("cities.csv")
print("파일 'cities.csv'가 성공적으로 저장되었습니다.")
