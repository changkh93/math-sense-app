import fs from 'node:fs';

const unitId = 'ratios_ratio_chap3_unit6';

const pagesData = [
  // Page 1: Slide 72
  {
    pageId: 'page_1787004105879_1',
    summary: '뜻풀이 문제 1, 2, 3 - 축척의 개념과 용어 (4지선다형)',
    elements: [
      {
        clientKey: 'q1',
        type: 'multiple-choice',
        answer: '① 실제 길이',
        options: ['① 실제 길이', '② 가상의 길이', '③ 지도상의 길이', '④ 그리는 사람 마음대로'],
        problemLabel: '뜻풀이 문제 1',
        responseLabel: '축척의 기준량',
        hints: ['축척은 실제 길이를 줄여 나타낸 것이므로 기준량은 실제 길이입니다.', '①을 선택하세요.'],
        sourceText: '축척에서 기준량은?',
        confidence: 0.99,
        position: { top: 49.0, left: 32.0, width: 54.0, height: 8.0 }
      },
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '③ 지도상의 길이',
        options: ['① 어휴.. 짜증', '② 안 알려 줬어요.', '③ 지도상의 길이', '④ 뭘까?'],
        problemLabel: '뜻풀이 문제 2',
        responseLabel: '축척의 비교량',
        hints: ['축척은 지도상의 길이를 비교량으로 합니다.', '③을 선택하세요.'],
        sourceText: '축척에서 비교량은?',
        confidence: 0.99,
        position: { top: 64.0, left: 32.0, width: 54.0, height: 8.0 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '④ 100m',
        options: ['① 111m', '② 20cm', '③ 100km', '④ 100m'],
        problemLabel: '뜻풀이 문제 3',
        responseLabel: '실제 길이',
        hints: ['막대 축척의 1cm는 실제 거리 100m를 의미합니다.', '④를 선택하세요.'],
        sourceText: '축척표시 [100m]에서 지도상 1cm의 실제 길이는?',
        confidence: 0.99,
        position: { top: 79.0, left: 32.0, width: 54.0, height: 8.0 }
      }
    ]
  },

  // Page 2: Slide 73
  {
    pageId: 'page_1787004105879_2',
    summary: '연습문제 1 - 축척 표현 과정 단계별 완성 (4지선다형)',
    elements: [
      {
        clientKey: 'q2_diff',
        type: 'multiple-choice',
        answer: '1cm : 310m',
        options: ['1cm : 310m', '1cm : 31m', '1cm : 3100m', '1m : 310cm'],
        problemLabel: '(2)-단위 다름',
        responseLabel: '서로 다른 단위',
        hints: ['지도상 1cm, 실제 310m이므로 1cm : 310m입니다.', '1cm : 310m를 선택하세요.'],
        sourceText: '서로 다른 단위',
        confidence: 0.99,
        position: { top: 40.5, left: 16.0, width: 15.5, height: 4.5 }
      },
      {
        clientKey: 'q2_same',
        type: 'multiple-choice',
        answer: '1cm : 31000cm',
        options: ['1cm : 31000cm', '1cm : 3100cm', '1cm : 310000cm', '1cm : 310cm'],
        problemLabel: '(2)-단위 통일',
        responseLabel: '같은 단위로 맞춤',
        hints: ['310m = 31000cm이므로 1cm : 31000cm입니다.', '1cm : 31000cm를 선택하세요.'],
        sourceText: '같은 단위로 맞춤',
        confidence: 0.99,
        position: { top: 40.5, left: 40.5, width: 20.0, height: 4.5 }
      },
      {
        clientKey: 'q2_ratio',
        type: 'multiple-choice',
        answer: '1 : 31000',
        options: ['1 : 31000', '1 : 3100', '1 : 310000', '1 : 310'],
        problemLabel: '(2)-단위 생략',
        responseLabel: '단위 생략',
        hints: ['단위를 생략하면 1 : 31000입니다.', '1 : 31000을 선택하세요.'],
        sourceText: '단위 생략',
        confidence: 0.99,
        position: { top: 40.5, left: 69.5, width: 14.0, height: 4.5 }
      },
      {
        clientKey: 'q3_diff',
        type: 'multiple-choice',
        answer: '1cm : 2.1km',
        options: ['1cm : 2.1km', '1cm : 21km', '1cm : 0.21km', '1km : 2.1cm'],
        problemLabel: '(3)-단위 다름',
        responseLabel: '서로 다른 단위',
        hints: ['지도상 1cm, 실제 2.1km이므로 1cm : 2.1km입니다.', '1cm : 2.1km를 선택하세요.'],
        sourceText: '서로 다른 단위',
        confidence: 0.99,
        position: { top: 60.5, left: 16.0, width: 15.5, height: 4.5 }
      },
      {
        clientKey: 'q3_same',
        type: 'multiple-choice',
        answer: '1cm : 210000cm',
        options: ['1cm : 210000cm', '1cm : 21000cm', '1cm : 2100000cm', '1cm : 2100cm'],
        problemLabel: '(3)-단위 통일',
        responseLabel: '같은 단위로 맞춤',
        hints: ['2.1km = 210000cm이므로 1cm : 210000cm입니다.', '1cm : 210000cm를 선택하세요.'],
        sourceText: '같은 단위로 맞춤',
        confidence: 0.99,
        position: { top: 60.5, left: 40.5, width: 20.0, height: 4.5 }
      },
      {
        clientKey: 'q3_ratio',
        type: 'multiple-choice',
        answer: '1 : 210000',
        options: ['1 : 210000', '1 : 21000', '1 : 2100000', '1 : 2100'],
        problemLabel: '(3)-단위 생략',
        responseLabel: '단위 생략',
        hints: ['단위를 생략하면 1 : 210000입니다.', '1 : 210000을 선택하세요.'],
        sourceText: '단위 생략',
        confidence: 0.99,
        position: { top: 60.5, left: 69.5, width: 14.0, height: 4.5 }
      },
      {
        clientKey: 'q4_diff',
        type: 'multiple-choice',
        answer: '1cm : 32km',
        options: ['1cm : 32km', '1cm : 3.2km', '1cm : 320km', '1km : 32cm'],
        problemLabel: '(4)-단위 다름',
        responseLabel: '서로 다른 단위',
        hints: ['지도상 1cm, 실제 32km이므로 1cm : 32km입니다.', '1cm : 32km를 선택하세요.'],
        sourceText: '서로 다른 단위',
        confidence: 0.99,
        position: { top: 80.5, left: 16.0, width: 15.5, height: 4.5 }
      },
      {
        clientKey: 'q4_same',
        type: 'multiple-choice',
        answer: '1cm : 3200000cm',
        options: ['1cm : 3200000cm', '1cm : 320000cm', '1cm : 32000cm', '1cm : 32000000cm'],
        problemLabel: '(4)-단위 통일',
        responseLabel: '같은 단위로 맞춤',
        hints: ['32km = 3200000cm이므로 1cm : 3200000cm입니다.', '1cm : 3200000cm를 선택하세요.'],
        sourceText: '같은 단위로 맞춤',
        confidence: 0.99,
        position: { top: 80.5, left: 40.5, width: 20.0, height: 4.5 }
      },
      {
        clientKey: 'q4_ratio',
        type: 'multiple-choice',
        answer: '1 : 3200000',
        options: ['1 : 3200000', '1 : 320000', '1 : 32000', '1 : 32000000'],
        problemLabel: '(4)-단위 생략',
        responseLabel: '단위 생략',
        hints: ['단위를 생략하면 1 : 3200000입니다.', '1 : 3200000을 선택하세요.'],
        sourceText: '단위 생략',
        confidence: 0.99,
        position: { top: 80.5, left: 69.5, width: 14.0, height: 4.5 }
      }
    ]
  },

  // Page 3: Slide 74
  {
    pageId: 'page_1787004105879_3',
    summary: '연습문제 2 - 막대 축척을 축척비로 간단히 표현하기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '1 : 3000',
        options: ['1 : 3000', '1 : 300', '1 : 30000', '1 : 30'],
        problemLabel: '(2)',
        responseLabel: '축척비',
        hints: ['1cm : 30m = 1cm : 3000cm = 1 : 3000입니다.', '1 : 3000을 선택하세요.'],
        sourceText: '30m',
        confidence: 0.99,
        position: { top: 43.5, left: 20.0, width: 22.0, height: 3.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '1 : 2300000',
        options: ['1 : 2300000', '1 : 230000', '1 : 23000', '1 : 23000000'],
        problemLabel: '(3)',
        responseLabel: '축척비',
        hints: ['1cm : 23km = 1cm : 2300000cm = 1 : 2300000입니다.', '1 : 2300000을 선택하세요.'],
        sourceText: '23km',
        confidence: 0.99,
        position: { top: 63.5, left: 20.0, width: 22.0, height: 3.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '1 : 7050',
        options: ['1 : 7050', '1 : 70500', '1 : 705', '1 : 705000'],
        problemLabel: '(4)',
        responseLabel: '축척비',
        hints: ['1cm : 70.5m = 1cm : 7050cm = 1 : 7050입니다.', '1 : 7050을 선택하세요.'],
        sourceText: '70.5m',
        confidence: 0.99,
        position: { top: 83.5, left: 20.0, width: 22.0, height: 3.5 }
      },
      {
        clientKey: 'q5',
        type: 'multiple-choice',
        answer: '1 : 78900',
        options: ['1 : 78900', '1 : 7890', '1 : 789000', '1 : 789'],
        problemLabel: '(5)',
        responseLabel: '축척비',
        hints: ['1cm : 789m = 1cm : 78900cm = 1 : 78900입니다.', '1 : 78900을 선택하세요.'],
        sourceText: '789m',
        confidence: 0.99,
        position: { top: 23.5, left: 57.5, width: 22.0, height: 3.5 }
      },
      {
        clientKey: 'q6',
        type: 'multiple-choice',
        answer: '1 : 12800000',
        options: ['1 : 12800000', '1 : 1280000', '1 : 128000', '1 : 128000000'],
        problemLabel: '(6)',
        responseLabel: '축척비',
        hints: ['1cm : 128km = 1cm : 12800000cm = 1 : 12800000입니다.', '1 : 12800000을 선택하세요.'],
        sourceText: '128km',
        confidence: 0.99,
        position: { top: 43.5, left: 57.5, width: 22.0, height: 3.5 }
      },
      {
        clientKey: 'q7',
        type: 'multiple-choice',
        answer: '1 : 3330000',
        options: ['1 : 3330000', '1 : 333000', '1 : 33300', '1 : 33300000'],
        problemLabel: '(7)',
        responseLabel: '축척비',
        hints: ['1cm : 33.3km = 1cm : 3330000cm = 1 : 3330000입니다.', '1 : 3330000을 선택하세요.'],
        sourceText: '33.3km',
        confidence: 0.99,
        position: { top: 63.5, left: 57.5, width: 22.0, height: 3.5 }
      },
      {
        clientKey: 'q8',
        type: 'multiple-choice',
        answer: '1 : 680',
        options: ['1 : 680', '1 : 6800', '1 : 68', '1 : 68000'],
        problemLabel: '(8)',
        responseLabel: '축척비',
        hints: ['1cm : 6.8m = 1cm : 680cm = 1 : 680입니다.', '1 : 680을 선택하세요.'],
        sourceText: '6.8m',
        confidence: 0.99,
        position: { top: 83.5, left: 57.5, width: 22.0, height: 3.5 }
      }
    ]
  },

  // Page 4: Slide 75
  {
    pageId: 'page_1787004105879_4',
    summary: '표현 문제 1 - 축척을 간단히 표현하기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2_same',
        type: 'multiple-choice',
        answer: '15mm : 75000mm',
        options: ['15mm : 75000mm', '15mm : 7500mm', '15mm : 750mm', '15mm : 750000mm'],
        problemLabel: '(2)-단위 통일',
        responseLabel: '단위 통일',
        hints: ['75m = 75000mm이므로 15mm : 75000mm입니다.', '15mm : 75000mm를 선택하세요.'],
        sourceText: '단위 통일',
        confidence: 0.99,
        position: { top: 80.0, left: 15.0, width: 20.0, height: 4.5 }
      },
      {
        clientKey: 'q2_ratio',
        type: 'multiple-choice',
        answer: '15 : 75000',
        options: ['15 : 75000', '15 : 7500', '15 : 750', '15 : 750000'],
        problemLabel: '(2)-단위 생략',
        responseLabel: '단위 생략',
        hints: ['단위를 생략하면 15 : 75000입니다.', '15 : 75000을 선택하세요.'],
        sourceText: '단위 생략',
        confidence: 0.99,
        position: { top: 80.0, left: 45.0, width: 17.0, height: 4.5 }
      },
      {
        clientKey: 'q2_simple',
        type: 'multiple-choice',
        answer: '1 : 5000',
        options: ['1 : 5000', '1 : 500', '1 : 50000', '1 : 50'],
        problemLabel: '(2)-비교량 1',
        responseLabel: '비교량을 1로 변경',
        hints: ['15로 나누면 1 : 5000입니다.', '1 : 5000을 선택하세요.'],
        sourceText: '비교량을 1로 변경',
        confidence: 0.99,
        position: { top: 80.0, left: 71.0, width: 14.0, height: 4.5 }
      }
    ]
  },

  // Page 5: Slide 76
  {
    pageId: 'page_1787004105879_5',
    summary: '표현 문제 2 - 축척을 간단히 표현하기 (4지선다형)',
    elements: [
      // (1) 2cm : 500m
      {
        clientKey: 'q1_same',
        type: 'multiple-choice',
        answer: '2cm : 50000cm',
        options: ['2cm : 50000cm', '2cm : 5000cm', '2cm : 500000cm', '2cm : 500cm'],
        problemLabel: '(1)-단위 통일',
        responseLabel: '단위 통일',
        hints: ['500m = 50000cm이므로 2cm : 50000cm입니다.', '2cm : 50000cm를 선택하세요.'],
        sourceText: '2cm : 500m',
        confidence: 0.99,
        position: { top: 20.0, left: 15.0, width: 20.0, height: 4.5 }
      },
      {
        clientKey: 'q1_ratio',
        type: 'multiple-choice',
        answer: '2 : 50000',
        options: ['2 : 50000', '2 : 5000', '2 : 500000', '2 : 500'],
        problemLabel: '(1)-단위 생략',
        responseLabel: '단위 생략',
        hints: ['단위를 생략하면 2 : 50000입니다.', '2 : 50000을 선택하세요.'],
        sourceText: '단위 생략',
        confidence: 0.99,
        position: { top: 20.0, left: 45.0, width: 17.0, height: 4.5 }
      },
      {
        clientKey: 'q1_simple',
        type: 'multiple-choice',
        answer: '1 : 25000',
        options: ['1 : 25000', '1 : 2500', '1 : 250000', '1 : 50000'],
        problemLabel: '(1)-비교량 1',
        responseLabel: '비교량을 1로 변경',
        hints: ['2로 나누면 1 : 25000입니다.', '1 : 25000을 선택하세요.'],
        sourceText: '비교량을 1로 변경',
        confidence: 0.99,
        position: { top: 20.0, left: 71.0, width: 14.0, height: 4.5 }
      },

      // (2) 1.5cm : 3km
      {
        clientKey: 'q2_same',
        type: 'multiple-choice',
        answer: '1.5cm : 300000cm',
        options: ['1.5cm : 300000cm', '1.5cm : 30000cm', '1.5cm : 3000000cm', '1.5cm : 3000cm'],
        problemLabel: '(2)-단위 통일',
        responseLabel: '단위 통일',
        hints: ['3km = 300000cm이므로 1.5cm : 300000cm입니다.', '1.5cm : 300000cm를 선택하세요.'],
        sourceText: '1.5cm : 3km',
        confidence: 0.99,
        position: { top: 40.0, left: 15.0, width: 20.0, height: 4.5 }
      },
      {
        clientKey: 'q2_ratio',
        type: 'multiple-choice',
        answer: '1.5 : 300000',
        options: ['1.5 : 300000', '1.5 : 30000', '1.5 : 3000000', '15 : 300000'],
        problemLabel: '(2)-단위 생략',
        responseLabel: '단위 생략',
        hints: ['단위를 생략하면 1.5 : 300000입니다.', '1.5 : 300000을 선택하세요.'],
        sourceText: '단위 생략',
        confidence: 0.99,
        position: { top: 40.0, left: 45.0, width: 17.0, height: 4.5 }
      },
      {
        clientKey: 'q2_simple',
        type: 'multiple-choice',
        answer: '1 : 200000',
        options: ['1 : 200000', '1 : 20000', '1 : 2000000', '1 : 300000'],
        problemLabel: '(2)-비교량 1',
        responseLabel: '비교량을 1로 변경',
        hints: ['1.5로 나누면 1 : 200000입니다.', '1 : 200000을 선택하세요.'],
        sourceText: '비교량을 1로 변경',
        confidence: 0.99,
        position: { top: 40.0, left: 71.0, width: 14.0, height: 4.5 }
      },

      // (3) 50mm : 1km
      {
        clientKey: 'q3_same',
        type: 'multiple-choice',
        answer: '50mm : 1000000mm',
        options: ['50mm : 1000000mm', '50mm : 100000mm', '50mm : 10000mm', '50mm : 10000000mm'],
        problemLabel: '(3)-단위 통일',
        responseLabel: '단위 통일',
        hints: ['1km = 1000000mm이므로 50mm : 1000000mm입니다.', '50mm : 1000000mm를 선택하세요.'],
        sourceText: '50mm : 1km',
        confidence: 0.99,
        position: { top: 60.0, left: 15.0, width: 20.0, height: 4.5 }
      },
      {
        clientKey: 'q3_ratio',
        type: 'multiple-choice',
        answer: '50 : 1000000',
        options: ['50 : 1000000', '50 : 100000', '50 : 10000', '5 : 1000000'],
        problemLabel: '(3)-단위 생략',
        responseLabel: '단위 생략',
        hints: ['단위를 생략하면 50 : 1000000입니다.', '50 : 1000000을 선택하세요.'],
        sourceText: '단위 생략',
        confidence: 0.99,
        position: { top: 60.0, left: 45.0, width: 17.0, height: 4.5 }
      },
      {
        clientKey: 'q3_simple',
        type: 'multiple-choice',
        answer: '1 : 20000',
        options: ['1 : 20000', '1 : 2000', '1 : 200000', '1 : 50000'],
        problemLabel: '(3)-비교량 1',
        responseLabel: '비교량을 1로 변경',
        hints: ['50으로 나누면 1 : 20000입니다.', '1 : 20000을 선택하세요.'],
        sourceText: '비교량을 1로 변경',
        confidence: 0.99,
        position: { top: 60.0, left: 71.0, width: 14.0, height: 4.5 }
      },

      // (4) 10cm : 25km
      {
        clientKey: 'q4_same',
        type: 'multiple-choice',
        answer: '10cm : 2500000cm',
        options: ['10cm : 2500000cm', '10cm : 250000cm', '10cm : 25000cm', '10cm : 25000000cm'],
        problemLabel: '(4)-단위 통일',
        responseLabel: '단위 통일',
        hints: ['25km = 2500000cm이므로 10cm : 2500000cm입니다.', '10cm : 2500000cm를 선택하세요.'],
        sourceText: '10cm : 25km',
        confidence: 0.99,
        position: { top: 80.0, left: 15.0, width: 20.0, height: 4.5 }
      },
      {
        clientKey: 'q4_ratio',
        type: 'multiple-choice',
        answer: '10 : 2500000',
        options: ['10 : 2500000', '10 : 250000', '10 : 25000', '1 : 2500000'],
        problemLabel: '(4)-단위 생략',
        responseLabel: '단위 생략',
        hints: ['단위를 생략하면 10 : 2500000입니다.', '10 : 2500000을 선택하세요.'],
        sourceText: '단위 생략',
        confidence: 0.99,
        position: { top: 80.0, left: 45.0, width: 17.0, height: 4.5 }
      },
      {
        clientKey: 'q4_simple',
        type: 'multiple-choice',
        answer: '1 : 250000',
        options: ['1 : 250000', '1 : 25000', '1 : 2500000', '1 : 2500'],
        problemLabel: '(4)-비교량 1',
        responseLabel: '비교량을 1로 변경',
        hints: ['10으로 나누면 1 : 250000입니다.', '1 : 250000을 선택하세요.'],
        sourceText: '비교량을 1로 변경',
        confidence: 0.99,
        position: { top: 80.0, left: 71.0, width: 14.0, height: 4.5 }
      }
    ]
  },

  // Page 6: Slide 77
  {
    pageId: 'page_1787004105879_6',
    summary: '표현 문제 3 - 축척을 간단히 표현하기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '1 : 12500',
        options: ['1 : 12500', '1 : 1250', '1 : 125000', '1 : 80000'],
        problemLabel: '(2)',
        responseLabel: '축척비',
        hints: ['8cm : 100000cm = 1 : 12500입니다.', '1 : 12500을 선택하세요.'],
        sourceText: '8cm : 1km',
        confidence: 0.99,
        position: { top: 43.5, left: 20.0, width: 22.0, height: 3.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '1 : 5000000',
        options: ['1 : 5000000', '1 : 500000', '1 : 50000', '1 : 2000000'],
        problemLabel: '(3)',
        responseLabel: '축척비',
        hints: ['2cm : 10000000cm = 1 : 5000000입니다.', '1 : 5000000을 선택하세요.'],
        sourceText: '2cm : 100km',
        confidence: 0.99,
        position: { top: 63.5, left: 20.0, width: 22.0, height: 3.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '1 : 130000',
        options: ['1 : 130000', '1 : 13000', '1 : 1300000', '1 : 390000'],
        problemLabel: '(4)',
        responseLabel: '축척비',
        hints: ['3cm : 390000cm = 1 : 130000입니다.', '1 : 130000을 선택하세요.'],
        sourceText: '3cm : 3.9km',
        confidence: 0.99,
        position: { top: 83.5, left: 20.0, width: 22.0, height: 3.5 }
      },
      {
        clientKey: 'q5',
        type: 'multiple-choice',
        answer: '1 : 400000',
        options: ['1 : 400000', '1 : 40000', '1 : 4000000', '1 : 2800000'],
        problemLabel: '(5)',
        responseLabel: '축척비',
        hints: ['7cm : 2800000cm = 1 : 400000입니다.', '1 : 400000을 선택하세요.'],
        sourceText: '7cm : 28km',
        confidence: 0.99,
        position: { top: 23.5, left: 57.5, width: 22.0, height: 3.5 }
      },
      {
        clientKey: 'q6',
        type: 'multiple-choice',
        answer: '1 : 900000',
        options: ['1 : 900000', '1 : 90000', '1 : 9000000', '1 : 810000'],
        problemLabel: '(6)',
        responseLabel: '축척비',
        hints: ['9mm : 8100000mm = 1 : 900000입니다.', '1 : 900000을 선택하세요.'],
        sourceText: '9mm : 8.1km',
        confidence: 0.99,
        position: { top: 43.5, left: 57.5, width: 22.0, height: 3.5 }
      },
      {
        clientKey: 'q7',
        type: 'multiple-choice',
        answer: '1 : 10000',
        options: ['1 : 10000', '1 : 1000', '1 : 100000', '1 : 50000'],
        problemLabel: '(7)',
        responseLabel: '축척비',
        hints: ['5cm : 50000cm = 1 : 10000입니다.', '1 : 10000을 선택하세요.'],
        sourceText: '5cm : 500m',
        confidence: 0.99,
        position: { top: 63.5, left: 57.5, width: 22.0, height: 3.5 }
      },
      {
        clientKey: 'q8',
        type: 'multiple-choice',
        answer: '1 : 200000',
        options: ['1 : 200000', '1 : 20000', '1 : 2000000', '1 : 1200000'],
        problemLabel: '(8)',
        responseLabel: '축척비',
        hints: ['6cm : 1200000cm = 1 : 200000입니다.', '1 : 200000을 선택하세요.'],
        sourceText: '6cm : 12km',
        confidence: 0.99,
        position: { top: 83.5, left: 57.5, width: 22.0, height: 3.5 }
      }
    ]
  },

  // Page 7: Slide 78
  {
    pageId: 'page_1787004105879_7',
    summary: '연습문제 3 - 지도에서 실제 길이 구하기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '120m',
        options: ['120m', '100m', '150m', '90m'],
        problemLabel: '(2)',
        responseLabel: '실제 길이 x',
        hints: ['3cm : 90m = 4cm : x 이므로 x = 90 × (4/3) = 120m입니다.', '120m를 선택하세요.'],
        sourceText: '따라서 x =',
        confidence: 0.99,
        position: { top: 83.0, left: 66.0, width: 17.0, height: 4.5 }
      }
    ]
  },

  // Page 8: Slide 79
  {
    pageId: 'page_1787004105879_8',
    summary: '연습문제 4 - 비례식을 이용해 실제 길이 구하기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '180m',
        options: ['180m', '18m', '360m', '1800m'],
        problemLabel: '(2)',
        responseLabel: '실제 길이 x',
        hints: ['x = 36m × (6/1.2) = 180m입니다.', '180m를 선택하세요.'],
        sourceText: '1.2cm : 36m 지도상에서 6cm의 실제 길이는?',
        confidence: 0.99,
        position: { top: 45.0, left: 26.0, width: 20.0, height: 3.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '6km',
        options: ['6km', '60km', '3km', '600m'],
        problemLabel: '(3)',
        responseLabel: '실제 길이 x',
        hints: ['x = 3km × (3/1.5) = 6km입니다.', '6km를 선택하세요.'],
        sourceText: '1.5cm : 3km 지도상에서 3cm의 실제 길이는?',
        confidence: 0.99,
        position: { top: 63.5, left: 20.0, width: 22.0, height: 3.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '20km',
        options: ['20km', '2km', '200km', '5km'],
        problemLabel: '(4)',
        responseLabel: '실제 길이 x',
        hints: ['x = 1km × (10/0.5) = 20km입니다.', '20km를 선택하세요.'],
        sourceText: '0.5cm : 1km 지도상에서 10cm의 실제 길이는?',
        confidence: 0.99,
        position: { top: 83.5, left: 20.0, width: 22.0, height: 3.5 }
      },
      {
        clientKey: 'q5',
        type: 'multiple-choice',
        answer: '13.5km',
        options: ['13.5km', '135km', '1.35km', '27km'],
        problemLabel: '(5)',
        responseLabel: '실제 길이 x',
        hints: ['x = 3km × (9/2) = 13.5km입니다.', '13.5km를 선택하세요.'],
        sourceText: '2cm : 3km 지도상에서 9cm의 실제 길이는?',
        confidence: 0.99,
        position: { top: 25.0, left: 63.5, width: 20.0, height: 3.5 }
      },
      {
        clientKey: 'q6',
        type: 'multiple-choice',
        answer: '1.125km',
        options: ['1.125km', '11.25km', '0.125km', '1.25km'],
        problemLabel: '(6)',
        responseLabel: '실제 길이 x',
        hints: ['x = 1km × (9/8) = 1.125km입니다.', '1.125km를 선택하세요.'],
        sourceText: '8cm : 1km 지도상에서 9cm의 실제 길이는?',
        confidence: 0.99,
        position: { top: 45.0, left: 63.5, width: 20.0, height: 3.5 }
      },
      {
        clientKey: 'q7',
        type: 'multiple-choice',
        answer: '20km',
        options: ['20km', '2km', '120km', '10km'],
        problemLabel: '(7)',
        responseLabel: '실제 길이 x',
        hints: ['x = 12km × (10/6) = 20km입니다.', '20km를 선택하세요.'],
        sourceText: '6cm : 12km 지도상에서 10cm의 실제 길이는?',
        confidence: 0.99,
        position: { top: 63.5, left: 57.5, width: 22.0, height: 3.5 }
      },
      {
        clientKey: 'q8',
        type: 'multiple-choice',
        answer: '5.2km',
        options: ['5.2km', '52km', '0.52km', '15.6km'],
        problemLabel: '(8)',
        responseLabel: '실제 길이 x',
        hints: ['x = 3.9km × (4/3) = 5.2km입니다.', '5.2km를 선택하세요.'],
        sourceText: '3cm : 3.9km 지도상에서 4cm의 실제 길이는?',
        confidence: 0.99,
        position: { top: 83.5, left: 57.5, width: 22.0, height: 3.5 }
      }
    ]
  },

  // Page 9: Slide 80
  {
    pageId: 'page_1787004105879_9',
    summary: '연습문제 5 - 축척비에서 실제 길이를 km로 구하기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '5km',
        options: ['5km', '50km', '0.5km', '500m'],
        problemLabel: '(2)',
        responseLabel: '실제 길이 (km)',
        hints: ['5cm × 100000 = 500000cm = 5km입니다.', '5km를 선택하세요.'],
        sourceText: '1 : 100000 지도상에서 5cm의 실제 길이는?',
        confidence: 0.99,
        position: { top: 43.5, left: 20.0, width: 22.0, height: 3.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '0.6km',
        options: ['0.6km', '6km', '60km', '0.06km'],
        problemLabel: '(3)',
        responseLabel: '실제 길이 (km)',
        hints: ['4.8cm × (25000/2) = 60000cm = 0.6km입니다.', '0.6km를 선택하세요.'],
        sourceText: '2 : 25000 지도상에서 4.8cm의 실제 길이는?',
        confidence: 0.99,
        position: { top: 63.5, left: 20.0, width: 22.0, height: 3.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '0.72km',
        options: ['0.72km', '7.2km', '72km', '0.072km'],
        problemLabel: '(4)',
        responseLabel: '실제 길이 (km)',
        hints: ['7.2cm × (50000/5) = 72000cm = 0.72km입니다.', '0.72km를 선택하세요.'],
        sourceText: '5 : 50000 지도상에서 7.2cm의 실제 길이는?',
        confidence: 0.99,
        position: { top: 83.5, left: 20.0, width: 22.0, height: 3.5 }
      },
      {
        clientKey: 'q5',
        type: 'multiple-choice',
        answer: '0.3km',
        options: ['0.3km', '3km', '30km', '0.03km'],
        problemLabel: '(5)',
        responseLabel: '실제 길이 (km)',
        hints: ['6cm × (10000/2) = 30000cm = 0.3km입니다.', '0.3km를 선택하세요.'],
        sourceText: '2 : 10000 지도상에서 6cm의 실제 길이는?',
        confidence: 0.99,
        position: { top: 23.5, left: 57.5, width: 22.0, height: 3.5 }
      },
      {
        clientKey: 'q6',
        type: 'multiple-choice',
        answer: '0.2km',
        options: ['0.2km', '2km', '20km', '0.02km'],
        problemLabel: '(6)',
        responseLabel: '실제 길이 (km)',
        hints: ['10cm × (6000/3) = 20000cm = 0.2km입니다.', '0.2km를 선택하세요.'],
        sourceText: '3 : 6000 지도상에서 10cm의 실제 길이는?',
        confidence: 0.99,
        position: { top: 43.5, left: 57.5, width: 22.0, height: 3.5 }
      },
      {
        clientKey: 'q7',
        type: 'multiple-choice',
        answer: '12.5km',
        options: ['12.5km', '1.25km', '125km', '50km'],
        problemLabel: '(7)',
        responseLabel: '실제 길이 (km)',
        hints: ['10cm × (500000/4) = 1250000cm = 12.5km입니다.', '12.5km를 선택하세요.'],
        sourceText: '4 : 500000 지도상에서 10cm의 실제 길이는?',
        confidence: 0.99,
        position: { top: 63.5, left: 57.5, width: 22.0, height: 3.5 }
      },
      {
        clientKey: 'q8',
        type: 'multiple-choice',
        answer: '2km',
        options: ['2km', '20km', '0.2km', '4km'],
        problemLabel: '(8)',
        responseLabel: '실제 길이 (km)',
        hints: ['4cm × (100000/2) = 200000cm = 2km입니다.', '2km를 선택하세요.'],
        sourceText: '2 : 100000 지도상에서 4cm의 실제 길이는?',
        confidence: 0.99,
        position: { top: 83.5, left: 57.5, width: 22.0, height: 3.5 }
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
console.log('All 9 pages generated successfully!');
