import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import {
  ArrowRight,
  BookOpen,
  Calendar,
  Check,
  Clock,
  Gift,
  GraduationCap,
  MonitorPlay,
  ShieldCheck,
  Sparkles,
  Star,
  Tent,
  Users,
  Video,
} from 'lucide-react';
import './VacationCamp.css';

const MIN_ATTENDEES = 15;

// 여름방학 특강 과정 — 1인 1과목
const COURSES = [
  {
    id: 'multiplication',
    name: '곱셈',
    schedule: '오전 9:30 ~ 10:20',
    group: 'morning',
    minGrade: '초1',
    prerequisite: null,
    desc: '구구단을 넘어 자리수 곱셈까지. 곱셈의 원리를 이해하고 유창성을 기릅니다.',
    tone: 'blue',
  },
  {
    id: 'division',
    name: '나눗셈',
    schedule: '오전 9:30 ~ 10:20',
    group: 'morning',
    minGrade: '초1',
    prerequisite: '곱셈을 익힌 학생',
    desc: '나눗셈의 의미부터 몫과 나머지까지. 곱셈과의 관계로 개념을 확장합니다.',
    tone: 'violet',
  },
  {
    id: 'fraction',
    name: '분수',
    schedule: '오전 9:30 ~ 10:20',
    group: 'morning',
    minGrade: '초2',
    prerequisite: '나눗셈을 익힌 학생',
    desc: '분수의 의미와 크기 비교, 덧셈·뺄셈까지. 나눗셈과 연결해 확실히 잡습니다.',
    tone: 'green',
  },
  {
    id: 'decimal',
    name: '소수',
    schedule: '오전 10:30 ~ 11:20',
    group: 'late',
    minGrade: '초3',
    prerequisite: '분수를 익힌 학생',
    desc: '소수의 도입부터 분수와의 관계까지. 분수와 소수를 자유롭게 오갑니다.',
    tone: 'red',
  },
  {
    id: 'ratio',
    name: '비와 비례식',
    schedule: '오전 10:30 ~ 11:20',
    group: 'late',
    minGrade: '초4',
    prerequisite: '분수·소수를 익힌 학생',
    desc: '비례 관계를 이해하고 일상의 비례식을 다룹니다. 중학교 수학의 징검다리.',
    tone: 'cyan',
  },
];

const GRADES = ['초1', '초2', '초3', '초4', '초5', '초6'];

// 메타센스 진행 방식 안내
const HOW_IT_WORKS = [
  {
    icon: MonitorPlay,
    title: '메타센스에서 스스로 학습',
    body: '매일 정해진 시간에 메타센스에 접속해 스스로 학습합니다. 학습 경로와 퀴즈, 영상으로 개념을 다지고 그 과정이 그대로 기록됩니다.',
  },
  {
    icon: Video,
    title: '화상강의실에서 실시간 일대일 지도',
    body: '혼자 해결하기 어려울 때는 언제든 화상강의실에 접속해 선생님과 일대일로 묻고 배웁니다. 막힘없이 다음으로 나아갈 수 있습니다.',
  },
  {
    icon: Calendar,
    title: '매일 50분, 3주간',
    body: '월~금 주 5회, 7/27(월)부터 8/14(금)까지 3주간 진행됩니다. 방학 동안 규칙적인 학습 루틴을 만듭니다.',
  },
  {
    icon: ShieldCheck,
    title: '수강료 무료 · 최소 15명',
    body: '이번 특강은 무료로 진행됩니다. 단, 과정별 신청자가 15명 미만일 경우 해당 과정은 폐강될 수 있습니다.',
  },
];

const CAMP_INFO = {
  period: '7월 27일(월) ~ 8월 14일(금)',
  days: '월~금, 주 5회',
  orientation: '7월 25일(토) 저녁 7:30',
  morningTime: '오전 9:30 ~ 10:20',
  lateTime: '오전 10:30 ~ 11:20',
};

