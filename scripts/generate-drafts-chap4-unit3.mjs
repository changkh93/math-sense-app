import fs from 'node:fs';

const unitId = 'ratios_ratio_chap4_unit3';

const pagesData = [
  // Page 1: Slide 114
  {
    pageId: 'page_1787004239943_1',
    summary: '표현 문제 1 - 등식과 비율의 차이 및 비율 표현 고르기 (객관식)',
    elements: [
      {
        clientKey: 'q1',
        type: 'multiple-choice',
        answer: '② \\frac{5000\\text{원}}{5\\text{개}}',
        options: ['① 5개 = 5000원', '② \\frac{5000\\text{원}}{5\\text{개}}'],
        problemLabel: '(1)',
        responseLabel: '알맞은 표현',
        hints: ['5개에 5000원은 5개당 5000원이라는 비율(ratio) 관계입니다.', '②를 선택하세요.'],
        sourceText: '5개에 5000원',
        confidence: 0.99,
        position: { top: 61.0, left: 16.0, width: 31.0, height: 6.5 }
      },
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '① \\frac{300\\text{다발}}{2\\text{천원}}',
        options: ['① \\frac{300\\text{다발}}{2\\text{천원}}', '② 2천원 = 300다발'],
        problemLabel: '(2)',
        responseLabel: '알맞은 표현',
        hints: ['2천원에 300다발은 2천원당 300다발의 비율 관계입니다.', '①을 선택하세요.'],
        sourceText: '2천원에 300다발',
        confidence: 0.99,
        position: { top: 81.5, left: 16.0, width: 31.0, height: 6.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '② \\frac{500\\text{km}}{2\\text{시간}}',
        options: ['① 2시간 = 5000km', '② \\frac{500\\text{km}}{2\\text{시간}}'],
        problemLabel: '(3)',
        responseLabel: '알맞은 표현',
        hints: ['2시간에 500km는 2시간당 500km를 이동한 속력 비율입니다.', '②를 선택하세요.'],
        sourceText: '2시간에 500km',
        confidence: 0.99,
        position: { top: 61.0, left: 53.5, width: 31.0, height: 6.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '② \\frac{50\\text{kg}}{3000\\text{원}}',
        options: ['① 3000원 = 50kg', '② \\frac{50\\text{kg}}{3000\\text{원}}'],
        problemLabel: '(4)',
        responseLabel: '알맞은 표현',
        hints: ['3000원에 50kg은 3000원당 50kg의 비율 관계입니다.', '②를 선택하세요.'],
        sourceText: '3000원에 50kg',
        confidence: 0.99,
        position: { top: 81.5, left: 53.5, width: 31.0, height: 6.5 }
      }
    ]
  },

  // Page 2: Slide 115
  {
    pageId: 'page_1787004239943_2',
    summary: '연습문제 1 - 비례식의 성질을 이용한 변화 배율(scale factor) 구하기 (주관식 분수)',
    elements: [
      {
        clientKey: 'q2_top',
        type: 'input',
        inputMode: 'text',
        answer: '\\frac{15}{12}',
        acceptedAnswers: ['\\frac{15}{12}', '\\frac{5}{4}', '15/12', '5/4', '1.25', '\\times \\frac{15}{12}', '\\times \\frac{5}{4}', '× 15/12', '× 5/4'],
        problemLabel: '(2)',
        responseLabel: '비교량 배율',
        hints: ['12g에서 15g으로 바뀌는 배율을 찾으세요.', '15 ÷ 12 = 15/12 입니다.', '15/12 또는 5/4를 입력하세요.'],
        sourceText: '1000원/12g = x원/15g 비교량 배율',
        confidence: 0.99,
        position: { top: 72.0, left: 30.5, width: 6.5, height: 4.2 }
      },
      {
        clientKey: 'q2_bottom',
        type: 'input',
        inputMode: 'text',
        answer: '\\frac{15}{12}',
        acceptedAnswers: ['\\frac{15}{12}', '\\frac{5}{4}', '15/12', '5/4', '1.25', '\\times \\frac{15}{12}', '\\times \\frac{5}{4}', '× 15/12', '× 5/4'],
        problemLabel: '(2)',
        responseLabel: '기준량 배율',
        hints: ['12g에서 15g으로 변할 때 곱해진 분수 배율입니다.', '15/12 또는 5/4를 입력하세요.'],
        sourceText: '1000원/12g = x원/15g 기준량 배율',
        confidence: 0.99,
        position: { top: 82.2, left: 30.5, width: 6.5, height: 4.2 }
      },
      {
        clientKey: 'q3_top',
        type: 'input',
        inputMode: 'text',
        answer: '\\frac{140}{350}',
        acceptedAnswers: ['\\frac{140}{350}', '\\frac{2}{5}', '140/350', '2/5', '0.4', '\\times \\frac{140}{350}', '\\times \\frac{2}{5}', '× 140/350', '× 2/5'],
        problemLabel: '(3)',
        responseLabel: '비교량 배율',
        hints: ['350km에서 140km로 바뀔 때 곱해진 배율을 찾으세요.', '140 ÷ 350 = 140/350 입니다.', '140/350 또는 2/5를 입력하세요.'],
        sourceText: '350km/2h = 140km/xh 비교량 배율',
        confidence: 0.99,
        position: { top: 50.8, left: 65.5, width: 6.5, height: 4.2 }
      },
      {
        clientKey: 'q3_bottom',
        type: 'input',
        inputMode: 'text',
        answer: '\\frac{140}{350}',
        acceptedAnswers: ['\\frac{140}{350}', '\\frac{2}{5}', '140/350', '2/5', '0.4', '\\times \\frac{140}{350}', '\\times \\frac{2}{5}', '× 140/350', '× 2/5'],
        problemLabel: '(3)',
        responseLabel: '기준량 배율',
        hints: ['350km에서 140km로 변할 때 곱해진 분수 배율입니다.', '140/350 또는 2/5를 입력하세요.'],
        sourceText: '350km/2h = 140km/xh 기준량 배율',
        confidence: 0.99,
        position: { top: 61.2, left: 65.5, width: 6.5, height: 4.2 }
      },
      {
        clientKey: 'q4_top',
        type: 'input',
        inputMode: 'text',
        answer: '\\frac{1200}{500}',
        acceptedAnswers: ['\\frac{1200}{500}', '\\frac{12}{5}', '1200/500', '12/5', '2.4', '\\times \\frac{1200}{500}', '\\times \\frac{12}{5}', '× 1200/500', '× 12/5'],
        problemLabel: '(4)',
        responseLabel: '비교량 배율',
        hints: ['500에서 1200으로 바뀔 때 곱해진 배율을 찾으세요.', '1200 ÷ 500 = 1200/500 입니다.', '1200/500 또는 12/5를 입력하세요.'],
        sourceText: '500/6% = 1200/x% 비교량 배율',
        confidence: 0.99,
        position: { top: 71.5, left: 65.5, width: 6.5, height: 4.2 }
      },
      {
        clientKey: 'q4_bottom',
        type: 'input',
        inputMode: 'text',
        answer: '\\frac{1200}{500}',
        acceptedAnswers: ['\\frac{1200}{500}', '\\frac{12}{5}', '1200/500', '12/5', '2.4', '\\times \\frac{1200}{500}', '\\times \\frac{12}{5}', '× 1200/500', '× 12/5'],
        problemLabel: '(4)',
        responseLabel: '기준량 배율',
        hints: ['500에서 1200으로 변할 때 곱해진 분수 배율입니다.', '1200/500 또는 12/5를 입력하세요.'],
        sourceText: '500/6% = 1200/x% 기준량 배율',
        confidence: 0.99,
        position: { top: 82.0, left: 65.5, width: 6.5, height: 4.2 }
      }
    ]
  },

  // Page 3: Slide 116
  {
    pageId: 'page_1787004239943_3',
    summary: '연습문제 2 - 비례식과 빈칸/밑줄 채우기',
    elements: [
      // Problem (2)
      {
        clientKey: 'q2_box',
        type: 'input',
        inputMode: 'integer',
        answer: '4',
        acceptedAnswers: ['4', '4h', '4시간'],
        problemLabel: '(2)',
        responseLabel: '걸리는 시간',
        hints: ['3.4시간에 100/85 (20/17)을 곱하세요.', '3.4 × (20/17) = 4시간 입니다.'],
        sourceText: '85km/3.4h = 100km/□h',
        confidence: 0.99,
        position: { top: 43.0, left: 32.8, width: 6.0, height: 3.5 }
      },
      {
        clientKey: 'q2_item1',
        type: 'input',
        inputMode: 'text',
        answer: '85km',
        acceptedAnswers: ['85km', '85', '85 km'],
        problemLabel: '(2)',
        responseLabel: '처음 거리',
        hints: ['처음 이동한 거리를 쓰세요.', '85km를 입력하세요.'],
        sourceText: '____가 ____로 바뀌는 데',
        confidence: 0.99,
        position: { top: 39.0, left: 44.2, width: 6.5, height: 2.5 }
      },
      {
        clientKey: 'q2_item2',
        type: 'input',
        inputMode: 'text',
        answer: '100km',
        acceptedAnswers: ['100km', '100', '100 km'],
        problemLabel: '(2)',
        responseLabel: '목표 거리',
        hints: ['바뀐 목표 거리를 쓰세요.', '100km를 입력하세요.'],
        sourceText: '____가 ____로 바뀌는 데',
        confidence: 0.99,
        position: { top: 39.0, left: 53.0, width: 7.0, height: 2.5 }
      },
      {
        clientKey: 'q2_scale1',
        type: 'input',
        inputMode: 'text',
        answer: '\\frac{100}{85}',
        acceptedAnswers: ['\\frac{100}{85}', '\\frac{20}{17}', '100/85', '20/17'],
        problemLabel: '(2)',
        responseLabel: '비교량 배율',
        hints: ['85km에서 100km로 변한 배율입니다.', '100/85 또는 20/17을 입력하세요.'],
        sourceText: '____배가 되었으므로',
        confidence: 0.99,
        position: { top: 38.5, left: 69.5, width: 6.5, height: 3.0 }
      },
      {
        clientKey: 'q2_scale2',
        type: 'input',
        inputMode: 'text',
        answer: '\\frac{100}{85}',
        acceptedAnswers: ['\\frac{100}{85}', '\\frac{20}{17}', '100/85', '20/17'],
        problemLabel: '(2)',
        responseLabel: '기준량 배율',
        hints: ['기준량에도 똑같이 곱해야 하는 배율입니다.', '100/85 또는 20/17을 입력하세요.'],
        sourceText: '기준량도 ____배가 되면',
        confidence: 0.99,
        position: { top: 42.5, left: 52.8, width: 6.5, height: 3.0 }
      },
      {
        clientKey: 'q2_calc',
        type: 'input',
        inputMode: 'text',
        answer: '3.4 \\times \\frac{100}{85} = 4',
        acceptedAnswers: ['3.4 \\times \\frac{100}{85} = 4', '3.4 \\times \\frac{20}{17} = 4', '3.4 * 100 / 85 = 4', '3.4 * 20 / 17 = 4', '4', '4시간', '4h'],
        problemLabel: '(2)',
        responseLabel: '풀이식과 결과',
        hints: ['3.4에 배율을 곱해 결과를 구하세요.', '3.4 × 100/85 = 4 를 입력하세요.'],
        sourceText: '따라서 __________________',
        confidence: 0.99,
        position: { top: 46.5, left: 50.5, width: 28.0, height: 2.5 }
      },

      // Problem (3)
      {
        clientKey: 'q3_box',
        type: 'input',
        inputMode: 'integer',
        answer: '1000',
        acceptedAnswers: ['1000', '1000명'],
        problemLabel: '(3)',
        responseLabel: '해당 인원수',
        hints: ['1800명에 50/90 (5/9)를 곱하세요.', '1800 × 5/9 = 1000명 입니다.'],
        sourceText: '1800명/90% = □명/50%',
        confidence: 0.99,
        position: { top: 59.2, left: 32.5, width: 6.0, height: 3.5 }
      },
      {
        clientKey: 'q3_item1',
        type: 'input',
        inputMode: 'text',
        answer: '90%',
        acceptedAnswers: ['90%', '90', '90 %'],
        problemLabel: '(3)',
        responseLabel: '처음 백분율',
        hints: ['처음 비율인 90%를 쓰세요.', '90%를 입력하세요.'],
        sourceText: '____가 ____로 바뀌는 데',
        confidence: 0.99,
        position: { top: 58.0, left: 44.2, width: 6.5, height: 2.5 }
      },
      {
        clientKey: 'q3_item2',
        type: 'input',
        inputMode: 'text',
        answer: '50%',
        acceptedAnswers: ['50%', '50', '50 %'],
        problemLabel: '(3)',
        responseLabel: '목표 백분율',
        hints: ['바뀐 비율인 50%를 쓰세요.', '50%를 입력하세요.'],
        sourceText: '____가 ____로 바뀌는 데',
        confidence: 0.99,
        position: { top: 58.0, left: 53.0, width: 7.0, height: 2.5 }
      },
      {
        clientKey: 'q3_scale1',
        type: 'input',
        inputMode: 'text',
        answer: '\\frac{50}{90}',
        acceptedAnswers: ['\\frac{50}{90}', '\\frac{5}{9}', '50/90', '5/9'],
        problemLabel: '(3)',
        responseLabel: '기준량 배율',
        hints: ['90%에서 50%로 변한 배율입니다.', '50/90 또는 5/9를 입력하세요.'],
        sourceText: '____배가 되었으므로',
        confidence: 0.99,
        position: { top: 57.5, left: 69.5, width: 6.5, height: 3.0 }
      },
      {
        clientKey: 'q3_scale2',
        type: 'input',
        inputMode: 'text',
        answer: '\\frac{50}{90}',
        acceptedAnswers: ['\\frac{50}{90}', '\\frac{5}{9}', '50/90', '5/9'],
        problemLabel: '(3)',
        responseLabel: '비교량 배율',
        hints: ['비교량에도 똑같이 곱해야 하는 배율입니다.', '50/90 또는 5/9를 입력하세요.'],
        sourceText: '비교량도 ____배가 되면',
        confidence: 0.99,
        position: { top: 61.5, left: 52.8, width: 6.5, height: 3.0 }
      },
      {
        clientKey: 'q3_calc',
        type: 'input',
        inputMode: 'text',
        answer: '1800 \\times \\frac{50}{90} = 1000',
        acceptedAnswers: ['1800 \\times \\frac{50}{90} = 1000', '1800 \\times \\frac{5}{9} = 1000', '1800 * 50 / 90 = 1000', '1800 * 5 / 9 = 1000', '1000', '1000명'],
        problemLabel: '(3)',
        responseLabel: '풀이식과 결과',
        hints: ['1800에 배율을 곱해 결과를 구하세요.', '1800 × 50/90 = 1000 을 입력하세요.'],
        sourceText: '따라서 __________________',
        confidence: 0.99,
        position: { top: 65.5, left: 50.5, width: 28.0, height: 2.5 }
      },

      // Problem (4)
      {
        clientKey: 'q4_box',
        type: 'input',
        inputMode: 'integer',
        answer: '9',
        acceptedAnswers: ['9', '9kg', '9 kg'],
        problemLabel: '(4)',
        responseLabel: '살 수 있는 무게',
        hints: ['2kg에 45000/10000 (9/2 또는 4.5)를 곱하세요.', '2 × 4.5 = 9kg 입니다.'],
        sourceText: '10000원/2kg = 45000원/□kg',
        confidence: 0.99,
        position: { top: 82.5, left: 32.8, width: 6.0, height: 3.5 }
      },
      {
        clientKey: 'q4_item1',
        type: 'input',
        inputMode: 'text',
        answer: '10000원',
        acceptedAnswers: ['10000원', '10000', '10000 원'],
        problemLabel: '(4)',
        responseLabel: '처음 금액',
        hints: ['처음 금액인 10000원을 쓰세요.', '10000원을 입력하세요.'],
        sourceText: '____이 ____으로 바뀌는 데',
        confidence: 0.99,
        position: { top: 77.0, left: 44.2, width: 6.5, height: 2.5 }
      },
      {
        clientKey: 'q4_item2',
        type: 'input',
        inputMode: 'text',
        answer: '45000원',
        acceptedAnswers: ['45000원', '45000', '45000 원'],
        problemLabel: '(4)',
        responseLabel: '목표 금액',
        hints: ['바뀐 금액인 45000원을 쓰세요.', '45000원을 입력하세요.'],
        sourceText: '____이 ____으로 바뀌는 데',
        confidence: 0.99,
        position: { top: 77.0, left: 53.0, width: 7.0, height: 2.5 }
      },
      {
        clientKey: 'q4_scale1',
        type: 'input',
        inputMode: 'text',
        answer: '\\frac{45000}{10000}',
        acceptedAnswers: ['\\frac{45000}{10000}', '\\frac{9}{2}', '45000/10000', '9/2', '4.5'],
        problemLabel: '(4)',
        responseLabel: '비교량 배율',
        hints: ['10000원에서 45000원으로 변한 배율입니다.', '45000/10000 또는 9/2를 입력하세요.'],
        sourceText: '____배가 되었으므로',
        confidence: 0.99,
        position: { top: 76.5, left: 69.5, width: 6.5, height: 3.0 }
      },
      {
        clientKey: 'q4_scale2',
        type: 'input',
        inputMode: 'text',
        answer: '\\frac{45000}{10000}',
        acceptedAnswers: ['\\frac{45000}{10000}', '\\frac{9}{2}', '45000/10000', '9/2', '4.5'],
        problemLabel: '(4)',
        responseLabel: '기준량 배율',
        hints: ['기준량에도 똑같이 곱해야 하는 배율입니다.', '45000/10000 또는 9/2를 입력하세요.'],
        sourceText: '기준량도 ____배가 되면',
        confidence: 0.99,
        position: { top: 80.5, left: 52.8, width: 6.5, height: 3.0 }
      },
      {
        clientKey: 'q4_calc',
        type: 'input',
        inputMode: 'text',
        answer: '2 \\times \\frac{45000}{10000} = 9',
        acceptedAnswers: ['2 \\times \\frac{45000}{10000} = 9', '2 \\times \\frac{9}{2} = 9', '2 \\times 4.5 = 9', '2 * 45000 / 10000 = 9', '2 * 9 / 2 = 9', '2 * 4.5 = 9', '9', '9kg', '9 kg'],
        problemLabel: '(4)',
        responseLabel: '풀이식과 결과',
        hints: ['2에 배율을 곱해 결과를 구하세요.', '2 × 45000/10000 = 9 를 입력하세요.'],
        sourceText: '따라서 __________________',
        confidence: 0.99,
        position: { top: 84.5, left: 50.5, width: 28.0, height: 2.5 }
      }
    ]
  },

  // Page 4: Slide 117
  {
    pageId: 'page_1787004239943_4',
    summary: '연습문제 3 - 비례식을 활용한 rate 문제 풀이 서술형/단답형',
    elements: [
      {
        clientKey: 'q1',
        type: 'input',
        inputMode: 'text',
        answer: '2100원',
        acceptedAnswers: ['2100원', '2100', '4900 \\times \\frac{3}{7} = 2100', '2100 원'],
        problemLabel: '(1)',
        responseLabel: '3봉지 가격',
        hints: ['1봉지 가격(4900 ÷ 7 = 700원)에 3을 곱하세요.', '4900 × 3/7 = 2100원 입니다.', '2100원을 입력하세요.'],
        sourceText: '과자 7봉지에 4900원일 때, 3봉지를 사려면 얼마를 내야 할까요?',
        confidence: 0.99,
        position: { top: 21.0, left: 35.0, width: 32.0, height: 5.5 }
      },
      {
        clientKey: 'q2',
        type: 'input',
        inputMode: 'text',
        answer: '10시간',
        acceptedAnswers: ['10시간', '10', '10h', '6 \\times \\frac{300}{180} = 10', '10 시간'],
        problemLabel: '(2)',
        responseLabel: '걸리는 시간',
        hints: ['시속(180 ÷ 6 = 30km/h)으로 300km를 나누세요.', '6 × 300/180 = 10시간 입니다.', '10시간을 입력하세요.'],
        sourceText: '180km를 6시간 동안 이동한 속도로 300km 이동하는 데 걸리는 시간은?',
        confidence: 0.99,
        position: { top: 40.5, left: 35.0, width: 32.0, height: 5.5 }
      },
      {
        clientKey: 'q3',
        type: 'input',
        inputMode: 'text',
        answer: '5940명',
        acceptedAnswers: ['5940명', '5940', '1800 \\times \\frac{99}{30} = 5940', '5940 명'],
        problemLabel: '(3)',
        responseLabel: '99%에 해당하는 인원',
        hints: ['1% 인원(1800 ÷ 30 = 60명)에 99를 곱하세요.', '1800 × 99/30 = 5940명 입니다.', '5940명을 입력하세요.'],
        sourceText: '30%인원이 1800명에 해당할 때, 99%는 몇 명일까요?',
        confidence: 0.99,
        position: { top: 59.5, left: 35.0, width: 32.0, height: 5.5 }
      },
      {
        clientKey: 'q4',
        type: 'input',
        inputMode: 'text',
        answer: '18kg',
        acceptedAnswers: ['18kg', '18', '2 \\times \\frac{45000}{5000} = 18', '18 kg'],
        problemLabel: '(4)',
        responseLabel: '살 수 있는 무게',
        hints: ['5000원의 9배가 45000원이므로 무게도 2kg의 9배입니다.', '2 × 45000/5000 = 18kg 입니다.', '18kg을 입력하세요.'],
        sourceText: '어떤 물건 2kg에 5000원일 때, 45000원에 몇 kg을 살 수 있을까요?',
        confidence: 0.99,
        position: { top: 78.5, left: 35.0, width: 32.0, height: 5.5 }
      }
    ]
  },

  // Page 5: Slide 118
  {
    pageId: 'page_1787004239943_5',
    summary: '연습문제 4 - 할인율을 활용한 할인 금액 구하기',
    elements: [
      {
        clientKey: 'q2',
        type: 'input',
        inputMode: 'text',
        answer: '500원',
        acceptedAnswers: ['500원', '500', '4500 \\times \\frac{10}{90} = 500', '500 원', '10%는 500원'],
        problemLabel: '(2)',
        responseLabel: '할인 받은 금액',
        hints: ['10% 할인 가격 4500원은 정가의 90%입니다.', '4500 × 10/90 = 500원 입니다.', '500원을 입력하세요.'],
        sourceText: '10% 할인해서 4500원에 샀다면, 얼마를 할인 받은 것인가요?',
        confidence: 0.99,
        position: { top: 46.0, left: 47.0, width: 38.0, height: 3.0 }
      },
      {
        clientKey: 'q3',
        type: 'input',
        inputMode: 'text',
        answer: '6000원',
        acceptedAnswers: ['6000원', '6000', '14000 \\times \\frac{30}{70} = 6000', '6000 원', '30%는 6000원'],
        problemLabel: '(3)',
        responseLabel: '할인 받은 금액',
        hints: ['30% 할인 가격 14000원은 정가의 70%입니다.', '14000 × 30/70 = 6000원 입니다.', '6000원을 입력하세요.'],
        sourceText: '30% 할인해서 14000원에 샀다면, 얼마를 할인 받은 것인가요?',
        confidence: 0.99,
        position: { top: 65.2, left: 47.0, width: 38.0, height: 3.0 }
      },
      {
        clientKey: 'q4',
        type: 'input',
        inputMode: 'text',
        answer: '20000원',
        acceptedAnswers: ['20000원', '20000', '5000 \\times \\frac{80}{20} = 20000', '20000 원', '80%는 20000원'],
        problemLabel: '(4)',
        responseLabel: '할인 받은 금액',
        hints: ['80% 할인 가격 5000원은 정가의 20%입니다.', '5000 × 80/20 = 20000원 입니다.', '20000원을 입력하세요.'],
        sourceText: '80% 할인해서 5000원에 샀다면, 얼마를 할인 받은 것인가요?',
        confidence: 0.99,
        position: { top: 84.5, left: 47.0, width: 38.0, height: 3.0 }
      }
    ]
  },

  // Page 6: Slide 119
  {
    pageId: 'page_1787004239943_6',
    summary: '연습문제 5 - 할인율과 판매 가격을 이용한 정가(100%) 구하기',
    elements: [
      {
        clientKey: 'q1',
        type: 'input',
        inputMode: 'text',
        answer: '2000원',
        acceptedAnswers: ['2000원', '2000', '1900 \\times \\frac{100}{95} = 2000', '2000 원', '정가는 2000원'],
        problemLabel: '(1)',
        responseLabel: '정가',
        hints: ['5% 할인 가격 1900원은 정가의 95%입니다.', '1900 × 100/95 = 2000원 입니다.', '2000원을 입력하세요.'],
        sourceText: '5% 할인해서 1900원에 샀다면, 정가는 얼마인가요?',
        confidence: 0.99,
        position: { top: 26.5, left: 47.0, width: 38.0, height: 3.0 }
      },
      {
        clientKey: 'q2',
        type: 'input',
        inputMode: 'text',
        answer: '7000원',
        acceptedAnswers: ['7000원', '7000', '6300 \\times \\frac{100}{90} = 7000', '7000 원', '정가는 7000원'],
        problemLabel: '(2)',
        responseLabel: '정가',
        hints: ['10% 할인 가격 6300원은 정가의 90%입니다.', '6300 × 100/90 = 7000원 입니다.', '7000원을 입력하세요.'],
        sourceText: '10% 할인해서 6300원에 샀다면, 정가는 얼마인가요?',
        confidence: 0.99,
        position: { top: 45.8, left: 47.0, width: 38.0, height: 3.0 }
      },
      {
        clientKey: 'q3',
        type: 'input',
        inputMode: 'text',
        answer: '20000원',
        acceptedAnswers: ['20000원', '20000', '14000 \\times \\frac{100}{70} = 20000', '20000 원', '정가는 20000원'],
        problemLabel: '(3)',
        responseLabel: '정가',
        hints: ['30% 할인 가격 14000원은 정가의 70%입니다.', '14000 × 100/70 = 20000원 입니다.', '20000원을 입력하세요.'],
        sourceText: '30% 할인해서 14000원에 샀다면, 정가는 얼마인가요?',
        confidence: 0.99,
        position: { top: 65.0, left: 47.0, width: 38.0, height: 3.0 }
      },
      {
        clientKey: 'q4',
        type: 'input',
        inputMode: 'text',
        answer: '25000원',
        acceptedAnswers: ['25000원', '25000', '5000 \\times \\frac{100}{20} = 25000', '25000 원', '정가는 25000원'],
        problemLabel: '(4)',
        responseLabel: '정가',
        hints: ['80% 할인 가격 5000원은 정가의 20%입니다.', '5000 × 100/20 = 25000원 입니다.', '25000원을 입력하세요.'],
        sourceText: '80% 할인해서 5000원에 샀다면, 정가는 얼마인가요?',
        confidence: 0.99,
        position: { top: 84.2, left: 47.0, width: 38.0, height: 3.0 }
      }
    ]
  }
];

export function generateTmpDraftJsonFiles() {
  for (const page of pagesData) {
    const payload = {
      schemaVersion: 2,
      unitId,
      pageId: page.pageId,
      analysis: {
        summary: page.summary,
        warnings: []
      },
      elements: page.elements
    };

    const outPath = `/private/tmp/workbook-draft-${unitId}-${page.pageId}.json`;
    fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf8');
    console.log(`Generated: ${outPath} (${page.elements.length} elements)`);
  }
}

if (process.argv[1]?.endsWith('generate-drafts-chap4-unit3.mjs')) {
  generateTmpDraftJsonFiles();
}
