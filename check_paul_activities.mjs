import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "math-sense-1f6a8",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  // paul@dulcine.net might be "JcTxyPq7cOhWeX1wStTj95a2lZ13" or similar.
  // We need to fetch his uid first.
  const usersSnap = await getDocs(query(collection(db, 'users'), where('email', '==', 'paul@dulcine.net')));
  if (usersSnap.empty) {
    console.log("Paul not found");
    return;
  }
  const paulId = usersSnap.docs[0].id;
  console.log("Paul ID:", paulId);

  // Get his activities
  const q = query(
    collection(db, `users/${paulId}/activities`),
    orderBy('timestamp', 'desc'),
    limit(20)
  );
  const activitiesSnap = await getDocs(q);
  console.log(`Found ${activitiesSnap.size} activities`);
  activitiesSnap.forEach(doc => {
    const data = doc.data();
    if(data.type === 'video') {
       console.log(doc.id, "=>", JSON.stringify(data, null, 2));
    }
  });
}

check();
