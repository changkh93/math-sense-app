import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Check,
  ImagePlus,
  Gem,
  Leaf,
  MapPin,
  Package,
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

const ACTION_REWARDS = {
  water: { material: 'biofiber', label: '바이오 섬유', amount: 1, Icon: Leaf, className: 'biofiber', purpose: '나무와 정원을 키우는 생태 재료예요.' },
  repair: { material: 'alloy', label: '혜성 합금', amount: 1, Icon: Package, className: 'alloy', purpose: '로버와 항로 시설을 만드는 기계 재료예요.' },
  feed: { material: 'stardust', label: '별가루', amount: 1, Icon: Sparkles, className: 'stardust', purpose: '빛과 장식을 만드는 기본 재료예요.' },
  admire: { material: 'crystalGlass', label: '수정 유리', amount: 1, Icon: Gem, className: 'crystalGlass', purpose: '관측과 신호 시설을 만드는 투명 재료예요.' },
}

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

function getDraftKey(instanceId) {
  return `metasense_galaxy_object_draft_${String(instanceId || '')}`
}

function readObjectDraft(item, catalogItem) {
  const fallback = getInitialForm(item, catalogItem)
  if (!item?.instanceId) return fallback
  try {
    const draft = JSON.parse(sessionStorage.getItem(getDraftKey(item.instanceId)) || 'null')
    if (!draft?.form) return fallback
    return { ...fallback, ...draft.form }
  } catch {
    return fallback
  }
}

