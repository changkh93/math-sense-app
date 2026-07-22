import { Clock3, Compass, LogOut, RefreshCw, ShieldCheck, Sparkles, X } from 'lucide-react'
import { useEffect, useState } from 'react'

function formatMinutes(seconds) {
  const safe = Math.max(0, Number(seconds || 0))
  if (safe === 0) return '0분'
  if (safe < 60) return '1분 미만'
  return `${Math.ceil(safe / 60)}분`
}

function formatCountdown(seconds) {
  const safe = Math.max(0, Math.ceil(Number(seconds || 0)))
  if (safe > 120) return `${Math.ceil(safe / 60)}분`
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`
}

function formatClock(ms) {
  if (!ms) return ''
  return new Intl.DateTimeFormat('ko-KR', { hour: 'numeric', minute: '2-digit' }).format(new Date(ms))
}

function blockedCopy(access) {
  if (access?.blockedReason === 'cooldown') {
    return {
      title: '행성이 잠시 쉬고 있어요',
      detail: `${formatClock(access?.runtime?.nextAllowedAtMs)}부터 다시 탐험할 수 있습니다.`,
    }
  }
  if (access?.blockedReason === 'daily_limit') {
    return { title: '오늘의 탐험을 모두 마쳤어요', detail: '내일 다시 아스트라 프론티어에서 만나요.' }
  }
  if (access?.blockedReason === 'active_session') {
    return { title: '이미 탐험 중인 세션이 있어요', detail: '기존 창이나 기기에서 탐험을 계속해 주세요.' }
  }
  return { title: '탐험 준비 신호를 확인해 주세요', detail: '잠시 뒤 다시 시도할 수 있습니다.' }
}

export function GalaxyEntryDialog({ access, busy, error, onStart, onClose, onRetry }) {
  const policy = access?.policy || { dailyLimitSeconds: 1800, sessionLimitSeconds: 900 }
  const daily = access?.daily || { usedSeconds: 0, remainingSeconds: policy.dailyLimitSeconds }
  const blocked = blockedCopy(access)
  const ready = access?.canStart === true
  return (
    <div className="galaxy-play-overlay galaxy-play-entry" role="dialog" aria-modal="true" aria-labelledby="galaxy-play-entry-title">
      <section className="galaxy-play-panel">
        <span className="galaxy-play-panel__icon"><Compass size={28} aria-hidden="true" /></span>
        <small>ASTRA FRONTIER · 탐험 준비</small>
        <h2 id="galaxy-play-entry-title">{ready ? '오늘의 행성으로 출발할까요?' : blocked.title}</h2>
        <p>{ready ? '짧고 편안하게 둘러본 뒤 안전하게 귀환합니다.' : blocked.detail}</p>

        {access && (
          <div className="galaxy-play-entry__stats">
            <span><small>오늘 게임시간</small><strong>{formatMinutes(daily.usedSeconds)} / {formatMinutes(policy.dailyLimitSeconds)}</strong></span>
            <span><small>이번 탐험</small><strong>최대 {formatMinutes(Math.min(policy.sessionLimitSeconds, daily.remainingSeconds))}</strong></span>
          </div>
        )}

        <div className="galaxy-play-privacy">
          <ShieldCheck size={17} aria-hidden="true" />
          <span>게임에 들어와 있는 시간이 게임시간이에요. 부모님은 날짜별 게임시간·접속 횟수·가장 긴 이용시간만 확인할 수 있어요. 친구 대화와 행성 활동은 보이지 않아요.</span>
        </div>

        {error && <p className="galaxy-play-error" role="alert">{error}</p>}
        <div className="galaxy-play-actions">
          {ready ? (
            <button type="button" className="galaxy-play-primary" disabled={Boolean(busy)} onClick={onStart}>
              {busy === 'start' ? <><RefreshCw size={17} className="is-spinning" /> 입장 승인 중…</> : <><Sparkles size={17} /> 탐험 시작</>}
            </button>
          ) : (
            <button type="button" className="galaxy-play-primary" disabled={Boolean(busy)} onClick={onRetry}>
              <RefreshCw size={17} /> 상태 다시 확인
            </button>
          )}
          <button type="button" className="galaxy-play-secondary" disabled={Boolean(busy)} onClick={onClose}>돌아가기</button>
        </div>
      </section>
    </div>
  )
}

export function GalaxyPlayHud({ remainingSeconds, dailyUsedSeconds, dailyLimitSeconds, warningStage, onExit }) {
  const warning = warningStage > 0
  return (
    <aside className={`galaxy-play-hud${warning ? ' is-warning' : ''}`} aria-live="polite">
      <Clock3 size={17} aria-hidden="true" />
      <div>
        <small>{warningStage === 1 ? '안전 귀환까지' : '이번 탐험'}</small>
        <strong>{formatCountdown(remainingSeconds)}</strong>
        <span>오늘 {formatMinutes(dailyUsedSeconds)} / {formatMinutes(dailyLimitSeconds)}</span>
      </div>
      <button type="button" onClick={onExit} aria-label="탐험 마치고 귀환"><LogOut size={17} /></button>
    </aside>
  )
}

export function GalaxyIdlePrompt({ onContinue, onExit }) {
  return (
    <div className="galaxy-play-overlay galaxy-play-idle" role="alertdialog" aria-modal="true" aria-labelledby="galaxy-play-idle-title">
      <section className="galaxy-play-panel compact">
        <span className="galaxy-play-panel__icon"><Clock3 size={25} aria-hidden="true" /></span>
        <h2 id="galaxy-play-idle-title">계속 탐험하고 있나요?</h2>
        <p>하늘을 보거나 자연음을 듣고 있었다면 계속 탐험을 눌러주세요. 2분 동안 응답이 없으면 행성이 안전하게 귀환합니다.</p>
        <div className="galaxy-play-actions">
          <button type="button" className="galaxy-play-primary" autoFocus onClick={onContinue}>계속 탐험</button>
          <button type="button" className="galaxy-play-secondary" onClick={onExit}>지금 귀환</button>
        </div>
      </section>
    </div>
  )
}

export function GalaxyReconnectNotice() {
  return (
    <div className="galaxy-play-reconnect" role="status" aria-live="polite">
      <RefreshCw size={16} className="is-spinning" aria-hidden="true" />
      <span><strong>같은 탐험을 복구하고 있어요</strong><small>2분 안에 연결되면 남은 시간 그대로 이어집니다.</small></span>
    </div>
  )
}

export function GalaxyTimeWarning({ stage }) {
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    setDismissed(false)
  }, [stage])

  if (!stage || dismissed) return null
  const text = stage === 5
    ? '5분 남았어요. 마지막으로 하고 싶은 활동을 천천히 골라주세요.'
    : stage === 2
      ? '2분 뒤 안전 귀환합니다. 진행 중인 꾸미기도 안전하게 보관할게요.'
      : '1분 뒤 안전 귀환합니다. 새로운 장시간 탐사는 시작할 수 없어요.'
  return (
    <div className={`galaxy-play-time-warning stage-${stage}`} role="status" aria-live="polite">
      <span>{text}</span>
      <button type="button" className="galaxy-warning-dismiss" onClick={() => setDismissed(true)} aria-label="알림 닫기">
        <X size={15} aria-hidden="true" />
      </button>
    </div>
  )
}

export function GalaxyReturnScreen({ summary, onConfirm }) {
  return (
    <main className="galaxy-return-screen">
      <section className="galaxy-return-card">
        <span className="galaxy-return-orbit"><i /></span>
        <small>SAFE RETURN COMPLETE</small>
        <h1>{summary?.title || '이번 탐험을 안전하게 마쳤어요.'}</h1>
        <p>진행 중이던 행성 변화도 안전하게 보관했습니다.</p>
        <div className="galaxy-return-summary">
          <span><small>이번 탐험</small><strong>{formatMinutes(summary?.chargedSeconds)}</strong></span>
          <span><small>다음 탐험</small><strong>{formatClock(summary?.nextAllowedAtMs)}</strong></span>
        </div>
        <button type="button" className="galaxy-play-primary" onClick={onConfirm}>메타센스로 돌아가기</button>
      </section>
    </main>
  )
}

export function GalaxyPlayTimeStyles() {
  return <style>{`
    .galaxy-play-overlay{position:fixed;inset:0;z-index:9000;display:grid;place-items:center;padding:max(18px,env(safe-area-inset-top)) 18px max(18px,env(safe-area-inset-bottom));background:radial-gradient(circle at 50% 20%,rgba(68,214,166,.16),transparent 38%),rgba(2,8,18,.84);backdrop-filter:blur(16px)}
    .galaxy-play-panel{width:min(520px,100%);padding:30px;border-radius:28px;color:#f8fffc;background:linear-gradient(155deg,rgba(13,34,43,.98),rgba(5,14,28,.98));border:1px solid rgba(120,239,196,.28);box-shadow:0 30px 90px rgba(0,0,0,.55);text-align:center}.galaxy-play-panel.compact{width:min(450px,100%)}
    .galaxy-play-panel__icon{width:58px;height:58px;margin:0 auto 14px;border-radius:19px;display:grid;place-items:center;color:#78efc5;background:rgba(92,237,188,.11);border:1px solid rgba(120,239,196,.25)}
    .galaxy-play-panel>small,.galaxy-return-card>small{color:#7cf1c7;font-weight:900;letter-spacing:.16em}.galaxy-play-panel h2{margin:10px 0 8px;font-size:clamp(1.45rem,5vw,2.1rem);letter-spacing:-.04em}.galaxy-play-panel>p{margin:0;color:#adc1ce;line-height:1.65}
    .galaxy-play-entry__stats{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:22px 0}.galaxy-play-entry__stats span,.galaxy-return-summary span{display:grid;gap:5px;padding:15px;border-radius:16px;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.075)}.galaxy-play-entry__stats small,.galaxy-return-summary small{color:#8095a5}.galaxy-play-entry__stats strong,.galaxy-return-summary strong{font-size:1.08rem}
    .galaxy-play-privacy{display:flex;gap:10px;text-align:left;padding:13px 14px;border-radius:14px;color:#9fb9b2;background:rgba(84,215,174,.07);font-size:.78rem;line-height:1.55}.galaxy-play-privacy svg{flex:0 0 auto;color:#70e9bf;margin-top:2px}.galaxy-play-error{color:#ff9aa9!important;background:rgba(255,96,120,.08);padding:10px;border-radius:10px;margin-top:12px!important}
    .galaxy-play-actions{display:flex;gap:10px;margin-top:20px}.galaxy-play-primary,.galaxy-play-secondary{min-height:48px;padding:0 18px;border-radius:15px;border:1px solid transparent;font:inherit;font-weight:850;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:8px}.galaxy-play-primary{flex:1;color:#061813;background:linear-gradient(135deg,#7cf0c4,#62d8f1);box-shadow:0 12px 30px rgba(81,225,186,.2)}.galaxy-play-secondary{color:#c1d0da;background:rgba(255,255,255,.05);border-color:rgba(255,255,255,.1)}.galaxy-play-primary:disabled,.galaxy-play-secondary:disabled{opacity:.55;cursor:not-allowed}
    .galaxy-play-hud{position:fixed;z-index:5200;right:max(18px,env(safe-area-inset-right));top:max(18px,env(safe-area-inset-top));display:flex;align-items:center;gap:10px;padding:10px 11px 10px 13px;color:#eafff7;background:rgba(5,25,27,.86);border:1px solid rgba(109,236,190,.25);border-radius:17px;box-shadow:0 10px 35px rgba(0,0,0,.36);backdrop-filter:blur(15px)}.galaxy-play-hud>svg{color:#76eec3}.galaxy-play-hud>div{display:grid;line-height:1.15}.galaxy-play-hud small{font-size:.58rem;color:#82ab9f;letter-spacing:.08em}.galaxy-play-hud strong{font-size:1.02rem}.galaxy-play-hud span{font-size:.61rem;color:#9cafb7;margin-top:3px}.galaxy-play-hud button{width:34px;height:34px;border-radius:11px;border:1px solid rgba(255,255,255,.09);color:#c5d8d2;background:rgba(255,255,255,.05);display:grid;place-items:center;cursor:pointer}.galaxy-play-hud.is-warning{border-color:rgba(255,207,102,.45);background:rgba(42,29,10,.9)}.galaxy-play-hud.is-warning>svg{color:#ffd471}
    .galaxy-play-reconnect{position:fixed;z-index:7000;top:calc(max(1rem,env(safe-area-inset-top)) + 64px);left:50%;transform:translateX(-50%);display:flex;gap:10px;align-items:center;width:min(390px,calc(100vw - 28px));padding:12px 14px;border-radius:15px;color:#dff9ff;background:rgba(8,27,41,.94);border:1px solid rgba(108,211,244,.28);box-shadow:0 15px 45px rgba(0,0,0,.4)}.galaxy-play-reconnect svg{color:#73dcff;flex:0 0 auto}.galaxy-play-reconnect span{display:grid}.galaxy-play-reconnect small{color:#8da9b7;font-size:.7rem;margin-top:2px}
    .galaxy-play-time-warning{position:fixed;z-index:6100;top:calc(max(1rem,env(safe-area-inset-top)) + 58px);left:50%;transform:translateX(-50%);display:flex;align-items:center;justify-content:space-between;gap:12px;width:min(560px,calc(100vw - 28px));padding:10px 14px 10px 18px;border-radius:15px;text-align:left;color:#ffe9b2;background:rgba(46,31,10,.94);border:1px solid rgba(255,204,92,.38);box-shadow:0 14px 38px rgba(0,0,0,.42);font-size:.82rem;font-weight:750;backdrop-filter:blur(14px)}
    .galaxy-warning-dismiss{display:grid;place-items:center;flex:0 0 auto;width:26px;height:26px;border:1px solid rgba(255,204,92,.25);border-radius:8px;color:#ffe9b2;background:rgba(255,204,92,.1);cursor:pointer;transition:all .15s ease}
    .galaxy-warning-dismiss:hover{background:rgba(255,204,92,.28);color:#fff}
    .galaxy-return-screen{min-height:100dvh;display:grid;place-items:center;padding:22px;color:white;background:radial-gradient(circle at 50% 28%,rgba(61,210,162,.18),transparent 28%),linear-gradient(#04111d,#02060e)}.galaxy-return-card{width:min(560px,100%);text-align:center;padding:38px 30px;border-radius:30px;background:rgba(7,22,34,.92);border:1px solid rgba(115,236,195,.22);box-shadow:0 35px 100px rgba(0,0,0,.5)}.galaxy-return-card h1{margin:14px 0 9px;font-size:clamp(1.7rem,6vw,2.6rem);letter-spacing:-.05em}.galaxy-return-card>p{color:#a6bac5}.galaxy-return-summary{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:24px 0}.galaxy-return-orbit{display:block;width:76px;height:76px;margin:0 auto 18px;border:1px solid rgba(116,240,199,.35);border-radius:50%;position:relative;animation:galaxyReturnSpin 7s linear infinite}.galaxy-return-orbit:before{content:'';position:absolute;inset:18px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#d8fff0,#58cc9e 45%,#123b46)}.galaxy-return-orbit i{position:absolute;width:10px;height:10px;top:-5px;left:33px;border-radius:50%;background:#8ef5d0;box-shadow:0 0 16px #8ef5d0}
    .is-spinning{animation:galaxyReturnSpin 1.4s linear infinite}@keyframes galaxyReturnSpin{to{transform:rotate(360deg)}}
    @media(max-width:700px){.galaxy-play-panel{padding:23px 18px;border-radius:23px}.galaxy-play-actions{flex-direction:column}.galaxy-play-secondary{width:100%}.galaxy-play-hud{top:auto;right:16px;bottom:calc(112px + env(safe-area-inset-bottom));padding:9px}.galaxy-play-hud span{display:none}.galaxy-play-time-warning{top:calc(max(4.65rem,env(safe-area-inset-top)) + 46px);width:calc(100vw - 24px);font-size:.72rem}.galaxy-return-card{padding:30px 19px}.galaxy-play-entry__stats,.galaxy-return-summary{gap:7px}}
  `}</style>
}
