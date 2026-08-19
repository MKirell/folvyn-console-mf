const DB_NAME = 'folvyn-console'
const STORE = 'snapshots'
const RETENTION_MS = 7 * 24 * 60 * 60 * 1000

export interface Snapshot {
  id: string
  collection: string
  documentId: string
  label: string
  savedAt: number
  document: unknown
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is unavailable'))
      return
    }
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' }).createIndex('savedAt', 'savedAt')
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB failed to open'))
  })
}

function run<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>) {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE, mode)
        const request = work(transaction.objectStore(STORE))
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'))
        transaction.oncomplete = () => db.close()
      }),
  )
}

export async function putSnapshot(snapshot: Snapshot): Promise<void> {
  try {
    await run('readwrite', (store) => store.put(snapshot) as IDBRequest<IDBValidKey>)
  } catch {
    void 0
  }
}

export async function listSnapshots(): Promise<Snapshot[]> {
  try {
    const all = await run('readonly', (store) => store.getAll() as IDBRequest<Snapshot[]>)
    const cutoff = Date.now() - RETENTION_MS
    return all.filter((entry) => entry.savedAt >= cutoff).sort((a, b) => b.savedAt - a.savedAt)
  } catch {
    return []
  }
}

export async function clearSnapshots(): Promise<void> {
  try {
    await run('readwrite', (store) => store.clear() as IDBRequest<undefined>)
  } catch {
    void 0
  }
}

export async function purgeExpiredSnapshots(): Promise<void> {
  try {
    const cutoff = Date.now() - RETENTION_MS
    const all = await run('readonly', (store) => store.getAll() as IDBRequest<Snapshot[]>)
    await Promise.all(
      all
        .filter((entry) => entry.savedAt < cutoff)
        .map((entry) =>
          run('readwrite', (store) => store.delete(entry.id) as IDBRequest<undefined>),
        ),
    )
  } catch {
    void 0
  }
}
