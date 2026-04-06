import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'math-sense-1f6a8',
  });
}

const db = admin.firestore();

async function listUsers() {
  const userSnap = await db.collection('users').get();
  userSnap.docs.forEach(doc => {
      const data = doc.data();
      if (data.displayName && data.displayName.includes('정시윤')) {
          console.log(`Found: ${doc.id} - ${data.displayName}`);
      }
      if (data.name && data.name.includes('정시윤')) {
          console.log(`Found: ${doc.id} - ${data.name}`);
      }
  });

  console.log("Also listing history docs with that unit...");
  
  const unitSnap2 = await db.collection('units').doc('Reg_1774390167801_Chap_1774390199371_Unit_1774390267517').get();
  if (unitSnap2.exists) {
      console.log('Reg_177439... exists!');
      console.log(unitSnap2.data());
  }

}

listUsers().catch(console.error);

