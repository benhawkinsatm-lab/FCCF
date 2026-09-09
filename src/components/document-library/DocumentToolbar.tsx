import React from 'react';
import { 
  Search, 
  X, 
  Table as TableIcon, 
  Columns, 
  Layers, 
  LayoutGrid, 
  Filter, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Download, 
  RotateCcw, 
  Tag, 
  Calendar, 
  Building2, 
  ShieldCheck, 
  Check, 
  SlidersHorizontal 
} from 'lucide-react';
import { 
  DocumentViewMode, 
  DisplayDensity, 
  SortField, 
  SortDirection, 
  DocumentFilterState 
} from './types';
import { DocumentRecord } from '../../types';

interface DocumentToolbarProps {
  viewMode: DocumentViewMode;
  onViewModeChange: (mode: DocumentViewMode) => void;
  density: DisplayDensity;
  onDensityChange: (density: DisplayDensity) => void;
  filters: DocumentFilterState;
  onFilterChange: (filters: Partial<DocumentFilterState>) => void;
  onResetFilters: () => void;
  sortField: SortField;
  sortDirection: SortDirection;
  onSortFieldChange: (field: SortField) => void;
  onToggleSortDirection: () => void;
  allUniqueTags: string[];
  tagCounts?: Record<string, number>;
  allUniqueOrigins: string[];
  allUniqueYears: string[];
  categoryCounts: Record<string, number>;
  weightCounts: Record<string, number>;
  totalDocs: number;
  filteredDocsCount: number;
  onExportCsv: () => void;
  showFilterDrawer: boolean;
  onToggleFilterDrawer: () => void;
}

