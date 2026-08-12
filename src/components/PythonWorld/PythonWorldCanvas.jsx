import { useMemo } from 'react'

function getVisibleWorld(mission, events, playhead) {
  const base = mission?.world || {}
  const rover = { ...(base.rover || { x: 0, y: 0, direction: 0, energy: 100 }) }
  const objects = (base.objects || []).map((item) => ({ ...item }))
  const visible = Array.isArray(events) ? events.slice(0, Math.max(0, playhead + 1)) : []
  for (const event of visible) {
    if (event?.type === 'world' && event.end) Object.assign(rover, event.end)
    if (event?.type === 'line' && event.rover) Object.assign(rover, event.rover)
    if (event?.type === 'world' && event.action === 'collect' && event.object?.id) {
      const targetObject = objects.find((item) => item.id === event.object.id)
      if (targetObject) targetObject.collected = true
    }
  }
  return { ...base, rover, objects }
}

export default function PythonWorldCanvas({ mission, events = [], playhead = -1 }) {
  const world = useMemo(() => getVisibleWorld(mission, events, playhead), [mission, events, playhead])
  const width = Math.max(1, Number(world.width) || 8)
  const height = Math.max(1, Number(world.height) || 5)
  const rover = world.rover || { x: 0, y: 0, direction: 0, energy: 100 }
  const target = world.target || { x: width - 1, y: Math.floor(height / 2) }
  const obstacles = Array.isArray(world.obstacles) ? world.obstacles : []
  const objects = Array.isArray(world.objects) ? world.objects.filter((item) => !item.collected) : []
  const cellStyle = (x, y) => ({
    left: `${((x + 0.5) / width) * 100}%`,
    top: `${((y + 0.5) / height) * 100}%`,
  })

  return (
    <section className="python-world" aria-label="루미 미션 월드">
      <div className="python-world__sky" />
      <div
        className="python-world__grid"
        style={{ '--grid-columns': width, '--grid-rows': height }}
      >
        {obstacles.map((obstacle, index) => (
          <div
            className="python-world__obstacle"
            key={`${obstacle.x}-${obstacle.y}-${index}`}
            style={cellStyle(obstacle.x, obstacle.y)}
          >
            ◆
          </div>
        ))}
        {objects.map((item, index) => (
          <div
            className={`python-world__object python-world__object--${item.kind || 'signal'}`}
            key={item.id || `${item.kind}-${index}`}
            style={cellStyle(item.x, item.y)}
            title={`${item.kind || 'signal'} (${item.x}, ${item.y})`}
          >
            {item.kind === 'charge' ? '⚡' : item.kind === 'sample' ? '◆' : '◈'}
          </div>
        ))}
        <div className="python-world__beacon" style={cellStyle(target.x, target.y)}>
          <span className="python-world__beacon-core" />
          <span className="python-world__beacon-label">TARGET</span>
        </div>
        <div
          className="python-world__rover"
          style={{ ...cellStyle(rover.x, rover.y), '--rover-rotation': `${Number(rover.direction) || 0}deg` }}
        >
          <span className="python-world__rover-glow" />
          <span className="python-world__rover-body">▲</span>
          <span className="python-world__rover-label">LUMI</span>
        </div>
      </div>
      <div className="python-world__hud">
        <span>좌표 {rover.x}, {rover.y}</span>
        <span>에너지 {rover.energy ?? 100}</span>
        <span>방향 {rover.direction ?? 0}°</span>
      </div>
    </section>
  )
}
