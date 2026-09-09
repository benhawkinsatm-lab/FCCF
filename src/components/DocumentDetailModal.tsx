import React from 'react';
import { X, ShieldCheck, Scale, Copy, Check, Tag, Trash2 } from 'lucide-react';
import { DocumentRecord } from '../types';

interface DocumentDetailModalProps {
  document: DocumentRecord | null;
  onClose: () => void;
  onDelete?: (doc: DocumentRecord) => void;
}

export const DocumentDetailModal: React.FC<DocumentDetailModalProps> = ({ document, onClose, onDelete }) => {
  const [copied, setCopied] = React.useState(false);

  if (!document) return null;

  const handleCopyCitation = () => {
    const citation = `[${document.id}] ${document.title} (${document.sourceOrigin}, ${document.date})`;
    navigator.clipboard.writeText(citation);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getWeightBadge = (weight: string) => {
    switch (weight) {
      case 'Sworn/Official':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'Third-Party Objective':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-amber-100 text-amber-800 border-amber-300';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div 
        className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        id="document-detail-modal"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-bold px-2 py-0.5 bg-slate-200 text-slate-800 rounded">
                {document.id}
              </span>
              {document.annexureNumber && (
                <span className="font-mono text-xs font-bold px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 rounded">
                  {document.annexureNumber}
                </span>
              )}
              <span className={`text-xs font-semibold px-2 py-0.5 border rounded-full ${getWeightBadge(document.evidentiaryWeight)}`}>
                {document.evidentiaryWeight}
              </span>
              <span className="text-xs font-medium px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded">
                {document.category}
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-1">{document.title}</h2>
            {document.tags && document.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {document.tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200"
                  >
                    <Tag className="w-3 h-3 text-amber-600" />
                    <span>#{tag}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
            id="close-doc-modal-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Metadata Strip */}
        <div className="px-5 py-3 bg-white border-b border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-600">
          <div>
            <span className="block text-slate-400 font-medium">Document Date</span>
            <span className="font-semibold text-slate-800">{document.date}</span>
          </div>
          <div>
            <span className="block text-slate-400 font-medium">Source / Origin</span>
            <span className="font-semibold text-slate-800 truncate block" title={document.sourceOrigin}>
              {document.sourceOrigin}
            </span>
          </div>
          <div>
            <span className="block text-slate-400 font-medium">File Format</span>
            <span className="font-semibold text-slate-800 uppercase">{document.fileType} ({document.fileSize || 'Verified'})</span>
          </div>
          <div>
            <span className="block text-slate-400 font-medium">Admissibility Status</span>
            <span className="font-semibold text-emerald-700 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Admissible
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-sm flex-1 bg-slate-50/50">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Executive Excerpt</h3>
            <div className="p-3 bg-white border border-slate-200 rounded-lg text-slate-700 italic font-serif">
              "{document.excerpt}"
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Primary Source Transcript</h3>
              <button
                onClick={handleCopyCitation}
                className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 font-medium"
                id="copy-citation-btn"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Citation Copied' : 'Copy Citation'}
              </button>
            </div>
            <pre className="p-4 bg-slate-900 text-slate-100 rounded-lg text-xs font-mono whitespace-pre-wrap leading-relaxed overflow-x-auto max-h-72 border border-slate-800">
              {document.fullText}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <Scale className="w-3.5 h-3.5 text-slate-400" />
            <span>Case 4344/2023 • Family Court of WA • Verified Primary Record</span>
          </div>
          <div className="flex items-center gap-2">
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(document)}
                className="px-3 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                id="modal-delete-doc-btn"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Delete Document</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              id="done-doc-modal-btn"
            >
              Close Viewer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
