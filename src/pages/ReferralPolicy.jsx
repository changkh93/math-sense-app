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
  { count: '1가구', rate: '20% 할인', desc: '추천으로 가입한 1가구가 유료 수강 중일 때' },
  { count: '2가구', rate: '50% 할인', desc: '추천으로 가입한 2가구가 유료 수강 중일 때' },
  { count: '3가구 이상', rate: '100% 할인', desc: '3가구 이상 유료 수강 중일 때' },
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
            <Sparkles size={15} /> 추천 혜택
          </div>
          <h1 style={{ margin: '0 0 12px', fontSize: '2.3rem', lineHeight: 1.25, color: '#fff', letterSpacing: '-0.02em' }}>
            지인에게는 <span style={{ color: GREEN }}>4주 무료체험</span>을,<br />우리 가족에게는 <span style={{ background: 'linear-gradient(135deg, #22d3ee, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>최대 100% 수강료 혜택</span>을
          </h1>
          <p style={{ color: 'rgba(232,240,255,0.72)', lineHeight: 1.8, fontSize: '1.05rem', margin: 0 }}>
            메타센스가 자녀에게 도움이 되었다면 비슷한 고민을 가진 지인에게 학습 경험을 나눠주세요.
            추천으로 가입한 가구가 유료 수강 중인 동안 우리 가족의 기본 수강료에 20% · 50% · 100% 혜택이 적용됩니다.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, margin: '28px 0' }}>
          <div style={{ background: 'rgba(15,22,46,0.7)', border: '1px solid rgba(134,239,172,0.25)', borderRadius: 14, padding: 18 }}>
            <div style={{ color: GREEN, fontWeight: 850, marginBottom: 6 }}>추천으로 가입한 가구</div>
            <div style={{ color: '#fff', fontSize: '1.15rem', fontWeight: 900 }}>4주 무료체험</div>
            <p style={{ margin: '6px 0 0', color: 'rgba(232,240,255,0.6)', fontSize: 13 }}>담당자와 시작일을 정하고 부담 없이 체험합니다.</p>
          </div>
          <div style={{ background: 'rgba(15,22,46,0.7)', border: '1px solid rgba(103,232,249,0.25)', borderRadius: 14, padding: 18 }}>
            <div style={{ color: HIGHLIGHT, fontWeight: 850, marginBottom: 6 }}>추천한 우리 가족</div>
            <div style={{ color: '#fff', fontSize: '1.15rem', fontWeight: 900 }}>수강료 최대 100% 할인</div>
            <p style={{ margin: '6px 0 0', color: 'rgba(232,240,255,0.6)', fontSize: 13 }}>추천 가구가 유료 수강 중인 동안 다음 달 수강료에 반영됩니다.</p>
          </div>
        </div>

        {/* 혜택 단계표 */}
        <Section title="혜택 단계표">
          <p style={{ marginTop: 0 }}>추천으로 가입한 가구의 자녀가 <b style={{ color: GREEN }}>유료로 수강 중일 때</b> 유효 추천 가구로 계산됩니다. 가구 단위로 누적돼, 추천이 많아질수록 혜택이 커집니다.</p>
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
            * 할인은 학부모 대시보드에 표시된 우리 가족의 기본 수강료를 기준으로 계산합니다. 4가구 이상을 추천해도 최대 할인은 100%로 유지됩니다.
          </p>
        </Section>

        <Section title="추천 혜택은 어떻게 이어지나요?">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: 10 }}>
            {['추천 링크 전달', '4주 무료체험', '계속 수강 별도 신청', '다음 달 할인 반영'].map((label, index) => (
              <div key={label} style={{ padding: 14, borderRadius: 12, background: 'rgba(15,22,46,0.7)', border: '1px solid rgba(111,226,255,0.18)' }}>
                <div style={{ color: HIGHLIGHT, fontSize: 12, fontWeight: 900 }}>STEP {index + 1}</div>
                <div style={{ marginTop: 5, color: '#fff', fontWeight: 800 }}>{label}</div>
              </div>
            ))}
          </div>
          <p style={{ margin: '18px 0 0' }}>두 가지 추천 경로가 있으며, <b>모두 우리 가족의 추천 혜택으로 합산</b>됩니다.</p>
          <div style={{ display: 'grid', gap: 14, marginTop: 16 }}>
            <div style={{ background: 'rgba(15,22,46,0.7)', border: '1px solid rgba(111,226,255,0.18)', borderRadius: 14, padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, color: ACCENT_VIOLET, marginBottom: 6 }}>
                <Users size={18} /> 학부모 추천 링크
              </div>
              <p style={{ margin: 0, fontSize: 14 }}>학부모 대시보드에서 <b>「4주 무료체험 추천 링크」</b>를 복사해 지인에게 전달합니다. 링크로 신청한 가구에는 4주 무료체험 혜택이 주어집니다.</p>
            </div>
            <div style={{ background: 'rgba(15,22,46,0.7)', border: '1px solid rgba(111,226,255,0.18)', borderRadius: 14, padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, color: ACCENT_VIOLET, marginBottom: 6 }}>
                <Users size={18} /> 자녀의 스터디 크루 초대
              </div>
              <p style={{ margin: 0, fontSize: 14 }}>자녀는 앱에서 친구에게 “함께 4주 동안 공부해 보자”는 초대를 보낼 수 있습니다. 부모 확인을 거쳐 유료 수강을 별도로 신청한 경우 우리 가족의 추천 혜택으로 합산됩니다.</p>
            </div>
          </div>
        </Section>

        <Section title="추천으로 가입한 가구의 혜택">
          <p style={{ marginTop: 0 }}>
            일반 무료체험은 <b>1주일</b>입니다. 추천인 정보를 입력하거나 추천 링크로 신청하면 <b style={{ color: GREEN }}>4주 무료체험</b>으로 연장됩니다.
            체험 시작일은 담당자와 협의하여 정하며, 체험 종료 후 자동으로 유료 전환되거나 결제되지 않습니다. 계속 수강을 원할 때 별도로 신청합니다.
          </p>
          <Link to="/trial" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, marginTop: 12, padding: '12px 22px', borderRadius: 12, background: 'rgba(6,182,212,0.16)', border: '1px solid rgba(103,232,249,0.4)', color: HIGHLIGHT, fontWeight: 850, textDecoration: 'none' }}>
            <Gift size={17} /> 4주 무료체험 신청하기 <ChevronRight size={16} />
          </Link>
        </Section>

        {/* 적용 조건 */}
        <Section title="언제, 어떻게 적용되나요?">
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            <li><b style={{ color: GREEN }}>유료 수강 시 확정</b> — 추천으로 가입한 가구의 자녀가 유료로 수강 중일 때만 유효 추천 가구로 계산됩니다. 무료체험 중에는 제외됩니다.</li>
            <li><b style={{ color: HIGHLIGHT }}>다음 달 청구부터 반영</b> — 매월 25일 오전 9시부터 유효 추천 가구 수를 확인해 다음 달 수강료 명세를 생성합니다.</li>
            <li><b>가구 단위 합산</b> — 학부모 추천 링크와 자녀의 크루 초대가 한 가구의 추천 혜택으로 합쳐집니다. 추천으로 가입한 가구의 자녀가 여러 명이어도 1가구로 계산합니다.</li>
            <li><b>혜택 변경 사전 확인</b> — 유효 추천 가구 수가 줄어들면 학부모 대시보드의 ‘다음 월 예상’에서 변경된 수강료를 확인할 수 있고, 25일에 다음 달 명세를 안내합니다.</li>
          </ul>
        </Section>

        {/* 유의사항 */}
        <Section title="유의사항">
          <ul style={{ margin: 0, paddingLeft: 20, color: 'rgba(232,240,255,0.65)' }}>
            <li>본인 가구를 추천하거나, 서로 추천하는 양방향 추천은 인정되지 않습니다.</li>
            <li>이미 다른 가구의 추천으로 등록된 가구를 다시 추천할 수 없습니다.</li>
            <li>추천으로 가입한 가구가 유료 수강을 종료하면, 다음 정산부터 유효 추천 가구 수에서 제외됩니다.</li>
            <li>3가구 이상 추천 시에도 할인은 최대 100%(무료)까지만 적용됩니다.</li>
            <li>직접 추천한 가구만 인정됩니다. 추천으로 가입한 가구가 다른 가구를 추천하더라도 최초 추천자의 혜택으로 연결되지 않습니다.</li>
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
          추천 혜택의 세부 조건은 운영 정책에 따라 변경될 수 있으며, 변경 시 사전 안내합니다.
        </p>
      </main>
    </div>
  );
}
