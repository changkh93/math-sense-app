import fs from 'node:fs';

const unitId = 'ratios_ratio_chap3_unit2';

const pagesData = [
  // Page 1: Slide 24
  {
    pageId: 'page_1787003987539_1',
    summary: '그리기 문제 1 - 주어진 비로 비례배분하기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '전체를 8등분하여 5 : 3으로 나눔',
        options: [
          '전체를 8등분하여 5 : 3으로 나눔',
          '전체를 5등분하여 3 : 2로 나눔',
          '전체를 3등분하여 2 : 1로 나눔',
          '전체를 6등분하여 4 : 2로 나눔'
        ],
        problemLabel: '(2)',
        responseLabel: '5 : 3 비례배분',
        hints: ['5+3=8이므로 전체를 8등분합니다.', '전체를 8등분하여 5 : 3으로 나눔을 선택하세요.'],
        sourceText: '5 : 3',
        confidence: 0.99,
        position: { top: 72.5, left: 16.5, width: 28.0, height: 12.0 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '전체를 3등분하여 2 : 1로 나눔',
        options: [
          '전체를 3등분하여 2 : 1로 나눔',
          '전체를 2등분하여 1 : 1로 나눔',
          '전체를 4등분하여 3 : 1로 나눔',
          '전체를 5등분하여 3 : 2로 나눔'
        ],
        problemLabel: '(3)',
        responseLabel: '2 : 1 비례배분',
        hints: ['2+1=3이므로 전체를 3등분합니다.', '전체를 3등분하여 2 : 1로 나눔을 선택하세요.'],
        sourceText: '2 : 1',
        confidence: 0.99,
        position: { top: 51.5, left: 54.0, width: 28.0, height: 12.0 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '전체를 2등분하여 1 : 1로 나눔',
        options: [
          '전체를 2등분하여 1 : 1로 나눔',
          '전체를 4등분하여 2 : 2로 나눔',
          '전체를 3등분하여 2 : 1로 나눔',
          '전체를 1등분하여 그대로 둠'
        ],
        problemLabel: '(4)',
        responseLabel: '1 : 1 비례배분',
        hints: ['1+1=2이므로 전체를 2등분(절반)합니다.', '전체를 2등분하여 1 : 1로 나눔을 선택하세요.'],
        sourceText: '1 : 1',
        confidence: 0.99,
        position: { top: 72.5, left: 54.0, width: 28.0, height: 12.0 }
      }
    ]
  },

  // Page 2: Slide 25
  {
    pageId: 'page_1787003987539_2',
    summary: '그리기 문제 2 - 주어진 비로 비례배분하기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '전체를 6등분하여 3 : 2 : 1로 나눔',
        options: [
          '전체를 6등분하여 3 : 2 : 1로 나눔',
          '전체를 5등분하여 2 : 2 : 1로 나눔',
          '전체를 3등분하여 1 : 1 : 1로 나눔',
          '전체를 7등분하여 3 : 2 : 2로 나눔'
        ],
        problemLabel: '(2)',
        responseLabel: '3 : 2 : 1 비례배분',
        hints: ['3+2+1=6이므로 전체를 6등분합니다.', '전체를 6등분하여 3 : 2 : 1로 나눔을 선택하세요.'],
        sourceText: '3 : 2 : 1',
        confidence: 0.99,
        position: { top: 35.0, left: 15.5, width: 31.0, height: 10.0 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '전체를 9등분하여 2 : 3 : 4로 나눔',
        options: [
          '전체를 9등분하여 2 : 3 : 4로 나눔',
          '전체를 8등분하여 2 : 3 : 3으로 나눔',
          '전체를 7등분하여 2 : 2 : 3으로 나눔',
          '전체를 10등분하여 2 : 4 : 4로 나눔'
        ],
        problemLabel: '(3)',
        responseLabel: '2 : 3 : 4 비례배분',
        hints: ['2+3+4=9이므로 전체를 9등분합니다.', '전체를 9등분하여 2 : 3 : 4로 나눔을 선택하세요.'],
        sourceText: '2 : 3 : 4',
        confidence: 0.99,
        position: { top: 55.0, left: 15.5, width: 31.0, height: 10.0 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '전체를 5등분하여 1 : 1 : 3으로 나눔',
        options: [
          '전체를 5등분하여 1 : 1 : 3으로 나눔',
          '전체를 4등분하여 1 : 1 : 2로 나눔',
          '전체를 3등분하여 1 : 1 : 1로 나눔',
          '전체를 6등분하여 2 : 1 : 3으로 나눔'
        ],
        problemLabel: '(4)',
        responseLabel: '1 : 1 : 3 비례배분',
        hints: ['1+1+3=5이므로 전체를 5등분합니다.', '전체를 5등분하여 1 : 1 : 3으로 나눔을 선택하세요.'],
        sourceText: '1 : 1 : 3',
        confidence: 0.99,
        position: { top: 75.0, left: 15.5, width: 31.0, height: 10.0 }
      },
      {
        clientKey: 'q5',
        type: 'multiple-choice',
        answer: '전체를 5등분하여 2 : 3으로 나눔',
        options: [
          '전체를 5등분하여 2 : 3으로 나눔',
          '전체를 6등분하여 2 : 4로 나눔',
          '전체를 4등분하여 1 : 3으로 나눔',
          '전체를 3등분하여 1 : 2로 나눔'
        ],
        problemLabel: '(5)',
        responseLabel: '2 : 3 비례배분',
        hints: ['2+3=5이므로 전체를 5등분합니다.', '전체를 5등분하여 2 : 3으로 나눔을 선택하세요.'],
        sourceText: '2 : 3',
        confidence: 0.99,
        position: { top: 15.0, left: 53.5, width: 31.0, height: 10.0 }
      },
      {
        clientKey: 'q6',
        type: 'multiple-choice',
        answer: '전체를 4등분하여 1 : 2 : 1로 나눔',
        options: [
          '전체를 4등분하여 1 : 2 : 1로 나눔',
          '전체를 3등분하여 1 : 1 : 1로 나눔',
          '전체를 5등분하여 1 : 3 : 1로 나눔',
          '전체를 2등분하여 1 : 1로 나눔'
        ],
        problemLabel: '(6)',
        responseLabel: '1 : 2 : 1 비례배분',
        hints: ['1+2+1=4이므로 전체를 4등분합니다.', '전체를 4등분하여 1 : 2 : 1로 나눔을 선택하세요.'],
        sourceText: '1 : 2 : 1',
        confidence: 0.99,
        position: { top: 35.0, left: 53.5, width: 31.0, height: 10.0 }
      },
      {
        clientKey: 'q7',
        type: 'multiple-choice',
        answer: '전체를 4등분하여 3 : 1로 나눔',
        options: [
          '전체를 4등분하여 3 : 1로 나눔',
          '전체를 3등분하여 2 : 1로 나눔',
          '전체를 5등분하여 4 : 1로 나눔',
          '전체를 2등분하여 1 : 1로 나눔'
        ],
        problemLabel: '(7)',
        responseLabel: '3 : 1 비례배분',
        hints: ['3+1=4이므로 전체를 4등분합니다.', '전체를 4등분하여 3 : 1로 나눔을 선택하세요.'],
        sourceText: '3 : 1',
        confidence: 0.99,
        position: { top: 55.0, left: 53.5, width: 31.0, height: 10.0 }
      },
      {
        clientKey: 'q8',
        type: 'multiple-choice',
        answer: '전체를 5등분하여 2 : 1 : 2로 나눔',
        options: [
          '전체를 5등분하여 2 : 1 : 2로 나눔',
          '전체를 4등분하여 1 : 2 : 1로 나눔',
          '전체를 6등분하여 2 : 2 : 2로 나눔',
          '전체를 3등분하여 1 : 1 : 1로 나눔'
        ],
        problemLabel: '(8)',
        responseLabel: '2 : 1 : 2 비례배분',
        hints: ['2+1+2=5이므로 전체를 5등분합니다.', '전체를 5등분하여 2 : 1 : 2로 나눔을 선택하세요.'],
        sourceText: '2 : 1 : 2',
        confidence: 0.99,
        position: { top: 75.0, left: 53.5, width: 31.0, height: 10.0 }
      }
    ]
  },

  // Page 3: Slide 26
  {
    pageId: 'page_1787003987539_3',
    summary: '연습문제 1 - 비례배분한 값 구하기 (정수/소수 입력형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'input',
        inputMode: 'integer',
        answer: '12',
        acceptedAnswers: ['12'],
        problemLabel: '(2)',
        responseLabel: '비례배분 값',
        hints: ['3/8 × 32 = 12입니다.', '12를 입력하세요.'],
        sourceText: '3/8 × 32',
        confidence: 0.99,
        position: { top: 82.5, left: 38.5, width: 5.0, height: 5.5 }
      },
      {
        clientKey: 'q3',
        type: 'input',
        inputMode: 'integer',
        answer: '1',
        acceptedAnswers: ['1'],
        problemLabel: '(3)',
        responseLabel: '비례배분 값',
        hints: ['1/3 × 3 = 1입니다.', '1을 입력하세요.'],
        sourceText: '1/3 × 3',
        confidence: 0.99,
        position: { top: 59.5, left: 77.0, width: 5.0, height: 5.5 }
      },
      {
        clientKey: 'q4',
        type: 'input',
        inputMode: 'decimal',
        answer: '2.5',
        acceptedAnswers: ['2.5', '5/2'],
        problemLabel: '(4)',
        responseLabel: '비례배분 값',
        hints: ['1/2 × 5 = 2.5입니다.', '2.5를 입력하세요.'],
        sourceText: '1/2 × 5',
        confidence: 0.99,
        position: { top: 82.5, left: 59.0, width: 5.0, height: 5.5 }
      }
    ]
  },

  // Page 4: Slide 27
  {
    pageId: 'page_1787003987539_4',
    summary: '연습문제 2 - 비례배분한 값 구하기 (입력 및 4지선다형)',
    elements: [
      {
        clientKey: 'q1_left',
        type: 'multiple-choice',
        answer: '$\\frac{100}{7}$',
        options: ['$\\frac{100}{7}$', '$\\frac{50}{7}$', '$\\frac{200}{7}$', '14'],
        problemLabel: '(1)-왼쪽',
        responseLabel: '왼쪽 비례배분 값',
        hints: ['2/7 × 50 = 100/7입니다.', '$\\frac{100}{7}$를 선택하세요.'],
        sourceText: '2/7 × 50',
        confidence: 0.99,
        position: { top: 22.5, left: 17.5, width: 5.0, height: 5.5 }
      },
      {
        clientKey: 'q1_right',
        type: 'multiple-choice',
        answer: '$\\frac{200}{7}$',
        options: ['$\\frac{200}{7}$', '$\\frac{100}{7}$', '$\\frac{400}{7}$', '28'],
        problemLabel: '(1)-오른쪽',
        responseLabel: '오른쪽 비례배분 값',
        hints: ['4/7 × 50 = 200/7입니다.', '$\\frac{200}{7}$를 선택하세요.'],
        sourceText: '4/7 × 50',
        confidence: 0.99,
        position: { top: 22.5, left: 35.0, width: 5.0, height: 5.5 }
      },
      {
        clientKey: 'q2_left',
        type: 'input',
        inputMode: 'integer',
        answer: '75',
        acceptedAnswers: ['75'],
        problemLabel: '(2)-왼쪽',
        responseLabel: '왼쪽 비례배분 값',
        hints: ['3/6 × 150 = 75입니다.', '75를 입력하세요.'],
        sourceText: '3/6 × 150',
        confidence: 0.99,
        position: { top: 42.0, left: 21.0, width: 5.0, height: 5.5 }
      },
      {
        clientKey: 'q2_right',
        type: 'input',
        inputMode: 'integer',
        answer: '50',
        acceptedAnswers: ['50'],
        problemLabel: '(2)-가운데',
        responseLabel: '가운데 비례배분 값',
        hints: ['2/6 × 150 = 50입니다.', '50을 입력하세요.'],
        sourceText: '2/6 × 150',
        confidence: 0.99,
        position: { top: 42.0, left: 33.5, width: 5.0, height: 5.5 }
      },
      {
        clientKey: 'q3_left',
        type: 'multiple-choice',
        answer: '$\\frac{80}{3}$',
        options: ['$\\frac{80}{3}$', '$\\frac{160}{9}$', '$\\frac{240}{9}$', '26'],
        problemLabel: '(3)-가운데',
        responseLabel: '가운데 비례배분 값',
        hints: ['3/9 × 80 = 80/3입니다.', '$\\frac{80}{3}$을 선택하세요.'],
        sourceText: '3/9 × 80',
        confidence: 0.99,
        position: { top: 62.0, left: 25.0, width: 5.0, height: 5.5 }
      },
      {
        clientKey: 'q3_right',
        type: 'multiple-choice',
        answer: '$\\frac{320}{9}$',
        options: ['$\\frac{320}{9}$', '$\\frac{160}{9}$', '$\\frac{80}{9}$', '35'],
        problemLabel: '(3)-오른쪽',
        responseLabel: '오른쪽 비례배분 값',
        hints: ['4/9 × 80 = 320/9입니다.', '$\\frac{320}{9}$를 선택하세요.'],
        sourceText: '4/9 × 80',
        confidence: 0.99,
        position: { top: 62.0, left: 37.0, width: 5.0, height: 5.5 }
      },
      {
        clientKey: 'q4_right',
        type: 'input',
        inputMode: 'integer',
        answer: '15',
        acceptedAnswers: ['15'],
        problemLabel: '(4)',
        responseLabel: '오른쪽 비례배분 값',
        hints: ['3/5 × 25 = 15입니다.', '15를 입력하세요.'],
        sourceText: '3/5 × 25',
        confidence: 0.99,
        position: { top: 82.0, left: 35.0, width: 5.0, height: 5.5 }
      },
      {
        clientKey: 'q5_left',
        type: 'input',
        inputMode: 'integer',
        answer: '240',
        acceptedAnswers: ['240'],
        problemLabel: '(5)-왼쪽',
        responseLabel: '왼쪽 비례배분 값',
        hints: ['2/5 × 600 = 240입니다.', '240을 입력하세요.'],
        sourceText: '2/5 × 600',
        confidence: 0.99,
        position: { top: 22.5, left: 57.0, width: 5.0, height: 5.5 }
      },
      {
        clientKey: 'q5_right',
        type: 'input',
        inputMode: 'integer',
        answer: '360',
        acceptedAnswers: ['360'],
        problemLabel: '(5)-오른쪽',
        responseLabel: '오른쪽 비례배분 값',
        hints: ['3/5 × 600 = 360입니다.', '360을 입력하세요.'],
        sourceText: '3/5 × 600',
        confidence: 0.99,
        position: { top: 22.5, left: 72.5, width: 5.0, height: 5.5 }
      },
      {
        clientKey: 'q6_left',
        type: 'input',
        inputMode: 'integer',
        answer: '15',
        acceptedAnswers: ['15'],
        problemLabel: '(6)-가운데',
        responseLabel: '가운데 비례배분 값',
        hints: ['2/4 × 30 = 15입니다.', '15를 입력하세요.'],
        sourceText: '2/4 × 30',
        confidence: 0.99,
        position: { top: 42.0, left: 66.0, width: 5.0, height: 5.5 }
      },
      {
        clientKey: 'q6_right',
        type: 'input',
        inputMode: 'decimal',
        answer: '7.5',
        acceptedAnswers: ['7.5', '15/2'],
        problemLabel: '(6)-오른쪽',
        responseLabel: '오른쪽 비례배분 값',
        hints: ['1/4 × 30 = 7.5입니다.', '7.5를 입력하세요.'],
        sourceText: '1/4 × 30',
        confidence: 0.99,
        position: { top: 42.0, left: 77.5, width: 5.0, height: 5.5 }
      },
      {
        clientKey: 'q7_left',
        type: 'input',
        inputMode: 'integer',
        answer: '75',
        acceptedAnswers: ['75'],
        problemLabel: '(7)',
        responseLabel: '왼쪽 비례배분 값',
        hints: ['3/4 × 100 = 75입니다.', '75를 입력하세요.'],
        sourceText: '3/4 × 100',
        confidence: 0.99,
        position: { top: 62.0, left: 62.5, width: 5.0, height: 5.5 }
      },
      {
        clientKey: 'q8_right',
        type: 'input',
        inputMode: 'integer',
        answer: '200',
        acceptedAnswers: ['200'],
        problemLabel: '(8)',
        responseLabel: '오른쪽 비례배분 값',
        hints: ['2/5 × 500 = 200입니다.', '200을 입력하세요.'],
        sourceText: '2/5 × 500',
        confidence: 0.99,
        position: { top: 82.0, left: 75.5, width: 5.0, height: 5.5 }
      }
    ]
  },

  // Page 5: Slide 28
  {
    pageId: 'page_1787003987539_5',
    summary: '연습문제 3 - 비례배분 실생활 응용 문제 (정수 입력형)',
    elements: [
      {
        clientKey: 'q1_myeongsoo',
        type: 'input',
        inputMode: 'integer',
        answer: '18',
        acceptedAnswers: ['18', '18개'],
        problemLabel: '(1)',
        responseLabel: '명수가 갖는 빵 개수',
        hints: ['2/5 × 45 = 18개입니다.', '18을 입력하세요.'],
        sourceText: '명수 빵 개수',
        confidence: 0.99,
        position: { top: 35.0, left: 61.5, width: 7.0, height: 5.5 }
      },
      {
        clientKey: 'q2_boys',
        type: 'input',
        inputMode: 'integer',
        answer: '476',
        acceptedAnswers: ['476', '476명'],
        problemLabel: '(2)-남학생',
        responseLabel: '남학생 수',
        hints: ['7/15 × 1020 = 476명입니다.', '476을 입력하세요.'],
        sourceText: '남학생 수',
        confidence: 0.99,
        position: { top: 77.0, left: 33.5, width: 7.0, height: 5.5 }
      },
      {
        clientKey: 'q2_girls',
        type: 'input',
        inputMode: 'integer',
        answer: '544',
        acceptedAnswers: ['544', '544명'],
        problemLabel: '(2)-여학생',
        responseLabel: '여학생 수',
        hints: ['8/15 × 1020 = 544명입니다.', '544를 입력하세요.'],
        sourceText: '여학생 수',
        confidence: 0.99,
        position: { top: 77.0, left: 58.5, width: 7.0, height: 5.5 }
      }
    ]
  },

  // Page 6: Slide 29
  {
    pageId: 'page_1787003987539_6',
    summary: '연습문제 4 - 직사각형 종이 비례배분 넓이 구하기 (정수 입력형)',
    elements: [
      {
        clientKey: 'q1',
        type: 'input',
        inputMode: 'integer',
        answer: '500',
        acceptedAnswers: ['500', '500cm²', '500cm2'],
        problemLabel: '(1)',
        responseLabel: '더 넓은 종이의 넓이',
        hints: ['전체 600의 5/6는 500cm²입니다.', '500을 입력하세요.'],
        sourceText: '더 넓은 종이의 넓이는?',
        confidence: 0.99,
        position: { top: 34.5, left: 50.0, width: 9.0, height: 5.5 }
      },
      {
        clientKey: 'q2',
        type: 'input',
        inputMode: 'integer',
        answer: '180',
        acceptedAnswers: ['180', '180cm²', '180cm2'],
        problemLabel: '(2)',
        responseLabel: '더 넓은 종이의 넓이',
        hints: ['전체 300의 3/5은 180cm²입니다.', '180을 입력하세요.'],
        sourceText: '더 넓은 종이의 넓이는?',
        confidence: 0.99,
        position: { top: 76.5, left: 35.5, width: 9.0, height: 5.5 }
      }
    ]
  },

  // Page 7: Slide 30
  {
    pageId: 'page_1787003987539_7',
    summary: '연습문제 5 - 둘레와 비례배분을 활용한 직사각형 넓이 구하기 (정수/소수 입력형)',
    elements: [
      {
        clientKey: 'q1_width',
        type: 'input',
        inputMode: 'integer',
        answer: '30',
        acceptedAnswers: ['30', '30cm'],
        problemLabel: '(1)-가로',
        responseLabel: '가로 길이',
        hints: ['가로+세로=50cm의 3/5 = 30cm입니다.', '30을 입력하세요.'],
        sourceText: '가로 3',
        confidence: 0.99,
        position: { top: 32.5, left: 35.5, width: 9.0, height: 5.5 }
      },
      {
        clientKey: 'q1_height',
        type: 'input',
        inputMode: 'integer',
        answer: '20',
        acceptedAnswers: ['20', '20cm'],
        problemLabel: '(1)-세로',
        responseLabel: '세로 길이',
        hints: ['가로+세로=50cm의 2/5 = 20cm입니다.', '20을 입력하세요.'],
        sourceText: '세로 2',
        confidence: 0.99,
        position: { top: 32.5, left: 61.0, width: 9.0, height: 5.5 }
      },
      {
        clientKey: 'q1_area',
        type: 'input',
        inputMode: 'integer',
        answer: '600',
        acceptedAnswers: ['600', '600cm²', '600cm2'],
        problemLabel: '(1)-넓이',
        responseLabel: '직사각형 넓이',
        hints: ['30 × 20 = 600cm²입니다.', '600을 입력하세요.'],
        sourceText: '직사각형의 넓이는',
        confidence: 0.99,
        position: { top: 42.0, left: 53.5, width: 8.5, height: 3.5 }
      },
      {
        clientKey: 'q2_width',
        type: 'input',
        inputMode: 'integer',
        answer: '9',
        acceptedAnswers: ['9', '9cm'],
        problemLabel: '(2)-가로',
        responseLabel: '가로 길이',
        hints: ['가로+세로=13.5cm의 2/3 = 9cm입니다.', '9를 입력하세요.'],
        sourceText: '가로 2',
        confidence: 0.99,
        position: { top: 74.5, left: 37.0, width: 9.0, height: 5.5 }
      },
      {
        clientKey: 'q2_height',
        type: 'input',
        inputMode: 'decimal',
        answer: '4.5',
        acceptedAnswers: ['4.5', '9/2', '4.5cm'],
        problemLabel: '(2)-세로',
        responseLabel: '세로 길이',
        hints: ['가로+세로=13.5cm의 1/3 = 4.5cm입니다.', '4.5를 입력하세요.'],
        sourceText: '세로 1',
        confidence: 0.99,
        position: { top: 74.5, left: 62.5, width: 9.0, height: 5.5 }
      },
      {
        clientKey: 'q2_area',
        type: 'input',
        inputMode: 'decimal',
        answer: '40.5',
        acceptedAnswers: ['40.5', '81/2', '40.5cm²', '40.5cm2'],
        problemLabel: '(2)-넓이',
        responseLabel: '직사각형 넓이',
        hints: ['9 × 4.5 = 40.5cm²입니다.', '40.5를 입력하세요.'],
        sourceText: '직사각형의 넓이는',
        confidence: 0.99,
        position: { top: 84.0, left: 53.5, width: 8.5, height: 3.5 }
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
console.log('All 7 pages generated successfully!');
