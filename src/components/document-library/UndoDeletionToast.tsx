import React, { useEffect, useState } from 'react';
import { RotateCcw, X, ShieldAlert, CheckCircle2, AlertTriangle, Layers } from 'lucide-react';
import { DeletionUndoSnapshot } from '../../utils/documentDependencyService';

interface UndoDeletionToastProps {
  snapshot: DeletionUndoSnapshot;
  onUndo: (snapshot: DeletionUndoSnapshot) => void;
  onDismiss: () => void;
}

export const UndoDeletionToast: React.FC<UndoDeletionToastProps> = ({
  snapshot,
  onUndo,
  onDismiss,
}) => {
  const [timeLeftMs, setTimeLeftMs] = useState<number>(() => 
    Math.max(0, snapshot.deletedAt + snapshot.gracePeriodMs - Date.now())
  );
  const [isUndoing, setIsUndoing] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = Math.max(0, snapshot.deletedAt + snapshot.gracePeriodMs - Date.now());
      setTimeLeftMs(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        onDismiss();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [snapshot, onDismiss]);

  const progressPercent = Math.max(0, Math.min(100, (timeLeftMs / snapshot.gracePeriodMs) * 100));
  const remainingSeconds = Math.ceil(timeLeftMs / 1000);

  const docCount = snapshot.deletedDocIds.length;
  const docTitles = snapshot.deletedDocTitles.slice(0, 2).join(', ');
  const extraDocs = snapshot.deletedDocTitles.length > 2 
    ? ` +${snapshot.deletedDocTitles.length - 2} more` 
    : '';
  const cascadeCount = snapshot.summary.totalCascadeCount;

  const handleUndoClick = () => {
    setIsUndoing(true);
    onUndo(snapshot);
  };

  return (
    <div 
      className="fixed bottom-6 right-6 z-50 w-full max-w-md bg-slate-950 text-white rounded-2xl shadow-2xl border border-rose-500/30 overflow-hidden animate-in slide-in-from-bottom-5 duration-200"
      id="undo-deletion-toast"
      role="status"
      aria-live="polite"
    >
      {/* Top Banner Content */}
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl shrink-0 mt-0.5">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Vault Deletion Notice
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                  {remainingSeconds}s grace period
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-100 mt-1 line-clamp-1">
                {docCount === 1 
                  ? `Purged: "${docTitles}"` 
                  : `Purged ${docCount} documents (${docTitles}${extraDocs})`}
              </p>
              {cascadeCount > 0 ? (
                <p className="text-[11px] text-rose-300/90 mt-0.5 flex items-center gap-1">
                  <Layers className="w-3 h-3 text-rose-400 shrink-0" />
                  <span>{cascadeCount} linked item{cascadeCount > 1 ? 's' : ''} removed (timeline, notes, claims)</span>
                </p>
              ) : (
                <p className="text-[11px] text-slate-400 mt-0.5">
                  No linked ledger items were affected.
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onDismiss}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
            title="Dismiss and keep deleted"
            id="dismiss-undo-toast-btn"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <button
            type="button"
            onClick={onDismiss}
            className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-800 text-slate-300 text-xs font-medium rounded-lg transition cursor-pointer"
            id="keep-deleted-btn"
          >
            Keep Purged
          </button>

          <button
            type="button"
            onClick={handleUndoClick}
            disabled={isUndoing}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-98 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-amber-950/40 transition cursor-pointer disabled:opacity-50"
            id="undo-deletion-btn"
          >
            <RotateCcw className={`w-3.5 h-3.5 text-slate-950 ${isUndoing ? 'animate-spin' : ''}`} />
            <span>{isUndoing ? 'Restoring Records...' : `Undo Deletion (${remainingSeconds}s)`}</span>
          </button>
        </div>
      </div>

      {/* Expiration Progress Bar */}
      <div className="h-1.5 w-full bg-slate-900 overflow-hidden">
        <div 
          className="h-full bg-amber-400 transition-all ease-linear"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
};
