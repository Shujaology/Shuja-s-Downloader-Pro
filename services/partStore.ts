// Downloaded bytes are persisted in IndexedDB as Blob parts keyed by [downloadId, byteOffset],
// so paused downloads survive reloads and finished files can be assembled without copying.

const DB_NAME = 'shuja-downloader-pro';
const STORE = 'parts';

interface PartRecord {
  key: [string, number];
  blob: Blob;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

const range = (id: string) => IDBKeyRange.bound([id, 0], [id, Number.MAX_SAFE_INTEGER]);

export async function putPart(id: string, offset: number, blob: Blob): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE, 'readwrite');
  tx.objectStore(STORE).put(blob, [id, offset]);
  await done(tx);
}

export async function getParts(id: string): Promise<{ offset: number; blob: Blob }[]> {
  const db = await openDb();
  const tx = db.transaction(STORE, 'readonly');
  const store = tx.objectStore(STORE);
  const [keys, values] = await Promise.all([
    new Promise<IDBValidKey[]>((res, rej) => {
      const r = store.getAllKeys(range(id));
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    }),
    new Promise<Blob[]>((res, rej) => {
      const r = store.getAll(range(id));
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    }),
  ]);
  return keys.map((k, i) => ({ offset: (k as PartRecord['key'])[1], blob: values[i] }));
}

export async function deleteParts(id: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE, 'readwrite');
  tx.objectStore(STORE).delete(range(id));
  await done(tx);
}

export async function assembleFile(id: string, type?: string): Promise<Blob> {
  const parts = await getParts(id);
  parts.sort((a, b) => a.offset - b.offset);
  return new Blob(parts.map(p => p.blob), { type: type || 'application/octet-stream' });
}
