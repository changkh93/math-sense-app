import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Markdown from "react-markdown";
const mathCssVersion = createHash("sha256").update(await readFile("public/math-assets/math.css")).digest("hex").slice(0, 16);
const base = "https://msense.me",
  root = "/math/guides/";
const all = JSON.parse(
  await readFile("content/math-guides/catalog.json", "utf8"),
);
const articles = all.filter((a) => a.status === "published");
const readingExperience = await readFile(
  "content/math-guides/reading-experience.html",
  "utf8",
);
const courseEvidence = await readFile(
  "content/math-guides/course-evidence.html",
  "utf8",
);
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const paths = [],
  json = (o) => JSON.stringify(o).replace(/</g, "\\u003c");
const cta = `<section class="cta"><span class="eyebrow">다음 한 걸음</span><h2>우리 아이는 어디에서<br>시작하면 좋을까요?</h2><p>7일 동안 메타센스의 학습 흐름을 경험해 보세요.<br>학년과 관심 영역을 남겨주시면 체험을 안내합니다.</p><a class="button" href="/math/#apply">수학과 고전읽기 7일 무료체험 신청</a> <a class="button secondary" href="https://pf.kakao.com/_xfxkGDn">먼저 상담하기</a></section>`;
const faqHtml = (faqs) =>
  `<section class="faq"><h2>궁금한 점부터 확인하세요</h2>${faqs.map((f) => `<details><summary>${esc(f.question)}</summary><p>${esc(f.answer)}</p></details>`).join("")}</section>`;
const faqSchema = (f) => ({
  "@type": "FAQPage",
  mainEntity: f.map((x) => ({
    "@type": "Question",
    name: x.question,
    acceptedAnswer: { "@type": "Answer", text: x.answer },
  })),
});
const nav = `<a class="skip" href="#main">본문으로 이동</a><header><a class="brand" href="/">메타센스<span>스스로 배우는 힘</span></a><nav aria-label="주요 메뉴"><a href="/math/">수학과 고전읽기</a><a href="/middle-math/">중등수학</a><a href="/math/books/">수학감각 교재</a><a href="${root}">학습 노트</a><a href="/python">파이썬</a><a href="/math/#apply">7일 무료체험</a></nav></header>`;
const footer = `<footer><strong>둘시네가 운영하는 메타센스</strong><p>수학감각 시리즈 저자 장기홍 · 수학을 보고, 생각하고, 설명하는 공부</p><p><a href="https://blog.naver.com/metasense_edu">네이버 블로그</a> · <a href="https://www.instagram.com/metasense_edu/">인스타그램</a> · <a href="https://youtube.com/@metasense_edu">유튜브</a> · <a href="https://pf.kakao.com/_xfxkGDn">카카오 상담</a></p><a href="${root}editorial/">제작 기준·출처</a> · <a href="/privacy">개인정보 처리방침</a></footer>`;
async function emit(
  path,
  title,
  desc,
  body,
  schema = [],
  image = "/math-assets/light-cards.png",
) {
  // Keep campaign attribution when an in-page trial link is clicked.
  const applyLinks = (html) =>
    ["/math/", "/middle-math/"].includes(path)
      ? html.replaceAll('href="/math/#apply"', 'href="#apply"')
      : html;
  paths.push(path);
  await mkdir(`dist${path}`, { recursive: true });
  await writeFile(
    `dist${path}/index.html`,
    `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} | 메타센스</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="${base}${path}"><meta name="robots" content="index,follow,max-image-preview:large"><meta property="og:type" content="${schema.some((x) => x["@type"] === "Article") ? "article" : "website"}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${base}${path}"><meta property="og:image" content="${base}${image}"><link rel="stylesheet" href="/math-assets/math.css?v=${mathCssVersion}"><link rel="icon" href="/m-logo.svg"><script type="application/ld+json">${json({ "@context": "https://schema.org", "@graph": schema })}</script><script defer src="/marketing-analytics.js"></script></head><body>${applyLinks(nav)}<main id="main">${applyLinks(body)}</main>${footer}</body></html>`,
  );
}
await emit('/middle-math/', '중등수학 | 핵심 개념부터 내신 대비·실시간 일대일 지도', '중1~3 핵심 개념을 3~4분 영상·텍스트·퀴즈로 연결하고, 절대개념·수준별 평가·월간평가·내신 대비로 이어갑니다. 일대일 질문 지도와 성장 상담, AI평가와 선생님 리뷰. 7일 무료체험.', await readFile('content/middle-math-intro.html', 'utf8'), [{ '@type': 'Course', name: '중등수학', description: '중1~3 핵심 개념, 절대개념, 수준별 평가와 내신 대비', provider: { '@type': 'Organization', name: '메타센스', url: base } }], '/math-assets/middle-overview.png');
const courseFaq = [
  {
    question: "수학과 고전읽기는 어떤 과정인가요?",
    answer:
      "스터디 크루로 함께 모여 각자 가져온 고전을 조용히 15분 동안 읽는 것으로 시작합니다. 읽은 내용을 정리해 과제로 제출하고, 잠깐 쉰 뒤 수학감각 교재를 바탕으로 초등수학을 공부합니다. 수학은 곱셈·나눗셈·분수·소수·비와 비례식을 다룹니다.",
  },
  {
    question: "모든 학생이 같은 고전을 읽나요?",
    answer:
      "각자 읽을 고전을 가져와 자신의 책을 읽습니다. 읽은 내용과 생각을 정리해 과제를 제출하고 독서 기록을 꾸준히 관리합니다. 완독 후에는 독서 라운지에서 책을 추천하고 서로의 생각을 나눕니다.",
  },
  {
    question: "아이가 혼자 공부하다 막히면 어떻게 하나요?",
    answer:
      "스터디 크루와 함께 공부하며, 모르는 문제나 질문이 생기면 일대일 실시간 화상강의실에서 선생님의 지도를 받습니다. 질문한 문제와 풀이를 함께 살펴보고 다시 학습을 이어갑니다. 참여 시간과 화상강의실 이용 방법은 체험 상담에서 안내합니다.",
  },
  {
    question: "일대일 지도와 성장 면담은 어떻게 다른가요?",
    answer:
      "실시간 일대일 지도는 공부하다 생긴 문제나 질문을 해결하는 시간입니다. 주기적인 일대일 성장 면담에서는 학습기록을 바탕으로 잘된 점과 어려운 점을 돌아보고 다음 목표를 함께 정합니다. 구체적인 면담 일정은 상담에서 안내합니다.",
  },
  {
    question: "구구단을 외우지 못해도 시작할 수 있나요?",
    answer:
      "어떤 단이 어려운지, 같은 수의 묶음을 이해하는지부터 살펴볼 수 있습니다. 학년만으로 시작점을 정하기보다 현재 이해한 내용과 막힌 부분을 상담에서 확인해 주세요.",
  },
  {
    question: "교재 구매와 온라인 수강은 같은 상품인가요?",
    answer:
      "수학감각 교재는 공식 스마트스토어에서 종이책 또는 PDF로 구매할 수 있습니다. 곱셈·나눗셈·소수 종이책은 절판되어 PDF 교재로 판매합니다. 온라인 과정의 수강 조건과 교재 포함 여부는 별도로 확인해 주세요.",
  },
  {
    question: "7일 무료체험은 어떻게 신청하나요?",
    answer:
      "이 페이지 아래 신청서에서 수학과 고전읽기 과정으로 신청할 수 있습니다. 상담에서 시작할 과정과 참여 방법을 안내합니다. 문의란에 관심 있는 수학 영역과 독서에 관한 궁금한 점을 남겨주세요. 체험 후 자동으로 유료 전환되거나 결제되지 않습니다.",
  },
];
const card = (title, text, num) =>
  `<article class="card"><span class="number">${num}</span><h3>${title}</h3><p>${text}</p></article>`;
