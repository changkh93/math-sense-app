import fs from 'node:fs';

const unitId = 'ratios_ratio_chap3_unit4';

const pagesData = [
  // Page 1: Slide 38
  {
    pageId: 'page_1787004038423_1',
    summary: '뜻풀이 문제 1, 2, 3 - 할인의 의미와 기준량, 비교량 (4지선다형)',
    elements: [
      {
        clientKey: 'q1',
        type: 'multiple-choice',
        answer: '④ 덜어 내다',
        options: ['① 사기 쳤다', '② 속았다', '③ 할 수 없이 인정', '④ 덜어 내다'],
        problemLabel: '뜻풀이 문제 1',
        responseLabel: '할인의 뜻',
        hints: ['일정한 값에서 얼마를 덜어 낸다는(깎아 준다는) 뜻입니다.', '④를 선택하세요.'],
        sourceText: '할인의 뜻은?',
        confidence: 0.99,
        position: { top: 49.0, left: 32.0, width: 54.0, height: 8.0 }
      },
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '② 원래 가격',
        options: ['① 깎아준 가격', '② 원래 가격', '③ 변경 후 가격', '④ 할인마트 알바'],
        problemLabel: '뜻풀이 문제 2',
        responseLabel: '할인율의 기준량',
        hints: ['할인하기 전의 정해진 원래 가격이 기준이 됩니다.', '②를 선택하세요.'],
        sourceText: '할인율에서 기준량은?',
        confidence: 0.99,
        position: { top: 64.0, left: 32.0, width: 54.0, height: 8.0 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '② 덜어 낸 가격',
        options: ['① 변경 후 가격', '② 덜어 낸 가격', '③ 원래 가격', '④ 아이고 힘들어.'],
        problemLabel: '뜻풀이 문제 3',
        responseLabel: '할인율의 비교량',
        hints: ['얼마나 깎아주었는지 덜어 낸 가격을 비교합니다.', '②를 선택하세요.'],
        sourceText: '할인율에서 비교량은?',
        confidence: 0.99,
        position: { top: 79.0, left: 32.0, width: 54.0, height: 8.0 }
      }
    ]
  },

  // Page 2: Slide 39
  {
    pageId: 'page_1787004038423_2',
    summary: '연습문제 1 - 비교량, 기준량, 할인율 구하기 (입력 및 4지선다형)',
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
        answer: '180',
        acceptedAnswers: ['180', '180원'],
        problemLabel: '(2)-기준량',
        responseLabel: '기준량',
        hints: ['원래 가격인 180원입니다.', '180을 입력하세요.'],
        sourceText: '기준량 :',
        confidence: 0.99,
        position: { top: 54.5, left: 24.5, width: 20.0, height: 3.5 }
      },
      {
        clientKey: 'q2_rate',
        type: 'multiple-choice',
        answer: '$\\frac{1}{6}$ 또는 약 16.7%',
        options: ['$\\frac{1}{6}$ 또는 약 16.7%', '20%', '30%', '10%'],
        problemLabel: '(2)-할인율',
        responseLabel: '할인율',
        hints: ['30/180 = 1/6 (약 16.7%)입니다.', '$\\frac{1}{6}$ 또는 약 16.7%를 선택하세요.'],
        sourceText: '할인율 :',
        confidence: 0.99,
        position: { top: 59.0, left: 24.5, width: 20.0, height: 3.5 }
      },
      {
        clientKey: 'q3_diff',
        type: 'input',
        inputMode: 'integer',
        answer: '500',
        acceptedAnswers: ['500', '500원'],
        problemLabel: '(3)-비교량',
        responseLabel: '비교량',
        hints: ['1000 - 500 = 500원입니다.', '500을 입력하세요.'],
        sourceText: '비교량 :',
        confidence: 0.99,
        position: { top: 76.5, left: 24.5, width: 20.0, height: 3.5 }
      },
      {
        clientKey: 'q3_base',
        type: 'input',
        inputMode: 'integer',
        answer: '1000',
        acceptedAnswers: ['1000', '1000원'],
        problemLabel: '(3)-기준량',
        responseLabel: '기준량',
        hints: ['원래 가격인 1000원입니다.', '1000을 입력하세요.'],
        sourceText: '기준량 :',
        confidence: 0.99,
        position: { top: 81.0, left: 24.5, width: 20.0, height: 3.5 }
      },
      {
        clientKey: 'q3_rate',
        type: 'multiple-choice',
        answer: '50%',
        options: ['50%', '0.5', '25%', '100%'],
        problemLabel: '(3)-할인율',
        responseLabel: '할인율',
        hints: ['500/1000 = 1/2 = 50%입니다.', '50%를 선택하세요.'],
        sourceText: '할인율 :',
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
        answer: '300',
        acceptedAnswers: ['300', '300원'],
        problemLabel: '(4)-기준량',
        responseLabel: '기준량',
        hints: ['원래 가격인 300원입니다.', '300을 입력하세요.'],
        sourceText: '기준량 :',
        confidence: 0.99,
        position: { top: 29.0, left: 63.0, width: 20.0, height: 3.5 }
      },
      {
        clientKey: 'q4_rate',
        type: 'multiple-choice',
        answer: '$\\frac{1}{6}$ 또는 약 16.7%',
        options: ['$\\frac{1}{6}$ 또는 약 16.7%', '20%', '25%', '50%'],
        problemLabel: '(4)-할인율',
        responseLabel: '할인율',
        hints: ['50/300 = 1/6 (약 16.7%)입니다.', '$\\frac{1}{6}$ 또는 약 16.7%를 선택하세요.'],
        sourceText: '할인율 :',
        confidence: 0.99,
        position: { top: 33.5, left: 63.0, width: 20.0, height: 3.5 }
      },
      {
        clientKey: 'q5_diff',
        type: 'input',
        inputMode: 'integer',
        answer: '300',
        acceptedAnswers: ['300', '300원'],
        problemLabel: '(5)-비교량',
        responseLabel: '비교량',
        hints: ['3000 - 2700 = 300원입니다.', '300을 입력하세요.'],
        sourceText: '비교량 :',
        confidence: 0.99,
        position: { top: 50.0, left: 63.0, width: 20.0, height: 3.5 }
      },
      {
        clientKey: 'q5_base',
        type: 'input',
        inputMode: 'integer',
        answer: '3000',
        acceptedAnswers: ['3000', '3000원'],
        problemLabel: '(5)-기준량',
        responseLabel: '기준량',
        hints: ['원래 가격인 3000원입니다.', '3000을 입력하세요.'],
        sourceText: '기준량 :',
        confidence: 0.99,
        position: { top: 54.5, left: 63.0, width: 20.0, height: 3.5 }
      },
      {
        clientKey: 'q5_rate',
        type: 'multiple-choice',
        answer: '10%',
        options: ['10%', '0.1', '30%', '3%'],
        problemLabel: '(5)-할인율',
        responseLabel: '할인율',
        hints: ['300/3000 = 1/10 = 10%입니다.', '10%를 선택하세요.'],
        sourceText: '할인율 :',
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
        hints: ['600 - 450 = 150원입니다.', '150을 입력하세요.'],
        sourceText: '비교량 :',
        confidence: 0.99,
        position: { top: 76.5, left: 63.0, width: 20.0, height: 3.5 }
      },
      {
        clientKey: 'q6_base',
        type: 'input',
        inputMode: 'integer',
        answer: '600',
        acceptedAnswers: ['600', '600원'],
        problemLabel: '(6)-기준량',
        responseLabel: '기준량',
        hints: ['원래 가격인 600원입니다.', '600을 입력하세요.'],
        sourceText: '기준량 :',
        confidence: 0.99,
        position: { top: 81.0, left: 63.0, width: 20.0, height: 3.5 }
      },
      {
        clientKey: 'q6_rate',
        type: 'multiple-choice',
        answer: '25%',
        options: ['25%', '0.25', '20%', '15%'],
        problemLabel: '(6)-할인율',
        responseLabel: '할인율',
        hints: ['150/600 = 1/4 = 25%입니다.', '25%를 선택하세요.'],
        sourceText: '할인율 :',
        confidence: 0.99,
        position: { top: 85.5, left: 63.0, width: 20.0, height: 3.5 }
      }
    ]
  },

  // Page 3: Slide 40
  {
    pageId: 'page_1787004038423_3',
    summary: '연습문제 2 - 할인율을 뺀 비율을 퍼센트로 나타내기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2_bar',
        type: 'multiple-choice',
        answer: '61%',
        options: ['61%', '39%', '71%', '51%'],
        problemLabel: '(2)-선분아래',
        responseLabel: '할인 후 비율',
        hints: ['100% - 39% = 61%입니다.', '61%를 선택하세요.'],
        sourceText: '할인 후 비율',
        confidence: 0.99,
        position: { top: 79.5, left: 26.0, width: 6.8, height: 4.0 }
      },
      {
        clientKey: 'q2_text',
        type: 'multiple-choice',
        answer: '61%',
        options: ['61%', '39%', '71%', '51%'],
        problemLabel: '(2)-정가의',
        responseLabel: '정가의 비율',
        hints: ['할인율 39%이면 정가의 61% 가격입니다.', '61%를 선택하세요.'],
        sourceText: '정가의 [ ]',
        confidence: 0.99,
        position: { top: 82.5, left: 77.0, width: 6.8, height: 4.0 }
      }
    ]
  },

  // Page 4: Slide 41
  {
    pageId: 'page_1787004038423_4',
    summary: '연습문제 3 - 할인율을 뺀 비율을 퍼센트로 나타내기 (4지선다형)',
    elements: [
      {
        clientKey: 'q1_bar',
        type: 'multiple-choice',
        answer: '81%',
        options: ['81%', '19%', '71%', '91%'],
        problemLabel: '(1)-선분아래',
        responseLabel: '할인 후 비율',
        hints: ['100% - 19% = 81%입니다.', '81%를 선택하세요.'],
        sourceText: '할인 후 비율',
        confidence: 0.99,
        position: { top: 20.5, left: 30.0, width: 6.8, height: 4.0 }
      },
      {
        clientKey: 'q1_text',
        type: 'multiple-choice',
        answer: '81%',
        options: ['81%', '19%', '71%', '91%'],
        problemLabel: '(1)-정가의',
        responseLabel: '정가의 비율',
        hints: ['할인율 19%이면 정가의 81% 가격입니다.', '81%를 선택하세요.'],
        sourceText: '정가의 [ ]',
        confidence: 0.99,
        position: { top: 24.0, left: 77.0, width: 6.8, height: 4.0 }
      },
      {
        clientKey: 'q2_bar',
        type: 'multiple-choice',
        answer: '40%',
        options: ['40%', '60%', '50%', '30%'],
        problemLabel: '(2)-선분아래',
        responseLabel: '할인 후 비율',
        hints: ['100% - 60% = 40%입니다.', '40%를 선택하세요.'],
        sourceText: '할인 후 비율',
        confidence: 0.99,
        position: { top: 41.0, left: 22.0, width: 6.8, height: 4.0 }
      },
      {
        clientKey: 'q2_text',
        type: 'multiple-choice',
        answer: '40%',
        options: ['40%', '60%', '50%', '30%'],
        problemLabel: '(2)-정가의',
        responseLabel: '정가의 비율',
        hints: ['할인율 60%이면 정가의 40% 가격입니다.', '40%를 선택하세요.'],
        sourceText: '정가의 [ ]',
        confidence: 0.99,
        position: { top: 44.0, left: 77.0, width: 6.8, height: 4.0 }
      },
      {
        clientKey: 'q3_bar',
        type: 'multiple-choice',
        answer: '65%',
        options: ['65%', '35%', '75%', '55%'],
        problemLabel: '(3)-선분아래',
        responseLabel: '할인 후 비율',
        hints: ['100% - 35% = 65%입니다.', '65%를 선택하세요.'],
        sourceText: '할인 후 비율',
        confidence: 0.99,
        position: { top: 61.0, left: 27.0, width: 6.8, height: 4.0 }
      },
      {
        clientKey: 'q3_text',
        type: 'multiple-choice',
        answer: '65%',
        options: ['65%', '35%', '75%', '55%'],
        problemLabel: '(3)-정가의',
        responseLabel: '정가의 비율',
        hints: ['할인율 35%이면 정가의 65% 가격입니다.', '65%를 선택하세요.'],
        sourceText: '정가의 [ ]',
        confidence: 0.99,
        position: { top: 64.0, left: 77.0, width: 6.8, height: 4.0 }
      },
      {
        clientKey: 'q4_bar',
        type: 'multiple-choice',
        answer: '49%',
        options: ['49%', '51%', '39%', '59%'],
        problemLabel: '(4)-선분아래',
        responseLabel: '할인 후 비율',
        hints: ['100% - 51% = 49%입니다.', '49%를 선택하세요.'],
        sourceText: '할인 후 비율',
        confidence: 0.99,
        position: { top: 80.5, left: 24.0, width: 6.8, height: 4.0 }
      },
      {
        clientKey: 'q4_text',
        type: 'multiple-choice',
        answer: '49%',
        options: ['49%', '51%', '39%', '59%'],
        problemLabel: '(4)-정가의',
        responseLabel: '정가의 비율',
        hints: ['할인율 51%이면 정가의 49% 가격입니다.', '49%를 선택하세요.'],
        sourceText: '정가의 [ ]',
        confidence: 0.99,
        position: { top: 84.0, left: 77.0, width: 6.8, height: 4.0 }
      }
    ]
  },

  // Page 5: Slide 42
  {
    pageId: 'page_1787004038423_5',
    summary: '연습문제 4 - 판매가 x값 구하기 (정수 입력형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'input',
        inputMode: 'integer',
        answer: '3200',
        acceptedAnswers: ['3200', '3200원', 'x=3200'],
        problemLabel: '(2)',
        responseLabel: '판매가 x',
        hints: ['8000 × 40/100 = 3200원입니다.', '3200을 입력하세요.'],
        sourceText: '정가 8000원, 60% 할인',
        confidence: 0.99,
        position: { top: 46.0, left: 16.0, width: 67.0, height: 3.5 }
      },
      {
        clientKey: 'q3',
        type: 'input',
        inputMode: 'integer',
        answer: '6500',
        acceptedAnswers: ['6500', '6500원', 'x=6500'],
        problemLabel: '(3)',
        responseLabel: '판매가 x',
        hints: ['10000 × 65/100 = 6500원입니다.', '6500을 입력하세요.'],
        sourceText: '정가 10000원, 35% 할인',
        confidence: 0.99,
        position: { top: 66.5, left: 16.0, width: 67.0, height: 3.5 }
      },
      {
        clientKey: 'q4',
        type: 'input',
        inputMode: 'integer',
        answer: '2450',
        acceptedAnswers: ['2450', '2450원', 'x=2450'],
        problemLabel: '(4)',
        responseLabel: '판매가 x',
        hints: ['5000 × 49/100 = 2450원입니다.', '2450을 입력하세요.'],
        sourceText: '정가 5000원, 51% 할인',
        confidence: 0.99,
        position: { top: 86.5, left: 16.0, width: 67.0, height: 3.5 }
      }
    ]
  },

  // Page 6: Slide 43
  {
    pageId: 'page_1787004038423_6',
    summary: '연습문제 5 - 실제 판 가격(판매가) 구하기 (정수 입력형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'input',
        inputMode: 'integer',
        answer: '4800',
        acceptedAnswers: ['4800', '4800원'],
        problemLabel: '(2)',
        responseLabel: '판매가',
        hints: ['6000 × 80/100 = 4800원입니다.', '4800을 입력하세요.'],
        sourceText: '6000원짜리를 20% 할인',
        confidence: 0.99,
        position: { top: 59.0, left: 18.0, width: 26.0, height: 3.5 }
      },
      {
        clientKey: 'q3',
        type: 'input',
        inputMode: 'integer',
        answer: '0',
        acceptedAnswers: ['0', '0원', '무료'],
        problemLabel: '(3)',
        responseLabel: '판매가',
        hints: ['100% 할인(전액 할인)이므로 0원입니다.', '0을 입력하세요.'],
        sourceText: '3000원짜리를 100% 할인',
        confidence: 0.99,
        position: { top: 85.0, left: 18.0, width: 26.0, height: 3.5 }
      },
      {
        clientKey: 'q4',
        type: 'input',
        inputMode: 'integer',
        answer: '3500',
        acceptedAnswers: ['3500', '3500원'],
        problemLabel: '(4)',
        responseLabel: '판매가',
        hints: ['5000 × 70/100 = 3500원입니다.', '3500을 입력하세요.'],
        sourceText: '5000원짜리를 70% 가격에',
        confidence: 0.99,
        position: { top: 33.0, left: 55.5, width: 26.0, height: 3.5 }
      },
      {
        clientKey: 'q5',
        type: 'input',
        inputMode: 'integer',
        answer: '6400',
        acceptedAnswers: ['6400', '6400원'],
        problemLabel: '(5)',
        responseLabel: '판매가',
        hints: ['8000 × 80/100 = 6400원입니다.', '6400을 입력하세요.'],
        sourceText: '8000원짜리를 80% 가격에',
        confidence: 0.99,
        position: { top: 59.0, left: 55.5, width: 26.0, height: 3.5 }
      },
      {
        clientKey: 'q6',
        type: 'input',
        inputMode: 'integer',
        answer: '6300',
        acceptedAnswers: ['6300', '6300원'],
        problemLabel: '(6)',
        responseLabel: '판매가',
        hints: ['7000 × 90/100 = 6300원입니다.', '6300을 입력하세요.'],
        sourceText: '7000원짜리를 90% 가격에',
        confidence: 0.99,
        position: { top: 85.0, left: 55.5, width: 26.0, height: 3.5 }
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
console.log('All 6 pages generated successfully!');
