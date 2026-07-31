import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { ChevronDown, Copy, Gift, RefreshCw, Users } from 'lucide-react';
import { functions } from '../../firebase';

const money = (value) => `${Math.max(0, Number(value) || 0).toLocaleString('ko-KR')}원`;
const percent = (value) => `${Math.round((Number(value) || 0) * 100)}%`;

// NOTE: 혜택 단계 표시용 상수. 진실 소스는 백엔드 functions/referralBilling.js의 REFERRAL_RATES([0, 0.2, 0.5, 1]).
// 단계가 변경되면 백엔드와 함께 여기도 맞춰주세요. 아래 UI는 백엔드에서 받은 값만 표시하고 rate를 재계산하지 않습니다.
const BENEFIT_STEPS = [
  { count: 0, rate: 0, label: '할인 없음', desc: '기본 수강료 그대로' },
  { count: 1, rate: 0.2, label: '20% 할인', desc: '추천한 친구 1가구가 유료 수강 중일 때' },
  { count: 2, rate: 0.5, label: '50% 할인', desc: '2가구가 유료 수강 중일 때' },
  { count: 3, rate: 1, label: '100% (무료)', desc: '3가구 이상 유료 수강 시 수강료 0원' },
];

// count에서 1명 더 추천할 때의 예상 할인율. 이미 최대(3명)면 null을 반환합니다.
function nextRateForCount(count) {
  const n = Math.max(0, Math.min(3, Number(count) || 0));
  if (n >= 3) return null;
  return BENEFIT_STEPS[n + 1].rate;
}

const enrollmentLabels = {
  trial: '체험/무료',
  active_paid: '유료 수강 중',
  cancel_scheduled: '해지 예정',
  paused: '일시정지',
  ended: '수강 종료',
  complimentary: '무료 제공',
};

const referralLabels = {
  applied: '신청 완료',
  trial_scheduled: '체험 예정',
  trial_active: '무료체험 중',
  trial_ended: '체험 종료',
  paid_active: '유료 전환',
  cancelled: '종료',
  rejected: '혜택 제외',
};

