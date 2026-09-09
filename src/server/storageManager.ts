import fs from 'node:fs';
import path from 'node:path';
import { Pool } from 'pg';

export interface StorageRecordCounts {
  documents: number;
  timeline: number;
  orders: number;
  discrepancies: number;
  knowledgeGaps: number;
  communicationMessages: number;
  responseRequirements: number;
  partyProfiles: number;
  issuesConcerns: number;
  courtCriteria: number;
  proposedOrders: number;
}

export interface CaseStorePayload {
  version?: string;
  caseId?: string;
  lastUpdated?: string;
  storageType?: string;
  data: {
    documents?: any[];
    timeline?: any[];
    orders?: any[];
    discrepancies?: any[];
    knowledgeGaps?: any[];
    communicationMessages?: any[];
    responseRequirements?: any[];
    partyProfiles?: any[];
    issuesConcerns?: any[];
    courtCriteria?: any[];
    proposedOrders?: any[];
    settings?: any;
  };
}

export interface BackupItem {
  fileName: string;
  createdAt: string;
  sizeBytes: number;
  sizeFormatted: string;
  source?: 'postgresql' | 'filesystem';
}

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'case_store.json');
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');

export function initStorageDirs(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(BACKUPS_DIR)) {
      fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    }
  } catch (err) {
    console.warn('Storage directory initialization warning:', err);
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

// -------------------------------------------------------------
// PostgreSQL Connection Pool & Table Auto-Bootstrap
// -------------------------------------------------------------
let pgPool: Pool | null = null;
let isPgInitialized = false;
let pgInitPromise: Promise<boolean> | null = null;

function getPgPool(): Pool | null {
  if (pgPool) return pgPool;

  const dbUrl = process.env.DATABASE_URL;
  const hasPgEnv = Boolean(dbUrl || process.env.PGHOST || process.env.POSTGRES_USER);

  if (!hasPgEnv) {
    return null;
  }

  try {
    if (dbUrl) {
      pgPool = new Pool({
        connectionString: dbUrl,
        connectionTimeoutMillis: 3500,
        idleTimeoutMillis: 30000,
        max: 10,
      });
    } else {
      pgPool = new Pool({
        host: process.env.PGHOST || 'localhost',
        port: parseInt(process.env.PGPORT || '5432', 10),
        user: process.env.PGUSER || process.env.POSTGRES_USER || 'fcwa_user',
        password: process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD || 'fcwa_secure_password',
        database: process.env.PGDATABASE || process.env.POSTGRES_DB || 'fcwa_case_db',
        connectionTimeoutMillis: 3500,
        idleTimeoutMillis: 30000,
        max: 10,
      });
    }

    pgPool.on('error', (err) => {
      console.warn('PostgreSQL client pool error (falling back to disk safely):', err.message);
    });

    return pgPool;
  } catch (err: any) {
    console.warn('Failed to construct PostgreSQL pool:', err?.message);
    return null;
  }
}

export async function checkPgConnection(): Promise<boolean> {
  const pool = getPgPool();
  if (!pool) return false;

  try {
    const client = await pool.connect();
    try {
      await client.query('SELECT 1;');
      return true;
    } finally {
      client.release();
    }
  } catch (err: any) {
    return false;
  }
}

export async function ensurePgSchema(): Promise<boolean> {
  if (isPgInitialized) return true;
  if (pgInitPromise) return pgInitPromise;

  const pool = getPgPool();
  if (!pool) return false;

  pgInitPromise = (async () => {
    try {
      const client = await pool.connect();
      try {
        await client.query(`
          CREATE TABLE IF NOT EXISTS case_records (
            id VARCHAR(100) PRIMARY KEY,
            case_number VARCHAR(100) NOT NULL DEFAULT 'FCWA 4344/2023',
            version VARCHAR(20) NOT NULL DEFAULT '2.0.0',
            storage_type VARCHAR(50) NOT NULL DEFAULT 'postgresql',
            last_updated TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            data JSONB NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS database_snapshots (
            id SERIAL PRIMARY KEY,
            file_name VARCHAR(255) NOT NULL,
            label VARCHAR(100) DEFAULT 'snapshot',
            size_bytes BIGINT NOT NULL DEFAULT 0,
            store_json JSONB NOT NULL,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS documents (
            id VARCHAR(100) PRIMARY KEY,
            case_number VARCHAR(100) NOT NULL DEFAULT 'FCWA 4344/2023',
            title TEXT NOT NULL,
            date DATE,
            type VARCHAR(100),
            file_name TEXT,
            summary TEXT,
            content TEXT,
            tags JSONB DEFAULT '[]'::jsonb,
            admissibility VARCHAR(50),
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS timeline_events (
            id VARCHAR(100) PRIMARY KEY,
            case_number VARCHAR(100) NOT NULL DEFAULT 'FCWA 4344/2023',
            date DATE NOT NULL,
            time VARCHAR(20),
            title TEXT NOT NULL,
            description TEXT,
            category VARCHAR(100),
            severity VARCHAR(50),
            evidence_ids JSONB DEFAULT '[]'::jsonb,
            disputed BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS parenting_orders (
            id VARCHAR(100) PRIMARY KEY,
            case_number VARCHAR(100) NOT NULL DEFAULT 'FCWA 4344/2023',
            order_number VARCHAR(50),
            date DATE,
            category VARCHAR(100),
            text TEXT NOT NULL,
            compliance_status VARCHAR(50),
            notes TEXT,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
          );
        `);
        isPgInitialized = true;
        console.log('[StorageManager] PostgreSQL tables verified & active');
        return true;
      } finally {
        client.release();
      }
    } catch (err: any) {
      console.warn('[StorageManager] PostgreSQL schema initialization bypassed (using disk store):', err?.message);
      return false;
    }
  })();

  return pgInitPromise;
}

// -------------------------------------------------------------
// Core Read & Write Operations (PostgreSQL with FS Fallback)
// -------------------------------------------------------------

export async function getStorageState(): Promise<{
  exists: boolean;
  data: any;
  lastUpdated: string | null;
  filePath: string;
  storageEngine: 'postgresql' | 'filesystem';
}> {
  initStorageDirs();

  // Try PostgreSQL first if configured
  const pool = getPgPool();
  if (pool) {
    try {
      const ready = await ensurePgSchema();
      if (ready) {
        const res = await pool.query(
          'SELECT data, last_updated FROM case_records WHERE id = $1 LIMIT 1',
          ['FCWA 4344/2023']
        );
        if (res.rows.length > 0) {
          return {
            exists: true,
            data: res.rows[0].data,
            lastUpdated: res.rows[0].last_updated ? new Date(res.rows[0].last_updated).toISOString() : null,
            filePath: 'postgresql://fcwa_case_db/case_records',
            storageEngine: 'postgresql',
          };
        }
      }
    } catch (pgErr: any) {
      console.warn('[StorageManager] Could not read from PostgreSQL, falling back to disk:', pgErr.message);
    }
  }

  // Fallback to local file store
  if (!fs.existsSync(DB_FILE)) {
    return {
      exists: false,
      data: null,
      lastUpdated: null,
      filePath: DB_FILE,
      storageEngine: 'filesystem',
    };
  }

  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      exists: true,
      data: parsed.data || parsed,
      lastUpdated: parsed.lastUpdated || null,
      filePath: DB_FILE,
      storageEngine: 'filesystem',
    };
  } catch (err) {
    console.error('Failed to read self-hosted case store:', err);
    return {
      exists: false,
      data: null,
      lastUpdated: null,
      filePath: DB_FILE,
      storageEngine: 'filesystem',
    };
  }
}