await emit(
  "/math/",
  "수학과 고전읽기 | 초등수학·15분 독서·실시간 일대일 지도",
  "15분 고전읽기로 시작해 수학감각 교재로 초등수학을 배우는 메타센스. 스터디 크루와 함께 공부하고, 모르는 문제는 실시간 일대일 화상 지도를 받습니다. 독서 기록·독서 라운지·성장 면담과 7일 무료체험 안내.",
  `
<section class="hero course-hero"><div><span class="eyebrow">METASENSE · 수학과 고전읽기</span><h1>함께 읽고,<br>수학의 이유를<br><em>설명하는 시간.</em></h1><p class="lead">각자 고전을 펼쳐 조용히 읽는 15분.<br>잠깐 쉰 뒤에는 수학을 공부합니다.<br>막히면 선생님과 일대일로 풀어갑니다.</p><p>함께 모여 공부하는 스터디 크루,<br>질문할 때 연결되는 실시간 화상강의실.<br>스스로 해보는 시간 곁에 선생님이 있습니다.</p><a class="button" href="#apply">수학과 고전읽기 7일 무료체험 신청</a><p class="small">7일 무료체험 · 자동결제 없음<br><a href="#session">한 번의 수업 흐름 보기 ↓</a></p></div><div class="session-preview"><span class="eyebrow">우리의 공부는 이렇게 시작합니다</span><p class="reading-minute"><strong>15</strong>분 고전읽기</p><p>같은 시간에 모여,<br>각자의 책에 집중합니다.</p><div class="session-preview-divider"></div><p><strong>읽은 생각을 남기고 → 잠깐 쉬고 → 수학으로</strong></p><ul><li>수학감각 교재와 영상·도구로 원리 확인</li><li>모르는 문제는 실시간 일대일 지도</li><li>배우는 흐름은 기록과 성장 면담으로</li></ul><a class="text-link" href="#reading">독서 기록과 라운지 살펴보기 →</a></div></section>
<section id="session"><span class="eyebrow">스터디 크루 · 함께 시작하는 공부</span><h2>“공부 시작했니?” 대신,<br>함께 책을 펴는 시간.</h2><p class="lead">각자 다른 책과 다른 문제를 만나도,<br>같은 시간에 모여 공부의 흐름을 만듭니다.</p><ol class="session-flow"><li><span>01 · 15분</span><h3>내 고전 읽기</h3><p>각자 읽을 고전을 가져와 조용히 자신의 책을 읽습니다.</p></li><li><span>02 · 생각 정리</span><h3>읽은 내용 남기기</h3><p>읽은 내용을 정리해 과제로 제출합니다. 독서 기록도 꾸준히 이어갑니다.</p></li><li><span>03 · 잠깐의 휴식</span><h3>숨 고르기</h3><p>독서 뒤 잠깐 쉬고, 수학을 공부할 준비를 합니다.</p></li><li><span>04 · 초등수학</span><h3>원리 보고 풀어보기</h3><p>수학감각 교재와 영상·도구·퀴즈·워크북을 연결해 공부합니다.</p></li></ol></section>
<section id="support" class="support-section"><span class="eyebrow">혼자 넘기지 않아도 되는 막힘</span><h2>“여기서 모르겠어요.”<br>그때, 선생님과 일대일로.</h2><p class="lead">모르는 문제나 질문이 생기면<br>실시간 화상강의실에서 선생님의 지도를 받습니다.</p><div class="grid"><article class="card"><span class="eyebrow">공부하는 중에는</span><h3>실시간 일대일 화상 지도</h3><p>막힌 문제와 질문을 가지고 선생님을 만납니다. 어디까지 이해했는지, 어느 부분이 어려운지 함께 살펴보고 학습을 이어갑니다.</p></article><article class="card"><span class="eyebrow">주기적으로는</span><h3>일대일 성장 면담</h3><p>그동안의 학습기록을 함께 돌아봅니다. 잘된 점과 어려운 점을 짚고 다음에 도전할 목표를 정합니다.</p></article></div><p class="small">스터디 크루 참여 시간과 화상강의실 이용 방법, 성장 면담 일정은 체험 상담에서 안내합니다.</p><a class="button" href="#apply">함께 공부하는 7일 경험하기</a></section>
${readingExperience}
<section class="statement"><span class="eyebrow">AI 시대에도 아이에게 남아야 할 것</span><h2>정답을 찾는 일에서,<br>생각을 설명하는 일로.</h2><p>답을 쉽게 얻을 수 있는 시대라서, 부모님은 더 궁금합니다.<br>“우리 아이가 정말 이해하고 있을까?”<br>책에서 읽은 내용을 내 말로 정리하고, 수학에서는 그림을 보고 직접 조작하며 이유를 설명합니다. 메타센스는 읽고 생각한 것을 자기 말로 표현하는 시간을 이어갑니다.</p></section>
${courseEvidence}<section id="curriculum"><span class="eyebrow">수학감각 교재 기반 · 5개 학습 영역</span><h2>곱셈부터 비와 비례식까지,<br>원리가 다음 개념으로 이어집니다.</h2><p>수학과 고전읽기 과정의 수학 학습은 곱셈·나눗셈·분수·소수·비와 비례식으로 구성됩니다. 모든 영역에서 해당 수학감각 교재를 바탕으로 개념을 살펴보고, 영상과 학습도구로 확인합니다.</p><div class="grid">${card("곱셈 · 같은 수의 묶음에서 출발", "같은 수가 반복되는 장면을 그림과 식으로 연결합니다. 구구단에서 큰 수 곱셈으로 넘어가며 계산의 뜻을 살펴봅니다.", "01")}${card("나눗셈 · 나누는 기준을 이해하기", "똑같이 나누기와 몇 묶음인지 세기를 구별하고, 몫·나머지·검산을 곱셈과 연결합니다.", "02")}${card("분수 · 전체와 부분의 관계", "무엇을 전체로 보았는지부터 확인합니다. 같은 크기의 분수, 약분·통분을 거쳐 분수 사칙연산으로 이어갑니다.", "03")}${card("소수 · 자릿값으로 양을 읽기", "소수점 아래 자릿값과 수의 크기를 살펴봅니다. 분수와 소수의 관계를 연결하고 소수 사칙연산의 원리를 확인합니다.", "04")}${card("비와 비례식 · 두 양의 관계 보기", "두 양이 몇 배의 관계인지 비교합니다. 비와 비율, 비례식으로 관계를 나타내고 문제 속에서 활용합니다.", "05")}</div><p class="small">시작 영역은 현재 이해도와 상담에 따라 정합니다. 수세기·덧뺄셈은 교재 시리즈의 기초 영역으로 별도 소개하며, 위 다섯 과정과 구분합니다.</p><a class="text-link" href="/math/books/">영역별 교재와 종이책·PDF 구분 보기 →</a></section><section id="learning"><div class="section-head"><span class="eyebrow">한 개념을 여러 방식으로</span><h2>보고 끝내지 않고,<br>내 손으로 확인합니다.</h2></div><div class="grid three">${card("교재와 영상으로 만나기", "수학감각의 그림과 설명을 읽고, 영상에서 개념의 흐름을 살펴봅니다. 식을 쓰기 전에 무엇이 달라졌는지 이야기합니다.", "01")}${card("도구로 움직여 보기", "불빛 카드와 인터랙티브 도구에서 수의 변화와 관계를 확인합니다. 화면에서 본 것을 종이나 말로 다시 표현합니다.", "02")}${card("퀴즈·워크북으로 남기기", "퀴즈로 이해를 확인하고 워크북에 풀이와 질문을 남깁니다. 퀴즈 배틀은 함께 참여하는 또 하나의 학습 방식입니다.", "03")}</div><div class="note"><h3>일대일 성장 면담으로 다음 걸음을 정합니다.</h3><p>잘 풀린 한 문제, 막힌 한 장면, 다음에 해볼 목표 하나. 결과뿐 아니라 배우는 과정을 함께 돌아봅니다. 구체적인 면담 운영 방식은 상담에서 안내합니다.</p></div></section>
${cta}<section><span class="eyebrow">책에서 화면으로, 다시 내 생각으로</span><h2>예를 들어, 4×4를 배운다면</h2><ol class="steps"><li><strong>네 개씩 네 묶음</strong><p>먼저 그림으로 양을 봅니다. 4+4+4+4와 연결해 봅니다.</p></li><li><strong>불빛 카드에서 16 확인하기</strong><p>단을 고르고, 표와 소리를 따라 답을 생각합니다. 다시 볼 카드도 확인합니다.</p></li><li><strong>“4가 하나 더 늘면?”</strong><p>4×5를 예상하고 그 이유를 적습니다. 아는 답을 다음 문제에 연결합니다.</p></li></ol><a class="text-link" href="${root}multiplication-light-cards/">불빛 카드 사용법 읽기 →</a></section>
<section class="book-banner"><div><span class="eyebrow">수학감각 시리즈</span><h2>수학을 설명하는 그림,<br>생각을 여는 질문.</h2><p>책을 쓴 사람이 만든 교육. 수세기·덧뺄셈부터 곱셈·나눗셈·분수·소수·비와 비례식까지 7종의 교재로, 공식을 외우기 전에 그 뜻을 찾아갑니다.</p><a class="button" href="/math/books/">교재 속 활동 살펴보기</a></div><img src="/math-assets/fraction-book.jpg" alt="수학감각 분수 42쪽: 전체 여섯 조각 중 다섯을 5/6으로 나타내기" loading="lazy"></section>
<section><span class="eyebrow">부모님의 질문에서 시작하는</span><h2>초등수학 학습 노트</h2><div class="grid">${articles
    .slice(0, 4)
    .map(
      (a) =>
        `<article class="card"><span class="eyebrow">${a.category}</span><h3><a href="${root}${a.slug}/">${a.title}</a></h3><p>${a.answer}</p></article>`,
    )
    .join(
      "",
    )}</div><p><a class="text-link" href="${root}">학습 노트 ${articles.length}편 모두 보기 →</a></p></section>${faqHtml(courseFaq)}<section id="apply" class="apply-section"><span class="eyebrow">7일 무료체험</span><h2>우리 아이에게 맞는 공부인지,<br>먼저 경험해 보세요.</h2><p>신청서에는 ‘수학과 고전읽기’가 기본 선택되어 있습니다. 상담으로 참여 방법과 시작할 수학 영역을 안내합니다. 문의란에 현재 읽는 책이나 독서에 관한 궁금한 점, 곱셈·나눗셈·분수·소수·비와 비례식 중 관심 영역을 남겨주세요.</p><p><strong>체험 후 자동으로 유료 전환되거나 결제되지 않습니다.</strong></p><iframe class="math-application-frame" src="/math-application/index.html?v=20260921" title="수학과 고전읽기 7일 무료체험 신청서" loading="lazy"></iframe><p class="small"><a href="/trial#trial-form">신청서가 표시되지 않으면 전체 신청 페이지 열기</a> · <a href="/privacy">개인정보 처리방침</a></p><noscript><p>신청서 이용에는 JavaScript가 필요합니다. <a href="https://pf.kakao.com/_xfxkGDn">카카오에서 체험 문의하기</a></p></noscript></section>`,
  [
    {
      "@type": "Course",
      name: "메타센스 수학과 고전읽기",
      description:
        "스터디 크루에서 15분 고전읽기로 시작해 수학감각 교재 기반 초등수학을 배우는 과정. 독서 과제·기록·라운지, 실시간 일대일 화상 지도와 주기적인 성장 면담을 연결합니다.",
      provider: { "@type": "Organization", name: "메타센스", url: base + "/" },
    },
    faqSchema(courseFaq),
  ],
);
const books = [
  [
    "수세기",
    "숫자를 읽는 데서, 양을 보는 데로",
    "수 막대와 그림을 보며 개수를 세고 열 개 묶음과 자릿값으로 이어갑니다. 13을 읽은 뒤 열 개 묶음 하나와 낱개 세 개를 가리켜 보세요.",
    "13766883133",
    "2016-05-15",
    "9791195678242",
    "종이책",
  ],
  [
    "덧뺄셈",
    "받아올림의 작은 1에도 뜻이 있습니다",
    "합치기와 차이 비교, 수직선, 자릿값을 그림으로 살펴봅니다. 18+4를 10 만들기와 연결하며 계산의 중간 과정을 이야기해 보세요.",
    "13766866749",
    "2016-07-04",
    "9791195678259",
    "종이책",
  ],
  [
    "곱셈",
    "구구단의 답 뒤에, 같은 수의 묶음이 있습니다",
    "그림 속 반복과 묶음을 관찰하며 곱셈의 뜻, 곱셈구구, 곱셈의 성질과 큰 수 곱셈으로 이어갑니다. 4×4를 네 개씩 네 묶음으로 설명해 보세요. 종이책은 절판되어 PDF 교재로 판매합니다.",
    "12298614437",
    "",
    "",
    "PDF 교재",
  ],
  [
    "나눗셈",
    "나누어 주기와 묶어 세기를 연결합니다",
    "똑같이 나누기와 일정한 크기로 묶기를 비교하며 나눗셈의 뜻을 살펴봅니다. 나머지와 검산, 세로셈과 큰 수 나눗셈으로 이어집니다. 종이책은 절판되어 PDF 교재로 판매합니다.",
    "9640681061",
    "",
    "",
    "PDF 교재",
  ],
  [
    "분수 세트",
    "같은 양을 다르게 나누는 발견",
    "분수의 뜻과 크기 비교에서 사칙연산으로 이어집니다. 분수 도서 2권, 파파스 분수카드 1세트와 분수 사칙연산 4쪽 인쇄물로 구성된 상품입니다.",
    "13766904871",
    "2016-02-20",
    "9791195678228",
    "종이책·카드 세트",
  ],
  [
    "소수",
    "소수점 뒤에도 자릿값의 원리가 이어집니다",
    "자릿값과 반올림, 소수 사칙연산을 살펴보고 분수와 소수의 관계를 연결합니다. 0.5와 1/2을 같은 양으로 나타내며 두 표현을 함께 이해해 보세요. 종이책은 절판되어 PDF 교재로 판매합니다.",
    "3334619824",
    "",
    "",
    "PDF 교재",
  ],
  [
    "비와 비례식 세트",
    "두 양을 비교하는 새로운 언어",
    "비와 비율을 두 양의 상대적인 관계로 살펴보고 비례식으로 이어갑니다. 무조건 숫자를 식에 넣기보다 무엇을 기준으로 몇 배인지 먼저 말해 보세요. I·II 종이책 2권 세트입니다.",
    "5812968208",
    "2021-05-24",
    "9791195678297",
    "종이책 2권 세트",
  ],
];
await emit(
  "/math/books/",
  "수학감각 교재 7종 소개: 종이책·PDF 안내",
  "수세기·덧뺄셈·곱셈·나눗셈·분수세트·소수·비와 비례식 세트. 수학감각 7종의 학습 내용과 종이책·PDF 판매 형태, 공식 구매 안내.",
  `<section class="hero"><div><span class="eyebrow">장기홍 지음 · 둘시네</span><h1>“왜?”라는 질문에<br>펼쳐 볼 수 있는 책.</h1><p class="lead">설명을 한 번 더 들려주기보다,<br>아이가 직접 가리키며 이야기할 수 있는 그림.</p><p>수학감각은 수와 연산을 눈에 보이는 장면으로 연결합니다. 진도를 서두르기보다 한 그림에서 아이의 생각을 들어 보세요.</p><a class="button" href="#books">우리 아이에게 맞는 책 찾기</a></div><figure><img class="book-page" src="/math-assets/fraction-book.jpg" alt="수학감각 분수 본문 42쪽: 한 집합에서 부분이 차지하는 개수"><figcaption>수학감각 분수 실제 본문 · 42쪽</figcaption></figure></section><section><h2>한 페이지에서 이런 대화가 시작됩니다.</h2><div class="grid three">${card("전체는 어디일까?", "막대 하나뿐 아니라 여러 조각의 모임도 전체가 될 수 있습니다. 그림에서 전체와 부분을 가리켜 봅니다.", "01")}${card("식은 무엇을 말할까?", "여섯 조각 중 다섯을 고른 그림이 5/6이라는 기호로 이어집니다. 기호를 읽고 그림으로 되돌아갑니다.", "02")}${card("다르게 놓아도 같을까?", "막대를 조각으로 흩어 놓아도 전체와 부분의 관계가 같은지 이야기합니다. 한 장면에서 다른 장면으로 생각을 옮깁니다.", "03")}</div></section><section id="books"><span class="eyebrow">수학감각 시리즈 · 7종</span><h2>지금 막히는 곳에서 펼쳐보세요.</h2><div class="note"><h3>종이책과 PDF를 먼저 구분해 주세요.</h3><p><strong>종이책:</strong> 수세기, 덧뺄셈, 분수세트, 비와 비례식 세트<br><strong>PDF 교재:</strong> 곱셈, 나눗셈, 소수 — 이 세 종의 종이책은 절판되었습니다.</p><p>PDF 상품은 종이책이 배송되지 않습니다. 수령 방법과 이용 안내는 각 상품 페이지에서 확인해 주세요.</p></div>${books.map((b, i) => `<article class="book-row"><div class="book-label"><span>수학감각</span><strong>${b[0]}</strong><small>장기홍 지음 · 둘시네</small></div><div><span class="format-tag">${b[6]}</span><h3>${b[1]}</h3><p>${b[2]}</p>${b[4] ? `<p class="small">발행일 ${b[4]} · ISBN ${b[5]}</p>` : ""}<a class="button" href="https://smartstore.naver.com/dulcine/products/${b[3]}">${b[0]} 구성·가격·구매 확인</a></div></article>`).join("")}<p class="small">종이책과 PDF 교재를 함께 안내합니다. 가격·배송 또는 파일 수령 방법·재고·최종 구성은 연결된 공식 판매 페이지에서 확인하세요. 온라인 과정의 수강 조건과 교재 포함 여부는 별도 상담으로 안내합니다.</p></section><section><h2>책과 온라인 학습을 연결한다면</h2><p class="lead">책에서 만난 그림을 도구로 움직이고,<br>내가 이해한 것을 워크북에 남깁니다.</p><p>메타센스 수학과 고전읽기에서는 영상, 퀴즈, 퀴즈 배틀, 인터랙티브 도구를 함께 활용합니다. 책 구매만으로 온라인 수강권이 제공되는 것으로 안내하지 않습니다.</p><a class="text-link" href="/math/">수학과 고전읽기 과정 보기 →</a></section>${cta}`,
  books.map((b) => ({
    "@type": "Book",
    name: `수학감각 ${b[0]}`,
    author: { "@type": "Person", name: "장기홍" },
    publisher: { "@type": "Organization", name: "둘시네" },
    ...(b[5] ? { isbn: b[5] } : {}),
    ...(b[4] ? { datePublished: b[4] } : {}),
    bookFormat:
      b[6] === "PDF 교재"
        ? "https://schema.org/EBook"
        : "https://schema.org/Paperback",
    url: `https://smartstore.naver.com/dulcine/products/${b[3]}`,
  })),
  "/math-assets/fraction-book.jpg",
);
const seriesFor = (a) =>
  a.source?.title?.startsWith("수학감각 분수")
    ? { name: "분수 개념 노트", path: root + "fractions/" }
    : a.source?.title === "수학감각 곱셈"
      ? { name: "곱셈 개념 노트", path: root + "multiplication/" }
      : a.source?.title === "수학감각 나눗셈"
        ? { name: "나눗셈 개념 노트", path: root + "division/" }
        : a.source?.title === "수학감각 소수"
          ? { name: "소수 개념 노트", path: root + "decimals/" }
          : a.source?.title?.startsWith("수학감각 비와 비례식")
            ? { name: "비와 비례식 개념 노트", path: root + "ratios/" }
            : null;
