import React, { useState, useMemo } from 'react';
import { 
  ChevronDown, 
  ChevronRight, 
  CheckSquare, 
  Square, 
  ExternalLink, 
  Copy, 
  Check, 
  FileText,
  Stethoscope,
  GraduationCap,
  Scale,
  MessageSquare,
  Receipt,
  Trophy,
  Calendar,
  Plus,
  Tag,
  Trash2
} from 'lucide-react';
import { DocumentRecord } from '../../types';
import { GroupByField } from './types';

interface DocumentGroupedViewProps {
  documents: DocumentRecord[];
  selectedDocIds: Set<string>;
  onToggleSelectDoc: (id: string) => void;
  onViewDocument: (doc: DocumentRecord) => void;
  onTagClick?: (tag: string) => void;
  onManageDocTags?: (doc: DocumentRecord) => void;
  onDeleteDocument?: (doc: DocumentRecord) => void;
  onSelectMultipleDocs?: (ids: string[], select: boolean) => void;
}

export const DocumentGroupedView: React.FC<DocumentGroupedViewProps> = ({
  documents,
  selectedDocIds,
  onToggleSelectDoc,
  onViewDocument,
  onTagClick,
  onManageDocTags,
  onDeleteDocument,
  onSelectMultipleDocs,
}) => {
  const [groupBy, setGroupBy] = useState<GroupByField>('category');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [copiedDocId, setCopiedDocId] = useState<string | null>(null);

  // Group the documents
  const groupedData = useMemo(() => {
    const map = new Map<string, DocumentRecord[]>();

    if (groupBy === 'tag') {
      documents.forEach(doc => {
        if (!doc.tags || doc.tags.length === 0) {
          const key = 'Untagged Exhibits';
          if (!map.has(key)) map.set(key, []);
          map.get(key)!.push(doc);
        } else {
          doc.tags.forEach(t => {
            const key = `#${t}`;
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(doc);
          });
        }
      });
      return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
    }

    documents.forEach(doc => {
      let key = 'Other';
      if (groupBy === 'category') {
        key = doc.category;
      } else if (groupBy === 'year') {
        key = doc.date ? doc.date.slice(0, 4) : 'Unknown Year';
      } else if (groupBy === 'weight') {
        key = doc.evidentiaryWeight;
      } else if (groupBy === 'origin') {
        key = doc.sourceOrigin;
      }

      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(doc);
    });

    return Array.from(map.entries()).sort((a, b) => {
      // If year, sort descending
      if (groupBy === 'year') {
        return b[0].localeCompare(a[0]);
      }
      return b[1].length - a[1].length || a[0].localeCompare(b[0]);
    });
  }, [documents, groupBy]);

  const toggleGroup = (key: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const expandAll = () => setCollapsedGroups(new Set());
  const collapseAll = () => {
    const allKeys = groupedData.map(([k]) => k);
    setCollapsedGroups(new Set(allKeys));
  };

  const getGroupIcon = (key: string) => {
    if (groupBy === 'tag') return Tag;
    switch (key) {
      case 'Medical': return Stethoscope;
      case 'Education': return GraduationCap;
      case 'Legal/Court': return Scale;
      case 'Direct Communication': return MessageSquare;
      case 'Financial': return Receipt;
      case 'Extracurricular': return Trophy;
      default: return groupBy === 'year' ? Calendar : FileText;
    }
  };

  const copyCitation = (doc: DocumentRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    const citation = `${doc.annexureNumber || doc.id}: "${doc.title}" (${doc.date}), source: ${doc.sourceOrigin}.`;
    navigator.clipboard.writeText(citation);
    setCopiedDocId(doc.id);
    setTimeout(() => setCopiedDocId(null), 2000);
  };

  const handleGroupSelectToggle = (docsInGroup: DocumentRecord[]) => {
    if (!onSelectMultipleDocs) return;
    const allSelected = docsInGroup.every(d => selectedDocIds.has(d.id));
    onSelectMultipleDocs(docsInGroup.map(d => d.id), !allSelected);
  };

  return (
    <div className="space-y-4 text-xs">
      {/* Group Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-semibold">Group documents by:</span>
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            {(['category', 'year', 'weight', 'origin', 'tag'] as GroupByField[]).map((field) => (
              <button
                key={field}
                type="button"
                onClick={() => {
                  setGroupBy(field);
                  setCollapsedGroups(new Set());
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold capitalize transition cursor-pointer ${
                  groupBy === field
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {field}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={expandAll}
            className="text-slate-600 hover:text-slate-900 font-medium hover:underline"
          >
            Expand All
          </button>
          <span className="text-slate-300">|</span>
          <button
            type="button"
            onClick={collapseAll}
            className="text-slate-600 hover:text-slate-900 font-medium hover:underline"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Accordion Groups */}
      <div className="space-y-3">
        {groupedData.map(([groupKey, groupDocs]) => {
          const isCollapsed = collapsedGroups.has(groupKey);
          const Icon = getGroupIcon(groupKey);
          const allGroupSelected = groupDocs.length > 0 && groupDocs.every(d => selectedDocIds.has(d.id));
          const someGroupSelected = groupDocs.some(d => selectedDocIds.has(d.id)) && !allGroupSelected;

          return (
            <div
              key={groupKey}
              className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden transition"
            >
              {/* Group Header */}
              <div
                onClick={() => toggleGroup(groupKey)}
                className="p-3.5 bg-slate-50 hover:bg-slate-100/80 cursor-pointer flex items-center justify-between border-b border-slate-200 select-none"
              >
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    className="p-1 rounded text-slate-400 hover:text-slate-700 transition"
                  >
                    {isCollapsed ? (
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-indigo-600" />
                    )}
                  </button>

                  <div className="p-1.5 rounded-lg bg-white border border-slate-200 text-indigo-700 shadow-2xs">
                    <Icon className="w-4 h-4" />
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 text-xs sm:text-sm font-serif flex items-center gap-2">
                      <span>{groupKey}</span>
                      <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                        {groupDocs.length} {groupDocs.length === 1 ? 'record' : 'records'}
                      </span>
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {onSelectMultipleDocs && (
                    <button
                      type="button"
                      onClick={() => handleGroupSelectToggle(groupDocs)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition flex items-center gap-1.5 ${
                        allGroupSelected
                          ? 'bg-amber-100 border-amber-300 text-amber-900 font-bold'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {allGroupSelected ? (
                        <CheckSquare className="w-3.5 h-3.5 text-amber-600" />
                      ) : someGroupSelected ? (
                        <CheckSquare className="w-3.5 h-3.5 text-slate-400 opacity-60" />
                      ) : (
                        <Square className="w-3.5 h-3.5 text-slate-400" />
                      )}
                      <span>Select Group</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Group Items */}
              {!isCollapsed && (
                <div className="divide-y divide-slate-100 p-2">
                  {groupDocs.map(doc => {
                    const isSelected = selectedDocIds.has(doc.id);
                    return (
                      <div
                        key={doc.id}
                        onClick={() => onViewDocument(doc)}
                        className={`p-3 rounded-lg flex items-center justify-between gap-3 cursor-pointer transition ${
                          isSelected
                            ? 'bg-amber-50/60 hover:bg-amber-100/60 border-l-2 border-amber-500'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div 
                            onClick={(e) => e.stopPropagation()} 
                            className="pt-0.5"
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => onToggleSelectDoc(doc.id)}
                              className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-400 cursor-pointer"
                            />
                          </div>

                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              {doc.annexureNumber && (
                                <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 bg-amber-100 text-amber-900 border border-amber-300 rounded">
                                  {doc.annexureNumber}
                                </span>
                              )}
                              <span className="font-mono text-[10px] text-slate-400">{doc.id}</span>
                              <span className="font-mono text-[10px] text-slate-500">{doc.date}</span>
                              <span className={`text-[9px] font-semibold px-1.5 py-0.2 rounded-full border ${
                                doc.evidentiaryWeight === 'Sworn/Official'
                                  ? 'bg-purple-100 text-purple-800 border-purple-200'
                                  : doc.evidentiaryWeight === 'Third-Party Objective'
                                  ? 'bg-blue-100 text-blue-800 border-blue-200'
                                  : 'bg-amber-100 text-amber-800 border-amber-200'
                              }`}>
                                {doc.evidentiaryWeight}
                              </span>
                            </div>

                            <h4 className="text-xs font-semibold text-slate-900 truncate">
                              {doc.title}
                            </h4>

                            <p className="text-[11px] text-slate-500 truncate max-w-xl italic font-serif">
                              "{doc.excerpt}"
                            </p>

                            {/* Tags */}
                            <div className="flex flex-wrap items-center gap-1 pt-1">
                              {doc.tags && doc.tags.slice(0, 4).map((tag) => (
                                <button
                                  key={tag}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onTagClick?.(tag);
                                  }}
                                  className="text-[9px] font-medium px-1.5 py-0.2 rounded border bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer"
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
                                  className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 hover:bg-amber-100 hover:text-amber-900 border border-dashed border-slate-300 hover:border-amber-300 transition flex items-center gap-0.5 cursor-pointer"
                                  title="Add or manage custom tags"
                                >
                                  <Plus className="w-2.5 h-2.5" />
                                  <span>Tag</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={(e) => copyCitation(doc, e)}
                            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition"
                            title="Copy legal citation"
                          >
                            {copiedDocId === doc.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => onViewDocument(doc)}
                            className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded transition"
                            title="Open record"
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
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                              title="Delete document from vault"
                              id={`grouped-delete-doc-btn-${doc.id}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
