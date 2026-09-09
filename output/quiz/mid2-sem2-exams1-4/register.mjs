import admin from 'firebase-admin';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash,randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';

const base=path.dirname(fileURLToPath(import.meta.url));
const round=Number(process.argv[2]);assert([1,2,3,4].includes(round));
const out=path.join(base,'authoring',`round${round}`);
const root=path.resolve(base,'../../..');
const UNIT='reg_1781420075936_chap_1781420235224_unit_'+({1:'1788901151685',2:'1788901191909',3:'1788901201841',4:'1788901261901'}[round]);
const PROJECT='math-sense-1f6a8',BUCKET=PROJECT+'.firebasestorage.app';
const IMPORT=`mid2-sem2-exam${round}-20260909-authorized`;
const mode=process.argv[3]||'inspect';
assert(['inspect','apply','verify'].includes(mode));
const hash=b=>createHash('sha256').update(b).digest('hex');
const save=(name,data)=>fs.writeFileSync(path.join(out,name),JSON.stringify(data,null,2)+'\n');
const bytes=fs.readFileSync(path.join(out,'questions.json'));
const {questions}=JSON.parse(bytes);
const meta=JSON.parse(fs.readFileSync(path.join(out,'manifest.json')));
assert.equal(meta.unitId,UNIT);assert.equal(questions.length,20);
for(const q of questions){assert.equal(q.options.length,5);for(const a of Array.isArray(q.answer)?q.answer:[q.answer])assert(q.options.includes(a));}
const qa=JSON.parse(fs.readFileSync(path.join(base,'acceptance-report.json')));
assert.equal(qa.status,'READY_TO_REGISTER');
assert.equal(qa.rounds.find(r=>r.round===round).sha256,hash(bytes));
const account=JSON.parse(fs.readFileSync(path.join(root,'service-account.json')));
assert.equal(account.project_id,PROJECT);
admin.initializeApp({credential:admin.credential.cert(account),storageBucket:BUCKET});
const db=admin.firestore(),bucket=admin.storage().bucket();
const unitRef=db.collection('units').doc(UNIT);
const query=db.collection('quizzes').where('unitId','==',UNIT);
const ids=questions.map((_,i)=>`${UNIT}_q${String(i+1).padStart(2,'0')}_20260909`);
const [unit,existing]=await Promise.all([unitRef.get(),query.get()]);
assert(unit.exists,'Target unit missing');
assert.equal(unit.data().title.replace(/\s/g,''),`2학년2학기중간${round}회`);
const extras=existing.docs.filter(d=>!ids.includes(d.id));
assert.equal(extras.length,0,'Existing target-unit quizzes require reconciliation; no overwrites allowed');

