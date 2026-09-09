/**
 * Storage Utility for Case 4344/2023 Evidentiary Knowledge Base
 * Safely handles local persistence across reloads with versioning and fallback.
 */

const STORAGE_PREFIX = 'fcwa_4344_';
const STORAGE_VERSION = 'v3_clean_';

// Purge any legacy cached mock data on module load
if (typeof window !== 'undefined' && window.localStorage) {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX) && !key.startsWith(`${STORAGE_PREFIX}${STORAGE_VERSION}`)) {
        localStorage.removeItem(key);
      }
    }
  } catch (e) {
    // Ignore in non-browser environments
  }
}

export function loadStoredData<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${STORAGE_VERSION}${key}`);
    if (!raw) return defaultValue;
    const parsed = JSON.parse(raw);
    return parsed as T;
  } catch (err) {
    console.warn(`Failed to load ${key} from storage:`, err);
    return defaultValue;
  }
}

export function saveStoredData<T>(key: string, value: T): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${STORAGE_VERSION}${key}`, JSON.stringify(value));
  } catch (err) {
    console.warn(`Failed to save ${key} to storage:`, err);
  }
}

export function clearCaseStorage(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  } catch (err) {
    console.warn('Failed to clear case storage:', err);
  }
}
