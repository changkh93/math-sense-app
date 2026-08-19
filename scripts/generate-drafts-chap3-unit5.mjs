import fs from 'node:fs';

const unitId = 'ratios_ratio_chap3_unit5';

const pagesData = [
  // Page 1: Slide 44
  {
    pageId: 'page_1787004065060_1',
    summary: '뜻풀이 문제 1, 2, 3 - 단위의 의미 (4지선다형)',
    elements: [
      {
        clientKey: 'q1',
        type: 'multiple-choice',
        answer: '③ 잴 때 기초가 되는 기준',
        options: ['① 단단한 바위', '② 아무도 모를 걸', '③ 잴 때 기초가 되는 기준', '④ 아무도 안 가르쳐 줬어'],
        problemLabel: '뜻풀이 문제 1',
        responseLabel: '단위의 뜻',
        hints: ['단위는 길이나 양을 잴 때 기준이 되는 양입니다.', '③을 선택하세요.'],
        sourceText: '단위(單位)의 뜻은 무엇인가요?',
        confidence: 0.99,
        position: { top: 49.0, left: 32.0, width: 54.0, height: 8.0 }
      },
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '① 단위를 정해서 세어본다.',
        options: ['① 단위를 정해서 세어본다.', '② 대충 찍어 본다', '③ 알 필요 없다.', '④ 상상해본다.'],
        problemLabel: '뜻풀이 문제 2',
        responseLabel: '둘레를 재는 방법',
        hints: ['기준(단위)을 정해 몇 개인지 세어 잽니다.', '①을 선택하세요.'],
        sourceText: '땅의 둘레를 어떻게 재면 될까요?',
        confidence: 0.99,
        position: { top: 64.0, left: 32.0, width: 54.0, height: 8.0 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '② unit',
        options: ['① apple', '② unit', '③ hate', '④ crazy'],
        problemLabel: '뜻풀이 문제 3',
        responseLabel: '단위의 영어 표현',
        hints: ['단위는 영어로 unit이라고 부릅니다.', '②를 선택하세요.'],
        sourceText: '영어로 단위를 무엇이라고 합니까?',
        confidence: 0.99,
        position: { top: 79.0, left: 32.0, width: 54.0, height: 8.0 }
      }
    ]
  },

  // Page 2: Slide 45
  {
    pageId: 'page_1787004065060_2',
    summary: '뜻풀이 문제 4, 5, 6 - 미터법 접두어 의미 (4지선다형)',
    elements: [
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '① measure(재다)',
        options: ['① measure(재다)', '② michin(미친)', '③ monkey(원숭이)', '④ merong(메롱)'],
        problemLabel: '뜻풀이 문제 4',
        responseLabel: '미터의 어원',
        hints: ['미터(metre)는 재다(measure)에서 유래했습니다.', '①을 선택하세요.'],
        sourceText: '미터(metre)는 어떤 단어에서 유래한 것입니까?',
        confidence: 0.99,
        position: { top: 49.0, left: 32.0, width: 54.0, height: 8.0 }
      },
      {
        clientKey: 'q5',
        type: 'multiple-choice',
        answer: '④ 1000(천)',
        options: ['① 죽이다(kill)', '② ㅋㅋㅋ', '③ 무겁다', '④ 1000(천)'],
        problemLabel: '뜻풀이 문제 5',
        responseLabel: 'Kilo(킬로)의 뜻',
        hints: ['킬로(kilo)는 1000(천)을 뜻합니다.', '④를 선택하세요.'],
        sourceText: 'Kilo(킬로)의 뜻이 무엇입니까?',
        confidence: 0.99,
        position: { top: 64.0, left: 32.0, width: 54.0, height: 8.0 }
      },
      {
        clientKey: 'q6',
        type: 'multiple-choice',
        answer: '② 100분의 1',
        options: ['① 작다', '② 100분의 1', '③ 힘 센티를 낸다', '④ 맙소사!'],
        problemLabel: '뜻풀이 문제 6',
        responseLabel: 'Centi(센티)의 뜻',
        hints: ['센티(centi)는 100분의 1을 뜻합니다.', '②를 선택하세요.'],
        sourceText: 'Centi(센티)의 뜻이 무엇입니까?',
        confidence: 0.99,
        position: { top: 79.0, left: 32.0, width: 54.0, height: 8.0 }
      }
    ]
  },

  // Page 3: Slide 46
  {
    pageId: 'page_1787004065060_3',
    summary: '읽기 문제 1 - km를 우리말로 읽기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '6천 미터',
        options: ['6천 미터', '6백 미터', '6만 미터', '6 미터'],
        problemLabel: '(2)',
        responseLabel: '읽기',
        hints: ['k는 천이므로 6천 미터입니다.', '6천 미터를 선택하세요.'],
        sourceText: '6km',
        confidence: 0.99,
        position: { top: 43.5, left: 21.0, width: 20.0, height: 3.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '1천 미터',
        options: ['1천 미터', '1백 미터', '10천 미터', '1 미터'],
        problemLabel: '(3)',
        responseLabel: '읽기',
        hints: ['k는 천이므로 1천 미터입니다.', '1천 미터를 선택하세요.'],
        sourceText: '1km',
        confidence: 0.99,
        position: { top: 63.5, left: 21.0, width: 20.0, height: 3.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '3천 미터',
        options: ['3천 미터', '3백 미터', '30천 미터', '3 미터'],
        problemLabel: '(4)',
        responseLabel: '읽기',
        hints: ['k는 천이므로 3천 미터입니다.', '3천 미터를 선택하세요.'],
        sourceText: '3km',
        confidence: 0.99,
        position: { top: 83.5, left: 21.0, width: 20.0, height: 3.5 }
      },
      {
        clientKey: 'q5',
        type: 'multiple-choice',
        answer: '5천 미터',
        options: ['5천 미터', '5백 미터', '5만 미터', '5 미터'],
        problemLabel: '(5)',
        responseLabel: '읽기',
        hints: ['k는 천이므로 5천 미터입니다.', '5천 미터를 선택하세요.'],
        sourceText: '5km',
        confidence: 0.99,
        position: { top: 23.5, left: 59.0, width: 20.0, height: 3.5 }
      },
      {
        clientKey: 'q6',
        type: 'multiple-choice',
        answer: '7천 미터',
        options: ['7천 미터', '7백 미터', '7만 미터', '7 미터'],
        problemLabel: '(6)',
        responseLabel: '읽기',
        hints: ['k는 천이므로 7천 미터입니다.', '7천 미터를 선택하세요.'],
        sourceText: '7km',
        confidence: 0.99,
        position: { top: 43.5, left: 59.0, width: 20.0, height: 3.5 }
      },
      {
        clientKey: 'q7',
        type: 'multiple-choice',
        answer: '9천 미터',
        options: ['9천 미터', '9백 미터', '9만 미터', '9 미터'],
        problemLabel: '(7)',
        responseLabel: '읽기',
        hints: ['k는 천이므로 9천 미터입니다.', '9천 미터를 선택하세요.'],
        sourceText: '9km',
        confidence: 0.99,
        position: { top: 63.5, left: 59.0, width: 20.0, height: 3.5 }
      },
      {
        clientKey: 'q8',
        type: 'multiple-choice',
        answer: '8천 미터',
        options: ['8천 미터', '8백 미터', '8만 미터', '8 미터'],
        problemLabel: '(8)',
        responseLabel: '읽기',
        hints: ['k는 천이므로 8천 미터입니다.', '8천 미터를 선택하세요.'],
        sourceText: '8km',
        confidence: 0.99,
        position: { top: 83.5, left: 59.0, width: 20.0, height: 3.5 }
      }
    ]
  },

  // Page 4: Slide 47
  {
    pageId: 'page_1787004065060_4',
    summary: '읽기 문제 2 - cm를 우리말로 읽기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '60번, 백분의 일 미터',
        options: ['60번, 백분의 일 미터', '60번, 천분의 일 미터', '6번, 백분의 일 미터', '60 미터'],
        problemLabel: '(2)',
        responseLabel: '읽기',
        hints: ['c는 백분의 일이므로 60번, 백분의 일 미터입니다.', '60번, 백분의 일 미터를 선택하세요.'],
        sourceText: '60cm',
        confidence: 0.99,
        position: { top: 43.5, left: 18.0, width: 26.0, height: 3.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '11번, 백분의 일 미터',
        options: ['11번, 백분의 일 미터', '11번, 천분의 일 미터', '1번, 백분의 일 미터', '11 미터'],
        problemLabel: '(3)',
        responseLabel: '읽기',
        hints: ['c는 백분의 일이므로 11번, 백분의 일 미터입니다.', '11번, 백분의 일 미터를 선택하세요.'],
        sourceText: '11cm',
        confidence: 0.99,
        position: { top: 63.5, left: 18.0, width: 26.0, height: 3.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '3번, 백분의 일 미터',
        options: ['3번, 백분의 일 미터', '3번, 천분의 일 미터', '30번, 백분의 일 미터', '3 미터'],
        problemLabel: '(4)',
        responseLabel: '읽기',
        hints: ['c는 백분의 일이므로 3번, 백분의 일 미터입니다.', '3번, 백분의 일 미터를 선택하세요.'],
        sourceText: '3cm',
        confidence: 0.99,
        position: { top: 83.5, left: 18.0, width: 26.0, height: 3.5 }
      },
      {
        clientKey: 'q5',
        type: 'multiple-choice',
        answer: '5번, 백분의 일 미터',
        options: ['5번, 백분의 일 미터', '5번, 천분의 일 미터', '50번, 백분의 일 미터', '5 미터'],
        problemLabel: '(5)',
        responseLabel: '읽기',
        hints: ['c는 백분의 일이므로 5번, 백분의 일 미터입니다.', '5번, 백분의 일 미터를 선택하세요.'],
        sourceText: '5cm',
        confidence: 0.99,
        position: { top: 23.5, left: 55.5, width: 26.0, height: 3.5 }
      },
      {
        clientKey: 'q6',
        type: 'multiple-choice',
        answer: '100번, 백분의 일 미터',
        options: ['100번, 백분의 일 미터', '100번, 천분의 일 미터', '10번, 백분의 일 미터', '100 미터'],
        problemLabel: '(6)',
        responseLabel: '읽기',
        hints: ['c는 백분의 일이므로 100번, 백분의 일 미터입니다.', '100번, 백분의 일 미터를 선택하세요.'],
        sourceText: '100cm',
        confidence: 0.99,
        position: { top: 43.5, left: 55.5, width: 26.0, height: 3.5 }
      },
      {
        clientKey: 'q7',
        type: 'multiple-choice',
        answer: '99번, 백분의 일 미터',
        options: ['99번, 백분의 일 미터', '99번, 천분의 일 미터', '9번, 백분의 일 미터', '99 미터'],
        problemLabel: '(7)',
        responseLabel: '읽기',
        hints: ['c는 백분의 일이므로 99번, 백분의 일 미터입니다.', '99번, 백분의 일 미터를 선택하세요.'],
        sourceText: '99cm',
        confidence: 0.99,
        position: { top: 63.5, left: 55.5, width: 26.0, height: 3.5 }
      },
      {
        clientKey: 'q8',
        type: 'multiple-choice',
        answer: '18번, 백분의 일 미터',
        options: ['18번, 백분의 일 미터', '18번, 천분의 일 미터', '8번, 백분의 일 미터', '18 미터'],
        problemLabel: '(8)',
        responseLabel: '읽기',
        hints: ['c는 백분의 일이므로 18번, 백분의 일 미터입니다.', '18번, 백분의 일 미터를 선택하세요.'],
        sourceText: '18cm',
        confidence: 0.99,
        position: { top: 83.5, left: 55.5, width: 26.0, height: 3.5 }
      }
    ]
  },

  // Page 5: Slide 48
  {
    pageId: 'page_1787004065060_5',
    summary: '읽기 문제 3 - mm를 우리말로 읽기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '6060번, 천분의 일 미터',
        options: ['6060번, 천분의 일 미터', '6060번, 백분의 일 미터', '606번, 천분의 일 미터', '6060 미터'],
        problemLabel: '(2)',
        responseLabel: '읽기',
        hints: ['m(milli)는 천분의 일이므로 6060번, 천분의 일 미터입니다.', '6060번, 천분의 일 미터를 선택하세요.'],
        sourceText: '6060mm',
        confidence: 0.99,
        position: { top: 43.5, left: 18.0, width: 26.0, height: 3.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '111번, 천분의 일 미터',
        options: ['111번, 천분의 일 미터', '111번, 백분의 일 미터', '11번, 천분의 일 미터', '111 미터'],
        problemLabel: '(3)',
        responseLabel: '읽기',
        hints: ['m(milli)는 천분의 일이므로 111번, 천분의 일 미터입니다.', '111번, 천분의 일 미터를 선택하세요.'],
        sourceText: '111mm',
        confidence: 0.99,
        position: { top: 63.5, left: 18.0, width: 26.0, height: 3.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '30번, 천분의 일 미터',
        options: ['30번, 천분의 일 미터', '30번, 백분의 일 미터', '3번, 천분의 일 미터', '30 미터'],
        problemLabel: '(4)',
        responseLabel: '읽기',
        hints: ['m(milli)는 천분의 일이므로 30번, 천분의 일 미터입니다.', '30번, 천분의 일 미터를 선택하세요.'],
        sourceText: '30mm',
        confidence: 0.99,
        position: { top: 83.5, left: 18.0, width: 26.0, height: 3.5 }
      },
      {
        clientKey: 'q5',
        type: 'multiple-choice',
        answer: '550번, 천분의 일 미터',
        options: ['550번, 천분의 일 미터', '550번, 백분의 일 미터', '55번, 천분의 일 미터', '550 미터'],
        problemLabel: '(5)',
        responseLabel: '읽기',
        hints: ['m(milli)는 천분의 일이므로 550번, 천분의 일 미터입니다.', '550번, 천분의 일 미터를 선택하세요.'],
        sourceText: '550mm',
        confidence: 0.99,
        position: { top: 23.5, left: 55.5, width: 26.0, height: 3.5 }
      },
      {
        clientKey: 'q6',
        type: 'multiple-choice',
        answer: '100번, 천분의 일 미터',
        options: ['100번, 천분의 일 미터', '100번, 백분의 일 미터', '10번, 천분의 일 미터', '100 미터'],
        problemLabel: '(6)',
        responseLabel: '읽기',
        hints: ['m(milli)는 천분의 일이므로 100번, 천분의 일 미터입니다.', '100번, 천분의 일 미터를 선택하세요.'],
        sourceText: '100mm',
        confidence: 0.99,
        position: { top: 43.5, left: 55.5, width: 26.0, height: 3.5 }
      },
      {
        clientKey: 'q7',
        type: 'multiple-choice',
        answer: '9999번, 천분의 일 미터',
        options: ['9999번, 천분의 일 미터', '9999번, 백분의 일 미터', '999번, 천분의 일 미터', '9999 미터'],
        problemLabel: '(7)',
        responseLabel: '읽기',
        hints: ['m(milli)는 천분의 일이므로 9999번, 천분의 일 미터입니다.', '9999번, 천분의 일 미터를 선택하세요.'],
        sourceText: '9999mm',
        confidence: 0.99,
        position: { top: 63.5, left: 55.5, width: 26.0, height: 3.5 }
      },
      {
        clientKey: 'q8',
        type: 'multiple-choice',
        answer: '18번, 천분의 일 미터',
        options: ['18번, 천분의 일 미터', '18번, 백분의 일 미터', '8번, 천분의 일 미터', '18 미터'],
        problemLabel: '(8)',
        responseLabel: '읽기',
        hints: ['m(milli)는 천분의 일이므로 18번, 천분의 일 미터입니다.', '18번, 천분의 일 미터를 선택하세요.'],
        sourceText: '18mm',
        confidence: 0.99,
        position: { top: 83.5, left: 55.5, width: 26.0, height: 3.5 }
      }
    ]
  },

  // Page 6: Slide 49
  {
    pageId: 'page_1787004065060_6',
    summary: '표현문제 1 - k, c, m 사용하여 간단히 표현하기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '3km',
        options: ['3km', '30km', '300m', '3m'],
        problemLabel: '(2)',
        responseLabel: '간단히 표현',
        hints: ['3천 미터는 3km입니다.', '3km를 선택하세요.'],
        sourceText: '3천 미터',
        confidence: 0.99,
        position: { top: 43.5, left: 21.0, width: 20.0, height: 3.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '1m',
        options: ['1m', '1km', '1cm', '1mm'],
        problemLabel: '(3)',
        responseLabel: '간단히 표현',
        hints: ['1 metre는 1m입니다.', '1m를 선택하세요.'],
        sourceText: '1 metre',
        confidence: 0.99,
        position: { top: 63.5, left: 21.0, width: 20.0, height: 3.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '7.5km 혹은 7500m',
        options: ['7.5km 혹은 7500m', '75km', '750m', '7.5m'],
        problemLabel: '(4)',
        responseLabel: '간단히 표현',
        hints: ['7500 metre는 7.5km 또는 7500m입니다.', '7.5km 혹은 7500m를 선택하세요.'],
        sourceText: '7500 metre',
        confidence: 0.99,
        position: { top: 83.5, left: 21.0, width: 20.0, height: 3.5 }
      },
      {
        clientKey: 'q6',
        type: 'multiple-choice',
        answer: '10km',
        options: ['10km', '1km', '100km', '1000m'],
        problemLabel: '(6)',
        responseLabel: '간단히 표현',
        hints: ['1만 미터는 10km입니다.', '10km를 선택하세요.'],
        sourceText: '1만 미터',
        confidence: 0.99,
        position: { top: 43.5, left: 59.0, width: 20.0, height: 3.5 }
      },
      {
        clientKey: 'q7',
        type: 'multiple-choice',
        answer: '5000m 혹은 5km',
        options: ['5000m 혹은 5km', '50km', '500m', '5m'],
        problemLabel: '(7)',
        responseLabel: '간단히 표현',
        hints: ['5000 metre는 5000m 또는 5km입니다.', '5000m 혹은 5km를 선택하세요.'],
        sourceText: '5000 metre',
        confidence: 0.99,
        position: { top: 63.5, left: 59.0, width: 20.0, height: 3.5 }
      },
      {
        clientKey: 'q8',
        type: 'multiple-choice',
        answer: '24000m 혹은 24km',
        options: ['24000m 혹은 24km', '2.4km', '240km', '2400m'],
        problemLabel: '(8)',
        responseLabel: '간단히 표현',
        hints: ['24000 metre는 24000m 또는 24km입니다.', '24000m 혹은 24km를 선택하세요.'],
        sourceText: '24000 metre',
        confidence: 0.99,
        position: { top: 83.5, left: 59.0, width: 20.0, height: 3.5 }
      }
    ]
  },

  // Page 7: Slide 50
  {
    pageId: 'page_1787004065060_7',
    summary: '읽기 문제 4 - cm를 우리말로 읽기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '백분의 육 미터',
        options: ['백분의 육 미터', '천분의 육 미터', '육 미터', '십분의 육 미터'],
        problemLabel: '(2)',
        responseLabel: '읽기',
        hints: ['6cm는 백분의 육 미터입니다.', '백분의 육 미터를 선택하세요.'],
        sourceText: '6cm',
        confidence: 0.99,
        position: { top: 43.5, left: 21.0, width: 20.0, height: 3.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '백분의 일 미터',
        options: ['백분의 일 미터', '천분의 일 미터', '일 미터', '십분의 일 미터'],
        problemLabel: '(3)',
        responseLabel: '읽기',
        hints: ['1cm는 백분의 일 미터입니다.', '백분의 일 미터를 선택하세요.'],
        sourceText: '1cm',
        confidence: 0.99,
        position: { top: 63.5, left: 21.0, width: 20.0, height: 3.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '백분의 삼 미터',
        options: ['백분의 삼 미터', '천분의 삼 미터', '삼 미터', '십분의 삼 미터'],
        problemLabel: '(4)',
        responseLabel: '읽기',
        hints: ['3cm는 백분의 삼 미터입니다.', '백분의 삼 미터를 선택하세요.'],
        sourceText: '3cm',
        confidence: 0.99,
        position: { top: 83.5, left: 21.0, width: 20.0, height: 3.5 }
      },
      {
        clientKey: 'q5',
        type: 'multiple-choice',
        answer: '백분의 오 미터',
        options: ['백분의 오 미터', '천분의 오 미터', '오 미터', '십분의 오 미터'],
        problemLabel: '(5)',
        responseLabel: '읽기',
        hints: ['5cm는 백분의 오 미터입니다.', '백분의 오 미터를 선택하세요.'],
        sourceText: '5cm',
        confidence: 0.99,
        position: { top: 23.5, left: 59.0, width: 20.0, height: 3.5 }
      },
      {
        clientKey: 'q6',
        type: 'multiple-choice',
        answer: '백분의 칠 미터',
        options: ['백분의 칠 미터', '천분의 칠 미터', '칠 미터', '십분의 칠 미터'],
        problemLabel: '(6)',
        responseLabel: '읽기',
        hints: ['7cm는 백분의 칠 미터입니다.', '백분의 칠 미터를 선택하세요.'],
        sourceText: '7cm',
        confidence: 0.99,
        position: { top: 43.5, left: 59.0, width: 20.0, height: 3.5 }
      },
      {
        clientKey: 'q7',
        type: 'multiple-choice',
        answer: '백분의 구 미터',
        options: ['백분의 구 미터', '천분의 구 미터', '구 미터', '십분의 구 미터'],
        problemLabel: '(7)',
        responseLabel: '읽기',
        hints: ['9cm는 백분의 구 미터입니다.', '백분의 구 미터를 선택하세요.'],
        sourceText: '9cm',
        confidence: 0.99,
        position: { top: 63.5, left: 59.0, width: 20.0, height: 3.5 }
      },
      {
        clientKey: 'q8',
        type: 'multiple-choice',
        answer: '백분의 팔 미터',
        options: ['백분의 팔 미터', '천분의 팔 미터', '팔 미터', '십분의 팔 미터'],
        problemLabel: '(8)',
        responseLabel: '읽기',
        hints: ['8cm는 백분의 팔 미터입니다.', '백분의 팔 미터를 선택하세요.'],
        sourceText: '8cm',
        confidence: 0.99,
        position: { top: 83.5, left: 59.0, width: 20.0, height: 3.5 }
      }
    ]
  },

  // Page 8: Slide 51
  {
    pageId: 'page_1787004065060_8',
    summary: '표현 문제 2 - cm 단위로 간단히 표현하기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '3cm',
        options: ['3cm', '30cm', '3mm', '0.3cm'],
        problemLabel: '(2)',
        responseLabel: '간단히 표현',
        hints: ['3/100 metre는 3cm입니다.', '3cm를 선택하세요.'],
        sourceText: '3/100 metre',
        confidence: 0.99,
        position: { top: 43.5, left: 21.0, width: 20.0, height: 3.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '100cm 혹은 1m',
        options: ['100cm 혹은 1m', '10cm', '1000cm', '1cm'],
        problemLabel: '(3)',
        responseLabel: '간단히 표현',
        hints: ['100/100 metre는 100cm 또는 1m입니다.', '100cm 혹은 1m를 선택하세요.'],
        sourceText: '100/100 metre',
        confidence: 0.99,
        position: { top: 63.5, left: 21.0, width: 20.0, height: 3.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '1cm',
        options: ['1cm', '10cm', '0.1cm', '1mm'],
        problemLabel: '(4)',
        responseLabel: '간단히 표현',
        hints: ['0.01 metre는 1cm입니다.', '1cm를 선택하세요.'],
        sourceText: '0.01 metre',
        confidence: 0.99,
        position: { top: 83.5, left: 21.0, width: 20.0, height: 3.5 }
      },
      {
        clientKey: 'q6',
        type: 'multiple-choice',
        answer: '20cm',
        options: ['20cm', '2cm', '200cm', '2mm'],
        problemLabel: '(6)',
        responseLabel: '간단히 표현',
        hints: ['0.2 metre는 20cm입니다.', '20cm를 선택하세요.'],
        sourceText: '0.2 metre',
        confidence: 0.99,
        position: { top: 43.5, left: 59.0, width: 20.0, height: 3.5 }
      },
      {
        clientKey: 'q7',
        type: 'multiple-choice',
        answer: '99cm',
        options: ['99cm', '9.9cm', '990cm', '99mm'],
        problemLabel: '(7)',
        responseLabel: '간단히 표현',
        hints: ['99/100 metre는 99cm입니다.', '99cm를 선택하세요.'],
        sourceText: '99/100 metre',
        confidence: 0.99,
        position: { top: 63.5, left: 59.0, width: 20.0, height: 3.5 }
      },
      {
        clientKey: 'q8',
        type: 'multiple-choice',
        answer: '11cm',
        options: ['11cm', '1.1cm', '110cm', '11mm'],
        problemLabel: '(8)',
        responseLabel: '간단히 표현',
        hints: ['0.11 metre는 11cm입니다.', '11cm를 선택하세요.'],
        sourceText: '0.11 metre',
        confidence: 0.99,
        position: { top: 83.5, left: 59.0, width: 20.0, height: 3.5 }
      }
    ]
  },

  // Page 9: Slide 52
  {
    pageId: 'page_1787004065060_9',
    summary: '읽기 문제 5 - mm를 우리말로 읽기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '천분의 육 미터',
        options: ['천분의 육 미터', '백분의 육 미터', '육 미터', '십분의 육 미터'],
        problemLabel: '(2)',
        responseLabel: '읽기',
        hints: ['6mm는 천분의 육 미터입니다.', '천분의 육 미터를 선택하세요.'],
        sourceText: '6mm',
        confidence: 0.99,
        position: { top: 43.5, left: 21.0, width: 20.0, height: 3.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '천분의 일 미터',
        options: ['천분의 일 미터', '백분의 일 미터', '일 미터', '십분의 일 미터'],
        problemLabel: '(3)',
        responseLabel: '읽기',
        hints: ['1mm는 천분의 일 미터입니다.', '천분의 일 미터를 선택하세요.'],
        sourceText: '1mm',
        confidence: 0.99,
        position: { top: 63.5, left: 21.0, width: 20.0, height: 3.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '천분의 삼 미터',
        options: ['천분의 삼 미터', '백분의 삼 미터', '삼 미터', '십분의 삼 미터'],
        problemLabel: '(4)',
        responseLabel: '읽기',
        hints: ['3mm는 천분의 삼 미터입니다.', '천분의 삼 미터를 선택하세요.'],
        sourceText: '3mm',
        confidence: 0.99,
        position: { top: 83.5, left: 21.0, width: 20.0, height: 3.5 }
      },
      {
        clientKey: 'q5',
        type: 'multiple-choice',
        answer: '천분의 오 미터',
        options: ['천분의 오 미터', '백분의 오 미터', '오 미터', '십분의 오 미터'],
        problemLabel: '(5)',
        responseLabel: '읽기',
        hints: ['5mm는 천분의 오 미터입니다.', '천분의 오 미터를 선택하세요.'],
        sourceText: '5mm',
        confidence: 0.99,
        position: { top: 23.5, left: 59.0, width: 20.0, height: 3.5 }
      },
      {
        clientKey: 'q6',
        type: 'multiple-choice',
        answer: '천분의 칠 미터',
        options: ['천분의 칠 미터', '백분의 칠 미터', '칠 미터', '십분의 칠 미터'],
        problemLabel: '(6)',
        responseLabel: '읽기',
        hints: ['7mm는 천분의 칠 미터입니다.', '천분의 칠 미터를 선택하세요.'],
        sourceText: '7mm',
        confidence: 0.99,
        position: { top: 43.5, left: 59.0, width: 20.0, height: 3.5 }
      },
      {
        clientKey: 'q7',
        type: 'multiple-choice',
        answer: '천분의 구 미터',
        options: ['천분의 구 미터', '백분의 구 미터', '구 미터', '십분의 구 미터'],
        problemLabel: '(7)',
        responseLabel: '읽기',
        hints: ['9mm는 천분의 구 미터입니다.', '천분의 구 미터를 선택하세요.'],
        sourceText: '9mm',
        confidence: 0.99,
        position: { top: 63.5, left: 59.0, width: 20.0, height: 3.5 }
      },
      {
        clientKey: 'q8',
        type: 'multiple-choice',
        answer: '천분의 팔 미터',
        options: ['천분의 팔 미터', '백분의 팔 미터', '팔 미터', '십분의 팔 미터'],
        problemLabel: '(8)',
        responseLabel: '읽기',
        hints: ['8mm는 천분의 팔 미터입니다.', '천분의 팔 미터를 선택하세요.'],
        sourceText: '8mm',
        confidence: 0.99,
        position: { top: 83.5, left: 59.0, width: 20.0, height: 3.5 }
      }
    ]
  },

  // Page 10: Slide 53
  {
    pageId: 'page_1787004065060_10',
    summary: '표현문제 3 - mm 단위로 간단히 표현하기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '3mm',
        options: ['3mm', '30mm', '0.3mm', '3cm'],
        problemLabel: '(2)',
        responseLabel: '간단히 표현',
        hints: ['3/1000 metre는 3mm입니다.', '3mm를 선택하세요.'],
        sourceText: '3/1000 metre',
        confidence: 0.99,
        position: { top: 43.5, left: 21.0, width: 20.0, height: 3.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '1000mm 혹은 1m',
        options: ['1000mm 혹은 1m', '100mm', '10mm', '1mm'],
        problemLabel: '(3)',
        responseLabel: '간단히 표현',
        hints: ['1000/1000 metre는 1000mm 또는 1m입니다.', '1000mm 혹은 1m를 선택하세요.'],
        sourceText: '1000/1000 metre',
        confidence: 0.99,
        position: { top: 63.5, left: 21.0, width: 20.0, height: 3.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '1mm',
        options: ['1mm', '10mm', '0.1mm', '1cm'],
        problemLabel: '(4)',
        responseLabel: '간단히 표현',
        hints: ['0.001 metre는 1mm입니다.', '1mm를 선택하세요.'],
        sourceText: '0.001 metre',
        confidence: 0.99,
        position: { top: 83.5, left: 21.0, width: 20.0, height: 3.5 }
      },
      {
        clientKey: 'q6',
        type: 'multiple-choice',
        answer: '2mm',
        options: ['2mm', '20mm', '0.2mm', '2cm'],
        problemLabel: '(6)',
        responseLabel: '간단히 표현',
        hints: ['0.002 metre는 2mm입니다.', '2mm를 선택하세요.'],
        sourceText: '0.002 metre',
        confidence: 0.99,
        position: { top: 43.5, left: 59.0, width: 20.0, height: 3.5 }
      },
      {
        clientKey: 'q7',
        type: 'multiple-choice',
        answer: '99mm',
        options: ['99mm', '9.9mm', '990mm', '99cm'],
        problemLabel: '(7)',
        responseLabel: '간단히 표현',
        hints: ['99/1000 metre는 99mm입니다.', '99mm를 선택하세요.'],
        sourceText: '99/1000 metre',
        confidence: 0.99,
        position: { top: 63.5, left: 59.0, width: 20.0, height: 3.5 }
      },
      {
        clientKey: 'q8',
        type: 'multiple-choice',
        answer: '15mm',
        options: ['15mm', '1.5mm', '150mm', '15cm'],
        problemLabel: '(8)',
        responseLabel: '간단히 표현',
        hints: ['0.015 metre는 15mm입니다.', '15mm를 선택하세요.'],
        sourceText: '0.015 metre',
        confidence: 0.99,
        position: { top: 83.5, left: 59.0, width: 20.0, height: 3.5 }
      }
    ]
  },

  // Page 11: Slide 54
  {
    pageId: 'page_1787004065060_11',
    summary: '뜻풀이 문제 7, 8, 9 - 단위 변환 기초 (4지선다형)',
    elements: [
      {
        clientKey: 'q7',
        type: 'multiple-choice',
        answer: '① 100cm',
        options: ['① 100cm', '② 99cm', '③ 0.1cm', '④ 1000cm'],
        problemLabel: '뜻풀이 문제 7',
        responseLabel: '1m를 cm로',
        hints: ['1m는 100cm입니다.', '①을 선택하세요.'],
        sourceText: '1m는 몇 cm입니까?',
        confidence: 0.99,
        position: { top: 49.0, left: 32.0, width: 54.0, height: 8.0 }
      },
      {
        clientKey: 'q8',
        type: 'multiple-choice',
        answer: '② 1000mm',
        options: ['① 1313mm', '② 1000mm', '③ 0.0001mm', '④ 3333mm'],
        problemLabel: '뜻풀이 문제 8',
        responseLabel: '1m를 mm로',
        hints: ['1m는 1000mm입니다.', '②를 선택하세요.'],
        sourceText: '1m는 몇 mm입니까?',
        confidence: 0.99,
        position: { top: 64.0, left: 32.0, width: 54.0, height: 8.0 }
      },
      {
        clientKey: 'q9',
        type: 'multiple-choice',
        answer: '① 1cm',
        options: ['① 1cm', '② 1mm', '③ 1m', '④ 1km'],
        problemLabel: '뜻풀이 문제 9',
        responseLabel: '10mm와 같은 길이',
        hints: ['10mm는 1cm와 같습니다.', '①을 선택하세요.'],
        sourceText: '10mm와 같은 길이는?',
        confidence: 0.99,
        position: { top: 79.0, left: 32.0, width: 54.0, height: 8.0 }
      }
    ]
  },

  // Page 12: Slide 55
  {
    pageId: 'page_1787004065060_12',
    summary: '연습문제 1 - cm를 m로 바꾸기 (4지선다형 분수/소수식)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '$\\frac{200}{100}\\text{ m} = 2\\text{m}$',
        options: ['$\\frac{200}{100}\\text{ m} = 2\\text{m}$', '$\\frac{200}{1000}\\text{ m} = 0.2\\text{m}$', '$\\frac{20}{100}\\text{ m} = 0.2\\text{m}$', '$200\\text{m}$'],
        problemLabel: '(2)',
        responseLabel: 'm 변환식',
        hints: ['200cm = 200/100 m = 2m입니다.', '$\\frac{200}{100}\\text{ m} = 2\\text{m}$를 선택하세요.'],
        sourceText: '200cm',
        confidence: 0.99,
        position: { top: 43.5, left: 18.0, width: 26.0, height: 3.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '$\\frac{10}{100}\\text{ m} = 0.1\\text{m}$',
        options: ['$\\frac{10}{100}\\text{ m} = 0.1\\text{m}$', '$\\frac{10}{1000}\\text{ m} = 0.01\\text{m}$', '$\\frac{1}{100}\\text{ m} = 0.01\\text{m}$', '$10\\text{m}$'],
        problemLabel: '(3)',
        responseLabel: 'm 변환식',
        hints: ['10cm = 10/100 m = 0.1m입니다.', '$\\frac{10}{100}\\text{ m} = 0.1\\text{m}$를 선택하세요.'],
        sourceText: '10cm',
        confidence: 0.99,
        position: { top: 63.5, left: 18.0, width: 26.0, height: 3.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '$\\frac{25000}{100}\\text{ m} = 250\\text{m}$',
        options: ['$\\frac{25000}{100}\\text{ m} = 250\\text{m}$', '$\\frac{25000}{1000}\\text{ m} = 25\\text{m}$', '$\\frac{2500}{100}\\text{ m} = 25\\text{m}$', '$25000\\text{m}$'],
        problemLabel: '(4)',
        responseLabel: 'm 변환식',
        hints: ['25000cm = 25000/100 m = 250m입니다.', '$\\frac{25000}{100}\\text{ m} = 250\\text{m}$를 선택하세요.'],
        sourceText: '25000cm',
        confidence: 0.99,
        position: { top: 83.5, left: 18.0, width: 26.0, height: 3.5 }
      },
      {
        clientKey: 'q5',
        type: 'multiple-choice',
        answer: '$\\frac{100}{100}\\text{ m} = 1\\text{m}$',
        options: ['$\\frac{100}{100}\\text{ m} = 1\\text{m}$', '$\\frac{100}{1000}\\text{ m} = 0.1\\text{m}$', '$\\frac{10}{100}\\text{ m} = 0.1\\text{m}$', '$100\\text{m}$'],
        problemLabel: '(5)',
        responseLabel: 'm 변환식',
        hints: ['100cm = 100/100 m = 1m입니다.', '$\\frac{100}{100}\\text{ m} = 1\\text{m}$를 선택하세요.'],
        sourceText: '100cm',
        confidence: 0.99,
        position: { top: 23.5, left: 55.5, width: 26.0, height: 3.5 }
      },
      {
        clientKey: 'q6',
        type: 'multiple-choice',
        answer: '$\\frac{7}{100}\\text{ m} = 0.07\\text{m}$',
        options: ['$\\frac{7}{100}\\text{ m} = 0.07\\text{m}$', '$\\frac{7}{1000}\\text{ m} = 0.007\\text{m}$', '$\\frac{70}{100}\\text{ m} = 0.7\\text{m}$', '$7\\text{m}$'],
        problemLabel: '(6)',
        responseLabel: 'm 변환식',
        hints: ['7cm = 7/100 m = 0.07m입니다.', '$\\frac{7}{100}\\text{ m} = 0.07\\text{m}$를 선택하세요.'],
        sourceText: '7cm',
        confidence: 0.99,
        position: { top: 43.5, left: 55.5, width: 26.0, height: 3.5 }
      },
      {
        clientKey: 'q7',
        type: 'multiple-choice',
        answer: '$\\frac{1000}{100}\\text{ m} = 10\\text{m}$',
        options: ['$\\frac{1000}{100}\\text{ m} = 10\\text{m}$', '$\\frac{1000}{1000}\\text{ m} = 1\\text{m}$', '$\\frac{100}{100}\\text{ m} = 1\\text{m}$', '$1000\\text{m}$'],
        problemLabel: '(7)',
        responseLabel: 'm 변환식',
        hints: ['1000cm = 1000/100 m = 10m입니다.', '$\\frac{1000}{100}\\text{ m} = 10\\text{m}$를 선택하세요.'],
        sourceText: '1000cm',
        confidence: 0.99,
        position: { top: 63.5, left: 55.5, width: 26.0, height: 3.5 }
      },
      {
        clientKey: 'q8',
        type: 'multiple-choice',
        answer: '$\\frac{50}{100}\\text{ m} = 0.5\\text{m}$',
        options: ['$\\frac{50}{100}\\text{ m} = 0.5\\text{m}$', '$\\frac{50}{1000}\\text{ m} = 0.05\\text{m}$', '$\\frac{5}{100}\\text{ m} = 0.05\\text{m}$', '$50\\text{m}$'],
        problemLabel: '(8)',
        responseLabel: 'm 변환식',
        hints: ['50cm = 50/100 m = 0.5m입니다.', '$\\frac{50}{100}\\text{ m} = 0.5\\text{m}$를 선택하세요.'],
        sourceText: '50cm',
        confidence: 0.99,
        position: { top: 83.5, left: 55.5, width: 26.0, height: 3.5 }
      }
    ]
  },

  // Page 13: Slide 56
  {
    pageId: 'page_1787004065060_13',
    summary: '연습문제 2 - m를 cm로 바꾸기 (4지선다형 분수 & 정수 입력)',
    elements: [
      {
        clientKey: 'q2_frac',
        type: 'multiple-choice',
        answer: '$\\frac{100}{100}$',
        options: ['$\\frac{100}{100}$', '$\\frac{10}{100}$', '$\\frac{1000}{100}$', '$\\frac{1}{100}$'],
        problemLabel: '(2)-분수',
        responseLabel: 'm 분수 표현',
        hints: ['1m는 100/100 m입니다.', '$\\frac{100}{100}$를 선택하세요.'],
        sourceText: '1m = [ ]m',
        confidence: 0.99,
        position: { top: 38.0, left: 24.5, width: 6.5, height: 7.0 }
      },
      {
        clientKey: 'q2_cm',
        type: 'input',
        inputMode: 'integer',
        answer: '100',
        acceptedAnswers: ['100', '100cm'],
        problemLabel: '(2)-cm',
        responseLabel: 'cm 값',
        hints: ['1m는 100cm입니다.', '100을 입력하세요.'],
        sourceText: '= [ ]cm',
        confidence: 0.99,
        position: { top: 40.0, left: 37.5, width: 6.5, height: 3.5 }
      },
      {
        clientKey: 'q3_frac',
        type: 'multiple-choice',
        answer: '$\\frac{3300}{100}$',
        options: ['$\\frac{3300}{100}$', '$\\frac{330}{100}$', '$\\frac{33}{100}$', '$\\frac{33000}{100}$'],
        problemLabel: '(3)-분수',
        responseLabel: 'm 분수 표현',
        hints: ['33m는 3300/100 m입니다.', '$\\frac{3300}{100}$를 선택하세요.'],
        sourceText: '33m = [ ]m',
        confidence: 0.99,
        position: { top: 58.0, left: 24.5, width: 6.5, height: 7.0 }
      },
      {
        clientKey: 'q3_cm',
        type: 'input',
        inputMode: 'integer',
        answer: '3300',
        acceptedAnswers: ['3300', '3300cm'],
        problemLabel: '(3)-cm',
        responseLabel: 'cm 값',
        hints: ['33m는 3300cm입니다.', '3300을 입력하세요.'],
        sourceText: '= [ ]cm',
        confidence: 0.99,
        position: { top: 60.0, left: 37.5, width: 6.5, height: 3.5 }
      },
      {
        clientKey: 'q4_frac',
        type: 'multiple-choice',
        answer: '$\\frac{70}{100}$',
        options: ['$\\frac{70}{100}$', '$\\frac{7}{100}$', '$\\frac{700}{100}$', '$\\frac{0.7}{100}$'],
        problemLabel: '(4)-분수',
        responseLabel: 'm 분수 표현',
        hints: ['0.7m는 70/100 m입니다.', '$\\frac{70}{100}$를 선택하세요.'],
        sourceText: '0.7m = [ ]m',
        confidence: 0.99,
        position: { top: 78.0, left: 24.5, width: 6.5, height: 7.0 }
      },
      {
        clientKey: 'q4_cm',
        type: 'input',
        inputMode: 'integer',
        answer: '70',
        acceptedAnswers: ['70', '70cm'],
        problemLabel: '(4)-cm',
        responseLabel: 'cm 값',
        hints: ['0.7m는 70cm입니다.', '70을 입력하세요.'],
        sourceText: '= [ ]cm',
        confidence: 0.99,
        position: { top: 80.0, left: 37.5, width: 6.5, height: 3.5 }
      },
      {
        clientKey: 'q5_frac',
        type: 'multiple-choice',
        answer: '$\\frac{1}{100}$',
        options: ['$\\frac{1}{100}$', '$\\frac{10}{100}$', '$\\frac{100}{100}$', '$\\frac{0.1}{100}$'],
        problemLabel: '(5)-분수',
        responseLabel: 'm 분수 표현',
        hints: ['0.01m는 1/100 m입니다.', '$\\frac{1}{100}$를 선택하세요.'],
        sourceText: '0.01m = [ ]m',
        confidence: 0.99,
        position: { top: 18.0, left: 62.5, width: 6.5, height: 7.0 }
      },
      {
        clientKey: 'q5_cm',
        type: 'input',
        inputMode: 'integer',
        answer: '1',
        acceptedAnswers: ['1', '1cm'],
        problemLabel: '(5)-cm',
        responseLabel: 'cm 값',
        hints: ['0.01m는 1cm입니다.', '1을 입력하세요.'],
        sourceText: '= [ ]cm',
        confidence: 0.99,
        position: { top: 20.0, left: 75.5, width: 6.5, height: 3.5 }
      },
      {
        clientKey: 'q6_frac',
        type: 'multiple-choice',
        answer: '$\\frac{12}{100}$',
        options: ['$\\frac{12}{100}$', '$\\frac{120}{100}$', '$\\frac{1.2}{100}$', '$\\frac{1200}{100}$'],
        problemLabel: '(6)-분수',
        responseLabel: 'm 분수 표현',
        hints: ['0.12m는 12/100 m입니다.', '$\\frac{12}{100}$를 선택하세요.'],
        sourceText: '0.12m = [ ]m',
        confidence: 0.99,
        position: { top: 38.0, left: 62.5, width: 6.5, height: 7.0 }
      },
      {
        clientKey: 'q6_cm',
        type: 'input',
        inputMode: 'integer',
        answer: '12',
        acceptedAnswers: ['12', '12cm'],
        problemLabel: '(6)-cm',
        responseLabel: 'cm 값',
        hints: ['0.12m는 12cm입니다.', '12를 입력하세요.'],
        sourceText: '= [ ]cm',
        confidence: 0.99,
        position: { top: 40.0, left: 75.5, width: 6.5, height: 3.5 }
      },
      {
        clientKey: 'q7_frac',
        type: 'multiple-choice',
        answer: '$\\frac{260}{100}$',
        options: ['$\\frac{260}{100}$', '$\\frac{26}{100}$', '$\\frac{2.6}{100}$', '$\\frac{2600}{100}$'],
        problemLabel: '(7)-분수',
        responseLabel: 'm 분수 표현',
        hints: ['2.6m는 260/100 m입니다.', '$\\frac{260}{100}$를 선택하세요.'],
        sourceText: '2.6m = [ ]m',
        confidence: 0.99,
        position: { top: 58.0, left: 62.5, width: 6.5, height: 7.0 }
      },
      {
        clientKey: 'q7_cm',
        type: 'input',
        inputMode: 'integer',
        answer: '260',
        acceptedAnswers: ['260', '260cm'],
        problemLabel: '(7)-cm',
        responseLabel: 'cm 값',
        hints: ['2.6m는 260cm입니다.', '260을 입력하세요.'],
        sourceText: '= [ ]cm',
        confidence: 0.99,
        position: { top: 60.0, left: 75.5, width: 6.5, height: 3.5 }
      },
      {
        clientKey: 'q8_frac',
        type: 'multiple-choice',
        answer: '$\\frac{1800}{100}$',
        options: ['$\\frac{1800}{100}$', '$\\frac{180}{100}$', '$\\frac{18}{100}$', '$\\frac{18000}{100}$'],
        problemLabel: '(8)-분수',
        responseLabel: 'm 분수 표현',
        hints: ['18m는 1800/100 m입니다.', '$\\frac{1800}{100}$를 선택하세요.'],
        sourceText: '18m = [ ]m',
        confidence: 0.99,
        position: { top: 78.0, left: 62.5, width: 6.5, height: 7.0 }
      },
      {
        clientKey: 'q8_cm',
        type: 'input',
        inputMode: 'integer',
        answer: '1800',
        acceptedAnswers: ['1800', '1800cm'],
        problemLabel: '(8)-cm',
        responseLabel: 'cm 값',
        hints: ['18m는 1800cm입니다.', '1800을 입력하세요.'],
        sourceText: '= [ ]cm',
        confidence: 0.99,
        position: { top: 80.0, left: 75.5, width: 6.5, height: 3.5 }
      }
    ]
  },

  // Page 14: Slide 57
  {
    pageId: 'page_1787004065060_14',
    summary: '연습문제 3 - mm를 m로 바꾸기 (4지선다형 분수/소수식)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '$\\frac{2000}{1000}\\text{ m} = 2\\text{m}$',
        options: ['$\\frac{2000}{1000}\\text{ m} = 2\\text{m}$', '$\\frac{200}{1000}\\text{ m} = 0.2\\text{m}$', '$\\frac{2000}{100}\\text{ m} = 20\\text{m}$', '$2000\\text{m}$'],
        problemLabel: '(2)',
        responseLabel: 'm 변환식',
        hints: ['2000mm = 2000/1000 m = 2m입니다.', '$\\frac{2000}{1000}\\text{ m} = 2\\text{m}$를 선택하세요.'],
        sourceText: '2000mm',
        confidence: 0.99,
        position: { top: 43.5, left: 18.0, width: 26.0, height: 3.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '$\\frac{100}{1000}\\text{ m} = 0.1\\text{m}$',
        options: ['$\\frac{100}{1000}\\text{ m} = 0.1\\text{m}$', '$\\frac{100}{100}\\text{ m} = 1\\text{m}$', '$\\frac{10}{1000}\\text{ m} = 0.01\\text{m}$', '$100\\text{m}$'],
        problemLabel: '(3)',
        responseLabel: 'm 변환식',
        hints: ['100mm = 100/1000 m = 0.1m입니다.', '$\\frac{100}{1000}\\text{ m} = 0.1\\text{m}$를 선택하세요.'],
        sourceText: '100mm',
        confidence: 0.99,
        position: { top: 63.5, left: 18.0, width: 26.0, height: 3.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '$\\frac{25000}{1000}\\text{ m} = 25\\text{m}$',
        options: ['$\\frac{25000}{1000}\\text{ m} = 25\\text{m}$', '$\\frac{25000}{100}\\text{ m} = 250\\text{m}$', '$\\frac{2500}{1000}\\text{ m} = 2.5\\text{m}$', '$25000\\text{m}$'],
        problemLabel: '(4)',
        responseLabel: 'm 변환식',
        hints: ['25000mm = 25000/1000 m = 25m입니다.', '$\\frac{25000}{1000}\\text{ m} = 25\\text{m}$를 선택하세요.'],
        sourceText: '25000mm',
        confidence: 0.99,
        position: { top: 83.5, left: 18.0, width: 26.0, height: 3.5 }
      },
      {
        clientKey: 'q5',
        type: 'multiple-choice',
        answer: '$\\frac{1000}{1000}\\text{ m} = 1\\text{m}$',
        options: ['$\\frac{1000}{1000}\\text{ m} = 1\\text{m}$', '$\\frac{1000}{100}\\text{ m} = 10\\text{m}$', '$\\frac{100}{1000}\\text{ m} = 0.1\\text{m}$', '$1000\\text{m}$'],
        problemLabel: '(5)',
        responseLabel: 'm 변환식',
        hints: ['1000mm = 1000/1000 m = 1m입니다.', '$\\frac{1000}{1000}\\text{ m} = 1\\text{m}$를 선택하세요.'],
        sourceText: '1000mm',
        confidence: 0.99,
        position: { top: 23.5, left: 55.5, width: 26.0, height: 3.5 }
      },
      {
        clientKey: 'q6',
        type: 'multiple-choice',
        answer: '$\\frac{7}{1000}\\text{ m} = 0.007\\text{m}$',
        options: ['$\\frac{7}{1000}\\text{ m} = 0.007\\text{m}$', '$\\frac{7}{100}\\text{ m} = 0.07\\text{m}$', '$\\frac{70}{1000}\\text{ m} = 0.07\\text{m}$', '$7\\text{m}$'],
        problemLabel: '(6)',
        responseLabel: 'm 변환식',
        hints: ['7mm = 7/1000 m = 0.007m입니다.', '$\\frac{7}{1000}\\text{ m} = 0.007\\text{m}$를 선택하세요.'],
        sourceText: '7mm',
        confidence: 0.99,
        position: { top: 43.5, left: 55.5, width: 26.0, height: 3.5 }
      },
      {
        clientKey: 'q7',
        type: 'multiple-choice',
        answer: '$\\frac{10}{1000}\\text{ m} = 0.01\\text{m}$',
        options: ['$\\frac{10}{1000}\\text{ m} = 0.01\\text{m}$', '$\\frac{10}{100}\\text{ m} = 0.1\\text{m}$', '$\\frac{1}{1000}\\text{ m} = 0.001\\text{m}$', '$10\\text{m}$'],
        problemLabel: '(7)',
        responseLabel: 'm 변환식',
        hints: ['10mm = 10/1000 m = 0.01m입니다.', '$\\frac{10}{1000}\\text{ m} = 0.01\\text{m}$를 선택하세요.'],
        sourceText: '10mm',
        confidence: 0.99,
        position: { top: 63.5, left: 55.5, width: 26.0, height: 3.5 }
      },
      {
        clientKey: 'q8',
        type: 'multiple-choice',
        answer: '$\\frac{500}{1000}\\text{ m} = 0.5\\text{m}$',
        options: ['$\\frac{500}{1000}\\text{ m} = 0.5\\text{m}$', '$\\frac{500}{100}\\text{ m} = 5\\text{m}$', '$\\frac{50}{1000}\\text{ m} = 0.05\\text{m}$', '$500\\text{m}$'],
        problemLabel: '(8)',
        responseLabel: 'm 변환식',
        hints: ['500mm = 500/1000 m = 0.5m입니다.', '$\\frac{500}{1000}\\text{ m} = 0.5\\text{m}$를 선택하세요.'],
        sourceText: '500mm',
        confidence: 0.99,
        position: { top: 83.5, left: 55.5, width: 26.0, height: 3.5 }
      }
    ]
  },

  // Page 15: Slide 58
  {
    pageId: 'page_1787004065060_15',
    summary: '연습문제 4 - m를 mm로 바꾸기 (4지선다형 분수 & 정수 입력)',
    elements: [
      {
        clientKey: 'q2_frac',
        type: 'multiple-choice',
        answer: '$\\frac{1000}{1000}$',
        options: ['$\\frac{1000}{1000}$', '$\\frac{100}{1000}$', '$\\frac{10}{1000}$', '$\\frac{1}{1000}$'],
        problemLabel: '(2)-분수',
        responseLabel: 'm 분수 표현',
        hints: ['1m는 1000/1000 m입니다.', '$\\frac{1000}{1000}$를 선택하세요.'],
        sourceText: '1m = [ ]m',
        confidence: 0.99,
        position: { top: 38.0, left: 24.5, width: 6.5, height: 7.0 }
      },
      {
        clientKey: 'q2_mm',
        type: 'input',
        inputMode: 'integer',
        answer: '1000',
        acceptedAnswers: ['1000', '1000mm'],
        problemLabel: '(2)-mm',
        responseLabel: 'mm 값',
        hints: ['1m는 1000mm입니다.', '1000을 입력하세요.'],
        sourceText: '= [ ]mm',
        confidence: 0.99,
        position: { top: 40.0, left: 37.5, width: 6.5, height: 3.5 }
      },
      {
        clientKey: 'q3_frac',
        type: 'multiple-choice',
        answer: '$\\frac{33000}{1000}$',
        options: ['$\\frac{33000}{1000}$', '$\\frac{3300}{1000}$', '$\\frac{330}{1000}$', '$\\frac{33}{1000}$'],
        problemLabel: '(3)-분수',
        responseLabel: 'm 분수 표현',
        hints: ['33m는 33000/1000 m입니다.', '$\\frac{33000}{1000}$를 선택하세요.'],
        sourceText: '33m = [ ]m',
        confidence: 0.99,
        position: { top: 58.0, left: 24.5, width: 6.5, height: 7.0 }
      },
      {
        clientKey: 'q3_mm',
        type: 'input',
        inputMode: 'integer',
        answer: '33000',
        acceptedAnswers: ['33000', '33000mm'],
        problemLabel: '(3)-mm',
        responseLabel: 'mm 값',
        hints: ['33m는 33000mm입니다.', '33000을 입력하세요.'],
        sourceText: '= [ ]mm',
        confidence: 0.99,
        position: { top: 60.0, left: 37.5, width: 6.5, height: 3.5 }
      },
      {
        clientKey: 'q4_frac',
        type: 'multiple-choice',
        answer: '$\\frac{700}{1000}$',
        options: ['$\\frac{700}{1000}$', '$\\frac{70}{1000}$', '$\\frac{7}{1000}$', '$\\frac{7000}{1000}$'],
        problemLabel: '(4)-분수',
        responseLabel: 'm 분수 표현',
        hints: ['0.7m는 700/1000 m입니다.', '$\\frac{700}{1000}$를 선택하세요.'],
        sourceText: '0.7m = [ ]m',
        confidence: 0.99,
        position: { top: 78.0, left: 24.5, width: 6.5, height: 7.0 }
      },
      {
        clientKey: 'q4_mm',
        type: 'input',
        inputMode: 'integer',
        answer: '700',
        acceptedAnswers: ['700', '700mm'],
        problemLabel: '(4)-mm',
        responseLabel: 'mm 값',
        hints: ['0.7m는 700mm입니다.', '700을 입력하세요.'],
        sourceText: '= [ ]mm',
        confidence: 0.99,
        position: { top: 80.0, left: 37.5, width: 6.5, height: 3.5 }
      },
      {
        clientKey: 'q5_frac',
        type: 'multiple-choice',
        answer: '$\\frac{10}{1000}$',
        options: ['$\\frac{10}{1000}$', '$\\frac{1}{1000}$', '$\\frac{100}{1000}$', '$\\frac{0.01}{1000}$'],
        problemLabel: '(5)-분수',
        responseLabel: 'm 분수 표현',
        hints: ['0.01m는 10/1000 m입니다.', '$\\frac{10}{1000}$를 선택하세요.'],
        sourceText: '0.01m = [ ]m',
        confidence: 0.99,
        position: { top: 18.0, left: 62.5, width: 6.5, height: 7.0 }
      },
      {
        clientKey: 'q5_mm',
        type: 'input',
        inputMode: 'integer',
        answer: '10',
        acceptedAnswers: ['10', '10mm'],
        problemLabel: '(5)-mm',
        responseLabel: 'mm 값',
        hints: ['0.01m는 10mm입니다.', '10을 입력하세요.'],
        sourceText: '= [ ]mm',
        confidence: 0.99,
        position: { top: 20.0, left: 75.5, width: 6.5, height: 3.5 }
      },
      {
        clientKey: 'q6_frac',
        type: 'multiple-choice',
        answer: '$\\frac{120}{1000}$',
        options: ['$\\frac{120}{1000}$', '$\\frac{12}{1000}$', '$\\frac{1.2}{1000}$', '$\\frac{1200}{1000}$'],
        problemLabel: '(6)-분수',
        responseLabel: 'm 분수 표현',
        hints: ['0.12m는 120/1000 m입니다.', '$\\frac{120}{1000}$를 선택하세요.'],
        sourceText: '0.12m = [ ]m',
        confidence: 0.99,
        position: { top: 38.0, left: 62.5, width: 6.5, height: 7.0 }
      },
      {
        clientKey: 'q6_mm',
        type: 'input',
        inputMode: 'integer',
        answer: '120',
        acceptedAnswers: ['120', '120mm'],
        problemLabel: '(6)-mm',
        responseLabel: 'mm 값',
        hints: ['0.12m는 120mm입니다.', '120을 입력하세요.'],
        sourceText: '= [ ]mm',
        confidence: 0.99,
        position: { top: 40.0, left: 75.5, width: 6.5, height: 3.5 }
      },
      {
        clientKey: 'q7_frac',
        type: 'multiple-choice',
        answer: '$\\frac{2600}{1000}$',
        options: ['$\\frac{2600}{1000}$', '$\\frac{260}{1000}$', '$\\frac{26}{1000}$', '$\\frac{26000}{1000}$'],
        problemLabel: '(7)-분수',
        responseLabel: 'm 분수 표현',
        hints: ['2.6m는 2600/1000 m입니다.', '$\\frac{2600}{1000}$를 선택하세요.'],
        sourceText: '2.6m = [ ]m',
        confidence: 0.99,
        position: { top: 58.0, left: 62.5, width: 6.5, height: 7.0 }
      },
      {
        clientKey: 'q7_mm',
        type: 'input',
        inputMode: 'integer',
        answer: '2600',
        acceptedAnswers: ['2600', '2600mm'],
        problemLabel: '(7)-mm',
        responseLabel: 'mm 값',
        hints: ['2.6m는 2600mm입니다.', '2600을 입력하세요.'],
        sourceText: '= [ ]mm',
        confidence: 0.99,
        position: { top: 60.0, left: 75.5, width: 6.5, height: 3.5 }
      },
      {
        clientKey: 'q8_frac',
        type: 'multiple-choice',
        answer: '$\\frac{18000}{1000}$',
        options: ['$\\frac{18000}{1000}$', '$\\frac{1800}{1000}$', '$\\frac{180}{1000}$', '$\\frac{18}{1000}$'],
        problemLabel: '(8)-분수',
        responseLabel: 'm 분수 표현',
        hints: ['18m는 18000/1000 m입니다.', '$\\frac{18000}{1000}$를 선택하세요.'],
        sourceText: '18m = [ ]m',
        confidence: 0.99,
        position: { top: 78.0, left: 62.5, width: 6.5, height: 7.0 }
      },
      {
        clientKey: 'q8_mm',
        type: 'input',
        inputMode: 'integer',
        answer: '18000',
        acceptedAnswers: ['18000', '18000mm'],
        problemLabel: '(8)-mm',
        responseLabel: 'mm 값',
        hints: ['18m는 18000mm입니다.', '18000을 입력하세요.'],
        sourceText: '= [ ]mm',
        confidence: 0.99,
        position: { top: 80.0, left: 75.5, width: 6.5, height: 3.5 }
      }
    ]
  },

  // Page 16: Slide 59
  {
    pageId: 'page_1787004065060_16',
    summary: '뜻풀이 문제 10, 11 - 대입의 의미 (4지선다형)',
    elements: [
      {
        clientKey: 'q10',
        type: 'multiple-choice',
        answer: '③ 대신 넣다',
        options: ['① 대학입시', '② 대단한 입맛', '③ 대신 넣다', '④ 큰 입'],
        problemLabel: '뜻풀이 문제 10',
        responseLabel: '대입(代入)의 뜻',
        hints: ['대입이란 대신 넣거나 대신 입력한다는 뜻입니다.', '③을 선택하세요.'],
        sourceText: '대입(代入)의 뜻이 무엇입니까?',
        confidence: 0.99,
        position: { top: 52.0, left: 32.0, width: 54.0, height: 8.0 }
      },
      {
        clientKey: 'q11',
        type: 'multiple-choice',
        answer: '① 대입',
        options: ['① 대입', '② 쫄지마', '③ 나는 나다.', '④ 모르겠어요.'],
        problemLabel: '뜻풀이 문제 11',
        responseLabel: '대신 넣다 단어',
        hints: ['대신 넣는 것을 대입이라고 합니다.', '①을 선택하세요.'],
        sourceText: '"대신 넣다"라는 뜻을 가진 단어는 무엇인가요?',
        confidence: 0.99,
        position: { top: 74.0, left: 32.0, width: 54.0, height: 8.0 }
      }
    ]
  },

  // Page 17: Slide 60
  {
    pageId: 'page_1787004065060_17',
    summary: '연습문제 5 - 기호 대신 단어 대입하기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2_1',
        type: 'multiple-choice',
        answer: '게임',
        options: ['게임', '바보', '독서', '공부'],
        problemLabel: '(2)-첫번째',
        responseLabel: '대입 단어',
        hints: ['Σm = 게임입니다.', '게임을 선택하세요.'],
        sourceText: '대단한 ( )은 아니야.',
        confidence: 0.99,
        position: { top: 45.0, left: 27.5, width: 4.5, height: 3.5 }
      },
      {
        clientKey: 'q2_2',
        type: 'multiple-choice',
        answer: '게임',
        options: ['게임', '바보', '독서', '엄마'],
        problemLabel: '(2)-두번째',
        responseLabel: '대입 단어',
        hints: ['저번 Σm = 게임입니다.', '게임을 선택하세요.'],
        sourceText: '저번 ( )보다',
        confidence: 0.99,
        position: { top: 45.0, left: 49.0, width: 4.5, height: 3.5 }
      },
      {
        clientKey: 'q2_3',
        type: 'multiple-choice',
        answer: '100',
        options: ['100', '10', '1000', '1'],
        problemLabel: '(2)-세번째',
        responseLabel: '대입 숫자',
        hints: ['γ&^^ = 100입니다.', '100을 선택하세요.'],
        sourceText: '( )배 쉬워.',
        confidence: 0.99,
        position: { top: 45.0, left: 60.5, width: 4.5, height: 3.5 }
      },
      {
        clientKey: 'q3_1',
        type: 'multiple-choice',
        answer: '독서',
        options: ['독서', '게임', '공부', '바보'],
        problemLabel: '(3)-첫번째',
        responseLabel: '대입 단어',
        hints: ['π#$@ = 독서입니다.', '독서를 선택하세요.'],
        sourceText: '( )하는 척하면서',
        confidence: 0.99,
        position: { top: 65.5, left: 21.0, width: 4.5, height: 3.5 }
      },
      {
        clientKey: 'q3_2',
        type: 'multiple-choice',
        answer: '아빠',
        options: ['아빠', '엄마', '천재', '바보'],
        problemLabel: '(3)-두번째',
        responseLabel: '대입 단어',
        hints: ['ξm = 아빠입니다.', '아빠를 선택하세요.'],
        sourceText: '( ) 골탕 먹이기',
        confidence: 0.99,
        position: { top: 65.5, left: 41.0, width: 4.5, height: 3.5 }
      },
      {
        clientKey: 'q4_1',
        type: 'multiple-choice',
        answer: '엄마',
        options: ['엄마', '아빠', '천재', '게임'],
        problemLabel: '(4)-첫번째',
        responseLabel: '대입 단어',
        hints: ['%λ*& = 엄마입니다.', '엄마를 선택하세요.'],
        sourceText: '( )말 안 듣고',
        confidence: 0.99,
        position: { top: 85.5, left: 21.0, width: 4.5, height: 3.5 }
      },
      {
        clientKey: 'q4_2',
        type: 'multiple-choice',
        answer: '공부',
        options: ['공부', '독서', '게임', '바보'],
        problemLabel: '(4)-두번째',
        responseLabel: '대입 단어',
        hints: ['δ = 공부입니다.', '공부를 선택하세요.'],
        sourceText: '몰래 ( ) 하다가',
        confidence: 0.99,
        position: { top: 85.5, left: 43.0, width: 4.5, height: 3.5 }
      }
    ]
  },

  // Page 18: Slide 61
  {
    pageId: 'page_1787004065060_18',
    summary: '연습문제 6 - 단위 변환 대입하기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '$\\frac{1}{1000}\\text{m}$',
        options: ['$\\frac{1}{1000}\\text{m}$', '$\\frac{1}{100}\\text{m}$', '$1000\\text{m}$', '$100\\text{m}$'],
        problemLabel: '(2)',
        responseLabel: '대입 값',
        hints: ['mm = 1/1000 m입니다.', '$\\frac{1}{1000}\\text{m}$를 선택하세요.'],
        sourceText: '10mm = 10( )',
        confidence: 0.99,
        position: { top: 43.5, left: 34.0, width: 8.5, height: 3.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '$\\frac{1}{100}\\text{m}$',
        options: ['$\\frac{1}{100}\\text{m}$', '$\\frac{1}{1000}\\text{m}$', '$100\\text{m}$', '$1000\\text{m}$'],
        problemLabel: '(3)',
        responseLabel: '대입 값',
        hints: ['cm = 1/100 m입니다.', '$\\frac{1}{100}\\text{m}$를 선택하세요.'],
        sourceText: '50cm = 50( )',
        confidence: 0.99,
        position: { top: 63.5, left: 34.0, width: 8.5, height: 3.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '$\\frac{1}{1000}\\text{g}$',
        options: ['$\\frac{1}{1000}\\text{g}$', '$\\frac{1}{100}\\text{g}$', '$1000\\text{g}$', '$100\\text{g}$'],
        problemLabel: '(4)',
        responseLabel: '대입 값',
        hints: ['mg = 1/1000 g입니다.', '$\\frac{1}{1000}\\text{g}$를 선택하세요.'],
        sourceText: '100mg = 100( )',
        confidence: 0.99,
        position: { top: 83.5, left: 35.0, width: 8.5, height: 3.5 }
      },
      {
        clientKey: 'q5',
        type: 'multiple-choice',
        answer: '$\\frac{1}{100}\\text{m}$',
        options: ['$\\frac{1}{100}\\text{m}$', '$\\frac{1}{1000}\\text{m}$', '$100\\text{m}$', '$1000\\text{m}$'],
        problemLabel: '(5)',
        responseLabel: '대입 값',
        hints: ['cm = 1/100 m입니다.', '$\\frac{1}{100}\\text{m}$를 선택하세요.'],
        sourceText: '45cm = 45( )',
        confidence: 0.99,
        position: { top: 23.5, left: 72.0, width: 8.5, height: 3.5 }
      },
      {
        clientKey: 'q6',
        type: 'multiple-choice',
        answer: '1000m',
        options: ['1000m', '100m', '$\\frac{1}{1000}\\text{m}$', '10m'],
        problemLabel: '(6)',
        responseLabel: '대입 값',
        hints: ['km = 1000m입니다.', '1000m를 선택하세요.'],
        sourceText: '99km = 99( )',
        confidence: 0.99,
        position: { top: 43.5, left: 72.0, width: 8.5, height: 3.5 }
      },
      {
        clientKey: 'q7',
        type: 'multiple-choice',
        answer: '1000g',
        options: ['1000g', '100g', '$\\frac{1}{1000}\\text{g}$', '10g'],
        problemLabel: '(7)',
        responseLabel: '대입 값',
        hints: ['kg = 1000g입니다.', '1000g를 선택하세요.'],
        sourceText: '32kg = 32( )',
        confidence: 0.99,
        position: { top: 63.5, left: 72.0, width: 8.5, height: 3.5 }
      },
      {
        clientKey: 'q8',
        type: 'multiple-choice',
        answer: '$\\frac{1}{100}\\text{m}$',
        options: ['$\\frac{1}{100}\\text{m}$', '$\\frac{1}{1000}\\text{m}$', '$100\\text{m}$', '$1000\\text{m}$'],
        problemLabel: '(8)',
        responseLabel: '대입 값',
        hints: ['cm = 1/100 m입니다.', '$\\frac{1}{100}\\text{m}$를 선택하세요.'],
        sourceText: '100cm = 100( )',
        confidence: 0.99,
        position: { top: 83.5, left: 73.5, width: 8.5, height: 3.5 }
      }
    ]
  },

  // Page 19: Slide 62
  {
    pageId: 'page_1787004065060_19',
    summary: '뜻풀이 문제 12, 13, 14 - 단위 변환 기초 (4지선다형)',
    elements: [
      {
        clientKey: 'q12',
        type: 'multiple-choice',
        answer: '④ 1000m',
        options: ['① 100m', '② 98.14m', '③ 1m', '④ 1000m'],
        problemLabel: '뜻풀이 문제 12',
        responseLabel: '1km를 m로',
        hints: ['1km는 1000m입니다.', '④를 선택하세요.'],
        sourceText: '1km는 몇 m입니까?',
        confidence: 0.99,
        position: { top: 49.0, left: 32.0, width: 54.0, height: 8.0 }
      },
      {
        clientKey: 'q13',
        type: 'multiple-choice',
        answer: '③ 100cm',
        options: ['① 10cm', '② 0.1cm', '③ 100cm', '④ 1000cm'],
        problemLabel: '뜻풀이 문제 13',
        responseLabel: '1m를 cm로',
        hints: ['1m는 100cm입니다.', '③을 선택하세요.'],
        sourceText: '1m는 몇 cm입니까?',
        confidence: 0.99,
        position: { top: 64.0, left: 32.0, width: 54.0, height: 8.0 }
      },
      {
        clientKey: 'q14',
        type: 'multiple-choice',
        answer: '② 1000mm',
        options: ['① 100mm', '② 1000mm', '③ 99mm', '④ 1mm'],
        problemLabel: '뜻풀이 문제 14',
        responseLabel: '1m를 mm로',
        hints: ['1m는 1000mm입니다.', '②를 선택하세요.'],
        sourceText: '1m는 몇 mm입니까?',
        confidence: 0.99,
        position: { top: 79.0, left: 32.0, width: 54.0, height: 8.0 }
      }
    ]
  },

  // Page 20: Slide 63
  {
    pageId: 'page_1787004065060_20',
    summary: '연습문제 7 - km를 m로 바꾸기 (대입 및 결과, 4지선다형)',
    elements: [
      {
        clientKey: 'q2_sub',
        type: 'multiple-choice',
        answer: '1000m',
        options: ['1000m', '100m', '10m', '$\\frac{1}{1000}\\text{m}$'],
        problemLabel: '(2)-대입',
        responseLabel: '대입값',
        hints: ['km 대신 1000m를 대입합니다.', '1000m를 선택하세요.'],
        sourceText: '= 300 × [ ]',
        confidence: 0.99,
        position: { top: 43.5, left: 24.5, width: 9.0, height: 3.5 }
      },
      {
        clientKey: 'q2_ans',
        type: 'multiple-choice',
        answer: '300000m',
        options: ['300000m', '30000m', '3000m', '300m'],
        problemLabel: '(2)-결과',
        responseLabel: '계산결과',
        hints: ['300 × 1000m = 300000m입니다.', '300000m를 선택하세요.'],
        sourceText: '= [ ]',
        confidence: 0.99,
        position: { top: 43.5, left: 36.5, width: 10.0, height: 3.5 }
      },
      {
        clientKey: 'q3_sub',
        type: 'multiple-choice',
        answer: '1000m',
        options: ['1000m', '100m', '10m', '$\\frac{1}{1000}\\text{m}$'],
        problemLabel: '(3)-대입',
        responseLabel: '대입값',
        hints: ['km 대신 1000m를 대입합니다.', '1000m를 선택하세요.'],
        sourceText: '= 0.33 × [ ]',
        confidence: 0.99,
        position: { top: 63.5, left: 25.5, width: 9.0, height: 3.5 }
      },
      {
        clientKey: 'q3_ans',
        type: 'multiple-choice',
        answer: '330m',
        options: ['330m', '33m', '3300m', '3.3m'],
        problemLabel: '(3)-결과',
        responseLabel: '계산결과',
        hints: ['0.33 × 1000m = 330m입니다.', '330m를 선택하세요.'],
        sourceText: '= [ ]',
        confidence: 0.99,
        position: { top: 63.5, left: 37.5, width: 10.0, height: 3.5 }
      },
      {
        clientKey: 'q4_sub',
        type: 'multiple-choice',
        answer: '1000m',
        options: ['1000m', '100m', '10m', '$\\frac{1}{1000}\\text{m}$'],
        problemLabel: '(4)-대입',
        responseLabel: '대입값',
        hints: ['km 대신 1000m를 대입합니다.', '1000m를 선택하세요.'],
        sourceText: '= 1.7 × [ ]',
        confidence: 0.99,
        position: { top: 83.5, left: 24.5, width: 9.0, height: 3.5 }
      },
      {
        clientKey: 'q4_ans',
        type: 'multiple-choice',
        answer: '1700m',
        options: ['1700m', '170m', '17000m', '17m'],
        problemLabel: '(4)-결과',
        responseLabel: '계산결과',
        hints: ['1.7 × 1000m = 1700m입니다.', '1700m를 선택하세요.'],
        sourceText: '= [ ]',
        confidence: 0.99,
        position: { top: 83.5, left: 36.5, width: 10.0, height: 3.5 }
      },
      {
        clientKey: 'q5_sub',
        type: 'multiple-choice',
        answer: '1000m',
        options: ['1000m', '100m', '10m', '$\\frac{1}{1000}\\text{m}$'],
        problemLabel: '(5)-대입',
        responseLabel: '대입값',
        hints: ['km 대신 1000m를 대입합니다.', '1000m를 선택하세요.'],
        sourceText: '= 15 × [ ]',
        confidence: 0.99,
        position: { top: 23.5, left: 61.5, width: 9.0, height: 3.5 }
      },
      {
        clientKey: 'q5_ans',
        type: 'multiple-choice',
        answer: '15000m',
        options: ['15000m', '1500m', '150000m', '150m'],
        problemLabel: '(5)-결과',
        responseLabel: '계산결과',
        hints: ['15 × 1000m = 15000m입니다.', '15000m를 선택하세요.'],
        sourceText: '= [ ]',
        confidence: 0.99,
        position: { top: 23.5, left: 73.5, width: 10.0, height: 3.5 }
      },
      {
        clientKey: 'q6_sub',
        type: 'multiple-choice',
        answer: '1000m',
        options: ['1000m', '100m', '10m', '$\\frac{1}{1000}\\text{m}$'],
        problemLabel: '(6)-대입',
        responseLabel: '대입값',
        hints: ['km 대신 1000m를 대입합니다.', '1000m를 선택하세요.'],
        sourceText: '= 1.1 × [ ]',
        confidence: 0.99,
        position: { top: 43.5, left: 62.0, width: 9.0, height: 3.5 }
      },
      {
        clientKey: 'q6_ans',
        type: 'multiple-choice',
        answer: '1100m',
        options: ['1100m', '110m', '11000m', '11m'],
        problemLabel: '(6)-결과',
        responseLabel: '계산결과',
        hints: ['1.1 × 1000m = 1100m입니다.', '1100m를 선택하세요.'],
        sourceText: '= [ ]',
        confidence: 0.99,
        position: { top: 43.5, left: 73.5, width: 10.0, height: 3.5 }
      },
      {
        clientKey: 'q7_sub',
        type: 'multiple-choice',
        answer: '1000m',
        options: ['1000m', '100m', '10m', '$\\frac{1}{1000}\\text{m}$'],
        problemLabel: '(7)-대입',
        responseLabel: '대입값',
        hints: ['km 대신 1000m를 대입합니다.', '1000m를 선택하세요.'],
        sourceText: '= 4/5 × [ ]',
        confidence: 0.99,
        position: { top: 63.5, left: 60.5, width: 9.0, height: 3.5 }
      },
      {
        clientKey: 'q7_ans',
        type: 'multiple-choice',
        answer: '800m',
        options: ['800m', '80m', '8000m', '400m'],
        problemLabel: '(7)-결과',
        responseLabel: '계산결과',
        hints: ['4/5 × 1000m = 800m입니다.', '800m를 선택하세요.'],
        sourceText: '= [ ]',
        confidence: 0.99,
        position: { top: 63.5, left: 72.5, width: 10.0, height: 3.5 }
      },
      {
        clientKey: 'q8_sub',
        type: 'multiple-choice',
        answer: '1000m',
        options: ['1000m', '100m', '10m', '$\\frac{1}{1000}\\text{m}$'],
        problemLabel: '(8)-대입',
        responseLabel: '대입값',
        hints: ['km 대신 1000m를 대입합니다.', '1000m를 선택하세요.'],
        sourceText: '= 0 × [ ]',
        confidence: 0.99,
        position: { top: 83.5, left: 59.5, width: 9.0, height: 3.5 }
      },
      {
        clientKey: 'q8_ans',
        type: 'multiple-choice',
        answer: '0m',
        options: ['0m', '1000m', '1m', '0km'],
        problemLabel: '(8)-결과',
        responseLabel: '계산결과',
        hints: ['0 × 1000m = 0m입니다.', '0m를 선택하세요.'],
        sourceText: '= [ ]',
        confidence: 0.99,
        position: { top: 83.5, left: 71.5, width: 10.0, height: 3.5 }
      }
    ]
  },

  // Page 21: Slide 64
  {
    pageId: 'page_1787004065060_21',
    summary: '연습문제 8 - m를 km로 바꾸기 (대입 및 결과, 4지선다형)',
    elements: [
      {
        clientKey: 'q2_sub',
        type: 'multiple-choice',
        answer: '$\\frac{1}{1000}\\text{km}$',
        options: ['$\\frac{1}{1000}\\text{km}$', '$\\frac{1}{100}\\text{km}$', '$1000\\text{km}$', '$1\\text{km}$'],
        problemLabel: '(2)-대입',
        responseLabel: '대입값',
        hints: ['m 대신 1/1000 km를 대입합니다.', '$\\frac{1}{1000}\\text{km}$를 선택하세요.'],
        sourceText: '= 10000 × [ ]',
        confidence: 0.99,
        position: { top: 43.5, left: 26.0, width: 10.0, height: 4.5 }
      },
      {
        clientKey: 'q2_ans',
        type: 'multiple-choice',
        answer: '$\\frac{10000}{1000}\\text{km}$',
        options: ['$\\frac{10000}{1000}\\text{km}$', '$\\frac{1000}{1000}\\text{km}$', '$\\frac{100}{1000}\\text{km}$', '$10000\\text{km}$'],
        problemLabel: '(2)-결과',
        responseLabel: '계산결과',
        hints: ['10000 × 1/1000 km = 10000/1000 km입니다.', '$\\frac{10000}{1000}\\text{km}$를 선택하세요.'],
        sourceText: '= [ ]',
        confidence: 0.99,
        position: { top: 43.5, left: 38.5, width: 10.0, height: 4.5 }
      },
      {
        clientKey: 'q3_sub',
        type: 'multiple-choice',
        answer: '$\\frac{1}{1000}\\text{km}$',
        options: ['$\\frac{1}{1000}\\text{km}$', '$\\frac{1}{100}\\text{km}$', '$1000\\text{km}$', '$1\\text{km}$'],
        problemLabel: '(3)-대입',
        responseLabel: '대입값',
        hints: ['m 대신 1/1000 km를 대입합니다.', '$\\frac{1}{1000}\\text{km}$를 선택하세요.'],
        sourceText: '= 999 × [ ]',
        confidence: 0.99,
        position: { top: 63.5, left: 23.5, width: 10.0, height: 4.5 }
      },
      {
        clientKey: 'q3_ans',
        type: 'multiple-choice',
        answer: '$\\frac{999}{1000}\\text{km}$',
        options: ['$\\frac{999}{1000}\\text{km}$', '$\\frac{99}{1000}\\text{km}$', '$\\frac{9}{1000}\\text{km}$', '$999\\text{km}$'],
        problemLabel: '(3)-결과',
        responseLabel: '계산결과',
        hints: ['999 × 1/1000 km = 999/1000 km입니다.', '$\\frac{999}{1000}\\text{km}$를 선택하세요.'],
        sourceText: '= [ ]',
        confidence: 0.99,
        position: { top: 63.5, left: 36.5, width: 10.0, height: 4.5 }
      },
      {
        clientKey: 'q4_sub',
        type: 'multiple-choice',
        answer: '$\\frac{1}{1000}\\text{km}$',
        options: ['$\\frac{1}{1000}\\text{km}$', '$\\frac{1}{100}\\text{km}$', '$1000\\text{km}$', '$1\\text{km}$'],
        problemLabel: '(4)-대입',
        responseLabel: '대입값',
        hints: ['m 대신 1/1000 km를 대입합니다.', '$\\frac{1}{1000}\\text{km}$를 선택하세요.'],
        sourceText: '= 2 × [ ]',
        confidence: 0.99,
        position: { top: 83.5, left: 21.5, width: 10.0, height: 4.5 }
      },
      {
        clientKey: 'q4_ans',
        type: 'multiple-choice',
        answer: '$\\frac{2}{1000}\\text{km}$',
        options: ['$\\frac{2}{1000}\\text{km}$', '$\\frac{20}{1000}\\text{km}$', '$\\frac{200}{1000}\\text{km}$', '$2\\text{km}$'],
        problemLabel: '(4)-결과',
        responseLabel: '계산결과',
        hints: ['2 × 1/1000 km = 2/1000 km입니다.', '$\\frac{2}{1000}\\text{km}$를 선택하세요.'],
        sourceText: '= [ ]',
        confidence: 0.99,
        position: { top: 83.5, left: 34.5, width: 10.0, height: 4.5 }
      },
      {
        clientKey: 'q5_sub',
        type: 'multiple-choice',
        answer: '$\\frac{1}{1000}\\text{km}$',
        options: ['$\\frac{1}{1000}\\text{km}$', '$\\frac{1}{100}\\text{km}$', '$1000\\text{km}$', '$1\\text{km}$'],
        problemLabel: '(5)-대입',
        responseLabel: '대입값',
        hints: ['m 대신 1/1000 km를 대입합니다.', '$\\frac{1}{1000}\\text{km}$를 선택하세요.'],
        sourceText: '= 320 × [ ]',
        confidence: 0.99,
        position: { top: 23.5, left: 62.0, width: 10.0, height: 4.5 }
      },
      {
        clientKey: 'q5_ans',
        type: 'multiple-choice',
        answer: '$\\frac{320}{1000}\\text{km}$',
        options: ['$\\frac{320}{1000}\\text{km}$', '$\\frac{32}{1000}\\text{km}$', '$\\frac{3.2}{1000}\\text{km}$', '$320\\text{km}$'],
        problemLabel: '(5)-결과',
        responseLabel: '계산결과',
        hints: ['320 × 1/1000 km = 320/1000 km입니다.', '$\\frac{320}{1000}\\text{km}$를 선택하세요.'],
        sourceText: '= [ ]',
        confidence: 0.99,
        position: { top: 23.5, left: 74.5, width: 10.0, height: 4.5 }
      },
      {
        clientKey: 'q6_sub',
        type: 'multiple-choice',
        answer: '$\\frac{1}{1000}\\text{km}$',
        options: ['$\\frac{1}{1000}\\text{km}$', '$\\frac{1}{10000}\\text{km}$', '$1000\\text{km}$', '$1\\text{km}$'],
        problemLabel: '(6)-대입',
        responseLabel: '대입값',
        hints: ['m 대신 1/1000 km를 대입합니다.', '$\\frac{1}{1000}\\text{km}$를 선택하세요.'],
        sourceText: '= 2500 × [ ]',
        confidence: 0.99,
        position: { top: 43.5, left: 62.5, width: 10.0, height: 4.5 }
      },
      {
        clientKey: 'q6_ans',
        type: 'multiple-choice',
        answer: '$\\frac{2500}{1000}\\text{km}$',
        options: ['$\\frac{2500}{1000}\\text{km}$', '$\\frac{250}{1000}\\text{km}$', '$\\frac{25}{1000}\\text{km}$', '$2500\\text{km}$'],
        problemLabel: '(6)-결과',
        responseLabel: '계산결과',
        hints: ['2500 × 1/1000 km = 2500/1000 km입니다.', '$\\frac{2500}{1000}\\text{km}$를 선택하세요.'],
        sourceText: '= [ ]',
        confidence: 0.99,
        position: { top: 43.5, left: 75.5, width: 10.0, height: 4.5 }
      },
      {
        clientKey: 'q7_sub',
        type: 'multiple-choice',
        answer: '$\\frac{1}{1000}\\text{km}$',
        options: ['$\\frac{1}{1000}\\text{km}$', '$\\frac{1}{100}\\text{km}$', '$1000\\text{km}$', '$1\\text{km}$'],
        problemLabel: '(7)-대입',
        responseLabel: '대입값',
        hints: ['m 대신 1/1000 km를 대입합니다.', '$\\frac{1}{1000}\\text{km}$를 선택하세요.'],
        sourceText: '= 18181 × [ ]',
        confidence: 0.99,
        position: { top: 63.5, left: 64.0, width: 10.0, height: 4.5 }
      },
      {
        clientKey: 'q7_ans',
        type: 'multiple-choice',
        answer: '$\\frac{18181}{1000}\\text{km}$',
        options: ['$\\frac{18181}{1000}\\text{km}$', '$\\frac{1818}{1000}\\text{km}$', '$\\frac{181}{1000}\\text{km}$', '$18181\\text{km}$'],
        problemLabel: '(7)-결과',
        responseLabel: '계산결과',
        hints: ['18181 × 1/1000 km = 18181/1000 km입니다.', '$\\frac{18181}{1000}\\text{km}$를 선택하세요.'],
        sourceText: '= [ ]',
        confidence: 0.99,
        position: { top: 63.5, left: 76.5, width: 10.0, height: 4.5 }
      },
      {
        clientKey: 'q8_sub',
        type: 'multiple-choice',
        answer: '$\\frac{1}{1000}\\text{km}$',
        options: ['$\\frac{1}{1000}\\text{km}$', '$\\frac{1}{100}\\text{km}$', '$1000\\text{km}$', '$1\\text{km}$'],
        problemLabel: '(8)-대입',
        responseLabel: '대입값',
        hints: ['m 대신 1/1000 km를 대입합니다.', '$\\frac{1}{1000}\\text{km}$를 선택하세요.'],
        sourceText: '= 7900 × [ ]',
        confidence: 0.99,
        position: { top: 83.5, left: 62.5, width: 10.0, height: 4.5 }
      },
      {
        clientKey: 'q8_ans',
        type: 'multiple-choice',
        answer: '$\\frac{7900}{1000}\\text{km}$',
        options: ['$\\frac{7900}{1000}\\text{km}$', '$\\frac{790}{1000}\\text{km}$', '$\\frac{79}{1000}\\text{km}$', '$7900\\text{km}$'],
        problemLabel: '(8)-결과',
        responseLabel: '계산결과',
        hints: ['7900 × 1/1000 km = 7900/1000 km입니다.', '$\\frac{7900}{1000}\\text{km}$를 선택하세요.'],
        sourceText: '= [ ]',
        confidence: 0.99,
        position: { top: 83.5, left: 75.5, width: 10.0, height: 4.5 }
      }
    ]
  },

  // Page 22: Slide 65
  {
    pageId: 'page_1787004065060_22',
    summary: '뜻풀이 문제 15, 16, 17 - 단위 배율 관계 (4지선다형)',
    elements: [
      {
        clientKey: 'q15',
        type: 'multiple-choice',
        answer: '③ 1000배',
        options: ['① 100배', '② 1000000배', '③ 1000배', '④ 0.001배'],
        problemLabel: '뜻풀이 문제 15',
        responseLabel: 'km는 m의 몇 배',
        hints: ['km는 m의 1000배입니다.', '③을 선택하세요.'],
        sourceText: 'km는 m의 몇 배입니까?',
        confidence: 0.99,
        position: { top: 49.0, left: 32.0, width: 54.0, height: 8.0 }
      },
      {
        clientKey: 'q16',
        type: 'multiple-choice',
        answer: '① 10배',
        options: ['① 10배', '② 0.1배', '③ 100배', '④ 1000배'],
        problemLabel: '뜻풀이 문제 16',
        responseLabel: 'cm는 mm의 몇 배',
        hints: ['1cm = 10mm이므로 10배입니다.', '①을 선택하세요.'],
        sourceText: 'cm는 mm의 몇 배입니까?',
        confidence: 0.99,
        position: { top: 64.0, left: 32.0, width: 54.0, height: 8.0 }
      },
      {
        clientKey: 'q17',
        type: 'multiple-choice',
        answer: '② 0.01배',
        options: ['① 100배', '② 0.01배', '③ 0.1배', '④ 10배'],
        problemLabel: '뜻풀이 문제 17',
        responseLabel: 'cm는 m의 몇 배',
        hints: ['1cm = 1/100m = 0.01m이므로 0.01배입니다.', '②를 선택하세요.'],
        sourceText: 'cm는 m의 몇 배입니까?',
        confidence: 0.99,
        position: { top: 79.0, left: 32.0, width: 54.0, height: 8.0 }
      }
    ]
  },

  // Page 23: Slide 66
  {
    pageId: 'page_1787004065060_23',
    summary: '연습문제 9 - 연속 단위 변환 (4지선다형)',
    elements: [
      {
        clientKey: 'q2_m',
        type: 'multiple-choice',
        answer: '10m',
        options: ['10m', '100m', '1m', '0.1m'],
        problemLabel: '(2)-m',
        responseLabel: 'm 값',
        hints: ['0.01km × 1000 = 10m입니다.', '10m를 선택하세요.'],
        sourceText: '= [ ]m',
        confidence: 0.99,
        position: { top: 43.0, left: 37.0, width: 10.5, height: 4.5 }
      },
      {
        clientKey: 'q2_cm',
        type: 'multiple-choice',
        answer: '1000cm',
        options: ['1000cm', '100cm', '10000cm', '10cm'],
        problemLabel: '(2)-cm',
        responseLabel: 'cm 값',
        hints: ['10m × 100 = 1000cm입니다.', '1000cm를 선택하세요.'],
        sourceText: '= [ ]cm',
        confidence: 0.99,
        position: { top: 43.0, left: 51.5, width: 11.5, height: 4.5 }
      },
      {
        clientKey: 'q2_mm',
        type: 'multiple-choice',
        answer: '10000mm',
        options: ['10000mm', '1000mm', '100000mm', '100mm'],
        problemLabel: '(2)-mm',
        responseLabel: 'mm 값',
        hints: ['1000cm × 10 = 10000mm입니다.', '10000mm를 선택하세요.'],
        sourceText: '= [ ]mm',
        confidence: 0.99,
        position: { top: 43.0, left: 67.5, width: 14.5, height: 4.5 }
      },
      {
        clientKey: 'q3_m',
        type: 'multiple-choice',
        answer: '7000m',
        options: ['7000m', '700m', '70m', '70000m'],
        problemLabel: '(3)-m',
        responseLabel: 'm 값',
        hints: ['7km × 1000 = 7000m입니다.', '7000m를 선택하세요.'],
        sourceText: '= [ ]m',
        confidence: 0.99,
        position: { top: 63.0, left: 37.0, width: 10.5, height: 4.5 }
      },
      {
        clientKey: 'q3_cm',
        type: 'multiple-choice',
        answer: '700000cm',
        options: ['700000cm', '70000cm', '7000cm', '7000000cm'],
        problemLabel: '(3)-cm',
        responseLabel: 'cm 값',
        hints: ['7000m × 100 = 700000cm입니다.', '700000cm를 선택하세요.'],
        sourceText: '= [ ]cm',
        confidence: 0.99,
        position: { top: 63.0, left: 51.5, width: 11.5, height: 4.5 }
      },
      {
        clientKey: 'q3_mm',
        type: 'multiple-choice',
        answer: '7000000mm',
        options: ['7000000mm', '700000mm', '70000mm', '70000000mm'],
        problemLabel: '(3)-mm',
        responseLabel: 'mm 값',
        hints: ['700000cm × 10 = 7000000mm입니다.', '7000000mm를 선택하세요.'],
        sourceText: '= [ ]mm',
        confidence: 0.99,
        position: { top: 63.0, left: 67.5, width: 14.5, height: 4.5 }
      },
      {
        clientKey: 'q4_m',
        type: 'multiple-choice',
        answer: '2m',
        options: ['2m', '20m', '0.2m', '200m'],
        problemLabel: '(4)-m',
        responseLabel: 'm 값',
        hints: ['0.002km × 1000 = 2m입니다.', '2m를 선택하세요.'],
        sourceText: '= [ ]m',
        confidence: 0.99,
        position: { top: 83.0, left: 37.0, width: 10.5, height: 4.5 }
      },
      {
        clientKey: 'q4_cm',
        type: 'multiple-choice',
        answer: '200cm',
        options: ['200cm', '20cm', '2000cm', '2cm'],
        problemLabel: '(4)-cm',
        responseLabel: 'cm 값',
        hints: ['2m × 100 = 200cm입니다.', '200cm를 선택하세요.'],
        sourceText: '= [ ]cm',
        confidence: 0.99,
        position: { top: 83.0, left: 51.5, width: 11.5, height: 4.5 }
      },
      {
        clientKey: 'q4_mm',
        type: 'multiple-choice',
        answer: '2000mm',
        options: ['2000mm', '200mm', '20000mm', '20mm'],
        problemLabel: '(4)-mm',
        responseLabel: 'mm 값',
        hints: ['200cm × 10 = 2000mm입니다.', '2000mm를 선택하세요.'],
        sourceText: '= [ ]mm',
        confidence: 0.99,
        position: { top: 83.0, left: 67.5, width: 14.5, height: 4.5 }
      }
    ]
  },

  // Page 24: Slide 67
  {
    pageId: 'page_1787004065060_24',
    summary: '연습문제 10 - 단위 변환 완성하기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '11000mm',
        options: ['11000mm', '1100mm', '110000mm', '110mm'],
        problemLabel: '(2)',
        responseLabel: 'mm 변환값',
        hints: ['0.011km × 1,000,000 = 11000mm입니다.', '11000mm를 선택하세요.'],
        sourceText: '0.011km = [ ]',
        confidence: 0.99,
        position: { top: 43.0, left: 51.5, width: 11.5, height: 4.5 }
      },
      {
        clientKey: 'q3_cm',
        type: 'multiple-choice',
        answer: '12cm',
        options: ['12cm', '120cm', '1.2cm', '1200cm'],
        problemLabel: '(3)-cm',
        responseLabel: 'cm 변환값',
        hints: ['0.12m × 100 = 12cm입니다.', '12cm를 선택하세요.'],
        sourceText: '= [ ]cm',
        confidence: 0.99,
        position: { top: 63.0, left: 51.5, width: 11.5, height: 4.5 }
      },
      {
        clientKey: 'q3_mm',
        type: 'multiple-choice',
        answer: '120mm',
        options: ['120mm', '12mm', '1200mm', '1.2mm'],
        problemLabel: '(3)-mm',
        responseLabel: 'mm 변환값',
        hints: ['12cm × 10 = 120mm입니다.', '120mm를 선택하세요.'],
        sourceText: '= [ ]mm',
        confidence: 0.99,
        position: { top: 63.0, left: 67.5, width: 14.5, height: 4.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '3mm',
        options: ['3mm', '30mm', '0.3mm', '300mm'],
        problemLabel: '(4)',
        responseLabel: 'mm 변환값',
        hints: ['0.003m × 1000 = 3mm입니다.', '3mm를 선택하세요.'],
        sourceText: '0.003m = [ ]',
        confidence: 0.99,
        position: { top: 83.0, left: 67.5, width: 14.5, height: 4.5 }
      }
    ]
  },

  // Page 25: Slide 68
  {
    pageId: 'page_1787004065060_25',
    summary: '연습문제 11 - 단위 변환 계산하기 (정수 입력형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'input',
        inputMode: 'integer',
        answer: '2000',
        acceptedAnswers: ['2000', '2000mm'],
        problemLabel: '(2)',
        responseLabel: 'mm 변환값',
        hints: ['2m × 1000 = 2000mm입니다.', '2000을 입력하세요.'],
        sourceText: '2m = [ ]mm',
        confidence: 0.99,
        position: { top: 41.5, left: 30.5, width: 14.0, height: 3.5 }
      },
      {
        clientKey: 'q3',
        type: 'input',
        inputMode: 'integer',
        answer: '111',
        acceptedAnswers: ['111', '111mm'],
        problemLabel: '(3)',
        responseLabel: 'mm 변환값',
        hints: ['0.111m × 1000 = 111mm입니다.', '111을 입력하세요.'],
        sourceText: '0.111m = [ ]mm',
        confidence: 0.99,
        position: { top: 61.5, left: 30.5, width: 14.0, height: 3.5 }
      },
      {
        clientKey: 'q4',
        type: 'input',
        inputMode: 'integer',
        answer: '1230000',
        acceptedAnswers: ['1230000', '1230000mm'],
        problemLabel: '(4)',
        responseLabel: 'mm 변환값',
        hints: ['1.23km × 1,000,000 = 1230000mm입니다.', '1230000을 입력하세요.'],
        sourceText: '1.23km = [ ]mm',
        confidence: 0.99,
        position: { top: 81.5, left: 30.5, width: 16.5, height: 3.5 }
      },
      {
        clientKey: 'q5',
        type: 'input',
        inputMode: 'integer',
        answer: '10',
        acceptedAnswers: ['10', '10mm'],
        problemLabel: '(5)',
        responseLabel: 'mm 변환값',
        hints: ['1cm × 10 = 10mm입니다.', '10을 입력하세요.'],
        sourceText: '1cm = [ ]mm',
        confidence: 0.99,
        position: { top: 21.5, left: 69.0, width: 14.0, height: 3.5 }
      },
      {
        clientKey: 'q6',
        type: 'input',
        inputMode: 'integer',
        answer: '5000',
        acceptedAnswers: ['5000', '5000cm'],
        problemLabel: '(6)',
        responseLabel: 'cm 변환값',
        hints: ['0.05km × 100,000 = 5000cm입니다.', '5000을 입력하세요.'],
        sourceText: '0.05km = [ ]cm',
        confidence: 0.99,
        position: { top: 41.5, left: 69.0, width: 14.0, height: 3.5 }
      },
      {
        clientKey: 'q7',
        type: 'input',
        inputMode: 'integer',
        answer: '2',
        acceptedAnswers: ['2', '2mm'],
        problemLabel: '(7)',
        responseLabel: 'mm 변환값',
        hints: ['0.2cm × 10 = 2mm입니다.', '2를 입력하세요.'],
        sourceText: '0.2cm = [ ]mm',
        confidence: 0.99,
        position: { top: 61.5, left: 69.0, width: 14.0, height: 3.5 }
      },
      {
        clientKey: 'q8',
        type: 'input',
        inputMode: 'integer',
        answer: '980',
        acceptedAnswers: ['980', '980mm'],
        problemLabel: '(8)',
        responseLabel: 'mm 변환값',
        hints: ['0.98m × 1000 = 980mm입니다.', '980을 입력하세요.'],
        sourceText: '0.98m = [ ]mm',
        confidence: 0.99,
        position: { top: 81.5, left: 69.0, width: 14.0, height: 3.5 }
      }
    ]
  },

  // Page 26: Slide 69
  {
    pageId: 'page_1787004065060_26',
    summary: '연습문제 12 - 단위 역변환 (4지선다형)',
    elements: [
      {
        clientKey: 'q2_km',
        type: 'multiple-choice',
        answer: '1.234km',
        options: ['1.234km', '12.34km', '0.1234km', '123.4km'],
        problemLabel: '(2)-km',
        responseLabel: 'km 값',
        hints: ['1234000mm ÷ 1,000,000 = 1.234km입니다.', '1.234km를 선택하세요.'],
        sourceText: '[ ]km',
        confidence: 0.99,
        position: { top: 45.0, left: 20.0, width: 12.0, height: 4.5 }
      },
      {
        clientKey: 'q2_m',
        type: 'multiple-choice',
        answer: '1234m',
        options: ['1234m', '123.4m', '12340m', '12.34m'],
        problemLabel: '(2)-m',
        responseLabel: 'm 값',
        hints: ['1234000mm ÷ 1000 = 1234m입니다.', '1234m를 선택하세요.'],
        sourceText: '[ ]m',
        confidence: 0.99,
        position: { top: 45.0, left: 36.5, width: 12.0, height: 4.5 }
      },
      {
        clientKey: 'q2_cm',
        type: 'multiple-choice',
        answer: '123400cm',
        options: ['123400cm', '12340cm', '1234cm', '1234000cm'],
        problemLabel: '(2)-cm',
        responseLabel: 'cm 값',
        hints: ['1234000mm ÷ 10 = 123400cm입니다.', '123400cm를 선택하세요.'],
        sourceText: '[ ]cm',
        confidence: 0.99,
        position: { top: 45.0, left: 51.0, width: 13.0, height: 4.5 }
      },
      {
        clientKey: 'q3_km',
        type: 'multiple-choice',
        answer: '0.0789km',
        options: ['0.0789km', '0.789km', '7.89km', '0.00789km'],
        problemLabel: '(3)-km',
        responseLabel: 'km 값',
        hints: ['78900mm ÷ 1,000,000 = 0.0789km입니다.', '0.0789km를 선택하세요.'],
        sourceText: '[ ]km',
        confidence: 0.99,
        position: { top: 64.5, left: 20.0, width: 12.0, height: 4.5 }
      },
      {
        clientKey: 'q3_m',
        type: 'multiple-choice',
        answer: '78.9m',
        options: ['78.9m', '7.89m', '789m', '0.789m'],
        problemLabel: '(3)-m',
        responseLabel: 'm 값',
        hints: ['78900mm ÷ 1000 = 78.9m입니다.', '78.9m를 선택하세요.'],
        sourceText: '[ ]m',
        confidence: 0.99,
        position: { top: 64.5, left: 36.5, width: 12.0, height: 4.5 }
      },
      {
        clientKey: 'q3_cm',
        type: 'multiple-choice',
        answer: '7890cm',
        options: ['7890cm', '789cm', '78900cm', '78.9cm'],
        problemLabel: '(3)-cm',
        responseLabel: 'cm 값',
        hints: ['78900mm ÷ 10 = 7890cm입니다.', '7890cm를 선택하세요.'],
        sourceText: '[ ]cm',
        confidence: 0.99,
        position: { top: 64.5, left: 51.0, width: 13.0, height: 4.5 }
      },
      {
        clientKey: 'q4_km',
        type: 'multiple-choice',
        answer: '1.234567km',
        options: ['1.234567km', '12.34567km', '0.1234567km', '123.4567km'],
        problemLabel: '(4)-km',
        responseLabel: 'km 값',
        hints: ['1234567mm ÷ 1,000,000 = 1.234567km입니다.', '1.234567km를 선택하세요.'],
        sourceText: '[ ]km',
        confidence: 0.99,
        position: { top: 84.0, left: 20.0, width: 12.0, height: 4.5 }
      },
      {
        clientKey: 'q4_m',
        type: 'multiple-choice',
        answer: '1234.567m',
        options: ['1234.567m', '123.4567m', '12345.67m', '12.34567m'],
        problemLabel: '(4)-m',
        responseLabel: 'm 값',
        hints: ['1234567mm ÷ 1000 = 1234.567m입니다.', '1234.567m를 선택하세요.'],
        sourceText: '[ ]m',
        confidence: 0.99,
        position: { top: 84.0, left: 36.5, width: 12.0, height: 4.5 }
      },
      {
        clientKey: 'q4_cm',
        type: 'multiple-choice',
        answer: '123456.7cm',
        options: ['123456.7cm', '12345.67cm', '1234567cm', '1234.567cm'],
        problemLabel: '(4)-cm',
        responseLabel: 'cm 값',
        hints: ['1234567mm ÷ 10 = 123456.7cm입니다.', '123456.7cm를 선택하세요.'],
        sourceText: '[ ]cm',
        confidence: 0.99,
        position: { top: 84.0, left: 51.0, width: 13.0, height: 4.5 }
      }
    ]
  },

  // Page 27: Slide 70
  {
    pageId: 'page_1787004065060_27',
    summary: '연습문제 13 - 단위 역변환 완성하기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '9.25km',
        options: ['9.25km', '92.5km', '0.925km', '925km'],
        problemLabel: '(2)',
        responseLabel: 'km 값',
        hints: ['9250000mm = 9.25km입니다.', '9.25km를 선택하세요.'],
        sourceText: '[ ]km = 9250000mm',
        confidence: 0.99,
        position: { top: 45.0, left: 20.0, width: 12.0, height: 4.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '10m',
        options: ['10m', '1m', '100m', '0.1m'],
        problemLabel: '(3)',
        responseLabel: 'm 값',
        hints: ['1000cm = 10m입니다.', '10m를 선택하세요.'],
        sourceText: '[ ]m = 1000cm',
        confidence: 0.99,
        position: { top: 64.5, left: 20.0, width: 12.0, height: 4.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '1.2cm',
        options: ['1.2cm', '12cm', '0.12cm', '120cm'],
        problemLabel: '(4)',
        responseLabel: 'cm 값',
        hints: ['12mm = 1.2cm입니다.', '1.2cm를 선택하세요.'],
        sourceText: '[ ]cm = 12mm',
        confidence: 0.99,
        position: { top: 84.0, left: 51.0, width: 13.0, height: 4.5 }
      }
    ]
  },

  // Page 28: Slide 71
  {
    pageId: 'page_1787004065060_28',
    summary: '연습문제 14 - 복합 단위 변환 (입력 및 4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'input',
        inputMode: 'integer',
        answer: '2',
        acceptedAnswers: ['2', '2cm'],
        problemLabel: '(2)',
        responseLabel: 'cm 변환값',
        hints: ['20mm = 2cm입니다.', '2를 입력하세요.'],
        sourceText: '20mm = [ ]cm',
        confidence: 0.99,
        position: { top: 41.5, left: 30.5, width: 14.0, height: 3.5 }
      },
      {
        clientKey: 'q3',
        type: 'input',
        inputMode: 'decimal',
        answer: '111.2',
        acceptedAnswers: ['111.2', '111.2cm'],
        problemLabel: '(3)',
        responseLabel: 'cm 변환값',
        hints: ['1112mm = 111.2cm입니다.', '111.2를 입력하세요.'],
        sourceText: '1112mm = [ ]cm',
        confidence: 0.99,
        position: { top: 61.5, left: 30.5, width: 14.0, height: 3.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '0.000001',
        options: ['0.000001', '0.00001', '0.0001', '0.001'],
        problemLabel: '(4)',
        responseLabel: 'km 변환값',
        hints: ['1mm = 0.000001km입니다.', '0.000001을 선택하세요.'],
        sourceText: '1mm = [ ]km',
        confidence: 0.99,
        position: { top: 81.5, left: 30.5, width: 16.5, height: 3.5 }
      },
      {
        clientKey: 'q5',
        type: 'multiple-choice',
        answer: '0.0015',
        options: ['0.0015', '0.015', '0.15', '0.00015'],
        problemLabel: '(5)',
        responseLabel: 'km 변환값',
        hints: ['150cm = 0.0015km입니다.', '0.0015를 선택하세요.'],
        sourceText: '150cm = [ ]km',
        confidence: 0.99,
        position: { top: 21.5, left: 69.0, width: 14.0, height: 3.5 }
      },
      {
        clientKey: 'q6',
        type: 'input',
        inputMode: 'decimal',
        answer: '0.543',
        acceptedAnswers: ['0.543', '0.543km'],
        problemLabel: '(6)',
        responseLabel: 'km 변환값',
        hints: ['543000mm = 0.543km입니다.', '0.543을 입력하세요.'],
        sourceText: '543000mm = [ ]km',
        confidence: 0.99,
        position: { top: 41.5, left: 69.0, width: 14.0, height: 3.5 }
      },
      {
        clientKey: 'q7',
        type: 'input',
        inputMode: 'decimal',
        answer: '0.01',
        acceptedAnswers: ['0.01', '0.01cm'],
        problemLabel: '(7)',
        responseLabel: 'cm 변환값',
        hints: ['0.1mm = 0.01cm입니다.', '0.01을 입력하세요.'],
        sourceText: '0.1mm = [ ]cm',
        confidence: 0.99,
        position: { top: 61.5, left: 69.0, width: 14.0, height: 3.5 }
      },
      {
        clientKey: 'q8',
        type: 'multiple-choice',
        answer: '0.0018',
        options: ['0.0018', '0.018', '0.18', '0.00018'],
        problemLabel: '(8)',
        responseLabel: 'km 변환값',
        hints: ['180cm = 0.0018km입니다.', '0.0018을 선택하세요.'],
        sourceText: '180cm = [ ]km',
        confidence: 0.99,
        position: { top: 81.5, left: 69.0, width: 14.0, height: 3.5 }
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
console.log('All 28 pages generated successfully!');
