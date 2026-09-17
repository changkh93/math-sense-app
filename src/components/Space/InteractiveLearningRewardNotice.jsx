import { Gem, LoaderCircle } from 'lucide-react'
import './InteractiveLearningRewardNotice.css'

export default function InteractiveLearningRewardNotice({ state }) {
  if (!state || state.status === 'idle') return null
  return (
    <div className={`ilr-notice is-${state.status}`} role="status" aria-live="polite">
      <span className="ilr-gem-burst">
        {state.status === 'loading' ? <LoaderCircle className="ilr-spinner" size={22} /> : <Gem size={22} />}
      </span>
      <span>{state.message}</span>
      {state.status === 'earned' && state.amount > 0 ? <strong>+{state.amount} 광석</strong> : null}
    </div>
  )
}
