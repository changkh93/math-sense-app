import { useEffect, useRef, useState } from 'react'

// A fresh keyed form per request also prevents the last answer being reused.
export default function StudioInput({ request, onSubmitted }) {
  const [value, setValue] = useState('')
  const field = useRef(null)
  const sent = useRef(false)
  useEffect(() => { field.current?.focus({ preventScroll: true }) }, [])
  const submit = event => {
    event.preventDefault()
    if (sent.current) return
    sent.current = true
    request.submit(value)
    onSubmitted()
  }
  return <form className="pgs-input-form" onSubmit={submit} aria-label="Python 입력">
    <label htmlFor="pgs-input-value">입력 대기 · 값을 적고 Enter를 누르세요</label>
    <div><input id="pgs-input-value" ref={field} value={value} onChange={event => setValue(event.target.value)} maxLength={8192} aria-label={request.prompt || '입력값'} autoComplete="off" spellCheck={false} onKeyDown={event => {
      // Enter used to commit Korean composition must not submit the answer.
      if (event.key === 'Enter' && (event.nativeEvent.isComposing || event.keyCode === 229)) event.preventDefault()
    }} /><button type="submit">입력</button></div>
  </form>
}
