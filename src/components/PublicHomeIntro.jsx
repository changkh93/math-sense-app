import { useState } from 'react'

const Arrow = () => <span aria-hidden="true">↗</span>
const evidence = [
  { id: 'tools', label: '직접 해보는 공부', title: '눈으로 보고, 손으로 확인하고.', text: '구구단 불빛 카드, 분수 렌즈와 퀴즈. 화면을 직접 움직이며 식이 뜻하는 것을 살펴봅니다.', image: '/math-assets/light-cards.png', alt: '4단의 수표를 보며 4 곱하기 4의 답을 생각하는 실제 구구단 불빛 카드 화면', caption: '초등수학 · 구구단 불빛 카드' },
  { id: 'code', label: '만들면서 배우는 코딩', title: '코드 한 줄이, 내 작품이 되는 순간.', text: '파이썬으로 그림과 게임을 만들며 필요한 개념을 배웁니다. 만든 결과와 생각을 과제로 남기고 피드백을 받습니다.', image: '/python-showcase/foundation-screen.webp', alt: '메타센스 파이썬 프로젝트의 실제 학습 화면', caption: '파이썬 · 프로젝트 학습 화면' },
  { id: 'record', label: '부모님이 보는 기록', title: '“공부했어?” 다음에 나눌 이야기.', text: '영상, 퀴즈, 워크북과 체험 활동을 하루 단위로 살펴봅니다. 막연한 확인 대신 아이가 해본 활동에 관해 대화를 시작하세요.', image: '/math-assets/daily-learning.png', alt: '퀴즈와 분수 도구 활동이 표시된 실제 일일 학습 기록', caption: '일일 학습기록 · 표시 수치는 개별 기록이며 평균 성과가 아닙니다.' },
]

