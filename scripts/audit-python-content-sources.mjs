import fs from 'node:fs/promises';
import admin from 'firebase-admin';
admin.initializeApp({credential:admin.credential.cert(JSON.parse(await fs.readFile('service-account.json','utf8')))});
const db=admin.firestore();
const ids=['reg_python_course','reg_python_game_project','reg_python_advanced','reg_python_math'];
const result=[];
for(const regionId of ids){
 const chapters=await db.collection('chapters').where('regionId','==',regionId).get();
 const course={regionId,chapters:[]};
 for(const c of chapters.docs){
  const cd=c.data(),units=await db.collection('units').where('chapterId','==',c.id).get();
  const chapter={id:c.id,title:cd.title,order:cd.order,units:[]};
  for(const u of units.docs){
   const d=u.data();
   const exercises=await db.collection('codeExercises').where('unitId','==',u.id).get();
   chapter.units.push({id:u.id,title:d.title,order:d.order,learningContents:d.learningContents,exercises:exercises.docs.map(e=>{const x=e.data();return {id:e.id,title:x.title,description:x.description,answerCode:x.answerCode,code:x.code,instructions:x.instructions};})});
  }
  chapter.units.sort((a,b)=>(a.order??0)-(b.order??0));course.chapters.push(chapter);
 }
 course.chapters.sort((a,b)=>(a.order??0)-(b.order??0)); result.push(course);
}
await fs.writeFile('/tmp/metasense-python-course-sources.json',JSON.stringify(result,null,2));
console.log(JSON.stringify(result.map(c=>({region:c.regionId,chapters:c.chapters.map(ch=>({title:ch.title,units:ch.units.length,exercises:ch.units.reduce((s,u)=>s+u.exercises.length,0)}))})),null,2));
await admin.app().delete();