export default function VacationCamp() {
  const navigate = useNavigate();
  const [counts, setCounts] = useState(null); // null = 로딩, {} = 로드됨
  const [form, setForm] = useState({
    applicantName: '',
    parentPhone: '',
    studentName: '',
    grade: '초2',
    courseId: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(null); // { courseName, count }
  const [confirmOverwrite, setConfirmOverwrite] = useState(null); // { existingCourse, newCourse } | null

  // 실시간 과정별 신청 인원 로드
  const refreshCounts = async () => {
    try {
      const getCounts = httpsCallable(functions, 'getVacationCampCounts');
      const res = await getCounts();
      setCounts(res.data?.counts || {});
    } catch (err) {
      console.error('방학특강 카운트 로드 실패', err);
      setCounts({});
    }
  };

  useEffect(() => {
    refreshCounts();
  }, []);

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));
  const scrollToForm = () => document.getElementById('vacation-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const selectCourse = (courseId) => {
    update('courseId', courseId);
    scrollToForm();
  };

  const selectedCourse = useMemo(
    () => COURSES.find(c => c.id === form.courseId) || null,
    [form.courseId]
  );

  const getCount = (courseId) => (counts && typeof counts[courseId] === 'number' ? counts[courseId] : 0);
  const gaugePercent = (courseId) => Math.min((getCount(courseId) / MIN_ATTENDEES) * 100, 100);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.courseId) {
      alert('과정을 선택해 주세요.');
      return;
    }
    setSubmitting(true);
    try {
      const submit = httpsCallable(functions, 'submitVacationCampApplication');
      const res = await submit({ ...form, overwrite: false });
      if (res.data?.success) {
        setDone({ courseName: res.data.courseName, count: res.data.count });
        await refreshCounts();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      // 중복 신청 → 덮어쓰기 확인
      if (res.data?.error === 'duplicate') {
        setConfirmOverwrite({
          existingCourse: res.data.existingCourse,
          newCourse: res.data.newCourse,
        });
        return;
      }
      alert(res.data?.message || '신청 중 오류가 발생했습니다. 다시 시도해 주세요.');
    } catch (err) {
      console.error(err);
      alert(err?.message || '신청 저장에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmOverwrite = async () => {
    const prev = confirmOverwrite;
    setConfirmOverwrite(null);
    setSubmitting(true);
    try {
      const submit = httpsCallable(functions, 'submitVacationCampApplication');
      const res = await submit({ ...form, overwrite: true });
      if (res.data?.success) {
        setDone({ courseName: res.data.courseName, count: res.data.count });
        await refreshCounts();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      alert(res.data?.message || '신청 변경 중 오류가 발생했습니다.');
    } catch (err) {
      console.error(err);
      alert(err?.message || '신청 변경에 실패했습니다.');
    } finally {
      setSubmitting(false);
      void prev;
    }
  };

  // 신청 완료 화면
  if (done) {
    const reached = done.count >= MIN_ATTENDEES;
    return (
      <div className="vacation vacation--complete">
        <div className="public-stars" />
        <section className="complete-panel">
          <div className="complete-orbit"><ShieldCheck size={34} /></div>
          <h1>신청이 완료되었습니다</h1>
          <p>
            <strong>{done.courseName}</strong> 신청이 저장되었습니다.
            현재 신청 인원 <strong>{done.count}명</strong> · 개설 기준 {MIN_ATTENDEES}명
          </p>
          {reached ? (
            <p className="complete-sub">개설 기준을 충족했습니다. 오리엔테이션({CAMP_INFO.orientation})에 안내드리겠습니다.</p>
          ) : (
            <p className="complete-sub">최소 {MIN_ATTENDEES}명이 신청되어야 과정이 개설됩니다. 주변 친구들에게도 널리 알려주세요.</p>
          )}
          <div className="complete-actions">
            <button type="button" onClick={() => navigate('/')}>메인으로</button>
            <button type="button" className="secondary" onClick={() => { setDone(null); }}>신청 내용 다시 보기</button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="vacation">
      <div className="public-stars" />

      <header className="public-nav">
        <Link to="/" className="public-brand">
          <img src="/m-logo.svg" alt="" />
          <span>META SENSE</span>
        </Link>
        <nav>
          <a href="#how">진행 방식</a>
          <a href="#courses">과정 선택</a>
          <a href="#info">안내</a>
          <button type="button" onClick={scrollToForm}>신청하기</button>
          <Link to="/">로그인</Link>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="vacation-hero">
          <div className="hero-copy">
            <div className="hero-eyebrow"><Tent size={15} /> 2026 여름방학 특강 · 초등수학</div>
            <h1>
              메타센스와 함께<br />
              수학감각을 다지는<br />
              <span className="hero-accent">여름방학 특강</span>
            </h1>
            <p>
              메타센스에서 스스로 학습하고, 모르는 것은 화상강의실에서 실시간 일대일 지도로 해결합니다.
              곱셈·나눗셈·분수·소수·비와 비례식, 3주간 매일 50분으로 초등수학의 기초를 탄탄히 다집니다.
            </p>
            <div className="hero-actions">
              <button type="button" onClick={scrollToForm}>
                수강 신청하기
                <ArrowRight size={18} />
              </button>
              <a href="#courses">과정 보기</a>
            </div>
            <div className="trial-conditions">
              <span><Check size={16} /> 수강료 무료</span>
              <span><Gift size={16} /> 1인 1과정</span>
              <span><Calendar size={16} /> 7/27(월) 개강</span>
            </div>
          </div>

          <aside className="hero-schedule-card" aria-label="특강 일정 요약">
            <div className="schedule-card-head">
              <Calendar size={20} />
              <strong>여름방학 특강 요약</strong>
            </div>
            <dl className="schedule-list">
              <div><dt>기간</dt><dd>{CAMP_INFO.period}</dd></div>
              <div><dt>요일</dt><dd>{CAMP_INFO.days}</dd></div>
              <div>
                <dt>시간</dt>
                <dd>
                  곱셈·나눗셈·분수 {CAMP_INFO.morningTime}<br />
                  소수·비와 비례식 {CAMP_INFO.lateTime}
                </dd>
              </div>
              <div className="hr" />
              <div>
                <dt><GraduationCap size={15} /> 오리엔테이션</dt>
                <dd><strong>{CAMP_INFO.orientation}</strong></dd>
              </div>
              <div><dt>수강료</dt><dd><strong className="free">무료</strong></dd></div>
            </dl>
          </aside>
        </section>

        {/* 진행 방식 */}
        <section className="section-block" id="how">
          <div className="section-heading">
            <span>How it works</span>
            <h2>메타센스로 진행합니다</h2>
            <p>스스로 학습하는 힘을 기르되, 막힐 때는 즉시 도움을 받을 수 있는 구조로 진행합니다.</p>
          </div>
          <div className="how-grid">
            {HOW_IT_WORKS.map(({ icon: Icon, title, body }) => (
              <article key={title} className="how-card">
                <div className="how-icon"><Icon size={22} /></div>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* 과정 선택 */}
        <section className="section-block" id="courses">
          <div className="section-heading">
            <span>Choose your course</span>
            <h2>과정 선택 (1인 1과목)</h2>
            <p>
              5개 과정 중 한 과목을 선택해 주세요. 학생 1인당 1과목만 신청할 수 있으며,
              과정별로 최소 {MIN_ATTENDEES}명이 신청되어야 개설됩니다.
            </p>
          </div>

          {/* 시간대 구분 배지 */}
          <div className="group-legend">
            <span className="legend-chip legend-morning"><Clock size={14} /> 1타임 · {CAMP_INFO.morningTime}</span>
            <span className="legend-chip legend-late"><Clock size={14} /> 2타임 · {CAMP_INFO.lateTime}</span>
          </div>

          <div className="course-grid">
            {COURSES.map(course => {
              const count = getCount(course.id);
              const reached = count >= MIN_ATTENDEES;
              const isSelected = form.courseId === course.id;
              return (
                <article key={course.id} className={`course-card course-card--${course.tone} ${isSelected ? 'course-card--selected' : ''}`}>
                  <div className="course-top">
                    <div className="course-name-row">
                      <h3>{course.name}</h3>
                      <span className={`time-badge time-badge--${course.group}`}>
                        {course.group === 'morning' ? '1타임' : '2타임'}
                      </span>
                    </div>
                    <p className="course-desc">{course.desc}</p>
                    <ul className="course-meta">
                      <li><Clock size={14} /> {course.schedule}</li>
                      <li><GraduationCap size={14} /> 권장 학년: {course.minGrade} 이상</li>
                      {course.prerequisite && (
                        <li className="prereq"><Check size={14} /> 선수: {course.prerequisite}</li>
                      )}
                    </ul>
                  </div>

                  <div className="course-status">
                    <div className="status-bar">
                      <div
                        className={`status-fill ${reached ? 'status-fill--reached' : ''}`}
                        style={{ width: `${counts === null ? 0 : gaugePercent(course.id)}%` }}
                      />
                    </div>
                    <div className="status-info">
                      <span className="current-count">
                        {counts === null ? '불러오는 중…' : `${count}명 신청`}
                      </span>
                      <span className="min-count">
                        {reached ? '개설 확정' : `최소 ${MIN_ATTENDEES}명`}
                      </span>
                    </div>
                  </div>

                  <button type="button" onClick={() => selectCourse(course.id)}>
                    {isSelected ? '선택됨' : '이 과정 신청'}
                    {!isSelected && <ArrowRight size={16} />}
                  </button>
                </article>
              );
            })}
          </div>
        </section>

        {/* 안내 */}
        <section className="section-block" id="info">
          <div className="section-heading">
            <span>Before you apply</span>
            <h2>신청 전 안내</h2>
          </div>
          <div className="info-grid">
            <div className="info-card">
              <div className="info-icon"><Users size={22} /></div>
              <h3>진행 방식</h3>
              <ul>
                <li>메타센스 플랫폼에서 스스로 학습</li>
                <li>화상강의실에서 실시간 일대일 질의응답</li>
                <li>과정별 최소 {MIN_ATTENDEES}명 이상 신청 시 개설</li>
                <li><strong>수강료 무료</strong></li>
              </ul>
            </div>
            <div className="info-card">
              <div className="info-icon"><MonitorPlay size={22} /></div>
              <h3>준비물</h3>
              <ul>
                <li>노트북 또는 태블릿(아이패드 등) 권장</li>
                <li>없으면 스마트폰으로도 참여 가능</li>
                <li>메타센스 접속을 위한 인터넷 환경</li>
                <li><strong>크롬 브라우저 권장</strong></li>
              </ul>
            </div>
            <div className="info-card">
              <div className="info-icon"><Calendar size={22} /></div>
              <h3>오리엔테이션</h3>
              <ul>
                <li><strong>{CAMP_INFO.orientation}</strong> 진행</li>
                <li>진행 방식과 학습 루틴 안내</li>
                <li>참석 어려우면 안내 자료 제공</li>
                <li>신청자에게 별도 링크 안내 예정</li>
              </ul>
            </div>
            <div className="info-card">
              <div className="info-icon"><BookOpen size={22} /></div>
              <h3>교재 구입</h3>
              <p>«수학감각» 교재는 스마트스토어에서 구입하실 수 있습니다. 곱셈·나눗셈·소수는 절판되어 PDF ebook 형태로 제공됩니다.</p>
              <a className="info-link-btn" href="https://smartstore.naver.com/dulcine/category/ALL?cp=1" target="_blank" rel="noreferrer">
                스마트스토어 바로가기
                <ArrowRight size={14} />
              </a>
            </div>
            <div className="info-card">
              <div className="info-icon"><Star size={22} /></div>
              <h3>방학특강 후기</h3>
              <p>이전 수강생들의 생생한 후기를 확인해 보세요.</p>
              <a className="info-link-btn" href="https://padlet.com/dulcine689/dulcine" target="_blank" rel="noreferrer">
                후기 보러가기
                <ArrowRight size={14} />
              </a>
            </div>
          </div>

          <div className="info-notice">
            <div className="info-notice-icon"><Sparkles size={20} /></div>
            <div className="info-notice-body">
              <h4>알려드립니다</h4>
              <p>
                방학 일정이 지역마다 달라 수강 기간이 맞지 않을 수 있습니다.
                여행 등으로 일부 수업에 참석 어려운 경우에도 메타센스에서 스스로 진도를 나갈 수 있습니다.
                이번 특강은 <strong>무료</strong>로 진행되며, 과정별 신청 인원이 <strong>{MIN_ATTENDEES}명 미만</strong>일 경우 해당 과정은 폐강될 수 있습니다.
              </p>
            </div>
          </div>
        </section>

        {/* 신청 폼 */}
        <section className="application-layout" id="vacation-form">
          <div className="application-info">
            <span>Vacation Camp Application</span>
            <h2>수강 신청</h2>
            <p>아래 정보를 입력해 주세요. 학생 1인당 한 과목만 신청할 수 있습니다.</p>

            <div className="selected-course-panel">
              {selectedCourse ? (
                <>
                  <span>선택한 과정</span>
                  <strong>{selectedCourse.name}</strong>
                  <p>{selectedCourse.desc}</p>
                  <b>{selectedCourse.schedule} · {CAMP_INFO.days}</b>
                </>
              ) : (
                <>
                  <span>과정 미선택</span>
                  <strong>위에서 과정을 선택해 주세요</strong>
                  <p>과정 카드의 '이 과정 신청' 버튼을 누르거나, 아래 폼에서 선택할 수 있습니다.</p>
                </>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="application-form">
            <div className="form-title">
              <span>Application</span>
              <h2>여름방학 특강 신청</h2>
              <p>학부모 연락처 기준으로 1과목만 신청됩니다.</p>
            </div>

            <div className="form-grid form-grid--two">
              <input
                value={form.applicantName}
                onChange={(e) => update('applicantName', e.target.value)}
                placeholder="학부모 이름"
                required
              />
              <input
                value={form.parentPhone}
                onChange={(e) => update('parentPhone', e.target.value)}
                placeholder="학부모 전화번호 (010-0000-0000)"
                inputMode="tel"
                required
              />
            </div>
            <div className="form-grid form-grid--student">
              <input
                value={form.studentName}
                onChange={(e) => update('studentName', e.target.value)}
                placeholder="자녀 이름"
                required
              />
              <select value={form.grade} onChange={(e) => update('grade', e.target.value)}>
                {GRADES.map(grade => <option key={grade} value={grade}>{grade}</option>)}
              </select>
            </div>
            <select value={form.courseId} onChange={(e) => update('courseId', e.target.value)} required>
              <option value="" disabled>과정을 선택해 주세요</option>
              {COURSES.map(course => (
                <option key={course.id} value={course.id}>
                  {course.name} ({course.schedule})
                </option>
              ))}
            </select>
            <textarea
              value={form.message}
              onChange={(e) => update('message', e.target.value)}
              placeholder="학생의 학습 상황이나 문의사항 (선택사항)"
            />
            <button type="submit" disabled={submitting}>
              {submitting ? '저장 중...' : '신청하기'}
              {!submitting && <ArrowRight size={18} />}
            </button>
          </form>
        </section>
      </main>

      {/* 중복(덮어쓰기) 확인 모달 */}
      {confirmOverwrite && (
        <div className="confirm-overlay" role="dialog" aria-modal="true">
          <div className="confirm-modal">
            <div className="confirm-icon"><ShieldCheck size={40} /></div>
            <h3>신청 과정 변경 확인</h3>
            <p className="confirm-main">
              이미 <strong>{confirmOverwrite.existingCourse}</strong>에 신청되어 있습니다.
            </p>
            <p className="confirm-sub">
              신청 내용을 <strong>{confirmOverwrite.newCourse}</strong>(으)로 변경하시겠습니까?
            </p>
            <div className="confirm-actions">
              <button type="button" className="secondary" onClick={() => setConfirmOverwrite(null)}>취소</button>
              <button type="button" onClick={handleConfirmOverwrite}>변경하기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
