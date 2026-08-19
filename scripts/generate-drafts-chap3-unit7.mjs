import fs from 'node:fs';

const unitId = 'ratios_ratio_chap3_unit7';

const pagesData = [
  // Page 1: Slide 81
  {
    pageId: 'page_1787004140341_1',
    summary: '뜻풀이 문제 1, 2, 3 - 시간 단위 기호 (4지선다형)',
    elements: [
      {
        clientKey: 'q1',
        type: 'multiple-choice',
        answer: '④ 2h',
        options: ['① hul', '② h2', '③ 2min', '④ 2h'],
        problemLabel: '뜻풀이 문제 1',
        responseLabel: '2시간의 영어 표현',
        hints: ['시간은 hour의 앞글자 h를 씁니다.', '④를 선택하세요.'],
        sourceText: '2시간을 영어로 간단히 표현한 것은?',
        confidence: 0.99,
        position: { top: 49.0, left: 32.0, width: 54.0, height: 8.0 }
      },
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '① 30min',
        options: ['① 30min', '② 30h', '③ 30sec', '④ hahaha'],
        problemLabel: '뜻풀이 문제 2',
        responseLabel: '30분의 영어 표현',
        hints: ['분은 minute의 앞 3글자 min을 씁니다.', '①을 선택하세요.'],
        sourceText: '30분을 영어로 간단히 표현한 것은?',
        confidence: 0.99,
        position: { top: 64.0, left: 32.0, width: 54.0, height: 8.0 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '② 15sec',
        options: ['① 15min', '② 15sec', '③ 15cho', '④ 15t'],
        problemLabel: '뜻풀이 문제 3',
        responseLabel: '15초의 영어 표현',
        hints: ['초는 second의 앞 3글자 sec을 씁니다.', '②를 선택하세요.'],
        sourceText: '15초를 영어로 간단히 표현한 것은?',
        confidence: 0.99,
        position: { top: 79.0, left: 32.0, width: 54.0, height: 8.0 }
      }
    ]
  },

  // Page 2: Slide 82
  {
    pageId: 'page_1787004140341_2',
    summary: '연습문제 1 - 시간 단위 변환 h->min->sec (4지선다형)',
    elements: [
      {
        clientKey: 'q2_min',
        type: 'multiple-choice',
        answer: '60min',
        options: ['60min', '6min', '600min', '10min'],
        problemLabel: '(2)-분',
        responseLabel: 'min 변환값',
        hints: ['1h × 60 = 60min입니다.', '60min을 선택하세요.'],
        sourceText: '1h = [ ]min',
        confidence: 0.99,
        position: { top: 43.5, left: 44.0, width: 11.0, height: 4.5 }
      },
      {
        clientKey: 'q2_sec',
        type: 'multiple-choice',
        answer: '3600sec',
        options: ['3600sec', '360sec', '600sec', '60sec'],
        problemLabel: '(2)-초',
        responseLabel: 'sec 변환값',
        hints: ['60min × 60 = 3600sec입니다.', '3600sec을 선택하세요.'],
        sourceText: '= [ ]sec',
        confidence: 0.99,
        position: { top: 43.5, left: 63.5, width: 14.0, height: 4.5 }
      },
      {
        clientKey: 'q3_min',
        type: 'multiple-choice',
        answer: '6min',
        options: ['6min', '60min', '0.6min', '10min'],
        problemLabel: '(3)-분',
        responseLabel: 'min 변환값',
        hints: ['0.1h × 60 = 6min입니다.', '6min을 선택하세요.'],
        sourceText: '0.1h = [ ]min',
        confidence: 0.99,
        position: { top: 63.5, left: 44.0, width: 11.0, height: 4.5 }
      },
      {
        clientKey: 'q3_sec',
        type: 'multiple-choice',
        answer: '360sec',
        options: ['360sec', '36sec', '3600sec', '60sec'],
        problemLabel: '(3)-초',
        responseLabel: 'sec 변환값',
        hints: ['6min × 60 = 360sec입니다.', '360sec을 선택하세요.'],
        sourceText: '= [ ]sec',
        confidence: 0.99,
        position: { top: 63.5, left: 63.5, width: 14.0, height: 4.5 }
      },
      {
        clientKey: 'q4_min',
        type: 'multiple-choice',
        answer: '126min',
        options: ['126min', '120min', '210min', '12.6min'],
        problemLabel: '(4)-분',
        responseLabel: 'min 변환값',
        hints: ['2.1h × 60 = 126min입니다.', '126min을 선택하세요.'],
        sourceText: '2.1h = [ ]min',
        confidence: 0.99,
        position: { top: 83.5, left: 44.0, width: 11.0, height: 4.5 }
      },
      {
        clientKey: 'q4_sec',
        type: 'multiple-choice',
        answer: '7560sec',
        options: ['7560sec', '756sec', '7200sec', '75600sec'],
        problemLabel: '(4)-초',
        responseLabel: 'sec 변환값',
        hints: ['126min × 60 = 7560sec입니다.', '7560sec을 선택하세요.'],
        sourceText: '= [ ]sec',
        confidence: 0.99,
        position: { top: 83.5, left: 63.5, width: 14.0, height: 4.5 }
      }
    ]
  },

  // Page 3: Slide 83
  {
    pageId: 'page_1787004140341_3',
    summary: '연습문제 2 - 시간 단위 역변환 sec->min->h (4지선다형)',
    elements: [
      {
        clientKey: 'q2_h',
        type: 'multiple-choice',
        answer: '$\\frac{1}{30}\\text{h}$ 혹은 0.033...h',
        options: ['$\\frac{1}{30}\\text{h}$ 혹은 0.033...h', '$\\frac{1}{3}\\text{h}$', '$\\frac{1}{60}\\text{h}$', '0.33...h'],
        problemLabel: '(2)-시간',
        responseLabel: 'h 변환값',
        hints: ['2min ÷ 60 = 1/30 h = 0.033...h입니다.', '$\\frac{1}{30}\\text{h}$ 혹은 0.033...h를 선택하세요.'],
        sourceText: '[ ]h',
        confidence: 0.99,
        position: { top: 43.5, left: 20.0, width: 14.0, height: 4.5 }
      },
      {
        clientKey: 'q2_min',
        type: 'multiple-choice',
        answer: '2min',
        options: ['2min', '20min', '0.2min', '12min'],
        problemLabel: '(2)-분',
        responseLabel: 'min 변환값',
        hints: ['120sec ÷ 60 = 2min입니다.', '2min을 선택하세요.'],
        sourceText: '= [ ]min',
        confidence: 0.99,
        position: { top: 43.5, left: 44.0, width: 11.0, height: 4.5 }
      },
      {
        clientKey: 'q3_h',
        type: 'multiple-choice',
        answer: '$\\frac{1}{120}\\text{h}$ 혹은 0.00833...h',
        options: ['$\\frac{1}{120}\\text{h}$ 혹은 0.00833...h', '$\\frac{1}{60}\\text{h}$', '0.0833...h', '$\\frac{1}{12}\\text{h}$'],
        problemLabel: '(3)-시간',
        responseLabel: 'h 변환값',
        hints: ['0.5min ÷ 60 = 1/120 h = 0.00833...h입니다.', '$\\frac{1}{120}\\text{h}$ 혹은 0.00833...h를 선택하세요.'],
        sourceText: '[ ]h',
        confidence: 0.99,
        position: { top: 63.5, left: 20.0, width: 14.0, height: 4.5 }
      },
      {
        clientKey: 'q3_min',
        type: 'multiple-choice',
        answer: '0.5min',
        options: ['0.5min', '5min', '0.05min', '2min'],
        problemLabel: '(3)-분',
        responseLabel: 'min 변환값',
        hints: ['30sec ÷ 60 = 0.5min입니다.', '0.5min을 선택하세요.'],
        sourceText: '= [ ]min',
        confidence: 0.99,
        position: { top: 63.5, left: 44.0, width: 11.0, height: 4.5 }
      },
      {
        clientKey: 'q4_h',
        type: 'multiple-choice',
        answer: '1h',
        options: ['1h', '10h', '0.1h', '6h'],
        problemLabel: '(4)-시간',
        responseLabel: 'h 변환값',
        hints: ['60min ÷ 60 = 1h입니다.', '1h를 선택하세요.'],
        sourceText: '[ ]h',
        confidence: 0.99,
        position: { top: 83.5, left: 20.0, width: 14.0, height: 4.5 }
      },
      {
        clientKey: 'q4_min',
        type: 'multiple-choice',
        answer: '60min',
        options: ['60min', '6min', '600min', '10min'],
        problemLabel: '(4)-분',
        responseLabel: 'min 변환값',
        hints: ['3600sec ÷ 60 = 60min입니다.', '60min을 선택하세요.'],
        sourceText: '= [ ]min',
        confidence: 0.99,
        position: { top: 83.5, left: 44.0, width: 11.0, height: 4.5 }
      }
    ]
  },

  // Page 4: Slide 84
  {
    pageId: 'page_1787004140341_4',
    summary: '연습문제 3 - 시간 단위 변환 계산하기 (4지선다 및 정수 입력)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '1.2',
        options: ['1.2', '12', '0.12', '7.2'],
        problemLabel: '(2)',
        responseLabel: 'h 변환값',
        hints: ['4320sec ÷ 3600 = 1.2h입니다.', '1.2를 선택하세요.'],
        sourceText: '4320sec = [ ]h',
        confidence: 0.99,
        position: { top: 41.5, left: 30.5, width: 14.0, height: 3.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '4.2',
        options: ['4.2', '42', '0.42', '2.52'],
        problemLabel: '(3)',
        responseLabel: 'h 변환값',
        hints: ['252min ÷ 60 = 4.2h입니다.', '4.2를 선택하세요.'],
        sourceText: '252min = [ ]h',
        confidence: 0.99,
        position: { top: 61.5, left: 30.5, width: 14.0, height: 3.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '$\\frac{1}{60}$',
        options: ['$\\frac{1}{60}$', '$\\frac{1}{6}$', '60', '0.1'],
        problemLabel: '(4)',
        responseLabel: 'h 변환값',
        hints: ['1min = 1/60 h입니다.', '$\\frac{1}{60}$를 선택하세요.'],
        sourceText: '1min = [ ]h',
        confidence: 0.99,
        position: { top: 81.5, left: 30.5, width: 16.5, height: 3.5 }
      },
      {
        clientKey: 'q5',
        type: 'multiple-choice',
        answer: '$\\frac{3}{4}$ 혹은 0.75',
        options: ['$\\frac{3}{4}$ 혹은 0.75', '$\\frac{1}{4}$ 혹은 0.25', '0.45', '$\\frac{4}{3}$'],
        problemLabel: '(5)',
        responseLabel: 'h 변환값',
        hints: ['45min = 45/60 h = 3/4 h = 0.75h입니다.', '$\\frac{3}{4}$ 혹은 0.75를 선택하세요.'],
        sourceText: '45min = [ ]h',
        confidence: 0.99,
        position: { top: 21.5, left: 69.0, width: 14.0, height: 3.5 }
      },
      {
        clientKey: 'q6',
        type: 'input',
        inputMode: 'integer',
        answer: '300',
        acceptedAnswers: ['300', '300sec'],
        problemLabel: '(6)',
        responseLabel: 'sec 변환값',
        hints: ['5min × 60 = 300sec입니다.', '300을 입력하세요.'],
        sourceText: '5min = [ ]sec',
        confidence: 0.99,
        position: { top: 41.5, left: 69.0, width: 14.0, height: 3.5 }
      },
      {
        clientKey: 'q7',
        type: 'input',
        inputMode: 'integer',
        answer: '720',
        acceptedAnswers: ['720', '720sec'],
        problemLabel: '(7)',
        responseLabel: 'sec 변환값',
        hints: ['0.2h × 3600 = 720sec입니다.', '720을 입력하세요.'],
        sourceText: '0.2h = [ ]sec',
        confidence: 0.99,
        position: { top: 61.5, left: 69.0, width: 14.0, height: 3.5 }
      },
      {
        clientKey: 'q8',
        type: 'input',
        inputMode: 'integer',
        answer: '3',
        acceptedAnswers: ['3', '3h'],
        problemLabel: '(8)',
        responseLabel: 'h 변환값',
        hints: ['180min ÷ 60 = 3h입니다.', '3을 입력하세요.'],
        sourceText: '180min = [ ]h',
        confidence: 0.99,
        position: { top: 81.5, left: 69.0, width: 14.0, height: 3.5 }
      }
    ]
  },

  // Page 5: Slide 85
  {
    pageId: 'page_1787004140341_5',
    summary: '연습문제 4 - min을 h로 바꾸기 (대입식 및 분수 결과, 4지선다형)',
    elements: [
      // (2) 15min
      {
        clientKey: 'q2_sub',
        type: 'multiple-choice',
        answer: '$\\frac{1}{60}\\text{h}$',
        options: ['$\\frac{1}{60}\\text{h}$', '$\\frac{1}{6}\\text{h}$', '$60\\text{h}$', '$\\frac{1}{3600}\\text{h}$'],
        problemLabel: '(2)-대입',
        responseLabel: '대입값',
        hints: ['min 대신 1/60 h를 대입합니다.', '$\\frac{1}{60}\\text{h}$를 선택하세요.'],
        sourceText: '= 15 × [ ]',
        confidence: 0.99,
        position: { top: 43.5, left: 23.5, width: 8.0, height: 4.5 }
      },
      {
        clientKey: 'q2_ans',
        type: 'multiple-choice',
        answer: '$\\frac{1}{4}\\text{h}$',
        options: ['$\\frac{1}{4}\\text{h}$', '$\\frac{1}{5}\\text{h}$', '$\\frac{1}{6}\\text{h}$', '$\\frac{1}{3}\\text{h}$'],
        problemLabel: '(2)-결과',
        responseLabel: '계산결과',
        hints: ['15/60 = 1/4 h입니다.', '$\\frac{1}{4}\\text{h}$를 선택하세요.'],
        sourceText: '= [ ]',
        confidence: 0.99,
        position: { top: 43.5, left: 35.5, width: 10.0, height: 4.5 }
      },

      // (3) 30min
      {
        clientKey: 'q3_sub',
        type: 'multiple-choice',
        answer: '$\\frac{1}{60}\\text{h}$',
        options: ['$\\frac{1}{60}\\text{h}$', '$\\frac{1}{6}\\text{h}$', '$60\\text{h}$', '$\\frac{1}{3600}\\text{h}$'],
        problemLabel: '(3)-대입',
        responseLabel: '대입값',
        hints: ['min 대신 1/60 h를 대입합니다.', '$\\frac{1}{60}\\text{h}$를 선택하세요.'],
        sourceText: '= 30 × [ ]',
        confidence: 0.99,
        position: { top: 63.5, left: 23.5, width: 8.0, height: 4.5 }
      },
      {
        clientKey: 'q3_ans',
        type: 'multiple-choice',
        answer: '$\\frac{1}{2}\\text{h}$',
        options: ['$\\frac{1}{2}\\text{h}$', '$\\frac{1}{3}\\text{h}$', '$\\frac{1}{4}\\text{h}$', '$1\\text{h}$'],
        problemLabel: '(3)-결과',
        responseLabel: '계산결과',
        hints: ['30/60 = 1/2 h입니다.', '$\\frac{1}{2}\\text{h}$를 선택하세요.'],
        sourceText: '= [ ]',
        confidence: 0.99,
        position: { top: 63.5, left: 35.5, width: 10.0, height: 4.5 }
      },

      // (4) 50min
      {
        clientKey: 'q4_sub',
        type: 'multiple-choice',
        answer: '$\\frac{1}{60}\\text{h}$',
        options: ['$\\frac{1}{60}\\text{h}$', '$\\frac{1}{6}\\text{h}$', '$60\\text{h}$', '$\\frac{1}{3600}\\text{h}$'],
        problemLabel: '(4)-대입',
        responseLabel: '대입값',
        hints: ['min 대신 1/60 h를 대입합니다.', '$\\frac{1}{60}\\text{h}$를 선택하세요.'],
        sourceText: '= 50 × [ ]',
        confidence: 0.99,
        position: { top: 83.5, left: 23.5, width: 8.0, height: 4.5 }
      },
      {
        clientKey: 'q4_ans',
        type: 'multiple-choice',
        answer: '$\\frac{5}{6}\\text{h}$',
        options: ['$\\frac{5}{6}\\text{h}$', '$\\frac{5}{12}\\text{h}$', '$\\frac{1}{2}\\text{h}$', '$\\frac{2}{3}\\text{h}$'],
        problemLabel: '(4)-결과',
        responseLabel: '계산결과',
        hints: ['50/60 = 5/6 h입니다.', '$\\frac{5}{6}\\text{h}$를 선택하세요.'],
        sourceText: '= [ ]',
        confidence: 0.99,
        position: { top: 83.5, left: 35.5, width: 10.0, height: 4.5 }
      },

      // (5) 20min
      {
        clientKey: 'q5_sub',
        type: 'multiple-choice',
        answer: '$\\frac{1}{60}\\text{h}$',
        options: ['$\\frac{1}{60}\\text{h}$', '$\\frac{1}{6}\\text{h}$', '$60\\text{h}$', '$\\frac{1}{3600}\\text{h}$'],
        problemLabel: '(5)-대입',
        responseLabel: '대입값',
        hints: ['min 대신 1/60 h를 대입합니다.', '$\\frac{1}{60}\\text{h}$를 선택하세요.'],
        sourceText: '= 20 × [ ]',
        confidence: 0.99,
        position: { top: 23.5, left: 61.5, width: 8.0, height: 4.5 }
      },
      {
        clientKey: 'q5_ans',
        type: 'multiple-choice',
        answer: '$\\frac{1}{3}\\text{h}$',
        options: ['$\\frac{1}{3}\\text{h}$', '$\\frac{1}{2}\\text{h}$', '$\\frac{1}{4}\\text{h}$', '$\\frac{1}{6}\\text{h}$'],
        problemLabel: '(5)-결과',
        responseLabel: '계산결과',
        hints: ['20/60 = 1/3 h입니다.', '$\\frac{1}{3}\\text{h}$를 선택하세요.'],
        sourceText: '= [ ]',
        confidence: 0.99,
        position: { top: 23.5, left: 73.5, width: 10.0, height: 4.5 }
      },

      // (6) 25min
      {
        clientKey: 'q6_sub',
        type: 'multiple-choice',
        answer: '$\\frac{1}{60}\\text{h}$',
        options: ['$\\frac{1}{60}\\text{h}$', '$\\frac{1}{6}\\text{h}$', '$60\\text{h}$', '$\\frac{1}{3600}\\text{h}$'],
        problemLabel: '(6)-대입',
        responseLabel: '대입값',
        hints: ['min 대신 1/60 h를 대입합니다.', '$\\frac{1}{60}\\text{h}$를 선택하세요.'],
        sourceText: '= 25 × [ ]',
        confidence: 0.99,
        position: { top: 43.5, left: 61.5, width: 8.0, height: 4.5 }
      },
      {
        clientKey: 'q6_ans',
        type: 'multiple-choice',
        answer: '$\\frac{5}{12}\\text{h}$',
        options: ['$\\frac{5}{12}\\text{h}$', '$\\frac{1}{4}\\text{h}$', '$\\frac{5}{6}\\text{h}$', '$\\frac{1}{3}\\text{h}$'],
        problemLabel: '(6)-결과',
        responseLabel: '계산결과',
        hints: ['25/60 = 5/12 h입니다.', '$\\frac{5}{12}\\text{h}$를 선택하세요.'],
        sourceText: '= [ ]',
        confidence: 0.99,
        position: { top: 43.5, left: 73.5, width: 10.0, height: 4.5 }
      },

      // (7) 45min
      {
        clientKey: 'q7_sub',
        type: 'multiple-choice',
        answer: '$\\frac{1}{60}\\text{h}$',
        options: ['$\\frac{1}{60}\\text{h}$', '$\\frac{1}{6}\\text{h}$', '$60\\text{h}$', '$\\frac{1}{3600}\\text{h}$'],
        problemLabel: '(7)-대입',
        responseLabel: '대입값',
        hints: ['min 대신 1/60 h를 대입합니다.', '$\\frac{1}{60}\\text{h}$를 선택하세요.'],
        sourceText: '= 45 × [ ]',
        confidence: 0.99,
        position: { top: 63.5, left: 61.5, width: 8.0, height: 4.5 }
      },
      {
        clientKey: 'q7_ans',
        type: 'multiple-choice',
        answer: '$\\frac{3}{4}\\text{h}$',
        options: ['$\\frac{3}{4}\\text{h}$', '$\\frac{2}{3}\\text{h}$', '$\\frac{1}{2}\\text{h}$', '$\\frac{4}{5}\\text{h}$'],
        problemLabel: '(7)-결과',
        responseLabel: '계산결과',
        hints: ['45/60 = 3/4 h입니다.', '$\\frac{3}{4}\\text{h}$를 선택하세요.'],
        sourceText: '= [ ]',
        confidence: 0.99,
        position: { top: 63.5, left: 73.5, width: 10.0, height: 4.5 }
      },

      // (8) 24min
      {
        clientKey: 'q8_sub',
        type: 'multiple-choice',
        answer: '$\\frac{1}{60}\\text{h}$',
        options: ['$\\frac{1}{60}\\text{h}$', '$\\frac{1}{6}\\text{h}$', '$60\\text{h}$', '$\\frac{1}{3600}\\text{h}$'],
        problemLabel: '(8)-대입',
        responseLabel: '대입값',
        hints: ['min 대신 1/60 h를 대입합니다.', '$\\frac{1}{60}\\text{h}$를 선택하세요.'],
        sourceText: '= 24 × [ ]',
        confidence: 0.99,
        position: { top: 83.5, left: 61.5, width: 8.0, height: 4.5 }
      },
      {
        clientKey: 'q8_ans',
        type: 'multiple-choice',
        answer: '$\\frac{2}{5}\\text{h}$',
        options: ['$\\frac{2}{5}\\text{h}$', '$\\frac{1}{5}\\text{h}$', '$\\frac{3}{5}\\text{h}$', '$\\frac{4}{5}\\text{h}$'],
        problemLabel: '(8)-결과',
        responseLabel: '계산결과',
        hints: ['24/60 = 2/5 h입니다.', '$\\frac{2}{5}\\text{h}$를 선택하세요.'],
        sourceText: '= [ ]',
        confidence: 0.99,
        position: { top: 83.5, left: 73.5, width: 10.0, height: 4.5 }
      }
    ]
  },

  // Page 6: Slide 86
  {
    pageId: 'page_1787004140341_6',
    summary: '연습문제 5 - 시간을 소수로 표현하기 (4지선다형 완성식)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '$1\\text{h} + \\frac{12}{60}\\text{h} = 1\\text{h} + 0.2\\text{h} = 1.2\\text{h}$',
        options: [
          '$1\\text{h} + \\frac{12}{60}\\text{h} = 1\\text{h} + 0.2\\text{h} = 1.2\\text{h}$',
          '$1\\text{h} + \\frac{12}{60}\\text{h} = 1\\text{h} + 0.12\\text{h} = 1.12\\text{h}$',
          '$1\\text{h} + 12\\text{h} = 13\\text{h}$',
          '$1\\text{h} + \\frac{12}{100}\\text{h} = 1.12\\text{h}$'
        ],
        problemLabel: '(2)',
        responseLabel: '소수 시간 변환식',
        hints: ['12분 = 12/60 시간 = 0.2시간이므로 1.2시간입니다.', '$1\\text{h} + \\frac{12}{60}\\text{h} = 1\\text{h} + 0.2\\text{h} = 1.2\\text{h}$를 선택하세요.'],
        sourceText: '1h 12min',
        confidence: 0.99,
        position: { top: 44.5, left: 16.0, width: 30.0, height: 3.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '$7\\text{h} + \\frac{24}{60}\\text{h} = 7\\text{h} + 0.4\\text{h} = 7.4\\text{h}$',
        options: [
          '$7\\text{h} + \\frac{24}{60}\\text{h} = 7\\text{h} + 0.4\\text{h} = 7.4\\text{h}$',
          '$7\\text{h} + \\frac{24}{60}\\text{h} = 7\\text{h} + 0.24\\text{h} = 7.24\\text{h}$',
          '$7\\text{h} + 24\\text{h} = 31\\text{h}$',
          '$7\\text{h} + \\frac{24}{100}\\text{h} = 7.24\\text{h}$'
        ],
        problemLabel: '(3)',
        responseLabel: '소수 시간 변환식',
        hints: ['24분 = 24/60 시간 = 0.4시간이므로 7.4시간입니다.', '$7\\text{h} + \\frac{24}{60}\\text{h} = 7\\text{h} + 0.4\\text{h} = 7.4\\text{h}$를 선택하세요.'],
        sourceText: '7h 24min',
        confidence: 0.99,
        position: { top: 64.5, left: 16.0, width: 30.0, height: 3.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '$2\\text{h} + \\frac{48}{60}\\text{h} = 2\\text{h} + 0.8\\text{h} = 2.8\\text{h}$',
        options: [
          '$2\\text{h} + \\frac{48}{60}\\text{h} = 2\\text{h} + 0.8\\text{h} = 2.8\\text{h}$',
          '$2\\text{h} + \\frac{48}{60}\\text{h} = 2\\text{h} + 0.48\\text{h} = 2.48\\text{h}$',
          '$2\\text{h} + 48\\text{h} = 50\\text{h}$',
          '$2\\text{h} + \\frac{48}{100}\\text{h} = 2.48\\text{h}$'
        ],
        problemLabel: '(4)',
        responseLabel: '소수 시간 변환식',
        hints: ['48분 = 48/60 시간 = 0.8시간이므로 2.8시간입니다.', '$2\\text{h} + \\frac{48}{60}\\text{h} = 2\\text{h} + 0.8\\text{h} = 2.8\\text{h}$를 선택하세요.'],
        sourceText: '2h 48min',
        confidence: 0.99,
        position: { top: 84.5, left: 16.0, width: 30.0, height: 3.5 }
      },
      {
        clientKey: 'q5',
        type: 'multiple-choice',
        answer: '$5\\text{h} + \\frac{30}{60}\\text{h} = 5\\text{h} + 0.5\\text{h} = 5.5\\text{h}$',
        options: [
          '$5\\text{h} + \\frac{30}{60}\\text{h} = 5\\text{h} + 0.5\\text{h} = 5.5\\text{h}$',
          '$5\\text{h} + \\frac{30}{60}\\text{h} = 5\\text{h} + 0.3\\text{h} = 5.3\\text{h}$',
          '$5\\text{h} + 30\\text{h} = 35\\text{h}$',
          '$5\\text{h} + \\frac{30}{100}\\text{h} = 5.3\\text{h}$'
        ],
        problemLabel: '(5)',
        responseLabel: '소수 시간 변환식',
        hints: ['30분 = 30/60 시간 = 0.5시간이므로 5.5시간입니다.', '$5\\text{h} + \\frac{30}{60}\\text{h} = 5\\text{h} + 0.5\\text{h} = 5.5\\text{h}$를 선택하세요.'],
        sourceText: '5h 30min',
        confidence: 0.99,
        position: { top: 24.5, left: 53.5, width: 30.0, height: 3.5 }
      },
      {
        clientKey: 'q6',
        type: 'multiple-choice',
        answer: '$3\\text{h} + \\frac{45}{60}\\text{h} = 3\\text{h} + 0.75\\text{h} = 3.75\\text{h}$',
        options: [
          '$3\\text{h} + \\frac{45}{60}\\text{h} = 3\\text{h} + 0.75\\text{h} = 3.75\\text{h}$',
          '$3\\text{h} + \\frac{45}{60}\\text{h} = 3\\text{h} + 0.45\\text{h} = 3.45\\text{h}$',
          '$3\\text{h} + 45\\text{h} = 48\\text{h}$',
          '$3\\text{h} + \\frac{45}{100}\\text{h} = 3.45\\text{h}$'
        ],
        problemLabel: '(6)',
        responseLabel: '소수 시간 변환식',
        hints: ['45분 = 45/60 시간 = 0.75시간이므로 3.75시간입니다.', '$3\\text{h} + \\frac{45}{60}\\text{h} = 3\\text{h} + 0.75\\text{h} = 3.75\\text{h}$를 선택하세요.'],
        sourceText: '3h 45min',
        confidence: 0.99,
        position: { top: 44.5, left: 53.5, width: 30.0, height: 3.5 }
      },
      {
        clientKey: 'q7',
        type: 'multiple-choice',
        answer: '$5\\text{h} + \\frac{36}{60}\\text{h} = 5\\text{h} + 0.6\\text{h} = 5.6\\text{h}$',
        options: [
          '$5\\text{h} + \\frac{36}{60}\\text{h} = 5\\text{h} + 0.6\\text{h} = 5.6\\text{h}$',
          '$5\\text{h} + \\frac{36}{60}\\text{h} = 5\\text{h} + 0.36\\text{h} = 5.36\\text{h}$',
          '$5\\text{h} + 36\\text{h} = 41\\text{h}$',
          '$5\\text{h} + \\frac{36}{100}\\text{h} = 5.36\\text{h}$'
        ],
        problemLabel: '(7)',
        responseLabel: '소수 시간 변환식',
        hints: ['36분 = 36/60 시간 = 0.6시간이므로 5.6시간입니다.', '$5\\text{h} + \\frac{36}{60}\\text{h} = 5\\text{h} + 0.6\\text{h} = 5.6\\text{h}$를 선택하세요.'],
        sourceText: '5h 36min',
        confidence: 0.99,
        position: { top: 64.5, left: 53.5, width: 30.0, height: 3.5 }
      },
      {
        clientKey: 'q8',
        type: 'multiple-choice',
        answer: '$4\\text{h} + \\frac{20}{60}\\text{h} = 4\\text{h} + 0.333...\\text{h} = 4.333...\\text{h}$',
        options: [
          '$4\\text{h} + \\frac{20}{60}\\text{h} = 4\\text{h} + 0.333...\\text{h} = 4.333...\\text{h}$',
          '$4\\text{h} + \\frac{20}{60}\\text{h} = 4\\text{h} + 0.2\\text{h} = 4.2\\text{h}$',
          '$4\\text{h} + 20\\text{h} = 24\\text{h}$',
          '$4\\text{h} + \\frac{20}{100}\\text{h} = 4.2\\text{h}$'
        ],
        problemLabel: '(8)',
        responseLabel: '소수 시간 변환식',
        hints: ['20분 = 20/60 시간 = 0.333...시간이므로 4.333...시간입니다.', '$4\\text{h} + \\frac{20}{60}\\text{h} = 4\\text{h} + 0.333...\\text{h} = 4.333...\\text{h}$를 선택하세요.'],
        sourceText: '4h 20min',
        confidence: 0.99,
        position: { top: 84.5, left: 53.5, width: 30.0, height: 3.5 }
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
