import {
  WORKBOOK_GRADABLE_TYPES,
  WORKBOOK_INTERACTION_TYPES,
  getWorkbookElementReference,
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

const normalizeHints = (rawElement) => {
  const stagedHints = Array.isArray(rawElement?.hints)
    ? rawElement.hints.map(value => String(value || '').trim()).filter(Boolean).slice(0, 3)
    : [];
  const legacyHint = String(rawElement?.hint || '').trim();
  return stagedHints.length ? stagedHints : (legacyHint ? [legacyHint] : []);
};

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
    const hints = normalizeHints(rawElement);
    const id = clientKeyToId.get(clientKey);
    const reference = getWorkbookElementReference({ ...rawElement, clientKey, id }, index);
    const base = {
      id,
      type,
      position: normalizePosition(rawElement.position, index),
      sourceText: String(rawElement.sourceText || '').trim(),
      confidence: clamp(Number(rawElement.confidence) || 0, 0, 1),
      ...(reference.problemLabel ? { problemLabel: reference.problemLabel } : {}),
      ...(reference.responseLabel ? { responseLabel: reference.responseLabel } : {}),
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
      return {
        ...base,
        config,
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
      if (options.length < 1) {
        throw new Error(`${index + 1}번째 객관식 요소에는 최소 1개의 options가 필요합니다.`);
      }
      if (!options.includes(answer)) {
        throw new Error(`${index + 1}번째 객관식 answer는 options 중 하나와 정확히 일치해야 합니다.`);
      }
      return { ...base, answer, options, ...(hints.length ? { hints } : {}) };
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
      ...(hints.length ? { hints, hint: hints[0] } : {}),
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
    learningDesign: { adaptiveHints: payload.learningDesign?.adaptiveHints !== false },
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
        if (!Array.isArray(element.options) || element.options.length < 1) {
          issues.push(`${elementLabel}: 객관식 선택지가 1개 미만입니다.`);
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
6. 기존 공개본(workbookPages)은 절대 수정하지 마세요. 운영툴에서 JSON을 적용할 때 workbookDraftPages의 지정 pageId만 수정해야 합니다.
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
- 모든 채점 요소(input, multiple-choice, grouping, number-line, matching, ordering, coloring)에 hints를 1~3개 작성하세요. 1단계는 정답을 노출하지 않는 쉬운 단서, 뒷단계일수록 구체적인 풀이 단서여야 합니다.
- 모든 채점 요소에 교재에 인쇄된 문제 번호를 problemLabel(예: "(2)"), 한 문제의 여러 답안 영역을 구분하는 이름을 responseLabel(예: "전체를 구하는 식", "나눗셈식")로 작성하세요.

[inputMode]
integer | decimal | fraction | mixed-number | expression | text

[P3 config 규격]
- grouping: { "items":[{"id":"i1","label":"●"}], "groups":[{"id":"g1","label":"1모둠"}], "answer":{"i1":"g1"} }
- number-line: { "min":0, "max":10, "step":1, "answer":5 }
- matching: { "leftItems":[{"id":"l1","label":"1/2"}], "rightItems":[{"id":"r1","label":"0.5"}], "answer":{"l1":"r1"} }
- ordering: { "items":[{"id":"i1","label":"1"},{"id":"i2","label":"2"}], "answer":["i1","i2"] }
- coloring: { "cells":[{"id":"c1","label":"1번"}], "colors":[{"id":"red","label":"빨강","value":"#ef4444"}], "answer":{"c1":"red"} }
- coloring 격자는 columns에 한 행의 칸 수를 지정하세요. 위치와 무관하게 색칠한 칸 수만 같으면 정답인 문제는 selectionMode:"paint-only", paintColorId와 gradingMode:"paint-count"를 함께 지정하세요.
- grouping은 항목 2개 이상·그룹 2개 이상, matching/ordering은 항목 2개 이상이어야 합니다. answer에는 모든 항목 id가 빠짐없이 들어가야 합니다.

[반환 JSON — 설명문 없이 JSON 코드블록 하나만 반환]
{
  "schemaVersion": 2,
  "unitId": "${unitId}",
  "pageId": "${page.id}",
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
      "problemLabel": "(1)",
      "responseLabel": "나눗셈식",
      "hints": ["구슬의 수와 사람 수를 찾아보세요.", "전체 수 다음에 ÷를 쓰고 사람 수를 연결해 보세요.", "전체 구슬 수 ÷ 사람 수의 형태로 쓰되 결과는 쓰지 않아요."],
      "sourceText": "구슬 18개를 2사람에게 똑같이 나누세요.",
      "confidence": 0.98,
      "position": { "top": 38.2, "left": 22.1, "width": 13.5, "height": 4.2 }
    },
    {
      "clientKey": "q2_grouping",
      "type": "grouping",
      "problemLabel": "(2)",
      "responseLabel": "똑같이 나누기",
      "sourceText": "구슬을 두 사람에게 똑같이 나누세요.",
      "confidence": 0.95,
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
- 위 JSON만 반환하세요. 사용자가 운영툴의 “AI 결과 JSON 붙여넣기”에 넣어 현재 page를 검증·적용합니다.
- 이미지 URL을 열 수 없다면 JSON을 추측하지 말고 이미지 첨부를 요청하세요.`;
};

export const buildWorkbookUnitDraftPrompt = ({ unitId, unitTitle, pages }) => {
  const targetPages = Array.isArray(pages)
    ? pages.filter(page => page?.id && page?.imageUrl)
    : [];
  if (!unitId || targetPages.length === 0) return '';

  const pageInventory = targetPages.map((page, index) => [
    `### Page ${index + 1}`,
    `- pageId: ${page.id}`,
    `- imageUrl: ${page.imageUrl}`,
    `- existingElementCount: ${Array.isArray(page.elements) ? page.elements.length : 0}`,
  ].join('\n')).join('\n\n');
  const safeUnitId = cleanIdPart(unitId, 'unit');

  return `당신은 초등수학 Smart Workbook 단원 전체 초안 제작자입니다. 아래 unit에 등록된 모든 페이지 이미지를 실제로 열어 순서대로 분석하고, 각 페이지의 학생 답안 위치에 인터랙티브 요소를 생성한 뒤 Firestore 초안에 반영하세요.

[작업 대상]
- Firestore collection: units
- 문서 ID(unitId): ${unitId}
- 단원명: ${unitTitle || '(제목 없음)'}
- 대상 페이지 수: ${targetPages.length}

[페이지 목록]
${pageInventory}

[Codex 사전 준비 — 반드시 먼저 실행]
1. URL을 페이지마다 직접 curl하지 말고 아래 읽기 전용 명령을 한 번 실행해 unit 전체 이미지를 로컬에 준비하세요.
   node scripts/prepare-workbook-unit-analysis.mjs --unit-id="${unitId}"
2. 명령이 출력한 manifestPath의 JSON을 읽고, 각 pages[].localImagePath를 실제 이미지 보기 도구로 열어 분석하세요.
3. 샌드박스에서 Firebase/Google 호스트 DNS 또는 네트워크가 차단되면 작업을 중단하거나 사용자에게 이미지를 다시 요청하지 마세요. 동일한 준비 명령을 외부 네트워크 권한(require_escalated)으로 즉시 한 번 재실행하세요. 이 명령은 Firestore와 이미지를 읽고 /private/tmp에만 저장하는 읽기 전용 준비 작업입니다.
4. 외부 네트워크 권한 재시도까지 실패한 페이지만 건너뛰고 원인을 보고하세요. 성공한 페이지는 계속 처리하세요.

[절대 규칙]
1. Gemini API, OpenAI API 등 외부 AI API를 코드에서 호출하지 말고 현재 대화 모델의 시각 분석 능력만 사용하세요.
2. manifest의 localImagePath를 실제로 열어 확인하지 못한 페이지는 추측하지 말고 건너뛴 뒤 보고하세요.
3. 인쇄된 모든 수가 아니라 학생이 직접 답하는 빈칸·밑줄·선택·조작 영역만 요소로 만드세요.
4. “수식으로 표현”은 계산 결과만이 아니라 15÷3=5처럼 문제에서 요구하는 완전한 식을 정답으로 지정하세요.
5. 좌표는 원본 이미지 기준 top/left/width/height 퍼센트이며 모두 0~100 범위여야 합니다.
6. 초등수학 범위에서 모든 정답을 직접 검산하고, 불확실하면 confidence를 낮추고 analysis.warnings에 이유를 남기세요.
7. 공개본 workbookPages는 절대 수정하지 말고 workbookDraftPages 안의 위 pageId들만 각각 수정하세요.
8. 단순 재미가 아니라 문제 행동이 나누기·위치·연결·순서·색칠일 때만 grouping·number-line·matching·ordering·coloring을 선택하세요.
9. grouping은 동일한 항목의 교환 가능한 배치가 하나의 고정 id 정답으로 잘못 채점되지 않는지 확인하고, 그런 위험이 있으면 input 또는 multiple-choice를 사용하세요.

[지원 요소]
- input(inputMode: integer | decimal | fraction | mixed-number | expression | text)
- multiple-choice
- mask(triggerKey로 같은 페이지 clientKey 연결)
- grouping, number-line, matching, ordering, coloring

[힌트 작성 규칙]
- 모든 채점 요소에 hints 배열을 1~3개 작성하세요.
- 첫 힌트는 관찰·개념 단서, 다음 힌트는 식의 순서·풀이 단서, 마지막 힌트는 정답을 직접 말하지 않는 가장 구체적인 단서로 작성하세요.
- 모든 채점 요소에 교재 문제 번호 problemLabel(예: "(2)")과 답안 영역 이름 responseLabel(예: "전체를 구하는 식", "나눗셈식")을 작성하세요.

[페이지별 JSON 규격]
각 페이지마다 다음 구조의 독립 JSON 파일을 만드세요.
{
  "schemaVersion": 2,
  "unitId": "${unitId}",
  "pageId": "해당 pageId",
  "analysis": { "summary": "페이지 문제 유형 요약", "warnings": [] },
  "elements": [
    {
      "clientKey": "q1_answer",
      "type": "input",
      "inputMode": "expression",
      "answer": "15÷3=5",
      "acceptedAnswers": [],
      "answerSpec": { "kind": "literal-expression" },
      "problemLabel": "(1)",
      "responseLabel": "나눗셈식",
      "hints": ["전체 수와 나누는 사람 수를 찾아보세요.", "전체 수 ÷ 사람 수를 먼저 쓰세요.", "전체 수, 나누는 사람 수, 한 사람이 갖는 수를 ÷와 =로 연결하세요."],
      "sourceText": "문제 원문",
      "confidence": 0.98,
      "position": { "top": 30, "left": 35, "width": 30, "height": 5 }
    }
  ]
}

[검증 및 적용 순서]
1. 페이지별 JSON을 /private/tmp/workbook-draft-${safeUnitId}-<pageId>.json 에 저장하세요.
2. 페이지별 병렬 dry-run을 실행하지 마세요. 아래 unit 배치 명령을 --apply 없이 정확히 한 번 실행해 모든 JSON 정규화와 Firestore 페이지 존재 여부를 검증하세요.
   node scripts/apply-workbook-unit-draft-analysis.mjs --unit-id="${unitId}"
3. 샌드박스에서 firestore.googleapis.com DNS 또는 네트워크가 차단되면 결과를 기다리며 페이지별 프로세스를 반복하지 마세요. 동일한 unit 배치 명령을 외부 네트워크 권한(require_escalated)으로 즉시 한 번 재실행하세요.
4. unit 배치 dry-run이 전체 성공한 경우에만 동일 명령 끝에 --apply를 붙여 한 번 실행하세요. 이 적용은 workbookDraftPages를 단일 Firestore update로 갱신합니다.
5. 지정 unit/page가 없으면 쓰지 말고 운영툴에서 “변경사항 저장”을 먼저 하라고 보고하세요.
6. 완료 후 페이지별 생성 요소 수, 낮은 confidence 항목, 건너뛴 페이지, 실제 수정 필드가 workbookDraftPages와 workbookDraftUpdatedAt뿐인지 보고하세요.`;
};

export const buildWorkbookChapterDraftPrompt = ({ chapterId }) => {
  if (!chapterId) return '';
  const safeChapterId = cleanIdPart(chapterId, 'chapter');

  return `당신은 초등수학 Smart Workbook 챕터 전체 초안 제작자입니다. Firestore에서 chapterId=${chapterId}에 속한 모든 unit과 등록된 페이지 이미지를 불러와 순서대로 분석하고, 학생이 실제로 답해야 하는 위치에 인터랙티브 요소를 생성한 뒤 모든 unit의 초안에 일괄 반영하세요.

[작업 대상]
- Firestore collections: chapters, units
- chapterId: ${chapterId}
- 범위: 이 chapter에 속한 모든 unit의 저장된 workbookDraftPages (없으면 workbookPages를 읽기 원본으로 사용)

[Codex 사전 준비 — 반드시 가장 먼저 실행]
1. URL을 page/unit마다 직접 다운로드하지 말고 아래 읽기 전용 명령을 정확히 한 번 실행하세요.
   node scripts/prepare-workbook-chapter-analysis.mjs --chapter-id="${chapterId}"
2. 출력된 manifestPath(${`/private/tmp/workbook-chapter-${safeChapterId}/manifest.json`})를 읽어 units 순서와 각 pages[].localImagePath를 확인하세요.
3. 모든 localImagePath를 실제 이미지 보기 도구로 열어 분석하세요. 열어 보지 못한 페이지는 추측하지 말고 건너뛰어 보고하세요.
4. Firebase/Google DNS 또는 네트워크가 샌드박스에서 차단되면 중단하거나 사용자에게 이미지를 다시 요청하지 마세요. 동일한 준비 명령을 외부 네트워크 권한(require_escalated)으로 즉시 한 번만 재실행하세요.

[절대 규칙]
1. Gemini API, OpenAI API 등 외부 AI API를 코드에서 호출하지 말고 현재 대화 모델의 시각 분석 능력만 사용하세요.
2. 인쇄된 모든 수가 아니라 학생이 직접 답하는 빈칸·밑줄·선택·조작 영역만 요소로 만드세요.
3. “수식으로 표현”은 계산 결과만이 아니라 15÷3=5처럼 문제에서 요구하는 완전한 식을 정답으로 지정하세요.
4. 좌표는 원본 이미지 기준 top/left/width/height 퍼센트이며 모두 0~100 범위여야 합니다.
5. 초등수학 범위에서 모든 정답을 직접 검산하고, 불확실하면 confidence를 낮추고 analysis.warnings에 이유를 남기세요.
6. 공개본 workbookPages는 절대 수정하지 마세요. 각 unit의 workbookDraftPages와 workbookDraftUpdatedAt만 수정하세요.
7. 단순 재미가 아니라 문제 행동이 나누기·위치·연결·순서·색칠일 때만 grouping·number-line·matching·ordering·coloring을 선택하세요.
8. grouping은 교환 가능한 항목이 고정 id 정답으로 오채점될 위험이 있으면 input 또는 multiple-choice를 사용하세요.

[지원 요소]
- input(inputMode: integer | decimal | fraction | mixed-number | expression | text)
- multiple-choice
- mask(triggerKey로 같은 페이지 clientKey 연결)
- grouping, number-line, matching, ordering, coloring

[힌트 작성 규칙]
- 모든 채점 요소에 hints 배열을 1~3개 작성하세요.
- 쉬운 관찰 단서부터 정답을 직접 노출하지 않는 구체적인 풀이 단서 순서로 작성하세요.
- 모든 채점 요소에 교재 문제 번호 problemLabel과 답안 영역 이름 responseLabel을 작성하세요.

[페이지별 JSON]
manifest의 이미지 페이지마다 아래 구조로 /private/tmp/workbook-draft-<safeUnitId>-<pageId>.json 파일을 만드세요.
{
  "schemaVersion": 2,
  "unitId": "manifest의 해당 unitId",
  "pageId": "manifest의 해당 pageId",
  "analysis": { "summary": "페이지 문제 유형 요약", "warnings": [] },
  "elements": [
    {
      "clientKey": "q1_answer",
      "type": "input",
      "inputMode": "expression",
      "answer": "15÷3=5",
      "acceptedAnswers": [],
      "answerSpec": { "kind": "literal-expression" },
      "problemLabel": "(1)",
      "responseLabel": "나눗셈식",
      "hints": ["전체 수와 나누는 수를 찾아보세요.", "전체 수 ÷ 나누는 수를 먼저 쓰세요.", "전체 수, 나누는 수, 결과를 ÷와 =로 연결하세요."],
      "sourceText": "문제 원문",
      "confidence": 0.98,
      "position": { "top": 30, "left": 35, "width": 30, "height": 5 }
    }
  ]
}

[일괄 검증 및 적용]
1. unit/page별 Firestore dry-run을 병렬 또는 순차 반복하지 마세요. 모든 JSON 작성 후 아래 챕터 배치 명령을 --apply 없이 정확히 한 번 실행하세요.
   node scripts/apply-workbook-chapter-draft-analysis.mjs --chapter-id="${chapterId}"
2. Firestore DNS/네트워크 차단이면 같은 명령을 외부 네트워크 권한(require_escalated)으로 즉시 한 번만 재실행하세요.
3. 챕터 배치 dry-run이 전체 성공한 경우에만 다음 명령을 한 번 실행하세요.
   node scripts/apply-workbook-chapter-draft-analysis.mjs --chapter-id="${chapterId}" --apply
4. 적용은 Firestore batch로 모든 unit의 workbookDraftPages와 workbookDraftUpdatedAt만 원자적으로 갱신해야 합니다. 어느 한 페이지라도 JSON 누락·검증 실패·저장된 pageId 불일치가 있으면 아무 unit도 수정하지 마세요.
5. unit/page가 없으면 운영툴에서 각 unit의 이미지를 등록하고 “변경사항 저장”을 먼저 하라고 보고하세요.
6. 완료 후 unit별·페이지별 생성 요소 수, 낮은 confidence 항목, 건너뛴 페이지와 원인, 실제 수정 필드를 보고하세요.`;
};
