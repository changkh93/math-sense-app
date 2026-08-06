import {
  WORKBOOK_GRADABLE_TYPES,
  WORKBOOK_INTERACTION_TYPES,
  normalizeInteractionConfig,
} from './workbookInteractionUtils.js';

const SUPPORTED_ELEMENT_TYPES = new Set(['input', 'multiple-choice', 'mask', ...WORKBOOK_INTERACTION_TYPES]);
const SUPPORTED_INPUT_MODES = new Set([
  'integer',
  'decimal',
  'fraction',
  'mixed-number',
  'expression',
  'text'
]);

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const cleanIdPart = (value, fallback) => {
  const cleaned = String(value || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);
  return cleaned || fallback;
};

const extractJsonText = (rawText) => {
  const text = String(rawText || '').trim();
  if (!text) throw new Error('붙여넣은 JSON이 비어 있습니다.');

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced) return fenced[1].trim();

  const objectStart = text.indexOf('{');
  const arrayStart = text.indexOf('[');
  const starts = [objectStart, arrayStart].filter(index => index >= 0);
  if (starts.length === 0) return text;

  const start = Math.min(...starts);
  const objectEnd = text.lastIndexOf('}');
  const arrayEnd = text.lastIndexOf(']');
  const end = Math.max(objectEnd, arrayEnd);
  return end >= start ? text.slice(start, end + 1) : text;
};

export const parseWorkbookAnalysisJson = (rawText) => {
  try {
    return JSON.parse(extractJsonText(rawText));
  } catch (error) {
    throw new Error(`JSON 형식을 읽을 수 없습니다: ${error.message}`);
  }
};

const normalizePosition = (rawPosition, index) => {
  const raw = rawPosition || {};
  const top = Number(raw.top);
  const left = Number(raw.left);
  const width = Number(raw.width);
  const height = Number(raw.height);

  if (![top, left, width, height].every(Number.isFinite)) {
    throw new Error(`${index + 1}번째 요소의 position에는 top, left, width, height 숫자가 모두 필요합니다.`);
  }
  if (width <= 0 || height <= 0) {
    throw new Error(`${index + 1}번째 요소의 width와 height는 0보다 커야 합니다.`);
  }

  const normalizedLeft = clamp(left, 0, 99.9);
  const normalizedTop = clamp(top, 0, 99.9);
  return {
    top: Number(normalizedTop.toFixed(2)),
    left: Number(normalizedLeft.toFixed(2)),
    width: Number(clamp(width, 1, 100 - normalizedLeft).toFixed(2)),
    height: Number(clamp(height, 1, 100 - normalizedTop).toFixed(2))
  };
};

