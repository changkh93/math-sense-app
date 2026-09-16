import { DIAGNOSTIC_VERSION, ENGINE_VERSION, INTENTS } from '../../../functions/studioCoachLearningPolicy.mjs'
// All source/signature comparisons live in this tab only; the emitted event
// contains no source, traceback, path, project ID, or student identifier.
export function createLearningTracker({send,now=Date.now,uuid=()=>crypto.randomUUID()}) {
  const episodes=new Map(); let enabled=false,consent=false,active=null;
  function finish(e,outcome='unknown') {
    if(!e || e.sent)return; e.sent=true;
    if(!enabled || !consent || !e.participating)return;
    const elapsed=now()-e.at;
    const payload={version:1,eventId:e.id,ruleId:e.ruleId,cardVersion:e.cardVersion,shadowVersion:e.shadowVersion,mode:e.mode,diagnosticVersion:DIAGNOSTIC_VERSION,runtimeVersion:ENGINE_VERSION,intents:[...e.intents],aiRequested:e.aiRequested,aiReceived:e.aiReceived,changed:e.changed,outcome,elapsed:elapsed<30000?'under-30s':elapsed<120000?'under-2m':'over-2m',consent:true};
    try { Promise.resolve(send(payload)).catch(()=>{}); } catch { /* Observation must never break a student run. */ }
  }
  return {
    configure(value){enabled=value===true;if(!enabled){episodes.clear();active=null;}},
    consent(value){consent=value===true;if(!consent){episodes.clear();active=null;}else for(const e of episodes.values())if(!e.sent)e.participating=enabled;},
    participating(){return enabled&&consent;},
    register({key,scope,source,path,signature,ruleId,cardVersion,shadowVersion=null,mode}) {
      if(episodes.has(key))return;
      if(episodes.size>=10){const [k,e]=episodes.entries().next().value;finish(e);episodes.delete(k);}
      episodes.set(key,{id:uuid(),scope,source,path,signature,ruleId,cardVersion,shadowVersion,mode,at:now(),intents:new Set(),aiRequested:false,aiReceived:false,changed:false,sent:false,participating:enabled&&consent});
    },
    intent(key,intent){const e=episodes.get(key);if(e&&!e.sent&&INTENTS.includes(intent)){e.intents.add(intent);if(enabled&&consent)e.participating=true;}},
    ai(key,received=false){const e=episodes.get(key);if(e&&!e.sent){e.aiRequested=true;e.aiReceived ||= received;}},
    begin({id,scope,source,sourceFor}) {
      for(const e of episodes.values())if(!e.sent && e.scope!==scope)finish(e);
      const e=[...episodes.values()].reverse().find(e=>!e.sent&&e.scope===scope);
      if(e){const next=e.mode==='file'&&sourceFor?sourceFor(e.path):source;e.changed=typeof next==='string'&&next!==e.source;}
      active={id,episode:e,surface:false};
    },
    event(id,type,signature) {
      if(!active || active.id!==id)return;
      if(type==='SURFACE')active.surface=true;
      if(type==='ERROR'){finish(active.episode,signature===active.episode?.signature?'same-error':'different-error');active=null;}
      if(type==='EXIT'){finish(active.episode,active.surface?'surface-ended':'completed');active=null;}
    },
    abandon(){for(const e of episodes.values())finish(e);episodes.clear();active=null;},
  }
}
export const scopeForRun = run => run ? `${run.project.id}:${run.project.entrypoint}:${run.notebook?.index ?? 'file'}` : ''
