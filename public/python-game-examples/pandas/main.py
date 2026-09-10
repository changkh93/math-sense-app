import csv
import pandas

# csv.reader는 각 값을 문자열로 읽습니다.
with open("weather_data.csv", encoding="utf-8") as file:
    data = csv.reader(file)
    temperatures = []
    for row in data:
        if row[1] != "온도":
            temperatures.append(row[1])
    print(temperatures)

# pandas는 숫자 열을 숫자로 읽습니다. 첫 행은 열 이름입니다.
data = pandas.read_csv("weather.csv")
print(data)
print(data["온도"])
print(data["온도"][0])
print(type(data))
print(type(data["온도"]))

# 사전과 리스트로 변환
data_dict = data.to_dict()
print(data_dict)
temp_list = data["온도"].to_list()
print(temp_list)

# .py 파일은 콜랩 셀과 달리 결과를 print로 출력합니다.
print(sum(temp_list) / len(temp_list))
print(data["온도"].mean())
print(data["온도"].max())
print(data.온도)

# 월요일 행 선택
print(data[data.요일 == "월"])
# 가장 높은 온도의 행 선택 (같은 최댓값이 여러 개면 모두 선택)
print(data[data.온도 == data.온도.max()])
monday_data = data[data.요일 == "월"]
print(monday_data.온도)

# 열마다 리스트를 넣어 표 만들기
data_dict = {
    "name": ["왕새우", "홍길동", "박명수"],
    "scores": [80, 90, 60],
}
data = pandas.DataFrame(data_dict)
print(data)
# 기본값 index=True: 행 번호도 함께 저장합니다.
data.to_csv("new_data.csv")
print("new_data.csv 저장 완료")
