import { useEffect, useMemo, useState } from 'react'
import {
  Eye,
  ImagePlus,
  MapPin,
  Pencil,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import { StructurePreview3D } from './GalaxyWorld3D'

const WORLD_COORD_LIMIT = 14.2
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

const toWorldCoordinate = (value) => Number((((Number(value) || 50) - 50) / 3).toFixed(1))

function getInitialForm(item, catalogItem) {
  return {
    name: item?.name || catalogItem?.name || '이름 없는 시설',
    description: item?.description || catalogItem?.description || '',
    worldX: toWorldCoordinate(item?.x),
    worldZ: toWorldCoordinate(item?.y),
    rotation: Number(item?.rotation || 0),
  }
}

export default function GalaxyObjectDialog({
  item,
  catalogItem,
  isOwner,
  busy,
  missionLabel,
  closeButtonRef,
  onClose,
  onSave,
  onDelete,
  onMission,
}) {
  const [form, setForm] = useState(() => getInitialForm(item, catalogItem))
  const [imageFile, setImageFile] = useState(null)
  const [removeImage, setRemoveImage] = useState(false)
  const [fileError, setFileError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const localPreviewUrl = useMemo(() => imageFile ? URL.createObjectURL(imageFile) : '', [imageFile])
  useEffect(() => () => {
    if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl)
  }, [localPreviewUrl])

  if (!item) return null

  const storedImageUrl = removeImage ? '' : item.imageUrl || ''
  const previewUrl = localPreviewUrl || storedImageUrl
  const description = item.description || catalogItem?.description || '아직 이 시설에 대한 설명이 등록되지 않았습니다.'
  const objectName = item.name || catalogItem?.name || '이름 없는 시설'
  const saving = busy === `object:update:${item.instanceId}`
  const deleting = busy === `object:delete:${item.instanceId}`
  const missionBusy = busy === `object:mission:${item.instanceId}`

  const chooseImage = (event) => {
    const file = event.target.files?.[0] || null
    event.target.value = ''
    if (!file) return
    if (!IMAGE_TYPES.has(file.type)) {
      setFileError('JPG, PNG, WEBP 이미지만 첨부할 수 있습니다.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setFileError('원본 이미지 크기는 10MB 이하여야 합니다.')
      return
    }
    setFileError('')
    setImageFile(file)
    setRemoveImage(false)
  }

  const submit = async (event) => {
    event.preventDefault()
    if (!isOwner || saving || deleting) return
    await onSave?.({ ...form, imageFile, removeImage })
  }

  return (
    <section className="frontier-object-dialog" role="dialog" aria-modal="true" aria-labelledby="frontier-object-dialog-title">
      <header className="frontier-object-dialog__header">
        <div>
          <span>{isOwner ? <Pencil size={15} aria-hidden="true" /> : <Eye size={15} aria-hidden="true" />} {isOwner ? 'OBJECT CONTROL' : 'OBJECT ARCHIVE'}</span>
          <h2 id="frontier-object-dialog-title">{objectName}</h2>
        </div>
        <button ref={closeButtonRef} type="button" onClick={onClose} aria-label="객체 정보 닫기"><X size={20} aria-hidden="true" /></button>
      </header>

      <div className="frontier-object-dialog__grid">
        <section className="frontier-object-visual">
          {previewUrl ? (
            <img src={previewUrl} alt={`${objectName} 첨부 이미지`} />
          ) : (
            <div className="frontier-object-visual__model">
              <StructurePreview3D itemId={item.itemId} />
              <span><Sparkles size={15} aria-hidden="true" /> 등록 이미지가 없어 3D 모형을 표시합니다</span>
            </div>
          )}
          <div className="frontier-object-coordinate">
            <MapPin size={16} aria-hidden="true" />
            <span>행성 좌표</span>
            <strong>X {toWorldCoordinate(item.x)} · Z {toWorldCoordinate(item.y)}</strong>
          </div>
        </section>

        {isOwner ? (
          <form className="frontier-object-editor" onSubmit={submit}>
            <div className="frontier-object-owner-badge"><ShieldCheck size={16} aria-hidden="true" /><span><strong>내 월드 객체</strong><small>이름·설명·이미지·좌표를 변경할 수 있습니다.</small></span></div>

            <label>
              <span>객체 이름</span>
              <input value={form.name} maxLength={40} required onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
            </label>
            <label>
              <span>객체 설명</span>
              <textarea value={form.description} maxLength={240} rows={4} placeholder="친구에게 보여줄 객체의 이야기나 역할을 적어주세요." onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
              <small>{form.description.length}/240</small>
            </label>

            <div className="frontier-object-image-control">
              <div><strong>대표 이미지</strong><small>수업 친구에게 보일 JPG·PNG·WEBP 이미지를 첨부할 수 있습니다.</small></div>
              <label className="galaxy-secondary-btn">
                <ImagePlus size={16} aria-hidden="true" /> 이미지 선택
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseImage} />
              </label>
              {(previewUrl || item.imageUrl) && <button type="button" onClick={() => { setImageFile(null); setRemoveImage(true); setFileError('') }}>이미지 제거</button>}
              {fileError && <p role="alert">{fileError}</p>}
            </div>

            <fieldset className="frontier-object-position-fields">
              <legend>좌표와 방향</legend>
              <label><span>X</span><input type="number" min={-WORLD_COORD_LIMIT} max={WORLD_COORD_LIMIT} step="0.1" value={form.worldX} onChange={(event) => setForm((current) => ({ ...current, worldX: event.target.value }))} /></label>
              <label><span>Z</span><input type="number" min={-WORLD_COORD_LIMIT} max={WORLD_COORD_LIMIT} step="0.1" value={form.worldZ} onChange={(event) => setForm((current) => ({ ...current, worldZ: event.target.value }))} /></label>
              <label><span>방향</span><select value={form.rotation} onChange={(event) => setForm((current) => ({ ...current, rotation: Number(event.target.value) }))}>{[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => <option key={angle} value={angle}>{angle}°</option>)}</select></label>
            </fieldset>

            <div className="frontier-object-dialog__actions">
              <button type="submit" className="galaxy-primary-btn" disabled={Boolean(busy)}><Save size={16} aria-hidden="true" /> {saving ? '저장 중' : '변경사항 저장'}</button>
              {!confirmDelete ? (
                <button type="button" className="frontier-object-delete" disabled={Boolean(busy)} onClick={() => setConfirmDelete(true)}><Trash2 size={16} aria-hidden="true" /> 객체 삭제</button>
              ) : (
                <div className="frontier-object-delete-confirm"><span>삭제하면 광석과 재료는 환급되지 않습니다.</span><button type="button" disabled={Boolean(busy)} onClick={() => onDelete?.(item)}>{deleting ? '삭제 중' : '정말 삭제'}</button><button type="button" onClick={() => setConfirmDelete(false)}>취소</button></div>
              )}
            </div>
          </form>
        ) : (
          <section className="frontier-object-readonly">
            <span className="frontier-object-visitor-badge"><Eye size={16} aria-hidden="true" /> 친구 월드 · 읽기 전용</span>
            <h3>{objectName}</h3>
            <p>{description}</p>
            {catalogItem?.effect && <div><small>시설 효과</small><strong>{catalogItem.effect}</strong></div>}
            <button type="button" className="galaxy-primary-btn" disabled={Boolean(busy)} onClick={() => onMission?.(item)}><Sparkles size={16} aria-hidden="true" /> {missionBusy ? '도움 신호 전송 중' : missionLabel || '이 객체의 도움 미션 수행'}</button>
            <small>이름·설명·이미지·좌표는 행성 주인만 수정하거나 삭제할 수 있습니다.</small>
          </section>
        )}
      </div>
    </section>
  )
}
