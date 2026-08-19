import fs from 'node:fs';

const unitId = 'ratios_ratio_chap2_unit5';

const pagesData = [
  // Page 1: Slide 136
  {
    pageId: 'page_1786934026110_1',
    summary: '뜻풀이 문제 1, 2 - 닮은꼴의 정의 (4지선다형)',
    elements: [
      {
        clientKey: 'q1',
        type: 'multiple-choice',
        answer: '③ 크기는 다를 수 있지만 모양이 똑같은 것',
        options: [
          '① 빵점 맞았다니, 꼴 좋다.',
          '② 크기와 모양이 반드시 같은 것',
          '③ 크기는 다를 수 있지만 모양이 똑같은 것',
          '④ 대충 비슷한 거 아닐까?'
        ],
        problemLabel: '뜻풀이 문제 1',
        responseLabel: '닮은꼴의 뜻',
        hints: ['크기는 다르지만 모양이 똑같은 도형을 말합니다.', '③을 선택하세요.'],
        sourceText: '닮은꼴의 뜻이 무엇입니까?',
        confidence: 0.99,
        position: { top: 52.0, left: 32.0, width: 52.0, height: 16.0 }
      },
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '④ 원본을 가로는 길게, 세로는 더 길게 해서 찌그러뜨린 것',
        options: [
          '① 원본과 크기는 달라도 모양이 똑같은 것',
          '② 원본을 일정한 비율로 확대한 것',
          '③ 원본을 일정한 비율로 확대한 후 회전시킨 것',
          '④ 원본을 가로는 길게, 세로는 더 길게 해서 찌그러뜨린 것'
        ],
        problemLabel: '뜻풀이 문제 2',
        responseLabel: '닮은꼴이 아닌 것',
        hints: ['일정한 비율이 아니라 찌그러뜨리면 닮은꼴이 아닙니다.', '④를 선택하세요.'],
        sourceText: '다음 중 닮은꼴이 아닌 것은?',
        confidence: 0.99,
        position: { top: 72.0, left: 32.0, width: 52.0, height: 16.0 }
      }
    ]
  },

  // Page 2: Slide 137
  {
    pageId: 'page_1786934026110_2',
    summary: '연습문제 1 - 보기와 닮은꼴이 아닌 것 고르기 (4지선다형)',
    elements: [
      {
        clientKey: 'q1',
        type: 'multiple-choice',
        answer: '①, ②',
        options: ['①', '②', '③', '①, ②'],
        acceptedAnswers: ['①', '②', '①, ②'],
        problemLabel: '(1)',
        responseLabel: '닮은꼴이 아닌 것',
        hints: ['③은 축소본이고, ①과 ②는 모양/동작이 변형되었습니다.', '①, ②를 선택하세요.'],
        sourceText: '말 그림',
        confidence: 0.99,
        position: { top: 14.5, left: 35.0, width: 50.0, height: 13.0 }
      },
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '②, ③',
        options: ['①', '②', '③', '②, ③'],
        acceptedAnswers: ['②', '③', '②, ③'],
        problemLabel: '(2)',
        responseLabel: '닮은꼴이 아닌 것',
        hints: ['①은 축소본이고, ②는 정사각형, ③은 가로 직사각형입니다.', '②, ③을 선택하세요.'],
        sourceText: '직사각형',
        confidence: 0.99,
        position: { top: 34.5, left: 35.0, width: 50.0, height: 13.0 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '①, ③',
        options: ['①', '②', '③', '①, ③'],
        acceptedAnswers: ['①', '③', '①, ③'],
        problemLabel: '(3)',
        responseLabel: '닮은꼴이 아닌 것',
        hints: ['②는 축소본이고, ①과 ③은 각도와 가로세로 비율이 다릅니다.', '①, ③을 선택하세요.'],
        sourceText: '직각삼각형',
        confidence: 0.99,
        position: { top: 54.5, left: 35.0, width: 50.0, height: 13.0 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '①, ③',
        options: ['①', '②', '③', '①, ③'],
        acceptedAnswers: ['①', '③', '①, ③'],
        problemLabel: '(4)',
        responseLabel: '닮은꼴이 아닌 것',
        hints: ['②는 축소본이고, ①과 ③은 다른 다각형입니다.', '①, ③을 선택하세요.'],
        sourceText: '사다리꼴',
        confidence: 0.99,
        position: { top: 74.5, left: 35.0, width: 50.0, height: 13.0 }
      }
    ]
  },

  // Page 3: Slide 138
  {
    pageId: 'page_1786934026110_3',
    summary: '연습문제 1 - aspect ratio로 x의 길이 구하기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '$\\frac{9}{2}$',
        options: ['$\\frac{9}{2}$', '$\\frac{2}{9}$', '4.5', '$\\frac{9}{3}$'],
        problemLabel: '(2)',
        responseLabel: 'x의 길이',
        hints: ['3/2 = x/3 에서 2x = 9이므로 x = 9/2입니다.', '$\\frac{9}{2}$를 선택하세요.'],
        sourceText: '3/2 = x/3',
        confidence: 0.99,
        position: { top: 83.5, left: 55.0, width: 30.0, height: 4.5 }
      }
    ]
  },

  // Page 4: Slide 139
  {
    pageId: 'page_1786934026110_4',
    summary: '연습문제 2 - aspect ratio로 x의 길이 구하기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '$\\frac{50}{7}$',
        options: ['$\\frac{50}{7}$', '$\\frac{100}{14}$', '$\\frac{7}{50}$', '7'],
        problemLabel: '(2)',
        responseLabel: 'x의 길이',
        hints: ['14/5 = 20/x 에서 14x = 100이므로 x = 50/7입니다.', '$\\frac{50}{7}$을 선택하세요.'],
        sourceText: '14/5 = 20/x',
        confidence: 0.99,
        position: { top: 45.5, left: 55.0, width: 30.0, height: 4.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '$\\frac{14}{3}$',
        options: ['$\\frac{14}{3}$', '$\\frac{3}{14}$', '4', '$\\frac{7}{2}$'],
        problemLabel: '(3)',
        responseLabel: 'x의 길이',
        hints: ['7/3 = x/2 에서 3x = 14이므로 x = 14/3입니다.', '$\\frac{14}{3}$를 선택하세요.'],
        sourceText: '7/3 = x/2',
        confidence: 0.99,
        position: { top: 65.5, left: 55.0, width: 30.0, height: 4.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '$\\frac{36}{11}$',
        options: ['$\\frac{36}{11}$', '$\\frac{11}{36}$', '3', '$\\frac{36}{6}$'],
        problemLabel: '(4)',
        responseLabel: 'x의 길이',
        hints: ['6/11 = x/6 에서 11x = 36이므로 x = 36/11입니다.', '$\\frac{36}{11}$을 선택하세요.'],
        sourceText: '6/11 = x/6',
        confidence: 0.99,
        position: { top: 85.5, left: 55.0, width: 30.0, height: 4.5 }
      }
    ]
  },

  // Page 5: Slide 140
  {
    pageId: 'page_1786934026110_5',
    summary: '그리기 문제 1 - x에 대응하는 변 찾기 (4지선다형)',
    elements: [
      {
        clientKey: 'q1',
        type: 'multiple-choice',
        answer: '가장 긴 변(빗변)',
        options: ['가장 긴 변(빗변)', '가장 짧은 변', '중간 변', '수직인 변'],
        problemLabel: '(1)',
        responseLabel: '대응하는 변',
        hints: ['x는 둔각삼각형에서 가장 긴 변(빗변)에 해당합니다.', '가장 긴 변(빗변)을 선택하세요.'],
        sourceText: 'x에 대응하는 변',
        confidence: 0.99,
        position: { top: 54.0, left: 68.0, width: 16.0, height: 7.0 }
      },
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '가장 짧은 변(수직변/밑변)',
        options: ['가장 짧은 변(수직변/밑변)', '가장 긴 변(빗변)', '중간 변', '모든 변'],
        problemLabel: '(2)',
        responseLabel: '대응하는 변',
        hints: ['x는 직각삼각형에서 가장 짧은 변에 해당합니다.', '가장 짧은 변(수직변/밑변)을 선택하세요.'],
        sourceText: 'x에 대응하는 변',
        confidence: 0.99,
        position: { top: 76.0, left: 43.0, width: 32.0, height: 7.0 }
      }
    ]
  },

  // Page 6: Slide 141
  {
    pageId: 'page_1786934026110_6',
    summary: '그리기 문제 2 - x에 대응하는 변 찾기 (4지선다형)',
    elements: [
      {
        clientKey: 'q1',
        type: 'multiple-choice',
        answer: '오른쪽 위 대각선 변',
        options: ['오른쪽 위 대각선 변', '왼쪽 세로변', '아래쪽 가로변', '오른쪽 세로변'],
        problemLabel: '(1)',
        responseLabel: '대응하는 변',
        hints: ['x는 잘려나간 모서리의 대각선 변입니다.', '오른쪽 위 대각선 변을 선택하세요.'],
        sourceText: 'x에 대응하는 변',
        confidence: 0.99,
        position: { top: 16.0, left: 48.0, width: 30.0, height: 10.0 }
      },
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '가장 긴 변(빗변)',
        options: ['가장 긴 변(빗변)', '가장 짧은 변', '중간 변', '수평 밑변'],
        problemLabel: '(2)',
        responseLabel: '대응하는 변',
        hints: ['x는 가장 긴 변(빗변)입니다.', '가장 긴 변(빗변)을 선택하세요.'],
        sourceText: 'x에 대응하는 변',
        confidence: 0.99,
        position: { top: 36.0, left: 45.0, width: 38.0, height: 10.0 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '가장 긴 가로 기준변',
        options: ['가장 긴 가로 기준변', '위쪽 왼쪽 변', '위쪽 오른쪽 변', '가장 짧은 변'],
        problemLabel: '(3)',
        responseLabel: '대응하는 변',
        hints: ['x는 넓은 이등변삼각형의 가장 긴 밑변입니다.', '가장 긴 가로 기준변을 선택하세요.'],
        sourceText: 'x에 대응하는 변',
        confidence: 0.99,
        position: { top: 56.0, left: 45.0, width: 38.0, height: 10.0 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '위쪽 짧은 가로변(윗변)',
        options: ['위쪽 짧은 가로변(윗변)', '아래쪽 긴 가로변(밑변)', '왼쪽 빗변', '오른쪽 빗변'],
        problemLabel: '(4)',
        responseLabel: '대응하는 변',
        hints: ['x는 사다리꼴의 윗변입니다.', '위쪽 짧은 가로변(윗변)을 선택하세요.'],
        sourceText: 'x에 대응하는 변',
        confidence: 0.99,
        position: { top: 76.0, left: 46.0, width: 36.0, height: 10.0 }
      }
    ]
  },

  // Page 7: Slide 142
  {
    pageId: 'page_1786934026110_7',
    summary: '연습문제 3 - 대응변의 비로 x의 길이 구하기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '$\\frac{140}{9}$',
        options: ['$\\frac{140}{9}$', '$\\frac{9}{140}$', '15', '$\\frac{140}{10}$'],
        problemLabel: '(2)',
        responseLabel: 'x의 길이',
        hints: ['10/x = 9/14 에서 9x = 140이므로 x = 140/9입니다.', '$\\frac{140}{9}$를 선택하세요.'],
        sourceText: '10/x = 9/14',
        confidence: 0.99,
        position: { top: 45.5, left: 55.0, width: 30.0, height: 4.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '$\\frac{48}{5}$',
        options: ['$\\frac{48}{5}$', '$\\frac{5}{48}$', '9.6', '$\\frac{48}{8}$'],
        problemLabel: '(3)',
        responseLabel: 'x의 길이',
        hints: ['5/6 = 8/x 에서 5x = 48이므로 x = 48/5입니다.', '$\\frac{48}{5}$을 선택하세요.'],
        sourceText: '5/6 = 8/x',
        confidence: 0.99,
        position: { top: 65.5, left: 55.0, width: 30.0, height: 4.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '$\\frac{80}{7}$',
        options: ['$\\frac{80}{7}$', '$\\frac{400}{35}$', '$\\frac{7}{80}$', '11'],
        problemLabel: '(4)',
        responseLabel: 'x의 길이',
        hints: ['20/x = 35/20 에서 35x = 400이므로 x = 80/7입니다.', '$\\frac{80}{7}$을 선택하세요.'],
        sourceText: '20/x = 35/20',
        confidence: 0.99,
        position: { top: 85.5, left: 55.0, width: 30.0, height: 4.5 }
      }
    ]
  },

  // Page 8: Slide 143
  {
    pageId: 'page_1786934026110_8',
    summary: '연습문제 4 - 닮음비 활용 예시 설명 페이지',
    elements: []
  },

  // Page 9: Slide 144
  {
    pageId: 'page_1786934026110_9',
    summary: '연습문제 5 - 닮음비로 나무 높이 x 구하기 (정수/소수 입력형)',
    elements: [
      {
        clientKey: 'q1',
        type: 'input',
        inputMode: 'integer',
        answer: '10',
        acceptedAnswers: ['10', '10m'],
        problemLabel: '(1)',
        responseLabel: '나무의 높이 x',
        hints: ['2/5 = 4/x 에서 2x = 20이므로 x = 10입니다.', '10을 입력하세요.'],
        sourceText: '2/5 = 4/x',
        confidence: 0.99,
        position: { top: 31.5, left: 55.0, width: 30.0, height: 4.5 }
      },
      {
        clientKey: 'q2',
        type: 'input',
        inputMode: 'decimal',
        answer: '25.2',
        acceptedAnswers: ['25.2', '126/5', '25.2m'],
        problemLabel: '(2)',
        responseLabel: '나무의 높이 x',
        hints: ['5/14 = 9/x 에서 5x = 126이므로 x = 25.2입니다.', '25.2를 입력하세요.'],
        sourceText: '5/14 = 9/x',
        confidence: 0.99,
        position: { top: 57.5, left: 55.0, width: 30.0, height: 4.5 }
      },
      {
        clientKey: 'q3',
        type: 'input',
        inputMode: 'decimal',
        answer: '16.25',
        acceptedAnswers: ['16.25', '65/4', '16.25m'],
        problemLabel: '(3)',
        responseLabel: '나무의 높이 x',
        hints: ['4/13 = 5/x 에서 4x = 65이므로 x = 16.25입니다.', '16.25를 입력하세요.'],
        sourceText: '4/13 = 5/x',
        confidence: 0.99,
        position: { top: 83.5, left: 55.0, width: 30.0, height: 4.5 }
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
