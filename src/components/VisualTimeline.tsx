import React, { useState, useMemo, useRef } from 'react';
import { 
  Clock, 
  Search, 
  Filter, 
  Plus, 
  AlertOctagon, 
  ExternalLink, 
  Download, 
  ShieldCheck, 
  Check, 
  User, 
  Calendar,
  AlertTriangle,
  Eye,
  EyeOff,
  Scale,
  MessageSquare,
  GraduationCap,
  Stethoscope,
  Trophy,
  DollarSign,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Layers,
  Sparkles,
  RotateCcw,
  Copy,
  SlidersHorizontal,
  ArrowUpDown,
  Columns,
  List,
  GitCommit,
  Share2
} from 'lucide-react';
import { TimelineEvent, DocumentRecord, DocumentCategory, EvidentiaryWeight } from '../types';

export interface VisualTimelineProps {
  timeline: TimelineEvent[];
  documents: DocumentRecord[];
  onViewDocument: (doc: DocumentRecord) => void;
  onAddEvent: (event: TimelineEvent) => void;
}

export type TimelineViewMode = 'visual-spine' | 'category-swimlanes' | 'compact-table';

export interface CategoryConfig {
  category: DocumentCategory;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
  dotColor: string;
  lightBg: string;
  ringColor: string;
  accentBar: string;
}

export const CATEGORY_CONFIGS: Record<DocumentCategory, CategoryConfig> = {
  'Direct Communication': {
    category: 'Direct Communication',
    label: 'Direct Communication',
    description: 'SMS chains, email logs & 42h response compliance',
    icon: MessageSquare,
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-900',
    borderColor: 'border-amber-300',
    dotColor: 'bg-amber-500',
    lightBg: 'bg-amber-50/40',
    ringColor: 'ring-amber-400',
    accentBar: 'bg-amber-500',
  },
  'Medical': {
    category: 'Medical',
    label: 'Medical & Clinical',
    description: 'Hospital admissions, therapy assessments & specialist reports',
    icon: Stethoscope,
    badgeBg: 'bg-rose-100',
    badgeText: 'text-rose-900',
    borderColor: 'border-rose-300',
    dotColor: 'bg-rose-500',
    lightBg: 'bg-rose-50/40',
    ringColor: 'ring-rose-400',
    accentBar: 'bg-rose-500',
  },
  'Education': {
    category: 'Education',
    label: 'Education & Schooling',
    description: 'School attendance records, unexplained absences & teacher logs',
    icon: GraduationCap,
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-900',
    borderColor: 'border-blue-300',
    dotColor: 'bg-blue-500',
    lightBg: 'bg-blue-50/40',
    ringColor: 'ring-blue-400',
    accentBar: 'bg-blue-500',
  },
  'Legal/Court': {
    category: 'Legal/Court',
    label: 'Legal & Court Filings',
    description: 'Interim parenting orders, affidavits & statutory filings',
    icon: Scale,
    badgeBg: 'bg-purple-100',
    badgeText: 'text-purple-900',
    borderColor: 'border-purple-300',
    dotColor: 'bg-purple-500',
    lightBg: 'bg-purple-50/40',
    ringColor: 'ring-purple-400',
    accentBar: 'bg-purple-500',
  },
  'Extracurricular': {
    category: 'Extracurricular',
    label: 'Extracurricular & Sports',
    description: 'BJFC junior football, coach statements & sideline events',
    icon: Trophy,
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-900',
    borderColor: 'border-emerald-300',
    dotColor: 'bg-emerald-500',
    lightBg: 'bg-emerald-50/40',
    ringColor: 'ring-emerald-400',
    accentBar: 'bg-emerald-500',
  },
  'Financial': {
    category: 'Financial',
    label: 'Financial & Expenses',
    description: 'School levies, dental reimbursements & extraordinary receipts',
    icon: DollarSign,
    badgeBg: 'bg-slate-200',
    badgeText: 'text-slate-900',
    borderColor: 'border-slate-400',
    dotColor: 'bg-slate-600',
    lightBg: 'bg-slate-100/50',
    ringColor: 'ring-slate-400',
    accentBar: 'bg-slate-700',
  },
};

const ALL_CATEGORIES: DocumentCategory[] = [
  'Direct Communication',
  'Medical',
  'Education',
  'Legal/Court',
  'Extracurricular',
  'Financial'
];

