import { useEffect, useMemo, useState } from 'react';
import { collection, documentId, getDocs, query, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { AlertTriangle, CalendarDays, CheckCircle2, Crown, Edit3, RefreshCw, RotateCcw, Save, Sparkles, Trash2, Users, X, XCircle } from 'lucide-react';
import { db, functions } from '../../firebase';
import { STUDY_CREW_DAILY_MISSIONS, STUDY_CREW_MISSION_MAX_LENGTH, getStudyCrewMissionForDate, getTodayStudyCrewMissionKey } from '../../components/Space/studyCrewMissionDefaults';

function statusLabel(status) {
  if (status === 'approved') return '승인 완료';
  if (status === 'rejected') return '반려';
  return '승인 대기';
}

function statusColor(status) {
  if (status === 'approved') return '#22c55e';
  if (status === 'rejected') return '#ef4444';
  return '#f59e0b';
}

function uniqueValues(values = []) {
  return Array.from(new Set(values.filter(Boolean)));
}

function getPreferredProfileName(profile = {}, fallback = '') {
  return [
    profile.publicDisplayName,
    profile.studentName,
    profile.name,
    profile.displayName,
    fallback,
  ]
    .map(value => String(value || '').trim())
    .find(Boolean) || '';
}

function getCrewMemberIdsForAdmin(crew) {
  return uniqueValues([
    ...(Array.isArray(crew.memberIds) ? crew.memberIds : []),
    ...(Array.isArray(crew.members) ? crew.members.map(member => member?.uid) : []),
    crew.leaderId,
  ]);
}

async function loadMemberProfiles(crews = []) {
  const memberIds = uniqueValues(crews.flatMap(getCrewMemberIdsForAdmin));
  if (!memberIds.length) return new Map();

  const profileMap = new Map();
  for (let i = 0; i < memberIds.length; i += 30) {
    const chunk = memberIds.slice(i, i + 30);
    const snap = await getDocs(query(collection(db, 'users'), where(documentId(), 'in', chunk)));
    snap.docs.forEach(userDoc => {
      const data = userDoc.data() || {};
      profileMap.set(userDoc.id, {
        uid: userDoc.id,
        displayName: getPreferredProfileName(data),
        publicDisplayName: data.publicDisplayName || '',
        studentName: data.studentName || '',
        name: data.name || '',
        email: data.email || '',
        crewRole: data.crewRole || '',
        currentStreak: data.currentStreak || 0,
        lastStreakDate: data.lastStreakDate || '',
      });
    });
  }

  return profileMap;
}

async function hydrateCrewProfiles(crews = []) {
  const profileMap = await loadMemberProfiles(crews);
  return crews.map(crew => {
    const existingMembers = Array.isArray(crew.members) ? crew.members.filter(Boolean) : [];
    const existingById = new Map(existingMembers.map(member => [member.uid, member]));
    const memberIds = getCrewMemberIdsForAdmin(crew);
    const members = memberIds.map(uid => {
      const profile = profileMap.get(uid) || {};
      const existing = existingById.get(uid) || {};
      const displayName = getPreferredProfileName(profile, getPreferredProfileName(existing, uid === crew.leaderId ? crew.leaderName : ''));
      return {
        ...existing,
        ...profile,
        uid,
        displayName,
        crewRole: uid === crew.leaderId ? 'leader' : (profile.crewRole || existing.crewRole || 'member'),
      };
    });

    return {
      ...crew,
      memberIds,
      members,
      memberCount: crew.memberCount || memberIds.length,
      leaderName: getPreferredProfileName(profileMap.get(crew.leaderId), crew.leaderName || crew.leaderId || ''),
    };
  });
}

function getCrewMembers(crew) {
  const members = Array.isArray(crew.members) ? crew.members.filter(Boolean) : [];
  const fallbackMembers = members.length
    ? members
    : (Array.isArray(crew.memberIds) ? crew.memberIds : []).map(uid => ({
      uid,
      studentName: uid === crew.leaderId ? crew.leaderName : '',
      crewRole: uid === crew.leaderId ? 'leader' : '',
    }));

  const withLeaderFallback = fallbackMembers.length || !crew.leaderId
    ? fallbackMembers
    : [{ uid: crew.leaderId, studentName: crew.leaderName || '', crewRole: 'leader' }];

  return [...withLeaderFallback].sort((a, b) => {
    if (a.uid === crew.leaderId) return -1;
    if (b.uid === crew.leaderId) return 1;
    return 0;
  });
}

function getMemberName(member) {
  return getPreferredProfileName(member) || '이름 없음';
}

function RejectModal({ crew, onConfirm, onCancel, busy }) {
  const [reason, setReason] = useState('');

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
    }} onClick={onCancel}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 460,
          background: '#0f172a', border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 14, padding: '1.8rem',
          boxShadow: '0 8px 40px rgba(0,0,0,0.5)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
          <AlertTriangle size={20} style={{ color: '#ef4444' }} />
          <h3 style={{ margin: 0, color: '#fecaca', fontSize: '1.15rem' }}>크루 반려</h3>
          <div style={{ flex: 1 }} />
          <button onClick={onCancel} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '0.8rem', borderRadius: 8, background: 'rgba(255,255,255,0.04)', marginBottom: '1rem', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ color: '#e2e8f0', fontWeight: 600 }}>"{crew?.name}"</div>
          <div style={{ color: '#94a3b8', fontSize: '0.88rem', marginTop: '0.25rem' }}>{crew?.motto || '모토 없음'} · 리더: {crew?.leaderName || '-'}</div>
        </div>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.2rem' }}>
          <span style={{ color: '#fca5a5', fontWeight: 600, fontSize: '0.9rem' }}>반려 사유 *</span>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="크루 이름이 부적절합니다. 학습 관련 이름으로 수정해주세요."
            maxLength={200}
            rows={3}
            disabled={busy}
            style={{
              width: '100%', boxSizing: 'border-box',
              borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)',
              background: 'rgba(15,23,42,0.9)', color: '#e2e8f0',
              padding: '0.75rem', outline: 'none', resize: 'vertical',
              fontFamily: 'inherit', fontSize: '0.95rem', lineHeight: 1.5
            }}
          />
          <span style={{ color: '#64748b', fontSize: '0.8rem', textAlign: 'right' }}>{reason.length}/200</span>
        </label>

        <div style={{ display: 'flex', gap: '0.7rem', justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            disabled={busy}
            style={{ padding: '0.7rem 1.2rem', borderRadius: 8, background: '#1e293b', color: '#94a3b8', border: '1px solid #334155', cursor: 'pointer' }}
          >
            취소
          </button>
          <button
            onClick={() => onConfirm(reason.trim())}
            disabled={busy || !reason.trim()}
            style={{
              padding: '0.7rem 1.2rem', borderRadius: 8,
              background: !reason.trim() ? '#450a0a66' : '#450a0a', color: '#fee2e2',
              border: '1px solid #ef444455', cursor: reason.trim() ? 'pointer' : 'not-allowed',
              display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600
            }}
          >
            <XCircle size={16} /> {busy ? '처리 중...' : '반려 확정'}
          </button>
        </div>
      </div>
    </div>
  );
}

