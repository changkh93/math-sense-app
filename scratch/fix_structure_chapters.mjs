import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./service-account.json', 'utf8'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();
const regionId = 'reg_1776154036888';

const chapters = [
  { id: 'chap_magic_fantasy', title: '마법과 환상의 세계', order: 1 },
  { id: 'chap_adventure_wild', title: '용기와 도전의 모험', order: 2 },
  { id: 'chap_nature_animals', title: '자연과 동물의 친구들', order: 3 },
  { id: 'chap_heart_growth', title: '마음이 자라는 이야기', order: 4 },
  { id: 'chap_wisdom_mystery', title: '지혜와 추리의 탐색', order: 5 },
  { id: 'chap_society_history', title: '함께 사는 세상 이야기', order: 6 },
];

async function fixStructure() {
  console.log('--- Fixing Firestore Structure ---');

  // 1. Move Chapters to Top-Level
  for (const chap of chapters) {
    const chapData = {
      id: chap.id,
      title: chap.title,
      order: chap.order,
      regionId: regionId, // Critical for UI visibility
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // Top-level collection
    await db.collection('chapters').doc(chap.id).set(chapData, { merge: true });
    console.log(`Chapter moved to top-level: ${chap.title} (${chap.id})`);
  }

  // 2. Clean up old subcollections (optional but recommended)
  // We'll leave them for now to avoid accidental data loss during the move, 
  // but we must ensure the top-level ones are the ones we update.

  console.log('--- Structure Fix Complete ---');
}

fixStructure().catch(console.error);
