import fs from 'node:fs';

const unitId = 'ratios_ratio_chap2_unit4';

const pagesData = [
  // Page 1: Slide 128
  {
    pageId: 'page_1786933997924_1',
    summary: '연습문제 1 - 곱해야 할 배수 찾기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '$\\times \\frac{6}{5}$',
        options: ['$\\times \\frac{6}{5}$', '$\\times \\frac{5}{6}$', '$\\times 6$', '$\\times \\frac{6}{6}$'],
        problemLabel: '(2)',
        responseLabel: '곱할 수',
        hints: ['5에 6/5를 곱하면 6이 됩니다.', '$\\times \\frac{6}{5}$를 선택하세요.'],
        sourceText: '5 -> 6',
        confidence: 0.99,
        position: { top: 74.0, left: 27.5, width: 8.0, height: 6.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '$\\times \\frac{11}{6}$',
        options: ['$\\times \\frac{11}{6}$', '$\\times \\frac{6}{11}$', '$\\times 11$', '$\\times \\frac{11}{11}$'],
        problemLabel: '(3)',
        responseLabel: '곱할 수',
        hints: ['6에 11/6을 곱하면 11이 됩니다.', '$\\times \\frac{11}{6}$을 선택하세요.'],
        sourceText: '6 -> 11',
        confidence: 0.99,
        position: { top: 54.0, left: 65.0, width: 8.0, height: 6.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '$\\times \\frac{3}{10}$',
        options: ['$\\times \\frac{3}{10}$', '$\\times \\frac{10}{3}$', '$\\times 3$', '$\\times \\frac{3}{3}$'],
        problemLabel: '(4)',
        responseLabel: '곱할 수',
        hints: ['10에 3/10을 곱하면 3이 됩니다.', '$\\times \\frac{3}{10}$을 선택하세요.'],
        sourceText: '10 -> 3',
        confidence: 0.99,
        position: { top: 74.0, left: 65.0, width: 8.0, height: 6.5 }
      }
    ]
  },

  // Page 2: Slide 129
  {
    pageId: 'page_1786933997924_2',
    summary: '연습문제 2 - 곱해야 할 배수 찾기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '$\\times \\frac{6}{51}$',
        options: ['$\\times \\frac{6}{51}$', '$\\times \\frac{51}{6}$', '$\\times 6$', '$\\times \\frac{6}{6}$'],
        problemLabel: '(2)',
        responseLabel: '곱할 수',
        hints: ['51에 6/51을 곱하면 6이 됩니다.', '$\\times \\frac{6}{51}$을 선택하세요.'],
        sourceText: '51 -> 6',
        confidence: 0.99,
        position: { top: 34.5, left: 27.5, width: 8.0, height: 6.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '$\\times \\frac{16}{5}$',
        options: ['$\\times \\frac{16}{5}$', '$\\times \\frac{5}{16}$', '$\\times 16$', '$\\times \\frac{16}{16}$'],
        problemLabel: '(3)',
        responseLabel: '곱할 수',
        hints: ['5에 16/5를 곱하면 16이 됩니다.', '$\\times \\frac{16}{5}$을 선택하세요.'],
        sourceText: '5 -> 16',
        confidence: 0.99,
        position: { top: 54.5, left: 27.5, width: 8.0, height: 6.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '$\\times \\frac{7}{100}$',
        options: ['$\\times \\frac{7}{100}$', '$\\times \\frac{100}{7}$', '$\\times 7$', '$\\times \\frac{7}{7}$'],
        problemLabel: '(4)',
        responseLabel: '곱할 수',
        hints: ['100에 7/100을 곱하면 7이 됩니다.', '$\\times \\frac{7}{100}$을 선택하세요.'],
        sourceText: '100 -> 7',
        confidence: 0.99,
        position: { top: 74.5, left: 27.5, width: 8.0, height: 6.5 }
      },
      {
        clientKey: 'q5',
        type: 'multiple-choice',
        answer: '$\\times \\frac{3}{11}$',
        options: ['$\\times \\frac{3}{11}$', '$\\times \\frac{11}{3}$', '$\\times 3$', '$\\times \\frac{3}{3}$'],
        problemLabel: '(5)',
        responseLabel: '곱할 수',
        hints: ['11에 3/11을 곱하면 3이 됩니다.', '$\\times \\frac{3}{11}$을 선택하세요.'],
        sourceText: '11 -> 3',
        confidence: 0.99,
        position: { top: 14.5, left: 65.0, width: 8.0, height: 6.5 }
      },
      {
        clientKey: 'q6',
        type: 'multiple-choice',
        answer: '$\\times \\frac{31}{3}$',
        options: ['$\\times \\frac{31}{3}$', '$\\times \\frac{3}{31}$', '$\\times 31$', '$\\times \\frac{31}{31}$'],
        problemLabel: '(6)',
        responseLabel: '곱할 수',
        hints: ['3에 31/3을 곱하면 31이 됩니다.', '$\\times \\frac{31}{3}$을 선택하세요.'],
        sourceText: '3 -> 31',
        confidence: 0.99,
        position: { top: 34.5, left: 65.0, width: 8.0, height: 6.5 }
      },
      {
        clientKey: 'q7',
        type: 'multiple-choice',
        answer: '$\\times \\frac{39}{2}$',
        options: ['$\\times \\frac{39}{2}$', '$\\times \\frac{2}{39}$', '$\\times 39$', '$\\times \\frac{39}{39}$'],
        problemLabel: '(7)',
        responseLabel: '곱할 수',
        hints: ['2에 39/2를 곱하면 39가 됩니다.', '$\\times \\frac{39}{2}$를 선택하세요.'],
        sourceText: '2 -> 39',
        confidence: 0.99,
        position: { top: 54.5, left: 65.0, width: 8.0, height: 6.5 }
      },
      {
        clientKey: 'q8',
        type: 'multiple-choice',
        answer: '$\\times \\frac{1}{9}$',
        options: ['$\\times \\frac{1}{9}$', '$\\times 9$', '$\\times \\frac{9}{1}$', '$\\times 1$'],
        problemLabel: '(8)',
        responseLabel: '곱할 수',
        hints: ['9에 1/9을 곱하면 1이 됩니다.', '$\\times \\frac{1}{9}$을 선택하세요.'],
        sourceText: '9 -> 1',
        confidence: 0.99,
        position: { top: 74.5, left: 65.0, width: 8.0, height: 6.5 }
      }
    ]
  },

  // Page 3: Slide 130
  {
    pageId: 'page_1786933997924_3',
    summary: '연습문제 3 - 역수 곱하기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '$\\times \\frac{7}{3}$',
        options: ['$\\times \\frac{7}{3}$', '$\\times \\frac{3}{7}$', '$\\times 7$', '$\\times \\frac{7}{7}$'],
        problemLabel: '(2)',
        responseLabel: '역수 곱',
        hints: ['3/7의 역수인 7/3을 곱해야 1이 됩니다.', '$\\times \\frac{7}{3}$을 선택하세요.'],
        sourceText: '3/7 -> 1',
        confidence: 0.99,
        position: { top: 74.5, left: 27.5, width: 8.0, height: 6.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '$\\times \\frac{4}{3}$',
        options: ['$\\times \\frac{4}{3}$', '$\\times \\frac{3}{4}$', '$\\times 4$', '$\\times \\frac{4}{4}$'],
        problemLabel: '(3)',
        responseLabel: '역수 곱',
        hints: ['3/4의 역수인 4/3을 곱해야 1이 됩니다.', '$\\times \\frac{4}{3}$를 선택하세요.'],
        sourceText: '3/4 -> 1',
        confidence: 0.99,
        position: { top: 54.5, left: 65.0, width: 8.0, height: 6.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '$\\times \\frac{9}{2}$',
        options: ['$\\times \\frac{9}{2}$', '$\\times \\frac{2}{9}$', '$\\times 9$', '$\\times \\frac{9}{9}$'],
        problemLabel: '(4)',
        responseLabel: '역수 곱',
        hints: ['2/9의 역수인 9/2를 곱해야 1이 됩니다.', '$\\times \\frac{9}{2}$를 선택하세요.'],
        sourceText: '2/9 -> 1',
        confidence: 0.99,
        position: { top: 74.5, left: 65.0, width: 8.0, height: 6.5 }
      }
    ]
  },

  // Page 4: Slide 131
  {
    pageId: 'page_1786933997924_4',
    summary: '연습문제 4 - 분수에서 분수로의 곱할 수 찾기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '$\\times \\frac{9}{8}$',
        options: ['$\\times \\frac{9}{8}$', '$\\times \\frac{8}{9}$', '$\\times \\frac{9}{4}$', '$\\times \\frac{1}{2}$'],
        problemLabel: '(2)',
        responseLabel: '곱할 수',
        hints: ['(9/4) × (1/2) = 9/8입니다.', '$\\times \\frac{9}{8}$을 선택하세요.'],
        sourceText: '4/9 -> 1/2',
        confidence: 0.99,
        position: { top: 34.5, left: 27.5, width: 8.0, height: 6.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '$\\times \\frac{10}{3}$',
        options: ['$\\times \\frac{10}{3}$', '$\\times \\frac{3}{10}$', '$\\times \\frac{5}{3}$', '$\\times 2$'],
        problemLabel: '(3)',
        responseLabel: '곱할 수',
        hints: ['2 × (5/3) = 10/3입니다.', '$\\times \\frac{10}{3}$을 선택하세요.'],
        sourceText: '1/2 -> 5/3',
        confidence: 0.99,
        position: { top: 54.5, left: 27.5, width: 8.0, height: 6.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '$\\times \\frac{40}{63}$',
        options: ['$\\times \\frac{40}{63}$', '$\\times \\frac{63}{40}$', '$\\times \\frac{35}{72}$', '$\\times \\frac{8}{7}$'],
        problemLabel: '(4)',
        responseLabel: '곱할 수',
        hints: ['(8/7) × (5/9) = 40/63입니다.', '$\\times \\frac{40}{63}$을 선택하세요.'],
        sourceText: '7/8 -> 5/9',
        confidence: 0.99,
        position: { top: 74.5, left: 27.5, width: 8.0, height: 6.5 }
      },
      {
        clientKey: 'q5',
        type: 'multiple-choice',
        answer: '$\\times \\frac{6}{28}$',
        options: ['$\\times \\frac{6}{28}$', '$\\times \\frac{28}{6}$', '$\\times \\frac{7}{24}$', '$\\times \\frac{6}{7}$'],
        problemLabel: '(5)',
        responseLabel: '곱할 수',
        hints: ['(6/7) × (1/4) = 6/28입니다.', '$\\times \\frac{6}{28}$을 선택하세요.'],
        sourceText: '7/6 -> 1/4',
        confidence: 0.99,
        position: { top: 14.5, left: 65.0, width: 8.0, height: 6.5 }
      },
      {
        clientKey: 'q6',
        type: 'multiple-choice',
        answer: '$\\times \\frac{20}{77}$',
        options: ['$\\times \\frac{20}{77}$', '$\\times \\frac{77}{20}$', '$\\times \\frac{14}{110}$', '$\\times \\frac{10}{7}$'],
        problemLabel: '(6)',
        responseLabel: '곱할 수',
        hints: ['(10/7) × (2/11) = 20/77입니다.', '$\\times \\frac{20}{77}$을 선택하세요.'],
        sourceText: '7/10 -> 2/11',
        confidence: 0.99,
        position: { top: 34.5, left: 65.0, width: 8.0, height: 6.5 }
      },
      {
        clientKey: 'q7',
        type: 'multiple-choice',
        answer: '$\\times \\frac{4}{9}$',
        options: ['$\\times \\frac{4}{9}$', '$\\times \\frac{9}{4}$', '$\\times \\frac{2}{3}$', '$\\times 1$'],
        problemLabel: '(7)',
        responseLabel: '곱할 수',
        hints: ['(2/3) × (2/3) = 4/9입니다.', '$\\times \\frac{4}{9}$를 선택하세요.'],
        sourceText: '3/2 -> 2/3',
        confidence: 0.99,
        position: { top: 54.5, left: 65.0, width: 8.0, height: 6.5 }
      },
      {
        clientKey: 'q8',
        type: 'multiple-choice',
        answer: '$\\times \\frac{11}{6}$',
        options: ['$\\times \\frac{11}{6}$', '$\\times \\frac{6}{11}$', '$\\times \\frac{2}{33}$', '$\\times \\frac{11}{2}$'],
        problemLabel: '(8)',
        responseLabel: '곱할 수',
        hints: ['(11/2) × (1/3) = 11/6입니다.', '$\\times \\frac{11}{6}$을 선택하세요.'],
        sourceText: '2/11 -> 1/3',
        confidence: 0.99,
        position: { top: 74.5, left: 65.0, width: 8.0, height: 6.5 }
      }
    ]
  },

  // Page 5: Slide 132
  {
    pageId: 'page_1786933997924_5',
    summary: '연습문제 5 - 비례식의 미지수 값 채우기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '$\\frac{3}{4}$',
        options: ['$\\frac{3}{4}$', '$\\frac{4}{3}$', '3', '$\\frac{1}{4}$'],
        problemLabel: '(2)',
        responseLabel: '네모 안의 값',
        hints: ['1에 3/4을 곱하면 3/4입니다.', '$\\frac{3}{4}$을 선택하세요.'],
        sourceText: '4:1 = 3:[ ]',
        confidence: 0.99,
        position: { top: 74.5, left: 39.5, width: 6.0, height: 7.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '$\\frac{20}{3}$',
        options: ['$\\frac{20}{3}$', '$\\frac{3}{20}$', '20', '$\\frac{4}{3}$'],
        problemLabel: '(3)',
        responseLabel: '네모 안의 값',
        hints: ['5에 4/3을 곱하면 20/3입니다.', '$\\frac{20}{3}$을 선택하세요.'],
        sourceText: '3:5 = 4:[ ]',
        confidence: 0.99,
        position: { top: 54.5, left: 77.0, width: 6.0, height: 7.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '$\\frac{25}{8}$',
        options: ['$\\frac{25}{8}$', '$\\frac{8}{25}$', '25', '$\\frac{5}{8}$'],
        problemLabel: '(4)',
        responseLabel: '네모 안의 값',
        hints: ['5에 5/8를 곱하면 25/8입니다.', '$\\frac{25}{8}$를 선택하세요.'],
        sourceText: '8:5 = 5:[ ]',
        confidence: 0.99,
        position: { top: 74.5, left: 77.0, width: 6.0, height: 7.5 }
      }
    ]
  },

  // Page 6: Slide 133
  {
    pageId: 'page_1786933997924_6',
    summary: '연습문제 6 - 비례식의 미지수 x값 구하기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '$\\frac{5}{8}$',
        options: ['$\\frac{5}{8}$', '$\\frac{8}{5}$', '5', '$\\frac{1}{8}$'],
        problemLabel: '(2)',
        responseLabel: 'x의 값',
        hints: ['8:1 = 5:x 에서 x = 5/8입니다.', '$\\frac{5}{8}$를 선택하세요.'],
        sourceText: '8:1 = 5:x',
        confidence: 0.99,
        position: { top: 44.5, left: 22.0, width: 22.0, height: 4.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '$\\frac{7}{2}$',
        options: ['$\\frac{7}{2}$', '$\\frac{2}{7}$', '7', '14'],
        problemLabel: '(3)',
        responseLabel: 'x의 값',
        hints: ['1:2 = x:7 에서 x = 7/2입니다.', '$\\frac{7}{2}$를 선택하세요.'],
        sourceText: '1:2 = x:7',
        confidence: 0.99,
        position: { top: 64.5, left: 22.0, width: 22.0, height: 4.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '$\\frac{80}{11}$',
        options: ['$\\frac{80}{11}$', '$\\frac{11}{80}$', '80', '$\\frac{88}{10}$'],
        problemLabel: '(4)',
        responseLabel: 'x의 값',
        hints: ['11:8 = 10:x 에서 x = 80/11입니다.', '$\\frac{80}{11}$을 선택하세요.'],
        sourceText: '11:8 = 10:x',
        confidence: 0.99,
        position: { top: 84.5, left: 22.0, width: 22.0, height: 4.5 }
      },
      {
        clientKey: 'q5',
        type: 'multiple-choice',
        answer: '$\\frac{20}{3}$',
        options: ['$\\frac{20}{3}$', '$\\frac{3}{20}$', '20', '$\\frac{15}{4}$'],
        problemLabel: '(5)',
        responseLabel: 'x의 값',
        hints: ['3:4 = 5:x 에서 x = 20/3입니다.', '$\\frac{20}{3}$을 선택하세요.'],
        sourceText: '3:4 = 5:x',
        confidence: 0.99,
        position: { top: 24.5, left: 60.0, width: 22.0, height: 4.5 }
      },
      {
        clientKey: 'q6',
        type: 'multiple-choice',
        answer: '$\\frac{12}{5}$',
        options: ['$\\frac{12}{5}$', '$\\frac{5}{12}$', '12', '$\\frac{15}{4}$'],
        problemLabel: '(6)',
        responseLabel: 'x의 값',
        hints: ['3:5 = x:4 에서 x = 12/5입니다.', '$\\frac{12}{5}$를 선택하세요.'],
        sourceText: '3:5 = x:4',
        confidence: 0.99,
        position: { top: 44.5, left: 60.0, width: 22.0, height: 4.5 }
      },
      {
        clientKey: 'q7',
        type: 'multiple-choice',
        answer: '$\\frac{14}{5}$',
        options: ['$\\frac{14}{5}$', '$\\frac{5}{14}$', '14', '$\\frac{35}{2}$'],
        problemLabel: '(7)',
        responseLabel: 'x의 값',
        hints: ['5:2 = 7:x 에서 x = 14/5입니다.', '$\\frac{14}{5}$를 선택하세요.'],
        sourceText: '5:2 = 7:x',
        confidence: 0.99,
        position: { top: 64.5, left: 60.0, width: 22.0, height: 4.5 }
      },
      {
        clientKey: 'q8',
        type: 'multiple-choice',
        answer: '18',
        options: ['18', '$\\frac{72}{4}$', '32', '9'],
        problemLabel: '(8)',
        responseLabel: 'x의 값',
        hints: ['9:4 = x:8 에서 x = 18입니다.', '18을 선택하세요.'],
        sourceText: '9:4 = x:8',
        confidence: 0.99,
        position: { top: 84.5, left: 60.0, width: 22.0, height: 4.5 }
      }
    ]
  },

  // Page 7: Slide 134
  {
    pageId: 'page_1786933997924_7',
    summary: '표현문제 1 - 비례식을 곱의 관계로 표현하기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '1 × 30 = 5 × x',
        options: ['1 × 30 = 5 × x', '5 × 30 = 1 × x', '1 × 5 = x × 30', '1 × x = 5 × 30'],
        problemLabel: '(2)',
        responseLabel: '곱의 관계 식',
        hints: ['외항의 곱 = 내항의 곱을 적용하세요.', '1 × 30 = 5 × x를 선택하세요.'],
        sourceText: '1 : 5 = x : 30',
        confidence: 0.99,
        position: { top: 82.5, left: 18.5, width: 26.0, height: 4.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '2 × x = 3 × 6',
        options: ['2 × x = 3 × 6', '3 × x = 2 × 6', '2 × 3 = 6 × x', '2 × 6 = 3 × x'],
        problemLabel: '(3)',
        responseLabel: '곱의 관계 식',
        hints: ['엇갈려 곱한 식을 찾으세요.', '2 × x = 3 × 6을 선택하세요.'],
        sourceText: '2/3 = 6/x',
        confidence: 0.99,
        position: { top: 62.5, left: 56.0, width: 26.0, height: 4.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '2 × 10 = 5 × x',
        options: ['2 × 10 = 5 × x', '5 × 10 = 2 × x', '2 × 5 = x × 10', '2 × x = 5 × 10'],
        problemLabel: '(4)',
        responseLabel: '곱의 관계 식',
        hints: ['엇갈려 곱한 식을 찾으세요.', '2 × 10 = 5 × x를 선택하세요.'],
        sourceText: '2/5 = x/10',
        confidence: 0.99,
        position: { top: 82.5, left: 56.0, width: 26.0, height: 4.5 }
      }
    ]
  },

  // Page 8: Slide 135
  {
    pageId: 'page_1786933997924_8',
    summary: '연습문제 7 - 비례식의 미지수 x값 구하기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '$\\frac{15}{8}$',
        options: ['$\\frac{15}{8}$', '$\\frac{8}{15}$', '15', '$\\frac{24}{5}$'],
        problemLabel: '(2)',
        responseLabel: 'x의 값',
        hints: ['8:3 = 5:x 에서 8x = 15이므로 x = 15/8입니다.', '$\\frac{15}{8}$를 선택하세요.'],
        sourceText: '8:3 = 5:x',
        confidence: 0.99,
        position: { top: 44.5, left: 22.0, width: 22.0, height: 4.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '$\\frac{91}{2}$',
        options: ['$\\frac{91}{2}$', '$\\frac{2}{91}$', '91', '45.5'],
        problemLabel: '(3)',
        responseLabel: 'x의 값',
        hints: ['13:2 = x:7 에서 2x = 91이므로 x = 91/2입니다.', '$\\frac{91}{2}$를 선택하세요.'],
        sourceText: '13:2 = x:7',
        confidence: 0.99,
        position: { top: 64.5, left: 22.0, width: 22.0, height: 4.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '$\\frac{121}{10}$',
        options: ['$\\frac{121}{10}$', '$\\frac{10}{121}$', '12.1', '121'],
        problemLabel: '(4)',
        responseLabel: 'x의 값',
        hints: ['10:11 = 11:x 에서 10x = 121이므로 x = 121/10입니다.', '$\\frac{121}{10}$을 선택하세요.'],
        sourceText: '10:11 = 11:x',
        confidence: 0.99,
        position: { top: 84.5, left: 22.0, width: 22.0, height: 4.5 }
      },
      {
        clientKey: 'q5',
        type: 'multiple-choice',
        answer: '$\\frac{35}{3}$',
        options: ['$\\frac{35}{3}$', '$\\frac{3}{35}$', '35', '$\\frac{21}{5}$'],
        problemLabel: '(5)',
        responseLabel: 'x의 값',
        hints: ['3:7 = 5:x 에서 3x = 35이므로 x = 35/3입니다.', '$\\frac{35}{3}$를 선택하세요.'],
        sourceText: '3:7 = 5:x',
        confidence: 0.99,
        position: { top: 24.5, left: 60.0, width: 22.0, height: 4.5 }
      },
      {
        clientKey: 'q6',
        type: 'multiple-choice',
        answer: '$\\frac{8}{5}$',
        options: ['$\\frac{8}{5}$', '$\\frac{5}{8}$', '8', '$\\frac{10}{4}$'],
        problemLabel: '(6)',
        responseLabel: 'x의 값',
        hints: ['2:5 = x:4 에서 5x = 8이므로 x = 8/5입니다.', '$\\frac{8}{5}$을 선택하세요.'],
        sourceText: '2:5 = x:4',
        confidence: 0.99,
        position: { top: 44.5, left: 60.0, width: 22.0, height: 4.5 }
      },
      {
        clientKey: 'q7',
        type: 'multiple-choice',
        answer: '$\\frac{63}{5}$',
        options: ['$\\frac{63}{5}$', '$\\frac{5}{63}$', '63', '$\\frac{45}{7}$'],
        problemLabel: '(7)',
        responseLabel: 'x의 값',
        hints: ['5:9 = 7:x 에서 5x = 63이므로 x = 63/5입니다.', '$\\frac{63}{5}$을 선택하세요.'],
        sourceText: '5:9 = 7:x',
        confidence: 0.99,
        position: { top: 64.5, left: 60.0, width: 22.0, height: 4.5 }
      },
      {
        clientKey: 'q8',
        type: 'multiple-choice',
        answer: '36',
        options: ['36', '$\\frac{72}{2}$', '16', '18'],
        problemLabel: '(8)',
        responseLabel: 'x의 값',
        hints: ['9:2 = x:8 에서 2x = 72이므로 x = 36입니다.', '36을 선택하세요.'],
        sourceText: '9:2 = x:8',
        confidence: 0.99,
        position: { top: 84.5, left: 60.0, width: 22.0, height: 4.5 }
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
console.log('All 8 pages generated successfully!');
