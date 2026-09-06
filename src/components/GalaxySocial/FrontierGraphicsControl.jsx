import { FRONTIER_GRAPHICS } from './frontierPerformance'

export default function FrontierGraphicsControl({ graphics, inline = false }) {
  return <label className={`frontier-graphics-control${inline ? ' inline' : ''}`}>그래픽
    <select aria-label="그래픽 품질" value={graphics.mode} onChange={event => graphics.selectMode(event.target.value)}>
      {Object.entries(FRONTIER_GRAPHICS).map(([id, mode]) => <option key={id} value={id}>{mode.label}</option>)}
    </select>
    {inline && <small>느리면 ‘절약’을 선택하세요. 다음 탐험에도 유지됩니다.</small>}
  </label>
}