if(mode==='inspect'){
  const report={project:PROJECT,bucket:BUCKET,unitId:UNIT,title:unit.data().title,
    parentChapterId:unit.data().chapterId,existingQuizCount:existing.size,
    plannedQuizCount:questions.length,plannedImageCount:meta.questions.filter(r=>r.imagePath).length,
    questionsSHA256:hash(bytes),existingQuizIds:existing.docs.map(d=>d.id),writes:0};
  save('registration-preflight.json',report);
  save('registration-before.json',{unit:{id:unit.id,...unit.data()},quizzes:existing.docs.map(d=>({id:d.id,...d.data()}))});
  console.log(JSON.stringify(report));
}else{
  const pre=JSON.parse(fs.readFileSync(path.join(out,'registration-preflight.json')));
  assert.equal(pre.questionsSHA256,hash(bytes),'Approved content changed since preflight');
  let imagePlan;
  const planFile=path.join(out,'registration-images.json');
  if(fs.existsSync(planFile))imagePlan=JSON.parse(fs.readFileSync(planFile));
  else{
    assert.equal(mode,'apply','Image upload plan does not exist');
    imagePlan=meta.questions.filter(r=>r.imagePath).map(r=>{
      const localBytes=fs.readFileSync(path.join(out,r.imagePath));
      const sha=hash(localBytes),token=randomUUID();
      const storagePath=`quiz_images/${UNIT}/${IMPORT}/q${String(r.number).padStart(2,'0')}-${sha.slice(0,16)}.png`;
      return {number:r.number,localPath:r.imagePath,sha256:sha,storagePath,token,
        imageUrl:`https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(storagePath)}?alt=media&token=${token}`};
    });
    save('registration-images.json',imagePlan);
  }
  assert.equal(imagePlan.length,meta.questions.filter(r=>r.imagePath).length);
  for(const r of imagePlan)assert.equal(hash(fs.readFileSync(path.join(out,r.localPath))),r.sha256);
  const payloads=questions.map((q,i)=>{
    const answer=Array.isArray(q.answer)?q.answer:[q.answer];
    const figure=imagePlan.find(r=>r.number===i+1);
    return {id:ids[i],docId:ids[i],unitId:UNIT,question:q.question,
      options:q.options.map(text=>({text,isCorrect:answer.includes(text)})),answer:q.answer,
      hint:q.hint,explanation:q.explanation,imageUrl:figure?.imageUrl||'',score:1,order:(i+1)*10,
      source:{importId:IMPORT,sourceQuestionNumber:i+1,sourceTitle:meta.sourceTitle,
        replacedWithNewQuestion:meta.questions[i].replaced,replacementReason:meta.questions[i].replacementReason,approvedRevision:'2026-09-09',contentSHA256:hash(Buffer.from(JSON.stringify(q)))}};
  });
  save('registration-payload.json',{unitId:UNIT,quizzes:payloads});
  if(mode==='apply'){
    for(const r of imagePlan){
      const file=bucket.file(r.storagePath);
      const [exists]=await file.exists();
      if(!exists)await file.save(fs.readFileSync(path.join(out,r.localPath)),{
        resumable:false,validation:'crc32c',preconditionOpts:{ifGenerationMatch:0},
        metadata:{contentType:'image/png',cacheControl:'public,max-age=31536000,immutable',
          metadata:{firebaseStorageDownloadTokens:r.token,sha256:r.sha256,importId:IMPORT}}});
      const [metadata]=await file.getMetadata();
      assert.equal(metadata.metadata.sha256,r.sha256);
      assert.equal(metadata.metadata.firebaseStorageDownloadTokens,r.token);
      console.log(`Image ${r.number}: uploaded/verified`);
    }
    await db.runTransaction(async tx=>{
      const [freshUnit,freshQuizzes]=await Promise.all([tx.get(unitRef),tx.get(query)]);
      assert(freshUnit.exists);
      assert.equal(freshUnit.data().title.replace(/\s/g,''),`2학년2학기중간${round}회`);
      const present=new Map(freshQuizzes.docs.map(d=>[d.id,d.data()]));
      assert.equal([...present.keys()].filter(id=>!ids.includes(id)).length,0,'New unrelated quizzes appeared');
      for(const p of payloads){
        if(present.has(p.id)){
          const old=present.get(p.id);
          for(const [key,value]of Object.entries(p))assert.deepEqual(old[key],value,`Existing mismatch ${p.id}:${key}`);
        }else tx.create(db.collection('quizzes').doc(p.id),{...p,createdAt:admin.firestore.FieldValue.serverTimestamp(),updatedAt:admin.firestore.FieldValue.serverTimestamp()});
      }
      tx.update(unitRef,{quizCount:20,lastUpdated:admin.firestore.FieldValue.serverTimestamp(),updatedAt:admin.firestore.FieldValue.serverTimestamp()});
    });
    console.log('Committed 20 quiz documents and target unit count/timestamp.');
  }
  const [after,afterUnit]=await Promise.all([query.get(),unitRef.get()]);
  assert.equal(after.size,20);
  assert.equal(afterUnit.data().quizCount,20);
  const docs=new Map(after.docs.map(d=>[d.id,d.data()]));
  for(const p of payloads)for(const [key,value]of Object.entries(p))assert.deepEqual(docs.get(p.id)?.[key],value,`${p.id}:${key}`);
  const checks=await Promise.allSettled(imagePlan.map(async r=>{
    const response=await fetch(r.imageUrl,{signal:AbortSignal.timeout(30000)});
    assert.equal(response.status,200,`Image ${r.number} HTTP error`);
    assert(response.headers.get('content-type')?.startsWith('image/png'));
    assert.equal(hash(Buffer.from(await response.arrayBuffer())),r.sha256,`Image ${r.number} content mismatch`);
    return r.number;
  }));
  for(const result of checks)if(result.status==='rejected')throw result.reason;
  const report={status:'REGISTERED_AND_VERIFIED',project:PROJECT,unitId:UNIT,title:afterUnit.data().title,
    quizCount:after.size,imageCount:checks.length,allFieldsReadBackMatched:true,allImageHTTP200AndSHA256Matched:true,
    orders:payloads.map(p=>p.order),multipleAnswerQuestions:payloads.filter(p=>p.options.filter(o=>o.isCorrect).length>1).map(p=>p.source.sourceQuestionNumber),
    round,quizIds:ids,verifiedAt:new Date().toISOString(),questionsSHA256:hash(bytes)};
  save('registration-result.json',report);
  console.log(JSON.stringify(report));
}
await db.terminate();
await admin.app().delete();
