import admin from 'firebase-admin';
import { GoogleAuth } from 'google-auth-library';
import { readFileSync } from 'fs';

// Restore only the pre-existing, substantial monthly-assessment content.
// The prior document versions are available for a short time through Firestore's
// version-retention window. Add --apply only after checking the dry-run summary.
const serviceAccount = JSON.parse(readFileSync('./service-account.json', 'utf8'));
const READ_TIME = '2026-08-04T01:13:24.103Z';
const APPLY = process.argv.includes('--apply');
const PREFIX = 'reg_1774390167801_';

if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

function stringField(fields, name) {
  return String(fields?.[name]?.stringValue ?? '');
}

function hasObviousError(text) {
  return /\b(?:undefined|null|nan)\b|\[cite\s*:|TODO|해설을 제공할 수 없|이미지를 확인할 수 없|문제를 확인할 수 없/i.test(text);
}

// This is deliberately conservative. Short, empty, or clearly broken material
// stays replaced; richer pre-existing material returns unchanged.
function isDeficient(hint, explanation) {
  const combined = `${hint}\n${explanation}`;
  return !hint.trim()
    || !explanation.trim()
    || hint.trim().length < 160
    || explanation.trim().length < 450
    || hasObviousError(combined);
}

async function readPreviousVersions(docPaths) {
  const auth = new GoogleAuth({
    credentials: serviceAccount,
    scopes: ['https://www.googleapis.com/auth/cloud-platform']
  });
  const accessToken = await auth.getAccessToken();
  const url = `https://firestore.googleapis.com/v1/projects/${serviceAccount.project_id}/databases/(default)/documents:batchGet`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ documents: docPaths, readTime: READ_TIME })
  });
  if (!response.ok) throw new Error(`이전 버전 조회 실패: ${response.status} ${await response.text()}`);
  const raw = (await response.text()).trim();
  const rows = raw.startsWith('[')
    ? JSON.parse(raw)
    : raw.split('\n').filter(Boolean).map(line => JSON.parse(line));
  const found = new Map();
  for (const row of rows) {
    if (!row.found) throw new Error(`이전 버전이 없는 문항이 있습니다: ${row.missing || 'unknown'}`);
    found.set(row.found.name, row.found.fields || {});
  }
  return found;
}

async function run() {
  const snapshot = await db.collection('quizzes').where('unitId', '>=', PREFIX).where('unitId', '<', `${PREFIX}\uf8ff`).get();
  if (snapshot.size !== 400) throw new Error(`대상 문항 수가 맞지 않습니다: ${snapshot.size}`);
  const current = snapshot.docs.map(doc => ({ id: doc.id, path: doc.ref.path }));
  const previous = await readPreviousVersions(current.map(doc => `projects/${serviceAccount.project_id}/databases/(default)/documents/${doc.path}`));
  const restore = [];
  const replace = [];
  for (const doc of current) {
    const fields = previous.get(`projects/${serviceAccount.project_id}/databases/(default)/documents/${doc.path}`);
    const hint = stringField(fields, 'hint');
    const explanation = stringField(fields, 'explanation');
    (isDeficient(hint, explanation) ? replace : restore).push({ ...doc, hint, explanation });
  }
  console.log(JSON.stringify({
    mode: APPLY ? 'apply' : 'dry-run',
    readTime: READ_TIME,
    total: current.length,
    restoreExisting: restore.length,
    keepNewForDeficient: replace.length,
    restoreSamples: restore.slice(0, 3).map(item => ({ id: item.id, hintLength: item.hint.length, explanationLength: item.explanation.length })),
    deficientSamples: replace.slice(0, 6).map(item => ({ id: item.id, hintLength: item.hint.length, explanationLength: item.explanation.length }))
  }, null, 2));
  if (!APPLY) return;
  for (let offset = 0; offset < restore.length; offset += 400) {
    const batch = db.batch();
    for (const entry of restore.slice(offset, offset + 400)) {
      batch.update(db.collection('quizzes').doc(entry.id), {
        hint: entry.hint,
        explanation: entry.explanation,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    await batch.commit();
  }
  console.log(`Restored ${restore.length} pre-existing well-formed quizzes; retained new content for ${replace.length} deficient quizzes.`);
}

try {
  await run();
} finally {
  await admin.app().delete();
}
