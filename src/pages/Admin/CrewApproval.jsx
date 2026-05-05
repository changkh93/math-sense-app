import { useEffect, useMemo, useState } from 'react';
import { collection, documentId, getDocs, query, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { CheckCircle2, XCircle, AlertTriangle, X, Users, Crown } from 'lucide-react';
import { db, functions } from '../../firebase';

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

export default function CrewApproval() {
  const [crews, setCrews] = useState([]);
  const [busyId, setBusyId] = useState('');
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [rejectTarget, setRejectTarget] = useState(null);

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
          <h1 style={{ margin: 0 }}>스터디 크루 승인</h1>
          <p style={{ margin: '0.45rem 0 0', color: '#94a3b8' }}>
            생성 요청을 승인하면 PeerJS 기반 Study Stream 집중방을 열 수 있습니다.
          </p>
        </div>
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
      </div>

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
    </div>
  );
}
