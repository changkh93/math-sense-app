// Explicit production release checks. Synthetic account only; credentials stay in memory.
import {createRequire} from 'node:module'
import {randomBytes} from 'node:crypto'
import {writeFile} from 'node:fs/promises'
import {makeCoachPayload,parseError} from '../functions/studioErrorCoachPolicy.mjs'
const mode=process.argv[2]
if(!['--activate','--verify','--schedule-check'].includes(mode))throw new Error('Use --activate, --verify or --schedule-check explicitly')
const project='math-sense-1f6a8', region='asia-northeast3'
const req=createRequire(import.meta.url), cli=createRequire('/Users/selah/.npm-global/lib/node_modules/firebase-tools/package.json')
const logger=cli('./lib/logger.js').logger;logger.silent=true;logger.clear()
const ca=cli('./lib/auth.js'),account=ca.getGlobalDefaultAccount()
await cli('./lib/requireAuth.js').requireAuth({project,nonInteractive:true,user:account?.user,tokens:account?.tokens})
const token=async()=>ca.getAccessToken(account.tokens.refresh_token,cli('./lib/api.js').getScopes())
const admin=req('firebase-admin')
admin.initializeApp({projectId:project,credential:{getAccessToken:async()=>{const t=await token();return{access_token:t.access_token,expires_in:t.expires_in||3600}}}})
// Use the already-authorized CLI OAuth session directly; no service-account file.
const field=v=>v instanceof Date?{timestampValue:v.toISOString()}:typeof v==='boolean'?{booleanValue:v}:typeof v==='number'?{integerValue:String(v)}:typeof v==='string'?{stringValue:v}:{mapValue:{fields:Object.fromEntries(Object.entries(v).map(([k,x])=>[k,field(x)]))}}
const value=v=>'booleanValue'in v?v.booleanValue:'integerValue'in v?Number(v.integerValue):'timestampValue'in v?new Date(v.timestampValue):'stringValue'in v?v.stringValue:Object.fromEntries(Object.entries(v.mapValue?.fields||{}).map(([k,x])=>[k,value(x)]))
const document=async(path,method='GET',data,query='')=>{
 const t=await token(),res=await fetch(`https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/${path}${query}`,{method,headers:{Authorization:`Bearer ${t.access_token}`,'Content-Type':'application/json'},...(data?{body:JSON.stringify({fields:Object.fromEntries(Object.entries(data).map(([k,v])=>[k,field(v)]))})}:{})})
 if(method==='GET'&&res.status===404)return{exists:false,data:()=>undefined}
 if(!res.ok){const error=new Error('firestore-operation');error.code=`firestore-${res.status}`;throw error}
 const body=method==='DELETE'?{}:await res.json();return{exists:true,data:()=>Object.fromEntries(Object.entries(body.fields||{}).map(([k,v])=>[k,value(v)]))}
}
const db={doc:path=>({get:()=>document(path),delete:()=>document(path,'DELETE'),create:data=>document(path,'PATCH',data,'?currentDocument.exists=false'),set:(data,opts)=>document(path,'PATCH',data,opts?.merge?'?'+Object.keys(data).map(k=>'updateMask.fieldPaths='+encodeURIComponent(k)).join('&'):''),update:data=>document(path,'PATCH',data,'?'+Object.keys(data).map(k=>'updateMask.fieldPaths='+encodeURIComponent(k)).join('&')+'&currentDocument.exists=true')})}
const evidence={at:new Date().toISOString(),mode,syntheticOnly:true,checks:[]}
const check=(name,ok)=>{evidence.checks.push({name,passed:!!ok});if(!ok)throw new Error(name)}
let uid, phase='config'
try{
 if(mode==='--activate'){
  await db.doc('studioCoachControl/config').set({enabled:true,structureDataReady:true,projectId:'proj_S7uL2bHA4redF0r90zUcfxRe',childDataReady:false,perUserDay:10,perDay:300,perMonth:3000,updatedAt:new Date()},{merge:true})
  await db.doc('studioCoachLearningControl/config').set({enabled:false,samplesEnabled:false},{merge:true})
  const config=(await db.doc('studioCoachControl/config').get()).data()
  check('structural AI enabled; ZDR readiness remains false',config.enabled===true&&config.structureDataReady===true&&config.childDataReady===false)
 }else if(mode==='--schedule-check'){
  phase='scheduler-metadata'
  const fc=cli('./lib/functionsConfig.js'),config=await fc.getFirebaseConfig({project})
  const location=fc.getAppEngineLocation(config)
  const result=await cli('./lib/gcp/cloudscheduler.js').getJob(`projects/${project}/locations/${location}/jobs/firebase-schedule-studioCoachLearningCleanup-${region}`)
  evidence.scheduler={state:result.body.state,schedule:result.body.schedule,location}
  check('daily cleanup schedule enabled',result.status===200&&result.body.state==='ENABLED'&&result.body.schedule==='every 24 hours')
  evidence.manualCleanupExecuted=false
 }else{
  const base=`https://${region}-${project}.cloudfunctions.net/`
  const call=async(name,data,idToken)=>{const res=await fetch(base+name,{method:'POST',headers:{'Content-Type':'application/json',...(idToken?{Authorization:`Bearer ${idToken}`}:{})},body:JSON.stringify({data}),signal:AbortSignal.timeout(60000)});return{status:res.status,body:await res.json()}}
  phase='anonymous-boundary'
  check('unauthenticated denied',(await call('studioErrorCoach',{})).body.error?.status==='UNAUTHENTICATED')
  phase='synthetic-account'
  uid='coach-release-'+randomBytes(8).toString('hex')
  const email=uid+'@example.invalid',password=randomBytes(24).toString('base64url')
  await admin.auth().createUser({uid,email,password})
  await db.doc(`users/${uid}`).create({role:'student',clusterAccess:{python:'active'},isGuest:false,syntheticReleaseCheck:true})
  const login=await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyAn1TdeM6XArdnf82bOk1BTQMIfkh7kXvQ',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password,returnSecureToken:true})})
  const {idToken}=await login.json();check('synthetic student signed in',!!idToken)
  phase='student-boundaries'
  const manifest=await call('studioCoachLearningManifest',{},idToken)
  check('optional collection stays off',manifest.body.result?.collectionEnabled===false&&manifest.body.result?.samplesEnabled===false)
  check('student cannot access admin report',(await call('studioCoachLearningAdmin',{action:'report'},idToken)).body.error?.status==='PERMISSION_DENIED')
  check('legacy raw code rejected',(await call('studioErrorCoach',{version:1,snippet:'synthetic only'},idToken)).body.error?.status==='INVALID_ARGUMENT')
  phase='real-luna-response'
  const payload=makeCoachPayload('from ColabTurtlePlus.Turtle import *\nt = Turtle\nt.forward(100)',parseError('  File "/tmp/studio/main.py", line 3\nTypeError: Turtle.forward() missing 1 required positional argument: \'distance\''))
  const result=await call('studioErrorCoach',payload,idToken)
  evidence.responseStatus=result.status
  evidence.errorStatus=result.body.error?.status
  check('deployed Luna returned four-field advice',result.body.result?.model==='gpt-5.6-luna'&&['explanation','hint','question','check'].every(k=>typeof result.body.result?.advice?.[k]==='string'))
  evidence.syntheticAdvice=result.body.result.advice
  const repeated=await call('studioErrorCoach',payload,idToken)
  check('duplicate does not charge again',repeated.body.result?.cached===true||repeated.body.error?.status==='ALREADY_EXISTS')
  phase='admin-report'
  await db.doc(`users/${uid}`).update({role:'admin'})
  const report=await call('studioCoachLearningAdmin',{action:'report'},idToken)
  check('authorized admin report responds',report.status===200&&!report.body.error)
 }
 evidence.passed=true
}catch(error){evidence.passed=false;evidence.stoppedAt=phase;evidence.failureCode=typeof error.code==='string'?error.code:undefined;process.exitCode=1}
finally{
 if(uid){await db.doc(`users/${uid}`).delete();await admin.auth().deleteUser(uid);evidence.syntheticAccountDeleted=true}
 await admin.app().delete()
 await writeFile(`docs/collaboration/tasks/20260916-coach-production-release/${mode.slice(2)}.json`,JSON.stringify(evidence,null,2))
 console.log(JSON.stringify(evidence,null,2))
}