export default function GalaxyObjectDialog({
  item,
  catalogItem,
  isOwner,
  busy,
  errorMessage,
  missionLabel,
  missionAction,
  closeButtonRef,
  onClose,
  onSave,
  onDelete,
  onMission,
  playRemainingSeconds = 0,
}) {
  const [form, setForm] = useState(() => getInitialForm(item, catalogItem))
  const [imageFile, setImageFile] = useState(null)
  const [removeImage, setRemoveImage] = useState(false)
  const [fileError, setFileError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [saveComplete, setSaveComplete] = useState(false)
  const [saveError, setSaveError] = useState('')
  const autoSaveAttemptedRef = useRef(false)

  const localPreviewUrl = useMemo(() => imageFile ? URL.createObjectURL(imageFile) : '', [imageFile])
  useEffect(() => () => {
    if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl)
  }, [localPreviewUrl])

  const storedImageUrl = removeImage ? '' : item?.imageUrl || ''
  const previewUrl = localPreviewUrl || storedImageUrl
  const description = item.description || catalogItem?.description || '아직 이 시설에 대한 설명이 등록되지 않았습니다.'
  const objectName = item.name || catalogItem?.name || '이름 없는 시설'
  const saving = busy === `object:update:${item?.instanceId || ''}`
  const deleting = busy === `object:delete:${item?.instanceId || ''}`
  const missionBusy = busy === `object:mission:${item?.instanceId || ''}`
  const saveInProgress = saving
  const displayedSaveError = saveError || (isEditing ? errorMessage : '')
  const reward = ACTION_REWARDS[missionAction] || ACTION_REWARDS.admire
  const RewardIcon = reward.Icon

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
    setSaveError('')
    const result = await onSave?.({ ...form, imageFile, removeImage })
    if (result) {
      sessionStorage.removeItem(getDraftKey(item.instanceId))
      setIsEditing(false)
      setSaveComplete(true)
      return
    }
    setSaveError(errorMessage || '저장하지 못했습니다. 입력 내용과 인터넷 연결을 확인한 뒤 다시 시도해 주세요.')
  }

  const startEditing = () => {
    setForm(readObjectDraft(item, catalogItem))
    setImageFile(null)
    setRemoveImage(false)
    setFileError('')
    setSaveError('')
    setSaveComplete(false)
    setConfirmDelete(false)
    autoSaveAttemptedRef.current = false
    setIsEditing(true)
  }

  const stopEditing = () => {
    if (saving || deleting) return
    setForm(getInitialForm(item, catalogItem))
    setImageFile(null)
    setRemoveImage(false)
    setFileError('')
    setSaveError('')
    setConfirmDelete(false)
    sessionStorage.removeItem(getDraftKey(item.instanceId))
    setIsEditing(false)
  }

  useEffect(() => {
    if (!isEditing || !item?.instanceId) return
    sessionStorage.setItem(getDraftKey(item.instanceId), JSON.stringify({
      form,
      removeImage,
      updatedAtMs: Date.now(),
    }))
  }, [form, isEditing, item?.instanceId, removeImage])

  useEffect(() => {
    if (
      !isEditing
      || !isOwner
      || saving
      || deleting
      || playRemainingSeconds <= 0
      || playRemainingSeconds > 120
      || autoSaveAttemptedRef.current
    ) return
    autoSaveAttemptedRef.current = true
    Promise.resolve(onSave?.({ ...form, imageFile, removeImage })).then((result) => {
      if (!result) {
        setSaveError('자동 저장을 완료하지 못했습니다. 입력 내용은 다음 접속에서 복구할 수 있도록 보관했습니다.')
        return
      }
      sessionStorage.removeItem(getDraftKey(item.instanceId))
      setIsEditing(false)
      setSaveComplete(true)
    })
  }, [deleting, form, imageFile, isEditing, isOwner, item?.instanceId, onSave, playRemainingSeconds, removeImage, saving])

  if (!item) return null

  return (
    <section className={`frontier-object-dialog${isEditing ? ' is-editing' : ' is-viewing'}`} role="dialog" aria-modal="true" aria-labelledby="frontier-object-dialog-title">
      <header className="frontier-object-dialog__header">
        {isEditing ? <div><span><Pencil size={15} aria-hidden="true" /> OBJECT EDITOR</span><h2 id="frontier-object-dialog-title">{objectName}</h2></div> : <h2 id="frontier-object-dialog-title" className="frontier-sr-only">{objectName}</h2>}
        <button ref={closeButtonRef} type="button" onClick={onClose} aria-label="객체 정보 닫기"><X size={20} aria-hidden="true" /></button>
      </header>

      {isEditing ? (
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

          <form className="frontier-object-editor" onSubmit={submit}>
            <div className="frontier-object-owner-badge"><ShieldCheck size={16} aria-hidden="true" /><span><strong>내 월드 객체</strong><small>이름·설명·이미지·좌표를 변경할 수 있습니다.</small></span></div>

            {displayedSaveError && <p className="frontier-object-save-error" role="alert">{displayedSaveError}</p>}

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
              <button type="button" className="galaxy-secondary-btn" disabled={Boolean(busy)} onClick={stopEditing}>보기로 돌아가기</button>
              {!confirmDelete ? (
                <button type="button" className="frontier-object-delete" disabled={Boolean(busy)} onClick={() => setConfirmDelete(true)}><Trash2 size={16} aria-hidden="true" /> 객체 삭제</button>
              ) : (
                <div className="frontier-object-delete-confirm"><span>삭제하면 광석과 재료는 환급되지 않습니다.</span><button type="button" disabled={Boolean(busy)} onClick={() => onDelete?.(item)}>{deleting ? '삭제 중' : '정말 삭제'}</button><button type="button" onClick={() => setConfirmDelete(false)}>취소</button></div>
              )}
            </div>
          </form>
        </div>
      ) : (
        <section className="frontier-object-hero">
          <div className="frontier-object-hero__media">
            {previewUrl ? <img src={previewUrl} alt={`${objectName} 첨부 이미지`} /> : <StructurePreview3D itemId={item.itemId} />}
          </div>
          <div className="frontier-object-hero__content">
            <h3>{objectName}</h3>
            <p>{description}</p>
            <section className={`frontier-object-reward material-${reward.className}`} aria-label="이 시설에서 얻는 재료">
              <span><RewardIcon size={20} aria-hidden="true" /></span>
              <div>
                <small>이 시설 가까이에서 <kbd>E</kbd> 키를 누르면</small>
                <strong>{reward.label} {reward.amount}개를 얻어요</strong>
                <p>{reward.purpose}</p>
              </div>
            </section>
            <div className="frontier-object-hero__actions">
              {isOwner ? (
                <button type="button" className="galaxy-primary-btn" onClick={startEditing}><Pencil size={16} aria-hidden="true" /> 수정</button>
              ) : (
                <button type="button" className="galaxy-primary-btn" disabled={Boolean(busy)} onClick={() => onMission?.(item)}><Sparkles size={16} aria-hidden="true" /> {missionBusy ? '미션 시작 중' : missionLabel || '미션 수행'}</button>
              )}
            </div>
          </div>
        </section>
      )}
      {saveInProgress && (
        <div className="frontier-object-save-state" role="status" aria-live="assertive" aria-busy="true">
          <span><Save size={24} aria-hidden="true" /></span>
          <strong>변경사항을 저장하고 있어요</strong>
          <p>{imageFile ? '이미지를 올린 뒤 이름·설명·위치를 저장합니다.' : '이름·설명·위치를 행성에 저장합니다.'}</p>
        </div>
      )}
      {saveComplete && (
        <div className="frontier-object-save-state is-complete" role="alertdialog" aria-modal="true" aria-labelledby="frontier-object-save-complete-title">
          <span><Check size={25} aria-hidden="true" /></span>
          <strong id="frontier-object-save-complete-title">저장 완료</strong>
          <p>수정한 이름, 설명, 이미지와 위치가 행성에 반영됐습니다.</p>
          <button type="button" className="galaxy-primary-btn" autoFocus onClick={onClose}>확인</button>
        </div>
      )}
    </section>
  )
}
