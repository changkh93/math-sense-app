import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'math-sense-1f6a8',
  });
}

const db = admin.firestore();

async function listChapters() {
  const regionId = 'reg_1776154036888';
  const chaptersRef = db.collection('regions').doc(regionId).collection('chapters');
  const snapshot = await chaptersRef.get();
  
  console.log(`Chapters in region ${regionId}:`);
  snapshot.forEach((doc) => {
    const data = doc.data();
    console.log(`ID: ${doc.id}, Title: ${data.title}`);
  });
}

listChapters().catch(console.error);
