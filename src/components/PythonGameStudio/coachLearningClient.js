import { httpsCallable } from 'firebase/functions'
import { auth, functions } from '../../firebase'
import { validateCard, DIAGNOSTIC_VERSION, ENGINE_VERSION } from '../../../functions/studioCoachLearningPolicy.mjs'
import { createLearningTracker } from './coachLearningTracker.mjs'
const sessions=new Map()
export function learningSession(uid) {
  if(sessions.has(uid))return sessions.get(uid)
  if(sessions.size>=3){sessions.values().next().value.tracker.abandon();sessions.delete(sessions.keys().next().value)}
  const state={consent:false,manifest:{collectionEnabled:false,samplesEnabled:false,cards:[]},listeners:new Set(),bucket:Math.floor(Math.random()*100)}
  const eligible=()=>Boolean(auth.currentUser && auth.currentUser.uid===uid && !auth.currentUser.isAnonymous)
  state.tracker=createLearningTracker({send:payload=>eligible()?httpsCallable(functions,'studioCoachLearningObserve')(payload):Promise.resolve()})
  state.notify=()=>state.listeners.forEach(fn=>fn())
  state.setConsent=value=>{state.consent=value===true;state.tracker.consent(state.consent);state.notify()}
  // One fetch per account/studio tab, not per error. No retries or polling.
  state.ready=eligible()?httpsCallable(functions,'studioCoachLearningManifest')({}).then(result=>{
    const cards=(Array.isArray(result.data.cards)?result.data.cards:[]).slice(0,40).filter(c=>{try{validateCard(Object.fromEntries(['ruleId','mode','meaning','example','question'].map(k=>[k,c[k]])));return c.diagnosticVersion===DIAGNOSTIC_VERSION&&c.runtimeVersion===ENGINE_VERSION&&/^[a-f0-9]{24}$/.test(c.version)&&['shadow','limited','active'].includes(c.stage)}catch{return false}})
    state.manifest={collectionEnabled:result.data.collectionEnabled===true,samplesEnabled:result.data.samplesEnabled===true,cards}
    state.tracker.configure(state.manifest.collectionEnabled);state.notify()
  }).catch(()=>{}):Promise.resolve()
  sessions.set(uid,state);return state
}