export const normalizeWorkbookAnalysisPayload = (rawPayload, { unitId, pageId } = {}) => {
  const payload = Array.isArray(rawPayload) ? { elements: rawPayload } : rawPayload;
  if (!payload || typeof payload !== 'object') {
    throw new Error('JSON 최상위 값은 객체 또는 elements 배열이어야 합니다.');
  }
  if (payload.unitId && unitId && payload.unitId !== unitId) {
    throw new Error(`문서 ID가 일치하지 않습니다. 기대값: ${unitId}, 입력값: ${payload.unitId}`);
  }
  if (payload.pageId && pageId && payload.pageId !== pageId) {
    throw new Error(`페이지 ID가 일치하지 않습니다. 기대값: ${pageId}, 입력값: ${payload.pageId}`);
  }
  if (!Array.isArray(payload.elements) || payload.elements.length === 0) {
    throw new Error('elements 배열에 하나 이상의 요소가 필요합니다.');
  }
  if (payload.elements.length > 200) {
    throw new Error('한 페이지에는 최대 200개의 요소만 가져올 수 있습니다.');
  }

  const resolvedPageId = pageId || payload.pageId || 'page';
  const clientKeyToId = new Map();
  const usedIds = new Set();

  payload.elements.forEach((rawElement, index) => {
    const clientKey = cleanIdPart(rawElement?.clientKey, `item_${index + 1}`);
    if (clientKeyToId.has(clientKey)) {
      throw new Error(`clientKey가 중복되었습니다: ${clientKey}`);
    }
    let id = `el_${cleanIdPart(resolvedPageId, 'page')}_${clientKey}`;
    let suffix = 2;
    while (usedIds.has(id)) {
      id = `el_${cleanIdPart(resolvedPageId, 'page')}_${clientKey}_${suffix++}`;
    }
    usedIds.add(id);
    clientKeyToId.set(clientKey, id);
  });

  const elements = payload.elements.map((rawElement, index) => {
    if (!rawElement || typeof rawElement !== 'object') {
      throw new Error(`${index + 1}번째 요소가 객체가 아닙니다.`);
    }
    const type = String(rawElement.type || 'input').trim();
    if (!SUPPORTED_ELEMENT_TYPES.has(type)) {
      throw new Error(`${index + 1}번째 요소의 type "${type}"은 현재 지원하지 않습니다.`);
    }

    const clientKey = cleanIdPart(rawElement.clientKey, `item_${index + 1}`);
    const base = {
      id: clientKeyToId.get(clientKey),
      type,
      position: normalizePosition(rawElement.position, index),
      sourceText: String(rawElement.sourceText || '').trim(),
      confidence: clamp(Number(rawElement.confidence) || 0, 0, 1)
    };

    if (type === 'mask') {
      const triggerKey = cleanIdPart(rawElement.triggerKey || rawElement.triggerBy, '');
      const triggerBy = clientKeyToId.get(triggerKey);
      if (!triggerBy) {
        throw new Error(`${index + 1}번째 마스크의 triggerKey가 같은 결과 안의 입력 요소를 가리켜야 합니다.`);
      }
      return { ...base, triggerBy };
    }

    if (WORKBOOK_INTERACTION_TYPES.has(type)) {
      const config = normalizeInteractionConfig(type, rawElement.config);
      const hints = Array.isArray(rawElement.hints)
        ? rawElement.hints.map(value => String(value || '').trim()).filter(Boolean).slice(0, 3)
        : [];
      return {
        ...base,
        config,
        difficulty: ['easy', 'standard', 'challenge'].includes(rawElement.difficulty) ? rawElement.difficulty : 'standard',
        ...(hints.length ? { hints } : {}),
        ...(String(rawElement.recommendationReason || '').trim()
          ? { recommendationReason: String(rawElement.recommendationReason).trim().slice(0, 300) }
          : {}),
      };
    }

    const answer = String(rawElement.answer ?? '').trim();
    if (!answer) throw new Error(`${index + 1}번째 ${type} 요소의 answer가 비어 있습니다.`);

    if (type === 'multiple-choice') {
      const options = Array.isArray(rawElement.options)
        ? rawElement.options.map(option => String(option ?? '').trim()).filter(Boolean)
        : [];
      if (options.length < 2) {
        throw new Error(`${index + 1}번째 객관식 요소에는 최소 2개의 options가 필요합니다.`);
      }
      if (!options.includes(answer)) {
        throw new Error(`${index + 1}번째 객관식 answer는 options 중 하나와 정확히 일치해야 합니다.`);
      }
      return { ...base, answer, options };
    }

    const requestedMode = String(rawElement.inputMode || 'integer').trim();
    const inputMode = SUPPORTED_INPUT_MODES.has(requestedMode) ? requestedMode : 'text';
    const acceptedAnswers = Array.isArray(rawElement.acceptedAnswers)
      ? [...new Set(rawElement.acceptedAnswers.map(value => String(value ?? '').trim()).filter(Boolean))]
      : [];

    return {
      ...base,
      answer,
      inputMode,
      ...(String(rawElement.hint || '').trim() ? { hint: String(rawElement.hint).trim() } : {}),
      ...(acceptedAnswers.length ? { acceptedAnswers } : {}),
      ...(rawElement.answerSpec && typeof rawElement.answerSpec === 'object'
        ? { answerSpec: rawElement.answerSpec }
        : {})
    };
  });

  return {
    schemaVersion: 2,
    unitId: unitId || payload.unitId || '',
    pageId: pageId || payload.pageId || '',
    analysis: payload.analysis && typeof payload.analysis === 'object' ? payload.analysis : {},
    learningDesign: payload.learningDesign && typeof payload.learningDesign === 'object'
      ? {
          gradeBand: ['elementary-1-2', 'elementary-3-4', 'elementary-5-6'].includes(payload.learningDesign.gradeBand)
            ? payload.learningDesign.gradeBand
            : 'elementary-3-4',
          difficulty: ['easy', 'standard', 'challenge'].includes(payload.learningDesign.difficulty)
            ? payload.learningDesign.difficulty
            : 'standard',
          adaptiveHints: payload.learningDesign.adaptiveHints !== false,
        }
      : { gradeBand: 'elementary-3-4', difficulty: 'standard', adaptiveHints: true },
    elements
  };
};

