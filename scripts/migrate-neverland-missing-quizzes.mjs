import admin from 'firebase-admin';
import { existsSync, readFileSync } from 'fs';

const REGION_ID = 'reg_1776154036888';
const DATA_FILE = './scratch/neverland-missing-quizzes.json';
const shouldApply = process.argv.includes('--apply');

if (!existsSync('./service-account.json')) throw new Error('./service-account.json is required');
if (!existsSync(DATA_FILE)) throw new Error(`${DATA_FILE} is required`);

const serviceAccount = JSON.parse(readFileSync('./service-account.json', 'utf8'));
const data = JSON.parse(readFileSync(DATA_FILE, 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const chapterSnapshot = await db.collection('chapters').where('regionId', '==', REGION_ID).get();
const validChapterIds = new Set(chapterSnapshot.docs.map((doc) => doc.id));
const existingUnits = [];
for (const chapterId of validChapterIds) {
  const snapshot = await db.collection('units').where('chapterId', '==', chapterId).get();
  existingUnits.push(...snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
}

function normalizeTitle(value) {
  return String(value || '').replace(/[\s·ㆍ:()]/g, '').toLowerCase();
}

const existingTitleMap = new Map(existingUnits.map((unit) => [normalizeTitle(unit.title), unit]));
const plan = [];

for (const book of data.books) {
  if (!validChapterIds.has(book.chapterId)) throw new Error(`Invalid chapter for ${book.title}: ${book.chapterId}`);
  const sameTitle = existingTitleMap.get(normalizeTitle(book.title));
  if (sameTitle) throw new Error(`Unit title already exists: ${book.title} (${sameTitle.id})`);
  if (book.quizzes.length !== 15) throw new Error(`${book.title} must have 15 quizzes`);

  const unitId = `${REGION_ID}_${book.chapterId}_unit_aladin_${book.itemId}`;
  const unitRef = db.collection('units').doc(unitId);
  if ((await unitRef.get()).exists) throw new Error(`Target unit already exists: ${unitId}`);

  const quizIds = book.quizzes.map((_, index) => `${unitId}_q${index + 1}`);
  const existingQuizDocs = await db.getAll(...quizIds.map((quizId) => db.collection('quizzes').doc(quizId)));
  if (existingQuizDocs.some((doc) => doc.exists)) throw new Error(`A target quiz already exists for ${book.title}`);
  plan.push({ book, unitId, quizIds });
}

console.log(JSON.stringify({
  mode: shouldApply ? 'apply' : 'dry-run',
  regionId: REGION_ID,
  newUnits: plan.length,
  newQuizzes: plan.reduce((sum, item) => sum + item.quizIds.length, 0),
  titles: plan.map((item) => item.book.title),
}, null, 2));

if (shouldApply) {
  const batch = db.batch();
  for (const { book, unitId, quizIds } of plan) {
    batch.create(db.collection('units').doc(unitId), {
      id: unitId,
      docId: unitId,
      regionId: REGION_ID,
      chapterId: book.chapterId,
      title: book.title,
      author: book.author,
      order: book.seriesNumber,
      source: { provider: 'aladin', itemId: book.itemId, seriesId: '5823', seriesNumber: book.seriesNumber },
      quizCount: book.quizzes.length,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    });

    for (const [index, quiz] of book.quizzes.entries()) {
      const quizId = quizIds[index];
      batch.create(db.collection('quizzes').doc(quizId), {
        id: quizId,
        docId: quizId,
        unitId,
        question: quiz.question,
        options: quiz.options.map((text) => ({ text, isCorrect: text === quiz.answer })),
        answer: quiz.answer,
        hint: quiz.hint,
        score: 1,
        order: (index + 1) * 10,
        isMedium: quiz.isMedium === true,
        source: { provider: 'aladin', itemId: book.itemId, seriesId: '5823' },
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  }
  await batch.commit();
  console.log(`Created ${plan.length} units and ${plan.reduce((sum, item) => sum + item.quizIds.length, 0)} quizzes.`);
}

await db.terminate();
