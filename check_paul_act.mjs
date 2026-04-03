import admin from 'firebase-admin';

// Initialize admin app
if (!admin.apps.length) {
  const serviceAccount = await import('./service-account.json', { with: { type: 'json' } });
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount.default),
    databaseURL: "https://math-sense-1f6a8-default-rtdb.firebaseio.com"
  });
}
const db = admin.firestore();

// Firebase Admin already initialized.

async function check() {
  const usersSnap = await db.collection('users').where('email', '==', 'paul@dulcine.net').get();
  if (usersSnap.empty) {
    console.log("Paul not found");
    return;
  }
  const paulId = usersSnap.docs[0].id;
  console.log("Paul ID:", paulId);

  try {
      const activitiesSnap = await db.collection(`users/${paulId}/history`)
        .orderBy('timestamp', 'desc')
        .limit(40)
        .get();
      console.log(`Found ${activitiesSnap.size} LP entries`);
      activitiesSnap.forEach(doc => {
        const data = doc.data();
        console.log(doc.id, "=> data:", JSON.stringify(data));
      });
  } catch(e) {
      console.log("Query failed:", e.stack);
  }
}

check();
