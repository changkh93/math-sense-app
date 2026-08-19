import fs from 'node:fs';

const unitId = 'ratios_ratio_chap4_unit1';

const pagesData = [
  // Page 1: Slide 88
  {
    pageId: 'page_1787004185826_1',
    summary: '뜻풀이 문제 1, 2, 3 - ratio와 rate의 차이 (4지선다형)',
    elements: [
      {
        clientKey: 'q1',
        type: 'multiple-choice',
        answer: '④ rate(레이트)',
        options: ['① ratio(레이시오)', '② 못난이', '③ 미안합니다.', '④ rate(레이트)'],
        problemLabel: '뜻풀이 문제 1',
        responseLabel: '서로 다른 단위 간의 비율',
        hints: ['서로 다른 단위 간의 비교는 rate라고 합니다.', '④를 선택하세요.'],
        sourceText: '서로 다른 단위 간의 비율을 무엇이라고 합니까?',
        confidence: 0.99,
        position: { top: 49.0, left: 32.0, width: 54.0, height: 8.0 }
      },
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '③ 속력',
        options: ['① 증가율', '② 할인율', '③ 속력', '④ 슬프다. 묻지 말길'],
        problemLabel: '뜻풀이 문제 2',
        responseLabel: 'rate에 해당하는 것',
        hints: ['속력은 거리와 시간이라는 서로 다른 단위의 비율(rate)입니다.', '③을 선택하세요.'],
        sourceText: '다음 중 rate에 해당하는 것은?',
        confidence: 0.99,
        position: { top: 64.0, left: 32.0, width: 54.0, height: 8.0 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '② 시간',
        options: ['① 떨떠름한 것', '② 시간', '③ 길이', '④ 크고 많은 것'],
        problemLabel: '뜻풀이 문제 3',
        responseLabel: 'rate의 기준량',
        hints: ['rate에서는 주로 시간을 기준량으로 비교합니다.', '②를 선택하세요.'],
        sourceText: 'rate에서 주로 어떤 것을 기준량으로 합니까?',
        confidence: 0.99,
        position: { top: 79.0, left: 32.0, width: 54.0, height: 8.0 }
      }
    ]
  },

  // Page 2: Slide 89
  {
    pageId: 'page_1787004185826_2',
    summary: '뜻풀이 문제 4, 5, 6 - rate 표현과 기호 (4지선다형)',
    elements: [
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '③ per(퍼, ~당)',
        options: ['① 짝대기', '② 찍', '③ per(퍼, ~당)', '④ 꽥'],
        problemLabel: '뜻풀이 문제 4',
        responseLabel: '슬래시(/)의 읽기',
        hints: ['/(슬래시)는 비율을 나타낼 때 per(~당)라고 읽습니다.', '③을 선택하세요.'],
        sourceText: '60km/h에서 /(슬래시)를 어떻게 읽을까요?',
        confidence: 0.99,
        position: { top: 49.0, left: 32.0, width: 54.0, height: 8.0 }
      },
      {
        clientKey: 'q5',
        type: 'multiple-choice',
        answer: '① hour(아워, 시간)',
        options: ['① hour(아워, 시간)', '② hi(하이, 안녕)', '③ hhh(ㅎㅎㅎ)', '④ herl(헐)'],
        problemLabel: '뜻풀이 문제 5',
        responseLabel: 'h의 의미',
        hints: ['h는 hour(시간)를 뜻합니다.', '①을 선택하세요.'],
        sourceText: '60km/h에서 h가 뜻하는 것은 무엇인가요?',
        confidence: 0.99,
        position: { top: 64.0, left: 32.0, width: 54.0, height: 8.0 }
      },
      {
        clientKey: 'q6',
        type: 'multiple-choice',
        answer: '④ 80km/h',
        options: ['① 2hour', '② 60km', '③ 20km 60cm', '④ 80km/h'],
        problemLabel: '뜻풀이 문제 6',
        responseLabel: '속력 표현',
        hints: ['거리/시간 형태인 80km/h가 속력입니다.', '④를 선택하세요.'],
        sourceText: '다음 중 속력을 표현한 것은 어느 것인가요?',
        confidence: 0.99,
        position: { top: 79.0, left: 32.0, width: 54.0, height: 8.0 }
      }
    ]
  },

  // Page 3: Slide 90
  {
    pageId: 'page_1787004185826_3',
    summary: '읽기 문제 1 - 영어와 우리말로 속력 단위 읽기 (4지선다형)',
    elements: [
      // (2) 100km/h
      {
        clientKey: 'q2_en',
        type: 'multiple-choice',
        answer: '100km per hour',
        options: ['100km per hour', '100km hour', '100 per km', '100km per second'],
        problemLabel: '(2)-영어',
        responseLabel: '영어 읽기',
        hints: ['100km per hour로 읽습니다.', '100km per hour를 선택하세요.'],
        sourceText: '100km/h 영어',
        confidence: 0.99,
        position: { top: 41.5, left: 22.0, width: 20.0, height: 3.0 }
      },
      {
        clientKey: 'q2_ko',
        type: 'multiple-choice',
        answer: '시간 당 100km',
        options: ['시간 당 100km', '초 당 100km', '100km 당 1시간', '분 당 100km'],
        problemLabel: '(2)-우리말',
        responseLabel: '우리말 읽기',
        hints: ['시간 당 100km로 읽습니다.', '시간 당 100km를 선택하세요.'],
        sourceText: '100km/h 우리말',
        confidence: 0.99,
        position: { top: 45.5, left: 24.5, width: 20.0, height: 3.0 }
      },

      // (3) 12.3m/sec
      {
        clientKey: 'q3_en',
        type: 'multiple-choice',
        answer: '12.3m per second',
        options: ['12.3m per second', '12.3m per hour', '12.3 second per m', '12.3m per minute'],
        problemLabel: '(3)-영어',
        responseLabel: '영어 읽기',
        hints: ['12.3m per second로 읽습니다.', '12.3m per second를 선택하세요.'],
        sourceText: '12.3m/sec 영어',
        confidence: 0.99,
        position: { top: 61.5, left: 22.0, width: 20.0, height: 3.0 }
      },
      {
        clientKey: 'q3_ko',
        type: 'multiple-choice',
        answer: '초 당 12.3m',
        options: ['초 당 12.3m', '시간 당 12.3m', '분 당 12.3m', '12.3m 당 1초'],
        problemLabel: '(3)-우리말',
        responseLabel: '우리말 읽기',
        hints: ['초 당 12.3m로 읽습니다.', '초 당 12.3m를 선택하세요.'],
        sourceText: '12.3m/sec 우리말',
        confidence: 0.99,
        position: { top: 65.5, left: 24.5, width: 20.0, height: 3.0 }
      },

      // (4) 37.1km/h
      {
        clientKey: 'q4_en',
        type: 'multiple-choice',
        answer: '37.1km per hour',
        options: ['37.1km per hour', '37.1km per second', '37.1 hour per km', '37.1km per minute'],
        problemLabel: '(4)-영어',
        responseLabel: '영어 읽기',
        hints: ['37.1km per hour로 읽습니다.', '37.1km per hour를 선택하세요.'],
        sourceText: '37.1km/h 영어',
        confidence: 0.99,
        position: { top: 81.5, left: 22.0, width: 20.0, height: 3.0 }
      },
      {
        clientKey: 'q4_ko',
        type: 'multiple-choice',
        answer: '시간 당 37.1km',
        options: ['시간 당 37.1km', '초 당 37.1km', '분 당 37.1km', '37.1km 당 1시간'],
        problemLabel: '(4)-우리말',
        responseLabel: '우리말 읽기',
        hints: ['시간 당 37.1km로 읽습니다.', '시간 당 37.1km를 선택하세요.'],
        sourceText: '37.1km/h 우리말',
        confidence: 0.99,
        position: { top: 85.5, left: 24.5, width: 20.0, height: 3.0 }
      },

      // (6) 250km/h
      {
        clientKey: 'q6_en',
        type: 'multiple-choice',
        answer: '250km per hour',
        options: ['250km per hour', '250km per second', '250 hour per km', '250km per minute'],
        problemLabel: '(6)-영어',
        responseLabel: '영어 읽기',
        hints: ['250km per hour로 읽습니다.', '250km per hour를 선택하세요.'],
        sourceText: '250km/h 영어',
        confidence: 0.99,
        position: { top: 41.5, left: 59.5, width: 20.0, height: 3.0 }
      },
      {
        clientKey: 'q6_ko',
        type: 'multiple-choice',
        answer: '시간 당 250km',
        options: ['시간 당 250km', '초 당 250km', '분 당 250km', '250km 당 1시간'],
        problemLabel: '(6)-우리말',
        responseLabel: '우리말 읽기',
        hints: ['시간 당 250km로 읽습니다.', '시간 당 250km를 선택하세요.'],
        sourceText: '250km/h 우리말',
        confidence: 0.99,
        position: { top: 45.5, left: 62.0, width: 20.0, height: 3.0 }
      },

      // (7) 3.5m/sec
      {
        clientKey: 'q7_en',
        type: 'multiple-choice',
        answer: '3.5m per second',
        options: ['3.5m per second', '3.5m per hour', '3.5m per minute', '3.5 second per m'],
        problemLabel: '(7)-영어',
        responseLabel: '영어 읽기',
        hints: ['3.5m per second로 읽습니다.', '3.5m per second를 선택하세요.'],
        sourceText: '3.5m/sec 영어',
        confidence: 0.99,
        position: { top: 61.5, left: 59.5, width: 20.0, height: 3.0 }
      },
      {
        clientKey: 'q7_ko',
        type: 'multiple-choice',
        answer: '초 당 3.5m',
        options: ['초 당 3.5m', '시간 당 3.5m', '분 당 3.5m', '3.5m 당 1초'],
        problemLabel: '(7)-우리말',
        responseLabel: '우리말 읽기',
        hints: ['초 당 3.5m로 읽습니다.', '초 당 3.5m를 선택하세요.'],
        sourceText: '3.5m/sec 우리말',
        confidence: 0.99,
        position: { top: 65.5, left: 62.0, width: 20.0, height: 3.0 }
      },

      // (8) 9.9m/sec
      {
        clientKey: 'q8_en',
        type: 'multiple-choice',
        answer: '9.9m per second',
        options: ['9.9m per second', '9.9m per hour', '9.9m per minute', '9.9 second per m'],
        problemLabel: '(8)-영어',
        responseLabel: '영어 읽기',
        hints: ['9.9m per second로 읽습니다.', '9.9m per second를 선택하세요.'],
        sourceText: '9.9m/sec 영어',
        confidence: 0.99,
        position: { top: 81.5, left: 59.5, width: 20.0, height: 3.0 }
      },
      {
        clientKey: 'q8_ko',
        type: 'multiple-choice',
        answer: '초 당 9.9m',
        options: ['초 당 9.9m', '시간 당 9.9m', '분 당 9.9m', '9.9m 당 1초'],
        problemLabel: '(8)-우리말',
        responseLabel: '우리말 읽기',
        hints: ['초 당 9.9m로 읽습니다.', '초 당 9.9m를 선택하세요.'],
        sourceText: '9.9m/sec 우리말',
        confidence: 0.99,
        position: { top: 85.5, left: 62.0, width: 20.0, height: 3.0 }
      }
    ]
  },

  // Page 4: Slide 91
  {
    pageId: 'page_1787004185826_4',
    summary: '표현 문제 1 - rate를 간단히 표현하기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2_frac',
        type: 'multiple-choice',
        answer: '$\\frac{500\\text{km}}{5\\text{h}}$',
        options: ['$\\frac{500\\text{km}}{5\\text{h}}$', '$\\frac{5\\text{h}}{500\\text{km}}$', '$\\frac{100\\text{km}}{5\\text{h}}$', '$\\frac{500\\text{km}}{1\\text{h}}$'],
        problemLabel: '(2)-분수 형태',
        responseLabel: '분수 표현',
        hints: ['5시간에 500km이므로 500km / 5h입니다.', '$\\frac{500\\text{km}}{5\\text{h}}$를 선택하세요.'],
        sourceText: '분수 형태로 표현',
        confidence: 0.99,
        position: { top: 79.5, left: 19.0, width: 10.5, height: 6.0 }
      },
      {
        clientKey: 'q2_base1',
        type: 'multiple-choice',
        answer: '$\\frac{100\\text{km}}{1\\text{h}}$',
        options: ['$\\frac{100\\text{km}}{1\\text{h}}$', '$\\frac{500\\text{km}}{1\\text{h}}$', '$\\frac{50\\text{km}}{1\\text{h}}$', '$\\frac{1\\text{h}}{100\\text{km}}$'],
        problemLabel: '(2)-기준량 1',
        responseLabel: '기준량을 1로 만들기',
        hints: ['500 ÷ 5 = 100이므로 100km / 1h입니다.', '$\\frac{100\\text{km}}{1\\text{h}}$를 선택하세요.'],
        sourceText: '기준량 1로 만들기',
        confidence: 0.99,
        position: { top: 79.5, left: 45.0, width: 10.5, height: 6.0 }
      },
      {
        clientKey: 'q2_slash',
        type: 'multiple-choice',
        answer: '100km/h',
        options: ['100km/h', '500km/h', '100h/km', '50km/h'],
        problemLabel: '(2)-/ 사용',
        responseLabel: '1을 생략하고 / 사용',
        hints: ['1을 생략하고 /를 사용하면 100km/h입니다.', '100km/h를 선택하세요.'],
        sourceText: '1을 생략하고 / 사용',
        confidence: 0.99,
        position: { top: 79.5, left: 70.0, width: 13.0, height: 6.0 }
      }
    ]
  },

  // Page 5: Slide 92
  {
    pageId: 'page_1787004185826_5',
    summary: '표현 문제 2 - rate를 간단히 표현하기 (4지선다형)',
    elements: [
      // (2) 200km^2 면적에 400만명
      {
        clientKey: 'q2_frac',
        type: 'multiple-choice',
        answer: '$\\frac{400\\text{만명}}{200\\text{km}^2}$',
        options: ['$\\frac{400\\text{만명}}{200\\text{km}^2}$', '$\\frac{200\\text{km}^2}{400\\text{만명}}$', '$\\frac{2\\text{만명}}{200\\text{km}^2}$', '$\\frac{400\\text{만명}}{1\\text{km}^2}$'],
        problemLabel: '(2)-분수 형태',
        responseLabel: '분수 표현',
        hints: ['200km² 면적에 400만명이므로 400만명 / 200km²입니다.', '$\\frac{400\\text{만명}}{200\\text{km}^2}$를 선택하세요.'],
        sourceText: '200km² 면적에 400만명',
        confidence: 0.99,
        position: { top: 39.5, left: 19.0, width: 10.5, height: 6.0 }
      },
      {
        clientKey: 'q2_base1',
        type: 'multiple-choice',
        answer: '$\\frac{2\\text{만명}}{1\\text{km}^2}$',
        options: ['$\\frac{2\\text{만명}}{1\\text{km}^2}$', '$\\frac{20\\text{만명}}{1\\text{km}^2}$', '$\\frac{400\\text{만명}}{1\\text{km}^2}$', '$\\frac{1\\text{km}^2}{2\\text{만명}}$'],
        problemLabel: '(2)-기준량 1',
        responseLabel: '기준량을 1로 만들기',
        hints: ['400 ÷ 200 = 2이므로 2만명 / 1km²입니다.', '$\\frac{2\\text{만명}}{1\\text{km}^2}$를 선택하세요.'],
        sourceText: '기준량 1로 만들기',
        confidence: 0.99,
        position: { top: 39.5, left: 45.0, width: 10.5, height: 6.0 }
      },
      {
        clientKey: 'q2_slash',
        type: 'multiple-choice',
        answer: '2만명/km²',
        options: ['2만명/km²', '20만명/km²', '400만명/km²', '2km²/만명'],
        problemLabel: '(2)-/ 사용',
        responseLabel: '1을 생략하고 / 사용',
        hints: ['1을 생략하고 /를 쓰면 2만명/km²입니다.', '2만명/km²를 선택하세요.'],
        sourceText: '1을 생략하고 / 사용',
        confidence: 0.99,
        position: { top: 39.5, left: 70.0, width: 13.0, height: 6.0 }
      },

      // (3) 8 hour에 8만원
      {
        clientKey: 'q3_frac',
        type: 'multiple-choice',
        answer: '$\\frac{8\\text{만원}}{8\\text{h}}$',
        options: ['$\\frac{8\\text{만원}}{8\\text{h}}$', '$\\frac{8\\text{h}}{8\\text{만원}}$', '$\\frac{1\\text{만원}}{8\\text{h}}$', '$\\frac{8\\text{만원}}{1\\text{h}}$'],
        problemLabel: '(3)-분수 형태',
        responseLabel: '분수 표현',
        hints: ['8시간에 8만원이므로 8만원 / 8h입니다.', '$\\frac{8\\text{만원}}{8\\text{h}}$를 선택하세요.'],
        sourceText: '8 hour(시간)에 8만원',
        confidence: 0.99,
        position: { top: 59.5, left: 19.0, width: 10.5, height: 6.0 }
      },
      {
        clientKey: 'q3_base1',
        type: 'multiple-choice',
        answer: '$\\frac{1\\text{만원}}{1\\text{h}}$',
        options: ['$\\frac{1\\text{만원}}{1\\text{h}}$', '$\\frac{8\\text{만원}}{1\\text{h}}$', '$\\frac{10\\text{만원}}{1\\text{h}}$', '$\\frac{1\\text{h}}{1\\text{만원}}$'],
        problemLabel: '(3)-기준량 1',
        responseLabel: '기준량을 1로 만들기',
        hints: ['8 ÷ 8 = 1이므로 1만원 / 1h입니다.', '$\\frac{1\\text{만원}}{1\\text{h}}$를 선택하세요.'],
        sourceText: '기준량 1로 만들기',
        confidence: 0.99,
        position: { top: 59.5, left: 45.0, width: 10.5, height: 6.0 }
      },
      {
        clientKey: 'q3_slash',
        type: 'multiple-choice',
        answer: '1만원/h',
        options: ['1만원/h', '8만원/h', '10만원/h', '1h/만원'],
        problemLabel: '(3)-/ 사용',
        responseLabel: '1을 생략하고 / 사용',
        hints: ['1을 생략하고 /를 쓰면 1만원/h입니다.', '1만원/h를 선택하세요.'],
        sourceText: '1을 생략하고 / 사용',
        confidence: 0.99,
        position: { top: 59.5, left: 70.0, width: 13.0, height: 6.0 }
      },

      // (4) 2 hour에 140km
      {
        clientKey: 'q4_frac',
        type: 'multiple-choice',
        answer: '$\\frac{140\\text{km}}{2\\text{h}}$',
        options: ['$\\frac{140\\text{km}}{2\\text{h}}$', '$\\frac{2\\text{h}}{140\\text{km}}$', '$\\frac{70\\text{km}}{2\\text{h}}$', '$\\frac{140\\text{km}}{1\\text{h}}$'],
        problemLabel: '(4)-분수 형태',
        responseLabel: '분수 표현',
        hints: ['2시간에 140km이므로 140km / 2h입니다.', '$\\frac{140\\text{km}}{2\\text{h}}$를 선택하세요.'],
        sourceText: '2 hour(시간)에 140km',
        confidence: 0.99,
        position: { top: 79.5, left: 19.0, width: 10.5, height: 6.0 }
      },
      {
        clientKey: 'q4_base1',
        type: 'multiple-choice',
        answer: '$\\frac{70\\text{km}}{1\\text{h}}$',
        options: ['$\\frac{70\\text{km}}{1\\text{h}}$', '$\\frac{140\\text{km}}{1\\text{h}}$', '$\\frac{35\\text{km}}{1\\text{h}}$', '$\\frac{1\\text{h}}{70\\text{km}}$'],
        problemLabel: '(4)-기준량 1',
        responseLabel: '기준량을 1로 만들기',
        hints: ['140 ÷ 2 = 70이므로 70km / 1h입니다.', '$\\frac{70\\text{km}}{1\\text{h}}$를 선택하세요.'],
        sourceText: '기준량 1로 만들기',
        confidence: 0.99,
        position: { top: 79.5, left: 45.0, width: 10.5, height: 6.0 }
      },
      {
        clientKey: 'q4_slash',
        type: 'multiple-choice',
        answer: '70km/h',
        options: ['70km/h', '140km/h', '35km/h', '70h/km'],
        problemLabel: '(4)-/ 사용',
        responseLabel: '1을 생략하고 / 사용',
        hints: ['1을 생략하고 /를 쓰면 70km/h입니다.', '70km/h를 선택하세요.'],
        sourceText: '1을 생략하고 / 사용',
        confidence: 0.99,
        position: { top: 79.5, left: 70.0, width: 13.0, height: 6.0 }
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
