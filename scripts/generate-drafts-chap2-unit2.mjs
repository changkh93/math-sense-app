import fs from 'node:fs';

const unitId = 'ratios_ratio_chap2_unit2';

const pagesData = [
  // Page 1: Slide 94
  {
    pageId: 'page_1786933942899_1',
    summary: '연습문제 1 - 비례식과 곱의 관계 표현하기',
    elements: [
      {
        clientKey: 'q2_l',
        type: 'input',
        inputMode: 'integer',
        answer: '4',
        acceptedAnswers: ['4'],
        problemLabel: '(2) 비교량',
        responseLabel: 'a의 길이 칸수',
        hints: ['a의 칸수를 세어보세요.', '4를 입력하세요.'],
        sourceText: 'a:b = [ ]:[ ]',
        confidence: 0.99,
        position: { top: 81.5, left: 23.5, width: 3.5, height: 4.5 }
      },
      {
        clientKey: 'q2_r',
        type: 'input',
        inputMode: 'integer',
        answer: '2',
        acceptedAnswers: ['2'],
        problemLabel: '(2) 기준량',
        responseLabel: 'b의 길이 칸수',
        hints: ['b의 칸수를 세어보세요.', '2를 입력하세요.'],
        sourceText: 'a:b = [ ]:[ ]',
        confidence: 0.99,
        position: { top: 81.5, left: 28.0, width: 3.5, height: 4.5 }
      },
      {
        clientKey: 'q2_eq',
        type: 'multiple-choice',
        answer: '2a = 4b',
        options: ['2a = 4b', '4a = 2b', '2a = 2b', '4a = 4b'],
        problemLabel: '(2) 곱의 관계',
        responseLabel: '곱의 관계 식',
        hints: ['외항의 곱 = 내항의 곱을 적용하세요.', '2a = 4b를 선택하세요.'],
        sourceText: 'a:b = 4:2 <=> 2a = 4b',
        confidence: 0.99,
        position: { top: 81.5, left: 35.5, width: 11.5, height: 4.5 }
      },
      {
        clientKey: 'q3_l',
        type: 'input',
        inputMode: 'integer',
        answer: '2',
        acceptedAnswers: ['2'],
        problemLabel: '(3) 비교량',
        responseLabel: 'f의 길이 칸수',
        hints: ['f의 칸수를 세어보세요.', '2를 입력하세요.'],
        sourceText: 'f:e = [ ]:[ ]',
        confidence: 0.99,
        position: { top: 61.5, left: 60.5, width: 3.5, height: 4.5 }
      },
      {
        clientKey: 'q3_r',
        type: 'input',
        inputMode: 'integer',
        answer: '4',
        acceptedAnswers: ['4'],
        problemLabel: '(3) 기준량',
        responseLabel: 'e의 길이 칸수',
        hints: ['e의 칸수를 세어보세요.', '4를 입력하세요.'],
        sourceText: 'f:e = [ ]:[ ]',
        confidence: 0.99,
        position: { top: 61.5, left: 65.0, width: 3.5, height: 4.5 }
      },
      {
        clientKey: 'q3_eq',
        type: 'multiple-choice',
        answer: '4f = 2e',
        options: ['4f = 2e', '2f = 4e', '4e = 2f', 'f = 2e'],
        problemLabel: '(3) 곱의 관계',
        responseLabel: '곱의 관계 식',
        hints: ['외항의 곱 = 내항의 곱을 적용하세요.', '4f = 2e를 선택하세요.'],
        sourceText: 'f:e = 2:4 <=> 4f = 2e',
        confidence: 0.99,
        position: { top: 61.5, left: 72.5, width: 11.5, height: 4.5 }
      },
      {
        clientKey: 'q4_l',
        type: 'input',
        inputMode: 'integer',
        answer: '3',
        acceptedAnswers: ['3'],
        problemLabel: '(4) 비교량',
        responseLabel: 'b의 길이 칸수',
        hints: ['b의 칸수를 세어보세요.', '3을 입력하세요.'],
        sourceText: 'b:a = [ ]:[ ]',
        confidence: 0.99,
        position: { top: 81.5, left: 61.5, width: 3.5, height: 4.5 }
      },
      {
        clientKey: 'q4_r',
        type: 'input',
        inputMode: 'integer',
        answer: '2',
        acceptedAnswers: ['2'],
        problemLabel: '(4) 기준량',
        responseLabel: 'a의 길이 칸수',
        hints: ['a의 칸수를 세어보세요.', '2를 입력하세요.'],
        sourceText: 'b:a = [ ]:[ ]',
        confidence: 0.99,
        position: { top: 81.5, left: 66.0, width: 3.5, height: 4.5 }
      },
      {
        clientKey: 'q4_eq',
        type: 'multiple-choice',
        answer: '2b = 3a',
        options: ['2b = 3a', '3b = 2a', '2a = 3b', 'b = 3a'],
        problemLabel: '(4) 곱의 관계',
        responseLabel: '곱의 관계 식',
        hints: ['외항의 곱 = 내항의 곱을 적용하세요.', '2b = 3a를 선택하세요.'],
        sourceText: 'b:a = 3:2 <=> 2b = 3a',
        confidence: 0.99,
        position: { top: 81.5, left: 73.5, width: 11.5, height: 4.5 }
      }
    ]
  },

  // Page 2: Slide 95
  {
    pageId: 'page_1786933942899_2',
    summary: '연습문제 2 - 비례식과 곱의 관계 표현하기',
    elements: [
      // (2) a:c = [2]:[2] <=> 2a=2c
      {
        clientKey: 'q2_l',
        type: 'input',
        inputMode: 'integer',
        answer: '2',
        acceptedAnswers: ['2'],
        problemLabel: '(2) 비교량',
        responseLabel: 'a의 칸수',
        hints: ['a의 칸수를 세어보세요.', '2를 입력하세요.'],
        sourceText: 'a:c = [ ]:[ ]',
        confidence: 0.99,
        position: { top: 44.5, left: 23.5, width: 3.0, height: 4.0 }
      },
      {
        clientKey: 'q2_r',
        type: 'input',
        inputMode: 'integer',
        answer: '2',
        acceptedAnswers: ['2'],
        problemLabel: '(2) 기준량',
        responseLabel: 'c의 칸수',
        hints: ['c의 칸수를 세어보세요.', '2를 입력하세요.'],
        sourceText: 'a:c = [ ]:[ ]',
        confidence: 0.99,
        position: { top: 44.5, left: 28.0, width: 3.0, height: 4.0 }
      },
      {
        clientKey: 'q2_eq',
        type: 'multiple-choice',
        answer: '2a = 2c',
        options: ['2a = 2c', '4a = 2c', '2a = 4c', 'a = 2c'],
        problemLabel: '(2) 곱의 관계',
        responseLabel: '곱의 관계 식',
        hints: ['외항의 곱 = 내항의 곱을 적용하세요.', '2a = 2c를 선택하세요.'],
        sourceText: 'a:c = 2:2 <=> 2a = 2c',
        confidence: 0.99,
        position: { top: 44.5, left: 35.5, width: 11.5, height: 4.0 }
      },
      // (3) y:x = [2]:[3] <=> 3y=2x
      {
        clientKey: 'q3_l',
        type: 'input',
        inputMode: 'integer',
        answer: '2',
        acceptedAnswers: ['2'],
        problemLabel: '(3) 비교량',
        responseLabel: 'y의 칸수',
        hints: ['y의 칸수를 세어보세요.', '2를 입력하세요.'],
        sourceText: 'y:x = [ ]:[ ]',
        confidence: 0.99,
        position: { top: 64.5, left: 23.5, width: 3.0, height: 4.0 }
      },
      {
        clientKey: 'q3_r',
        type: 'input',
        inputMode: 'integer',
        answer: '3',
        acceptedAnswers: ['3'],
        problemLabel: '(3) 기준량',
        responseLabel: 'x의 칸수',
        hints: ['x의 칸수를 세어보세요.', '3을 입력하세요.'],
        sourceText: 'y:x = [ ]:[ ]',
        confidence: 0.99,
        position: { top: 64.5, left: 28.0, width: 3.0, height: 4.0 }
      },
      {
        clientKey: 'q3_eq',
        type: 'multiple-choice',
        answer: '3y = 2x',
        options: ['3y = 2x', '2y = 3x', '3y = 3x', '2y = 2x'],
        problemLabel: '(3) 곱의 관계',
        responseLabel: '곱의 관계 식',
        hints: ['외항의 곱 = 내항의 곱을 적용하세요.', '3y = 2x를 선택하세요.'],
        sourceText: 'y:x = 2:3 <=> 3y = 2x',
        confidence: 0.99,
        position: { top: 64.5, left: 35.5, width: 11.5, height: 4.0 }
      },
      // (4) a:b = [9]:[1] <=> 1a=9b
      {
        clientKey: 'q4_l',
        type: 'input',
        inputMode: 'integer',
        answer: '9',
        acceptedAnswers: ['9'],
        problemLabel: '(4) 비교량',
        responseLabel: 'a의 칸수',
        hints: ['a의 칸수를 세어보세요.', '9를 입력하세요.'],
        sourceText: 'a:b = [ ]:[ ]',
        confidence: 0.99,
        position: { top: 84.5, left: 23.5, width: 3.0, height: 4.0 }
      },
      {
        clientKey: 'q4_r',
        type: 'input',
        inputMode: 'integer',
        answer: '1',
        acceptedAnswers: ['1'],
        problemLabel: '(4) 기준량',
        responseLabel: 'b의 칸수',
        hints: ['b의 칸수를 세어보세요.', '1을 입력하세요.'],
        sourceText: 'a:b = [ ]:[ ]',
        confidence: 0.99,
        position: { top: 84.5, left: 28.0, width: 3.0, height: 4.0 }
      },
      {
        clientKey: 'q4_eq',
        type: 'multiple-choice',
        answer: '1a = 9b',
        options: ['1a = 9b', '9a = 1b', '1a = 1b', '9a = 9b'],
        problemLabel: '(4) 곱의 관계',
        responseLabel: '곱의 관계 식',
        hints: ['외항의 곱 = 내항의 곱을 적용하세요.', '1a = 9b를 선택하세요.'],
        sourceText: 'a:b = 9:1 <=> 1a = 9b',
        confidence: 0.99,
        position: { top: 84.5, left: 35.5, width: 11.5, height: 4.0 }
      },
      // (5) k:j = [3]:[2] <=> 2k=3j
      {
        clientKey: 'q5_l',
        type: 'input',
        inputMode: 'integer',
        answer: '3',
        acceptedAnswers: ['3'],
        problemLabel: '(5) 비교량',
        responseLabel: 'k의 칸수',
        hints: ['k의 칸수를 세어보세요.', '3을 입력하세요.'],
        sourceText: 'k:j = [ ]:[ ]',
        confidence: 0.99,
        position: { top: 24.5, left: 61.5, width: 3.0, height: 4.0 }
      },
      {
        clientKey: 'q5_r',
        type: 'input',
        inputMode: 'integer',
        answer: '2',
        acceptedAnswers: ['2'],
        problemLabel: '(5) 기준량',
        responseLabel: 'j의 칸수',
        hints: ['j의 칸수를 세어보세요.', '2를 입력하세요.'],
        sourceText: 'k:j = [ ]:[ ]',
        confidence: 0.99,
        position: { top: 24.5, left: 65.5, width: 3.0, height: 4.0 }
      },
      {
        clientKey: 'q5_eq',
        type: 'multiple-choice',
        answer: '2k = 3j',
        options: ['2k = 3j', '3k = 2j', '2k = 2j', '3k = 3j'],
        problemLabel: '(5) 곱의 관계',
        responseLabel: '곱의 관계 식',
        hints: ['외항의 곱 = 내항의 곱을 적용하세요.', '2k = 3j를 선택하세요.'],
        sourceText: 'k:j = 3:2 <=> 2k = 3j',
        confidence: 0.99,
        position: { top: 24.5, left: 73.5, width: 11.5, height: 4.0 }
      },
      // (6) m:n = [2]:[3] <=> 3m=2n
      {
        clientKey: 'q6_l',
        type: 'input',
        inputMode: 'integer',
        answer: '2',
        acceptedAnswers: ['2'],
        problemLabel: '(6) 비교량',
        responseLabel: 'm의 칸수',
        hints: ['m의 칸수를 세어보세요.', '2를 입력하세요.'],
        sourceText: 'm:n = [ ]:[ ]',
        confidence: 0.99,
        position: { top: 44.5, left: 61.5, width: 3.0, height: 4.0 }
      },
      {
        clientKey: 'q6_r',
        type: 'input',
        inputMode: 'integer',
        answer: '3',
        acceptedAnswers: ['3'],
        problemLabel: '(6) 기준량',
        responseLabel: 'n의 칸수',
        hints: ['n의 칸수를 세어보세요.', '3을 입력하세요.'],
        sourceText: 'm:n = [ ]:[ ]',
        confidence: 0.99,
        position: { top: 44.5, left: 65.5, width: 3.0, height: 4.0 }
      },
      {
        clientKey: 'q6_eq',
        type: 'multiple-choice',
        answer: '3m = 2n',
        options: ['3m = 2n', '2m = 3n', '3m = 3n', '2m = 2n'],
        problemLabel: '(6) 곱의 관계',
        responseLabel: '곱의 관계 식',
        hints: ['외항의 곱 = 내항의 곱을 적용하세요.', '3m = 2n을 선택하세요.'],
        sourceText: 'm:n = 2:3 <=> 3m = 2n',
        confidence: 0.99,
        position: { top: 44.5, left: 73.5, width: 11.5, height: 4.0 }
      },
      // (7) f:e = [2]:[2] <=> 2f=2e
      {
        clientKey: 'q7_l',
        type: 'input',
        inputMode: 'integer',
        answer: '2',
        acceptedAnswers: ['2'],
        problemLabel: '(7) 비교량',
        responseLabel: 'f의 칸수',
        hints: ['f의 칸수를 세어보세요.', '2를 입력하세요.'],
        sourceText: 'f:e = [ ]:[ ]',
        confidence: 0.99,
        position: { top: 64.5, left: 61.5, width: 3.0, height: 4.0 }
      },
      {
        clientKey: 'q7_r',
        type: 'input',
        inputMode: 'integer',
        answer: '2',
        acceptedAnswers: ['2'],
        problemLabel: '(7) 기준량',
        responseLabel: 'e의 칸수',
        hints: ['e의 칸수를 세어보세요.', '2를 입력하세요.'],
        sourceText: 'f:e = [ ]:[ ]',
        confidence: 0.99,
        position: { top: 64.5, left: 65.5, width: 3.0, height: 4.0 }
      },
      {
        clientKey: 'q7_eq',
        type: 'multiple-choice',
        answer: '2f = 2e',
        options: ['2f = 2e', '4f = 2e', '2f = 4e', 'f = 2e'],
        problemLabel: '(7) 곱의 관계',
        responseLabel: '곱의 관계 식',
        hints: ['외항의 곱 = 내항의 곱을 적용하세요.', '2f = 2e를 선택하세요.'],
        sourceText: 'f:e = 2:2 <=> 2f = 2e',
        confidence: 0.99,
        position: { top: 64.5, left: 73.5, width: 11.5, height: 4.0 }
      },
      // (8) q:p = [3]:[4] <=> 4q=3p
      {
        clientKey: 'q8_l',
        type: 'input',
        inputMode: 'integer',
        answer: '3',
        acceptedAnswers: ['3'],
        problemLabel: '(8) 비교량',
        responseLabel: 'q의 칸수',
        hints: ['q의 칸수를 세어보세요.', '3을 입력하세요.'],
        sourceText: 'q:p = [ ]:[ ]',
        confidence: 0.99,
        position: { top: 84.5, left: 61.5, width: 3.0, height: 4.0 }
      },
      {
        clientKey: 'q8_r',
        type: 'input',
        inputMode: 'integer',
        answer: '4',
        acceptedAnswers: ['4'],
        problemLabel: '(8) 기준량',
        responseLabel: 'p의 칸수',
        hints: ['p의 칸수를 세어보세요.', '4를 입력하세요.'],
        sourceText: 'q:p = [ ]:[ ]',
        confidence: 0.99,
        position: { top: 84.5, left: 65.5, width: 3.0, height: 4.0 }
      },
      {
        clientKey: 'q8_eq',
        type: 'multiple-choice',
        answer: '4q = 3p',
        options: ['4q = 3p', '3q = 4p', '4q = 4p', '3q = 3p'],
        problemLabel: '(8) 곱의 관계',
        responseLabel: '곱의 관계 식',
        hints: ['외항의 곱 = 내항의 곱을 적용하세요.', '4q = 3p를 선택하세요.'],
        sourceText: 'q:p = 3:4 <=> 4q = 3p',
        confidence: 0.99,
        position: { top: 84.5, left: 73.5, width: 11.5, height: 4.0 }
      }
    ]
  },

  // Page 3: Slide 96
  {
    pageId: 'page_1786933942899_3',
    summary: '연습문제 3 - 곱의 관계를 비로 바꾸기',
    elements: [
      {
        clientKey: 'q2_l',
        type: 'input',
        inputMode: 'integer',
        answer: '5',
        acceptedAnswers: ['5'],
        problemLabel: '(2) 비교량',
        responseLabel: 'a의 비',
        hints: ['4a=5c에서 a:c의 비를 구하세요.', '5를 입력하세요.'],
        sourceText: '4a=5c <=> a:c = [ ]:[ ]',
        confidence: 0.99,
        position: { top: 44.5, left: 38.5, width: 3.0, height: 4.0 }
      },
      {
        clientKey: 'q2_r',
        type: 'input',
        inputMode: 'integer',
        answer: '4',
        acceptedAnswers: ['4'],
        problemLabel: '(2) 기준량',
        responseLabel: 'c의 비',
        hints: ['4a=5c에서 a:c의 비를 구하세요.', '4를 입력하세요.'],
        sourceText: '4a=5c <=> a:c = [ ]:[ ]',
        confidence: 0.99,
        position: { top: 44.5, left: 43.0, width: 3.0, height: 4.0 }
      },
      {
        clientKey: 'q3_l',
        type: 'input',
        inputMode: 'integer',
        answer: '3',
        acceptedAnswers: ['3'],
        problemLabel: '(3) 비교량',
        responseLabel: 'y의 비',
        hints: ['7y=3x에서 y:x의 비를 구하세요.', '3을 입력하세요.'],
        sourceText: '7y=3x <=> y:x = [ ]:[ ]',
        confidence: 0.99,
        position: { top: 64.5, left: 38.5, width: 3.0, height: 4.0 }
      },
      {
        clientKey: 'q3_r',
        type: 'input',
        inputMode: 'integer',
        answer: '7',
        acceptedAnswers: ['7'],
        problemLabel: '(3) 기준량',
        responseLabel: 'x의 비',
        hints: ['7y=3x에서 y:x의 비를 구하세요.', '7을 입력하세요.'],
        sourceText: '7y=3x <=> y:x = [ ]:[ ]',
        confidence: 0.99,
        position: { top: 64.5, left: 43.0, width: 3.0, height: 4.0 }
      },
      {
        clientKey: 'q4_l',
        type: 'input',
        inputMode: 'integer',
        answer: '9',
        acceptedAnswers: ['9'],
        problemLabel: '(4) 비교량',
        responseLabel: 'a의 비',
        hints: ['1a=9b에서 a:b의 비를 구하세요.', '9를 입력하세요.'],
        sourceText: '1a=9b <=> a:b = [ ]:[ ]',
        confidence: 0.99,
        position: { top: 84.5, left: 38.5, width: 3.0, height: 4.0 }
      },
      {
        clientKey: 'q4_r',
        type: 'input',
        inputMode: 'integer',
        answer: '1',
        acceptedAnswers: ['1'],
        problemLabel: '(4) 기준량',
        responseLabel: 'b의 비',
        hints: ['1a=9b에서 a:b의 비를 구하세요.', '1을 입력하세요.'],
        sourceText: '1a=9b <=> a:b = [ ]:[ ]',
        confidence: 0.99,
        position: { top: 84.5, left: 43.0, width: 3.0, height: 4.0 }
      },
      {
        clientKey: 'q5_l',
        type: 'input',
        inputMode: 'integer',
        answer: '5',
        acceptedAnswers: ['5'],
        problemLabel: '(5) 비교량',
        responseLabel: 'k의 비',
        hints: ['3k=5j에서 k:j의 비를 구하세요.', '5를 입력하세요.'],
        sourceText: '3k=5j <=> k:j = [ ]:[ ]',
        confidence: 0.99,
        position: { top: 24.5, left: 76.5, width: 3.0, height: 4.0 }
      },
      {
        clientKey: 'q5_r',
        type: 'input',
        inputMode: 'integer',
        answer: '3',
        acceptedAnswers: ['3'],
        problemLabel: '(5) 기준량',
        responseLabel: 'j의 비',
        hints: ['3k=5j에서 k:j의 비를 구하세요.', '3을 입력하세요.'],
        sourceText: '3k=5j <=> k:j = [ ]:[ ]',
        confidence: 0.99,
        position: { top: 24.5, left: 81.0, width: 3.0, height: 4.0 }
      },
      {
        clientKey: 'q6_l',
        type: 'input',
        inputMode: 'integer',
        answer: '3',
        acceptedAnswers: ['3'],
        problemLabel: '(6) 비교량',
        responseLabel: 'm의 비',
        hints: ['6m=3n에서 m:n의 비를 구하세요.', '3을 입력하세요.'],
        sourceText: '6m=3n <=> m:n = [ ]:[ ]',
        confidence: 0.99,
        position: { top: 44.5, left: 76.5, width: 3.0, height: 4.0 }
      },
      {
        clientKey: 'q6_r',
        type: 'input',
        inputMode: 'integer',
        answer: '6',
        acceptedAnswers: ['6'],
        problemLabel: '(6) 기준량',
        responseLabel: 'n의 비',
        hints: ['6m=3n에서 m:n의 비를 구하세요.', '6을 입력하세요.'],
        sourceText: '6m=3n <=> m:n = [ ]:[ ]',
        confidence: 0.99,
        position: { top: 44.5, left: 81.0, width: 3.0, height: 4.0 }
      },
      {
        clientKey: 'q7_l',
        type: 'input',
        inputMode: 'integer',
        answer: '5',
        acceptedAnswers: ['5'],
        problemLabel: '(7) 비교량',
        responseLabel: 'f의 비',
        hints: ['6f=5e에서 f:e의 비를 구하세요.', '5를 입력하세요.'],
        sourceText: '6f=5e <=> f:e = [ ]:[ ]',
        confidence: 0.99,
        position: { top: 64.5, left: 76.5, width: 3.0, height: 4.0 }
      },
      {
        clientKey: 'q7_r',
        type: 'input',
        inputMode: 'integer',
        answer: '6',
        acceptedAnswers: ['6'],
        problemLabel: '(7) 기준량',
        responseLabel: 'e의 비',
        hints: ['6f=5e에서 f:e의 비를 구하세요.', '6을 입력하세요.'],
        sourceText: '6f=5e <=> f:e = [ ]:[ ]',
        confidence: 0.99,
        position: { top: 64.5, left: 81.0, width: 3.0, height: 4.0 }
      },
      {
        clientKey: 'q8_l',
        type: 'input',
        inputMode: 'integer',
        answer: '2',
        acceptedAnswers: ['2'],
        problemLabel: '(8) 비교량',
        responseLabel: 'q의 비',
        hints: ['3q=2p에서 q:p의 비를 구하세요.', '2를 입력하세요.'],
        sourceText: '3q=2p <=> q:p = [ ]:[ ]',
        confidence: 0.99,
        position: { top: 84.5, left: 76.5, width: 3.0, height: 4.0 }
      },
      {
        clientKey: 'q8_r',
        type: 'input',
        inputMode: 'integer',
        answer: '3',
        acceptedAnswers: ['3'],
        problemLabel: '(8) 기준량',
        responseLabel: 'p의 비',
        hints: ['3q=2p에서 q:p의 비를 구하세요.', '3을 입력하세요.'],
        sourceText: '3q=2p <=> q:p = [ ]:[ ]',
        confidence: 0.99,
        position: { top: 84.5, left: 81.0, width: 3.0, height: 4.0 }
      }
    ]
  },

  // Page 4: Slide 97
  {
    pageId: 'page_1786933942899_4',
    summary: '연습문제 4 - 분수 비와 곱의 관계 표현하기',
    elements: [
      {
        clientKey: 'q2_top',
        type: 'input',
        inputMode: 'integer',
        answer: '2',
        acceptedAnswers: ['2'],
        problemLabel: '(2) 분자',
        responseLabel: 'f의 칸수',
        hints: ['f의 칸수를 세어보세요.', '2를 입력하세요.'],
        sourceText: 'f/e = [ ]/[ ]',
        confidence: 0.99,
        position: { top: 42.0, left: 25.5, width: 3.0, height: 3.0 }
      },
      {
        clientKey: 'q2_bot',
        type: 'input',
        inputMode: 'integer',
        answer: '4',
        acceptedAnswers: ['4'],
        problemLabel: '(2) 분모',
        responseLabel: 'e의 칸수',
        hints: ['e의 칸수를 세어보세요.', '4를 입력하세요.'],
        sourceText: 'f/e = [ ]/[ ]',
        confidence: 0.99,
        position: { top: 45.5, left: 25.5, width: 3.0, height: 3.0 }
      },
      {
        clientKey: 'q2_eq',
        type: 'multiple-choice',
        answer: '4f = 2e',
        options: ['4f = 2e', '2f = 4e', '4e = 2f', 'f = 2e'],
        problemLabel: '(2) 곱의 관계',
        responseLabel: '곱의 관계 식',
        hints: ['엇갈려 곱한 식을 찾으세요.', '4f = 2e를 선택하세요.'],
        sourceText: 'f/e = 2/4 <=> 4f = 2e',
        confidence: 0.99,
        position: { top: 44.5, left: 34.5, width: 11.5, height: 4.0 }
      },
      {
        clientKey: 'q3_top',
        type: 'input',
        inputMode: 'integer',
        answer: '9',
        acceptedAnswers: ['9'],
        problemLabel: '(3) 분자',
        responseLabel: 'b의 칸수',
        hints: ['b의 칸수를 세어보세요.', '9를 입력하세요.'],
        sourceText: 'b/a = [ ]/[ ]',
        confidence: 0.99,
        position: { top: 62.0, left: 25.5, width: 3.0, height: 3.0 }
      },
      {
        clientKey: 'q3_bot',
        type: 'input',
        inputMode: 'integer',
        answer: '1',
        acceptedAnswers: ['1'],
        problemLabel: '(3) 분모',
        responseLabel: 'a의 칸수',
        hints: ['a의 칸수를 세어보세요.', '1을 입력하세요.'],
        sourceText: 'b/a = [ ]/[ ]',
        confidence: 0.99,
        position: { top: 65.5, left: 25.5, width: 3.0, height: 3.0 }
      },
      {
        clientKey: 'q3_eq',
        type: 'multiple-choice',
        answer: '1b = 9a',
        options: ['1b = 9a', '9b = 1a', '1b = 1a', '9b = 9a'],
        problemLabel: '(3) 곱의 관계',
        responseLabel: '곱의 관계 식',
        hints: ['엇갈려 곱한 식을 찾으세요.', '1b = 9a를 선택하세요.'],
        sourceText: 'b/a = 9/1 <=> 1b = 9a',
        confidence: 0.99,
        position: { top: 64.5, left: 34.5, width: 11.5, height: 4.0 }
      },
      {
        clientKey: 'q4_top',
        type: 'input',
        inputMode: 'integer',
        answer: '1',
        acceptedAnswers: ['1'],
        problemLabel: '(4) 분자',
        responseLabel: 'a의 칸수',
        hints: ['a의 칸수를 세어보세요.', '1을 입력하세요.'],
        sourceText: 'a/z = [ ]/[ ]',
        confidence: 0.99,
        position: { top: 82.0, left: 25.5, width: 3.0, height: 3.0 }
      },
      {
        clientKey: 'q4_bot',
        type: 'input',
        inputMode: 'integer',
        answer: '9',
        acceptedAnswers: ['9'],
        problemLabel: '(4) 분모',
        responseLabel: 'z의 칸수',
        hints: ['z의 칸수를 세어보세요.', '9를 입력하세요.'],
        sourceText: 'a/z = [ ]/[ ]',
        confidence: 0.99,
        position: { top: 85.5, left: 25.5, width: 3.0, height: 3.0 }
      },
      {
        clientKey: 'q4_eq',
        type: 'multiple-choice',
        answer: '9a = 1z',
        options: ['9a = 1z', '1a = 9z', '9a = 9z', '1a = 1z'],
        problemLabel: '(4) 곱의 관계',
        responseLabel: '곱의 관계 식',
        hints: ['엇갈려 곱한 식을 찾으세요.', '9a = 1z를 선택하세요.'],
        sourceText: 'a/z = 1/9 <=> 9a = 1z',
        confidence: 0.99,
        position: { top: 84.5, left: 34.5, width: 11.5, height: 4.0 }
      },
      {
        clientKey: 'q5_top',
        type: 'input',
        inputMode: 'integer',
        answer: '3',
        acceptedAnswers: ['3'],
        problemLabel: '(5) 분자',
        responseLabel: 'b의 칸수',
        hints: ['b의 칸수를 세어보세요.', '3을 입력하세요.'],
        sourceText: 'b/a = [ ]/[ ]',
        confidence: 0.99,
        position: { top: 22.0, left: 63.5, width: 3.0, height: 3.0 }
      },
      {
        clientKey: 'q5_bot',
        type: 'input',
        inputMode: 'integer',
        answer: '2',
        acceptedAnswers: ['2'],
        problemLabel: '(5) 분모',
        responseLabel: 'a의 칸수',
        hints: ['a의 칸수를 세어보세요.', '2를 입력하세요.'],
        sourceText: 'b/a = [ ]/[ ]',
        confidence: 0.99,
        position: { top: 25.5, left: 63.5, width: 3.0, height: 3.0 }
      },
      {
        clientKey: 'q5_eq',
        type: 'multiple-choice',
        answer: '2b = 3a',
        options: ['2b = 3a', '3b = 2a', '2b = 2a', '3b = 3a'],
        problemLabel: '(5) 곱의 관계',
        responseLabel: '곱의 관계 식',
        hints: ['엇갈려 곱한 식을 찾으세요.', '2b = 3a를 선택하세요.'],
        sourceText: 'b/a = 3/2 <=> 2b = 3a',
        confidence: 0.99,
        position: { top: 24.5, left: 72.5, width: 11.5, height: 4.0 }
      },
      {
        clientKey: 'q6_top',
        type: 'input',
        inputMode: 'integer',
        answer: '3',
        acceptedAnswers: ['3'],
        problemLabel: '(6) 분자',
        responseLabel: 'k의 칸수',
        hints: ['k의 칸수를 세어보세요.', '3을 입력하세요.'],
        sourceText: 'k/j = [ ]/[ ]',
        confidence: 0.99,
        position: { top: 42.0, left: 63.5, width: 3.0, height: 3.0 }
      },
      {
        clientKey: 'q6_bot',
        type: 'input',
        inputMode: 'integer',
        answer: '2',
        acceptedAnswers: ['2'],
        problemLabel: '(6) 분모',
        responseLabel: 'j의 칸수',
        hints: ['j의 칸수를 세어보세요.', '2를 입력하세요.'],
        sourceText: 'k/j = [ ]/[ ]',
        confidence: 0.99,
        position: { top: 45.5, left: 63.5, width: 3.0, height: 3.0 }
      },
      {
        clientKey: 'q6_eq',
        type: 'multiple-choice',
        answer: '2k = 3j',
        options: ['2k = 3j', '3k = 2j', '2k = 2j', '3k = 3j'],
        problemLabel: '(6) 곱의 관계',
        responseLabel: '곱의 관계 식',
        hints: ['엇갈려 곱한 식을 찾으세요.', '2k = 3j를 선택하세요.'],
        sourceText: 'k/j = 3/2 <=> 2k = 3j',
        confidence: 0.99,
        position: { top: 44.5, left: 72.5, width: 11.5, height: 4.0 }
      },
      {
        clientKey: 'q7_top',
        type: 'input',
        inputMode: 'integer',
        answer: '2',
        acceptedAnswers: ['2'],
        problemLabel: '(7) 분자',
        responseLabel: 'f의 칸수',
        hints: ['f의 칸수를 세어보세요.', '2를 입력하세요.'],
        sourceText: 'f/e = [ ]/[ ]',
        confidence: 0.99,
        position: { top: 62.0, left: 63.5, width: 3.0, height: 3.0 }
      },
      {
        clientKey: 'q7_bot',
        type: 'input',
        inputMode: 'integer',
        answer: '2',
        acceptedAnswers: ['2'],
        problemLabel: '(7) 분모',
        responseLabel: 'e의 칸수',
        hints: ['e의 칸수를 세어보세요.', '2를 입력하세요.'],
        sourceText: 'f/e = [ ]/[ ]',
        confidence: 0.99,
        position: { top: 65.5, left: 63.5, width: 3.0, height: 3.0 }
      },
      {
        clientKey: 'q7_eq',
        type: 'multiple-choice',
        answer: '2f = 2e',
        options: ['2f = 2e', '4f = 2e', '2f = 4e', 'f = 2e'],
        problemLabel: '(7) 곱의 관계',
        responseLabel: '곱의 관계 식',
        hints: ['엇갈려 곱한 식을 찾으세요.', '2f = 2e를 선택하세요.'],
        sourceText: 'f/e = 2/2 <=> 2f = 2e',
        confidence: 0.99,
        position: { top: 64.5, left: 72.5, width: 11.5, height: 4.0 }
      },
      {
        clientKey: 'q8_top',
        type: 'input',
        inputMode: 'integer',
        answer: '2',
        acceptedAnswers: ['2'],
        problemLabel: '(8) 분자',
        responseLabel: 'a의 칸수',
        hints: ['a의 칸수를 세어보세요.', '2를 입력하세요.'],
        sourceText: 'a/c = [ ]/[ ]',
        confidence: 0.99,
        position: { top: 82.0, left: 63.5, width: 3.0, height: 3.0 }
      },
      {
        clientKey: 'q8_bot',
        type: 'input',
        inputMode: 'integer',
        answer: '2',
        acceptedAnswers: ['2'],
        problemLabel: '(8) 분모',
        responseLabel: 'c의 칸수',
        hints: ['c의 칸수를 세어보세요.', '2를 입력하세요.'],
        sourceText: 'a/c = [ ]/[ ]',
        confidence: 0.99,
        position: { top: 85.5, left: 63.5, width: 3.0, height: 3.0 }
      },
      {
        clientKey: 'q8_eq',
        type: 'multiple-choice',
        answer: '2a = 2c',
        options: ['2a = 2c', '4a = 2c', '2a = 4c', 'a = 2c'],
        problemLabel: '(8) 곱의 관계',
        responseLabel: '곱의 관계 식',
        hints: ['엇갈려 곱한 식을 찾으세요.', '2a = 2c를 선택하세요.'],
        sourceText: 'a/c = 2/2 <=> 2a = 2c',
        confidence: 0.99,
        position: { top: 84.5, left: 72.5, width: 11.5, height: 4.0 }
      }
    ]
  },

  // Page 5: Slide 98
  {
    pageId: 'page_1786933942899_5',
    summary: '표현문제 1 - 곱의 관계로 표현하기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '2a = 4b',
        options: ['2a = 4b', '4a = 2b', '2a = 2b', '4a = 4b'],
        problemLabel: '(2)',
        responseLabel: '곱의 관계 식',
        hints: ['외항의 곱(a×2)과 내항의 곱(b×4)을 연결하세요.', '2a = 4b를 선택하세요.'],
        sourceText: 'a:b = 4:2',
        confidence: 0.99,
        position: { top: 81.5, left: 35.5, width: 11.5, height: 4.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '1e = 2f',
        options: ['1e = 2f', '2e = 1f', '1e = 1f', '2e = 2f'],
        problemLabel: '(3)',
        responseLabel: '곱의 관계 식',
        hints: ['외항의 곱(e×1)과 내항의 곱(f×2)을 연결하세요.', '1e = 2f를 선택하세요.'],
        sourceText: 'e:f = 2:1',
        confidence: 0.99,
        position: { top: 61.5, left: 72.5, width: 11.5, height: 4.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '4a = 3b',
        options: ['4a = 3b', '3a = 4b', '4a = 4b', '3a = 3b'],
        problemLabel: '(4)',
        responseLabel: '곱의 관계 식',
        hints: ['외항의 곱(a×4)과 내항의 곱(b×3)을 연결하세요.', '4a = 3b를 선택하세요.'],
        sourceText: 'a:b = 3:4',
        confidence: 0.99,
        position: { top: 81.5, left: 73.5, width: 11.5, height: 4.5 }
      }
    ]
  },

  // Page 6: Slide 99
  {
    pageId: 'page_1786933942899_6',
    summary: '표현문제 2 - 곱의 관계로 표현하기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '4a = 5c',
        options: ['4a = 5c', '5a = 4c', '4a = 4c', '5a = 5c'],
        problemLabel: '(2)',
        responseLabel: '곱의 관계 식',
        hints: ['4a = 5c를 선택하세요.'],
        sourceText: 'a:c = 5:4',
        confidence: 0.99,
        position: { top: 43.5, left: 35.5, width: 11.5, height: 4.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '3x = 7y',
        options: ['3x = 7y', '7x = 3y', '3x = 3y', '7x = 7y'],
        problemLabel: '(3)',
        responseLabel: '곱의 관계 식',
        hints: ['3x = 7y를 선택하세요.'],
        sourceText: 'x:y = 7:3',
        confidence: 0.99,
        position: { top: 63.5, left: 35.5, width: 11.5, height: 4.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '1a = 9b',
        options: ['1a = 9b', '9a = 1b', '1a = 1b', '9a = 9b'],
        problemLabel: '(4)',
        responseLabel: '곱의 관계 식',
        hints: ['1a = 9b를 선택하세요.'],
        sourceText: 'a:b = 9:1',
        confidence: 0.99,
        position: { top: 83.5, left: 35.5, width: 11.5, height: 4.5 }
      },
      {
        clientKey: 'q5',
        type: 'multiple-choice',
        answer: '5j = 3k',
        options: ['5j = 3k', '3j = 5k', '5j = 5k', '3j = 3k'],
        problemLabel: '(5)',
        responseLabel: '곱의 관계 식',
        hints: ['5j = 3k를 선택하세요.'],
        sourceText: 'j:k = 3:5',
        confidence: 0.99,
        position: { top: 23.5, left: 73.5, width: 11.5, height: 4.5 }
      },
      {
        clientKey: 'q6',
        type: 'multiple-choice',
        answer: '6m = 3n',
        options: ['6m = 3n', '3m = 6n', '6m = 6n', '3m = 3n'],
        problemLabel: '(6)',
        responseLabel: '곱의 관계 식',
        hints: ['6m = 3n을 선택하세요.'],
        sourceText: 'm:n = 3:6',
        confidence: 0.99,
        position: { top: 43.5, left: 73.5, width: 11.5, height: 4.5 }
      },
      {
        clientKey: 'q7',
        type: 'multiple-choice',
        answer: '5e = 6f',
        options: ['5e = 6f', '6e = 5f', '5e = 5f', '6e = 6f'],
        problemLabel: '(7)',
        responseLabel: '곱의 관계 식',
        hints: ['5e = 6f를 선택하세요.'],
        sourceText: 'e:f = 6:5',
        confidence: 0.99,
        position: { top: 63.5, left: 73.5, width: 11.5, height: 4.5 }
      },
      {
        clientKey: 'q8',
        type: 'multiple-choice',
        answer: '2p = 3q',
        options: ['2p = 3q', '3p = 2q', '2p = 2q', '3p = 3q'],
        problemLabel: '(8)',
        responseLabel: '곱의 관계 식',
        hints: ['2p = 3q를 선택하세요.'],
        sourceText: 'p:q = 3:2',
        confidence: 0.99,
        position: { top: 83.5, left: 73.5, width: 11.5, height: 4.5 }
      }
    ]
  },

  // Page 7: Slide 100
  {
    pageId: 'page_1786933942899_7',
    summary: '표현문제 3 - 곱의 관계로 표현하기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '33c = 10f',
        options: ['33c = 10f', '10c = 33f', '33c = 33f', '10c = 10f'],
        problemLabel: '(2)',
        responseLabel: '곱의 관계 식',
        hints: ['33c = 10f를 선택하세요.'],
        sourceText: 'c:f = 10:33',
        confidence: 0.99,
        position: { top: 45.5, left: 18.0, width: 26.0, height: 4.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '99b = 1c',
        options: ['99b = 1c', '1b = 99c', '99b = 99c', '1b = 1c'],
        problemLabel: '(3)',
        responseLabel: '곱의 관계 식',
        hints: ['99b = 1c를 선택하세요.'],
        sourceText: 'b:c = 1:99',
        confidence: 0.99,
        position: { top: 65.5, left: 18.0, width: 26.0, height: 4.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '3m = 10n',
        options: ['3m = 10n', '10m = 3n', '3m = 3n', '10m = 10n'],
        problemLabel: '(4)',
        responseLabel: '곱의 관계 식',
        hints: ['3m = 10n을 선택하세요.'],
        sourceText: 'm:n = 10:3',
        confidence: 0.99,
        position: { top: 85.5, left: 18.0, width: 26.0, height: 4.5 }
      },
      {
        clientKey: 'q5',
        type: 'multiple-choice',
        answer: '11c = 3d',
        options: ['11c = 3d', '3c = 11d', '11c = 11d', '3c = 3d'],
        problemLabel: '(5)',
        responseLabel: '곱의 관계 식',
        hints: ['11c = 3d를 선택하세요.'],
        sourceText: 'c:d = 3:11',
        confidence: 0.99,
        position: { top: 25.5, left: 56.0, width: 26.0, height: 4.5 }
      },
      {
        clientKey: 'q6',
        type: 'multiple-choice',
        answer: '10십 = 1백',
        options: ['10십 = 1백', '1십 = 10백', '10십 = 10백', '1십 = 1백'],
        problemLabel: '(6)',
        responseLabel: '곱의 관계 식',
        hints: ['10십 = 1백을 선택하세요.'],
        sourceText: '십:백 = 1:10',
        confidence: 0.99,
        position: { top: 45.5, left: 56.0, width: 26.0, height: 4.5 }
      },
      {
        clientKey: 'q7',
        type: 'multiple-choice',
        answer: '122x = 11y',
        options: ['122x = 11y', '11x = 122y', '122x = 122y', '11x = 11y'],
        problemLabel: '(7)',
        responseLabel: '곱의 관계 식',
        hints: ['122x = 11y를 선택하세요.'],
        sourceText: 'x:y = 11:122',
        confidence: 0.99,
        position: { top: 65.5, left: 56.0, width: 26.0, height: 4.5 }
      },
      {
        clientKey: 'q8',
        type: 'multiple-choice',
        answer: '9h = 100g',
        options: ['9h = 100g', '100h = 9g', '9h = 9g', '100h = 100g'],
        problemLabel: '(8)',
        responseLabel: '곱의 관계 식',
        hints: ['9h = 100g를 선택하세요.'],
        sourceText: 'h:g = 100:9',
        confidence: 0.99,
        position: { top: 85.5, left: 56.0, width: 26.0, height: 4.5 }
      }
    ]
  },

  // Page 8: Slide 101
  {
    pageId: 'page_1786933942899_8',
    summary: '연습문제 5 - 같은 단위로 나눈 값 구하기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: 'b',
        options: ['b', '2b', '1', '2'],
        problemLabel: '(2)',
        responseLabel: '계산 결과',
        hints: ['2b ÷ 2 = b입니다.', 'b를 선택하세요.'],
        sourceText: '2b/2 = [ ]',
        confidence: 0.99,
        position: { top: 81.5, left: 33.5, width: 4.5, height: 5.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: 'a',
        options: ['a', '4a', '1', '4'],
        problemLabel: '(3)',
        responseLabel: '계산 결과',
        hints: ['4a ÷ 4 = a입니다.', 'a를 선택하세요.'],
        sourceText: '4a/4 = [ ]',
        confidence: 0.99,
        position: { top: 61.0, left: 71.5, width: 4.5, height: 5.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '뼘',
        options: ['뼘', '4뼘', '1', '4'],
        problemLabel: '(4)',
        responseLabel: '계산 결과',
        hints: ['4뼘 ÷ 4 = 뼘입니다.', '뼘을 선택하세요.'],
        sourceText: '4뼘/4 = [ ]',
        confidence: 0.99,
        position: { top: 81.5, left: 71.5, width: 4.5, height: 5.5 }
      }
    ]
  },

  // Page 9: Slide 102
  {
    pageId: 'page_1786933942899_9',
    summary: '연습문제 6 - 같은 단위로 나눈 값 구하기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '천',
        options: ['천', '3천', '1', '3'],
        problemLabel: '(2)',
        responseLabel: '계산 결과',
        hints: ['3천 ÷ 3 = 천입니다.', '천을 선택하세요.'],
        sourceText: '3천/3 = [ ]',
        confidence: 0.99,
        position: { top: 43.5, left: 33.5, width: 4.5, height: 5.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: 'k',
        options: ['k', '5k', '1', '5'],
        problemLabel: '(3)',
        responseLabel: '계산 결과',
        hints: ['5k ÷ 5 = k입니다.', 'k를 선택하세요.'],
        sourceText: '5k/5 = [ ]',
        confidence: 0.99,
        position: { top: 62.5, left: 32.0, width: 4.5, height: 5.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: 'inch',
        options: ['inch', '2inch', '1', '2'],
        problemLabel: '(4)',
        responseLabel: '계산 결과',
        hints: ['2inch ÷ 2 = inch입니다.', 'inch를 선택하세요.'],
        sourceText: '2inch/2 = [ ]',
        confidence: 0.99,
        position: { top: 83.5, left: 34.0, width: 7.5, height: 5.5 }
      },
      {
        clientKey: 'q5',
        type: 'multiple-choice',
        answer: 'c',
        options: ['c', '2c', '1', '2'],
        problemLabel: '(5)',
        responseLabel: '계산 결과',
        hints: ['2c ÷ 2 = c입니다.', 'c를 선택하세요.'],
        sourceText: '2c/2 = [ ]',
        confidence: 0.99,
        position: { top: 23.5, left: 70.0, width: 4.5, height: 5.5 }
      },
      {
        clientKey: 'q6',
        type: 'multiple-choice',
        answer: 'n',
        options: ['n', '4n', '1', '4'],
        problemLabel: '(6)',
        responseLabel: '계산 결과',
        hints: ['4n ÷ 4 = n입니다.', 'n를 선택하세요.'],
        sourceText: '4n/4 = [ ]',
        confidence: 0.99,
        position: { top: 43.5, left: 71.5, width: 4.5, height: 5.5 }
      },
      {
        clientKey: 'q7',
        type: 'multiple-choice',
        answer: 'i',
        options: ['i', '6i', '1', '6'],
        problemLabel: '(7)',
        responseLabel: '계산 결과',
        hints: ['6i ÷ 6 = i입니다.', 'i를 선택하세요.'],
        sourceText: '6i/6 = [ ]',
        confidence: 0.99,
        position: { top: 63.5, left: 71.0, width: 4.5, height: 5.5 }
      },
      {
        clientKey: 'q8',
        type: 'multiple-choice',
        answer: '백',
        options: ['백', '4백', '1', '4'],
        problemLabel: '(8)',
        responseLabel: '계산 결과',
        hints: ['4백 ÷ 4 = 백입니다.', '백을 선택하세요.'],
        sourceText: '4백/4 = [ ]',
        confidence: 0.99,
        position: { top: 83.5, left: 73.0, width: 4.5, height: 5.5 }
      }
    ]
  },

  // Page 10: Slide 103
  {
    pageId: 'page_1786933942899_10',
    summary: '연습문제 7 - 1개 단위 길이 찾기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '만',
        options: ['만', '3만', '1', '3'],
        problemLabel: '(2)',
        responseLabel: '단위 길이',
        hints: ['3만을 3등분한 1칸의 크기입니다.', '만을 선택하세요.'],
        sourceText: '3만 1칸',
        confidence: 0.99,
        position: { top: 42.5, left: 20.0, width: 4.5, height: 5.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: 'k',
        options: ['k', '5k', '1', '5'],
        problemLabel: '(3)',
        responseLabel: '단위 길이',
        hints: ['5k를 5등분한 1칸의 크기입니다.', 'k를 선택하세요.'],
        sourceText: '5k 1칸',
        confidence: 0.99,
        position: { top: 60.5, left: 19.0, width: 4.5, height: 5.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: 'inch',
        options: ['inch', '3inch', '1', '3'],
        problemLabel: '(4)',
        responseLabel: '단위 길이',
        hints: ['3inch를 3등분한 1칸의 크기입니다.', 'inch를 선택하세요.'],
        sourceText: '3inch 1칸',
        confidence: 0.99,
        position: { top: 82.5, left: 19.0, width: 8.0, height: 5.5 }
      },
      {
        clientKey: 'q5',
        type: 'multiple-choice',
        answer: 'x',
        options: ['x', '2x', '1', '2'],
        problemLabel: '(5)',
        responseLabel: '단위 길이',
        hints: ['2x를 2등분한 1칸의 크기입니다.', 'x를 선택하세요.'],
        sourceText: '2x 1칸',
        confidence: 0.99,
        position: { top: 22.5, left: 60.0, width: 4.5, height: 5.5 }
      },
      {
        clientKey: 'q6',
        type: 'multiple-choice',
        answer: 'n',
        options: ['n', '4n', '1', '4'],
        problemLabel: '(6)',
        responseLabel: '단위 길이',
        hints: ['4n을 4등분한 1칸의 크기입니다.', 'n를 선택하세요.'],
        sourceText: '4n 1칸',
        confidence: 0.99,
        position: { top: 42.0, left: 55.5, width: 4.5, height: 5.5 }
      },
      {
        clientKey: 'q7',
        type: 'multiple-choice',
        answer: 'i',
        options: ['i', '5i', '1', '5'],
        problemLabel: '(7)',
        responseLabel: '단위 길이',
        hints: ['5i를 5등분한 1칸의 크기입니다.', 'i를 선택하세요.'],
        sourceText: '5i 1칸',
        confidence: 0.99,
        position: { top: 61.0, left: 56.5, width: 4.5, height: 5.5 }
      },
      {
        clientKey: 'q8',
        type: 'multiple-choice',
        answer: '백',
        options: ['백', '4백', '1', '4'],
        problemLabel: '(8)',
        responseLabel: '단위 길이',
        hints: ['4백을 4등분한 1칸의 크기입니다.', '백을 선택하세요.'],
        sourceText: '4백 1칸',
        confidence: 0.99,
        position: { top: 82.5, left: 55.5, width: 4.5, height: 5.5 }
      }
    ]
  },

  // Page 11: Slide 104
  {
    pageId: 'page_1786933942899_11',
    summary: '연습문제 8 - 나눌 수 찾기 (정수 입력형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'input',
        inputMode: 'integer',
        answer: '99',
        acceptedAnswers: ['99'],
        problemLabel: '(2)',
        responseLabel: '분모의 수',
        hints: ['99a를 99로 나눠야 a가 됩니다.', '99를 입력하세요.'],
        sourceText: '99a/[ ] = a',
        confidence: 0.99,
        position: { top: 43.5, left: 25.0, width: 4.5, height: 5.5 }
      },
      {
        clientKey: 'q3',
        type: 'input',
        inputMode: 'integer',
        answer: '100',
        acceptedAnswers: ['100'],
        problemLabel: '(3)',
        responseLabel: '분모의 수',
        hints: ['100병을 100으로 나눠야 1병이 됩니다.', '100을 입력하세요.'],
        sourceText: '100병/[ ] = 1병',
        confidence: 0.99,
        position: { top: 62.5, left: 21.0, width: 4.5, height: 5.5 }
      },
      {
        clientKey: 'q4',
        type: 'input',
        inputMode: 'integer',
        answer: '33',
        acceptedAnswers: ['33'],
        problemLabel: '(4)',
        responseLabel: '분모의 수',
        hints: ['33k를 33으로 나눠야 k가 됩니다.', '33을 입력하세요.'],
        sourceText: '33k/[ ] = k',
        confidence: 0.99,
        position: { top: 82.5, left: 25.0, width: 4.5, height: 5.5 }
      },
      {
        clientKey: 'q5',
        type: 'input',
        inputMode: 'integer',
        answer: '9',
        acceptedAnswers: ['9'],
        problemLabel: '(5)',
        responseLabel: '분모의 수',
        hints: ['9백을 9로 나눠야 백이 됩니다.', '9를 입력하세요.'],
        sourceText: '9백/[ ] = 1백',
        confidence: 0.99,
        position: { top: 23.5, left: 57.5, width: 4.5, height: 5.5 }
      },
      {
        clientKey: 'q6',
        type: 'input',
        inputMode: 'integer',
        answer: '5',
        acceptedAnswers: ['5'],
        problemLabel: '(6)',
        responseLabel: '분모의 수',
        hints: ['5만을 5로 나눠야 만이 됩니다.', '5를 입력하세요.'],
        sourceText: '5만/[ ] = 만',
        confidence: 0.99,
        position: { top: 43.5, left: 62.5, width: 4.5, height: 5.5 }
      },
      {
        clientKey: 'q7',
        type: 'input',
        inputMode: 'integer',
        answer: '101',
        acceptedAnswers: ['101'],
        problemLabel: '(7)',
        responseLabel: '분모의 수',
        hints: ['101a를 101로 나눠야 a가 됩니다.', '101을 입력하세요.'],
        sourceText: '101a/[ ] = a',
        confidence: 0.99,
        position: { top: 62.5, left: 62.5, width: 4.5, height: 5.5 }
      },
      {
        clientKey: 'q8',
        type: 'input',
        inputMode: 'integer',
        answer: '11',
        acceptedAnswers: ['11'],
        problemLabel: '(8)',
        responseLabel: '분모의 수',
        hints: ['11n을 11로 나눠야 n이 됩니다.', '11을 입력하세요.'],
        sourceText: '11n/[ ] = n',
        confidence: 0.99,
        position: { top: 82.5, left: 62.5, width: 4.5, height: 5.5 }
      }
    ]
  },

  // Page 12: Slide 105
  {
    pageId: 'page_1786933942899_12',
    summary: '연습문제 9 - 분수 형태의 길이 표현 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '$\\frac{2b}{2}$',
        options: ['$\\frac{2b}{2}$', '$\\frac{2b}{3}$', '$\\frac{b}{2}$', '$\\frac{2}{2b}$'],
        problemLabel: '(2)',
        responseLabel: '분수 표현',
        hints: ['2b를 2등분한 분수를 찾으세요.', '$\\frac{2b}{2}$를 선택하세요.'],
        sourceText: '2b 2등분',
        confidence: 0.99,
        position: { top: 80.5, left: 20.0, width: 5.5, height: 9.0 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '$\\frac{4a}{3}$',
        options: ['$\\frac{4a}{3}$', '$\\frac{4a}{2}$', '$\\frac{3a}{4}$', '$\\frac{4a}{4}$'],
        problemLabel: '(3)',
        responseLabel: '분수 표현',
        hints: ['4a를 3등분한 분수를 찾으세요.', '$\\frac{4a}{3}$를 선택하세요.'],
        sourceText: '4a 3등분',
        confidence: 0.99,
        position: { top: 60.5, left: 59.0, width: 5.5, height: 9.0 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '$\\frac{4뼘}{3}$',
        options: ['$\\frac{4뼘}{3}$', '$\\frac{4뼘}{4}$', '$\\frac{3뼘}{4}$', '$\\frac{4뼘}{2}$'],
        problemLabel: '(4)',
        responseLabel: '분수 표현',
        hints: ['4뼘을 3등분한 분수를 찾으세요.', '$\\frac{4뼘}{3}$을 선택하세요.'],
        sourceText: '4뼘 3등분',
        confidence: 0.99,
        position: { top: 80.5, left: 56.5, width: 5.5, height: 9.0 }
      }
    ]
  },

  // Page 13: Slide 106
  {
    pageId: 'page_1786933942899_13',
    summary: '연습문제 10 - 분수 형태의 길이 표현 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '$\\frac{3백}{2}$',
        options: ['$\\frac{3백}{2}$', '$\\frac{3백}{3}$', '$\\frac{2백}{3}$', '$\\frac{3백}{1}$'],
        problemLabel: '(2)',
        responseLabel: '분수 표현',
        hints: ['3백을 2등분한 분수를 찾으세요.', '$\\frac{3백}{2}$을 선택하세요.'],
        sourceText: '3백 2등분',
        confidence: 0.99,
        position: { top: 41.5, left: 17.5, width: 6.0, height: 8.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '$\\frac{100k}{5}$',
        options: ['$\\frac{100k}{5}$', '$\\frac{100k}{3}$', '$\\frac{5k}{100}$', '$\\frac{100k}{4}$'],
        problemLabel: '(3)',
        responseLabel: '분수 표현',
        hints: ['100k를 5등분한 분수를 찾으세요.', '$\\frac{100k}{5}$를 선택하세요.'],
        sourceText: '100k 5등분',
        confidence: 0.99,
        position: { top: 61.5, left: 18.5, width: 6.0, height: 8.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '$\\frac{3m}{2}$',
        options: ['$\\frac{3m}{2}$', '$\\frac{3m}{3}$', '$\\frac{2m}{3}$', '$\\frac{3m}{4}$'],
        problemLabel: '(4)',
        responseLabel: '분수 표현',
        hints: ['3m을 2등분한 분수를 찾으세요.', '$\\frac{3m}{2}$을 선택하세요.'],
        sourceText: '3m 2등분',
        confidence: 0.99,
        position: { top: 82.5, left: 20.5, width: 5.5, height: 8.5 }
      },
      {
        clientKey: 'q5',
        type: 'multiple-choice',
        answer: '$\\frac{2c}{2}$',
        options: ['$\\frac{2c}{2}$', '$\\frac{2c}{3}$', '$\\frac{c}{2}$', '$\\frac{2c}{1}$'],
        problemLabel: '(5)',
        responseLabel: '분수 표현',
        hints: ['2c를 2등분한 분수를 찾으세요.', '$\\frac{2c}{2}$를 선택하세요.'],
        sourceText: '2c 2등분',
        confidence: 0.99,
        position: { top: 22.5, left: 57.5, width: 5.5, height: 8.5 }
      },
      {
        clientKey: 'q6',
        type: 'multiple-choice',
        answer: '$\\frac{41n}{2}$',
        options: ['$\\frac{41n}{2}$', '$\\frac{41n}{3}$', '$\\frac{2n}{41}$', '$\\frac{41n}{1}$'],
        problemLabel: '(6)',
        responseLabel: '분수 표현',
        hints: ['41n을 2등분한 분수를 찾으세요.', '$\\frac{41n}{2}$을 선택하세요.'],
        sourceText: '41n 2등분',
        confidence: 0.99,
        position: { top: 42.5, left: 59.0, width: 5.5, height: 8.5 }
      },
      {
        clientKey: 'q7',
        type: 'multiple-choice',
        answer: '$\\frac{999i}{2}$',
        options: ['$\\frac{999i}{2}$', '$\\frac{999i}{3}$', '$\\frac{2i}{999}$', '$\\frac{999i}{1}$'],
        problemLabel: '(7)',
        responseLabel: '분수 표현',
        hints: ['999i를 2등분한 분수를 찾으세요.', '$\\frac{999i}{2}$를 선택하세요.'],
        sourceText: '999i 2등분',
        confidence: 0.99,
        position: { top: 62.5, left: 57.5, width: 6.0, height: 8.5 }
      },
      {
        clientKey: 'q8',
        type: 'multiple-choice',
        answer: '$\\frac{3만}{2}$',
        options: ['$\\frac{3만}{2}$', '$\\frac{3만}{3}$', '$\\frac{2만}{3}$', '$\\frac{3만}{1}$'],
        problemLabel: '(8)',
        responseLabel: '분수 표현',
        hints: ['3만을 2등분한 분수를 찾으세요.', '$\\frac{3만}{2}$을 선택하세요.'],
        sourceText: '3만 2등분',
        confidence: 0.99,
        position: { top: 82.5, left: 55.5, width: 5.5, height: 8.5 }
      }
    ]
  },

  // Page 14: Slide 107
  {
    pageId: 'page_1786933942899_14',
    summary: '연습문제 11 - 분수 형태의 길이 표현 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '$\\frac{7백}{4}$',
        options: ['$\\frac{7백}{4}$', '$\\frac{7백}{3}$', '$\\frac{4백}{7}$', '$\\frac{7백}{2}$'],
        problemLabel: '(2)',
        responseLabel: '분수 표현',
        hints: ['7백을 4등분한 분수를 찾으세요.', '$\\frac{7백}{4}$을 선택하세요.'],
        sourceText: '7백 4등분',
        confidence: 0.99,
        position: { top: 38.5, left: 18.5, width: 5.5, height: 7.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '$\\frac{1000}{4}$',
        options: ['$\\frac{1000}{4}$', '$\\frac{1000}{3}$', '$\\frac{4}{1000}$', '$\\frac{1000}{2}$'],
        problemLabel: '(3)',
        responseLabel: '분수 표현',
        hints: ['1000을 4등분한 분수를 찾으세요.', '$\\frac{1000}{4}$을 선택하세요.'],
        sourceText: '1000 4등분',
        confidence: 0.99,
        position: { top: 56.5, left: 18.5, width: 5.5, height: 7.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '$\\frac{6km}{3}$',
        options: ['$\\frac{6km}{3}$', '$\\frac{6km}{4}$', '$\\frac{3km}{6}$', '$\\frac{6km}{2}$'],
        problemLabel: '(4)',
        responseLabel: '분수 표현',
        hints: ['6km를 3등분한 분수를 찾으세요.', '$\\frac{6km}{3}$을 선택하세요.'],
        sourceText: '6km 3등분',
        confidence: 0.99,
        position: { top: 76.5, left: 20.5, width: 5.5, height: 7.5 }
      },
      {
        clientKey: 'q5',
        type: 'multiple-choice',
        answer: '$\\frac{22a}{2}$',
        options: ['$\\frac{22a}{2}$', '$\\frac{22a}{3}$', '$\\frac{2a}{22}$', '$\\frac{22a}{4}$'],
        problemLabel: '(5)',
        responseLabel: '분수 표현',
        hints: ['22a를 2등분한 분수를 찾으세요.', '$\\frac{22a}{2}$를 선택하세요.'],
        sourceText: '22a 2등분',
        confidence: 0.99,
        position: { top: 18.5, left: 57.5, width: 5.5, height: 7.5 }
      },
      {
        clientKey: 'q6',
        type: 'multiple-choice',
        answer: '$\\frac{98n}{2}$',
        options: ['$\\frac{98n}{2}$', '$\\frac{98n}{3}$', '$\\frac{2n}{98}$', '$\\frac{98n}{4}$'],
        problemLabel: '(6)',
        responseLabel: '분수 표현',
        hints: ['98n을 2등분한 분수를 찾으세요.', '$\\frac{98n}{2}$을 선택하세요.'],
        sourceText: '98n 2등분',
        confidence: 0.99,
        position: { top: 38.5, left: 59.0, width: 5.5, height: 7.5 }
      },
      {
        clientKey: 'q7',
        type: 'multiple-choice',
        answer: '$\\frac{33k}{2}$',
        options: ['$\\frac{33k}{2}$', '$\\frac{33k}{3}$', '$\\frac{2k}{33}$', '$\\frac{33k}{4}$'],
        problemLabel: '(7)',
        responseLabel: '분수 표현',
        hints: ['33k를 2등분한 분수를 찾으세요.', '$\\frac{33k}{2}$를 선택하세요.'],
        sourceText: '33k 2등분',
        confidence: 0.99,
        position: { top: 56.5, left: 58.0, width: 5.5, height: 7.5 }
      },
      {
        clientKey: 'q8',
        type: 'multiple-choice',
        answer: '$\\frac{3억}{2}$',
        options: ['$\\frac{3억}{2}$', '$\\frac{3억}{3}$', '$\\frac{2억}{3}$', '$\\frac{3억}{4}$'],
        problemLabel: '(8)',
        responseLabel: '분수 표현',
        hints: ['3억을 2등분한 분수를 찾으세요.', '$\\frac{3억}{2}$을 선택하세요.'],
        sourceText: '3억 2등분',
        confidence: 0.99,
        position: { top: 76.5, left: 55.0, width: 5.5, height: 7.5 }
      }
    ]
  },

  // Page 15: Slide 108
  {
    pageId: 'page_1786933942899_15',
    summary: '연습문제 12 - a에 해당하는 상대적 길이 구하기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '$\\frac{3b}{2}$',
        options: ['$\\frac{3b}{2}$', '$\\frac{2b}{3}$', '$\\frac{3b}{3}$', '$\\frac{b}{2}$'],
        problemLabel: '(2)',
        responseLabel: '상대적 길이 a',
        hints: ['2a=3b에서 a = 3b/2입니다.', '$\\frac{3b}{2}$를 선택하세요.'],
        sourceText: '2a=3b',
        confidence: 0.99,
        position: { top: 78.5, left: 26.5, width: 4.5, height: 6.0 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '$\\frac{9}{3}$',
        options: ['$\\frac{9}{3}$', '$\\frac{3}{9}$', '3', '$\\frac{9}{2}$'],
        problemLabel: '(3)',
        responseLabel: '상대적 길이 a',
        hints: ['3a=9에서 a = 9/3입니다.', '$\\frac{9}{3}$을 선택하세요.'],
        sourceText: '3a=9',
        confidence: 0.99,
        position: { top: 57.5, left: 62.5, width: 4.5, height: 6.0 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '$\\frac{3b}{4}$',
        options: ['$\\frac{3b}{4}$', '$\\frac{4b}{3}$', '$\\frac{3b}{2}$', '$\\frac{b}{4}$'],
        problemLabel: '(4)',
        responseLabel: '상대적 길이 a',
        hints: ['4a=3b에서 a = 3b/4입니다.', '$\\frac{3b}{4}$를 선택하세요.'],
        sourceText: '4a=3b',
        confidence: 0.99,
        position: { top: 78.5, left: 61.5, width: 4.5, height: 6.0 }
      }
    ]
  },

  // Page 16: Slide 109
  {
    pageId: 'page_1786933942899_16',
    summary: '연습문제 13 - a에 해당하는 상대적 길이 구하기 (4지선다형)',
    elements: [
      {
        clientKey: 'q1',
        type: 'multiple-choice',
        answer: '$\\frac{3십}{2}$',
        options: ['$\\frac{3십}{2}$', '$\\frac{2십}{3}$', '$\\frac{3십}{3}$', '$\\frac{십}{2}$'],
        problemLabel: '(1)',
        responseLabel: '상대적 길이 a',
        hints: ['2a=3십에서 a = 3십/2입니다.', '$\\frac{3십}{2}$을 선택하세요.'],
        sourceText: '2a=3십',
        confidence: 0.99,
        position: { top: 21.0, left: 26.5, width: 4.5, height: 6.0 }
      },
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '$\\frac{2b}{3}$',
        options: ['$\\frac{2b}{3}$', '$\\frac{3b}{2}$', '$\\frac{2b}{2}$', '$\\frac{b}{3}$'],
        problemLabel: '(2)',
        responseLabel: '상대적 길이 a',
        hints: ['3a=2b에서 a = 2b/3입니다.', '$\\frac{2b}{3}$를 선택하세요.'],
        sourceText: '3a=2b',
        confidence: 0.99,
        position: { top: 41.0, left: 24.5, width: 4.5, height: 6.0 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '$\\frac{7n}{2}$',
        options: ['$\\frac{7n}{2}$', '$\\frac{2n}{7}$', '$\\frac{7n}{7}$', '$\\frac{n}{2}$'],
        problemLabel: '(3)',
        responseLabel: '상대적 길이 a',
        hints: ['2a=7n에서 a = 7n/2입니다.', '$\\frac{7n}{2}$을 선택하세요.'],
        sourceText: '2a=7n',
        confidence: 0.99,
        position: { top: 61.0, left: 26.5, width: 4.5, height: 6.0 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '$\\frac{3x}{2}$',
        options: ['$\\frac{3x}{2}$', '$\\frac{2x}{3}$', '$\\frac{3x}{3}$', '$\\frac{x}{2}$'],
        problemLabel: '(4)',
        responseLabel: '상대적 길이 a',
        hints: ['2a=3x에서 a = 3x/2입니다.', '$\\frac{3x}{2}$를 선택하세요.'],
        sourceText: '2a=3x',
        confidence: 0.99,
        position: { top: 81.0, left: 26.5, width: 4.5, height: 6.0 }
      },
      {
        clientKey: 'q6',
        type: 'multiple-choice',
        answer: '$\\frac{3k}{5}$',
        options: ['$\\frac{3k}{5}$', '$\\frac{5k}{3}$', '$\\frac{3k}{3}$', '$\\frac{k}{5}$'],
        problemLabel: '(6)',
        responseLabel: '상대적 길이 a',
        hints: ['5a=3k에서 a = 3k/5입니다.', '$\\frac{3k}{5}$를 선택하세요.'],
        sourceText: '5a=3k',
        confidence: 0.99,
        position: { top: 41.0, left: 61.0, width: 4.5, height: 6.0 }
      },
      {
        clientKey: 'q7',
        type: 'multiple-choice',
        answer: '$\\frac{5억}{4}$',
        options: ['$\\frac{5억}{4}$', '$\\frac{4억}{5}$', '$\\frac{5억}{5}$', '$\\frac{억}{4}$'],
        problemLabel: '(7)',
        responseLabel: '상대적 길이 a',
        hints: ['4a=5억에서 a = 5억/4입니다.', '$\\frac{5억}{4}$를 선택하세요.'],
        sourceText: '4a=5억',
        confidence: 0.99,
        position: { top: 61.0, left: 61.5, width: 4.5, height: 6.0 }
      },
      {
        clientKey: 'q8',
        type: 'multiple-choice',
        answer: '$\\frac{5만}{3}$',
        options: ['$\\frac{5만}{3}$', '$\\frac{3만}{5}$', '$\\frac{5만}{5}$', '$\\frac{만}{3}$'],
        problemLabel: '(8)',
        responseLabel: '상대적 길이 a',
        hints: ['3a=5만에서 a = 5만/3입니다.', '$\\frac{5만}{3}$을 선택하세요.'],
        sourceText: '3a=5만',
        confidence: 0.99,
        position: { top: 81.0, left: 62.5, width: 4.5, height: 6.0 }
      }
    ]
  },

  // Page 17: Slide 110
  {
    pageId: 'page_1786933942899_17',
    summary: '연습문제 14 - a에 해당하는 상대적 길이 구하기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '$\\frac{c}{2}$',
        options: ['$\\frac{c}{2}$', '$\\frac{2}{c}$', '$2c$', '$\\frac{c}{4}$'],
        problemLabel: '(2)',
        responseLabel: '상대적 길이 a',
        hints: ['2a=c에서 a = c/2입니다.', '$\\frac{c}{2}$를 선택하세요.'],
        sourceText: '2a=c',
        confidence: 0.99,
        position: { top: 33.5, left: 40.0, width: 5.5, height: 6.0 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '$\\frac{3b}{5}$',
        options: ['$\\frac{3b}{5}$', '$\\frac{5b}{3}$', '$\\frac{3b}{3}$', '$\\frac{b}{5}$'],
        problemLabel: '(3)',
        responseLabel: '상대적 길이 a',
        hints: ['5a=3b에서 a = 3b/5입니다.', '$\\frac{3b}{5}$를 선택하세요.'],
        sourceText: '5a=3b',
        confidence: 0.99,
        position: { top: 53.5, left: 40.0, width: 5.5, height: 6.0 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '$\\frac{7e}{3}$',
        options: ['$\\frac{7e}{3}$', '$\\frac{3e}{7}$', '$\\frac{7e}{7}$', '$\\frac{e}{3}$'],
        problemLabel: '(4)',
        responseLabel: '상대적 길이 a',
        hints: ['3a=7e에서 a = 7e/3입니다.', '$\\frac{7e}{3}$를 선택하세요.'],
        sourceText: '3a=7e',
        confidence: 0.99,
        position: { top: 73.5, left: 40.0, width: 5.5, height: 6.0 }
      },
      {
        clientKey: 'q5',
        type: 'multiple-choice',
        answer: '$\\frac{2d}{3}$',
        options: ['$\\frac{2d}{3}$', '$\\frac{3d}{2}$', '$\\frac{2d}{2}$', '$\\frac{d}{3}$'],
        problemLabel: '(5)',
        responseLabel: '상대적 길이 a',
        hints: ['3a=2d에서 a = 2d/3입니다.', '$\\frac{2d}{3}$를 선택하세요.'],
        sourceText: '3a=2d',
        confidence: 0.99,
        position: { top: 13.5, left: 77.5, width: 5.5, height: 6.0 }
      },
      {
        clientKey: 'q6',
        type: 'multiple-choice',
        answer: '$\\frac{5f}{4}$',
        options: ['$\\frac{5f}{4}$', '$\\frac{4f}{5}$', '$\\frac{5f}{5}$', '$\\frac{f}{4}$'],
        problemLabel: '(6)',
        responseLabel: '상대적 길이 a',
        hints: ['4a=5f에서 a = 5f/4입니다.', '$\\frac{5f}{4}$를 선택하세요.'],
        sourceText: '4a=5f',
        confidence: 0.99,
        position: { top: 33.5, left: 77.5, width: 5.5, height: 6.0 }
      },
      {
        clientKey: 'q7',
        type: 'multiple-choice',
        answer: '$\\frac{10y}{2}$',
        options: ['$\\frac{10y}{2}$', '$\\frac{2y}{10}$', '$5y$', '$\\frac{10y}{10}$'],
        problemLabel: '(7)',
        responseLabel: '상대적 길이 a',
        hints: ['2a=10y에서 a = 10y/2입니다.', '$\\frac{10y}{2}$를 선택하세요.'],
        sourceText: '2a=10y',
        confidence: 0.99,
        position: { top: 53.5, left: 77.5, width: 5.5, height: 6.0 }
      },
      {
        clientKey: 'q8',
        type: 'multiple-choice',
        answer: '$\\frac{33h}{5}$',
        options: ['$\\frac{33h}{5}$', '$\\frac{5h}{33}$', '$\\frac{33h}{33}$', '$\\frac{h}{5}$'],
        problemLabel: '(8)',
        responseLabel: '상대적 길이 a',
        hints: ['5a=33h에서 a = 33h/5입니다.', '$\\frac{33h}{5}$를 선택하세요.'],
        sourceText: '5a=33h',
        confidence: 0.99,
        position: { top: 73.5, left: 77.5, width: 5.5, height: 6.0 }
      }
    ]
  },

  // Page 18: Slide 111
  {
    pageId: 'page_1786933942899_18',
    summary: '연습문제 15 - a에 해당하는 상대적 크기 구하기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '$\\frac{33c}{2}$',
        options: ['$\\frac{33c}{2}$', '$\\frac{2c}{33}$', '$\\frac{33c}{33}$', '$\\frac{c}{2}$'],
        problemLabel: '(2)',
        responseLabel: '상대적 크기 a',
        hints: ['2a=33c에서 a = 33c/2입니다.', '$\\frac{33c}{2}$를 선택하세요.'],
        sourceText: '2a=33c',
        confidence: 0.99,
        position: { top: 38.0, left: 39.5, width: 6.0, height: 6.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '$\\frac{3b}{3}$',
        options: ['$\\frac{3b}{3}$', '$\\frac{b}{3}$', '$3b$', '$b$'],
        problemLabel: '(3)',
        responseLabel: '상대적 크기 a',
        hints: ['3a=3b에서 a = 3b/3입니다.', '$\\frac{3b}{3}$을 선택하세요.'],
        sourceText: '3a=3b',
        confidence: 0.99,
        position: { top: 58.0, left: 39.5, width: 6.0, height: 6.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '$\\frac{100e}{3}$',
        options: ['$\\frac{100e}{3}$', '$\\frac{3e}{100}$', '$\\frac{100e}{100}$', '$\\frac{e}{3}$'],
        problemLabel: '(4)',
        responseLabel: '상대적 크기 a',
        hints: ['3a=100e에서 a = 100e/3입니다.', '$\\frac{100e}{3}$를 선택하세요.'],
        sourceText: '3a=100e',
        confidence: 0.99,
        position: { top: 78.0, left: 39.5, width: 6.0, height: 6.5 }
      },
      {
        clientKey: 'q5',
        type: 'multiple-choice',
        answer: '$\\frac{2d}{11}$',
        options: ['$\\frac{2d}{11}$', '$\\frac{11d}{2}$', '$\\frac{2d}{2}$', '$\\frac{d}{11}$'],
        problemLabel: '(5)',
        responseLabel: '상대적 크기 a',
        hints: ['11a=2d에서 a = 2d/11입니다.', '$\\frac{2d}{11}$를 선택하세요.'],
        sourceText: '11a=2d',
        confidence: 0.99,
        position: { top: 18.0, left: 77.0, width: 6.0, height: 6.5 }
      },
      {
        clientKey: 'q6',
        type: 'multiple-choice',
        answer: '$\\frac{5f}{4}$',
        options: ['$\\frac{5f}{4}$', '$\\frac{4f}{5}$', '$\\frac{5f}{5}$', '$\\frac{f}{4}$'],
        problemLabel: '(6)',
        responseLabel: '상대적 크기 a',
        hints: ['4a=5f에서 a = 5f/4입니다.', '$\\frac{5f}{4}$를 선택하세요.'],
        sourceText: '4a=5f',
        confidence: 0.99,
        position: { top: 38.0, left: 77.0, width: 6.0, height: 6.5 }
      },
      {
        clientKey: 'q7',
        type: 'multiple-choice',
        answer: '$\\frac{7y}{6}$',
        options: ['$\\frac{7y}{6}$', '$\\frac{6y}{7}$', '$\\frac{7y}{7}$', '$\\frac{y}{6}$'],
        problemLabel: '(7)',
        responseLabel: '상대적 크기 a',
        hints: ['6a=7y에서 a = 7y/6입니다.', '$\\frac{7y}{6}$을 선택하세요.'],
        sourceText: '6a=7y',
        confidence: 0.99,
        position: { top: 58.0, left: 77.0, width: 6.0, height: 6.5 }
      },
      {
        clientKey: 'q8',
        type: 'multiple-choice',
        answer: '$\\frac{77h}{5}$',
        options: ['$\\frac{77h}{5}$', '$\\frac{5h}{77}$', '$\\frac{77h}{77}$', '$\\frac{h}{5}$'],
        problemLabel: '(8)',
        responseLabel: '상대적 크기 a',
        hints: ['5a=77h에서 a = 77h/5입니다.', '$\\frac{77h}{5}$를 선택하세요.'],
        sourceText: '5a=77h',
        confidence: 0.99,
        position: { top: 78.0, left: 77.0, width: 6.0, height: 6.5 }
      }
    ]
  },

  // Page 19: Slide 112
  {
    pageId: 'page_1786933942899_19',
    summary: '연습문제 16 - 무엇의 몇 배가 나타내는 값 정리하기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '$\\frac{9}{2}$',
        options: ['$\\frac{9}{2}$', '$\\frac{2}{9}$', '9', '4.5'],
        problemLabel: '(2)',
        responseLabel: '계산 결과',
        hints: ['9의 1/2배는 9/2입니다.', '$\\frac{9}{2}$를 선택하세요.'],
        sourceText: '9의 1/2배',
        confidence: 0.99,
        position: { top: 74.5, left: 32.0, width: 16.0, height: 4.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '$\\frac{8}{3}$',
        options: ['$\\frac{8}{3}$', '$\\frac{3}{8}$', '8', '3'],
        problemLabel: '(3)',
        responseLabel: '계산 결과',
        hints: ['8의 1/3배는 8/3입니다.', '$\\frac{8}{3}$을 선택하세요.'],
        sourceText: '8의 1/3배',
        confidence: 0.99,
        position: { top: 51.5, left: 69.0, width: 16.0, height: 4.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '4',
        options: ['4', '$\\frac{20}{5}$', '$\\frac{10}{5}$', '5'],
        problemLabel: '(4)',
        responseLabel: '계산 결과',
        hints: ['10의 2/5배는 (2/5)×10 = 4입니다.', '4를 선택하세요.'],
        sourceText: '10의 2/5배',
        confidence: 0.99,
        position: { top: 74.5, left: 69.0, width: 16.0, height: 4.5 }
      }
    ]
  },

  // Page 20: Slide 113
  {
    pageId: 'page_1786933942899_20',
    summary: '연습문제 17 - 문자의 몇 배가 나타내는 값 정리하기 (4지선다형)',
    elements: [
      {
        clientKey: 'q1',
        type: 'multiple-choice',
        answer: '$\\frac{a}{2}$',
        options: ['$\\frac{a}{2}$', '$\\frac{2}{a}$', '$2a$', '$\\frac{a}{4}$'],
        problemLabel: '(1)',
        responseLabel: '계산 결과',
        hints: ['a의 1/2배는 a/2입니다.', '$\\frac{a}{2}$를 선택하세요.'],
        sourceText: 'a의 1/2배',
        confidence: 0.99,
        position: { top: 18.0, left: 32.5, width: 16.0, height: 4.0 }
      },
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '$\\frac{6a}{4}$',
        options: ['$\\frac{6a}{4}$', '$\\frac{2a}{4}$', '$\\frac{3a}{4}$', '$\\frac{6a}{2}$'],
        problemLabel: '(2)',
        responseLabel: '계산 결과',
        hints: ['2a의 3/4배는 6a/4입니다.', '$\\frac{6a}{4}$를 선택하세요.'],
        sourceText: '2a의 3/4배',
        confidence: 0.99,
        position: { top: 38.0, left: 32.5, width: 16.0, height: 4.0 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '$\\frac{10y}{3}$',
        options: ['$\\frac{10y}{3}$', '$\\frac{5y}{3}$', '$\\frac{2y}{3}$', '$\\frac{10y}{5}$'],
        problemLabel: '(3)',
        responseLabel: '계산 결과',
        hints: ['5y의 2/3배는 10y/3입니다.', '$\\frac{10y}{3}$을 선택하세요.'],
        sourceText: '5y의 2/3배',
        confidence: 0.99,
        position: { top: 58.0, left: 32.5, width: 16.0, height: 4.0 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '$\\frac{2십}{2}$',
        options: ['$\\frac{2십}{2}$', '$\\frac{십}{2}$', '$\\frac{2십}{4}$', '십'],
        problemLabel: '(4)',
        responseLabel: '계산 결과',
        hints: ['2십의 1/2배는 2십/2입니다.', '$\\frac{2십}{2}$을 선택하세요.'],
        sourceText: '2십의 1/2배',
        confidence: 0.99,
        position: { top: 78.0, left: 32.5, width: 16.0, height: 4.0 }
      },
      {
        clientKey: 'q6',
        type: 'multiple-choice',
        answer: '$\\frac{12b}{5}$',
        options: ['$\\frac{12b}{5}$', '$\\frac{3b}{5}$', '$\\frac{4b}{5}$', '$\\frac{12b}{3}$'],
        problemLabel: '(6)',
        responseLabel: '계산 결과',
        hints: ['3b의 4/5배는 12b/5입니다.', '$\\frac{12b}{5}$를 선택하세요.'],
        sourceText: '3b의 4/5배',
        confidence: 0.99,
        position: { top: 38.0, left: 69.5, width: 16.0, height: 4.0 }
      },
      {
        clientKey: 'q7',
        type: 'multiple-choice',
        answer: '$\\frac{b}{4}$',
        options: ['$\\frac{b}{4}$', '$\\frac{4}{b}$', '$4b$', '$\\frac{b}{2}$'],
        problemLabel: '(7)',
        responseLabel: '계산 결과',
        hints: ['b의 1/4배는 b/4입니다.', '$\\frac{b}{4}$를 선택하세요.'],
        sourceText: 'b의 1/4배',
        confidence: 0.99,
        position: { top: 58.0, left: 69.5, width: 16.0, height: 4.0 }
      },
      {
        clientKey: 'q8',
        type: 'multiple-choice',
        answer: '$\\frac{3십}{5}$',
        options: ['$\\frac{3십}{5}$', '$\\frac{5십}{3}$', '$\\frac{십}{5}$', '$\\frac{3십}{3}$'],
        problemLabel: '(8)',
        responseLabel: '계산 결과',
        hints: ['십의 3/5배는 3십/5입니다.', '$\\frac{3십}{5}$을 선택하세요.'],
        sourceText: '십의 3/5배',
        confidence: 0.99,
        position: { top: 78.0, left: 69.5, width: 16.0, height: 4.0 }
      }
    ]
  },

  // Page 21: Slide 114
  {
    pageId: 'page_1786933942899_21',
    summary: '연습문제 18 - 비와 몇 배 표현 완성하기',
    elements: [
      {
        clientKey: 'q2_l',
        type: 'input',
        inputMode: 'integer',
        answer: '4',
        acceptedAnswers: ['4'],
        problemLabel: '(2) 비교량',
        responseLabel: 'a의 칸수',
        hints: ['a의 칸수를 세어보세요.', '4를 입력하세요.'],
        sourceText: 'a:b = [ ]:[ ]',
        confidence: 0.99,
        position: { top: 77.5, left: 23.5, width: 3.0, height: 4.0 }
      },
      {
        clientKey: 'q2_r',
        type: 'input',
        inputMode: 'integer',
        answer: '2',
        acceptedAnswers: ['2'],
        problemLabel: '(2) 기준량',
        responseLabel: 'b의 칸수',
        hints: ['b의 칸수를 세어보세요.', '2를 입력하세요.'],
        sourceText: 'a:b = [ ]:[ ]',
        confidence: 0.99,
        position: { top: 77.5, left: 28.0, width: 3.0, height: 4.0 }
      },
      {
        clientKey: 'q2_sent',
        type: 'multiple-choice',
        answer: 'a는 b의 \\frac{4}{2}배이다.',
        options: [
          'a는 b의 \\frac{4}{2}배이다.',
          'a는 b의 \\frac{2}{4}배이다.',
          'b는 a의 \\frac{4}{2}배이다.',
          'a는 b의 \\frac{4}{4}배이다.'
        ],
        problemLabel: '(2) 문장 표현',
        responseLabel: '배수 관계 문장',
        hints: ['a는 b의 4/2배입니다.', 'a는 b의 \\frac{4}{2}배이다.를 선택하세요.'],
        sourceText: 'a는 b의 4/2배이다.',
        confidence: 0.99,
        position: { top: 83.5, left: 15.0, width: 23.0, height: 4.5 }
      },
      {
        clientKey: 'q3_l',
        type: 'input',
        inputMode: 'integer',
        answer: '2',
        acceptedAnswers: ['2'],
        problemLabel: '(3) 비교량',
        responseLabel: 'f의 칸수',
        hints: ['f의 칸수를 세어보세요.', '2를 입력하세요.'],
        sourceText: 'f:e = [ ]:[ ]',
        confidence: 0.99,
        position: { top: 57.5, left: 60.5, width: 3.0, height: 4.0 }
      },
      {
        clientKey: 'q3_r',
        type: 'input',
        inputMode: 'integer',
        answer: '4',
        acceptedAnswers: ['4'],
        problemLabel: '(3) 기준량',
        responseLabel: 'e의 칸수',
        hints: ['e의 칸수를 세어보세요.', '4를 입력하세요.'],
        sourceText: 'f:e = [ ]:[ ]',
        confidence: 0.99,
        position: { top: 57.5, left: 65.0, width: 3.0, height: 4.0 }
      },
      {
        clientKey: 'q3_sent',
        type: 'multiple-choice',
        answer: 'f는 e의 \\frac{2}{4}배이다.',
        options: [
          'f는 e의 \\frac{2}{4}배이다.',
          'f는 e의 \\frac{4}{2}배이다.',
          'e는 f의 \\frac{2}{4}배이다.',
          'f는 e의 \\frac{2}{2}배이다.'
        ],
        problemLabel: '(3) 문장 표현',
        responseLabel: '배수 관계 문장',
        hints: ['f는 e의 2/4배입니다.', 'f는 e의 \\frac{2}{4}배이다.를 선택하세요.'],
        sourceText: 'f는 e의 2/4배이다.',
        confidence: 0.99,
        position: { top: 63.5, left: 53.0, width: 23.0, height: 4.5 }
      },
      {
        clientKey: 'q4_l',
        type: 'input',
        inputMode: 'integer',
        answer: '3',
        acceptedAnswers: ['3'],
        problemLabel: '(4) 비교량',
        responseLabel: 'b의 칸수',
        hints: ['b의 칸수를 세어보세요.', '3을 입력하세요.'],
        sourceText: 'b:a = [ ]:[ ]',
        confidence: 0.99,
        position: { top: 77.5, left: 61.5, width: 3.0, height: 4.0 }
      },
      {
        clientKey: 'q4_r',
        type: 'input',
        inputMode: 'integer',
        answer: '2',
        acceptedAnswers: ['2'],
        problemLabel: '(4) 기준량',
        responseLabel: 'a의 칸수',
        hints: ['a의 칸수를 세어보세요.', '2를 입력하세요.'],
        sourceText: 'b:a = [ ]:[ ]',
        confidence: 0.99,
        position: { top: 77.5, left: 66.0, width: 3.0, height: 4.0 }
      },
      {
        clientKey: 'q4_sent',
        type: 'multiple-choice',
        answer: 'b는 a의 \\frac{3}{2}배이다.',
        options: [
          'b는 a의 \\frac{3}{2}배이다.',
          'b는 a의 \\frac{2}{3}배이다.',
          'a는 b의 \\frac{3}{2}배이다.',
          'b는 a의 \\frac{3}{3}배이다.'
        ],
        problemLabel: '(4) 문장 표현',
        responseLabel: '배수 관계 문장',
        hints: ['b는 a의 3/2배입니다.', 'b는 a의 \\frac{3}{2}배이다.를 선택하세요.'],
        sourceText: 'b는 a의 3/2배이다.',
        confidence: 0.99,
        position: { top: 83.5, left: 53.0, width: 23.0, height: 4.5 }
      }
    ]
  },

  // Page 22: Slide 115
  {
    pageId: 'page_1786933942899_22',
    summary: '연습문제 19 - 비와 몇 배 표현 완성하기',
    elements: [
      // (2) a:c = 2:2, a는 c의 2/2배이다
      {
        clientKey: 'q2_l',
        type: 'input',
        inputMode: 'integer',
        answer: '2',
        acceptedAnswers: ['2'],
        problemLabel: '(2) 비교량',
        responseLabel: 'a의 칸수',
        hints: ['2를 입력하세요.'],
        sourceText: 'a:c = [ ]:[ ]',
        confidence: 0.99,
        position: { top: 40.5, left: 23.5, width: 3.0, height: 3.5 }
      },
      {
        clientKey: 'q2_r',
        type: 'input',
        inputMode: 'integer',
        answer: '2',
        acceptedAnswers: ['2'],
        problemLabel: '(2) 기준량',
        responseLabel: 'c의 칸수',
        hints: ['2를 입력하세요.'],
        sourceText: 'a:c = [ ]:[ ]',
        confidence: 0.99,
        position: { top: 40.5, left: 28.0, width: 3.0, height: 3.5 }
      },
      {
        clientKey: 'q2_sent',
        type: 'multiple-choice',
        answer: 'a는 c의 \\frac{2}{2}배이다.',
        options: ['a는 c의 \\frac{2}{2}배이다.', 'a는 c의 2배이다.', 'c는 a의 \\frac{2}{2}배이다.', 'a는 c의 \\frac{1}{2}배이다.'],
        problemLabel: '(2) 문장 표현',
        responseLabel: '배수 관계 문장',
        hints: ['a는 c의 \\frac{2}{2}배이다.를 선택하세요.'],
        sourceText: 'a는 c의 2/2배이다.',
        confidence: 0.99,
        position: { top: 45.0, left: 15.0, width: 23.0, height: 4.5 }
      },
      // (3) y:x = 2:3, y는 x의 2/3배이다
      {
        clientKey: 'q3_l',
        type: 'input',
        inputMode: 'integer',
        answer: '2',
        acceptedAnswers: ['2'],
        problemLabel: '(3) 비교량',
        responseLabel: 'y의 칸수',
        hints: ['2를 입력하세요.'],
        sourceText: 'y:x = [ ]:[ ]',
        confidence: 0.99,
        position: { top: 60.5, left: 23.5, width: 3.0, height: 3.5 }
      },
      {
        clientKey: 'q3_r',
        type: 'input',
        inputMode: 'integer',
        answer: '3',
        acceptedAnswers: ['3'],
        problemLabel: '(3) 기준량',
        responseLabel: 'x의 칸수',
        hints: ['3을 입력하세요.'],
        sourceText: 'y:x = [ ]:[ ]',
        confidence: 0.99,
        position: { top: 60.5, left: 28.0, width: 3.0, height: 3.5 }
      },
      {
        clientKey: 'q3_sent',
        type: 'multiple-choice',
        answer: 'y는 x의 \\frac{2}{3}배이다.',
        options: ['y는 x의 \\frac{2}{3}배이다.', 'y는 x의 \\frac{3}{2}배이다.', 'x는 y의 \\frac{2}{3}배이다.', 'y는 x의 2배이다.'],
        problemLabel: '(3) 문장 표현',
        responseLabel: '배수 관계 문장',
        hints: ['y는 x의 \\frac{2}{3}배이다.를 선택하세요.'],
        sourceText: 'y는 x의 2/3배이다.',
        confidence: 0.99,
        position: { top: 65.0, left: 15.0, width: 23.0, height: 4.5 }
      },
      // (4) a:b = 9:1, a는 b의 9/1배이다
      {
        clientKey: 'q4_l',
        type: 'input',
        inputMode: 'integer',
        answer: '9',
        acceptedAnswers: ['9'],
        problemLabel: '(4) 비교량',
        responseLabel: 'a의 칸수',
        hints: ['9를 입력하세요.'],
        sourceText: 'a:b = [ ]:[ ]',
        confidence: 0.99,
        position: { top: 80.5, left: 23.5, width: 3.0, height: 3.5 }
      },
      {
        clientKey: 'q4_r',
        type: 'input',
        inputMode: 'integer',
        answer: '1',
        acceptedAnswers: ['1'],
        problemLabel: '(4) 기준량',
        responseLabel: 'b의 칸수',
        hints: ['1을 입력하세요.'],
        sourceText: 'a:b = [ ]:[ ]',
        confidence: 0.99,
        position: { top: 80.5, left: 28.0, width: 3.0, height: 3.5 }
      },
      {
        clientKey: 'q4_sent',
        type: 'multiple-choice',
        answer: 'a는 b의 \\frac{9}{1}배이다.',
        options: ['a는 b의 \\frac{9}{1}배이다.', 'a는 b의 \\frac{1}{9}배이다.', 'b는 a의 \\frac{9}{1}배이다.', 'a는 b의 1배이다.'],
        problemLabel: '(4) 문장 표현',
        responseLabel: '배수 관계 문장',
        hints: ['a는 b의 \\frac{9}{1}배이다.를 선택하세요.'],
        sourceText: 'a는 b의 9/1배이다.',
        confidence: 0.99,
        position: { top: 85.0, left: 15.0, width: 23.0, height: 4.5 }
      },
      // (5) k:j = 3:2, k는 j의 3/2배이다
      {
        clientKey: 'q5_l',
        type: 'input',
        inputMode: 'integer',
        answer: '3',
        acceptedAnswers: ['3'],
        problemLabel: '(5) 비교량',
        responseLabel: 'k의 칸수',
        hints: ['3을 입력하세요.'],
        sourceText: 'k:j = [ ]:[ ]',
        confidence: 0.99,
        position: { top: 20.5, left: 61.5, width: 3.0, height: 3.5 }
      },
      {
        clientKey: 'q5_r',
        type: 'input',
        inputMode: 'integer',
        answer: '2',
        acceptedAnswers: ['2'],
        problemLabel: '(5) 기준량',
        responseLabel: 'j의 칸수',
        hints: ['2를 입력하세요.'],
        sourceText: 'k:j = [ ]:[ ]',
        confidence: 0.99,
        position: { top: 20.5, left: 65.5, width: 3.0, height: 3.5 }
      },
      {
        clientKey: 'q5_sent',
        type: 'multiple-choice',
        answer: 'k는 j의 \\frac{3}{2}배이다.',
        options: ['k는 j의 \\frac{3}{2}배이다.', 'k는 j의 \\frac{2}{3}배이다.', 'j는 k의 \\frac{3}{2}배이다.', 'k는 j의 3배이다.'],
        problemLabel: '(5) 문장 표현',
        responseLabel: '배수 관계 문장',
        hints: ['k는 j의 \\frac{3}{2}배이다.를 선택하세요.'],
        sourceText: 'k는 j의 3/2배이다.',
        confidence: 0.99,
        position: { top: 25.0, left: 53.0, width: 23.0, height: 4.5 }
      },
      // (6) m:n = 2:3, m은 n의 2/3배이다
      {
        clientKey: 'q6_l',
        type: 'input',
        inputMode: 'integer',
        answer: '2',
        acceptedAnswers: ['2'],
        problemLabel: '(6) 비교량',
        responseLabel: 'm의 칸수',
        hints: ['2를 입력하세요.'],
        sourceText: 'm:n = [ ]:[ ]',
        confidence: 0.99,
        position: { top: 40.5, left: 61.5, width: 3.0, height: 3.5 }
      },
      {
        clientKey: 'q6_r',
        type: 'input',
        inputMode: 'integer',
        answer: '3',
        acceptedAnswers: ['3'],
        problemLabel: '(6) 기준량',
        responseLabel: 'n의 칸수',
        hints: ['3을 입력하세요.'],
        sourceText: 'm:n = [ ]:[ ]',
        confidence: 0.99,
        position: { top: 40.5, left: 65.5, width: 3.0, height: 3.5 }
      },
      {
        clientKey: 'q6_sent',
        type: 'multiple-choice',
        answer: 'm은 n의 \\frac{2}{3}배이다.',
        options: ['m은 n의 \\frac{2}{3}배이다.', 'm은 n의 \\frac{3}{2}배이다.', 'n은 m의 \\frac{2}{3}배이다.', 'm은 n의 2배이다.'],
        problemLabel: '(6) 문장 표현',
        responseLabel: '배수 관계 문장',
        hints: ['m은 n의 \\frac{2}{3}배이다.를 선택하세요.'],
        sourceText: 'm은 n의 2/3배이다.',
        confidence: 0.99,
        position: { top: 45.0, left: 53.0, width: 23.0, height: 4.5 }
      },
      // (7) f:e = 2:2, f는 e의 2/2배이다
      {
        clientKey: 'q7_l',
        type: 'input',
        inputMode: 'integer',
        answer: '2',
        acceptedAnswers: ['2'],
        problemLabel: '(7) 비교량',
        responseLabel: 'f의 칸수',
        hints: ['2를 입력하세요.'],
        sourceText: 'f:e = [ ]:[ ]',
        confidence: 0.99,
        position: { top: 60.5, left: 61.5, width: 3.0, height: 3.5 }
      },
      {
        clientKey: 'q7_r',
        type: 'input',
        inputMode: 'integer',
        answer: '2',
        acceptedAnswers: ['2'],
        problemLabel: '(7) 기준량',
        responseLabel: 'e의 칸수',
        hints: ['2를 입력하세요.'],
        sourceText: 'f:e = [ ]:[ ]',
        confidence: 0.99,
        position: { top: 60.5, left: 65.5, width: 3.0, height: 3.5 }
      },
      {
        clientKey: 'q7_sent',
        type: 'multiple-choice',
        answer: 'f는 e의 \\frac{2}{2}배이다.',
        options: ['f는 e의 \\frac{2}{2}배이다.', 'f는 e의 2배이다.', 'e는 f의 \\frac{2}{2}배이다.', 'f는 e의 \\frac{1}{2}배이다.'],
        problemLabel: '(7) 문장 표현',
        responseLabel: '배수 관계 문장',
        hints: ['f는 e의 \\frac{2}{2}배이다.를 선택하세요.'],
        sourceText: 'f는 e의 2/2배이다.',
        confidence: 0.99,
        position: { top: 65.0, left: 53.0, width: 23.0, height: 4.5 }
      },
      // (8) q:p = 3:4, q는 p의 3/4배이다
      {
        clientKey: 'q8_l',
        type: 'input',
        inputMode: 'integer',
        answer: '3',
        acceptedAnswers: ['3'],
        problemLabel: '(8) 비교량',
        responseLabel: 'q의 칸수',
        hints: ['3을 입력하세요.'],
        sourceText: 'q:p = [ ]:[ ]',
        confidence: 0.99,
        position: { top: 80.5, left: 61.5, width: 3.0, height: 3.5 }
      },
      {
        clientKey: 'q8_r',
        type: 'input',
        inputMode: 'integer',
        answer: '4',
        acceptedAnswers: ['4'],
        problemLabel: '(8) 기준량',
        responseLabel: 'p의 칸수',
        hints: ['4를 입력하세요.'],
        sourceText: 'q:p = [ ]:[ ]',
        confidence: 0.99,
        position: { top: 80.5, left: 65.5, width: 3.0, height: 3.5 }
      },
      {
        clientKey: 'q8_sent',
        type: 'multiple-choice',
        answer: 'q는 p의 \\frac{3}{4}배이다.',
        options: ['q는 p의 \\frac{3}{4}배이다.', 'q는 p의 \\frac{4}{3}배이다.', 'p는 q의 \\frac{3}{4}배이다.', 'q는 p의 3배이다.'],
        problemLabel: '(8) 문장 표현',
        responseLabel: '배수 관계 문장',
        hints: ['q는 p의 \\frac{3}{4}배이다.를 선택하세요.'],
        sourceText: 'q는 p의 3/4배이다.',
        confidence: 0.99,
        position: { top: 85.0, left: 53.0, width: 23.0, height: 4.5 }
      }
    ]
  },

  // Page 23: Slide 116
  {
    pageId: 'page_1786933942899_23',
    summary: '표현문제 4 - 주어진 식을 배수로 표현하기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: 'a는 c의 \\frac{33}{2}배이다.',
        options: [
          'a는 c의 \\frac{33}{2}배이다.',
          'a는 c의 \\frac{2}{33}배이다.',
          'c는 a의 \\frac{33}{2}배이다.',
          'a는 c의 33배이다.'
        ],
        problemLabel: '(2)',
        responseLabel: '배수 관계 문장',
        hints: ['2a=33c에서 a는 c의 33/2배입니다.', 'a는 c의 \\frac{33}{2}배이다.를 선택하세요.'],
        sourceText: '2a=33c',
        confidence: 0.99,
        position: { top: 46.5, left: 16.5, width: 28.0, height: 4.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: 'a는 b의 \\frac{3}{3}배이다.',
        options: [
          'a는 b의 \\frac{3}{3}배이다.',
          'a는 b의 3배이다.',
          'b는 a의 \\frac{3}{3}배이다.',
          'a는 b의 \\frac{1}{3}배이다.'
        ],
        problemLabel: '(3)',
        responseLabel: '배수 관계 문장',
        hints: ['3a=3b에서 a는 b의 3/3배입니다.', 'a는 b의 \\frac{3}{3}배이다.를 선택하세요.'],
        sourceText: '3a=3b',
        confidence: 0.99,
        position: { top: 66.5, left: 16.5, width: 28.0, height: 4.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: 'a는 e의 \\frac{100}{3}배이다.',
        options: [
          'a는 e의 \\frac{100}{3}배이다.',
          'a는 e의 \\frac{3}{100}배이다.',
          'e는 a의 \\frac{100}{3}배이다.',
          'a는 e의 100배이다.'
        ],
        problemLabel: '(4)',
        responseLabel: '배수 관계 문장',
        hints: ['3a=100e에서 a는 e의 100/3배입니다.', 'a는 e의 \\frac{100}{3}배이다.를 선택하세요.'],
        sourceText: '3a=100e',
        confidence: 0.99,
        position: { top: 86.5, left: 16.5, width: 28.0, height: 4.5 }
      },
      {
        clientKey: 'q5',
        type: 'multiple-choice',
        answer: 'a는 d의 \\frac{2}{11}배이다.',
        options: [
          'a는 d의 \\frac{2}{11}배이다.',
          'a는 d의 \\frac{11}{2}배이다.',
          'd는 a의 \\frac{2}{11}배이다.',
          'a는 d의 2배이다.'
        ],
        problemLabel: '(5)',
        responseLabel: '배수 관계 문장',
        hints: ['11a=2d에서 a는 d의 2/11배입니다.', 'a는 d의 \\frac{2}{11}배이다.를 선택하세요.'],
        sourceText: '11a=2d',
        confidence: 0.99,
        position: { top: 26.5, left: 54.5, width: 28.0, height: 4.5 }
      },
      {
        clientKey: 'q6',
        type: 'multiple-choice',
        answer: 'a는 f의 \\frac{5}{4}배이다.',
        options: [
          'a는 f의 \\frac{5}{4}배이다.',
          'a는 f의 \\frac{4}{5}배이다.',
          'f는 a의 \\frac{5}{4}배이다.',
          'a는 f의 5배이다.'
        ],
        problemLabel: '(6)',
        responseLabel: '배수 관계 문장',
        hints: ['4a=5f에서 a는 f의 5/4배입니다.', 'a는 f의 \\frac{5}{4}배이다.를 선택하세요.'],
        sourceText: '4a=5f',
        confidence: 0.99,
        position: { top: 46.5, left: 54.5, width: 28.0, height: 4.5 }
      },
      {
        clientKey: 'q7',
        type: 'multiple-choice',
        answer: 'a는 y의 \\frac{7}{6}배이다.',
        options: [
          'a는 y의 \\frac{7}{6}배이다.',
          'a는 y의 \\frac{6}{7}배이다.',
          'y는 a의 \\frac{7}{6}배이다.',
          'a는 y의 7배이다.'
        ],
        problemLabel: '(7)',
        responseLabel: '배수 관계 문장',
        hints: ['6a=7y에서 a는 y의 7/6배입니다.', 'a는 y의 \\frac{7}{6}배이다.를 선택하세요.'],
        sourceText: '6a=7y',
        confidence: 0.99,
        position: { top: 66.5, left: 54.5, width: 28.0, height: 4.5 }
      },
      {
        clientKey: 'q8',
        type: 'multiple-choice',
        answer: 'a는 h의 \\frac{77}{5}배이다.',
        options: [
          'a는 h의 \\frac{77}{5}배이다.',
          'a는 h의 \\frac{5}{77}배이다.',
          'h는 a의 \\frac{77}{5}배이다.',
          'a는 h의 77배이다.'
        ],
        problemLabel: '(8)',
        responseLabel: '배수 관계 문장',
        hints: ['5a=77h에서 a는 h의 77/5배입니다.', 'a는 h의 \\frac{77}{5}배이다.를 선택하세요.'],
        sourceText: '5a=77h',
        confidence: 0.99,
        position: { top: 86.5, left: 54.5, width: 28.0, height: 4.5 }
      }
    ]
  },

  // Page 24: Slide 117
  {
    pageId: 'page_1786933942899_24',
    summary: '표현문제 5 - 주어진 비를 배수로 표현하기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: 'a는 c의 \\frac{33}{7}배이다.',
        options: [
          'a는 c의 \\frac{33}{7}배이다.',
          'a는 c의 \\frac{7}{33}배이다.',
          'c는 a의 \\frac{33}{7}배이다.',
          'a는 c의 33배이다.'
        ],
        problemLabel: '(2)',
        responseLabel: '배수 관계 문장',
        hints: ['a:c = 33:7에서 a는 c의 33/7배입니다.', 'a는 c의 \\frac{33}{7}배이다.를 선택하세요.'],
        sourceText: 'a:c = 33:7',
        confidence: 0.99,
        position: { top: 46.5, left: 16.5, width: 28.0, height: 4.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: 'm은 w의 \\frac{7}{8}배이다.',
        options: [
          'm은 w의 \\frac{7}{8}배이다.',
          'm은 w의 \\frac{8}{7}배이다.',
          'w는 m의 \\frac{7}{8}배이다.',
          'm은 w의 7배이다.'
        ],
        problemLabel: '(3)',
        responseLabel: '배수 관계 문장',
        hints: ['m:w = 7:8에서 m은 w의 7/8배입니다.', 'm은 w의 \\frac{7}{8}배이다.를 선택하세요.'],
        sourceText: 'm:w = 7:8',
        confidence: 0.99,
        position: { top: 66.5, left: 16.5, width: 28.0, height: 4.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: 'a는 e의 \\frac{101}{3}배이다.',
        options: [
          'a는 e의 \\frac{101}{3}배이다.',
          'a는 e의 \\frac{3}{101}배이다.',
          'e는 a의 \\frac{101}{3}배이다.',
          'a는 e의 101배이다.'
        ],
        problemLabel: '(4)',
        responseLabel: '배수 관계 문장',
        hints: ['a:e = 101:3에서 a는 e의 101/3배입니다.', 'a는 e의 \\frac{101}{3}배이다.를 선택하세요.'],
        sourceText: 'a:e = 101:3',
        confidence: 0.99,
        position: { top: 86.5, left: 16.5, width: 28.0, height: 4.5 }
      },
      {
        clientKey: 'q5',
        type: 'multiple-choice',
        answer: 'a는 d의 \\frac{2}{5}배이다.',
        options: [
          'a는 d의 \\frac{2}{5}배이다.',
          'a는 d의 \\frac{5}{2}배이다.',
          'd는 a의 \\frac{2}{5}배이다.',
          'a는 d의 2배이다.'
        ],
        problemLabel: '(5)',
        responseLabel: '배수 관계 문장',
        hints: ['a:d = 2:5에서 a는 d의 2/5배입니다.', 'a는 d의 \\frac{2}{5}배이다.를 선택하세요.'],
        sourceText: 'a:d = 2:5',
        confidence: 0.99,
        position: { top: 26.5, left: 54.5, width: 28.0, height: 4.5 }
      },
      {
        clientKey: 'q6',
        type: 'multiple-choice',
        answer: 'a는 f의 \\frac{5}{4}배이다.',
        options: [
          'a는 f의 \\frac{5}{4}배이다.',
          'a는 f의 \\frac{4}{5}배이다.',
          'f는 a의 \\frac{5}{4}배이다.',
          'a는 f의 5배이다.'
        ],
        problemLabel: '(6)',
        responseLabel: '배수 관계 문장',
        hints: ['a:f = 5:4에서 a는 f의 5/4배입니다.', 'a는 f의 \\frac{5}{4}배이다.를 선택하세요.'],
        sourceText: 'a:f = 5:4',
        confidence: 0.99,
        position: { top: 46.5, left: 54.5, width: 28.0, height: 4.5 }
      },
      {
        clientKey: 'q7',
        type: 'multiple-choice',
        answer: 'a는 y의 \\frac{7}{9}배이다.',
        options: [
          'a는 y의 \\frac{7}{9}배이다.',
          'a는 y의 \\frac{9}{7}배이다.',
          'y는 a의 \\frac{7}{9}배이다.',
          'a는 y의 7배이다.'
        ],
        problemLabel: '(7)',
        responseLabel: '배수 관계 문장',
        hints: ['a:y = 7:9에서 a는 y의 7/9배입니다.', 'a는 y의 \\frac{7}{9}배이다.를 선택하세요.'],
        sourceText: 'a:y = 7:9',
        confidence: 0.99,
        position: { top: 66.5, left: 54.5, width: 28.0, height: 4.5 }
      },
      {
        clientKey: 'q8',
        type: 'multiple-choice',
        answer: 'a는 h의 \\frac{66}{10}배이다.',
        options: [
          'a는 h의 \\frac{66}{10}배이다.',
          'a는 h의 \\frac{10}{66}배이다.',
          'h는 a의 \\frac{66}{10}배이다.',
          'a는 h의 66배이다.'
        ],
        problemLabel: '(8)',
        responseLabel: '배수 관계 문장',
        hints: ['a:h = 66:10에서 a는 h의 66/10배입니다.', 'a는 h의 \\frac{66}{10}배이다.를 선택하세요.'],
        sourceText: 'a:h = 66:10',
        confidence: 0.99,
        position: { top: 86.5, left: 54.5, width: 28.0, height: 4.5 }
      }
    ]
  },

  // Page 25: Slide 118
  {
    pageId: 'page_1786933942899_25',
    summary: '표현문제 6 - 자연수 곱으로 나타내기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '4c = 3d',
        options: ['4c = 3d', '3c = 4d', '4c = 4d', '3c = 3d'],
        problemLabel: '(2)',
        responseLabel: '곱의 관계 식',
        hints: ['c = 3d/4 양변에 4를 곱하세요.', '4c = 3d를 선택하세요.'],
        sourceText: 'c = 3d/4',
        confidence: 0.99,
        position: { top: 81.5, left: 31.5, width: 12.0, height: 4.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '5a = 2b',
        options: ['5a = 2b', '2a = 5b', '5a = 5b', '2a = 2b'],
        problemLabel: '(3)',
        responseLabel: '곱의 관계 식',
        hints: ['a = 2b/5 양변에 5를 곱하세요.', '5a = 2b를 선택하세요.'],
        sourceText: 'a = 2b/5',
        confidence: 0.99,
        position: { top: 61.5, left: 69.5, width: 12.0, height: 4.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '2a = 5b',
        options: ['2a = 5b', '5a = 2b', '2a = 2b', '5a = 5b'],
        problemLabel: '(4)',
        responseLabel: '곱의 관계 식',
        hints: ['a = 5b/2 양변에 2를 곱하세요.', '2a = 5b를 선택하세요.'],
        sourceText: 'a = 5b/2',
        confidence: 0.99,
        position: { top: 81.5, left: 69.5, width: 12.0, height: 4.5 }
      }
    ]
  },

  // Page 26: Slide 119
  {
    pageId: 'page_1786933942899_26',
    summary: '표현문제 7 - 자연수 곱으로 나타내기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '2b = 1c',
        options: ['2b = 1c', '1b = 2c', '2b = 2c', '1b = 1c'],
        problemLabel: '(2)',
        responseLabel: '곱의 관계 식',
        hints: ['b = c/2 양변에 2를 곱하세요.', '2b = 1c를 선택하세요.'],
        sourceText: 'b = c/2',
        confidence: 0.99,
        position: { top: 44.5, left: 31.5, width: 12.0, height: 4.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '5y = 3x',
        options: ['5y = 3x', '3y = 5x', '5y = 5x', '3y = 3x'],
        problemLabel: '(3)',
        responseLabel: '곱의 관계 식',
        hints: ['y = 3x/5 양변에 5를 곱하세요.', '5y = 3x를 선택하세요.'],
        sourceText: 'y = 3x/5',
        confidence: 0.99,
        position: { top: 64.5, left: 31.5, width: 12.0, height: 4.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '3a = 7e',
        options: ['3a = 7e', '7a = 3e', '3a = 3e', '7a = 7e'],
        problemLabel: '(4)',
        responseLabel: '곱의 관계 식',
        hints: ['a = 7e/3 양변에 3을 곱하세요.', '3a = 7e를 선택하세요.'],
        sourceText: 'a = 7e/3',
        confidence: 0.99,
        position: { top: 84.5, left: 31.5, width: 12.0, height: 4.5 }
      },
      {
        clientKey: 'q5',
        type: 'multiple-choice',
        answer: '3a = 2d',
        options: ['3a = 2d', '2a = 3d', '3a = 3d', '2a = 2d'],
        problemLabel: '(5)',
        responseLabel: '곱의 관계 식',
        hints: ['a = 2d/3 양변에 3을 곱하세요.', '3a = 2d를 선택하세요.'],
        sourceText: 'a = 2d/3',
        confidence: 0.99,
        position: { top: 24.5, left: 69.5, width: 12.0, height: 4.5 }
      },
      {
        clientKey: 'q6',
        type: 'multiple-choice',
        answer: '4d = 5f',
        options: ['4d = 5f', '5d = 4f', '4d = 4f', '5d = 5f'],
        problemLabel: '(6)',
        responseLabel: '곱의 관계 식',
        hints: ['d = 5f/4 양변에 4를 곱하세요.', '4d = 5f를 선택하세요.'],
        sourceText: 'd = 5f/4',
        confidence: 0.99,
        position: { top: 44.5, left: 69.5, width: 12.0, height: 4.5 }
      },
      {
        clientKey: 'q7',
        type: 'multiple-choice',
        answer: '2a = 10y',
        options: ['2a = 10y', '10a = 2y', '2a = 2y', '10a = 10y'],
        problemLabel: '(7)',
        responseLabel: '곱의 관계 식',
        hints: ['a = 10y/2 양변에 2를 곱하세요.', '2a = 10y를 선택하세요.'],
        sourceText: 'a = 10y/2',
        confidence: 0.99,
        position: { top: 64.5, left: 69.5, width: 12.0, height: 4.5 }
      },
      {
        clientKey: 'q8',
        type: 'multiple-choice',
        answer: '5a = 33h',
        options: ['5a = 33h', '33a = 5h', '5a = 5h', '33a = 33h'],
        problemLabel: '(8)',
        responseLabel: '곱의 관계 식',
        hints: ['a = 33h/5 양변에 5를 곱하세요.', '5a = 33h를 선택하세요.'],
        sourceText: 'a = 33h/5',
        confidence: 0.99,
        position: { top: 84.5, left: 69.5, width: 12.0, height: 4.5 }
      }
    ]
  },

  // Page 27: Slide 120
  {
    pageId: 'page_1786933942899_27',
    summary: '표현문제 8 - 배수 관계를 곱으로 나타내기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '2d = 33c',
        options: ['2d = 33c', '33d = 2c', '2d = 2c', '33d = 33c'],
        problemLabel: '(2)',
        responseLabel: '곱의 관계 식',
        hints: ['d = 33c/2 양변에 2를 곱하세요.', '2d = 33c를 선택하세요.'],
        sourceText: 'd는 c의 33/2배이다.',
        confidence: 0.99,
        position: { top: 46.5, left: 16.5, width: 28.0, height: 4.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '1a = 2w',
        options: ['1a = 2w', '2a = 1w', '1a = 1w', '2a = 2w'],
        problemLabel: '(3)',
        responseLabel: '곱의 관계 식',
        hints: ['a = 2w <=> 1a = 2w입니다.', '1a = 2w를 선택하세요.'],
        sourceText: 'a는 w의 2배이다.',
        confidence: 0.99,
        position: { top: 66.5, left: 16.5, width: 28.0, height: 4.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '3a = 100e',
        options: ['3a = 100e', '100a = 3e', '3a = 3e', '100a = 100e'],
        problemLabel: '(4)',
        responseLabel: '곱의 관계 식',
        hints: ['a = 100e/3 양변에 3을 곱하세요.', '3a = 100e를 선택하세요.'],
        sourceText: 'a는 e의 100/3배이다.',
        confidence: 0.99,
        position: { top: 86.5, left: 16.5, width: 28.0, height: 4.5 }
      },
      {
        clientKey: 'q5',
        type: 'multiple-choice',
        answer: '11a = 2d',
        options: ['11a = 2d', '2a = 11d', '11a = 11d', '2a = 2d'],
        problemLabel: '(5)',
        responseLabel: '곱의 관계 식',
        hints: ['a = 2d/11 양변에 11을 곱하세요.', '11a = 2d를 선택하세요.'],
        sourceText: 'a는 d의 2/11배이다.',
        confidence: 0.99,
        position: { top: 26.5, left: 54.5, width: 28.0, height: 4.5 }
      },
      {
        clientKey: 'q6',
        type: 'multiple-choice',
        answer: '4f = 5e',
        options: ['4f = 5e', '5f = 4e', '4f = 4e', '5f = 5e'],
        problemLabel: '(6)',
        responseLabel: '곱의 관계 식',
        hints: ['f = 5e/4 양변에 4를 곱하세요.', '4f = 5e를 선택하세요.'],
        sourceText: 'f는 e의 5/4배이다.',
        confidence: 0.99,
        position: { top: 46.5, left: 54.5, width: 28.0, height: 4.5 }
      },
      {
        clientKey: 'q7',
        type: 'multiple-choice',
        answer: '6a = 7y',
        options: ['6a = 7y', '7a = 6y', '6a = 6y', '7a = 7y'],
        problemLabel: '(7)',
        responseLabel: '곱의 관계 식',
        hints: ['a = 7y/6 양변에 6을 곱하세요.', '6a = 7y를 선택하세요.'],
        sourceText: 'a는 y의 7/6배이다.',
        confidence: 0.99,
        position: { top: 66.5, left: 54.5, width: 28.0, height: 4.5 }
      },
      {
        clientKey: 'q8',
        type: 'multiple-choice',
        answer: '5a = 77h',
        options: ['5a = 77h', '77a = 5h', '5a = 5h', '77a = 77h'],
        problemLabel: '(8)',
        responseLabel: '곱의 관계 식',
        hints: ['a = 77h/5 양변에 5를 곱하세요.', '5a = 77h를 선택하세요.'],
        sourceText: 'a는 h의 77/5배이다.',
        confidence: 0.99,
        position: { top: 86.5, left: 54.5, width: 28.0, height: 4.5 }
      }
    ]
  },

  // Page 28: Slide 121
  {
    pageId: 'page_1786933942899_28',
    summary: '표현문제 9 - 몇 배를 비로 바꾸기',
    elements: [
      {
        clientKey: 'q2_l',
        type: 'input',
        inputMode: 'integer',
        answer: '4',
        acceptedAnswers: ['4'],
        problemLabel: '(2) 비교량',
        responseLabel: 'a의 비',
        hints: ['4/2배에서 분자 4가 비교량입니다.', '4를 입력하세요.'],
        sourceText: 'a는 b의 4/2배 <=> a:b = [ ]:[ ]',
        confidence: 0.99,
        position: { top: 83.5, left: 39.5, width: 3.0, height: 4.0 }
      },
      {
        clientKey: 'q2_r',
        type: 'input',
        inputMode: 'integer',
        answer: '2',
        acceptedAnswers: ['2'],
        problemLabel: '(2) 기준량',
        responseLabel: 'b의 비',
        hints: ['4/2배에서 분모 2가 기준량입니다.', '2를 입력하세요.'],
        sourceText: 'a는 b의 4/2배 <=> a:b = [ ]:[ ]',
        confidence: 0.99,
        position: { top: 83.5, left: 44.0, width: 3.0, height: 4.0 }
      },
      {
        clientKey: 'q3_l',
        type: 'input',
        inputMode: 'integer',
        answer: '1',
        acceptedAnswers: ['1'],
        problemLabel: '(3) 비교량',
        responseLabel: 'f의 비',
        hints: ['1/2배에서 분자 1이 비교량입니다.', '1을 입력하세요.'],
        sourceText: 'f는 e의 1/2배 <=> f:e = [ ]:[ ]',
        confidence: 0.99,
        position: { top: 63.5, left: 77.5, width: 3.0, height: 4.0 }
      },
      {
        clientKey: 'q3_r',
        type: 'input',
        inputMode: 'integer',
        answer: '2',
        acceptedAnswers: ['2'],
        problemLabel: '(3) 기준량',
        responseLabel: 'e의 비',
        hints: ['1/2배에서 분모 2가 기준량입니다.', '2를 입력하세요.'],
        sourceText: 'f는 e의 1/2배 <=> f:e = [ ]:[ ]',
        confidence: 0.99,
        position: { top: 63.5, left: 82.0, width: 3.0, height: 4.0 }
      },
      {
        clientKey: 'q4_l',
        type: 'input',
        inputMode: 'integer',
        answer: '4',
        acceptedAnswers: ['4'],
        problemLabel: '(4) 비교량',
        responseLabel: 'b의 비',
        hints: ['4/3배에서 분자 4가 비교량입니다.', '4를 입력하세요.'],
        sourceText: 'b는 a의 4/3배 <=> b:a = [ ]:[ ]',
        confidence: 0.99,
        position: { top: 83.5, left: 77.5, width: 3.0, height: 4.0 }
      },
      {
        clientKey: 'q4_r',
        type: 'input',
        inputMode: 'integer',
        answer: '3',
        acceptedAnswers: ['3'],
        problemLabel: '(4) 기준량',
        responseLabel: 'a의 비',
        hints: ['4/3배에서 분모 3이 기준량입니다.', '3을 입력하세요.'],
        sourceText: 'b는 a의 4/3배 <=> b:a = [ ]:[ ]',
        confidence: 0.99,
        position: { top: 83.5, left: 82.0, width: 3.0, height: 4.0 }
      }
    ]
  },

  // Page 29: Slide 122
  {
    pageId: 'page_1786933942899_29',
    summary: '표현문제 10 - 주어진 관계를 몇 대 몇으로 표현하기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: 'd : c = 34 : 20',
        options: ['d : c = 34 : 20', 'd : c = 20 : 34', 'c : d = 34 : 20', 'd : c = 34 : 34'],
        problemLabel: '(2)',
        responseLabel: '비 표현',
        hints: ['d:c = 34:20을 선택하세요.'],
        sourceText: 'd는 c의 34/20배이다.',
        confidence: 0.99,
        position: { top: 45.5, left: 16.5, width: 28.0, height: 4.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: 'a : w = 22 : 1',
        options: ['a : w = 22 : 1', 'a : w = 1 : 22', 'w : a = 22 : 1', 'a : w = 22 : 22'],
        problemLabel: '(3)',
        responseLabel: '비 표현',
        hints: ['a:w = 22:1을 선택하세요.'],
        sourceText: 'a는 w의 22배이다.',
        confidence: 0.99,
        position: { top: 65.5, left: 16.5, width: 28.0, height: 4.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: 'a : e = 99 : 100',
        options: ['a : e = 99 : 100', 'a : e = 100 : 99', 'e : a = 99 : 100', 'a : e = 99 : 99'],
        problemLabel: '(4)',
        responseLabel: '비 표현',
        hints: ['a:e = 99:100을 선택하세요.'],
        sourceText: 'a는 e의 99/100배이다.',
        confidence: 0.99,
        position: { top: 85.5, left: 16.5, width: 28.0, height: 4.5 }
      },
      {
        clientKey: 'q5',
        type: 'multiple-choice',
        answer: 'a : d = 20 : 11',
        options: ['a : d = 20 : 11', 'a : d = 11 : 20', 'd : a = 20 : 11', 'a : d = 20 : 20'],
        problemLabel: '(5)',
        responseLabel: '비 표현',
        hints: ['a:d = 20:11을 선택하세요.'],
        sourceText: 'a는 d의 20/11배이다.',
        confidence: 0.99,
        position: { top: 25.5, left: 54.5, width: 28.0, height: 4.5 }
      },
      {
        clientKey: 'q6',
        type: 'multiple-choice',
        answer: 'f : e = 5 : 14',
        options: ['f : e = 5 : 14', 'f : e = 14 : 5', 'e : f = 5 : 14', 'f : e = 5 : 5'],
        problemLabel: '(6)',
        responseLabel: '비 표현',
        hints: ['f:e = 5:14를 선택하세요.'],
        sourceText: 'f는 e의 5/14배이다.',
        confidence: 0.99,
        position: { top: 45.5, left: 54.5, width: 28.0, height: 4.5 }
      },
      {
        clientKey: 'q7',
        type: 'multiple-choice',
        answer: 'a : y = 7 : 6',
        options: ['a : y = 7 : 6', 'a : y = 6 : 7', 'y : a = 7 : 6', 'a : y = 7 : 7'],
        problemLabel: '(7)',
        responseLabel: '비 표현',
        hints: ['a:y = 7:6을 선택하세요.'],
        sourceText: 'a는 y의 7/6배이다.',
        confidence: 0.99,
        position: { top: 65.5, left: 54.5, width: 28.0, height: 4.5 }
      },
      {
        clientKey: 'q8',
        type: 'multiple-choice',
        answer: 'a : h = 17 : 5',
        options: ['a : h = 17 : 5', 'a : h = 5 : 17', 'h : a = 17 : 5', 'a : h = 17 : 17'],
        problemLabel: '(8)',
        responseLabel: '비 표현',
        hints: ['a:h = 17:5를 선택하세요.'],
        sourceText: 'a는 h의 17/5배이다.',
        confidence: 0.99,
        position: { top: 85.5, left: 54.5, width: 28.0, height: 4.5 }
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
console.log('All 29 pages generated successfully!');
