import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'math-sense-1f6a8',
  });
}

const db = admin.firestore();

async function fix() {
  console.log("Starting script...");
  const unitsSnap = await db.collection('units').get();
  const unitMap = new Map();
  unitsSnap.docs.forEach(doc => {
      unitMap.set(doc.id.toLowerCase(), doc.data().title);
  });
  console.log("Loaded units: " + unitMap.size);

  const q = await db.collectionGroup('learning_progress').get();
  console.log("Fetched learning_progress. Doc count: " + q.docs.length);
  let fixes = 0;
  let missing = 0;
  for (const doc of q.docs) {
      const data = doc.data();
      if (!data.unitTitle) {
          missing++;
          const t = unitMap.get(doc.id.toLowerCase());
          if (t) {
              await doc.ref.update({ unitTitle: t });
              fixes++;
          }
      }
  }
  console.log("Total missing unitTitle: " + missing);
  console.log("Total fixes applied: " + fixes);
  
}
fix().then(() => console.log('Done')).catch(console.error);
