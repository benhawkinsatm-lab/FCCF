import React, { useEffect, useState } from 'react';
import { X, FolderSync, Loader2, CheckCircle2, AlertCircle, FileText, RefreshCw } from 'lucide-react';
import { DocumentRecord, ResponseRequirement, TimelineEvent } from '../types';
import { ingestFileEndToEnd } from '../utils/bulkIngestionPipeline';

interface LocalUploadFile {
  name: string;
  size: number;
  modifiedAt: string;
}

type FileStatus = 'pending' | 'processing' | 'done' | 'done-kept' | 'error';

interface FileProgress {
  name: string;
  status: FileStatus;
  error?: string;
}

interface BulkFolderImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDocumentAdded: (doc: DocumentRecord) => void;
  onResponseRequirementAdded?: (req: ResponseRequirement) => void;
  onTimelineEventAdded?: (event: TimelineEvent) => void;
  existingDocuments?: DocumentRecord[];
}

/**
 * Bulk-imports every file sitting in the local public/upload folder through
 * the exact same OCR + AI ingestion pipeline as the manual "Ingest Document
 * / OCR" flow (see src/utils/bulkIngestionPipeline.ts), rather than a
 * stripped-down or purely mechanical import. Files are processed one at a
 * time (not in parallel) so OCR and AI calls don't overwhelm the browser or
 * the API, with live per-file progress shown to the user.
 */
