import admin from 'firebase-admin';

if (!admin.apps.length) {
  const serviceAccount = await import('./service-account.json', { with: { type: 'json' } });
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount.default),
    databaseURL: "https://math-sense-1f6a8-default-rtdb.firebaseio.com"
  });
}
const db = admin.firestore();

async function find() {
  const usersRef = db.collection('users');
  const snapshot = await usersRef.where('role', '==', 'student').get();
  
  for (const doc of snapshot.docs) {
     const lpSnap = await doc.ref.collection('activityLogs').orderBy('timestamp', 'desc').limit(20).get();
     for (const act of lpSnap.docs) {
        if (JSON.stringify(act.data()).includes('unit_py_adv_1') || JSON.stringify(act.data()).includes('csv')) {
           console.log("Found in user:", doc.id, doc.data().displayName);
           return;
        }
     }
  }
  console.log("Done");
}

find();
