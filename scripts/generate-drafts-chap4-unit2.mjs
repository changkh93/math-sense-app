import fs from 'node:fs';

const unitId = 'ratios_ratio_chap4_unit2';

const pagesData = [
  // Page 1: Slide 93
  {
    pageId: 'page_1787004213960_1',
    summary: '뜻풀이 문제 1, 2, 3 - 속력의 정의와 기준량/비교량 (4지선다형)',
    elements: [
      {
        clientKey: 'q1',
        type: 'multiple-choice',
        answer: '② 빠르기',
        options: ['① 먹기', '② 빠르기', '③ 자기', '④ 싸기'],
        problemLabel: '뜻풀이 문제 1',
        responseLabel: '속력의 의미',
        hints: ['속력은 얼마나 빨리 움직이는지 나타내는 빠르기입니다.', '②를 선택하세요.'],
        sourceText: '속력을 한 마디로 표현하면?',
        confidence: 0.99,
        position: { top: 49.0, left: 32.0, width: 54.0, height: 8.0 }
      },
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '① 시간(time)',
        options: ['① 시간(time)', '② 야옹이(cat)', '③ 나(me)', '④ 우리 엄마(mom)'],
        problemLabel: '뜻풀이 문제 2',
        responseLabel: '속력의 기준량',
        hints: ['속력의 기준량은 시간(time)입니다.', '①을 선택하세요.'],
        sourceText: '속력에서 기준량은 무엇인가요?',
        confidence: 0.99,
        position: { top: 64.0, left: 32.0, width: 54.0, height: 8.0 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '④ 거리(distance)',
        options: ['① 묻지 마', '② 후덜덜', '③ 자고 싶다', '④ 거리(distance)'],
        problemLabel: '뜻풀이 문제 3',
        responseLabel: '속력의 비교량',
        hints: ['속력의 비교량은 이동한 거리(distance)입니다.', '④를 선택하세요.'],
        sourceText: '속력에서 비교량은 무엇인가요?',
        confidence: 0.99,
        position: { top: 79.0, left: 32.0, width: 54.0, height: 8.0 }
      }
    ]
  },

  // Page 2: Slide 94
  {
    pageId: 'page_1787004213960_2',
    summary: '뜻풀이 문제 4 - 속력 표현식이 뜻하는 바 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '4초 동안 1000m 이동',
        options: ['4초 동안 1000m 이동', '4분 동안 1000m 이동', '1초 동안 1000m 이동', '4시간 동안 1000m 이동'],
        problemLabel: '(2)',
        responseLabel: '식의 의미',
        hints: ['1000m/4sec는 4초 동안 1000m 이동한 것을 뜻합니다.', '4초 동안 1000m 이동을 선택하세요.'],
        sourceText: '1000m / 4sec',
        confidence: 0.99,
        position: { top: 44.5, left: 16.0, width: 30.0, height: 3.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '3시간 12분 동안 120km 이동',
        options: ['3시간 12분 동안 120km 이동', '3시간 20분 동안 120km 이동', '3시간 2분 동안 120km 이동', '3시간 동안 120km 이동'],
        problemLabel: '(3)',
        responseLabel: '식의 의미',
        hints: ['3.2h = 3시간 12분이므로 3시간 12분 동안 120km 이동입니다.', '3시간 12분 동안 120km 이동을 선택하세요.'],
        sourceText: '120km / 3.2h',
        confidence: 0.99,
        position: { top: 64.5, left: 16.0, width: 30.0, height: 3.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '10시간 24분 동안 4120km 이동',
        options: ['10시간 24분 동안 4120km 이동', '10시간 40분 동안 4120km 이동', '10시간 4분 동안 4120km 이동', '10시간 동안 4120km 이동'],
        problemLabel: '(4)',
        responseLabel: '식의 의미',
        hints: ['10.4h = 10시간 24분이므로 10시간 24분 동안 4120km 이동입니다.', '10시간 24분 동안 4120km 이동을 선택하세요.'],
        sourceText: '4120km / 10.4h',
        confidence: 0.99,
        position: { top: 84.5, left: 16.0, width: 30.0, height: 3.5 }
      },
      {
        clientKey: 'q6',
        type: 'multiple-choice',
        answer: '5시간 30분 동안 1234km 이동',
        options: ['5시간 30분 동안 1234km 이동', '5시간 5분 동안 1234km 이동', '5시간 50분 동안 1234km 이동', '5시간 동안 1234km 이동'],
        problemLabel: '(6)',
        responseLabel: '식의 의미',
        hints: ['5.5h = 5시간 30분이므로 5시간 30분 동안 1234km 이동입니다.', '5시간 30분 동안 1234km 이동을 선택하세요.'],
        sourceText: '1234km / 5.5h',
        confidence: 0.99,
        position: { top: 44.5, left: 53.5, width: 30.0, height: 3.5 }
      },
      {
        clientKey: 'q7',
        type: 'multiple-choice',
        answer: '1시간 30분 동안 550km 이동',
        options: ['1시간 30분 동안 550km 이동', '1시간 5분 동안 550km 이동', '1시간 50분 동안 550km 이동', '1시간 동안 550km 이동'],
        problemLabel: '(7)',
        responseLabel: '식의 의미',
        hints: ['1.5h = 1시간 30분이므로 1시간 30분 동안 550km 이동입니다.', '1시간 30분 동안 550km 이동을 선택하세요.'],
        sourceText: '550km / 1.5h',
        confidence: 0.99,
        position: { top: 64.5, left: 53.5, width: 30.0, height: 3.5 }
      },
      {
        clientKey: 'q8',
        type: 'multiple-choice',
        answer: '2초 동안 12m 이동',
        options: ['2초 동안 12m 이동', '2분 동안 12m 이동', '2시간 동안 12m 이동', '1초 동안 12m 이동'],
        problemLabel: '(8)',
        responseLabel: '식의 의미',
        hints: ['12m/2sec는 2초 동안 12m 이동한 것을 뜻합니다.', '2초 동안 12m 이동을 선택하세요.'],
        sourceText: '12m / 2sec',
        confidence: 0.99,
        position: { top: 84.5, left: 53.5, width: 30.0, height: 3.5 }
      }
    ]
  },

  // Page 3: Slide 95
  {
    pageId: 'page_1787004213960_3',
    summary: '연습문제 1 - 단위 비율(unit rate)로 바꾸기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '240km',
        options: ['240km', '24km', '360km', '180km'],
        problemLabel: '(2)',
        responseLabel: '1시간당 거리',
        hints: ['360 ÷ 1.5 = 240km입니다.', '240km를 선택하세요.'],
        sourceText: '360km / 1.5h = [ ] / 1h',
        confidence: 0.99,
        position: { top: 78.5, left: 34.0, width: 10.0, height: 4.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '220km',
        options: ['220km', '22km', '550km', '200km'],
        problemLabel: '(3)',
        responseLabel: '1시간당 거리',
        hints: ['1100 ÷ 5 = 220km입니다.', '220km를 선택하세요.'],
        sourceText: '1100km / 5h = [ ] / 1h',
        confidence: 0.99,
        position: { top: 58.5, left: 72.0, width: 10.0, height: 4.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '4m',
        options: ['4m', '40m', '7m', '14m'],
        problemLabel: '(4)',
        responseLabel: '1초당 거리',
        hints: ['28 ÷ 7 = 4m입니다.', '4m를 선택하세요.'],
        sourceText: '28m / 7sec = [ ] / 1sec',
        confidence: 0.99,
        position: { top: 78.5, left: 72.0, width: 10.0, height: 4.5 }
      }
    ]
  },

  // Page 4: Slide 96
  {
    pageId: 'page_1787004213960_4',
    summary: '연습문제 2 - 속력의 크기 비교하기 (4지선다/선택형 > < =)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '=',
        options: ['>', '<', '='],
        problemLabel: '(2)',
        responseLabel: '크기 비교',
        hints: ['120km/h = 240km/2h = 120km/h로 같습니다.', '=를 선택하세요.'],
        sourceText: '120km/1h vs 240km/2h',
        confidence: 0.99,
        position: { top: 36.0, left: 28.5, width: 5.0, height: 4.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '<',
        options: ['>', '<', '='],
        problemLabel: '(3)',
        responseLabel: '크기 비교',
        hints: ['150km/5h = 30km/h, 99km/3h = 33km/h이므로 30 < 33입니다.', '<를 선택하세요.'],
        sourceText: '150km/5h vs 99km/3h',
        confidence: 0.99,
        position: { top: 56.5, left: 28.5, width: 5.0, height: 4.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '>',
        options: ['>', '<', '='],
        problemLabel: '(4)',
        responseLabel: '크기 비교',
        hints: ['85km/1h = 85km/h, 250km/3h = 83.33...km/h이므로 85 > 83.33입니다.', '>를 선택하세요.'],
        sourceText: '85km/1h vs 250km/3h',
        confidence: 0.99,
        position: { top: 76.5, left: 28.5, width: 5.0, height: 4.5 }
      },
      {
        clientKey: 'q5',
        type: 'multiple-choice',
        answer: '<',
        options: ['>', '<', '='],
        problemLabel: '(5)',
        responseLabel: '크기 비교',
        hints: ['210km/3h = 70km/h, 300km/4h = 75km/h이므로 70 < 75입니다.', '<를 선택하세요.'],
        sourceText: '210km/3h vs 300km/4h',
        confidence: 0.99,
        position: { top: 16.5, left: 66.0, width: 5.0, height: 4.5 }
      },
      {
        clientKey: 'q6',
        type: 'multiple-choice',
        answer: '>',
        options: ['>', '<', '='],
        problemLabel: '(6)',
        responseLabel: '크기 비교',
        hints: ['900km/9h = 100km/h, 190km/2h = 95km/h이므로 100 > 95입니다.', '>를 선택하세요.'],
        sourceText: '900km/9h vs 190km/2h',
        confidence: 0.99,
        position: { top: 36.0, left: 66.0, width: 5.0, height: 4.5 }
      },
      {
        clientKey: 'q7',
        type: 'multiple-choice',
        answer: '>',
        options: ['>', '<', '='],
        problemLabel: '(7)',
        responseLabel: '크기 비교',
        hints: ['370km/6h = 61.67km/h, 240km/4h = 60km/h이므로 61.67 > 60입니다.', '>를 선택하세요.'],
        sourceText: '370km/6h vs 240km/4h',
        confidence: 0.99,
        position: { top: 56.5, left: 66.0, width: 5.0, height: 4.5 }
      },
      {
        clientKey: 'q8',
        type: 'multiple-choice',
        answer: '<',
        options: ['>', '<', '='],
        problemLabel: '(8)',
        responseLabel: '크기 비교',
        hints: ['650km/7h = 92.86km/h, 290km/3h = 96.67km/h이므로 92.86 < 96.67입니다.', '<를 선택하세요.'],
        sourceText: '650km/7h vs 290km/3h',
        confidence: 0.99,
        position: { top: 76.5, left: 66.0, width: 5.0, height: 4.5 }
      }
    ]
  },

  // Page 5: Slide 97
  {
    pageId: 'page_1787004213960_5',
    summary: '뜻풀이 문제 5, 6, 7 - 속력의 단위 (4지선다형)',
    elements: [
      {
        clientKey: 'q5',
        type: 'multiple-choice',
        answer: '① km/h',
        options: ['① km/h', '② km/sec', '③ m/h', '④ km/min'],
        problemLabel: '뜻풀이 문제 5',
        responseLabel: '시속의 단위',
        hints: ['시속은 1시간 동안 몇 km를 가는지 나타내므로 km/h입니다.', '①을 선택하세요.'],
        sourceText: '시속의 단위는 무엇인가요?',
        confidence: 0.99,
        position: { top: 49.0, left: 32.0, width: 54.0, height: 8.0 }
      },
      {
        clientKey: 'q6',
        type: 'multiple-choice',
        answer: '① m/min',
        options: ['① m/min', '② km/sec', '③ km/min', '④ m/sec'],
        problemLabel: '뜻풀이 문제 6',
        responseLabel: '분속의 단위',
        hints: ['분속은 1분 동안 몇 m를 가는지 나타내므로 m/min입니다.', '①을 선택하세요.'],
        sourceText: '분속의 단위는 무엇인가요?',
        confidence: 0.99,
        position: { top: 64.0, left: 32.0, width: 54.0, height: 8.0 }
      },
      {
        clientKey: 'q7',
        type: 'multiple-choice',
        answer: '① m/sec',
        options: ['① m/sec', '② km/sec', '③ m/h', '④ km/h'],
        problemLabel: '뜻풀이 문제 7',
        responseLabel: '초속의 단위',
        hints: ['초속은 1초 동안 몇 m를 가는지 나타내므로 m/sec입니다.', '①을 선택하세요.'],
        sourceText: '초속의 단위는 무엇인가요?',
        confidence: 0.99,
        position: { top: 79.0, left: 32.0, width: 54.0, height: 8.0 }
      }
    ]
  },

  // Page 6: Slide 98
  {
    pageId: 'page_1787004213960_6',
    summary: '연습문제 3 - 시속 구하기 단계별 완성 (4지선다형)',
    elements: [
      // (2) 45분 동안 150km
      {
        clientKey: 'q2_frac',
        type: 'multiple-choice',
        answer: '$\\frac{150\\text{km}}{0.75\\text{h}}$',
        options: ['$\\frac{150\\text{km}}{0.75\\text{h}}$', '$\\frac{150\\text{km}}{45\\text{h}}$', '$\\frac{150\\text{km}}{0.45\\text{h}}$', '$\\frac{150\\text{km}}{1\\text{h}}$'],
        problemLabel: '(2)-변환',
        responseLabel: 'km, h로 변환',
        hints: ['45분은 0.75시간이므로 150km / 0.75h입니다.', '$\\frac{150\\text{km}}{0.75\\text{h}}$를 선택하세요.'],
        sourceText: 'km, h로 변환',
        confidence: 0.99,
        position: { top: 39.5, left: 19.0, width: 10.5, height: 6.0 }
      },
      {
        clientKey: 'q2_base1',
        type: 'multiple-choice',
        answer: '$\\frac{200\\text{km}}{1\\text{h}}$',
        options: ['$\\frac{200\\text{km}}{1\\text{h}}$', '$\\frac{150\\text{km}}{1\\text{h}}$', '$\\frac{100\\text{km}}{1\\text{h}}$', '$\\frac{250\\text{km}}{1\\text{h}}$'],
        problemLabel: '(2)-기준량 1',
        responseLabel: '기준량 1로 만들기',
        hints: ['150 ÷ 0.75 = 200이므로 200km / 1h입니다.', '$\\frac{200\\text{km}}{1\\text{h}}$를 선택하세요.'],
        sourceText: '기준량 1로 만들기',
        confidence: 0.99,
        position: { top: 39.5, left: 45.0, width: 10.5, height: 6.0 }
      },
      {
        clientKey: 'q2_slash',
        type: 'multiple-choice',
        answer: '200km/h',
        options: ['200km/h', '150km/h', '100km/h', '250km/h'],
        problemLabel: '(2)-/ 사용',
        responseLabel: '1을 생략하고 / 사용',
        hints: ['1을 생략하고 /를 쓰면 200km/h입니다.', '200km/h를 선택하세요.'],
        sourceText: '1을 생략하고 / 사용',
        confidence: 0.99,
        position: { top: 39.5, left: 70.0, width: 13.0, height: 6.0 }
      },

      // (3) 2시간 반 동안 300km
      {
        clientKey: 'q3_frac',
        type: 'multiple-choice',
        answer: '$\\frac{300\\text{km}}{2.5\\text{h}}$',
        options: ['$\\frac{300\\text{km}}{2.5\\text{h}}$', '$\\frac{300\\text{km}}{2\\text{h}}$', '$\\frac{300\\text{km}}{2.3\\text{h}}$', '$\\frac{300\\text{km}}{1\\text{h}}$'],
        problemLabel: '(3)-변환',
        responseLabel: 'km, h로 변환',
        hints: ['2시간 반은 2.5시간이므로 300km / 2.5h입니다.', '$\\frac{300\\text{km}}{2.5\\text{h}}$를 선택하세요.'],
        sourceText: 'km, h로 변환',
        confidence: 0.99,
        position: { top: 59.5, left: 19.0, width: 10.5, height: 6.0 }
      },
      {
        clientKey: 'q3_base1',
        type: 'multiple-choice',
        answer: '$\\frac{120\\text{km}}{1\\text{h}}$',
        options: ['$\\frac{120\\text{km}}{1\\text{h}}$', '$\\frac{150\\text{km}}{1\\text{h}}$', '$\\frac{100\\text{km}}{1\\text{h}}$', '$\\frac{600\\text{km}}{1\\text{h}}$'],
        problemLabel: '(3)-기준량 1',
        responseLabel: '기준량 1로 만들기',
        hints: ['300 ÷ 2.5 = 120이므로 120km / 1h입니다.', '$\\frac{120\\text{km}}{1\\text{h}}$를 선택하세요.'],
        sourceText: '기준량 1로 만들기',
        confidence: 0.99,
        position: { top: 59.5, left: 45.0, width: 10.5, height: 6.0 }
      },
      {
        clientKey: 'q3_slash',
        type: 'multiple-choice',
        answer: '120km/h',
        options: ['120km/h', '150km/h', '100km/h', '600km/h'],
        problemLabel: '(3)-/ 사용',
        responseLabel: '1을 생략하고 / 사용',
        hints: ['1을 생략하고 /를 쓰면 120km/h입니다.', '120km/h를 선택하세요.'],
        sourceText: '1을 생략하고 / 사용',
        confidence: 0.99,
        position: { top: 59.5, left: 70.0, width: 13.0, height: 6.0 }
      },

      // (4) 3시간 15분 동안 250km
      {
        clientKey: 'q4_frac',
        type: 'multiple-choice',
        answer: '$\\frac{250\\text{km}}{3.25\\text{h}}$',
        options: ['$\\frac{250\\text{km}}{3.25\\text{h}}$', '$\\frac{250\\text{km}}{3.15\\text{h}}$', '$\\frac{250\\text{km}}{3.5\\text{h}}$', '$\\frac{250\\text{km}}{3\\text{h}}$'],
        problemLabel: '(4)-변환',
        responseLabel: 'km, h로 변환',
        hints: ['3시간 15분은 3.25시간이므로 250km / 3.25h입니다.', '$\\frac{250\\text{km}}{3.25\\text{h}}$를 선택하세요.'],
        sourceText: 'km, h로 변환',
        confidence: 0.99,
        position: { top: 79.5, left: 19.0, width: 10.5, height: 6.0 }
      },
      {
        clientKey: 'q4_base1',
        type: 'multiple-choice',
        answer: '$\\frac{76.92...\\text{km}}{1\\text{h}}$',
        options: ['$\\frac{76.92...\\text{km}}{1\\text{h}}$', '$\\frac{75\\text{km}}{1\\text{h}}$', '$\\frac{80\\text{km}}{1\\text{h}}$', '$\\frac{79.36...\\text{km}}{1\\text{h}}$'],
        problemLabel: '(4)-기준량 1',
        responseLabel: '기준량 1로 만들기',
        hints: ['250 ÷ 3.25 = 76.92...이므로 76.92...km / 1h입니다.', '$\\frac{76.92...\\text{km}}{1\\text{h}}$를 선택하세요.'],
        sourceText: '기준량 1로 만들기',
        confidence: 0.99,
        position: { top: 79.5, left: 45.0, width: 10.5, height: 6.0 }
      },
      {
        clientKey: 'q4_slash',
        type: 'multiple-choice',
        answer: '76.92...km/h',
        options: ['76.92...km/h', '75km/h', '80km/h', '79.36...km/h'],
        problemLabel: '(4)-/ 사용',
        responseLabel: '1을 생략하고 / 사용',
        hints: ['1을 생략하고 /를 쓰면 76.92...km/h입니다.', '76.92...km/h를 선택하세요.'],
        sourceText: '1을 생략하고 / 사용',
        confidence: 0.99,
        position: { top: 79.5, left: 70.0, width: 13.0, height: 6.0 }
      }
    ]
  },

  // Page 7: Slide 99
  {
    pageId: 'page_1787004213960_7',
    summary: '연습문제 4 - 초속 구하기 단계별 완성 (4지선다형)',
    elements: [
      // (2) 1시간 동안 3.6km
      {
        clientKey: 'q2_frac',
        type: 'multiple-choice',
        answer: '$\\frac{3600\\text{m}}{3600\\text{sec}}$',
        options: ['$\\frac{3600\\text{m}}{3600\\text{sec}}$', '$\\frac{3.6\\text{m}}{3600\\text{sec}}$', '$\\frac{3600\\text{m}}{60\\text{sec}}$', '$\\frac{360\\text{m}}{3600\\text{sec}}$'],
        problemLabel: '(2)-변환',
        responseLabel: 'm, sec로 변환',
        hints: ['3.6km = 3600m, 1시간 = 3600초이므로 3600m / 3600sec입니다.', '$\\frac{3600\\text{m}}{3600\\text{sec}}$를 선택하세요.'],
        sourceText: 'm, sec로 변환',
        confidence: 0.99,
        position: { top: 39.5, left: 19.0, width: 10.5, height: 6.0 }
      },
      {
        clientKey: 'q2_base1',
        type: 'multiple-choice',
        answer: '$\\frac{1\\text{m}}{1\\text{sec}}$',
        options: ['$\\frac{1\\text{m}}{1\\text{sec}}$', '$\\frac{10\\text{m}}{1\\text{sec}}$', '$\\frac{0.1\\text{m}}{1\\text{sec}}$', '$\\frac{3.6\\text{m}}{1\\text{sec}}$'],
        problemLabel: '(2)-기준량 1',
        responseLabel: '기준량 1로 만들기',
        hints: ['3600 ÷ 3600 = 1이므로 1m / 1sec입니다.', '$\\frac{1\\text{m}}{1\\text{sec}}$를 선택하세요.'],
        sourceText: '기준량 1로 만들기',
        confidence: 0.99,
        position: { top: 39.5, left: 45.0, width: 10.5, height: 6.0 }
      },
      {
        clientKey: 'q2_slash',
        type: 'multiple-choice',
        answer: '1m/sec',
        options: ['1m/sec', '10m/sec', '0.1m/sec', '3.6m/sec'],
        problemLabel: '(2)-/ 사용',
        responseLabel: '1을 생략하고 / 사용',
        hints: ['1을 생략하고 /를 쓰면 1m/sec입니다.', '1m/sec를 선택하세요.'],
        sourceText: '1을 생략하고 / 사용',
        confidence: 0.99,
        position: { top: 39.5, left: 70.0, width: 13.0, height: 6.0 }
      },

      // (3) 2분 동안 60m
      {
        clientKey: 'q3_frac',
        type: 'multiple-choice',
        answer: '$\\frac{60\\text{m}}{120\\text{sec}}$',
        options: ['$\\frac{60\\text{m}}{120\\text{sec}}$', '$\\frac{60\\text{m}}{2\\text{sec}}$', '$\\frac{60\\text{m}}{60\\text{sec}}$', '$\\frac{120\\text{m}}{60\\text{sec}}$'],
        problemLabel: '(3)-변환',
        responseLabel: 'm, sec로 변환',
        hints: ['2분은 120초이므로 60m / 120sec입니다.', '$\\frac{60\\text{m}}{120\\text{sec}}$를 선택하세요.'],
        sourceText: 'm, sec로 변환',
        confidence: 0.99,
        position: { top: 59.5, left: 19.0, width: 10.5, height: 6.0 }
      },
      {
        clientKey: 'q3_base1',
        type: 'multiple-choice',
        answer: '$\\frac{0.5\\text{m}}{1\\text{sec}}$',
        options: ['$\\frac{0.5\\text{m}}{1\\text{sec}}$', '$\\frac{2\\text{m}}{1\\text{sec}}$', '$\\frac{1\\text{m}}{1\\text{sec}}$', '$\\frac{0.2\\text{m}}{1\\text{sec}}$'],
        problemLabel: '(3)-기준량 1',
        responseLabel: '기준량 1로 만들기',
        hints: ['60 ÷ 120 = 0.5이므로 0.5m / 1sec입니다.', '$\\frac{0.5\\text{m}}{1\\text{sec}}$를 선택하세요.'],
        sourceText: '기준량 1로 만들기',
        confidence: 0.99,
        position: { top: 59.5, left: 45.0, width: 10.5, height: 6.0 }
      },
      {
        clientKey: 'q3_slash',
        type: 'multiple-choice',
        answer: '0.5m/sec',
        options: ['0.5m/sec', '2m/sec', '1m/sec', '0.2m/sec'],
        problemLabel: '(3)-/ 사용',
        responseLabel: '1을 생략하고 / 사용',
        hints: ['1을 생략하고 /를 쓰면 0.5m/sec입니다.', '0.5m/sec를 선택하세요.'],
        sourceText: '1을 생략하고 / 사용',
        confidence: 0.99,
        position: { top: 59.5, left: 70.0, width: 13.0, height: 6.0 }
      },

      // (4) 3분 20초 동안 0.4km
      {
        clientKey: 'q4_frac',
        type: 'multiple-choice',
        answer: '$\\frac{400\\text{m}}{200\\text{sec}}$',
        options: ['$\\frac{400\\text{m}}{200\\text{sec}}$', '$\\frac{0.4\\text{m}}{200\\text{sec}}$', '$\\frac{400\\text{m}}{320\\text{sec}}$', '$\\frac{400\\text{m}}{100\\text{sec}}$'],
        problemLabel: '(4)-변환',
        responseLabel: 'm, sec로 변환',
        hints: ['0.4km = 400m, 3분 20초 = 200초이므로 400m / 200sec입니다.', '$\\frac{400\\text{m}}{200\\text{sec}}$를 선택하세요.'],
        sourceText: 'm, sec로 변환',
        confidence: 0.99,
        position: { top: 79.5, left: 19.0, width: 10.5, height: 6.0 }
      },
      {
        clientKey: 'q4_base1',
        type: 'multiple-choice',
        answer: '$\\frac{2\\text{m}}{1\\text{sec}}$',
        options: ['$\\frac{2\\text{m}}{1\\text{sec}}$', '$\\frac{20\\text{m}}{1\\text{sec}}$', '$\\frac{0.2\\text{m}}{1\\text{sec}}$', '$\\frac{4\\text{m}}{1\\text{sec}}$'],
        problemLabel: '(4)-기준량 1',
        responseLabel: '기준량 1로 만들기',
        hints: ['400 ÷ 200 = 2이므로 2m / 1sec입니다.', '$\\frac{2\\text{m}}{1\\text{sec}}$를 선택하세요.'],
        sourceText: '기준량 1로 만들기',
        confidence: 0.99,
        position: { top: 79.5, left: 45.0, width: 10.5, height: 6.0 }
      },
      {
        clientKey: 'q4_slash',
        type: 'multiple-choice',
        answer: '2m/sec',
        options: ['2m/sec', '20m/sec', '0.2m/sec', '4m/sec'],
        problemLabel: '(4)-/ 사용',
        responseLabel: '1을 생략하고 / 사용',
        hints: ['1을 생략하고 /를 쓰면 2m/sec입니다.', '2m/sec를 선택하세요.'],
        sourceText: '1을 생략하고 / 사용',
        confidence: 0.99,
        position: { top: 79.5, left: 70.0, width: 13.0, height: 6.0 }
      }
    ]
  },

  // Page 8: Slide 100
  {
    pageId: 'page_1787004213960_8',
    summary: '뜻풀이 문제 8 - 비례식이 주는 의미 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '1시간 동안 80km를 이동하면, 5시간 동안 몇 km 이동할까?',
        options: [
          '1시간 동안 80km를 이동하면, 5시간 동안 몇 km 이동할까?',
          '5시간 동안 80km를 이동하면, 1시간 동안 몇 km 이동할까?',
          '1시간 동안 5km를 이동하면, 80시간 동안 몇 km 이동할까?',
          '80시간 동안 5km를 이동하면, 1시간 동안 몇 km 이동할까?'
        ],
        problemLabel: '(2)',
        responseLabel: '수식의 의미',
        hints: ['80km/1h = x km/5h는 1시간에 80km일 때 5시간 동안 갈 거리를 묻는 식입니다.', '1시간 동안 80km를 이동하면, 5시간 동안 몇 km 이동할까?를 선택하세요.'],
        sourceText: '80km/1h = x km/5h',
        confidence: 0.99,
        position: { top: 84.5, left: 16.0, width: 30.0, height: 3.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '1시간 동안 300km를 이동하면, 4시간 동안 몇 km 이동할까?',
        options: [
          '1시간 동안 300km를 이동하면, 4시간 동안 몇 km 이동할까?',
          '4시간 동안 300km를 이동하면, 1시간 동안 몇 km 이동할까?',
          '1시간 동안 4km를 이동하면, 300시간 동안 몇 km 이동할까?',
          '300시간 동안 4km를 이동하면, 1시간 동안 몇 km 이동할까?'
        ],
        problemLabel: '(3)',
        responseLabel: '수식의 의미',
        hints: ['300km/1h = x km/4h는 1시간에 300km일 때 4시간 동안 갈 거리를 묻는 식입니다.', '1시간 동안 300km를 이동하면, 4시간 동안 몇 km 이동할까?를 선택하세요.'],
        sourceText: '300km/1h = x km/4h',
        confidence: 0.99,
        position: { top: 64.5, left: 53.5, width: 30.0, height: 3.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '1시간 동안 65km를 이동하면, 9시간 동안 몇 km 이동할까?',
        options: [
          '1시간 동안 65km를 이동하면, 9시간 동안 몇 km 이동할까?',
          '9시간 동안 65km를 이동하면, 1시간 동안 몇 km 이동할까?',
          '1시간 동안 9km를 이동하면, 65시간 동안 몇 km 이동할까?',
          '65시간 동안 9km를 이동하면, 1시간 동안 몇 km 이동할까?'
        ],
        problemLabel: '(4)',
        responseLabel: '수식의 의미',
        hints: ['65km/1h = x km/9h는 1시간에 65km일 때 9시간 동안 갈 거리를 묻는 식입니다.', '1시간 동안 65km를 이동하면, 9시간 동안 몇 km 이동할까?를 선택하세요.'],
        sourceText: '65km/1h = x km/9h',
        confidence: 0.99,
        position: { top: 84.5, left: 53.5, width: 30.0, height: 3.5 }
      }
    ]
  },

  // Page 9: Slide 101
  {
    pageId: 'page_1787004213960_9',
    summary: '연습문제 5 - 미지수 x를 사용한 비례식 표현 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '$\\frac{150\\text{km}}{1\\text{h}} = \\frac{300\\text{km}}{x\\text{ h}}$',
        options: [
          '$\\frac{150\\text{km}}{1\\text{h}} = \\frac{300\\text{km}}{x\\text{ h}}$',
          '$\\frac{150\\text{km}}{1\\text{h}} = \\frac{x\\text{ km}}{300\\text{h}}$',
          '$\\frac{300\\text{km}}{1\\text{h}} = \\frac{150\\text{km}}{x\\text{ h}}$',
          '$\\frac{150\\text{km}}{x\\text{ h}} = \\frac{300\\text{km}}{1\\text{h}}$'
        ],
        problemLabel: '(2)',
        responseLabel: '비례식',
        hints: ['1시간에 150km 가므로 150km/1h = 300km/x h입니다.', '$\\frac{150\\text{km}}{1\\text{h}} = \\frac{300\\text{km}}{x\\text{ h}}$를 선택하세요.'],
        sourceText: '150km/h로 300km를 이동하는 데 걸린 시간은?',
        confidence: 0.99,
        position: { top: 43.5, left: 20.0, width: 22.0, height: 4.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '$\\frac{3\\text{m}}{1\\text{sec}} = \\frac{x\\text{ m}}{120\\text{sec}}$',
        options: [
          '$\\frac{3\\text{m}}{1\\text{sec}} = \\frac{x\\text{ m}}{120\\text{sec}}$',
          '$\\frac{3\\text{m}}{1\\text{sec}} = \\frac{120\\text{m}}{x\\text{ sec}}$',
          '$\\frac{3\\text{m}}{120\\text{sec}} = \\frac{x\\text{ m}}{1\\text{sec}}$',
          '$\\frac{3\\text{m}}{1\\text{sec}} = \\frac{x\\text{ m}}{2\\text{sec}}$'
        ],
        problemLabel: '(3)',
        responseLabel: '비례식',
        hints: ['2분은 120초이므로 3m/1sec = x m/120sec입니다.', '$\\frac{3\\text{m}}{1\\text{sec}} = \\frac{x\\text{ m}}{120\\text{sec}}$를 선택하세요.'],
        sourceText: '3m/sec로 2분 동안 이동한 거리는?',
        confidence: 0.99,
        position: { top: 63.5, left: 20.0, width: 22.0, height: 4.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '$\\frac{80\\text{km}}{1\\text{h}} = \\frac{x\\text{ km}}{3\\text{h}}$',
        options: [
          '$\\frac{80\\text{km}}{1\\text{h}} = \\frac{x\\text{ km}}{3\\text{h}}$',
          '$\\frac{80\\text{km}}{1\\text{h}} = \\frac{3\\text{km}}{x\\text{ h}}$',
          '$\\frac{80\\text{km}}{3\\text{h}} = \\frac{x\\text{ km}}{1\\text{h}}$',
          '$\\frac{x\\text{ km}}{1\\text{h}} = \\frac{80\\text{km}}{3\\text{h}}$'
        ],
        problemLabel: '(4)',
        responseLabel: '비례식',
        hints: ['1시간에 80km 가므로 80km/1h = x km/3h입니다.', '$\\frac{80\\text{km}}{1\\text{h}} = \\frac{x\\text{ km}}{3\\text{h}}$를 선택하세요.'],
        sourceText: '80km/h로 3시간 동안 이동한 거리는?',
        confidence: 0.99,
        position: { top: 83.5, left: 20.0, width: 22.0, height: 4.5 }
      },
      {
        clientKey: 'q6',
        type: 'multiple-choice',
        answer: '$\\frac{230\\text{km}}{1\\text{h}} = \\frac{x\\text{ km}}{2\\text{h}}$',
        options: [
          '$\\frac{230\\text{km}}{1\\text{h}} = \\frac{x\\text{ km}}{2\\text{h}}$',
          '$\\frac{230\\text{km}}{1\\text{h}} = \\frac{2\\text{km}}{x\\text{ h}}$',
          '$\\frac{230\\text{km}}{2\\text{h}} = \\frac{x\\text{ km}}{1\\text{h}}$',
          '$\\frac{x\\text{ km}}{1\\text{h}} = \\frac{230\\text{km}}{2\\text{h}}$'
        ],
        problemLabel: '(6)',
        responseLabel: '비례식',
        hints: ['1시간에 230km 가므로 230km/1h = x km/2h입니다.', '$\\frac{230\\text{km}}{1\\text{h}} = \\frac{x\\text{ km}}{2\\text{h}}$를 선택하세요.'],
        sourceText: '230km/h로 2시간 동안 이동한 거리는?',
        confidence: 0.99,
        position: { top: 43.5, left: 57.5, width: 22.0, height: 4.5 }
      },
      {
        clientKey: 'q7',
        type: 'multiple-choice',
        answer: '$\\frac{200\\text{km}}{1\\text{h}} = \\frac{600\\text{km}}{x\\text{ h}}$',
        options: [
          '$\\frac{200\\text{km}}{1\\text{h}} = \\frac{600\\text{km}}{x\\text{ h}}$',
          '$\\frac{200\\text{km}}{1\\text{h}} = \\frac{x\\text{ km}}{600\\text{h}}$',
          '$\\frac{600\\text{km}}{1\\text{h}} = \\frac{200\\text{km}}{x\\text{ h}}$',
          '$\\frac{200\\text{km}}{x\\text{ h}} = \\frac{600\\text{km}}{1\\text{h}}$'
        ],
        problemLabel: '(7)',
        responseLabel: '비례식',
        hints: ['1시간에 200km 가므로 200km/1h = 600km/x h입니다.', '$\\frac{200\\text{km}}{1\\text{h}} = \\frac{600\\text{km}}{x\\text{ h}}$를 선택하세요.'],
        sourceText: '200km/h로 600km를 이동하는 데 걸린 시간은?',
        confidence: 0.99,
        position: { top: 63.5, left: 57.5, width: 22.0, height: 4.5 }
      },
      {
        clientKey: 'q8',
        type: 'multiple-choice',
        answer: '$\\frac{90\\text{km}}{1\\text{h}} = \\frac{180\\text{km}}{x\\text{ h}}$',
        options: [
          '$\\frac{90\\text{km}}{1\\text{h}} = \\frac{180\\text{km}}{x\\text{ h}}$',
          '$\\frac{90\\text{km}}{1\\text{h}} = \\frac{x\\text{ km}}{180\\text{h}}$',
          '$\\frac{180\\text{km}}{1\\text{h}} = \\frac{90\\text{km}}{x\\text{ h}}$',
          '$\\frac{90\\text{km}}{x\\text{ h}} = \\frac{180\\text{km}}{1\\text{h}}$'
        ],
        problemLabel: '(8)',
        responseLabel: '비례식',
        hints: ['1시간에 90km 가므로 90km/1h = 180km/x h입니다.', '$\\frac{90\\text{km}}{1\\text{h}} = \\frac{180\\text{km}}{x\\text{ h}}$를 선택하세요.'],
        sourceText: '90km/h로 180km를 이동하는 데 걸린 시간은?',
        confidence: 0.99,
        position: { top: 83.5, left: 57.5, width: 22.0, height: 4.5 }
      }
    ]
  },

  // Page 10: Slide 102
  {
    pageId: 'page_1787004213960_10',
    summary: '연습문제 6 - 비례식 빈칸 완성하기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '4',
        options: ['4', '40', '0.4', '6'],
        problemLabel: '(2)',
        responseLabel: 'h 값',
        hints: ['600 ÷ 150 = 4h입니다.', '4를 선택하세요.'],
        sourceText: '150km/1h = 600km/[ ]h',
        confidence: 0.99,
        position: { top: 43.0, left: 34.5, width: 6.5, height: 4.0 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '240',
        options: ['240', '24', '60', '4'],
        problemLabel: '(3)',
        responseLabel: 'm 값',
        hints: ['4 × 60 = 240m입니다.', '240을 선택하세요.'],
        sourceText: '4m/1sec = [ ]m/60sec',
        confidence: 0.99,
        position: { top: 59.5, left: 33.0, width: 6.0, height: 3.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '160',
        options: ['160', '80', '16', '320'],
        problemLabel: '(4)',
        responseLabel: 'km 값',
        hints: ['80 × 2 = 160km입니다.', '160을 선택하세요.'],
        sourceText: '80km/1h = [ ]km/2h',
        confidence: 0.99,
        position: { top: 80.0, left: 33.5, width: 6.0, height: 3.5 }
      },
      {
        clientKey: 'q5',
        type: 'multiple-choice',
        answer: '5',
        options: ['5', '50', '0.5', '20'],
        problemLabel: '(5)',
        responseLabel: 'sec 값',
        hints: ['100 ÷ 20 = 5sec입니다.', '5를 선택하세요.'],
        sourceText: '20m/1sec = 100m/[ ]sec',
        confidence: 0.99,
        position: { top: 24.5, left: 71.0, width: 6.0, height: 3.5 }
      },
      {
        clientKey: 'q6',
        type: 'multiple-choice',
        answer: '40',
        options: ['40', '4', '24', '400'],
        problemLabel: '(6)',
        responseLabel: 'km 값',
        hints: ['240 × 1/6 = 40km입니다.', '40을 선택하세요.'],
        sourceText: '240km/1h = [ ]km/(1/6)h',
        confidence: 0.99,
        position: { top: 39.5, left: 71.5, width: 6.0, height: 3.5 }
      },
      {
        clientKey: 'q7',
        type: 'multiple-choice',
        answer: '0.5',
        options: ['0.5', '2', '5', '0.2'],
        problemLabel: '(7)',
        responseLabel: 'h 값',
        hints: ['100 ÷ 200 = 0.5h입니다.', '0.5를 선택하세요.'],
        sourceText: '200km/1h = 100km/[ ]h',
        confidence: 0.99,
        position: { top: 63.5, left: 72.5, width: 5.0, height: 4.5 }
      },
      {
        clientKey: 'q8',
        type: 'multiple-choice',
        answer: '2',
        options: ['2', '20', '0.2', '9'],
        problemLabel: '(8)',
        responseLabel: 'h 값',
        hints: ['180 ÷ 90 = 2h입니다.', '2를 선택하세요.'],
        sourceText: '90km/1h = 180km/[ ]h',
        confidence: 0.99,
        position: { top: 83.5, left: 72.5, width: 6.0, height: 3.5 }
      }
    ]
  },

  // Page 11: Slide 103
  {
    pageId: 'page_1787004213960_11',
    summary: '연습문제 7 - 속력 문제 답 구하기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '4시간',
        options: ['4시간', '40시간', '2시간', '6시간'],
        problemLabel: '(2)',
        responseLabel: '걸린 시간',
        hints: ['600 ÷ 150 = 4시간입니다.', '4시간을 선택하세요.'],
        sourceText: '150km/h로 600km를 이동하는 데 걸린 시간은?',
        confidence: 0.99,
        position: { top: 45.0, left: 37.5, width: 10.0, height: 3.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '1200m',
        options: ['1200m', '120m', '20m', '600m'],
        problemLabel: '(3)',
        responseLabel: '이동한 거리',
        hints: ['1분은 60초이므로 20 × 60 = 1200m입니다.', '1200m를 선택하세요.'],
        sourceText: '20m/sec로 1분 동안 이동한 거리는?',
        confidence: 0.99,
        position: { top: 65.0, left: 37.5, width: 10.0, height: 3.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '490km',
        options: ['490km', '49km', '700km', '350km'],
        problemLabel: '(4)',
        responseLabel: '이동한 거리',
        hints: ['70 × 7 = 490km입니다.', '490km를 선택하세요.'],
        sourceText: '70km/h로 7시간 동안 이동한 거리는?',
        confidence: 0.99,
        position: { top: 85.0, left: 37.5, width: 10.0, height: 3.5 }
      },
      {
        clientKey: 'q5',
        type: 'multiple-choice',
        answer: '2.5초',
        options: ['2.5초', '25초', '0.25초', '5초'],
        problemLabel: '(5)',
        responseLabel: '걸린 시간',
        hints: ['50 ÷ 20 = 2.5초입니다.', '2.5초를 선택하세요.'],
        sourceText: '20m/sec로 50m를 이동하는 데 걸린 시간은?',
        confidence: 0.99,
        position: { top: 26.5, left: 75.5, width: 10.0, height: 3.5 }
      },
      {
        clientKey: 'q6',
        type: 'multiple-choice',
        answer: '100km',
        options: ['100km', '10km', '200km', '50km'],
        problemLabel: '(6)',
        responseLabel: '이동한 거리',
        hints: ['30분은 0.5시간이므로 200 × 0.5 = 100km입니다.', '100km를 선택하세요.'],
        sourceText: '200km/h로 30분 동안 이동한 거리는?',
        confidence: 0.99,
        position: { top: 45.0, left: 75.5, width: 10.0, height: 3.5 }
      },
      {
        clientKey: 'q7',
        type: 'multiple-choice',
        answer: '0.25시간(15분)',
        options: ['0.25시간(15분)', '2.5시간', '4시간', '0.5시간(30분)'],
        problemLabel: '(7)',
        responseLabel: '걸린 시간',
        hints: ['100 ÷ 400 = 0.25시간(15분)입니다.', '0.25시간(15분)을 선택하세요.'],
        sourceText: '400km/h로 100km를 이동하는 데 걸린 시간은?',
        confidence: 0.99,
        position: { top: 65.0, left: 75.5, width: 10.0, height: 3.5 }
      },
      {
        clientKey: 'q8',
        type: 'multiple-choice',
        answer: '3시간',
        options: ['3시간', '30시간', '2시간', '9시간'],
        problemLabel: '(8)',
        responseLabel: '걸린 시간',
        hints: ['270 ÷ 90 = 3시간입니다.', '3시간을 선택하세요.'],
        sourceText: '90km/h로 270km를 이동하는 데 걸린 시간은?',
        confidence: 0.99,
        position: { top: 85.0, left: 75.5, width: 10.0, height: 3.5 }
      }
    ]
  },

  // Page 12: Slide 104
  {
    pageId: 'page_1787004213960_12',
    summary: '표현 문제 1 - 관계식 변환 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: 's·t',
        options: ['s·t', 's/t', 't/s', 's+t'],
        problemLabel: '(2)',
        responseLabel: 'd의 관계식',
        hints: ['s = d/t 이므로 d = s·t입니다.', 's·t를 선택하세요.'],
        sourceText: 'd =',
        confidence: 0.99,
        position: { top: 82.5, left: 30.0, width: 13.0, height: 3.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: 'a·2',
        options: ['a·2', 'a/2', '2/a', 'a+2'],
        problemLabel: '(3)',
        responseLabel: 'b의 관계식',
        hints: ['a = b/2 이므로 b = a·2입니다.', 'a·2를 선택하세요.'],
        sourceText: 'b =',
        confidence: 0.99,
        position: { top: 62.5, left: 68.0, width: 13.0, height: 3.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '백·십',
        options: ['백·십', '백/십', '십/백', '백+십'],
        problemLabel: '(4)',
        responseLabel: '천의 관계식',
        hints: ['백 = 천/십 이므로 천 = 백·십입니다.', '백·십을 선택하세요.'],
        sourceText: '천 =',
        confidence: 0.99,
        position: { top: 82.5, left: 67.0, width: 13.0, height: 3.5 }
      }
    ]
  },

  // Page 13: Slide 105
  {
    pageId: 'page_1787004213960_13',
    summary: '표현 문제 2 - 관계식 변환 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: 'd/s',
        options: ['d/s', 's/d', 'd·s', 'd-s'],
        problemLabel: '(2)',
        responseLabel: 't의 관계식',
        hints: ['s·t = d 이므로 t = d/s입니다.', 'd/s를 선택하세요.'],
        sourceText: 't =',
        confidence: 0.99,
        position: { top: 44.0, left: 33.0, width: 12.0, height: 3.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '만/십',
        options: ['만/십', '십/만', '만·십', '만-십'],
        problemLabel: '(3)',
        responseLabel: '천의 관계식',
        hints: ['십·천 = 만 이므로 천 = 만/십입니다.', '만/십을 선택하세요.'],
        sourceText: '천 =',
        confidence: 0.99,
        position: { top: 64.0, left: 33.0, width: 12.0, height: 3.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '십·만',
        options: ['십·만', '십/만', '만/십', '십+만'],
        problemLabel: '(4)',
        responseLabel: '십만의 관계식',
        hints: ['십 = 십만/만 이므로 십만 = 십·만입니다.', '십·만을 선택하세요.'],
        sourceText: '십만 =',
        confidence: 0.99,
        position: { top: 84.0, left: 32.0, width: 13.0, height: 3.5 }
      },
      {
        clientKey: 'q5',
        type: 'multiple-choice',
        answer: 'b/3',
        options: ['b/3', '3/b', 'b·3', 'b-3'],
        problemLabel: '(5)',
        responseLabel: 'a의 관계식',
        hints: ['3·a = b 이므로 a = b/3입니다.', 'b/3을 선택하세요.'],
        sourceText: 'a =',
        confidence: 0.99,
        position: { top: 24.0, left: 70.0, width: 12.0, height: 3.5 }
      },
      {
        clientKey: 'q6',
        type: 'multiple-choice',
        answer: '십·천',
        options: ['십·천', '십/천', '천/십', '십+천'],
        problemLabel: '(6)',
        responseLabel: '만의 관계식',
        hints: ['십 = 만/천 이므로 만 = 십·천입니다.', '십·천을 선택하세요.'],
        sourceText: '만 =',
        confidence: 0.99,
        position: { top: 44.0, left: 69.0, width: 13.0, height: 3.5 }
      },
      {
        clientKey: 'q7',
        type: 'multiple-choice',
        answer: 'm/c',
        options: ['m/c', 'c/m', 'm·c', 'm-c'],
        problemLabel: '(7)',
        responseLabel: 's의 관계식',
        hints: ['s·c = m 이므로 s = m/c입니다.', 'm/c를 선택하세요.'],
        sourceText: 's =',
        confidence: 0.99,
        position: { top: 64.0, left: 70.0, width: 12.0, height: 3.5 }
      },
      {
        clientKey: 'q8',
        type: 'multiple-choice',
        answer: '백만/백',
        options: ['백만/백', '백/백만', '백만·백', '백만-백'],
        problemLabel: '(8)',
        responseLabel: '만의 관계식',
        hints: ['백·만 = 백만 이므로 만 = 백만/백입니다.', '백만/백을 선택하세요.'],
        sourceText: '만 =',
        confidence: 0.99,
        position: { top: 84.0, left: 70.0, width: 13.0, height: 3.5 }
      }
    ]
  },

  // Page 14: Slide 106
  {
    pageId: 'page_1787004213960_14',
    summary: '표현 문제 3 - d, s, t 삼각관계 표현 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: 'd/s',
        options: ['d/s', 's/d', 'd·s', 's·t'],
        problemLabel: '(2)',
        responseLabel: 't의 관계식',
        hints: ['t = d/s 입니다.', 'd/s를 선택하세요.'],
        sourceText: 't =',
        confidence: 0.99,
        position: { top: 83.5, left: 32.0, width: 10.0, height: 3.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: 'd/t',
        options: ['d/t', 't/d', 'd·t', 's·t'],
        problemLabel: '(3)',
        responseLabel: 's의 관계식',
        hints: ['s = d/t 입니다.', 'd/t를 선택하세요.'],
        sourceText: 's =',
        confidence: 0.99,
        position: { top: 63.0, left: 69.5, width: 10.0, height: 3.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '거리/시간',
        options: ['거리/시간', '시간/거리', '거리·시간', '거리+시간'],
        problemLabel: '(4)',
        responseLabel: '속력의 우리말 식',
        hints: ['속력 = 거리/시간 입니다.', '거리/시간을 선택하세요.'],
        sourceText: '속력 =',
        confidence: 0.99,
        position: { top: 83.5, left: 72.0, width: 10.0, height: 3.5 }
      }
    ]
  },

  // Page 15: Slide 107
  {
    pageId: 'page_1787004213960_15',
    summary: '연습문제 8 - 공식 활용 답 구하기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '2시간',
        options: ['2시간', '20시간', '0.5시간', '3시간'],
        problemLabel: '(2)',
        responseLabel: '걸린 시간',
        hints: ['t = d/s = 300/150 = 2시간입니다.', '2시간을 선택하세요.'],
        sourceText: '150km/h로 300km를 이동하는 데 걸린 시간은?',
        confidence: 0.99,
        position: { top: 43.5, left: 20.0, width: 22.0, height: 3.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '360m',
        options: ['360m', '36m', '6m', '180m'],
        problemLabel: '(3)',
        responseLabel: '이동한 거리',
        hints: ['2분 = 120초, d = s·t = 3 × 120 = 360m입니다.', '360m를 선택하세요.'],
        sourceText: '3m/sec로 2분 동안 이동한 거리는?',
        confidence: 0.99,
        position: { top: 63.5, left: 20.0, width: 22.0, height: 3.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '240km',
        options: ['240km', '24km', '2400km', '120km'],
        problemLabel: '(4)',
        responseLabel: '이동한 거리',
        hints: ['d = s·t = 80 × 3 = 240km입니다.', '240km를 선택하세요.'],
        sourceText: '80km/h로 3시간 동안 이동한 거리는?',
        confidence: 0.99,
        position: { top: 83.5, left: 20.0, width: 22.0, height: 3.5 }
      },
      {
        clientKey: 'q5',
        type: 'multiple-choice',
        answer: '20초',
        options: ['20초', '2초', '200초', '40초'],
        problemLabel: '(5)',
        responseLabel: '걸린 시간',
        hints: ['t = d/s = 400/20 = 20초입니다.', '20초를 선택하세요.'],
        sourceText: '20m/sec로 400m를 이동하는 데 걸린 시간은?',
        confidence: 0.99,
        position: { top: 23.5, left: 57.5, width: 22.0, height: 3.5 }
      },
      {
        clientKey: 'q6',
        type: 'multiple-choice',
        answer: '460km',
        options: ['460km', '46km', '230km', '920km'],
        problemLabel: '(6)',
        responseLabel: '이동한 거리',
        hints: ['d = s·t = 230 × 2 = 460km입니다.', '460km를 선택하세요.'],
        sourceText: '230km/h로 2시간 동안 이동한 거리는?',
        confidence: 0.99,
        position: { top: 43.5, left: 57.5, width: 22.0, height: 3.5 }
      },
      {
        clientKey: 'q7',
        type: 'multiple-choice',
        answer: '3시간',
        options: ['3시간', '30시간', '0.3시간', '12시간'],
        problemLabel: '(7)',
        responseLabel: '걸린 시간',
        hints: ['t = d/s = 600/200 = 3시간입니다.', '3시간을 선택하세요.'],
        sourceText: '200km/h로 600km를 이동하는 데 걸린 시간은?',
        confidence: 0.99,
        position: { top: 63.5, left: 57.5, width: 22.0, height: 3.5 }
      },
      {
        clientKey: 'q8',
        type: 'multiple-choice',
        answer: '2시간',
        options: ['2시간', '20시간', '0.5시간', '4시간'],
        problemLabel: '(8)',
        responseLabel: '걸린 시간',
        hints: ['t = d/s = 180/90 = 2시간입니다.', '2시간을 선택하세요.'],
        sourceText: '90km/h로 180km를 이동하는 데 걸린 시간은?',
        confidence: 0.99,
        position: { top: 83.5, left: 57.5, width: 22.0, height: 3.5 }
      }
    ]
  },

  // Page 16: Slide 108
  {
    pageId: 'page_1787004213960_16',
    summary: '연습문제 9 - 속력 단위에 맞춘 단위 변환 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '1100m',
        options: ['1100m', '110m', '11m', '1.1m'],
        problemLabel: '(2)',
        responseLabel: '변환값',
        hints: ['초속에서는 m 단위를 쓰므로 1.1km = 1100m입니다.', '1100m를 선택하세요.'],
        sourceText: '초속(m/sec)에서 1.1km는?',
        confidence: 0.99,
        position: { top: 84.5, left: 25.5, width: 13.0, height: 3.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '60초',
        options: ['60초', '6초', '600초', '1초'],
        problemLabel: '(3)',
        responseLabel: '변환값',
        hints: ['초속에서는 sec(초) 단위를 쓰므로 1분 = 60초입니다.', '60초를 선택하세요.'],
        sourceText: '초속(m/sec)에서 1분은?',
        confidence: 0.99,
        position: { top: 63.5, left: 63.0, width: 13.0, height: 3.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '0.25시간',
        options: ['0.25시간', '0.15시간', '1.5시간', '0.5시간'],
        problemLabel: '(4)',
        responseLabel: '변환값',
        hints: ['시속에서는 h(시간) 단위를 쓰므로 15분 = 0.25시간입니다.', '0.25시간을 선택하세요.'],
        sourceText: '시속(km/h)에서 15분은?',
        confidence: 0.99,
        position: { top: 84.5, left: 63.0, width: 13.0, height: 3.5 }
      }
    ]
  },

  // Page 17: Slide 109
  {
    pageId: 'page_1787004213960_17',
    summary: '연습문제 10 - 단위 변환 완성하기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '2000m',
        options: ['2000m', '200m', '20m', '2m'],
        problemLabel: '(2)',
        responseLabel: '변환값',
        hints: ['2km = 2000m입니다.', '2000m를 선택하세요.'],
        sourceText: '초속에서 2km는?',
        confidence: 0.99,
        position: { top: 46.0, left: 25.5, width: 13.0, height: 3.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '5.0033...시간',
        options: ['5.0033...시간', '5.12시간', '5.2시간', '5.012시간'],
        problemLabel: '(3)',
        responseLabel: '변환값',
        hints: ['12초 = 12/3600h = 0.0033...h이므로 5.0033...시간입니다.', '5.0033...시간을 선택하세요.'],
        sourceText: '시속에서 5시간 12초는?',
        confidence: 0.99,
        position: { top: 66.0, left: 25.5, width: 13.0, height: 3.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '2.0003km',
        options: ['2.0003km', '2.3km', '2.03km', '2.003km'],
        problemLabel: '(4)',
        responseLabel: '변환값',
        hints: ['30cm = 0.0003km이므로 2.0003km입니다.', '2.0003km를 선택하세요.'],
        sourceText: '시속에서 2km 30cm는?',
        confidence: 0.99,
        position: { top: 86.0, left: 25.5, width: 13.0, height: 3.5 }
      },
      {
        clientKey: 'q5',
        type: 'multiple-choice',
        answer: '1.4시간',
        options: ['1.4시간', '1.24시간', '1.04시간', '1.44시간'],
        problemLabel: '(5)',
        responseLabel: '변환값',
        hints: ['24분 = 24/60h = 0.4h이므로 1.4시간입니다.', '1.4시간을 선택하세요.'],
        sourceText: '시속에서 1시간 24분은?',
        confidence: 0.99,
        position: { top: 26.5, left: 63.0, width: 13.0, height: 3.5 }
      },
      {
        clientKey: 'q6',
        type: 'multiple-choice',
        answer: '0.721km',
        options: ['0.721km', '7.21km', '72.1km', '0.0721km'],
        problemLabel: '(6)',
        responseLabel: '변환값',
        hints: ['721m = 0.721km입니다.', '0.721km를 선택하세요.'],
        sourceText: '시속에서 721m는?',
        confidence: 0.99,
        position: { top: 46.0, left: 63.0, width: 13.0, height: 3.5 }
      },
      {
        clientKey: 'q7',
        type: 'multiple-choice',
        answer: '3600초',
        options: ['3600초', '60초', '600초', '360초'],
        problemLabel: '(7)',
        responseLabel: '변환값',
        hints: ['1시간 = 3600초입니다.', '3600초를 선택하세요.'],
        sourceText: '초속에서 1시간은?',
        confidence: 0.99,
        position: { top: 66.0, left: 63.0, width: 13.0, height: 3.5 }
      },
      {
        clientKey: 'q8',
        type: 'multiple-choice',
        answer: '0.85m',
        options: ['0.85m', '8.5m', '85m', '0.085m'],
        problemLabel: '(8)',
        responseLabel: '변환값',
        hints: ['85cm = 0.85m입니다.', '0.85m를 선택하세요.'],
        sourceText: '초속에서 85cm는?',
        confidence: 0.99,
        position: { top: 86.0, left: 63.0, width: 13.0, height: 3.5 }
      }
    ]
  },

  // Page 18: Slide 110
  {
    pageId: 'page_1787004213960_18',
    summary: '연습문제 11 - 단위 변환 후 속력 문제 답 구하기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '0.024시간(86.4초)',
        options: ['0.024시간(86.4초)', '0.24시간', '2.4시간', '24시간'],
        problemLabel: '(2)',
        responseLabel: '걸린 시간',
        hints: ['3600m = 3.6km, 3.6 ÷ 150 = 0.024시간(86.4초)입니다.', '0.024시간(86.4초)을 선택하세요.'],
        sourceText: '150km/h로 3600m를 이동하는 데 걸린 시간은?',
        confidence: 0.99,
        position: { top: 43.5, left: 20.0, width: 22.0, height: 3.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '945m',
        options: ['945m', '94.5m', '315m', '1500m'],
        problemLabel: '(3)',
        responseLabel: '이동한 거리',
        hints: ['5분 15초 = 315초, 3 × 315 = 945m입니다.', '945m를 선택하세요.'],
        sourceText: '3m/sec로 5분 15초 동안 이동한 거리는?',
        confidence: 0.99,
        position: { top: 63.5, left: 20.0, width: 22.0, height: 3.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '268km',
        options: ['268km', '26.8km', '240km', '280km'],
        problemLabel: '(4)',
        responseLabel: '이동한 거리',
        hints: ['3시간 21분 = 3.35시간, 80 × 3.35 = 268km입니다.', '268km를 선택하세요.'],
        sourceText: '80km/h로 3시간 21분 동안 이동한 거리는?',
        confidence: 0.99,
        position: { top: 83.5, left: 20.0, width: 22.0, height: 3.5 }
      },
      {
        clientKey: 'q5',
        type: 'multiple-choice',
        answer: '75초(1분 15초)',
        options: ['75초(1분 15초)', '7.5초', '750초', '30초'],
        problemLabel: '(5)',
        responseLabel: '걸린 시간',
        hints: ['1.5km = 1500m, 1500 ÷ 20 = 75초(1분 15초)입니다.', '75초(1분 15초)를 선택하세요.'],
        sourceText: '20m/sec로 1.5km를 이동하는 데 걸린 시간은?',
        confidence: 0.99,
        position: { top: 23.5, left: 57.5, width: 22.0, height: 3.5 }
      },
      {
        clientKey: 'q6',
        type: 'multiple-choice',
        answer: '528km',
        options: ['528km', '52.8km', '480km', '500km'],
        problemLabel: '(6)',
        responseLabel: '이동한 거리',
        hints: ['2시간 12분 = 2.2시간, 240 × 2.2 = 528km입니다.', '528km를 선택하세요.'],
        sourceText: '240km/h로 2시간 12분 동안 이동한 거리는?',
        confidence: 0.99,
        position: { top: 43.5, left: 57.5, width: 22.0, height: 3.5 }
      },
      {
        clientKey: 'q7',
        type: 'multiple-choice',
        answer: '0.03시간(1.8분)',
        options: ['0.03시간(1.8분)', '0.3시간', '3시간', '30시간'],
        problemLabel: '(7)',
        responseLabel: '걸린 시간',
        hints: ['6000m = 6km, 6 ÷ 200 = 0.03시간(1.8분)입니다.', '0.03시간(1.8분)을 선택하세요.'],
        sourceText: '200km/h로 6000m를 이동하는 데 걸린 시간은?',
        confidence: 0.99,
        position: { top: 63.5, left: 57.5, width: 22.0, height: 3.5 }
      },
      {
        clientKey: 'q8',
        type: 'multiple-choice',
        answer: '0.2시간(12분)',
        options: ['0.2시간(12분)', '2시간', '0.02시간', '20시간'],
        problemLabel: '(8)',
        responseLabel: '걸린 시간',
        hints: ['18000m = 18km, 18 ÷ 90 = 0.2시간(12분)입니다.', '0.2시간(12분)을 선택하세요.'],
        sourceText: '90km/h로 18000m를 이동하는 데 걸린 시간은?',
        confidence: 0.99,
        position: { top: 83.5, left: 57.5, width: 22.0, height: 3.5 }
      }
    ]
  },

  // Page 19: Slide 111
  {
    pageId: 'page_1787004213960_19',
    summary: '연습문제 12 - 시속을 초속으로 변환하기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2_m',
        type: 'multiple-choice',
        answer: '$\\frac{108000\\text{m}}{1\\text{h}}$',
        options: ['$\\frac{108000\\text{m}}{1\\text{h}}$', '$\\frac{10800\\text{m}}{1\\text{h}}$', '$\\frac{1080\\text{m}}{1\\text{h}}$', '$\\frac{1080000\\text{m}}{1\\text{h}}$'],
        problemLabel: '(2)-m 변환',
        responseLabel: 'km를 m로 변환',
        hints: ['108km = 108000m이므로 108000m/1h입니다.', '$\\frac{108000\\text{m}}{1\\text{h}}$를 선택하세요.'],
        sourceText: 'km를 m로 변환',
        confidence: 0.99,
        position: { top: 78.0, left: 32.5, width: 11.5, height: 6.0 }
      },
      {
        clientKey: 'q2_sec',
        type: 'multiple-choice',
        answer: '$\\frac{108000\\text{m}}{3600\\text{sec}}$',
        options: ['$\\frac{108000\\text{m}}{3600\\text{sec}}$', '$\\frac{108000\\text{m}}{60\\text{sec}}$', '$\\frac{10800\\text{m}}{3600\\text{sec}}$', '$\\frac{108000\\text{m}}{1000\\text{sec}}$'],
        problemLabel: '(2)-sec 변환',
        responseLabel: 'h를 sec로 변환',
        hints: ['1h = 3600sec이므로 108000m/3600sec입니다.', '$\\frac{108000\\text{m}}{3600\\text{sec}}$를 선택하세요.'],
        sourceText: 'h를 sec로 변환',
        confidence: 0.99,
        position: { top: 78.0, left: 52.0, width: 11.5, height: 6.0 }
      },
      {
        clientKey: 'q2_base1',
        type: 'multiple-choice',
        answer: '$\\frac{30\\text{m}}{1\\text{sec}}$',
        options: ['$\\frac{30\\text{m}}{1\\text{sec}}$', '$\\frac{300\\text{m}}{1\\text{sec}}$', '$\\frac{3\\text{m}}{1\\text{sec}}$', '$\\frac{108\\text{m}}{1\\text{sec}}$'],
        problemLabel: '(2)-기준량 1',
        responseLabel: '기준량 1로 만들기',
        hints: ['108000 ÷ 3600 = 30이므로 30m/1sec입니다.', '$\\frac{30\\text{m}}{1\\text{sec}}$를 선택하세요.'],
        sourceText: '기준량 1로 만들기',
        confidence: 0.99,
        position: { top: 78.0, left: 71.5, width: 11.5, height: 6.0 }
      }
    ]
  },

  // Page 20: Slide 112
  {
    pageId: 'page_1787004213960_20',
    summary: '연습문제 13 - 시속을 초속으로 변환하기 (4지선다형)',
    elements: [
      // (2) 300km/h
      {
        clientKey: 'q2_m',
        type: 'multiple-choice',
        answer: '$\\frac{300000\\text{m}}{1\\text{h}}$',
        options: ['$\\frac{300000\\text{m}}{1\\text{h}}$', '$\\frac{30000\\text{m}}{1\\text{h}}$', '$\\frac{3000\\text{m}}{1\\text{h}}$', '$\\frac{3000000\\text{m}}{1\\text{h}}$'],
        problemLabel: '(2)-m 변환',
        responseLabel: 'km를 m로 변환',
        hints: ['300km = 300000m이므로 300000m/1h입니다.', '$\\frac{300000\\text{m}}{1\\text{h}}$를 선택하세요.'],
        sourceText: 'km를 m로 변환',
        confidence: 0.99,
        position: { top: 39.5, left: 32.5, width: 11.5, height: 6.0 }
      },
      {
        clientKey: 'q2_sec',
        type: 'multiple-choice',
        answer: '$\\frac{300000\\text{m}}{3600\\text{sec}}$',
        options: ['$\\frac{300000\\text{m}}{3600\\text{sec}}$', '$\\frac{300000\\text{m}}{60\\text{sec}}$', '$\\frac{30000\\text{m}}{3600\\text{sec}}$', '$\\frac{300000\\text{m}}{1000\\text{sec}}$'],
        problemLabel: '(2)-sec 변환',
        responseLabel: 'h를 sec로 변환',
        hints: ['1h = 3600sec이므로 300000m/3600sec입니다.', '$\\frac{300000\\text{m}}{3600\\text{sec}}$를 선택하세요.'],
        sourceText: 'h를 sec로 변환',
        confidence: 0.99,
        position: { top: 39.5, left: 52.0, width: 11.5, height: 6.0 }
      },
      {
        clientKey: 'q2_base1',
        type: 'multiple-choice',
        answer: '$\\frac{83.33...\\text{m}}{1\\text{sec}}$',
        options: ['$\\frac{83.33...\\text{m}}{1\\text{sec}}$', '$\\frac{80\\text{m}}{1\\text{sec}}$', '$\\frac{830\\text{m}}{1\\text{sec}}$', '$\\frac{300\\text{m}}{1\\text{sec}}$'],
        problemLabel: '(2)-기준량 1',
        responseLabel: '기준량 1로 만들기',
        hints: ['300000 ÷ 3600 = 83.33...이므로 83.33...m/1sec입니다.', '$\\frac{83.33...\\text{m}}{1\\text{sec}}$를 선택하세요.'],
        sourceText: '기준량 1로 만들기',
        confidence: 0.99,
        position: { top: 39.5, left: 71.5, width: 11.5, height: 6.0 }
      },

      // (3) 180km/h
      {
        clientKey: 'q3_m',
        type: 'multiple-choice',
        answer: '$\\frac{180000\\text{m}}{1\\text{h}}$',
        options: ['$\\frac{180000\\text{m}}{1\\text{h}}$', '$\\frac{18000\\text{m}}{1\\text{h}}$', '$\\frac{1800\\text{m}}{1\\text{h}}$', '$\\frac{1800000\\text{m}}{1\\text{h}}$'],
        problemLabel: '(3)-m 변환',
        responseLabel: 'km를 m로 변환',
        hints: ['180km = 180000m이므로 180000m/1h입니다.', '$\\frac{180000\\text{m}}{1\\text{h}}$를 선택하세요.'],
        sourceText: 'km를 m로 변환',
        confidence: 0.99,
        position: { top: 59.5, left: 32.5, width: 11.5, height: 6.0 }
      },
      {
        clientKey: 'q3_sec',
        type: 'multiple-choice',
        answer: '$\\frac{180000\\text{m}}{3600\\text{sec}}$',
        options: ['$\\frac{180000\\text{m}}{3600\\text{sec}}$', '$\\frac{180000\\text{m}}{60\\text{sec}}$', '$\\frac{18000\\text{m}}{3600\\text{sec}}$', '$\\frac{180000\\text{m}}{1000\\text{sec}}$'],
        problemLabel: '(3)-sec 변환',
        responseLabel: 'h를 sec로 변환',
        hints: ['1h = 3600sec이므로 180000m/3600sec입니다.', '$\\frac{180000\\text{m}}{3600\\text{sec}}$를 선택하세요.'],
        sourceText: 'h를 sec로 변환',
        confidence: 0.99,
        position: { top: 59.5, left: 52.0, width: 11.5, height: 6.0 }
      },
      {
        clientKey: 'q3_base1',
        type: 'multiple-choice',
        answer: '$\\frac{50\\text{m}}{1\\text{sec}}$',
        options: ['$\\frac{50\\text{m}}{1\\text{sec}}$', '$\\frac{500\\text{m}}{1\\text{sec}}$', '$\\frac{5\\text{m}}{1\\text{sec}}$', '$\\frac{180\\text{m}}{1\\text{sec}}$'],
        problemLabel: '(3)-기준량 1',
        responseLabel: '기준량 1로 만들기',
        hints: ['180000 ÷ 3600 = 50이므로 50m/1sec입니다.', '$\\frac{50\\text{m}}{1\\text{sec}}$를 선택하세요.'],
        sourceText: '기준량 1로 만들기',
        confidence: 0.99,
        position: { top: 59.5, left: 71.5, width: 11.5, height: 6.0 }
      },

      // (4) 360km/h
      {
        clientKey: 'q4_m',
        type: 'multiple-choice',
        answer: '$\\frac{360000\\text{m}}{1\\text{h}}$',
        options: ['$\\frac{360000\\text{m}}{1\\text{h}}$', '$\\frac{36000\\text{m}}{1\\text{h}}$', '$\\frac{3600\\text{m}}{1\\text{h}}$', '$\\frac{3600000\\text{m}}{1\\text{h}}$'],
        problemLabel: '(4)-m 변환',
        responseLabel: 'km를 m로 변환',
        hints: ['360km = 360000m이므로 360000m/1h입니다.', '$\\frac{360000\\text{m}}{1\\text{h}}$를 선택하세요.'],
        sourceText: 'km를 m로 변환',
        confidence: 0.99,
        position: { top: 79.5, left: 32.5, width: 11.5, height: 6.0 }
      },
      {
        clientKey: 'q4_sec',
        type: 'multiple-choice',
        answer: '$\\frac{360000\\text{m}}{3600\\text{sec}}$',
        options: ['$\\frac{360000\\text{m}}{3600\\text{sec}}$', '$\\frac{360000\\text{m}}{60\\text{sec}}$', '$\\frac{36000\\text{m}}{3600\\text{sec}}$', '$\\frac{360000\\text{m}}{1000\\text{sec}}$'],
        problemLabel: '(4)-sec 변환',
        responseLabel: 'h를 sec로 변환',
        hints: ['1h = 3600sec이므로 360000m/3600sec입니다.', '$\\frac{360000\\text{m}}{3600\\text{sec}}$를 선택하세요.'],
        sourceText: 'h를 sec로 변환',
        confidence: 0.99,
        position: { top: 79.5, left: 52.0, width: 11.5, height: 6.0 }
      },
      {
        clientKey: 'q4_base1',
        type: 'multiple-choice',
        answer: '$\\frac{100\\text{m}}{1\\text{sec}}$',
        options: ['$\\frac{100\\text{m}}{1\\text{sec}}$', '$\\frac{10\\text{m}}{1\\text{sec}}$', '$\\frac{1000\\text{m}}{1\\text{sec}}$', '$\\frac{360\\text{m}}{1\\text{sec}}$'],
        problemLabel: '(4)-기준량 1',
        responseLabel: '기준량 1로 만들기',
        hints: ['360000 ÷ 3600 = 100이므로 100m/1sec입니다.', '$\\frac{100\\text{m}}{1\\text{sec}}$를 선택하세요.'],
        sourceText: '기준량 1로 만들기',
        confidence: 0.99,
        position: { top: 79.5, left: 71.5, width: 11.5, height: 6.0 }
      }
    ]
  },

  // Page 21: Slide 113
  {
    pageId: 'page_1787004213960_21',
    summary: '연습문제 14 - 시속과 초속 크기 비교하기 (선택형 > < =)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '>',
        options: ['>', '<', '='],
        problemLabel: '(2)',
        responseLabel: '크기 비교',
        hints: ['450km/h = 450000m/3600sec = 125m/sec이므로 125 > 120입니다.', '>를 선택하세요.'],
        sourceText: '450km/h vs 120m/sec',
        confidence: 0.99,
        position: { top: 35.0, left: 46.5, width: 6.0, height: 5.0 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '>',
        options: ['>', '<', '='],
        problemLabel: '(3)',
        responseLabel: '크기 비교',
        hints: ['300km/h = 300000m/3600sec = 83.33...m/sec이므로 83.33 > 80입니다.', '>를 선택하세요.'],
        sourceText: '300km/h vs 80m/sec',
        confidence: 0.99,
        position: { top: 55.0, left: 46.5, width: 6.0, height: 5.0 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '=',
        options: ['>', '<', '='],
        problemLabel: '(4)',
        responseLabel: '크기 비교',
        hints: ['54km/h = 54000m/3600sec = 15m/sec이므로 15 = 15입니다.', '=를 선택하세요.'],
        sourceText: '54km/h vs 15m/sec',
        confidence: 0.99,
        position: { top: 75.0, left: 46.5, width: 6.0, height: 5.0 }
      }
    ]
  }
];

for (const page of pagesData) {
  const draft = {
    schemaVersion: 2,
    unitId: unitId,
    pageId: page.pageId,
    analysis: {
      summary: page.summary,
      warnings: []
    },
    elements: page.elements
  };

  const filePath = `/private/tmp/workbook-draft-${unitId}-${page.pageId}.json`;
  fs.writeFileSync(filePath, JSON.stringify(draft, null, 2), 'utf-8');
  console.log(`Wrote ${filePath} with ${page.elements.length} elements`);
}
console.log('All 21 pages generated successfully!');
