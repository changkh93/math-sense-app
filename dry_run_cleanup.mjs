
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, where, query, deleteDoc, doc, updateDoc, collectionGroup } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAn1TdeM6XArdnf82bOk1BTQMIfkh7kXvQ",
  authDomain: "math-sense-1f6a8.firebaseapp.com",
  projectId: "math-sense-1f6a8",
  storageBucket: "math-sense-1f6a8.firebasestorage.app",
  messagingSenderId: "1075562222654",
  appId: "1:1075562222654:web:b53956e3355764993ced6f",
  measurementId: "G-SGWRBZ7X2E"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const REGION_ID = 'reg_1774390167801';

async function dryRunCleanup() {
  console.log(`[DRY RUN] Starting cleanup for region: ${REGION_ID}`);

  // 1. Find chapters and units in the region
  const chaptersSnap = await getDocs(query(collection(db, 'chapters'), where('regionId', '==', REGION_ID)));
  const chapterIds = chaptersSnap.docs.map(d => d.id);
  console.log(`Found ${chapterIds.length} chapters.`);

  let allUnitIds = [];
  for (const cid of chapterIds) {
    const unitsSnap = await getDocs(query(collection(db, 'units'), where('chapterId', '==', cid)));
    allUnitIds.push(...unitsSnap.docs.map(d => d.id));
  }
  console.log(`Found ${allUnitIds.length} units in those chapters.`);

  // 2. Find history records in the region (Collection Group)
  // Note: This might require an index if not already created, but usually where regionId == '...' on collectionGroup works.
  const historyQuery = query(collectionGroup(db, 'history'), where('regionId', '==', REGION_ID));
  const historySnap = await getDocs(historyQuery);
  console.log(`Found ${historySnap.size} history records in this region.`);

  const affectedUsers = new Set();
  historySnap.docs.forEach(d => {
    // path: users/{userId}/history/{docId}
    const userId = d.ref.parent.parent.id;
    affectedUsers.add(userId);
  });
  console.log(`Total affected users: ${affectedUsers.size}`);

  // 3. Identification for Progress docs
  console.log("Cleanup will involve:");
  console.log(`- Deleting ${historySnap.size} history records.`);
  console.log(`- Deleting matching records in 'learning_progress' for ${allUnitIds.length} units across ${affectedUsers.size} users.`);
  console.log("- Preserving all crystal transactions.");
  console.log("- Recalculating totalQuizzes, totalScore, averageScore for all affected users.");
}

dryRunCleanup().catch(console.error);
