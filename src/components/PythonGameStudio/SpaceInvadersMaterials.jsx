import { useState } from 'react'

export default function SpaceInvadersMaterials({ busy, onOpen, onError }) {
  const [catalog, setCatalog] = useState(null)
  const [selected, setSelected] = useState('')
  const [loading, setLoading] = useState(false)
  async function loadCatalog(event) {
    if (!event.currentTarget.open || catalog || loading) return
    setLoading(true)
    try {
      const response = await fetch('/space-invaders/catalog.json')
      if (!response.ok) throw new Error('수업 단계 목록을 불러오지 못했습니다.')
      setCatalog(await response.json())
    } catch (error) { onError(error.message) }
    finally { setLoading(false) }
  }
  return <details onToggle={loadCatalog} style={{ margin: '1rem 0' }}>
    <summary>우주 방어대 단계 비교·수업 자료</summary>
    <p>Data Log를 보며 직접 작성한 뒤, 막힌 단계와 비교할 때 사용하세요. 선택한 코드는 에셋을 포함한 별도 프로젝트로 열립니다.</p>
    <label>비교할 단계 <select aria-label="우주 방어대 비교 단계" value={selected} disabled={busy || loading} onChange={event => setSelected(event.target.value)}>
      <option value="">단계를 선택하세요</option>
      {catalog && <optgroup label="누적 코드">{catalog.steps.map(step => <option key={step.id} value={step.id}>{step.id} {step.title}</option>)}</optgroup>}
      {catalog && <optgroup label="임시 시험 코드">{catalog.experiments.map(step => <option key={step.id} value={`experiments/${step.id}`}>{step.id} 시험과 복원 확인</option>)}</optgroup>}
      <option value="final-main">완성 게임 비교</option>
    </select></label>
    <button disabled={busy || !selected} onClick={() => onOpen(selected)}>선택 단계로 새 프로젝트</button>
    <p><a href="/space-invaders/space-invaders-course.zip" download>전체 수업 자료 ZIP</a> · <a href="/space-invaders/space-invaders-starter.mspygame.json" download>빈 시작 프로젝트</a></p>
  </details>
}
