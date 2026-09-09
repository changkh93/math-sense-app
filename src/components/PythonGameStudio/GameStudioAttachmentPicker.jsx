import { useEffect, useRef, useState } from 'react'
import { listDrafts } from './projectStore'
import { createStudioAttachments } from './assignmentAttachments'
import './GameStudioAttachmentPicker.css'

export default function GameStudioAttachmentPicker({ uid, onAdd, onBusyChange, disabled = false }) {
  const [listing, setListing] = useState({ uid, rows: null, error: '' })
  const [refresh, setRefresh] = useState(0)
  const [selectedId, setSelectedId] = useState('')
  const [paths, setPaths] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  useEffect(() => {
    let cancelled = false
    if (uid) listDrafts(uid).then(rows => { if (!cancelled) setListing({ uid, rows, error: '' }) }).catch(() => { if (!cancelled) setListing({ uid, rows: [], error: '기기에 저장한 프로젝트를 읽지 못했습니다. 새로고침하거나 프로젝트를 다운로드해 첨부해 주세요.' }) })
    return () => { cancelled = true }
  }, [uid, refresh])
  const rows = listing.uid === uid ? listing.rows : null
  const row = rows?.find(item => item.project.id === selectedId) || rows?.[0]
  const reload = () => { setListing({ uid, rows: null, error: '' }); setError(''); setPaths([]); setRefresh(value => value + 1) }
  const add = async () => {
    if (busy || disabled || !row || !uid) return
    setBusy(true); onBusyChange?.(true); setError('')
    try {
      const current = (await listDrafts(uid)).find(item => item.project.id === row.project.id)
      if (!current) throw new Error('프로젝트가 삭제되었거나 변경되었습니다. 목록을 새로고침해 주세요.')
      const files = createStudioAttachments(current.project, { paths })
      if (alive.current) onAdd(files)
    } catch (failure) { if (alive.current) setError(failure.message) }
    finally { if (alive.current) setBusy(false); onBusyChange?.(false) }
  }
  return <section className="studio-attachment-picker" aria-label="게임 스튜디오에서 첨부">
    <header><strong>게임 스튜디오에서 추가</strong><a href="/python-game-studio" target="_blank" rel="noopener noreferrer">게임 스튜디오 열기 ↗</a><button type="button" disabled={busy || disabled} onClick={reload}>목록 새로고침</button></header>
    <p>이 브라우저에서 내 계정으로 저장한 프로젝트입니다. 다른 탭에서 수정했다면 저장 후 목록을 새로고침해 주세요.</p>
    {!rows && <p role="status">프로젝트 목록을 불러오고 있습니다…</p>}
    {(error || listing.error) && <p role="alert">{error || listing.error}</p>}
    {rows?.length === 0 && !listing.error && <p>저장된 프로젝트가 없습니다. 게임 스튜디오에서 먼저 프로젝트를 만들어 주세요.</p>}
    {row && <>
      <label>프로젝트<select aria-label="스튜디오 프로젝트" disabled={busy || disabled} value={row.project.id} onChange={e => { setSelectedId(e.target.value); setPaths([]); setError('') }}>{rows.map(item => <option key={item.key} value={item.project.id}>{item.project.title} · {item.project.files.filter(file => file.kind === 'python').length}개 Python 파일</option>)}</select></label>
      <small>마지막 저장: {new Date(row.savedAt).toLocaleString('ko-KR')}</small>
      <p>첨부할 .py 파일을 선택해 주세요.</p>
      <div className="studio-attachment-files">{row.project.files.filter(file => file.kind === 'python' && /\.py$/i.test(file.path)).map(file => <label key={file.path}><input type="checkbox" disabled={busy || disabled} checked={paths.includes(file.path)} onChange={e => setPaths(previous => e.target.checked ? [...previous, file.path] : previous.filter(path => path !== file.path))} />{file.path}</label>)}</div>
      <p>첨부한 뒤 원본을 수정해도 첨부 사본은 바뀌지 않습니다. 수정본은 다시 첨부해 주세요. 과제 ‘전송’을 누를 때 업로드됩니다.</p>
      <button type="button" className="space-btn" disabled={busy || disabled || !paths.length} onClick={add}>{busy ? '첨부 준비 중…' : `선택한 파일 ${paths.length}개 첨부`}</button>
    </>}
  </section>
}
