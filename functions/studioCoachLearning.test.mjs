import test from 'node:test'
import assert from 'node:assert/strict'
import { createLearningService } from './studioCoachLearning.cjs'
import { BASE_CARDS, DIAGNOSTIC_VERSION, ENGINE_VERSION, validateObservation, testCard, selectCard } from './studioCoachLearningPolicy.mjs'
import { createLearningTracker } from '../src/components/PythonGameStudio/coachLearningTracker.mjs'
const student = {auth:{uid:'synthetic-student',token:{firebase:{sign_in_provider:'password'}}}}
const admin = {auth:{uid:'synthetic-admin',token:{firebase:{sign_in_provider:'password'}}}}
class HttpsError extends Error { constructor(code,message){super(message);this.code=code} }
const event = (overrides={}) => ({version:1,eventId:'event-one',ruleId:'constructor-not-called',cardVersion:'builtin-v1',shadowVersion:null,mode:'file',diagnosticVersion:DIAGNOSTIC_VERSION,runtimeVersion:ENGINE_VERSION,intents:['meaning'],aiRequested:false,aiReceived:false,changed:true,outcome:'same-error',elapsed:'under-2m',consent:true,...overrides})
const card = {ruleId:'constructor-not-called',mode:'both',...BASE_CARDS['constructor-not-called']}
function fixture() {
  const docs=new Map([['users/synthetic-student',{clusterAccess:{python:'active'}}],['users/synthetic-admin',{role:'admin'}]])
  let stamp=Date.UTC(2026,8,16),chain=Promise.resolve()
  const copy=v=>v===undefined?undefined:structuredClone(v)
  const snap=path=>({exists:docs.has(path),id:path.split('/').at(-1),ref:ref(path),data:()=>copy(docs.get(path))})
  const ref=path=>({path,get:async()=>snap(path),create:async v=>{assert.ok(!docs.has(path));docs.set(path,copy(v))}})
  const query=(name,filters=[],order=null,limit=Infinity)=>({
    where:(...filter)=>query(name,[...filters,filter],order,limit),orderBy:(...value)=>query(name,filters,value,limit),limit:value=>query(name,filters,order,value),
    get:async()=>{let rows=[...docs].filter(([p])=>p.split('/')[0]===name).filter(([,v])=>filters.every(([k,op,x])=>op==='>='?v[k]>=x:op==='>'?v[k]>x:op==='<='?v[k]<=x:v[k]===x));if(order)rows.sort((a,b)=>(a[1][order[0]]>b[1][order[0]]?1:-1)*(order[1]==='desc'?-1:1));rows=rows.slice(0,limit);return{size:rows.length,docs:rows.map(([p])=>snap(p))}}
  })
  const db={doc:ref,collection:query,batch:()=>{const keys=[];return{delete:r=>keys.push(r.path),commit:async()=>keys.forEach(k=>docs.delete(k))}},runTransaction:work=>{
    const result=chain.then(async()=>{const writes=[];const value=await work({get:async r=>snap(r.path),set:(r,v)=>writes.push([r.path,copy(v)])});writes.forEach(([k,v])=>docs.set(k,v));return value});chain=result.catch(()=>{});return result
  }}
  const service=()=>createLearningService({db,HttpsError,now:()=>stamp})
  const svc=service()
  const enable=()=>svc.adminAction({action:'configure',enabled:true,samplesEnabled:false,policyReviewed:true},admin)
  const create=async()=> (await svc.adminAction({action:'create',card},admin)).version
  const transition=(version,expectedStage,stage,extra={})=>svc.adminAction({action:'transition',version,expectedStage,stage,...extra},admin)
  return {docs,svc,service,enable,create,transition,advance:ms=>stamp+=ms,entries:name=>[...docs].filter(([p])=>p.startsWith(name+'/')).map(([,v])=>v)}
}
test('strict finite events reject raw fields, forged enums and excessive payloads',()=>{
  assert.deepEqual(validateObservation(event()),event())
  for(const bad of [{source:'private'},{path:'private.py'},{studentId:'x'},{intents:['meaning','meaning']},{ruleId:'user text'},{runtimeVersion:'old'},{consent:false},{aiReceived:true},{shadowVersion:'invalid'},{intents:['freeform']}])assert.throws(()=>validateObservation(event(bad)))
  assert.equal(testCard(card).passed,true)
  const candidate={...card,diagnosticVersion:DIAGNOSTIC_VERSION,runtimeVersion:ENGINE_VERSION,version:'a'.repeat(24),stage:'shadow'}
  assert.equal(selectCard(card.ruleId,'file',[candidate],0).version,'builtin-v1')
  assert.equal(selectCard(card.ruleId,'file',[{...candidate,stage:'limited'}],9).version,candidate.version)
  assert.equal(selectCard(card.ruleId,'file',[{...candidate,stage:'limited'}],10).version,'builtin-v1')
})
test('authentication, admin boundaries and default-off collection',async()=>{
  const f=fixture()
  assert.equal((await f.svc.manifest({},student)).collectionEnabled,false)
  assert.equal((await f.svc.observe(event(),student)).recorded,false)
  assert.equal(f.entries('studioCoachLearningStats').length,0)
  for(const ctx of [{}, {auth:{uid:student.auth.uid,token:{firebase:{sign_in_provider:'anonymous'}}}}])await assert.rejects(f.svc.manifest({},ctx),{code:'unauthenticated'})
  await assert.rejects(f.svc.adminAction({action:'report'},student),{code:'permission-denied'})
  f.docs.set('users/synthetic-student',{isGuest:true,role:'admin'})
  await assert.rejects(f.svc.observe(event(),student),{code:'permission-denied'})
  await assert.rejects(f.svc.adminAction({action:'configure',enabled:true,samplesEnabled:true},admin),{code:'invalid-argument'})
})
test('concurrent duplicate receipt across cold instances counts exactly once, then per-rule cap',async()=>{
  const f=fixture();await f.enable()
  const result=await Promise.all([f.svc.observe(event(),student),f.service().observe(event(),student)])
  assert.equal(result.filter(r=>r.recorded).length,1)
  assert.equal(result.filter(r=>r.duplicate).length,1)
  for(let i=1;i<6;i++){const r=await f.svc.observe(event({eventId:'e'+i}),student);assert.equal(r.recorded,i<5)}
  const a=f.entries('studioCoachLearningStats')[0]
  assert.equal(a.counts.exposures,5);assert.equal(a.counts.sameAfterEdit,5)
  assert.ok(!JSON.stringify(f.entries('studioCoachLearningStats')).includes('synthetic-student'))
  await assert.rejects(f.svc.observe(event({source:'private'}),student),{code:'invalid-argument'})
})
test('account/global ceilings and opt-out stop writes',async()=>{
  const f=fixture();await f.enable();await f.svc.observe(event(),student)
  const quota=[...f.docs.keys()].find(p=>p.startsWith('studioCoachLearningQuotas/')&&!p.includes('/global-'))
  f.docs.set(quota,{count:30})
  assert.equal((await f.svc.observe(event({eventId:'other',ruleId:'name-spelling'}),student)).limited,true)
  f.docs.set(quota,{count:0});f.docs.set('studioCoachLearningQuotas/global-2026-09-16',{count:3000})
  assert.equal((await f.svc.observe(event({eventId:'other'}),student)).limited,true)
  await f.svc.adminAction({action:'configure',enabled:false,samplesEnabled:false,policyReviewed:true},admin)
  assert.equal((await f.svc.observe(event({eventId:'off'}),student)).recorded,false)
})
test('immutable card lifecycle, teacher review, shadow measurement, limited delivery and retirement',async()=>{
  const f=fixture();await f.enable();const version=await f.create()
  await assert.rejects(f.transition(version,'draft','active'),{code:'failed-precondition'})
  await f.transition(version,'draft','tested')
  await assert.rejects(f.transition(version,'tested','reviewed'),{code:'invalid-argument'})
  await f.transition(version,'tested','reviewed',{educationalReview:true})
  await f.transition(version,'reviewed','shadow')
  await f.svc.observe(event({shadowVersion:version}),student)
  assert.equal(f.entries('studioCoachLearningStats').find(a=>a.cardVersion===version).counts.shadowMatches,1)
  await assert.rejects(f.svc.observe(event({eventId:'premature',cardVersion:version}),student),{code:'invalid-argument'})
  await f.transition(version,'shadow','limited')
  await f.svc.observe(event({eventId:'limited',cardVersion:version}),student)
  await f.transition(version,'limited','active')
  await f.transition(version,'active','retired')
  assert.deepEqual((await f.svc.manifest({},student)).cards,[])
  assert.equal((await f.svc.observe(event({eventId:'delayed',cardVersion:version}),student)).recorded,true)
  await assert.rejects(f.transition(version,'active','retired'),{code:'failed-precondition'})
  await assert.rejects(f.svc.observe(event({eventId:'forged',cardVersion:'b'.repeat(24)}),student),{code:'invalid-argument'})
  await assert.rejects(f.svc.adminAction({action:'create',card:{...card,example:'https://private.test'}},admin),{code:'invalid-argument'})
})
test('overlapping card versions cannot enter feed together',async()=>{
  const f=fixture();const versions=[await f.create(),await f.create()]
  for(const v of versions){await f.transition(v,'draft','tested');await f.transition(v,'tested','reviewed',{educationalReview:true})}
  await f.transition(versions[0],'reviewed','shadow')
  await assert.rejects(f.transition(versions[1],'reviewed','shadow'),{code:'failed-precondition'})
})
test('old diagnosis/runtime cards cannot be served or promoted after an engine change',async()=>{
  const f=fixture();const version=await f.create(),path=`studioCoachLearningCards/${version}`
  f.docs.set(path,{...f.docs.get(path),diagnosticVersion:'old-diagnosis'})
  await assert.rejects(f.transition(version,'draft','tested'),{code:'failed-precondition'})
  assert.equal(selectCard(card.ruleId,'file',[{...f.docs.get(path),stage:'active'}],0).version,'builtin-v1')
  await f.transition(version,'draft','retired')
})
test('paid-response reuse is opt-in, bounded to 3 slots, actual usage only, expiry is implemented',async()=>{
  const f=fixture();const payload={version:2,finding:'constructor-not-called',mode:'file',errorType:'TypeError',reason:'missing-argument',line:3,start:1,rows:[],name:null}
  const advice={explanation:'합성 설명',hint:'괄호 확인',question:'어디인가요?',check:'다시 실행'}
  const args={payload,advice,usage:{input_tokens:100,output_tokens:50},consent:true,samplesConsent:true}
  await f.svc.recordAdvice(args);assert.equal(f.entries('studioCoachLearningCosts').length,0)
  await f.enable();await f.svc.recordAdvice({...args,consent:false});assert.equal(f.entries('studioCoachLearningCosts').length,0)
  await f.svc.recordAdvice(args);assert.equal(f.entries('studioCoachLearningSamples').length,0)
  await f.svc.adminAction({action:'configure',enabled:true,samplesEnabled:true,policyReviewed:true},admin)
  await f.svc.recordAdvice({...args,samplesConsent:false});assert.equal(f.entries('studioCoachLearningSamples').length,0)
  for(let i=1;i<40;i++)await f.svc.recordAdvice({...args,payload:{...payload,line:i}})
  assert.equal(f.entries('studioCoachLearningSamples').length,3)
  assert.equal(f.entries('studioCoachLearningCosts')[0].requests,41)
  assert.equal(f.entries('studioCoachLearningCosts')[0].inputTokens,4100)
  await f.svc.observe(event(),student)
  const report=await f.svc.adminAction({action:'report'},admin)
  assert.equal(report.groups[0].exposures,1);assert.equal(report.groups[0].sampleWarning,true)
  assert.ok(!JSON.stringify(report).includes('salt'))
  f.advance(15*86400000);await f.svc.cleanup()
  assert.equal(f.entries('studioCoachLearningSamples').length,0);assert.equal(f.entries('studioCoachLearningReceipts').length,0)
  assert.equal(f.entries('studioCoachLearningStats').length,1)
  f.advance(76*86400000);await f.svc.cleanup()
  assert.equal(f.entries('studioCoachLearningStats').length,0);assert.equal(f.entries('studioCoachLearningCosts').length,0)
})
test('tracker keeps code local, separates outcomes, stale run IDs, stop and consent',async()=>{
  const sent=[];let id=0
  const t=createLearningTracker({send:p=>sent.push(p),uuid:()=>`episode-${++id}`})
  const register=key=>t.register({key,scope:'private-project:private.py:file',source:'student_secret = 123',path:'private.py',signature:'TypeError:private',ruleId:card.ruleId,cardVersion:'builtin-v1',mode:'file'})
  register('off');t.abandon();assert.equal(sent.length,0)
  t.configure(true);t.consent(true)
  register('a');t.intent('a','meaning');t.intent('a','meaning');t.ai('a',true)
  t.begin({id:'run1',scope:'private-project:private.py:file',sourceFor:()=> 'student_secret = 456'})
  t.event('stale','EXIT');assert.equal(sent.length,0)
  t.event('run1','ERROR','TypeError:private');t.event('run1','EXIT')
  assert.equal(sent.length,1);assert.equal(sent[0].outcome,'same-error');assert.equal(sent[0].changed,true)
  register('b');t.begin({id:'run2',scope:'private-project:private.py:file',sourceFor:()=> 'student_secret = 123'});t.event('run2','SURFACE');t.event('run2','EXIT')
  assert.equal(sent[1].outcome,'surface-ended')
  register('c');t.begin({id:'run3',scope:'private-project:private.py:file'});t.event('run3','EXIT');assert.equal(sent[2].outcome,'completed')
  register('d');t.abandon();assert.equal(sent[3].outcome,'unknown')
  register('e');t.consent(false);t.abandon();assert.equal(sent.length,4)
  sent.forEach(validateObservation)
  assert.ok(!/student_secret|private|123|456/.test(JSON.stringify(sent)))
})
test('a different cell finishes an unrelated episode as unknown; next failure is not success',()=>{
  const sent=[],t=createLearningTracker({send:p=>sent.push(p),uuid:()=>`id-${sent.length}`})
  t.configure(true);t.consent(true)
  const add=(key,scope)=>t.register({key,scope,source:'x',signature:'NameError:x',ruleId:'generic-NameError',cardVersion:'builtin-v1',mode:'notebook'})
  add('first','cell1');t.begin({id:'run2',scope:'cell2',source:'x'});t.event('run2','EXIT')
  assert.equal(sent[0].outcome,'unknown')
  add('second','cell2');t.begin({id:'run3',scope:'cell2',source:'y'});t.event('run3','ERROR','TypeError:y')
  assert.equal(sent[1].outcome,'different-error');assert.equal(sent[1].changed,true)
})
test('a synchronous observation transport failure cannot stop the runtime',()=>{
  const t=createLearningTracker({send:()=>{throw new Error('offline')},uuid:()=> 'failed-send'})
  t.configure(true);t.consent(true)
  t.register({key:'one',scope:'cell',source:'x',signature:'NameError:x',ruleId:'generic-NameError',cardVersion:'builtin-v1',mode:'notebook'})
  t.begin({id:'run',scope:'cell',source:'y'})
  assert.doesNotThrow(()=>t.event('run','EXIT'))
  assert.doesNotThrow(()=>t.abandon())
})

test('daily cleanup removes expired coach usage even while learning collection is off',async()=>{
  const f=fixture();f.docs.set('studioCoachUsage/expired',{expiresAt:new Date(0)});
  f.docs.set('studioCoachUsage/current',{expiresAt:new Date(Date.UTC(2027,0,1))});
  const result=await f.svc.cleanup();assert.equal(result.deleted,1);
  assert.equal(f.docs.has('studioCoachUsage/expired'),false);assert.equal(f.docs.has('studioCoachUsage/current'),true);
})