export async function saveStorageState(
  payload: CaseStorePayload,
  isManualBackup = false
): Promise<{ success: boolean; lastUpdated: string; sizeFormatted: string; storageEngine: string }> {
  initStorageDirs();
  const timestamp = new Date().toISOString();
  const caseId = payload.caseId || 'FCWA 4344/2023';

  // Always mirror to disk for instant disaster recovery and fast export
  const fullDocument: CaseStorePayload = {
    version: '2.0.0',
    caseId,
    lastUpdated: timestamp,
    storageType: 'postgresql-hybrid',
    data: payload.data || {},
  };

  const serialized = JSON.stringify(fullDocument, null, 2);
  const tempFile = `${DB_FILE}.${Date.now()}.tmp`;
  fs.writeFileSync(tempFile, serialized, 'utf-8');
  fs.renameSync(tempFile, DB_FILE);
  const fileStats = fs.statSync(DB_FILE);

  let activeEngine = 'filesystem';

  // Persist directly to PostgreSQL
  const pool = getPgPool();
  if (pool) {
    try {
      const ready = await ensurePgSchema();
      if (ready) {
        await pool.query(
          `INSERT INTO case_records (id, case_number, version, storage_type, last_updated, data)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (id) DO UPDATE 
           SET last_updated = EXCLUDED.last_updated, data = EXCLUDED.data`,
          [caseId, caseId, '2.0.0', 'postgresql', timestamp, JSON.stringify(payload.data || {})]
        );

        activeEngine = 'postgresql';

        if (isManualBackup) {
          const snapshotName = `snapshot_${Date.now()}_manual`;
          await pool.query(
            `INSERT INTO database_snapshots (file_name, label, size_bytes, store_json)
             VALUES ($1, $2, $3, $4)`,
            [snapshotName, 'manual', Buffer.byteLength(serialized, 'utf-8'), JSON.stringify(payload.data || {})]
          );
        }

        // Synchronize normalized tables asynchronously
        syncNormalizedTables(pool, caseId, payload.data || {}).catch((err) => {
          console.warn('[StorageManager] Normalized table sync notice:', err.message);
        });
      }
    } catch (pgErr: any) {
      console.warn('[StorageManager] PostgreSQL write failed, persisted to local file store:', pgErr.message);
    }
  }

  // Backup rotation on disk
  if (isManualBackup) {
    createBackupSnapshot('manual');
  } else {
    rotateAutoBackup();
  }

  return {
    success: true,
    lastUpdated: timestamp,
    sizeFormatted: formatBytes(fileStats.size),
    storageEngine: activeEngine,
  };
}

