import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'math-sense-1f6a8',
  });
}

const db = admin.firestore();

async function run() {
  const snap = await db.collection('codeExercises').get();
  console.log('Total codeExercises docs:', snap.size);

  const matched = [];

  for (const doc of snap.docs) {
    const data = doc.data();
    const str = JSON.stringify(data);
    if (str.includes('BACKBROUND_COLOR') || str.includes('1단계: 창 만들고 배경색 설정하기') || (data.unitId && data.unitId.includes('1773298629411'))) {
      matched.push({ id: doc.id, data });
    }
  }

  console.log(`Found ${matched.length} codeExercises with BACKBROUND_COLOR or matching unit:`);
  for (const item of matched) {
    console.log(`----------------------------------------`);
    console.log(`ID: ${item.id}`);
    console.log(`unitId: ${item.data.unitId}`);
    console.log(`title: ${item.data.title}`);
    console.log(`answerCode:\n${item.data.answerCode}`);
  }
}

run().catch(console.error);
