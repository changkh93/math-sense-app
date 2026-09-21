const crypto = require('node:crypto');
const POLICY = import('./studioCoachLearningPolicy.mjs');
const DAY = 86400000;
function createLearningService({ db, HttpsError, now = Date.now }) {
  const fail = (code, text) => { throw new HttpsError(code, text); };
  async function identity(context, adminOnly = false) {
    if (!context.auth?.uid || context.auth.token?.firebase?.sign_in_provider === 'anonymous') fail('unauthenticated', '로그인이 필요합니다.');
    const u = (await db.doc(`users/${context.auth.uid}`).get()).data() || {};
    if (u.isGuest || (adminOnly ? u.role !== 'admin' : !(u.role === 'admin' || ['python','파이썬'].some(k => u.clusterAccess?.[k] === 'active')))) fail('permission-denied', '이용 권한을 확인해 주세요.');
    return context.auth.uid;
  }
  const config = async () => (await db.doc('studioCoachLearningControl/config').get()).data() || {};
  const digest = (salt, v) => crypto.createHmac('sha256', salt).update(v).digest('hex');
  const publicCard = c => ({ ruleId:c.ruleId, mode:c.mode, meaning:c.meaning, example:c.example, question:c.question, version:c.version, stage:c.stage, diagnosticVersion:c.diagnosticVersion, runtimeVersion:c.runtimeVersion });
  async function manifest(_data, context) {
    await identity(context);
    const [cfg, snap] = await Promise.all([config(), db.doc('studioCoachLearningPublic/current').get()]);
    return { collectionEnabled: cfg.enabled === true, samplesEnabled: cfg.enabled === true && cfg.samplesEnabled === true, cards: snap.data()?.cards || [] };
  }
  async function observe(data, context) {
    const uid = await identity(context), p = await POLICY;
    let event; try { event = p.validateObservation(data); } catch { fail('invalid-argument', '허용되지 않은 관찰 정보입니다.'); }
    const cfg = await config();
    if (cfg.enabled !== true || typeof cfg.salt !== 'string') return { recorded: false };
    const stamp = now(), day = new Date(stamp).toISOString().slice(0,10), userHash = digest(cfg.salt, uid);
    const receipt = db.doc(`studioCoachLearningReceipts/${digest(cfg.salt, `${uid}:${event.eventId}`)}`);
    const quota = db.doc(`studioCoachLearningQuotas/${day}-${userHash}`), global = db.doc(`studioCoachLearningQuotas/global-${day}`);
    const aggregate = db.doc(`studioCoachLearningStats/${day}-${event.ruleId}-${event.cardVersion}-${event.mode}-${event.diagnosticVersion}-${event.runtimeVersion}`);
    // A version must exist and have been exposed; arbitrary student versions are rejected.
    if (event.cardVersion !== 'builtin-v1') {
      const c = (await db.doc(`studioCoachLearningCards/${event.cardVersion}`).get()).data();
      if (!c || c.ruleId !== event.ruleId || c.diagnosticVersion !== event.diagnosticVersion || c.runtimeVersion !== event.runtimeVersion || !['both',event.mode].includes(c.mode) || !c.history?.some(h => ['limited','active'].includes(h.stage))) fail('invalid-argument','설명 버전을 확인해 주세요.');
    }
    const shadow = event.shadowVersion ? db.doc(`studioCoachLearningStats/${day}-${event.ruleId}-${event.shadowVersion}-${event.mode}-${event.diagnosticVersion}-${event.runtimeVersion}`) : null;
    if (shadow) {
      const c = (await db.doc(`studioCoachLearningCards/${event.shadowVersion}`).get()).data();
      if (!c || c.ruleId !== event.ruleId || c.diagnosticVersion !== event.diagnosticVersion || c.runtimeVersion !== event.runtimeVersion || !['both',event.mode].includes(c.mode) || !c.history?.some(h => h.stage === 'shadow')) fail('invalid-argument','관찰 버전을 확인해 주세요.');
    }
    return db.runTransaction(async tx => {
      const [r,q,g,a] = await Promise.all([receipt,quota,global,aggregate].map(ref => tx.get(ref)));
      const shadowOld = shadow ? (await tx.get(shadow)).data() : null;
      if (r.exists) return { recorded: false, duplicate: true };
      const usage = q.data() || {}, total = g.data() || {}, old = a.data() || {};
      if ((usage.count || 0) >= 30 || (usage.rules?.[event.ruleId] || 0) >= 5 || (total.count || 0) >= 3000) return { recorded: false, limited: true };
      const counts = { ...(old.counts || {}) };
      const inc = k => { counts[k] = (counts[k] || 0) + 1; };
      inc('exposures'); inc(event.outcome); inc(event.changed ? 'changed' : 'unchanged');
      event.intents.forEach(inc);
      if (event.aiRequested) inc('aiRequested'); if (event.aiReceived) inc('aiReceived');
      if (event.outcome === 'completed' && event.intents.includes('helpful')) inc('completedAndHelpful');
      if (event.outcome === 'same-error') inc(event.changed ? 'sameAfterEdit' : 'sameWithoutEdit');
      tx.set(receipt, { expiresAt: new Date(stamp + 7*DAY) });
      tx.set(quota, { count: (usage.count || 0)+1, rules: { ...(usage.rules || {}), [event.ruleId]: (usage.rules?.[event.ruleId] || 0)+1 }, expiresAt: new Date(stamp+7*DAY) });
      tx.set(global, { count: (total.count || 0)+1, expiresAt: new Date(stamp+7*DAY) });
      tx.set(aggregate, { day, ruleId:event.ruleId, cardVersion:event.cardVersion, mode:event.mode, diagnosticVersion:event.diagnosticVersion, runtimeVersion:event.runtimeVersion, counts, expiresAt: new Date(stamp+90*DAY) });
      if (shadow) tx.set(shadow, { day, ruleId:event.ruleId, cardVersion:event.shadowVersion, mode:event.mode, diagnosticVersion:event.diagnosticVersion, runtimeVersion:event.runtimeVersion, counts:{ ...(shadowOld?.counts || {}), shadowMatches:(shadowOld?.counts?.shadowMatches || 0)+1 }, expiresAt:new Date(stamp+90*DAY) });
      return { recorded: true };
    });
  }
  async function adminAction(data, context) {
    const uid = await identity(context,true), p = await POLICY;
    if (!data || typeof data.action !== 'string') fail('invalid-argument','작업이 필요합니다.');
    if (data.action === 'report') {
      const days = Array.from({length:14},(_,i)=>new Date(now()-(13-i)*DAY).toISOString().slice(0,10));
      const cutoff = days[0], through = days.at(-1);
      // Existing global daily counters only. No user hashes or fingerprints;
      // a reservation is not proof of a successful AI reply or a learner error.
      const reservations = Promise.all(days.map(async day => {
        const row = (await db.doc(`studioCoachUsage/day-${day}`).get()).data();
        const count = row?.count;
        if (row && (!Number.isSafeInteger(count) || count < 0)) throw new Error('invalid-usage-count');
        return {day,count:count || 0};
      })).then(rows=>({available:true,total:rows.reduce((n,r)=>n+r.count,0),days:rows}),()=>({available:false,total:null,days:[]}));
      const [stats,cards,samples,cfg,usage,requestReservations] = await Promise.all([
        db.collection('studioCoachLearningStats').where('day','>=',cutoff).where('day','<=',through).limit(1000).get(),
        db.collection('studioCoachLearningCards').orderBy('createdAt','desc').limit(100).get(),
        db.collection('studioCoachLearningSamples').where('expiresAt','>',new Date(now())).limit(60).get(), config(),
        db.collection('studioCoachLearningCosts').where('day','>=',cutoff).where('day','<=',through).limit(500).get(), reservations
      ]);
      const groups = new Map();
      for (const doc of stats.docs) { const a = doc.data(), k = `${a.ruleId}:${a.cardVersion}:${a.mode}:${a.diagnosticVersion}:${a.runtimeVersion}`; const g = groups.get(k) || { ruleId:a.ruleId, cardVersion:a.cardVersion, mode:a.mode, diagnosticVersion:a.diagnosticVersion, runtimeVersion:a.runtimeVersion }; for (const [name,n] of Object.entries(a.counts)) g[name] = (g[name] || 0)+n; groups.set(k,g); }
      const costs = usage.docs.map(d=>d.data());
      return { groups:p.rankGroups([...groups.values()]), cards:cards.docs.map(d=>d.data()), samples:samples.docs.map(d=>({ id:d.id,...d.data() })), config:{enabled:cfg.enabled===true,samplesEnabled:cfg.samplesEnabled===true}, costs, requestReservations, period:{from:cutoff,through,timeZone:'UTC'}, truncated:stats.size===1000 || cards.size===100 || samples.size===60 || usage.size===500, rules:p.RULES };
    }
    if (data.action === 'configure') {
      if (typeof data.enabled !== 'boolean' || typeof data.samplesEnabled !== 'boolean' || data.policyReviewed !== true) fail('invalid-argument','고지와 보관 정책 확인이 필요합니다.');
      const ref = db.doc('studioCoachLearningControl/config');
      await db.runTransaction(async tx => { const old = (await tx.get(ref)).data() || {}; tx.set(ref,{...old, enabled:data.enabled, samplesEnabled:data.enabled && data.samplesEnabled, salt:old.salt || crypto.randomBytes(32).toString('hex'), updatedAt:new Date(now()), reviewedBy:uid }); });
      return { saved:true };
    }
    if (data.action === 'create') {
      let card; try { card = p.validateCard(data.card); } catch { fail('invalid-argument','규칙과 설명 문구를 확인해 주세요.'); }
      const version = crypto.randomBytes(12).toString('hex');
      await db.doc(`studioCoachLearningCards/${version}`).create({ ...card, version, diagnosticVersion:p.DIAGNOSTIC_VERSION, runtimeVersion:p.ENGINE_VERSION, stage:'draft', createdAt:new Date(now()), createdBy:uid, history:[{stage:'draft',at:new Date(now())}] });
      return { version };
    }
    if (data.action === 'transition') {
      if (!/^[a-f0-9]{24}$/.test(data.version || '')) fail('invalid-argument','설명 버전이 필요합니다.');
      const ref=db.doc(`studioCoachLearningCards/${data.version}`), feed=db.doc('studioCoachLearningPublic/current');
      return db.runTransaction(async tx=>{
        const [cs,fs] = await Promise.all([tx.get(ref),tx.get(feed)]); const c=cs.data();
        if (!c || c.stage !== data.expectedStage || !p.TRANSITIONS[c.stage]?.includes(data.stage)) fail('failed-precondition','상태가 바뀌었습니다. 새로고침해 주세요.');
        if (data.stage !== 'retired' && (c.diagnosticVersion !== p.DIAGNOSTIC_VERSION || c.runtimeVersion !== p.ENGINE_VERSION)) fail('failed-precondition','진단기 버전이 달라졌습니다. 새 카드로 검증해 주세요.');
        let result = c.testResult || null;
        if (data.stage === 'tested') { result=p.testCard(c); if (!result.passed) fail('failed-precondition','진단기 검증을 통과하지 못했습니다.'); }
        if (data.stage === 'reviewed' && data.educationalReview !== true) fail('invalid-argument','문구·예시·적용 제외 조건을 검토해 주세요.');
        const next={...c,stage:data.stage,testResult:result,history:[...c.history,{stage:data.stage,at:new Date(now()),by:uid}].slice(-12)};
        let cards=(fs.data()?.cards || []).filter(x=>x.version!==c.version);
        if (['shadow','limited','active'].includes(data.stage)) {
          if (cards.some(x=>x.ruleId===c.ruleId && (x.mode==='both'||c.mode==='both'||x.mode===c.mode))) fail('failed-precondition','이 규칙의 배포 중인 카드를 먼저 회수해 주세요.');
          if(cards.length>=40) fail('resource-exhausted','배포 카드 수가 한도에 도달했습니다.');
          cards.push(publicCard(next));
        }
        tx.set(ref,next); tx.set(feed,{cards,updatedAt:new Date(now())});
        return {stage:data.stage,testResult:result};
      });
    }
    fail('invalid-argument','지원하지 않는 작업입니다.');
  }
  async function recordAdvice({payload,advice,usage,consent,samplesConsent}) {
    // Called only after an already-paid response. Never starts an AI request.
    if (consent !== true) return;
    const cfg=await config(); if(cfg.enabled!==true) return;
    const p=await POLICY, stamp=now(), day=new Date(stamp).toISOString().slice(0,10);
    const ruleId=p.RULES.includes(payload.finding)?payload.finding:`generic-${payload.errorType}`;
    if(!p.RULES.includes(ruleId)) return;
    const cost=db.doc(`studioCoachLearningCosts/${day}-${ruleId}`);
    const key=crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    const slot=parseInt(key.slice(0,2),16)%3;
    const sample=db.doc(`studioCoachLearningSamples/${day}-${ruleId}-${slot}`);
    await db.runTransaction(async tx=>{
      const [u,s]=await Promise.all([tx.get(cost),tx.get(sample)]), old=u.data()||{};
      const tokens = n => Number.isSafeInteger(n) && n >= 0 && n <= 100000 ? n : 0;
      tx.set(cost,{day,ruleId,requests:(old.requests||0)+1,inputTokens:(old.inputTokens||0)+tokens(usage?.input_tokens),outputTokens:(old.outputTokens||0)+tokens(usage?.output_tokens),expiresAt:new Date(stamp+90*DAY)});
      if(cfg.samplesEnabled===true && samplesConsent===true && !s.exists) tx.set(sample,{ruleId,payload,advice,fingerprint:key,createdAt:new Date(stamp),expiresAt:new Date(stamp+14*DAY)});
    });
  }
  async function cleanup() {
    // Bounded daily expiry deletion; no claim of instantaneous TTL. Continue next day if capped.
    let deleted=0;
    for(const name of ['studioCoachUsage','studioCoachLearningReceipts','studioCoachLearningQuotas','studioCoachLearningStats','studioCoachLearningCosts','studioCoachLearningSamples']) {
      for(let pass=0;pass<8;pass++) { const snap=await db.collection(name).where('expiresAt','<=',new Date(now())).limit(400).get(); if(!snap.size)break; const batch=db.batch();snap.docs.forEach(d=>batch.delete(d.ref));await batch.commit();deleted+=snap.size;if(snap.size<400)break; }
    }
    return {deleted};
  }
  return { manifest,observe,adminAction,recordAdvice,cleanup };
}
module.exports={ createLearningService };
module.exports.register=({functions,admin,regionalFunctions})=>{
  const svc=createLearningService({db:admin.firestore(),HttpsError:functions.https.HttpsError});
  const bounded=regionalFunctions.runWith({maxInstances:3,memory:'256MB',timeoutSeconds:30});
  return { studioCoachLearningManifest:bounded.https.onCall(svc.manifest), studioCoachLearningObserve:bounded.https.onCall(svc.observe), studioCoachLearningAdmin:bounded.https.onCall(svc.adminAction), studioCoachLearningCleanup:regionalFunctions.runWith({maxInstances:1,memory:'256MB',timeoutSeconds:540}).pubsub.schedule('every 24 hours').onRun(svc.cleanup) };
};
