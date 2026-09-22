const {test}=require('node:test');
const assert=require('node:assert/strict');
const {buildPythonLead,sendPythonLead}=require('./openaiAdsConversion.cjs');
const input={type:'trial',selectedCourse:'파이썬 코딩',parentPhone:'01000000000',studentName:'Excluded',openaiMeasurement:{consent:true,oppref:'opaque-click'}};
test('only explicitly consented Python leads with a click reference are eligible',()=>{
 for(const data of [{...input,openaiMeasurement:{consent:false,oppref:'x'}},{...input,selectedCourse:'수학'}, {...input,openaiMeasurement:{consent:true,oppref:''}}, {...input,type:'consultation'}])assert.equal(buildPythonLead(data),null);
});
test('request allowlist excludes applicant data and personal matching',()=>{
 const e=buildPythonLead(input,12345);
 assert.deepEqual(Object.keys(e).sort(),['id','type','timestamp_ms','oppref','source_url','action_source','opt_out','data'].sort());
 assert.equal(e.timestamp_ms,12345);assert.equal(e.opt_out,true);assert.equal(e.user,undefined);assert(!JSON.stringify(e).includes('Excluded'));
});
test('send success, failure and absent consent do not throw',async()=>{
 const e=buildPythonLead(input);
 assert.equal(await sendPythonLead(e,'test-key',async(u,o)=>{assert(!o.body.includes('01000000000'));assert.equal(JSON.parse(o.body).events[0].id,e.id);return{ok:true}}),'sent');
 assert.equal(await sendPythonLead(e,'test-key',async()=>{throw Error('timeout')}),'failed');
 assert.equal(await sendPythonLead(null,'test-key',()=>assert.fail()),'skipped');
});
