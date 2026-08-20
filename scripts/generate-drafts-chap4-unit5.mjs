import fs from 'node:fs';

const unitId = 'ratios_ratio_chap4_unit5';

const pagesData = [
  // Page 1: Slide 131
  {
    pageId: 'page_1787004322177_1',
    summary: '연습문제 1 - 수직선에서 1단위(single unit)의 값 구하기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '② 3333원',
        options: ['① 1111원', '② 3333원', '③ 6666원', '④ 9999원'],
        problemLabel: '(2)',
        responseLabel: '1단위(single unit)의 값',
        hints: ['오른쪽 1칸(1단위)의 표시된 금액을 확인하세요.', '1단위의 값은 3333원입니다.', '② 3333원을 선택하세요.'],
        sourceText: '(2) 3333원 수직선 1단위의 값',
        confidence: 0.99,
        position: { top: 82.0, left: 16.0, width: 31.0, height: 6.0 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '② 1650',
        options: ['① 1100', '② 1650', '③ 3300', '④ 6600'],
        problemLabel: '(3)',
        responseLabel: '1단위(single unit)의 값',
        hints: ['3300은 2칸(2단위)에 해당하는 값입니다.', '3300 ÷ 2 = 1650입니다.', '② 1650을 선택하세요.'],
        sourceText: '(3) 3300 수직선 1단위의 값',
        confidence: 0.99,
        position: { top: 60.0, left: 53.5, width: 31.0, height: 6.0 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '② 2500',
        options: ['① 1250', '② 2500', '③ 5000', '④ 10000'],
        problemLabel: '(4)',
        responseLabel: '1단위(single unit)의 값',
        hints: ['5000은 전체 2칸(2단위)에 해당하는 값입니다.', '5000 ÷ 2 = 2500입니다.', '② 2500을 선택하세요.'],
        sourceText: '(4) 5000 수직선 1단위의 값',
        confidence: 0.99,
        position: { top: 82.0, left: 53.5, width: 31.0, height: 6.0 }
      }
    ]
  },

  // Page 2: Slide 132
  {
    pageId: 'page_1787004322177_2',
    summary: '연습문제 2 - 비례 배분과 1단위를 활용한 상대방의 금액 구하기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '② 5000원',
        options: ['① 2500원', '② 5000원', '③ 10000원', '④ 20000원'],
        problemLabel: '(2)',
        responseLabel: '이삭이가 가진 돈',
        hints: ['우진이(2단위)가 10000원이므로 1단위는 5000원입니다.', '이삭이는 1단위이므로 5000원입니다.', '② 5000원을 선택하세요.'],
        sourceText: '이삭이와 우진이가 용돈을 1:2로 나누었는데, 우진이가 10000원을 가졌다면 이삭이가 가진 돈은?',
        confidence: 0.99,
        position: { top: 43.5, left: 52.0, width: 32.0, height: 4.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '② 12000원',
        options: ['① 6000원', '② 12000원', '③ 15000원', '④ 24000원'],
        problemLabel: '(3)',
        responseLabel: '정석이가 가진 돈',
        hints: ['서인이(5단위)가 30000원이므로 1단위는 6000원입니다.', '정석이는 2단위이므로 2 × 6000 = 12000원입니다.', '② 12000원을 선택하세요.'],
        sourceText: '서인이와 정석이가 용돈을 5:2로 나누었는데, 서인이가 30000원을 가졌다면 정석이가 가진 돈은?',
        confidence: 0.99,
        position: { top: 62.5, left: 52.0, width: 32.0, height: 4.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '③ 12000원',
        options: ['① 4000원', '② 8000원', '③ 12000원', '④ 16000원'],
        problemLabel: '(4)',
        responseLabel: '두희가 가진 돈',
        hints: ['채원이(5단위)가 20000원이므로 1단위는 4000원입니다.', '두희는 3단위이므로 3 × 4000 = 12000원입니다.', '③ 12000원을 선택하세요.'],
        sourceText: '두희와 채원이가 용돈을 3:5로 나누었는데, 채원이가 20000원을 가졌다면 두희가 가진 돈은?',
        confidence: 0.99,
        position: { top: 81.5, left: 52.0, width: 32.0, height: 4.5 }
      }
    ]
  },

  // Page 3: Slide 133
  {
    pageId: 'page_1787004322177_3',
    summary: '연습문제 3 - 1단위를 활용한 부모님의 전체 재산 구하기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '③ 7억원',
        options: ['① 4억원', '② 6억원', '③ 7억원', '④ 12억원'],
        problemLabel: '(2)',
        responseLabel: '전체 재산',
        hints: ['민서(3단위)가 3억원이므로 1단위는 1억원입니다.', '전체는 3 + 4 = 7단위이므로 7 × 1억 = 7억원입니다.', '③ 7억원을 선택하세요.'],
        sourceText: '민서와 아형이가 부모님의 재산을 3:4로 나누었는데, 민서가 3억원을 받았다면 부모님의 전체 재산은 원래 얼마였나요?',
        confidence: 0.99,
        position: { top: 43.5, left: 52.0, width: 32.0, height: 4.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '③ 420억원',
        options: ['① 120억원', '② 360억원', '③ 420억원', '④ 600억원'],
        problemLabel: '(3)',
        responseLabel: '전체 재산',
        hints: ['채아(5단위)가 300억원이므로 1단위는 60억원입니다.', '전체는 5 + 2 = 7단위이므로 7 × 60억 = 420억원입니다.', '③ 420억원을 선택하세요.'],
        sourceText: '채아와 민지가 부모님의 재산을 5:2로 나누었는데, 채아가 300억원을 받았다면 부모님의 전체 재산은 원래 얼마였나요?',
        confidence: 0.99,
        position: { top: 62.5, left: 52.0, width: 32.0, height: 4.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '③ 80억원',
        options: ['① 30억원', '② 50억원', '③ 80억원', '④ 150억원'],
        problemLabel: '(4)',
        responseLabel: '전체 재산',
        hints: ['영채(5단위)가 50억원이므로 1단위는 10억원입니다.', '전체는 3 + 5 = 8단위이므로 8 × 10억 = 80억원입니다.', '③ 80억원을 선택하세요.'],
        sourceText: '서연이와 영채가 부모님의 재산을 3:5로 나누었는데, 영채가 50억원을 받았다면 부모님의 전체 재산은 원래 얼마였나요?',
        confidence: 0.99,
        position: { top: 81.5, left: 52.0, width: 32.0, height: 4.5 }
      }
    ]
  },

  // Page 4: Slide 134
  {
    pageId: 'page_1787004322177_4',
    summary: '연습문제 4 - 단위 차이로부터 1단위(single unit)의 값 구하기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '② 1100원',
        options: ['① 550원', '② 1100원', '③ 1500원', '④ 2200원'],
        problemLabel: '(2)',
        responseLabel: '1단위의 값',
        hints: ['5500원은 5칸(5단위)에 해당하는 값입니다.', '5500 ÷ 5 = 1100원입니다.', '② 1100원을 선택하세요.'],
        sourceText: '(2) 5500원 수직선 1단위의 값',
        confidence: 0.99,
        position: { top: 82.0, left: 16.0, width: 31.0, height: 6.0 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '② 300원',
        options: ['① 180원', '② 300원', '③ 450원', '④ 600원'],
        problemLabel: '(3)',
        responseLabel: '1단위의 값',
        hints: ['900원은 3칸(3단위)에 해당하는 값입니다.', '900 ÷ 3 = 300원입니다.', '② 300원을 선택하세요.'],
        sourceText: '(3) 900원 수직선 1단위의 값',
        confidence: 0.99,
        position: { top: 60.0, left: 53.5, width: 31.0, height: 6.0 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '② 600원',
        options: ['① 300원', '② 600원', '③ 800원', '④ 1200원'],
        problemLabel: '(4)',
        responseLabel: '1단위의 값',
        hints: ['2400원은 4칸(4단위)에 해당하는 값입니다.', '2400 ÷ 4 = 600원입니다.', '② 600원을 선택하세요.'],
        sourceText: '(4) 2400원 수직선 1단위의 값',
        confidence: 0.99,
        position: { top: 82.0, left: 53.5, width: 31.0, height: 6.0 }
      }
    ]
  },

  // Page 5: Slide 135
  {
    pageId: 'page_1787004322177_5',
    summary: '연습문제 5 - 두 양의 차이로부터 1단위를 구하여 전체 또는 상대방의 양 구하기 (4지선다형)',
    elements: [
      {
        clientKey: 'q2',
        type: 'multiple-choice',
        answer: '② 2조 1600억원',
        options: ['① 1조 2000억원', '② 2조 1600억원', '③ 2조 4000억원', '④ 9600억원'],
        problemLabel: '(2)',
        responseLabel: '부모님의 원래 재산',
        hints: ['단위 차이는 5 - 4 = 1단위이므로 1단위는 2400억원입니다.', '전체는 5 + 4 = 9단위이므로 9 × 2400억 = 2조 1600억원입니다.', '② 2조 1600억원을 선택하세요.'],
        sourceText: '재희와 정윤이가 부모님의 재산을 5:4로 나누었는데, 재희가 2400억원을 더 가졌다면 부모님의 원래 재산은 얼마였나요?',
        confidence: 0.99,
        position: { top: 43.5, left: 52.0, width: 32.0, height: 4.5 }
      },
      {
        clientKey: 'q3',
        type: 'multiple-choice',
        answer: '③ 6750원',
        options: ['① 2250원', '② 4500원', '③ 6750원', '④ 9000원'],
        problemLabel: '(3)',
        responseLabel: '유찬이가 가진 돈',
        hints: ['단위 차이는 7 - 3 = 4단위이고 9000원이므로 1단위는 9000 ÷ 4 = 2250원입니다.', '유찬이는 3단위이므로 3 × 2250 = 6750원입니다.', '③ 6750원을 선택하세요.'],
        sourceText: '유찬이와 재영이가 용돈을 3:7로 나누었는데, 재영이가 9000원을 더 가졌다면 유찬이가 가진 돈은?',
        confidence: 0.99,
        position: { top: 62.5, left: 52.0, width: 32.0, height: 4.5 }
      },
      {
        clientKey: 'q4',
        type: 'multiple-choice',
        answer: '③ 280냥',
        options: ['① 80냥', '② 200냥', '③ 280냥', '④ 350냥'],
        problemLabel: '(4)',
        responseLabel: '부모님의 원래 재산',
        hints: ['단위 차이는 5 - 2 = 3단위이고 120냥이므로 1단위는 120 ÷ 3 = 40냥입니다.', '전체는 2 + 5 = 7단위이므로 7 × 40 = 280냥입니다.', '③ 280냥을 선택하세요.'],
        sourceText: '호준이와 경환이가 부모님의 재산을 2:5로 나누었는데, 경환이가 120냥을 더 가졌다면 부모님의 전체 재산은 원래 얼마였나요?',
        confidence: 0.99,
        position: { top: 81.5, left: 52.0, width: 32.0, height: 4.5 }
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

if (process.argv[1]?.endsWith('generate-drafts-chap4-unit5.mjs')) {
  generateTmpDraftJsonFiles();
}
