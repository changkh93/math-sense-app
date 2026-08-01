import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import {
  ASTRA_BUILDER_HISTORY_LIMIT,
  ASTRA_BUILDER_POC_PLOT,
  applyAstraBuilderEdit,
  applyAstraBuilderPatch,
  countAstraBuilderBlocks,
  createEmptyAstraBuilderGrid,
  getAstraBuilderCellCount,
} from './astraBuilderModel'
import {
  decodeAstraBuilderGridBase64,
  encodeAstraBuilderGridBase64,
} from './astraBuilderCodec'
import {
  loadAstraBuilderDraft,
  saveAstraBuilderDraft,
  saveAstraBuilderRecoveryDraft,
} from './astraBuilderStorage'
import {
  getAstraBuilderRetryDelay,
  planAstraBuilderServerHydration,
} from './astraBuilderSync'

const SERVER_IDLE_SAVE_MS = 3_000
const SERVER_MAX_SAVE_MS = 10_000
const SERVER_RETRY_INITIAL_MS = 15_000
const SERVER_RETRY_MAX_MS = 120_000

function createBuilderState() {
  return {
    cells: createEmptyAstraBuilderGrid(),
    undo: [],
    redo: [],
    blockCount: 0,
    revision: 0,
  }
}

function builderReducer(state, action) {
  if (action.type === 'load') {
    return {
      cells: action.cells,
      undo: [],
      redo: [],
      blockCount: countAstraBuilderBlocks(action.cells),
      revision: 0,
    }
  }

  if (action.type === 'edit') {
    const result = applyAstraBuilderEdit(state.cells, action.edit)
    if (!result) return state
    return {
      cells: result.cells,
      undo: [...state.undo, result.patch].slice(-ASTRA_BUILDER_HISTORY_LIMIT),
      redo: [],
      blockCount: countAstraBuilderBlocks(result.cells),
      revision: state.revision + 1,
    }
  }

  if (action.type === 'undo' && state.undo.length) {
    const patch = state.undo[state.undo.length - 1]
    const cells = applyAstraBuilderPatch(state.cells, patch, 'undo')
    return {
      cells,
      undo: state.undo.slice(0, -1),
      redo: [...state.redo, patch].slice(-ASTRA_BUILDER_HISTORY_LIMIT),
      blockCount: countAstraBuilderBlocks(cells),
      revision: state.revision + 1,
    }
  }

  if (action.type === 'redo' && state.redo.length) {
    const patch = state.redo[state.redo.length - 1]
    const cells = applyAstraBuilderPatch(state.cells, patch, 'redo')
    return {
      cells,
      undo: [...state.undo, patch].slice(-ASTRA_BUILDER_HISTORY_LIMIT),
      redo: state.redo.slice(0, -1),
      blockCount: countAstraBuilderBlocks(cells),
      revision: state.revision + 1,
    }
  }

  return state
}

function isRevisionConflict(error) {
  return String(error?.code || '').endsWith('/aborted')
}

function getSyncErrorMessage(error) {
  const code = String(error?.code || '')
  if (code.endsWith('/deadline-exceeded')) return '저장 유예 시간이 끝났습니다. 기기 초안은 안전하게 남아 있어요.'
  if (code.endsWith('/permission-denied')) return '다른 기기에서 이 건축실을 열었습니다. 기기 초안은 보존했어요.'
  if (code.endsWith('/invalid-argument') || code.endsWith('/failed-precondition')) {
    return '서버 빌더 버전 업데이트가 필요합니다. 기기 초안은 안전하게 보관했어요.'
  }
  return '서버 연결을 기다리는 중입니다. 기기에는 안전하게 보관했어요.'
}

