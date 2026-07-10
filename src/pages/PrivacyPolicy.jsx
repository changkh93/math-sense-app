import { useNavigate } from 'react-router-dom';
import Footer from '../components/common/Footer';

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '100vh',
      background: '#050510',
      color: '#cbd5e1',
      padding: '4rem 2rem',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      lineHeight: '1.6'
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <button 
          onClick={() => navigate('/')}
          style={{
            background: 'none',
            border: '1px solid #1e293b',
            color: '#94a3b8',
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            cursor: 'pointer',
            marginBottom: '2rem'
          }}
        >
          ← 메인으로 돌아가기
        </button>

        <h1 style={{ color: '#ffffff', fontSize: '2.5rem', marginBottom: '2rem', borderBottom: '1px solid #1e293b', paddingBottom: '1rem' }}>
          개인정보처리방침 (Privacy Policy)
        </h1>

        <p style={{ fontSize: '1.1rem', marginBottom: '2rem' }}>
          <strong>메타 센스 (Meta Sense)</strong>와 <strong>스텔라 아고라 (Stellar Agora)</strong> 확장 프로그램은 사용자의 개인정보를 소중히 여기며, 관련 법령을 준수합니다. 본 방침은 심사 및 서비스 운영에 필요한 데이터 수집 범위를 투명하게 밝히기 위해 작성되었습니다.
        </p>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ color: '#00f3ff', borderLeft: '4px solid #00f3ff', paddingLeft: '1rem', marginBottom: '1.2rem' }}>1. 수집하는 데이터 항목 및 목적</h2>
          <p>확장 프로그램 및 서비스 이용 시 다음과 같은 최소한의 데이터를 수집합니다:</p>
          <ul style={{ paddingLeft: '1.5rem' }}>
            <li><strong>개인 식별 및 인증 정보:</strong> 구글 로그인을 통한 이메일, 이름, 프로필 이미지. 이는 사용자를 식별하고 아고라 커뮤니티에 질문을 게시할 때 본인임을 인증하기 위해 사용됩니다.</li>
            <li><strong>웹사이트 콘텐츠 (이미지):</strong> 사용자가 확장 프로그램을 통해 직접 지정하여 캡처한 화면 조각. 이는 '스텔라 아고라'에 질문 내역으로 업로드하기 위한 핵심 데이터입니다.</li>
            <li><strong>사용 설정 정보:</strong> 판서 도구 설정 등 원활한 서비스 경험을 위한 브라우저 내 설정값.</li>
            <li><strong>크루 게스트 체험 정보:</strong> 자동 생성 별명, 임시 인증 식별자, 초대받은 크루와 체험방, 버튼형 반응, 접속·만료 시각. 게스트에게 실명, 학교명, 연락처 또는 이메일을 요구하지 않습니다.</li>
          </ul>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ color: '#00f3ff', borderLeft: '4px solid #00f3ff', paddingLeft: '1rem', marginBottom: '1.2rem' }}>2. 데이터의 사용 및 목적</h2>
          <p>수집된 데이터는 오직 다음 목적을 위해서만 사용됩니다:</p>
          <ul style={{ paddingLeft: '1.5rem' }}>
            <li>사용자가 캡처한 화면을 '스텔라 아고라' 게시판에 업로드하여 질문 기능 수행</li>
            <li>사용자의 질문 내역 및 활동 기록 보관 및 표시</li>
            <li>서비스의 안정적인 운영 및 기술 지원</li>
            <li>방 개설자가 허용한 스터디 크루 게스트 체험 제공 및 남용 방지</li>
            <li>게스트가 직접 생성한 보호자 연결 링크를 통한 학부모·자녀 계정 생성 절차 연결</li>
          </ul>
          <p style={{ color: '#ff4d4d', fontWeight: 'bold' }}>※ 당사는 어떠한 경우에도 사용자의 데이터를 제3자에게 판매하거나 광고용으로 활용하지 않습니다.</p>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ color: '#00f3ff', borderLeft: '4px solid #00f3ff', paddingLeft: '1rem', marginBottom: '1.2rem' }}>3. 데이터의 보관 및 파기</h2>
          <p>사용자의 데이터는 서비스 이용 기간 동안 구글 파이어베이스(Firebase) 보안 서버에 보관됩니다. 사용자가 요청하거나 탈퇴할 경우 관련 법령상 보관이 필요한 정보를 제외하고 파기합니다.</p>
          <ul style={{ paddingLeft: '1.5rem' }}>
            <li>게스트 세션과 체험방 참여 정보: 최대 2시간 사용 후 정리하며, 장애 복구를 포함해 24시간 이내 삭제</li>
            <li>보호자 연결 링크: 생성 후 24시간</li>
            <li>게스트는 회원 DB의 학습자 프로필, 학습 기록, 광석, 랭킹 기록을 생성하지 않음</li>
          </ul>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ color: '#00f3ff', borderLeft: '4px solid #00f3ff', paddingLeft: '1rem', marginBottom: '1.2rem' }}>4. 문의처</h2>
          <p>개인정보 처리와 관련하여 문의 사항이 있으시면 아래로 연락해 주시기 바랍니다.</p>
          <p>이메일: <a href="mailto:paul@dulcine.net" style={{ color: '#8b5cf6' }}>paul@dulcine.net</a></p>
        </section>

        <div style={{ marginTop: '4rem', padding: '2rem', background: '#0a0a20', borderRadius: '12px', border: '1px solid #1e293b', textAlign: 'center' }}>
          <p style={{ fontSize: '0.9rem', color: '#64748b' }}>
            공고일자: 2026년 7월 10일<br/>
            시행일자: 2026년 7월 10일
          </p>
          <p style={{ fontWeight: 900, color: '#ffffff', marginTop: '1rem' }}>Powered by Meta Sense</p>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
