import { createElement, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import {
  ArrowRight,
  Calendar,
  ClipboardCheck,
  Compass,
  Eye,
  FileText,
  Gift,
  Heart,
  Menu,
  MessageCircle,
  Orbit,
  Quote,
  ShieldCheck,
  Sparkles,
  Star,
  Trophy,
  X,
} from 'lucide-react';
import './PublicApplication.css';

const courseCatalog = [
  {
    id: 'math-classics',
    name: '수학과 고전읽기',
    shortName: '초등 수학과 고전',
    schedule: '월화수목금, 주 5회',
    price: '월 150,000원',
    image: '/images/clusters/elementary_math.png',
    tone: 'blue',
    target: '초등 개념 수학과 깊이 있는 읽기를 함께 잡는 과정',
    summary: '매일 정해진 시간에 접속해 초등 수학 개념을 다지고, 고전 읽기로 생각의 깊이를 키웁니다.',
    features: [
      '초등 수학 개념을 차근차근 정리',
      '아동문학에서 호메로스까지 이어지는 읽기 루틴',
      '매일 참여하는 온라인 학습 공동체',
      '집중과 기록의 습관 형성',
    ],
  },
  {
    id: 'western-classics',
    name: '서양고전 탐구',
    shortName: '서양고전 탐구',
    schedule: '월수목금, 주 4회',
    price: '월 25,000원',
    image: '/images/clusters/reading.png',
    tone: 'violet',
    target: '초등 고학년 이상에게 권하는 고전 전권 강독 과정',
    summary: '길가메쉬, 호메로스, 그리스 비극처럼 쉽게 혼자 읽기 어려운 원전을 함께 읽습니다.',
    features: [
      '서양 고전 전권 강독',
      '읽은 내용을 말과 글로 정리',
      '역사와 철학 배경지식 확장',
      '스스로 생각하는 힘 훈련',
    ],
  },
  {
    id: 'ai-math',
    name: '스스로Math-AI',
    shortName: '중등 수학 AI',
    schedule: '월수목금, 주 4회',
    price: '월 150,000원',
    image: '/images/clusters/middle_math.png',
    tone: 'green',
    target: '중등 수학 전 과정을 자기 주도적으로 진행하는 과정',
    summary: 'AI를 풀이 복사 도구가 아니라 사고를 점검하는 파트너로 쓰며 중등 개념을 완성합니다.',
    features: [
      '중등 수학 전 과정 개념 학습',
      'ChatGPT를 활용한 질문과 검산 훈련',
      '막힌 문제를 끝까지 붙잡는 루틴',
      '진도와 학습 태도 기록',
    ],
  },
  {
    id: 'python-coding',
    name: '파이썬 코딩',
    shortName: '파이썬 코딩',
    schedule: '월화수목금, 주 5회',
    price: '월 150,000원',
    image: '/images/clusters/python.png',
    tone: 'red',
    target: '기초 문법에서 프로젝트 제작까지 연결하는 코딩 과정',
    summary: '문법 암기가 아니라 직접 만들고 고치며 수학적 사고와 컴퓨팅 사고를 함께 키웁니다.',
    features: [
      '초보자를 위한 파이썬 기초',
      '수학 코딩, 게임 제작, 데이터 분석',
      'ChatGPT를 활용한 디버깅 훈련',
      '매일 꾸준한 코딩 습관 형성',
    ],
  },
];

const packageCourseName = '수학+고전+코딩 통합 패키지';

const grades = ['미취학', '초1', '초2', '초3', '초4', '초5', '초6', '중1', '중2', '중3', '고등'];

const testimonials = [
  {
    text: '수학이 재밌다는 말도 자주하구요. 선생님 수업 들으면서 수학정서가 많이 좋아졌어요. 독서도 좋아하기는 했는데 퀴즈풀면서 더 재미어하는거 같아요. 본인수준에서 어려운 문제를 포기하지 않고 해내더라구요. 선생님 수업에서 하는건 유독 아이가 열심히 합니다.',
    role: '초4 학부모',
    courses: '수학과 고전읽기',
  },
  {
    text: '월간평가 4번 시도해서 100점 맞았다고 스스로도 뿌듯해하며 와서 얘기하네요^^ 그릇이 조금씩 생기는 것 같아서 기특하게 생각하고 있습니다. 우리 아이를 관찰해주셔서 감사드립니다.',
    role: '초5 학부모',
    courses: '수학과 고전읽기',
  },
  {
    text: '선생님께서 해설지를 보기 위해서는 최소 3번 풀어보게끔 하신 이유… 1회차에 69점, 풀 내용 밖도 단박에 풀리는 것만 풀고 좀 생각해야하는건다 넘겼더라고요. 제가 3번 풀어야 해설지 볼 수 있다고 가름 풀게 하니 회차 거듭할 때마다 점수가 오르니 그 과정에서 본인이 욕심이 나서 4회, 5회는 본인이 더 풀어볼게 하더라고요. 좋은 방식 같아요.😀',
    role: '초6 학부모',
    courses: '월간 성장 리포트',
  },
];

const classSchedule = [
  { time: '17:00-17:50', mon: '수학과 고전읽기', tue: '수학과 고전읽기', wed: '수학과 고전읽기', thu: '수학과 고전읽기', fri: '수학과 고전읽기' },
  { time: '19:00-19:50', mon: '파이썬 코딩', tue: '파이썬 코딩', wed: '파이썬 코딩', thu: '파이썬 코딩', fri: '파이썬 코딩' },
  { time: '20:00-20:50', mon: '스스로Math-AI', tue: '-', wed: '스스로Math-AI', thu: '스스로Math-AI', fri: '스스로Math-AI' },
  { time: '21:00-21:50', mon: '서양고전 탐구', tue: '-', wed: '서양고전 탐구', thu: '서양고전 탐구', fri: '서양고전 탐구' },
];

const learningHighlights = [
  {
    icon: Compass,
    title: '오늘 할 일이 보여요',
    body: '아이가 무엇을 공부할지 고민하지 않도록 오늘의 미션과 순서를 바로 안내합니다.',
  },
  {
    icon: Sparkles,
    title: '학습이 연결돼요',
    body: '영상·문제·오답·복습이 한 흐름으로 이어져 다음에 무엇을 해야 할지 놓치지 않습니다.',
  },
  {
    icon: Eye,
    title: '과정이 기록돼요',
    body: '부모님은 접속·과제·피드백과 매일의 변화를 결과가 아닌 과정으로 확인합니다.',
  },
];

const valueShowcases = [
  {
    eyebrow: 'Self-Directed Learning',
    title: '억지로 시키는 공부는\n오래가지 않습니다.',
    paragraphs: [
      '많은 아이들이 공부를 "해야 하니까" 하는 것으로 받아들입니다. 그 상태에서는 늘 누군가의 점검이 필요하지요. 옆에서 시켜야 하고, 확인해야 하고, 끌어줘야 합니다.',
      '메타센스가 지향하는 것은 방임이 아니라, 아이가 스스로 움직일 수 있도록 돕는 구조입니다. 오늘 무엇을 해야 하는지 알고, 어디까지 했는지 확인하고, 조금 부족해도 다시 시도할 수 있는 경험이 쌓이면 — 아이는 "나는 해볼 수 있는 아이"라는 감각을 갖게 됩니다.',
    ],
    image: '/images/features/self-directed.png',
    imageAlt: '자기주도 학습 대시보드 화면',
    reverse: false,
  },
  {
    eyebrow: 'Parent Dashboard',
    title: '부모님이 통제자가 아니라\n동반자가 되도록.',
    paragraphs: [
      '학부모 사이트에서 자녀가 지금 어떤 페이지에서 어떤 퀴즈나 영상학습을 하고 있는지 실시간으로 확인할 수 있습니다. 일일학습기록, 과제 내역, 선생님 피드백, 상세한 성장 리포트까지 모두 한눈에 볼 수 있습니다.',
      '무조건 재촉하거나 결과만 보는 것이 아니라, 아이의 흐름을 알고 적절한 시점에 응원할 수 있게 해 줍니다. 부모님의 역할이 깊이 이해하고 지지하는 동반자가 될 때, 아이는 훨씬 안정적으로 자랍니다.',
    ],
    image: '/images/features/parent-dashboard.png',
    imageAlt: '학부모 대시보드 화면',
    reverse: true,
  },
];

const faqItems = [
  ['무료체험 후 자동으로 결제되나요?', '아니요. 체험 종료 후 자동으로 유료 전환되거나 결제되지 않습니다. 계속 수강을 원할 때 별도로 신청합니다.'],
  ['일반 방문과 추천 방문의 체험 기간은 어떻게 다른가요?', '일반 신청은 7일, 확인된 추천 링크로 신청하면 4주 동안 체험할 수 있습니다.'],
  ['체험 시작일은 어떻게 정하나요?', '신청 내용을 확인한 뒤 담당자가 연락드리며, 학생 일정과 과정 운영 시간을 함께 확인해 시작일을 정합니다.'],
  ['어떤 과정을 체험할 수 있나요?', '초등 수학과 고전읽기, 서양고전 탐구, 중등 스스로Math-AI, 파이썬 코딩 중 관심 과정을 선택할 수 있습니다. 통합 패키지는 무료체험 대상이 아닙니다.'],
];

export default function PublicApplication({ fixedType }) {
  const params = useParams();
  const navigate = useNavigate();
  const type = fixedType || params.type || 'trial';
  const isTrial = type === 'trial';
  const referralToken = useMemo(() => new URLSearchParams(window.location.search).get('ref') || '', []);
  const [referralPreview, setReferralPreview] = useState(null);
  const [form, setForm] = useState({
    applicantName: '',
    parentPhone: '',
    studentName: '',
    grade: '',
    selectedCourse: '',
    preferredTime: '',
    referredStudentName: '',
    referrerParentPhone: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (!isTrial || !referralToken) return;
    let cancelled = false;
    const run = async () => {
      try {
        const preview = httpsCallable(functions, 'previewReferralInvite');
        const result = await preview({ token: referralToken });
        if (!cancelled) setReferralPreview(result.data || null);
      } catch (error) {
        if (!cancelled) {
          console.warn('Referral invite preview failed:', error);
          setReferralPreview({ valid: false });
        }
      }
    };
    run();
    return () => { cancelled = true; };
  }, [isTrial, referralToken]);

  const isReferralTrial = Boolean(referralPreview?.valid);
  const referralChecking = Boolean(isTrial && referralToken && !referralPreview);
  const heroBenefit = isReferralTrial
    ? '추천 혜택 적용 · 4주 무료체험'
    : (referralChecking ? '추천 혜택 확인 중' : '7일 무료체험');
  const heroCta = referralChecking
    ? '추천 혜택 확인 중...'
    : (isReferralTrial ? '4주 무료체험 신청하기' : '7일 무료체험 신청하기');

  const title = isTrial ? '무료체험 신청' : '전화상담 신청';
  const eyebrow = isTrial ? '1주일 무료체험' : '학부모 전화상담';
  const description = isTrial
    ? '부모님, 아이의 공부를 믿고 맡길 수 있는 환경을 찾고 계셨나요? 메타센스는 아이가 스스로 학습하는 구조를 만들고 그 과정을 투명하게 공개하여 학부모님의 불안을 신뢰로 바꿉니다.'
    : '학생의 현재 학습 상황과 관심 과정을 남겨 주시면 확인 후 연락드립니다.';

  const selectableCourses = useMemo(
    () => courseCatalog.map(c => ({ ...c })),
    []
  );

  const selectedCourse = useMemo(
    () => selectableCourses.find(course => course.name === form.selectedCourse) || null,
    [form.selectedCourse, selectableCourses]
  );

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));
  const scrollToForm = () => {
    setMobileNavOpen(false);
    document.getElementById('trial-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (referralChecking) return;
    setSubmitting(true);
    try {
      const submit = httpsCallable(functions, 'submitPublicApplication');
      await submit({
        type: isTrial ? 'trial' : 'consultation',
        ...form,
        referralToken: isReferralTrial ? referralToken : ''
      });
      setDone(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error(err);
      alert(err?.message || '신청 저장에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="public-app public-app--complete">
        <div className="public-stars" />
        <section className="complete-panel">
          <div className="complete-orbit"><ShieldCheck size={34} /></div>
          <h1>신청이 저장되었습니다</h1>
          <p>신청 내역은 메타센스 데이터베이스에 등록되었습니다. 확인 후 연락드리겠습니다.</p>
          <button type="button" onClick={() => navigate('/')}>메인으로 돌아가기</button>
        </section>
      </div>
    );
  }

  return (
    <div className="public-app">
      <div className="public-stars" />
      <header className="public-nav">
        <Link to="/" className="public-brand">
          <img src="/m-logo.svg" alt="" />
          <span>META SENSE</span>
        </Link>
        <div className="mobile-nav-actions">
          <button type="button" className="mobile-trial-cta" onClick={scrollToForm}>{isReferralTrial ? '4주 체험' : '무료체험'}</button>
          <button
            type="button"
            className="mobile-nav-toggle"
            aria-label={mobileNavOpen ? '메뉴 닫기' : '메뉴 열기'}
            aria-expanded={mobileNavOpen}
            onClick={() => setMobileNavOpen((open) => !open)}
          >
            {mobileNavOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
        <nav className={mobileNavOpen ? 'is-open' : ''}>
          <a href="#features" onClick={() => setMobileNavOpen(false)}>특징</a>
          <a href="#learning-process" onClick={() => setMobileNavOpen(false)}>학습 과정</a>
          <a href="#courses" onClick={() => setMobileNavOpen(false)}>수강료</a>
          <a href="#reviews" onClick={() => setMobileNavOpen(false)}>후기</a>
          <a href="#faq" onClick={() => setMobileNavOpen(false)}>FAQ</a>
          <Link className="nav-login" to="/" onClick={() => setMobileNavOpen(false)}>로그인</Link>
          <button className="nav-primary-cta" type="button" onClick={scrollToForm}>{title}</button>
        </nav>
      </header>

      <main>
        <section className="trial-hero">
          <div className="hero-copy">
            <div className="hero-eyebrow">{isTrial ? heroBenefit : eyebrow}</div>
            <h1><span>시키지 않아도,</span><span>스스로 공부하는 힘</span></h1>
            <p>
              초등·중등 수학과 Python을 매일 작은 단위로 학습하고,
              부모님은 접속·학습 기록과 변화 과정을 확인할 수 있습니다.
            </p>
            {isReferralTrial && (
              <div className="referral-applied-note">추천 혜택이 적용되었습니다. 일반 체험보다 긴 4주 동안 충분히 경험해 보세요.</div>
            )}
            <div className="hero-actions">
              <button type="button" onClick={scrollToForm} disabled={referralChecking}>
                {isTrial ? heroCta : title}
                <ArrowRight size={18} />
              </button>
              <a className="hero-secondary-action" href="#courses">과정과 수강료 보기</a>
            </div>
            <div className="trial-conditions">
              <span><ShieldCheck size={16} /> 자동결제 없음</span>
              <span><Calendar size={16} /> 시작일 협의</span>
              <span><ClipboardCheck size={16} /> 약 1분 신청</span>
            </div>
          </div>

          <aside className="hero-preview hero-product-preview" aria-label="메타센스 학습 화면 미리보기">
            <div className="preview-toolbar">
              <span />
              <span />
              <span />
              <strong>학생의 오늘 학습</strong>
            </div>
            <div className="product-preview-stage">
              <img className="product-preview-main" src="/images/features/self-directed.png" alt="오늘의 미션과 학습 진도가 보이는 학생 대시보드" />
              <div className="product-preview-stat">
                <Trophy size={19} />
                <span>이번 주 학습</span>
                <strong>5일 연속</strong>
              </div>
              <div className="product-preview-parent">
                <img src="/images/features/parent-dashboard.png" alt="학부모 학습 현황 화면" />
                <div><Eye size={17} /><strong>부모님도 과정을 확인해요</strong></div>
              </div>
            </div>
            <div className="preview-caption">
              <Orbit size={18} />
              <span>오늘의 미션부터 학습 기록과 부모님 확인까지 하나로 이어집니다.</span>
            </div>
          </aside>
        </section>

        <section className="section-block" id="features">
          <div className="section-heading">
            <span>Why Meta Sense</span>
            <h2>아이가 스스로 하게 되는 구조</h2>
            <p>메타센스는 오늘 할 일, 이어지는 학습, 부모님이 확인할 수 있는 기록을 하나의 흐름으로 만듭니다.</p>
          </div>
          <div className="feature-grid feature-grid--six">
            {learningHighlights.map(({ icon, title: featureTitle, body }) => (
              <article key={featureTitle} className="feature-card">
                <div>{createElement(icon, { size: 22 })}</div>
                <h3>{featureTitle}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* 가치 제안 쇼케이스 */}
        {valueShowcases.map((item, idx) => (
          <section key={idx} id={idx === 0 ? 'learning-process' : undefined} className={`value-showcase ${item.reverse ? 'value-showcase--reverse' : ''}`}>
            <div className="value-showcase__image">
              <img src={item.image} alt={item.imageAlt} />
            </div>
            <div className="value-showcase__copy">
              <span>{item.eyebrow}</span>
              <h2>{item.title.split('\n').map((line, i) => <span key={i}>{line}<br /></span>)}</h2>
              {item.paragraphs.map((p, i) => <p key={i}>{p}</p>)}
            </div>
          </section>
        ))}

        <div className="value-cta-strip">
          <p>공부는 억지와 잔소리로 오래 갈 수 없습니다.<br />학습에는 구조가 필요하고, 관계가 필요하고, 성장을 스스로 체감할 수 있는 경험이 필요합니다.</p>
          <button type="button" onClick={scrollToForm}>
            무료체험으로 직접 확인하기
            <ArrowRight size={18} />
          </button>
        </div>

        <section className="section-block" id="courses">
          <div className="section-heading">
            <span>Curriculum & Tuition</span>
            <h2>교육과정과 수강료</h2>
            <p>무료체험 신청 시 아래 과정 중 관심 과정을 선택할 수 있습니다. 실제 배정은 학생 수준과 상담 결과에 따라 조정될 수 있습니다.</p>
          </div>

          <div className="course-comparison" role="table" aria-label="과정과 수강료 비교">
            <div className="course-comparison__header" role="row">
              <span role="columnheader">과정</span><span role="columnheader">대상과 내용</span><span role="columnheader">운영</span><span role="columnheader">월 수강료</span><span />
            </div>
            {courseCatalog.map(course => (
              <div key={course.id} className="course-comparison__row" role="row">
                <strong role="cell">{course.name}</strong>
                <span role="cell">{course.target}</span>
                <span role="cell">{course.schedule}</span>
                <b role="cell">{course.price}</b>
                <button type="button" onClick={() => {
                    update('selectedCourse', course.name);
                    scrollToForm();
                  }}>
                  체험 신청
                </button>
              </div>
            ))}
          </div>
          <p className="course-footnote"><Gift size={16} /> 추천 링크로 방문하면 일반 7일 체험이 4주로 연장됩니다. 통합 패키지는 무료체험 대상이 아닙니다.</p>
        </section>

        {/* 학부모·학생 후기 */}
        <section className="section-block testimonials-section" id="reviews">
          <div className="section-heading">
            <span>Reviews</span>
            <h2>학부모·학생 후기</h2>
            <p>실제 수업에 참여한 학생과 학부모님의 솔직한 목소리입니다.</p>
          </div>
          <div className="testimonial-grid">
            {testimonials.map((t, i) => (
              <article key={i} className="testimonial-card">
                <Quote size={22} className="testimonial-quote" />
                <p>{t.text}</p>
                <footer>
                  <strong>{t.role}</strong>
                  <span>{t.courses}</span>
                </footer>
              </article>
            ))}
          </div>
        </section>

        <section className="video-section">
          <div className="section-heading">
            <span>Video Guide</span>
            <h2 className="video-title">영상으로 학습 화면과 운영 방식을 확인하세요</h2>
            <p>학생의 매일 학습이 어떻게 이어지고 부모님에게 어떤 기록이 보이는지 짧게 확인할 수 있습니다.</p>
          </div>
          <div className="video-shell">
            <iframe
              src="https://www.youtube-nocookie.com/embed/GP_Fzqr-8mE"
              title="AI시대의 새로운 학습 시스템 메타센스"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        </section>

        {/* 수업 일정 */}
        <section className="section-block schedule-section" id="schedule">
          <div className="section-heading">
            <span>Class Schedule</span>
            <h2>수업 일정</h2>
            <p>매일 정해진 시간에 함께 학습하는 온라인 학습 공동체입니다. 요일별 시간표를 확인하세요.</p>
          </div>
          <div className="schedule-table-wrap">
            <table className="schedule-table">
              <thead>
                <tr>
                  <th><Calendar size={16} /> 시간</th>
                  <th>월요일</th>
                  <th>화요일</th>
                  <th>수요일</th>
                  <th>목요일</th>
                  <th>금요일</th>
                </tr>
              </thead>
              <tbody>
                {classSchedule.map(row => (
                  <tr key={row.time}>
                    <td className="schedule-time">{row.time}</td>
                    <td className={row.mon === '-' ? 'schedule-empty' : ''}>{row.mon}</td>
                    <td className={row.tue === '-' ? 'schedule-empty' : ''}>{row.tue}</td>
                    <td className={row.wed === '-' ? 'schedule-empty' : ''}>{row.wed}</td>
                    <td className={row.thu === '-' ? 'schedule-empty' : ''}>{row.thu}</td>
                    <td className={row.fri === '-' ? 'schedule-empty' : ''}>{row.fri}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="section-block faq-section" id="faq">
          <div className="section-heading">
            <span>FAQ</span>
            <h2>무료체험 전 자주 묻는 질문</h2>
          </div>
          <div className="faq-list">
            {faqItems.map(([question, answer]) => (
              <details key={question}>
                <summary>{question}</summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="application-layout" id="trial-form">
          <div className="application-info">
            <span>Before applying</span>
            <h2>{title} 전 꼭 확인해 주세요.</h2>
            {isTrial ? (
              <div className="notice-list">
                <p><ShieldCheck size={18} /> 무료체험은 1주일 동안 제공됩니다. 누구나 신청할 수 있습니다.</p>
                <p><Gift size={18} /> 기존 수강생의 추천인 정보를 입력하시면 4주 무료체험 혜택이 주어집니다. 체험 후 자동으로 유료 전환되거나 결제되지 않습니다. (선택사항)</p>
              </div>
            ) : (
              <div className="notice-list">
                <p><MessageCircle size={18} /> 학생의 학년, 관심 과정, 상담 가능 시간을 남겨 주시면 확인 후 연락드립니다.</p>
              </div>
            )}

            <div className="selected-course-panel">
              {selectedCourse ? (
                <>
                  <span>선택 중인 과정</span>
                  <strong>{selectedCourse.name}</strong>
                  <p>{selectedCourse.target || selectedCourse.summary}</p>
                  <b>{selectedCourse.schedule} · {selectedCourse.price}</b>
                </>
              ) : (
                <>
                  <span>과정 미선택</span>
                  <strong>관심 있는 과정을 선택해 주세요</strong>
                  <p>위 교육과정에서 과정을 클릭하시거나, 우측 폼에서 직접 선택하실 수 있습니다.</p>
                </>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="application-form">
            <div className="form-title">
              <span>{isTrial ? 'Trial Application' : 'Consultation'}</span>
              <h2>{title}</h2>
              <p>{description}</p>
            </div>

            <div className="form-grid form-grid--two">
              <input value={form.applicantName} onChange={(e) => update('applicantName', e.target.value)} placeholder="학부모 이름" required />
              <input value={form.parentPhone} onChange={(e) => update('parentPhone', e.target.value)} placeholder="학부모 전화번호" inputMode="tel" required />
            </div>
            <div className="form-grid form-grid--student">
              <input value={form.studentName} onChange={(e) => update('studentName', e.target.value)} placeholder="자녀 이름" required />
              <select value={form.grade} onChange={(e) => update('grade', e.target.value)} required>
                <option value="" disabled>자녀 학년 선택</option>
                {grades.map(grade => <option key={grade} value={grade}>{grade}</option>)}
              </select>
            </div>
            <select value={form.selectedCourse} onChange={(e) => update('selectedCourse', e.target.value)} required>
              <option value="" disabled>과정을 선택해 주세요</option>
              {selectableCourses.map(course => (
                <option key={course.name} value={course.name}>{course.name}</option>
              ))}
              <option value={packageCourseName} disabled>{packageCourseName} (무료체험 불가)</option>
            </select>
            <input value={form.preferredTime} onChange={(e) => update('preferredTime', e.target.value)} placeholder="연락 가능 시간 예: 평일 14시 이후" />

            {isTrial && isReferralTrial && (
              <div className="referral-box referral-box--optional">
                <div className="referral-header">
                  <Gift size={18} />
                  <strong>추천 혜택 확인 <span className="referral-badge">4주 무료체험</span></strong>
                </div>
                <p className="referral-hint">
                  기존 수강생의 추천으로 특별히 4주 무료체험을 신청할 수 있습니다. 담당자와 시작일을 정하며, 체험 후 자동으로 유료 전환되거나 결제되지 않습니다.
                </p>
              </div>
            )}

            {isTrial && !isReferralTrial && (
              <div className="referral-box referral-box--optional">
                <div className="referral-header">
                  <Gift size={18} />
                  <strong>추천인 정보 <span className="referral-badge">선택사항</span></strong>
                </div>
                <p className="referral-hint">추천인 정보를 입력하시면 <b>4주 무료체험</b> 혜택이 주어집니다. 체험 후 계속 수강하려면 별도로 신청합니다.</p>
                <input value={form.referredStudentName} onChange={(e) => update('referredStudentName', e.target.value)} placeholder="기존 수강생(자녀) 이름" />
                <input value={form.referrerParentPhone} onChange={(e) => update('referrerParentPhone', e.target.value)} placeholder="추천인(학부모) 전화번호" inputMode="tel" />
              </div>
            )}

            <textarea value={form.message} onChange={(e) => update('message', e.target.value)} placeholder="상담이 필요한 내용 또는 학생의 학습 상황" />
            <button type="submit" disabled={submitting || referralChecking}>
              {submitting ? '저장 중...' : title}
              {!submitting && <ArrowRight size={18} />}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
