import { CanvasObject, DocumentProject, PageInfo } from '../types/pdf';

const DB_NAME = 'PDFStudioDB';
const DB_VERSION = 1;
const STORE_NAME = 'projects';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save or auto-save the active document project and objects to IndexedDB
 */
export async function saveProjectToDb(project: DocumentProject): Promise<void> {
  try {
    // Clone project and verify that fileBytes buffer is not detached
    let safeProject: DocumentProject = { ...project };
    if (project.fileBytes) {
      if (project.fileBytes.buffer.byteLength === 0) {
        // Buffer is detached, omit to prevent DataCloneError
        const { fileBytes, ...rest } = project;
        safeProject = rest as DocumentProject;
      } else {
        // Clone Uint8Array so it is safely isolated
        safeProject.fileBytes = project.fileBytes.slice();
      }
    }

    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(safeProject);
      req.onsuccess = () => resolve();
      req.onerror = () => {
        console.warn('IDB put error:', req.error);
        resolve(); // resolve gracefully so error does not crash UI
      };
    });
  } catch (err) {
    console.warn('Failed to persist project in IndexedDB:', err);
  }
}

/**
 * Retrieve the latest saved project from IndexedDB
 */
export async function getLatestProject(): Promise<DocumentProject | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const items = req.result as DocumentProject[];
        if (!items || items.length === 0) return resolve(null);
        // Sort by updatedAt descending
        items.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        resolve(items[0]);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to load project from IndexedDB:', err);
    return null;
  }
}

/**
 * Clear saved project from IndexedDB
 */
export async function clearProject(id: string): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to clear project from IndexedDB:', err);
  }
}
