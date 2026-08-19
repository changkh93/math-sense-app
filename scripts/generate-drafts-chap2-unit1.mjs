import fs from 'node:fs';
import path from 'node:path';

const unitId = 'ratios_ratio_chap2_unit1';

const pagesData = [
  // Page 1: Slide 60 (보기 중에서 비례식을 고르세요)
  {
    pageId: 'page_1786933901370_1',
    summary: '연습문제 1 - 보기 중에서 비례식 고르기',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '② a : b = 3 : 7',
        options: ['② a : b = 3 : 7', '① 2 : 3 : 4', '③ 25%'],
        problemLabel: '(2)',
        responseLabel: '비례식',
        hints: ['두 비가 같음을 등호(=)로 나타낸 식을 찾으세요.', '② a : b = 3 : 7을 선택하세요.'],
        sourceText: '보기 중에서 비례식을 고르세요.',
        confidence: 0.99,
        position: { top: 76.5, left: 16.0, width: 31.0, height: 9.0 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '② a : b = c : d',
        options: ['② a : b = c : d', '① 2 : 3 ≠ 5 : 6', '③ \\frac{2}{4}'],
        problemLabel: '(3)',
        responseLabel: '비례식',
        hints: ['등호(=)로 두 비가 연결된 식을 찾으세요.', '② a : b = c : d를 선택하세요.'],
        sourceText: '보기 중에서 비례식을 고르세요.',
        confidence: 0.99,
        position: { top: 56.5, left: 53.5, width: 31.0, height: 9.0 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '① \\frac{2}{4} = \\frac{10}{20}',
        options: ['① \\frac{2}{4} = \\frac{10}{20}', '② a : b ≠ c : d', '③ \\frac{6}{100}'],
        problemLabel: '(4)',
        responseLabel: '비례식',
        hints: ['두 분수(비)가 등호(=)로 연결된 식을 찾으세요.', '① \\frac{2}{4} = \\frac{10}{20}을 선택하세요.'],
        sourceText: '보기 중에서 비례식을 고르세요.',
        confidence: 0.99,
        position: { top: 76.5, left: 53.5, width: 31.0, height: 9.0 }
      }
    ]
  },

  // Page 2: Slide 61 (비례식의 성질을 이용하여, □ 안에 알맞은 수를 넣으세요)
  {
    pageId: 'page_1786933901370_2',
    summary: '연습문제 2 - 비례식의 성질을 이용하여 빈칸 채우기',
    elements: [
      {
        clientKey: 'q2',
        type: 'input',
        inputMode: 'integer',
        answer: '30',
        acceptedAnswers: ['30'],
        problemLabel: '(2)',
        responseLabel: '빈칸의 수',
        hints: ['5에 6을 곱해보세요.', '30을 입력하세요.'],
        sourceText: '1:5 = 6:[ ]',
        confidence: 0.99,
        position: { top: 76.0, left: 40.0, width: 4.5, height: 5.5 }
      },
      {
        clientKey: 'q3',
        type: 'input',
        inputMode: 'integer',
        answer: '9',
        acceptedAnswers: ['9'],
        problemLabel: '(3)',
        responseLabel: '빈칸의 수',
        hints: ['3에 3을 곱해보세요.', '9를 입력하세요.'],
        sourceText: '2/3 = 6/[ ]',
        confidence: 0.99,
        position: { top: 58.5, left: 72.0, width: 4.5, height: 5.5 }
      },
      {
        clientKey: 'q4',
        type: 'input',
        inputMode: 'integer',
        answer: '10',
        acceptedAnswers: ['10'],
        problemLabel: '(4)',
        responseLabel: '빈칸의 수',
        hints: ['5에 2를 곱해보세요.', '10을 입력하세요.'],
        sourceText: '2/5 = 4/[ ]',
        confidence: 0.99,
        position: { top: 79.5, left: 72.0, width: 4.5, height: 5.5 }
      }
    ]
  },

  // Page 3: Slide 62
  {
    pageId: 'page_1786933901370_3',
    summary: '연습문제 3 - 비례식의 성질을 이용하여 빈칸 채우기',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '4y',
        options: ['4y', '4x', 'y', 'x'],
        problemLabel: '(2)',
        responseLabel: '빈칸의 식',
        hints: ['y에 4를 곱한 식을 찾으세요.', '4y를 선택하세요.'],
        sourceText: 'x : y = 4x : [ ]',
        confidence: 0.99,
        position: { top: 38.5, left: 41.5, width: 4.5, height: 5.5 }
      },
      {
        clientKey: 'q3',
        type: 'input',
        inputMode: 'integer',
        answer: '25',
        acceptedAnswers: ['25'],
        problemLabel: '(3)',
        responseLabel: '빈칸의 수',
        hints: ['5에 5를 곱해보세요.', '25를 입력하세요.'],
        sourceText: '2/5 = 10/[ ]',
        confidence: 0.99,
        position: { top: 61.5, left: 35.5, width: 4.5, height: 5.5 }
      },
      {
        clientKey: 'q4',
        type: 'input',
        inputMode: 'integer',
        answer: '9',
        acceptedAnswers: ['9'],
        problemLabel: '(4)',
        responseLabel: '빈칸의 수',
        hints: ['3에 3을 곱해보세요.', '9를 입력하세요.'],
        sourceText: '5:3 = 15:[ ]',
        confidence: 0.99,
        position: { top: 78.5, left: 42.5, width: 4.5, height: 5.5 }
      },
      {
        clientKey: 'q6',
        type: 'input',
        inputMode: 'integer',
        answer: '50',
        acceptedAnswers: ['50'],
        problemLabel: '(6)',
        responseLabel: '빈칸의 수',
        hints: ['5에 10을 곱해보세요.', '50을 입력하세요.'],
        sourceText: '3/5 = 30/[ ]',
        confidence: 0.99,
        position: { top: 41.5, left: 72.0, width: 4.5, height: 5.5 }
      },
      {
        clientKey: 'q7',
        type: 'input',
        inputMode: 'integer',
        answer: '4',
        acceptedAnswers: ['4'],
        problemLabel: '(7)',
        responseLabel: '빈칸의 수',
        hints: ['1에 4를 곱해보세요.', '4를 입력하세요.'],
        sourceText: '1:2 = [ ]:8',
        confidence: 0.99,
        position: { top: 59.5, left: 69.0, width: 4.5, height: 5.5 }
      },
      {
        clientKey: 'q8',
        type: 'input',
        inputMode: 'integer',
        answer: '8',
        acceptedAnswers: ['8'],
        problemLabel: '(8)',
        responseLabel: '빈칸의 수',
        hints: ['4에 2를 곱해보세요.', '8을 입력하세요.'],
        sourceText: '4/1 = [ ]/2',
        confidence: 0.99,
        position: { top: 77.0, left: 72.0, width: 4.5, height: 5.5 }
      }
    ]
  },

  // Page 4: Slide 63
  {
    pageId: 'page_1786933901370_4',
    summary: '연습문제 4 - 배수 관계 빈칸 채우기',
    elements: [
      {
        clientKey: 'q2_top',
        type: 'input',
        inputMode: 'integer',
        answer: '5',
        acceptedAnswers: ['5', '×5', 'x5'],
        problemLabel: '(2) 상단',
        responseLabel: '곱해진 수',
        hints: ['x가 5x가 되려면 몇을 곱해야 하는지 생각해보세요.', '5를 입력하세요.'],
        sourceText: 'x -> 5x',
        confidence: 0.99,
        position: { top: 34.0, left: 25.5, width: 5.5, height: 4.0 }
      },
      {
        clientKey: 'q2_bot',
        type: 'input',
        inputMode: 'integer',
        answer: '5',
        acceptedAnswers: ['5', '×5', 'x5'],
        problemLabel: '(2) 하단',
        responseLabel: '곱해진 수',
        hints: ['y가 5y가 되려면 몇을 곱해야 하는지 생각해보세요.', '5를 입력하세요.'],
        sourceText: 'y -> 5y',
        confidence: 0.99,
        position: { top: 45.0, left: 32.5, width: 5.5, height: 4.0 }
      },
      {
        clientKey: 'q3_top',
        type: 'input',
        inputMode: 'integer',
        answer: '5',
        acceptedAnswers: ['5', '×5', 'x5'],
        problemLabel: '(3) 상단',
        responseLabel: '곱해진 수',
        hints: ['2가 10이 되려면 몇을 곱해야 하는지 생각해보세요.', '5를 입력하세요.'],
        sourceText: '2 -> 10',
        confidence: 0.99,
        position: { top: 54.0, left: 27.5, width: 5.5, height: 4.0 }
      },
      {
        clientKey: 'q3_bot',
        type: 'input',
        inputMode: 'integer',
        answer: '5',
        acceptedAnswers: ['5', '×5', 'x5'],
        problemLabel: '(3) 하단',
        responseLabel: '곱해진 수',
        hints: ['5가 25가 되려면 몇을 곱해야 하는지 생각해보세요.', '5를 입력하세요.'],
        sourceText: '5 -> 25',
        confidence: 0.99,
        position: { top: 65.0, left: 27.5, width: 5.5, height: 4.0 }
      },
      {
        clientKey: 'q4_top',
        type: 'input',
        inputMode: 'integer',
        answer: '3',
        acceptedAnswers: ['3', '×3', 'x3'],
        problemLabel: '(4) 상단',
        responseLabel: '곱해진 수',
        hints: ['5가 15가 되려면 몇을 곱해야 하는지 생각해보세요.', '3을 입력하세요.'],
        sourceText: '5 -> 15',
        confidence: 0.99,
        position: { top: 74.0, left: 25.5, width: 5.5, height: 4.0 }
      },
      {
        clientKey: 'q4_bot',
        type: 'input',
        inputMode: 'integer',
        answer: '3',
        acceptedAnswers: ['3', '×3', 'x3'],
        problemLabel: '(4) 하단',
        responseLabel: '곱해진 수',
        hints: ['3이 9가 되려면 몇을 곱해야 하는지 생각해보세요.', '3을 입력하세요.'],
        sourceText: '3 -> 9',
        confidence: 0.99,
        position: { top: 85.0, left: 32.5, width: 5.5, height: 4.0 }
      },
      {
        clientKey: 'q5_top',
        type: 'input',
        inputMode: 'integer',
        answer: '3',
        acceptedAnswers: ['3', '×3', 'x3'],
        problemLabel: '(5) 상단',
        responseLabel: '곱해진 수',
        hints: ['2가 6이 되려면 몇을 곱해야 하는지 생각해보세요.', '3을 입력하세요.'],
        sourceText: '2 -> 6',
        confidence: 0.99,
        position: { top: 13.5, left: 65.0, width: 5.5, height: 4.0 }
      },
      {
        clientKey: 'q5_bot',
        type: 'input',
        inputMode: 'integer',
        answer: '3',
        acceptedAnswers: ['3', '×3', 'x3'],
        problemLabel: '(5) 하단',
        responseLabel: '곱해진 수',
        hints: ['3이 9가 되려면 몇을 곱해야 하는지 생각해보세요.', '3을 입력하세요.'],
        sourceText: '3 -> 9',
        confidence: 0.99,
        position: { top: 24.5, left: 65.0, width: 5.5, height: 4.0 }
      },
      {
        clientKey: 'q6_top',
        type: 'input',
        inputMode: 'integer',
        answer: '10',
        acceptedAnswers: ['10', '×10', 'x10'],
        problemLabel: '(6) 상단',
        responseLabel: '곱해진 수',
        hints: ['3이 30이 되려면 몇을 곱해야 하는지 생각해보세요.', '10을 입력하세요.'],
        sourceText: '3 -> 30',
        confidence: 0.99,
        position: { top: 34.0, left: 65.0, width: 5.5, height: 4.0 }
      },
      {
        clientKey: 'q6_bot',
        type: 'input',
        inputMode: 'integer',
        answer: '10',
        acceptedAnswers: ['10', '×10', 'x10'],
        problemLabel: '(6) 하단',
        responseLabel: '곱해진 수',
        hints: ['5가 50이 되려면 몇을 곱해야 하는지 생각해보세요.', '10을 입력하세요.'],
        sourceText: '5 -> 50',
        confidence: 0.99,
        position: { top: 45.0, left: 65.0, width: 5.5, height: 4.0 }
      },
      {
        clientKey: 'q7_top',
        type: 'input',
        inputMode: 'integer',
        answer: '4',
        acceptedAnswers: ['4', '×4', 'x4'],
        problemLabel: '(7) 상단',
        responseLabel: '곱해진 수',
        hints: ['1이 4가 되려면 몇을 곱해야 하는지 생각해보세요.', '4를 입력하세요.'],
        sourceText: '1 -> 4',
        confidence: 0.99,
        position: { top: 54.0, left: 62.0, width: 5.5, height: 4.0 }
      },
      {
        clientKey: 'q7_bot',
        type: 'input',
        inputMode: 'integer',
        answer: '4',
        acceptedAnswers: ['4', '×4', 'x4'],
        problemLabel: '(7) 하단',
        responseLabel: '곱해진 수',
        hints: ['2가 8이 되려면 몇을 곱해야 하는지 생각해보세요.', '4를 입력하세요.'],
        sourceText: '2 -> 8',
        confidence: 0.99,
        position: { top: 65.0, left: 69.0, width: 5.5, height: 4.0 }
      },
      {
        clientKey: 'q8_top',
        type: 'input',
        inputMode: 'integer',
        answer: '2',
        acceptedAnswers: ['2', '×2', 'x2'],
        problemLabel: '(8) 상단',
        responseLabel: '곱해진 수',
        hints: ['4가 8이 되려면 몇을 곱해야 하는지 생각해보세요.', '2를 입력하세요.'],
        sourceText: '4 -> 8',
        confidence: 0.99,
        position: { top: 74.0, left: 65.0, width: 5.5, height: 4.0 }
      },
      {
        clientKey: 'q8_bot',
        type: 'input',
        inputMode: 'integer',
        answer: '2',
        acceptedAnswers: ['2', '×2', 'x2'],
        problemLabel: '(8) 하단',
        responseLabel: '곱해진 수',
        hints: ['1이 2가 되려면 몇을 곱해야 하는지 생각해보세요.', '2를 입력하세요.'],
        sourceText: '1 -> 2',
        confidence: 0.99,
        position: { top: 85.0, left: 65.0, width: 5.5, height: 4.0 }
      }
    ]
  },

  // Page 5: Slide 64
  {
    pageId: 'page_1786933901370_5',
    summary: '연습문제 5 - 비례식의 성질을 이용하여 빈칸 채우기',
    elements: [
      {
        clientKey: 'q2',
        type: 'input',
        inputMode: 'integer',
        answer: '35',
        acceptedAnswers: ['35'],
        problemLabel: '(2)',
        responseLabel: '빈칸의 수',
        hints: ['3이 15가 되었으므로 5배입니다. 7에 5를 곱하세요.', '35를 입력하세요.'],
        sourceText: '3:7 = 15:[ ]',
        confidence: 0.99,
        position: { top: 39.0, left: 42.5, width: 4.5, height: 5.5 }
      },
      {
        clientKey: 'q3',
        type: 'input',
        inputMode: 'integer',
        answer: '25',
        acceptedAnswers: ['25'],
        problemLabel: '(3)',
        responseLabel: '빈칸의 수',
        hints: ['2가 10이 되었으므로 5배입니다. 5에 5를 곱하세요.', '25를 입력하세요.'],
        sourceText: '2/5 = 10/[ ]',
        confidence: 0.99,
        position: { top: 62.0, left: 35.5, width: 4.5, height: 5.5 }
      },
      {
        clientKey: 'q4',
        type: 'input',
        inputMode: 'integer',
        answer: '9',
        acceptedAnswers: ['9'],
        problemLabel: '(4)',
        responseLabel: '빈칸의 수',
        hints: ['5가 15가 되었으므로 3배입니다. 3에 3을 곱하세요.', '9를 입력하세요.'],
        sourceText: '5:3 = 15:[ ]',
        confidence: 0.99,
        position: { top: 79.0, left: 42.5, width: 4.5, height: 5.5 }
      },
      {
        clientKey: 'q5',
        type: 'input',
        inputMode: 'integer',
        answer: '8',
        acceptedAnswers: ['8'],
        problemLabel: '(5)',
        responseLabel: '빈칸의 수',
        hints: ['3이 12가 되었으므로 4배입니다. 2에 4를 곱하세요.', '8을 입력하세요.'],
        sourceText: '2/3 = [ ]/12',
        confidence: 0.99,
        position: { top: 17.5, left: 72.0, width: 4.5, height: 5.5 }
      },
      {
        clientKey: 'q6',
        type: 'input',
        inputMode: 'integer',
        answer: '25',
        acceptedAnswers: ['25'],
        problemLabel: '(6)',
        responseLabel: '빈칸의 수',
        hints: ['6이 30이 되었으므로 5배입니다. 5에 5를 곱하세요.', '25를 입력하세요.'],
        sourceText: '6/5 = 30/[ ]',
        confidence: 0.99,
        position: { top: 42.0, left: 72.0, width: 4.5, height: 5.5 }
      },
      {
        clientKey: 'q7',
        type: 'input',
        inputMode: 'integer',
        answer: '3',
        acceptedAnswers: ['3'],
        problemLabel: '(7)',
        responseLabel: '빈칸의 수',
        hints: ['4가 12가 되었으므로 3배입니다. 1에 3을 곱하세요.', '3을 입력하세요.'],
        sourceText: '1:4 = [ ]:12',
        confidence: 0.99,
        position: { top: 59.5, left: 69.0, width: 4.5, height: 5.5 }
      },
      {
        clientKey: 'q8',
        type: 'input',
        inputMode: 'integer',
        answer: '8',
        acceptedAnswers: ['8'],
        problemLabel: '(8)',
        responseLabel: '빈칸의 수',
        hints: ['1이 2가 되었으므로 2배입니다. 4에 2를 곱하세요.', '8을 입력하세요.'],
        sourceText: '4/1 = [ ]/2',
        confidence: 0.99,
        position: { top: 77.5, left: 72.0, width: 4.5, height: 5.5 }
      }
    ]
  },

  // Page 6: Slide 65 (나누기를 곱하기 역수로 바꾸세요)
  {
    pageId: 'page_1786933901370_6',
    summary: '표현문제 1 - 나누기를 곱하기 역수로 바꾸기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '$\\times 3$',
        options: ['$\\times 3$', '$\\times \\frac{1}{3}$', '$\\times 2$', '$\\times \\frac{3}{2}$'],
        problemLabel: '(2)',
        responseLabel: '곱하기 역수',
        hints: ['1/3의 역수는 3입니다.', '$\\times 3$을 선택하세요.'],
        sourceText: '÷ 1/3',
        confidence: 0.99,
        position: { top: 79.5, left: 36.0, width: 11.0, height: 4.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '$\\times \\frac{1}{2}$',
        options: ['$\\times \\frac{1}{2}$', '$\\times 2$', '$\\times \\frac{1}{3}$', '$\\times \\frac{2}{1}$'],
        problemLabel: '(3)',
        responseLabel: '곱하기 역수',
        hints: ['2의 역수는 1/2입니다.', '$\\times \\frac{1}{2}$을 선택하세요.'],
        sourceText: '÷ 2',
        confidence: 0.99,
        position: { top: 59.5, left: 73.5, width: 11.0, height: 4.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '$\\times \\frac{5}{2}$',
        options: ['$\\times \\frac{5}{2}$', '$\\times \\frac{2}{5}$', '$\\times 5$', '$\\times \\frac{5}{3}$'],
        problemLabel: '(4)',
        responseLabel: '곱하기 역수',
        hints: ['2/5의 역수는 5/2입니다.', '$\\times \\frac{5}{2}$를 선택하세요.'],
        sourceText: '÷ 2/5',
        confidence: 0.99,
        position: { top: 79.5, left: 73.5, width: 11.0, height: 4.5 }
      }
    ]
  },

  // Page 7: Slide 66
  {
    pageId: 'page_1786933901370_7',
    summary: '연습문제 6 - 비례식의 성질을 이용하여 빈칸 채우기',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '2d',
        options: ['2d', '4d', 'd', '2c'],
        problemLabel: '(2)',
        responseLabel: '빈칸의 식',
        hints: ['8d에 1/4을 곱해보세요.', '2d를 선택하세요.'],
        sourceText: '4c : 8d = c : [ ]',
        confidence: 0.99,
        position: { top: 39.0, left: 42.5, width: 4.5, height: 5.5 }
      },
      {
        clientKey: 'q3',
        type: 'input',
        inputMode: 'integer',
        answer: '5',
        acceptedAnswers: ['5'],
        problemLabel: '(3)',
        responseLabel: '빈칸의 수',
        hints: ['25에 1/5을 곱하세요 (25 ÷ 5).', '5를 입력하세요.'],
        sourceText: '10/25 = 2/[ ]',
        confidence: 0.99,
        position: { top: 62.0, left: 36.5, width: 4.5, height: 5.5 }
      },
      {
        clientKey: 'q4',
        type: 'input',
        inputMode: 'integer',
        answer: '3',
        acceptedAnswers: ['3'],
        problemLabel: '(4)',
        responseLabel: '빈칸의 수',
        hints: ['9에 1/3을 곱하세요 (9 ÷ 3).', '3을 입력하세요.'],
        sourceText: '15:9 = 5:[ ]',
        confidence: 0.99,
        position: { top: 78.5, left: 42.5, width: 4.5, height: 5.5 }
      },
      {
        clientKey: 'q5',
        type: 'input',
        inputMode: 'integer',
        answer: '2',
        acceptedAnswers: ['2'],
        problemLabel: '(5)',
        responseLabel: '빈칸의 수',
        hints: ['6에 1/3을 곱하세요 (6 ÷ 3).', '2를 입력하세요.'],
        sourceText: '6/9 = [ ]/3',
        confidence: 0.99,
        position: { top: 17.5, left: 72.0, width: 4.5, height: 5.5 }
      },
      {
        clientKey: 'q6',
        type: 'input',
        inputMode: 'integer',
        answer: '5',
        acceptedAnswers: ['5'],
        problemLabel: '(6)',
        responseLabel: '빈칸의 수',
        hints: ['50에 1/10을 곱하세요 (50 ÷ 10).', '5를 입력하세요.'],
        sourceText: '30/50 = 3/[ ]',
        confidence: 0.99,
        position: { top: 42.0, left: 73.5, width: 4.5, height: 5.5 }
      },
      {
        clientKey: 'q7',
        type: 'multiple-choice',
        answer: '2b',
        options: ['2b', '4b', 'b', '2c'],
        problemLabel: '(7)',
        responseLabel: '빈칸의 식',
        hints: ['4b에 1/2을 곱해보세요.', '2b를 선택하세요.'],
        sourceText: '4b : 2c = [ ] : c',
        confidence: 0.99,
        position: { top: 59.5, left: 72.5, width: 4.5, height: 5.5 }
      },
      {
        clientKey: 'q8',
        type: 'input',
        inputMode: 'integer',
        answer: '3',
        acceptedAnswers: ['3'],
        problemLabel: '(8)',
        responseLabel: '빈칸의 수',
        hints: ['6에 1/2을 곱하세요 (6 ÷ 2).', '3을 입력하세요.'],
        sourceText: '6/2 = [ ]/1',
        confidence: 0.99,
        position: { top: 77.5, left: 72.0, width: 4.5, height: 5.5 }
      }
    ]
  },

  // Page 8: Slide 67
  {
    pageId: 'page_1786933901370_8',
    summary: '연습문제 7 - 비례식의 성질을 이용하여 빈칸 채우기',
    elements: [
      {
        clientKey: 'q2',
        type: 'input',
        inputMode: 'integer',
        answer: '5',
        acceptedAnswers: ['5'],
        problemLabel: '(2)',
        responseLabel: '빈칸의 수',
        hints: ['16이 2가 되었으므로 8로 나눕니다. 40 ÷ 8을 계산하세요.', '5를 입력하세요.'],
        sourceText: '16:40 = 2:[ ]',
        confidence: 0.99,
        position: { top: 39.0, left: 41.5, width: 4.5, height: 5.5 }
      },
      {
        clientKey: 'q3',
        type: 'input',
        inputMode: 'integer',
        answer: '5',
        acceptedAnswers: ['5'],
        problemLabel: '(3)',
        responseLabel: '빈칸의 수',
        hints: ['10이 2가 되었으므로 5로 나눕니다. 25 ÷ 5를 계산하세요.', '5를 입력하세요.'],
        sourceText: '10/25 = 2/[ ]',
        confidence: 0.99,
        position: { top: 62.0, left: 36.5, width: 4.5, height: 5.5 }
      },
      {
        clientKey: 'q4',
        type: 'input',
        inputMode: 'integer',
        answer: '3',
        acceptedAnswers: ['3'],
        problemLabel: '(4)',
        responseLabel: '빈칸의 수',
        hints: ['15가 5가 되었으므로 3으로 나눕니다. 9 ÷ 3을 계산하세요.', '3을 입력하세요.'],
        sourceText: '15:9 = 5:[ ]',
        confidence: 0.99,
        position: { top: 78.5, left: 41.5, width: 4.5, height: 5.5 }
      },
      {
        clientKey: 'q5',
        type: 'input',
        inputMode: 'integer',
        answer: '5',
        acceptedAnswers: ['5'],
        problemLabel: '(5)',
        responseLabel: '빈칸의 수',
        hints: ['9가 3이 되었으므로 3으로 나눕니다. 15 ÷ 3을 계산하세요.', '5를 입력하세요.'],
        sourceText: '15/9 = [ ]/3',
        confidence: 0.99,
        position: { top: 17.5, left: 73.5, width: 4.5, height: 5.5 }
      },
      {
        clientKey: 'q6',
        type: 'input',
        inputMode: 'integer',
        answer: '5',
        acceptedAnswers: ['5'],
        problemLabel: '(6)',
        responseLabel: '빈칸의 수',
        hints: ['30이 3이 되었으므로 10으로 나눕니다. 50 ÷ 10을 계산하세요.', '5를 입력하세요.'],
        sourceText: '30/50 = 3/[ ]',
        confidence: 0.99,
        position: { top: 42.0, left: 73.5, width: 4.5, height: 5.5 }
      },
      {
        clientKey: 'q7',
        type: 'input',
        inputMode: 'integer',
        answer: '1',
        acceptedAnswers: ['1'],
        problemLabel: '(7)',
        responseLabel: '빈칸의 수',
        hints: ['6이 2가 되었으므로 3으로 나눕니다. 3 ÷ 3을 계산하세요.', '1을 입력하세요.'],
        sourceText: '3:6 = [ ]:2',
        confidence: 0.99,
        position: { top: 59.5, left: 69.0, width: 4.5, height: 5.5 }
      },
      {
        clientKey: 'q8',
        type: 'input',
        inputMode: 'integer',
        answer: '3',
        acceptedAnswers: ['3'],
        problemLabel: '(8)',
        responseLabel: '빈칸의 수',
        hints: ['2가 1이 되었으므로 2로 나눕니다. 6 ÷ 2를 계산하세요.', '3을 입력하세요.'],
        sourceText: '6/2 = [ ]/1',
        confidence: 0.99,
        position: { top: 77.5, left: 72.0, width: 4.5, height: 5.5 }
      }
    ]
  },

  // Page 9: Slide 68 (분수의 비를 자연수의 비로 바꾸세요)
  {
    pageId: 'page_1786933901370_9',
    summary: '연습문제 8 - 분수의 비를 자연수의 비로 바꾸기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '3 : 2',
        options: ['3 : 2', '2 : 3', '3 : 10', '2 : 10'],
        problemLabel: '(2)',
        responseLabel: '자연수의 비',
        hints: ['분모(십)가 같으므로 분자의 비와 같습니다.', '3 : 2를 선택하세요.'],
        sourceText: '3/십 : 2/십',
        confidence: 0.99,
        position: { top: 79.5, left: 34.5, width: 11.5, height: 4.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '3 : 2',
        options: ['3 : 2', '2 : 3', '3a : 2a', '3 : a'],
        problemLabel: '(3)',
        responseLabel: '자연수의 비',
        hints: ['분모(a)가 같으므로 분자의 비와 같습니다.', '3 : 2를 선택하세요.'],
        sourceText: '3/a : 2/a',
        confidence: 0.99,
        position: { top: 59.5, left: 70.5, width: 11.5, height: 4.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '1 : 12',
        options: ['1 : 12', '12 : 1', '1 : 99', '12 : 99'],
        problemLabel: '(4)',
        responseLabel: '자연수의 비',
        hints: ['분모(99)가 같으므로 분자의 비와 같습니다.', '1 : 12를 선택하세요.'],
        sourceText: '1/99 : 12/99',
        confidence: 0.99,
        position: { top: 79.5, left: 72.5, width: 11.5, height: 4.5 }
      }
    ]
  },

  // Page 10: Slide 69
  {
    pageId: 'page_1786933901370_10',
    summary: '연습문제 9 - 분수의 비를 자연수/문자의 비로 바꾸기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '11 : 100',
        options: ['11 : 100', '100 : 11', '11 : 70', '100 : 70'],
        problemLabel: '(2)',
        responseLabel: '자연수의 비',
        hints: ['분모가 같으므로 분자의 비와 같습니다.', '11 : 100을 선택하세요.'],
        sourceText: '11/70 : 100/70',
        confidence: 0.99,
        position: { top: 41.5, left: 35.5, width: 11.5, height: 4.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '3a : 2b',
        options: ['3a : 2b', '2b : 3a', '3 : 2', 'a : b'],
        problemLabel: '(3)',
        responseLabel: '문자의 비',
        hints: ['분모가 같으므로 분자의 비와 같습니다.', '3a : 2b를 선택하세요.'],
        sourceText: '3a/11 : 2b/11',
        confidence: 0.99,
        position: { top: 61.5, left: 35.5, width: 11.5, height: 4.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '3 : 2',
        options: ['3 : 2', '2 : 3', '3x : 2x', '3 : x'],
        problemLabel: '(4)',
        responseLabel: '자연수의 비',
        hints: ['분모(x)가 같으므로 분자의 비와 같습니다.', '3 : 2를 선택하세요.'],
        sourceText: '3/x : 2/x',
        confidence: 0.99,
        position: { top: 81.5, left: 32.5, width: 11.5, height: 4.5 }
      },
      {
        clientKey: 'q5',
        type: 'multiple-choice',
        answer: 'b : c',
        options: ['b : c', 'c : b', 'ab : c', 'b : a'],
        problemLabel: '(5)',
        responseLabel: '문자의 비',
        hints: ['분모(ab)가 같으므로 분자의 비와 같습니다.', 'b : c를 선택하세요.'],
        sourceText: 'b/ab : c/ab',
        confidence: 0.99,
        position: { top: 22.5, left: 72.5, width: 11.5, height: 4.5 }
      },
      {
        clientKey: 'q6',
        type: 'multiple-choice',
        answer: '7 : 12',
        options: ['7 : 12', '12 : 7', '7d : 12d', '7 : 9d'],
        problemLabel: '(6)',
        responseLabel: '자연수의 비',
        hints: ['분모(9d)가 같으므로 분자의 비와 같습니다.', '7 : 12를 선택하세요.'],
        sourceText: '7/9d : 12/9d',
        confidence: 0.99,
        position: { top: 41.5, left: 72.5, width: 11.5, height: 4.5 }
      },
      {
        clientKey: 'q7',
        type: 'multiple-choice',
        answer: '5 : 7',
        options: ['5 : 7', '7 : 5', '5 : 10', '7 : 10'],
        problemLabel: '(7)',
        responseLabel: '자연수의 비',
        hints: ['분모(10)가 같으므로 분자의 비와 같습니다.', '5 : 7을 선택하세요.'],
        sourceText: '5/10 : 7/10',
        confidence: 0.99,
        position: { top: 61.5, left: 72.5, width: 11.5, height: 4.5 }
      },
      {
        clientKey: 'q8',
        type: 'multiple-choice',
        answer: '1 : 2',
        options: ['1 : 2', '2 : 1', '1 : 1', '2 : 2'],
        problemLabel: '(8)',
        responseLabel: '자연수의 비',
        hints: ['분모(1)가 같으므로 분자의 비와 같습니다.', '1 : 2를 선택하세요.'],
        sourceText: '1/1 : 2/1',
        confidence: 0.99,
        position: { top: 81.5, left: 70.5, width: 11.5, height: 4.5 }
      }
    ]
  },

  // Page 11: Slide 70
  {
    pageId: 'page_1786933901370_11',
    summary: '연습문제 10 - 통분을 통해 분수의 비를 자연수의 비로 바꾸기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '3 : 4',
        options: ['3 : 4', '2 : 6', '1 : 2', '4 : 3'],
        problemLabel: '(2)',
        responseLabel: '자연수의 비',
        hints: ['분모를 6으로 통분하면 3/6 : 4/6이 됩니다.', '3 : 4를 선택하세요.'],
        sourceText: '1/2 : 2/3',
        confidence: 0.99,
        position: { top: 38.5, left: 33.5, width: 11.5, height: 4.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '9 : 11',
        options: ['9 : 11', '11 : 9', '3 : 1', '9 : 33'],
        problemLabel: '(3)',
        responseLabel: '자연수의 비',
        hints: ['분모를 33으로 통분하면 9/33 : 11/33이 됩니다.', '9 : 11을 선택하세요.'],
        sourceText: '3/11 : 1/3',
        confidence: 0.99,
        position: { top: 58.5, left: 34.5, width: 11.5, height: 4.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: 'a : 4',
        options: ['a : 4', '4 : a', '1 : 2', '2 : a'],
        problemLabel: '(4)',
        responseLabel: '문자의 비',
        hints: ['분모를 2a로 통분하면 a/2a : 4/2a가 됩니다.', 'a : 4를 선택하세요.'],
        sourceText: '1/2 : 2/a',
        confidence: 0.99,
        position: { top: 78.5, left: 32.5, width: 11.5, height: 4.5 }
      },
      {
        clientKey: 'q6',
        type: 'multiple-choice',
        answer: '14 : 9',
        options: ['14 : 9', '9 : 14', '7 : 1', '7 : 2'],
        problemLabel: '(6)',
        responseLabel: '자연수의 비',
        hints: ['분모를 18로 통분하면 14/18 : 9/18이 됩니다.', '14 : 9를 선택하세요.'],
        sourceText: '7/9 : 1/2',
        confidence: 0.99,
        position: { top: 38.5, left: 70.5, width: 11.5, height: 4.5 }
      },
      {
        clientKey: 'q7',
        type: 'multiple-choice',
        answer: 'b : a',
        options: ['b : a', 'a : b', '1 : 1', 'ab : ba'],
        problemLabel: '(7)',
        responseLabel: '문자의 비',
        hints: ['분모를 ab로 통분하면 b/ab : a/ab가 됩니다.', 'b : a를 선택하세요.'],
        sourceText: '1/a : 1/b',
        confidence: 0.99,
        position: { top: 58.5, left: 70.5, width: 11.5, height: 4.5 }
      },
      {
        clientKey: 'q8',
        type: 'multiple-choice',
        answer: '6 : 7',
        options: ['6 : 7', '7 : 6', '1 : 1', '6 : 42'],
        problemLabel: '(8)',
        responseLabel: '자연수의 비',
        hints: ['분모를 42로 통분하면 6/42 : 7/42가 됩니다.', '6 : 7을 선택하세요.'],
        sourceText: '1/7 : 1/6',
        confidence: 0.99,
        position: { top: 78.5, left: 70.5, width: 11.5, height: 4.5 }
      }
    ]
  },

  // Page 12: Slide 71
  {
    pageId: 'page_1786933901370_12',
    summary: '연습문제 11 - 엇갈려 곱하기로 분수의 비를 자연수의 비로 바꾸기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '9 : 4',
        options: ['9 : 4', '4 : 9', '6 : 6', '3 : 2'],
        problemLabel: '(2)',
        responseLabel: '자연수의 비',
        hints: ['3×3과 2×2를 엇갈려 곱해보세요.', '9 : 4를 선택하세요.'],
        sourceText: '3/2 : 2/3',
        confidence: 0.99,
        position: { top: 79.5, left: 34.5, width: 11.5, height: 4.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '3b : 2a',
        options: ['3b : 2a', '2a : 3b', '3a : 2b', '2b : 3a'],
        problemLabel: '(3)',
        responseLabel: '문자의 비',
        hints: ['3×b와 2×a를 엇갈려 곱해보세요.', '3b : 2a를 선택하세요.'],
        sourceText: '3/a : 2/b',
        confidence: 0.99,
        position: { top: 59.5, left: 70.5, width: 11.5, height: 4.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '99 : 120',
        options: ['99 : 120', '120 : 99', '12 : 99', '10 : 12'],
        problemLabel: '(4)',
        responseLabel: '자연수의 비',
        hints: ['1×99와 12×10을 엇갈려 곱해보세요.', '99 : 120을 선택하세요.'],
        sourceText: '1/10 : 12/99',
        confidence: 0.99,
        position: { top: 79.5, left: 72.5, width: 11.5, height: 4.5 }
      }
    ]
  },

  // Page 13: Slide 72
  {
    pageId: 'page_1786933901370_13',
    summary: '연습문제 12 - 엇갈려 곱하기로 분수의 비를 자연수의 비로 바꾸기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '3 : 12',
        options: ['3 : 12', '1 : 4', '12 : 3', '2 : 18'],
        problemLabel: '(2)',
        responseLabel: '자연수의 비',
        hints: ['1×3 : 2×6을 계산하세요.', '3 : 12를 선택하세요.'],
        sourceText: '1/6 : 2/3',
        confidence: 0.99,
        position: { top: 41.5, left: 33.5, width: 11.5, height: 4.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '12 : 11',
        options: ['12 : 11', '11 : 12', '3 : 44', '4 : 33'],
        problemLabel: '(3)',
        responseLabel: '자연수의 비',
        hints: ['3×4 : 1×11을 계산하세요.', '12 : 11을 선택하세요.'],
        sourceText: '3/11 : 1/4',
        confidence: 0.99,
        position: { top: 61.5, left: 34.5, width: 11.5, height: 4.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: 'a : 6',
        options: ['a : 6', '6 : a', '3 : 2a', '2a : 3'],
        problemLabel: '(4)',
        responseLabel: '문자의 비',
        hints: ['1×a : 3×2를 계산하세요.', 'a : 6을 선택하세요.'],
        sourceText: '1/2 : 3/a',
        confidence: 0.99,
        position: { top: 81.5, left: 32.5, width: 11.5, height: 4.5 }
      },
      {
        clientKey: 'q5',
        type: 'multiple-choice',
        answer: '3b : 2d',
        options: ['3b : 2d', '2d : 3b', '2b : 3d', '3d : 2b'],
        problemLabel: '(5)',
        responseLabel: '문자의 비',
        hints: ['b×3 : d×2를 계산하세요.', '3b : 2d를 선택하세요.'],
        sourceText: 'b/2 : d/3',
        confidence: 0.99,
        position: { top: 22.5, left: 71.5, width: 11.5, height: 4.5 }
      },
      {
        clientKey: 'q6',
        type: 'multiple-choice',
        answer: '10 : 9',
        options: ['10 : 9', '9 : 10', '5 : 18', '1 : 18'],
        problemLabel: '(6)',
        responseLabel: '자연수의 비',
        hints: ['5×2 : 1×9를 계산하세요.', '10 : 9를 선택하세요.'],
        sourceText: '5/9 : 1/2',
        confidence: 0.99,
        position: { top: 41.5, left: 70.5, width: 11.5, height: 4.5 }
      },
      {
        clientKey: 'q7',
        type: 'multiple-choice',
        answer: 'b : 2a',
        options: ['b : 2a', '2a : b', 'a : 2b', '2b : a'],
        problemLabel: '(7)',
        responseLabel: '문자의 비',
        hints: ['1×b : 2×a를 계산하세요.', 'b : 2a를 선택하세요.'],
        sourceText: '1/a : 2/b',
        confidence: 0.99,
        position: { top: 61.5, left: 70.5, width: 11.5, height: 4.5 }
      },
      {
        clientKey: 'q8',
        type: 'multiple-choice',
        answer: '8 : 7',
        options: ['8 : 7', '7 : 8', '1 : 56', '56 : 1'],
        problemLabel: '(8)',
        responseLabel: '자연수의 비',
        hints: ['1×8 : 1×7을 계산하세요.', '8 : 7을 선택하세요.'],
        sourceText: '1/7 : 1/8',
        confidence: 0.99,
        position: { top: 81.5, left: 70.5, width: 11.5, height: 4.5 }
      }
    ]
  },

  // Page 14: Slide 73
  {
    pageId: 'page_1786933901370_14',
    summary: '연습문제 13 - 최소공배수를 곱하여 분수의 비를 자연수의 비로 바꾸기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '5 : 2',
        options: ['5 : 2', '2 : 5', '10 : 10', '1 : 5'],
        problemLabel: '(2)',
        responseLabel: '자연수의 비',
        hints: ['1/2과 1/5에 각각 10을 곱하세요.', '5 : 2를 선택하세요.'],
        sourceText: '1/2 : 1/5 (x10)',
        confidence: 0.99,
        position: { top: 79.0, left: 34.5, width: 11.5, height: 4.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '5 : 9',
        options: ['5 : 9', '9 : 5', '3 : 15', '5 : 15'],
        problemLabel: '(3)',
        responseLabel: '자연수의 비',
        hints: ['1/3과 3/5에 각각 15를 곱하세요.', '5 : 9를 선택하세요.'],
        sourceText: '1/3 : 3/5 (x15)',
        confidence: 0.99,
        position: { top: 58.5, left: 72.5, width: 11.5, height: 4.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '20 : 14',
        options: ['20 : 14', '14 : 20', '4 : 10', '28 : 10'],
        problemLabel: '(4)',
        responseLabel: '자연수의 비',
        hints: ['4/7과 2/5에 각각 35를 곱하세요.', '20 : 14를 선택하세요.'],
        sourceText: '4/7 : 2/5 (x35)',
        confidence: 0.99,
        position: { top: 79.0, left: 72.5, width: 11.5, height: 4.5 }
      }
    ]
  },

  // Page 15: Slide 74
  {
    pageId: 'page_1786933901370_15',
    summary: '연습문제 14 - 비례식의 성질을 이용하여 빈칸 채우기',
    elements: [
      {
        clientKey: 'q2',
        type: 'input',
        inputMode: 'integer',
        answer: '5',
        acceptedAnswers: ['5'],
        problemLabel: '(2)',
        responseLabel: '빈칸의 수',
        hints: ['1/3에 15를 곱해보세요.', '5를 입력하세요.'],
        sourceText: '1/3 * 15 = [ ]',
        confidence: 0.99,
        position: { top: 40.0, left: 40.0, width: 4.5, height: 5.5 }
      },
      {
        clientKey: 'q3',
        type: 'input',
        inputMode: 'integer',
        answer: '7',
        acceptedAnswers: ['7'],
        problemLabel: '(3)',
        responseLabel: '빈칸의 수',
        hints: ['1/3에 21을 곱해보세요.', '7을 입력하세요.'],
        sourceText: '1/3 * 21 = [ ]',
        confidence: 0.99,
        position: { top: 59.5, left: 40.0, width: 4.5, height: 5.5 }
      },
      {
        clientKey: 'q4',
        type: 'input',
        inputMode: 'integer',
        answer: '3',
        acceptedAnswers: ['3'],
        problemLabel: '(4)',
        responseLabel: '빈칸의 수',
        hints: ['1/2에 6을 곱해보세요.', '3을 입력하세요.'],
        sourceText: '1/2 * 6 = [ ]',
        confidence: 0.99,
        position: { top: 79.0, left: 33.5, width: 4.5, height: 5.5 }
      },
      {
        clientKey: 'q5',
        type: 'input',
        inputMode: 'integer',
        answer: '3',
        acceptedAnswers: ['3'],
        problemLabel: '(5)',
        responseLabel: '빈칸의 수',
        hints: ['1/4에 12를 곱해보세요.', '3을 입력하세요.'],
        sourceText: '1/4 * 12 = [ ]',
        confidence: 0.99,
        position: { top: 19.5, left: 70.5, width: 4.5, height: 5.5 }
      },
      {
        clientKey: 'q6',
        type: 'input',
        inputMode: 'integer',
        answer: '15',
        acceptedAnswers: ['15'],
        problemLabel: '(6)',
        responseLabel: '빈칸의 수',
        hints: ['3/4에 20을 곱해보세요.', '15를 입력하세요.'],
        sourceText: '3/4 * 20 = [ ]',
        confidence: 0.99,
        position: { top: 40.0, left: 78.5, width: 4.5, height: 5.5 }
      },
      {
        clientKey: 'q7',
        type: 'input',
        inputMode: 'integer',
        answer: '9',
        acceptedAnswers: ['9'],
        problemLabel: '(7)',
        responseLabel: '빈칸의 수',
        hints: ['3/4에 12를 곱해보세요.', '9를 입력하세요.'],
        sourceText: '3/4 * 12 = [ ]',
        confidence: 0.99,
        position: { top: 59.5, left: 78.5, width: 4.5, height: 5.5 }
      },
      {
        clientKey: 'q8',
        type: 'input',
        inputMode: 'integer',
        answer: '5',
        acceptedAnswers: ['5'],
        problemLabel: '(8)',
        responseLabel: '빈칸의 수',
        hints: ['5/9에 9를 곱해보세요.', '5를 입력하세요.'],
        sourceText: '5/9 * 9 = [ ]',
        confidence: 0.99,
        position: { top: 79.0, left: 71.5, width: 4.5, height: 5.5 }
      }
    ]
  },

  // Page 16: Slide 75
  {
    pageId: 'page_1786933901370_16',
    summary: '연습문제 15 - 분수의 비를 자연수의 비로 바꾸기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '6 : 10',
        options: ['6 : 10', '10 : 6', '3 : 5', '2 : 15'],
        problemLabel: '(2)',
        responseLabel: '자연수의 비',
        hints: ['2×3 : 2×5를 계산하세요.', '6 : 10을 선택하세요.'],
        sourceText: '2/5 : 2/3',
        confidence: 0.99,
        position: { top: 41.5, left: 32.5, width: 11.5, height: 4.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '6 : 7',
        options: ['6 : 7', '7 : 6', '3 : 14', '2 : 7'],
        problemLabel: '(3)',
        responseLabel: '자연수의 비',
        hints: ['3×2 : 1×7을 계산하세요.', '6 : 7을 선택하세요.'],
        sourceText: '3/7 : 1/2',
        confidence: 0.99,
        position: { top: 61.5, left: 32.5, width: 11.5, height: 4.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '3 : 18',
        options: ['3 : 18', '18 : 3', '1 : 6', '2 : 27'],
        problemLabel: '(4)',
        responseLabel: '자연수의 비',
        hints: ['1×3 : 2×9를 계산하세요.', '3 : 18을 선택하세요.'],
        sourceText: '1/9 : 2/3',
        confidence: 0.99,
        position: { top: 81.5, left: 32.5, width: 11.5, height: 4.5 }
      },
      {
        clientKey: 'q5',
        type: 'multiple-choice',
        answer: '9 : 8',
        options: ['9 : 8', '8 : 9', '6 : 12', '3 : 8'],
        problemLabel: '(5)',
        responseLabel: '자연수의 비',
        hints: ['3×3 : 2×4를 계산하세요.', '9 : 8을 선택하세요.'],
        sourceText: '3/4 : 2/3',
        confidence: 0.99,
        position: { top: 21.5, left: 70.5, width: 11.5, height: 4.5 }
      },
      {
        clientKey: 'q6',
        type: 'multiple-choice',
        answer: '24 : 15',
        options: ['24 : 15', '15 : 24', '8 : 5', '3 : 40'],
        problemLabel: '(6)',
        responseLabel: '자연수의 비',
        hints: ['3×8 : 3×5를 계산하세요.', '24 : 15를 선택하세요.'],
        sourceText: '3/5 : 3/8',
        confidence: 0.99,
        position: { top: 41.5, left: 70.5, width: 11.5, height: 4.5 }
      },
      {
        clientKey: 'q7',
        type: 'multiple-choice',
        answer: '35 : 18',
        options: ['35 : 18', '18 : 35', '5 : 42', '6 : 35'],
        problemLabel: '(7)',
        responseLabel: '자연수의 비',
        hints: ['5×7 : 3×6을 계산하세요.', '35 : 18을 선택하세요.'],
        sourceText: '5/6 : 3/7',
        confidence: 0.99,
        position: { top: 61.5, left: 70.5, width: 11.5, height: 4.5 }
      },
      {
        clientKey: 'q8',
        type: 'multiple-choice',
        answer: '15 : 12',
        options: ['15 : 12', '12 : 15', '5 : 4', '10 : 18'],
        problemLabel: '(8)',
        responseLabel: '자연수의 비',
        hints: ['5×3 : 2×6을 계산하세요.', '15 : 12를 선택하세요.'],
        sourceText: '5/6 : 2/3',
        confidence: 0.99,
        position: { top: 81.5, left: 70.5, width: 11.5, height: 4.5 }
      }
    ]
  },

  // Page 17: Slide 76
  {
    pageId: 'page_1786933901370_17',
    summary: '연습문제 16 - 소수의 비를 자연수의 비로 바꾸기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '21 : 5',
        options: ['21 : 5', '5 : 21', '21 : 50', '2.1 : 5'],
        problemLabel: '(2)',
        responseLabel: '자연수의 비',
        hints: ['2.1과 0.5에 각각 10을 곱하세요.', '21 : 5를 선택하세요.'],
        sourceText: '2.1 : 0.5 (x10)',
        confidence: 0.99,
        position: { top: 79.5, left: 34.5, width: 11.5, height: 4.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '100 : 314',
        options: ['100 : 314', '1 : 314', '314 : 100', '10 : 314'],
        problemLabel: '(3)',
        responseLabel: '자연수의 비',
        hints: ['1과 3.14에 각각 100을 곱하세요.', '100 : 314를 선택하세요.'],
        sourceText: '1 : 3.14 (x100)',
        confidence: 0.99,
        position: { top: 58.5, left: 72.5, width: 11.5, height: 4.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '12101 : 110',
        options: ['12101 : 110', '12101 : 11', '110 : 12101', '121.01 : 110'],
        problemLabel: '(4)',
        responseLabel: '자연수의 비',
        hints: ['121.01과 1.1에 각각 100을 곱하세요.', '12101 : 110을 선택하세요.'],
        sourceText: '121.01 : 1.1 (x100)',
        confidence: 0.99,
        position: { top: 79.5, left: 72.5, width: 11.5, height: 4.5 }
      }
    ]
  },

  // Page 18: Slide 77
  {
    pageId: 'page_1786933901370_18',
    summary: '연습문제 17 - 소수의 비를 자연수의 비로 바꾸기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '50336 : 3000',
        options: ['50336 : 3000', '50336 : 3', '3000 : 50336', '5033.6 : 3'],
        problemLabel: '(2)',
        responseLabel: '자연수의 비',
        hints: ['소수 4자리이므로 10000을 곱해보세요.', '50336 : 3000을 선택하세요.'],
        sourceText: '5.0336 : 0.3',
        confidence: 0.99,
        position: { top: 40.5, left: 34.5, width: 11.5, height: 4.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '20 : 1',
        options: ['20 : 1', '2 : 1', '1 : 20', '200 : 1'],
        problemLabel: '(3)',
        responseLabel: '자연수의 비',
        hints: ['각각 10을 곱하세요.', '20 : 1을 선택하세요.'],
        sourceText: '2 : 0.1',
        confidence: 0.99,
        position: { top: 60.5, left: 34.5, width: 11.5, height: 4.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '410 : 2',
        options: ['410 : 2', '41 : 2', '2 : 410', '4100 : 2'],
        problemLabel: '(4)',
        responseLabel: '자연수의 비',
        hints: ['각각 100을 곱하세요.', '410 : 2를 선택하세요.'],
        sourceText: '4.1 : 0.02',
        confidence: 0.99,
        position: { top: 80.5, left: 34.5, width: 11.5, height: 4.5 }
      },
      {
        clientKey: 'q5',
        type: 'multiple-choice',
        answer: '99 : 150',
        options: ['99 : 150', '99 : 15', '150 : 99', '990 : 150'],
        problemLabel: '(5)',
        responseLabel: '자연수의 비',
        hints: ['각각 100을 곱하세요.', '99 : 150을 선택하세요.'],
        sourceText: '0.99 : 1.5',
        confidence: 0.99,
        position: { top: 20.5, left: 72.5, width: 11.5, height: 4.5 }
      },
      {
        clientKey: 'q6',
        type: 'multiple-choice',
        answer: '100 : 1',
        options: ['100 : 1', '1 : 100', '10 : 1', '1000 : 1'],
        problemLabel: '(6)',
        responseLabel: '자연수의 비',
        hints: ['각각 100을 곱하세요.', '100 : 1을 선택하세요.'],
        sourceText: '1 : 0.01',
        confidence: 0.99,
        position: { top: 40.5, left: 72.5, width: 11.5, height: 4.5 }
      },
      {
        clientKey: 'q7',
        type: 'multiple-choice',
        answer: '1001 : 11',
        options: ['1001 : 11', '1001 : 110', '11 : 1001', '100.1 : 11'],
        problemLabel: '(7)',
        responseLabel: '자연수의 비',
        hints: ['각각 100을 곱하세요.', '1001 : 11을 선택하세요.'],
        sourceText: '10.01 : 0.11',
        confidence: 0.99,
        position: { top: 60.5, left: 72.5, width: 11.5, height: 4.5 }
      },
      {
        clientKey: 'q8',
        type: 'multiple-choice',
        answer: '1101 : 2020',
        options: ['1101 : 2020', '1101 : 202', '2020 : 1101', '110.1 : 202'],
        problemLabel: '(8)',
        responseLabel: '자연수의 비',
        hints: ['각각 100을 곱하세요.', '1101 : 2020을 선택하세요.'],
        sourceText: '11.01 : 20.2',
        confidence: 0.99,
        position: { top: 80.5, left: 72.5, width: 11.5, height: 4.5 }
      }
    ]
  },

  // Page 19: Slide 78
  {
    pageId: 'page_1786933901370_19',
    summary: '연습문제 18 - 기준량이 1일 때 비교량 구하기',
    elements: [
      {
        clientKey: 'q2',
        type: 'input',
        inputMode: 'decimal',
        answer: '0.75',
        acceptedAnswers: ['0.75'],
        problemLabel: '(2)',
        responseLabel: '비교량',
        hints: ['150 ÷ 200을 계산해보세요.', '0.75를 입력하세요.'],
        sourceText: '150 : 200 = [ ] : 1',
        confidence: 0.99,
        position: { top: 77.0, left: 34.5, width: 8.5, height: 4.5 }
      },
      {
        clientKey: 'q3',
        type: 'input',
        inputMode: 'decimal',
        answer: '0.3',
        acceptedAnswers: ['0.3'],
        problemLabel: '(3)',
        responseLabel: '비교량',
        hints: ['3 ÷ 10을 계산해보세요.', '0.3을 입력하세요.'],
        sourceText: '3/10 = [ ]/1',
        confidence: 0.99,
        position: { top: 54.5, left: 72.5, width: 8.5, height: 4.5 }
      },
      {
        clientKey: 'q4',
        type: 'input',
        inputMode: 'decimal',
        answer: '0.3',
        acceptedAnswers: ['0.3'],
        problemLabel: '(4)',
        responseLabel: '비교량',
        hints: ['6 ÷ 20을 계산해보세요.', '0.3을 입력하세요.'],
        sourceText: '6/20 = [ ]/1',
        confidence: 0.99,
        position: { top: 75.5, left: 72.5, width: 8.5, height: 4.5 }
      }
    ]
  },

  // Page 20: Slide 79
  {
    pageId: 'page_1786933901370_20',
    summary: '연습문제 19 - 기준량이 1일 때 비교량 구하기',
    elements: [
      {
        clientKey: 'q2',
        type: 'input',
        inputMode: 'integer',
        answer: '300',
        acceptedAnswers: ['300'],
        problemLabel: '(2)',
        responseLabel: '비교량',
        hints: ['1500 ÷ 5를 계산해보세요.', '300을 입력하세요.'],
        sourceText: '1500 : 5 = [ ] : 1',
        confidence: 0.99,
        position: { top: 39.0, left: 33.0, width: 7.5, height: 4.5 }
      },
      {
        clientKey: 'q3',
        type: 'input',
        inputMode: 'integer',
        answer: '1075',
        acceptedAnswers: ['1075'],
        problemLabel: '(3)',
        responseLabel: '비교량',
        hints: ['4300 ÷ 4를 계산해보세요.', '1075를 입력하세요.'],
        sourceText: '4300 : 4 = [ ] : 1',
        confidence: 0.99,
        position: { top: 58.5, left: 33.0, width: 7.5, height: 4.5 }
      },
      {
        clientKey: 'q4',
        type: 'input',
        inputMode: 'integer',
        answer: '111',
        acceptedAnswers: ['111'],
        problemLabel: '(4)',
        responseLabel: '비교량',
        hints: ['333 ÷ 3을 계산해보세요.', '111을 입력하세요.'],
        sourceText: '333 : 3 = [ ] : 1',
        confidence: 0.99,
        position: { top: 78.5, left: 33.0, width: 7.5, height: 4.5 }
      },
      {
        clientKey: 'q5',
        type: 'input',
        inputMode: 'integer',
        answer: '30',
        acceptedAnswers: ['30'],
        problemLabel: '(5)',
        responseLabel: '비교량',
        hints: ['300 ÷ 10을 계산해보세요.', '30을 입력하세요.'],
        sourceText: '300/10 = [ ]/1',
        confidence: 0.99,
        position: { top: 17.0, left: 72.5, width: 8.5, height: 4.5 }
      },
      {
        clientKey: 'q6',
        type: 'input',
        inputMode: 'integer',
        answer: '600',
        acceptedAnswers: ['600'],
        problemLabel: '(6)',
        responseLabel: '비교량',
        hints: ['3000 ÷ 5를 계산해보세요.', '600을 입력하세요.'],
        sourceText: '3000/5 = [ ]/1',
        confidence: 0.99,
        position: { top: 37.0, left: 72.5, width: 8.5, height: 4.5 }
      },
      {
        clientKey: 'q7',
        type: 'input',
        inputMode: 'integer',
        answer: '2000',
        acceptedAnswers: ['2000'],
        problemLabel: '(7)',
        responseLabel: '비교량',
        hints: ['10000 ÷ 5를 계산해보세요.', '2000을 입력하세요.'],
        sourceText: '10000/5 = [ ]/1',
        confidence: 0.99,
        position: { top: 56.5, left: 72.5, width: 8.5, height: 4.5 }
      },
      {
        clientKey: 'q8',
        type: 'input',
        inputMode: 'decimal',
        answer: '0.03',
        acceptedAnswers: ['0.03'],
        problemLabel: '(8)',
        responseLabel: '비교량',
        hints: ['30 ÷ 1000을 계산해보세요.', '0.03을 입력하세요.'],
        sourceText: '30/1000 = [ ]/1',
        confidence: 0.99,
        position: { top: 76.5, left: 72.5, width: 8.5, height: 4.5 }
      }
    ]
  },

  // Page 21: Slide 80
  {
    pageId: 'page_1786933901370_21',
    summary: '연습문제 20 - 기준량을 100으로 만들기',
    elements: [
      {
        clientKey: 'q2_mid',
        type: 'input',
        inputMode: 'decimal',
        answer: '0.5',
        acceptedAnswers: ['0.5'],
        problemLabel: '(2) 기준량 1',
        responseLabel: '비교량',
        hints: ['1 ÷ 2를 계산해보세요.', '0.5를 입력하세요.'],
        sourceText: '1 ÷ 2',
        confidence: 0.99,
        position: { top: 76.0, left: 40.5, width: 10.0, height: 4.5 }
      },
      {
        clientKey: 'q2_right',
        type: 'input',
        inputMode: 'integer',
        answer: '50',
        acceptedAnswers: ['50'],
        problemLabel: '(2) 기준량 100',
        responseLabel: '비교량',
        hints: ['0.5에 100을 곱해보세요.', '50을 입력하세요.'],
        sourceText: '0.5 * 100',
        confidence: 0.99,
        position: { top: 76.0, left: 67.5, width: 7.5, height: 4.5 }
      }
    ]
  },

  // Page 22: Slide 81
  {
    pageId: 'page_1786933901370_22',
    summary: '연습문제 21 - 기준량을 100으로 만들기',
    elements: [
      {
        clientKey: 'q2_mid',
        type: 'input',
        inputMode: 'decimal',
        answer: '0.72',
        acceptedAnswers: ['0.72'],
        problemLabel: '(2) 기준량 1',
        responseLabel: '비교량',
        hints: ['36 ÷ 50을 계산해보세요.', '0.72를 입력하세요.'],
        sourceText: '36 ÷ 50',
        confidence: 0.99,
        position: { top: 38.0, left: 40.5, width: 10.0, height: 4.5 }
      },
      {
        clientKey: 'q2_right',
        type: 'input',
        inputMode: 'integer',
        answer: '72',
        acceptedAnswers: ['72'],
        problemLabel: '(2) 기준량 100',
        responseLabel: '비교량',
        hints: ['0.72에 100을 곱해보세요.', '72를 입력하세요.'],
        sourceText: '0.72 * 100',
        confidence: 0.99,
        position: { top: 38.0, left: 67.5, width: 7.5, height: 4.5 }
      },
      {
        clientKey: 'q3_mid',
        type: 'input',
        inputMode: 'decimal',
        answer: '0.7',
        acceptedAnswers: ['0.7'],
        problemLabel: '(3) 기준량 1',
        responseLabel: '비교량',
        hints: ['21 ÷ 30을 계산해보세요.', '0.7을 입력하세요.'],
        sourceText: '21 ÷ 30',
        confidence: 0.99,
        position: { top: 57.5, left: 40.5, width: 10.0, height: 4.5 }
      },
      {
        clientKey: 'q3_right',
        type: 'input',
        inputMode: 'integer',
        answer: '70',
        acceptedAnswers: ['70'],
        problemLabel: '(3) 기준량 100',
        responseLabel: '비교량',
        hints: ['0.7에 100을 곱해보세요.', '70을 입력하세요.'],
        sourceText: '0.7 * 100',
        confidence: 0.99,
        position: { top: 57.5, left: 67.5, width: 7.5, height: 4.5 }
      },
      {
        clientKey: 'q4_mid',
        type: 'input',
        inputMode: 'decimal',
        answer: '0.5',
        acceptedAnswers: ['0.5'],
        problemLabel: '(4) 기준량 1',
        responseLabel: '비교량',
        hints: ['20 ÷ 40을 계산해보세요.', '0.5를 입력하세요.'],
        sourceText: '20 ÷ 40',
        confidence: 0.99,
        position: { top: 77.0, left: 40.5, width: 10.0, height: 4.5 }
      },
      {
        clientKey: 'q4_right',
        type: 'input',
        inputMode: 'integer',
        answer: '50',
        acceptedAnswers: ['50'],
        problemLabel: '(4) 기준량 100',
        responseLabel: '비교량',
        hints: ['0.5에 100을 곱해보세요.', '50을 입력하세요.'],
        sourceText: '0.5 * 100',
        confidence: 0.99,
        position: { top: 77.0, left: 67.5, width: 7.5, height: 4.5 }
      }
    ]
  },

  // Page 23: Slide 82
  {
    pageId: 'page_1786933901370_23',
    summary: '연습문제 22 - 분수를 기준량 100으로 만들기',
    elements: [
      {
        clientKey: 'q1_mid',
        type: 'input',
        inputMode: 'decimal',
        answer: '0.75',
        acceptedAnswers: ['0.75'],
        problemLabel: '(1) 기준량 1',
        responseLabel: '비교량',
        hints: ['3 ÷ 4를 계산해보세요.', '0.75를 입력하세요.'],
        sourceText: '3/4 = [ ]/1',
        confidence: 0.99,
        position: { top: 17.5, left: 42.5, width: 8.5, height: 4.0 }
      },
      {
        clientKey: 'q1_right',
        type: 'input',
        inputMode: 'integer',
        answer: '75',
        acceptedAnswers: ['75'],
        problemLabel: '(1) 기준량 100',
        responseLabel: '비교량',
        hints: ['0.75에 100을 곱해보세요.', '75를 입력하세요.'],
        sourceText: '0.75 * 100',
        confidence: 0.99,
        position: { top: 17.5, left: 61.5, width: 8.5, height: 4.0 }
      },
      {
        clientKey: 'q2_mid',
        type: 'input',
        inputMode: 'decimal',
        answer: '0.72',
        acceptedAnswers: ['0.72'],
        problemLabel: '(2) 기준량 1',
        responseLabel: '비교량',
        hints: ['36 ÷ 50을 계산해보세요.', '0.72를 입력하세요.'],
        sourceText: '36/50 = [ ]/1',
        confidence: 0.99,
        position: { top: 37.5, left: 42.5, width: 8.5, height: 4.0 }
      },
      {
        clientKey: 'q2_right',
        type: 'input',
        inputMode: 'integer',
        answer: '72',
        acceptedAnswers: ['72'],
        problemLabel: '(2) 기준량 100',
        responseLabel: '비교량',
        hints: ['0.72에 100을 곱해보세요.', '72를 입력하세요.'],
        sourceText: '0.72 * 100',
        confidence: 0.99,
        position: { top: 37.5, left: 61.5, width: 8.5, height: 4.0 }
      },
      {
        clientKey: 'q3_mid',
        type: 'input',
        inputMode: 'decimal',
        answer: '0.7',
        acceptedAnswers: ['0.7'],
        problemLabel: '(3) 기준량 1',
        responseLabel: '비교량',
        hints: ['21 ÷ 30을 계산해보세요.', '0.7을 입력하세요.'],
        sourceText: '21/30 = [ ]/1',
        confidence: 0.99,
        position: { top: 57.5, left: 42.5, width: 8.5, height: 4.0 }
      },
      {
        clientKey: 'q3_right',
        type: 'input',
        inputMode: 'integer',
        answer: '70',
        acceptedAnswers: ['70'],
        problemLabel: '(3) 기준량 100',
        responseLabel: '비교량',
        hints: ['0.7에 100을 곱해보세요.', '70을 입력하세요.'],
        sourceText: '0.7 * 100',
        confidence: 0.99,
        position: { top: 57.5, left: 61.5, width: 8.5, height: 4.0 }
      },
      {
        clientKey: 'q4_mid',
        type: 'input',
        inputMode: 'decimal',
        answer: '0.5',
        acceptedAnswers: ['0.5'],
        problemLabel: '(4) 기준량 1',
        responseLabel: '비교량',
        hints: ['20 ÷ 40을 계산해보세요.', '0.5를 입력하세요.'],
        sourceText: '20/40 = [ ]/1',
        confidence: 0.99,
        position: { top: 77.5, left: 42.5, width: 8.5, height: 4.0 }
      },
      {
        clientKey: 'q4_right',
        type: 'input',
        inputMode: 'integer',
        answer: '50',
        acceptedAnswers: ['50'],
        problemLabel: '(4) 기준량 100',
        responseLabel: '비교량',
        hints: ['0.5에 100을 곱해보세요.', '50을 입력하세요.'],
        sourceText: '0.5 * 100',
        confidence: 0.99,
        position: { top: 77.5, left: 61.5, width: 8.5, height: 4.0 }
      }
    ]
  },

  // Page 24: Slide 83
  {
    pageId: 'page_1786933901370_24',
    summary: '연습문제 23 - 기준량이 100일 때 비교량 구하기',
    elements: [
      {
        clientKey: 'q2',
        type: 'input',
        inputMode: 'integer',
        answer: '46',
        acceptedAnswers: ['46'],
        problemLabel: '(2)',
        responseLabel: '비교량',
        hints: ['23 ÷ 50 × 100을 계산해보세요.', '46을 입력하세요.'],
        sourceText: '23:50 = [ ]:100',
        confidence: 0.99,
        position: { top: 39.0, left: 31.0, width: 7.5, height: 4.5 }
      },
      {
        clientKey: 'q3',
        type: 'input',
        inputMode: 'decimal',
        answer: '66.67',
        acceptedAnswers: ['66.67', '66.7', '66.6', '66.66', '200/3'],
        problemLabel: '(3)',
        responseLabel: '비교량',
        hints: ['6 ÷ 9 × 100을 계산해보세요.', '66.67을 입력하세요.'],
        sourceText: '6:9 = [ ]:100',
        confidence: 0.99,
        position: { top: 58.5, left: 29.5, width: 7.5, height: 4.5 }
      },
      {
        clientKey: 'q4',
        type: 'input',
        inputMode: 'integer',
        answer: '20',
        acceptedAnswers: ['20'],
        problemLabel: '(4)',
        responseLabel: '비교량',
        hints: ['1 ÷ 5 × 100을 계산해보세요.', '20을 입력하세요.'],
        sourceText: '1:5 = [ ]:100',
        confidence: 0.99,
        position: { top: 78.5, left: 29.5, width: 7.5, height: 4.5 }
      },
      {
        clientKey: 'q5',
        type: 'input',
        inputMode: 'integer',
        answer: '30',
        acceptedAnswers: ['30'],
        problemLabel: '(5)',
        responseLabel: '비교량',
        hints: ['3 ÷ 10 × 100을 계산해보세요.', '30을 입력하세요.'],
        sourceText: '3/10 = [ ]/100',
        confidence: 0.99,
        position: { top: 17.0, left: 73.0, width: 8.5, height: 4.5 }
      },
      {
        clientKey: 'q6',
        type: 'input',
        inputMode: 'decimal',
        answer: '62.5',
        acceptedAnswers: ['62.5'],
        problemLabel: '(6)',
        responseLabel: '비교량',
        hints: ['25 ÷ 40 × 100을 계산해보세요.', '62.5를 입력하세요.'],
        sourceText: '25/40 = [ ]/100',
        confidence: 0.99,
        position: { top: 37.0, left: 73.0, width: 8.5, height: 4.5 }
      },
      {
        clientKey: 'q7',
        type: 'input',
        inputMode: 'integer',
        answer: '50',
        acceptedAnswers: ['50'],
        problemLabel: '(7)',
        responseLabel: '비교량',
        hints: ['7 ÷ 14 × 100을 계산해보세요.', '50을 입력하세요.'],
        sourceText: '7/14 = [ ]/100',
        confidence: 0.99,
        position: { top: 57.0, left: 73.0, width: 8.5, height: 4.5 }
      },
      {
        clientKey: 'q8',
        type: 'input',
        inputMode: 'integer',
        answer: '75',
        acceptedAnswers: ['75'],
        problemLabel: '(8)',
        responseLabel: '비교량',
        hints: ['15 ÷ 20 × 100을 계산해보세요.', '75를 입력하세요.'],
        sourceText: '15/20 = [ ]/100',
        confidence: 0.99,
        position: { top: 77.0, left: 73.0, width: 8.5, height: 4.5 }
      }
    ]
  },

  // Page 25: Slide 84
  {
    pageId: 'page_1786933901370_25',
    summary: '연습문제 24 - 단가(1개당 가격) 구하기',
    elements: [
      {
        clientKey: 'q2',
        type: 'input',
        inputMode: 'integer',
        answer: '1000',
        acceptedAnswers: ['1000', '1000원'],
        problemLabel: '(2)',
        responseLabel: '1봉지 가격',
        hints: ['3000 ÷ 3을 계산해보세요.', '1000을 입력하세요.'],
        sourceText: '3000원/3봉지 = [ ]/1봉지',
        confidence: 0.99,
        position: { top: 79.5, left: 34.5, width: 10.0, height: 4.0 }
      },
      {
        clientKey: 'q3',
        type: 'input',
        inputMode: 'integer',
        answer: '3500',
        acceptedAnswers: ['3500', '3500원'],
        problemLabel: '(3)',
        responseLabel: '1개 가격',
        hints: ['35000 ÷ 10을 계산해보세요.', '3500을 입력하세요.'],
        sourceText: '35000원/10개 = [ ]/1개',
        confidence: 0.99,
        position: { top: 58.5, left: 72.5, width: 10.0, height: 4.0 }
      },
      {
        clientKey: 'q4',
        type: 'input',
        inputMode: 'integer',
        answer: '2000',
        acceptedAnswers: ['2000', '2000원'],
        problemLabel: '(4)',
        responseLabel: '1켤레 가격',
        hints: ['12000 ÷ 6을 계산해보세요.', '2000을 입력하세요.'],
        sourceText: '12000원/6켤레 = [ ]/1켤레',
        confidence: 0.99,
        position: { top: 79.5, left: 72.5, width: 10.0, height: 4.0 }
      }
    ]
  },

  // Page 26: Slide 85
  {
    pageId: 'page_1786933901370_26',
    summary: '연습문제 25 - 단가(1개당 가격) 구하기',
    elements: [
      {
        clientKey: 'q2',
        type: 'input',
        inputMode: 'integer',
        answer: '500',
        acceptedAnswers: ['500', '500원'],
        problemLabel: '(2)',
        responseLabel: '1병 가격',
        hints: ['4000 ÷ 8을 계산해보세요.', '500을 입력하세요.'],
        sourceText: '4000원/8병 = [ ]/1병',
        confidence: 0.99,
        position: { top: 41.5, left: 34.5, width: 10.0, height: 4.0 }
      },
      {
        clientKey: 'q3',
        type: 'input',
        inputMode: 'integer',
        answer: '620',
        acceptedAnswers: ['620', '620원'],
        problemLabel: '(3)',
        responseLabel: '1개 가격',
        hints: ['6200 ÷ 10을 계산해보세요.', '620을 입력하세요.'],
        sourceText: '6200원/10개 = [ ]/1개',
        confidence: 0.99,
        position: { top: 61.5, left: 34.5, width: 10.0, height: 4.0 }
      },
      {
        clientKey: 'q4',
        type: 'input',
        inputMode: 'integer',
        answer: '3333',
        acceptedAnswers: ['3333', '3333원'],
        problemLabel: '(4)',
        responseLabel: '1개 가격',
        hints: ['2+1은 총 3개입니다. 9999 ÷ 3을 계산해보세요.', '3333을 입력하세요.'],
        sourceText: '9999원/3개 = [ ]/1개',
        confidence: 0.99,
        position: { top: 81.5, left: 34.5, width: 10.0, height: 4.0 }
      },
      {
        clientKey: 'q5',
        type: 'input',
        inputMode: 'integer',
        answer: '2000',
        acceptedAnswers: ['2000', '2000원'],
        problemLabel: '(5)',
        responseLabel: '1포기 가격',
        hints: ['10000 ÷ 5를 계산해보세요.', '2000을 입력하세요.'],
        sourceText: '10000원/5포기 = [ ]/1포기',
        confidence: 0.99,
        position: { top: 22.0, left: 72.5, width: 10.0, height: 4.0 }
      },
      {
        clientKey: 'q6',
        type: 'input',
        inputMode: 'integer',
        answer: '400',
        acceptedAnswers: ['400', '400원'],
        problemLabel: '(6)',
        responseLabel: '1자루 가격',
        hints: ['1200 ÷ 3을 계산해보세요.', '400을 입력하세요.'],
        sourceText: '1200원/3자루 = [ ]/1자루',
        confidence: 0.99,
        position: { top: 41.5, left: 72.5, width: 10.0, height: 4.0 }
      },
      {
        clientKey: 'q7',
        type: 'input',
        inputMode: 'integer',
        answer: '800',
        acceptedAnswers: ['800', '800원'],
        problemLabel: '(7)',
        responseLabel: '1장 가격',
        hints: ['4000 ÷ 5를 계산해보세요.', '800을 입력하세요.'],
        sourceText: '4000원/5개 = [ ]/1개',
        confidence: 0.99,
        position: { top: 61.5, left: 72.5, width: 10.0, height: 4.0 }
      },
      {
        clientKey: 'q8',
        type: 'input',
        inputMode: 'integer',
        answer: '13750',
        acceptedAnswers: ['13750', '13750원'],
        problemLabel: '(8)',
        responseLabel: '1개 가격',
        hints: ['55000 ÷ 4를 계산해보세요.', '13750을 입력하세요.'],
        sourceText: '55000원/4개 = [ ]/1개',
        confidence: 0.99,
        position: { top: 81.5, left: 72.5, width: 10.0, height: 4.0 }
      }
    ]
  },

  // Page 27: Slide 86
  {
    pageId: 'page_1786933901370_27',
    summary: '연습문제 26 - 단가(1개당 가격) 구하기',
    elements: [
      {
        clientKey: 'q2',
        type: 'input',
        inputMode: 'integer',
        answer: '625',
        acceptedAnswers: ['625', '625원'],
        problemLabel: '(2)',
        responseLabel: '1병 가격',
        hints: ['5000 ÷ 8을 계산해보세요.', '625를 입력하세요.'],
        sourceText: '5000원 ÷ 8병',
        confidence: 0.99,
        position: { top: 46.5, left: 22.5, width: 16.5, height: 4.5 }
      },
      {
        clientKey: 'q3',
        type: 'input',
        inputMode: 'integer',
        answer: '620',
        acceptedAnswers: ['620', '620원'],
        problemLabel: '(3)',
        responseLabel: '1개 가격',
        hints: ['3100 ÷ 5를 계산해보세요.', '620을 입력하세요.'],
        sourceText: '3100원 ÷ 5개',
        confidence: 0.99,
        position: { top: 66.5, left: 22.5, width: 16.5, height: 4.5 }
      },
      {
        clientKey: 'q4',
        type: 'input',
        inputMode: 'integer',
        answer: '4995',
        acceptedAnswers: ['4995', '4995원'],
        problemLabel: '(4)',
        responseLabel: '1개 가격',
        hints: ['1+1은 2개입니다. 9990 ÷ 2를 계산해보세요.', '4995를 입력하세요.'],
        sourceText: '9990원 ÷ 2개',
        confidence: 0.99,
        position: { top: 86.5, left: 22.5, width: 16.5, height: 4.5 }
      },
      {
        clientKey: 'q5',
        type: 'input',
        inputMode: 'integer',
        answer: '4000',
        acceptedAnswers: ['4000', '4000원'],
        problemLabel: '(5)',
        responseLabel: '1포기 가격',
        hints: ['12000 ÷ 3을 계산해보세요.', '4000을 입력하세요.'],
        sourceText: '12000원 ÷ 3포기',
        confidence: 0.99,
        position: { top: 26.5, left: 60.5, width: 16.5, height: 4.5 }
      },
      {
        clientKey: 'q6',
        type: 'input',
        inputMode: 'integer',
        answer: '200',
        acceptedAnswers: ['200', '200원'],
        problemLabel: '(6)',
        responseLabel: '1자루 가격',
        hints: ['1200 ÷ 6을 계산해보세요.', '200을 입력하세요.'],
        sourceText: '1200원 ÷ 6자루',
        confidence: 0.99,
        position: { top: 46.5, left: 60.5, width: 16.5, height: 4.5 }
      },
      {
        clientKey: 'q7',
        type: 'input',
        inputMode: 'integer',
        answer: '1250',
        acceptedAnswers: ['1250', '1250원'],
        problemLabel: '(7)',
        responseLabel: '1장 가격',
        hints: ['5000 ÷ 4를 계산해보세요.', '1250을 입력하세요.'],
        sourceText: '5000원 ÷ 4장',
        confidence: 0.99,
        position: { top: 66.5, left: 60.5, width: 16.5, height: 4.5 }
      },
      {
        clientKey: 'q8',
        type: 'input',
        inputMode: 'integer',
        answer: '1275',
        acceptedAnswers: ['1275', '1275원'],
        problemLabel: '(8)',
        responseLabel: '1개 가격',
        hints: ['5100 ÷ 4를 계산해보세요.', '1275를 입력하세요.'],
        sourceText: '5100원 ÷ 4개',
        confidence: 0.99,
        position: { top: 86.5, left: 60.5, width: 16.5, height: 4.5 }
      }
    ]
  },

  // Page 28: Slide 87
  {
    pageId: 'page_1786933901370_28',
    summary: '연습문제 27 - 단가를 구하여 여러 개 가격 계산하기',
    elements: [
      {
        clientKey: 'q2',
        type: 'input',
        inputMode: 'integer',
        answer: '20000',
        acceptedAnswers: ['20000', '20000원'],
        problemLabel: '(2)',
        responseLabel: '10켤레 가격',
        hints: ['1켤레 가격(2000원)에 10을 곱하세요.', '20000을 입력하세요.'],
        sourceText: '양말 10켤레의 가격은?',
        confidence: 0.99,
        position: { top: 79.5, left: 54.5, width: 18.5, height: 4.5 }
      }
    ]
  },

  // Page 29: Slide 88
  {
    pageId: 'page_1786933901370_29',
    summary: '연습문제 28 - 단가를 구하여 여러 개 가격 계산하기',
    elements: [
      {
        clientKey: 'q2',
        type: 'input',
        inputMode: 'integer',
        answer: '3000',
        acceptedAnswers: ['3000', '3000원'],
        problemLabel: '(2)',
        responseLabel: '15자루 가격',
        hints: ['1자루 가격(200원)에 15를 곱하세요.', '3000을 입력하세요.'],
        sourceText: '연필 15자루의 가격은?',
        confidence: 0.99,
        position: { top: 41.5, left: 54.5, width: 18.5, height: 4.5 }
      },
      {
        clientKey: 'q3',
        type: 'input',
        inputMode: 'integer',
        answer: '4340',
        acceptedAnswers: ['4340', '4340원'],
        problemLabel: '(3)',
        responseLabel: '7개 가격',
        hints: ['1개 가격(620원)에 7을 곱하세요.', '4340을 입력하세요.'],
        sourceText: '볼펜 7개의 가격은?',
        confidence: 0.99,
        position: { top: 61.5, left: 54.5, width: 18.5, height: 4.5 }
      },
      {
        clientKey: 'q4',
        type: 'input',
        inputMode: 'integer',
        answer: '49950',
        acceptedAnswers: ['49950', '49950원'],
        problemLabel: '(4)',
        responseLabel: '10개 가격',
        hints: ['1개 가격(4995원)에 10을 곱하세요.', '49950을 입력하세요.'],
        sourceText: '제품 10개의 가격은?',
        confidence: 0.99,
        position: { top: 81.5, left: 54.5, width: 18.5, height: 4.5 }
      }
    ]
  },

  // Page 30: Slide 89
  {
    pageId: 'page_1786933901370_30',
    summary: '연습문제 29 - 1원당 개수 구하기',
    elements: [
      {
        clientKey: 'q2',
        type: 'input',
        inputMode: 'decimal',
        answer: '0.001',
        acceptedAnswers: ['0.001', '0.001개'],
        problemLabel: '(2)',
        responseLabel: '1원당 개수',
        hints: ['3 ÷ 3000을 계산해보세요.', '0.001을 입력하세요.'],
        sourceText: '3봉지 / 3000원',
        confidence: 0.99,
        position: { top: 79.5, left: 33.5, width: 12.0, height: 4.0 }
      },
      {
        clientKey: 'q3',
        type: 'input',
        inputMode: 'decimal',
        answer: '0.00125',
        acceptedAnswers: ['0.00125', '0.00125개'],
        problemLabel: '(3)',
        responseLabel: '1원당 개수',
        hints: ['10 ÷ 8000을 계산해보세요.', '0.00125를 입력하세요.'],
        sourceText: '10개 / 8000원',
        confidence: 0.99,
        position: { top: 58.5, left: 71.5, width: 12.0, height: 4.0 }
      },
      {
        clientKey: 'q4',
        type: 'input',
        inputMode: 'decimal',
        answer: '0.0005',
        acceptedAnswers: ['0.0005', '0.0005개'],
        problemLabel: '(4)',
        responseLabel: '1원당 개수',
        hints: ['6 ÷ 12000을 계산해보세요.', '0.0005를 입력하세요.'],
        sourceText: '6켤레 / 12000원',
        confidence: 0.99,
        position: { top: 79.5, left: 71.5, width: 12.0, height: 4.0 }
      }
    ]
  },

  // Page 31: Slide 90
  {
    pageId: 'page_1786933901370_31',
    summary: '연습문제 30 - 특정 금액으로 살 수 있는 수량 계산하기',
    elements: [
      {
        clientKey: 'q2',
        type: 'input',
        inputMode: 'integer',
        answer: '16',
        acceptedAnswers: ['16', '16병'],
        problemLabel: '(2)',
        responseLabel: '수량',
        hints: ['8 ÷ 5000 × 10000을 계산하세요.', '16을 입력하세요.'],
        sourceText: '10000원에는 몇 병?',
        confidence: 0.99,
        position: { top: 46.5, left: 31.5, width: 11.5, height: 4.5 }
      },
      {
        clientKey: 'q3',
        type: 'input',
        inputMode: 'integer',
        answer: '20',
        acceptedAnswers: ['20', '20자루'],
        problemLabel: '(3)',
        responseLabel: '수량',
        hints: ['6 ÷ 1500 × 5000을 계산하세요.', '20을 입력하세요.'],
        sourceText: '5000원에는 몇 자루?',
        confidence: 0.99,
        position: { top: 66.5, left: 31.5, width: 11.5, height: 4.5 }
      },
      {
        clientKey: 'q4',
        type: 'input',
        inputMode: 'integer',
        answer: '10',
        acceptedAnswers: ['10', '10개'],
        problemLabel: '(4)',
        responseLabel: '수량',
        hints: ['3 ÷ 9000 × 30000을 계산하세요.', '10을 입력하세요.'],
        sourceText: '30000원에는 몇 개?',
        confidence: 0.99,
        position: { top: 86.5, left: 31.5, width: 11.5, height: 4.5 }
      },
      {
        clientKey: 'q5',
        type: 'input',
        inputMode: 'integer',
        answer: '5',
        acceptedAnswers: ['5', '5포기'],
        problemLabel: '(5)',
        responseLabel: '수량',
        hints: ['3 ÷ 12000 × 20000을 계산하세요.', '5를 입력하세요.'],
        sourceText: '20000원에 몇 포기?',
        confidence: 0.99,
        position: { top: 26.5, left: 69.5, width: 11.5, height: 4.5 }
      },
      {
        clientKey: 'q6',
        type: 'input',
        inputMode: 'integer',
        answer: '10',
        acceptedAnswers: ['10', '10자루'],
        problemLabel: '(6)',
        responseLabel: '수량',
        hints: ['6 ÷ 1200 × 2000을 계산하세요.', '10을 입력하세요.'],
        sourceText: '2000원에는 몇 자루?',
        confidence: 0.99,
        position: { top: 46.5, left: 69.5, width: 11.5, height: 4.5 }
      },
      {
        clientKey: 'q7',
        type: 'input',
        inputMode: 'integer',
        answer: '8',
        acceptedAnswers: ['8', '8장', '8개'],
        problemLabel: '(7)',
        responseLabel: '수량',
        hints: ['4 ÷ 5000 × 10000을 계산하세요.', '8을 입력하세요.'],
        sourceText: '10000원에는 몇 개?',
        confidence: 0.99,
        position: { top: 66.5, left: 69.5, width: 11.5, height: 4.5 }
      },
      {
        clientKey: 'q8',
        type: 'input',
        inputMode: 'integer',
        answer: '36',
        acceptedAnswers: ['36', '36개'],
        problemLabel: '(8)',
        responseLabel: '수량',
        hints: ['4 ÷ 5000 × 45000을 계산하세요.', '36을 입력하세요.'],
        sourceText: '45000원에는 몇 개?',
        confidence: 0.99,
        position: { top: 86.5, left: 69.5, width: 11.5, height: 4.5 }
      }
    ]
  },

  // Page 32: Slide 91
  {
    pageId: 'page_1786933901370_32',
    summary: '연습문제 31 - 비례식의 성질을 이용하여 곱의 관계로 표현하기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '1 \\times 30 = 5 \\times 6',
        options: [
          '1 \\times 30 = 5 \\times 6',
          '1 \\times 6 = 5 \\times 30',
          '1 \\times 5 = 6 \\times 30',
          '1 \\times 30 = 1 \\times 6'
        ],
        problemLabel: '(2)',
        responseLabel: '곱의 관계 식',
        hints: ['외항의 곱(1×30)과 내항의 곱(5×6)을 등호로 연결하세요.', '1 × 30 = 5 × 6을 선택하세요.'],
        sourceText: '1 : 5 = 6 : 30',
        confidence: 0.99,
        position: { top: 84.5, left: 18.0, width: 26.0, height: 4.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '2 \\times 10 = 5 \\times 4',
        options: [
          '2 \\times 10 = 5 \\times 4',
          '2 \\times 4 = 5 \\times 10',
          '2 \\times 5 = 4 \\times 10',
          '2 \\times 10 = 2 \\times 4'
        ],
        problemLabel: '(4)',
        responseLabel: '곱의 관계 식',
        hints: ['분수에서 엇갈려 곱한 식을 찾으세요.', '2 × 10 = 5 × 4를 선택하세요.'],
        sourceText: '2/5 = 4/10',
        confidence: 0.99,
        position: { top: 84.5, left: 56.0, width: 26.0, height: 4.5 }
      }
    ]
  },

  // Page 33: Slide 92
  {
    pageId: 'page_1786933901370_33',
    summary: '연습문제 32 - 비례식의 성질을 이용하여 곱의 관계로 표현하기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '2 \\times 250 = 5 \\times 100',
        options: [
          '2 \\times 250 = 5 \\times 100',
          '2 \\times 100 = 5 \\times 250',
          '2 \\times 5 = 100 \\times 250',
          '2 \\times 250 = 2 \\times 100'
        ],
        problemLabel: '(2)',
        responseLabel: '곱의 관계 식',
        hints: ['외항의 곱 = 내항의 곱을 적용하세요.', '2 × 250 = 5 × 100을 선택하세요.'],
        sourceText: '2 : 5 = 100 : 250',
        confidence: 0.99,
        position: { top: 46.5, left: 18.0, width: 26.0, height: 4.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '9 \\times 11 = 33 \\times 3',
        options: [
          '9 \\times 11 = 33 \\times 3',
          '9 \\times 3 = 33 \\times 11',
          '9 \\times 33 = 3 \\times 11',
          '9 \\times 11 = 9 \\times 3'
        ],
        problemLabel: '(3)',
        responseLabel: '곱의 관계 식',
        hints: ['분수에서 엇갈려 곱한 식을 찾으세요.', '9 × 11 = 33 × 3을 선택하세요.'],
        sourceText: '9/33 = 3/11',
        confidence: 0.99,
        position: { top: 66.5, left: 18.0, width: 26.0, height: 4.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '5 \\times 14 = 7 \\times 10',
        options: [
          '5 \\times 14 = 7 \\times 10',
          '5 \\times 10 = 7 \\times 14',
          '5 \\times 7 = 10 \\times 14',
          '5 \\times 14 = 5 \\times 10'
        ],
        problemLabel: '(4)',
        responseLabel: '곱의 관계 식',
        hints: ['외항의 곱 = 내항의 곱을 적용하세요.', '5 × 14 = 7 × 10을 선택하세요.'],
        sourceText: '5 : 7 = 10 : 14',
        confidence: 0.99,
        position: { top: 86.5, left: 18.0, width: 26.0, height: 4.5 }
      },
      {
        clientKey: 'q5',
        type: 'multiple-choice',
        answer: '1 \\times 10 = 5 \\times 2',
        options: [
          '1 \\times 10 = 5 \\times 2',
          '1 \\times 2 = 5 \\times 10',
          '1 \\times 5 = 2 \\times 10',
          '1 \\times 10 = 1 \\times 2'
        ],
        problemLabel: '(5)',
        responseLabel: '곱의 관계 식',
        hints: ['분수에서 엇갈려 곱한 식을 찾으세요.', '1 × 10 = 5 × 2를 선택하세요.'],
        sourceText: '1/5 = 2/10',
        confidence: 0.99,
        position: { top: 26.5, left: 56.0, width: 26.0, height: 4.5 }
      },
      {
        clientKey: 'q6',
        type: 'multiple-choice',
        answer: '1 \\times 30 = 3 \\times 10',
        options: [
          '1 \\times 30 = 3 \\times 10',
          '1 \\times 10 = 3 \\times 30',
          '1 \\times 3 = 10 \\times 30',
          '1 \\times 30 = 1 \\times 10'
        ],
        problemLabel: '(6)',
        responseLabel: '곱의 관계 식',
        hints: ['외항의 곱 = 내항의 곱을 적용하세요.', '1 × 30 = 3 × 10을 선택하세요.'],
        sourceText: '1 : 3 = 10 : 30',
        confidence: 0.99,
        position: { top: 46.5, left: 56.0, width: 26.0, height: 4.5 }
      },
      {
        clientKey: 'q7',
        type: 'multiple-choice',
        answer: '15 \\times 4 = 2 \\times 30',
        options: [
          '15 \\times 4 = 2 \\times 30',
          '15 \\times 30 = 2 \\times 4',
          '15 \\times 2 = 30 \\times 4',
          '15 \\times 4 = 15 \\times 30'
        ],
        problemLabel: '(7)',
        responseLabel: '곱의 관계 식',
        hints: ['외항의 곱 = 내항의 곱을 적용하세요.', '15 × 4 = 2 × 30을 선택하세요.'],
        sourceText: '15 : 2 = 30 : 4',
        confidence: 0.99,
        position: { top: 66.5, left: 56.0, width: 26.0, height: 4.5 }
      },
      {
        clientKey: 'q8',
        type: 'multiple-choice',
        answer: '2 \\times 18 = 9 \\times 4',
        options: [
          '2 \\times 18 = 9 \\times 4',
          '2 \\times 4 = 9 \\times 18',
          '2 \\times 9 = 4 \\times 18',
          '2 \\times 18 = 2 \\times 4'
        ],
        problemLabel: '(8)',
        responseLabel: '곱의 관계 식',
        hints: ['분수에서 엇갈려 곱한 식을 찾으세요.', '2 × 18 = 9 × 4를 선택하세요.'],
        sourceText: '2/9 = 4/18',
        confidence: 0.99,
        position: { top: 86.5, left: 56.0, width: 26.0, height: 4.5 }
      }
    ]
  },

  // Page 34: Slide 93
  {
    pageId: 'page_1786933901370_34',
    summary: '연습문제 33 - 비례식의 성질을 이용하여 곱의 관계로 표현하기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '5000 \\times 1 = 2 \\times 2500',
        options: [
          '5000 \\times 1 = 2 \\times 2500',
          '5000 \\times 2500 = 2 \\times 1',
          '5000 \\times 2 = 2500 \\times 1',
          '5000 \\times 1 = 5000 \\times 2500'
        ],
        problemLabel: '(2)',
        responseLabel: '곱의 관계 식',
        hints: ['외항의 곱 = 내항의 곱을 적용하세요.', '5000 × 1 = 2 × 2500을 선택하세요.'],
        sourceText: '5000 : 2 = 2500 : 1',
        confidence: 0.99,
        position: { top: 46.5, left: 18.0, width: 26.0, height: 4.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '9999 \\times 1 = 4 \\times \\frac{9999}{4}',
        options: [
          '9999 \\times 1 = 4 \\times \\frac{9999}{4}',
          '9999 \\times \\frac{9999}{4} = 4 \\times 1',
          '9999 \\times 4 = \\frac{9999}{4} \\times 1',
          '9999 \\times 1 = 9999 \\times 4'
        ],
        problemLabel: '(3)',
        responseLabel: '곱의 관계 식',
        hints: ['외항의 곱 = 내항의 곱을 적용하세요.', '9999 × 1 = 4 × \\frac{9999}{4}를 선택하세요.'],
        sourceText: '9999 : 4 = 9999/4 : 1',
        confidence: 0.99,
        position: { top: 66.5, left: 18.0, width: 26.0, height: 4.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '1234 \\times 1 = 3 \\times \\frac{1234}{3}',
        options: [
          '1234 \\times 1 = 3 \\times \\frac{1234}{3}',
          '1234 \\times \\frac{1234}{3} = 3 \\times 1',
          '1234 \\times 3 = \\frac{1234}{3} \\times 1',
          '1234 \\times 1 = 1234 \\times 3'
        ],
        problemLabel: '(4)',
        responseLabel: '곱의 관계 식',
        hints: ['외항의 곱 = 내항의 곱을 적용하세요.', '1234 × 1 = 3 × \\frac{1234}{3}를 선택하세요.'],
        sourceText: '1234 : 3 = 1234/3 : 1',
        confidence: 0.99,
        position: { top: 86.5, left: 18.0, width: 26.0, height: 4.5 }
      },
      {
        clientKey: 'q5',
        type: 'multiple-choice',
        answer: '5 \\times \\frac{12}{5} = 3 \\times 4',
        options: [
          '5 \\times \\frac{12}{5} = 3 \\times 4',
          '5 \\times 4 = 3 \\times \\frac{12}{5}',
          '5 \\times 3 = 4 \\times \\frac{12}{5}',
          '5 \\times \\frac{12}{5} = 5 \\times 4'
        ],
        problemLabel: '(5)',
        responseLabel: '곱의 관계 식',
        hints: ['외항의 곱 = 내항의 곱을 적용하세요.', '5 × \\frac{12}{5} = 3 × 4를 선택하세요.'],
        sourceText: '5 : 3 = 4 : 12/5',
        confidence: 0.99,
        position: { top: 26.5, left: 56.0, width: 26.0, height: 4.5 }
      },
      {
        clientKey: 'q6',
        type: 'multiple-choice',
        answer: '25 \\times \\frac{3}{25} = 1 \\times 3',
        options: [
          '25 \\times \\frac{3}{25} = 1 \\times 3',
          '25 \\times 3 = 1 \\times \\frac{3}{25}',
          '25 \\times 1 = 3 \\times \\frac{3}{25}',
          '25 \\times \\frac{3}{25} = 25 \\times 3'
        ],
        problemLabel: '(6)',
        responseLabel: '곱의 관계 식',
        hints: ['외항의 곱 = 내항의 곱을 적용하세요.', '25 × \\frac{3}{25} = 1 × 3을 선택하세요.'],
        sourceText: '25 : 1 = 3 : 3/25',
        confidence: 0.99,
        position: { top: 46.5, left: 56.0, width: 26.0, height: 4.5 }
      },
      {
        clientKey: 'q7',
        type: 'multiple-choice',
        answer: '25 \\times 1 = 2 \\times \\frac{25}{2}',
        options: [
          '25 \\times 1 = 2 \\times \\frac{25}{2}',
          '25 \\times \\frac{25}{2} = 2 \\times 1',
          '25 \\times 2 = \\frac{25}{2} \\times 1',
          '25 \\times 1 = 25 \\times 2'
        ],
        problemLabel: '(7)',
        responseLabel: '곱의 관계 식',
        hints: ['외항의 곱 = 내항의 곱을 적용하세요.', '25 × 1 = 2 × \\frac{25}{2}를 선택하세요.'],
        sourceText: '25 : 2 = 25/2 : 1',
        confidence: 0.99,
        position: { top: 66.5, left: 56.0, width: 26.0, height: 4.5 }
      },
      {
        clientKey: 'q8',
        type: 'multiple-choice',
        answer: '25 \\times \\frac{2}{25} = 2 \\times 1',
        options: [
          '25 \\times \\frac{2}{25} = 2 \\times 1',
          '25 \\times 1 = 2 \\times \\frac{2}{25}',
          '25 \\times 2 = 1 \\times \\frac{2}{25}',
          '25 \\times \\frac{2}{25} = 25 \\times 1'
        ],
        problemLabel: '(8)',
        responseLabel: '곱의 관계 식',
        hints: ['외항의 곱 = 내항의 곱을 적용하세요.', '25 × \\frac{2}{25} = 2 × 1을 선택하세요.'],
        sourceText: '25 : 2 = 1 : 2/25',
        confidence: 0.99,
        position: { top: 86.5, left: 56.0, width: 26.0, height: 4.5 }
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
console.log('All 34 pages generated successfully!');