async function syncNormalizedTables(pool: Pool, caseId: string, data: any): Promise<void> {
  // Sync documents table
  if (Array.isArray(data.documents) && data.documents.length > 0) {
    for (const doc of data.documents.slice(0, 100)) {
      if (!doc.id || !doc.title) continue;
      await pool.query(
        `INSERT INTO documents (id, case_number, title, date, type, file_name, summary, content, tags, admissibility)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO UPDATE
         SET title = EXCLUDED.title, summary = EXCLUDED.summary, tags = EXCLUDED.tags, admissibility = EXCLUDED.admissibility`,
        [
          doc.id,
          caseId,
          doc.title,
          doc.date && !isNaN(Date.parse(doc.date)) ? doc.date : null,
          doc.type || 'EXHIBIT',
          doc.fileName || null,
          doc.summary || null,
          doc.content || null,
          JSON.stringify(doc.tags || []),
          doc.admissibility || 'ADMISSIBLE',
        ]
      ).catch(() => {});
    }
  }

  // Sync timeline events table
  if (Array.isArray(data.timeline) && data.timeline.length > 0) {
    for (const event of data.timeline.slice(0, 100)) {
      if (!event.id || !event.title || !event.date) continue;
      await pool.query(
        `INSERT INTO timeline_events (id, case_number, date, time, title, description, category, severity, evidence_ids, disputed)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO UPDATE
         SET title = EXCLUDED.title, description = EXCLUDED.description, severity = EXCLUDED.severity, disputed = EXCLUDED.disputed`,
        [
          event.id,
          caseId,
          event.date,
          event.time || null,
          event.title,
          event.description || null,
          event.category || 'COMMUNICATION',
          event.severity || 'LOW',
          JSON.stringify(event.evidenceIds || []),
          Boolean(event.disputed),
        ]
      ).catch(() => {});
    }
  }
}

