import { useNavigate } from 'react-router-dom';

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
            <li><strong>크루 게스트 체험 정보:</strong> 익명 인증 식별자와 초대받은 크루 정보. 단순 게스트 입장에는 실명이나 연락처를 요구하지 않습니다.</li>
            <li><strong>선택적 무료체험 신청 정보:</strong> 학생이 신청한 이름·학년·보호자 연락처를 운영자의 전화 확인 및 체험 안내에 사용합니다. 초대 기록과 추천 학생·학부모 식별자는 운영자의 추천 혜택 확인을 위해 저장하며 신청 화면에 공개하지 않습니다. 신청 접수는 보호자 확인 완료를 의미하지 않습니다.</li>
            <li><strong>부정 이용 방지 정보:</strong> 원문을 저장하지 않고 서버 비밀키로 변환한 접속 IP·브라우저 설치 식별자 해시, 방문별 인정 활동 시간과 횟수, 위험 신호. 크루 이벤트의 중복 참여 탐지와 운영자 검토에 사용합니다.</li>
          </ul>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ color: '#00f3ff', borderLeft: '4px solid #00f3ff', paddingLeft: '1rem', marginBottom: '1.2rem' }}>2. 데이터의 사용 및 목적</h2>
          <p>수집된 데이터는 오직 다음 목적을 위해서만 사용됩니다:</p>
          <ul style={{ paddingLeft: '1.5rem' }}>
            <li>사용자가 캡처한 화면을 '스텔라 아고라' 게시판에 업로드하여 질문 기능 수행</li>
            <li>사용자의 질문 내역 및 활동 기록 보관 및 표시</li>
            <li>서비스의 안정적인 운영 및 기술 지원</li>
            <li>방 개설자가 허용한 스터디 크루 게스트 체험 제공</li>
            <li>스터디 크루 이벤트 인원 산정, 중복·비정상 게스트 탐지 및 이의 검토</li>
          </ul>
          <p style={{ color: '#ff4d4d', fontWeight: 'bold' }}>※ 당사는 사용자의 데이터를 판매하지 않습니다. 선택 동의한 광고 성과 측정은 아래 안내한 범위로만 처리합니다.</p>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ color: '#00f3ff', borderLeft: '4px solid #00f3ff', paddingLeft: '1rem', marginBottom: '1.2rem' }}>3. 데이터의 보관 및 파기</h2>
          <p>사용자의 데이터는 서비스 이용 기간 동안 구글 파이어베이스(Firebase) 보안 서버에 보관됩니다. 사용자가 요청하거나 탈퇴할 경우 관련 법령상 보관이 필요한 정보를 제외하고 파기합니다.</p>
          <ul style={{ paddingLeft: '1.5rem' }}>
            <li>게스트는 정식 학습자 프로필, 광석, 출석 또는 랭킹 기록을 생성하지 않습니다.</li>
            <li>게스트 감사 정보와 IP·설치 식별자 해시는 마지막 이용일부터 최대 30일간 보관한 뒤 자동 파기하며, 운영자가 계정을 삭제하면 즉시 이벤트 인원에서 제외됩니다.</li>
          </ul>
        </section>

        <section id="openai-ads-measurement" style={{ marginBottom: '2.5rem' }}>
          <h2>선택적 OpenAI 광고 성과 측정</h2>
          <p>OpenAI 광고를 통해 파이썬 체험 페이지에 방문한 보호자가 신청 화면에서 별도로 선택 동의하면, 신청 저장 후 MetaSense 서버가 신청 완료 이벤트·시각·임의 이벤트 식별자·광고 클릭 식별자(oppref)·파이썬 페이지 주소를 OpenAI에 전송합니다. 광고 클릭이 신청으로 이어졌는지 확인하기 위한 처리입니다.</p>
          <p>이름·이메일·전화번호·학생 정보·학습 기록·방문자 IP는 전환 요청에 포함하지 않습니다. 개인정보 자동 매칭 Pixel은 설치하지 않으며 이벤트는 개인화 사용 제외(opt_out)로 전송합니다. 광고 클릭 식별자는 URL에서 읽고 별도 쿠키나 브라우저 저장소에 보관하지 않습니다.</p>
          <p>동의하지 않아도 무료체험을 신청할 수 있습니다. 신청 전에 체크를 해제할 수 있으며, 이 선택은 이번 신청에만 적용됩니다. OpenAI의 이벤트 처리와 보관은 <a href="https://openai.com/policies/conversion-terms/" target="_blank" rel="noopener noreferrer">전환 약관</a> 및 해당 개인정보 정책에 따릅니다.</p>
        </section>

        <section aria-labelledby="studio-ai-privacy" style={{ marginBottom: '2.5rem', padding: '1.5rem', border: '1px solid #35575b', borderRadius: 12 }}>
          <h2 id="studio-ai-privacy" style={{ color: '#67e8f9' }}>4. 코드 스튜디오 AI 도움</h2>
          <p>2026년 9월 16일부터 적용되는 선택적 AI 도움 안내입니다. 아래와 같이 변환한 코드 구조만 처리하며, 현재 ZDR 승인은 대기 중입니다. 개인정보 처리에 필요한 보호자 안내·동의는 별도로 적용합니다.</p>
          <h3>학생과 보호자가 알아두실 내용</h3>
          <p>기본 힌트는 학생의 브라우저에서 코드를 살펴봅니다. AI 도움은 선택 사항이며, 원본 코드를 그대로 보내는 기능이 아닙니다. AI 도움을 요청하지 않아도 코드 작성·실행과 과제 제출을 이용할 수 있습니다.</p>
          <ul>
            <li><strong>목적:</strong> 파이썬 오류의 원인과 다음 확인 방법을 학생 눈높이로 설명하기 위한 학습 지원.</li>
            <li><strong>전송 대상:</strong> 오류 또는 동작 점검과 관련된 제한된 코드 구조, 오류·동작 점검 분류, 줄 위치, 파일/노트북 모드, 기본 분석에서 발견한 점검 유형. 코드의 직접 지은 이름은 일관된 별명으로 바꾸며 문자열·숫자의 실제 값과 주석은 제외합니다.</li>
            <li><strong>AI 요청에서 제외:</strong> 이름·이메일·학교·연락처 등 학생 프로필, 학생 계정 ID, 파일명·경로, 코드의 사용자 정의 이름과 실제 값, 원문 오류 메시지. 학생의 인증 토큰과 IP 주소를 OpenAI 요청에 덧붙이지 않습니다.</li>
            <li><strong>처리 방법:</strong> 브라우저에서 먼저 변환하고 MetaSense 서버가 허용된 구조인지 확인한 뒤 OpenAI API로 요청합니다. AI 제공자는 MetaSense의 API 계정과 서버 접속 정보를 처리합니다. 계정 인증·권한 확인은 MetaSense에서 별도로 수행합니다.</li>
            <li><strong>한계:</strong> 이 조치는 불필요한 정보 전송을 줄이기 위한 것입니다. 모든 코드의 완전한 익명성이나 의미 보존을 보장한다는 뜻은 아닙니다. 실제 값·동적 코드 등을 알아야 판단할 수 있는 지원 범위 밖의 오류에는 외부 요청을 하지 않습니다.</li>
          </ul>
          <h3>외부 처리와 보관</h3>
          <p>선택한 AI 도움은 OpenAI API를 이용합니다. 응답 저장을 요청하지 않는 설정(store: false)을 사용하지만, 이는 Zero Data Retention(ZDR)과 다릅니다. OpenAI의 일반 API 정책상 오남용 모니터링을 위한 내용은 원칙적으로 최대 30일 보관될 수 있으며 법령·안전상 예외가 있습니다. API 콘텐츠는 별도 동의가 없는 한 모델 학습에 사용되지 않는다는 제공자의 정책을 따릅니다.</p>
          <p>이 기능은 코드 원문·오류 원문·AI 답변을 MetaSense의 사용량 장부에 저장하지 않습니다. 중복 요청 및 비용 제한을 위해 계정 식별자를 서버 비밀키로 변환한 값, 요청 지문, 횟수와 시각을 별도로 처리합니다. 사용자별 사용량은 3일, 일별 총량은 40일, 월별 총량은 100일을 삭제 기준으로 하며 일일 정리 작업에서 만료 기록을 삭제합니다. 답변은 화면 표시와 중복 호출 방지를 위해 메모리에 임시 보관합니다. 계정 인증과 서비스 접속 기록은 별도의 서비스 운영 정보입니다.</p>
          <h3>도움 설명 개선 참여 — 선택, 도입 예정</h3>
          <p>운영 준비를 마친 뒤 별도로 켜는 기능입니다. 참여하지 않아도 기본 힌트와 이용 가능한 AI 도움을 받을 수 있습니다. 참여 선택은 현재 탭에서 유지되며 언제든 해제할 수 있습니다.</p>
          <ul>
            <li>선택한 질문 유형, 기본 설명의 버전, 오류 유형, 코드 수정 여부, 재실행 결과, 시간 구간과 AI 추가 요청 여부를 집계합니다. 코드 원문·변수 이름·파일 경로·질문 원문은 관찰 기록에 포함하지 않습니다. 학생별 성적이나 순위 산정에 사용하지 않습니다.</li>
            <li>중복 및 과도한 기여 방지를 위한 계정 기반 해시와 임시 기록은 7일, 내용 없는 집계와 참여 요청의 토큰 사용량은 90일을 삭제 기준으로 합니다. 이 식별값을 OpenAI에 보내지 않습니다.</li>
            <li>변환 사례 보관을 별도로 켠 경우 참여 안내에 표시합니다. 참여한 AI 요청 중 이미 변환된 코드 구조와 원래 이름을 복원하기 전 AI 답변만 유형별 하루 최대 3건 보관하며, 14일을 삭제 기준으로 합니다. 관리자가 설명을 검토하는 데 사용하고 학생 화면에 그대로 재배포하지 않습니다.</li>
            <li>삭제 기한이 지난 자료는 일일 삭제 작업으로 처리합니다. 작업 한도나 장애로 지연될 경우 후속 작업에서 삭제합니다. 검토 후 작성한 일반적인 합성 예제와 설명 카드·관리자의 승인 이력은 운영 지식으로 별도 관리합니다.</li>
          </ul>
          <p>개인정보의 국외 이전을 수반하는 방식으로 범위를 확대하는 경우에는 이전 항목, 국가, 시기·방법, 이전받는 법인의 명칭·연락처, 목적·보유기간, 거부 방법과 영향을 실제 계약·처리 위치에 맞춰 먼저 고지하고 필요한 법적 요건을 갖춥니다. 이 개정안은 원본 코드나 아동 개인정보의 국외 이전에 대한 포괄 동의서가 아닙니다.</p>
          <h3>아동 보호와 이용자의 선택</h3>
          <p>만 14세 미만 아동의 개인정보 처리에 동의가 필요한 경우에는 법정대리인의 동의를 받고 그 동의 여부를 확인해야 합니다. 학생이 전송 내용을 확인하는 화면은 법정대리인 동의 절차를 대신하지 않습니다. 미성년자의 AI 서비스 이용에 필요한 보호자 동의와 외부 제공자의 ZDR 조건은 별도로 확인합니다.</p>
          <p>AI 도움을 원하지 않으면 요청 버튼을 누르지 않거나 전송 확인에서 돌아가면 됩니다. 이용 중단, 관련 정보의 열람·정정·삭제·처리정지 문의는 paul@dulcine.net으로 접수할 수 있습니다. 설명이 맞지 않으면 원본 코드와 기본 힌트를 선생님과 함께 확인해 주세요.</p>
          <p><a href="https://developers.openai.com/api/docs/guides/your-data" style={{ color: '#93c5fd' }}>OpenAI API 데이터 처리 안내</a> · <a href="https://developers.openai.com/api/docs/guides/safety-checks/under-18-api-guidance" style={{ color: '#93c5fd' }}>미성년자 보호 지침</a></p>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ color: '#00f3ff', borderLeft: '4px solid #00f3ff', paddingLeft: '1rem', marginBottom: '1.2rem' }}>5. 문의처</h2>
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
    </div>
  );
};

export default PrivacyPolicy;
