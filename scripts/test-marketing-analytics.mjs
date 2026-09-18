import vm from 'node:vm';import fs from 'node:fs';import assert from 'node:assert/strict';
const code=fs.readFileSync('public/marketing-analytics.js','utf8');
function run(pathname,hostname='msense.me'){
 const context={location:{hostname,pathname,search:'?email=private@example.com&utm_source=instagram&utm_medium=social&utm_campaign=python_trial',href:'https://msense.me'+pathname,origin:'https://msense.me'},URL,URLSearchParams,Date,Set};
 context.window=context;context.dataLayer=[];context.addEventListener=()=>{};context.history={pushState(a,b,url){context.location.pathname=url;},replaceState(a,b,url){context.location.pathname=url;}};
 context.document={referrer:'https://example.com/private?token=secret',head:{appendChild(){}},createElement:()=>({}),addEventListener:()=>{}};
 vm.runInNewContext(code,context);return context;
}
const c=run('/python');c.dataLayer.push({event:'python_success',label:'submission',email:'private@example.com'});
const events=c.dataLayer.filter(x=>x[0]==='event');assert(events.some(x=>x[1]==='python_success'));assert.equal(events.filter(x=>x[1]==='page_view').length,1);
const sent=JSON.stringify(c.dataLayer.filter(x=>x[0]));assert(!sent.includes('private@example'));assert(!sent.includes('token=secret'));assert(!sent.includes('/private'));assert(sent.includes('instagram'));
c.history.pushState({},'', '/admin/private-student');assert.equal(c['ga-disable-G-SGWRBZ7X2E'],true);const n=c.dataLayer.filter(x=>x[0]==='event').length;c.dataLayer.push({event:'python_success'});assert.equal(c.dataLayer.filter(x=>x[0]==='event').length,n);
assert.equal(run('/admin/private-student').dataLayer.length,0);assert.equal(run('/python','localhost').dataLayer.length,0);assert(run('/python/guides/first-turtle-drawing/').dataLayer.length>0);
console.log('PASS: public routes only, funnel dispatch, query/referrer sanitization, private navigation disabled, local excluded');
