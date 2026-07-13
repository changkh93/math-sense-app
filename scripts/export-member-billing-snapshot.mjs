import admin from 'firebase-admin';
import { readFileSync, writeFileSync } from 'node:fs';

const serviceAccount = JSON.parse(readFileSync(new URL('../service-account.json', import.meta.url), 'utf8'));
if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();
const [usersSnap, parentsSnap, enrollmentsSnap, billingSnap] = await Promise.all([
  db.collection('users').get(),
  db.collection('parents').get(),
  db.collection('studentEnrollments').get(),
  db.collection('familyBillingAccounts').get(),
]);

const users = usersSnap.docs.map((doc) => {
  const value = doc.data() || {};
  return {
    uid: doc.id,
    studentName: value.studentName || '',
    name: value.name || '',
    displayName: value.displayName || '',
    publicDisplayName: value.publicDisplayName || '',
    loginId: value.loginId || '',
    email: value.email || '',
    role: value.role || '',
    parentUid: value.parentUid || '',
    isDeleted: value.isDeleted === true || value.accountStatus === 'deleted',
  };
});

const parents = parentsSnap.docs.map((doc) => {
  const value = doc.data() || {};
  return {
    uid: doc.id,
    name: value.name || '',
    phone: value.phone || '',
    email: value.email || '',
    childrenUids: Array.isArray(value.childrenUids) ? value.childrenUids : [],
    isDeleted: value.isDeleted === true,
  };
});

const enrollments = Object.fromEntries(enrollmentsSnap.docs.map((doc) => [doc.id, doc.data()]));
const billing = Object.fromEntries(billingSnap.docs.map((doc) => [doc.id, doc.data()]));
const outputPath = '/private/tmp/metasense_member_billing_snapshot.json';
writeFileSync(outputPath, JSON.stringify({ users, parents, enrollments, billing }, null, 2));
console.log(JSON.stringify({ outputPath, users: users.length, parents: parents.length, enrollments: enrollmentsSnap.size, billingAccounts: billingSnap.size }));
await db.terminate();
