import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  ShieldCheck, 
  UploadCloud, 
  Layers, 
  Check, 
  X, 
  ChevronDown, 
  Tag, 
  Clock, 
  FolderArchive, 
  Trash2
} from 'lucide-react';
import { DocumentRecord, DocumentCategory } from '../types';
import { METADATA_CATEGORIES } from './DocumentIngestionModal';
import { EvidenceBinderSubsetModal } from './EvidenceBinderSubsetModal';
import { 
  DocumentViewMode, 
  DisplayDensity, 
  SortField, 
  SortDirection, 
  DocumentFilterState 
} from './document-library/types';
import { DocumentToolbar } from './document-library/DocumentToolbar';
import { DocumentStatsRibbon } from './document-library/DocumentStatsRibbon';
import { DocumentTableView } from './document-library/DocumentTableView';
import { DocumentSplitView } from './document-library/DocumentSplitView';
import { DocumentGroupedView } from './document-library/DocumentGroupedView';
import { DocumentGridView } from './document-library/DocumentGridView';
import { DocumentPagination } from './document-library/DocumentPagination';
import { DocumentTagManagerModal } from './document-library/DocumentTagManagerModal';

interface DocumentLibraryProps {
  documents: DocumentRecord[];
  onViewDocument: (doc: DocumentRecord) => void;
  openIngestion: () => void;
  onUpdateDocuments?: (updatedDocs: DocumentRecord[]) => void;
  onOpenBinderWithSubset?: (docIds: string[]) => void;
  onNavigateToResponseTracker?: () => void;
  onDeleteDocument?: (doc: DocumentRecord) => void;
  onDeleteDocuments?: (docs: DocumentRecord[]) => void;
}

