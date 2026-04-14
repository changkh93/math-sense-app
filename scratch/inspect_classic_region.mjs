import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'math-sense-1f6a8',
  });
}

const db = admin.firestore();

async function inspectRegion() {
  const regionId = 'reg_1776154036888';
  const doc = await db.collection('regions').doc(regionId).get();
  console.log('Region Data:', doc.data());
}

inspectRegion().catch(console.error);
