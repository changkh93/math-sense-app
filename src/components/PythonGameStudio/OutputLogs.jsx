// Python may call write() separately for each argument, separator and newline.
// Event boundaries are transport chunks, not new lines. Keep adjacent stdout and
// stderr chunks in one preformatted block, preserving their exact characters.
export default function OutputLogs({ logs = [], onJumpToError }) {
  const groups = []
  logs.forEach((log, index) => {
    if (log.type === 'ERROR') {
      groups.push({ error: log, key: log.id ?? index })
    } else {
      let group = groups.at(-1)
      if (!group || group.error) { group = { chunks: [], key: log.id ?? index }; groups.push(group) }
      group.chunks.push(log)
    }
  })
  return groups.map(group => {
    if (!group.error) return <pre className="pgs-stream-output" key={group.key}>{group.chunks.map((log, index) => <span key={log.id ?? index} className={log.type === 'STDERR' ? 'pgs-error' : undefined}>{log.text}</span>)}</pre>
    const log = group.error
    const content = <><pre className="pgs-error">{log.text}</pre>{onJumpToError && <button onClick={() => onJumpToError(log.text)}>오류 줄로 이동</button>}</>
    return <section className="pgs-error-details" aria-label="오류 메시지" key={group.key}><strong className="pgs-error-heading">오류 메시지</strong>{content}</section>
  })
}
