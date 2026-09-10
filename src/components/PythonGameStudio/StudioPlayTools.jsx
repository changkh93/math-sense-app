export default function StudioPlayTools({ preferences, onPreferences }) {
  return <section className="pgs-play-tools" aria-label="코딩 도구">
    <div className="pgs-play-bar">
      <div className="pgs-color-key" aria-label="코드 색상 안내"><span className="pgs-code-variable">변수</span><span className="pgs-code-function">함수</span><span className="pgs-code-class">클래스</span><span className="pgs-code-string">문자열</span><span className="pgs-code-number">숫자</span></div>
      <label className="pgs-theme-picker">코드 색상 <select aria-label="코드 색상" value={preferences.theme} onChange={e => onPreferences({ ...preferences, theme: e.target.value })}><option value="aurora">오로라</option><option value="candy">캔디</option><option value="ocean">바다</option></select></label>
      <small title="입력 중 자동 추천 · ↑↓ 선택 · Enter 또는 Tab 적용 · Esc 닫기 · Ctrl+Space 또는 Alt+/ 다시 열기">자동 추천 · Ctrl+Space / Alt+/</small>
      <button aria-pressed={!preferences.playful} onClick={() => onPreferences({ ...preferences, playful: !preferences.playful })}>집중 모드 {preferences.playful ? '켜기' : '끄기'}</button>
    </div>
  </section>
}

export function RunFeedback({ status }) {
  const messages = { running: ['◉', '실행 중! 바꾼 부분이 어떻게 움직이는지 관찰해 보세요.'], exited: ['✦', '실행 완료! 예상한 결과와 같은지 살펴보세요.'], error: ['⌕', '오류도 힌트예요. 마지막 오류 메시지와 해당 줄부터 살펴보세요.'] }
  const message = messages[status]
  return message ? <div className={`pgs-run-feedback ${status}`} role="status"><span key={status} aria-hidden="true">{message[0]}</span>{message[1]}</div> : null
}
