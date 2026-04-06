import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'math-sense-1f6a8',
  });
}

const db = admin.firestore();

async function search() {
  const targetId = 'reg_1774390167801_chap_1774390199371_unit_1774390267517';
  console.log('Searching for Unit:', targetId);
  
  const unitDoc = await db.collection('units').doc(targetId).get();
  if (unitDoc.exists) {
      console.log('Unit Document:', JSON.stringify(unitDoc.data(), null, 2));
  } else {
      console.log('Unit document does NOT exist in "units" collection.');
  }

  console.log('\nSearching across all learning_progress...');
  const lpQ = await db.collectionGroup('learning_progress').get();
  lpQ.docs.forEach(doc => {
      if (doc.id.toLowerCase() === targetId.toLowerCase()) {
          console.log(`Found in tracking for User: ${doc.ref.parent.parent.id}`);
          console.log(JSON.stringify(doc.data(), null, 2));
      }
  });

  console.log('\nSearching across all history...');
  const hQ = await db.collectionGroup('history').where('unitId', '==', targetId).get();
  hQ.docs.forEach(doc => {
      console.log(`History Doc: ${doc.ref.path}`);
      console.log(JSON.stringify(doc.data(), null, 2));
  });
}

search().catch(console.error);
