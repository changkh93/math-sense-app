import admin from 'firebase-admin';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';

const args = process.argv.slice(2);
const readArg = (name) => args.find(arg => arg.startsWith(`${name}=`))?.slice(name.length + 1) || '';
const safePart = (value, fallback) => String(value || '')
  .trim()
  .replace(/[^a-zA-Z0-9_-]+/g, '_')
  .slice(0, 100) || fallback;

const unitId = readArg('--unit-id');
if (!unitId) {
  console.error('Usage: node scripts/prepare-workbook-unit-analysis.mjs --unit-id=... [--out-dir=/private/tmp/... ]');
  process.exit(1);
}
if (!existsSync('./service-account.json')) {
  console.error('./service-account.json is required.');
  process.exit(1);
}

const safeUnitId = safePart(unitId, 'unit');
const outDir = path.resolve(readArg('--out-dir') || `/private/tmp/workbook-unit-${safeUnitId}`);
mkdirSync(outDir, { recursive: true });

const serviceAccount = JSON.parse(readFileSync('./service-account.json', 'utf8'));
if (admin.apps.length === 0) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();
const extensionFor = (contentType, imageUrl) => {
  const normalized = String(contentType || '').toLowerCase();
  if (normalized.includes('png')) return '.png';
  if (normalized.includes('webp')) return '.webp';
  if (normalized.includes('gif')) return '.gif';
  if (normalized.includes('jpeg') || normalized.includes('jpg')) return '.jpg';
  try {
    const storagePath = decodeURIComponent(new URL(imageUrl).pathname);
    const match = storagePath.match(/\.(png|webp|gif|jpe?g)(?:$|\?)/i);
    if (match) return `.${match[1].toLowerCase().replace('jpeg', 'jpg')}`;
  } catch { /* use jpg fallback */ }
  return '.jpg';
};

try {
  const unitSnap = await db.collection('units').doc(unitId).get();
  if (!unitSnap.exists) throw new Error(`units/${unitId} 문서가 없습니다.`);

  const unit = unitSnap.data();
  const pages = Array.isArray(unit.workbookDraftPages)
    ? unit.workbookDraftPages
    : (Array.isArray(unit.workbookPages) ? unit.workbookPages : []);
  const targets = pages
    .map((page, index) => ({ page, index }))
    .filter(({ page }) => page?.id && page?.imageUrl);
  if (targets.length === 0) throw new Error('다운로드할 workbookDraftPages 이미지가 없습니다. 운영툴에서 이미지를 등록하고 “변경사항 저장”을 먼저 실행하세요.');

  const manifestPages = [];
  for (const { page, index } of targets) {
    let response;
    try {
      response = await fetch(page.imageUrl, { signal: AbortSignal.timeout(45_000) });
    } catch (error) {
      const networkCode = error?.cause?.code || error?.code || '';
      throw new Error(`Page ${index + 1} (${page.id}) 이미지 다운로드 실패${networkCode ? ` [${networkCode}]` : ''}: ${error.message}`);
    }
    if (!response.ok) throw new Error(`Page ${index + 1} (${page.id}) 이미지 다운로드 실패: HTTP ${response.status}`);

    const extension = extensionFor(response.headers.get('content-type'), page.imageUrl);
    const fileName = `${String(index + 1).padStart(2, '0')}-${safePart(page.id, `page_${index + 1}`)}${extension}`;
    const localImagePath = path.join(outDir, fileName);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length === 0) throw new Error(`Page ${index + 1} (${page.id}) 이미지가 비어 있습니다.`);
    writeFileSync(localImagePath, bytes);
    manifestPages.push({
      pageNumber: index + 1,
      pageId: page.id,
      localImagePath,
      contentType: response.headers.get('content-type') || '',
      byteLength: bytes.length,
      existingElementCount: Array.isArray(page.elements) ? page.elements.length : 0,
    });
  }

  const manifest = {
    unitId,
    unitTitle: unit.title || '',
    sourceField: Array.isArray(unit.workbookDraftPages) ? 'workbookDraftPages' : 'workbookPages',
    outDir,
    pageCount: manifestPages.length,
    pages: manifestPages,
    preparedAt: new Date().toISOString(),
  };
  const manifestPath = path.join(outDir, 'manifest.json');
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(JSON.stringify({ ok: true, manifestPath, ...manifest }, null, 2));
} catch (error) {
  console.error(`Workbook unit preparation failed: ${error.message}`);
  console.error('DNS 또는 네트워크 제한이면 동일한 읽기 전용 명령을 외부 네트워크 권한으로 다시 실행하세요. 재시도 전에는 JSON을 추측하여 만들지 마세요.');
  process.exitCode = 1;
} finally {
  await db.terminate();
}
