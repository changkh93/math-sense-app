import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'math-sense-1f6a8',
  });
}

const db = admin.firestore();

async function compareChapters() {
  const probChapterId = 'reg_1773407437227_chap_1773839509261';
  const funcChapterId = 'reg_1773407437227_chap_1773823180266';

  console.log('--- Probability Unit ---');
  const probSnap = await db.collection('units').where('chapterId', '==', probChapterId).limit(1).get();
  if (!probSnap.empty) {
    console.log(JSON.stringify(probSnap.docs[0].data(), null, 2));
  } else {
    console.log('No prob units found.');
  }

  console.log('\n--- Functions I Unit ---');
  const funcSnap = await db.collection('units').where('chapterId', '==', funcChapterId).limit(1).get();
  if (!funcSnap.empty) {
    console.log(JSON.stringify(funcSnap.docs[0].data(), null, 2));
  } else {
    console.log('No func units found.');
  }
}

compareChapters().catch(console.error);
