import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, Play, Square, Upload, FileCode2, FolderPlus, Plus, Download, FolderOpen, Maximize2, Trash2, Code2, X } from 'lucide-react'
import PythonEditor from '../PythonWorld/PythonEditor'
import GamePreview from './GamePreview'
import StudioPlayTools, { RunFeedback } from './StudioPlayTools'
import { createProject } from './templates'
import ProjectFileTree from './ProjectFileTree'
import { folderPaths, moveProjectFile } from './projectFolders'
import { listDrafts, saveDraft, selectDraft, deleteDraft } from './projectStore'
import { base64ToBytes, bytesToBase64, fileKind, normalizePath, normalizeFolderPath, validateProject } from './projectPolicy.mjs'
import { prepareRunnerProject, convertAudioToOgg, clearAudioConversionCache } from './audioConversion'
import useStudioLayout from './useStudioLayout'
import { importProjectFile, importProjectFolder } from './importProjectFile'
import SpaceInvadersMaterials from './SpaceInvadersMaterials'
import MarsExpeditionMaterials from './MarsExpeditionMaterials'
import './PythonGameStudio.css'

const statusNames = { loading: '엔진 준비 중', ready: '실행 준비 완료', running: '실행 중', stopped: '정지됨', error: '오류 확인', exited: '실행 완료' }
function readPlayPreferences(uid) {
  try {
    const saved = JSON.parse(localStorage.getItem(`metasense-studio-play:${uid}`))
    return { theme: ['aurora', 'candy', 'ocean'].includes(saved?.theme) ? saved.theme : 'aurora', playful: saved?.playful !== false }
  } catch { return { theme: 'aurora', playful: true } }
}
function download(name, bytes, type) {
  const url = URL.createObjectURL(new Blob([bytes], { type }))
  const link = document.createElement('a'); link.href = url; link.download = name; link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
function AssetPreview({ file, onInsert, onConvert, busy }) {
  const [url, setUrl] = useState('')
  const [fontFamily, setFontFamily] = useState('')
  useEffect(() => {
    const url = URL.createObjectURL(new Blob([base64ToBytes(file.data)]))
    // The object URL is an external browser resource with an effect-scoped lifetime.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUrl(url)
    let disposed = false, face
    if (file.kind === 'font') {
      face = new FontFace(`studio-${crypto.randomUUID()}`, `url(${url})`)
      face.load().then(loaded => { if (!disposed) { document.fonts.add(loaded); setFontFamily(loaded.family) } }).catch(() => {})
    }
    return () => { disposed = true; URL.revokeObjectURL(url); if (face) document.fonts.delete(face) }
  }, [file])
  return <div className="pgs-asset-preview">
    {file.kind === 'image' && <img src={url} alt={file.path} />}
    {file.kind === 'audio' && <audio src={url} controls preload="metadata" />}
    {file.kind === 'font' && <div className="pgs-font-sample" style={{ fontFamily: fontFamily || 'sans-serif' }}>나만의 게임<br />Hello, Game!<br />0123456789</div>}
    {file.kind === 'audio' && !file.path.toLowerCase().endsWith('.ogg') && <><small>게임 실행 시 자동으로 OGG로 변환합니다. 원본은 보존됩니다.</small><button disabled={busy} onClick={onConvert}>OGG 사본 만들기</button></>}
    <strong>{file.path}</strong><span>{(base64ToBytes(file.data).length / 1024).toFixed(1)} KB</span>
    <button onClick={onInsert}><Code2 size={16} /> 사용하는 코드 넣기</button>
    <small>main.py에서 이 파일을 불러오는 코드를 넣습니다.</small>
  </div>
}
export default function PythonGameStudio({ uid = 'local-preview', onBack }) {
  const [playSettings, setPlaySettings] = useState(() => ({ uid, value: readPlayPreferences(uid) }))
  const preferences = playSettings.uid === uid ? playSettings.value : readPlayPreferences(uid)
  const changePreferences = value => {
    setPlaySettings({ uid, value })
    try { localStorage.setItem(`metasense-studio-play:${uid}`, JSON.stringify(value)) } catch { /* Preferences still work for this visit. */ }
  }
  const [project, setProject] = useState(null)
  const [selected, setSelected] = useState('main.py')
  const [selectedFolder, setSelectedFolder] = useState('')
  const [drafts, setDrafts] = useState([])
  const [saved, setSaved] = useState('불러오는 중')
  const [notice, setNotice] = useState('')
  const [run, setRun] = useState(null)
  const [status, setStatus] = useState('stopped')
  const [logs, setLogs] = useState([])
  const [drawer, setDrawer] = useState(false)
  const [busy, setBusy] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const deletedIds = useRef(new Set())
  const importInput = useRef(null), folderInput = useRef(null)
  const [pendingFolder, setPendingFolder] = useState(null)
  const [importing, setImporting] = useState(false)
  const [dialog, setDialog] = useState(null)
  const [dialogValue, setDialogValue] = useState('')
  const [errorLine, setErrorLine] = useState(null)
  const fileInput = useRef(null), replaceInput = useRef(null), editor = useRef(null), preview = useRef(null)
  const layout = useStudioLayout(uid, Boolean(project), preview)
  const saveChain = useRef(Promise.resolve()), latest = useRef(null), mounted = useRef(true)
  const runGeneration = useRef(0)
  const switchProject = useCallback(async (next, { persist = false } = {}) => {
    if (latest.current && !deletedIds.current.has(latest.current.id)) {
      try { await saveChain.current.catch(() => {}); await saveDraft(uid, latest.current) }
      catch (error) { setNotice(`현재 작업을 저장하지 못해 프로젝트를 열지 못했습니다. ${error.message}`); return false }
    }
    if (persist) {
      try { await saveDraft(uid, next) }
      catch (error) { setNotice(`가져온 프로젝트를 이 기기에 저장하지 못했습니다. ${error.message}`); return false }
    }
    latest.current = next
    runGeneration.current++; setRun(null); setStatus('stopped'); setLogs([]); setProject(next); setSelected(next.entrypoint); setSelectedFolder(''); setErrorLine(null); setDrawer(false); return true }, [uid])
  useEffect(() => {
    mounted.current = true
    listDrafts(uid).then(rows => { if (mounted.current) { setDrafts(rows); setProject(rows[0]?.project || createProject()); setSelected(rows[0]?.project.entrypoint || 'main.py') } }).catch(() => { if (mounted.current) { setProject(createProject()); setNotice('브라우저 초안을 읽지 못했습니다. 프로젝트 다운로드로 작업을 보관해 주세요.') } })
    return () => {
      mounted.current = false; clearAudioConversionCache()
      const snapshot = latest.current
      if (snapshot && !deletedIds.current.has(snapshot.id)) saveChain.current = saveChain.current.catch(() => {}).then(() => deletedIds.current.has(snapshot.id) ? undefined : saveDraft(uid, snapshot)).catch(() => {})
    }
  }, [uid])
  useEffect(() => {
    latest.current = project
    if (!project) return undefined
    setSaved('초안 저장 중…')
    const timer = setTimeout(() => {
      saveChain.current = saveChain.current.catch(() => {}).then(() => deletedIds.current.has(project.id) ? undefined : saveDraft(uid, project)).then(() => {
        if (mounted.current && latest.current === project && !deletedIds.current.has(project.id)) setSaved('이 기기에 저장됨')
      }).catch(error => { if (mounted.current && !deletedIds.current.has(project.id)) { if (error.code === 'draft-conflict') { setProject(prev => prev?.id === project.id ? { ...prev, id: crypto.randomUUID(), revision: 0, title: `${prev.title.slice(0,60)} (탭 충돌 사본)` } : prev); setNotice(error.message); return } setSaved('저장 실패'); setNotice('기기 저장 공간을 확인해 주세요. 프로젝트 다운로드로 코드를 보관할 수 있습니다.') } })
    }, 300)
    return () => clearTimeout(timer)
  }, [uid, project])
  useEffect(() => {
    const beforeUnload = event => { if (saved === '초안 저장 중…' || saved === '저장 실패') { event.preventDefault(); event.returnValue = '' } }
    window.addEventListener('beforeunload', beforeUnload)
    return () => window.removeEventListener('beforeunload', beforeUnload)
  }, [saved])
  const activeFile = project?.files.find(f => f.path === selected)
  const editCode = useCallback(text => { setErrorLine(null); setProject(prev => ({ ...prev, files: prev.files.map(f => f.path === selected ? { ...f, text } : f) })) }, [selected])
  const stop = () => { runGeneration.current++; setRun(null); setStatus('stopped') }
  const runPath = activeFile?.kind === 'python' ? activeFile.path : project?.entrypoint
  const execute = async () => {
    const generation = ++runGeneration.current
    setBusy(true); setRun(null)
    try {
      // Use a run snapshot so opening a script does not change the saved project default.
      const checked = validateProject({ ...project, entrypoint: runPath })
      setLogs([]); setErrorLine(null); setStatus('loading')
      const payload = await prepareRunnerProject(checked)
      if (mounted.current && generation === runGeneration.current) setRun({ id: crypto.randomUUID(), project: checked, payload })
    } catch (error) { if (mounted.current) { setNotice(error.message); setStatus('error') } }
    finally { if (mounted.current) setBusy(false) }
  }
  useEffect(() => {
    const hide = () => { if (document.hidden) { runGeneration.current++; setRun(null); setStatus('stopped') } }
    document.addEventListener('visibilitychange', hide)
    return () => document.removeEventListener('visibilitychange', hide)
  }, [])
  const handleEvent = useCallback(event => {
    if (event.type === 'READY') setStatus('ready')
    if (event.type === 'RUNNING') setStatus('running')
    if (event.type === 'EXIT') setStatus(previous => previous === 'error' ? previous : 'exited')
    if (event.type === 'ERROR') setStatus('error')
    if (['STDOUT','STDERR','ERROR'].includes(event.type)) setLogs(prev => [...prev, { ...event, id: crypto.randomUUID() }].slice(-250))
  }, [])
  const upload = async (files, destination = selectedFolder) => {
    if (!files?.length) return
    setBusy(true)
    const baseline = project
    try {
      const incoming = Array.from(files)
      if (baseline.files.length + incoming.length > 100) throw new Error('파일은 총 100개까지 올릴 수 있습니다.')
      if (validateProject(baseline).totalBytes + incoming.reduce((n, file) => n + file.size, 0) > 6 * 1024 * 1024) throw new Error('프로젝트 전체 용량은 6 MB까지 사용할 수 있습니다.')
      const additions = await Promise.all(Array.from(files).map(async file => {
        if (file.size > 5 * 1024 * 1024) throw new Error(`${file.name}: 파일은 5 MB까지 업로드할 수 있습니다.`)
        const path = normalizePath([destination, file.webkitRelativePath || file.name].filter(Boolean).join('/')), kind = fileKind(path)
        return kind === 'python' ? { path, kind, text: await file.text() } : { path, kind, data: bytesToBase64(new Uint8Array(await file.arrayBuffer())) }
      }))
      for (const file of additions) if (baseline.files.some(f => f.path.toLowerCase() === file.path.toLowerCase())) throw new Error(`${file.path}: 같은 이름의 파일이 있습니다. 기존 파일을 이름 변경하거나 삭제한 뒤 올려 주세요.`)
      const next = validateProject({ ...baseline, files: [...baseline.files, ...additions] })
      if (latest.current !== baseline) throw new Error('업로드 중 프로젝트가 변경되었습니다. 파일을 다시 올려 주세요.')
      setProject(next); setSelected(additions[0].path); setSelectedFolder(destination); setNotice(`${additions.length}개 파일을 프로젝트에 넣었습니다.`)
    } catch (error) { setNotice(error.message) } finally { setBusy(false); if (fileInput.current) fileInput.current.value = '' }
  }
  const moveFile = (sourcePath, destination) => {
    if (busy) return false
    try {
      const result = moveProjectFile(project, sourcePath, destination)
      setProject(result.project); setSelected(result.path); setSelectedFolder(destination); setErrorLine(null)
      setNotice(result.changed ? `${sourcePath} → ${result.path}로 이동했습니다. 코드에서 이 파일을 사용하는 경로도 확인해 주세요.` : '이미 이 폴더에 있는 파일입니다.')
      return true
    } catch (error) { setNotice(error.message); return false }
  }
  const replaceFile = async event => {
    const file = event.target.files?.[0]
    if (!file) return
    const baseline = project, target = activeFile
    setBusy(true)
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error('파일은 5 MB까지 교체할 수 있습니다.')
      const replacement = target.kind === 'python' ? { ...target, text: await file.text() } : { ...target, data: bytesToBase64(new Uint8Array(await file.arrayBuffer())) }
      if (latest.current !== baseline) throw new Error('프로젝트가 변경되었습니다. 다시 시도해 주세요.')
      setProject(validateProject({ ...baseline, files: baseline.files.map(item => item.path === target.path ? replacement : item) }))
      setNotice(`${target.path} 파일을 교체했습니다. 실행을 누르면 새 파일이 반영됩니다.`)
    } catch (error) { setNotice(error.message) } finally { setBusy(false); event.target.value = '' }
  }
  const snippet = file => {
    const path = JSON.stringify(file.path)
    const text = file.kind === 'image' ? `image = pygame.image.load(${path})` : file.kind === 'audio' ? `sound = pygame.mixer.Sound(${path})\nsound.play()` : `font = pygame.font.Font(${path}, 24)`
    setSelected(project.entrypoint); setSelectedFolder(project.entrypoint.split('/').slice(0, -1).join('/'))
    setProject(prev => ({ ...prev, files: prev.files.map(f => f.path === prev.entrypoint ? { ...f, text: `${f.text}\n# ${file.path}\n${text}\n` } : f) }))
    setNotice('실행 파일 아래에 예시 코드를 넣었습니다. 게임에서 사용할 위치로 옮겨 주세요.')
  }
  const showLibrary = async () => {
    setDrawer(true); setNotice('')
    try { await saveChain.current.catch(() => {}); if (latest.current && !deletedIds.current.has(latest.current.id)) await saveDraft(uid, latest.current); setDrafts(await listDrafts(uid)) }
    catch (error) { setNotice(error.message) }
  }
  const confirmProjectDelete = async () => {
    if (!deleteTarget || busy) return
    const target = deleteTarget.project
    setBusy(true)
    // Invalidate scheduled autosaves before deleting, so they cannot restore this draft.
    deletedIds.current.add(target.id)
    try {
      await saveChain.current.catch(() => {})
      await deleteDraft(uid, target.id)
      const remaining = await listDrafts(uid)
      setDrafts(remaining)
      if (latest.current?.id === target.id) {
        const next = remaining[0] ? selectDraft(remaining[0]) : createProject()
        latest.current = next
        stop(); setLogs([]); setErrorLine(null); setProject(next); setSelected(next.entrypoint); setSelectedFolder('')
      }
      setDeleteTarget(null)
      setNotice(`“${target.title}” 프로젝트를 삭제했습니다.`)
    } catch (error) {
      deletedIds.current.delete(target.id)
      setNotice(error.message)
    } finally { setBusy(false) }
  }
  const openFolder = async result => {
    const opened = await switchProject(result.project, { persist: true })
    if (opened) {
      setPendingFolder(null)
      setNotice(`“${result.project.title}” 폴더의 ${result.project.files.length}개 파일을 가져왔습니다. 하위 폴더 경로가 유지됩니다.${result.skippedCount ? ` 숨김·환경·미지원 파일 ${result.skippedCount}개는 제외했습니다.` : ''}`)
    }
  }
  const importFolder = async event => {
    const files = Array.from(event.currentTarget.files || [])
    event.currentTarget.value = ''
    if (!files.length || busy) return
    setBusy(true); setImporting(true); setNotice('폴더의 파일을 읽고 확인하고 있습니다…')
    try {
      const result = await importProjectFolder(files)
      if (!mounted.current) return
      if (result.needsEntryChoice) { setPendingFolder(result); setNotice('실행할 Python 파일을 선택해 주세요.') }
      else await openFolder(result)
    } catch (error) { if (mounted.current) setNotice(`가져오기 실패: ${error.message}`) }
    finally { if (mounted.current) { setBusy(false); setImporting(false) } }
  }
  const importProject = async event => {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = '' // Selecting the same file again must also work.
    if (!file || busy) return
    setBusy(true); setImporting(true); setNotice('파일을 읽고 확인하고 있습니다…')
    try {
      const next = await importProjectFile(file)
      if (!mounted.current) return
      const opened = await switchProject(next, { persist: true })
      if (opened) setNotice(`“${next.title}” 프로젝트를 새 사본으로 가져왔습니다. ${next.files.length}개 파일이 이 기기에 저장되었습니다.`)
    } catch (error) { if (mounted.current) setNotice(`가져오기 실패: ${error.message}`) }
    finally { if (mounted.current) { setBusy(false); setImporting(false) } }
  }
  const submitDialog = event => {
    event.preventDefault()
    try {
      if (dialog === 'new') switchProject(createProject(dialogValue.trim() || '나의 게임'))
      if (dialog === 'folder') {
        const path = normalizeFolderPath([selectedFolder, dialogValue.trim()].filter(Boolean).join('/'))
        if (folderPaths(project).some(folder => folder.toLowerCase() === path.toLowerCase())) throw new Error('같은 이름의 폴더가 있습니다.')
        setProject(validateProject({ ...project, folders: [...folderPaths(project), path] }))
        setSelectedFolder(path)
        setNotice(`${path} 폴더를 만들었습니다. 새 파일과 업로드 파일이 이 폴더에 들어갑니다.`)
      }
      if (dialog === 'file') {
        const path = normalizePath([selectedFolder, dialogValue.trim()].filter(Boolean).join('/'))
        if (fileKind(path) !== 'python') throw new Error('새 코드 파일 이름은 .py로 끝나야 합니다.')
        const next = validateProject({ ...project, files: [...project.files, { path, kind: 'python', text: '' }] })
        setProject(next); setSelected(path); setSelectedFolder(path.split('/').slice(0, -1).join('/'))
      }
      if (dialog === 'move') { if (!moveFile(selected, dialogValue)) return }
      if (dialog === 'rename') {
        const path = normalizePath(dialogValue)
        if (fileKind(path) !== activeFile.kind) throw new Error('파일 종류를 바꾸지 않고 이름을 변경해 주세요.')
        setProject(validateProject({ ...project, entrypoint: project.entrypoint === selected ? path : project.entrypoint, files: project.files.map(f => f.path === selected ? { ...f, path } : f) })); setSelected(path); setSelectedFolder(path.split('/').slice(0, -1).join('/'))
        setNotice('파일 이름을 바꿨습니다. 코드 안에서 사용하는 파일 경로도 수정해 주세요.')
      }
      setDialog(null)
    } catch (error) { setNotice(error.message) }
  }
  const jumpToError = text => {
    const matches = [...text.matchAll(/File "\/tmp\/studio\/([^"]+)", line (\d+)/g)]
    const match = matches.at(-1)
    if (match && project.files.some(f => f.path === match[1])) { setSelected(match[1]); setSelectedFolder(match[1].split('/').slice(0, -1).join('/')); setErrorLine(Number(match[2])); requestAnimationFrame(() => editor.current?.revealLine(Number(match[2]))) }
  }
  if (!project) return <div className="pgs-shell pgs-loading">내 프로젝트를 불러오고 있습니다…</div>
  return <main className="pgs-shell" data-code-theme={preferences.theme} onDragOver={e => { if (Array.from(e.dataTransfer.types).includes('Files')) e.preventDefault() }} onDrop={e => { if (!e.dataTransfer.files.length) return; e.preventDefault(); e.stopPropagation(); if (!busy) upload(e.dataTransfer.files) }}>
    <header className="pgs-header">{onBack && <button className="pgs-icon-btn" aria-label="수업으로 돌아가기" onClick={async () => { try { await saveChain.current.catch(() => {}); await saveDraft(uid, project); stop(); onBack() } catch (error) { setNotice(error.message) } }}><ArrowLeft size={20} /></button>}<div className="pgs-brand"><span>METASENSE / GAME STUDIO</span><input aria-label="프로젝트 이름" value={project.title} maxLength={80} onChange={e => setProject({ ...project, title: e.target.value })} /></div><span className="pgs-save-state" role="status">{saved}</span><div className="pgs-header-actions"><button onClick={showLibrary}><FolderOpen size={16} /> 내 프로젝트</button><button aria-label="프로젝트 다운로드" title="프로젝트 다운로드" onClick={() => download(`${project.title || 'game'}.mspygame.json`, JSON.stringify(project), 'application/json')}><Download size={17} /></button></div></header>
    {notice && <div className="pgs-notice" role="status">{notice}<button aria-label="안내 닫기" onClick={() => setNotice('')}><X size={15} /></button></div>}
    <div className="pgs-toolbar"><div><span className="pgs-dot" /> 파일을 올리고, 나만의 게임을 만들어 보세요.</div><div className="pgs-run-actions"><span className={`pgs-run-status ${status}`}>{statusNames[status]}</span><span className="pgs-run-target" title={`실행 대상: ${runPath}`}>{runPath}</span><button className="pgs-run" title={`${runPath} 실행`} disabled={busy} onClick={execute}><Play size={16} fill="currentColor" /> 실행</button><button disabled={!run} onClick={stop}><Square size={15} /> 정지</button></div></div>
    <StudioPlayTools preferences={preferences} onPreferences={changePreferences} />
    <div ref={layout.workspaceRef} className={`pgs-workspace${layout.dragging ? ' pgs-is-resizing' : ''}`} style={layout.style}><aside className="pgs-files"><div className="pgs-panel-title">프로젝트 파일<span><button title="Python 파일 추가" aria-label="Python 파일 추가" onClick={() => { setDialogValue('helper.py'); setDialog('file') }}><Plus size={15} /></button><button title="폴더 만들기" aria-label="폴더 만들기" onClick={() => { setDialogValue('새 폴더'); setDialog('folder'); setNotice('') }}><FolderPlus size={15} /></button><button title="파일 업로드" aria-label="파일 업로드" onClick={() => fileInput.current.click()}><Upload size={15} /></button></span></div><ProjectFileTree key={project.id} project={project} selected={selected} selectedFolder={selectedFolder} onSelectFolder={setSelectedFolder} busy={busy} onMoveFile={moveFile} onUpload={upload} onError={setNotice} onSelectFile={path => { setSelected(path); setSelectedFolder(path.split('/').slice(0, -1).join('/')); setErrorLine(null) }} /><button className="pgs-upload" disabled={busy} onClick={() => fileInput.current.click()}><Upload size={18} /> 파일 올리기<small>이미지 · 사운드 · 폰트 · Python</small></button><div className="pgs-file-tip">업로드 위치: {selectedFolder || '프로젝트 루트'}<br />파일을 폴더 위에 끌어다 놓으세요. 기존 파일은 ‘이동’ 버튼으로도 옮길 수 있습니다.<br />PNG, JPG, WebP · OGG, WAV, MP3 · TTF, OTF<br />파일 5 MB / 프로젝트 6 MB</div><input ref={fileInput} type="file" multiple accept=".py,.png,.jpg,.jpeg,.webp,.ogg,.wav,.mp3,.ttf,.otf" hidden onChange={e => upload(e.target.files)} /></aside>
    <div {...layout.separator('files')} />
    <section className="pgs-editor-pane"><input ref={replaceInput} type="file" hidden accept={`.${selected.split('.').at(-1)}`} onChange={replaceFile} /><div className="pgs-panel-title"><span>{selected}</span><div><button disabled={busy} onClick={() => replaceInput.current.click()}>파일 교체</button><button onClick={() => { setDialogValue(selected); setDialog('rename') }}>이름 변경</button><button disabled={busy} onClick={() => { setDialogValue(selected.split('/').slice(0, -1).join('/')); setNotice(''); setDialog('move') }}>이동</button>{activeFile?.kind === 'python' && selected !== project.entrypoint && <button onClick={() => setProject({ ...project, entrypoint: selected })}>기본 실행 파일로</button>}<button aria-label="선택한 파일 다운로드" onClick={() => download(activeFile.path.split('/').at(-1), activeFile.kind === 'python' ? activeFile.text : base64ToBytes(activeFile.data), 'application/octet-stream')}><Download size={14} /></button><button aria-label="선택한 파일 삭제" disabled={selected === project.entrypoint} onClick={() => { setDialog('delete') }}><Trash2 size={14} /></button></div></div>{activeFile?.kind === 'python' ? <PythonEditor colorful key={selected} ref={editor} value={activeFile.text} onChange={editCode} activeLine={errorLine} /> : activeFile && <AssetPreview key={selected} file={activeFile} busy={busy} onInsert={() => snippet(activeFile)} onConvert={async () => {
      setBusy(true)
      const baseline = project
      try {
        const path = activeFile.path.replace(/\.(mp3|wav)$/i, '.ogg')
        const data = await convertAudioToOgg(activeFile)
        if (latest.current !== baseline) throw new Error('프로젝트가 변경되었습니다. 다시 시도해 주세요.')
        setProject(validateProject({ ...baseline, files: [...baseline.files, { path, kind: 'audio', data }] }))
        setSelected(path); setNotice('OGG 사본을 만들었습니다. 원본 사운드도 그대로 남아 있습니다.')
      } catch (error) { setNotice(error.message) } finally { setBusy(false) }
    }} />}</section>
    <div {...layout.separator('editor')} />
    <section className="pgs-preview-pane" ref={preview}><div className="pgs-panel-title">게임 화면<button aria-label="게임 화면 크게 보기" onClick={() => preview.current.requestFullscreen?.().catch(() => setNotice('전체 화면을 지원하지 않는 브라우저입니다.'))}><Maximize2 size={16} /></button></div><div className="pgs-game-frame"><GamePreview run={run} onEvent={handleEvent} /></div><div {...layout.separator('console')} /><div className="pgs-console"><div className="pgs-panel-title">출력 · 오류<button onClick={() => setLogs([])}>지우기</button></div><>{preferences.playful && <RunFeedback status={status} />}</><pre aria-live="polite">{!logs.length && <span className="pgs-console-hint">print() 출력과 오류가 여기에 표시됩니다.</span>}{logs.map(log => <span key={log.id} className={log.type === 'ERROR' || log.type === 'STDERR' ? 'pgs-error' : ''}>{log.text}{log.type === 'ERROR' && <button onClick={() => jumpToError(log.text)}>오류 줄로 이동</button>}</span>)}</pre></div></section></div>
    {drawer && <div className="pgs-modal-backdrop"><section className="pgs-library" role="dialog" aria-modal="true" aria-label="내 프로젝트" aria-busy={importing}><div className="pgs-panel-title">내 프로젝트<button aria-label="프로젝트 목록 닫기" disabled={importing} onClick={() => setDrawer(false)}><X size={18} /></button></div>{notice && <p role="alert">{notice}</p>}<div className="pgs-library-actions"><button disabled={busy} onClick={() => { setDialogValue('나의 게임'); setDialog('new') }}><Plus size={16} /> 새 프로젝트</button><button disabled={busy} onClick={() => folderInput.current.click()}><FolderOpen size={16} /> {importing ? '가져오는 중…' : '프로젝트 가져오기'}</button><button disabled={busy} onClick={() => importInput.current.click()}><Upload size={16} /> 백업 파일 복원</button><button disabled={busy} onClick={async () => { try { const { createMonsterProject } = await import('./monsterTemplate'); switchProject(await createMonsterProject()) } catch (error) { setNotice(error.message) } }}>몬스터 잡기 예제</button><button disabled={busy} onClick={async () => {
      setBusy(true)
      try {
        const { createSpaceInvadersProject } = await import('./spaceInvadersTemplate')
        await switchProject(await createSpaceInvadersProject(), { persist: true })
      } catch (error) { setNotice(error.message) }
      finally { if (mounted.current) setBusy(false) }
    }}>우주 방어대 수업 준비</button><button disabled={busy} onClick={async () => {
      setBusy(true)
      try {
        const { createMarsExpeditionProject } = await import('./marsExpeditionTemplate')
        await switchProject(await createMarsExpeditionProject(), { persist: true })
      } catch (error) { setNotice(error.message) }
      finally { if (mounted.current) setBusy(false) }
    }}>화성 탐사대 수업 준비</button></div><p className="pgs-import-help">프로젝트 가져오기: 로컬 폴더의 Python·이미지·폰트·사운드를 하위 경로와 함께 가져옵니다. 백업 파일 복원: .mspygame.json 또는 .py 파일을 엽니다.</p><SpaceInvadersMaterials busy={busy} onError={setNotice} onOpen={async checkpoint => {
      setBusy(true)
      try {
        const { createSpaceInvadersProject } = await import('./spaceInvadersTemplate')
        await switchProject(await createSpaceInvadersProject(checkpoint), { persist: true })
      } catch (error) { setNotice(error.message) }
      finally { if (mounted.current) setBusy(false) }
    }} /><MarsExpeditionMaterials busy={busy} onError={setNotice} onOpen={async checkpoint => {
      setBusy(true)
      try {
        const { createMarsExpeditionProject } = await import('./marsExpeditionTemplate')
        await switchProject(await createMarsExpeditionProject(checkpoint), { persist: true })
      } catch (error) { setNotice(error.message) }
      finally { if (mounted.current) setBusy(false) }
    }} /><h3>이 기기에 저장한 초안</h3>{drafts.map(row => <div className="pgs-project-row" key={row.key}><button className="pgs-project-open" disabled={busy} onClick={() => switchProject(selectDraft(row))}><FileCode2 size={20} /><span>{row.project.title}<small>{new Date(row.savedAt).toLocaleString('ko-KR')}</small></span></button><button className="pgs-project-delete" disabled={busy} aria-label={`${row.project.title} 프로젝트 삭제`} title="프로젝트 삭제" onClick={() => { setNotice(''); setDeleteTarget(row) }}><Trash2 size={17} /></button></div>)}<input ref={folderInput} type="file" webkitdirectory="" directory="" multiple hidden onChange={importFolder} /><input ref={importInput} type="file" accept=".json,.mspygame.json,.py" hidden onChange={importProject} /></section></div>}
    {pendingFolder && <div className="pgs-modal-backdrop"><form className="pgs-dialog" role="dialog" aria-modal="true" aria-label="프로젝트 실행 파일 선택" onSubmit={async event => { event.preventDefault(); setBusy(true); try { await openFolder(pendingFolder) } finally { setBusy(false) } }}><h3>{pendingFolder.project.title}</h3><p>{pendingFolder.project.files.length}개 파일을 가져옵니다. 실행할 Python 파일을 선택하세요.</p>{pendingFolder.skippedCount > 0 && <p>숨김·환경·미지원 파일 {pendingFolder.skippedCount}개 제외</p>}<label>실행 파일<select aria-label="실행 파일" value={pendingFolder.project.entrypoint} onChange={event => setPendingFolder({ ...pendingFolder, project: { ...pendingFolder.project, entrypoint: event.target.value } })}>{pendingFolder.project.files.filter(file => file.kind === 'python').map(file => <option key={file.path} value={file.path}>{file.path}</option>)}</select></label>{notice && <p role="status">{notice}</p>}<div><button type="button" disabled={busy} onClick={() => { setPendingFolder(null); setNotice('폴더 가져오기를 취소했습니다.') }}>취소</button><button type="submit" disabled={busy}>가져오기</button></div></form></div>}
    {deleteTarget && <div className="pgs-modal-backdrop"><section className="pgs-dialog" role="alertdialog" aria-modal="true" aria-labelledby="pgs-delete-title" aria-describedby="pgs-delete-description"><h3 id="pgs-delete-title">프로젝트 삭제</h3><p id="pgs-delete-description">“{deleteTarget.project.title}” 프로젝트와 포함된 파일을 이 기기에서 삭제할까요? 삭제 후에는 되돌릴 수 없습니다.</p>{notice && <p role="alert">{notice}</p>}<div><button autoFocus disabled={busy} onClick={() => setDeleteTarget(null)}>취소</button><button disabled={busy} onClick={confirmProjectDelete}>삭제</button></div></section></div>}
    {dialog && <div className="pgs-modal-backdrop"><form className="pgs-dialog" onSubmit={submitDialog} role="dialog" aria-modal="true" aria-label="프로젝트 파일 편집"><h3>{dialog === 'new' ? '새 프로젝트' : dialog === 'file' ? 'Python 파일 추가' : dialog === 'folder' ? '폴더 만들기' : dialog === 'move' ? '파일 이동' : dialog === 'delete' ? '파일 삭제' : '파일 이름 변경'}</h3>{(dialog === 'folder' || dialog === 'file') && <p>위치: {selectedFolder || '프로젝트 루트'}</p>}{notice && <p role="alert">{notice}</p>}{dialog === 'delete' ? <p>{selected} 파일을 삭제할까요? 코드의 파일 경로도 확인해 주세요.</p> : dialog === 'move' ? <label>{selected}<select autoFocus aria-label="이동할 폴더" value={dialogValue} onChange={e => setDialogValue(e.target.value)}><option value="">프로젝트 루트</option>{folderPaths(project).map(path => <option key={path} value={path}>{path}</option>)}</select></label> : <input autoFocus aria-label="이름" value={dialogValue} onChange={e => setDialogValue(e.target.value)} />}<div><button type="button" onClick={() => setDialog(null)}>취소</button>{dialog === 'delete' ? <button type="button" onClick={() => { setProject({ ...project, files: project.files.filter(f => f.path !== selected) }); setSelected(project.entrypoint); setDialog(null) }}>삭제</button> : <button type="submit">확인</button>}</div></form></div>}
  </main>
}
