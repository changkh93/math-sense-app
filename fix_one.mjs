import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'math-sense-1f6a8',
  });
}

const db = admin.firestore();

async function fixOne() {
  const userId = 'nspjzUAjefSoDeaN1TuaNywSFyS2';
  const unitId = 'reg_1774390167801_chap_1774390199371_unit_1774390267517';
  // Also try lowercase?
  const lpSnap = await db.collection('users').doc(userId).collection('learning_progress').get();
  lpSnap.docs.forEach(doc => {
      if (doc.id.toLowerCase() === unitId.toLowerCase()) {
         console.log('Found doc! ID:', doc.id);
         console.log('Has quizSession:', !!doc.data().quizSession);
         console.log('Has unitTitle:', doc.data().unitTitle);
         console.log('Raw data keys:', Object.keys(doc.data()));
         
         db.collection('users').doc(userId).collection('learning_progress').doc(doc.id).update({
             unitTitle: '3월 평가',
             unitId: unitId
         }).then(() => console.log('Fixed!'));
      }
  });
}
fixOne().catch(console.error);
