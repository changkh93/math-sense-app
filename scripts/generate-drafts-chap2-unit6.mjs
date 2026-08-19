import fs from 'node:fs';

const unitId = 'ratios_ratio_chap2_unit6';

const pagesData = [
  // Page 1: Slide 145
  {
    pageId: 'page_1786934069441_1',
    summary: '뜻풀이 문제 1, 2, 3 - 퍼센트와 백분율의 의미 (4지선다형)',
    elements: [
      {
        clientKey: 'q1',
        type: 'multiple-choice',
        answer: '② 100개당',
        options: ['① 처음 들어요.', '② 100개당', '③ 퍼퍼퍼.. 흑흑', '④ 1000개당'],
        problemLabel: '뜻풀이 문제 1',
        responseLabel: '퍼센트의 말뜻',
        hints: ['per(~당) + cent(100)의 합성어입니다.', '②를 선택하세요.'],
        sourceText: '퍼센트의 말뜻',
        confidence: 0.99,
        position: { top: 49.0, left: 32.0, width: 54.0, height: 8.0 }
      },
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '① $\\frac{1}{100}$',
        options: ['① $\\frac{1}{100}$', '② $\\frac{1}{10}$', '③ 의미 없음', '④ 해도해도 너무하네'],
        problemLabel: '뜻풀이 문제 2',
        responseLabel: '퍼센트 기호의 의미',
        hints: ['%는 1/100을 의미하는 기호입니다.', '①을 선택하세요.'],
        sourceText: '퍼센트 기호 %의 의미',
        confidence: 0.99,
        position: { top: 64.0, left: 32.0, width: 54.0, height: 8.0 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '③ 100개로 나눈 비율',
        options: ['① 흰 가루의 비율', '② 뽕~', '③ 100개로 나눈 비율', '④ 100분의 시간'],
        problemLabel: '뜻풀이 문제 3',
        responseLabel: '백분율의 말뜻',
        hints: ['백(100)으로 나눈(분) 비율(율)을 의미합니다.', '③을 선택하세요.'],
        sourceText: '백분율의 말뜻',
        confidence: 0.99,
        position: { top: 79.0, left: 32.0, width: 54.0, height: 8.0 }
      }
    ]
  },

  // Page 2: Slide 146
  {
    pageId: 'page_1786934069441_2',
    summary: '표현문제 1 - 백분율을 분수로 나타내기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '$\\frac{15.2}{100}$',
        options: ['$\\frac{15.2}{100}$', '$\\frac{1.52}{100}$', '$\\frac{152}{100}$', '$\\frac{15.2}{10}$'],
        problemLabel: '(2)',
        responseLabel: '분수 표현',
        hints: ['% 자리에 분모 100을 넣으세요.', '$\\frac{15.2}{100}$를 선택하세요.'],
        sourceText: '15.2%',
        confidence: 0.99,
        position: { top: 37.0, left: 34.5, width: 8.5, height: 8.0 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '$\\frac{1234}{100}$',
        options: ['$\\frac{1234}{100}$', '$\\frac{123.4}{100}$', '$\\frac{1234}{1000}$', '$\\frac{12.34}{100}$'],
        problemLabel: '(3)',
        responseLabel: '분수 표현',
        hints: ['% 자리에 분모 100을 넣으세요.', '$\\frac{1234}{100}$를 선택하세요.'],
        sourceText: '1234%',
        confidence: 0.99,
        position: { top: 57.0, left: 34.5, width: 8.5, height: 8.0 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '$\\frac{26}{100}$',
        options: ['$\\frac{26}{100}$', '$\\frac{2.6}{100}$', '$\\frac{26}{10}$', '$\\frac{260}{100}$'],
        problemLabel: '(4)',
        responseLabel: '분수 표현',
        hints: ['% 자리에 분모 100을 넣으세요.', '$\\frac{26}{100}$를 선택하세요.'],
        sourceText: '26%',
        confidence: 0.99,
        position: { top: 77.0, left: 34.5, width: 8.5, height: 8.0 }
      },
      {
        clientKey: 'q5',
        type: 'multiple-choice',
        answer: '$\\frac{200}{100}$',
        options: ['$\\frac{200}{100}$', '$\\frac{20}{100}$', '$\\frac{200}{10}$', '$\\frac{2}{100}$'],
        problemLabel: '(5)',
        responseLabel: '분수 표현',
        hints: ['% 자리에 분모 100을 넣으세요.', '$\\frac{200}{100}$를 선택하세요.'],
        sourceText: '200%',
        confidence: 0.99,
        position: { top: 17.0, left: 72.5, width: 8.5, height: 8.0 }
      },
      {
        clientKey: 'q6',
        type: 'multiple-choice',
        answer: '$\\frac{5000}{100}$',
        options: ['$\\frac{5000}{100}$', '$\\frac{500}{100}$', '$\\frac{5000}{1000}$', '$\\frac{50}{100}$'],
        problemLabel: '(6)',
        responseLabel: '분수 표현',
        hints: ['% 자리에 분모 100을 넣으세요.', '$\\frac{5000}{100}$를 선택하세요.'],
        sourceText: '5000%',
        confidence: 0.99,
        position: { top: 37.0, left: 72.5, width: 8.5, height: 8.0 }
      },
      {
        clientKey: 'q7',
        type: 'multiple-choice',
        answer: '$\\frac{99}{100}$',
        options: ['$\\frac{99}{100}$', '$\\frac{9.9}{100}$', '$\\frac{99}{10}$', '$\\frac{99}{1000}$'],
        problemLabel: '(7)',
        responseLabel: '분수 표현',
        hints: ['% 자리에 분모 100을 넣으세요.', '$\\frac{99}{100}$를 선택하세요.'],
        sourceText: '99%',
        confidence: 0.99,
        position: { top: 57.0, left: 72.5, width: 8.5, height: 8.0 }
      },
      {
        clientKey: 'q8',
        type: 'multiple-choice',
        answer: '$\\frac{17.5}{100}$',
        options: ['$\\frac{17.5}{100}$', '$\\frac{1.75}{100}$', '$\\frac{175}{100}$', '$\\frac{17.5}{10}$'],
        problemLabel: '(8)',
        responseLabel: '분수 표현',
        hints: ['% 자리에 분모 100을 넣으세요.', '$\\frac{17.5}{100}$를 선택하세요.'],
        sourceText: '17.5%',
        confidence: 0.99,
        position: { top: 77.0, left: 72.5, width: 8.5, height: 8.0 }
      }
    ]
  },

  // Page 3: Slide 147
  {
    pageId: 'page_1786934069441_3',
    summary: '표현문제 2 - 분수를 백분율로 나타내기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '218%',
        options: ['218%', '21.8%', '2.18%', '2180%'],
        problemLabel: '(2)',
        responseLabel: '백분율 표현',
        hints: ['분모 100 위의 분자가 그대로 %가 됩니다.', '218%를 선택하세요.'],
        sourceText: '218/100',
        confidence: 0.99,
        position: { top: 39.5, left: 32.5, width: 12.5, height: 5.0 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '1313%',
        options: ['1313%', '131.3%', '13.13%', '13130%'],
        problemLabel: '(3)',
        responseLabel: '백분율 표현',
        hints: ['분모 100 위의 분자가 그대로 %가 됩니다.', '1313%를 선택하세요.'],
        sourceText: '1313/100',
        confidence: 0.99,
        position: { top: 59.5, left: 32.5, width: 12.5, height: 5.0 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '9.8%',
        options: ['9.8%', '98%', '0.98%', '980%'],
        problemLabel: '(4)',
        responseLabel: '백분율 표현',
        hints: ['분모 100 위의 분자가 그대로 %가 됩니다.', '9.8%를 선택하세요.'],
        sourceText: '9.8/100',
        confidence: 0.99,
        position: { top: 79.5, left: 32.5, width: 12.5, height: 5.0 }
      },
      {
        clientKey: 'q5',
        type: 'multiple-choice',
        answer: '2%',
        options: ['2%', '20%', '0.2%', '200%'],
        problemLabel: '(5)',
        responseLabel: '백분율 표현',
        hints: ['분모 100 위의 분자가 그대로 %가 됩니다.', '2%를 선택하세요.'],
        sourceText: '2/100',
        confidence: 0.99,
        position: { top: 19.5, left: 70.5, width: 12.5, height: 5.0 }
      },
      {
        clientKey: 'q6',
        type: 'multiple-choice',
        answer: '99%',
        options: ['99%', '9.9%', '0.99%', '990%'],
        problemLabel: '(6)',
        responseLabel: '백분율 표현',
        hints: ['분모 100 위의 분자가 그대로 %가 됩니다.', '99%를 선택하세요.'],
        sourceText: '99/100',
        confidence: 0.99,
        position: { top: 39.5, left: 70.5, width: 12.5, height: 5.0 }
      },
      {
        clientKey: 'q7',
        type: 'multiple-choice',
        answer: '22.4%',
        options: ['22.4%', '2.24%', '224%', '0.224%'],
        problemLabel: '(7)',
        responseLabel: '백분율 표현',
        hints: ['분모 100 위의 분자가 그대로 %가 됩니다.', '22.4%를 선택하세요.'],
        sourceText: '22.4/100',
        confidence: 0.99,
        position: { top: 59.5, left: 70.5, width: 12.5, height: 5.0 }
      },
      {
        clientKey: 'q8',
        type: 'multiple-choice',
        answer: '73%',
        options: ['73%', '7.3%', '730%', '0.73%'],
        problemLabel: '(8)',
        responseLabel: '백분율 표현',
        hints: ['분모 100 위의 분자가 그대로 %가 됩니다.', '73%를 선택하세요.'],
        sourceText: '73/100',
        confidence: 0.99,
        position: { top: 79.5, left: 70.5, width: 12.5, height: 5.0 }
      }
    ]
  },

  // Page 4: Slide 148
  {
    pageId: 'page_1786934069441_4',
    summary: '표현문제 3 - 소수를 백분율로 나타내기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '210%',
        options: ['210%', '21%', '2.1%', '2100%'],
        problemLabel: '(2)',
        responseLabel: '백분율 표현',
        hints: ['210/100 = 210%입니다.', '210%를 선택하세요.'],
        sourceText: '2.1 = 210/100',
        confidence: 0.99,
        position: { top: 79.0, left: 38.0, width: 9.0, height: 3.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '314%',
        options: ['314%', '31.4%', '3.14%', '3140%'],
        problemLabel: '(3)',
        responseLabel: '백분율 표현',
        hints: ['314/100 = 314%입니다.', '314%를 선택하세요.'],
        sourceText: '3.14 = 314/100',
        confidence: 0.99,
        position: { top: 59.0, left: 75.5, width: 9.0, height: 3.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '19820%',
        options: ['19820%', '1982%', '198.2%', '198200%'],
        problemLabel: '(4)',
        responseLabel: '백분율 표현',
        hints: ['19820/100 = 19820%입니다.', '19820%를 선택하세요.'],
        sourceText: '198.2 = 19820/100',
        confidence: 0.99,
        position: { top: 79.0, left: 75.5, width: 9.0, height: 3.5 }
      }
    ]
  },

  // Page 5: Slide 149
  {
    pageId: 'page_1786934069441_5',
    summary: '표현문제 4 - 소수를 백분율로 나타내기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '1000%',
        options: ['1000%', '100%', '10%', '10000%'],
        problemLabel: '(2)',
        responseLabel: '백분율 표현',
        hints: ['10에 100을 곱하면 1000%입니다.', '1000%를 선택하세요.'],
        sourceText: '10 = [ ]',
        confidence: 0.99,
        position: { top: 38.5, left: 32.5, width: 12.5, height: 5.0 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '1%',
        options: ['1%', '10%', '0.1%', '100%'],
        problemLabel: '(3)',
        responseLabel: '백분율 표현',
        hints: ['0.01은 1/100이므로 1%입니다.', '1%를 선택하세요.'],
        sourceText: '0.01 = [ ]',
        confidence: 0.99,
        position: { top: 58.5, left: 32.5, width: 12.5, height: 5.0 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '9.8%',
        options: ['9.8%', '98%', '0.98%', '980%'],
        problemLabel: '(4)',
        responseLabel: '백분율 표현',
        hints: ['0.098에 100을 곱하면 9.8%입니다.', '9.8%를 선택하세요.'],
        sourceText: '0.098 = [ ]',
        confidence: 0.99,
        position: { top: 78.5, left: 32.5, width: 12.5, height: 5.0 }
      },
      {
        clientKey: 'q5',
        type: 'multiple-choice',
        answer: '5%',
        options: ['5%', '50%', '0.5%', '500%'],
        problemLabel: '(5)',
        responseLabel: '백분율 표현',
        hints: ['0.05는 5/100이므로 5%입니다.', '5%를 선택하세요.'],
        sourceText: '0.05 = [ ]',
        confidence: 0.99,
        position: { top: 18.5, left: 70.5, width: 12.5, height: 5.0 }
      },
      {
        clientKey: 'q6',
        type: 'multiple-choice',
        answer: '98%',
        options: ['98%', '9.8%', '980%', '0.98%'],
        problemLabel: '(6)',
        responseLabel: '백분율 표현',
        hints: ['0.98은 98/100이므로 98%입니다.', '98%를 선택하세요.'],
        sourceText: '0.98 = [ ]',
        confidence: 0.99,
        position: { top: 38.5, left: 70.5, width: 12.5, height: 5.0 }
      },
      {
        clientKey: 'q7',
        type: 'multiple-choice',
        answer: '11.3%',
        options: ['11.3%', '1.13%', '113%', '0.113%'],
        problemLabel: '(7)',
        responseLabel: '백분율 표현',
        hints: ['0.113에 100을 곱하면 11.3%입니다.', '11.3%를 선택하세요.'],
        sourceText: '0.113 = [ ]',
        confidence: 0.99,
        position: { top: 58.5, left: 70.5, width: 12.5, height: 5.0 }
      },
      {
        clientKey: 'q8',
        type: 'multiple-choice',
        answer: '111.1%',
        options: ['111.1%', '11.11%', '1111%', '1.111%'],
        problemLabel: '(8)',
        responseLabel: '백분율 표현',
        hints: ['1.111에 100을 곱하면 111.1%입니다.', '111.1%를 선택하세요.'],
        sourceText: '1.111 = [ ]',
        confidence: 0.99,
        position: { top: 78.5, left: 70.5, width: 12.5, height: 5.0 }
      }
    ]
  },

  // Page 6: Slide 150
  {
    pageId: 'page_1786934069441_6',
    summary: '연습문제 1 - 비율 계산 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '22.5',
        options: ['22.5', '2.25', '225', '45'],
        problemLabel: '(2)',
        responseLabel: '계산 결과',
        hints: ['50 × 45/100 = 2250/100 = 22.5입니다.', '22.5를 선택하세요.'],
        sourceText: '50의 45%',
        confidence: 0.99,
        position: { top: 78.0, left: 22.0, width: 22.0, height: 4.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '0.51',
        options: ['0.51', '5.1', '51', '0.051'],
        problemLabel: '(3)',
        responseLabel: '계산 결과',
        hints: ['3 × 17/100 = 51/100 = 0.51입니다.', '0.51을 선택하세요.'],
        sourceText: '3의 17%',
        confidence: 0.99,
        position: { top: 58.0, left: 60.0, width: 22.0, height: 4.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '0.8',
        options: ['0.8', '8', '0.08', '80'],
        problemLabel: '(4)',
        responseLabel: '계산 결과',
        hints: ['8 × 10/100 = 80/100 = 0.8입니다.', '0.8을 선택하세요.'],
        sourceText: '8의 10%',
        confidence: 0.99,
        position: { top: 78.0, left: 60.0, width: 22.0, height: 4.5 }
      }
    ]
  },

  // Page 7: Slide 151
  {
    pageId: 'page_1786934069441_7',
    summary: '연습문제 2 - 비율 계산 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '2.97',
        options: ['2.97', '29.7', '0.297', '297'],
        problemLabel: '(2)',
        responseLabel: '계산 결과',
        hints: ['99 × 3/100 = 297/100 = 2.97입니다.', '2.97을 선택하세요.'],
        sourceText: '99의 3%',
        confidence: 0.99,
        position: { top: 40.0, left: 22.0, width: 22.0, height: 4.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '36.63',
        options: ['36.63', '3.663', '366.3', '33.3'],
        problemLabel: '(3)',
        responseLabel: '계산 결과',
        hints: ['333 × 11/100 = 3663/100 = 36.63입니다.', '36.63을 선택하세요.'],
        sourceText: '333의 11%',
        confidence: 0.99,
        position: { top: 60.0, left: 22.0, width: 22.0, height: 4.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '500',
        options: ['500', '50', '5000', '5'],
        problemLabel: '(4)',
        responseLabel: '계산 결과',
        hints: ['5000 × 10/100 = 500입니다.', '500을 선택하세요.'],
        sourceText: '5000의 10%',
        confidence: 0.99,
        position: { top: 80.0, left: 22.0, width: 22.0, height: 4.5 }
      },
      {
        clientKey: 'q5',
        type: 'multiple-choice',
        answer: '4.8',
        options: ['4.8', '48', '0.48', '8'],
        problemLabel: '(5)',
        responseLabel: '계산 결과',
        hints: ['60 × 8/100 = 480/100 = 4.8입니다.', '4.8을 선택하세요.'],
        sourceText: '60의 8%',
        confidence: 0.99,
        position: { top: 20.0, left: 60.0, width: 22.0, height: 4.5 }
      },
      {
        clientKey: 'q6',
        type: 'multiple-choice',
        answer: '50',
        options: ['50', '5', '500', '0.5'],
        problemLabel: '(6)',
        responseLabel: '계산 결과',
        hints: ['1000 × 5/100 = 50입니다.', '50을 선택하세요.'],
        sourceText: '1000의 5%',
        confidence: 0.99,
        position: { top: 40.0, left: 60.0, width: 22.0, height: 4.5 }
      },
      {
        clientKey: 'q7',
        type: 'multiple-choice',
        answer: '0.45',
        options: ['0.45', '4.5', '45', '0.045'],
        problemLabel: '(7)',
        responseLabel: '계산 결과',
        hints: ['3 × 15/100 = 45/100 = 0.45입니다.', '0.45를 선택하세요.'],
        sourceText: '3의 15%',
        confidence: 0.99,
        position: { top: 60.0, left: 60.0, width: 22.0, height: 4.5 }
      },
      {
        clientKey: 'q8',
        type: 'multiple-choice',
        answer: '1.52',
        options: ['1.52', '15.2', '0.152', '152'],
        problemLabel: '(8)',
        responseLabel: '계산 결과',
        hints: ['15.2 × 10/100 = 1.52입니다.', '1.52를 선택하세요.'],
        sourceText: '15.2의 10%',
        confidence: 0.99,
        position: { top: 80.0, left: 60.0, width: 22.0, height: 4.5 }
      }
    ]
  },

  // Page 8: Slide 152
  {
    pageId: 'page_1786934069441_8',
    summary: '연습문제 3 - 남자의 비율 구하기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '60%',
        options: ['60%', '40%', '30%', '66.7%'],
        problemLabel: '(2)',
        responseLabel: '남자의 비율',
        hints: ['전체 5 중 남자가 3이므로 3/5 = 60%입니다.', '60%를 선택하세요.'],
        sourceText: '여자와 남자의 비가 2 : 3일 때',
        confidence: 0.99,
        position: { top: 82.5, left: 18.0, width: 27.0, height: 4.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '55%',
        options: ['55%', '45%', '50%', '110%'],
        problemLabel: '(3)',
        responseLabel: '남자의 비율',
        hints: ['전체 100명 중 남자가 55명이므로 55%입니다.', '55%를 선택하세요.'],
        sourceText: '여자 45명, 남자 55명',
        confidence: 0.99,
        position: { top: 62.5, left: 55.5, width: 27.0, height: 4.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '80%',
        options: ['80%', '20%', '75%', '85%'],
        problemLabel: '(4)',
        responseLabel: '남자의 비율',
        hints: ['전체 15명 중 남자가 12명이므로 12/15 = 4/5 = 80%입니다.', '80%를 선택하세요.'],
        sourceText: '남자 12명, 여자 3명',
        confidence: 0.99,
        position: { top: 82.5, left: 55.5, width: 27.0, height: 4.5 }
      }
    ]
  },

  // Page 9: Slide 153
  {
    pageId: 'page_1786934069441_9',
    summary: '연습문제 4 - 여자의 비율 구하기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '70%',
        options: ['70%', '30%', '73%', '35%'],
        problemLabel: '(2)',
        responseLabel: '여자의 비율',
        hints: ['전체 10 중 여자가 7이므로 7/10 = 70%입니다.', '70%를 선택하세요.'],
        sourceText: '여자와 남자의 비가 7 : 3일 때',
        confidence: 0.99,
        position: { top: 45.0, left: 18.0, width: 27.0, height: 4.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '60%',
        options: ['60%', '40%', '90%', '66.7%'],
        problemLabel: '(3)',
        responseLabel: '여자의 비율',
        hints: ['전체 15 중 여자가 9이므로 9/15 = 60%입니다.', '60%를 선택하세요.'],
        sourceText: '남자와 여자의 비가 6 : 9일 때',
        confidence: 0.99,
        position: { top: 65.0, left: 18.0, width: 27.0, height: 4.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '65%',
        options: ['65%', '35%', '60%', '70%'],
        problemLabel: '(4)',
        responseLabel: '여자의 비율',
        hints: ['전체 20 중 여자가 13이므로 13/20 = 65%입니다.', '65%를 선택하세요.'],
        sourceText: '여자와 남자의 비가 13 : 7일 때',
        confidence: 0.99,
        position: { top: 85.0, left: 18.0, width: 27.0, height: 4.5 }
      },
      {
        clientKey: 'q5',
        type: 'multiple-choice',
        answer: '60%',
        options: ['60%', '40%', '30%', '50%'],
        problemLabel: '(5)',
        responseLabel: '여자의 비율',
        hints: ['전체 50명 중 여자가 30명이므로 30/50 = 60%입니다.', '60%를 선택하세요.'],
        sourceText: '남자 20명, 여자 30명',
        confidence: 0.99,
        position: { top: 25.0, left: 55.5, width: 27.0, height: 4.5 }
      },
      {
        clientKey: 'q6',
        type: 'multiple-choice',
        answer: '70%',
        options: ['70%', '30%', '140%', '65%'],
        problemLabel: '(6)',
        responseLabel: '여자의 비율',
        hints: ['전체 200명 중 여자가 140명이므로 140/200 = 70%입니다.', '70%를 선택하세요.'],
        sourceText: '여자 140명, 남자 60명',
        confidence: 0.99,
        position: { top: 45.0, left: 55.5, width: 27.0, height: 4.5 }
      },
      {
        clientKey: 'q7',
        type: 'multiple-choice',
        answer: '80%',
        options: ['80%', '20%', '48%', '85%'],
        problemLabel: '(7)',
        responseLabel: '여자의 비율',
        hints: ['전체 60명 중 여자가 48명이므로 48/60 = 80%입니다.', '80%를 선택하세요.'],
        sourceText: '남자 12명, 여자 48명',
        confidence: 0.99,
        position: { top: 65.0, left: 55.5, width: 27.0, height: 4.5 }
      },
      {
        clientKey: 'q8',
        type: 'multiple-choice',
        answer: '74.8%',
        options: ['74.8%', '25.2%', '37.4%', '75%'],
        problemLabel: '(8)',
        responseLabel: '여자의 비율',
        hints: ['전체 500명 중 여자가 374명이므로 374/500 = 74.8%입니다.', '74.8%를 선택하세요.'],
        sourceText: '남자 126명, 여자 374명',
        confidence: 0.99,
        position: { top: 85.0, left: 55.5, width: 27.0, height: 4.5 }
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
