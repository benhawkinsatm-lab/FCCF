import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  ExternalLink, 
  Copy, 
  Check, 
  Tag, 
  ShieldCheck, 
  Scale, 
  Calendar, 
  Building2, 
  Maximize2,
  Stethoscope,
  GraduationCap,
  MessageSquare,
  Receipt,
  Trophy,
  Search,
  CheckCircle2,
  Layers,
  ChevronRight,
  ScanLine,
  Plus,
  X,
  Trash2
} from 'lucide-react';
import { DocumentRecord, DocumentCategory } from '../../types';

interface DocumentSplitViewProps {
  documents: DocumentRecord[];
  selectedDocIds: Set<string>;
  onToggleSelectDoc: (id: string) => void;
  onViewDocument: (doc: DocumentRecord) => void;
  onTagClick?: (tag: string) => void;
  onManageDocTags?: (doc: DocumentRecord) => void;
  onAddTagToDoc?: (docId: string, tag: string) => void;
  onRemoveTagFromDoc?: (docId: string, tag: string) => void;
  onDeleteDocument?: (doc: DocumentRecord) => void;
}

export const DocumentSplitView: React.FC<DocumentSplitViewProps> = ({
  documents,
  selectedDocIds,
  onToggleSelectDoc,
  onViewDocument,
  onTagClick,
  onManageDocTags,
  onAddTagToDoc,
  onRemoveTagFromDoc,
  onDeleteDocument,
}) => {
  const [activeDocId, setActiveDocId] = useState<string>(documents[0]?.id || '');
  const [listSearch, setListSearch] = useState('');
  const [copiedCitation, setCopiedCitation] = useState(false);
  const [copiedExcerpt, setCopiedExcerpt] = useState(false);
  const [isAddingInlineTag, setIsAddingInlineTag] = useState(false);
  const [inlineTagInput, setInlineTagInput] = useState('');

  // If documents changes or activeDocId not in list, fallback to first
  useEffect(() => {
    if (documents.length > 0 && (!activeDocId || !documents.some(d => d.id === activeDocId))) {
      setActiveDocId(documents[0].id);
    }
  }, [documents, activeDocId]);

  const activeDoc = documents.find(d => d.id === activeDocId) || documents[0];

  const filteredList = documents.filter(d => {
    if (!listSearch.trim()) return true;
    const q = listSearch.toLowerCase();
    return (
      d.title.toLowerCase().includes(q) ||
      d.id.toLowerCase().includes(q) ||
      (d.annexureNumber && d.annexureNumber.toLowerCase().includes(q)) ||
      d.sourceOrigin.toLowerCase().includes(q)
    );
  });

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

  const handleCopyCitation = () => {
    if (!activeDoc) return;
    const citation = `${activeDoc.annexureNumber || activeDoc.id}: "${activeDoc.title}" (${activeDoc.date}), source: ${activeDoc.sourceOrigin}.`;
    navigator.clipboard.writeText(citation);
    setCopiedCitation(true);
    setTimeout(() => setCopiedCitation(false), 2000);
  };

  const handleCopyExcerpt = () => {
    if (!activeDoc) return;
    navigator.clipboard.writeText(activeDoc.excerpt);
    setCopiedExcerpt(true);
    setTimeout(() => setCopiedExcerpt(false), 2000);
  };

  if (documents.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 italic text-xs">
        No documents available to display.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[780px] bg-slate-100 p-2 rounded-2xl border border-slate-200 shadow-xs">
      {/* Left Master List (5 cols) */}
      <div className="lg:col-span-5 flex flex-col bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden h-full">
        {/* List Header & Quick Filter */}
        <div className="p-3 border-b border-slate-200 bg-slate-50 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5 font-serif">
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              <span>Document Index ({filteredList.length})</span>
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              Click record to inspect
            </span>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={listSearch}
              onChange={(e) => setListSearch(e.target.value)}
              placeholder="Quick search active list..."
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* Scrollable Document List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {filteredList.map((doc) => {
            const isActive = doc.id === activeDocId;
            const isSelected = selectedDocIds.has(doc.id);
            const CategoryIcon = getCategoryIcon(doc.category);

            return (
              <div
                key={doc.id}
                onClick={() => setActiveDocId(doc.id)}
                className={`p-3 transition-colors cursor-pointer flex items-start gap-2.5 ${
                  isActive 
                    ? 'bg-amber-50/70 border-l-4 border-amber-500 text-slate-900 shadow-xs' 
                    : 'hover:bg-slate-50 text-slate-700'
                }`}
              >
                {/* Select Checkbox */}
                <div 
                  onClick={(e) => e.stopPropagation()} 
                  className="pt-0.5"
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelectDoc(doc.id)}
                    className="w-3.5 h-3.5 rounded border-slate-300 text-amber-500 focus:ring-amber-400 cursor-pointer"
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 truncate">
                      {doc.annexureNumber ? (
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-900 rounded border border-amber-200">
                          {doc.annexureNumber}
                        </span>
                      ) : (
                        <span className="font-mono text-[10px] text-slate-400">
                          {doc.id}
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400 font-mono">
                        {doc.date}
                      </span>
                    </div>

                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                      {doc.category}
                    </span>
                  </div>

                  <h4 className={`text-xs font-semibold truncate ${isActive ? 'text-slate-950 font-bold' : 'text-slate-800'}`}>
                    {doc.title}
                  </h4>

                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span className="truncate max-w-[140px]">{doc.sourceOrigin}</span>
                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-medium ${
                      doc.evidentiaryWeight === 'Sworn/Official' 
                        ? 'text-purple-700 bg-purple-50' 
                        : doc.evidentiaryWeight === 'Third-Party Objective'
                        ? 'text-blue-700 bg-blue-50'
                        : 'text-amber-700 bg-amber-50'
                    }`}>
                      {doc.evidentiaryWeight}
                    </span>
                  </div>
                </div>

                <ChevronRight className={`w-3.5 h-3.5 mt-2 transition-transform ${isActive ? 'text-amber-600 translate-x-0.5' : 'text-slate-300'}`} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Detail Inspector (7 cols) */}
      <div className="lg:col-span-7 flex flex-col bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden h-full">
        {activeDoc ? (
          <>
            {/* Inspector Top Bar */}
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {activeDoc.annexureNumber && (
                    <span className="font-mono text-xs font-bold px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded shadow-2xs">
                      {activeDoc.annexureNumber}
                    </span>
                  )}
                  <span className="font-mono text-xs font-semibold text-slate-500">
                    {activeDoc.id}
                  </span>
                  <span className="text-slate-300">|</span>
                  <span className="text-xs text-slate-600 font-medium">
                    {activeDoc.date}
                  </span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                    activeDoc.evidentiaryWeight === 'Sworn/Official'
                      ? 'bg-purple-100 text-purple-800 border-purple-200'
                      : activeDoc.evidentiaryWeight === 'Third-Party Objective'
                      ? 'bg-blue-100 text-blue-800 border-blue-200'
                      : 'bg-amber-100 text-amber-800 border-amber-200'
                  }`}>
                    {activeDoc.evidentiaryWeight}
                  </span>
                </div>

                <h2 className="text-sm font-bold text-slate-900 font-serif leading-tight">
                  {activeDoc.title}
                </h2>
                <div className="text-xs text-slate-500">
                  Origin: <strong className="text-slate-700">{activeDoc.sourceOrigin}</strong>
                </div>
              </div>

              {/* Inspector Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleCopyCitation}
                  className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-2xs transition"
                  title="Copy Court Citation Particular"
                >
                  {copiedCitation ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCitation ? 'Copied' : 'Cite'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onViewDocument(activeDoc)}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                  id="split-view-open-modal-btn"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Full Record</span>
                </button>

                {onDeleteDocument && (
                  <button
                    type="button"
                    onClick={() => onDeleteDocument(activeDoc)}
                    className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                    title="Delete document from vault"
                    id="split-view-delete-doc-btn"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>Delete</span>
                  </button>
                )}
              </div>
            </div>

            {/* Scrollable Inspector Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              {/* Primary Key Excerpt Box */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <span>Verbatim Court Excerpt / Key Citation</span>
                  <button
                    onClick={handleCopyExcerpt}
                    className="text-indigo-600 hover:underline flex items-center gap-1 capitalize normal-case text-xs"
                  >
                    {copiedExcerpt ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedExcerpt ? 'Copied Excerpt' : 'Copy Excerpt'}</span>
                  </button>
                </div>

                <div className="p-3 bg-amber-50/50 border border-amber-200/80 rounded-xl font-serif text-slate-800 italic leading-relaxed text-xs">
                  "{activeDoc.excerpt}"
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                    Legal Schema &amp; Custom Tags ({activeDoc.tags?.length || 0}):
                  </span>
                  {onManageDocTags && (
                    <button
                      type="button"
                      onClick={() => onManageDocTags(activeDoc)}
                      className="text-[10px] font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1 hover:underline cursor-pointer"
                      id="split-view-manage-tags-btn"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Manage All Tags</span>
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {activeDoc.tags && activeDoc.tags.map(t => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-950 text-[11px] font-semibold border border-amber-200 shadow-2xs group"
                    >
                      <button
                        type="button"
                        onClick={() => onTagClick?.(t)}
                        className="hover:text-indigo-600 transition cursor-pointer"
                        title={`Filter library by tag #${t}`}
                      >
                        #{t}
                      </button>
                      {onRemoveTagFromDoc && (
                        <button
                          type="button"
                          onClick={() => onRemoveTagFromDoc(activeDoc.id, t)}
                          className="p-0.5 rounded text-amber-600 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          title={`Remove tag #${t} from document`}
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </span>
                  ))}

                  {/* Inline quick add tag */}
                  {isAddingInlineTag ? (
                    <div className="inline-flex items-center gap-1 bg-white border border-amber-400 rounded-lg p-0.5 shadow-2xs">
                      <span className="text-slate-400 font-mono text-[10px] pl-1">#</span>
                      <input
                        type="text"
                        autoFocus
                        value={inlineTagInput}
                        onChange={(e) => setInlineTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (inlineTagInput.trim() && onAddTagToDoc) {
                              onAddTagToDoc(activeDoc.id, inlineTagInput.trim());
                              setInlineTagInput('');
                              setIsAddingInlineTag(false);
                            }
                          } else if (e.key === 'Escape') {
                            setIsAddingInlineTag(false);
                            setInlineTagInput('');
                          }
                        }}
                        placeholder="Tag name..."
                        className="w-24 text-[11px] py-0.5 px-1 bg-transparent focus:outline-none text-slate-900"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (inlineTagInput.trim() && onAddTagToDoc) {
                            onAddTagToDoc(activeDoc.id, inlineTagInput.trim());
                            setInlineTagInput('');
                            setIsAddingInlineTag(false);
                          }
                        }}
                        className="px-1.5 py-0.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded text-[10px] font-bold cursor-pointer"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingInlineTag(false);
                          setInlineTagInput('');
                        }}
                        className="p-0.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    onAddTagToDoc && (
                      <button
                        type="button"
                        onClick={() => setIsAddingInlineTag(true)}
                        className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-amber-100 text-slate-600 hover:text-amber-900 text-[11px] font-medium border border-dashed border-slate-300 hover:border-amber-300 transition flex items-center gap-1 cursor-pointer"
                        title="Add a custom metadata tag to this document"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Tag</span>
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Full Text / Document Reader */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <div className="flex items-center gap-1.5">
                    <span>Transcript / Document OCR Content</span>
                    {activeDoc.metadata?.ocrEngine && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-300 font-mono text-[9px] font-bold normal-case">
                        <ScanLine className="w-2.5 h-2.5" />
                        <span>{activeDoc.metadata.ocrEngine} ({activeDoc.metadata.ocrConfidence}% conf)</span>
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-slate-400 text-[10px]">
                    {activeDoc.fullText?.length || 0} characters
                  </span>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[11px] text-slate-800 leading-relaxed max-h-72 overflow-y-auto whitespace-pre-wrap select-text">
                  {activeDoc.fullText || activeDoc.excerpt}
                </div>
              </div>

              {/* Document Metadata Grid */}
              <div className="pt-2 border-t border-slate-100">
                <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px] block mb-2">
                  Technical &amp; Evidentiary Provenance:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-slate-700">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Category</span>
                    <strong className="text-xs">{activeDoc.category}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Format</span>
                    <strong className="text-xs uppercase">{activeDoc.fileType}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">File Size</span>
                    <strong className="text-xs">{activeDoc.fileSize || 'Verified OCR'}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Status</span>
                    <strong className="text-xs text-emerald-700">Indexed for Form 2</strong>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400 italic text-xs">
            Select a document from the left to inspect its contents.
          </div>
        )}
      </div>
    </div>
  );
};
