import { defaultData } from './utils';
import type { AppData } from './types';

const DB_NAME = 'race-timer-db';
const STORE_NAME = 'app';
const KEY = 'state';
const LS_KEY = 'race-timer-state';

async function openDb(): Promise<IDBDatabase> {
  return await new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function loadData(): Promise<AppData> {
  try {
    const db = await openDb();
    const value = await new Promise<AppData | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(KEY);
      req.onsuccess = () => resolve(req.result as AppData | undefined);
      req.onerror = () => reject(req.error);
    });
    return value ? { ...defaultData, ...value } : loadFromLocalStorage();
  } catch {
    return loadFromLocalStorage();
  }
}

function loadFromLocalStorage(): AppData {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return defaultData;
    const parsed = JSON.parse(raw) as AppData;
    return { ...defaultData, ...parsed };
  } catch {
    return defaultData;
  }
}

export async function saveData(data: AppData): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(data, KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  }
}
