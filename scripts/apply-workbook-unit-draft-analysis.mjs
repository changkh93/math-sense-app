import admin from 'firebase-admin';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { normalizeWorkbookAnalysisPayload } from '../src/utils/workbookDraftUtils.js';

const args = process.argv.slice(2);
const shouldApply = args.includes('--apply');
const readArg = (name) => args.find(arg => arg.startsWith(`${name}=`))?.slice(name.length + 1) || '';
const safePart = (value, fallback) => String(value || '')
  .trim()
  .replace(/[^a-zA-Z0-9_-]+/g, '_')
  .slice(0, 100) || fallback;

const unitId = readArg('--unit-id');
if (!unitId) {
  console.error('Usage: node scripts/apply-workbook-unit-draft-analysis.mjs --unit-id=... [--manifest=/absolute/manifest.json] [--input-dir=/private/tmp] [--apply]');
  process.exit(1);
}
if (!existsSync('./service-account.json')) {
  console.error('./service-account.json is required.');
  process.exit(1);
}

const safeUnitId = safePart(unitId, 'unit');
const manifestPath = path.resolve(readArg('--manifest') || `/private/tmp/workbook-unit-${safeUnitId}/manifest.json`);
const inputDir = path.resolve(readArg('--input-dir') || '/private/tmp');
if (!existsSync(manifestPath)) {
  console.error(`Manifest not found: ${manifestPath}`);
  console.error(`먼저 실행하세요: node scripts/prepare-workbook-unit-analysis.mjs --unit-id="${unitId}"`);
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
if (manifest.unitId !== unitId) {
  console.error(`Manifest unitId mismatch: expected=${unitId}, actual=${manifest.unitId || ''}`);
  process.exit(1);
}
const manifestPages = Array.isArray(manifest.pages) ? manifest.pages : [];
if (manifestPages.length === 0) {
  console.error('Manifest에 처리할 페이지가 없습니다.');
  process.exit(1);
}

const preparedPages = manifestPages.map((manifestPage) => {
  const pageId = String(manifestPage.pageId || '').trim();
  const inputPath = path.join(inputDir, `workbook-draft-${safeUnitId}-${safePart(pageId, 'page')}.json`);
  if (!pageId || !existsSync(inputPath)) {
    throw new Error(`페이지 JSON이 없습니다: pageId=${pageId || '(없음)'}, input=${inputPath}`);
  }
  const rawPayload = JSON.parse(readFileSync(inputPath, 'utf8'));
  const normalized = normalizeWorkbookAnalysisPayload(rawPayload, { unitId, pageId });
  return { manifestPage, pageId, inputPath, normalized };
});

const serviceAccount = JSON.parse(readFileSync('./service-account.json', 'utf8'));
if (admin.apps.length === 0) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();
const unitRef = db.collection('units').doc(unitId);

try {
  const unitSnap = await unitRef.get();
  if (!unitSnap.exists) throw new Error(`units/${unitId} 문서가 없습니다.`);

  const unit = unitSnap.data();
  const draftPages = Array.isArray(unit.workbookDraftPages)
    ? unit.workbookDraftPages
    : (Array.isArray(unit.workbookPages) ? unit.workbookPages : []);
  const draftIndexById = new Map(draftPages.map((page, index) => [page?.id, index]));

  const reports = preparedPages.map(({ manifestPage, pageId, inputPath, normalized }) => {
    const pageIndex = draftIndexById.get(pageId);
    if (pageIndex === undefined) {
      throw new Error(`workbookDraftPages에서 pageId=${pageId}를 찾지 못했습니다. 운영툴에서 “변경사항 저장”을 먼저 실행하세요.`);
    }
    const targetPage = draftPages[pageIndex];
    if (!targetPage?.imageUrl) throw new Error(`pageId=${pageId}에 imageUrl이 없습니다.`);
    return {
      pageNumber: manifestPage.pageNumber,
      pageId,
      inputPath,
      previousElementCount: Array.isArray(targetPage.elements) ? targetPage.elements.length : 0,
      nextElementCount: normalized.elements.length,
      lowConfidence: normalized.elements
        .filter(element => Number(element.confidence) < 0.75)
        .map(element => ({ id: element.id, confidence: element.confidence, sourceText: element.sourceText })),
    };
  });

  const normalizedByPageId = new Map(preparedPages.map(item => [item.pageId, item.normalized]));
  const nextPages = draftPages.map((page) => {
    const normalized = normalizedByPageId.get(page?.id);
    if (!normalized) return page;
    return {
      ...page,
      elements: normalized.elements,
      learningDesign: normalized.learningDesign,
      draftStatus: 'ai_draft',
      analysis: normalized.analysis,
      analysisMeta: {
        source: 'codex-unit-prompt',
        schemaVersion: normalized.schemaVersion,
        generatedAt: new Date().toISOString(),
        elementCount: normalized.elements.length,
      },
    };
  });

  console.log(JSON.stringify({
    mode: shouldApply ? 'apply' : 'dry-run',
    unitId,
    manifestPath,
    pageCount: reports.length,
    pages: reports,
    fieldsToUpdate: ['workbookDraftPages', 'workbookDraftUpdatedAt'],
  }, null, 2));

  if (!shouldApply) {
    console.log('DRY RUN ONLY. 모든 페이지를 한 번의 Firestore 조회로 검증했습니다. 같은 명령에 --apply를 추가하면 unit 초안을 한 번에 갱신합니다.');
  } else {
    await unitRef.update({
      workbookDraftPages: nextPages,
      workbookDraftUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log('APPLIED: 공개본 workbookPages는 변경하지 않고 unit의 workbookDraftPages를 한 번에 갱신했습니다.');
  }
} catch (error) {
  const networkCode = error?.cause?.code || error?.code || '';
  console.error(`Workbook unit draft ${shouldApply ? 'apply' : 'dry-run'} failed${networkCode ? ` [${networkCode}]` : ''}: ${error.message}`);
  console.error('DNS 또는 네트워크 제한이면 동일한 명령을 외부 네트워크 권한으로 한 번만 다시 실행하세요. 페이지별 병렬 프로세스로 재실행하지 마세요.');
  process.exitCode = 1;
} finally {
  await Promise.race([
    db.terminate().catch(() => undefined),
    new Promise(resolve => setTimeout(resolve, 2_000)),
  ]);
}