export default function PublicHomeIntro({ onLogin }) {
  const [active, setActive] = useState('tools')
  const current = evidence.find(item => item.id === active)
  return <div className="ms-home">
    <a className="ms-skip" href="#home-main">본문으로 이동</a>
    <header className="ms-header">
      <a className="ms-brand" href="/" aria-label="메타센스 홈"><img src="/m-logo.svg" alt="" width="35" height="35" /><span>메타센스<small>스스로 배우는 힘</small></span></a>
      <nav className="ms-navigation" aria-label="과정 안내"><a href="/math/">수학과 고전읽기</a><a href="/python">파이썬</a><a href="/math/books/">수학감각 교재</a></nav>
      <div className="ms-header-actions">{onLogin ? <button className="ms-login" onClick={onLogin}>로그인</button> : <a className="ms-login" href="/#login">로그인</a>}<a className="ms-signup" href="/signup">회원가입</a><a className="ms-button ms-small" href="/trial">7일 무료체험 <Arrow /></a></div>
    </header>
    <main id="home-main">
      <section className="ms-hero ms-shell" aria-label="메타센스 교육 소개">
        <div className="ms-hero-copy">
          <p className="ms-eyebrow"><span /> AI 시대, 아이에게 남아야 할 배움</p>
          <h1>아는 답을 넘어,<br /><em>내 생각으로.</em></h1>
          <p className="ms-lead">답은 쉽게 찾는 시대.<br />우리 아이는 그 이유도 설명할 수 있을까요?</p>
          <p className="ms-hero-description">수학은 원리를 발견하고, 코드는 직접 만들고,<br className="ms-desktop-break" /> 책은 질문하며 읽습니다. 메타센스에서 스스로 배우는 힘을 길러요.</p>
          <div className="ms-actions"><a className="ms-button" href="/trial">7일 동안 경험해 보기 <Arrow /></a><a className="ms-text-link" href="#home-courses">우리 아이에게 맞는 과정 <span aria-hidden="true">↓</span></a></div>
          <p className="ms-fine">기본 7일 무료체험 · 체험 후 자동 결제 없음</p><p className="ms-signup-guide">상담을 마치셨나요? <a href="/signup">학부모 회원가입 <Arrow /></a><span>가입 후 자녀 계정을 만들어 학습을 준비해 주세요.</span></p>
        </div>
        <div className="ms-hero-visual">
          <div className="ms-visual-caption"><span className="ms-status-dot" /> 지금, 메타센스에서 배우는 방법 <span>01 / MATH</span></div>
          <div className="ms-screen"><img src="/math-assets/light-cards.png" width="2393" height="1993" alt="메타센스 실제 학습 도구: 구구단 불빛 카드에서 4×4의 원리를 살펴보는 화면" fetchPriority="high" /></div>
          <div className="ms-question-note"><span className="ms-note-mark">?</span><div><small>정답 다음에, 한 가지 질문</small><strong>“왜 16이 되는 걸까?”</strong></div></div>
          <div className="ms-visual-bottom"><span>보고 → 움직이고 → 설명하는 공부</span><span aria-hidden="true">✳</span></div>
        </div>
      </section>
      <div className="ms-foundation"><div className="ms-shell"><p><strong>수학감각 시리즈 저자가 만든 교육</strong><span>장기홍 지음 · 둘시네가 운영하는 메타센스</span></p><a href="/math/books/">교육의 출발점, 교재 보기 <Arrow /></a></div></div>
      <section id="home-courses" className="ms-section ms-shell">
        <div className="ms-section-heading"><div><p className="ms-eyebrow">아이의 호기심이 출발점</p><h2>무엇을 배우고 싶나요?</h2></div><p>지금 궁금한 것에서 시작해,<br />스스로 해내는 경험을 쌓습니다.</p></div>
        <div className="ms-course-grid">
          <article className="ms-course ms-course-math"><div className="ms-course-top"><span>01 · MATH & READING</span><span className="ms-course-symbol" aria-hidden="true">× ÷</span></div><h3>수학과 고전읽기</h3><p>공식을 외우기 전에,<br /><strong>그림 속에서 이유를 발견해요.</strong></p><div className="ms-course-topics">곱셈 · 나눗셈 · 분수 · 소수 · 비와 비례식</div><ul><li>함께 고전 15분 읽기 · 읽은 생각을 독서 기록으로</li><li>수학감각 교재와 영상으로 개념 이해</li><li>인터랙티브 도구·퀴즈·워크북으로 확인</li><li>학습 기록과 일대일 성장 면담</li></ul><a className="ms-course-link" href="/math/">수학과 고전읽기 과정 살펴보기 <Arrow /></a></article>
          <article className="ms-course ms-course-python"><div className="ms-course-top"><span>02 · PYTHON</span><span className="ms-course-symbol" aria-hidden="true">{'{ }'}</span></div><h3>파이썬</h3><p>좋아하는 게임을 넘어,<br /><strong>내가 만드는 프로그램으로.</strong></p><div className="ms-course-topics">초등 3학년부터 · 자율 학습 · 프로젝트</div><ul><li>그림·게임·데이터를 직접 만드는 공부</li><li>온라인 편집 도구로 코드 작성과 실행</li><li>과제와 피드백으로 생각 다듬기</li></ul><a className="ms-course-link" href="/python">파이썬 과정 살펴보기 <Arrow /></a></article>
        </div>
      </section>
      <section className="ms-evidence-section"><div className="ms-shell">
        <div className="ms-section-heading"><div><p className="ms-eyebrow">말보다, 실제 학습 장면</p><h2>아이의 공부가<br />눈에 보이도록.</h2></div><p>하는 일과 남기는 기록을<br />직접 살펴보세요.</p></div>
        <div className="ms-evidence-layout"><div className="ms-evidence-options" role="group" aria-label="학습 화면 선택">{evidence.map((item,index)=><button key={item.id} type="button" aria-pressed={active===item.id} aria-controls="home-evidence-view" className={active===item.id?'is-active':''} onClick={()=>setActive(item.id)}><span className="ms-option-number">0{index+1}</span><span><small>{item.label}</small><strong>{item.title}</strong><span className="ms-option-description">{item.text}</span></span><span className="ms-option-arrow" aria-hidden="true">↗</span></button>)}</div><figure id="home-evidence-view" className="ms-evidence-view" aria-live="polite"><div className={`ms-image-window ms-image-${active}`}><img key={current.image} src={current.image} alt={current.alt} loading="lazy" /></div><figcaption><span className="ms-status-dot" />{current.caption}</figcaption></figure></div>
      </div></section>
      <section className="ms-section ms-shell ms-learning"><div><p className="ms-eyebrow">스스로, 그리고 함께</p><h2>혼자 내버려 두는<br />공부가 아닙니다.</h2><p className="ms-body-copy">아이가 직접 해볼 시간을 주고,<br />질문과 기록으로 다음 걸음을 찾습니다.</p><a className="ms-text-link" href="https://pf.kakao.com/_xfxkGDn">우리 아이의 시작점 상담하기 <Arrow /></a></div><ol className="ms-steps"><li><span>01</span><div><h3>보고, 질문합니다.</h3><p>교재와 영상에서 개념을 만나고, 이해되지 않는 부분을 질문으로 남깁니다.</p></div></li><li><span>02</span><div><h3>직접 해보고, 남깁니다.</h3><p>도구를 움직이고 문제를 풀고 코드를 만듭니다. 결과뿐 아니라 생각도 기록합니다.</p></div></li><li><span>03</span><div><h3>돌아보고, 다시 시작합니다.</h3><p>과제 피드백과 학습기록을 살펴봅니다. 수학과 고전읽기에서는 성장 면담으로 다음 목표를 이야기합니다.</p></div></li></ol></section>
      <section className="ms-author ms-shell"><div className="ms-book-preview"><img src="/math-assets/fraction-book.jpg" alt="수학감각 분수 교재 실제 본문: 전체와 부분을 그림으로 설명하는 42쪽" loading="lazy" width="900" height="1200" /><span>수학감각 · 실제 교재 본문</span></div><div className="ms-author-copy"><p className="ms-eyebrow">교육의 시작은, 한 장의 책에서</p><h2>“왜 그런지”를 묻는 책.<br />그 질문을 이어가는 교육.</h2><p>수학감각 시리즈를 집필한 장기홍이 메타센스를 운영합니다. 그림을 가리키며 이야기하고, 자기 말로 설명하는 공부를 책에서 온라인 학습으로 이어갑니다.</p><p className="ms-author-signature">장기홍 <span>수학감각 시리즈 저자 · 둘시네</span></p><a className="ms-text-link" href="/math/books/">수학감각 교재 7종 알아보기 <Arrow /></a><p className="ms-fine">종이책·PDF 교재와 온라인 수강은 별도 상품입니다.</p></div></section>
      <section className="ms-section ms-shell ms-faq"><div><p className="ms-eyebrow">처음이라 궁금한 것들</p><h2>시작하기 전에.</h2><a className="ms-text-link" href="https://pf.kakao.com/_xfxkGDn">다른 질문이 있어요 <Arrow /></a></div><div className="ms-faq-list"><details><summary>우리 아이는 어떤 과정부터 시작하면 좋을까요?</summary><p>현재 어려워하는 개념이나 만들고 싶은 것을 출발점으로 삼습니다. 수학과 고전읽기는 관심 영역과 현재 이해도를, 파이썬은 초등 3학년부터의 시작과 학습 환경을 상담에서 확인해 주세요.</p></details><details><summary>7일 무료체험은 어떻게 신청하나요?</summary><p>체험 신청 페이지에서 관심 과정과 자녀 학년을 남겨주세요. 체험 이후에는 별도로 수강을 결정하며 자동으로 결제되지 않습니다.</p></details><details><summary>수학감각 교재만 구매해도 되나요?</summary><p>네. 교재만 구매해 가정에서 활용할 수 있습니다. 수세기·덧뺄셈·분수·비와 비례식은 종이책, 절판된 곱셈·나눗셈·소수는 PDF 교재로 판매합니다. 온라인 수강권은 별도입니다.</p></details><details><summary>상담 후 회원가입과 자녀 계정 생성은 어떻게 하나요?</summary><p>상담을 마쳤다면 상단의 <a href="/signup">회원가입</a>에서 학부모 계정으로 가입해 주세요. 가입 후 자녀 계정을 생성하고, 상담에서 안내받은 과정으로 학습을 준비합니다.</p></details><details><summary>기존 회원은 어디에서 로그인하나요?</summary><p>상단 로그인에서 기존 아이디·비밀번호, Google 계정 또는 게스트 초대 링크로 학습을 이어갈 수 있습니다.</p></details></div></section>
      <section className="ms-final"><div className="ms-shell"><p className="ms-eyebrow">작은 질문 하나가, 다음 배움으로</p><h2>우리 아이에게 맞는지,<br />직접 경험해 보세요.</h2><p>메타센스의 학습 흐름을 7일 동안 만나보세요.</p><div className="ms-actions"><a className="ms-button ms-button-light" href="/trial">7일 무료체험 신청 <Arrow /></a><a href="https://pf.kakao.com/_xfxkGDn" className="ms-final-consult">먼저 상담할게요 <Arrow /></a></div><p className="ms-fine">체험 후 자동 결제 없음</p></div><span className="ms-final-orbit" aria-hidden="true">m.</span></section>
    </main>
  </div>
}
