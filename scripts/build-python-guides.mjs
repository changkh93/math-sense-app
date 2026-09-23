import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import Markdown from 'react-markdown';
export const base = 'https://msense.me';
const all = JSON.parse(await readFile('content/python-guides/catalog.json', 'utf8'));
const articles = all.filter(a => a.status === 'published');
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const json = x => JSON.stringify(x).replace(/</g,'\\u003c');
const root = '/python/guides/';
const url = a => `${root}${a.slug}/`;
const nav = `<a class="skip" href="#main">본문으로 이동</a><header class="masthead"><a href="/">메타센스</a><nav aria-label="주요 메뉴"><a href="${root}">파이썬 학습 노트</a><a href="/python-game-studio">코드 스튜디오</a><a href="/python">과정 안내</a><a href="/python#apply">7일 무료체험</a></nav></header>`;
const footer = `<footer class="footer">둘시네가 운영하는 메타센스 · 스스로 배우는 힘<br><a href="/python-game-studio">로그인 없이 코드 실행</a> · <a href="/python">파이썬 과정</a> · <a href="https://blog.naver.com/metasense_edu">공식 블로그</a> · <a href="https://www.instagram.com/metasense_edu/">인스타그램</a> · <a href="https://youtube.com/@metasense_edu">유튜브</a> · <a href="https://pf.kakao.com/_xfxkGDn">카카오 상담</a><br><a href="${root}editorial/">제작 기준과 이미지 출처</a> · <a href="/privacy">개인정보 처리방침</a></footer>`;
const cta = `<section class="cta"><h2>읽은 코드를 직접 바꿔 실행해 보세요.</h2><p>코드 스튜디오는 로그인 없이 사용할 수 있고, 빈 프로젝트 또는 내 폴더에서 시작합니다.<br>과정이 필요하다면 초4~중2 · 정규 월15만 원 · 기본 7일 무료체험 안내를 확인하세요.</p><div class="cta-actions"><a class="button" href="/python-game-studio">코드 스튜디오 열기</a><a class="button secondary" href="/python#apply">파이썬 과정·체험 안내</a></div></section>`;
const document = (title,desc,path,body,schema=[],image='/python-guides/assets/learning-path.png') => `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} | 메타센스</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="${base}${path}"><meta name="robots" content="index,follow,max-image-preview:large"><meta property="og:type" content="${schema.some(s=>s['@type']==='Article')?'article':'website'}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${base}${path}"><meta property="og:image" content="${base}${image}"><link rel="stylesheet" href="/python-guides/guide.css"><link rel="icon" href="/m-logo.svg"><script type="application/ld+json">${json({'@context':'https://schema.org','@graph':schema})}</script><script defer src="/marketing-analytics.js"></script></head><body>${nav}${body}${footer}</body></html>`;
async function emit(path,html) { const dir=`dist${path}`;await mkdir(dir,{recursive:true});await writeFile(`${dir}/index.html`,html); }
const listCard = a => `<article class="card">${a.image?`<a href="${url(a)}"><img src="${a.image}" alt="${esc(a.imageAlt)}" width="768" height="432" loading="lazy"></a>`:''}<div><span class="eyebrow">${esc(a.category)}</span><h2><a href="${url(a)}">${esc(a.title)}</a></h2><p>${esc(a.description)}</p></div></article>`;
const identities = new Set();
for (const a of articles) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(a.slug) || identities.has(a.slug)) throw new Error(`Invalid/duplicate slug ${a.slug}`);
  identities.add(a.slug);
  for (const key of ['title','description','answer','published','updated','author']) if(!a[key]) throw new Error(`Missing ${a.slug}/${key}`);
  for(const r of a.related) if(!articles.some(x=>x.slug===r)) throw new Error(`Broken related ${r}`);
  if(a.image) { if(!a.imageAlt || !a.imageCaption) throw new Error(`Missing image description ${a.slug}`); await access(`public${a.image}`); }
  const markdown = await readFile(`content/python-guides/${a.slug}.md`,'utf8');
  if(markdown.length<900) throw new Error(`Review short article: ${a.slug}`);
  let n=0;const toc=[];
  const body = renderToStaticMarkup(h(Markdown,{components:{ h2:({children})=>{const id=`section-${++n}`;toc.push({id,text:children});return h('h2',{id},children);},img:({src,alt})=>h('img',{src,alt,loading:'lazy',decoding:'async'}) }},markdown));
  const faq = `<section class="faq" aria-labelledby="faq-heading"><h2 id="faq-heading">함께 묻는 질문</h2>${a.faq.map(f=>`<details><summary>${esc(f.question)}</summary><p>${esc(f.answer)}</p></details>`).join('')}</section>`;
  const schema=[{'@type':'Article',headline:a.title,description:a.description,...(a.image?{image:[base+a.image]}:{}),datePublished:a.published,dateModified:a.updated,inLanguage:'ko',mainEntityOfPage:base+url(a),author:{'@type':'Organization',name:a.author,url:base+'/'},publisher:{'@type':'Organization',name:'메타센스',url:base+'/'}},{'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'메타센스',item:base+'/'},{'@type':'ListItem',position:2,name:'파이썬 학습 노트',item:base+root},{'@type':'ListItem',position:3,name:a.title,item:base+url(a)}]},{'@type':'FAQPage',mainEntity:a.faq.map(f=>({'@type':'Question',name:f.question,acceptedAnswer:{'@type':'Answer',text:f.answer}}))}];
  const html = document(a.title,a.description,url(a),`<main id="main" class="wrap"><nav class="crumbs" aria-label="현재 위치"><a href="/">메타센스</a> / <a href="${root}">파이썬 학습 노트</a> / ${esc(a.category)}</nav><article><span class="eyebrow">${esc(a.category)} · PYTHON NOTES</span><h1>${esc(a.title)}</h1><p class="meta">${esc(a.author)} · 게시 <time datetime="${a.published}">${a.published}</time> · 수정 <time datetime="${a.updated}">${a.updated}</time></p><div class="answer"><strong>먼저 답하면</strong><p>${esc(a.answer)}</p></div>${a.image?`<figure class="hero"><a href="${a.image}" aria-label="이미지 원본 크게 보기"><img src="${a.image}" alt="${esc(a.imageAlt)}" width="1536" height="864" fetchpriority="high"></a><figcaption>${esc(a.imageCaption)}</figcaption></figure>`:''}<div class="article-layout"><div><div class="article-body">${body}</div>${faq}<section><h2>확인한 자료</h2><ul>${a.sources.map(s=>`<li><a href="${esc(s.url)}">${esc(s.title)}</a></li>`).join('')}</ul></section>${cta}</div><aside class="aside"><strong>이 글에서 살펴볼 것</strong><ol>${toc.map(t=>`<li><a href="#${t.id}">${esc(t.text)}</a></li>`).join('')}</ol><h3>이어서 읽기</h3>${a.related.map(slug=>{const r=articles.find(x=>x.slug===slug);return `<p><a href="${url(r)}">${esc(r.title)}</a></p>`;}).join('')}<p><a href="${root}editorial/">제작 기준 · 정정 문의</a></p></aside></div></article></main>`,schema,a.image || '/m-logo.svg');
  await emit(url(a),html);
}
const categories=[...new Set(articles.map(a=>a.category))];
const courses = [
 {id:'foundation',name:'처음 파이썬',intro:'문자와 숫자, 거북이 그림, 반복과 조건을 실제 수업 코드로 읽습니다.'},
 {id:'games',name:'게임 프로젝트',intro:'Pygame 기초에서 우주 방어대와 화성 탐사대까지. 화면·입력·충돌·게임 상태를 나누어 읽습니다.'},
 {id:'advanced',name:'파이썬 심화',intro:'딕셔너리, 파일과 표, tkinter, API 응답, 플래시 카드의 구성 원리를 살펴봅니다.'},
 {id:'math',name:'파이썬 수학',intro:'자료형과 반복부터 소수·약수·방정식·배열·통계까지. 수학을 계산하는 코드의 조건을 확인합니다.'}
];
const coursePaths=[];
const courseNav = `<nav class="categories" aria-label="과정별 코드 노트">${courses.map(c=>`<a href="${root}courses/${c.id}/">${c.name} · ${articles.filter(a=>a.courseNote?.course===c.id).length}편</a>`).join('')}</nav>`;
for(const c of courses) {
 const subset=articles.filter(a=>a.courseNote?.course===c.id);if(!subset.length) continue;
 const path=`${root}courses/${c.id}/`;coursePaths.push(path);
 const units=[...new Set(subset.map(a=>a.courseNote.unit))];
 const html=`<main id="main" class="wrap"><p class="eyebrow">METASENSE / COURSE CODE NOTES</p><h1>${c.name} 코드 노트 ${subset.length}편</h1><p class="lead">${c.intro}</p>${courseNav}<div class="note">실제 메타센스 과정의 코드 연습을 바탕으로 만든 읽기 자료입니다. 완성 프로그램과 앞 단계 정의가 필요한 코드 조각을 구분합니다. 각 글의 실행 조건을 먼저 확인하세요.</div><nav aria-label="단원 바로가기" class="unit-links">${units.map((u,i)=>`<a href="#unit-${i+1}">${esc(u)}</a>`).join('')}</nav>${units.map((u,i)=>`<section id="unit-${i+1}"><h2>${esc(u)}</h2><div class="grid">${subset.filter(a=>a.courseNote.unit===u).map(listCard).join('')}</div></section>`).join('')}${cta}</main>`;
 await emit(path,document(`${c.name} 코드 노트 ${subset.length}편`,c.intro,path,html,[{'@type':'CollectionPage',name:c.name+' 코드 노트',url:base+path}],'/m-logo.svg'));
}

const pages=Math.ceil(articles.length/20);
const listingPaths=[];
for(let page=1;page<=pages;page++) {
 const path=page===1?root:`${root}page/${page}/`;listingPaths.push(path);
 await emit(path,document(`파이썬 학습 노트${page>1?` · ${page}페이지`:''}`,'아이의 첫 코드부터 과제와 피드백까지. 메타센스의 실제 도구 화면과 짧은 실험으로 살펴보는 파이썬 학습 안내.',path,`<main id="main" class="wrap"><span class="eyebrow">METASENSE / PYTHON NOTES</span><h1>실제 수업 코드로<br>읽고, 바꾸고, 설명해요</h1><p class="lead">처음 파이썬·게임 프로젝트·심화·파이썬 수학.<br>과정별 코드 노트와 부모님을 위한 학습 안내를 함께 읽습니다.</p><p><a href="${root}editorial/">글과 이미지의 제작 기준</a></p>${courseNav}<div class="grid">${articles.slice((page-1)*20,page*20).map(listCard).join('')}</div><nav class="pagination" aria-label="목록 페이지">${Array.from({length:pages},(_,i)=>`<a ${i+1===page?'aria-current="page"':''} href="${i===0?root:`${root}page/${i+1}/`}">${i+1}</a>`).join('')}</nav>${cta}</main>`,[{'@type':'CollectionPage',name:'파이썬 학습 노트',url:base+path}]));
}
const editorial=`${root}editorial/`;
await emit(editorial,document('글과 이미지의 제작 기준','메타센스 파이썬 학습 노트의 자료 출처, 편집 방식, 이미지 구분과 정정 문의 안내.',editorial,`<main id="main" class="wrap article-body"><h1>글과 이미지의 제작 기준</h1><p>이 학습 노트는 메타센스의 공개 과정 안내, 직접 실행한 코드, 공식 기술 문서를 바탕으로 제작합니다. 초안 정리와 삽화 제작에 AI 도구를 활용합니다. 코드의 실행 결과와 공식 자료를 확인하고, 운영 조건은 메타센스가 제공한 안내를 따릅니다.</p><h2>실제 화면을 정확히 설명합니다</h2><p>코드 스튜디오 화면은 실제 도구에서 코드를 실행한 캡처입니다. 특정 학생의 과제나 성과라는 설명을 붙이지 않습니다. 삽화에는 AI 제작 삽화라는 설명을 붙입니다. 학생의 말을 지어내거나 재구성한 기록을 실제 기록으로 소개하지 않습니다.</p><h2>과정 코드 노트의 검증 범위</h2><p>2026년 9월 22일 추가한 코드 노트는 실제 과정의 연습 코드를 바탕으로 AI 편집 도구가 구성했습니다. 출처와 코드 문법을 대조하고, 독립 실행 가능한 일부 예제는 로컬에서 실행했습니다. 프로젝트 내부 조각·그래픽·입력·파일·외부 API가 필요한 예제는 완성 프로그램으로 안내하지 않으며 글마다 확인 범위를 표시합니다. 사람의 전수 교육 검수나 모든 입력의 실행 검증을 완료했다고 표시하지 않습니다.</p><h2>학생 자료와 익명처리</h2><p>개별 학생의 이름·닉네임을 가리는 것만으로 공개 가능하다고 판단하지 않습니다. 학생 자료를 다룰 때는 식별 단서와 공개 이용 권한을 함께 확인합니다. 현재 학습 노트에는 개별 학생의 비공개 평가나 활동 기록을 게시하지 않았습니다.</p><h2>수정과 문의</h2><p>각 글의 수정일은 본문을 실질적으로 바꾼 날에 갱신합니다. 오류나 운영 조건의 변경을 발견하면 <a href="https://pf.kakao.com/_xfxkGDn">카카오 상담</a>에 글 주소와 해당 내용을 알려주세요.</p><p><a href="${root}">학습 노트 목록으로</a></p></main>`));
const paths=['/','/trial','/python','/python-game-studio',...listingPaths,...coursePaths,editorial,...articles.map(url)];
await writeFile('dist/sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map(p=>`<url><loc>${base}${p}</loc>${articles.some(a=>url(a)===p)?`<lastmod>${articles.find(a=>url(a)===p).updated}</lastmod>`:''}</url>`).join('')}</urlset>`);
await writeFile('dist/llms.txt',`# 메타센스\n\n> 둘시네가 운영하는 수학·파이썬·고전읽기 온라인 교육. 공개 학습 안내 링크 목록입니다.\n\n## 과정\n- [파이썬](https://msense.me/python): 초4~중2, 직접 코딩하는 학습, 월15만 원, 기본 7일 무료체험, 신청 후 1일 이내 연락.\n\n## 공개 도구\n- [코드 스튜디오](https://msense.me/python-game-studio): 로그인 없이 Python과 Jupyter 노트북을 작성하고 브라우저에서 실행하는 도구. 초안은 이용 중인 기기에 저장됩니다.\n\n## 학습 노트\n${articles.map(a=>`- [${a.title}](${base}${url(a)}): ${a.description}`).join('\n')}\n\n이 목록은 보조 안내이며 크롤링이나 AI 인용을 보장하지 않습니다.\n`);
await writeFile('dist/python-guides/build-manifest.json',JSON.stringify({articles:articles.map(a=>({slug:a.slug,path:url(a),title:a.title})),listingPaths,coursePaths,categories},null,2));
console.log(`Built ${articles.length} static guides, ${pages} index page(s), editorial page, sitemap and llms.txt`);
