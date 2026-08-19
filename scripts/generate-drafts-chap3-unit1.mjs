import fs from 'node:fs';

const unitId = 'ratios_ratio_chap3_unit1';

const pagesData = [
  // Page 1: Slide 8
  {
    pageId: 'page_1787003963415_1',
    summary: '표현문제 1 - 사과, 물고기, 바나나 개수의 비와 연비 (4지선다형)',
    elements: [
      {
        clientKey: 'q2_1',
        type: 'multiple-choice',
        answer: '1 : 2',
        options: ['1 : 2', '2 : 1', '1 : 1', '2 : 2'],
        problemLabel: '(2)-①',
        responseLabel: '사과와 물고기의 비',
        hints: ['사과 1개, 물고기 2마리입니다.', '1 : 2를 선택하세요.'],
        sourceText: '사과와 물고기의 비는',
        confidence: 0.99,
        position: { top: 74.0, left: 60.5, width: 8.0, height: 3.5 }
      },
      {
        clientKey: 'q2_2',
        type: 'multiple-choice',
        answer: '2 : 1',
        options: ['2 : 1', '1 : 2', '2 : 2', '1 : 1'],
        problemLabel: '(2)-②',
        responseLabel: '물고기와 바나나의 비',
        hints: ['물고기 2마리, 바나나 1개입니다.', '2 : 1을 선택하세요.'],
        sourceText: '물고기와 바나나의 비는',
        confidence: 0.99,
        position: { top: 79.5, left: 63.5, width: 8.0, height: 3.5 }
      },
      {
        clientKey: 'q2_3',
        type: 'multiple-choice',
        answer: '1 : 2 : 1',
        options: ['1 : 2 : 1', '2 : 1 : 1', '1 : 1 : 2', '2 : 2 : 1'],
        problemLabel: '(2)-③',
        responseLabel: '사과와 물고기와 바나나의 비',
        hints: ['순서대로 1, 2, 1입니다.', '1 : 2 : 1을 선택하세요.'],
        sourceText: '사과와 물고기와 바나나의 비는',
        confidence: 0.99,
        position: { top: 85.0, left: 70.0, width: 12.0, height: 3.5 }
      }
    ]
  },

  // Page 2: Slide 9
  {
    pageId: 'page_1787003963415_2',
    summary: '표현문제 2 - 그림을 보고 비와 연비 나타내기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2_1',
        type: 'multiple-choice',
        answer: '4 : 3',
        options: ['4 : 3', '3 : 4', '4 : 2', '3 : 2'],
        problemLabel: '(2)-①',
        responseLabel: '잠자리와 펭귄의 비',
        hints: ['잠자리 4마리, 펭귄 3마리입니다.', '4 : 3을 선택하세요.'],
        sourceText: '잠자리와 펭귄의 비는',
        confidence: 0.99,
        position: { top: 35.5, left: 61.5, width: 8.0, height: 3.5 }
      },
      {
        clientKey: 'q2_2',
        type: 'multiple-choice',
        answer: '2 : 4',
        options: ['2 : 4', '4 : 2', '2 : 3', '3 : 4'],
        problemLabel: '(2)-②',
        responseLabel: '사과와 잠자리의 비',
        hints: ['사과 2개, 잠자리 4마리입니다.', '2 : 4를 선택하세요.'],
        sourceText: '사과와 잠자리의 비는',
        confidence: 0.99,
        position: { top: 40.0, left: 61.5, width: 8.0, height: 3.5 }
      },
      {
        clientKey: 'q2_3',
        type: 'multiple-choice',
        answer: '3 : 2 : 4',
        options: ['3 : 2 : 4', '4 : 2 : 3', '2 : 3 : 4', '3 : 4 : 2'],
        problemLabel: '(2)-③',
        responseLabel: '펭귄과 사과와 잠자리의 비',
        hints: ['펭귄 3, 사과 2, 잠자리 4 순서입니다.', '3 : 2 : 4를 선택하세요.'],
        sourceText: '펭귄과 사과와 잠자리의 비는',
        confidence: 0.99,
        position: { top: 44.5, left: 68.0, width: 12.0, height: 3.5 }
      },
      {
        clientKey: 'q3_1',
        type: 'multiple-choice',
        answer: '1 : 2',
        options: ['1 : 2', '2 : 1', '1 : 1', '2 : 2'],
        problemLabel: '(3)-①',
        responseLabel: '물고기와 책의 비',
        hints: ['물고기 1마리, 책 2권입니다.', '1 : 2를 선택하세요.'],
        sourceText: '물고기와 책의 비는',
        confidence: 0.99,
        position: { top: 55.5, left: 59.0, width: 8.0, height: 3.5 }
      },
      {
        clientKey: 'q3_2',
        type: 'multiple-choice',
        answer: '1 : 1',
        options: ['1 : 1', '1 : 2', '2 : 1', '2 : 2'],
        problemLabel: '(3)-②',
        responseLabel: '연필과 물고기의 비',
        hints: ['연필 1자루, 물고기 1마리입니다.', '1 : 1을 선택하세요.'],
        sourceText: '연필과 물고기의 비는',
        confidence: 0.99,
        position: { top: 60.0, left: 61.5, width: 8.0, height: 3.5 }
      },
      {
        clientKey: 'q3_3',
        type: 'multiple-choice',
        answer: '1 : 2 : 1',
        options: ['1 : 2 : 1', '2 : 1 : 1', '1 : 1 : 2', '2 : 2 : 1'],
        problemLabel: '(3)-③',
        responseLabel: '물고기와 책과 연필의 비',
        hints: ['물고기 1, 책 2, 연필 1 순서입니다.', '1 : 2 : 1을 선택하세요.'],
        sourceText: '물고기와 책과 연필의 비는',
        confidence: 0.99,
        position: { top: 64.5, left: 66.0, width: 12.0, height: 3.5 }
      },
      {
        clientKey: 'q4_1',
        type: 'multiple-choice',
        answer: '2 : 2',
        options: ['2 : 2', '2 : 4', '4 : 2', '1 : 2'],
        problemLabel: '(4)-①',
        responseLabel: '연필과 물고기의 비',
        hints: ['연필 2자루, 물고기 2마리입니다.', '2 : 2를 선택하세요.'],
        sourceText: '연필과 물고기의 비는',
        confidence: 0.99,
        position: { top: 75.5, left: 61.5, width: 8.0, height: 3.5 }
      },
      {
        clientKey: 'q4_2',
        type: 'multiple-choice',
        answer: '2 : 4',
        options: ['2 : 4', '4 : 2', '2 : 2', '4 : 4'],
        problemLabel: '(4)-②',
        responseLabel: '연필과 잠자리의 비',
        hints: ['연필 2자루, 잠자리 4마리입니다.', '2 : 4를 선택하세요.'],
        sourceText: '연필과 잠자리의 비는',
        confidence: 0.99,
        position: { top: 80.0, left: 61.5, width: 8.0, height: 3.5 }
      },
      {
        clientKey: 'q4_3',
        type: 'multiple-choice',
        answer: '2 : 4 : 2',
        options: ['2 : 4 : 2', '4 : 2 : 2', '2 : 2 : 4', '4 : 4 : 2'],
        problemLabel: '(4)-③',
        responseLabel: '물고기와 잠자리와 연필의 비',
        hints: ['물고기 2, 잠자리 4, 연필 2 순서입니다.', '2 : 4 : 2를 선택하세요.'],
        sourceText: '물고기와 잠자리와 연필의 비는',
        confidence: 0.99,
        position: { top: 84.5, left: 70.0, width: 12.0, height: 3.5 }
      }
    ]
  },

  // Page 3: Slide 10
  {
    pageId: 'page_1787003963415_3',
    summary: '표현문제 3 - 연비를 두 대상의 비로 분해하기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2_1',
        type: 'multiple-choice',
        answer: '1 : 2',
        options: ['1 : 2', '2 : 1', '1 : 3', '2 : 3'],
        problemLabel: '(2)-①',
        responseLabel: '사과와 배추의 비',
        hints: ['사과:배추:오이 = 1:2:3에서 사과:배추 = 1:2입니다.', '1 : 2를 선택하세요.'],
        sourceText: '사과와 배추의 비는?',
        confidence: 0.99,
        position: { top: 40.5, left: 51.5, width: 12.0, height: 3.5 }
      },
      {
        clientKey: 'q2_2',
        type: 'multiple-choice',
        answer: '2 : 3',
        options: ['2 : 3', '3 : 2', '1 : 3', '1 : 2'],
        problemLabel: '(2)-②',
        responseLabel: '배추와 오이의 비',
        hints: ['사과:배추:오이 = 1:2:3에서 배추:오이 = 2:3입니다.', '2 : 3을 선택하세요.'],
        sourceText: '배추와 오이의 비는?',
        confidence: 0.99,
        position: { top: 45.5, left: 51.5, width: 12.0, height: 3.5 }
      },
      {
        clientKey: 'q3_1',
        type: 'multiple-choice',
        answer: '1 : 2',
        options: ['1 : 2', '2 : 1', '3 : 1', '2 : 3'],
        problemLabel: '(3)-①',
        responseLabel: '사자와 호랑이의 비',
        hints: ['호랑이:곰:사자 = 2:3:1에서 사자:호랑이 = 1:2입니다.', '1 : 2를 선택하세요.'],
        sourceText: '사자와 호랑이의 비는?',
        confidence: 0.99,
        position: { top: 60.5, left: 51.5, width: 12.0, height: 3.5 }
      },
      {
        clientKey: 'q3_2',
        type: 'multiple-choice',
        answer: '3 : 2',
        options: ['3 : 2', '2 : 3', '3 : 1', '1 : 3'],
        problemLabel: '(3)-②',
        responseLabel: '곰과 호랑이의 비',
        hints: ['호랑이:곰:사자 = 2:3:1에서 곰:호랑이 = 3:2입니다.', '3 : 2를 선택하세요.'],
        sourceText: '곰과 호랑이의 비는?',
        confidence: 0.99,
        position: { top: 65.5, left: 51.5, width: 12.0, height: 3.5 }
      },
      {
        clientKey: 'q4_1',
        type: 'multiple-choice',
        answer: '4 : 1',
        options: ['4 : 1', '1 : 4', '4 : 3', '3 : 1'],
        problemLabel: '(4)-①',
        responseLabel: '설탕과 후추의 비',
        hints: ['설탕:소금:후추 = 4:3:1에서 설탕:후추 = 4:1입니다.', '4 : 1을 선택하세요.'],
        sourceText: '설탕과 후추의 비는?',
        confidence: 0.99,
        position: { top: 80.5, left: 51.5, width: 12.0, height: 3.5 }
      },
      {
        clientKey: 'q4_2',
        type: 'multiple-choice',
        answer: '1 : 3',
        options: ['1 : 3', '3 : 1', '4 : 1', '4 : 3'],
        problemLabel: '(4)-②',
        responseLabel: '후추와 소금의 비',
        hints: ['설탕:소금:후추 = 4:3:1에서 후추:소금 = 1:3입니다.', '1 : 3을 선택하세요.'],
        sourceText: '후추와 소금의 비는?',
        confidence: 0.99,
        position: { top: 85.5, left: 51.5, width: 12.0, height: 3.5 }
      }
    ]
  },

  // Page 4: Slide 11
  {
    pageId: 'page_1787003963415_4',
    summary: '표현문제 4 - 두 비를 하나의 연비로 결합하기 (4지선다형)',
    elements: [
      {
        clientKey: 'q1',
        type: 'multiple-choice',
        answer: '2 : 3 : 10',
        options: ['2 : 3 : 10', '2 : 10 : 3', '3 : 2 : 10', '10 : 3 : 2'],
        problemLabel: '(1)',
        responseLabel: '설탕과 후추와 소금의 비',
        hints: ['설탕:후추=2:3, 후추:소금=3:10이므로 공통값 후추는 3입니다.', '2 : 3 : 10을 선택하세요.'],
        sourceText: '설탕과 후추와 소금의 비는?',
        confidence: 0.99,
        position: { top: 85.0, left: 58.0, width: 16.5, height: 3.5 }
      }
    ]
  },

  // Page 5: Slide 12
  {
    pageId: 'page_1787003963415_5',
    summary: '표현문제 5 - 공통값이 같은 두 비를 연비로 결합하기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '10 : 9 : 10',
        options: ['10 : 9 : 10', '9 : 10 : 9', '10 : 10 : 9', '9 : 9 : 10'],
        problemLabel: '(2)',
        responseLabel: 'c와 d와 e의 비',
        hints: ['c:d=10:9, d:e=9:10에서 공통값 d는 9입니다.', '10 : 9 : 10을 선택하세요.'],
        sourceText: 'c와 d와 e의 비는?',
        confidence: 0.99,
        position: { top: 45.0, left: 49.0, width: 16.5, height: 3.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '7 : 3 : 5',
        options: ['7 : 3 : 5', '7 : 5 : 3', '3 : 7 : 5', '5 : 3 : 7'],
        problemLabel: '(3)',
        responseLabel: 'a : b : c',
        hints: ['a:b=7:3, b:c=3:5에서 공통값 b는 3입니다.', '7 : 3 : 5를 선택하세요.'],
        sourceText: 'a : b : c =',
        confidence: 0.99,
        position: { top: 65.5, left: 41.0, width: 16.5, height: 3.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '2 : 9 : 1',
        options: ['2 : 9 : 1', '1 : 9 : 2', '2 : 1 : 9', '9 : 2 : 1'],
        problemLabel: '(4)',
        responseLabel: 'a : b : c',
        hints: ['c:a=1:2이므로 a=2, c=1이고 b:a=9:2이므로 b=9입니다.', '2 : 9 : 1을 선택하세요.'],
        sourceText: 'a : b : c =',
        confidence: 0.99,
        position: { top: 85.5, left: 41.0, width: 16.5, height: 3.5 }
      }
    ]
  },

  // Page 6: Slide 13
  {
    pageId: 'page_1787003963415_6',
    summary: '표현문제 6 - 바 모델을 보고 연비 결합하기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '2 : 1 : 3',
        options: ['2 : 1 : 3', '2 : 3 : 1', '1 : 2 : 3', '3 : 1 : 2'],
        problemLabel: '(2)',
        responseLabel: 'c : d : f',
        hints: ['c:d=2:1, d:f=1:3에서 공통값 d는 1입니다.', '2 : 1 : 3을 선택하세요.'],
        sourceText: 'c : d : f =',
        confidence: 0.99,
        position: { top: 45.5, left: 25.5, width: 9.5, height: 3.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '2 : 3 : 4',
        options: ['2 : 3 : 4', '2 : 4 : 3', '3 : 2 : 4', '4 : 3 : 2'],
        problemLabel: '(3)',
        responseLabel: 'x : y : z',
        hints: ['x:y=2:3, y:z=3:4에서 공통값 y는 3입니다.', '2 : 3 : 4를 선택하세요.'],
        sourceText: 'x : y : z =',
        confidence: 0.99,
        position: { top: 65.5, left: 25.5, width: 9.5, height: 3.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '1 : 2 : 1',
        options: ['1 : 2 : 1', '2 : 1 : 1', '1 : 1 : 2', '2 : 2 : 1'],
        problemLabel: '(4)',
        responseLabel: 'a : b : c',
        hints: ['a:b=1:2, b:c=2:1에서 공통값 b는 2입니다.', '1 : 2 : 1을 선택하세요.'],
        sourceText: 'a : b : c =',
        confidence: 0.99,
        position: { top: 85.5, left: 25.5, width: 9.5, height: 3.5 }
      }
    ]
  },

  // Page 7: Slide 14
  {
    pageId: 'page_1787003963415_7',
    summary: '관찰 문제 1 - 공통값을 똑같이 만드는 과정 설명 페이지',
    elements: []
  },

  // Page 8: Slide 15
  {
    pageId: 'page_1787003963415_8',
    summary: '연습문제 1 - 공통값을 통일하기 위한 곱셈식 (4지선다형)',
    elements: [
      {
        clientKey: 'q2_1',
        type: 'multiple-choice',
        answer: '2×5 : 1×5',
        options: ['2×5 : 1×5', '2×2 : 1×2', '2×1 : 1×1', '2×10 : 1×10'],
        problemLabel: '(2)-①',
        responseLabel: 'c : d 배수식',
        hints: ['공통값 d(1과 5)를 5로 맞추기 위해 5배 합니다.', '2×5 : 1×5를 선택하세요.'],
        sourceText: '① c : d =',
        confidence: 0.99,
        position: { top: 50.0, left: 26.0, width: 10.5, height: 3.5 }
      },
      {
        clientKey: 'q2_2',
        type: 'multiple-choice',
        answer: '5×1 : 2×1',
        options: ['5×1 : 2×1', '5×2 : 2×2', '5×5 : 2×5', '5×3 : 2×3'],
        problemLabel: '(2)-②',
        responseLabel: 'd : f 배수식',
        hints: ['공통값 d(5)를 유지하기 위해 1배 합니다.', '5×1 : 2×1을 선택하세요.'],
        sourceText: '② d : f =',
        confidence: 0.99,
        position: { top: 55.0, left: 26.0, width: 10.5, height: 3.5 }
      },
      {
        clientKey: 'q3_1',
        type: 'multiple-choice',
        answer: '1×2 : 5×2',
        options: ['1×2 : 5×2', '1×5 : 5×5', '1×1 : 5×1', '1×10 : 5×10'],
        problemLabel: '(3)-①',
        responseLabel: 'x : y 배수식',
        hints: ['공통값 y(5와 2)를 10으로 맞추기 위해 2배 합니다.', '1×2 : 5×2를 선택하세요.'],
        sourceText: '① x : y =',
        confidence: 0.99,
        position: { top: 78.5, left: 26.0, width: 10.5, height: 3.5 }
      },
      {
        clientKey: 'q3_2',
        type: 'multiple-choice',
        answer: '2×5 : 1×5',
        options: ['2×5 : 1×5', '2×2 : 1×2', '2×1 : 1×1', '2×10 : 1×10'],
        problemLabel: '(3)-②',
        responseLabel: 'y : z 배수식',
        hints: ['공통값 y(2)를 10으로 맞추기 위해 5배 합니다.', '2×5 : 1×5를 선택하세요.'],
        sourceText: '② y : z =',
        confidence: 0.99,
        position: { top: 83.5, left: 26.0, width: 10.5, height: 3.5 }
      }
    ]
  },

  // Page 9: Slide 16
  {
    pageId: 'page_1787003963415_9',
    summary: '연습문제 2 - 공통값을 통일하기 위한 곱셈식 (4지선다형)',
    elements: [
      {
        clientKey: 'q2_1',
        type: 'multiple-choice',
        answer: '1×1 : 6×1',
        options: ['1×1 : 6×1', '1×5 : 6×5', '1×6 : 6×6', '1×2 : 6×2'],
        problemLabel: '(2)-①',
        responseLabel: 'x : y 배수식',
        hints: ['공통값 y(6, 1)의 최소공배수는 6입니다.', '1×1 : 6×1을 선택하세요.'],
        sourceText: '① x : y =',
        confidence: 0.99,
        position: { top: 43.5, left: 30.5, width: 15.5, height: 3.5 }
      },
      {
        clientKey: 'q2_2',
        type: 'multiple-choice',
        answer: '1×6 : 5×6',
        options: ['1×6 : 5×6', '1×1 : 5×1', '1×5 : 5×5', '1×3 : 5×3'],
        problemLabel: '(2)-②',
        responseLabel: 'y : z 배수식',
        hints: ['공통값 y(1)을 6으로 만들기 위해 6배 합니다.', '1×6 : 5×6을 선택하세요.'],
        sourceText: '② y : z =',
        confidence: 0.99,
        position: { top: 47.5, left: 30.5, width: 15.5, height: 3.5 }
      },
      {
        clientKey: 'q3_1',
        type: 'multiple-choice',
        answer: '3×7 : 8×7',
        options: ['3×7 : 8×7', '3×8 : 8×8', '3×1 : 8×1', '3×3 : 8×3'],
        problemLabel: '(3)-①',
        responseLabel: 'h : b 배수식',
        hints: ['공통값 b(8, 7)를 56으로 맞추기 위해 7배 합니다.', '3×7 : 8×7을 선택하세요.'],
        sourceText: '① h : b =',
        confidence: 0.99,
        position: { top: 63.5, left: 30.5, width: 15.5, height: 3.5 }
      },
      {
        clientKey: 'q3_2',
        type: 'multiple-choice',
        answer: '7×8 : 1×8',
        options: ['7×8 : 1×8', '7×7 : 1×7', '7×1 : 1×1', '7×3 : 1×3'],
        problemLabel: '(3)-②',
        responseLabel: 'b : c 배수식',
        hints: ['공통값 b(7)을 56으로 만들기 위해 8배 합니다.', '7×8 : 1×8을 선택하세요.'],
        sourceText: '② b : c =',
        confidence: 0.99,
        position: { top: 67.5, left: 30.5, width: 15.5, height: 3.5 }
      },
      {
        clientKey: 'q4_1',
        type: 'multiple-choice',
        answer: '1×3 : 8×3',
        options: ['1×3 : 8×3', '1×8 : 8×8', '1×5 : 8×5', '1×1 : 8×1'],
        problemLabel: '(4)-①',
        responseLabel: 'a : b 배수식',
        hints: ['공통값 b(8, 3)를 24로 맞추기 위해 3배 합니다.', '1×3 : 8×3을 선택하세요.'],
        sourceText: '① a : b =',
        confidence: 0.99,
        position: { top: 83.5, left: 30.5, width: 15.5, height: 3.5 }
      },
      {
        clientKey: 'q4_2',
        type: 'multiple-choice',
        answer: '3×8 : 5×8',
        options: ['3×8 : 5×8', '3×3 : 5×3', '3×1 : 5×1', '3×5 : 5×5'],
        problemLabel: '(4)-②',
        responseLabel: 'b : c 배수식',
        hints: ['공통값 b(3)을 24로 만들기 위해 8배 합니다.', '3×8 : 5×8을 선택하세요.'],
        sourceText: '② b : c =',
        confidence: 0.99,
        position: { top: 87.5, left: 30.5, width: 15.5, height: 3.5 }
      },
      {
        clientKey: 'q5_1',
        type: 'multiple-choice',
        answer: '4×6 : 5×6',
        options: ['4×6 : 5×6', '4×5 : 5×5', '4×7 : 5×7', '4×4 : 5×4'],
        problemLabel: '(5)-①',
        responseLabel: 'm : n 배수식',
        hints: ['공통값 n(5, 6)을 30으로 맞추기 위해 6배 합니다.', '4×6 : 5×6을 선택하세요.'],
        sourceText: '① m : n =',
        confidence: 0.99,
        position: { top: 23.5, left: 68.5, width: 15.5, height: 3.5 }
      },
      {
        clientKey: 'q5_2',
        type: 'multiple-choice',
        answer: '6×5 : 7×5',
        options: ['6×5 : 7×5', '6×6 : 7×6', '6×7 : 7×7', '6×4 : 7×4'],
        problemLabel: '(5)-②',
        responseLabel: 'n : x 배수식',
        hints: ['공통값 n(6)을 30으로 만들기 위해 5배 합니다.', '6×5 : 7×5를 선택하세요.'],
        sourceText: '② n : x =',
        confidence: 0.99,
        position: { top: 27.5, left: 68.5, width: 15.5, height: 3.5 }
      },
      {
        clientKey: 'q6_1',
        type: 'multiple-choice',
        answer: '10×4 : 3×4',
        options: ['10×4 : 3×4', '10×3 : 3×3', '10×7 : 3×7', '10×10 : 3×10'],
        problemLabel: '(6)-①',
        responseLabel: 'a : b 배수식',
        hints: ['공통값 b(3, 4)를 12로 맞추기 위해 4배 합니다.', '10×4 : 3×4를 선택하세요.'],
        sourceText: '① a : b =',
        confidence: 0.99,
        position: { top: 43.5, left: 68.5, width: 15.5, height: 3.5 }
      },
      {
        clientKey: 'q6_2',
        type: 'multiple-choice',
        answer: '4×3 : 7×3',
        options: ['4×3 : 7×3', '4×4 : 7×4', '4×7 : 7×7', '4×1 : 7×1'],
        problemLabel: '(6)-②',
        responseLabel: 'b : c 배수식',
        hints: ['공통값 b(4)를 12로 만들기 위해 3배 합니다.', '4×3 : 7×3을 선택하세요.'],
        sourceText: '② b : c =',
        confidence: 0.99,
        position: { top: 47.5, left: 68.5, width: 15.5, height: 3.5 }
      },
      {
        clientKey: 'q7_1',
        type: 'multiple-choice',
        answer: '9×3 : 2×3',
        options: ['9×3 : 2×3', '9×2 : 2×2', '9×9 : 2×9', '9×1 : 2×1'],
        problemLabel: '(7)-①',
        responseLabel: 'a : d 배수식',
        hints: ['공통값 d(2, 3)를 6으로 맞추기 위해 3배 합니다.', '9×3 : 2×3을 선택하세요.'],
        sourceText: '① a : d =',
        confidence: 0.99,
        position: { top: 63.5, left: 68.5, width: 15.5, height: 3.5 }
      },
      {
        clientKey: 'q7_2',
        type: 'multiple-choice',
        answer: '3×2 : 2×2',
        options: ['3×2 : 2×2', '3×3 : 2×3', '3×1 : 2×1', '3×9 : 2×9'],
        problemLabel: '(7)-②',
        responseLabel: 'd : f 배수식',
        hints: ['공통값 d(3)를 6으로 만들기 위해 2배 합니다.', '3×2 : 2×2를 선택하세요.'],
        sourceText: '② d : f =',
        confidence: 0.99,
        position: { top: 67.5, left: 68.5, width: 15.5, height: 3.5 }
      },
      {
        clientKey: 'q8_1',
        type: 'multiple-choice',
        answer: '6×2 : 11×2',
        options: ['6×2 : 11×2', '6×11 : 11×11', '6×3 : 11×3', '6×6 : 11×6'],
        problemLabel: '(8)-①',
        responseLabel: 'a : b 배수식',
        hints: ['공통값 b(11, 2)를 22로 맞추기 위해 2배 합니다.', '6×2 : 11×2를 선택하세요.'],
        sourceText: '① a : b =',
        confidence: 0.99,
        position: { top: 83.5, left: 68.5, width: 15.5, height: 3.5 }
      },
      {
        clientKey: 'q8_2',
        type: 'multiple-choice',
        answer: '2×11 : 3×11',
        options: ['2×11 : 3×11', '2×2 : 3×2', '2×3 : 3×3', '2×6 : 3×6'],
        problemLabel: '(8)-②',
        responseLabel: 'b : c 배수식',
        hints: ['공통값 b(2)를 22로 만들기 위해 11배 합니다.', '2×11 : 3×11을 선택하세요.'],
        sourceText: '② b : c =',
        confidence: 0.99,
        position: { top: 87.5, left: 68.5, width: 15.5, height: 3.5 }
      }
    ]
  },

  // Page 10: Slide 17
  {
    pageId: 'page_1787003963415_10',
    summary: '연습문제 3 - 연비로 나타내기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '15 : 2 : 22',
        options: ['15 : 2 : 22', '15 : 2 : 11', '30 : 2 : 22', '15 : 1 : 11'],
        problemLabel: '(2)',
        responseLabel: 'a : c : x',
        hints: ['c(2, 1)를 2로 통일하면 15 : 2 : 22입니다.', '15 : 2 : 22를 선택하세요.'],
        sourceText: 'a : c : x =',
        confidence: 0.99,
        position: { top: 46.5, left: 30.5, width: 15.5, height: 3.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '15 : 6 : 10',
        options: ['15 : 6 : 10', '5 : 6 : 10', '15 : 2 : 5', '10 : 6 : 15'],
        problemLabel: '(3)',
        responseLabel: 'a : b : c',
        hints: ['b(2, 3)를 6으로 통일하면 15 : 6 : 10입니다.', '15 : 6 : 10을 선택하세요.'],
        sourceText: 'a : b : c =',
        confidence: 0.99,
        position: { top: 65.5, left: 30.5, width: 15.5, height: 3.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '18 : 45 : 55',
        options: ['18 : 45 : 55', '2 : 45 : 55', '18 : 5 : 55', '18 : 45 : 11'],
        problemLabel: '(4)',
        responseLabel: 'x : y : z',
        hints: ['y(5, 9)를 45로 통일하면 18 : 45 : 55입니다.', '18 : 45 : 55를 선택하세요.'],
        sourceText: 'x : y : z =',
        confidence: 0.99,
        position: { top: 85.5, left: 30.5, width: 15.5, height: 3.5 }
      },
      {
        clientKey: 'q5',
        type: 'multiple-choice',
        answer: '9 : 6 : 4',
        options: ['9 : 6 : 4', '3 : 6 : 4', '9 : 2 : 4', '6 : 9 : 4'],
        problemLabel: '(5)',
        responseLabel: 'b : c : d',
        hints: ['c(2, 3)를 6으로 통일하면 9 : 6 : 4입니다.', '9 : 6 : 4를 선택하세요.'],
        sourceText: 'b : c : d =',
        confidence: 0.99,
        position: { top: 26.5, left: 68.5, width: 15.5, height: 3.5 }
      },
      {
        clientKey: 'q6',
        type: 'multiple-choice',
        answer: '12 : 22 : 33',
        options: ['12 : 22 : 33', '6 : 22 : 33', '12 : 11 : 33', '12 : 22 : 3'],
        problemLabel: '(6)',
        responseLabel: 'i : j : k',
        hints: ['j(11, 2)를 22로 통일하면 12 : 22 : 33입니다.', '12 : 22 : 33을 선택하세요.'],
        sourceText: 'i : j : k =',
        confidence: 0.99,
        position: { top: 46.5, left: 68.5, width: 15.5, height: 3.5 }
      },
      {
        clientKey: 'q7',
        type: 'multiple-choice',
        answer: '14 : 10 : 25',
        options: ['14 : 10 : 25', '7 : 10 : 25', '14 : 5 : 25', '14 : 10 : 5'],
        problemLabel: '(7)',
        responseLabel: 'x : y : z',
        hints: ['y(5, 2)를 10으로 통일하면 14 : 10 : 25입니다.', '14 : 10 : 25를 선택하세요.'],
        sourceText: 'x : y : z =',
        confidence: 0.99,
        position: { top: 65.5, left: 68.5, width: 15.5, height: 3.5 }
      },
      {
        clientKey: 'q8',
        type: 'multiple-choice',
        answer: '3 : 6 : 14',
        options: ['3 : 6 : 14', '1 : 6 : 14', '3 : 2 : 14', '3 : 6 : 7'],
        problemLabel: '(8)',
        responseLabel: 'a : b : c',
        hints: ['b(2, 3)를 6으로 통일하면 3 : 6 : 14입니다.', '3 : 6 : 14를 선택하세요.'],
        sourceText: 'a : b : c =',
        confidence: 0.99,
        position: { top: 85.5, left: 68.5, width: 15.5, height: 3.5 }
      }
    ]
  },

  // Page 11: Slide 18
  {
    pageId: 'page_1787003963415_11',
    summary: '연습문제 4 - 최소공배수로 공통값 통일하기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2_1',
        type: 'multiple-choice',
        answer: '1×3 : 8×3',
        options: ['1×3 : 8×3', '1×2 : 8×2', '1×12 : 8×12', '1×8 : 8×8'],
        problemLabel: '(2)-①',
        responseLabel: 'a : b 배수식',
        hints: ['공통값 b(8, 12)의 최소공배수는 24입니다.', '1×3 : 8×3을 선택하세요.'],
        sourceText: '① a : b =',
        confidence: 0.99,
        position: { top: 82.0, left: 30.5, width: 15.5, height: 3.5 }
      },
      {
        clientKey: 'q2_2',
        type: 'multiple-choice',
        answer: '12×2 : 7×2',
        options: ['12×2 : 7×2', '12×3 : 7×3', '12×1 : 7×1', '12×8 : 7×8'],
        problemLabel: '(2)-②',
        responseLabel: 'b : c 배수식',
        hints: ['공통값 b(12)를 24로 만들기 위해 2배 합니다.', '12×2 : 7×2를 선택하세요.'],
        sourceText: '② b : c =',
        confidence: 0.99,
        position: { top: 86.0, left: 30.5, width: 15.5, height: 3.5 }
      },
      {
        clientKey: 'q3_1',
        type: 'multiple-choice',
        answer: '9×3 : 5×3',
        options: ['9×3 : 5×3', '9×5 : 5×5', '9×1 : 5×1', '9×15 : 5×15'],
        problemLabel: '(3)-①',
        responseLabel: 'a : d 배수식',
        hints: ['공통값 d(5, 15)의 최소공배수는 15입니다.', '9×3 : 5×3을 선택하세요.'],
        sourceText: '① a : d =',
        confidence: 0.99,
        position: { top: 59.5, left: 68.5, width: 15.5, height: 3.5 }
      },
      {
        clientKey: 'q3_2',
        type: 'multiple-choice',
        answer: '15×1 : 7×1',
        options: ['15×1 : 7×1', '15×3 : 7×3', '15×5 : 7×5', '15×2 : 7×2'],
        problemLabel: '(3)-②',
        responseLabel: 'd : f 배수식',
        hints: ['공통값 d(15)는 그대로 1배 합니다.', '15×1 : 7×1을 선택하세요.'],
        sourceText: '② d : f =',
        confidence: 0.99,
        position: { top: 63.5, left: 68.5, width: 15.5, height: 3.5 }
      },
      {
        clientKey: 'q4_1',
        type: 'multiple-choice',
        answer: '1×2 : 9×2',
        options: ['1×2 : 9×2', '1×3 : 9×3', '1×6 : 9×6', '1×1 : 9×1'],
        problemLabel: '(4)-①',
        responseLabel: 'a : b 배수식',
        hints: ['공통값 b(9, 6)의 최소공배수는 18입니다.', '1×2 : 9×2를 선택하세요.'],
        sourceText: '① a : b =',
        confidence: 0.99,
        position: { top: 82.0, left: 68.5, width: 15.5, height: 3.5 }
      },
      {
        clientKey: 'q4_2',
        type: 'multiple-choice',
        answer: '6×3 : 1×3',
        options: ['6×3 : 1×3', '6×2 : 1×2', '6×1 : 1×1', '6×9 : 1×9'],
        problemLabel: '(4)-②',
        responseLabel: 'b : c 배수식',
        hints: ['공통값 b(6)을 18로 만들기 위해 3배 합니다.', '6×3 : 1×3을 선택하세요.'],
        sourceText: '② b : c =',
        confidence: 0.99,
        position: { top: 86.0, left: 68.5, width: 15.5, height: 3.5 }
      }
    ]
  },

  // Page 12: Slide 19
  {
    pageId: 'page_1787003963415_12',
    summary: '연습문제 5 - 최소공배수를 활용하여 연비로 나타내기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '8 : 30 : 33',
        options: ['8 : 30 : 33', '4 : 30 : 33', '8 : 15 : 33', '8 : 30 : 11'],
        problemLabel: '(2)',
        responseLabel: 'a : c : x',
        hints: ['c(15, 10)의 최소공배수는 30입니다.', '8 : 30 : 33을 선택하세요.'],
        sourceText: 'a : c : x =',
        confidence: 0.99,
        position: { top: 46.5, left: 30.5, width: 15.5, height: 3.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '5 : 8 : 10',
        options: ['5 : 8 : 10', '5 : 4 : 10', '10 : 8 : 5', '5 : 8 : 5'],
        problemLabel: '(3)',
        responseLabel: 'a : b : c',
        hints: ['b(8, 4)의 최소공배수는 8입니다.', '5 : 8 : 10을 선택하세요.'],
        sourceText: 'a : b : c =',
        confidence: 0.99,
        position: { top: 65.5, left: 30.5, width: 15.5, height: 3.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '4 : 24 : 15',
        options: ['4 : 24 : 15', '2 : 24 : 15', '4 : 12 : 15', '4 : 24 : 5'],
        problemLabel: '(4)',
        responseLabel: 'x : y : z',
        hints: ['y(12, 8)의 최소공배수는 24입니다.', '4 : 24 : 15를 선택하세요.'],
        sourceText: 'x : y : z =',
        confidence: 0.99,
        position: { top: 85.5, left: 30.5, width: 15.5, height: 3.5 }
      },
      {
        clientKey: 'q5',
        type: 'multiple-choice',
        answer: '9 : 6 : 5',
        options: ['9 : 6 : 5', '3 : 6 : 5', '9 : 2 : 5', '9 : 6 : 10'],
        problemLabel: '(5)',
        responseLabel: 'b : c : d',
        hints: ['c(2, 6)의 최소공배수는 6입니다.', '9 : 6 : 5를 선택하세요.'],
        sourceText: 'b : c : d =',
        confidence: 0.99,
        position: { top: 26.5, left: 68.5, width: 15.5, height: 3.5 }
      },
      {
        clientKey: 'q6',
        type: 'multiple-choice',
        answer: '3 : 9 : 1',
        options: ['3 : 9 : 1', '1 : 9 : 1', '3 : 3 : 1', '3 : 9 : 3'],
        problemLabel: '(6)',
        responseLabel: 'i : j : k',
        hints: ['j(3, 9)의 최소공배수는 9입니다.', '3 : 9 : 1을 선택하세요.'],
        sourceText: 'i : j : k =',
        confidence: 0.99,
        position: { top: 46.5, left: 68.5, width: 15.5, height: 3.5 }
      },
      {
        clientKey: 'q7',
        type: 'multiple-choice',
        answer: '14 : 10 : 99',
        options: ['14 : 10 : 99', '7 : 10 : 99', '14 : 5 : 99', '14 : 10 : 198'],
        problemLabel: '(7)',
        responseLabel: 'x : y : z',
        hints: ['y(5, 10)의 최소공배수는 10입니다.', '14 : 10 : 99를 선택하세요.'],
        sourceText: 'x : y : z =',
        confidence: 0.99,
        position: { top: 65.5, left: 68.5, width: 15.5, height: 3.5 }
      },
      {
        clientKey: 'q8',
        type: 'multiple-choice',
        answer: '3 : 6 : 7',
        options: ['3 : 6 : 7', '1 : 6 : 7', '3 : 2 : 7', '3 : 6 : 14'],
        problemLabel: '(8)',
        responseLabel: 'a : b : c',
        hints: ['b(2, 6)의 최소공배수는 6입니다.', '3 : 6 : 7을 선택하세요.'],
        sourceText: 'a : b : c =',
        confidence: 0.99,
        position: { top: 85.5, left: 68.5, width: 15.5, height: 3.5 }
      }
    ]
  },

  // Page 13: Slide 20
  {
    pageId: 'page_1787003963415_13',
    summary: '연습문제 6 - 분수의 곱을 활용하여 공통값 통일하기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2_1',
        type: 'multiple-choice',
        answer: '1 : 8',
        options: ['1 : 8', '8 : 1', '1 : 12', '12 : 1'],
        problemLabel: '(2)-①',
        responseLabel: 'a : b 식',
        hints: ['공통값 b를 8로 맞추기 위해 ①은 그대로 둡니다.', '1 : 8을 선택하세요.'],
        sourceText: '① a : b =',
        confidence: 0.99,
        position: { top: 82.0, left: 30.5, width: 15.5, height: 3.5 }
      },
      {
        clientKey: 'q2_2',
        type: 'multiple-choice',
        answer: '$12 \\times \\frac{8}{12} : 7 \\times \\frac{8}{12}$',
        options: [
          '$12 \\times \\frac{8}{12} : 7 \\times \\frac{8}{12}$',
          '$12 \\times \\frac{12}{8} : 7 \\times \\frac{12}{8}$',
          '$12 \\times 8 : 7 \\times 8$',
          '$12 : 7$'
        ],
        problemLabel: '(2)-②',
        responseLabel: 'b : c 분수곱 식',
        hints: ['b(12)를 8로 만들기 위해 8/12를 곱합니다.', '$12 \\times \\frac{8}{12} : 7 \\times \\frac{8}{12}$를 선택하세요.'],
        sourceText: '② b : c =',
        confidence: 0.99,
        position: { top: 86.0, left: 30.5, width: 15.5, height: 3.5 }
      },
      {
        clientKey: 'q3_1',
        type: 'multiple-choice',
        answer: '9 : 5',
        options: ['9 : 5', '5 : 9', '9 : 15', '15 : 9'],
        problemLabel: '(3)-①',
        responseLabel: 'a : d 식',
        hints: ['공통값 d를 5로 맞추기 위해 ①은 그대로 둡니다.', '9 : 5를 선택하세요.'],
        sourceText: '① a : d =',
        confidence: 0.99,
        position: { top: 59.5, left: 68.5, width: 15.5, height: 3.5 }
      },
      {
        clientKey: 'q3_2',
        type: 'multiple-choice',
        answer: '$15 \\times \\frac{5}{15} : 7 \\times \\frac{5}{15}$',
        options: [
          '$15 \\times \\frac{5}{15} : 7 \\times \\frac{5}{15}$',
          '$15 \\times \\frac{15}{5} : 7 \\times \\frac{15}{5}$',
          '$15 \\times 5 : 7 \\times 5$',
          '$15 : 7$'
        ],
        problemLabel: '(3)-②',
        responseLabel: 'd : f 분수곱 식',
        hints: ['d(15)를 5로 만들기 위해 5/15를 곱합니다.', '$15 \\times \\frac{5}{15} : 7 \\times \\frac{5}{15}$를 선택하세요.'],
        sourceText: '② d : f =',
        confidence: 0.99,
        position: { top: 63.5, left: 68.5, width: 15.5, height: 3.5 }
      },
      {
        clientKey: 'q4_1',
        type: 'multiple-choice',
        answer: '1 : 9',
        options: ['1 : 9', '9 : 1', '1 : 6', '6 : 1'],
        problemLabel: '(4)-①',
        responseLabel: 'a : b 식',
        hints: ['공통값 b를 9로 맞추기 위해 ①은 그대로 둡니다.', '1 : 9를 선택하세요.'],
        sourceText: '① a : b =',
        confidence: 0.99,
        position: { top: 82.0, left: 68.5, width: 15.5, height: 3.5 }
      },
      {
        clientKey: 'q4_2',
        type: 'multiple-choice',
        answer: '$6 \\times \\frac{9}{6} : 1 \\times \\frac{9}{6}$',
        options: [
          '$6 \\times \\frac{9}{6} : 1 \\times \\frac{9}{6}$',
          '$6 \\times \\frac{6}{9} : 1 \\times \\frac{6}{9}$',
          '$6 \\times 9 : 1 \\times 9$',
          '$6 : 1$'
        ],
        problemLabel: '(4)-②',
        responseLabel: 'b : c 분수곱 식',
        hints: ['b(6)을 9로 만들기 위해 9/6를 곱합니다.', '$6 \\times \\frac{9}{6} : 1 \\times \\frac{9}{6}$를 선택하세요.'],
        sourceText: '② b : c =',
        confidence: 0.99,
        position: { top: 86.0, left: 68.5, width: 15.5, height: 3.5 }
      }
    ]
  },

  // Page 14: Slide 21
  {
    pageId: 'page_1787003963415_14',
    summary: '연습문제 7 - 분수의 곱을 활용하여 공통값 통일하기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '$6 : \\frac{15}{2}$',
        options: ['$6 : \\frac{15}{2}$', '$6 : \\frac{30}{4}$', '$4 : \\frac{5}{6}$', '$6 : 5$'],
        problemLabel: '(2)',
        responseLabel: 'y : x 비',
        hints: ['y(4)를 6으로 만들기 위해 6/4을 곱하면 6 : 15/2입니다.', '$6 : \\frac{15}{2}$를 선택하세요.'],
        sourceText: '② y : x =',
        confidence: 0.99,
        position: { top: 46.5, left: 30.5, width: 15.5, height: 3.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '$8 : \\frac{8}{7}$',
        options: ['$8 : \\frac{8}{7}$', '$8 : \\frac{7}{8}$', '$7 : \\frac{8}{7}$', '$8 : 1$'],
        problemLabel: '(3)',
        responseLabel: 'b : c 비',
        hints: ['b(7)을 8로 만들기 위해 8/7을 곱하면 8 : 8/7입니다.', '$8 : \\frac{8}{7}$을 선택하세요.'],
        sourceText: '② b : c =',
        confidence: 0.99,
        position: { top: 65.5, left: 30.5, width: 15.5, height: 3.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '$8 : \\frac{40}{3}$',
        options: ['$8 : \\frac{40}{3}$', '$8 : \\frac{3}{40}$', '$3 : \\frac{40}{3}$', '$8 : 5$'],
        problemLabel: '(4)',
        responseLabel: 'b : c 비',
        hints: ['b(3)을 8로 만들기 위해 8/3을 곱하면 8 : 40/3입니다.', '$8 : \\frac{40}{3}$을 선택하세요.'],
        sourceText: '② b : c =',
        confidence: 0.99,
        position: { top: 85.5, left: 30.5, width: 15.5, height: 3.5 }
      },
      {
        clientKey: 'q5',
        type: 'multiple-choice',
        answer: '$5 : \\frac{35}{6}$',
        options: ['$5 : \\frac{35}{6}$', '$5 : \\frac{6}{35}$', '$6 : \\frac{35}{6}$', '$5 : 7$'],
        problemLabel: '(5)',
        responseLabel: 'n : x 비',
        hints: ['n(6)을 5로 만들기 위해 5/6을 곱하면 5 : 35/6입니다.', '$5 : \\frac{35}{6}$를 선택하세요.'],
        sourceText: '② n : x =',
        confidence: 0.99,
        position: { top: 26.5, left: 68.5, width: 15.5, height: 3.5 }
      },
      {
        clientKey: 'q6',
        type: 'multiple-choice',
        answer: '$3 : \\frac{21}{4}$',
        options: ['$3 : \\frac{21}{4}$', '$3 : \\frac{4}{21}$', '$4 : \\frac{21}{4}$', '$3 : 7$'],
        problemLabel: '(6)',
        responseLabel: 'b : c 비',
        hints: ['b(4)를 3으로 만들기 위해 3/4을 곱하면 3 : 21/4입니다.', '$3 : \\frac{21}{4}$을 선택하세요.'],
        sourceText: '② b : c =',
        confidence: 0.99,
        position: { top: 46.5, left: 68.5, width: 15.5, height: 3.5 }
      },
      {
        clientKey: 'q7',
        type: 'multiple-choice',
        answer: '$2 : \\frac{4}{3}$',
        options: ['$2 : \\frac{4}{3}$', '$2 : \\frac{3}{4}$', '$3 : \\frac{4}{3}$', '$2 : 2$'],
        problemLabel: '(7)',
        responseLabel: 'd : f 비',
        hints: ['d(3)을 2로 만들기 위해 2/3를 곱하면 2 : 4/3입니다.', '$2 : \\frac{4}{3}$를 선택하세요.'],
        sourceText: '② d : f =',
        confidence: 0.99,
        position: { top: 65.5, left: 68.5, width: 15.5, height: 3.5 }
      },
      {
        clientKey: 'q8',
        type: 'multiple-choice',
        answer: '$11 : \\frac{33}{2}$',
        options: ['$11 : \\frac{33}{2}$', '$11 : \\frac{2}{33}$', '$2 : \\frac{33}{2}$', '$11 : 3$'],
        problemLabel: '(8)',
        responseLabel: 'b : c 비',
        hints: ['b(2)를 11로 만들기 위해 11/2을 곱하면 11 : 33/2입니다.', '$11 : \\frac{33}{2}$을 선택하세요.'],
        sourceText: '② b : c =',
        confidence: 0.99,
        position: { top: 85.5, left: 68.5, width: 15.5, height: 3.5 }
      }
    ]
  },

  // Page 15: Slide 22
  {
    pageId: 'page_1787003963415_15',
    summary: '연습문제 8 - 축척인수(scale factor) 구하기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '$\\frac{1}{3}$',
        options: ['$\\frac{1}{3}$', '3', '$\\frac{1}{6}$', '6'],
        problemLabel: '(2)',
        responseLabel: '축척인수',
        hints: ['3에 1/3을 곱해야 1이 됩니다.', '$\\frac{1}{3}$을 선택하세요.'],
        sourceText: '3 -> 1',
        confidence: 0.99,
        position: { top: 73.5, left: 28.5, width: 5.0, height: 5.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '3',
        options: ['3', '$\\frac{1}{3}$', '6', '18'],
        problemLabel: '(3)',
        responseLabel: '축척인수',
        hints: ['6에 3을 곱해야 18이 됩니다.', '3을 선택하세요.'],
        sourceText: '6 -> 18',
        confidence: 0.99,
        position: { top: 52.5, left: 70.5, width: 4.0, height: 3.0 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '$\\frac{2}{11}$',
        options: ['$\\frac{2}{11}$', '$\\frac{11}{2}$', '2', '11'],
        problemLabel: '(4)',
        responseLabel: '축척인수',
        hints: ['11에 2/11을 곱해야 2가 됩니다.', '$\\frac{2}{11}$를 선택하세요.'],
        sourceText: '11 -> 2',
        confidence: 0.99,
        position: { top: 73.5, left: 75.0, width: 5.0, height: 5.5 }
      }
    ]
  },

  // Page 16: Slide 23
  {
    pageId: 'page_1787003963415_16',
    summary: '연습문제 9 - 연비에서 x, y의 값 구하기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2_x',
        type: 'multiple-choice',
        answer: '$\\frac{27}{10}$',
        options: ['$\\frac{27}{10}$', '2.7', '$\\frac{10}{27}$', '3'],
        problemLabel: '(2)-x',
        responseLabel: 'x의 값',
        hints: ['축척인수가 9/10이므로 x = 3 × 9/10 = 27/10입니다.', '$\\frac{27}{10}$을 선택하세요.'],
        sourceText: 'x =',
        confidence: 0.99,
        position: { top: 46.5, left: 23.5, width: 7.0, height: 3.5 }
      },
      {
        clientKey: 'q2_y',
        type: 'multiple-choice',
        answer: '$\\frac{36}{5}$',
        options: ['$\\frac{36}{5}$', '$\\frac{72}{10}$', '7.2', '8'],
        problemLabel: '(2)-y',
        responseLabel: 'y의 값',
        hints: ['축척인수가 9/10이므로 y = 8 × 9/10 = 72/10 = 36/5입니다.', '$\\frac{36}{5}$를 선택하세요.'],
        sourceText: 'y =',
        confidence: 0.99,
        position: { top: 46.5, left: 37.0, width: 7.0, height: 3.5 }
      },
      {
        clientKey: 'q3_x',
        type: 'multiple-choice',
        answer: '1',
        options: ['1', '2', '$\\frac{1}{2}$', '4'],
        problemLabel: '(3)-x',
        responseLabel: 'x의 값',
        hints: ['축척인수가 2/4 = 1/2이므로 x = 2 × 1/2 = 1입니다.', '1을 선택하세요.'],
        sourceText: 'x =',
        confidence: 0.99,
        position: { top: 66.5, left: 23.5, width: 7.0, height: 3.5 }
      },
      {
        clientKey: 'q3_y',
        type: 'multiple-choice',
        answer: '$\\frac{9}{2}$',
        options: ['$\\frac{9}{2}$', '4.5', '$\\frac{2}{9}$', '9'],
        problemLabel: '(3)-y',
        responseLabel: 'y의 값',
        hints: ['축척인수가 1/2이므로 y = 9 × 1/2 = 9/2입니다.', '$\\frac{9}{2}$를 선택하세요.'],
        sourceText: 'y =',
        confidence: 0.99,
        position: { top: 66.5, left: 37.0, width: 7.0, height: 3.5 }
      },
      {
        clientKey: 'q4_x',
        type: 'multiple-choice',
        answer: '12',
        options: ['12', '3', '6', '24'],
        problemLabel: '(4)-x',
        responseLabel: 'x의 값',
        hints: ['축척인수가 8/2 = 4이므로 x = 3 × 4 = 12입니다.', '12를 선택하세요.'],
        sourceText: 'x =',
        confidence: 0.99,
        position: { top: 86.5, left: 23.5, width: 7.0, height: 3.5 }
      },
      {
        clientKey: 'q4_y',
        type: 'multiple-choice',
        answer: '4',
        options: ['4', '1', '2', '8'],
        problemLabel: '(4)-y',
        responseLabel: 'y의 값',
        hints: ['축척인수가 4이므로 y = 1 × 4 = 4입니다.', '4를 선택하세요.'],
        sourceText: 'y =',
        confidence: 0.99,
        position: { top: 86.5, left: 37.0, width: 7.0, height: 3.5 }
      },
      {
        clientKey: 'q5_x',
        type: 'multiple-choice',
        answer: '$\\frac{7}{3}$',
        options: ['$\\frac{7}{3}$', '$\\frac{3}{7}$', '7', '3'],
        problemLabel: '(5)-x',
        responseLabel: 'x의 값',
        hints: ['축척인수가 1/3이므로 x = 7 × 1/3 = 7/3입니다.', '$\\frac{7}{3}$을 선택하세요.'],
        sourceText: 'x =',
        confidence: 0.99,
        position: { top: 26.5, left: 61.0, width: 7.0, height: 3.5 }
      },
      {
        clientKey: 'q5_y',
        type: 'multiple-choice',
        answer: '$\\frac{1}{3}$',
        options: ['$\\frac{1}{3}$', '3', '1', '$\\frac{1}{7}$'],
        problemLabel: '(5)-y',
        responseLabel: 'y의 값',
        hints: ['축척인수가 1/3이므로 y = 1 × 1/3 = 1/3입니다.', '$\\frac{1}{3}$을 선택하세요.'],
        sourceText: 'y =',
        confidence: 0.99,
        position: { top: 26.5, left: 74.5, width: 7.0, height: 3.5 }
      },
      {
        clientKey: 'q6_x',
        type: 'multiple-choice',
        answer: '$\\frac{9}{8}$',
        options: ['$\\frac{9}{8}$', '$\\frac{8}{9}$', '9', '1'],
        problemLabel: '(6)-x',
        responseLabel: 'x의 값',
        hints: ['축척인수가 1/8이므로 x = 9 × 1/8 = 9/8입니다.', '$\\frac{9}{8}$를 선택하세요.'],
        sourceText: 'x =',
        confidence: 0.99,
        position: { top: 46.5, left: 61.0, width: 7.0, height: 3.5 }
      },
      {
        clientKey: 'q6_y',
        type: 'multiple-choice',
        answer: '$\\frac{7}{8}$',
        options: ['$\\frac{7}{8}$', '$\\frac{8}{7}$', '7', '$\\frac{1}{8}$'],
        problemLabel: '(6)-y',
        responseLabel: 'y의 값',
        hints: ['축척인수가 1/8이므로 y = 7 × 1/8 = 7/8입니다.', '$\\frac{7}{8}$을 선택하세요.'],
        sourceText: 'y =',
        confidence: 0.99,
        position: { top: 46.5, left: 74.5, width: 7.0, height: 3.5 }
      },
      {
        clientKey: 'q7_x',
        type: 'multiple-choice',
        answer: '2',
        options: ['2', '20', '$\\frac{2}{3}$', '3'],
        problemLabel: '(7)-x',
        responseLabel: 'x의 값',
        hints: ['축척인수가 3/30 = 1/10이므로 x = 20 × 1/10 = 2입니다.', '2를 선택하세요.'],
        sourceText: 'x =',
        confidence: 0.99,
        position: { top: 66.5, left: 61.0, width: 7.0, height: 3.5 }
      },
      {
        clientKey: 'q7_y',
        type: 'multiple-choice',
        answer: '1',
        options: ['1', '10', '$\\frac{1}{3}$', '3'],
        problemLabel: '(7)-y',
        responseLabel: 'y의 값',
        hints: ['축척인수가 1/10이므로 y = 10 × 1/10 = 1입니다.', '1을 선택하세요.'],
        sourceText: 'y =',
        confidence: 0.99,
        position: { top: 66.5, left: 74.5, width: 7.0, height: 3.5 }
      },
      {
        clientKey: 'q8_x',
        type: 'multiple-choice',
        answer: '$\\frac{3}{10}$',
        options: ['$\\frac{3}{10}$', '0.3', '$\\frac{10}{3}$', '3'],
        problemLabel: '(8)-x',
        responseLabel: 'x의 값',
        hints: ['축척인수가 1/10이므로 x = 3 × 1/10 = 3/10입니다.', '$\\frac{3}{10}$을 선택하세요.'],
        sourceText: 'x =',
        confidence: 0.99,
        position: { top: 86.5, left: 61.0, width: 7.0, height: 3.5 }
      },
      {
        clientKey: 'q8_y',
        type: 'multiple-choice',
        answer: '$\\frac{3}{10}$',
        options: ['$\\frac{3}{10}$', '0.3', '$\\frac{10}{3}$', '1'],
        problemLabel: '(8)-y',
        responseLabel: 'y의 값',
        hints: ['축척인수가 1/10이므로 y = 3 × 1/10 = 3/10입니다.', '$\\frac{3}{10}$을 선택하세요.'],
        sourceText: 'y =',
        confidence: 0.99,
        position: { top: 86.5, left: 74.5, width: 7.0, height: 3.5 }
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
console.log('All 16 pages generated successfully!');
