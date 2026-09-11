import courseMusic from '../data/pythonCourseMusic.json';
import { createElement, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { httpsCallable } from 'firebase/functions'
import {
  ArrowUpRight,
  Play,
  Check,
  Code2,
  Send,
  Sparkles,
  Eye,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react'
import { functions } from '../firebase'
import './PythonEducation.css'

const courses = [
  {
    id: 'foundation',
    name: '처음 파이썬',
    label: '내 첫 코드가 그림이 되는 순간',
    desc: '거북이를 움직여 그림을 그립니다. 숫자 하나, 각도 하나를 바꾸면서 변수·반복문·함수가 하는 일을 눈으로 확인합니다.',
    concepts: ['turtle 그림', '변수와 반복', '함수'],
    question: '같은 명령을 반복하면 어떤 무늬가 생길까?',
    color: '#7ff0cd',
  },
  {
    id: 'lumi',
    name: '루미 프로토콜',
    label: '내 명령으로 움직이는 모험',
    desc: '루미에게 명령을 내리고 미션을 해결합니다. 관찰한 상황을 조건과 반복으로 표현하며, 코드가 행동으로 이어지는 원리를 배웁니다.',
    concepts: ['명령과 센서', '조건과 반복', '게임형 미션'],
    question: '루미가 스스로 판단하려면 무엇을 알려 줘야 할까?',
    color: '#a4b5ff',
  },
  {
    id: 'game',
    name: '게임 프로젝트',
    label: '플레이하는 즐거움에서 만드는 즐거움으로',
    desc: '캐릭터와 소리, 충돌과 점수를 직접 연결합니다. 작은 기능을 하나씩 완성하며 나만의 게임을 끝까지 만들어 봅니다.',
    concepts: ['pygame', '캐릭터와 충돌', '게임 완성'],
    question: '점프, 충돌, 점수는 어떤 규칙으로 연결될까?',
    color: '#ffb17e',
  },
  {
    id: 'advanced',
    name: '파이썬 심화',
    label: '여러 기능을 하나의 프로그램으로',
    desc: '함수·객체·파일을 연결해 쓸모 있는 도구를 만듭니다. 단어 카드처럼 직접 사용할 수 있는 프로그램으로 설계와 데이터 처리의 기초를 익힙니다.',
    concepts: ['함수와 객체', '화면과 버튼', '파일과 데이터'],
    question: '한 번 만든 기능을 여러 곳에서 쓸 수 있을까?',
    color: '#ffc968',
  },
  {
    id: 'math',
    name: '파이썬 수학',
    label: '공식을 외우기 전에, 변화를 관찰해요',
    desc: '자료를 모아 도수와 확률을 계산하고 함수 그래프를 그립니다. 값을 바꿔 실험하며 수학적 관계를 코드와 그림으로 설명합니다.',
    concepts: ['NumPy · pandas', '그래프와 통계', '확률 실험'],
    question: '기울기 하나를 바꾸면 그래프는 어떻게 달라질까?',
    color: '#6fdaff',
  },
  {
    id: 'algorithm',
    name: '생각의 항로',
    label: '규칙을 발견하고, 알고리즘으로 설명하기',
    desc: '먼저 관찰하고 예측합니다. 규칙을 발견하면 코드로 표현하고 다른 입력에서도 맞는지 검증합니다. 정답뿐 아니라 생각의 과정을 훈련합니다.',
    concepts: ['사고 실험', '패턴 발견', '알고리즘 검증'],
    question: '내가 찾은 규칙은 다른 경우에도 맞을까?',
    color: '#dfb1ff',
  },
]
const grades = [
  '초1',
  '초2',
  '초3',
  '초4',
  '초5',
  '초6',
  '중1',
  '중2',
  '중3',
  '고등',
  '그 외',
]

function PythonTrialForm() {
  const token = new URLSearchParams(window.location.search).get('ref') || ''
  const [referral, setReferral] = useState(null)
  const [form, setForm] = useState({
    applicantName: '',
    parentPhone: '',
    studentName: '',
    grade: '',
    preferredTime: '',
    message: '',
  })
  const [agreed, setAgreed] = useState(false)
  const [state, setState] = useState('idle')
  const [error, setError] = useState('')
  const locked = useRef(false)
  useEffect(() => {
    if (!token) return
    let active = true
    httpsCallable(
      functions,
      'previewReferralInvite',
    )({ token })
      .then(({ data }) => {
        if (active) setReferral(data)
      })
      .catch(() => {
        if (active) setReferral({ valid: false })
      })
    return () => {
      active = false
    }
  }, [token])
  const checking = Boolean(token && !referral)
  const update = (e) =>
    setForm((old) => ({ ...old, [e.target.name]: e.target.value }))
  async function submit(e) {
    e.preventDefault()
    if (locked.current || checking || !agreed) return
    if (!/^0\d{9,10}$/.test(form.parentPhone.replace(/\D/g, ''))) {
      setError('연락받을 전화번호를 다시 확인해 주세요.')
      return
    }
    locked.current = true
    setState('sending')
    setError('')
    try {
      await httpsCallable(
        functions,
        'submitPublicApplication',
      )({
        ...form,
        type: 'trial',
        selectedCourse: '파이썬 코딩',
        message: `[파이썬 전용 소개 페이지]\n${form.message}`.slice(0, 1000),
        referralToken: referral?.valid ? token : '',
      })
      setState('done')
    } catch (failure) {
      setError(
        failure.message ||
          '신청을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.',
      )
      setState('idle')
    } finally {
      locked.current = false
    }
  }
  if (state === 'done')
    return (
      <div className="pe-form pe-success" role="status">
        <Check size={42} />
        <h3>파이썬 체험 신청이 접수되었습니다.</h3>
        <p>
          담당자가 연락드려 학생의 경험과 일정을 확인하고 체험 시작을
          안내합니다.
        </p>
        <a href="#courses">
          과정 영상 더 보기 <ArrowUpRight size={18} />
        </a>
      </div>
    )
  return (
    <form className="pe-form" onSubmit={submit} aria-busy={state === 'sending'}>
      <div className="pe-form-top">
        <span>PYTHON TRIAL</span>
        <strong>
          {checking
            ? '추천 혜택 확인 중'
            : referral?.valid
              ? '추천 혜택 · 4주 무료체험'
              : '7일 무료체험'}
        </strong>
      </div>
      <h3>아이의 첫 시작을 알려 주세요.</h3>
      <p>
        신청 과정은 <b>파이썬 코딩</b>으로 선택되어 있습니다.
      </p>
      <div className="pe-fields">
        <label>
          학부모 이름
          <input
            name="applicantName"
            autoComplete="name"
            value={form.applicantName}
            onChange={update}
            maxLength={80}
            required
          />
        </label>
        <label>
          연락받을 전화번호
          <input
            name="parentPhone"
            type="tel"
            autoComplete="tel"
            placeholder="010-0000-0000"
            value={form.parentPhone}
            onChange={update}
            maxLength={20}
            required
          />
        </label>
        <label>
          학생 이름
          <input
            name="studentName"
            value={form.studentName}
            onChange={update}
            maxLength={80}
            required
          />
        </label>
        <label>
          학생 학년
          <select name="grade" value={form.grade} onChange={update} required>
            <option value="">선택해 주세요</option>
            {grades.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
        </label>
      </div>
      <label>
        연락 가능한 시간 <span>(선택)</span>
        <input
          name="preferredTime"
          value={form.preferredTime}
          onChange={update}
          placeholder="예: 평일 오후 5시 이후"
          maxLength={80}
        />
      </label>
      <label>
        코딩 경험이나 궁금한 점 <span>(선택)</span>
        <textarea
          name="message"
          value={form.message}
          onChange={update}
          placeholder="처음 시작해요 / 스크래치를 배웠어요 / 수학에 관심이 많아요"
          maxLength={900}
          rows={3}
        />
      </label>
      <label className="pe-consent">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          required
        />
        <span>
          체험 안내를 위한 개인정보 수집·이용에 동의합니다.{' '}
          <Link to="/privacy" target="_blank" rel="noopener noreferrer">
            개인정보 처리방침
          </Link>
        </span>
      </label>
      {error && (
        <p className="pe-form-error" role="alert">
          {error}
        </p>
      )}
      <button
        className="pe-cta"
        disabled={state === 'sending' || checking}
        type="submit"
      >
        {state === 'sending'
          ? '신청을 접수하고 있습니다…'
          : '파이썬 무료체험 신청하기'}
        <ArrowRight size={20} />
      </button>
      <small>
        접수 확인 후 시작일을 안내합니다. 체험 후 자동 결제되지 않습니다.
      </small>
    </form>
  )
}

export default function PythonEducation() {
  const [selected, setSelected] = useState(0)
  const [gamePlaying, setGamePlaying] = useState(false)
  const course = courses[selected]
  const video = useRef(null)
  useEffect(() => {
    const previous = document.title
    const existing = document.querySelector('meta[name="description"]')
    const description = existing || document.createElement('meta')
    const previousDescription = description.getAttribute('content')
    description.name = 'description'
    description.content =
      '그림과 게임에서 수학과 알고리즘까지. 메타센스 코드 스튜디오로 직접 만들며 사고력을 기르는 초·중등 파이썬 교육. 여섯 과정의 실제 시연 영상을 보고 무료체험을 신청하세요.'
    if (!existing) document.head.appendChild(description)
    document.title = '메타센스 파이썬 | 직접 만들며 기르는 사고력 · 무료체험'
    return () => {
      document.title = previous
      if (!existing) description.remove()
      else if (previousDescription === null)
        description.removeAttribute('content')
      else description.content = previousDescription
    }
  }, [])
  function select(index, reveal = false) {
    video.current?.pause()
    setSelected(index)
    setGamePlaying(false)
    if (reveal) requestAnimationFrame(() => {
      document.getElementById('course-video-player')?.scrollIntoView({ block: 'nearest', behavior: 'instant' })
    })
  }
  return (
    <main className="python-education">
      <header className="pe-nav">
        <Link className="pe-brand" to="/">
          <img src="/m-logo.svg" alt="" />
          METASENSE <span>PYTHON</span>
        </Link>
        <nav aria-label="파이썬 과정 안내">
          <a href="#courses">학습 과정</a>
          <a href="#learning">학습 관리</a>
          <a className="pe-cta pe-cta-small" href="#apply">
            무료체험 신청 <ArrowUpRight size={17} />
          </a>
        </nav>
      </header>
      <section className="pe-hero pe-wrap">
        <div className="pe-hero-copy">
          <div className="pe-eyebrow">
            <span />
            초·중등 파이썬, 메타센스에서
          </div>
          <h1>
            게임을 하던 아이가,
            <br />
            <em>규칙을 만드는 아이로.</em>
          </h1>
          <p>
            그림을 그리고, 게임을 만들고, 수학을 실험합니다.
            <br />내 생각을 코드로 옮기고 결과를 확인하는 경험.
            <br />
            메타센스는 그 과정에서 생각하는 힘을 기릅니다.
          </p>
          <div className="pe-hero-actions">
            <a className="pe-cta" href="#apply">
              우리 아이, 무료로 시작하기 <ArrowUpRight size={21} />
            </a>
            <a className="pe-watch" href="#courses">
              <Play size={17} fill="currentColor" />
              소개 영상 6편 둘러보기
            </a>
          </div>
          <div className="pe-reassurance">
            <span>
              <Check size={16} />
              코딩을 몰라도 시작
            </span>
            <span>
              <Check size={16} />
              설치 없이 브라우저에서
            </span>
            <span>
              <Check size={16} />
              자동 결제 없음
            </span>
          </div>
        </div>
        <a
          href="#courses"
          className="pe-hero-visual"
          aria-label="실제 수업 화면과 과정 영상 보기"
        >
          <div className="pe-windowbar">
            <span />
            <span />
            <span />
            <b>METASENSE / CODE STUDIO</b>
          </div>
          <img
            src="/python-showcase/foundation-screen.webp"
            alt="코드 스튜디오에서 파이썬 코드를 작성하고 거북이 그림을 실행하는 시연"
            fetchPriority="high"
          />
          <div className="pe-visual-caption">
            <Code2 size={20} />
            <span>아이의 생각이, 눈앞의 결과로.</span>
            <Play size={28} fill="currentColor" />
          </div>
        </a>
      </section>
      <section className="pe-method">
        <div className="pe-wrap">
          <p className="pe-eyebrow">WHY PYTHON, WHY NOW</p>
          <div className="pe-method-head">
            <h2>
              AI가 코드를 쓰는 시대.
              <br />
              아이는 <em>어떤 생각</em>을 배워야 할까요?
            </h2>
            <p>
              무엇을 만들지 정하고, 문제를 작은 단계로 나누고,
              <br />
              나온 결과가 맞는지 판단하는 힘.
              <br />
              문법을 익히는 데서 출발해, 스스로 해결하는 경험으로 이어집니다.
            </p>
          </div>
          <ol className="pe-thinking">
            {[
              ['관찰', '무엇이 달라졌지?'],
              ['예측', '이렇게 바꾸면?'],
              ['코드', '내 생각을 표현하고'],
              ['실험', '실행해서 확인하고'],
              ['설명', '왜 그런지 말해요'],
            ].map(([a, b], i) => (
              <li key={a}>
                <span>0{i + 1}</span>
                <strong>{a}</strong>
                <p>{b}</p>
              </li>
            ))}
          </ol>
          <a
            className="pe-text-link"
            href="https://blog.naver.com/changkh/224391623211"
            target="_blank"
            rel="noopener noreferrer"
          >
            메타센스의 코딩 교육 이야기 읽기 <ArrowUpRight size={16} />
          </a>
        </div>
      </section>
      <section className="pe-courses pe-wrap" id="courses">
        <div className="pe-section-head">
          <div>
            <p className="pe-eyebrow">ONE JOURNEY, SIX CHAPTERS</p>
            <h2>
              여섯 가지 배움,
              <br />
              영상으로 먼저 만나 보세요.
            </h2>
          </div>
          <p>
            그림부터 게임, 수학과 알고리즘까지.
            <br />서로 다른 6편의 실제 시연을 순서대로 살펴보세요.
          </p>
        </div>
        <div className="pe-video-collection-heading" id="course-videos">
          <strong><Play size={18} fill="currentColor" /> 소개 영상 <b>6편</b></strong>
          <span>썸네일을 선택하면 아래 영상이 바뀝니다.</span>
        </div>
        <ol className="pe-course-rail" aria-label="소개 영상 6편 · 학습 순서">
          {courses.map((c, i) => (
            <li key={c.id}>
              <button
                aria-pressed={selected === i}
                aria-label={`${i + 1}번 영상: ${c.name}`}
                aria-controls="course-video-player"
                onClick={() => select(i, true)}
                style={{ '--course-color': c.color }}
              >
                <span className="pe-video-thumb">
                  <img src={`/python-showcase/${c.id}-poster.webp`} alt="" loading="lazy" />
                  <span className="pe-thumb-play"><Play size={19} fill="currentColor" /></span>
                  <span className="pe-thumb-duration">{c.id === 'game' ? '게임 시연' : '0:57'}</span>
                </span>
                <span className="pe-video-card-title"><small>0{i + 1}</small><strong>{c.name}</strong></span>
                <span className="pe-video-card-status">{selected === i ? '선택한 영상' : '영상 살펴보기'}</span>
              </button>
            </li>
          ))}
        </ol>
        <div
          className="pe-course-feature"
          style={{ '--course-color': course.color }}
        >
          <div className="pe-course-copy">
            <span className="pe-chapter">CHAPTER 0{selected + 1}</span>
            <h3>{course.name}</h3>
            <h4>{course.label}</h4>
            <p>{course.desc}</p>
            <div className="pe-tags">
              {course.concepts.map((t) => (
                <span key={t}>{t}</span>
              ))}
            </div>
            <blockquote>“{course.question}”</blockquote>
          </div>
          <div className="pe-course-video" id="course-video-player">
            <div className="pe-player-heading" aria-live="polite">
              <span>영상 <b>{selected + 1} / {courses.length}</b></span>
              <strong>{course.name}</strong>
              <a href="#course-videos">6편 목록</a>
            </div>
            {course.id === 'game' ? (
              gamePlaying ? (
                <iframe
                  src="https://www.youtube-nocookie.com/embed/xVBNU8vHoW4?autoplay=1&rel=0"
                  title="게임 프로젝트 소개 영상"
                  allow="autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <button
                  className="pe-video-cover"
                  onClick={() => setGamePlaying(true)}
                >
                  <img
                    src="/python-showcase/game-poster.webp"
                    alt="직접 만드는 게임 프로젝트 미리보기"
                  />
                  <span>
                    <Play size={24} fill="currentColor" />
                    게임 프로젝트 영상 보기
                  </span>
                </button>
              )
            ) : (
              <video
                ref={video}
                key={course.id}
                controls
                playsInline
                preload="none"
                poster={`/python-showcase/${course.id}-poster.webp`}
                aria-label={`${course.name} 1분 소개 영상`}
              >
                <source
                  src={`/python-showcase/${course.id}.mp4?v=music-2`}
                  type="video/mp4"
                />
                <track
                  kind="captions"
                  src={`/python-showcase/${course.id}.vtt?v=music-2`}
                  srcLang="ko"
                  label="한국어"
                />
                동영상을 재생할 수 없습니다.
              </video>
            )}
            <p>
              {course.id === 'game' ? (
                <a
                  href="https://youtu.be/xVBNU8vHoW4"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  YouTube에서 보기 ↗
                </a>
              ) : (
                '1분 이내 · 한국어 설명 + 배경음악 · 실제 기능 시연'
              )}
            </p>
            <nav className="pe-video-navigation" aria-label="다른 소개 영상 보기">
              <button onClick={() => select(selected - 1)} disabled={selected === 0} aria-label="이전 영상 보기">
                <ArrowLeft size={17} /><span>이전 영상</span>
              </button>
              <button className="pe-next-video" onClick={() => select((selected + 1) % courses.length)}>
                <span><small>{selected === courses.length - 1 ? '다시 둘러보기' : '다음 영상 보기'}</small><strong>{courses[(selected + 1) % courses.length].name}</strong></span>
                <ArrowRight size={20} />
              </button>
            </nav>
          </div>
        </div>
      </section>
      <section className="pe-learning" id="learning">
        <div className="pe-wrap">
          <div className="pe-section-head">
            <div>
              <p className="pe-eyebrow">LEARNING YOU CAN SEE</p>
              <h2>
                만들고 끝나지 않도록.
                <br />
                배움의 과정까지 연결합니다.
              </h2>
            </div>
            <p>
              학생은 오늘의 생각을 남기고,
              <br />
              학부모는 연결된 자녀의 학습을 확인합니다.
            </p>
          </div>
          <div className="pe-learning-grid">
            {[
              [
                Code2,
                '01 / 직접 실행',
                '메타센스 코드 스튜디오',
                '설치 없이 브라우저에서 코드를 쓰고 실행합니다. 파일과 이미지를 올리고, 오류를 고치며 결과를 바로 확인합니다.',
              ],
              [
                Send,
                '02 / 과제 제출',
                '내 코드와 생각을 함께',
                '코드 스튜디오의 .py 파일을 과제에 첨부하고 오늘 배운 내용을 정리합니다. 완성 결과와 해결 과정을 함께 남깁니다.',
              ],
              [
                Sparkles,
                '03 / 평가와 피드백',
                'AI 분석 + 선생님의 확인',
                'AI가 코드와 학습 기록 분석을 돕습니다. 선생님이 확인한 피드백으로 잘한 점과 보완할 점을 짚고 다음 시도로 이어 갑니다.',
              ],
              [
                Eye,
                '04 / 학부모 확인',
                '배움의 변화가 보이는 기록',
                '학부모 계정에서 연결된 자녀의 실시간 학습 활동, 출석, 과제 제출 내역과 공개된 평가·피드백을 확인할 수 있습니다.',
              ],
            ].map(([Icon, kicker, title, description]) => (
              <article key={title}>
                {createElement(Icon, { size: 30 })}
                <span>{kicker}</span>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
          <div className="pe-parent-note">
            <Eye size={24} />
            <p>
              <strong>“오늘 뭐 배웠어?”라는 질문에, 기록이 함께합니다.</strong>
              <br />
              실행 결과 → 과제 → 피드백 → 다음 도전. 학생의 학습 흐름을 부모님과
              함께 봅니다.
            </p>
          </div>
        </div>
      </section>
      <section className="pe-apply pe-wrap" id="apply">
        <div className="pe-apply-copy">
          <p className="pe-eyebrow">LET’S WRITE THE FIRST LINE</p>
          <h2>
            우리 아이의 가능성,
            <br />
            <em>첫 실행에서</em>
            <br />
            발견해 보세요.
          </h2>
          <p>
            코딩을 처음 만나도 괜찮습니다.
            <br />
            학생의 경험을 확인하고 알맞은 시작 단계를 안내합니다.
          </p>
          <ul>
            <li>
              <Check size={18} />
              처음 배우는 학생도 참여할 수 있어요.
            </li>
            <li>
              <Check size={18} />
              인터넷이 연결된 컴퓨터로 학습해요.
            </li>
            <li>
              <Check size={18} />
              신청 확인 후 일정과 시작 방법을 안내해요.
            </li>
          </ul>
          <div className="pe-faq">
            <details>
              <summary>파이썬을 미리 설치해야 하나요?</summary>
              <p>
                코드 스튜디오는 브라우저에서 실행합니다. 키보드와 마우스를
                사용할 수 있는 컴퓨터를 권장합니다.
              </p>
            </details>
            <details>
              <summary>여섯 과정을 한 번에 배우나요?</summary>
              <p>
                처음 파이썬부터 생각의 항로까지 순서대로 진행합니다. 학생의
                경험과 이해 정도를 확인하며 학습합니다.
              </p>
            </details>
            <details>
              <summary>체험 뒤 자동 결제되나요?</summary>
              <p>
                아니요. 체험 종료 후 자동 결제되지 않습니다. 계속 수강을 원할 때
                별도로 신청합니다.
              </p>
            </details>
          </div>
        </div>
        <PythonTrialForm />
      </section>
      <div className="pe-video-credits pe-wrap">
        <p>새 과정 영상은 시연용 예제로 촬영했습니다. 각 과정에 서로 다른 배경음악을 사용했습니다.</p>
        <details>
          <summary>과정별 음악 출처</summary>
          <ul>
            {Object.entries(courseMusic).map(([id, music]) => (
              <li key={id}>
                {music.course}: <a href={music.page} target="_blank" rel="noopener noreferrer">{music.title}</a>
                {' · '}Kevin MacLeod (incompetech.com)
              </li>
            ))}
          </ul>
          <p><a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a> · 발췌·페이드·음량 조정. 게임 프로젝트는 기존 영상의 음악을 유지합니다.</p>
        </details>
      </div>
      <footer className="pe-footer pe-wrap">
        <Link className="pe-brand" to="/">
          METASENSE <span>PYTHON</span>
        </Link>
        <span>아이의 생각이 자라는 코드 한 줄.</span>
        <div>
          <Link to="/trial">전체 과정 보기</Link>
          <Link to="/privacy">개인정보 처리방침</Link>
        </div>
      </footer>
      <a className="pe-mobile-apply" href="#apply">
        파이썬 무료체험 신청 <ArrowUpRight size={18} />
      </a>
    </main>
  )
}
