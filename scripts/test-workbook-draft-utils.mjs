import assert from 'node:assert/strict';
import { shuffleWorkbookOptions } from '../src/utils/workbookOptionUtils.js';
import {
  buildWorkbookChapterDraftPrompt,
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
      "hints": ["분자와 분모를 찾아보세요.", "전체를 몇 등분했는지 보세요."],
      "position": { "top": 20, "left": 30, "width": 12, "height": 5 },
      "confidence": 0.9
    },
    {
      "clientKey": "q1_choice",
      "type": "multiple-choice",
      "answer": "1/2",
      "options": ["1/2", "1/3"],
      "hints": ["전체의 절반을 찾아보세요."],
      "position": { "top": 30, "left": 30, "width": 12, "height": 5 },
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

assert.equal(normalized.elements.length, 4);
assert.equal(normalized.elements[0].inputMode, 'fraction');
assert.deepEqual(normalized.elements[0].hints, ['분자와 분모를 찾아보세요.', '전체를 몇 등분했는지 보세요.']);
assert.equal(normalized.elements[1].hints[0], '전체의 절반을 찾아보세요.');
assert.equal(normalized.elements[2].triggerBy, normalized.elements[0].id);
assert.equal(normalized.elements[3].config.answer, 3);
assert.deepEqual(normalized.learningDesign, { adaptiveHints: true });

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
assert.match(prompt, /"hints"/);
assert.doesNotMatch(prompt, /gradeBand|difficulty|대상 학년군|기본 난이도/);

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
assert.match(unitPrompt, /apply-workbook-unit-draft-analysis\.mjs/);
assert.match(unitPrompt, /페이지별 병렬 dry-run을 실행하지 마세요/);
assert.match(unitPrompt, /--apply/);
assert.match(unitPrompt, /모든 채점 요소에 hints/);
assert.doesNotMatch(unitPrompt, /gradeBand|difficulty/);

const chapterPrompt = buildWorkbookChapterDraftPrompt({ chapterId: 'chapter_demo' });
assert.match(chapterPrompt, /챕터 전체 초안 제작자/);
assert.match(chapterPrompt, /chapterId: chapter_demo/);
assert.match(chapterPrompt, /prepare-workbook-chapter-analysis\.mjs/);
assert.match(chapterPrompt, /apply-workbook-chapter-draft-analysis\.mjs/);
assert.match(chapterPrompt, /require_escalated/);
assert.match(chapterPrompt, /FireStore batch|Firestore batch/);
assert.match(chapterPrompt, /--apply/);
assert.match(chapterPrompt, /모든 채점 요소에 hints/);
assert.doesNotMatch(chapterPrompt, /gradeBand|difficulty/);

const originalOptions = ['정답', '오답 1', '오답 2'];
const shuffledOptions = shuffleWorkbookOptions(originalOptions, () => 0.999999);
assert.deepEqual(originalOptions, ['정답', '오답 1', '오답 2']);
assert.notDeepEqual(shuffledOptions, originalOptions);
assert.deepEqual([...shuffledOptions].sort(), [...originalOptions].sort());

console.log('Workbook draft utility tests passed.');
