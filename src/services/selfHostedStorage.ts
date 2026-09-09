import {
  DocumentRecord,
  TimelineEvent,
  ParentingOrder,
  DiscrepancyItem,
  KnowledgeGap,
  CommunicationMessage,
  ResponseRequirement,
  PartyProfile,
  IssueConcern,
  CourtCriterion,
  ProposedParentingOrder,
  CaseSettings,
} from '../types';

export interface CaseDataStore {
  documents: DocumentRecord[];
  timeline: TimelineEvent[];
  orders: ParentingOrder[];
  discrepancies: DiscrepancyItem[];
  knowledgeGaps: KnowledgeGap[];
  communicationMessages: CommunicationMessage[];
  responseRequirements: ResponseRequirement[];
  partyProfiles: PartyProfile[];
  issuesConcerns: IssueConcern[];
  courtCriteria: CourtCriterion[];
  proposedOrders: ProposedParentingOrder[];
  settings?: CaseSettings;
}

export interface StorageStatus {
  exists: boolean;
  filePath: string;
  dataDir: string;
  sizeBytes: number;
  sizeFormatted: string;
  lastUpdated: string | null;
  counts: {
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
  };
  backupCount: number;
  isSelfHosted: boolean;
  isPostgres?: boolean;
  postgresConfigured?: boolean;
  databaseName?: string;
  storageEngine?: string;
}

export interface BackupItem {
  fileName: string;
  createdAt: string;
  sizeBytes: number;
  sizeFormatted: string;
  source?: 'postgresql' | 'filesystem';
}

export async function fetchSelfHostedState(): Promise<{
  exists: boolean;
  data: Partial<CaseDataStore> | null;
  lastUpdated: string | null;
  filePath: string;
}> {
  try {
    const res = await fetch('/api/storage/state');
    if (!res.ok) {
      throw new Error(`Server returned HTTP ${res.status}`);
    }
    const json = await res.json();
    return {
      exists: Boolean(json.exists),
      data: json.data || null,
      lastUpdated: json.lastUpdated || null,
      filePath: json.filePath || 'data/case_store.json',
    };
  } catch (err) {
    console.warn('Could not fetch self-hosted store from server, falling back to local state:', err);
    return {
      exists: false,
      data: null,
      lastUpdated: null,
      filePath: 'data/case_store.json',
    };
  }
}

export async function saveSelfHostedState(
  data: CaseDataStore,
  isManualBackup = false
): Promise<{ success: boolean; lastUpdated: string; sizeFormatted: string; storageEngine?: string }> {
  const res = await fetch('/api/storage/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      data,
      isManualBackup,
      caseId: 'FCWA 4344/2023',
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to save to self-hosted storage: HTTP ${res.status}`);
  }

  return await res.json();
}

export async function fetchSelfHostedStatus(): Promise<StorageStatus> {
  const res = await fetch('/api/storage/status');
  if (!res.ok) {
    throw new Error(`Failed to get storage status: HTTP ${res.status}`);
  }
  return await res.json();
}

export async function createSelfHostedBackup(label?: string): Promise<BackupItem> {
  const res = await fetch('/api/storage/backup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ label }),
  });

  if (!res.ok) {
    throw new Error(`Failed to create backup: HTTP ${res.status}`);
  }

  const json = await res.json();
  return json.backup;
}

export async function fetchSelfHostedBackups(): Promise<BackupItem[]> {
  const res = await fetch('/api/storage/backups');
  if (!res.ok) {
    throw new Error(`Failed to list backups: HTTP ${res.status}`);
  }
  const json = await res.json();
  return json.backups || [];
}

export async function restoreSelfHostedBackup(fileName: string): Promise<{ success: boolean; lastUpdated: string }> {
  const res = await fetch('/api/storage/restore', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName }),
  });

  if (!res.ok) {
    throw new Error(`Failed to restore backup: HTTP ${res.status}`);
  }

  return await res.json();
}

export async function importSelfHostedStore(importedJson: any): Promise<{ success: boolean; lastUpdated: string; sizeFormatted: string }> {
  const res = await fetch('/api/storage/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(importedJson),
  });

  if (!res.ok) {
    throw new Error(`Failed to import storage: HTTP ${res.status}`);
  }

  return await res.json();
}

export function getSelfHostedExportUrl(): string {
  return '/api/storage/export';
}
