import React, { useState, useEffect } from 'react';
import {
  Database,
  HardDrive,
  Server,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Shield,
  FileJson,
  FolderArchive,
  Terminal,
  X,
  FileText,
  Calendar,
  Scale,
  MessageSquare,
  Users,
  CheckSquare,
  AlertTriangle,
  Copy,
  Layers,
  Cpu
} from 'lucide-react';
import {
  StorageStatus,
  BackupItem,
  CaseDataStore,
  fetchSelfHostedStatus,
  createSelfHostedBackup,
  fetchSelfHostedBackups,
  restoreSelfHostedBackup,
  importSelfHostedStore,
  saveSelfHostedState,
  getSelfHostedExportUrl,
} from '../services/selfHostedStorage';

interface SelfHostedStorageModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStoreData: CaseDataStore;
  onStoreRestored: (newStore: CaseDataStore) => void;
  lastSyncTime?: string | null;
  syncStatus?: 'synced' | 'syncing' | 'error' | 'offline';
}

export const SelfHostedStorageModal: React.FC<SelfHostedStorageModalProps> = ({
  isOpen,
  onClose,
  currentStoreData,
  onStoreRestored,
  lastSyncTime,
  syncStatus = 'synced',
}) => {
  const [status, setStatus] = useState<StorageStatus | null>(null);
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showDockerGuide, setShowDockerGuide] = useState<boolean>(false);
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);
  const [backupLabel, setBackupLabel] = useState<string>('');

  const loadMetadata = async () => {
    setIsLoading(true);
    try {
      const [statusRes, backupsRes] = await Promise.all([
        fetchSelfHostedStatus(),
        fetchSelfHostedBackups(),
      ]);
      setStatus(statusRes);
      setBackups(backupsRes);
    } catch (err: any) {
      console.warn('Failed to load storage status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadMetadata();
      setActionSuccessMessage(null);
      setErrorMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleManualSyncNow = async () => {
    setIsSyncing(true);
    setActionSuccessMessage(null);
    setErrorMessage(null);
    try {
      const res = await saveSelfHostedState(currentStoreData, false);
      setActionSuccessMessage(`Saved to storage (${res.storageEngine || 'database'}) at ${new Date(res.lastUpdated).toLocaleTimeString()}`);
      await loadMetadata();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to save to storage.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCreateBackup = async () => {
    setIsLoading(true);
    setActionSuccessMessage(null);
    setErrorMessage(null);
    try {
      await saveSelfHostedState(currentStoreData, false);
      const backup = await createSelfHostedBackup(backupLabel.trim() || 'user_snapshot');
      setActionSuccessMessage(`Snapshot created: ${backup.fileName} (${backup.sizeFormatted})`);
      setBackupLabel('');
      await loadMetadata();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed creating snapshot.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestoreBackup = async (fileName: string) => {
    if (!window.confirm(`Are you sure you want to restore snapshot "${fileName}"? Current data will be safely backed up first.`)) {
      return;
    }
    setIsLoading(true);
    setActionSuccessMessage(null);
    setErrorMessage(null);
    try {
      await restoreSelfHostedBackup(fileName);
      const res = await fetch('/api/storage/state');
      const json = await res.json();
      if (json.data) {
        onStoreRestored(json.data);
      }
      setActionSuccessMessage(`Successfully restored snapshot: ${fileName}`);
      await loadMetadata();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed restoring snapshot.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const text = ev.target?.result as string;
        const parsed = JSON.parse(text);
        setIsLoading(true);
        const res = await importSelfHostedStore(parsed);
        if (parsed.data) {
          onStoreRestored(parsed.data);
        } else if (parsed.documents || parsed.timeline) {
          onStoreRestored(parsed);
        }
        setActionSuccessMessage(`Imported database file (${res.sizeFormatted}) successfully.`);
        await loadMetadata();
      } catch (err: any) {
        setErrorMessage(`Invalid JSON backup file: ${err?.message}`);
      } finally {
        setIsLoading(false);
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  const copyToClipboard = (text: string, snippetId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(snippetId);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  const dockerComposeYaml = `services:
  postgres:
    image: postgres:16-alpine
    container_name: fcwa_postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: \${POSTGRES_USER:-fcwa_user}
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD:-fcwa_secure_password}
      POSTGRES_DB: \${POSTGRES_DB:-fcwa_case_db}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init-db.sql:/docker-entrypoint-initdb.d/init.sql:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U fcwa_user -d fcwa_case_db"]
      interval: 5s
      timeout: 5s
      retries: 5

  app:
    build: .
    container_name: fcwa_case_app
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DATABASE_URL=postgres://fcwa_user:fcwa_secure_password@postgres:5432/fcwa_case_db
      - GEMINI_API_KEY=\${GEMINI_API_KEY:-}
      - DATA_DIR=/app/data
    volumes:
      - app_data:/app/data
    depends_on:
      postgres:
        condition: service_healthy

volumes:
  postgres_data:
  app_data:`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-sm animate-fadeIn">
      <div 
        id="self-hosted-storage-modal"
        className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-slate-800"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/30">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold tracking-tight">PostgreSQL & Docker Compose Self-Hosting</h2>
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${status?.isPostgres ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-blue-500/15 text-blue-300 border border-blue-500/30'}`}>
                  <span className={`w-2 h-2 rounded-full ${status?.isPostgres ? 'bg-emerald-400 animate-pulse' : 'bg-blue-400'}`}></span>
                  {status?.isPostgres ? 'PostgreSQL 16 Database Connected' : 'PostgreSQL Driver Ready (Self-Hosted Mode)'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Complete data sovereignty with native PostgreSQL schema, persistent Docker volumes, and automatic fallback.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Status Banners */}
        {actionSuccessMessage && (
          <div className="px-6 py-2.5 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="font-medium">{actionSuccessMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="px-6 py-2.5 bg-rose-50 border-b border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span className="font-medium">{errorMessage}</span>
          </div>
        )}

        {/* Content Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Engine & Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-50 rounded-lg border border-slate-200 p-4">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                <span className="flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-blue-600" />
                  Database Engine
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-mono">
                  {status?.isPostgres ? 'PostgreSQL' : 'Hybrid PG/Disk'}
                </span>
              </div>
              <div className="text-sm font-semibold text-slate-900 truncate">
                {status?.isPostgres ? 'PostgreSQL 16 (fcwa_case_db)' : 'PostgreSQL Ready / Disk Standby'}
              </div>
              <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
                <span>Target DB:</span>
                <span className="font-mono text-slate-700">{status?.databaseName || 'fcwa_case_db'}</span>
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg border border-slate-200 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                <Clock className="w-4 h-4 text-slate-600" />
                Live Sync & Status
              </div>
              <div className="text-sm font-medium text-slate-800 flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${syncStatus === 'synced' ? 'bg-emerald-500' : syncStatus === 'syncing' ? 'bg-amber-500' : 'bg-slate-400'}`}></span>
                {syncStatus === 'synced' ? 'Synchronized' : syncStatus === 'syncing' ? 'Writing...' : 'Online'}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Last modified: {status?.lastUpdated ? new Date(status.lastUpdated).toLocaleTimeString() : 'Current session'}
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg border border-slate-200 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                <Shield className="w-4 h-4 text-slate-600" />
                Disaster Recovery
              </div>
              <div className="text-sm font-semibold text-slate-800">
                {backups.length} Snapshots Available
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Table: <code className="text-slate-700 bg-slate-200 px-1 py-0.5 rounded">database_snapshots</code>
              </div>
            </div>
          </div>

          {/* Quick Operations Bar */}
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                id="btn-sync-now"
                onClick={handleManualSyncNow}
                disabled={isSyncing}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Saving to Database...' : 'Flush & Save to Database'}
              </button>

              <a
                id="btn-export-database"
                href={getSelfHostedExportUrl()}
                download="case_4344_case_store.json"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                Export DB Dump
              </a>

              <label
                id="btn-import-database"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-slate-600" />
                Import / Restore
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
            </div>

            <button
              onClick={() => setShowDockerGuide(!showDockerGuide)}
              className="text-xs text-blue-700 hover:text-blue-900 font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 transition-colors"
            >
              <Terminal className="w-3.5 h-3.5 text-blue-600" />
              {showDockerGuide ? 'Hide Docker Compose Setup' : 'View Docker Compose Instructions'}
            </button>
          </div>

          {/* Docker Compose Setup & Run Guide */}
          {showDockerGuide && (
            <div className="bg-slate-900 rounded-lg p-5 text-slate-200 text-xs font-mono space-y-4 border border-slate-800 animate-fadeIn">
              <div className="flex items-center justify-between text-slate-300 font-sans font-semibold text-xs border-b border-slate-800 pb-2">
                <span className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-400" />
                  Docker Compose Multi-Container Architecture (App + PostgreSQL 16)
                </span>
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                  Ready to deploy
                </span>
              </div>

              <div className="space-y-2 text-slate-300 font-sans text-xs">
                <p>
                  The project includes a production-grade <strong>Docker Compose setup</strong> with automated schema initialization, healthchecks, and isolated network:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="bg-slate-800/80 p-3 rounded border border-slate-700/80">
                    <div className="font-semibold text-white flex items-center gap-1.5 mb-1">
                      <Database className="w-3.5 h-3.5 text-blue-400" />
                      PostgreSQL Service (<code className="text-amber-300">postgres</code>)
                    </div>
                    <ul className="text-slate-400 space-y-1 text-[11px] list-disc pl-4">
                      <li>Postgres 16 Alpine with database <code className="text-slate-200">fcwa_case_db</code></li>
                      <li>Auto-mounted <code className="text-slate-200">init-db.sql</code> for instant table bootstrap</li>
                      <li>Healthchecked on <code className="text-slate-200">pg_isready</code></li>
                      <li>Volume: <code className="text-slate-200">postgres_data</code></li>
                    </ul>
                  </div>

                  <div className="bg-slate-800/80 p-3 rounded border border-slate-700/80">
                    <div className="font-semibold text-white flex items-center gap-1.5 mb-1">
                      <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                      Application Service (<code className="text-amber-300">app</code>)
                    </div>
                    <ul className="text-slate-400 space-y-1 text-[11px] list-disc pl-4">
                      <li>Express + Vite React application on port 3000</li>
                      <li>Connected via <code className="text-slate-200">DATABASE_URL</code></li>
                      <li>Waits for PostgreSQL health before starting</li>
                      <li>Hot standby backup volume: <code className="text-slate-200">app_data</code></li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Terminal Quickstart */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-slate-400 text-[11px]">
                  <span>1. Quickstart Command</span>
                  <button
                    onClick={() => copyToClipboard('docker compose up -d --build', 'cmd1')}
                    className="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-[11px]"
                  >
                    <Copy className="w-3 h-3" />
                    {copiedSnippet === 'cmd1' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <pre className="bg-black/60 p-3 rounded border border-slate-800 overflow-x-auto text-[11px] text-emerald-300">
{`# 1. Clone repository and navigate to root directory
# 2. Build and launch PostgreSQL and App containers:
docker compose up -d --build

# 3. View live logs:
docker compose logs -f

# 4. Access the application:
http://localhost:3000`}
                </pre>
              </div>

              {/* View docker-compose.yml snippet */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-slate-400 text-[11px]">
                  <span>2. docker-compose.yml Manifest</span>
                  <button
                    onClick={() => copyToClipboard(dockerComposeYaml, 'compose')}
                    className="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-[11px]"
                  >
                    <Copy className="w-3 h-3" />
                    {copiedSnippet === 'compose' ? 'Copied YAML!' : 'Copy YAML'}
                  </button>
                </div>
                <pre className="bg-black/60 p-3 rounded border border-slate-800 overflow-x-auto text-[11px] text-blue-300 max-h-48 overflow-y-auto">
{dockerComposeYaml}
                </pre>
              </div>
            </div>
          )}

          {/* Database Collection Statistics */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
              <FileJson className="w-4 h-4 text-slate-500" />
              Active Database Entities in Store
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
                  <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5 text-blue-600" /> Documents</span>
                  <span className="font-bold text-slate-800 text-sm">{currentStoreData.documents?.length || 0}</span>
                </div>
                <div className="text-[11px] text-slate-400 truncate">Primary exhibits & affidavits</div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
                  <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-indigo-600" /> Timeline Events</span>
                  <span className="font-bold text-slate-800 text-sm">{currentStoreData.timeline?.length || 0}</span>
                </div>
                <div className="text-[11px] text-slate-400 truncate">Chronological incidents</div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
                  <span className="flex items-center gap-1"><Scale className="w-3.5 h-3.5 text-emerald-600" /> Court Orders</span>
                  <span className="font-bold text-slate-800 text-sm">{currentStoreData.orders?.length || 0}</span>
                </div>
                <div className="text-[11px] text-slate-400 truncate">Interim Orders & compliance</div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
                  <span className="flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Discrepancies</span>
                  <span className="font-bold text-slate-800 text-sm">{currentStoreData.discrepancies?.length || 0}</span>
                </div>
                <div className="text-[11px] text-slate-400 truncate">Contradictions & omissions</div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
                  <span className="flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5 text-violet-600" /> Messages</span>
                  <span className="font-bold text-slate-800 text-sm">{currentStoreData.communicationMessages?.length || 0}</span>
                </div>
                <div className="text-[11px] text-slate-400 truncate">SMS & email audit thread</div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-rose-600" /> Response Logs</span>
                  <span className="font-bold text-slate-800 text-sm">{currentStoreData.responseRequirements?.length || 0}</span>
                </div>
                <div className="text-[11px] text-slate-400 truncate">42h & 24h compliance logs</div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
                  <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5 text-teal-600" /> Party Profiles</span>
                  <span className="font-bold text-slate-800 text-sm">{currentStoreData.partyProfiles?.length || 0}</span>
                </div>
                <div className="text-[11px] text-slate-400 truncate">Forensic behaviour patterns</div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
                  <span className="flex items-center gap-1"><CheckSquare className="w-3.5 h-3.5 text-cyan-600" /> s 60CC Criteria</span>
                  <span className="font-bold text-slate-800 text-sm">{currentStoreData.courtCriteria?.length || 0}</span>
                </div>
                <div className="text-[11px] text-slate-400 truncate">Statutory best interests tests</div>
              </div>
            </div>
          </div>

          {/* Snapshot & Disaster Recovery Management */}
          <div className="border-t border-slate-200 pt-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <FolderArchive className="w-4 h-4 text-slate-500" />
                Database Snapshots & Backups ({backups.length})
              </h3>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Optional snapshot note (e.g. pre-filing)"
                  value={backupLabel}
                  onChange={(e) => setBackupLabel(e.target.value)}
                  className="px-2.5 py-1 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-400 w-56"
                />
                <button
                  id="btn-create-snapshot"
                  onClick={handleCreateBackup}
                  disabled={isLoading}
                  className="px-3 py-1 bg-slate-800 text-white rounded-md text-xs font-medium hover:bg-slate-900 disabled:opacity-50 transition-colors"
                >
                  Create Snapshot
                </button>
              </div>
            </div>

            {backups.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-slate-200 rounded-lg text-slate-400 text-xs">
                No snapshots created yet. Snapshots are automatically captured before major data imports or on demand.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-lg overflow-hidden max-h-52 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
                    <tr>
                      <th className="py-2 px-3">Snapshot Name</th>
                      <th className="py-2 px-3">Storage Engine</th>
                      <th className="py-2 px-3">Timestamp</th>
                      <th className="py-2 px-3">Size</th>
                      <th className="py-2 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {backups.map((b) => (
                      <tr key={b.fileName} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2 px-3 font-medium text-slate-800 truncate max-w-xs" title={b.fileName}>
                          {b.fileName}
                        </td>
                        <td className="py-2 px-3 font-sans">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] ${b.source === 'postgresql' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>
                            {b.source === 'postgresql' ? 'PostgreSQL Table' : 'File Snapshot'}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-500 font-sans">
                          {new Date(b.createdAt).toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-slate-500">
                          {b.sizeFormatted}
                        </td>
                        <td className="py-2 px-3 text-right font-sans">
                          <button
                            onClick={() => handleRestoreBackup(b.fileName)}
                            disabled={isLoading}
                            className="px-2.5 py-1 rounded text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors border border-blue-200"
                          >
                            Restore
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <Server className="w-3.5 h-3.5 text-slate-400" />
            <span>Target Case: <strong className="text-slate-700">FCWA 4344/2023</strong> | Mode: <strong className="text-slate-700">{status?.storageEngine || 'Self-Hosted PostgreSQL (Docker Compose)'}</strong></span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
