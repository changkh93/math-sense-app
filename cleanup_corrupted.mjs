import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFile } from 'fs/promises';

async function run() {
  const serviceAccount = JSON.parse(await readFile('./service-account.json', 'utf8'));
  initializeApp({ credential: cert(serviceAccount) });
  const db = getFirestore();
  const uid = 'uKtiwPz4XTgtE9NQKKMeQxVVnHD2';
  
  const historyRef = db.collection('users').doc(uid).collection('history');
  const snap = await historyRef.where('unitTitle', '==', '3월 평가').get();
  
  const batch = db.batch();
  let count = 0;
  snap.forEach(doc => {
    console.log('Deleting corrupted history:', doc.id);
    batch.delete(doc.ref);
    count++;
  });
  
  if (!snap.empty) {
    const unitId = snap.docs[0].data().unitId;
    const progRef = db.collection('users').doc(uid).collection('learning_progress').doc(unitId);
    console.log('Deleting corrupted learning_progress for:', unitId);
    batch.delete(progRef);
    count++;
  }
  
  if (count > 0) {
    await batch.commit();
    console.log('Successfully cleaned up records.');
  } else {
    console.log('No records found to clean up.');
  }
}
run();
