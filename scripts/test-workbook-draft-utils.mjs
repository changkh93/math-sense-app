import assert from 'node:assert/strict';
import {
  buildWorkbookDraftPrompt,
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
    }
  ]
}
\`\`\``);

const normalized = normalizeWorkbookAnalysisPayload(payload, {
  unitId: 'unit_demo',
  pageId: 'page_demo'
});

assert.equal(normalized.elements.length, 2);
assert.equal(normalized.elements[0].inputMode, 'fraction');
assert.equal(normalized.elements[1].triggerBy, normalized.elements[0].id);

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
assert.match(prompt, /ChatGPT 웹이라면/);
assert.match(prompt, /workbookDraftPages/);

console.log('Workbook draft utility tests passed.');
