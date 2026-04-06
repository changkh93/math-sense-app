import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'math-sense-1f6a8',
  });
}

const db = admin.firestore();

async function checkStudentData() {
  console.log('--- Searching for 정시윤 ---');
  const userSnap = await db.collection('users')
    .where('displayName', '==', '정시윤')
    .get();

  if (userSnap.empty) {
    console.log('No user found');
    return;
  }

  const userDoc = userSnap.docs[0];
  const userId = userDoc.id;
  console.log(`Found user: ${userId}`);

  console.log('\n--- fetch learning progress ---');
  const lpSnap = await db.collection('users').doc(userId).collection('learning_progress').get();
  lpSnap.docs.forEach(doc => {
    const data = doc.data();
    if (doc.id.includes('1774390167801')) {
      console.log(`\nDoc ID: ${doc.id}`);
      console.log(JSON.stringify(data, null, 2));
    }
  });
  
  console.log('\n--- fetch units ---');
  const unitSnap = await db.collection('units').doc('Reg_1774390167801_Chap_1774390199371_Unit_1774390267517').get();
  if (unitSnap.exists) {
    console.log('Unit Data:');
    console.log(JSON.stringify(unitSnap.data(), null, 2));
  } else {
    console.log('Unit not found exactly. Try lowercase:');
    const unitSnap2 = await db.collection('units').doc('reg_1774390167801_chap_1774390199371_unit_1774390267517').get();
    if (unitSnap2.exists) {
      console.log('Found with lowercase ID:');
      console.log(JSON.stringify(unitSnap2.data(), null, 2));
    } else {
        console.log('Unit not found');
    }
  }

}

checkStudentData().catch(console.error);