export const validateWorkbookPagesForPublish = (pages) => {
  const issues = [];
  const allElementIds = new Set();

  if (!Array.isArray(pages) || pages.length === 0) {
    return ['퍼블리시할 워크북 페이지가 없습니다.'];
  }

  pages.forEach((page, pageIndex) => {
    const label = `Page ${pageIndex + 1}`;
    if (!page?.id) issues.push(`${label}: 페이지 ID가 없습니다.`);
    if (!page?.imageUrl) issues.push(`${label}: 배경 이미지가 없습니다.`);
    if (!Array.isArray(page?.elements) || page.elements.length === 0) {
      issues.push(`${label}: 인터랙티브 요소가 없습니다.`);
      return;
    }

    const pageElementIds = new Set(page.elements.map(element => element?.id).filter(Boolean));
    let gradableCount = 0;
    page.elements.forEach((element, elementIndex) => {
      const elementLabel = `${label} 요소 ${elementIndex + 1}`;
      if (!element?.id) issues.push(`${elementLabel}: ID가 없습니다.`);
      else if (allElementIds.has(element.id)) issues.push(`${elementLabel}: 전체 워크북에서 ID가 중복되었습니다 (${element.id}).`);
      else allElementIds.add(element.id);

      if (!SUPPORTED_ELEMENT_TYPES.has(element?.type)) {
        issues.push(`${elementLabel}: 지원하지 않는 type입니다 (${element?.type || '없음'}).`);
      }
      try {
        normalizePosition(element?.position, elementIndex);
      } catch (error) {
        issues.push(`${elementLabel}: ${error.message}`);
      }

      if (WORKBOOK_GRADABLE_TYPES.has(element?.type)) {
        gradableCount += 1;
        if (element?.type === 'input' || element?.type === 'multiple-choice') {
          if (!String(element.answer ?? '').trim()) issues.push(`${elementLabel}: 정답이 비어 있습니다.`);
        } else {
          try {
            normalizeInteractionConfig(element.type, element.config);
          } catch (error) {
            issues.push(`${elementLabel}: ${error.message}`);
          }
        }
      }
      if (element?.type === 'multiple-choice') {
        if (!Array.isArray(element.options) || element.options.length < 2) {
          issues.push(`${elementLabel}: 객관식 선택지가 2개 미만입니다.`);
        } else if (!element.options.includes(element.answer)) {
          issues.push(`${elementLabel}: 정답이 선택지에 포함되어 있지 않습니다.`);
        }
      }
      if (element?.type === 'mask' && !pageElementIds.has(element.triggerBy)) {
        issues.push(`${elementLabel}: 마스크의 연결 대상이 현재 페이지에 없습니다.`);
      }
    });

    if (gradableCount === 0) issues.push(`${label}: 채점 가능한 요소가 없습니다.`);
  });

  return issues;
};

