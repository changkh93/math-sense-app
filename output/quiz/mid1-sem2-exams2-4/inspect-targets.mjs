import admin from 'firebase-admin';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const project='math-sense-1f6a8';
const account=JSON.parse(fs.readFileSync('service-account.json'));
assert.equal(account.project_id,project);
admin.initializeApp({credential:admin.credential.cert(account)});
const db=admin.firestore();
const suffixes=['1788876955807','1788876965426','1788876975928'];
const rows=await Promise.all(suffixes.map(async(s,i)=>{
 const id='reg_1781420075936_chap_1781420191007_unit_'+s;
 const [unit,quizzes]=await Promise.all([db.collection('units').doc(id).get(),db.collection('quizzes').where('unitId','==',id).get()]);
 assert(unit.exists);assert.equal(unit.data().title.replace(/\s/g,''),`1학년2학기중간${i+2}회`);
 return {round:i+2,unitId:id,title:unit.data().title,existingQuizCount:quizzes.size,existingIds:quizzes.docs.map(d=>d.id)};
}));
fs.writeFileSync('output/quiz/mid1-sem2-exams2-4/target-preflight.json',JSON.stringify({project,rows,writes:0},null,2)+'\n');
console.log(JSON.stringify({project,rows,writes:0}));
await db.terminate();await admin.app().delete();