function FeePanel({ title, value }) {
  return (
    <div style={{ background: 'rgba(0,0,0,0.18)', borderRadius: 14, padding: 14, flex: '1 1 210px' }}>
      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 8 }}>{title} · {value.monthKey}</div>
      <div style={{ display: 'grid', gap: 5, fontSize: 13 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>기본 수강료</span><b>{money(value.baseFee)}</b></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#86efac' }}><span>추천 {value.activeReferralCount}명 · {percent(value.discountRate)}</span><b>-{money(value.discountAmount)}</b></div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 7, marginTop: 3, display: 'flex', justifyContent: 'space-between', fontSize: 16 }}><span>최종 수강료</span><strong style={{ color: '#67e8f9' }}>{money(value.finalFee)}</strong></div>
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
  const [showDetail, setShowDetail] = useState(false);

  const childNameByUid = useMemo(() => new Map((data?.children || []).map((child) => [child.uid, child.name])), [data?.children]);

  // 현재 유효 추천 수에 해당하는 혜택 단계 인덱스. 백엔드 activeReferralCount 기준.
  const currentTier = useMemo(() => Math.max(0, Math.min(3, Number(data?.current?.activeReferralCount) || 0)), [data]);
  const nextRate = useMemo(() => nextRateForCount(data?.current?.activeReferralCount), [data]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const fn = httpsCallable(functions, 'getParentReferralDashboard');
      const result = await fn({});
      setData(result.data || null);
    } catch (err) {
      setError(err?.message || '추천 혜택 정보를 불러오지 못했습니다.');
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
      // 링크만 복사하는 대신, 친구에게 그대로 보낼 수 있는 공유 메시지를 복사합니다.
      const shareText = `[메타센스] 우리 아이 수학, 무료체험해 보세요!\n이 링크로 신청하면 1달 무료체험 혜택이 주어져요.\n${url}\n\n추천인 제도 안내: ${window.location.origin}/referral`;
      await navigator.clipboard.writeText(shareText);
      setMessage('추천 메시지를 복사했습니다. 친구에게 그대로 보내보세요.');
    } catch (err) {
      setMessage(err?.message || '추천 링크를 만들지 못했습니다.');
    }
  };

  if (loading) return <div style={{ marginBottom: 20, color: 'rgba(255,255,255,0.5)' }}>수강료·추천 정보를 불러오는 중...</div>;
  if (error) return <div style={{ marginBottom: 20, color: '#fecaca' }}>{error}</div>;
  if (!data) return null;

  return (
    <section style={{ marginBottom: 24, background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(6,182,212,0.12))', border: '1px solid rgba(103,232,249,0.2)', borderRadius: 18, padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 14 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 900 }}><Gift size={18} color="#67e8f9" />우리 가족 수강료·추천 혜택</div>
          <div style={{ marginTop: 4, fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>학부모와 자녀가 보낸 모든 추천이 합산되어 반영됩니다.</div>
        </div>
        <button type="button" onClick={load} style={{ border: 0, background: 'transparent', color: '#94a3b8', cursor: 'pointer' }}><RefreshCw size={16} /></button>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        <FeePanel title="현재 월" value={data.current} />
        <FeePanel title="다음 월 예상" value={data.next} />
      </div>

      {/* 다음 단계 동기부여: 아직 최대 할인이 아니면 한 단계 더 추천 시 혜택 안내 */}
      {nextRate !== null && (
        <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(134,239,172,0.25)', borderRadius: 12, padding: '10px 12px', marginBottom: 14, fontSize: 13, color: '#bbf7d0' }}>
          🎁 친구 1가구가 더 유료 수강하면 <b>{percent(nextRate)}</b> 할인으로 내려갑니다!
        </div>
      )}
      {nextRate === null && currentTier === 3 && (
        <div style={{ background: 'rgba(103,232,249,0.08)', border: '1px solid rgba(103,232,249,0.3)', borderRadius: 12, padding: '10px 12px', marginBottom: 14, fontSize: 13, color: '#a5f3fc' }}>
          🎉 최대 혜택(100% 무료)을 받고 있습니다!
        </div>
      )}

      <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 13, padding: 13, marginBottom: 12 }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>자녀별 수강 상태</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {data.children.map((child) => (
            <span key={child.uid} style={{ borderRadius: 999, padding: '6px 10px', background: child.enrollment?.status === 'active_paid' ? 'rgba(34,197,94,0.14)' : 'rgba(255,255,255,0.06)', color: child.enrollment?.status === 'active_paid' ? '#86efac' : '#cbd5e1', fontSize: 12 }}>
              {child.name} · {enrollmentLabels[child.enrollment?.status] || child.enrollment?.status || '미지정'}
            </span>
          ))}
        </div>
      </div>

      <button type="button" onClick={makeInvite} style={{ width: '100%', border: '1px solid rgba(103,232,249,0.35)', background: 'rgba(6,182,212,0.12)', color: '#67e8f9', borderRadius: 12, padding: '11px 12px', cursor: 'pointer', fontWeight: 850 }}>
        <Copy size={15} style={{ verticalAlign: 'middle', marginRight: 6 }} />1달 무료체험 추천 링크 복사
      </button>
      {inviteUrl && <div style={{ marginTop: 8, fontSize: 11, color: 'rgba(255,255,255,0.45)', wordBreak: 'break-all' }}>{inviteUrl}</div>}
      {message && <div style={{ marginTop: 8, fontSize: 12, color: '#a7f3d0' }}>{message}</div>}

      <div style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontWeight: 850, marginBottom: 9 }}><Users size={16} />추천 현황</div>
        {data.referrals.length === 0 ? (
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>아직 등록된 추천이 없습니다.</div>
        ) : data.referrals.map((referral) => (
          <div key={referral.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '9px 0', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: 12 }}>
            <div>
              <b>{referral.maskedName}</b>
              <div style={{ marginTop: 3, color: 'rgba(255,255,255,0.45)' }}>
                {referral.source === 'crew_guest_invite' ? `${childNameByUid.get(referral.referrerStudentUid) || '자녀'} · 스터디 크루` : '학부모 추천 링크'}
              </div>
            </div>
            <span style={{ color: referral.status === 'paid_active' ? '#86efac' : '#c4b5fd' }}>{referralLabels[referral.status] || referral.status}</span>
          </div>
        ))}
      </div>

      {/* 제도 자세히 보기 (펼치기/접기) */}
      <div style={{ marginTop: 16, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 14 }}>
        <button type="button" onClick={() => setShowDetail((v) => !v)} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: 0, background: 'transparent', color: '#c4b5fd', cursor: 'pointer', fontWeight: 800, fontSize: 13 }}>
          <span>추천인 제도 자세히 보기</span>
          <ChevronDown size={16} style={{ transform: showDetail ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        </button>

        {showDetail && (
          <div style={{ marginTop: 12, fontSize: 13, color: 'rgba(255,255,255,0.72)' }}>
            <div style={{ marginBottom: 8, fontWeight: 700, color: '#e2e8f0' }}>단계별 혜택</div>
            <div style={{ border: '1px solid rgba(103,232,249,0.18)', borderRadius: 12, overflow: 'hidden' }}>
              {BENEFIT_STEPS.map((step, idx) => {
                const active = idx === currentTier;
                return (
                  <div key={step.count} style={{ display: 'flex', gap: 12, padding: '10px 12px', alignItems: 'center', borderTop: idx === 0 ? 0 : '1px solid rgba(255,255,255,0.06)', background: active ? 'rgba(103,232,249,0.12)' : 'transparent' }}>
                    <div style={{ flex: '0 0 64px', fontWeight: 800, color: active ? '#67e8f9' : '#e2e8f0' }}>{step.count === 3 ? '3명+' : `${step.count}명`}{active ? ' · 현재' : ''}</div>
                    <div style={{ flex: '0 0 100px', fontWeight: 800, color: step.rate === 0 ? 'rgba(255,255,255,0.45)' : '#86efac' }}>{step.label}</div>
                    <div style={{ flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{step.desc}</div>
                  </div>
                );
              })}
            </div>

            <ul style={{ margin: '12px 0 0', paddingLeft: 18, lineHeight: 1.7, color: 'rgba(255,255,255,0.6)' }}>
              <li>추천받은 친구 가구가 <b style={{ color: '#86efac' }}>유료로 수강 중</b>일 때 확정됩니다. (무료체험 중은 제외)</li>
              <li>이번 달 기준 유효 추천 수를 <b style={{ color: '#67e8f9' }}>다음 달 수강료</b>에 반영합니다.</li>
              <li>학부모 추천 링크와 자녀의 크루 초대가 한 가구 실적으로 합산됩니다.</li>
              <li>3가구 이상 추천 시에도 할인은 최대 100%(무료)까지만 적용됩니다.</li>
            </ul>

            <Link to="/referral" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 14, fontSize: 13, fontWeight: 700, color: '#67e8f9', textDecoration: 'none' }}>
              전체 안내 보기 →
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
