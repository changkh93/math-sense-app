import assert from 'node:assert/strict';
import {
  buildWorkbookDraftPrompt,
  buildWorkbookUnitDraftPrompt,
  normalizeWorkbookAnalysisPayload,
  parseWorkbookAnalysisJson,
  validateWorkbookPagesForPublish
} from '../src/utils/workbookDraftUtils.js';

const payload = parseWorkbookAnalysisJson(`\`\`\`json
{
  "schemaVersion": 2,
  "unitId": "unit_demo",
  "pageId": "page_demo",
  "elements": [
    {
      "clientKey": "q1",
      "type": "input",
      "inputMode": "fraction",
      "answer": "1/2",
      "position": { "top": 20, "left": 30, "width": 12, "height": 5 },
      "confidence": 0.9
    },
    {
      "clientKey": "q1_mask",
      "type": "mask",
      "triggerKey": "q1",
      "position": { "top": 25, "left": 30, "width": 12, "height": 5 },
      "confidence": 0.8
    },
    {
      "clientKey": "q2_line",
      "type": "number-line",
      "config": { "min": 0, "max": 5, "step": 1, "answer": 3 },
      "hints": ["한 칸씩 세어 보세요."],
      "position": { "top": 40, "left": 10, "width": 80, "height": 15 },
      "confidence": 0.95
    }
  ]
}
\`\`\``);

const normalized = normalizeWorkbookAnalysisPayload(payload, {
  unitId: 'unit_demo',
  pageId: 'page_demo'
});

assert.equal(normalized.elements.length, 3);
assert.equal(normalized.elements[0].inputMode, 'fraction');
assert.equal(normalized.elements[1].triggerBy, normalized.elements[0].id);
assert.equal(normalized.elements[2].config.answer, 3);

assert.throws(() => normalizeWorkbookAnalysisPayload(payload, {
  unitId: 'wrong_unit',
  pageId: 'page_demo'
}), /문서 ID가 일치하지 않습니다/);

const publishIssues = validateWorkbookPagesForPublish([{
  id: 'page_demo',
  imageUrl: 'https://example.com/page.png',
  elements: normalized.elements
}]);
assert.deepEqual(publishIssues, []);

const invalidIssues = validateWorkbookPagesForPublish([{
  id: 'page_empty',
  imageUrl: 'https://example.com/page.png',
  elements: []
}]);
assert.ok(invalidIssues.some(issue => issue.includes('인터랙티브 요소가 없습니다')));

const prompt = buildWorkbookDraftPrompt({
  unitId: 'unit_demo',
  unitTitle: '분수',
  pageIndex: 0,
  page: { id: 'page_demo', imageUrl: 'https://example.com/page.png' }
});
assert.match(prompt, /문서 ID\(unitId\): unit_demo/);
assert.match(prompt, /페이지 ID\(pageId\): page_demo/);
assert.match(prompt, /위 JSON만 반환하세요/);
assert.match(prompt, /workbookDraftPages/);
assert.match(prompt, /number-line/);
assert.match(prompt, /P3 config 규격/);

const unitPrompt = buildWorkbookUnitDraftPrompt({
  unitId: 'unit_demo',
  unitTitle: '분수',
  pages: [
    { id: 'page_1', imageUrl: 'https://example.com/1.png', elements: [] },
    { id: 'page_2', imageUrl: 'https://example.com/2.png', elements: normalized.elements },
  ]
});
assert.match(unitPrompt, /단원 전체 초안 제작자/);
assert.match(unitPrompt, /대상 페이지 수: 2/);
assert.match(unitPrompt, /pageId: page_1/);
assert.match(unitPrompt, /pageId: page_2/);
assert.match(unitPrompt, /prepare-workbook-unit-analysis\.mjs/);
assert.match(unitPrompt, /require_escalated/);
assert.match(unitPrompt, /모든 페이지에 대해 먼저/);
assert.match(unitPrompt, /--apply/);

console.log('Workbook draft utility tests passed.');