export default function useAstraBuilderPoc(
  storageKey,
  enabled = true,
  {
    plotId = ASTRA_BUILDER_POC_PLOT.id,
    blockCapacity = 500,
    serverActive = false,
    serverSessionKey = '',
    openServerPlot = null,
    saveServerState = null,
    onSyncMessage = null,
    onLimitReached = null,
  } = {},
) {
  const [state, dispatch] = useReducer(builderReducer, undefined, createBuilderState)
  const [loadedStorageKey, setLoadedStorageKey] = useState('')
  const [savedRevision, setSavedRevision] = useState(0)
  const [localSyncing, setLocalSyncing] = useState(false)
  const [serverOpening, setServerOpening] = useState(false)
  const [serverReady, setServerReady] = useState(false)
  const [serverSyncing, setServerSyncing] = useState(false)
  const [serverRevision, setServerRevision] = useState(0)
  const [serverBlockCapacity, setServerBlockCapacity] = useState(0)
  const [serverError, setServerError] = useState('')
  const [serverRetryToken, setServerRetryToken] = useState(0)
  const [serverBackoffVersion, setServerBackoffVersion] = useState(0)
  const [conflict, setConflict] = useState(null)
  const stateRef = useRef(state)
  const conflictRef = useRef(conflict)
  const loadedDraftRef = useRef(null)
  const saveRequestRef = useRef(0)
  const serverLeaseRef = useRef(null)
  const serverRevisionRef = useRef(0)
  const serverSyncedLocalRevisionRef = useRef(0)
  const serverEnabledRef = useRef(false)
  const openedServerKeyRef = useRef('')
  const syncPromiseRef = useRef(null)
  const idleTimerRef = useRef(null)
  const maxTimerRef = useRef(null)
  const serverRetryDelayRef = useRef(0)
  const serverRetryAtRef = useRef(0)
  const hydrated = !enabled || !storageKey || loadedStorageKey === storageKey
  const serverEnabled = Boolean(
    enabled
    && serverActive
    && openServerPlot
    && saveServerState,
  )

  serverEnabledRef.current = serverEnabled

  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    conflictRef.current = conflict
  }, [conflict])

  const clearServerTimers = useCallback(() => {
    if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current)
    if (maxTimerRef.current) window.clearTimeout(maxTimerRef.current)
    idleTimerRef.current = null
    maxTimerRef.current = null
  }, [])

  const resetServerBackoff = useCallback(() => {
    if (!serverRetryDelayRef.current && !serverRetryAtRef.current) return
    serverRetryDelayRef.current = 0
    serverRetryAtRef.current = 0
    setServerBackoffVersion((current) => current + 1)
  }, [])

  const deferServerRetry = useCallback(() => {
    clearServerTimers()
    const nextDelay = getAstraBuilderRetryDelay(
      serverRetryDelayRef.current,
      SERVER_RETRY_INITIAL_MS,
      SERVER_RETRY_MAX_MS,
    )
    serverRetryDelayRef.current = nextDelay
    serverRetryAtRef.current = Date.now() + nextDelay
    setServerBackoffVersion((current) => current + 1)
  }, [clearServerTimers])

  useEffect(() => {
    let cancelled = false
    loadedDraftRef.current = null
    openedServerKeyRef.current = ''
    serverLeaseRef.current = null
    serverRevisionRef.current = 0
    serverSyncedLocalRevisionRef.current = 0
    serverRetryDelayRef.current = 0
    serverRetryAtRef.current = 0
    setLoadedStorageKey('')
    setServerReady(false)
    setServerRevision(0)
    setServerBlockCapacity(0)
    setServerError('')
    setConflict(null)
    dispatch({ type: 'load', cells: createEmptyAstraBuilderGrid() })
    clearServerTimers()

    if (!enabled || !storageKey) {
      return () => { cancelled = true }
    }

    loadAstraBuilderDraft(storageKey, getAstraBuilderCellCount(ASTRA_BUILDER_POC_PLOT))
      .then((draft) => {
        if (cancelled) return
        loadedDraftRef.current = draft
        if (draft?.cells) dispatch({ type: 'load', cells: draft.cells })
        const draftServerRevision = Number.isInteger(draft?.serverRevision)
          ? draft.serverRevision
          : 0
        serverRevisionRef.current = draftServerRevision
        serverSyncedLocalRevisionRef.current = draft?.serverDirty ? -1 : 0
        setServerRevision(draftServerRevision)
        setSavedRevision(0)
        setLocalSyncing(false)
        setLoadedStorageKey(storageKey)
      })
      .catch(() => {
        if (cancelled) return
        setSavedRevision(0)
        setLocalSyncing(false)
        setLoadedStorageKey(storageKey)
      })
    return () => { cancelled = true }
  }, [clearServerTimers, enabled, storageKey])

  const flush = useCallback(async () => {
    if (!enabled || !hydrated || !storageKey) return false
    const requestId = saveRequestRef.current + 1
    saveRequestRef.current = requestId
    const snapshot = stateRef.current
    setLocalSyncing(true)
    try {
      await saveAstraBuilderDraft(storageKey, snapshot.cells, {
        blockCount: snapshot.blockCount,
        serverRevision: serverRevisionRef.current,
        serverDirty: serverEnabledRef.current
          ? snapshot.revision !== serverSyncedLocalRevisionRef.current
          : false,
      })
      if (saveRequestRef.current === requestId) {
        setSavedRevision(snapshot.revision)
        setLocalSyncing(false)
      }
      return true
    } catch {
      if (saveRequestRef.current === requestId) setLocalSyncing(false)
      return false
    }
  }, [enabled, hydrated, storageKey])

  const preserveConflictDraft = useCallback(async (localSnapshot, reason) => {
    if (!storageKey || !localSnapshot?.cells) return ''
    try {
      return await saveAstraBuilderRecoveryDraft(storageKey, localSnapshot.cells, {
        blockCount: localSnapshot.blockCount,
        serverRevision: serverRevisionRef.current,
        recoveryReason: reason,
      })
    } catch {
      return ''
    }
  }, [storageKey])

  const setRevisionConflict = useCallback(async (localSnapshot, serverData, reason) => {
    const expectedCellCount = getAstraBuilderCellCount(ASTRA_BUILDER_POC_PLOT)
    const serverCells = decodeAstraBuilderGridBase64(
      serverData?.state?.gridDataBase64,
      expectedCellCount,
    )
    if (!serverCells || !serverData?.lease?.leaseId) {
      setServerError('서버 건축 데이터를 다시 불러오지 못했습니다.')
      return false
    }
    serverLeaseRef.current = serverData.lease
    setServerBlockCapacity(Math.max(0, Number(serverData?.plot?.maxBlocks || 0)))
    serverRevisionRef.current = Number(serverData.state.revision || 0)
    setServerRevision(serverRevisionRef.current)
    const recoveryKey = await preserveConflictDraft(localSnapshot, reason)
    setConflict({
      localCells: localSnapshot.cells.slice(),
      localBlockCount: localSnapshot.blockCount,
      serverCells,
      serverBlockCount: Number(serverData.state.blockCount || 0),
      serverRevision: serverRevisionRef.current,
      recoveryKey,
    })
    setServerReady(true)
    setServerError('')
    clearServerTimers()
    onSyncMessage?.('다른 기기의 저장본을 발견했어요. 두 초안을 모두 보존했습니다.')
    return true
  }, [clearServerTimers, onSyncMessage, preserveConflictDraft])

  const syncNow = useCallback(async () => {
    if (
      !serverEnabledRef.current
      || !serverReady
      || conflictRef.current
      || !serverLeaseRef.current?.leaseId
    ) return false
    if (syncPromiseRef.current) return syncPromiseRef.current

    const run = async () => {
      await flush()
      const snapshot = stateRef.current
      if (snapshot.revision === serverSyncedLocalRevisionRef.current) return true
      setServerSyncing(true)
      try {
        const result = await saveServerState({
          plotId,
          leaseId: serverLeaseRef.current.leaseId,
          baseRevision: serverRevisionRef.current,
          encoding: 'u16le-v1',
          gridDataBase64: encodeAstraBuilderGridBase64(snapshot.cells),
          modules: [],
          blockCount: snapshot.blockCount,
        })
        const nextServerRevision = Number(result?.revision)
        if (!Number.isInteger(nextServerRevision)) throw new Error('invalid server revision')
        serverRevisionRef.current = nextServerRevision
        serverSyncedLocalRevisionRef.current = snapshot.revision
        setServerRevision(nextServerRevision)
        resetServerBackoff()
        setServerError('')
        clearServerTimers()
        const latest = stateRef.current
        await saveAstraBuilderDraft(storageKey, latest.cells, {
          blockCount: latest.blockCount,
          serverRevision: nextServerRevision,
          serverDirty: latest.revision !== snapshot.revision,
        })
        loadedDraftRef.current = {
          cells: latest.cells.slice(),
          blockCount: latest.blockCount,
          serverRevision: nextServerRevision,
          serverDirty: latest.revision !== snapshot.revision,
        }
        setSavedRevision(latest.revision)
        return true
      } catch (error) {
        if (isRevisionConflict(error)) {
          try {
            const latestServer = await openServerPlot({
              plotId,
            })
            await setRevisionConflict(stateRef.current, latestServer, 'revision-conflict')
          } catch (refreshError) {
            setServerError(getSyncErrorMessage(refreshError))
            deferServerRetry()
          }
        } else {
          setServerError(getSyncErrorMessage(error))
          deferServerRetry()
        }
        return false
      } finally {
        setServerSyncing(false)
      }
    }

    syncPromiseRef.current = run()
    try {
      return await syncPromiseRef.current
    } finally {
      syncPromiseRef.current = null
    }
  }, [
    clearServerTimers,
    deferServerRetry,
    flush,
    openServerPlot,
    plotId,
    saveServerState,
    serverReady,
    resetServerBackoff,
    setRevisionConflict,
    storageKey,
  ])

  useEffect(() => {
    if (!serverActive) {
      openedServerKeyRef.current = ''
      setServerReady(false)
      clearServerTimers()
      resetServerBackoff()
      return
    }
    if (!serverEnabled || !hydrated || conflictRef.current) return
    const openKey = `${storageKey}:${serverSessionKey || 'active'}`
    if (openedServerKeyRef.current === openKey) return
    openedServerKeyRef.current = openKey
    let cancelled = false
    setServerOpening(true)
    setServerError('')

    openServerPlot({ plotId })
      .then(async (serverData) => {
        if (cancelled) return
        const serverCells = decodeAstraBuilderGridBase64(
          serverData?.state?.gridDataBase64,
          getAstraBuilderCellCount(ASTRA_BUILDER_POC_PLOT),
        )
        if (!serverCells || !serverData?.lease?.leaseId) {
          throw new Error('invalid builder state')
        }
        const localSnapshot = stateRef.current
        const draft = loadedDraftRef.current
        const remoteRevision = Number(serverData.state.revision || 0)
        const hydrationPlan = planAstraBuilderServerHydration({
          localRevision: localSnapshot.revision,
          localSyncedRevision: serverSyncedLocalRevisionRef.current,
          localBlockCount: localSnapshot.blockCount,
          localServerRevision: Number.isInteger(draft?.serverRevision)
            ? draft.serverRevision
            : serverRevisionRef.current,
          localServerDirty: draft?.serverDirty === true
            || localSnapshot.revision !== serverSyncedLocalRevisionRef.current,
          remoteRevision,
        })

        serverLeaseRef.current = serverData.lease
        setServerBlockCapacity(Math.max(0, Number(serverData?.plot?.maxBlocks || 0)))
        serverRevisionRef.current = remoteRevision
        setServerRevision(remoteRevision)

        if (hydrationPlan === 'conflict') {
          await setRevisionConflict(localSnapshot, serverData, 'open-conflict')
          return
        }

        if (hydrationPlan === 'local') {
          serverSyncedLocalRevisionRef.current = -1
        } else {
          dispatch({ type: 'load', cells: serverCells })
          serverSyncedLocalRevisionRef.current = 0
          loadedDraftRef.current = {
            cells: serverCells,
            serverRevision: remoteRevision,
            serverDirty: false,
          }
          await saveAstraBuilderDraft(storageKey, serverCells, {
            blockCount: Number(serverData.state.blockCount || 0),
            serverRevision: remoteRevision,
            serverDirty: false,
          })
          setSavedRevision(0)
        }
        setServerReady(true)
        resetServerBackoff()
        setServerError('')
      })
      .catch((error) => {
        if (!cancelled) {
          openedServerKeyRef.current = ''
          setServerError(getSyncErrorMessage(error))
          setServerReady(false)
        }
      })
      .finally(() => {
        if (!cancelled) setServerOpening(false)
      })

    return () => { cancelled = true }
  }, [
    clearServerTimers,
    hydrated,
    openServerPlot,
    plotId,
    resetServerBackoff,
    serverActive,
    serverEnabled,
    serverSessionKey,
    serverRetryToken,
    setRevisionConflict,
    storageKey,
  ])

  useEffect(() => {
    if (
      !serverEnabled
      || !serverReady
      || conflict
      || state.revision === serverSyncedLocalRevisionRef.current
    ) {
      if (state.revision === serverSyncedLocalRevisionRef.current) clearServerTimers()
      return undefined
    }
    const retryWaitMs = Math.max(0, serverRetryAtRef.current - Date.now())
    if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current)
    idleTimerRef.current = window.setTimeout(() => {
      idleTimerRef.current = null
      void syncNow()
    }, Math.max(SERVER_IDLE_SAVE_MS, retryWaitMs))
    if (!maxTimerRef.current) {
      maxTimerRef.current = window.setTimeout(() => {
        maxTimerRef.current = null
        void syncNow()
      }, Math.max(SERVER_MAX_SAVE_MS, retryWaitMs))
    }
    return () => {
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current)
      idleTimerRef.current = null
    }
  }, [
    clearServerTimers,
    conflict,
    serverBackoffVersion,
    serverEnabled,
    serverReady,
    state.revision,
    syncNow,
  ])

  useEffect(() => {
    if (!enabled || !hydrated || state.revision === 0) return undefined
    const timer = window.setTimeout(() => {
      void flush()
    }, 450)
    return () => window.clearTimeout(timer)
  }, [enabled, flush, hydrated, state.revision])

  useEffect(() => {
    if (!enabled || !hydrated) return undefined
    const saveWhenHidden = () => {
      if (document.visibilityState !== 'hidden') return
      void flush()
      void syncNow()
    }
    const saveOnPageHide = () => {
      void flush()
      void syncNow()
    }
    window.addEventListener('pagehide', saveOnPageHide)
    document.addEventListener('visibilitychange', saveWhenHidden)
    return () => {
      window.removeEventListener('pagehide', saveOnPageHide)
      document.removeEventListener('visibilitychange', saveWhenHidden)
    }
  }, [enabled, flush, hydrated, syncNow])

  useEffect(() => {
    if (!serverEnabled) return undefined
    const retryWhenOnline = () => {
      resetServerBackoff()
      if (serverReady) {
        void syncNow()
        return
      }
      openedServerKeyRef.current = ''
      setServerRetryToken((current) => current + 1)
    }
    window.addEventListener('online', retryWhenOnline)
    return () => window.removeEventListener('online', retryWhenOnline)
  }, [resetServerBackoff, serverEnabled, serverReady, syncNow])

  const resolveConflict = useCallback(async (strategy) => {
    const currentConflict = conflictRef.current
    if (!currentConflict) return false
    if (strategy === 'server') {
      dispatch({ type: 'load', cells: currentConflict.serverCells })
      serverRevisionRef.current = currentConflict.serverRevision
      serverSyncedLocalRevisionRef.current = 0
      setServerRevision(currentConflict.serverRevision)
      setConflict(null)
      setServerError('')
      await saveAstraBuilderDraft(storageKey, currentConflict.serverCells, {
        blockCount: currentConflict.serverBlockCount,
        serverRevision: currentConflict.serverRevision,
        serverDirty: false,
      })
      loadedDraftRef.current = {
        cells: currentConflict.serverCells.slice(),
        blockCount: currentConflict.serverBlockCount,
        serverRevision: currentConflict.serverRevision,
        serverDirty: false,
      }
      setSavedRevision(0)
      onSyncMessage?.('서버에 저장된 건축물로 복구했습니다.')
      return true
    }
    if (strategy !== 'device' || !serverLeaseRef.current?.leaseId) return false

    setServerSyncing(true)
    setServerError('')
    try {
      const result = await saveServerState({
        plotId,
        leaseId: serverLeaseRef.current.leaseId,
        baseRevision: currentConflict.serverRevision,
        encoding: 'u16le-v1',
        gridDataBase64: encodeAstraBuilderGridBase64(currentConflict.localCells),
        modules: [],
        blockCount: currentConflict.localBlockCount,
      })
      const nextServerRevision = Number(result?.revision)
      if (!Number.isInteger(nextServerRevision)) throw new Error('invalid server revision')
      dispatch({ type: 'load', cells: currentConflict.localCells })
      serverRevisionRef.current = nextServerRevision
      serverSyncedLocalRevisionRef.current = 0
      setServerRevision(nextServerRevision)
      setConflict(null)
      await saveAstraBuilderDraft(storageKey, currentConflict.localCells, {
        blockCount: currentConflict.localBlockCount,
        serverRevision: nextServerRevision,
        serverDirty: false,
      })
      loadedDraftRef.current = {
        cells: currentConflict.localCells.slice(),
        blockCount: currentConflict.localBlockCount,
        serverRevision: nextServerRevision,
        serverDirty: false,
      }
      setSavedRevision(0)
      onSyncMessage?.('이 기기의 건축물을 서버에 적용했습니다.')
      return true
    } catch (error) {
      if (isRevisionConflict(error)) {
        try {
          const latestServer = await openServerPlot({
            plotId,
          })
          await setRevisionConflict({
            cells: currentConflict.localCells,
            blockCount: currentConflict.localBlockCount,
          }, latestServer, 'resolve-conflict-retry')
        } catch (refreshError) {
          setServerError(getSyncErrorMessage(refreshError))
        }
      } else {
        setServerError(getSyncErrorMessage(error))
      }
      return false
    } finally {
      setServerSyncing(false)
    }
  }, [
    onSyncMessage,
    openServerPlot,
    plotId,
    saveServerState,
    setRevisionConflict,
    storageKey,
  ])

  const edit = useCallback((nextEdit) => {
    if (conflictRef.current) return false
    const current = stateRef.current
    const result = applyAstraBuilderEdit(current.cells, nextEdit)
    if (!result) return false
    const effectiveBlockCapacity = Math.max(blockCapacity, serverBlockCapacity)
    if (nextEdit?.tool === 'place' && countAstraBuilderBlocks(result.cells) > effectiveBlockCapacity) {
      onLimitReached?.({ blockCapacity: effectiveBlockCapacity, blockCount: current.blockCount })
      return false
    }
    dispatch({ type: 'edit', edit: nextEdit })
    return true
  }, [blockCapacity, onLimitReached, serverBlockCapacity])

  const saveState = useMemo(() => {
    if (conflict) return 'conflict'
    if (localSyncing || serverOpening || serverSyncing) return 'syncing'
    if (state.revision !== savedRevision) return 'device'
    if (!serverEnabled) return 'local'
    if (serverReady && state.revision === serverSyncedLocalRevisionRef.current) return 'saved'
    return 'device'
  }, [
    conflict,
    localSyncing,
    savedRevision,
    serverEnabled,
    serverOpening,
    serverReady,
    serverSyncing,
    state.revision,
  ])

  return useMemo(() => ({
    ...state,
    hydrated,
    saveState,
    serverRevision,
    serverError,
    blockCapacity: Math.max(blockCapacity, serverBlockCapacity),
    conflict,
    edit,
    undo: () => {
      if (!conflictRef.current) dispatch({ type: 'undo' })
    },
    redo: () => {
      if (!conflictRef.current) dispatch({ type: 'redo' })
    },
    canUndo: !conflict && state.undo.length > 0,
    canRedo: !conflict && state.redo.length > 0,
    flush,
    syncNow,
    resolveConflict,
  }), [
    conflict,
    edit,
    flush,
    hydrated,
    resolveConflict,
    saveState,
    serverError,
    blockCapacity,
    serverBlockCapacity,
    serverRevision,
    state,
    syncNow,
  ])
}
