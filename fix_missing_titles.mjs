import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'math-sense-1f6a8',
  });
}

const db = admin.firestore();

async function fixTitles() {
  console.log('Fetching all units to build a map...');
  const unitsSnap = await db.collection('units').get();
  const unitMap = new Map();
  unitsSnap.docs.forEach(doc => {
    unitMap.set(doc.id, doc.data().title);
  });

  console.log(`Loaded ${unitMap.size} units.`);
  
  console.log('Scanning learning_progress...');
  const lpSnap = await db.collectionGroup('learning_progress').get();
  let fixCount = 0;
  
  const batch = db.batch();

  for (const doc of lpSnap.docs) {
    const data = doc.data();
    const docId = doc.id; // docId is the unitId

    // Only fix if unitTitle is missing but quizSession exists
    if (!data.unitTitle && data.quizSession) {
      // Find title from unitMap
      let title = unitMap.get(docId) || unitMap.get(docId.toLowerCase());
      
      // If still no title and has chapterId, fallback to formatting
      if (!title) {
         title = docId
           .split('_')
           .map(word => word.charAt(0).toUpperCase() + word.slice(1))
           .join(' ');
      }

      console.log(`Fixing User: ${doc.ref.parent.parent.id} | Unit: ${docId} | Assumed Title: ${title}`);
      
      batch.update(doc.ref, {
         unitTitle: title,
         unitId: docId
      });
      fixCount++;
    }
  }

  if (fixCount > 0) {
     console.log(`Committing ${fixCount} fixes...`);
     await batch.commit();
     console.log('Done.');
  } else {
     console.log('No missing titles found.');
  }
}

fixTitles().catch(console.error);