const seen = new Set();
for (const a of articles) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(a.slug) || seen.has(a.slug))
    throw Error("Invalid slug " + a.slug);
  seen.add(a.slug);
  for (const r of a.related)
    if (!articles.some((x) => x.slug === r))
      throw Error("Missing related " + r);
  const md = await readFile(`content/math-guides/${a.slug}.md`, "utf8");
  if (md.length < 650) throw Error("Too short " + a.slug);
  let n = 0;
  const toc = [];
  const body = renderToStaticMarkup(
    createElement(
      Markdown,
      {
        components: {
          h2: ({ children }) => {
            const id = `section-${++n}`;
            toc.push({ id, text: children });
            return createElement("h2", { id }, children);
          },
        },
      },
      md,
    ),
  );
  const evidence = a.source ?? a.illustration;
  const image =
    evidence?.image ??
    (a.slug === "multiplication-light-cards"
      ? "/math-assets/light-cards.png"
      : a.category === "분수"
        ? "/math-assets/fraction-book.jpg"
        : "/math-assets/light-cards.png");
  const sourceFigure = evidence
    ? `<figure class="source-page"><a href="${evidence.image}" aria-label="${esc(evidence.title)} ${evidence.page}쪽 크게 보기"><img src="${evidence.image}" alt="${esc(evidence.alt)}" loading="eager"></a><figcaption>${esc(evidence.title)} · ${evidence.page}쪽 실제 교재 화면 · 이미지를 누르면 크게 볼 수 있습니다.</figcaption></figure>`
    : image
      ? `<figure><img src="${image}" alt="${a.category === "분수" ? "수학감각 분수 실제 본문 42쪽" : "메타센스 구구단 불빛 카드 실제 화면"}"><figcaption>${a.category === "분수" ? "수학감각 분수 · 42쪽" : "메타센스 도구 화면 · 학생의 학습 기록이 아닙니다."}</figcaption></figure>`
      : "";
  const series = seriesFor(a);
  const breadcrumbItems = [
    {
      "@type": "ListItem",
      position: 1,
      name: "초등수학",
      item: base + "/math/",
    },
    { "@type": "ListItem", position: 2, name: "학습 노트", item: base + root },
  ];
  if (series)
    breadcrumbItems.push({
      "@type": "ListItem",
      position: 3,
      name: series.name,
      item: base + series.path,
    });
  breadcrumbItems.push({
    "@type": "ListItem",
    position: breadcrumbItems.length + 1,
    name: a.title,
    item: base + root + a.slug + "/",
  });
  await emit(
    `${root}${a.slug}/`,
    a.title,
    a.description,
    `<section class="article-head"><nav aria-label="현재 위치"><a href="/math/">수학과 고전읽기</a> / <a href="${root}">학습 노트</a>${series ? ` / <a href="${series.path}">${series.name}</a>` : ""}</nav><span class="eyebrow">${a.category}</span><h1>${a.title}</h1><p class="small">메타센스 편집 · 게시 ${a.published} · 수정 ${a.updated}</p><div class="answer">${a.answer}</div></section><div class="reading"><article class="prose">${sourceFigure}${body}${faqHtml(a.faq)}<p class="small">자료: <a href="/math/books/">수학감각 교재 안내</a> · <a href="/math/">메타센스 과정과 학습도구</a> · <a href="${root}editorial/">편집 기준</a></p></article><aside><strong>이 글에서</strong><ol>${toc.map((t) => `<li><a href="#${t.id}">${esc(t.text)}</a></li>`).join("")}</ol><strong>이어서 읽기</strong>${a.related.map((s) => `<p><a href="${root}${s}/">${articles.find((x) => x.slug === s).title}</a></p>`).join("")}</aside></div>${cta}`,
    [
      {
        "@type": "Article",
        headline: a.title,
        description: a.description,
        datePublished: a.published,
        dateModified: a.updated,
        inLanguage: "ko",
        image: base + image,
        author: { "@type": "Organization", name: "메타센스", url: base + "/" },
        mainEntityOfPage: base + root + a.slug + "/",
      },
      faqSchema(a.faq),
      { "@type": "BreadcrumbList", itemListElement: breadcrumbItems },
    ],
    image,
  );
}
const fractionArticles = articles.filter((a) =>
  a.source?.title?.startsWith("수학감각 분수"),
);
const fractionGroups = [...new Set(fractionArticles.map((a) => a.category))];
await emit(
  root + "fractions/",
  "초등 분수 개념 노트 58편: 뜻부터 사칙연산까지",
  "수학감각 분수 1·2권의 실제 교재 화면과 예제로 배우는 초등 분수 개념 노트. 분수의 뜻, 약분·통분, 크기 비교, 덧셈·뺄셈, 곱셈·나눗셈을 순서대로 설명합니다.",
  `<section><nav aria-label="현재 위치"><a href="/math/">수학과 고전읽기</a> / <a href="${root}">학습 노트</a></nav><span class="eyebrow">수학감각 분수 1·2권 · 실제 교재 화면</span><h1>분수의 뜻부터 사칙연산까지,<br>한 개념씩 차곡차곡.</h1><p class="lead">교재의 한 장면, 직접 답하는 설명, 확인 예제,<br>집에서 해볼 5분 활동을 한 페이지에 담았습니다.</p><div class="note"><h2>어디서 시작할까요?</h2><p>분수 기호가 낯설면 <a href="${root}fraction-word-meaning/">분수 뜻</a>부터, 약분·통분이 막히면 <a href="${root}equivalent-fractions-bar-model/">같은 크기 분수</a>부터 시작하세요. 계산 규칙은 그림으로 이유를 확인한 뒤 연습하면 오래 남습니다.</p><p><strong>총 ${fractionArticles.length + 2}편:</strong> 기존 입문 노트 2편과 교재 기반 상세 노트 ${fractionArticles.length}편입니다.</p></div></section><section><h2>먼저 읽을 핵심 2편</h2><div class="grid">${[
    "fraction-whole",
    "equivalent-fractions",
  ]
    .map((slug) => {
      const a = articles.find((x) => x.slug === slug);
      return card(
        `<a href="${root}${a.slug}/">${a.title}</a>`,
        a.answer,
        a.category,
      );
    })
    .join("")}</div></section>${fractionGroups
    .map(
      (group) =>
        `<section class="fraction-chapter"><span class="eyebrow">${group}</span><h2>${group}</h2><div class="grid">${fractionArticles
          .filter((a) => a.category === group)
          .map((a, index) =>
            card(
              `<a href="${root}${a.slug}/">${a.title}</a>`,
              a.answer,
              String(index + 1).padStart(2, "0"),
            ),
          )
          .join("")}</div></section>`,
    )
    .join("")}${cta}`,
  [
    {
      "@type": "CollectionPage",
      name: "초등 분수 개념 노트 58편",
      description: "수학감각 분수 1·2권 기반 초등 분수 개념 노트",
      url: base + root + "fractions/",
      hasPart: fractionArticles.map((a) => ({
        "@type": "Article",
        name: a.title,
        url: base + root + a.slug + "/",
      })),
    },
  ],
  fractionArticles[0].source.image,
);
const multiplicationArticles = articles.filter(
  (a) => a.source?.title === "수학감각 곱셈",
);
const multiplicationGroups = [
  ...new Set(multiplicationArticles.map((a) => a.category)),
];
await emit(
  root + "multiplication/",
  `초등 곱셈 개념 노트 ${multiplicationArticles.length + 1}편: 뜻부터 큰 수 곱셈까지`,
  "수학감각 곱셈 실제 교재 화면과 예제로 배우는 초등 곱셈 개념 노트. 반복 덧셈, 묶음, 구구단 카드, 곱셈의 성질, 혼합 계산, 세로셈과 큰 수 곱셈을 설명합니다.",
  `<section><nav aria-label="현재 위치"><a href="/math/">수학과 고전읽기</a> / <a href="${root}">학습 노트</a></nav><span class="eyebrow">수학감각 곱셈 · 실제 교재 화면</span><h1>같은 묶음에서 큰 수 곱셈까지,<br>뜻을 놓치지 않고 이어갑니다.</h1><p class="lead">교재 장면, 한 가지 확인 예제, 흔한 오해,<br>집에서 해볼 5분 활동을 한 페이지에 담았습니다.</p><div class="note"><h2>구구단은 많이보다 정확하게</h2><p>단별 글을 무리하게 늘리지 않았습니다. <a href="${root}make-paper-multiplication-cards/">종이 카드 만들기</a>와 <a href="${root}sort-and-retry-multiplication-cards/">맞음·다시 보기 카드 분류</a>를 따라 한 단씩 짧게 연습하세요. 이미 맞힌 카드는 내려놓고 자주 틀린 카드만 다시 보는 흐름이 핵심입니다.</p><p><strong>총 ${multiplicationArticles.length + 1}편:</strong> 교재 기반 상세 노트 ${multiplicationArticles.length}편과 기존 불빛 카드 활용 노트 1편입니다.</p></div></section><section><h2>교재 밖에서도 이어지는 카드 연습</h2><div class="grid">${[
    "multiplication-light-cards",
    "sort-and-retry-multiplication-cards",
  ]
    .map((slug) => {
      const a = articles.find((x) => x.slug === slug);
      return card(
        `<a href="${root}${a.slug}/">${a.title}</a>`,
        a.answer,
        a.category,
      );
    })
    .join("")}</div></section>${multiplicationGroups
    .map(
      (group) =>
        `<section class="fraction-chapter"><span class="eyebrow">${group}</span><h2>${group}</h2><div class="grid">${multiplicationArticles
          .filter((a) => a.category === group)
          .map((a, index) =>
            card(
              `<a href="${root}${a.slug}/">${a.title}</a>`,
              a.answer,
              String(index + 1).padStart(2, "0"),
            ),
          )
          .join("")}</div></section>`,
    )
    .join("")}${cta}`,
  [
    {
      "@type": "CollectionPage",
      name: `초등 곱셈 개념 노트 ${multiplicationArticles.length + 1}편`,
      description: "수학감각 곱셈 기반 초등 곱셈 개념 노트",
      url: base + root + "multiplication/",
      hasPart: multiplicationArticles.map((a) => ({
        "@type": "Article",
        name: a.title,
        url: base + root + a.slug + "/",
      })),
    },
  ],
  multiplicationArticles[0].source.image,
);
const divisionArticles = articles.filter(
  (a) => a.source?.title === "수학감각 나눗셈",
);
const divisionGroups = [...new Set(divisionArticles.map((a) => a.category))];
await emit(
  root + "division/",
  `초등 나눗셈 개념 노트 ${divisionArticles.length + 1}편: 뜻부터 큰 수 나눗셈까지`,
  "수학감각 나눗셈 실제 교재 화면과 예제로 배우는 초등 나눗셈 개념 노트. 등분과 포함, 나눗셈 카드, 자릿값, 나머지, 검산, 세로셈과 큰 수 나눗셈을 설명합니다.",
  `<section><nav aria-label="현재 위치"><a href="/math/">수학과 고전읽기</a> / <a href="${root}">학습 노트</a></nav><span class="eyebrow">수학감각 나눗셈 · 실제 교재 화면</span><h1>똑같이 나누기에서 큰 수 세로셈까지,<br>몫의 뜻을 놓치지 않고 이어갑니다.</h1><p class="lead">교재 장면, 한 가지 확인 예제, 흔한 오해,<br>집에서 해볼 5분 활동을 한 페이지에 담았습니다.</p><div class="note"><h2>나눗셈도 카드 수보다 오답 흐름이 중요합니다</h2><p><a href="${root}make-division-fact-cards/">종이 나눗셈 카드 만들기</a>와 <a href="${root}sort-retry-division-cards/">맞음·다시 보기 카드 분류</a>에서 한 단씩 짧게 연습하세요. 맞힌 카드는 내려놓고 자주 틀린 카드만 곱셈 확인식과 함께 다시 보는 것이 핵심입니다.</p><p><strong>총 ${divisionArticles.length + 1}편:</strong> 교재 기반 상세 노트 ${divisionArticles.length}편과 기존 나눗셈 입문 노트 1편입니다.</p></div></section><section><h2>먼저 읽을 핵심 3편</h2><div class="grid">${[
    "division-meaning",
    "division-equal-sharing",
    "partitive-vs-quotitive-division",
  ]
    .map((slug) => {
      const a = articles.find((x) => x.slug === slug);
      return card(
        `<a href="${root}${a.slug}/">${a.title}</a>`,
        a.answer,
        a.category,
      );
    })
    .join("")}</div></section>${divisionGroups
    .map(
      (group) =>
        `<section class="fraction-chapter"><span class="eyebrow">${group}</span><h2>${group}</h2><div class="grid">${divisionArticles
          .filter((a) => a.category === group)
          .map((a, index) =>
            card(
              `<a href="${root}${a.slug}/">${a.title}</a>`,
              a.answer,
              String(index + 1).padStart(2, "0"),
            ),
          )
          .join("")}</div></section>`,
    )
    .join("")}${cta}`,
  [
    {
      "@type": "CollectionPage",
      name: `초등 나눗셈 개념 노트 ${divisionArticles.length + 1}편`,
      description: "수학감각 나눗셈 기반 초등 나눗셈 개념 노트",
      url: base + root + "division/",
      hasPart: divisionArticles.map((a) => ({
        "@type": "Article",
        name: a.title,
        url: base + root + a.slug + "/",
      })),
    },
  ],
  divisionArticles[0].source.image,
);
const decimalArticles = articles.filter(
  (a) => a.source?.title === "수학감각 소수",
);
const decimalGroups = [...new Set(decimalArticles.map((a) => a.category))];
await emit(
  root + "decimals/",
  `초등 소수 개념 노트 ${decimalArticles.length}편: 자릿값부터 분수와의 관계까지`,
  "수학감각 소수 실제 교재 화면과 예제로 배우는 초등 소수 개념 노트. 십진법, 0.1과 0.01, 수직선, 반올림, 사칙연산, 분수와 소수의 관계를 설명합니다.",
  `<section><nav aria-label="현재 위치"><a href="/math/">수학과 고전읽기</a> / <a href="${root}">학습 노트</a></nav><span class="eyebrow">수학감각 소수 · 실제 교재 화면</span><h1>0.1의 뜻에서 소수의 사칙연산까지,<br>자릿값으로 차근차근 이해합니다.</h1><p class="lead">교재 장면, 한 가지 확인 예제, 흔한 오해,<br>집에서 해볼 5분 활동을 한 페이지에 담았습니다.</p><div class="note"><h2>소수점보다 단위를 먼저 봅니다</h2><p>점이 움직인다고 외우기 전에 1, 0.1, 0.01이 몇 개인지 말해 보세요. <a href="${root}decimal-system-base-ten/">십진법의 10배 관계</a>에서 시작해 <a href="${root}equivalent-decimals-trailing-zeros/">0.5와 0.50</a>, 사칙연산과 분수의 관계까지 이어집니다.</p><p><strong>총 ${decimalArticles.length}편:</strong> 수학감각 소수 교재의 개념 설명 흐름을 일곱 묶음으로 정리했습니다.</p></div></section><section><h2>먼저 읽을 핵심 3편</h2><div class="grid">${[
    "decimal-system-base-ten",
    "tenths-meaning",
    "equivalent-decimals-trailing-zeros",
  ]
    .map((slug) => {
      const a = articles.find((x) => x.slug === slug);
      return card(
        `<a href="${root}${a.slug}/">${a.title}</a>`,
        a.answer,
        a.category,
      );
    })
    .join("")}</div></section>${decimalGroups
    .map(
      (group) =>
        `<section class="fraction-chapter"><span class="eyebrow">${group}</span><h2>${group}</h2><div class="grid">${decimalArticles
          .filter((a) => a.category === group)
          .map((a, index) =>
            card(
              `<a href="${root}${a.slug}/">${a.title}</a>`,
              a.answer,
              String(index + 1).padStart(2, "0"),
            ),
          )
          .join("")}</div></section>`,
    )
    .join("")}${cta}`,
  [
    {
      "@type": "CollectionPage",
      name: `초등 소수 개념 노트 ${decimalArticles.length}편`,
      description: "수학감각 소수 기반 초등 소수 개념 노트",
      url: base + root + "decimals/",
      hasPart: decimalArticles.map((a) => ({
        "@type": "Article",
        name: a.title,
        url: base + root + a.slug + "/",
      })),
    },
  ],
  decimalArticles[0].source.image,
);
const ratioArticles = articles.filter((a) =>
  a.source?.title?.startsWith("수학감각 비와 비례식"),
);
const ratioGroups = [...new Set(ratioArticles.map((a) => a.category))];
await emit(
  root + "ratios/",
  `초등 비와 비례식 개념 노트 ${ratioArticles.length}편: 비의 뜻부터 속력·농도까지`,
  "수학감각 비와 비례식 1·2권 실제 교재 화면과 예제로 배우는 개념 노트. 비교량과 기준량, 비례식, 퍼센트, 연비, 비례배분, 단위변환, 축척, 속력, 농도를 설명합니다.",
  `<section><nav aria-label="현재 위치"><a href="/math/">수학과 고전읽기</a> / <a href="${root}">학습 노트</a></nav><span class="eyebrow">수학감각 비와 비례식 1·2권 · 실제 교재 화면</span><h1>비의 뜻에서 속력과 농도까지,<br>기준량을 놓치지 않고 이어갑니다.</h1><p class="lead">교재 장면, 한 가지 확인 예제, 흔한 오해,<br>집에서 해볼 5분 활동을 한 페이지에 담았습니다.</p><div class="note"><h2>비는 숫자보다 순서와 기준이 먼저입니다</h2><p><a href="${root}ratio-meaning/">비의 뜻</a>과 <a href="${root}comparison-and-reference/">비교량·기준량</a>을 먼저 확인한 뒤 비례식, 퍼센트, 단위변환과 생활 속 rate로 이어가세요. 계산이 맞아도 기준량이나 단위가 바뀌면 다른 관계가 됩니다.</p><p><strong>총 ${ratioArticles.length}편:</strong> 1권 55편과 2권 45편을 열여섯 개 개념 묶음으로 정리했습니다.</p></div></section><section><h2>먼저 읽을 핵심 4편</h2><div class="grid">${[
    "ratio-meaning",
    "comparison-and-reference",
    "proportion-meaning",
    "ratio-vs-rate",
  ]
    .map((slug) => {
      const a = articles.find((x) => x.slug === slug);
      return card(
        `<a href="${root}${a.slug}/">${a.title}</a>`,
        a.answer,
        a.category,
      );
    })
    .join("")}</div></section>${ratioGroups
    .map(
      (group) =>
        `<section class="fraction-chapter"><span class="eyebrow">${group}</span><h2>${group}</h2><div class="grid">${ratioArticles
          .filter((a) => a.category === group)
          .map((a, index) =>
            card(
              `<a href="${root}${a.slug}/">${a.title}</a>`,
              a.answer,
              String(index + 1).padStart(2, "0"),
            ),
          )
          .join("")}</div></section>`,
    )
    .join("")}${cta}`,
  [
    {
      "@type": "CollectionPage",
      name: `초등 비와 비례식 개념 노트 ${ratioArticles.length}편`,
      description: "수학감각 비와 비례식 1·2권 기반 초등 개념 노트",
      url: base + root + "ratios/",
      hasPart: ratioArticles.map((a) => ({
        "@type": "Article",
        name: a.title,
        url: base + root + a.slug + "/",
      })),
    },
  ],
  ratioArticles[0].source.image,
);
const pages = Math.ceil(articles.length / 20);
for (let page = 1; page <= pages; page++)
  await emit(
    page === 1 ? root : `${root}page/${page}/`,
    `초등수학 학습 노트${page > 1 ? " · " + page : ""}`,
    `초등수학 학습 노트 ${articles.length}편. 곱셈·나눗셈·분수·소수·비와 비례식의 뜻과 계산을 실제 교재 화면, 질문과 예제로 설명합니다.`,
    `<section><span class="eyebrow">METASENSE · MATH NOTES · ${articles.length}편</span><h1>아이의 “왜?”에서<br>시작하는 수학 이야기.</h1><p class="lead">한 개념을 더 잘 이해하는 질문,<br>오늘 집에서 해볼 수 있는 작은 활동.</p>${page === 1 ? `<div class="series-banner"><div><span class="eyebrow">NEW · 수학감각 비와 비례식 1·2권</span><h2>비와 비례식 개념 노트 ${ratioArticles.length}편</h2><p>비의 뜻과 기준량부터 비례식, 퍼센트, 연비·비례배분, 단위변환, 축척, 속력과 농도까지 살펴보세요.</p><a class="button" href="${root}ratios/">비와 비례식 개념 노트 전체 보기</a></div><img src="${ratioArticles[0].source.image}" alt="수학감각 비와 비례식 교재 실제 화면" loading="lazy"></div><div class="series-banner"><div><span class="eyebrow">수학감각 소수</span><h2>소수 개념 노트 ${decimalArticles.length}편</h2><p>십진법과 자릿값부터 0.5와 0.50, 반올림, 사칙연산과 분수·소수의 관계까지 살펴보세요.</p><a class="button" href="${root}decimals/">소수 개념 노트 전체 보기</a></div><img src="${decimalArticles[0].source.image}" alt="수학감각 소수 교재 실제 화면" loading="lazy"></div><div class="series-banner"><div><span class="eyebrow">수학감각 나눗셈</span><h2>나눗셈 개념 노트 ${divisionArticles.length + 1}편</h2><p>등분과 포함부터 나눗셈 카드, 자릿값, 나머지·검산과 큰 수 세로셈까지 살펴보세요.</p><a class="button" href="${root}division/">나눗셈 개념 노트 전체 보기</a></div><img src="${divisionArticles[0].source.image}" alt="수학감각 나눗셈 교재 실제 화면" loading="lazy"></div><div class="series-banner"><div><span class="eyebrow">수학감각 곱셈</span><h2>곱셈 개념 노트 ${multiplicationArticles.length + 1}편</h2><p>같은 묶음과 반복 덧셈부터 구구단 카드, 곱셈의 성질과 큰 수 세로셈까지 살펴보세요.</p><a class="button" href="${root}multiplication/">곱셈 개념 노트 전체 보기</a></div><img src="${multiplicationArticles[0].source.image}" alt="수학감각 곱셈 교재 실제 화면" loading="lazy"></div><div class="series-banner"><div><span class="eyebrow">수학감각 분수 1·2권</span><h2>분수 개념 노트 ${fractionArticles.length + 2}편</h2><p>실제 교재 화면과 예제로 분수의 뜻부터 사칙연산까지 순서대로 살펴보세요.</p><a class="button" href="${root}fractions/">분수 개념 노트 전체 보기</a></div><img src="${fractionArticles[0].source.image}" alt="수학감각 분수 교재 실제 화면" loading="lazy"></div>` : ""}<div class="grid">${articles
      .slice((page - 1) * 20, page * 20)
      .map((a, i) =>
        card(
          `<a href="${root}${a.slug}/">${a.title}</a>`,
          a.answer,
          a.category,
        ),
      )
      .join(
        "",
      )}</div><nav class="pagination" aria-label="목록 페이지">${Array.from({ length: pages }, (_, i) => `<a href="${i === 0 ? root : root + "page/" + (i + 1) + "/"}" ${i + 1 === page ? 'aria-current="page"' : ""}>${i + 1}</a>`).join("")}</nav></section>${cta}`,
    [
      {
        "@type": "CollectionPage",
        name: "초등수학 학습 노트",
        url: base + root,
      },
    ],
  );
