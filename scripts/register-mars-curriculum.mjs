import fs from 'node:fs/promises'
import { createHash } from 'node:crypto'
import admin from 'firebase-admin'
const root = new URL('../',import.meta.url)
const content = new URL('content/mars-expedition/',root)
const regionId='reg_python_game_project'
const chapters=[['chap_gameproj_mars_foundations_v1','화성 탐사대 I · 고급 Pygame 기초',10],['chap_gameproj_mars_base_v1','화성 탐사대 II · 기지 구축',11],['chap_gameproj_mars_robots_v1','화성 탐사대 III · 로봇 교전',12],['chap_gameproj_mars_signals_v1','화성 탐사대 IV · 신호 복구',13]]
const marker='mars-expedition-curriculum-v1'
const manifest=JSON.parse(await fs.readFile(new URL('manifest.json',content),'utf8'))
const bank=JSON.parse(await fs.readFile(new URL('assessments.json',content),'utf8'))
const documents=[]
const push=(collection,id,data)=>documents.push({path:`${collection}/${id}`,data:{...data,id,docId:id,managedBy:marker}})
for (const [i,[id,title,section]] of chapters.entries()) push('chapters',id,{regionId,title,order:5+i,description:`Udemy Section ${section} 제작 순서로 배우는 화성 탐사 게임 · 영상 없이 코드 스튜디오에서 실습`})
for(let i=0;i<31;i++){
 const chapterId=chapters.find(c=>c[2]===manifest.units[i].section)[0]
 const n=String(i+1).padStart(2,'0'),unitId=`unit_mars_expedition_${n}`
 const text=await fs.readFile(new URL(`data-log/${n}.md`,content),'utf8')
 const u=bank.units[i]
 if(u.unitKey!==`mars${n}`||u.quizzes.length!==10)throw new Error('Unit bank mismatch')
 push('units',unitId,{chapterId,regionId,title:manifest.units[i].title,order:i+1,
  learningContents:{text,pdfUrl:''},contentFlags:{hasDataLog:true,hasCodeTrace:true,hasQuiz:true,hasTransmission:false,hasWorkbook:false},
  transmissions:[],videoConfig:{videoId:'',start:0,end:0},workbookPages:[],
  curriculumSource:{lectureId:manifest.units[i].lectureId,steps:manifest.units[i].steps},
 })
 for(let j=0;j<u.quizzes.length;j++){
  const q=u.quizzes[j]
  if(q.options.length!==4||q.options.filter(o=>o.isCorrect).length!==1)throw new Error('Invalid question')
  push('quizzes',`q_mars_expedition_${n}_${String(j+1).padStart(2,'0')}`,{unitId,order:j,...q})
 }
 for(let j=0;j<u.exercises.length;j++){
  const e=u.exercises[j];const {answerLines,...rest}=e
  push('codeExercises',`code_mars_expedition_${n}_${j+1}`,{...rest,unitId,order:j,answerCode:answerLines.join('\n'),passingAccuracy:95})
 }
}
const hash=createHash('sha256').update(JSON.stringify(documents)).digest('hex')
const plan={regionId,chapterIds:chapters.map(c=>c[0]),marker,hash,counts:{chapters:4,units:31,quizzes:310,codeExercises:62},documents}
await fs.writeFile(new URL('registration-plan.json',content),JSON.stringify(plan,null,2)+'\n')
console.log(JSON.stringify({hash,counts:plan.counts,mode:process.argv.includes('--apply')?'apply':process.argv.includes('--verify')?'verify':'local-plan'}))
if(!process.argv.includes('--apply')&&!process.argv.includes('--verify'))process.exit(0)
admin.initializeApp({credential:admin.credential.cert(JSON.parse(await fs.readFile(new URL('service-account.json',root),'utf8')))})
const db=admin.firestore()
if(!(await db.doc(`regions/${regionId}`).get()).exists)throw new Error('Target game region missing')
const existing=await db.getAll(...documents.map(d=>db.doc(d.path)))
for(let i=0;i<existing.length;i++)if(existing[i].exists&&existing[i].data().managedBy!==marker)throw new Error(`Refusing unrelated document: ${documents[i].path}`)
if(process.argv.includes('--apply')){
 const batch=db.batch()
 for(let i=0;i<documents.length;i++){
  const {path,data}=documents[i]
  const next={...data,curriculumHash:hash,lastUpdated:admin.firestore.FieldValue.serverTimestamp()}
  if(existing[i].exists)batch.set(db.doc(path),next)
  else batch.create(db.doc(path),next)
 }
 await batch.commit()
 console.log('Registered 407 scoped curriculum documents; no student records modified.')
}
const actual=await db.getAll(...documents.map(d=>db.doc(d.path)))
for(let i=0;i<actual.length;i++){
 const got=actual[i].data();if(!got)throw new Error(`Missing ${documents[i].path}`)
 for(const [key,value] of Object.entries(documents[i].data)){
  const stable=v=>JSON.stringify(v,(_,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.entries(x).sort(([a],[b])=>a.localeCompare(b))):x)
  if(stable(got[key])!==stable(value))throw new Error(`Readback mismatch ${documents[i].path} ${key}`)
 }
 if(got.curriculumHash!==hash)throw new Error('Hash mismatch')
}
await fs.writeFile(new URL('registration-result.json',content),JSON.stringify({verifiedAt:new Date().toISOString(),regionId,chapterIds:plan.chapterIds,hash,counts:plan.counts,documentsVerified:actual.length},null,2)+'\n')
console.log('Readback verified every content field across all 407 documents.')
