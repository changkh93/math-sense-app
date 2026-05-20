import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  BrainCircuit,
  Calendar,
  Check,
  ClipboardCheck,
  Code2,
  Compass,
  Eye,
  FileText,
  Gift,
  Heart,
  Lock,
  MessageCircle,
  Orbit,
  Quote,
  ShieldCheck,
  Sparkles,
  Star,
  Trophy,
  UserRoundCheck,
  Users,
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

const packageCourse = {
  name: '수학+고전+코딩 통합 패키지',
  schedule: '과정별 참여',
  originalPrice: '월 450,000원',
  price: '월 250,000원',
  summary: '수학, 읽기, 코딩을 따로 떼어 배우지 않고 하나의 학습 루틴으로 연결합니다.',
};

const grades = ['미취학', '초1', '초2', '초3', '초4', '초5', '초6', '중1', '중2', '중3', '고등'];

const testimonials = [
  {
    text: '매번 수업 시간마다 느끼는 건, 선생님께서 얼마나 진심으로 저와 학생들을 생각하시는지입니다. 단순히 지식을 전달하는 걸 넘어서, 삶의 태도와 방향까지도 함께 알려 주시는 선생님은 저에겐 참 존경합니다. 때론 유쾌하게, 때론 진지하게 해주시는 말씀 하나하나가 저에겐 깊이 남습니다.',
    role: '중1 학생',
    courses: '파이썬 프로그래밍, 스스로Math-AI',
  },
  {
    text: '벌써 선생님께 배운 지 6개월이나 됐다는 게 믿기지 않아요. 처음에는 잘 할 수 있을까 걱정도 많았는데, 선생님이 늘 따뜻하게 알려주시고 응원해 주신 덕분에 재미있게 배우고 꾸준히 이어올 수 있었던 것 같아요.',
    role: '초4 학생',
    courses: '수학과 고전읽기, 파이썬 프로그래밍',
  },
  {
    text: '수학이 재밌다는 말도 자주하구요. 선생님 수업 들으면서 수학정서가 많이 좋아졌어요. 독서도 좋아하기는 했는데 퀴즈풀면서 더 재미어하는거 같아요. 본인수준에서 어려운 문제를 포기하지 않고 해내더라구요. 선생님 수업에서 하는건 유독 아이가 열심히 합니다.',
    role: '초4 학부모',
    courses: '수학과 고전읽기',
  },
  {
    text: '워킹맘이다 보니 아이는 어른의 감시(?)가 없이 수업을 듣고 있습니다. 집중을 안하는것 같아서 걱정이 있었는데, 배운것을 이해하고 있는것 같아 다행입니다. 어제 선생님 문자 받고 칭찬 많이 해줬습니다^^',
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
    icon: Sparkles,
    title: '스스로 움직이는 힘을 키웁니다',
    body: '시켜서 하는 공부는 오래가지 않습니다. 오늘 무엇을 해야 하는지 알고, 해냈다는 감각을 스스로 쌓아 가는 구조를 만들었습니다.',
  },
  {
    icon: Eye,
    title: '과정이 보이니까 불안이 줄어듭니다',
    body: '시험 점수만 보이던 학습에서 벗어나, 하루의 기록과 축적된 성장 리포트를 통해 부모님이 아이의 흐름을 읽을 수 있게 합니다.',
  },
  {
    icon: Users,
    title: '함께 가는 친구가 있으면 더 버팁니다',
    body: '혼자가 아니라 스터디 크루와 아고라 커뮤니티 속에서 서로 자극하고 용기를 주는 학습 공동체를 경험합니다.',
  },
  {
    icon: ClipboardCheck,
    title: '과제와 피드백이 방향을 만들어 줍니다',
    body: '"잘했어"를 넘어서 구체적인 피드백이 아이에게 방향감을 심어 줍니다. 방향이 있는 공부는 지치지 않습니다.',
  },
  {
    icon: UserRoundCheck,
    title: '학부모가 직접 확인하는 자녀 학습',
    body: '실시간으로 자녀가 어떤 페이지에서 학습 중인지, 오늘 과제는 했는지, 선생님 피드백은 무엇인지 학부모 사이트에서 확인합니다.',
  },
  {
    icon: Trophy,
    title: '건강한 랭킹이 도전 의지를 깨웁니다',
    body: '남과 비교하는 경쟁이 아니라, 어제의 나보다 나아지고 싶어지는 자극. 공부를 눈에 보이게 만들어 도전하고 싶은 마음을 키웁니다.',
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
    eyebrow: 'Study Crew & Agora',
    title: '혼자가 아니라\n함께 가는 공부.',
    paragraphs: [
      '자기주도 학습은 혼자만의 고독한 싸움으로 길러지지 않습니다. 아이들은 어른의 말보다 또래의 분위기에서 더 큰 영향을 받기도 합니다. 함께 가는 친구들이 있을 때, 조금 더 버티고, 조금 더 해보려고 합니다.',
      '스터디 크루에서 서로의 꾸준함이 기준이 되고, 아고라에서 질문하고 나누며 자기 생각을 내어놓는 경험을 합니다. 누군가의 기록이 다른 아이에게 자극이 되고, 누군가의 질문이 또 다른 아이의 생각을 깨웁니다.',
    ],
    image: '/images/features/crew-agora.png',
    imageAlt: '스터디 크루와 아고라 커뮤니티',
    reverse: true,
  },
  {
    eyebrow: 'Daily Record & Growth Report',
    title: '과정이 기록되니까\n성장이 보입니다.',
    paragraphs: [
      '많은 부모님들이 답답함을 느끼는 이유는 "결과는 보이는데 과정은 보이지 않기 때문"입니다. 점수는 보이지만, 그 점수가 나오기까지 아이가 얼마나 애썼는지, 어떤 부분에서 나아지고 있는지는 잘 드러나지 않지요.',
      '메타센스는 이 과정을 기록합니다. 일일학습기록으로 하루의 학습이 남고, 그 축적이 상세한 성장 리포트로 이어집니다. 학생에게는 "나는 조금씩 나아지고 있어"라는 증거가 생기고, 부모님에게는 불안 대신 관찰과 이해의 근거가 생깁니다.',
    ],
    image: '/images/features/growth-report.png',
    imageAlt: '학생 성장 리포트 화면',
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

export default function PublicApplication({ fixedType }) {
  const params = useParams();
  const navigate = useNavigate();
  const type = fixedType || params.type || 'trial';
  const isTrial = type === 'trial';
  const [form, setForm] = useState({
    applicantName: '',
    parentPhone: '',
    studentName: '',
    grade: '초4',
    selectedCourse: '',
    preferredTime: '',
    referredStudentName: '',
    referrerParentPhone: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

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
  const scrollToForm = () => document.getElementById('trial-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const submit = httpsCallable(functions, 'submitPublicApplication');
      await submit({ type: isTrial ? 'trial' : 'consultation', ...form });
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
        <nav>
          <a href="#features">특징</a>
          <a href="#courses">과정과 수강료</a>
          <a href="#reviews">후기</a>
          <a href="#schedule">수업 일정</a>
          <button type="button" onClick={scrollToForm}>{title}</button>
          <Link to="/">로그인</Link>
        </nav>
      </header>

      <main>
        <section className="trial-hero">
          <div className="hero-copy">
            <div className="hero-eyebrow">{eyebrow}</div>
            <h1>우리 아이가 스스로 공부하는 힘을 키울 수 있을까요?</h1>
            <p>
              시켜야만 하는 공부는 오래가지 않습니다. 메타센스는 아이가 매일 접속해 스스로 학습하고,
              그 과정이 기록되고, 부모님이 실시간으로 확인할 수 있는 학습 환경입니다.
              과정을 보실 수 있으니 불안 대신 신뢰가 생깁니다.
            </p>
            <div className="hero-actions">
              <button type="button" onClick={scrollToForm}>
                {title}
                <ArrowRight size={18} />
              </button>
              <a href="#courses">과정과 수강료 보기</a>
            </div>
            <div className="trial-conditions">
              <span><Check size={16} /> 1주일 무료체험</span>
              <span><Gift size={16} /> 추천인 입력 시 1달 무료</span>
              <span><Check size={16} /> 신청 후 확인 연락</span>
            </div>
          </div>

          <aside className="hero-preview" aria-label="메타센스 화면 미리보기">
            <div className="preview-toolbar">
              <span />
              <span />
              <span />
              <strong>Meta Sense</strong>
            </div>
            <img src="/images/features/planet-map.png" alt="메타센스 행성 학습 화면 미리보기" />
            <div className="preview-caption">
              <Orbit size={18} />
              <span>우주 탐험형 인터페이스 안에서 학생의 학습 경로와 기록이 이어집니다.</span>
            </div>
          </aside>
        </section>

        <section className="section-block" id="features">
          <div className="section-heading">
            <span>Why Meta Sense</span>
            <h2>학부모님이 메타센스를 선택하는 이유</h2>
            <p>
              공부는 결국 자기 인식의 변화에서부터 달라집니다.
              "나는 안 되는 아이"가 아니라 "나는 해볼 수 있는 아이"라는 감각을 만들어 주는 것,
              그것이 메타센스가 하려는 일입니다.
            </p>
          </div>
          <div className="feature-grid feature-grid--six">
            {learningHighlights.map(({ icon: Icon, title: featureTitle, body }) => (
              <article key={featureTitle} className="feature-card">
                <div><Icon size={22} /></div>
                <h3>{featureTitle}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* 가치 제안 쇼케이스 */}
        {valueShowcases.map((item, idx) => (
          <section key={idx} className={`value-showcase ${item.reverse ? 'value-showcase--reverse' : ''}`}>
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

        {/* 일일학습기록 & 랭킹 미리보기 */}
        <section className="dual-preview-section">
          <div className="dual-preview-card">
            <img src="/images/features/daily-learning.png" alt="일일학습기록 화면" />
            <div className="dual-preview-label">
              <BarChart3 size={18} />
              <strong>일일학습기록</strong>
              <p>퀴즈 완료, 영상 학습, 집중도, 연속 학습일 — 하루의 모든 학습이 기록됩니다.</p>
            </div>
          </div>
          <div className="dual-preview-card">
            <img src="/images/features/ranking-system.png" alt="성장 랭킹 화면" />
            <div className="dual-preview-label">
              <Trophy size={18} />
              <strong>성장 랭킹</strong>
              <p>남과 비교하지 않고, 어제의 나와 비교합니다. 도전의 문화가 자연스럽게 자랍니다.</p>
            </div>
          </div>
        </section>

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

          <div className="course-grid">
            {courseCatalog.map(course => (
              <article key={course.id} className={`course-card course-card--${course.tone}`}>
                <img src={course.image} alt="" />
                <div className="course-body">
                  <h3>{course.name}</h3>
                  <p>{course.summary}</p>
                  <ul>
                    {course.features.map(feature => (
                      <li key={feature}><Check size={16} /> {feature}</li>
                    ))}
                  </ul>
                  <div className="course-price">
                    <span>{course.schedule}</span>
                    <strong>{course.price}</strong>
                  </div>
                  <button type="button" onClick={() => {
                    update('selectedCourse', course.name);
                    scrollToForm();
                  }}>
                    이 과정으로 체험 신청
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="package-section">
          <div className="package-bg" />
          <div className="package-content">
            <span>Recommended Package</span>
            <h2>{packageCourse.name}</h2>
            <p>{packageCourse.summary}</p>
            <div className="package-pill-row">
              <div><BookOpen size={22} /><strong>고전 읽기</strong><span>깊이 있는 사고와 배경지식</span></div>
              <div><BrainCircuit size={22} /><strong>수학</strong><span>개념, 논리, 문제 해결</span></div>
              <div><Code2 size={22} /><strong>파이썬 코딩</strong><span>컴퓨팅 사고와 창작</span></div>
            </div>
            <div className="package-price">
              <span>{packageCourse.originalPrice}</span>
              <strong>{packageCourse.price}</strong>
            </div>
            <div className="package-notice">
              <Lock size={16} />
              <span>통합 패키지는 무료체험 대상이 아닙니다. 개별 과정을 먼저 체험해 보세요.</span>
            </div>
          </div>
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

        <section className="application-layout" id="trial-form">
          <div className="application-info">
            <span>Before applying</span>
            <h2>{title} 전 꼭 확인해 주세요.</h2>
            {isTrial ? (
              <div className="notice-list">
                <p><ShieldCheck size={18} /> 무료체험은 1주일 동안 제공됩니다. 누구나 신청할 수 있습니다.</p>
                <p><Gift size={18} /> 기존 수강생의 추천인 정보를 입력하시면 1달 무료체험 혜택이 주어집니다. (선택사항)</p>
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
              <select value={form.grade} onChange={(e) => update('grade', e.target.value)}>
                {grades.map(grade => <option key={grade} value={grade}>{grade}</option>)}
              </select>
            </div>
            <select value={form.selectedCourse} onChange={(e) => update('selectedCourse', e.target.value)} required>
              <option value="" disabled>과정을 선택해 주세요</option>
              {selectableCourses.map(course => (
                <option key={course.name} value={course.name}>{course.name}</option>
              ))}
              <option value={packageCourse.name} disabled>{packageCourse.name} (무료체험 불가)</option>
            </select>
            <input value={form.preferredTime} onChange={(e) => update('preferredTime', e.target.value)} placeholder="연락 가능 시간 예: 평일 14시 이후" />

            {isTrial && (
              <div className="referral-box referral-box--optional">
                <div className="referral-header">
                  <Gift size={18} />
                  <strong>추천인 정보 <span className="referral-badge">선택사항</span></strong>
                </div>
                <p className="referral-hint">추천인 정보를 입력하시면 <b>1달 무료체험</b> 혜택이 주어집니다.</p>
                <input value={form.referredStudentName} onChange={(e) => update('referredStudentName', e.target.value)} placeholder="기존 수강생(자녀) 이름" />
                <input value={form.referrerParentPhone} onChange={(e) => update('referrerParentPhone', e.target.value)} placeholder="추천인(학부모) 전화번호" inputMode="tel" />
              </div>
            )}

            <textarea value={form.message} onChange={(e) => update('message', e.target.value)} placeholder="상담이 필요한 내용 또는 학생의 학습 상황" />
            <button type="submit" disabled={submitting}>
              {submitting ? '저장 중...' : title}
              {!submitting && <ArrowRight size={18} />}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