export const buildWorkbookDraftPrompt = ({ unitId, unitTitle, page, pageIndex = 0 }) => {
  if (!unitId || !page?.id || !page?.imageUrl) return '';

  return `당신은 초등수학 Smart Workbook 초안 제작자입니다. 아래 교재 이미지를 분석하여 학생이 실제로 답해야 하는 위치에 인터랙티브 요소 초안을 만드세요.

[작업 대상]
- Firestore collection: units
- 문서 ID(unitId): ${unitId}
- 단원명: ${unitTitle || '(제목 없음)'}
- 페이지 번호: ${pageIndex + 1}
- 페이지 ID(pageId): ${page.id}
- 이미지 URL: ${page.imageUrl}

[절대 규칙]
1. Gemini API, OpenAI API 등 외부 AI API를 코드에서 호출하지 마세요. 현재 대화에 제공된 모델의 시각 분석 능력만 사용하세요.
2. 이미지의 모든 인쇄된 수를 입력칸으로 만들지 말고, 학생이 직접 답해야 하는 빈칸·밑줄·선택 영역만 찾으세요.
3. 문제의 요구를 구분하세요. 예를 들어 “수식으로 표현하세요”의 정답은 계산 결과가 아니라 18÷2 같은 식입니다.
4. 위치는 원본 이미지 기준 퍼센트 좌표이며 top/left/width/height 모두 0~100 범위입니다. 입력 영역을 밑줄 또는 빈칸에 타이트하게 맞추되 터치 가능한 높이를 확보하세요.
5. 초등수학 범위에서 답을 직접 검산하세요. 확신이 낮은 요소도 임의 확정하지 말고 confidence를 낮추고 analysis.warnings에 이유를 적으세요.
6. 기존 공개본(workbookPages)은 절대 수정하지 마세요. Codex 자동 반영 시 workbookDraftPages의 지정 pageId만 수정하세요.
7. 이미지 URL을 실제로 열거나 이미지를 첨부받아 확인하지 못했다면 추측하여 JSON을 만들지 말고, 사용자에게 이미지를 첨부해 달라고 요청하세요.

[지원 요소]
- input: 숫자·분수·수식·짧은 텍스트 입력
- multiple-choice: 선택지 중 하나를 고르는 요소
- mask: 연결된 정답 요소가 맞았을 때 인쇄된 표시를 가리는 요소. 같은 결과 안의 clientKey를 triggerKey로 지정
- grouping: 항목을 여러 그룹에 드래그하여 똑같이 나누거나 분류
- number-line: 수직선 눈금 중 정답 위치 선택
- matching: 왼쪽과 오른쪽 항목 연결
- ordering: 항목을 순서대로 드래그 정렬
- coloring: 칸마다 알맞은 색 선택

[상호작용 선택 규칙]
- 단순히 재미를 위해 인터랙션을 넣지 말고 문제 행동이 나누기·위치·연결·순서·색칠일 때만 해당 type을 사용하세요.
- grouping/matching/ordering/coloring의 config 안에서는 표시 문구와 별개인 짧고 고유한 id를 사용하세요.
- 조작 요소는 작은 답안 밑줄이 아니라 문제 활동 전체를 포함하도록 position을 충분히 크게 잡으세요.
- 학년군과 난이도를 learningDesign에 기록하고, 요소마다 쉬운 힌트부터 구체적인 힌트까지 hints를 최대 3개 작성하세요.

[inputMode]
integer | decimal | fraction | mixed-number | expression | text

[P3 config 규격]
- grouping: { "items":[{"id":"i1","label":"●"}], "groups":[{"id":"g1","label":"1모둠"}], "answer":{"i1":"g1"} }
- number-line: { "min":0, "max":10, "step":1, "answer":5 }
- matching: { "leftItems":[{"id":"l1","label":"1/2"}], "rightItems":[{"id":"r1","label":"0.5"}], "answer":{"l1":"r1"} }
- ordering: { "items":[{"id":"i1","label":"1"},{"id":"i2","label":"2"}], "answer":["i1","i2"] }
- coloring: { "cells":[{"id":"c1","label":"1번"}], "colors":[{"id":"red","label":"빨강","value":"#ef4444"}], "answer":{"c1":"red"} }
- grouping은 항목 2개 이상·그룹 2개 이상, matching/ordering은 항목 2개 이상이어야 합니다. answer에는 모든 항목 id가 빠짐없이 들어가야 합니다.

[반환 JSON — 설명문 없이 JSON 코드블록 하나만 반환]
{
  "schemaVersion": 2,
  "unitId": "${unitId}",
  "pageId": "${page.id}",
  "learningDesign": {
    "gradeBand": "${page.learningDesign?.gradeBand || 'elementary-3-4'}",
    "difficulty": "${page.learningDesign?.difficulty || 'standard'}",
    "adaptiveHints": true
  },
  "analysis": {
    "summary": "페이지 구조와 문제 유형 요약",
    "warnings": ["운영자가 확인할 사항"]
  },
  "elements": [
    {
      "clientKey": "q1_answer",
      "type": "input",
      "inputMode": "expression",
      "answer": "18÷2",
      "acceptedAnswers": [],
      "answerSpec": { "kind": "literal-expression" },
      "hint": "구슬의 수와 사람 수를 나눗셈 기호로 연결해 보세요.",
      "sourceText": "구슬 18개를 2사람에게 똑같이 나누세요.",
      "confidence": 0.98,
      "position": { "top": 38.2, "left": 22.1, "width": 13.5, "height": 4.2 }
    },
    {
      "clientKey": "q2_grouping",
      "type": "grouping",
      "sourceText": "구슬을 두 사람에게 똑같이 나누세요.",
      "confidence": 0.95,
      "difficulty": "easy",
      "hints": ["구슬을 한 개씩 번갈아 옮겨 보세요.", "두 그룹의 구슬 수가 같은지 세어 보세요."],
      "recommendationReason": "똑같이 나누는 행동을 직접 조작하도록 grouping을 선택했습니다.",
      "position": { "top": 50, "left": 10, "width": 80, "height": 25 },
      "config": {
        "items": [{ "id": "bead_1", "label": "●" }, { "id": "bead_2", "label": "●" }],
        "groups": [{ "id": "child_a", "label": "첫째" }, { "id": "child_b", "label": "둘째" }],
        "answer": { "bead_1": "child_a", "bead_2": "child_b" }
      }
    }
  ]
}

[실행 방식]
- ChatGPT 웹이라면: 위 JSON만 반환하세요. 사용자가 운영툴의 “AI 결과 JSON 붙여넣기”에 넣어 검증·적용합니다.
- Codex이며 현재 저장소와 Firestore 작업 권한이 있다면: JSON을 /private/tmp/workbook-draft-${cleanIdPart(unitId, 'unit')}-${cleanIdPart(page.id, 'page')}.json 에 저장하고, 먼저 아래 명령으로 dry-run 검증 후 동일 명령에 --apply를 붙여 초안에만 반영하세요.
  node scripts/apply-workbook-draft-analysis.mjs --unit-id="${unitId}" --page-id="${page.id}" --input="/private/tmp/workbook-draft-${cleanIdPart(unitId, 'unit')}-${cleanIdPart(page.id, 'page')}.json"
- 지정 문서나 페이지가 없으면 쓰지 말고, 운영툴에서 “변경사항 저장”을 먼저 하라고 알려주세요.
- 완료 후 생성 요소 수, 낮은 confidence 항목, 실제 수정한 필드가 workbookDraftPages뿐인지 보고하세요.`;
};
