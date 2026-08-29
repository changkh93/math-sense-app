import { useState } from 'react'
import AlgorithmMissionShell from '../shell/AlgorithmMissionShell.jsx'
import { AC_COND_001 } from '../../shared/problems/ac_cond_001.js'
import { AC_PAT_003_PUBLIC_KERNEL } from '../../shared/problems/ac_pat_003.js'
import { createAlgorithmConstellationMockGateway } from '../services/AlgorithmConstellationMockGateway.js'
import { createAlgorithmConstellationGateway } from '../services/AlgorithmConstellationGateway.js'
import { clearAlgorithmDraft } from '../services/algorithmDraftStorage.js'

const PROBLEMS = [
  {
    kernel: AC_COND_001,
    tag: '조건 분해 (Phase 2)',
    badge: 'Vertical Slice',
    icon: '⚡',
  },
  {
    kernel: AC_PAT_003_PUBLIC_KERNEL,
    tag: '주기 패턴 & 모듈로 % (Phase 4)',
    badge: 'Variable Lens',
    icon: '❄️',
  },
]

export default function AlgorithmConstellationDevHub() {
  const [selectedProblem, setSelectedProblem] = useState(null)
  const [selectedIntent, setSelectedIntent] = useState('learn')
  const [selectedShell, setSelectedShell] = useState('explorer')
  const [useRealGateway, setUseRealGateway] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 3000)
  }

  const handleClearDraft = (problemId, version = 1) => {
    clearAlgorithmDraft({ problemId, problemVersion: version, ownerKey: 'algorithm-dev' })
    showToast(`[${problemId}] 저장된 로컬 Draft를 초기화했습니다.`)
  }

  const gatewayInstance = useRealGateway
    ? createAlgorithmConstellationGateway()
    : createAlgorithmConstellationMockGateway()

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at top, #0b192c 0%, #030712 100%)', color: '#fff' }}>
      {selectedProblem ? (
        <AlgorithmMissionShell
          key={`${selectedProblem.id}_${selectedIntent}_${selectedShell}_${useRealGateway ? 'real' : 'mock'}`}
          kernel={selectedProblem}
          initialShell={selectedShell}
          intent={selectedIntent}
          gateway={gatewayInstance}
          draftOwnerKey="algorithm-dev"
          onExit={() => setSelectedProblem(null)}
        />
      ) : (
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 20px' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '24px' }}>
            <div>
              <div style={{ fontSize: '13px', color: '#00f0ff', fontFamily: 'monospace', fontWeight: 'bold', letterSpacing: '1px', marginBottom: '6px' }}>
                🌌 LUMI ALGORITHM CONSTELLATION
              </div>
              <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: '0 0 8px', color: '#fff' }}>
                생각의 항로 개발 및 테스트 연구소
              </h1>
              <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px', margin: 0 }}>
                학생 UX, 10단계 생애주기, Time-Travel 디버거, 적응형 Scaffold 및 오개념 진단을 직접 검증할 수 있습니다.
              </p>
            </div>

            <a
              href="/"
              style={{
                padding: '8px 16px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '13px',
                textDecoration: 'none',
                cursor: 'pointer',
              }}
            >
              🚀 메인 홈으로
            </a>
          </div>

          {/* Toast Notification */}
          {toastMessage && (
            <div style={{ marginBottom: '20px', padding: '12px 18px', background: 'rgba(16, 185, 129, 0.2)', border: '1px solid #10b981', borderRadius: '10px', color: '#a7f3d0', fontSize: '13px' }}>
              ✅ {toastMessage}
            </div>
          )}

          {/* Control Panel / Pre-Launch Config */}
          <div style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(0, 240, 255, 0.3)', borderRadius: '16px', padding: '24px', marginBottom: '32px' }}>
            <h3 style={{ fontSize: '15px', color: '#38bdf8', margin: '0 0 16px', fontWeight: 'bold' }}>
              🛠️ 시뮬레이션 환경 설정 (Pre-flight Configuration)
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
              {/* Intent Mode */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '8px' }}>
                  🎯 탐사 목적 (Intent)
                </label>
                <select
                  value={selectedIntent}
                  onChange={(e) => setSelectedIntent(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    background: '#030712',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#fff',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                >
                  <option value="learn">일반 학습 (Learn - 화면보호 완화)</option>
                  <option value="ai_research">AI 사고 연구 (AI Research)</option>
                  <option value="independent_return">독립 귀환 재진입 (Independent Return)</option>
                  <option value="arena">아레나 평가 (Arena - 엄격 무결성)</option>
                </select>
              </div>

              {/* Shell Mode */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '8px' }}>
                  🧭 인지 셸 (Cognitive Shell)
                </label>
                <select
                  value={selectedShell}
                  onChange={(e) => setSelectedShell(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    background: '#030712',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#fff',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                >
                  <option value="explorer">Explorer (초등 친화적 인터랙션)</option>
                  <option value="navigator">Navigator (중등 표준 렌즈)</option>
                  <option value="pro">Pro (전문가 텍스트 중심)</option>
                </select>
              </div>

              {/* Gateway Mode */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '8px' }}>
                  🌐 백엔드 게이트웨이
                </label>
                <select
                  value={useRealGateway ? 'real' : 'mock'}
                  onChange={(e) => setUseRealGateway(e.target.value === 'real')}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    background: '#030712',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#fff',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                >
                  <option value="mock">Mock Gateway (로컬 독립 테스트)</option>
                  <option value="real">Firebase Callable (실제 서버/Emulator)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Problem Mission Cards */}
          <h3 style={{ fontSize: '16px', color: '#fff', margin: '0 0 16px', fontWeight: 'bold' }}>
            🛰️ 탐사할 알고리즘 성단 미션 선택
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
            {PROBLEMS.map(({ kernel, tag, badge, icon }) => (
              <div
                key={kernel.id}
                style={{
                  background: 'rgba(10, 20, 40, 0.85)',
                  border: '1px solid rgba(0, 240, 255, 0.3)',
                  borderRadius: '16px',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '16px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '24px' }}>{icon}</span>
                    <span style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '12px', background: 'rgba(0, 240, 255, 0.15)', color: '#00f0ff', border: '1px solid rgba(0, 240, 255, 0.3)', fontWeight: 'bold' }}>
                      {badge}
                    </span>
                  </div>

                  <div style={{ fontSize: '12px', color: '#38bdf8', fontFamily: 'monospace', fontWeight: 'bold' }}>
                    {kernel.id} · {tag}
                  </div>
                  <h2 style={{ fontSize: '19px', margin: '8px 0 10px', color: '#fff' }}>
                    {kernel.identity?.studentTitle || kernel.identity?.systemName}
                  </h2>
                  <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.7)', margin: 0, lineHeight: '1.5' }}>
                    {kernel.identity?.shortDescription}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '16px' }}>
                  <button
                    type="button"
                    onClick={() => setSelectedProblem(kernel)}
                    style={{
                      flex: 1,
                      padding: '12px 18px',
                      background: 'linear-gradient(135deg, #00f0ff, #0284c7)',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#000',
                      fontWeight: 'bold',
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    🚀 탐사 시작 (Launch)
                  </button>

                  <button
                    type="button"
                    onClick={() => handleClearDraft(kernel.id, kernel.version)}
                    title="저장된 로컬 Draft 초기화"
                    style={{
                      padding: '12px 14px',
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      borderRadius: '8px',
                      color: '#fca5a5',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    🗑️ 초기화
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