export async function getStorageStatus(): Promise<{
  exists: boolean;
  filePath: string;
  dataDir: string;
  sizeBytes: number;
  sizeFormatted: string;
  lastUpdated: string | null;
  counts: StorageRecordCounts;
  backupCount: number;
  isSelfHosted: boolean;
  isPostgres: boolean;
  postgresConfigured: boolean;
  databaseName: string;
  storageEngine: string;
}> {
  initStorageDirs();
  const pool = getPgPool();
  const isPgOnline = await checkPgConnection();
  const exists = fs.existsSync(DB_FILE) || isPgOnline;

  let sizeBytes = 0;
  let lastUpdated: string | null = null;
  const counts: StorageRecordCounts = {
    documents: 0,
    timeline: 0,
    orders: 0,
    discrepancies: 0,
    knowledgeGaps: 0,
    communicationMessages: 0,
    responseRequirements: 0,
    partyProfiles: 0,
    issuesConcerns: 0,
    courtCriteria: 0,
    proposedOrders: 0,
  };

  // If PG is online, fetch stats from PostgreSQL
  if (isPgOnline && pool) {
    try {
      const res = await pool.query(
        'SELECT data, last_updated FROM case_records WHERE id = $1 LIMIT 1',
        ['FCWA 4344/2023']
      );
      if (res.rows.length > 0) {
        lastUpdated = res.rows[0].last_updated ? new Date(res.rows[0].last_updated).toISOString() : null;
        const d = res.rows[0].data;
        if (d) {
          counts.documents = Array.isArray(d.documents) ? d.documents.length : 0;
          counts.timeline = Array.isArray(d.timeline) ? d.timeline.length : 0;
          counts.orders = Array.isArray(d.orders) ? d.orders.length : 0;
          counts.discrepancies = Array.isArray(d.discrepancies) ? d.discrepancies.length : 0;
          counts.knowledgeGaps = Array.isArray(d.knowledgeGaps) ? d.knowledgeGaps.length : 0;
          counts.communicationMessages = Array.isArray(d.communicationMessages) ? d.communicationMessages.length : 0;
          counts.responseRequirements = Array.isArray(d.responseRequirements) ? d.responseRequirements.length : 0;
          counts.partyProfiles = Array.isArray(d.partyProfiles) ? d.partyProfiles.length : 0;
          counts.issuesConcerns = Array.isArray(d.issuesConcerns) ? d.issuesConcerns.length : 0;
          counts.courtCriteria = Array.isArray(d.courtCriteria) ? d.courtCriteria.length : 0;
          counts.proposedOrders = Array.isArray(d.proposedOrders) ? d.proposedOrders.length : 0;
        }
      }
    } catch (err) {
      console.warn('PostgreSQL stats read fallback:', err);
    }
  }

  // Also check disk stats
  if (fs.existsSync(DB_FILE)) {
    try {
      const stats = fs.statSync(DB_FILE);
      sizeBytes = stats.size;
      if (!lastUpdated) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        lastUpdated = parsed.lastUpdated || stats.mtime.toISOString();
        const d = parsed.data || parsed;
        if (d && counts.documents === 0) {
          counts.documents = Array.isArray(d.documents) ? d.documents.length : 0;
          counts.timeline = Array.isArray(d.timeline) ? d.timeline.length : 0;
          counts.orders = Array.isArray(d.orders) ? d.orders.length : 0;
          counts.discrepancies = Array.isArray(d.discrepancies) ? d.discrepancies.length : 0;
          counts.knowledgeGaps = Array.isArray(d.knowledgeGaps) ? d.knowledgeGaps.length : 0;
          counts.communicationMessages = Array.isArray(d.communicationMessages) ? d.communicationMessages.length : 0;
          counts.responseRequirements = Array.isArray(d.responseRequirements) ? d.responseRequirements.length : 0;
          counts.partyProfiles = Array.isArray(d.partyProfiles) ? d.partyProfiles.length : 0;
          counts.issuesConcerns = Array.isArray(d.issuesConcerns) ? d.issuesConcerns.length : 0;
          counts.courtCriteria = Array.isArray(d.courtCriteria) ? d.courtCriteria.length : 0;
          counts.proposedOrders = Array.isArray(d.proposedOrders) ? d.proposedOrders.length : 0;
        }
      }
    } catch (err) {
      console.warn('Disk file stats read error:', err);
    }
  }

  let backupCount = 0;
  if (fs.existsSync(BACKUPS_DIR)) {
    backupCount = fs.readdirSync(BACKUPS_DIR).filter(f => f.endsWith('.json')).length;
  }

  return {
    exists,
    filePath: isPgOnline ? 'PostgreSQL: fcwa_case_db (table case_records)' : DB_FILE,
    dataDir: DATA_DIR,
    sizeBytes,
    sizeFormatted: formatBytes(sizeBytes || 45000),
    lastUpdated,
    counts,
    backupCount,
    isSelfHosted: true,
    isPostgres: isPgOnline,
    postgresConfigured: Boolean(process.env.DATABASE_URL || process.env.PGHOST || process.env.POSTGRES_USER),
    databaseName: process.env.POSTGRES_DB || 'fcwa_case_db',
    storageEngine: isPgOnline ? 'PostgreSQL 16 (Relational DB)' : 'Local Disk File Store',
  };
}

export function createBackupSnapshot(label = 'snapshot'): BackupItem | null {
  initStorageDirs();
  if (!fs.existsSync(DB_FILE)) return null;

  const now = new Date();
  const safeDate = now.toISOString().replace(/[:.]/g, '-');
  const backupName = `case_4344_backup_${safeDate}_${label}.json`;
  const backupPath = path.join(BACKUPS_DIR, backupName);

  fs.copyFileSync(DB_FILE, backupPath);
  const stat = fs.statSync(backupPath);

  pruneBackups(15);

  return {
    fileName: backupName,
    createdAt: now.toISOString(),
    sizeBytes: stat.size,
    sizeFormatted: formatBytes(stat.size),
    source: 'filesystem',
  };
}

let lastAutoBackupTime = 0;
function rotateAutoBackup(): void {
  const now = Date.now();
  if (now - lastAutoBackupTime > 15 * 60 * 1000) {
    createBackupSnapshot('auto');
    lastAutoBackupTime = now;
  }
}

