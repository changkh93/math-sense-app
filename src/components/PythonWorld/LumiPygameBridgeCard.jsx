export default function LumiPygameBridgeCard({ bridge }) {
  if (!bridge) return null

  const { lumiCode, pygameCode, commonIdea } = bridge

  return (
    <div className="python-lab__pygame-bridge-card" role="region" aria-label="Pygame 브릿지 개념 연결">
      <div className="python-lab__pygame-bridge-title">
        <span>🎮</span>
        <strong>PYGAME로 이어지는 게임 제작 원리</strong>
      </div>
      <p className="python-lab__pygame-bridge-note">
        LUMI의 <code>game</code>은 학습용 도구입니다. 실제 pygame과 이름이나 좌표 단위는 다르지만, 아래의 문제 해결 순서가 이어집니다.
      </p>
      <div className="python-lab__pygame-bridge-grid">
        <div className="python-lab__pygame-bridge-col">
          <div className="python-lab__pygame-bridge-col-header">LUMI에서 익힌 코드</div>
          <code>{lumiCode}</code>
        </div>
        <div className="python-lab__pygame-bridge-col python-lab__pygame-bridge-col--pygame">
          <div className="python-lab__pygame-bridge-col-header">나중에 pygame에서 만날 코드</div>
          <code>{pygameCode}</code>
        </div>
      </div>
      {commonIdea && (
        <div className="python-lab__pygame-bridge-common">
          <strong>💡 공통 생각: </strong>
          <span>{commonIdea}</span>
        </div>
      )}
    </div>
  )
}
