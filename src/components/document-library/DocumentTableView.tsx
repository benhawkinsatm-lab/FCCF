import React, { useState } from 'react';
import { 
  ChevronDown, 
  ChevronRight, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  ExternalLink, 
  Copy, 
  Check, 
  Tag, 
  FileText, 
  Calendar, 
  Building2, 
  Scale, 
  ShieldCheck, 
  Stethoscope, 
  GraduationCap, 
  MessageSquare, 
  Receipt, 
  Trophy,
  Maximize2,
  Plus,
  Trash2
} from 'lucide-react';
import { DocumentRecord, DocumentCategory } from '../../types';
import { DisplayDensity, SortField, SortDirection } from './types';

interface DocumentTableViewProps {
  documents: DocumentRecord[];
  selectedDocIds: Set<string>;
  onToggleSelectDoc: (id: string) => void;
  onViewDocument: (doc: DocumentRecord) => void;
  onTagClick?: (tag: string) => void;
  onManageDocTags?: (doc: DocumentRecord) => void;
  onDeleteDocument?: (doc: DocumentRecord) => void;
  density: DisplayDensity;
  sortField: SortField;
  sortDirection: SortDirection;
  onSortChange: (field: SortField) => void;
}

export const DocumentTableView: React.FC<DocumentTableViewProps> = ({
  documents,
  selectedDocIds,
  onToggleSelectDoc,
  onViewDocument,
  onTagClick,
  onManageDocTags,
  onDeleteDocument,
  density,
  sortField,
  sortDirection,
  onSortChange,
}) => {
  const [expandedDocIds, setExpandedDocIds] = useState<Set<string>>(new Set());
  const [copiedDocId, setCopiedDocId] = useState<string | null>(null);

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedDocIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const copyCitation = (doc: DocumentRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    const citation = `${doc.annexureNumber || doc.id}: "${doc.title}" dated ${doc.date}, source: ${doc.sourceOrigin} (${doc.evidentiaryWeight}).`;
    navigator.clipboard.writeText(citation);
    setCopiedDocId(doc.id);
    setTimeout(() => setCopiedDocId(null), 2000);
  };

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

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60 group-hover:opacity-100" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-amber-500 font-bold" />
    ) : (
      <ArrowDown className="w-3 h-3 text-amber-500 font-bold" />
    );
  };

  const isCompact = density === 'compact';
  const cellPadding = isCompact ? 'py-1.5 px-3' : 'py-3 px-3.5';

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden text-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-900 text-slate-200 border-b border-slate-800 text-[11px] font-semibold select-none">
              <th className="py-2.5 px-3 w-10 text-center">
                <span className="sr-only">Select</span>
              </th>
              <th className="py-2.5 px-2 w-8 text-center">
                <span className="sr-only">Expand</span>
              </th>
              <th 
                className="py-2.5 px-3 cursor-pointer group hover:bg-slate-800 transition-colors w-32"
                onClick={() => onSortChange('annexure')}
              >
                <div className="flex items-center gap-1.5">
                  <span>Annexure / ID</span>
                  {renderSortIcon('annexure')}
                </div>
              </th>
              <th 
                className="py-2.5 px-3 cursor-pointer group hover:bg-slate-800 transition-colors w-28"
                onClick={() => onSortChange('date')}
              >
                <div className="flex items-center gap-1.5">
                  <span>Date</span>
                  {renderSortIcon('date')}
                </div>
              </th>
              <th 
                className="py-2.5 px-3 cursor-pointer group hover:bg-slate-800 transition-colors"
                onClick={() => onSortChange('title')}
              >
                <div className="flex items-center gap-1.5">
                  <span>Title &amp; Verbatim Extract</span>
                  {renderSortIcon('title')}
                </div>
              </th>
              <th 
                className="py-2.5 px-3 cursor-pointer group hover:bg-slate-800 transition-colors w-36"
                onClick={() => onSortChange('category')}
              >
                <div className="flex items-center gap-1.5">
                  <span>Category</span>
                  {renderSortIcon('category')}
                </div>
              </th>
              <th 
                className="py-2.5 px-3 cursor-pointer group hover:bg-slate-800 transition-colors w-40 hidden md:table-cell"
                onClick={() => onSortChange('origin')}
              >
                <div className="flex items-center gap-1.5">
                  <span>Source Origin</span>
                  {renderSortIcon('origin')}
                </div>
              </th>
              <th 
                className="py-2.5 px-3 cursor-pointer group hover:bg-slate-800 transition-colors w-36 hidden lg:table-cell"
                onClick={() => onSortChange('weight')}
              >
                <div className="flex items-center gap-1.5">
                  <span>Evidentiary Weight</span>
                  {renderSortIcon('weight')}
                </div>
              </th>
              <th className="py-2.5 px-3 text-right w-24">
                <span>Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {documents.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-400 italic">
                  No documents found matching the active search or filter criteria.
                </td>
              </tr>
            ) : (
              documents.map((doc, idx) => {
                const isSelected = selectedDocIds.has(doc.id);
                const isExpanded = expandedDocIds.has(doc.id);
                const CategoryIcon = getCategoryIcon(doc.category);

                return (
                  <React.Fragment key={doc.id}>
                    <tr
                      onClick={() => onViewDocument(doc)}
                      className={`cursor-pointer transition-colors group ${
                        isSelected 
                          ? 'bg-amber-50/50 hover:bg-amber-100/60' 
                          : idx % 2 === 1 
                          ? 'bg-slate-50/60 hover:bg-slate-100/80' 
                          : 'bg-white hover:bg-slate-50'
                      }`}
                      id={`doc-row-${doc.id}`}
                    >
                      {/* Checkbox */}
                      <td 
                        className={`${cellPadding} text-center`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => onToggleSelectDoc(doc.id)}
                          className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-400 cursor-pointer"
                          aria-label={`Select ${doc.title}`}
                        />
                      </td>

                      {/* Expand Toggle Chevron */}
                      <td 
                        className={`${cellPadding} text-center`}
                        onClick={(e) => toggleExpand(doc.id, e)}
                      >
                        <button
                          type="button"
                          className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
                          title={isExpanded ? "Collapse inline preview" : "Expand inline excerpt & details"}
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5 text-indigo-600" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </td>

                      {/* Annexure / ID */}
                      <td className={`${cellPadding} font-mono`}>
                        <div className="flex flex-col">
                          {doc.annexureNumber ? (
                            <span className="font-bold text-amber-900 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded text-[11px] inline-block w-fit">
                              {doc.annexureNumber}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">Unassigned</span>
                          )}
                          <span className="text-[10px] text-slate-500 mt-0.5">{doc.id}</span>
                        </div>
                      </td>

                      {/* Date */}
                      <td className={`${cellPadding} font-mono text-slate-600 whitespace-nowrap`}>
                        {doc.date}
                      </td>

                      {/* Title & Excerpt */}
                      <td className={`${cellPadding} max-w-md`}>
                        <div className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                          {doc.title}
                        </div>
                        {!isCompact && (
                          <div className="text-[11px] text-slate-500 line-clamp-1 italic mt-0.5 font-serif">
                            "{doc.excerpt}"
                          </div>
                        )}
                        {/* Tags */}
                        {!isCompact && (
                          <div className="flex flex-wrap items-center gap-1 mt-1">
                            {doc.tags && doc.tags.length > 0 && doc.tags.slice(0, 3).map(t => (
                              <button
                                key={t}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onTagClick?.(t);
                                }}
                                className="text-[9px] font-medium px-1.5 py-0.2 rounded bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 cursor-pointer"
                                title={`Filter by #${t}`}
                              >
                                #{t}
                              </button>
                            ))}
                            {doc.tags && doc.tags.length > 3 && (
                              <span className="text-[9px] text-slate-400">+{doc.tags.length - 3}</span>
                            )}
                            {onManageDocTags && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onManageDocTags(doc);
                                }}
                                className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 hover:bg-amber-100 hover:text-amber-900 border border-dashed border-slate-300 hover:border-amber-300 transition flex items-center gap-0.5 cursor-pointer"
                                title="Add or manage custom tags on this exhibit"
                              >
                                <Plus className="w-2.5 h-2.5" />
                                <span>Tag</span>
                              </button>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Category */}
                      <td className={`${cellPadding} whitespace-nowrap`}>
                        <div className="flex items-center gap-1.5">
                          <CategoryIcon className="w-3.5 h-3.5 text-slate-500" />
                          <span className="font-medium text-slate-800">{doc.category}</span>
                        </div>
                      </td>

                      {/* Source Origin */}
                      <td className={`${cellPadding} hidden md:table-cell text-slate-600 truncate max-w-[160px]`}>
                        <span title={doc.sourceOrigin}>{doc.sourceOrigin}</span>
                      </td>

                      {/* Evidentiary Weight */}
                      <td className={`${cellPadding} hidden lg:table-cell whitespace-nowrap`}>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          doc.evidentiaryWeight === 'Sworn/Official'
                            ? 'bg-purple-100 text-purple-800 border-purple-200'
                            : doc.evidentiaryWeight === 'Third-Party Objective'
                            ? 'bg-blue-100 text-blue-800 border-blue-200'
                            : 'bg-amber-100 text-amber-800 border-amber-200'
                        }`}>
                          {doc.evidentiaryWeight}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className={`${cellPadding} text-right whitespace-nowrap`}>
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={(e) => copyCitation(doc, e)}
                            className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition"
                            title={copiedDocId === doc.id ? "Citation Copied!" : "Copy Legal Citation"}
                          >
                            {copiedDocId === doc.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => onViewDocument(doc)}
                            className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition"
                            title="Inspect Document Record"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                          {onDeleteDocument && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteDocument(doc);
                              }}
                              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                              title="Delete Document from Vault"
                              id={`delete-doc-btn-${doc.id}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Inline Expandable Drawer */}
                    {isExpanded && (
                      <tr className="bg-slate-900 text-slate-200 animate-fadeIn">
                        <td colSpan={9} className="p-4 border-y border-slate-800">
                          <div className="max-w-4xl space-y-3">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-amber-400">
                                  {doc.annexureNumber || doc.id}
                                </span>
                                <span className="text-xs font-bold text-white">
                                  {doc.title}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                                <span>Origin: <strong className="text-slate-200">{doc.sourceOrigin}</strong></span>
                                <span>|</span>
                                <span>Format: <strong className="text-slate-200">{doc.fileType}</strong></span>
                                {doc.fileSize && (
                                  <>
                                    <span>|</span>
                                    <span>Size: <strong className="text-slate-200">{doc.fileSize}</strong></span>
                                  </>
                                )}
                              </div>
                            </div>

                            <div>
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                Verbatim Extract / Primary Key Excerpt:
                              </div>
                              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-serif italic text-slate-300 text-xs leading-relaxed">
                                "{doc.excerpt}"
                              </div>
                            </div>

                            <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-slate-400 text-[10px] font-bold uppercase">Associated Tags:</span>
                                {doc.tags && doc.tags.length > 0 ? (
                                  doc.tags.map(t => (
                                    <button
                                      key={t}
                                      type="button"
                                      onClick={() => onTagClick?.(t)}
                                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 text-[10px] border border-slate-700 transition cursor-pointer"
                                      title={`Filter by tag #${t}`}
                                    >
                                      #{t}
                                    </button>
                                  ))
                                ) : (
                                  <span className="text-[10px] text-slate-500 italic">No tags assigned</span>
                                )}
                              </div>
                              {onManageDocTags && (
                                <button
                                  type="button"
                                  onClick={() => onManageDocTags(doc)}
                                  className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer shadow-2xs"
                                  id={`manage-tags-drawer-btn-${doc.id}`}
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>Manage Custom Tags</span>
                                </button>
                              )}
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                              <span className="text-slate-400 text-[11px]">
                                Evidentiary Weight: <strong className="text-white">{doc.evidentiaryWeight}</strong>
                              </span>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={(e) => copyCitation(doc, e)}
                                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs flex items-center gap-1.5 transition"
                                >
                                  <Copy className="w-3 h-3" />
                                  <span>{copiedDocId === doc.id ? "Citation Copied" : "Copy Legal Citation"}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onViewDocument(doc)}
                                  className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-xs flex items-center gap-1.5 transition"
                                >
                                  <Maximize2 className="w-3 h-3" />
                                  <span>Open Full Record Viewer</span>
                                </button>
                                {onDeleteDocument && (
                                  <button
                                    type="button"
                                    onClick={() => onDeleteDocument(doc)}
                                    className="px-2.5 py-1 bg-rose-900/60 hover:bg-rose-900 border border-rose-700 text-rose-200 rounded text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                                    id={`drawer-delete-doc-btn-${doc.id}`}
                                  >
                                    <Trash2 className="w-3 h-3 text-rose-400" />
                                    <span>Delete Document</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
