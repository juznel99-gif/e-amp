export interface Recording {
  id: number;
  date: Date;
  blob: Blob;
}

const DB_NAME = 'SoundAmplifierDB';
const STORE_NAME = 'recordings';
const DB_VERSION = 1;

let db: IDBDatabase;

export const initDB = (): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Error opening IndexedDB:', request.error);
      reject(false);
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(true);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
  });
};

export const addRecording = (blob: Blob): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!db) {
      console.error('Database not initialized.');
      return reject('Database not initialized.');
    }
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const recording = {
      date: new Date(),
      blob: blob,
    };

    const request = store.add(recording);

    request.onsuccess = () => resolve();
    request.onerror = () => {
      console.error('Error adding recording:', request.error);
      reject(request.error);
    };
  });
};

export const getAllRecordings = (): Promise<Recording[]> => {
  return new Promise((resolve, reject) => {
    if (!db) {
      console.error('Database not initialized.');
      return reject('Database not initialized.');
    }
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    
    // Using a cursor with 'prev' direction to get newest items first
    const request = store.openCursor(null, 'prev');
    const recordings: Recording[] = [];

    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        recordings.push(cursor.value);
        cursor.continue();
      } else {
        resolve(recordings);
      }
    };
    
    request.onerror = () => {
      console.error('Error getting all recordings:', request.error);
      reject(request.error);
    };
  });
};

export const deleteRecording = (id: number): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (!db) {
            console.error('Database not initialized.');
            return reject('Database not initialized.');
        }
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => {
            console.error('Error deleting recording:', request.error);
            reject(request.error);
        };
    });
};