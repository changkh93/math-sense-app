import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Check,
  Droplets,
  ImagePlus,
  Gem,
  Leaf,
  MapPin,
  Package,
  Pencil,
  Radio,
  Satellite,
  Save,
  ShieldCheck,
  Sparkles,
  Telescope,
  TrendingUp,
  Trash2,
  Wrench,
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
  wallet = 0,
  errorMessage,
  missionLabel,
  missionAction,
  closeButtonRef,
  onClose,
  onSave,
  onUpgrade,
  onDelete,
  onMission,
  signalSummary,
  onOpenSignals,
  observatorySummary,
  onOpenBriefing,
  greenhouseSummary,
  gardenSummary,
  roverStatus = 'idle',
  roverStatusLabel = '',
  roverExpedition = null,
  onOpenRover,
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
  const upgradeBusy = busy === `object:upgrade:${item?.instanceId || ''}`
  const currentLevel = Math.max(1, Number(item?.level || 1))
  const maxLevel = Math.max(1, Number(catalogItem?.maxLevel || 1))
  const stage2Available = Boolean(catalogItem?.stage2Available)
  const nextUpgradeCost = currentLevel < 2 ? Number(catalogItem?.stage2Cost || 0) : 0
  const canUpgrade = isOwner
    && currentLevel < maxLevel
    && stage2Available
    && Number(wallet || 0) >= nextUpgradeCost
  const saveInProgress = saving
  const displayedSaveError = saveError || (isEditing ? errorMessage : '')
  const reward = ACTION_REWARDS[missionAction] || ACTION_REWARDS.admire
  const RewardIcon = reward.Icon
  const isSignalPlaza = item?.itemId === 'signal_plaza'
  const isExpeditionBeacon = item?.itemId === 'expedition_beacon'
  const isRoverBay = item?.itemId === 'rover_bay'
  const isRoverFacility = isExpeditionBeacon || isRoverBay
  const isObservatory = item?.itemId === 'observatory'
  const isFriendGreenhouse = item?.itemId === 'friend_greenhouse'
  const isStarflowerGarden = item?.itemId === 'starflower_garden'
  const signalUnreadCount = Math.max(0, Number(signalSummary?.unreadCount || 0))
  const signalRecentCount = Math.max(0, Number(signalSummary?.recentCount || 0))
  const beaconStatusTitle = roverStatus === 'ready'
    ? '귀환 상자를 수신했어요'
    : roverStatus === 'active'
      ? '심우주 원정 신호 추적 중'
      : '새 장거리 원정을 준비할 수 있어요'
  const roverBayAppliedToCurrent = Boolean(roverExpedition?.bonuses?.roverBay)
  const roverBayStatusTitle = roverStatus === 'ready'
    ? '귀환한 로버의 보상을 받을 수 있어요'
    : roverStatus === 'active'
      ? roverBayAppliedToCurrent ? '이번 원정은 6시간 가속 적용 중' : '가속은 다음 원정부터 적용'
      : '다음 원정이 8시간에서 6시간으로 단축돼요'

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
                <StructurePreview3D itemId={item.itemId} level={currentLevel} signalSummary={signalSummary} observatoryMode={observatorySummary?.mode} roverStatus={roverStatus} greenhouseSummary={greenhouseSummary} gardenSummary={gardenSummary} />
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

            <section className="frontier-object-upgrade" aria-label="객체 그래픽 등급">
              <div>
                <span><TrendingUp size={16} aria-hidden="true" /> GRAPHIC STAGE</span>
                <strong>Stage {currentLevel} · {currentLevel >= 2 ? catalogItem?.stage2Label || '고급 설계' : '기본 설계'}</strong>
                <p>{currentLevel >= maxLevel
                  ? '현재 준비된 최고 등급입니다.'
                  : stage2Available
                    ? '더 자연스러운 형태와 세부 조명으로 성장시킬 수 있습니다.'
                    : '등급 시스템은 연결됐으며 고급 그래픽 자산을 준비하고 있습니다.'}</p>
              </div>
              {currentLevel < maxLevel && (
                <button
                  type="button"
                  disabled={Boolean(busy) || !canUpgrade}
                  onClick={() => onUpgrade?.(item)}
                >
                  <Sparkles size={16} aria-hidden="true" />
                  {upgradeBusy
                    ? '성장 중'
                    : stage2Available
                      ? Number(wallet || 0) >= nextUpgradeCost
                        ? `Stage 2 성장 · 광석 ${nextUpgradeCost}`
                        : `광석 ${nextUpgradeCost - Number(wallet || 0)} 부족`
                      : 'Stage 2 준비 중'}
                </button>
              )}
            </section>

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
            {previewUrl ? <img src={previewUrl} alt={`${objectName} 첨부 이미지`} /> : <StructurePreview3D itemId={item.itemId} level={currentLevel} signalSummary={signalSummary} observatoryMode={observatorySummary?.mode} roverStatus={roverStatus} greenhouseSummary={greenhouseSummary} gardenSummary={gardenSummary} />}
          </div>
          <div className="frontier-object-hero__content">
            <span className="frontier-object-stage-badge">STAGE {currentLevel}</span>
            <h3>{objectName}</h3>
            <p>{description}</p>
            {isSignalPlaza ? (
              <section className="frontier-object-reward material-crystalGlass" aria-label="귀환 신호 광장 기능">
                <span><Radio size={20} aria-hidden="true" /></span>
                <div>
                  <small>{isOwner
                    ? signalUnreadCount > 0
                      ? `새 귀환 신호 ${signalUnreadCount}개 도착`
                      : `최근 보존된 신호 ${signalRecentCount}개`
                    : '친구 행성에 방문 흔적 남기기'}</small>
                  <strong>{isOwner ? 'E 키로 귀환 신호 기록을 열어요' : '감탄 신호가 이 광장과 타임라인에 기록돼요'}</strong>
                  <p>{isOwner
                    ? '친구의 인사·감탄·도움 기록을 시간순으로 확인하고 바로 답방할 수 있습니다.'
                    : '가까이에서 E 키를 누르면 행성 주인에게 방문자의 이름과 메시지가 안전하게 전달됩니다.'}</p>
                </div>
              </section>
            ) : isObservatory ? (
              <section className="frontier-object-reward material-crystalGlass" aria-label="성운 관측소 기능">
                <span><Telescope size={20} aria-hidden="true" /></span>
                <div>
                  <small>{isOwner ? observatorySummary?.statusLabel || '오늘의 행성 신호 안정' : '친구 행성의 관측 장비 돕기'}</small>
                  <strong>{isOwner ? 'E 키로 오늘의 관측 브리핑을 열어요' : '관측 장비를 수리해 도움 기록을 남겨요'}</strong>
                  <p>{isOwner
                    ? observatorySummary?.detail || '행성 사건, 방문자의 귀환 신호와 로버 원정 상태를 한 화면에서 확인할 수 있습니다.'
                    : '가까이에서 E 키를 누르면 행성 주인에게 관측 장비 수리 기록과 안전 메시지가 전달됩니다.'}</p>
                </div>
              </section>
            ) : isStarflowerGarden ? (
              <section className="frontier-object-reward material-biofiber frontier-garden-collaboration" aria-label="별꽃 정원 물주기 협업 기능">
                <span><Droplets size={20} aria-hidden="true" /></span>
                <div>
                  <small>{isOwner
                    ? `정원 활력 ${gardenSummary?.vitality ?? 0}/100 · 최근 친구 물주기 ${gardenSummary?.recentWaterCount ?? 0}회`
                    : `현재 정원 활력 ${gardenSummary?.vitality ?? 0}/100 · 물주기 효과 +4`}</small>
                  <strong>{isOwner
                    ? '친구의 물주기 신호는 이름과 메시지가 담긴 방문 기록이에요'
                    : '가까이에서 E 키를 눌러 별꽃에 물을 주세요'}</strong>
                  <p>{isOwner
                    ? gardenSummary?.recentHelpers?.length
                      ? `${gardenSummary.recentHelpers.join(' · ')} 탐사원이 최근 이 정원에 물을 주었습니다. 아래 기록 버튼에서 시간과 메시지를 확인할 수 있습니다. 주인은 E 키로 바이오 섬유 1개를 얻으며 재사용 대기는 5분입니다.`
                      : '아직 이 정원에 도착한 친구 물주기 기록이 없습니다. 친구가 E 키로 물을 주면 이름·메시지·시간이 귀환 기록에 남습니다. 주인은 E 키로 바이오 섬유 1개를 얻습니다.'
                    : `물주기 한 번으로 정원 활력 +4와 항로 연결도 +6이 적용되고 '${gardenSummary?.visitMessage || '선택한 안전 메시지'}'가 주인에게 전달됩니다. 이 친구에게 하루 8회까지 도울 수 있고 첫 3회까지 별가루 1개를 받습니다.`}</p>
                  <div className="frontier-greenhouse-vitality is-starflower" aria-label={`정원 활력 ${gardenSummary?.vitality ?? 0} 퍼센트`}>
                    <i><b style={{ width: `${Math.min(100, Math.max(0, Number(gardenSummary?.vitality || 0)))}%` }} /></i>
                    <span>{Number(gardenSummary?.vitality || 0) >= 80 ? '별꽃 만개' : Number(gardenSummary?.vitality || 0) >= 50 ? '꽃빛 성장 중' : '친구의 물주기가 필요해요'}</span>
                  </div>
                </div>
              </section>
            ) : isFriendGreenhouse ? (
              <section className="frontier-object-reward material-biofiber frontier-greenhouse-collaboration" aria-label="별빛 공동 온실 협업 기능">
                <span><Leaf size={20} aria-hidden="true" /></span>
                <div>
                  <small>{isOwner
                    ? `정원 활력 ${greenhouseSummary?.vitality ?? 0}/100 · 최근 물주기 ${greenhouseSummary?.recentWaterCount ?? 0}회`
                    : `정원 활력 ${greenhouseSummary?.vitality ?? 0}/100 · 항로 연결도 +6`}</small>
                  <strong>{isOwner
                    ? '친구의 물주기는 활력과 귀환 기록으로 남아요'
                    : '가까이에서 E 키를 눌러 공동 온실에 물을 주세요'}</strong>
                  <p>{isOwner
                    ? greenhouseSummary?.recentHelpers?.length
                      ? `${greenhouseSummary.recentHelpers.join(' · ')} 탐사원이 최근 온실을 돌봤습니다. 주인은 E 키로 바이오 섬유 1개를 수확할 수 있으며, 다시 돌보기까지 5분이 걸립니다.`
                      : '친구가 물을 주면 방문자의 이름과 안전 메시지가 귀환 기록에 남습니다. 주인은 E 키로 바이오 섬유 1개를 수확할 수 있으며, 다시 돌보기까지 5분이 걸립니다.'
                    : `물주기 한 번으로 정원 활력 +4, 항로 연결도 +6이 적용되고 '${greenhouseSummary?.visitMessage || '선택한 안전 메시지'}'가 주인에게 전달됩니다. 이 친구에게 하루 8회까지 도울 수 있고 첫 3회까지 별가루 1개를 받습니다.`}</p>
                  <div className="frontier-greenhouse-vitality" aria-label={`정원 활력 ${greenhouseSummary?.vitality ?? 0} 퍼센트`}>
                    <i><b style={{ width: `${Math.min(100, Math.max(0, Number(greenhouseSummary?.vitality || 0)))}%` }} /></i>
                    <span>{Number(greenhouseSummary?.vitality || 0) >= 80 ? '공생 생태 안정' : Number(greenhouseSummary?.vitality || 0) >= 50 ? '함께 돌보는 중' : '친구의 물주기가 필요해요'}</span>
                  </div>
                </div>
              </section>
            ) : isRoverBay ? (
              <section className="frontier-object-reward material-alloy" aria-label="탐사 로버 정비소 기능">
                <span><Wrench size={20} aria-hidden="true" /></span>
                <div>
                  <small>{roverStatusLabel || '장거리 원정 준비'}</small>
                  <strong>{roverBayStatusTitle}</strong>
                  <p>{isOwner
                    ? roverStatus === 'active' && !roverBayAppliedToCurrent
                      ? '현재 원정은 정비소 설치 전에 출발해 기존 8시간 일정입니다. 가까이에서 E 키를 누르면 관제를 열 수 있으며, 다음 원정부터 6시간이 적용됩니다.'
                      : '정비소가 설치된 상태에서 출발하면 원정 시간이 8시간에서 6시간으로 줄어듭니다. 가까이에서 E 키를 누르면 로버 관제가 열립니다.'
                    : '이 정비소는 행성 주인의 다음 장거리 원정을 빠르게 준비합니다. 가까이에서 E 키를 눌러 수리 도움을 남길 수 있습니다.'}</p>
                </div>
              </section>
            ) : isExpeditionBeacon ? (
              <section className="frontier-object-reward material-alloy" aria-label="원정대 비콘 기능">
                <span><Satellite size={20} aria-hidden="true" /></span>
                <div>
                  <small>{roverStatusLabel || '장거리 원정 준비'}</small>
                  <strong>{beaconStatusTitle}</strong>
                  <p>{isOwner
                    ? '설치 뒤 출발하는 모든 장거리 로버 원정의 회수 재료가 1개 늘어납니다. 가까이에서 E 키를 누르면 원정 관제가 열립니다.'
                    : '이 비콘은 행성 주인의 장거리 원정 신호를 중계합니다. 가까이에서 E 키를 눌러 수리 도움을 남길 수 있습니다.'}</p>
                </div>
              </section>
            ) : (
              <section className={`frontier-object-reward material-${reward.className}`} aria-label="이 시설에서 얻는 재료">
                <span><RewardIcon size={20} aria-hidden="true" /></span>
                <div>
                  <small>이 시설 가까이에서 <kbd>E</kbd> 키를 누르면</small>
                  <strong>{reward.label} {reward.amount}개를 얻어요</strong>
                  <p>{reward.purpose}</p>
                </div>
              </section>
            )}
            <div className="frontier-object-hero__actions">
              {isOwner ? (
                <>
                  {isSignalPlaza && (
                    <button type="button" className="galaxy-primary-btn" onClick={() => onOpenSignals?.()}>
                      <Radio size={16} aria-hidden="true" /> {signalUnreadCount > 0 ? `새 신호 ${signalUnreadCount}개 보기` : '신호 기록 보기'}
                    </button>
                  )}
                  {isObservatory && (
                    <button type="button" className="galaxy-primary-btn" onClick={() => onOpenBriefing?.()}>
                      <Telescope size={16} aria-hidden="true" /> 관측 브리핑 열기
                    </button>
                  )}
                  {isStarflowerGarden && (
                    <button type="button" className="galaxy-primary-btn" onClick={() => onOpenSignals?.()}>
                      <Droplets size={16} aria-hidden="true" /> 물주기 기록 보기
                    </button>
                  )}
                  {isRoverFacility && (
                    <button type="button" className="galaxy-primary-btn" onClick={() => onOpenRover?.()}>
                      <Satellite size={16} aria-hidden="true" /> {roverStatus === 'ready' ? '귀환 보상 받기' : '로버 관제 열기'}
                    </button>
                  )}
                  <button type="button" className={isSignalPlaza || isObservatory || isRoverFacility || isStarflowerGarden ? 'galaxy-secondary-btn' : 'galaxy-primary-btn'} onClick={startEditing}><Pencil size={16} aria-hidden="true" /> 수정</button>
                </>
              ) : (
                <button type="button" className="galaxy-primary-btn" disabled={Boolean(busy)} onClick={() => onMission?.(item)}><Sparkles size={16} aria-hidden="true" /> {missionBusy ? '미션 시작 중' : isFriendGreenhouse ? '공동 온실에 물주기' : isStarflowerGarden ? '별꽃에 물주기' : missionLabel || '미션 수행'}</button>
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
