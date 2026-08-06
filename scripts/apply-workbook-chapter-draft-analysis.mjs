import admin from 'firebase-admin';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { normalizeWorkbookAnalysisPayload } from '../src/utils/workbookDraftUtils.js';

const args = process.argv.slice(2);
const shouldApply = args.includes('--apply');
const readArg = (name) => args.find(arg => arg.startsWith(`${name}=`))?.slice(name.length + 1) || '';
const safePart = (value, fallback) => String(value || '').trim().replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 100) || fallback;
const chapterId = readArg('--chapter-id');
if (!chapterId) {
  console.error('Usage: node scripts/apply-workbook-chapter-draft-analysis.mjs --chapter-id=... [--manifest=/absolute/manifest.json] [--input-dir=/private/tmp] [--apply]');
  process.exit(1);
}
if (!existsSync('./service-account.json')) {
  console.error('./service-account.json is required.');
  process.exit(1);
}

const safeChapterId = safePart(chapterId, 'chapter');
const manifestPath = path.resolve(readArg('--manifest') || `/private/tmp/workbook-chapter-${safeChapterId}/manifest.json`);
const inputDir = path.resolve(readArg('--input-dir') || '/private/tmp');
if (!existsSync(manifestPath)) {
  console.error(`Manifest not found: ${manifestPath}`);
  console.error(`먼저 실행하세요: node scripts/prepare-workbook-chapter-analysis.mjs --chapter-id="${chapterId}"`);
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
if (manifest.chapterId !== chapterId) throw new Error(`Manifest chapterId mismatch: expected=${chapterId}, actual=${manifest.chapterId || ''}`);
const manifestUnits = Array.isArray(manifest.units) ? manifest.units : [];
if (manifestUnits.length === 0) throw new Error('Manifest에 처리할 unit이 없습니다.');
if (manifestUnits.length > 450) throw new Error('Firestore 원자적 batch 제한을 위해 한 번에 최대 450개 unit까지 처리할 수 있습니다.');

const preparedUnits = manifestUnits.map((manifestUnit) => {
  const unitId = String(manifestUnit.unitId || '').trim();
  const safeUnitId = safePart(unitId, 'unit');
  const pages = (manifestUnit.pages || []).map((manifestPage) => {
    const pageId = String(manifestPage.pageId || '').trim();
    const inputPath = path.join(inputDir, `workbook-draft-${safeUnitId}-${safePart(pageId, 'page')}.json`);
    if (!pageId || !existsSync(inputPath)) throw new Error(`페이지 JSON이 없습니다: unitId=${unitId}, pageId=${pageId || '(없음)'}, input=${inputPath}`);
    const normalized = normalizeWorkbookAnalysisPayload(JSON.parse(readFileSync(inputPath, 'utf8')), { unitId, pageId });
    return { manifestPage, pageId, inputPath, normalized };
  });
  return { manifestUnit, unitId, pages };
}).filter(unit => unit.pages.length > 0);
if (preparedUnits.length === 0) throw new Error('Manifest에 이미지가 등록된 페이지가 없습니다.');

const serviceAccount = JSON.parse(readFileSync('./service-account.json', 'utf8'));
if (admin.apps.length === 0) admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

try {
  const unitsSnap = await db.collection('units').where('chapterId', '==', chapterId).get();
  const snapshots = new Map(unitsSnap.docs.map(doc => [doc.id, doc]));
  const updates = preparedUnits.map(({ manifestUnit, unitId, pages }) => {
    const unitSnap = snapshots.get(unitId);
    if (!unitSnap) throw new Error(`chapterId=${chapterId}의 units/${unitId} 문서가 없습니다.`);
    const unit = unitSnap.data();
    const draftPages = Array.isArray(unit.workbookDraftPages) ? unit.workbookDraftPages : (Array.isArray(unit.workbookPages) ? unit.workbookPages : []);
    const pageIndexById = new Map(draftPages.map((page, index) => [page?.id, index]));
    const reports = pages.map(({ manifestPage, pageId, inputPath, normalized }) => {
      const pageIndex = pageIndexById.get(pageId);
      if (pageIndex === undefined) throw new Error(`units/${unitId}의 workbookDraftPages에서 pageId=${pageId}를 찾지 못했습니다. “변경사항 저장”을 먼저 실행하세요.`);
      const targetPage = draftPages[pageIndex];
      if (!targetPage?.imageUrl) throw new Error(`units/${unitId} pageId=${pageId}에 imageUrl이 없습니다.`);
      return {
        pageNumber: manifestPage.pageNumber,
        pageId,
        inputPath,
        previousElementCount: Array.isArray(targetPage.elements) ? targetPage.elements.length : 0,
        nextElementCount: normalized.elements.length,
        lowConfidence: normalized.elements.filter(element => Number(element.confidence) < 0.75).map(element => ({ id: element.id, confidence: element.confidence, sourceText: element.sourceText })),
      };
    });
    const normalizedByPageId = new Map(pages.map(item => [item.pageId, item.normalized]));
    const nextPages = draftPages.map((page) => {
      const normalized = normalizedByPageId.get(page?.id);
      if (!normalized) return page;
      return {
        ...page,
        elements: normalized.elements,
        learningDesign: normalized.learningDesign,
        draftStatus: 'ai_draft',
        analysis: normalized.analysis,
        analysisMeta: { source: 'codex-chapter-prompt', schemaVersion: normalized.schemaVersion, generatedAt: new Date().toISOString(), elementCount: normalized.elements.length },
      };
    });
    return { unitId, unitTitle: manifestUnit.unitTitle || unit.title || '', unitRef: unitSnap.ref, nextPages, reports };
  });

  console.log(JSON.stringify({
    mode: shouldApply ? 'apply' : 'dry-run',
    chapterId,
    manifestPath,
    unitCount: updates.length,
    pageCount: updates.reduce((sum, update) => sum + update.reports.length, 0),
    units: updates.map(({ unitId, unitTitle, reports }) => ({ unitId, unitTitle, pageCount: reports.length, pages: reports })),
    fieldsToUpdatePerUnit: ['workbookDraftPages', 'workbookDraftUpdatedAt'],
  }, null, 2));

  if (!shouldApply) {
    console.log('DRY RUN ONLY. 챕터 전체를 한 번의 Firestore 조회로 검증했습니다. 같은 명령에 --apply를 추가하면 모든 unit 초안을 원자적으로 갱신합니다.');
  } else {
    const batch = db.batch();
    updates.forEach(({ unitRef, nextPages }) => batch.update(unitRef, { workbookDraftPages: nextPages, workbookDraftUpdatedAt: admin.firestore.FieldValue.serverTimestamp() }));
    await batch.commit();
    console.log('APPLIED: 공개본 workbookPages는 변경하지 않고 챕터 내 모든 unit의 workbookDraftPages를 원자적으로 갱신했습니다.');
  }
} catch (error) {
  const networkCode = error?.cause?.code || error?.code || '';
  console.error(`Workbook chapter draft ${shouldApply ? 'apply' : 'dry-run'} failed${networkCode ? ` [${networkCode}]` : ''}: ${error.message}`);
  console.error('DNS 또는 네트워크 제한이면 동일한 명령을 외부 네트워크 권한으로 한 번만 다시 실행하세요. unit/page별 프로세스로 분할 재실행하지 마세요.');
  process.exitCode = 1;
} finally {
  await Promise.race([db.terminate().catch(() => undefined), new Promise(resolve => setTimeout(resolve, 2_000))]);
}