export const BulkFolderImportModal: React.FC<BulkFolderImportModalProps> = ({
  isOpen,
  onClose,
  onDocumentAdded,
  onResponseRequirementAdded,
  onTimelineEventAdded,
  existingDocuments = [],
}) => {
  const [files, setFiles] = useState<LocalUploadFile[]>([]);
  const [isListing, setIsListing] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [progress, setProgress] = useState<FileProgress[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [summary, setSummary] = useState<{ documents: number; responseRequirements: number; timelineEvents: number } | null>(null);

  const loadFileList = async () => {
    setIsListing(true);
    setListError(null);
    setSummary(null);
    setProgress([]);
    try {
      const res = await fetch('/api/local-upload/list');
      const data = await res.json();
      setFiles(Array.isArray(data.files) ? data.files : []);
      if (data.error) setListError(data.error);
    } catch (err) {
      setListError('Could not reach the server to list the local upload folder.');
      setFiles([]);
    } finally {
      setIsListing(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadFileList();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRunBulkImport = async () => {
    if (files.length === 0) return;
    setIsRunning(true);
    setSummary(null);
    setProgress(files.map(f => ({ name: f.name, status: 'pending' as FileStatus })));

    let docCount = 0;
    let reqCount = 0;
    let evtCount = 0;
    let seq = (existingDocuments?.length || 0) + 1;

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      setProgress(prev => prev.map((p, idx) => idx === i ? { ...p, status: 'processing' } : p));
      try {
        const fileRes = await fetch(`/upload/${encodeUploadPath(f.name)}`);
        if (!fileRes.ok) throw new Error(`Could not fetch ${f.name} (${fileRes.status})`);
        const blob = await fileRes.blob();
        const mimeType = blob.type || guessMimeFromName(f.name);
        const baseName = f.name.split('/').pop() || f.name;
        const file = new File([blob], baseName, { type: mimeType });

        const { document, responseRequirement, timelineEvent } = await ingestFileEndToEnd(file, seq);
        seq += 1;

        onDocumentAdded(document);
        docCount += 1;
        if (responseRequirement && onResponseRequirementAdded) {
          onResponseRequirementAdded(responseRequirement);
          reqCount += 1;
        }
        if (timelineEvent && onTimelineEventAdded) {
          onTimelineEventAdded(timelineEvent);
          evtCount += 1;
        }

        // File is fully ingested (OCR'd, AI-processed, and added to the case
        // record) -- clean it up from the local upload folder so re-running
        // a bulk import against the same folder doesn't re-process it. A
        // failed delete does not undo the ingestion above; it just leaves
        // the source file behind for the user to remove manually.
        let deleted = false;
        try {
          const delRes = await fetch(`/api/local-upload/file?name=${encodeURIComponent(f.name)}`, { method: 'DELETE' });
          const delJson = await delRes.json().catch(() => ({}));
          deleted = delRes.ok && delJson?.deleted === true;
        } catch {
          deleted = false;
        }

        setProgress(prev => prev.map((p, idx) => idx === i ? { ...p, status: deleted ? 'done' : 'done-kept' } : p));
      } catch (err: any) {
        setProgress(prev => prev.map((p, idx) => idx === i ? { ...p, status: 'error', error: err?.message || 'Ingestion failed' } : p));
      }
    }

    setSummary({ documents: docCount, responseRequirements: reqCount, timelineEvents: evtCount });
    setIsRunning(false);
  };

  const doneCount = progress.filter(p => p.status === 'done' || p.status === 'done-kept').length;
  const errorCount = progress.filter(p => p.status === 'error').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <FolderSync className="w-5 h-5 text-indigo-600" />
            <div>
              <h2 className="text-base font-bold text-slate-900 font-serif">Bulk Import from Local Folder</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                public/upload &mdash; every file runs through the same OCR + AI ingestion pipeline as a manual upload.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600" id="close-bulk-import-btn">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {isListing && (
            <div className="flex items-center gap-2 text-xs text-slate-500 py-6 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Scanning public/upload…</span>
            </div>
          )}

          {!isListing && listError && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{listError}</span>
            </div>
          )}

          {!isListing && !listError && files.length === 0 && (
            <div className="flex flex-col items-center justify-center text-center py-10 px-6">
              <FileText className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-xs text-slate-500 max-w-sm">
                No files are currently sitting in the local <code className="font-mono">public/upload</code> folder. Drop files there and click refresh.
              </p>
            </div>
          )}

          {!isListing && files.length > 0 && progress.length === 0 && (
            <div className="space-y-1.5">
              <div className="text-xs font-semibold text-slate-700">{files.length} file{files.length === 1 ? '' : 's'} found:</div>
              {files.map(f => (
                <div key={f.name} className="flex items-center justify-between text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="font-mono text-slate-700 truncate">{f.name}</span>
                  <span className="text-slate-400 shrink-0 ml-2">{(f.size / 1024).toFixed(1)} KB</span>
                </div>
              ))}
            </div>
          )}

          {progress.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-xs font-semibold text-slate-700">
                Processing {doneCount + errorCount} / {progress.length}
                {errorCount > 0 && <span className="text-rose-600 font-normal"> &mdash; {errorCount} failed</span>}
              </div>
              {progress.map(p => (
                <div key={p.name} className="flex items-center justify-between text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="font-mono text-slate-700 truncate flex-1">{p.name}</span>
                  {p.status === 'pending' && <span className="text-slate-400 shrink-0 ml-2">Queued</span>}
                  {p.status === 'processing' && <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600 shrink-0 ml-2" />}
                  {p.status === 'done' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 ml-2" />}
                  {p.status === 'done-kept' && (
                    <span className="text-amber-600 shrink-0 ml-2 flex items-center gap-1" title="Ingested successfully, but the source file could not be removed from the upload folder">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span className="text-[11px]">Kept</span>
                    </span>
                  )}
                  {p.status === 'error' && (
                    <span className="text-rose-600 shrink-0 ml-2 flex items-center gap-1" title={p.error}>
                      <AlertCircle className="w-3.5 h-3.5" />
                      Failed
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {summary && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 space-y-0.5">
              <div className="font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Bulk import complete
              </div>
              <div>{summary.documents} document{summary.documents === 1 ? '' : 's'} added, {summary.responseRequirements} response requirement{summary.responseRequirements === 1 ? '' : 's'}, {summary.timelineEvents} timeline event{summary.timelineEvents === 1 ? '' : 's'}.</div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 px-6 py-4 border-t border-slate-100">
          <button
            onClick={loadFileList}
            disabled={isListing || isRunning}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-60 text-slate-700 text-xs font-semibold rounded-lg"
            id="refresh-bulk-import-btn"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold"
            >
              Close
            </button>
            <button
              onClick={handleRunBulkImport}
              disabled={isRunning || isListing || files.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg"
              id="start-bulk-import-btn"
            >
              {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FolderSync className="w-3.5 h-3.5" />}
              <span>{isRunning ? 'Importing…' : `Start Bulk Import (${files.length})`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// UPLOAD_FOLDER listing entries may now be relative paths into subfolders
// (e.g. "2024/receipts/invoice.pdf") so that a bulk import can walk a
// nested folder tree, not just its top level. encodeURIComponent alone
// would also escape the "/" separators, breaking the static file route --
// this encodes each path segment individually and rejoins with "/".
function encodeUploadPath(relPath: string): string {
  return relPath.split('/').map(encodeURIComponent).join('/');
}

function guessMimeFromName(name: string): string {
  const ext = (name.split('.').pop() || '').toLowerCase();
  const map: Record<string, string> = {
    pdf: 'application/pdf',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    txt: 'text/plain',
    csv: 'text/csv',
    json: 'application/json',
    eml: 'message/rfc822',
  };
  return map[ext] || 'application/octet-stream';
}
