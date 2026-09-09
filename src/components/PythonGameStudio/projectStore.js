const DB_NAME = 'metasense-python-game-studio-v1'
const observedVersions = new Map()
let dbPromise
function openDatabase() {
  if (!dbPromise) dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore('projects', { keyPath: 'key' })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => { dbPromise = null; reject(req.error) }
  })
  return dbPromise
}
async function transact(mode, action) {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('projects', mode)
    const request = action(tx.objectStore('projects'))
    tx.oncomplete = () => resolve(request.result)
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error || new Error('초안 저장이 취소되었습니다.'))
  })
}
export async function listDrafts(uid) {
  const rows = await transact('readonly', store => store.getAll())
  const own = rows.filter(row => row.uid === uid).sort((a, b) => b.savedAt - a.savedAt)
  own.forEach(row => { if (!observedVersions.has(row.key)) observedVersions.set(row.key, row.version || null) })
  return own
}
export async function saveDraft(uid, project) {
  const db = await openDatabase(), key = `${uid}:${project.id}`
  return new Promise((resolve, reject) => {
    const tx = db.transaction('projects', 'readwrite'), store = tx.objectStore('projects')
    const get = store.get(key)
    let version = crypto.randomUUID()
    let conflict
    get.onsuccess = () => {
      if (get.result && JSON.stringify(get.result.project) === JSON.stringify(project)) { version = get.result.version; return }
      if ((get.result?.version || null) !== (observedVersions.get(key) || null)) {
        conflict = new Error('다른 탭에서 이 프로젝트를 변경했습니다. 현재 작업은 새 사본으로 보존합니다.')
        conflict.code = 'draft-conflict'; tx.abort(); return
      }
      store.put({ key, uid, project, version, savedAt: Date.now() })
    }
    tx.oncomplete = () => { observedVersions.set(key, version); resolve() }
    tx.onabort = () => reject(conflict || tx.error || new Error('초안 저장이 취소되었습니다.'))
    tx.onerror = () => reject(tx.error)
  })
}
export function selectDraft(row) { observedVersions.set(row.key, row.version || null); return row.project }
export async function deleteDraft(uid, id) { return transact('readwrite', store => store.delete(`${uid}:${id}`)) }
