import { useEffect, useMemo, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { Copy, Gift, RefreshCw, Users } from 'lucide-react';
import { functions } from '../../firebase';

const money = (value) => `${Math.max(0, Number(value) || 0).toLocaleString('ko-KR')}원`;
const percent = (value) => `${Math.round((Number(value) || 0) * 100)}%`;

const enrollmentLabels = {
  trial: '체험/무료',
  active_paid: '유료 수강 중',
  cancel_scheduled: '해지 예정',
  paused: '일시정지',
  ended: '수강 종료',
  complimentary: '무료 제고',
};

const referralLabels = {
  applied: '신청 완료',
  trial_scheduled: '체험 예정',
  trial_active: '무료체험 중',
  trial_ended: '체험 종료',
  paid_active: '유료 전환',
  cancelled: '종료',
  rejected: '혜택 제외',
};

function FeePanel({ title, value }) {
  return (
    <div style={{ background: 'rgba(0,0,0,0.18)', borderRadius: 14, padding: 14, flex: '1 1 210px' }}>
      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 8 }}>{title} · {value.monthKey}</div>
      <div style={{ display: 'grid', gap: 5, fontSize: 13 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>기본 수강료</span><b>{money(value.baseFee)}</b></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#86efac' }}><span>추천 {value.activeReferralCount}명 · {percent(value.discountRate)}</span><b>-{money(value.discountAmount)}</b></div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 7, marginTop: 3, display: 'flex', justifyContent: 'space-between', fontSize: 16 }}><span>최종 수강료</span><strong style={{ color: '#67e8f9' }}>{money(value.finalFee)}</strong></div>
      </div>
    </div>
  );
}

export default function ReferralBillingCard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [inviteUrl, setInviteUrl] = useState('');
  const [message, setMessage] = useState('');

  const childNameByUid = useMemo(() => new Map((data?.children || []).map((child) => [child.uid, child.name])), [data?.children]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const fn = httpsCallable(functions, 'getParentReferralDashboard');
      const result = await fn({});
      setData(result.data || null);
    } catch (err) {
      setError(err?.message || '추천 혜택 정보를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const makeInvite = async () => {
    setMessage('');
    try {
      const fn = httpsCallable(functions, 'getOrCreateReferralInvite');
      const result = await fn({ source: 'parent_trial_link' });
      const url = `${window.location.origin}/trial?ref=${encodeURIComponent(result.data?.token || '')}`;
      setInviteUrl(url);
      await navigator.clipboard.writeText(url);
      setMessage('1달 무료체험 추천 링크를 복사했습니다.');
    } catch (err) {
      setMessage(err?.message || '추천 링크를 만들지 못했습니다.');
    }
  };

  if (loading) return <div style={{ marginBottom: 20, color: 'rgba(255,255,255,0.5)' }}>수강료·추천 정보를 불러오는 중...</div>;
  if (error) return <div style={{ marginBottom: 20, color: '#fecaca' }}>{error}</div>;
  if (!data) return null;

  return (
    <section style={{ marginBottom: 24, background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(6,182,212,0.12))', border: '1px solid rgba(103,232,249,0.2)', borderRadius: 18, padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 14 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 900 }}><Gift size={18} color="#67e8f9" />우리 가족 수강료·추천 혜택</div>
          <div style={{ marginTop: 4, fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>학부모와 자녀가 보낸 모두 추천이 합산되어 반영됩니다.</div>
        </div>
        <button type="button" onClick={load} style={{ border: 0, background: 'transparent', color: '#94a3b8', cursor: 'pointer' }}><RefreshCw size={16} /></button>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        <FeePanel title="현재 월" value={data.current} />
        <FeePanel title="다음 월 예상" value={data.next} />
      </div>

      <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 13, padding: 13, marginBottom: 12 }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>자녀별 수강 상태</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {data.children.map((child) => (
            <span key={child.uid} style={{ borderRadius: 999, padding: '6px 10px', background: child.enrollment?.status === 'active_paid' ? 'rgba(34,197,94,0.14)' : 'rgba(255,255,255,0.06)', color: child.enrollment?.status === 'active_paid' ? '#86efac' : '#cbd5e1', fontSize: 12 }}>
              {child.name} · {enrollmentLabels[child.enrollment?.status] || child.enrollment?.status || '미지정'}
            </span>
          ))}
        </div>
      </div>

      <button type="button" onClick={makeInvite} style={{ width: '100%', border: '1px solid rgba(103,232,249,0.35)', background: 'rgba(6,182,212,0.12)', color: '#67e8f9', borderRadius: 12, padding: '11px 12px', cursor: 'pointer', fontWeight: 850 }}>
        <Copy size={15} style={{ verticalAlign: 'middle', marginRight: 6 }} />1달 무료체험 추천 링크 복사
      </button>
      {inviteUrl && <div style={{ marginTop: 8, fontSize: 11, color: 'rgba(255,255,255,0.45)', wordBreak: 'break-all' }}>{inviteUrl}</div>}
      {message && <div style={{ marginTop: 8, fontSize: 12, color: '#a7f3d0' }}>{message}</div>}

      <div style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontWeight: 850, marginBottom: 9 }}><Users size={16} />추천 현황</div>
        {data.referrals.length === 0 ? (
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>아직 등록된 추천이 없습니다.</div>
        ) : data.referrals.map((referral) => (
          <div key={referral.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '9px 0', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: 12 }}>
            <div>
              <b>{referral.maskedName}</b>
              <div style={{ marginTop: 3, color: 'rgba(255,255,255,0.45)' }}>
                {referral.source === 'crew_guest_invite' ? `${childNameByUid.get(referral.referrerStudentUid) || '자녀'} · 스터디 크루` : '학부모 추천 링크'}
              </div>
            </div>
            <span style={{ color: referral.status === 'paid_active' ? '#86efac' : '#c4b5fd' }}>{referralLabels[referral.status] || referral.status}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
