import { Link } from 'react-router-dom';
import { Gift, Users, Sparkles, ChevronRight } from 'lucide-react';
import './PublicApplication.css';

const HIGHLIGHT = '#67e8f9';
const ACCENT_VIOLET = '#c4b5fd';
const GREEN = '#86efac';

// 표시용 혜택 단계표. 진실 소스는 백엔드 functions/referralBilling.js의 REFERRAL_RATES([0, 0.2, 0.5, 1]).
// 단계가 변경되면 백엔드와 함께 여기도 맞춰주세요.
const BENEFIT_STEPS = [
  { count: '0명', rate: '할인 없음', desc: '기본 수강료 그대로' },
  { count: '1명', rate: '20% 할인', desc: '추천한 친구 1가구가 유료 수강 중일 때' },
  { count: '2명', rate: '50% 할인', desc: '2가구가 유료 수강 중일 때' },
  { count: '3명 이상', rate: '100% 할인 (무료)', desc: '3가구 이상 유료 수강 시 수강료 0원' },
];

function Section({ title, children, id }) {
  return (
    <section id={id} style={{ borderTop: '1px solid rgba(111,226,255,0.12)', padding: '28px 0' }}>
      <h2 style={{ color: HIGHLIGHT, margin: '0 0 14px', fontSize: '1.4rem', letterSpacing: '-0.01em' }}>{title}</h2>
      <div style={{ color: 'rgba(232,240,255,0.78)', lineHeight: 1.8, fontSize: '1rem' }}>{children}</div>
    </section>
  );
}

