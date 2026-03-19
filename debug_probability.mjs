import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'math-sense-1f6a8',
  });
}

const db = admin.firestore();

async function debugProbability() {
  const chapterId = 'reg_1773407437227_chap_1773839509261';
  
  console.log('--- Chapter Info ---');
  const chapterDoc = await db.collection('chapters').doc(chapterId).get();
  if (!chapterDoc.exists) {
    console.log(`Chapter ${chapterId} does NOT exist!`);
  } else {
    console.log('Chapter Data:', JSON.stringify(chapterDoc.data(), null, 2));
  }

  console.log('\n--- Units for this Chapter ---');
  const unitsSnapshot = await db.collection('units').where('chapterId', '==', chapterId).get();
  if (unitsSnapshot.empty) {
    console.log('No units found for this chapter.');
  } else {
    console.log(`Found ${unitsSnapshot.size} units.`);
    console.log('Sample Unit Data:', JSON.stringify(unitsSnapshot.docs[0].data(), null, 2));
  }
}

debugProbability().catch(console.error);
