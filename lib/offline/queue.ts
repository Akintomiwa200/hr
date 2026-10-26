export type QueuedRequest = {
  id: string;
  url: string;
  method: string;
  headers: [string, string][];
  body: string | null;
  createdAt: number;
};

export type QueuedRequestInput = Omit<QueuedRequest, "id" | "createdAt">;

const DB_NAME = "smart-hr-offline";
const DB_VERSION = 1;
const STORE = "requests";

function hasIndexedDb(): boolean {
  return typeof window !== "undefined" && "indexedDB" in window;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Unable to open offline store"));
  });
}

function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Offline store transaction failed"));
    tx.onabort = () => reject(tx.error ?? new Error("Offline store transaction aborted"));
  });
}

export async function enqueueRequest(input: QueuedRequestInput): Promise<QueuedRequest> {
  const item: QueuedRequest = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
  };
  if (!hasIndexedDb()) return item;

  const db = await openDb();
  try {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(item);
    await transactionDone(tx);
  } finally {
    db.close();
  }
  return item;
}

export async function getQueuedRequests(): Promise<QueuedRequest[]> {
  if (!hasIndexedDb()) return [];

  const db = await openDb();
  try {
    const tx = db.transaction(STORE, "readonly");
    const request = tx.objectStore(STORE).getAll();
    const rows = await new Promise<QueuedRequest[]>((resolve, reject) => {
      request.onsuccess = () => resolve((request.result as QueuedRequest[]) ?? []);
      request.onerror = () => reject(request.error ?? new Error("Unable to read offline queue"));
    });
    await transactionDone(tx);
    return rows.sort((a, b) => a.createdAt - b.createdAt);
  } finally {
    db.close();
  }
}

export async function deleteQueuedRequest(id: string): Promise<void> {
  if (!hasIndexedDb()) return;

  const db = await openDb();
  try {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    await transactionDone(tx);
  } finally {
    db.close();
  }
}

export async function queueCount(): Promise<number> {
  if (!hasIndexedDb()) return 0;

  const db = await openDb();
  try {
    const tx = db.transaction(STORE, "readonly");
    const request = tx.objectStore(STORE).count();
    const count = await new Promise<number>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result ?? 0);
      request.onerror = () => reject(request.error ?? new Error("Unable to count offline queue"));
    });
    await transactionDone(tx);
    return count;
  } finally {
    db.close();
  }
}
