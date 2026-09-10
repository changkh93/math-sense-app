import { useState } from 'react'
import { folderPaths } from './projectFolders'
import { ChevronDown, ChevronRight, Folder, FolderOpen, FileCode2, Image, Music, Type } from 'lucide-react'
const icons = { python: FileCode2, csv: FileCode2, image: Image, audio: Music, font: Type }
const DRAG_TYPE = 'application/x-metasense-project-file'
export default function ProjectFileTree({ project, selected, selectedFolder, onSelectFile, onSelectFolder, onMoveFile, onUpload, onError, busy }) {
  const [visibility, setVisibility] = useState({ selected, collapsed: new Set() })
  const collapsed = visibility.selected === selected ? visibility.collapsed : new Set([...visibility.collapsed].filter(path => !selected.startsWith(`${path}/`)))
  const setCollapsed = update => setVisibility(previous => ({ selected, collapsed: update(previous.selected === selected ? previous.collapsed : new Set([...previous.collapsed].filter(path => !selected.startsWith(`${path}/`)))) }))
  const [dropTarget, setDropTarget] = useState(null)
  const folders = folderPaths(project)
  const parent = path => path.split('/').slice(0, -1).join('/')
  const expand = path => setCollapsed(previous => { const next = new Set(previous); next.delete(path); return next })
  const dropProps = destination => ({
    onDragOver: event => {
      if (!Array.from(event.dataTransfer.types).some(type => type === 'Files' || type === DRAG_TYPE)) return
      event.preventDefault(); event.stopPropagation()
      event.dataTransfer.dropEffect = busy ? 'none' : event.dataTransfer.types.includes(DRAG_TYPE) ? 'move' : 'copy'
      if (!busy) setDropTarget(destination)
    },
    onDragLeave: event => { if (!event.currentTarget.contains(event.relatedTarget)) setDropTarget(null) },
    onDrop: event => {
      event.preventDefault(); event.stopPropagation(); setDropTarget(null)
      if (busy) return
      const internal = event.dataTransfer.getData(DRAG_TYPE)
      if (internal) {
        try {
          const data = JSON.parse(internal)
          if (data.projectId !== project.id) throw new Error('현재 프로젝트 안의 파일만 이동할 수 있습니다.')
          onMoveFile(data.path, destination)
        } catch (error) { onError(error.message) }
      } else if (event.dataTransfer.files.length) onUpload(Array.from(event.dataTransfer.files), destination)
      expand(destination)
    },
  })
  const children = (directory, depth) => <>
    {folders.filter(path => parent(path) === directory).map(path => {
      const closed = collapsed.has(path), Icon = closed ? Folder : FolderOpen, Chevron = closed ? ChevronRight : ChevronDown
      return <div key={path}>
        <div className={`pgs-folder-row ${selectedFolder === path ? 'selected' : ''} ${dropTarget === path ? 'pgs-drop-target' : ''}`} {...dropProps(path)} style={{ paddingLeft: depth * 14 }}>
          <button className="pgs-folder-toggle" aria-label={`${path} ${closed ? '펼치기' : '접기'}`} aria-expanded={!closed} onClick={() => setCollapsed(previous => { const next = new Set(previous); if (next.has(path)) next.delete(path); else next.add(path); return next })}><Chevron size={12} /></button>
          <button data-kind="folder" data-path={path} title={path} onClick={() => { onSelectFolder(path); expand(path) }}><Icon size={16} /><span>{path.split('/').at(-1)}</span></button>
        </div>
        {!closed && children(path, depth + 1)}
      </div>
    })}
    {project.files.filter(file => parent(file.path) === directory).map(file => { const Icon = icons[file.kind]; return <button data-kind="file" data-path={file.path} key={file.path} draggable={!busy} onDragStart={event => { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData(DRAG_TYPE, JSON.stringify({ projectId: project.id, path: file.path })) }} onDragEnd={() => setDropTarget(null)} className={selected === file.path && selectedFolder === directory ? 'selected' : ''} style={{ paddingLeft: 22 + depth * 14 }} title={file.path} onClick={() => onSelectFile(file.path)}><Icon size={16} /><span>{file.path.split('/').at(-1)}</span>{project.entrypoint === file.path && <small title="프로젝트 기본 실행 파일">기본</small>}</button> })}
  </>
  return <div className="pgs-file-list"><button className={`pgs-project-root ${dropTarget === '' ? 'pgs-drop-target' : ''}`} {...dropProps('')} title="프로젝트 최상위 폴더 선택" onClick={() => onSelectFolder('')}><FolderOpen size={16} /><span>프로젝트 루트</span></button>{children('', 0)}</div>
}
