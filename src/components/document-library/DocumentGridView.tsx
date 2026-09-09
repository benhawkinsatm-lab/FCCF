import React, { useState } from 'react';
import { 
  ExternalLink, 
  Copy, 
  Check, 
  Tag, 
  FileText, 
  Stethoscope, 
  GraduationCap, 
  Scale, 
  MessageSquare, 
  Receipt, 
  Trophy,
  Plus,
  Trash2
} from 'lucide-react';
import { DocumentRecord, DocumentCategory } from '../../types';
import { DisplayDensity } from './types';

interface DocumentGridViewProps {
  documents: DocumentRecord[];
  selectedDocIds: Set<string>;
  onToggleSelectDoc: (id: string) => void;
  onViewDocument: (doc: DocumentRecord) => void;
  onTagClick?: (tag: string) => void;
  onManageDocTags?: (doc: DocumentRecord) => void;
  onDeleteDocument?: (doc: DocumentRecord) => void;
  density: DisplayDensity;
}

export const DocumentGridView: React.FC<DocumentGridViewProps> = ({
  documents,
  selectedDocIds,
  onToggleSelectDoc,
  onViewDocument,
  onTagClick,
  onManageDocTags,
  onDeleteDocument,
  density,
}) => {
  const [copiedDocId, setCopiedDocId] = useState<string | null>(null);

  const getCategoryIcon = (category: DocumentCategory) => {
    switch (category) {
      case 'Medical': return Stethoscope;
      case 'Education': return GraduationCap;
      case 'Legal/Court': return Scale;
      case 'Direct Communication': return MessageSquare;
      case 'Financial': return Receipt;
      case 'Extracurricular': return Trophy;
      default: return FileText;
    }
  };

  const copyCitation = (doc: DocumentRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    const citation = `${doc.annexureNumber || doc.id}: "${doc.title}" (${doc.date}), source: ${doc.sourceOrigin}.`;
    navigator.clipboard.writeText(citation);
    setCopiedDocId(doc.id);
    setTimeout(() => setCopiedDocId(null), 2000);
  };

  const isCompact = density === 'compact';

  if (documents.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 italic text-xs">
        No documents found matching current filter.
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 ${isCompact ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-3.5`}>
      {documents.map((doc) => {
        const isSelected = selectedDocIds.has(doc.id);
        const CategoryIcon = getCategoryIcon(doc.category);

        return (
          <div
            key={doc.id}
            className={`rounded-xl border p-3.5 shadow-2xs flex flex-col justify-between transition-all cursor-pointer group relative ${
              isSelected
                ? 'bg-amber-50/40 border-amber-400 ring-2 ring-amber-300 shadow-md'
                : 'bg-white border-slate-200 hover:shadow-md hover:border-slate-300'
            }`}
            onClick={() => onViewDocument(doc)}
            id={`doc-card-${doc.id}`}
          >
            <div className="space-y-2">
              {/* Header row */}
              <div className="flex items-center justify-between flex-wrap gap-1">
                <div className="flex items-center gap-1.5">
                  <div 
                    onClick={(e) => e.stopPropagation()} 
                    className="flex items-center"
                  >
                    <input
                      type="checkbox"
                      id={`checkbox-doc-${doc.id}`}
                      checked={isSelected}
                      onChange={() => onToggleSelectDoc(doc.id)}
                      className="w-3.5 h-3.5 rounded border-slate-300 text-amber-500 focus:ring-amber-400 cursor-pointer"
                    />
                  </div>

                  <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 text-slate-800 rounded">
                    {doc.id}
                  </span>
                  {doc.annexureNumber && (
                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded">
                      {doc.annexureNumber}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-[9px] font-medium px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200 flex items-center gap-1">
                    <CategoryIcon className="w-2.5 h-2.5 text-slate-500" />
                    <span>{doc.category}</span>
                  </span>
                </div>
              </div>

              {/* Title */}
              <h3 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2 leading-snug">
                {doc.title}
              </h3>

              {/* Excerpt (hidden or condensed in compact mode) */}
              {!isCompact && (
                <p className="text-[11px] text-slate-600 italic line-clamp-3 bg-slate-50 p-2 rounded-lg border border-slate-100 font-serif">
                  "{doc.excerpt}"
                </p>
              )}

              {/* Tags */}
              {!isCompact && (
                <div className="flex flex-wrap items-center gap-1 pt-0.5">
                  {doc.tags && doc.tags.slice(0, 4).map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onTagClick?.(tag);
                      }}
                      className="text-[9px] font-medium px-1.5 py-0.5 rounded border bg-amber-50/80 text-amber-900 border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer"
                      title={`Filter by tag #${tag}`}
                    >
                      #{tag}
                    </button>
                  ))}
                  {doc.tags && doc.tags.length > 4 && (
                    <span className="text-[9px] text-slate-400">+{doc.tags.length - 4}</span>
                  )}
                  {onManageDocTags && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onManageDocTags(doc);
                      }}
                      className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 hover:bg-amber-100 hover:text-amber-900 border border-dashed border-slate-300 hover:border-amber-300 transition flex items-center gap-0.5 cursor-pointer"
                      title="Add or manage custom tags"
                    >
                      <Plus className="w-2.5 h-2.5" />
                      <span>Tag</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-2 border-t border-slate-100 space-y-1 text-[10px]">
              <div className="flex items-center justify-between text-slate-500">
                <span className="truncate max-w-[140px]" title={doc.sourceOrigin}>
                  {doc.sourceOrigin}
                </span>
                <span className="font-mono text-slate-600">{doc.date}</span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-semibold border ${
                  doc.evidentiaryWeight === 'Sworn/Official'
                    ? 'bg-purple-100 text-purple-800 border-purple-200'
                    : doc.evidentiaryWeight === 'Third-Party Objective'
                    ? 'bg-blue-100 text-blue-800 border-blue-200'
                    : 'bg-amber-100 text-amber-800 border-amber-200'
                }`}>
                  {doc.evidentiaryWeight}
                </span>

                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={(e) => copyCitation(doc, e)}
                    className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                    title="Copy citation"
                  >
                    {copiedDocId === doc.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => onViewDocument(doc)}
                    className="text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 font-semibold text-[10px]"
                  >
                    <span>View</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </button>
                  {onDeleteDocument && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteDocument(doc);
                      }}
                      className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                      title="Delete document from vault"
                      id={`grid-delete-doc-btn-${doc.id}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
