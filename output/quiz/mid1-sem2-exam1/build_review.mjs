import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import katex from 'katex';

const out = path.dirname(fileURLToPath(import.meta.url));
const {questions} = JSON.parse(fs.readFileSync(path.join(out,'questions.json')));
const meta = JSON.parse(fs.readFileSync(path.join(out,'review-metadata.json')));
const escape = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
let mathCount=0;
function inline(s) {
  const parts=s.split(/(\$[^$]+\$)/g);
  return parts.map(p=>{
    if(p.startsWith('$')&&p.endsWith('$')) {
      mathCount++;
      return katex.renderToString(p.slice(1,-1),{throwOnError:true,strict:(code)=>['unknownSymbol','unicodeTextInMathMode'].includes(code)?'ignore':'error',output:'htmlAndMathml'});
    }
    return escape(p).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');
  }).join('');
}
function md(s) {
  return s.split('\n').map(line=>{
    if(line.startsWith('### '))return '<h3>'+inline(line.slice(4))+'</h3>';
    if(line.startsWith('## '))return '<h2>'+inline(line.slice(3))+'</h2>';
    if(line.startsWith('- '))return '<p class="bullet">'+inline(line.slice(2))+'</p>';
    return line?'<p>'+inline(line)+'</p>':'';
  }).join('');
}
function img(relative,cls,alt) {
  const data=fs.readFileSync(path.join(out,relative)).toString('base64');
  return `<img class="${cls}" alt="${escape(alt)}" src="data:image/png;base64,${data}">`;
}
let katexCss=fs.readFileSync(new URL('../../../node_modules/katex/dist/katex.min.css',import.meta.url),'utf8');
katexCss=katexCss.replace(/url\((fonts\/[^)]+)\)/g,(_,file)=>{
  const data=fs.readFileSync(path.resolve(out,'../../../node_modules/katex/dist',file)).toString('base64');
  return `url(data:font/woff2;base64,${data})`;
});
const cards=questions.map((q,i)=>{
  const r=meta.questions[i], answers=Array.isArray(q.answer)?q.answer:[q.answer];
  const flags=r.issues.map(issue=>`<aside class="note ${issue.severity}"><strong>${['resolved','revised'].includes(issue.severity)?'요청 반영':'원본 검토'}</strong> ${escape(issue.message)}</aside>`).join('');
  return `<article id="q${i+1}" data-issue="${r.issues.length>0}">
    <div class="card-head"><span>문항 ${String(i+1).padStart(2,'0')}</span><div>${answers.length>1?'<b class="tag">복수정답</b>':''}${r.sourceReplaced?'<b class="tag">새 문제 · 새 그림</b>':r.optionsAdded?'<b class="tag">서술형 · 보기 추가</b>':''}</div></div>
    ${flags}<div class="question">${md(q.question)}</div>
    ${r.imagePath?img(r.imagePath,'figure '+(i===15?'tall':''),`문항 ${i+1} 원본 그림`):''}
    ${r.optionRendering==='source-image-number'?'<p class="small">보기 내용은 위 원본 이미지에 그대로 있습니다. 아래 번호로 선택합니다.</p>':''}
    <div class="options">${q.options.map((o,j)=>`<button type="button" class="option" data-n="${j+1}" aria-pressed="false"><span class="number">${j+1}</span><span>${inline(o)}</span></button>`).join('')}</div>
    <details><summary>개념 설명 · 스스로 생각하기</summary><section>${md(q.hint)}</section></details>
    <details class="solution"><summary>정답 · 상세 풀이 확인</summary><section><div class="answer">정답: ${r.correctOptionNumbers.map(n=>'①②③④⑤'[n-1]).join(', ')} — ${answers.map(inline).join(', ')}</div>${md(q.explanation)}</section></details>
    <details class="source"><summary>${r.sourceReplaced?'교체 전 원본 (비교용)':'원본 문항과 비교'}</summary>${img(r.sourceImage,'source-image',`원본 문항 ${i+1}`)}</details>
  </article>`;
}).join('');
const doc=`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>중1 2학기 중간 1회 · 25문항 검토본</title><style>${katexCss}
*{box-sizing:border-box}body{margin:0;background:#eef2f6;color:#1e293b;font-family:-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Noto Sans KR',sans-serif;line-height:1.75}header{background:#122943;color:#fff;padding:38px max(24px,calc((100% - 1000px)/2));}header h1{font-size:30px;margin:5px 0}header p{margin:8px 0;color:#dae6f1}.eyebrow{color:#8bd7cc;font-weight:700;letter-spacing:.12em;font-size:12px}.status{display:inline-block;background:#294663;padding:4px 12px;border-radius:20px;font-size:13px}.layout{max-width:1220px;margin:24px auto;display:grid;grid-template-columns:170px minmax(0,1fr);gap:25px;padding:0 20px}nav{position:sticky;top:16px;align-self:start;background:#fff;padding:16px;border-radius:12px}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:5px}.grid a{text-align:center;color:#294663;text-decoration:none;border-radius:5px;background:#eef2f6;padding:4px;font-size:13px}.grid a.alert{background:#fff0d9;color:#8a4b00}nav h2{font-size:14px;margin:0 0 12px}nav button{width:100%;margin-top:12px;cursor:pointer;background:#fff;border:1px solid #c5ced7;padding:8px;border-radius:6px;color:#314155;font:inherit;font-size:12px}main{min-width:0}.intro,article{background:#fff;border:1px solid #dbe3ea;border-radius:15px;padding:28px;margin-bottom:24px;box-shadow:0 3px 10px #243c4c05}article{scroll-margin-top:18px}.intro h2{font-size:20px;margin-top:0}.intro li{margin:7px 0}.card-head{display:flex;justify-content:space-between;border-bottom:1px solid #e2e8f0;padding-bottom:14px;margin-bottom:18px;font-weight:700;color:#1e5267}.tag{font-size:11px;background:#eef4f8;border-radius:4px;padding:4px 7px;margin-left:6px;color:#596b79}.question{font-size:18px;font-weight:650}.figure{display:block;max-width:100%;max-height:650px;width:auto;height:auto;margin:22px auto}.figure.tall{max-height:950px}.options{display:grid;gap:9px;margin:22px 0}.option{display:flex;align-items:center;gap:12px;text-align:left;background:#fff;border:1px solid #d8e1e9;border-radius:9px;padding:12px 16px;font:inherit;color:inherit;cursor:pointer}.option:hover{background:#f6fafc}.option[aria-pressed=true]{background:#e9f5f2;border-color:#299e86}.number{flex:0 0 25px;background:#edf2f6;border-radius:50%;height:25px;text-align:center;line-height:25px;font-size:13px}.note{font-size:13px;background:#f6f8fa;border-left:3px solid #718096;padding:12px 14px;margin-bottom:20px}.note strong{display:block}.note.approval,.note.blocking{background:#fff5e5;border-color:#cf8a2a}.note.blocking{background:#fff0ef;border-color:#cf5049}details{border-top:1px solid #e2e8f0;padding:15px 0}summary{cursor:pointer;font-size:14px;font-weight:650;color:#35546a}details section{padding:8px 2px}section h2{font-size:20px}section h3{font-size:16px;margin-top:25px;color:#245f68}p{margin:10px 0}.bullet{padding-left:15px;position:relative}.bullet:before{content:'•';position:absolute;left:0;color:#62908b}.answer{background:#eaf6f1;padding:14px;border-radius:6px;font-weight:650}.source-image{display:block;max-width:100%;max-height:1200px;margin:16px auto}.small{font-size:12px;color:#677585}.katex{font-size:1.06em}.katex-html{white-space:normal}footer{max-width:950px;margin:20px auto 50px;color:#677585;font-size:12px;text-align:center}.review-buttons{display:flex;gap:10px}.review-buttons a{color:#1e6c77;text-decoration:none;border:1px solid #bcd4d7;border-radius:6px;padding:5px 10px;font-size:13px}html{scroll-behavior:smooth}@media(max-width:760px){.layout{display:block;padding:0 10px}nav{position:static;margin-bottom:16px}.grid{grid-template-columns:repeat(13,1fr)}nav button{width:auto;margin-right:8px}header{padding:28px 20px}header h1{font-size:24px}article,.intro{padding:20px}.card-head{gap:10px}.tag{display:inline-block;margin:3px} .question{font-size:16px}}@media print{nav,.source,.review-buttons{display:none}.layout{display:block}.intro,article{break-inside:avoid;box-shadow:none}header{background:white;color:black}header p{color:black}body{background:white}article details:not([open]){display:none}}
</style></head><body><header><div class="eyebrow">METASENSE · CONTENT REVIEW</div><h1>중1 2학기 중간 1회</h1><p>25문항 · 원본 그림 15개 + 새 그림 1개 · 수정 반영</p><span class="status">${meta.dbWritten?'등록 완료 — DB 25문항·그림 16개 검증':'검토용 초안 — DB 등록·이미지 업로드 전'}</span></header><div class="layout"><nav><h2>문항 바로가기</h2><div class="grid">${meta.questions.map(r=>`<a href="#q${r.number}" class="${r.issues.length?'alert':''}">${r.number}</a>`).join('')}</div><button id="toggle-solutions">풀이 모두 펼치기</button><button id="issues-only">검토 표시 문항만</button></nav><main><div class="intro"><h2>${meta.dbWritten?'확정본 등록 완료':'컨펌 전에 확인해 주세요'}</h2><p>첨부 이미지 묶음의 순서와 기존 보기를 유지하고, 요청하신 22번은 새 문제로 교체했습니다. 문제 번호별로 원본 이미지, 개념 설명, 풀이를 확인할 수 있습니다. 버튼 선택은 이 검토 페이지 안에서만 동작하며 저장되지 않습니다.</p><ul><li><strong>4·6·14번:</strong> 원본대로 복수정답입니다. JSON의 answer는 배열로 보존했습니다.</li><li><strong>1·16번:</strong> 원본의 시각적 보기를 이미지로 보존하고 선택 버튼에 보기 번호를 넣었습니다.</li><li><strong>21·23·24·25번:</strong> 원래 서술형입니다. 원문 지시를 유지하고 선택지만 다섯 개씩 추가했습니다.</li><li><strong>16번:</strong> 요청하신 대로 ‘직사각형’을 ‘도형’으로 수정했습니다.</li><li><strong>18번:</strong> 중등 교과 범위에서 ③은 옳은 보기로 유지했습니다. 문제와 보기는 그대로이며 정답은 ①입니다.</li><li><strong>22번:</strong> 맞꼭지각의 크기를 같다고 놓아 방정식을 푸는 새 문제와 그림으로 교체했습니다. 새 정답은 아래 풀이에서 확인할 수 있습니다.</li></ul><p class="small">13번의 정다각형 단정과 17번의 ‘옆면’ 용어는 해설에서 짚었습니다. 수식 위로 긴 선이 겹쳐 보이는 원본 현상은 새 수식 표기에서 정리했습니다.</p><div class="review-buttons"><a href="questions.json">JSON 원본</a><a href="REVIEW.md">수정 내역</a></div></div>${cards}<article><h2>원본 정답·해설</h2><p class="small">22번은 새 문제로 교체했으므로 아래 원본의 22번 정답·해설은 적용하지 않습니다.</p><details><summary>정답·해설 첫 페이지</summary>${img('assets/answer-page-6.png','source-image','원본 정답 해설 첫 페이지')}</details><details><summary>정답·해설 두 번째 페이지</summary>${img('assets/answer-page-7.png','source-image','원본 정답 해설 두 번째 페이지')}</details></article></main></div><footer>대상 단원: ${meta.unitId}<br>${meta.dbWritten?'승인된 문항과 그림을 Firebase에 등록·검증했습니다.':'외부 서버 전송 없음 · 원본 추출 그림과 직접 제작한 22번 그림 사용'}</footer><script>
document.querySelectorAll('.options').forEach(group=>group.querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>button.setAttribute('aria-pressed',button.getAttribute('aria-pressed')!=='true'))));
let expanded=false;document.querySelector('#toggle-solutions').addEventListener('click',e=>{expanded=!expanded;document.querySelectorAll('.solution').forEach(d=>d.open=expanded);e.target.textContent=expanded?'풀이 모두 접기':'풀이 모두 펼치기'});
let only=false;document.querySelector('#issues-only').addEventListener('click',e=>{only=!only;document.querySelectorAll('article[data-issue]').forEach(a=>a.hidden=only&&a.dataset.issue!=='true');e.target.textContent=only?'전체 문항 보기':'검토 표시 문항만'});
</script></body></html>`;
fs.writeFileSync(path.join(out,'review.html'),doc);
console.log(JSON.stringify({questions:questions.length,renderedMathExpressions:mathCount,htmlBytes:Buffer.byteLength(doc)}));
