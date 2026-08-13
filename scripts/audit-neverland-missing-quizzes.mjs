import admin from 'firebase-admin';
import { existsSync, readFileSync } from 'fs';

const REGION_ID = 'reg_1776154036888';
const credentialPath = './service-account.json';

if (!existsSync(credentialPath)) throw new Error(`${credentialPath} is required.`);

const serviceAccount = JSON.parse(readFileSync(credentialPath, 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function getDocsByField(collectionName, field, values) {
  const docs = [];
  const uniqueValues = [...new Set(values.filter(Boolean))];
  for (let index = 0; index < uniqueValues.length; index += 30) {
    const snapshot = await db.collection(collectionName)
      .where(field, 'in', uniqueValues.slice(index, index + 30)).get();
    docs.push(...snapshot.docs);
  }
  return docs;
}

const chapterDocs = await db.collection('chapters').where('regionId', '==', REGION_ID).get();
const chapterIds = chapterDocs.docs.map((doc) => doc.id);
const chapterTitleById = new Map(chapterDocs.docs.map((doc) => [doc.id, doc.data().title || doc.id]));
const unitDocs = await getDocsByField('units', 'chapterId', chapterIds);
const units = unitDocs.map((doc) => ({ id: doc.id, ...doc.data() }));
const quizDocs = await getDocsByField('quizzes', 'unitId', units.map((unit) => unit.id));
const quizCountByUnitId = new Map();

for (const quizDoc of quizDocs) {
  const unitId = quizDoc.data().unitId;
  quizCountByUnitId.set(unitId, (quizCountByUnitId.get(unitId) || 0) + 1);
}

const rows = units.map((unit) => ({
  id: unit.id,
  title: unit.title || '',
  chapterId: unit.chapterId,
  chapterTitle: chapterTitleById.get(unit.chapterId) || unit.chapterId,
  order: unit.order ?? null,
  quizCount: quizCountByUnitId.get(unit.id) || 0,
})).sort((a, b) => String(a.chapterId).localeCompare(String(b.chapterId)) || (a.order ?? 9999) - (b.order ?? 9999));

console.log(JSON.stringify({
  regionId: REGION_ID,
  chapterCount: chapterIds.length,
  unitCount: rows.length,
  quizCount: quizDocs.length,
  missingQuizUnitCount: rows.filter((row) => row.quizCount === 0).length,
  units: rows,
}, null, 2));

await db.terminate();