await emit(
  root + "editorial/",
  "초등수학 학습 노트 제작 기준",
  "교재·도구 이미지의 출처와 초등수학 학습 노트 편집 기준.",
  `<section class="prose"><h1>글과 이미지의 제작 기준</h1><p>메타센스가 제공한 과정 설명, 수학감각 교재와 실제 학습도구를 바탕으로 글을 구성합니다. 초안 정리에 AI 도구를 활용하며, 수학 예시와 자료를 확인해 편집합니다. 특정 학생의 경험이나 교육 효과를 지어내어 소개하지 않습니다.</p><h2>분수 개념 노트의 교재 화면</h2><p>분수 개념 노트 ${fractionArticles.length}편의 이미지는 장기홍 저자의 <strong>수학감각 분수 1권·2권</strong> PDF에서 해당 개념 설명 쪽을 직접 캡처한 것입니다. 각 글의 캡션에 권수와 쪽수를 표시하고, 이미지를 누르면 원본 크기로 확인할 수 있게 했습니다.</p><h2>곱셈 개념 노트의 교재 화면</h2><p>곱셈 개념 노트 ${multiplicationArticles.length}편의 이미지는 장기홍 저자의 <strong>수학감각 곱셈</strong> PDF에서 해당 개념 설명 쪽을 직접 캡처한 것입니다. 구구단은 단별 글을 양산하지 않고 곱셈표 읽기, 종이 카드 제작, 맞음·다시 보기 분류와 오답 반복 방법에 집중했습니다. 캡처는 개념을 설명하고 교재 활용을 돕기 위한 자료이며 문제 정답을 대신하지 않습니다.</p><h2>나눗셈 개념 노트의 교재 화면</h2><p>나눗셈 개념 노트 ${divisionArticles.length}편의 이미지는 장기홍 저자의 <strong>수학감각 나눗셈</strong> PDF에서 해당 개념 설명 쪽을 직접 캡처한 것입니다. 나눗셈구구는 단별 글을 양산하지 않고 종이 카드 제작, 맞음·다시 보기 분류와 관련 곱셈식으로 오답을 확인하는 방법에 집중했습니다. 캡처는 개념을 설명하고 교재 활용을 돕기 위한 자료이며 문제 정답을 대신하지 않습니다.</p><h2>소수 개념 노트의 교재 화면</h2><p>소수 개념 노트 ${decimalArticles.length}편의 이미지는 장기홍 저자의 <strong>수학감각 소수</strong> PDF에서 해당 개념 설명 쪽을 직접 캡처한 것입니다. 소수점 이동 절차만 외우게 하지 않고 1·0.1·0.01의 단위, 자릿값, 수직선, 모눈과 분수의 관계를 먼저 설명합니다. 캡처는 개념을 설명하고 교재 활용을 돕기 위한 자료이며 문제 정답을 대신하지 않습니다.</p><h2>비와 비례식 개념 노트의 교재 화면</h2><p>비와 비례식 개념 노트 ${ratioArticles.length}편의 이미지는 장기홍 저자의 <strong>수학감각 비와 비례식 1권·2권</strong> PDF에서 해당 개념 설명 쪽을 직접 캡처한 것입니다. 비의 항 순서와 비교량·기준량부터 비례식, 퍼센트, 연비, 단위변환, 속력과 농도까지 서로 다른 질문으로 구성했습니다. 캡처는 개념을 설명하고 교재 활용을 돕기 위한 자료이며 문제 정답을 대신하지 않습니다.</p><h2>그 밖의 이미지 출처</h2><p>구구단 불빛 카드 이미지는 실제 메타센스 도구를 개인정보 없는 상태에서 실행한 화면입니다. 학생의 성과 기록이 아닙니다. 일일 학습기록과 성장 리포트는 사용자가 제공한 실제 화면이며 표시된 수치는 개인별 기록으로 평균 성과나 효과를 보장하지 않습니다. 영상·퀴즈·워크북은 실제 제품에서 캡처했습니다. 독서 기록 화면은 운영자가 제공한 실제 화면 중 이름·닉네임이 없는 자료를 사용했습니다. 기록에 표시된 권수와 진도는 수강생 전체의 성과를 뜻하지 않습니다.</p><h2>운영 정보와 정정</h2><p>수강료·면담 일정·교재 포함 여부는 현재 과정 상담에서 확인합니다. 각 글의 수정일은 실제 내용 수정 시 갱신합니다. 오류는 <a href="https://pf.kakao.com/_xfxkGDn">카카오 상담</a>에 글 주소와 함께 알려주세요.</p><a href="${root}">학습 노트로 돌아가기</a></section>`,
);
const sitemap = await readFile("dist/sitemap.xml", "utf8");
const added = paths.filter((p) => !sitemap.includes(`<loc>${base}${p}</loc>`));
await writeFile(
  "dist/sitemap.xml",
  sitemap.replace(
    "</urlset>",
    added
      .map(
        (p) => `<url><loc>${base}${p}</loc><lastmod>2026-09-20</lastmod></url>`,
      )
      .join("") + "</urlset>",
  ),
);
let llms = await readFile("dist/llms.txt", "utf8");
llms = llms.split("\n## 초등수학\n")[0];
await writeFile(
  "dist/llms.txt",
  llms +
    "\n## 초등수학\n- [수학과 고전읽기 과정](" +
    base +
    "/math/)\n- [수학감각 교재](" +
    base +
    "/math/books/)\n" +
    articles
      .map((a) => `- [${a.title}](${base}${root}${a.slug}/): ${a.answer}`)
      .join("\n") +
    "\n",
);
await writeFile(
  "dist/math-assets/build-manifest.json",
  JSON.stringify({ paths, articles: articles.map((a) => a.slug) }, null, 2),
);
console.log(
  `Built math course, books, ${articles.length} articles, paginated library and editorial.`,
);
