const DATABASE_NAME = 'metasense-astra-builder-poc'
const DATABASE_VERSION = 1
const STORE_NAME = 'plots'
export const ASTRA_BUILDER_LOCAL_ENCODING = 'u32le-v2'

function openAstraBuilderDatabase() {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null)
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'key' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('IndexedDB를 열 수 없습니다.'))
  })
}

function runPlotTransaction(mode, action) {
  return openAstraBuilderDatabase().then((database) => {
    if (!database) return null
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, mode)
      const store = transaction.objectStore(STORE_NAME)
      let request
      try {
        request = action(store)
      } catch (error) {
        database.close()
        reject(error)
        return
      }
      request.onsuccess = () => resolve(request.result ?? null)
      request.onerror = () => reject(request.error || new Error('건축 초안을 처리할 수 없습니다.'))
      transaction.oncomplete = () => database.close()
      transaction.onerror = () => {
        database.close()
        reject(transaction.error || new Error('건축 초안 저장에 실패했습니다.'))
      }
    })
  })
}

export async function loadAstraBuilderDraft(key, expectedCellCount) {
  if (!key) return null
  const record = await runPlotTransaction('readonly', (store) => store.get(key))
  if (!record || !['u16le-v1', ASTRA_BUILDER_LOCAL_ENCODING].includes(record.encoding) || !(record.data instanceof ArrayBuffer)) return null
  const CellArray = record.encoding === 'u16le-v1' ? Uint16Array : Uint32Array
  const cells = new CellArray(record.data)
  if (cells.length !== expectedCellCount) return null
  return {
    cells: record.encoding === 'u16le-v1' ? Uint32Array.from(cells) : cells.slice(),
    encoding: record.encoding,
    catalogVersion: Number(record.catalogVersion || 1),
    blockCount: Number(record.blockCount || 0),
    serverRevision: Number.isInteger(record.serverRevision) ? record.serverRevision : null,
    serverDirty: record.serverDirty === true,
    updatedAt: Number(record.updatedAt || 0),
  }
}

export async function saveAstraBuilderDraft(key, cells, metadata = {}) {
  if (!key || (!(cells instanceof Uint16Array) && !(cells instanceof Uint32Array))) return false
  const data = cells.buffer.slice(cells.byteOffset, cells.byteOffset + cells.byteLength)
  await runPlotTransaction('readwrite', (store) => store.put({
    key,
    encoding: metadata.encoding || (cells instanceof Uint16Array ? 'u16le-v1' : ASTRA_BUILDER_LOCAL_ENCODING),
    catalogVersion: Number(metadata.catalogVersion || (cells instanceof Uint16Array ? 1 : 2)),
    data,
    blockCount: Number(metadata.blockCount || 0),
    serverRevision: Number.isInteger(metadata.serverRevision)
      ? metadata.serverRevision
      : null,
    serverDirty: metadata.serverDirty === true,
    recoveryReason: String(metadata.recoveryReason || ''),
    updatedAt: Date.now(),
  }))
  return true
}

export function saveAstraBuilderRecoveryDraft(key, cells, metadata = {}) {
  const recoveryKey = `${key}:recovery:${Date.now()}`
  return saveAstraBuilderDraft(recoveryKey, cells, {
    ...metadata,
    serverDirty: true,
  }).then(() => recoveryKey)
}
