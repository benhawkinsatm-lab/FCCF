import { describe, it, expect, afterAll } from 'vitest';
import {
  initStorageDirs,
  getStorageStatus,
  createBackupSnapshot,
  listBackups,
  closePgPool,
  getExportContent,
} from '../src/server/storageManager';

describe('Storage Manager Core Engine', () => {
  afterAll(async () => {
    await closePgPool();
  });

  it('initializes storage directories without error', () => {
    expect(() => initStorageDirs()).not.toThrow();
  });

  it('returns storage status with record counts structure', async () => {
    const status = await getStorageStatus();
    expect(status).toBeDefined();
    expect(typeof status.exists).toBe('boolean');
    expect(typeof status.sizeBytes).toBe('number');
    expect(typeof status.sizeFormatted).toBe('string');
    expect(status.counts).toBeDefined();
    expect(typeof status.counts.documents).toBe('number');
    expect(typeof status.counts.timeline).toBe('number');
    expect(typeof status.counts.orders).toBe('number');
    expect(typeof status.counts.discrepancies).toBe('number');
    expect(typeof status.counts.communicationMessages).toBe('number');
  });

  it('exports case store content as valid JSON string if store exists', () => {
    try {
      const content = getExportContent();
      expect(typeof content).toBe('string');
      const parsed = JSON.parse(content);
      expect(parsed).toBeDefined();
    } catch (err: any) {
      // If store file does not exist in testing environment, it throws a descriptive error
      expect(err.message).toContain('No case store file found');
    }
  });

  it('creates and lists backup snapshots safely', async () => {
    const backupResult = createBackupSnapshot('test_snapshot');
    expect(backupResult).toBeDefined();
    if (backupResult) {
      expect(backupResult.fileName).toContain('test_snapshot');
      expect(typeof backupResult.sizeBytes).toBe('number');

      const backups = await listBackups();
      expect(Array.isArray(backups)).toBe(true);
      expect(backups.length).toBeGreaterThanOrEqual(1);
      const found = backups.find((b) => b.fileName.includes('test_snapshot'));
      expect(found).toBeDefined();
    }
  });

  it('gracefully closes PostgreSQL pool even when uninitialized or offline', async () => {
    await expect(closePgPool()).resolves.not.toThrow();
  });
});