function DailyMissionManager() {
  const [dateKey, setDateKey] = useState(() => getTodayStudyCrewMissionKey());
  const [form, setForm] = useState(() => {
    const mission = getStudyCrewMissionForDate(getTodayStudyCrewMissionKey());
    return { missionId: mission.id, category: mission.category, title: mission.title, prompt: mission.prompt };
  });
  const [plan, setPlan] = useState(null);
  const [effectiveMission, setEffectiveMission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');

  const defaultMission = useMemo(() => getStudyCrewMissionForDate(dateKey), [dateKey]);
  const hasAdminPlan = !!plan && plan.disabled !== true;
  const isDisabled = plan?.disabled === true;

  const loadMission = async (nextDateKey = dateKey) => {
    setLoading(true);
    setMessage('');
    try {
      const fn = httpsCallable(functions, 'getStudyCrewMissionAdmin');
      const result = await fn({ dateKey: nextDateKey });
      const data = result?.data || {};
      const nextPlan = data.plan || null;
      const nextMission = data.mission || data.defaultMission || getStudyCrewMissionForDate(nextDateKey);
      setPlan(nextPlan);
      setEffectiveMission(nextMission);
      if (nextMission?.disabled) {
        setForm({ missionId: `admin_${nextDateKey}`, category: '운영 미션', title: '', prompt: '' });
      } else {
        setForm({
          missionId: nextMission.id || nextMission.missionId || `admin_${nextDateKey}`,
          category: nextMission.category || '운영 미션',
          title: nextMission.title || '',
          prompt: nextMission.prompt || '',
        });
      }
    } catch (err) {
      console.error('Failed to load daily mission:', err);
      const fallback = getStudyCrewMissionForDate(nextDateKey);
      setPlan(null);
      setEffectiveMission(fallback);
      setForm({ missionId: fallback.id, category: fallback.category, title: fallback.title, prompt: fallback.prompt });
      setMessage('미션 정보를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMission(dateKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateKey]);

  const applyTemplate = (mission) => {
    setForm({
      missionId: mission.id,
      category: mission.category,
      title: mission.title,
      prompt: mission.prompt,
    });
    setMessage('후보 미션을 입력창에 불러왔습니다. 저장해야 적용됩니다.');
  };

  const handleSave = async () => {
    const title = form.title.trim();
    const prompt = form.prompt.trim();
    if (!title || !prompt) {
      setMessage('제목과 설명을 입력해주세요.');
      return;
    }
    setBusy('save');
    setMessage('');
    try {
      const fn = httpsCallable(functions, 'saveStudyCrewMissionAdmin');
      await fn({
        dateKey,
        missionId: form.missionId || `admin_${dateKey}`,
        category: form.category || '운영 미션',
        title,
        prompt,
      });
      setMessage('오늘의 미션을 저장했습니다.');
      await loadMission(dateKey);
    } catch (err) {
      console.error('Failed to save daily mission:', err);
      setMessage(err?.message || '오늘의 미션 저장에 실패했습니다.');
    } finally {
      setBusy('');
    }
  };

  const handleDisable = async () => {
    if (!window.confirm(`${dateKey} 오늘의 미션을 삭제하고 학생 화면에서 숨길까요?`)) return;
    setBusy('disable');
    setMessage('');
    try {
      const fn = httpsCallable(functions, 'deleteStudyCrewMissionAdmin');
      await fn({ dateKey, mode: 'disable' });
      setMessage('오늘의 미션을 삭제했습니다. 학생 화면에서는 보이지 않습니다.');
      await loadMission(dateKey);
    } catch (err) {
      console.error('Failed to disable daily mission:', err);
      setMessage(err?.message || '오늘의 미션 삭제에 실패했습니다.');
    } finally {
      setBusy('');
    }
  };

  const handleRestoreDefault = async () => {
    if (!window.confirm(`${dateKey} 운영자 설정을 지우고 기본 순환 미션으로 복구할까요?`)) return;
    setBusy('default');
    setMessage('');
    try {
      const fn = httpsCallable(functions, 'deleteStudyCrewMissionAdmin');
      await fn({ dateKey, mode: 'default' });
      setMessage('기본 순환 미션으로 복구했습니다.');
      await loadMission(dateKey);
    } catch (err) {
      console.error('Failed to restore default daily mission:', err);
      setMessage(err?.message || '자동 추천 미션 복구에 실패했습니다.');
    } finally {
      setBusy('');
    }
  };

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <section className="admin-card" style={{ padding: '1.2rem', borderRadius: 12, background: 'rgba(15,23,42,0.78)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={20} style={{ color: '#38bdf8' }} /> 오늘의 미션
            </h2>
            <p style={{ margin: '0.45rem 0 0', color: '#94a3b8', lineHeight: 1.55 }}>
              모든 일반 스터디 크루와 오픈 스터디 방에 표시되는 날짜별 미션을 관리합니다.
            </p>
          </div>
          <label style={{ display: 'grid', gap: '0.35rem', minWidth: 180 }}>
            <span style={{ color: '#cbd5e1', fontSize: '0.86rem', fontWeight: 700 }}>적용 날짜</span>
            <input
              type="date"
              value={dateKey}
              onChange={(e) => setDateKey(e.target.value)}
              style={{ background: '#0f172a', color: '#fff', border: '1px solid #334155', borderRadius: 8, padding: '0.65rem 0.75rem' }}
            />
          </label>
        </div>

        <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(230px, 100%), 1fr))', gap: '0.8rem' }}>
          <div style={{ padding: '0.9rem', borderRadius: 10, background: 'rgba(2,6,23,0.5)', border: '1px solid rgba(148,163,184,0.16)' }}>
            <div style={{ color: '#38bdf8', fontWeight: 800, fontSize: '0.82rem', marginBottom: '0.35rem' }}>현재 적용 상태</div>
            <div style={{ color: isDisabled ? '#fca5a5' : '#f8fafc', fontWeight: 800, lineHeight: 1.4 }}>
              {loading ? '조회 중...' : isDisabled ? '미션 삭제됨' : effectiveMission?.title || '-'}
            </div>
            <div style={{ color: '#94a3b8', fontSize: '0.86rem', lineHeight: 1.55, marginTop: '0.4rem' }}>
              {isDisabled ? '학생 화면에서 오늘의 미션이 숨겨집니다.' : effectiveMission?.prompt || '미션 설명 없음'}
            </div>
            <div style={{ color: hasAdminPlan ? '#fde68a' : '#86efac', fontSize: '0.78rem', marginTop: '0.55rem', fontWeight: 700 }}>
              {isDisabled ? '운영자 삭제 상태' : hasAdminPlan ? '운영자 지정 미션' : '자동 추천 미션'}
            </div>
          </div>

          <div style={{ padding: '0.9rem', borderRadius: 10, background: 'rgba(2,6,23,0.5)', border: '1px solid rgba(148,163,184,0.16)' }}>
            <div style={{ color: '#38bdf8', fontWeight: 800, fontSize: '0.82rem', marginBottom: '0.35rem' }}>자동 추천 후보</div>
            <div style={{ color: '#f8fafc', fontWeight: 800 }}>{defaultMission.title}</div>
            <div style={{ color: '#94a3b8', fontSize: '0.86rem', lineHeight: 1.55, marginTop: '0.4rem' }}>{defaultMission.prompt}</div>
            <button
              type="button"
              className="admin-btn secondary"
              onClick={() => applyTemplate(defaultMission)}
              style={{ marginTop: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <Edit3 size={15} /> 입력칸에 불러오기
            </button>
          </div>
        </div>
      </section>

      <section className="admin-card" style={{ padding: '1.2rem', borderRadius: 12, background: 'rgba(15,23,42,0.78)' }}>
        <h3 style={{ margin: '0 0 0.9rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <CalendarDays size={18} style={{ color: '#38bdf8' }} /> 미션 입력/수정
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))', gap: '0.8rem' }}>
          <label style={{ display: 'grid', gap: '0.35rem' }}>
            <span style={{ color: '#cbd5e1', fontSize: '0.86rem', fontWeight: 700 }}>카테고리</span>
            <input
              value={form.category}
              onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value.slice(0, 40) }))}
              style={{ background: '#0f172a', color: '#fff', border: '1px solid #334155', borderRadius: 8, padding: '0.7rem 0.8rem' }}
              placeholder="아이스브레이킹"
            />
          </label>
          <label style={{ display: 'grid', gap: '0.35rem' }}>
            <span style={{ color: '#cbd5e1', fontSize: '0.86rem', fontWeight: 700 }}>제목</span>
            <input
              value={form.title}
              onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value.slice(0, 50) }))}
              style={{ background: '#0f172a', color: '#fff', border: '1px solid #334155', borderRadius: 8, padding: '0.7rem 0.8rem' }}
              placeholder="오늘의 목표"
            />
          </label>
        </div>
        <label style={{ display: 'grid', gap: '0.35rem', marginTop: '0.8rem' }}>
          <span style={{ color: '#cbd5e1', fontSize: '0.86rem', fontWeight: 700 }}>학생에게 보일 설명</span>
          <textarea
            value={form.prompt}
            onChange={(e) => setForm(prev => ({ ...prev, prompt: e.target.value.slice(0, 180) }))}
            rows={3}
            style={{ background: '#0f172a', color: '#fff', border: '1px solid #334155', borderRadius: 8, padding: '0.75rem 0.8rem', resize: 'vertical', lineHeight: 1.5 }}
            placeholder="오늘 같이 공부하는 멤버에게 짧은 응원 한마디를 남겨보세요."
          />
          <span style={{ color: '#64748b', fontSize: '0.78rem', textAlign: 'right' }}>{form.prompt.length}/180 · 학생 답변은 {STUDY_CREW_MISSION_MAX_LENGTH}자 제한</span>
        </label>
        <div style={{ display: 'flex', gap: '0.55rem', flexWrap: 'wrap', marginTop: '1rem' }}>
          <button type="button" className="admin-btn primary" onClick={handleSave} disabled={!!busy || !form.title.trim() || !form.prompt.trim()} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <Save size={15} /> {busy === 'save' ? '저장 중...' : '저장 / 교체'}
          </button>
          <button type="button" className="admin-btn secondary" onClick={() => loadMission(dateKey)} disabled={!!busy || loading} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <RefreshCw size={15} /> 다시 불러오기
          </button>
          <button type="button" className="admin-btn secondary" onClick={handleRestoreDefault} disabled={!!busy} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <RotateCcw size={15} /> 자동 추천 미션 복구
          </button>
          <button type="button" className="admin-btn danger" onClick={handleDisable} disabled={!!busy} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <Trash2 size={15} /> 오늘 미션 삭제
          </button>
        </div>
        {message && (
          <div style={{ marginTop: '0.8rem', color: message.includes('실패') || message.includes('못했') ? '#fca5a5' : '#86efac', fontSize: '0.9rem' }}>
            {message}
          </div>
        )}
      </section>

      <section className="admin-card" style={{ padding: '1.2rem', borderRadius: 12, background: 'rgba(15,23,42,0.78)' }}>
        <h3 style={{ margin: '0 0 0.9rem' }}>미션 후보 목록</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(240px, 100%), 1fr))', gap: '0.7rem' }}>
          {STUDY_CREW_DAILY_MISSIONS.map((mission) => (
            <button
              key={mission.id}
              type="button"
              onClick={() => applyTemplate(mission)}
              style={{
                textAlign: 'left',
                padding: '0.85rem',
                borderRadius: 10,
                border: '1px solid rgba(148,163,184,0.18)',
                background: 'rgba(2,6,23,0.48)',
                color: '#e2e8f0',
                cursor: 'pointer',
              }}
            >
              <div style={{ color: '#38bdf8', fontSize: '0.78rem', fontWeight: 800 }}>{mission.category}</div>
              <div style={{ color: '#f8fafc', fontWeight: 800, marginTop: '0.25rem' }}>{mission.title}</div>
              <div style={{ color: '#94a3b8', fontSize: '0.84rem', lineHeight: 1.45, marginTop: '0.35rem' }}>{mission.prompt}</div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

export default function CrewApproval() {
  const [crews, setCrews] = useState([]);
  const [busyId, setBusyId] = useState('');
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [activeTab, setActiveTab] = useState('approval');

  useEffect(() => {
    let cancelled = false;

    async function loadCrews() {
      setLoading(true);
      try {
        const listStudyCrews = httpsCallable(functions, 'listStudyCrews');
        const result = await listStudyCrews();
        const hydratedCrews = await hydrateCrewProfiles(result?.data?.crews || []);
        if (cancelled) return;
        setCrews(hydratedCrews);
      } catch (err) {
        console.error('Failed to load crews:', err);
        if (!cancelled) setCrews([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadCrews();
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleCrews = useMemo(() => {
    if (filter === 'all') return crews;
    return crews.filter(crew => (crew.status || 'pending') === filter);
  }, [crews, filter]);

  const refreshCrews = async () => {
    const listStudyCrews = httpsCallable(functions, 'listStudyCrews');
    const result = await listStudyCrews();
    const hydratedCrews = await hydrateCrewProfiles(result?.data?.crews || []);
    setCrews(hydratedCrews);
  };

  const approveCrew = async (crew) => {
    setBusyId(crew.id);
    try {
      const reviewStudyCrew = httpsCallable(functions, 'reviewStudyCrew');
      await reviewStudyCrew({ crewId: crew.id, action: 'approve' });
      await refreshCrews();
    } catch (err) {
      console.error('Failed to approve crew:', err);
      alert('크루 승인 처리에 실패했습니다.');
    } finally {
      setBusyId('');
    }
  };

  const handleReject = async (reason) => {
    if (!rejectTarget || !reason) return;
    setBusyId(rejectTarget.id);
    try {
      const reviewStudyCrew = httpsCallable(functions, 'reviewStudyCrew');
      await reviewStudyCrew({ crewId: rejectTarget.id, action: 'reject', rejectionReason: reason });
      setRejectTarget(null);
      await refreshCrews();
    } catch (err) {
      console.error('Failed to reject crew:', err);
      alert('크루 반려 처리에 실패했습니다: ' + (err?.message || ''));
    } finally {
      setBusyId('');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ margin: 0 }}>스터디 크루 관리</h1>
          <p style={{ margin: '0.45rem 0 0', color: '#94a3b8' }}>
            크루 승인과 전체 스터디 크루에 적용되는 오늘의 미션을 관리합니다.
          </p>
        </div>
        {activeTab === 'approval' && (
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{ background: '#0f172a', color: '#fff', border: '1px solid #334155', borderRadius: 8, padding: '0.7rem 0.85rem' }}
          >
            <option value="pending">승인 대기</option>
            <option value="approved">승인 완료</option>
            <option value="rejected">반려</option>
            <option value="all">전체</option>
          </select>
        )}
      </div>

      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '1.2rem' }}>
        <button
          type="button"
          className={`admin-btn ${activeTab === 'approval' ? 'primary' : 'secondary'}`}
          onClick={() => setActiveTab('approval')}
        >
          크루 승인
        </button>
        <button
          type="button"
          className={`admin-btn ${activeTab === 'missions' ? 'primary' : 'secondary'}`}
          onClick={() => setActiveTab('missions')}
        >
          오늘의 미션
        </button>
      </div>

      {activeTab === 'missions' ? (
        <DailyMissionManager />
      ) : (
        <>
          <div style={{ display: 'grid', gap: '1rem' }}>
        {loading && (
          <div className="admin-card" style={{ padding: '1.2rem', color: '#94a3b8' }}>
            크루 정보를 불러오는 중...
          </div>
        )}

        {!loading && visibleCrews.length === 0 && (
          <div className="admin-card" style={{ padding: '1.2rem', color: '#94a3b8' }}>
            표시할 크루가 없습니다.
          </div>
        )}

        {visibleCrews.map(crew => {
          const status = crew.status || 'pending';
          const members = getCrewMembers(crew);
          const memberCount = crew.memberCount || members.length || crew.memberIds?.length || 1;
          return (
            <div
              key={crew.id}
              className="admin-card"
              style={{
                padding: '1.2rem',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 12,
                background: 'rgba(15, 23, 42, 0.78)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <span style={{ width: 14, height: 14, borderRadius: 4, background: crew.color || '#00d4ff', display: 'inline-block' }} />
                    <h2 style={{ margin: 0, fontSize: '1.25rem' }}>{crew.name}</h2>
                    <span style={{ color: statusColor(status), fontWeight: 700 }}>{statusLabel(status)}</span>
                  </div>
                  <p style={{ margin: '0.55rem 0 0', color: '#cbd5e1' }}>{crew.motto || '모토 없음'}</p>
                  <div style={{ marginTop: '0.7rem', color: '#94a3b8', fontSize: '0.9rem' }}>
                    리더: {crew.leaderName || crew.leaderId || '-'} · 군집: {crew.groupName || crew.clusterName || '자유 스터디'} · 멤버 {memberCount}명 · 초대코드 {crew.inviteCode || '-'}
                  </div>

                  <div style={{ marginTop: '0.9rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#e2e8f0', fontSize: '0.88rem', fontWeight: 700, marginBottom: '0.55rem' }}>
                      <Users size={16} /> 크루 멤버 전체
                    </div>
                    {members.length === 0 ? (
                      <div style={{ color: '#64748b', fontSize: '0.88rem' }}>멤버 정보가 없습니다.</div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px, 100%), 1fr))', gap: '0.5rem' }}>
                        {members.map(member => {
                          const isLeader = member.uid === crew.leaderId || member.crewRole === 'leader';
                          return (
                            <div
                              key={member.uid}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.55rem',
                                minWidth: 0,
                                padding: '0.58rem 0.7rem',
                                borderRadius: 8,
                                background: 'rgba(15,23,42,0.72)',
                                border: '1px solid rgba(148,163,184,0.18)',
                              }}
                            >
                              {isLeader ? <Crown size={15} style={{ color: '#facc15', flex: '0 0 auto' }} /> : <Users size={15} style={{ color: '#38bdf8', flex: '0 0 auto' }} />}
                              <div style={{ minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                  <span style={{ color: '#f8fafc', fontWeight: 700, overflowWrap: 'anywhere' }}>{getMemberName(member)}</span>
                                  <span style={{ color: isLeader ? '#fde68a' : '#bae6fd', fontSize: '0.76rem', fontWeight: 700 }}>
                                    {isLeader ? '리더' : '멤버'}
                                  </span>
                                </div>
                                <div style={{ color: '#94a3b8', fontSize: '0.78rem', overflowWrap: 'anywhere' }}>
                                  UID {member.uid}{member.email ? ` · ${member.email}` : ''}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Show rejection reason if rejected */}
                  {status === 'rejected' && crew.rejectionReason && (
                    <div style={{
                      marginTop: '0.8rem', padding: '0.7rem 0.9rem', borderRadius: 8,
                      background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)'
                    }}>
                      <div style={{ color: '#fca5a5', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.2rem' }}>반려 사유</div>
                      <div style={{ color: '#fecaca', fontSize: '0.9rem', lineHeight: 1.5 }}>{crew.rejectionReason}</div>
                    </div>
                  )}
                </div>

                <div style={{ color: '#38bdf8', fontSize: '0.9rem' }}>
                  Study Stream 정원 {crew.studyRoomCapacity || 3}명
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))', gap: '0.7rem', alignItems: 'center', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => approveCrew(crew)}
                  disabled={busyId === crew.id}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#14532d', color: '#dcfce7', border: '1px solid #22c55e55', borderRadius: 8, padding: '0.75rem 0.9rem', cursor: 'pointer' }}
                >
                  <CheckCircle2 size={17} /> 승인
                </button>
                <button
                  type="button"
                  onClick={() => setRejectTarget(crew)}
                  disabled={busyId === crew.id}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#450a0a', color: '#fee2e2', border: '1px solid #ef444455', borderRadius: 8, padding: '0.75rem 0.9rem', cursor: 'pointer' }}
                >
                  <XCircle size={17} /> 반려
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Rejection reason modal */}
      {rejectTarget && (
        <RejectModal
          crew={rejectTarget}
          onConfirm={handleReject}
          onCancel={() => setRejectTarget(null)}
          busy={!!busyId}
        />
      )}
        </>
      )}
    </div>
  );
}
