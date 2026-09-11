import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {mkdir,writeFile} from 'node:fs/promises'
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || '/Users/selah/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const b=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
const context=await b.newContext({viewport:{width:1440,height:1000},locale:'ko-KR'})
const page=await context.newPage();page.setDefaultTimeout(25000)
const out='docs/collaboration/tasks/20260911-python-showcase/verification'
await mkdir(out,{recursive:true})
const errors=[],requests=[];let fail=true,release;page.on('pageerror',e=>errors.push(e.message))
// Intercept the callable before any form is filled. No test application reaches Firebase.
await context.route('**/submitPublicApplication',async route=>{
 if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*'}})
 requests.push(route.request().postDataJSON());await new Promise(resolve=>{release=resolve})
 await route.fulfill({status:fail?500:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(fail?{error:{status:'INTERNAL',message:'QA 접수 실패 확인'}}:{result:{success:true,id:'local-intercept-only'}})})
})
await context.route('**/previewReferralInvite',route=>route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({result:{valid:true}})}))
try{
 await page.goto((process.env.PYTHON_PAGE_URL || 'http://127.0.0.1:5180')+'/python');await page.locator('.pe-hero-visual img').evaluate(img=>img.decode())
 assert.match(await page.title(),/메타센스 파이썬/)
 assert.deepEqual(await page.locator('.pe-video-card-title strong').allTextContents(),['처음 파이썬','루미 프로토콜','게임 프로젝트','파이썬 심화','파이썬 수학','생각의 항로'])
 assert.equal(await page.locator('.pe-course-video iframe').count(),0,'YouTube must not load before the user chooses it')
 await page.screenshot({path:`${out}/desktop-hero.png`})
 for(const width of [1440,768,390,360]){
  await page.setViewportSize({width,height:900})
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`overflow at ${width}`)
 }
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:`${out}/mobile-hero.png`})
 await page.locator('#apply').scrollIntoViewIfNeeded();await page.screenshot({path:`${out}/mobile-form.png`})
 await page.setViewportSize({width:1440,height:1000})
 await page.locator('[name=applicantName]').fill('시연용 학부모');await page.locator('[name=studentName]').fill('시연용 학생');await page.locator('[name=grade]').selectOption('초5');await page.locator('[name=parentPhone]').fill('123');await page.locator('.pe-consent input').check()
 const submit=page.locator('.pe-form button[type=submit]');await submit.click();await page.getByRole('alert').filter({hasText:'전화번호'}).waitFor();assert.equal(requests.length,0)
 await page.locator('[name=parentPhone]').fill('010-0000-0000');await submit.click();await page.waitForFunction(()=>document.querySelector('.pe-form button[type=submit]').disabled)
 await page.waitForTimeout(400);assert.equal(requests.length,1);assert.equal(await submit.isDisabled(),true);release()
 await page.getByRole('alert').filter({hasText:'QA 접수 실패'}).waitFor();assert.equal(await page.locator('[name=studentName]').inputValue(),'시연용 학생');assert.equal(await submit.isEnabled(),true)
 fail=false;await submit.click();await page.waitForTimeout(400);release();await page.getByText('파이썬 체험 신청이 접수되었습니다.',{exact:true}).waitFor()
 assert.equal(requests.length,2);assert.equal(requests[1].data.selectedCourse,'파이썬 코딩');assert.equal(requests[1].data.type,'trial');assert.match(requests[1].data.message,/파이썬 전용 소개 페이지/)
 await page.goto('http://127.0.0.1:5180/trial/python?ref=local-qa-token');await page.getByText('추천 혜택 · 4주 무료체험',{exact:true}).waitFor()
 await page.goto('http://127.0.0.1:5180/trial');await page.getByRole('link',{name:'파이썬 과정 자세히 보기 ↗'}).waitFor()
 assert.deepEqual(errors,[])
 await writeFile(`${out}/page-checks.json`,JSON.stringify({passed:['six-stage order','lazy YouTube','responsive 1440/768/390/360','invalid phone blocked','duplicate-submit lock','error retains inputs and retry','successful intercepted application','Python course payload','referral offer','trial discoverability'],productionSubmissions:0},null,2))
 console.log('PASS Python landing, responsive widths, callable contract/error/retry; 0 production submissions')
}finally{await b.close()}
