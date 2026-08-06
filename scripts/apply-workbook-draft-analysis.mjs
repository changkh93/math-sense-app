import admin from 'firebase-admin';
import { existsSync, readFileSync } from 'fs';
import { normalizeWorkbookAnalysisPayload } from '../src/utils/workbookDraftUtils.js';

const args = process.argv.slice(2);
const shouldApply = args.includes('--apply');
const readArg = (name) => args.find(arg => arg.startsWith(`${name}=`))?.slice(name.length + 1) || '';

const unitId = readArg('--unit-id');
const pageId = readArg('--page-id');
const inputPath = readArg('--input');

if (!unitId || !pageId || !inputPath) {
  console.error('Usage: node scripts/apply-workbook-draft-analysis.mjs --unit-id=... --page-id=... --input=/absolute/result.json [--apply]');
  process.exit(1);
}
if (!existsSync(inputPath)) {
  console.error(`Input JSON not found: ${inputPath}`);
  process.exit(1);
}
if (!existsSync('./service-account.json')) {
  console.error('./service-account.json is required.');
  process.exit(1);
}

const rawPayload = JSON.parse(readFileSync(inputPath, 'utf8'));
const normalized = normalizeWorkbookAnalysisPayload(rawPayload, { unitId, pageId });
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
  const pageIndex = draftPages.findIndex(page => page?.id === pageId);
  if (pageIndex < 0) {
    throw new Error(`workbookDraftPages에서 pageId=${pageId}를 찾지 못했습니다. 운영툴에서 이미지를 등록한 뒤 “변경사항 저장”을 먼저 실행하세요.`);
  }

  const targetPage = draftPages[pageIndex];
  if (!targetPage.imageUrl) throw new Error('대상 페이지에 imageUrl이 없습니다.');

  const nextPages = draftPages.map((page, index) => index === pageIndex ? {
    ...page,
    elements: normalized.elements,
    learningDesign: normalized.learningDesign,
    draftStatus: 'ai_draft',
    analysis: normalized.analysis,
    analysisMeta: {
      source: 'manual-chat-prompt',
      schemaVersion: normalized.schemaVersion,
      generatedAt: new Date().toISOString(),
      elementCount: normalized.elements.length
    }
  } : page);

  const lowConfidence = normalized.elements
    .filter(element => Number(element.confidence) < 0.75)
    .map(element => ({ id: element.id, confidence: element.confidence, sourceText: element.sourceText }));

  console.log(JSON.stringify({
    mode: shouldApply ? 'apply' : 'dry-run',
    unitId,
    pageId,
    imageUrl: targetPage.imageUrl,
    previousElementCount: Array.isArray(targetPage.elements) ? targetPage.elements.length : 0,
    nextElementCount: normalized.elements.length,
    lowConfidence,
    fieldsToUpdate: ['workbookDraftPages', 'workbookDraftUpdatedAt']
  }, null, 2));

  if (!shouldApply) {
    console.log('DRY RUN ONLY. 검토 후 같은 명령에 --apply를 추가해야 Firestore 초안이 변경됩니다.');
    process.exit(0);
  }

  await unitRef.update({
    workbookDraftPages: nextPages,
    workbookDraftUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
  console.log('APPLIED: 공개본 workbookPages는 변경하지 않고 workbookDraftPages만 갱신했습니다.');
} catch (error) {
  console.error(`Workbook draft apply failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await db.terminate();
}
