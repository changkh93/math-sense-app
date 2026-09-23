import vm from 'node:vm';import fs from 'node:fs';import assert from 'node:assert/strict';
const code=fs.readFileSync('public/marketing-analytics.js','utf8');
function run(pathname,hostname='msense.me',source='instagram',campaign='python_trial',medium='cpc'){
 const context={location:{hostname,pathname,search:'?email=private@example.com&gclid=private-click&utm_source='+source+'&utm_medium='+medium+'&utm_campaign='+campaign,href:'https://msense.me'+pathname,origin:'https://msense.me'},URL,URLSearchParams,Date,Set};
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
const studio=run('/python-game-studio');studio.dataLayer.push({event:'python_studio_open',label:'page',projectName:'private-project'});
const studioEvent=studio.dataLayer.find(x=>x[0]==='event'&&x[1]==='python_studio_open');assert.equal(studioEvent[2].label,'page');assert(!JSON.stringify(studioEvent).includes('private-project'));
console.log('PASS: public Code Studio page and privacy-safe open event');
const google=run('/python','msense.me','google');
const googlePage=google.dataLayer.find(x=>x[0]==='event' && x[1]==='page_view');
assert.equal(googlePage[2].campaign_source,'google');
assert.equal(googlePage[2].campaign_medium,'cpc');
assert.equal(googlePage[2].campaign_name,'python_trial');
assert(!JSON.stringify(google.dataLayer.filter(x=>x[0])).includes('private-click'));
assert(!run('/python','msense.me','unknown-private-source').dataLayer.find(x=>x[0]==='event')[2].campaign_source);
console.log('PASS: Google CPC attribution, unknown sources and click IDs excluded');

const math=run('/math/','msense.me','google','math_trial');
math.dataLayer.push({event:'math_success',email:'private@example.com'});
const mathEvent=math.dataLayer.find(x=>x[0]==='event'&&x[1]==='math_success');
assert.equal(mathEvent[2].funnel,'math');
assert.equal(mathEvent[2].campaign_name,'math_trial');
assert.equal(mathEvent[2].page_location,'https://msense.me/math');
assert(!JSON.stringify(math.dataLayer.filter(x=>x[0])).includes('private@example.com'));
assert(run('/math/guides/fractions/').dataLayer.length>0);
assert.equal(run('/math-application/index.html').dataLayer.length,0);
math.history.pushState({},'', '/parent');
const before=math.dataLayer.filter(x=>x[0]==='event').length;
math.dataLayer.push({event:'math_success'});
assert.equal(math.dataLayer.filter(x=>x[0]==='event').length,before);
console.log('PASS: math route attribution, successful-application event, iframe/private routes excluded');

const contentVisit=run('/math/','msense.me','naver_blog','m07_20260921','organic_social');
const contentEvent=contentVisit.dataLayer.find(x=>x[0]==='event'&&x[1]==='page_view')[2];
assert.equal(contentEvent.campaign_source,'naver_blog');
assert.equal(contentEvent.campaign_medium,'organic_social');
assert.equal(contentEvent.campaign_name,'m07_20260921');
assert(!JSON.stringify(contentVisit.dataLayer.filter(x=>x[0])).includes('private@example.com'));
console.log('PASS: published M07 attribution retained without private query data');