export const DocumentLibrary: React.FC<DocumentLibraryProps> = ({
  documents,
  onViewDocument,
  openIngestion,
  onUpdateDocuments,
  onOpenBinderWithSubset,
  onNavigateToResponseTracker,
  onDeleteDocument,
  onDeleteDocuments,
}) => {
  // View Formats & Layout state
  const [viewMode, setViewMode] = useState<DocumentViewMode>('table');
  const [density, setDensity] = useState<DisplayDensity>('comfortable');
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);

  // Sorting state
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number | 'all'>(25);

  // Filter state
  const [filters, setFilters] = useState<DocumentFilterState>({
    search: '',
    category: 'All',
    weight: 'All',
    tag: null,
    selectedTags: [],
    tagFilterMode: 'any',
    origin: 'All',
    year: 'All',
  });

  // Modal State for Individual Document Tag Manager
  const [tagManagerDoc, setTagManagerDoc] = useState<DocumentRecord | null>(null);

  // Bulk Selection State
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());

  // Dropdowns in Floating Action Bar
  const [showCategorizeMenu, setShowCategorizeMenu] = useState(false);
  const [showTagMenu, setShowTagMenu] = useState(false);
  const [bulkTagInput, setBulkTagInput] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Subset Modal State
  const [isSubsetModalOpen, setIsSubsetModalOpen] = useState(false);

  const categorizeMenuRef = useRef<HTMLDivElement>(null);
  const tagMenuRef = useRef<HTMLDivElement>(null);

  // Dismiss menus on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (categorizeMenuRef.current && !categorizeMenuRef.current.contains(e.target as Node)) {
        setShowCategorizeMenu(false);
      }
      if (tagMenuRef.current && !tagMenuRef.current.contains(e.target as Node)) {
        setShowTagMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Clear toast after 3.5s
  useEffect(() => {
    if (feedbackMsg) {
      const timer = setTimeout(() => setFeedbackMsg(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [feedbackMsg]);

  // Reset page to 1 when filters or sorting change
  const handleFilterChange = (newFilters: Partial<DocumentFilterState>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setFilters({
      search: '',
      category: 'All',
      weight: 'All',
      tag: null,
      selectedTags: [],
      tagFilterMode: 'any',
      origin: 'All',
      year: 'All',
    });
    setCurrentPage(1);
  };

  const handleTagClick = (tag: string) => {
    setFilters(prev => {
      const current = prev.selectedTags || (prev.tag ? [prev.tag] : []);
      const exists = current.some(t => t.toLowerCase() === tag.toLowerCase());
      const next = exists ? current : [...current, tag];
      return {
        ...prev,
        selectedTags: next,
        tag: next[0] || null
      };
    });
    setCurrentPage(1);
  };

  const handleSortFieldChange = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      // Default to asc for title/annexure/category/origin, desc for date/weight
      setSortDirection(field === 'date' || field === 'weight' ? 'desc' : 'asc');
    }
    setCurrentPage(1);
  };

  const handleToggleSortDirection = () => {
    setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    setCurrentPage(1);
  };

  // Extract all unique tags
  const allUniqueTags = useMemo(() => {
    const tagSet = new Set<string>();
    documents.forEach(d => {
      if (d.tags && Array.isArray(d.tags)) {
        d.tags.forEach(t => {
          if (t && t.trim()) tagSet.add(t.trim());
        });
      }
    });
    return Array.from(tagSet).sort();
  }, [documents]);

  // Tag frequency counts across all documents
  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    documents.forEach(d => {
      if (d.tags && Array.isArray(d.tags)) {
        d.tags.forEach(t => {
          if (t && t.trim()) {
            const clean = t.trim();
            counts[clean] = (counts[clean] || 0) + 1;
          }
        });
      }
    });
    return counts;
  }, [documents]);

  // Handler to persist edited tags from DocumentTagManagerModal
  const handleSaveDocTags = (docId: string, updatedTags: string[]) => {
    if (!onUpdateDocuments) return;
    const updated = documents.map(d => d.id === docId ? { ...d, tags: updatedTags } : d);
    onUpdateDocuments(updated);
    setTagManagerDoc(null);
    const docTitle = documents.find(d => d.id === docId)?.title || 'document';
    setFeedbackMsg(`Updated custom metadata tags for "${docTitle}"`);
  };

  // Quick inline tag addition
  const handleAddTagToDoc = (docId: string, tagToAdd: string) => {
    if (!onUpdateDocuments) return;
    const clean = tagToAdd.trim();
    if (!clean) return;
    const updated = documents.map(d => {
      if (d.id === docId) {
        const currentTags = d.tags || [];
        if (currentTags.some(t => t.toLowerCase() === clean.toLowerCase())) {
          return d;
        }
        return { ...d, tags: [...currentTags, clean] };
      }
      return d;
    });
    onUpdateDocuments(updated);
    setFeedbackMsg(`Added tag #${clean}`);
  };

  // Quick inline tag removal
  const handleRemoveTagFromDoc = (docId: string, tagToRemove: string) => {
    if (!onUpdateDocuments) return;
    const clean = tagToRemove.trim();
    const updated = documents.map(d => {
      if (d.id === docId) {
        const currentTags = d.tags || [];
        return {
          ...d,
          tags: currentTags.filter(t => t.toLowerCase() !== clean.toLowerCase())
        };
      }
      return d;
    });
    onUpdateDocuments(updated);
    setFeedbackMsg(`Removed tag #${clean}`);
  };

  // Extract all unique source origins
  const allUniqueOrigins = useMemo(() => {
    const origSet = new Set<string>();
    documents.forEach(d => {
      if (d.sourceOrigin) origSet.add(d.sourceOrigin);
    });
    return Array.from(origSet).sort();
  }, [documents]);

  // Extract all unique years
  const allUniqueYears = useMemo(() => {
    const yrSet = new Set<string>();
    documents.forEach(d => {
      if (d.date && d.date.length >= 4) {
        yrSet.add(d.date.slice(0, 4));
      }
    });
    return Array.from(yrSet).sort().reverse();
  }, [documents]);

  // Counts by category & weight
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: documents.length };
    documents.forEach(d => {
      counts[d.category] = (counts[d.category] || 0) + 1;
    });
    return counts;
  }, [documents]);

  const weightCounts = useMemo(() => {
    const counts: Record<string, number> = { All: documents.length };
    documents.forEach(d => {
      counts[d.evidentiaryWeight] = (counts[d.evidentiaryWeight] || 0) + 1;
    });
    return counts;
  }, [documents]);

  // Filtered documents
  const filteredDocs = useMemo(() => {
    return documents.filter(doc => {
      if (filters.category !== 'All' && doc.category !== filters.category) return false;
      if (filters.weight !== 'All' && doc.evidentiaryWeight !== filters.weight) return false;
      if (filters.origin !== 'All' && doc.sourceOrigin !== filters.origin) return false;
      if (filters.year !== 'All' && !doc.date.startsWith(filters.year)) return false;

      // Multi-tag & single-tag filtering with any/all match mode
      if (filters.selectedTags && filters.selectedTags.length > 0) {
        const mode = filters.tagFilterMode || 'any';
        if (mode === 'all') {
          const hasAll = filters.selectedTags.every(reqTag => 
            doc.tags?.some(t => t.toLowerCase() === reqTag.toLowerCase())
          );
          if (!hasAll) return false;
        } else {
          const hasAny = filters.selectedTags.some(reqTag => 
            doc.tags?.some(t => t.toLowerCase() === reqTag.toLowerCase())
          );
          if (!hasAny) return false;
        }
      } else if (filters.tag) {
        const hasTag = doc.tags?.some(t => t.toLowerCase() === filters.tag?.toLowerCase());
        if (!hasTag) return false;
      }

      // Search filter
      if (filters.search.trim()) {
        const q = filters.search.toLowerCase();
        const matchTitle = doc.title.toLowerCase().includes(q);
        const matchOrigin = doc.sourceOrigin.toLowerCase().includes(q);
        const matchExcerpt = doc.excerpt.toLowerCase().includes(q);
        const matchFullText = doc.fullText?.toLowerCase().includes(q);
        const matchId = doc.id.toLowerCase().includes(q);
        const matchAnnexure = doc.annexureNumber?.toLowerCase().includes(q);
        const matchTags = doc.tags?.some(tag => tag.toLowerCase().includes(q));
        if (!matchTitle && !matchOrigin && !matchExcerpt && !matchFullText && !matchId && !matchAnnexure && !matchTags) {
          return false;
        }
      }
      return true;
    });
  }, [documents, filters]);

  // Sorted documents
  const sortedDocs = useMemo(() => {
    return [...filteredDocs].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'date') {
        cmp = a.date.localeCompare(b.date);
      } else if (sortField === 'annexure') {
        const getNum = (str?: string) => {
          if (!str) return 999999;
          const match = str.match(/\d+/);
          return match ? parseInt(match[0], 10) : 999999;
        };
        cmp = getNum(a.annexureNumber) - getNum(b.annexureNumber);
        if (cmp === 0) cmp = a.id.localeCompare(b.id);
      } else if (sortField === 'title') {
        cmp = a.title.localeCompare(b.title);
      } else if (sortField === 'weight') {
        const weightOrder: Record<string, number> = {
          'Sworn/Official': 3,
          'Third-Party Objective': 2,
          'Unverified Claim': 1,
        };
        cmp = (weightOrder[b.evidentiaryWeight] || 0) - (weightOrder[a.evidentiaryWeight] || 0);
      } else if (sortField === 'category') {
        cmp = a.category.localeCompare(b.category);
      } else if (sortField === 'origin') {
        cmp = a.sourceOrigin.localeCompare(b.sourceOrigin);
      }

      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [filteredDocs, sortField, sortDirection]);

  // Paginated documents (for Table & Grid views)
  const paginatedDocs = useMemo(() => {
    if (pageSize === 'all') return sortedDocs;
    const start = (currentPage - 1) * pageSize;
    return sortedDocs.slice(start, start + pageSize);
  }, [sortedDocs, currentPage, pageSize]);

  const totalPages = pageSize === 'all' ? 1 : Math.ceil(sortedDocs.length / pageSize) || 1;

  // Bulk Selection Helpers
  const toggleSelectDoc = (id: string) => {
    setSelectedDocIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectMultipleDocs = (ids: string[], select: boolean) => {
    setSelectedDocIds(prev => {
      const next = new Set(prev);
      ids.forEach(id => {
        if (select) {
          next.add(id);
        } else {
          next.delete(id);
        }
      });
      return next;
    });
  };

  const areAllFilteredSelected = filteredDocs.length > 0 && filteredDocs.every(d => selectedDocIds.has(d.id));
  const isSomeFilteredSelected = filteredDocs.some(d => selectedDocIds.has(d.id)) && !areAllFilteredSelected;

  const handleSelectAllFiltered = () => {
    if (areAllFilteredSelected) {
      setSelectedDocIds(prev => {
        const next = new Set(prev);
        filteredDocs.forEach(d => next.delete(d.id));
        return next;
      });
    } else {
      setSelectedDocIds(prev => {
        const next = new Set(prev);
        filteredDocs.forEach(d => next.add(d.id));
        return next;
      });
    }
  };

  const handleDeselectAll = () => {
    setSelectedDocIds(new Set());
  };

  // Bulk Action: Categorize
  const handleBulkCategorize = (newCategory: DocumentCategory) => {
    if (selectedDocIds.size === 0) return;

    const count = selectedDocIds.size;
    const updated = documents.map(doc => {
      if (selectedDocIds.has(doc.id)) {
        return {
          ...doc,
          category: newCategory,
          metadata: {
            ...doc.metadata,
            categoryManuallyUpdated: true,
            updatedAt: new Date().toISOString(),
          }
        };
      }
      return doc;
    });

    if (onUpdateDocuments) {
      onUpdateDocuments(updated);
    }
    setShowCategorizeMenu(false);
    setFeedbackMsg(`Successfully re-categorized ${count} document${count === 1 ? '' : 's'} as "${newCategory}"`);
  };

  // Bulk Action: Add Tag
  const handleBulkAddTag = (tagToAdd: string) => {
    const cleanTag = tagToAdd.trim().replace(/^#/, '');
    if (!cleanTag || selectedDocIds.size === 0) return;

    const count = selectedDocIds.size;
    const updated = documents.map(doc => {
      if (selectedDocIds.has(doc.id)) {
        const existingTags = doc.tags || [];
        const hasTag = existingTags.some(t => t.toLowerCase() === cleanTag.toLowerCase());
        const newTags = hasTag ? existingTags : [...existingTags, cleanTag];
        return {
          ...doc,
          tags: newTags,
          metadata: {
            ...doc.metadata,
            tags: newTags,
          }
        };
      }
      return doc;
    });

    if (onUpdateDocuments) {
      onUpdateDocuments(updated);
    }
    setBulkTagInput('');
    setShowTagMenu(false);
    setFeedbackMsg(`Added tag #${cleanTag} to ${count} selected document${count === 1 ? '' : 's'}`);
  };

  // Export filtered documents as CSV
  const handleExportCsv = () => {
    let csv = `Annexure,ID,Date,Title,Category,SourceOrigin,EvidentiaryWeight,Excerpt,Tags\n`;
    sortedDocs.forEach(doc => {
      const row = [
        `"${doc.annexureNumber || ''}"`,
        `"${doc.id}"`,
        `"${doc.date}"`,
        `"${doc.title.replace(/"/g, '""')}"`,
        `"${doc.category}"`,
        `"${doc.sourceOrigin.replace(/"/g, '""')}"`,
        `"${doc.evidentiaryWeight}"`,
        `"${doc.excerpt.replace(/"/g, '""')}"`,
        `"${(doc.tags || []).join(', ')}"`,
      ];
      csv += row.join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FCWA_Document_Registry_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setFeedbackMsg(`Exported ${sortedDocs.length} documents to CSV`);
  };

  // Selected Documents Array for Subset
  const selectedDocsList = useMemo(() => {
    return documents.filter(d => selectedDocIds.has(d.id));
  }, [documents, selectedDocIds]);

  return (
    <div className="space-y-5 pb-28" id="document-library-container">
      {/* Toast Feedback Notification */}
      {feedbackMsg && (
        <div className="fixed top-20 right-4 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl border border-slate-700 text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-3 duration-200">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 font-serif flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <span>Document Vault &amp; Primary Records</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Normalized evidentiary repository for Case 4344/2023 with adaptive multi-format views (Table, Split Inspector, Grouped, Cards) for scaling across hundreds of case exhibits.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={openIngestion}
            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
            id="ingest-new-doc-btn"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Ingest Document / OCR</span>
          </button>
        </div>
      </div>

      {/* Case Volume & Health Statistics Ribbon */}
      <DocumentStatsRibbon
        documents={documents}
        filteredCount={filteredDocs.length}
        totalUniqueTagsCount={allUniqueTags.length}
        onOpenTagFilter={() => setShowFilterDrawer(true)}
      />

      {/* High-Volume Navigation & Filter Toolbar */}
      <DocumentToolbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        density={density}
        onDensityChange={setDensity}
        filters={filters}
        onFilterChange={handleFilterChange}
        onResetFilters={handleResetFilters}
        sortField={sortField}
        sortDirection={sortDirection}
        onSortFieldChange={handleSortFieldChange}
        onToggleSortDirection={handleToggleSortDirection}
        allUniqueTags={allUniqueTags}
        tagCounts={tagCounts}
        allUniqueOrigins={allUniqueOrigins}
        allUniqueYears={allUniqueYears}
        categoryCounts={categoryCounts}
        weightCounts={weightCounts}
        totalDocs={documents.length}
        filteredDocsCount={filteredDocs.length}
        onExportCsv={handleExportCsv}
        showFilterDrawer={showFilterDrawer}
        onToggleFilterDrawer={() => setShowFilterDrawer(prev => !prev)}
      />

      {/* Bulk Selection Header Bar */}
      <div className="flex items-center justify-between bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-2xs text-xs">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer select-none font-semibold text-slate-700 hover:text-slate-900">
            <input
              type="checkbox"
              checked={areAllFilteredSelected}
              ref={el => {
                if (el) el.indeterminate = isSomeFilteredSelected;
              }}
              onChange={handleSelectAllFiltered}
              className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-400 cursor-pointer"
              id="select-all-filtered-checkbox"
            />
            <span>
              {areAllFilteredSelected ? 'Deselect All' : 'Select All Filtered'} ({filteredDocs.length})
            </span>
          </label>

          {selectedDocIds.size > 0 && (
            <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
              <span className="font-mono px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-bold text-[11px]">
                {selectedDocIds.size} selected
              </span>
              <button
                onClick={handleDeselectAll}
                className="text-slate-500 hover:text-slate-800 text-[11px] underline font-medium"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        <div className="text-slate-400 text-[11px] flex items-center gap-2">
          <span>Format: <strong className="text-slate-700 capitalize">{viewMode}</strong></span>
          {pageSize !== 'all' && (
            <>
              <span>•</span>
              <span>Page {currentPage} of {totalPages}</span>
            </>
          )}
        </div>
      </div>

      {/* Main Dynamic View Formats */}
      <div>
        {viewMode === 'table' && (
          <DocumentTableView
            documents={paginatedDocs}
            selectedDocIds={selectedDocIds}
            onToggleSelectDoc={toggleSelectDoc}
            onViewDocument={onViewDocument}
            onTagClick={handleTagClick}
            onManageDocTags={setTagManagerDoc}
            onDeleteDocument={onDeleteDocument}
            density={density}
            sortField={sortField}
            sortDirection={sortDirection}
            onSortChange={handleSortFieldChange}
          />
        )}

        {viewMode === 'split' && (
          <DocumentSplitView
            documents={sortedDocs}
            selectedDocIds={selectedDocIds}
            onToggleSelectDoc={toggleSelectDoc}
            onViewDocument={onViewDocument}
            onTagClick={handleTagClick}
            onManageDocTags={setTagManagerDoc}
            onAddTagToDoc={handleAddTagToDoc}
            onRemoveTagFromDoc={handleRemoveTagFromDoc}
            onDeleteDocument={onDeleteDocument}
          />
        )}

        {viewMode === 'grouped' && (
          <DocumentGroupedView
            documents={sortedDocs}
            selectedDocIds={selectedDocIds}
            onToggleSelectDoc={toggleSelectDoc}
            onViewDocument={onViewDocument}
            onTagClick={handleTagClick}
            onManageDocTags={setTagManagerDoc}
            onDeleteDocument={onDeleteDocument}
            onSelectMultipleDocs={handleSelectMultipleDocs}
          />
        )}

        {viewMode === 'grid' && (
          <DocumentGridView
            documents={paginatedDocs}
            selectedDocIds={selectedDocIds}
            onToggleSelectDoc={toggleSelectDoc}
            onViewDocument={onViewDocument}
            onTagClick={handleTagClick}
            onManageDocTags={setTagManagerDoc}
            onDeleteDocument={onDeleteDocument}
            density={density}
          />
        )}
      </div>

      {/* Pagination (for Table & Grid views) */}
      {(viewMode === 'table' || viewMode === 'grid') && (
        <DocumentPagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={documents.length}
          filteredCount={sortedDocs.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
        />
      )}

      {/* Floating Footer Action Bar for Bulk Operations */}
      {selectedDocIds.size > 0 && (
        <div 
          className="fixed bottom-4 inset-x-0 z-40 px-4 max-w-4xl mx-auto pointer-events-none"
          id="bulk-action-footer-bar"
        >
          <div className="pointer-events-auto bg-slate-950 text-white rounded-2xl shadow-2xl border border-slate-800 p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-5 duration-200">
            {/* Left: Selection Counter & Clear */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="font-mono px-2.5 py-1 rounded-lg bg-amber-400 text-slate-950 font-black text-xs">
                  {selectedDocIds.size}
                </span>
                <span className="text-xs font-bold text-slate-200">
                  Document{selectedDocIds.size === 1 ? '' : 's'} Selected
                </span>
              </div>
              <button
                onClick={handleDeselectAll}
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 underline pl-2 border-l border-slate-800"
                title="Deselect all records"
              >
                <X className="w-3 h-3" />
                <span>Clear</span>
              </button>
            </div>

            {/* Right: Bulk Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Bulk Categorize Dropdown Menu */}
              <div className="relative" ref={categorizeMenuRef}>
                <button
                  type="button"
                  onClick={() => {
                    setShowCategorizeMenu(!showCategorizeMenu);
                    setShowTagMenu(false);
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
                  id="bulk-categorize-btn"
                >
                  <Layers className="w-3.5 h-3.5 text-amber-400" />
                  <span>Bulk Categorize</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {showCategorizeMenu && (
                  <div className="absolute bottom-full mb-2 left-0 sm:left-auto sm:right-0 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 z-50 text-xs space-y-1 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                      Categorization Schema (Assign to {selectedDocIds.size} docs)
                    </div>
                    {METADATA_CATEGORIES.map((cat) => {
                      const Icon = cat.icon;
                      return (
                        <button
                          key={cat.value}
                          type="button"
                          onClick={() => handleBulkCategorize(cat.value)}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg text-slate-200 hover:text-white hover:bg-slate-800 flex items-center gap-2 transition-colors"
                        >
                          <Icon className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <div className="truncate">
                            <span className="font-semibold block">{cat.label}</span>
                            <span className="text-[10px] text-slate-400 block truncate">{cat.description}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Bulk Tag Popover */}
              <div className="relative" ref={tagMenuRef}>
                <button
                  type="button"
                  onClick={() => {
                    setShowTagMenu(!showTagMenu);
                    setShowCategorizeMenu(false);
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
                  id="bulk-tag-btn"
                >
                  <Tag className="w-3.5 h-3.5 text-amber-400" />
                  <span>Bulk Tag</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {showTagMenu && (
                  <div className="absolute bottom-full mb-2 left-0 sm:left-auto sm:right-0 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-3 z-50 text-xs space-y-2.5 animate-in fade-in zoom-in-95 duration-100">
                    <div className="text-[11px] font-bold text-slate-300">
                      Add Tag to {selectedDocIds.size} Selected Records:
                    </div>

                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={bulkTagInput}
                        onChange={(e) => setBulkTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleBulkAddTag(bulkTagInput);
                          }
                        }}
                        placeholder="e.g. Order 5.1, Trial Exhibit..."
                        className="flex-1 px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-400"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handleBulkAddTag(bulkTagInput)}
                        disabled={!bulkTagInput.trim()}
                        className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold rounded-lg text-xs"
                      >
                        Add
                      </button>
                    </div>

                    <div className="pt-2 border-t border-slate-800">
                      <span className="text-[10px] text-slate-400 block mb-1">Quick Select:</span>
                      <div className="flex flex-wrap gap-1">
                        {['Order 5.1', 'Order 4.2', 'Order 9.1', 'Asthma', 'Attendance', 'Trial Exhibit', 'Withholding'].map(t => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => handleBulkAddTag(t)}
                            className="px-2 py-0.5 rounded text-[10px] bg-slate-800 hover:bg-amber-950 text-slate-300 hover:text-amber-200 border border-slate-700"
                          >
                            #{t}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Check Responses Action */}
              {onNavigateToResponseTracker && (
                <button
                  type="button"
                  onClick={onNavigateToResponseTracker}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
                  id="action-bar-response-tracker-btn"
                  title="Check pending response obligations in Response Tracker"
                >
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Response Tracker</span>
                </button>
              )}

              {/* Generate Evidence Binder Subset Action */}
              <button
                type="button"
                onClick={() => setIsSubsetModalOpen(true)}
                className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-extrabold text-xs rounded-lg flex items-center gap-1.5 shadow-md transition-all transform active:scale-95"
                id="generate-binder-subset-btn"
              >
                <FolderArchive className="w-4 h-4 text-slate-950" />
                <span>Generate Evidence Binder Subset ({selectedDocIds.size})</span>
              </button>

              {/* Bulk Delete Action */}
              {(onDeleteDocuments || onDeleteDocument) && (
                <button
                  type="button"
                  onClick={() => {
                    const docsToDelete = documents.filter(d => selectedDocIds.has(d.id));
                    if (docsToDelete.length > 0) {
                      if (onDeleteDocuments) {
                        onDeleteDocuments(docsToDelete);
                      } else if (onDeleteDocument) {
                        onDeleteDocument(docsToDelete[0]);
                      }
                    }
                  }}
                  className="px-3 py-1.5 bg-rose-950/90 hover:bg-rose-900 border border-rose-800 text-rose-200 hover:text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                  id="bulk-delete-btn"
                  title={`Delete ${selectedDocIds.size} selected document(s) from vault`}
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Delete ({selectedDocIds.size})</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Evidence Binder Subset Modal */}
      <EvidenceBinderSubsetModal
        isOpen={isSubsetModalOpen}
        onClose={() => setIsSubsetModalOpen(false)}
        selectedDocuments={selectedDocsList}
        onOpenInBinder={onOpenBinderWithSubset}
        onViewDocument={onViewDocument}
      />

      {/* Document Custom Metadata Tag Manager Modal */}
      {tagManagerDoc && (
        <DocumentTagManagerModal
          isOpen={Boolean(tagManagerDoc)}
          onClose={() => setTagManagerDoc(null)}
          document={tagManagerDoc}
          allExistingTags={allUniqueTags}
          onSaveTags={handleSaveDocTags}
        />
      )}
    </div>
  );
};
