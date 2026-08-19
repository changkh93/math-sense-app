import fs from 'node:fs';

const unitId = 'ratios_ratio_chap2_unit3';

const pagesData = [
  // Page 1: Slide 123
  {
    pageId: 'page_1786933968673_1',
    summary: '표현문제 1 - 모르는 값을 미지수 x로 표현하기 (4지선다형)',
    elements: [
      {
        clientKey: 'q1',
        type: 'multiple-choice',
        answer: '1 : 3 = 4 : x',
        options: ['1 : 3 = 4 : x', '1 : 3 = x : 4', '3 : 1 = 4 : x', '1 : 4 = 3 : x'],
        problemLabel: '(1)',
        responseLabel: '미지수 x 식',
        hints: ['□ 자리에 미지수 x를 넣으세요.', '1 : 3 = 4 : x를 선택하세요.'],
        sourceText: '1 : 3 = 4 : [ ]',
        confidence: 0.99,
        position: { top: 62.0, left: 18.5, width: 26.0, height: 4.5 }
      },
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '4 : 5 = x : 10',
        options: ['4 : 5 = x : 10', '4 : 5 = 10 : x', '5 : 4 = x : 10', '4 : 10 = x : 5'],
        problemLabel: '(2)',
        responseLabel: '미지수 x 식',
        hints: ['□ 자리에 미지수 x를 넣으세요.', '4 : 5 = x : 10을 선택하세요.'],
        sourceText: '4 : 5 = [ ] : 10',
        confidence: 0.99,
        position: { top: 82.5, left: 18.5, width: 26.0, height: 4.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: 'x × 3 = 12',
        options: ['x × 3 = 12', '3 × x = 12', 'x × 12 = 3', 'x = 3 × 12'],
        problemLabel: '(4)',
        responseLabel: '미지수 x 식',
        hints: ['□ 자리에 미지수 x를 넣으세요.', 'x × 3 = 12를 선택하세요.'],
        sourceText: '[ ] × 3 = 12',
        confidence: 0.99,
        position: { top: 82.5, left: 56.0, width: 26.0, height: 4.5 }
      }
    ]
  },

  // Page 2: Slide 124
  {
    pageId: 'page_1786933968673_2',
    summary: '연습문제 1 - 미지수 x의 값 구하기 (정수 입력형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'input',
        inputMode: 'integer',
        answer: '15',
        acceptedAnswers: ['15', 'x=15', 'x = 15'],
        problemLabel: '(2)',
        responseLabel: 'x의 값',
        hints: ['1:3 = 5:x 에서 x = 3×5 = 15입니다.', '15를 입력하세요.'],
        sourceText: '1 : 3 = 5 : x',
        confidence: 0.99,
        position: { top: 44.5, left: 22.5, width: 18.0, height: 4.5 }
      },
      {
        clientKey: 'q3',
        type: 'input',
        inputMode: 'integer',
        answer: '9',
        acceptedAnswers: ['9', 'x=9', 'x = 9'],
        problemLabel: '(3)',
        responseLabel: 'x의 값',
        hints: ['3:2 = x:6 에서 2x = 18이므로 x = 9입니다.', '9를 입력하세요.'],
        sourceText: '3 : 2 = x : 6',
        confidence: 0.99,
        position: { top: 64.5, left: 22.5, width: 18.0, height: 4.5 }
      },
      {
        clientKey: 'q4',
        type: 'input',
        inputMode: 'integer',
        answer: '50',
        acceptedAnswers: ['50', 'x=50', 'x = 50'],
        problemLabel: '(4)',
        responseLabel: 'x의 값',
        hints: ['5/6 = x/60 에서 분모가 10배이므로 x = 50입니다.', '50을 입력하세요.'],
        sourceText: '5/6 = x/60',
        confidence: 0.99,
        position: { top: 84.5, left: 22.5, width: 18.0, height: 4.5 }
      },
      {
        clientKey: 'q5',
        type: 'input',
        inputMode: 'integer',
        answer: '7',
        acceptedAnswers: ['7', 'x=7', 'x = 7'],
        problemLabel: '(5)',
        responseLabel: 'x의 값',
        hints: ['3 + x = 10 에서 x = 7입니다.', '7을 입력하세요.'],
        sourceText: '3 + x = 10',
        confidence: 0.99,
        position: { top: 25.0, left: 60.0, width: 18.0, height: 4.5 }
      },
      {
        clientKey: 'q6',
        type: 'input',
        inputMode: 'integer',
        answer: '6',
        acceptedAnswers: ['6', 'x=6', 'x = 6'],
        problemLabel: '(6)',
        responseLabel: 'x의 값',
        hints: ['2/3 = x/9 에서 분모가 3배이므로 x = 6입니다.', '6을 입력하세요.'],
        sourceText: '2/3 = x/9',
        confidence: 0.99,
        position: { top: 44.5, left: 60.0, width: 18.0, height: 4.5 }
      },
      {
        clientKey: 'q7',
        type: 'input',
        inputMode: 'integer',
        answer: '63',
        acceptedAnswers: ['63', 'x=63', 'x = 63'],
        problemLabel: '(7)',
        responseLabel: 'x의 값',
        hints: ['4/7 = 36/x 에서 분자가 9배이므로 x = 63입니다.', '63을 입력하세요.'],
        sourceText: '4/7 = 36/x',
        confidence: 0.99,
        position: { top: 64.5, left: 60.0, width: 18.0, height: 4.5 }
      },
      {
        clientKey: 'q8',
        type: 'input',
        inputMode: 'integer',
        answer: '32',
        acceptedAnswers: ['32', 'x=32', 'x = 32'],
        problemLabel: '(8)',
        responseLabel: 'x의 값',
        hints: ['8:3 = x:12 에서 기준량이 4배이므로 x = 32입니다.', '32를 입력하세요.'],
        sourceText: '8 : 3 = x : 12',
        confidence: 0.99,
        position: { top: 84.5, left: 60.0, width: 18.0, height: 4.5 }
      }
    ]
  },

  // Page 3: Slide 125
  {
    pageId: 'page_1786933968673_3',
    summary: '연습문제 2 - 미지수 x의 값 알아내기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '$\\frac{7}{2}$',
        options: ['$\\frac{7}{2}$', '$\\frac{2}{7}$', '3.5', '$\\frac{7}{7}$'],
        problemLabel: '(2)',
        responseLabel: 'x의 값',
        hints: ['2x = 7에서 x = 7/2입니다.', '$\\frac{7}{2}$를 선택하세요.'],
        sourceText: '2x = 7',
        confidence: 0.99,
        position: { top: 71.0, left: 34.5, width: 10.0, height: 5.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '3',
        options: ['3', '$\\frac{9}{3}$', '9', '$\\frac{3}{9}$'],
        problemLabel: '(3)',
        responseLabel: 'x의 값',
        hints: ['3x = 9에서 x = 3입니다.', '3을 선택하세요.'],
        sourceText: '3x = 9',
        confidence: 0.99,
        position: { top: 51.0, left: 72.5, width: 10.0, height: 5.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '$\\frac{5}{4}$',
        options: ['$\\frac{5}{4}$', '$\\frac{4}{5}$', '$\\frac{5}{2}$', '$\\frac{1}{4}$'],
        problemLabel: '(4)',
        responseLabel: 'x의 값',
        hints: ['4x = 5에서 x = 5/4입니다.', '$\\frac{5}{4}$를 선택하세요.'],
        sourceText: '4x = 5',
        confidence: 0.99,
        position: { top: 71.0, left: 72.5, width: 10.0, height: 5.5 }
      }
    ]
  },

  // Page 4: Slide 126
  {
    pageId: 'page_1786933968673_4',
    summary: '연습문제 3 - 미지수 x의 값 알아내기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '$\\frac{25}{3}$',
        options: ['$\\frac{25}{3}$', '$\\frac{3}{25}$', '$\\frac{25}{5}$', '8'],
        problemLabel: '(2)',
        responseLabel: 'x의 값',
        hints: ['3x = 25에서 x = 25/3입니다.', '$\\frac{25}{3}$를 선택하세요.'],
        sourceText: '3x = 25',
        confidence: 0.99,
        position: { top: 33.5, left: 36.0, width: 10.0, height: 5.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '50',
        options: ['50', '$\\frac{100}{3}$', '200', '25'],
        problemLabel: '(3)',
        responseLabel: 'x의 값',
        hints: ['2x = 100에서 x = 50입니다.', '50을 선택하세요.'],
        sourceText: '2x = 100',
        confidence: 0.99,
        position: { top: 53.5, left: 38.0, width: 10.0, height: 5.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '11',
        options: ['11', '33', '3', '$\\frac{33}{2}$'],
        problemLabel: '(4)',
        responseLabel: 'x의 값',
        hints: ['3x = 33에서 x = 11입니다.', '11을 선택하세요.'],
        sourceText: '3x = 33',
        confidence: 0.99,
        position: { top: 73.5, left: 36.0, width: 10.0, height: 5.5 }
      },
      {
        clientKey: 'q5',
        type: 'multiple-choice',
        answer: '$\\frac{5}{2}$',
        options: ['$\\frac{5}{2}$', '$\\frac{2}{5}$', '2.5', '$\\frac{10}{2}$'],
        problemLabel: '(5)',
        responseLabel: 'x의 값',
        hints: ['4x = 10에서 x = 10/4 = 5/2입니다.', '$\\frac{5}{2}$를 선택하세요.'],
        sourceText: '4x = 10',
        confidence: 0.99,
        position: { top: 14.5, left: 73.5, width: 10.0, height: 5.5 }
      },
      {
        clientKey: 'q6',
        type: 'multiple-choice',
        answer: '$\\frac{101}{5}$',
        options: ['$\\frac{101}{5}$', '$\\frac{5}{101}$', '20', '$\\frac{101}{10}$'],
        problemLabel: '(6)',
        responseLabel: 'x의 값',
        hints: ['5x = 101에서 x = 101/5입니다.', '$\\frac{101}{5}$를 선택하세요.'],
        sourceText: '5x = 101',
        confidence: 0.99,
        position: { top: 34.0, left: 75.5, width: 10.0, height: 5.5 }
      },
      {
        clientKey: 'q7',
        type: 'multiple-choice',
        answer: '$\\frac{15}{4}$',
        options: ['$\\frac{15}{4}$', '$\\frac{4}{15}$', '$\\frac{15}{2}$', '3'],
        problemLabel: '(7)',
        responseLabel: 'x의 값',
        hints: ['4x = 15에서 x = 15/4입니다.', '$\\frac{15}{4}$를 선택하세요.'],
        sourceText: '4x = 15',
        confidence: 0.99,
        position: { top: 53.5, left: 74.0, width: 10.0, height: 5.5 }
      },
      {
        clientKey: 'q8',
        type: 'multiple-choice',
        answer: '1',
        options: ['1', '5', '0', '$\\frac{5}{2}$'],
        problemLabel: '(8)',
        responseLabel: 'x의 값',
        hints: ['5x = 5에서 x = 1입니다.', '1을 선택하세요.'],
        sourceText: '5x = 5',
        confidence: 0.99,
        position: { top: 73.5, left: 72.0, width: 10.0, height: 5.5 }
      }
    ]
  },

  // Page 5: Slide 127
  {
    pageId: 'page_1786933968673_5',
    summary: '연습문제 4 - 미지수 x의 값 채우기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '$\\frac{99}{2}$',
        options: ['$\\frac{99}{2}$', '$\\frac{2}{99}$', '$\\frac{99}{3}$', '$\\frac{99}{99}$'],
        problemLabel: '(2)',
        responseLabel: 'x의 값',
        hints: ['2x = 99에서 x = 99/2입니다.', '$\\frac{99}{2}$를 선택하세요.'],
        sourceText: '2x = 99',
        confidence: 0.99,
        position: { top: 38.0, left: 39.5, width: 6.0, height: 6.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '$\\frac{301}{3}$',
        options: ['$\\frac{301}{3}$', '$\\frac{3}{301}$', '100', '$\\frac{301}{301}$'],
        problemLabel: '(3)',
        responseLabel: 'x의 값',
        hints: ['3x = 301에서 x = 301/3입니다.', '$\\frac{301}{3}$을 선택하세요.'],
        sourceText: '3x = 301',
        confidence: 0.99,
        position: { top: 58.0, left: 39.5, width: 6.0, height: 6.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '$\\frac{100}{3}$',
        options: ['$\\frac{100}{3}$', '$\\frac{3}{100}$', '$\\frac{100}{100}$', '33'],
        problemLabel: '(4)',
        responseLabel: 'x의 값',
        hints: ['3x = 100에서 x = 100/3입니다.', '$\\frac{100}{3}$을 선택하세요.'],
        sourceText: '3x = 100',
        confidence: 0.99,
        position: { top: 78.0, left: 39.5, width: 6.0, height: 6.5 }
      },
      {
        clientKey: 'q5',
        type: 'multiple-choice',
        answer: '$\\frac{21}{11}$',
        options: ['$\\frac{21}{11}$', '$\\frac{11}{21}$', '$\\frac{21}{21}$', '2'],
        problemLabel: '(5)',
        responseLabel: 'x의 값',
        hints: ['11x = 21에서 x = 21/11입니다.', '$\\frac{21}{11}$을 선택하세요.'],
        sourceText: '11x = 21',
        confidence: 0.99,
        position: { top: 18.0, left: 77.0, width: 6.0, height: 6.5 }
      },
      {
        clientKey: 'q6',
        type: 'multiple-choice',
        answer: '$\\frac{51}{4}$',
        options: ['$\\frac{51}{4}$', '$\\frac{4}{51}$', '$\\frac{51}{51}$', '$\\frac{51}{2}$'],
        problemLabel: '(6)',
        responseLabel: 'x의 값',
        hints: ['4x = 51에서 x = 51/4입니다.', '$\\frac{51}{4}$을 선택하세요.'],
        sourceText: '4x = 51',
        confidence: 0.99,
        position: { top: 38.0, left: 77.0, width: 6.0, height: 6.5 }
      },
      {
        clientKey: 'q7',
        type: 'multiple-choice',
        answer: '$\\frac{77}{6}$',
        options: ['$\\frac{77}{6}$', '$\\frac{6}{77}$', '$\\frac{77}{77}$', '$\\frac{77}{7}$'],
        problemLabel: '(7)',
        responseLabel: 'x의 값',
        hints: ['6x = 77에서 x = 77/6입니다.', '$\\frac{77}{6}$을 선택하세요.'],
        sourceText: '6x = 77',
        confidence: 0.99,
        position: { top: 58.0, left: 77.0, width: 6.0, height: 6.5 }
      },
      {
        clientKey: 'q8',
        type: 'multiple-choice',
        answer: '$\\frac{66}{5}$',
        options: ['$\\frac{66}{5}$', '$\\frac{5}{66}$', '$\\frac{66}{66}$', '13'],
        problemLabel: '(8)',
        responseLabel: 'x의 값',
        hints: ['5x = 66에서 x = 66/5입니다.', '$\\frac{66}{5}$을 선택하세요.'],
        sourceText: '5x = 66',
        confidence: 0.99,
        position: { top: 78.0, left: 77.0, width: 6.0, height: 6.5 }
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
console.log('All 5 pages generated successfully!');