export const VisualTimeline: React.FC<VisualTimelineProps> = ({
  timeline,
  documents,
  onViewDocument,
  onAddEvent,
}) => {
  // View mode
  const [viewMode, setViewMode] = useState<TimelineViewMode>('visual-spine');
  
  // Category visibility state: a set of category names that are visible.
  // When a category is filtered out of view, it is removed from this set.
  const [visibleCategories, setVisibleCategories] = useState<Set<DocumentCategory>>(
    new Set(ALL_CATEGORIES)
  );

  // Secondary filters
  const [search, setSearch] = useState('');
  const [breachesOnly, setBreachesOnly] = useState(false);
  const [weightFilter, setWeightFilter] = useState<'All' | EvidentiaryWeight>('All');
  const [childFilter, setChildFilter] = useState<'All' | 'Isabella' | 'Mason'>('All');
  const [sortAscending, setSortAscending] = useState<boolean>(true); // Chronological by default
  const [activeMonthFilter, setActiveMonthFilter] = useState<string | null>(null);
  
  // Interaction states
  const [expandedEventIds, setExpandedEventIds] = useState<Set<string>>(new Set());
  const [copiedCitationId, setCopiedCitationId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New Event Form State
  const [newEvent, setNewEvent] = useState({
    title: '',
    date: new Date().toISOString().split('T')[0],
    time: '12:00',
    description: '',
    category: 'Direct Communication' as DocumentCategory,
    sourceOrigin: 'Sue-Anne SMS',
    evidentiaryWeight: 'Third-Party Objective' as EvidentiaryWeight,
    orderBreachFlag: false,
    breachedOrderNumber: '',
    breachSeverity: 'Moderate' as 'Minor' | 'Moderate' | 'Severe',
    childrenMentioned: ['Isabella', 'Mason'] as ('Isabella' | 'Mason')[],
    responseLagHours: 0,
  });

  // Calculate event count per category in raw dataset
  const categoryCounts = useMemo(() => {
    const counts: Record<DocumentCategory, number> = {
      'Direct Communication': 0,
      'Medical': 0,
      'Education': 0,
      'Legal/Court': 0,
      'Extracurricular': 0,
      'Financial': 0,
    };
    timeline.forEach(evt => {
      if (counts[evt.category] !== undefined) {
        counts[evt.category]++;
      }
    });
    return counts;
  }, [timeline]);

  // Toggle single category in/out of view
  const toggleCategoryVisibility = (cat: DocumentCategory) => {
    setVisibleCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  };

  // Isolate a category (show only this category, filter out all others)
  const isolateCategory = (cat: DocumentCategory) => {
    setVisibleCategories(new Set([cat]));
  };

  // Show all categories in view
  const showAllCategories = () => {
    setVisibleCategories(new Set(ALL_CATEGORIES));
  };

  // Filter out all categories
  const filterOutAllCategories = () => {
    setVisibleCategories(new Set());
  };

  // Invert category visibility
  const invertCategoryVisibility = () => {
    setVisibleCategories(prev => {
      const next = new Set<DocumentCategory>();
      ALL_CATEGORIES.forEach(c => {
        if (!prev.has(c)) next.add(c);
      });
      return next;
    });
  };

  // Card expansion toggle
  const toggleCardExpansion = (id: string) => {
    setExpandedEventIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAllCards = () => {
    setExpandedEventIds(new Set(filteredTimeline.map(e => e.id)));
  };

  const collapseAllCards = () => {
    setExpandedEventIds(new Set());
  };

  // Citation copy handler
  const handleCopyCitation = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCitationId(id);
    setTimeout(() => setCopiedCitationId(null), 2000);
  };

  // Filtered timeline data
  const filteredTimeline = useMemo(() => {
    return timeline.filter((event) => {
      // 1. Category Visibility Filter: If category is filtered out of view, reject
      if (!visibleCategories.has(event.category)) {
        return false;
      }

      // 2. Breaches filter
      if (breachesOnly && !event.orderBreachFlag) {
        return false;
      }

      // 3. Evidentiary weight filter
      if (weightFilter !== 'All' && event.evidentiaryWeight !== weightFilter) {
        return false;
      }

      // 4. Child filter
      if (childFilter !== 'All' && !event.childrenMentioned.includes(childFilter)) {
        return false;
      }

      // 5. Active month scrubber filter
      if (activeMonthFilter && !event.date.startsWith(activeMonthFilter)) {
        return false;
      }

      // 6. Search query
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchTitle = event.title.toLowerCase().includes(q);
        const matchDesc = event.description.toLowerCase().includes(q);
        const matchOrigin = event.sourceOrigin.toLowerCase().includes(q);
        const matchCite = event.citation.toLowerCase().includes(q);
        const matchBreach = event.breachedOrderNumber ? event.breachedOrderNumber.toLowerCase().includes(q) : false;
        if (!matchTitle && !matchDesc && !matchOrigin && !matchCite && !matchBreach) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time || '00:00'}`).getTime();
      const dateB = new Date(`${b.date}T${b.time || '00:00'}`).getTime();
      return sortAscending ? dateA - dateB : dateB - dateA;
    });
  }, [timeline, visibleCategories, breachesOnly, weightFilter, childFilter, activeMonthFilter, search, sortAscending]);

  // Extract all distinct months from all events for the scrubber
  const allMonths = useMemo(() => {
    const monthMap = new Map<string, { label: string; count: number; breachCount: number; categories: Set<DocumentCategory> }>();
    
    // Sort all events chronologically first
    const sorted = [...timeline].sort((a, b) => a.date.localeCompare(b.date));
    
    sorted.forEach(evt => {
      const ym = evt.date.slice(0, 7); // 'YYYY-MM'
      const dateObj = new Date(`${evt.date}T00:00:00`);
      const label = dateObj.toLocaleDateString('en-AU', { month: 'short', year: 'numeric' });
      
      const existing = monthMap.get(ym) || {
        label,
        count: 0,
        breachCount: 0,
        categories: new Set<DocumentCategory>()
      };
      
      existing.count++;
      if (evt.orderBreachFlag) existing.breachCount++;
      existing.categories.add(evt.category);
      monthMap.set(ym, existing);
    });

    return Array.from(monthMap.entries()).map(([key, data]) => ({
      key,
      ...data,
      categories: Array.from(data.categories)
    }));
  }, [timeline]);

  // Group filtered events by Month/Year for the visual spine layout
  const eventsByMonth = useMemo(() => {
    const groups: { monthKey: string; monthLabel: string; events: TimelineEvent[] }[] = [];
    const groupMap = new Map<string, TimelineEvent[]>();

    filteredTimeline.forEach(event => {
      const monthKey = event.date.slice(0, 7); // YYYY-MM
      if (!groupMap.has(monthKey)) {
        groupMap.set(monthKey, []);
      }
      groupMap.get(monthKey)!.push(event);
    });

    groupMap.forEach((events, monthKey) => {
      const dateObj = new Date(`${monthKey}-01T00:00:00`);
      const monthLabel = dateObj.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });
      groups.push({ monthKey, monthLabel, events });
    });

    return groups;
  }, [filteredTimeline]);

  // Group events by category for the swimlane layout
  const eventsByCategory = useMemo(() => {
    const groups: Record<DocumentCategory, TimelineEvent[]> = {
      'Direct Communication': [],
      'Medical': [],
      'Education': [],
      'Legal/Court': [],
      'Extracurricular': [],
      'Financial': [],
    };

    filteredTimeline.forEach(event => {
      if (groups[event.category]) {
        groups[event.category].push(event);
      }
    });

    return groups;
  }, [filteredTimeline]);

  // Add event handler
  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.title.trim()) return;

    const eventId = `EVT-${Date.now().toString().slice(-4)}`;
    const created: TimelineEvent = {
      id: eventId,
      date: newEvent.date,
      time: newEvent.time,
      title: newEvent.title,
      description: newEvent.description,
      category: newEvent.category,
      sourceOrigin: newEvent.sourceOrigin,
      evidentiaryWeight: newEvent.evidentiaryWeight,
      partiesInvolved: ['Benjamin Hawkins', 'Sue-Anne Hawkins'],
      childrenMentioned: newEvent.childrenMentioned,
      primaryDocId: documents[0]?.id,
      citation: `[${eventId}] ${newEvent.sourceOrigin}, ${newEvent.date}`,
      orderBreachFlag: newEvent.orderBreachFlag,
      breachedOrderNumber: newEvent.orderBreachFlag ? newEvent.breachedOrderNumber || 'Order 9.1' : undefined,
      breachSeverity: newEvent.orderBreachFlag ? newEvent.breachSeverity : undefined,
      responseLagHours: newEvent.responseLagHours > 0 ? Number(newEvent.responseLagHours) : undefined,
    };

    onAddEvent(created);
    setIsAddModalOpen(false);
  };

  // Export CSV function
  const exportCSV = () => {
    const headers = ['Date', 'Time', 'Title', 'Category', 'Source', 'Weight', 'Breach', 'Breached_Order', 'Lag_Hours', 'Citation'];
    const rows = filteredTimeline.map(e => [
      `"${e.date}"`,
      `"${e.time || ''}"`,
      `"${e.title.replace(/"/g, '""')}"`,
      `"${e.category}"`,
      `"${e.sourceOrigin.replace(/"/g, '""')}"`,
      `"${e.evidentiaryWeight}"`,
      `"${e.orderBreachFlag ? 'Yes' : 'No'}"`,
      `"${e.breachedOrderNumber ? e.breachedOrderNumber.replace(/"/g, '""') : ''}"`,
      `"${e.responseLagHours || ''}"`,
      `"${e.citation.replace(/"/g, '""')}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Case_4344_Visual_Timeline_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Summary statistics
  const filteredBreachCount = filteredTimeline.filter(e => e.orderBreachFlag).length;
  const filteredLagBreaches = filteredTimeline.filter(e => (e.responseLagHours || 0) > 42).length;
  const hiddenCategoriesCount = ALL_CATEGORIES.length - visibleCategories.size;
  const hiddenEventsCount = timeline.length - filteredTimeline.length;

  return (
    <div className="space-y-6 pb-16" id="visual-timeline-root">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500 text-slate-950 shadow-sm">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 font-serif flex items-center gap-2">
                <span>Visual Timeline of Evidentiary Events</span>
                <span className="text-xs font-sans font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                  Case 4344/2023
                </span>
              </h1>
              <p className="text-xs text-slate-500">
                Interactive chronological mapping of sworn records, communication logs, and court contraventions with live category filtering.
              </p>
            </div>
          </div>
        </div>

        {/* View Mode Switcher & Primary Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex items-center gap-1 text-xs">
            <button
              onClick={() => setViewMode('visual-spine')}
              className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
                viewMode === 'visual-spine'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              id="view-mode-visual-spine-btn"
              title="Vertical chronological spine with visual connectors and nodes"
            >
              <GitCommit className="w-3.5 h-3.5 text-amber-600" />
              <span>Visual Spine</span>
            </button>

            <button
              onClick={() => setViewMode('category-swimlanes')}
              className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
                viewMode === 'category-swimlanes'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              id="view-mode-category-swimlanes-btn"
              title="Separate horizontal lanes for each category"
            >
              <Columns className="w-3.5 h-3.5 text-blue-600" />
              <span>Category Swimlanes</span>
            </button>

            <button
              onClick={() => setViewMode('compact-table')}
              className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
                viewMode === 'compact-table'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              id="view-mode-compact-table-btn"
              title="Detailed tabular ledger format"
            >
              <List className="w-3.5 h-3.5 text-purple-600" />
              <span>Compact Ledger</span>
            </button>
          </div>

          <button
            onClick={exportCSV}
            className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors"
            id="export-visual-timeline-btn"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors"
            id="log-timeline-event-btn"
          >
            <Plus className="w-4 h-4" />
            <span>Log Event</span>
          </button>
        </div>
      </div>

      {/* CORE FEATURE: Interactive Category Filter & Visibility Panel */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4" id="category-filter-matrix-panel">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-600" />
              <h2 className="text-sm font-bold text-slate-900 font-serif">
                Event Categories &mdash; Filter In / Out of View
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              Click any category card to filter it out of the timeline. Toggle visibility or isolate specific categories.
            </p>
          </div>

          {/* Bulk Category Actions */}
          <div className="flex items-center gap-2 text-xs flex-wrap">
            <span className="text-[11px] text-slate-400 mr-1">
              {visibleCategories.size} of {ALL_CATEGORIES.length} visible
            </span>
            <button
              onClick={showAllCategories}
              disabled={visibleCategories.size === ALL_CATEGORIES.length}
              className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium disabled:opacity-40 transition-colors"
              id="category-show-all-btn"
            >
              Show All
            </button>
            <button
              onClick={filterOutAllCategories}
              disabled={visibleCategories.size === 0}
              className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium disabled:opacity-40 transition-colors"
              id="category-hide-all-btn"
            >
              Hide All
            </button>
            <button
              onClick={invertCategoryVisibility}
              className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium transition-colors"
              id="category-invert-btn"
            >
              Invert
            </button>
          </div>
        </div>

        {/* Category Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3" id="category-filter-grid">
          {ALL_CATEGORIES.map(cat => {
            const config = CATEGORY_CONFIGS[cat];
            const Icon = config.icon;
            const isVisible = visibleCategories.has(cat);
            const totalCount = categoryCounts[cat] || 0;

            return (
              <div
                key={cat}
                className={`relative rounded-xl border p-3 transition-all duration-150 flex flex-col justify-between select-none ${
                  isVisible
                    ? `bg-white ${config.borderColor} shadow-xs hover:shadow-md ring-1 ${config.ringColor}/30`
                    : 'bg-slate-50/80 border-dashed border-slate-300 opacity-60 hover:opacity-80'
                }`}
                id={`category-toggle-card-${cat.toLowerCase().replace(/[\/\s]/g, '-')}`}
              >
                <div>
                  {/* Top Bar with Icon, Count, and Visibility Toggle */}
                  <div className="flex items-start justify-between gap-1.5 mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${isVisible ? config.badgeBg : 'bg-slate-200'}`}>
                        <Icon className={`w-3.5 h-3.5 ${isVisible ? config.badgeText : 'text-slate-500'}`} />
                      </div>
                      <span className={`text-xs font-bold ${isVisible ? 'text-slate-900' : 'text-slate-500 line-through'}`}>
                        {totalCount} events
                      </span>
                    </div>

                    {/* Eye toggle button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCategoryVisibility(cat);
                      }}
                      className={`p-1 rounded-md transition-colors ${
                        isVisible
                          ? 'text-slate-700 hover:bg-slate-100'
                          : 'text-slate-400 hover:text-slate-600 bg-slate-200/60'
                      }`}
                      title={isVisible ? `Filter ${cat} out of view` : `Show ${cat} in view`}
                      id={`eye-toggle-${cat.toLowerCase().replace(/[\/\s]/g, '-')}`}
                    >
                      {isVisible ? (
                        <Eye className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </button>
                  </div>

                  {/* Category Title */}
                  <h3 className={`text-xs font-bold leading-tight ${isVisible ? 'text-slate-900' : 'text-slate-400'}`}>
                    {config.label}
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {config.description}
                  </p>
                </div>

                {/* Bottom Action Footer */}
                <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-slate-100 text-[10px]">
                  <button
                    onClick={() => toggleCategoryVisibility(cat)}
                    className={`font-semibold px-2 py-0.5 rounded transition-colors ${
                      isVisible
                        ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    }`}
                  >
                    {isVisible ? 'Filter Out' : 'Show in View'}
                  </button>

                  <button
                    onClick={() => isolateCategory(cat)}
                    className="text-slate-400 hover:text-indigo-600 font-medium px-1.5 py-0.5 rounded hover:bg-slate-100"
                    title={`Isolate ${cat} (hide all other categories)`}
                  >
                    Only
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Dynamic Filter Banner Alert if any category is filtered out */}
        {hiddenCategoriesCount > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900 animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <EyeOff className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>{hiddenCategoriesCount} {hiddenCategoriesCount === 1 ? 'category is' : 'categories are'} filtered out of view:</strong>{' '}
                {ALL_CATEGORIES.filter(c => !visibleCategories.has(c)).map(c => (
                  <span
                    key={c}
                    onClick={() => toggleCategoryVisibility(c)}
                    className="inline-flex items-center gap-1 mx-1 px-1.5 py-0.5 rounded bg-amber-100 hover:bg-amber-200 border border-amber-300 text-amber-900 cursor-pointer font-medium text-[11px]"
                    title="Click to restore this category to view"
                  >
                    <span>{CATEGORY_CONFIGS[c].label}</span>
                    <Plus className="w-2.5 h-2.5" />
                  </span>
                ))}
              </span>
            </div>

            <button
              onClick={showAllCategories}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs shrink-0 shadow-xs transition-colors"
            >
              Reset / Show All Categories
            </button>
          </div>
        )}
      </div>

      {/* Secondary Search & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search Box */}
          <div className="relative w-full md:flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search events, quotes, orders breached, citations, parties (e.g. 'St John', 'dental', 'Order 4.2')..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
              id="timeline-search-input"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Contraventions Only Toggle */}
          <button
            onClick={() => setBreachesOnly(!breachesOnly)}
            className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors flex items-center gap-1.5 shrink-0 ${
              breachesOnly 
                ? 'bg-rose-500 text-white border-rose-600 shadow-xs' 
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
            id="visual-timeline-breaches-toggle"
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>Contraventions Only ({filteredBreachCount})</span>
          </button>

          {/* Chronological Direction Toggle */}
          <button
            onClick={() => setSortAscending(!sortAscending)}
            className="px-3 py-2 rounded-lg text-xs font-semibold border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center gap-1.5 shrink-0 transition-colors"
            title="Toggle chronological order"
            id="sort-chronological-btn"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
            <span>{sortAscending ? 'Oldest First' : 'Newest First'}</span>
          </button>
        </div>

        {/* Evidentiary Weight & Child Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-400 font-medium">Evidentiary Weight:</span>
            {(['All', 'Sworn/Official', 'Third-Party Objective', 'Unverified Claim'] as const).map(w => (
              <button
                key={w}
                onClick={() => setWeightFilter(w)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  weightFilter === w 
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-xs' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {w}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-medium">Child Mentioned:</span>
              {(['All', 'Isabella', 'Mason'] as const).map(c => (
                <button
                  key={c}
                  onClick={() => setChildFilter(c)}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                    childFilter === c
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            <div className="hidden sm:flex items-center gap-1 border-l border-slate-200 pl-3">
              <button
                onClick={expandAllCards}
                className="text-[11px] text-slate-500 hover:text-slate-800 font-medium hover:underline"
              >
                Expand All
              </button>
              <span className="text-slate-300">&bull;</span>
              <button
                onClick={collapseAllCards}
                className="text-[11px] text-slate-500 hover:text-slate-800 font-medium hover:underline"
              >
                Collapse All
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Month Scrubber / Visual Density Mini-Map */}
      {allMonths.length > 1 && (
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span className="font-semibold text-slate-700 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-500" />
              <span>Chronological Month Navigator</span>
            </span>
            <span>
              {activeMonthFilter ? (
                <button
                  onClick={() => setActiveMonthFilter(null)}
                  className="text-amber-600 hover:underline font-medium text-[11px]"
                >
                  Clear Month Filter (Viewing All Months)
                </button>
              ) : (
                <span className="text-[11px] text-slate-400">Click a month pill to isolate</span>
              )}
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            <button
              onClick={() => setActiveMonthFilter(null)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-colors border ${
                activeMonthFilter === null
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              All Months ({timeline.length})
            </button>

            {allMonths.map(m => {
              const isSelected = activeMonthFilter === m.key;
              return (
                <button
                  key={m.key}
                  onClick={() => setActiveMonthFilter(isSelected ? null : m.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all border flex items-center gap-2 ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-xs font-bold'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span>{m.label}</span>
                  <span className={`px-1.5 py-0.2 rounded text-[10px] ${isSelected ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    {m.count}
                  </span>
                  
                  {/* Category color dots */}
                  <div className="flex items-center -space-x-1">
                    {m.categories.map(cat => (
                      <span
                        key={cat}
                        className={`w-2 h-2 rounded-full border border-white ${CATEGORY_CONFIGS[cat].dotColor}`}
                        title={cat}
                      />
                    ))}
                  </div>

                  {m.breachCount > 0 && (
                    <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" title={`${m.breachCount} Contraventions`} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Metrics Ribbon for Visible Events */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <div className="flex items-center gap-3">
          <span>
            Showing <strong className="text-slate-900">{filteredTimeline.length}</strong> of{' '}
            <strong className="text-slate-900">{timeline.length}</strong> events
          </span>
          {filteredBreachCount > 0 && (
            <span className="text-rose-600 font-semibold flex items-center gap-1">
              &bull; <AlertOctagon className="w-3.5 h-3.5" /> {filteredBreachCount} Contraventions In View
            </span>
          )}
          {filteredLagBreaches > 0 && (
            <span className="text-amber-600 font-semibold flex items-center gap-1">
              &bull; <Clock className="w-3.5 h-3.5" /> {filteredLagBreaches} Communication Lags (&gt;42h)
            </span>
          )}
        </div>
        <span className="font-mono text-[11px] text-slate-400">Case 4344/2023 Evidentiary Spine</span>
      </div>

      {/* Empty State when all events are filtered out */}
      {filteredTimeline.length === 0 && (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 space-y-4 shadow-sm" id="timeline-empty-state">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <EyeOff className="w-6 h-6" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-base font-bold text-slate-800 font-serif">No Timeline Events in Current View</h3>
            <p className="text-xs text-slate-500">
              All events have been filtered out of view by your active category, breach, or search selections.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              onClick={showAllCategories}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-colors shadow-xs"
            >
              Restore All Categories
            </button>
            {(search || breachesOnly || weightFilter !== 'All' || childFilter !== 'All' || activeMonthFilter) && (
              <button
                onClick={() => {
                  setSearch('');
                  setBreachesOnly(false);
                  setWeightFilter('All');
                  setChildFilter('All');
                  setActiveMonthFilter(null);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors"
              >
                Clear Other Filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 1: Visual Chronological Spine (Default) */}
      {/* ========================================================================= */}
      {viewMode === 'visual-spine' && filteredTimeline.length > 0 && (
        <div className="space-y-10" id="visual-timeline-spine-container">
          {eventsByMonth.map((group) => (
            <div key={group.monthKey} className="space-y-4">
              {/* Month Milestone Header */}
              <div className="sticky top-16 z-20 flex items-center gap-3 bg-slate-100/95 backdrop-blur-xs py-2">
                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900 text-white shadow-sm">
                  <Calendar className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold font-serif tracking-wide">{group.monthLabel}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                    {group.events.length} {group.events.length === 1 ? 'event' : 'events'}
                  </span>
                </div>
                <div className="h-px flex-1 bg-slate-300" />
              </div>

              {/* Spine Track with Connected Nodes */}
              <div className="relative pl-6 md:pl-10 space-y-6 before:absolute before:left-3 md:before:left-5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-300">
                {group.events.map((event) => {
                  const config = CATEGORY_CONFIGS[event.category];
                  const Icon = config.icon;
                  const isExpanded = expandedEventIds.has(event.id);
                  const linkedDoc = documents.find(d => d.id === event.primaryDocId);
                  const isContravention = event.orderBreachFlag;
                  const hasLag = (event.responseLagHours || 0) > 42;

                  return (
                    <div 
                      key={event.id}
                      className="relative group"
                      id={`timeline-node-${event.id}`}
                    >
                      {/* Timeline Node Pin on Spine */}
                      <div 
                        className={`absolute -left-6 md:-left-10 top-3.5 w-6 h-6 md:w-8 md:h-8 rounded-full border-2 flex items-center justify-center transition-transform group-hover:scale-110 shadow-xs z-10 ${
                          isContravention
                            ? 'bg-rose-500 border-rose-200 text-white ring-4 ring-rose-100 animate-pulse'
                            : `${config.dotColor} border-white text-white ring-3 ring-slate-100`
                        }`}
                        title={`${event.category} - ${event.date}`}
                      >
                        {isContravention ? (
                          <AlertOctagon className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" />
                        ) : (
                          <Icon className="w-3 h-3 md:w-4 md:h-4 text-white" />
                        )}
                      </div>

                      {/* Event Card */}
                      <div 
                        className={`bg-white rounded-2xl border transition-all duration-150 overflow-hidden shadow-xs hover:shadow-md ${
                          isContravention 
                            ? 'border-rose-300 bg-rose-50/10' 
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {/* Top Category Accent Line */}
                        <div className={`h-1 w-full ${config.accentBar}`} />

                        <div className="p-4 sm:p-5 space-y-3">
                          {/* Metadata Badges Row */}
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-1.5 text-xs">
                              {/* Date & Time */}
                              <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-md flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-500" />
                                <span>{event.date}</span>
                                {event.time && <span className="text-slate-500">&bull; {event.time}</span>}
                              </span>

                              {/* Category Badge with Color */}
                              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md flex items-center gap-1 border ${config.badgeBg} ${config.badgeText} ${config.borderColor}`}>
                                <Icon className="w-3 h-3" />
                                <span>{config.label}</span>
                              </span>

                              {/* Evidentiary Weight */}
                              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md border ${
                                event.evidentiaryWeight === 'Sworn/Official'
                                  ? 'bg-purple-50 text-purple-700 border-purple-200 font-semibold'
                                  : event.evidentiaryWeight === 'Third-Party Objective'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}>
                                {event.evidentiaryWeight}
                              </span>

                              {/* Children mentioned */}
                              {event.childrenMentioned.map(child => (
                                <span 
                                  key={child}
                                  className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200"
                                >
                                  {child}
                                </span>
                              ))}
                            </div>

                            {/* Citation Link & Copy */}
                            <div className="flex items-center gap-1.5">
                              {linkedDoc && (
                                <button
                                  onClick={() => onViewDocument(linkedDoc)}
                                  className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded transition-colors"
                                  title="View primary zero-hallucination source document"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  <span>{linkedDoc.annexureNumber || linkedDoc.id}</span>
                                </button>
                              )}

                              <button
                                onClick={() => handleCopyCitation(event.id, event.citation)}
                                className="p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100 transition-colors"
                                title="Copy citation string"
                              >
                                {copiedCitationId === event.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Contravention Alert Ribbon if Breach */}
                          {isContravention && (
                            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-rose-100/70 border border-rose-300 text-rose-950 text-xs">
                              <div className="flex items-center gap-2">
                                <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0" />
                                <div>
                                  <span className="font-bold">Family Court Contravention Flag:</span>{' '}
                                  <span className="font-semibold text-rose-900">{event.breachedOrderNumber || 'Order Contravention'}</span>
                                </div>
                              </div>
                              {event.breachSeverity && (
                                <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                                  event.breachSeverity === 'Severe' 
                                    ? 'bg-rose-600 text-white' 
                                    : event.breachSeverity === 'Moderate'
                                    ? 'bg-rose-200 text-rose-900'
                                    : 'bg-white text-rose-700 border border-rose-300'
                                }`}>
                                  {event.breachSeverity} Severity
                                </span>
                              )}
                            </div>
                          )}

                          {/* 42h Communication Lag Alert */}
                          {hasLag && (
                            <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-between gap-2 text-xs text-amber-900">
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span>
                                  <strong>Response Lag:</strong> {event.responseLagHours} hours (Exceeds 42-hour threshold under Order 9.1)
                                </span>
                              </div>
                              <span className="text-[10px] font-mono font-bold bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded">
                                +{((event.responseLagHours || 0) - 42).toFixed(1)}h Overdue
                              </span>
                            </div>
                          )}

                          {/* Event Title & Description */}
                          <div className="space-y-1">
                            <h3 className="text-sm font-bold text-slate-900 leading-snug">
                              {event.title}
                            </h3>
                            <p className="text-xs text-slate-700 leading-relaxed">
                              {event.description}
                            </p>
                          </div>

                          {/* Expandable Deep Fact & Citation Drawer */}
                          {isExpanded && (
                            <div className="pt-3 border-t border-slate-100 space-y-2.5 text-xs bg-slate-50/70 p-3 rounded-xl">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                                <div>
                                  <span className="text-slate-400 font-medium">Source Origin:</span>{' '}
                                  <span className="font-semibold text-slate-800">{event.sourceOrigin}</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 font-medium">Parties Involved:</span>{' '}
                                  <span className="text-slate-800">{event.partiesInvolved.join(', ')}</span>
                                </div>
                              </div>

                              <div>
                                <span className="text-slate-400 font-medium block mb-0.5">Court Citation String:</span>
                                <code className="block p-2 rounded bg-white border border-slate-200 text-[11px] font-mono text-slate-700 select-all">
                                  {event.citation}
                                </code>
                              </div>

                              {linkedDoc && (
                                <div className="p-2.5 bg-indigo-50/60 border border-indigo-100 rounded-lg space-y-1">
                                  <div className="flex items-center justify-between text-indigo-900 font-semibold text-[11px]">
                                    <span>Linked Evidence: {linkedDoc.title}</span>
                                    <button
                                      onClick={() => onViewDocument(linkedDoc)}
                                      className="text-indigo-600 hover:underline flex items-center gap-0.5"
                                    >
                                      <span>Open Source File</span>
                                      <ExternalLink className="w-3 h-3" />
                                    </button>
                                  </div>
                                  <p className="text-[11px] text-slate-600 italic">
                                    "{linkedDoc.excerpt}"
                                  </p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Bottom Card Footer */}
                          <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
                            <div className="flex items-center gap-2">
                              <span>Source: <strong className="text-slate-700">{event.sourceOrigin}</strong></span>
                              <span>&bull;</span>
                              <span>Parties: {event.partiesInvolved.length}</span>
                            </div>

                            <button
                              onClick={() => toggleCardExpansion(event.id)}
                              className="text-slate-500 hover:text-slate-800 font-semibold flex items-center gap-1 transition-colors"
                            >
                              <span>{isExpanded ? 'Less info' : 'Inspect details'}</span>
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: Category Swimlanes View */}
      {/* ========================================================================= */}
      {viewMode === 'category-swimlanes' && filteredTimeline.length > 0 && (
        <div className="space-y-6" id="visual-timeline-swimlanes-container">
          <p className="text-xs text-slate-500 px-1">
            Visual breakdown of timeline events by category swimlanes. When you filter out a category above, its lane is removed from view.
          </p>

          {ALL_CATEGORIES.filter(c => visibleCategories.has(c)).map(category => {
            const config = CATEGORY_CONFIGS[category];
            const Icon = config.icon;
            const events = eventsByCategory[category];

            return (
              <div 
                key={category}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs"
                id={`swimlane-${category.toLowerCase().replace(/[\/\s]/g, '-')}`}
              >
                {/* Swimlane Lane Header */}
                <div className={`p-4 border-b flex items-center justify-between ${config.lightBg} border-slate-200`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${config.badgeBg}`}>
                      <Icon className={`w-4 h-4 ${config.badgeText}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900 font-serif">{config.label}</h3>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${config.badgeBg} ${config.badgeText}`}>
                          {events.length} {events.length === 1 ? 'event' : 'events'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">{config.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleCategoryVisibility(category)}
                      className="px-2.5 py-1 rounded-lg border border-slate-300 hover:bg-white text-slate-600 hover:text-rose-700 text-xs font-medium flex items-center gap-1 transition-colors"
                      title={`Filter ${category} out of view`}
                    >
                      <EyeOff className="w-3 h-3" />
                      <span>Filter Out Lane</span>
                    </button>
                  </div>
                </div>

                {/* Swimlane Events Track */}
                <div className="p-4">
                  {events.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-3 text-center">
                      No events in this category match your secondary filters (search, contraventions, or child filters).
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {events.map((event) => {
                        const isContravention = event.orderBreachFlag;
                        const linkedDoc = documents.find(d => d.id === event.primaryDocId);

                        return (
                          <div 
                            key={event.id}
                            className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all hover:shadow-md ${
                              isContravention 
                                ? 'bg-rose-50/20 border-rose-300' 
                                : 'bg-slate-50/50 border-slate-200 hover:bg-white'
                            }`}
                          >
                            <div className="space-y-2">
                              <div className="flex items-center justify-between gap-1 text-[11px]">
                                <span className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                                  {event.date}
                                </span>
                                {isContravention && (
                                  <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold flex items-center gap-1 text-[10px]">
                                    <AlertOctagon className="w-3 h-3 text-rose-600" />
                                    <span>Contravention</span>
                                  </span>
                                )}
                              </div>

                              <h4 className="text-xs font-bold text-slate-900 line-clamp-2">
                                {event.title}
                              </h4>
                              <p className="text-[11px] text-slate-600 line-clamp-3 leading-relaxed">
                                {event.description}
                              </p>
                            </div>

                            <div className="pt-3 mt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px]">
                              <span className="text-slate-500 truncate max-w-[140px]">{event.sourceOrigin}</span>
                              {linkedDoc && (
                                <button
                                  onClick={() => onViewDocument(linkedDoc)}
                                  className="text-indigo-600 font-mono font-semibold hover:underline flex items-center gap-0.5"
                                >
                                  <span>{linkedDoc.annexureNumber || linkedDoc.id}</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 3: Compact Ledger View */}
      {/* ========================================================================= */}
      {viewMode === 'compact-table' && filteredTimeline.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs" id="visual-timeline-table-container">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Date / Time</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-4">Event Title & Summary</th>
                  <th className="py-3 px-3">Evidentiary Weight</th>
                  <th className="py-3 px-3">Contravention</th>
                  <th className="py-3 px-3">Source Origin</th>
                  <th className="py-3 px-4 text-right">Citation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTimeline.map((event) => {
                  const config = CATEGORY_CONFIGS[event.category];
                  const Icon = config.icon;
                  const isContravention = event.orderBreachFlag;
                  const linkedDoc = documents.find(d => d.id === event.primaryDocId);

                  return (
                    <tr 
                      key={event.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isContravention ? 'bg-rose-50/15' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-mono font-medium whitespace-nowrap text-slate-800">
                        <div>{event.date}</div>
                        {event.time && <div className="text-[10px] text-slate-400">{event.time}</div>}
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border ${config.badgeBg} ${config.badgeText} ${config.borderColor}`}>
                          <Icon className="w-2.5 h-2.5" />
                          <span>{event.category}</span>
                        </span>
                      </td>

                      <td className="py-3 px-4 max-w-sm">
                        <div className="font-bold text-slate-900">{event.title}</div>
                        <div className="text-[11px] text-slate-600 line-clamp-2 mt-0.5 leading-relaxed">{event.description}</div>
                        {event.responseLagHours && event.responseLagHours > 42 && (
                          <div className="text-[10px] text-amber-700 font-bold mt-1">
                            Lag: {event.responseLagHours}h (Breach of Order 9.1)
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded border ${
                          event.evidentiaryWeight === 'Sworn/Official'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : event.evidentiaryWeight === 'Third-Party Objective'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {event.evidentiaryWeight}
                        </span>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        {isContravention ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200">
                            <AlertOctagon className="w-3 h-3 text-rose-600" />
                            <span>{event.breachedOrderNumber || 'Order Breach'}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">&mdash;</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-slate-700 whitespace-nowrap text-[11px]">
                        {event.sourceOrigin}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {linkedDoc ? (
                          <button
                            onClick={() => onViewDocument(linkedDoc)}
                            className="inline-flex items-center gap-1 text-[10px] font-mono font-medium text-indigo-700 hover:text-indigo-900 bg-indigo-50 border border-indigo-200 px-2 py-1 rounded"
                          >
                            <span>{linkedDoc.annexureNumber || linkedDoc.id}</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </button>
                        ) : (
                          <span className="text-[10px] font-mono text-slate-400">{event.id}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add New Event Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 font-serif">Log New Evidentiary Event</h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Event Title</label>
                <input
                  type="text"
                  required
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  placeholder="e.g. Unilateral cancellation of dental appointment"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date of Event</label>
                  <input
                    type="date"
                    required
                    value={newEvent.date}
                    onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Time (Optional)</label>
                  <input
                    type="time"
                    value={newEvent.time}
                    onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={newEvent.category}
                    onChange={(e) => setNewEvent({ ...newEvent, category: e.target.value as DocumentCategory })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                  >
                    {ALL_CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Evidentiary Weight</label>
                  <select
                    value={newEvent.evidentiaryWeight}
                    onChange={(e) => setNewEvent({ ...newEvent, evidentiaryWeight: e.target.value as EvidentiaryWeight })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                  >
                    <option value="Third-Party Objective">Third-Party Objective</option>
                    <option value="Sworn/Official">Sworn/Official</option>
                    <option value="Unverified Claim">Unverified Claim</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Source Origin</label>
                <input
                  type="text"
                  required
                  value={newEvent.sourceOrigin}
                  onChange={(e) => setNewEvent({ ...newEvent, sourceOrigin: e.target.value })}
                  placeholder="e.g. Bassendean Primary School, Sue-Anne SMS, St John of God"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Factual Description</label>
                <textarea
                  rows={3}
                  required
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  placeholder="Detail exact facts, quotes, or timeline of what took place..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-400 focus:outline-none"
                />
              </div>

              {/* Breach toggle */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newEvent.orderBreachFlag}
                    onChange={(e) => setNewEvent({ ...newEvent, orderBreachFlag: e.target.checked })}
                    className="rounded text-amber-500 focus:ring-amber-400"
                  />
                  <span className="font-bold text-slate-800">Flags Contravention of Parenting Orders</span>
                </label>

                {newEvent.orderBreachFlag && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-0.5">Order Breached</label>
                      <input
                        type="text"
                        value={newEvent.breachedOrderNumber}
                        onChange={(e) => setNewEvent({ ...newEvent, breachedOrderNumber: e.target.value })}
                        placeholder="e.g. Order 4.2 or Order 9.1"
                        className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-0.5">Severity</label>
                      <select
                        value={newEvent.breachSeverity}
                        onChange={(e) => setNewEvent({ ...newEvent, breachSeverity: e.target.value as any })}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs bg-white"
                      >
                        <option value="Minor">Minor</option>
                        <option value="Moderate">Moderate</option>
                        <option value="Severe">Severe</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs"
                  id="submit-new-timeline-event-btn"
                >
                  Save to Timeline
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
