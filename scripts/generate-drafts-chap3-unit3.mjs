import fs from 'node:fs';

const unitId = 'ratios_ratio_chap3_unit3';

const pagesData = [
  // Page 1: Slide 31
  {
    pageId: 'page_1787004015251_1',
    summary: '뜻풀이 문제 1, 2, 3 - 증가율의 의미 (4지선다형)',
    elements: [
      {
        clientKey: 'q1',
        type: 'multiple-choice',
        answer: '④ 늘어난 비율',
        options: ['① 과자값', '② 뭔가 늘어났다는 건가?', '③ 계산은 싫어..ㅜㅜ', '④ 늘어난 비율'],
        problemLabel: '뜻풀이 문제 1',
        responseLabel: '증가율의 뜻',
        hints: ['증가한 크기(양)를 원래 값에 비교한 비율입니다.', '④를 선택하세요.'],
        sourceText: '증가율의 뜻은?',
        confidence: 0.99,
        position: { top: 49.0, left: 32.0, width: 54.0, height: 8.0 }
      },
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '① 원래 가격',
        options: ['① 원래 가격', '② 아무거나', '③ 변경 후 가격', '④ 주인 맘대로'],
        problemLabel: '뜻풀이 문제 2',
        responseLabel: '증가율의 기준량',
        hints: ['변하기 전의 처음(원래) 값이 기준이 됩니다.', '①을 선택하세요.'],
        sourceText: '증가율에서 기준량은?',
        confidence: 0.99,
        position: { top: 64.0, left: 32.0, width: 54.0, height: 8.0 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '② 변경 후 증가한 크기(양)',
        options: ['① 변경 후 가격', '② 변경 후 증가한 크기(양)', '③ 원래 가격', '④ 구별하기 힘드네..'],
        problemLabel: '뜻풀이 문제 3',
        responseLabel: '증가율의 비교량',
        hints: ['얼마나 늘어났는지 그 증가한 양을 비교합니다.', '②를 선택하세요.'],
        sourceText: '증가율에서 비교량은?',
        confidence: 0.99,
        position: { top: 79.0, left: 32.0, width: 54.0, height: 8.0 }
      }
    ]
  },

  // Page 2: Slide 32
  {
    pageId: 'page_1787004015251_2',
    summary: '연습문제 1 - 비교량, 기준량, 증가율 구하기 (입력 및 4지선다형)',
    elements: [
      {
        clientKey: 'q2_diff',
        type: 'input',
        inputMode: 'integer',
        answer: '30',
        acceptedAnswers: ['30', '30원'],
        problemLabel: '(2)-비교량',
        responseLabel: '비교량',
        hints: ['180 - 150 = 30원입니다.', '30을 입력하세요.'],
        sourceText: '비교량 :',
        confidence: 0.99,
        position: { top: 50.0, left: 24.5, width: 20.0, height: 3.5 }
      },
      {
        clientKey: 'q2_base',
        type: 'input',
        inputMode: 'integer',
        answer: '150',
        acceptedAnswers: ['150', '150원'],
        problemLabel: '(2)-기준량',
        responseLabel: '기준량',
        hints: ['원래 가격인 150원입니다.', '150을 입력하세요.'],
        sourceText: '기준량 :',
        confidence: 0.99,
        position: { top: 54.5, left: 24.5, width: 20.0, height: 3.5 }
      },
      {
        clientKey: 'q2_rate',
        type: 'multiple-choice',
        answer: '20%',
        options: ['20%', '0.2', '30%', '15%'],
        problemLabel: '(2)-증가율',
        responseLabel: '증가율',
        hints: ['30/150 = 1/5 = 20%입니다.', '20%를 선택하세요.'],
        sourceText: '증가율 :',
        confidence: 0.99,
        position: { top: 59.0, left: 24.5, width: 20.0, height: 3.5 }
      },
      {
        clientKey: 'q3_diff',
        type: 'input',
        inputMode: 'integer',
        answer: '100',
        acceptedAnswers: ['100', '100원'],
        problemLabel: '(3)-비교량',
        responseLabel: '비교량',
        hints: ['500 - 400 = 100원입니다.', '100을 입력하세요.'],
        sourceText: '비교량 :',
        confidence: 0.99,
        position: { top: 76.5, left: 24.5, width: 20.0, height: 3.5 }
      },
      {
        clientKey: 'q3_base',
        type: 'input',
        inputMode: 'integer',
        answer: '400',
        acceptedAnswers: ['400', '400원'],
        problemLabel: '(3)-기준량',
        responseLabel: '기준량',
        hints: ['원래 가격인 400원입니다.', '400을 입력하세요.'],
        sourceText: '기준량 :',
        confidence: 0.99,
        position: { top: 81.0, left: 24.5, width: 20.0, height: 3.5 }
      },
      {
        clientKey: 'q3_rate',
        type: 'multiple-choice',
        answer: '25%',
        options: ['25%', '0.25', '20%', '50%'],
        problemLabel: '(3)-증가율',
        responseLabel: '증가율',
        hints: ['100/400 = 1/4 = 25%입니다.', '25%를 선택하세요.'],
        sourceText: '증가율 :',
        confidence: 0.99,
        position: { top: 85.5, left: 24.5, width: 20.0, height: 3.5 }
      },
      {
        clientKey: 'q4_diff',
        type: 'input',
        inputMode: 'integer',
        answer: '50',
        acceptedAnswers: ['50', '50원'],
        problemLabel: '(4)-비교량',
        responseLabel: '비교량',
        hints: ['300 - 250 = 50원입니다.', '50을 입력하세요.'],
        sourceText: '비교량 :',
        confidence: 0.99,
        position: { top: 24.5, left: 63.0, width: 20.0, height: 3.5 }
      },
      {
        clientKey: 'q4_base',
        type: 'input',
        inputMode: 'integer',
        answer: '250',
        acceptedAnswers: ['250', '250원'],
        problemLabel: '(4)-기준량',
        responseLabel: '기준량',
        hints: ['원래 가격인 250원입니다.', '250을 입력하세요.'],
        sourceText: '기준량 :',
        confidence: 0.99,
        position: { top: 29.0, left: 63.0, width: 20.0, height: 3.5 }
      },
      {
        clientKey: 'q4_rate',
        type: 'multiple-choice',
        answer: '20%',
        options: ['20%', '0.2', '25%', '50%'],
        problemLabel: '(4)-증가율',
        responseLabel: '증가율',
        hints: ['50/250 = 1/5 = 20%입니다.', '20%를 선택하세요.'],
        sourceText: '증가율 :',
        confidence: 0.99,
        position: { top: 33.5, left: 63.0, width: 20.0, height: 3.5 }
      },
      {
        clientKey: 'q5_diff',
        type: 'input',
        inputMode: 'integer',
        answer: '30',
        acceptedAnswers: ['30', '30원'],
        problemLabel: '(5)-비교량',
        responseLabel: '비교량',
        hints: ['330 - 300 = 30원입니다.', '30을 입력하세요.'],
        sourceText: '비교량 :',
        confidence: 0.99,
        position: { top: 50.0, left: 63.0, width: 20.0, height: 3.5 }
      },
      {
        clientKey: 'q5_base',
        type: 'input',
        inputMode: 'integer',
        answer: '300',
        acceptedAnswers: ['300', '300원'],
        problemLabel: '(5)-기준량',
        responseLabel: '기준량',
        hints: ['원래 가격인 300원입니다.', '300을 입력하세요.'],
        sourceText: '기준량 :',
        confidence: 0.99,
        position: { top: 54.5, left: 63.0, width: 20.0, height: 3.5 }
      },
      {
        clientKey: 'q5_rate',
        type: 'multiple-choice',
        answer: '10%',
        options: ['10%', '0.1', '30%', '3%'],
        problemLabel: '(5)-증가율',
        responseLabel: '증가율',
        hints: ['30/300 = 1/10 = 10%입니다.', '10%를 선택하세요.'],
        sourceText: '증가율 :',
        confidence: 0.99,
        position: { top: 59.0, left: 63.0, width: 20.0, height: 3.5 }
      },
      {
        clientKey: 'q6_diff',
        type: 'input',
        inputMode: 'integer',
        answer: '150',
        acceptedAnswers: ['150', '150원'],
        problemLabel: '(6)-비교량',
        responseLabel: '비교량',
        hints: ['650 - 500 = 150원입니다.', '150을 입력하세요.'],
        sourceText: '비교량 :',
        confidence: 0.99,
        position: { top: 76.5, left: 63.0, width: 20.0, height: 3.5 }
      },
      {
        clientKey: 'q6_base',
        type: 'input',
        inputMode: 'integer',
        answer: '500',
        acceptedAnswers: ['500', '500원'],
        problemLabel: '(6)-기준량',
        responseLabel: '기준량',
        hints: ['원래 가격인 500원입니다.', '500을 입력하세요.'],
        sourceText: '기준량 :',
        confidence: 0.99,
        position: { top: 81.0, left: 63.0, width: 20.0, height: 3.5 }
      },
      {
        clientKey: 'q6_rate',
        type: 'multiple-choice',
        answer: '30%',
        options: ['30%', '0.3', '15%', '50%'],
        problemLabel: '(6)-증가율',
        responseLabel: '증가율',
        hints: ['150/500 = 3/10 = 30%입니다.', '30%를 선택하세요.'],
        sourceText: '증가율 :',
        confidence: 0.99,
        position: { top: 85.5, left: 63.0, width: 20.0, height: 3.5 }
      }
    ]
  },

  // Page 3: Slide 33
  {
    pageId: 'page_1787004015251_3',
    summary: '연습문제 2 - 바 모델에서 증가율 구하기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '50%',
        options: ['50%', '100%', '25%', '33.3%'],
        problemLabel: '(2)',
        responseLabel: '증가율',
        hints: ['증가량 100 / 기준량 200 = 50%입니다.', '50%를 선택하세요.'],
        sourceText: '원래 200, 변경 후 300',
        confidence: 0.99,
        position: { top: 46.0, left: 56.5, width: 26.0, height: 3.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '80%',
        options: ['80%', '40%', '60%', '120%'],
        problemLabel: '(3)',
        responseLabel: '증가율',
        hints: ['증가량 120 / 기준량 150 = 80%입니다.', '80%를 선택하세요.'],
        sourceText: '원래 150, 변경 후 270',
        confidence: 0.99,
        position: { top: 66.5, left: 56.5, width: 26.0, height: 3.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '30%',
        options: ['30%', '90%', '15%', '33%'],
        problemLabel: '(4)',
        responseLabel: '증가율',
        hints: ['증가량 90 / 기준량 300 = 30%입니다.', '30%를 선택하세요.'],
        sourceText: '원래 300, 변경 후 390',
        confidence: 0.99,
        position: { top: 86.5, left: 56.5, width: 26.0, height: 3.5 }
      }
    ]
  },

  // Page 4: Slide 34
  {
    pageId: 'page_1787004015251_4',
    summary: '연습문제 3 - 증가율로 증가량 x값 구하기 (정수 입력형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'input',
        inputMode: 'integer',
        answer: '80',
        acceptedAnswers: ['80', 'x=80', 'x = 80'],
        problemLabel: '(2)',
        responseLabel: '증가량 x',
        hints: ['200 × 40/100 = 80입니다.', '80을 입력하세요.'],
        sourceText: '원래 200, 증가율 40%',
        confidence: 0.99,
        position: { top: 46.0, left: 16.0, width: 67.0, height: 3.5 }
      },
      {
        clientKey: 'q3',
        type: 'input',
        inputMode: 'integer',
        answer: '90',
        acceptedAnswers: ['90', 'x=90', 'x = 90'],
        problemLabel: '(3)',
        responseLabel: '증가량 x',
        hints: ['150 × 60/100 = 90입니다.', '90을 입력하세요.'],
        sourceText: '원래 150, 증가율 60%',
        confidence: 0.99,
        position: { top: 66.5, left: 16.0, width: 67.0, height: 3.5 }
      },
      {
        clientKey: 'q4',
        type: 'input',
        inputMode: 'integer',
        answer: '60',
        acceptedAnswers: ['60', 'x=60', 'x = 60'],
        problemLabel: '(4)',
        responseLabel: '증가량 x',
        hints: ['300 × 20/100 = 60입니다.', '60을 입력하세요.'],
        sourceText: '원래 300, 증가율 20%',
        confidence: 0.99,
        position: { top: 86.5, left: 16.0, width: 67.0, height: 3.5 }
      }
    ]
  },

  // Page 5: Slide 35
  {
    pageId: 'page_1787004015251_5',
    summary: '연습문제 4 - 증가량과 변경 후 가격 구하기 (정수 입력형)',
    elements: [
      {
        clientKey: 'q2_diff',
        type: 'input',
        inputMode: 'integer',
        answer: '210',
        acceptedAnswers: ['210', '210원'],
        problemLabel: '(2)-증가량',
        responseLabel: '증가량',
        hints: ['700 × 30/100 = 210원입니다.', '210을 입력하세요.'],
        sourceText: '증가량 :',
        confidence: 0.99,
        position: { top: 80.5, left: 24.5, width: 20.0, height: 3.5 }
      },
      {
        clientKey: 'q2_total',
        type: 'input',
        inputMode: 'integer',
        answer: '910',
        acceptedAnswers: ['910', '910원'],
        problemLabel: '(2)-변경후가격',
        responseLabel: '변경 후 가격',
        hints: ['700 + 210 = 910원입니다.', '910을 입력하세요.'],
        sourceText: '변경 후 가격 :',
        confidence: 0.99,
        position: { top: 85.0, left: 28.5, width: 19.5, height: 3.5 }
      },
      {
        clientKey: 'q3_diff',
        type: 'input',
        inputMode: 'integer',
        answer: '50',
        acceptedAnswers: ['50', '50원'],
        problemLabel: '(3)-증가량',
        responseLabel: '증가량',
        hints: ['500 × 10/100 = 50원입니다.', '50을 입력하세요.'],
        sourceText: '증가량 :',
        confidence: 0.99,
        position: { top: 59.5, left: 62.0, width: 20.0, height: 3.5 }
      },
      {
        clientKey: 'q3_total',
        type: 'input',
        inputMode: 'integer',
        answer: '550',
        acceptedAnswers: ['550', '550원'],
        problemLabel: '(3)-변경후가격',
        responseLabel: '변경 후 가격',
        hints: ['500 + 50 = 550원입니다.', '550을 입력하세요.'],
        sourceText: '변경 후 가격 :',
        confidence: 0.99,
        position: { top: 64.0, left: 66.0, width: 19.5, height: 3.5 }
      },
      {
        clientKey: 'q4_diff',
        type: 'input',
        inputMode: 'integer',
        answer: '250',
        acceptedAnswers: ['250', '250원'],
        problemLabel: '(4)-증가량',
        responseLabel: '증가량',
        hints: ['250 × 100/100 = 250원입니다.', '250을 입력하세요.'],
        sourceText: '증가량 :',
        confidence: 0.99,
        position: { top: 80.5, left: 62.0, width: 20.0, height: 3.5 }
      },
      {
        clientKey: 'q4_total',
        type: 'input',
        inputMode: 'integer',
        answer: '500',
        acceptedAnswers: ['500', '500원'],
        problemLabel: '(4)-변경후가격',
        responseLabel: '변경 후 가격',
        hints: ['250 + 250 = 500원입니다.', '500을 입력하세요.'],
        sourceText: '변경 후 가격 :',
        confidence: 0.99,
        position: { top: 85.0, left: 66.0, width: 19.5, height: 3.5 }
      }
    ]
  },

  // Page 6: Slide 36
  {
    pageId: 'page_1787004015251_6',
    summary: '연습문제 5 - 증가량과 변경 후 가격 구하기 (정수 입력형)',
    elements: [
      {
        clientKey: 'q1_diff',
        type: 'input',
        inputMode: 'integer',
        answer: '100',
        acceptedAnswers: ['100', '100원'],
        problemLabel: '(1)-증가량',
        responseLabel: '증가량',
        hints: ['400 × 25/100 = 100원입니다.', '100을 입력하세요.'],
        sourceText: '증가량 :',
        confidence: 0.99,
        position: { top: 23.5, left: 24.5, width: 20.0, height: 3.5 }
      },
      {
        clientKey: 'q1_total',
        type: 'input',
        inputMode: 'integer',
        answer: '500',
        acceptedAnswers: ['500', '500원'],
        problemLabel: '(1)-변경후가격',
        responseLabel: '변경 후 가격',
        hints: ['400 + 100 = 500원입니다.', '500을 입력하세요.'],
        sourceText: '변경 후 가격 :',
        confidence: 0.99,
        position: { top: 27.5, left: 28.5, width: 19.5, height: 3.5 }
      },
      {
        clientKey: 'q2_diff',
        type: 'input',
        inputMode: 'integer',
        answer: '260',
        acceptedAnswers: ['260', '260원'],
        problemLabel: '(2)-증가량',
        responseLabel: '증가량',
        hints: ['650 × 40/100 = 260원입니다.', '260을 입력하세요.'],
        sourceText: '증가량 :',
        confidence: 0.99,
        position: { top: 43.0, left: 24.5, width: 20.0, height: 3.5 }
      },
      {
        clientKey: 'q2_total',
        type: 'input',
        inputMode: 'integer',
        answer: '910',
        acceptedAnswers: ['910', '910원'],
        problemLabel: '(2)-변경후가격',
        responseLabel: '변경 후 가격',
        hints: ['650 + 260 = 910원입니다.', '910을 입력하세요.'],
        sourceText: '변경 후 가격 :',
        confidence: 0.99,
        position: { top: 47.0, left: 28.5, width: 19.5, height: 3.5 }
      },
      {
        clientKey: 'q3_diff',
        type: 'input',
        inputMode: 'integer',
        answer: '1120',
        acceptedAnswers: ['1120', '1120원'],
        problemLabel: '(3)-증가량',
        responseLabel: '증가량',
        hints: ['1400 × 80/100 = 1120원입니다.', '1120을 입력하세요.'],
        sourceText: '증가량 :',
        confidence: 0.99,
        position: { top: 62.0, left: 24.5, width: 20.0, height: 3.5 }
      },
      {
        clientKey: 'q3_total',
        type: 'input',
        inputMode: 'integer',
        answer: '2520',
        acceptedAnswers: ['2520', '2520원'],
        problemLabel: '(3)-변경후가격',
        responseLabel: '변경 후 가격',
        hints: ['1400 + 1120 = 2520원입니다.', '2520을 입력하세요.'],
        sourceText: '변경 후 가격 :',
        confidence: 0.99,
        position: { top: 66.0, left: 28.5, width: 19.5, height: 3.5 }
      },
      {
        clientKey: 'q4_diff',
        type: 'input',
        inputMode: 'integer',
        answer: '210',
        acceptedAnswers: ['210', '210원'],
        problemLabel: '(4)-증가량',
        responseLabel: '증가량',
        hints: ['7000 × 3/100 = 210원입니다.', '210을 입력하세요.'],
        sourceText: '증가량 :',
        confidence: 0.99,
        position: { top: 81.5, left: 24.5, width: 20.0, height: 3.5 }
      },
      {
        clientKey: 'q4_total',
        type: 'input',
        inputMode: 'integer',
        answer: '7210',
        acceptedAnswers: ['7210', '7210원'],
        problemLabel: '(4)-변경후가격',
        responseLabel: '변경 후 가격',
        hints: ['7000 + 210 = 7210원입니다.', '7210을 입력하세요.'],
        sourceText: '변경 후 가격 :',
        confidence: 0.99,
        position: { top: 85.5, left: 28.5, width: 19.5, height: 3.5 }
      },
      {
        clientKey: 'q5_diff',
        type: 'input',
        inputMode: 'integer',
        answer: '55',
        acceptedAnswers: ['55', '55원'],
        problemLabel: '(5)-증가량',
        responseLabel: '증가량',
        hints: ['500 × 11/100 = 55원입니다.', '55를 입력하세요.'],
        sourceText: '증가량 :',
        confidence: 0.99,
        position: { top: 23.5, left: 62.5, width: 20.0, height: 3.5 }
      },
      {
        clientKey: 'q5_total',
        type: 'input',
        inputMode: 'integer',
        answer: '555',
        acceptedAnswers: ['555', '555원'],
        problemLabel: '(5)-변경후가격',
        responseLabel: '변경 후 가격',
        hints: ['500 + 55 = 555원입니다.', '555를 입력하세요.'],
        sourceText: '변경 후 가격 :',
        confidence: 0.99,
        position: { top: 27.5, left: 66.5, width: 19.5, height: 3.5 }
      },
      {
        clientKey: 'q6_diff',
        type: 'input',
        inputMode: 'integer',
        answer: '990',
        acceptedAnswers: ['990', '990원'],
        problemLabel: '(6)-증가량',
        responseLabel: '증가량',
        hints: ['900 × 110/100 = 990원입니다.', '990을 입력하세요.'],
        sourceText: '증가량 :',
        confidence: 0.99,
        position: { top: 43.0, left: 62.5, width: 20.0, height: 3.5 }
      },
      {
        clientKey: 'q6_total',
        type: 'input',
        inputMode: 'integer',
        answer: '1890',
        acceptedAnswers: ['1890', '1890원'],
        problemLabel: '(6)-변경후가격',
        responseLabel: '변경 후 가격',
        hints: ['900 + 990 = 1890원입니다.', '1890을 입력하세요.'],
        sourceText: '변경 후 가격 :',
        confidence: 0.99,
        position: { top: 47.0, left: 66.5, width: 19.5, height: 3.5 }
      },
      {
        clientKey: 'q7_diff',
        type: 'input',
        inputMode: 'integer',
        answer: '300',
        acceptedAnswers: ['300', '300원'],
        problemLabel: '(7)-증가량',
        responseLabel: '증가량',
        hints: ['5000 × 6/100 = 300원입니다.', '300을 입력하세요.'],
        sourceText: '증가량 :',
        confidence: 0.99,
        position: { top: 62.0, left: 62.5, width: 20.0, height: 3.5 }
      },
      {
        clientKey: 'q7_total',
        type: 'input',
        inputMode: 'integer',
        answer: '5300',
        acceptedAnswers: ['5300', '5300원'],
        problemLabel: '(7)-변경후가격',
        responseLabel: '변경 후 가격',
        hints: ['5000 + 300 = 5300원입니다.', '5300을 입력하세요.'],
        sourceText: '변경 후 가격 :',
        confidence: 0.99,
        position: { top: 66.0, left: 66.5, width: 19.5, height: 3.5 }
      },
      {
        clientKey: 'q8_diff',
        type: 'input',
        inputMode: 'integer',
        answer: '10',
        acceptedAnswers: ['10', '10원'],
        problemLabel: '(8)-증가량',
        responseLabel: '증가량',
        hints: ['1000 × 1/100 = 10원입니다.', '10을 입력하세요.'],
        sourceText: '증가량 :',
        confidence: 0.99,
        position: { top: 81.5, left: 62.5, width: 20.0, height: 3.5 }
      },
      {
        clientKey: 'q8_total',
        type: 'input',
        inputMode: 'integer',
        answer: '1010',
        acceptedAnswers: ['1010', '1010원'],
        problemLabel: '(8)-변경후가격',
        responseLabel: '변경 후 가격',
        hints: ['1000 + 10 = 1010원입니다.', '1010을 입력하세요.'],
        sourceText: '변경 후 가격 :',
        confidence: 0.99,
        position: { top: 85.5, left: 66.5, width: 19.5, height: 3.5 }
      }
    ]
  },

  // Page 7: Slide 37
  {
    pageId: 'page_1787004015251_7',
    summary: '연습문제 6 - 증가량 x값 구하기 (정수 입력형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'input',
        inputMode: 'integer',
        answer: '72',
        acceptedAnswers: ['72', 'x=72', 'x = 72'],
        problemLabel: '(2)',
        responseLabel: '증가량 x',
        hints: ['180 × 40/100 = 72입니다.', '72를 입력하세요.'],
        sourceText: '원래 180, 증가율 40%',
        confidence: 0.99,
        position: { top: 46.0, left: 16.0, width: 67.0, height: 3.5 }
      },
      {
        clientKey: 'q3',
        type: 'input',
        inputMode: 'integer',
        answer: '96',
        acceptedAnswers: ['96', 'x=96', 'x = 96'],
        problemLabel: '(3)',
        responseLabel: '증가량 x',
        hints: ['160 × 60/100 = 96입니다.', '96을 입력하세요.'],
        sourceText: '원래 160, 증가율 60%',
        confidence: 0.99,
        position: { top: 66.5, left: 16.0, width: 67.0, height: 3.5 }
      },
      {
        clientKey: 'q4',
        type: 'input',
        inputMode: 'integer',
        answer: '40',
        acceptedAnswers: ['40', 'x=40', 'x = 40'],
        problemLabel: '(4)',
        responseLabel: '증가량 x',
        hints: ['200 × 20/100 = 40입니다.', '40을 입력하세요.'],
        sourceText: '원래 200, 증가율 20%',
        confidence: 0.99,
        position: { top: 86.5, left: 16.0, width: 67.0, height: 3.5 }
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