export default function ReferralPolicy() {
  return (
    <div className="public-app">
      <div className="public-stars" />
      <header className="public-nav">
        <Link to="/" className="public-brand">
          <img src="/m-logo.svg" alt="" />
          <span>META SENSE</span>
        </Link>
        <nav>
          <Link to="/trial">무료체험 신청</Link>
          <Link to="/">로그인</Link>
        </nav>
      </header>

      <main style={{ maxWidth: 860, margin: '0 auto', padding: '32px 20px 80px' }}>
        <Link to="/" style={{ color: '#93c5fd', textDecoration: 'none', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          메인으로 돌아가기
        </Link>

        {/* 히어로 */}
        <div style={{ marginTop: 28, marginBottom: 10 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 14px', borderRadius: 999, background: 'rgba(124,58,237,0.18)', border: '1px solid rgba(196,181,253,0.3)', color: ACCENT_VIOLET, fontSize: 13, fontWeight: 800, marginBottom: 16 }}>
            <Sparkles size={15} /> 추천인 제도
          </div>
          <h1 style={{ margin: '0 0 12px', fontSize: '2.3rem', lineHeight: 1.25, color: '#fff', letterSpacing: '-0.02em' }}>
            친구 추천으로<br />수강료를 <span style={{ background: 'linear-gradient(135deg, #22d3ee, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>0원까지</span> 깎아보세요
          </h1>
          <p style={{ color: 'rgba(232,240,255,0.72)', lineHeight: 1.8, fontSize: '1.05rem', margin: 0 }}>
            기존 수강생이 친구를 추천하면, 추천한 가구와 추천받은 가구 모두에게 혜택이 있습니다.
            추천한 친구 가구가 늘어날수록 우리 가족의 월 수강료가 20% · 50% · 100% 단계로 할인됩니다.
          </p>
        </div>

        {/* 한눈에 보기 4단계 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, margin: '28px 0', }}>
          {[
            { label: '0명', value: '할인 없음', color: 'rgba(255,255,255,0.5)' },
            { label: '1명', value: '20% 할인', color: '#86efac' },
            { label: '2명', value: '50% 할인', color: '#86efac' },
            { label: '3명+', value: '100% (무료)', color: HIGHLIGHT },
          ].map((step) => (
            <div key={step.label} style={{ background: 'rgba(15,22,46,0.7)', border: '1px solid rgba(111,226,255,0.18)', borderRadius: 14, padding: '16px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: 'rgba(232,240,255,0.55)' }}>유료 추천</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fff', margin: '4px 0' }}>{step.label}</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: step.color }}>{step.value}</div>
            </div>
          ))}
        </div>

        {/* 혜택 단계표 */}
        <Section title="혜택 단계표">
          <p style={{ marginTop: 0 }}>추천한 친구 가구(피추천 가구)의 자녀가 <b style={{ color: GREEN }}>유료로 수강 중일 때</b> 유효 추천으로 계산됩니다. 가구 단위로 누적돼, 추천이 많아질수록 할인이 커집니다.</p>
          <div style={{ marginTop: 16, border: '1px solid rgba(111,226,255,0.18)', borderRadius: 14, overflow: 'hidden' }}>
            {BENEFIT_STEPS.map((step, idx) => (
              <div key={step.count} style={{ display: 'flex', gap: 16, padding: '14px 16px', alignItems: 'center', borderTop: idx === 0 ? 0 : '1px solid rgba(111,226,255,0.08)', background: idx % 2 === 0 ? 'rgba(15,22,46,0.5)' : 'transparent' }}>
                <div style={{ flex: '0 0 90px', fontWeight: 900, color: '#fff' }}>{step.count}</div>
                <div style={{ flex: '0 0 150px', fontWeight: 800, color: step.count === '0명' ? 'rgba(255,255,255,0.5)' : GREEN }}>{step.rate}</div>
                <div style={{ flex: 1, fontSize: 13, color: 'rgba(232,240,255,0.6)' }}>{step.desc}</div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 13, color: 'rgba(232,240,255,0.5)', margin: '12px 0 0' }}>
            * 4가구 이상을 추천해도 최대 할인은 100%(무료)로 유지됩니다.
          </p>
        </Section>

        {/* 추천하는 방법 */}
        <Section title="어떻게 추천하나요?">
          <p style={{ marginTop: 0 }}>두 가지 방법이 있으며, <b>모두 우리 가족 실적으로 합산</b>됩니다.</p>
          <div style={{ display: 'grid', gap: 14, marginTop: 16 }}>
            <div style={{ background: 'rgba(15,22,46,0.7)', border: '1px solid rgba(111,226,255,0.18)', borderRadius: 14, padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, color: ACCENT_VIOLET, marginBottom: 6 }}>
                <Users size={18} /> 학부모 추천 링크
              </div>
              <p style={{ margin: 0, fontSize: 14 }}>학부모 대시보드에서 <b>「1달 무료체험 추천 링크」</b>를 복사해 친구에게 전달합니다. 링크로 들어와 신청한 친구에게는 1달 무료체험 혜택이 주어집니다.</p>
            </div>
            <div style={{ background: 'rgba(15,22,46,0.7)', border: '1px solid rgba(111,226,255,0.18)', borderRadius: 14, padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, color: ACCENT_VIOLET, marginBottom: 6 }}>
                <Users size={18} /> 자녀의 스터디 크루 초대
              </div>
              <p style={{ margin: 0, fontSize: 14 }}>자녀가 앱 안에서 친구를 스터디 크루에 초대하면, 초대받은 친구는 1개월 무료체험을 하고 유료로 전환되었을 때 우리 가족의 추천 실적으로 합산됩니다.</p>
            </div>
          </div>
        </Section>

        {/* 피추천인 혜택 */}
        <Section title="추천받은 친구의 혜택">
          <p style={{ marginTop: 0 }}>
            일반 무료체험은 <b>1주일</b>입니다. 하지만 추천인 정보를 입력하거나 추천 링크로 신청하면 <b style={{ color: GREEN }}>1달(1개월) 무료체험</b>으로 연장됩니다.
            체험 시작일은 담당자와 협의하여 정합니다.
          </p>
          <Link to="/trial" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, marginTop: 12, padding: '12px 22px', borderRadius: 12, background: 'rgba(6,182,212,0.16)', border: '1px solid rgba(103,232,249,0.4)', color: HIGHLIGHT, fontWeight: 850, textDecoration: 'none' }}>
            <Gift size={17} /> 무료체험 신청하기 <ChevronRight size={16} />
          </Link>
        </Section>

        {/* 적용 조건 */}
        <Section title="언제, 어떻게 적용되나요?">
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            <li><b style={{ color: GREEN }}>유료 전환 시 확정</b> — 추천받은 친구의 자녀가 유료로 수강 중일 때만 유효 추천으로 계산됩니다. 무료체험 중에는 카운트에서 제외됩니다.</li>
            <li><b style={{ color: HIGHLIGHT }}>다음 달 청구부터 반영</b> — 이번 달 기준 유효 추천 수를 다음 달 수강료에 반영합니다. 매월 25일에 다음 달 명세가 자동 생성됩니다.</li>
            <li><b>가구 단위 합산</b> — 학부모 추천 링크와 자녀의 크루 초대가 한 가구의 실적으로 합쳐집니다. 피추천 가구 자녀가 여러 명이어도 1가구로 계산합니다.</li>
          </ul>
        </Section>

        {/* 유의사항 */}
        <Section title="유의사항">
          <ul style={{ margin: 0, paddingLeft: 20, color: 'rgba(232,240,255,0.65)' }}>
            <li>본인 가구를 추천하거나, 서로 추천하는 양방향 추천은 인정되지 않습니다.</li>
            <li>이미 다른 가구에 귀속된 친구를 다시 추천할 수 없습니다.</li>
            <li>추천받은 가구가 유료 수강을 종료하면, 다음 정산부터 유효 추천 수에서 제외됩니다.</li>
            <li>3가구 이상 추천 시에도 할인은 최대 100%(무료)까지만 적용됩니다.</li>
          </ul>
        </Section>

        {/* CTA */}
        <div style={{ marginTop: 36, padding: 28, borderRadius: 18, background: 'linear-gradient(135deg, rgba(124,58,237,0.22), rgba(6,182,212,0.14))', border: '1px solid rgba(103,232,249,0.25)', textAlign: 'center' }}>
          <h3 style={{ margin: '0 0 8px', color: '#fff', fontSize: '1.3rem' }}>지금 추천을 시작하세요</h3>
          <p style={{ color: 'rgba(232,240,255,0.7)', margin: '0 0 18px' }}>추천 링크는 학부모 대시보드에서, 자녀의 크루 초대는 앱 안에서 바로 발송할 수 있습니다.</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/trial" style={{ padding: '12px 24px', borderRadius: 12, background: 'rgba(6,182,212,0.2)', border: '1px solid rgba(103,232,249,0.45)', color: HIGHLIGHT, fontWeight: 850, textDecoration: 'none' }}>무료체험 신청</Link>
            <Link to="/" style={{ padding: '12px 24px', borderRadius: 12, background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(232,240,255,0.8)', fontWeight: 750, textDecoration: 'none' }}>학부모 로그인</Link>
          </div>
        </div>

        <p style={{ marginTop: 28, fontSize: 12, color: 'rgba(232,240,255,0.4)', textAlign: 'center' }}>
          추천인 제도의 세부 조건은 운영 정책에 따라 변경될 수 있으며, 변경 시 사전 안내합니다.
        </p>
      </main>
    </div>
  );
}