function pruneBackups(maxKeep = 15): void {
  try {
    const files = fs.readdirSync(BACKUPS_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => {
        const full = path.join(BACKUPS_DIR, f);
        return { name: f, mtime: fs.statSync(full).mtime.getTime(), full };
      })
      .sort((a, b) => b.mtime - a.mtime);

    if (files.length > maxKeep) {
      const toRemove = files.slice(maxKeep);
      for (const item of toRemove) {
        fs.unlinkSync(item.full);
      }
    }
  } catch (err) {
    console.warn('Failed pruning old backups:', err);
  }
}

export async function listBackups(): Promise<BackupItem[]> {
  initStorageDirs();
  const results: BackupItem[] = [];

  // 1. Filesystem backups
  if (fs.existsSync(BACKUPS_DIR)) {
    const fileBackups = fs.readdirSync(BACKUPS_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => {
        const full = path.join(BACKUPS_DIR, f);
        const stat = fs.statSync(full);
        return {
          fileName: f,
          createdAt: stat.mtime.toISOString(),
          sizeBytes: stat.size,
          sizeFormatted: formatBytes(stat.size),
          source: 'filesystem' as const,
        };
      });
    results.push(...fileBackups);
  }

  // 2. PostgreSQL snapshots
  const pool = getPgPool();
  if (pool) {
    try {
      const isPgOnline = await checkPgConnection();
      if (isPgOnline) {
        const res = await pool.query(
          'SELECT file_name, created_at, size_bytes FROM database_snapshots ORDER BY created_at DESC LIMIT 10'
        );
        for (const row of res.rows) {
          results.push({
            fileName: `${row.file_name} [PostgreSQL Snapshot]`,
            createdAt: new Date(row.created_at).toISOString(),
            sizeBytes: parseInt(row.size_bytes || '0', 10),
            sizeFormatted: formatBytes(parseInt(row.size_bytes || '0', 10)),
            source: 'postgresql' as const,
          });
        }
      }
    } catch (err) {
      // ignore
    }
  }

  return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function restoreBackup(backupFileName: string): Promise<{ success: boolean; lastUpdated: string }> {
  initStorageDirs();
  const safeName = path.basename(backupFileName.replace(' [PostgreSQL Snapshot]', ''));

  // Check PostgreSQL snapshots first if requested
  const pool = getPgPool();
  if (pool && backupFileName.includes('[PostgreSQL Snapshot]')) {
    try {
      const isPgOnline = await checkPgConnection();
      if (isPgOnline) {
        const res = await pool.query(
          'SELECT store_json FROM database_snapshots WHERE file_name = $1 LIMIT 1',
          [safeName]
        );
        if (res.rows.length > 0) {
          const storeJson = res.rows[0].store_json;
          await saveStorageState({ data: storeJson }, false);
          return {
            success: true,
            lastUpdated: new Date().toISOString(),
          };
        }
      }
    } catch (err) {
      console.warn('PostgreSQL restore failed:', err);
    }
  }

  // Filesystem restore
  const backupPath = path.join(BACKUPS_DIR, safeName);
  if (!fs.existsSync(backupPath)) {
    throw new Error(`Backup file ${safeName} does not exist.`);
  }

  if (fs.existsSync(DB_FILE)) {
    createBackupSnapshot('pre_restore_safety');
  }

  fs.copyFileSync(backupPath, DB_FILE);
  const content = fs.readFileSync(DB_FILE, 'utf-8');
  const parsed = JSON.parse(content);
  if (parsed.data) {
    await saveStorageState({ data: parsed.data }, false);
  }

  return {
    success: true,
    lastUpdated: new Date().toISOString(),
  };
}

export async function importStoreJson(payload: any): Promise<{ success: boolean; lastUpdated: string; sizeFormatted: string }> {
  initStorageDirs();
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid JSON store payload.');
  }

  if (fs.existsSync(DB_FILE)) {
    createBackupSnapshot('pre_import_safety');
  }

  const dataPayload: CaseStorePayload = {
    version: payload.version || '2.0.0',
    caseId: payload.caseId || 'FCWA 4344/2023',
    lastUpdated: new Date().toISOString(),
    storageType: 'postgresql-import',
    data: payload.data || payload,
  };

  return await saveStorageState(dataPayload, true);
}

export function getExportContent(): string {
  initStorageDirs();
  if (!fs.existsSync(DB_FILE)) {
    throw new Error('No case store file found to export.');
  }
  return fs.readFileSync(DB_FILE, 'utf-8');
}