export const DocumentToolbar: React.FC<DocumentToolbarProps> = ({
  viewMode,
  onViewModeChange,
  density,
  onDensityChange,
  filters,
  onFilterChange,
  onResetFilters,
  sortField,
  sortDirection,
  onSortFieldChange,
  onToggleSortDirection,
  allUniqueTags,
  tagCounts,
  allUniqueOrigins,
  allUniqueYears,
  categoryCounts,
  weightCounts,
  totalDocs,
  filteredDocsCount,
  onExportCsv,
  showFilterDrawer,
  onToggleFilterDrawer,
}) => {
  const [tagSearchQuery, setTagSearchQuery] = React.useState('');

  const activeTags = React.useMemo(() => {
    if (filters.selectedTags && filters.selectedTags.length > 0) {
      return filters.selectedTags;
    }
    if (filters.tag) {
      return [filters.tag];
    }
    return [];
  }, [filters.selectedTags, filters.tag]);

  const isFiltered = 
    filters.search.trim() !== '' || 
    filters.category !== 'All' || 
    filters.weight !== 'All' || 
    activeTags.length > 0 || 
    filters.origin !== 'All' || 
    filters.year !== 'All';

  const handleToggleTag = (tag: string) => {
    const current = filters.selectedTags || (filters.tag ? [filters.tag] : []);
    const exists = current.some(t => t.toLowerCase() === tag.toLowerCase());
    let next: string[];
    if (exists) {
      next = current.filter(t => t.toLowerCase() !== tag.toLowerCase());
    } else {
      next = [...current, tag];
    }
    onFilterChange({
      selectedTags: next,
      tag: next.length > 0 ? next[0] : null
    });
  };

  const handleRemoveActiveTag = (tagToRemove: string) => {
    const current = filters.selectedTags || (filters.tag ? [filters.tag] : []);
    const next = current.filter(t => t.toLowerCase() !== tagToRemove.toLowerCase());
    onFilterChange({
      selectedTags: next,
      tag: next.length > 0 ? next[0] : null
    });
  };

  const handleClearAllTags = () => {
    onFilterChange({
      selectedTags: [],
      tag: null
    });
  };

  const displayedTags = React.useMemo(() => {
    if (!tagSearchQuery.trim()) return allUniqueTags;
    return allUniqueTags.filter(t => t.toLowerCase().includes(tagSearchQuery.toLowerCase()));
  }, [allUniqueTags, tagSearchQuery]);

  const categories = [
    'All',
    'Legal/Court',
    'Direct Communication',
    'Medical',
    'Education',
    'Financial',
    'Extracurricular'
  ];

  const weights = [
    'All',
    'Sworn/Official',
    'Third-Party Objective',
    'Unverified Claim'
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3.5 text-xs">
      {/* Top Controls Row: Search + View Modes + Sort + Density */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[260px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => onFilterChange({ search: e.target.value })}
            placeholder="Search across title, verbatim excerpt, annexure #, source origin, tags..."
            className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 placeholder:text-slate-400 transition"
            id="doc-search-input"
          />
          {filters.search && (
            <button
              onClick={() => onFilterChange({ search: '' })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* View Mode Switcher, Density, Sort, and Actions */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-between lg:justify-end">
          {/* Format / View Mode Selector */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-2xs">
            <button
              type="button"
              onClick={() => onViewModeChange('table')}
              className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 font-semibold text-xs transition ${
                viewMode === 'table'
                  ? 'bg-white text-slate-950 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Table / Docket Ledger View (Best for scanning dozens of exhibits)"
              id="view-mode-table-btn"
            >
              <TableIcon className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Table</span>
            </button>

            <button
              type="button"
              onClick={() => onViewModeChange('split')}
              className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 font-semibold text-xs transition ${
                viewMode === 'split'
                  ? 'bg-white text-slate-950 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Split Master-Detail Inspector (Review full extracts rapidly)"
              id="view-mode-split-btn"
            >
              <Columns className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden sm:inline">Split Inspector</span>
            </button>

            <button
              type="button"
              onClick={() => onViewModeChange('grouped')}
              className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 font-semibold text-xs transition ${
                viewMode === 'grouped'
                  ? 'bg-white text-slate-950 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Categorized / Grouped View (Collapsible legal bundles)"
              id="view-mode-grouped-btn"
            >
              <Layers className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Grouped</span>
            </button>

            <button
              type="button"
              onClick={() => onViewModeChange('grid')}
              className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 font-semibold text-xs transition ${
                viewMode === 'grid'
                  ? 'bg-white text-slate-950 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Grid Cards View"
              id="view-mode-grid-btn"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-slate-700" />
              <span className="hidden sm:inline">Cards</span>
            </button>
          </div>

          {/* Density Toggle (for Table & Grid) */}
          {(viewMode === 'table' || viewMode === 'grid') && (
            <button
              type="button"
              onClick={() => onDensityChange(density === 'compact' ? 'comfortable' : 'compact')}
              className={`px-2.5 py-1.5 rounded-xl border font-semibold text-xs flex items-center gap-1 transition ${
                density === 'compact'
                  ? 'bg-slate-900 text-white border-slate-800'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
              title={density === 'compact' ? "Switch to Comfortable Density" : "Switch to Compact Dense View"}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{density === 'compact' ? 'Compact' : 'Comfortable'}</span>
            </button>
          )}

          {/* Sort Menu */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1">
            <span className="text-slate-400 text-[11px] hidden sm:inline">Sort:</span>
            <select
              value={sortField}
              onChange={(e) => onSortFieldChange(e.target.value as SortField)}
              className="bg-transparent text-xs text-slate-800 font-semibold focus:outline-none cursor-pointer"
              id="doc-sort-selector"
            >
              <option value="date">Date</option>
              <option value="annexure">Annexure #</option>
              <option value="title">Title (A-Z)</option>
              <option value="weight">Evidentiary Weight</option>
              <option value="category">Category</option>
              <option value="origin">Source Origin</option>
            </select>

            <button
              type="button"
              onClick={onToggleSortDirection}
              className="p-1 rounded text-slate-600 hover:bg-slate-200 transition"
              title={sortDirection === 'asc' ? "Ascending order (click for Descending)" : "Descending order (click for Ascending)"}
            >
              {sortDirection === 'asc' ? (
                <ArrowUp className="w-3.5 h-3.5 text-amber-600 font-bold" />
              ) : (
                <ArrowDown className="w-3.5 h-3.5 text-amber-600 font-bold" />
              )}
            </button>
          </div>

          {/* Filter Drawer Toggle */}
          <button
            type="button"
            onClick={onToggleFilterDrawer}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
              isFiltered || showFilterDrawer
                ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-2xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
            id="toggle-filter-drawer-btn"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filters</span>
            {isFiltered && (
              <span className="w-2 h-2 rounded-full bg-slate-950 animate-pulse" />
            )}
          </button>

          {/* Export CSV Index */}
          <button
            type="button"
            onClick={onExportCsv}
            className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition shadow-2xs"
            title="Download CSV Table of Documents"
            id="export-csv-doc-index-btn"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Primary Category Quick-Filter Pills */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap text-xs">
          <span className="text-slate-400 font-medium mr-1">Category:</span>
          {categories.map((cat) => {
            const count = categoryCounts[cat] || (cat === 'All' ? totalDocs : 0);
            const isSelected = filters.category === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => onFilterChange({ category: cat })}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-slate-900 text-white font-bold shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                <span>{cat}</span>
                <span className={`text-[10px] px-1 py-0.2 rounded-full ${
                  isSelected ? 'bg-slate-700 text-slate-200' : 'bg-slate-200 text-slate-500'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Clear Filters Button if any active */}
        {isFiltered && (
          <button
            type="button"
            onClick={onResetFilters}
            className="text-xs text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1 hover:underline"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset All Filters</span>
          </button>
        )}
      </div>

      {/* Active Tags Filter Ribbon */}
      {activeTags.length > 0 && (
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap bg-amber-50/60 p-2.5 rounded-xl border border-amber-200">
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="flex items-center gap-1 text-[11px] font-bold text-amber-900 mr-1">
              <Tag className="w-3.5 h-3.5 text-amber-600" />
              <span>Filtered by Tag{activeTags.length === 1 ? '' : 's'} ({activeTags.length}):</span>
            </div>
            {activeTags.map(tag => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-amber-300 text-amber-950 font-semibold text-[11px] shadow-2xs"
              >
                <span>#{tag}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveActiveTag(tag)}
                  className="p-0.5 rounded text-amber-700 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                  title={`Remove #${tag} filter`}
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}
            
            {activeTags.length > 1 && (
              <div className="flex items-center gap-1 ml-2 text-[10px] text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                <span className="font-medium">Match:</span>
                <button
                  type="button"
                  onClick={() => onFilterChange({ tagFilterMode: 'any' })}
                  className={`px-1.5 py-0.2 rounded font-medium cursor-pointer ${
                    (filters.tagFilterMode || 'any') === 'any'
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Show documents that match at least one selected tag"
                >
                  ANY
                </button>
                <span>/</span>
                <button
                  type="button"
                  onClick={() => onFilterChange({ tagFilterMode: 'all' })}
                  className={`px-1.5 py-0.2 rounded font-medium cursor-pointer ${
                    filters.tagFilterMode === 'all'
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Show documents that match all selected tags"
                >
                  ALL
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleClearAllTags}
            className="text-[11px] text-amber-800 hover:text-rose-700 font-semibold underline cursor-pointer"
          >
            Clear Tags
          </button>
        </div>
      )}

      {/* Expandable Advanced Filter Drawer (Origin, Year, Weight, Tags) */}
      {showFilterDrawer && (
        <div className="pt-3 border-t border-slate-200 space-y-3 bg-slate-50 p-3.5 rounded-xl border text-xs animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Evidentiary Weight */}
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">
                Evidentiary Weight:
              </label>
              <select
                value={filters.weight}
                onChange={(e) => onFilterChange({ weight: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:ring-1 focus:ring-amber-400"
              >
                {weights.map(w => (
                  <option key={w} value={w}>
                    {w} ({weightCounts[w] || (w === 'All' ? totalDocs : 0)})
                  </option>
                ))}
              </select>
            </div>

            {/* Source Origin */}
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">
                Source Origin:
              </label>
              <select
                value={filters.origin}
                onChange={(e) => onFilterChange({ origin: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:ring-1 focus:ring-amber-400"
              >
                <option value="All">All Source Origins ({allUniqueOrigins.length})</option>
                {allUniqueOrigins.map(orig => (
                  <option key={orig} value={orig}>{orig}</option>
                ))}
              </select>
            </div>

            {/* Year / Period */}
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">
                Year Period:
              </label>
              <select
                value={filters.year}
                onChange={(e) => onFilterChange({ year: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:ring-1 focus:ring-amber-400"
              >
                <option value="All">All Years</option>
                {allUniqueYears.map(yr => (
                  <option key={yr} value={yr}>Year {yr}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Tags row */}
          {allUniqueTags.length > 0 && (
            <div className="pt-2 border-t border-slate-200 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 text-slate-700 font-bold text-[10px] uppercase tracking-wider">
                  <Tag className="w-3.5 h-3.5 text-amber-500" />
                  <span>Filter by Metadata Tag ({displayedTags.length}):</span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Tag quick search */}
                  <input
                    type="text"
                    value={tagSearchQuery}
                    onChange={(e) => setTagSearchQuery(e.target.value)}
                    placeholder="Find tag..."
                    className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-[10px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                  />
                  {activeTags.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAllTags}
                      className="text-[10px] text-slate-500 hover:text-rose-600 underline cursor-pointer"
                    >
                      Clear ({activeTags.length})
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-1 max-h-36 overflow-y-auto p-0.5">
                {displayedTags.map(t => {
                  const isSelected = activeTags.some(curr => curr.toLowerCase() === t.toLowerCase());
                  const count = tagCounts ? tagCounts[t] : undefined;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => handleToggleTag(t)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-medium transition flex items-center gap-1 border cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500 text-slate-950 border-amber-600 font-bold shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-amber-50 hover:text-amber-900 hover:border-amber-200'
                      }`}
                      title={isSelected ? `Unselect tag #${t}` : `Filter by tag #${t}`}
                    >
                      <span>#{t}</span>
                      {count !== undefined && (
                        <span className={`text-[9px] px-1 py-0.2 rounded-full font-mono ${
                          isSelected ? 'bg-amber-600 text-slate-950 font-bold' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
