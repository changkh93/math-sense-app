import { useCallback, useEffect, useMemo, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebase';

const STATUS_LABELS = { clear: '자동 인정', review: '검토 필요', excluded: '이벤트 제외' };

function formatTime(ms) {
  if (!ms) return '-';
  return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(ms));
}

export default function CrewGuestManager() {
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState('');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const fn = httpsCallable(functions, 'adminListCrewGuestAccounts');
      const result = await fn({});
      setGuests(result.data?.guests || []);
    } catch (err) {
      alert(err?.message || '게스트 계정을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const visible = useMemo(() => guests.filter((guest) => {
    if (filter === 'eligible' && !guest.eventEligible) return false;
    if (filter === 'review' && guest.eventReviewStatus !== 'review') return false;
    if (filter === 'excluded' && guest.eventReviewStatus !== 'excluded') return false;
    if (filter === 'deleted' && guest.status !== 'deleted') return false;
    if (filter === 'suspended' && guest.status !== 'suspended') return false;
    if (filter !== 'deleted' && guest.status === 'deleted') return false;
    const q = search.trim().toLowerCase();
    return !q || `${guest.alias} ${guest.crewName} ${guest.uid} ${guest.referrerStudentUid}`.toLowerCase().includes(q);
  }), [filter, guests, search]);

  const review = async (guestUid, status) => {
    setAction(guestUid);
    try {
      const fn = httpsCallable(functions, 'adminReviewCrewGuestAccount');
      await fn({ guestUid, status });
      await load();
    } catch (err) {
      alert(err?.message || '검토 상태를 변경하지 못했습니다.');
    } finally {
      setAction('');
    }
  };

  const remove = async (guest) => {
    if (!window.confirm(`${guest.alias} 게스트의 익명 로그인 계정을 삭제할까요?\n이벤트 인원에서도 즉시 제외됩니다.`)) return;
    setAction(guest.uid);
    try {
      const fn = httpsCallable(functions, 'adminDeleteCrewGuestAccount');
      await fn({ guestUid: guest.uid });
      await load();
    } catch (err) {
      alert(err?.message || '게스트 계정을 삭제하지 못했습니다.');
    } finally {
      setAction('');
    }
  };

  const toggleSuspended = async (guest) => {
    const suspended = guest.status !== 'suspended';
    if (suspended && !window.confirm(`${guest.alias} 게스트 로그인을 정지할까요?\n현재 접속이 종료되고 이벤트 인원에서 제외됩니다.`)) return;
    setAction(guest.uid);
    try {
      const fn = httpsCallable(functions, 'adminSetCrewGuestSuspended');
      await fn({ guestUid: guest.uid, suspended });
      await load();
    } catch (err) {
      alert(err?.message || '게스트 계정 상태를 변경하지 못했습니다.');
    } finally {
      setAction('');
    }
  };

  const stats = {
    active: guests.filter((g) => g.status === 'active').length,
    suspended: guests.filter((g) => g.status === 'suspended').length,
    eligible: guests.filter((g) => g.status !== 'deleted' && g.eventEligible).length,
    review: guests.filter((g) => g.status !== 'deleted' && g.eventReviewStatus === 'review').length,
    excluded: guests.filter((g) => g.eventReviewStatus === 'excluded').length,
  };

  return (
    <div style={{ color: 'white' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 22 }}>
        <div>
          <div style={{ color: '#67e8f9', fontWeight: 900, letterSpacing: 1, fontSize: 12 }}>CREW GUEST AUDIT</div>
          <h1 style={{ margin: '7px 0' }}>게스트 회원 관리</h1>
          <p style={{ color: '#94a3b8', margin: 0 }}>활동 게스트 판정, 중복·부정 신호 검토와 익명 계정 삭제를 관리합니다.</p>
        </div>
        <button onClick={load} disabled={loading} style={{ padding: '10px 14px', borderRadius: 9, border: '1px solid #22d3ee55', background: '#0e749033', color: '#67e8f9', cursor: 'pointer' }}>{loading ? '동기화 중…' : '새로 고침'}</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 10, marginBottom: 18 }}>
        {[['활성 게스트', stats.active], ['자동 인정', stats.eligible], ['검토 필요', stats.review], ['로그인 정지', stats.suspended], ['제외/삭제', stats.excluded]].map(([label, value]) => (
          <div key={label} style={{ padding: 15, borderRadius: 12, background: '#0f172acc', border: '1px solid #ffffff12' }}><div style={{ color: '#94a3b8', fontSize: 12 }}>{label}</div><strong style={{ display: 'block', fontSize: 26, marginTop: 5 }}>{value}</strong></div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap', marginBottom: 16 }}>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="별칭·크루·UID 검색" style={{ flex: '1 1 260px', padding: '10px 12px', borderRadius: 9, border: '1px solid #ffffff1f', background: '#111827', color: 'white' }} />
        <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ padding: '10px 12px', borderRadius: 9, border: '1px solid #ffffff1f', background: '#111827', color: 'white' }}>
          <option value="all">삭제 제외 전체</option><option value="eligible">자동 인정</option><option value="review">검토 필요</option><option value="suspended">로그인 정지</option><option value="excluded">이벤트 제외</option><option value="deleted">삭제 계정</option>
        </select>
      </div>

      <div style={{ overflowX: 'auto', border: '1px solid #ffffff12', borderRadius: 12 }}>
        <table style={{ width: '100%', minWidth: 1050, borderCollapse: 'collapse', background: '#080f20' }}>
          <thead><tr style={{ color: '#94a3b8', textAlign: 'left', fontSize: 12 }}>{['게스트', '크루', '초대자', '활동', '이벤트', '위험 신호', '최초 입장', '최근 활동', '관리'].map((h) => <th key={h} style={{ padding: 12, borderBottom: '1px solid #ffffff14' }}>{h}</th>)}</tr></thead>
          <tbody>{visible.map((guest) => (
            <tr key={guest.uid} style={{ borderBottom: '1px solid #ffffff0d', opacity: guest.status === 'deleted' ? 0.48 : 1 }}>
              <td style={{ padding: 12 }}><strong>{guest.alias}</strong><div style={{ color: '#64748b', fontSize: 10, maxWidth: 170, overflow: 'hidden', textOverflow: 'ellipsis' }}>{guest.uid}</div></td>
              <td style={{ padding: 12 }}>{guest.crewName || guest.crewId}</td>
              <td style={{ padding: 12, color: '#94a3b8', fontSize: 11, maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis' }}>{guest.referrerStudentUid || '-'}</td>
              <td style={{ padding: 12 }}>
                {guest.completedBattleCount}전 · {guest.totalBattleAnswers}답
                <div style={{ color: '#64748b', fontSize: 10, marginTop: 3 }}>탐사원 {guest.completedPvpBattleCount || 0} · NOVA-7 {guest.completedAIBattleCount || 0}</div>
              </td>
              <td style={{ padding: 12 }}><span style={{ color: guest.eventEligible ? '#86efac' : '#fbbf24', fontWeight: 800 }}>{guest.eventEligible ? '활동 게스트' : STATUS_LABELS[guest.eventReviewStatus] || '체험 중'}</span></td>
              <td style={{ padding: 12, color: guest.riskFlags?.length ? '#fca5a5' : '#64748b', fontSize: 12 }}>{guest.riskFlags?.join(', ') || '없음'}{guest.recentSameIpCount >= 3 ? ` · 동일 IP ${guest.recentSameIpCount}` : ''}</td>
              <td style={{ padding: 12, fontSize: 12 }}>{formatTime(guest.firstJoinedAtMs)}</td>
              <td style={{ padding: 12, fontSize: 12 }}>{formatTime(guest.lastSeenAtMs)}</td>
              <td style={{ padding: 12 }}><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button disabled={action === guest.uid || guest.status === 'deleted'} onClick={() => review(guest.uid, 'clear')} style={{ color: '#86efac' }}>정상</button>
                <button disabled={action === guest.uid || guest.status === 'deleted'} onClick={() => review(guest.uid, 'review')} style={{ color: '#fbbf24' }}>보류</button>
                <button disabled={action === guest.uid || guest.status === 'deleted'} onClick={() => review(guest.uid, 'excluded')} style={{ color: '#fca5a5' }}>제외</button>
                <button disabled={action === guest.uid || guest.status === 'deleted'} onClick={() => toggleSuspended(guest)} style={{ color: guest.status === 'suspended' ? '#86efac' : '#fda4af', background: '#3f1822' }}>{guest.status === 'suspended' ? '정지 해제' : '로그인 정지'}</button>
                <button disabled={action === guest.uid || guest.status === 'deleted'} onClick={() => remove(guest)} style={{ color: '#fff', background: '#991b1b' }}>계정 삭제</button>
              </div></td>
            </tr>
          ))}</tbody>
        </table>
        {!loading && visible.length === 0 && <div style={{ padding: 35, textAlign: 'center', color: '#64748b' }}>조건에 맞는 게스트가 없습니다.</div>}
      </div>
      <p style={{ color: '#64748b', fontSize: 12, lineHeight: 1.6 }}>IP 원문은 저장·표시하지 않고 서버 비밀키로 만든 해시를 중복 탐지에만 사용합니다. 동일 IP만으로 자동 제외하지 않으며, 동일 기기 중복 또는 관리자의 명시적 제외만 이벤트 인원에서 빠집니다.</p>
    </div>
  );
}
