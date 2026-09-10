import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  CalendarDays, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  ChevronUp,
  AlertOctagon, 
  AlertTriangle, 
  Clock, 
  FileText, 
  Filter, 
  CheckCircle2, 
  Copy, 
  Check, 
  ArrowRight, 
  Sparkles, 
  ShieldAlert, 
  Eye, 
  TrendingUp, 
  Download, 
  X, 
  Layers, 
  RotateCcw, 
  Tag
} from 'lucide-react';
import { TimelineEvent, ParentingOrder, DocumentRecord, ParentingOrderCategory } from '../types';
import { BreachSummaryReportModal } from './BreachSummaryReportModal';

export interface OrderCategoryOption {
  id: ParentingOrderCategory;
  name: string;
  orderClauses: string;
  description: string;
  badgeBg: string;
  badgeText: string;
  borderCol: string;
  dotColor: string;
}

export const PARENTING_ORDER_CATEGORIES: OrderCategoryOption[] = [
  {
    id: 'Communication',
    name: 'Communication',
    orderClauses: 'Order 9.1',
    description: '42h response mandate, email lags & SMS blackouts',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-800',
    borderCol: 'border-amber-200',
    dotColor: 'bg-amber-500',
  },
  {
    id: 'Pick-up/Drop-off',
    name: 'Pick-up/Drop-off',
    orderClauses: 'Order 4.2 & 4.1',
    description: 'Care schedule, Friday school handovers & withholding',
    badgeBg: 'bg-rose-50',
    badgeText: 'text-rose-800',
    borderCol: 'border-rose-200',
    dotColor: 'bg-rose-500',
  },
  {
    id: 'Financial',
    name: 'Financial',
    orderClauses: 'Order 10.1 & Levies',
    description: 'Extraordinary expenses, school levies, uniforms & orthodontic quotes',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-800',
    borderCol: 'border-emerald-200',
    dotColor: 'bg-emerald-500',
  },
  {
    id: 'Medical/Health',
    name: 'Medical/Health',
    orderClauses: 'Order 5.1',
    description: '24h emergency hospital notice, prescriptions & clinical care',
    badgeBg: 'bg-purple-50',
    badgeText: 'text-purple-800',
    borderCol: 'border-purple-200',
    dotColor: 'bg-purple-500',
  },
  {
    id: 'Education',
    name: 'Education',
    orderClauses: 'Order 7.3',
    description: 'School attendance records, unexcused absences & teacher conferences',
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-800',
    borderCol: 'border-blue-200',
    dotColor: 'bg-blue-500',
  },
  {
    id: 'Non-Disparagement',
    name: 'Non-Disparagement',
    orderClauses: 'Order 11.2',
    description: 'Child denigration at school gate & social media',
    badgeBg: 'bg-red-50',
    badgeText: 'text-red-800',
    borderCol: 'border-red-200',
    dotColor: 'bg-red-500',
  },
  {
    id: 'Travel/Passports',
    name: 'Travel/Passports',
    orderClauses: 'Order 13.1',
    description: '28-day notice requirement for regional & interstate trips',
    badgeBg: 'bg-teal-50',
    badgeText: 'text-teal-800',
    borderCol: 'border-teal-200',
    dotColor: 'bg-teal-500',
  },
];

export const getBreachCategories = (breach: TimelineEvent): ParentingOrderCategory[] => {
  const cats = new Set<ParentingOrderCategory>();
  const ord = (breach.breachedOrderNumber || '').toLowerCase();
  const desc = ((breach.title || '') + ' ' + (breach.description || '')).toLowerCase();

  // Communication (Order 9.1 / 42h / email / response lag / blackout)
  if (
    ord.includes('9.1') || 
    desc.includes('communication') || 
    desc.includes('lag') || 
    desc.includes('blackout') || 
    desc.includes('email') || 
    (breach.responseLagHours && breach.responseLagHours > 42)
  ) {
    cats.add('Communication');
  }

  // Pick-up/Drop-off (Order 4.2 / care schedule / changeover / handover / withholding / pickup)
  if (
    ord.includes('4.2') || 
    desc.includes('changeover') || 
    desc.includes('handover') || 
    desc.includes('pickup') || 
    desc.includes('drop-off') || 
    desc.includes('withhold') || 
    desc.includes('handback')
  ) {
    cats.add('Pick-up/Drop-off');
  }

  // Financial (Financial contributions, levies, uniforms, camp fees, dental quotes, child support comments)
  if (
    ord.includes('10.1') ||
    breach.category === 'Financial' ||
    desc.includes('financial') ||
    desc.includes('levy') ||
    desc.includes('levies') ||
    desc.includes('uniform') ||
    desc.includes('invoice') ||
    desc.includes('camp booking') ||
    desc.includes('orthodontic') ||
    desc.includes('dental care') ||
    desc.includes('refusing to contribute') ||
    desc.includes('child support')
  ) {
    cats.add('Financial');
  }

  // Medical/Health (Order 5.1 / hospital / medical / asthma / clinic)
  if (
    ord.includes('5.1') || 
    breach.category === 'Medical' || 
    desc.includes('hospital') || 
    desc.includes('medical') || 
    desc.includes('asthma') || 
    desc.includes('dental') || 
    desc.includes('admission')
  ) {
    cats.add('Medical/Health');
  }

  // Education (Order 7.3 / school / unexcused absence / conference)
  if (
    ord.includes('7.3') || 
    breach.category === 'Education' || 
    desc.includes('unexcused absences') || 
    desc.includes('absence') || 
    desc.includes('parent-teacher')
  ) {
    cats.add('Education');
  }

  // Non-Disparagement (Order 11.2 / denigration / abuse / disparag)
  if (
    ord.includes('11.2') || 
    desc.includes('denigrat') || 
    desc.includes('disparag') || 
    desc.includes('verbal abuse') || 
    desc.includes('yelled abuse')
  ) {
    cats.add('Non-Disparagement');
  }

  // Travel/Passports (Order 13.1 / travel / regional trip)
  if (
    ord.includes('13.1') || 
    desc.includes('travel') || 
    desc.includes('regional trip')
  ) {
    cats.add('Travel/Passports');
  }

  // Fallback
  if (cats.size === 0) {
    if (ord.includes('4.1')) cats.add('Pick-up/Drop-off');
    else cats.add('Communication');
  }

  return Array.from(cats);
};

interface BreachTimelineProps {
  timeline: TimelineEvent[];
  orders: ParentingOrder[];
  documents: DocumentRecord[];
  onViewDocument: (doc: DocumentRecord) => void;
  onNavigateToCompliance?: () => void;
  onNavigateToAffidavit?: () => void;
}

export const BreachTimeline: React.FC<BreachTimelineProps> = ({
  timeline,
  orders,
  documents,
  onViewDocument,
  onNavigateToCompliance,
  onNavigateToAffidavit,
}) => {
  // Available months range: Nov 2023 to Sep 2024
  const monthOptions = [
    { year: 2023, month: 10, label: 'Nov 2023', note: 'Interim Orders Issued' },
    { year: 2023, month: 11, label: 'Dec 2023', note: 'Xmas Blackout & Handover Delay' },
    { year: 2024, month: 0, label: 'Jan 2024', note: 'Unilateral Camp Enrolment' },
    { year: 2024, month: 1, label: 'Feb 2024', note: 'Gate Denigration & Uniform Lag' },
    { year: 2024, month: 2, label: 'Mar 2024', note: 'Unexcused Absences & Easter' },
    { year: 2024, month: 3, label: 'Apr 2024', note: 'Care Schedule Dispute' },
    { year: 2024, month: 4, label: 'May 2024', note: 'Dental Lag & Communication Delay' },
    { year: 2024, month: 5, label: 'Jun 2024', note: 'School Gate Altercation' },
    { year: 2024, month: 6, label: 'Jul 2024', note: 'Medical Notice Dispute' },
    { year: 2024, month: 7, label: 'Aug 2024', note: 'Regional Trip & Social Media' },
    { year: 2024, month: 8, label: 'Sep 2024', note: 'Pre-Trial Preparation' },
  ];

  // Default to July 2024 (high-impact breach month with Hospital emergency & holiday handover)
  const [currentYear, setCurrentYear] = useState<number>(2024);
  const [currentMonth, setCurrentMonth] = useState<number>(6); // 6 = July (0-indexed)

  // Filters
  const [filterOrder, setFilterOrder] = useState<string>('ALL');
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [filterChild, setFilterChild] = useState<string>('ALL');
  const [showScheduledChangeovers, setShowScheduledChangeovers] = useState<boolean>(true);

  // Multi-Select Parenting Order Categories Filter
  const ALL_CATEGORY_IDS = useMemo<ParentingOrderCategory[]>(() => PARENTING_ORDER_CATEGORIES.map(c => c.id), []);
  const [selectedCategories, setSelectedCategories] = useState<ParentingOrderCategory[]>(ALL_CATEGORY_IDS);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState<boolean>(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  // Close category dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setIsCategoryDropdownOpen(false);
      }
    };
    if (isCategoryDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCategoryDropdownOpen]);

  // Category Toggle Actions
  const handleToggleCategory = (catId: ParentingOrderCategory) => {
    setSelectedCategories(prev => {
      if (prev.includes(catId)) {
        return prev.filter(id => id !== catId);
      } else {
        return [...prev, catId];
      }
    });
  };

  const handleSelectAllCategories = () => {
    setSelectedCategories(ALL_CATEGORY_IDS);
  };

  const handleClearAllCategories = () => {
    setSelectedCategories([]);
  };

  // Active selected day (YYYY-MM-DD)
  const [selectedDay, setSelectedDay] = useState<string>('2024-07-04');

  // Active Pattern Highlight Filter (null or pattern id)
  const [activePatternFilter, setActivePatternFilter] = useState<string | null>(null);

  // Court Schedule Export Modal state
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isBreachReportModalOpen, setIsBreachReportModalOpen] = useState<boolean>(false);
  const [copiedSchedule, setCopiedSchedule] = useState<boolean>(false);

  // All breaches across the case
  const allBreaches = useMemo(() => {
    return timeline.filter(e => e.orderBreachFlag);
  }, [timeline]);

  // Live pattern counts, derived from actual breach data (never hardcoded)
  const patternCounts = useMemo(() => {
    const fridayChangeovers = allBreaches.filter(b => new Date(b.date).getDay() === 5 || b.breachedOrderNumber?.includes('Order 4.2')).length;
    const communicationBlackouts = allBreaches.filter(b => b.breachedOrderNumber?.includes('Order 9.1')).length;
    const publicDenigration = allBreaches.filter(b => b.breachedOrderNumber?.includes('Order 11.2')).length;
    const medicalTravelEvasion = allBreaches.filter(b => b.breachedOrderNumber?.includes('Order 5.1') || b.breachedOrderNumber?.includes('Order 13.1')).length;
    return { fridayChangeovers, communicationBlackouts, publicDenigration, medicalTravelEvasion };
  }, [allBreaches]);

  // Category Breach Counts (across all breaches)
  const categoryBreachCounts = useMemo(() => {
    const counts: Record<ParentingOrderCategory, number> = {
      'Communication': 0,
      'Pick-up/Drop-off': 0,
      'Financial': 0,
      'Medical/Health': 0,
      'Education': 0,
      'Non-Disparagement': 0,
      'Travel/Passports': 0,
    };
    allBreaches.forEach(b => {
      const cats = getBreachCategories(b);
      cats.forEach(c => {
        if (counts[c] !== undefined) {
          counts[c]++;
        }
      });
    });
    return counts;
  }, [allBreaches]);

  // Alternate Friday changeovers base reference:
  // Friday 17 Nov 2023 was the first post-orders alternate Friday (Order 4.2)
  const isScheduledChangeoverFriday = (year: number, month: number, day: number): boolean => {
    const date = new Date(year, month, day);
    if (date.getDay() !== 5) return false; // Must be Friday
    const anchorDate = new Date(2023, 10, 17); // 17 Nov 2023
    const diffDays = Math.round((date.getTime() - anchorDate.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays % 14 === 0;
  };

  // Filtered breaches
  const filteredBreaches = useMemo(() => {
    return allBreaches.filter(b => {
      // Multi-Select Category Filter
      const breachCats = getBreachCategories(b);
      const matchesCategory = breachCats.some(cat => selectedCategories.includes(cat));
      if (!matchesCategory) return false;

      // Order filter
      if (filterOrder !== 'ALL') {
        if (!b.breachedOrderNumber?.toLowerCase().includes(filterOrder.toLowerCase())) {
          return false;
        }
      }
      // Severity filter
      if (filterSeverity !== 'ALL') {
        if (b.breachSeverity !== filterSeverity) return false;
      }
      // Child filter
      if (filterChild !== 'ALL') {
        if (!b.childrenMentioned.includes(filterChild as any)) return false;
      }
      // Pattern Filter
      if (activePatternFilter === 'friday-changeovers') {
        const d = new Date(b.date);
        return d.getDay() === 5 || b.breachedOrderNumber?.includes('Order 4.2');
      }
      if (activePatternFilter === 'communication-blackouts') {
        return b.breachedOrderNumber?.includes('Order 9.1');
      }
      if (activePatternFilter === 'public-denigration') {
        return b.breachedOrderNumber?.includes('Order 11.2');
      }
      if (activePatternFilter === 'medical-travel-evasion') {
        return b.breachedOrderNumber?.includes('Order 5.1') || b.breachedOrderNumber?.includes('Order 13.1');
      }
      return true;
    });
  }, [allBreaches, selectedCategories, filterOrder, filterSeverity, filterChild, activePatternFilter]);

  // Calendar Math for Current Month
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = (new Date(currentYear, currentMonth, 1).getDay() + 6) % 7; // Monday = 0
  const monthName = new Date(currentYear, currentMonth, 1).toLocaleString('default', { month: 'long' });

  // Map breaches for current month by date
  const monthBreachesMap = useMemo(() => {
    const map = new Map<string, TimelineEvent[]>();
    filteredBreaches.forEach(b => {
      const [y, m] = b.date.split('-').map(Number);
      if (y === currentYear && m - 1 === currentMonth) {
        const list = map.get(b.date) || [];
        list.push(b);
        map.set(b.date, list);
      }
    });
    return map;
  }, [filteredBreaches, currentYear, currentMonth]);

  // Breaches in current month count
  const currentMonthBreachCount = useMemo(() => {
    let count = 0;
    monthBreachesMap.forEach(arr => {
      count += arr.length;
    });
    return count;
  }, [monthBreachesMap]);

  // Selected Day Breaches
  const selectedDayBreaches = useMemo(() => {
    return filteredBreaches.filter(b => b.date === selectedDay);
  }, [filteredBreaches, selectedDay]);

  // Navigation handlers
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const handleQuickMonthSelect = (yr: number, mo: number) => {
    setCurrentYear(yr);
    setCurrentMonth(mo);
    // Automatically select the first breach day in that month if available
    const firstBreach = filteredBreaches.find(b => {
      const [y, m] = b.date.split('-').map(Number);
      return y === yr && m - 1 === mo;
    });
    if (firstBreach) {
      setSelectedDay(firstBreach.date);
    } else {
      setSelectedDay(`${yr}-${String(mo + 1).padStart(2, '0')}-01`);
    }
  };

  // Day of week distribution analytics
  const dayOfWeekStats = useMemo(() => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const counts = [0, 0, 0, 0, 0, 0, 0];
    allBreaches.forEach(b => {
      const d = new Date(b.date);
      counts[d.getDay()]++;
    });
    return days.map((day, idx) => ({
      day,
      count: counts[idx],
      percentage: Math.round((counts[idx] / (allBreaches.length || 1)) * 100),
    }));
  }, [allBreaches]);

  // Breaches by Order breakdown
  const orderBreakdownStats = useMemo(() => {
    const counts: Record<string, number> = {
      'Order 4.2': 0,
      'Order 9.1': 0,
      'Order 11.2': 0,
      'Order 10.1': 0,
      'Order 5.1': 0,
      'Order 13.1': 0,
      'Order 4.1': 0,
      'Order 7.3': 0,
    };
    allBreaches.forEach(b => {
      const ord = b.breachedOrderNumber || '';
      if (ord.includes('Order 4.2')) counts['Order 4.2']++;
      if (ord.includes('Order 9.1')) counts['Order 9.1']++;
      if (ord.includes('Order 11.2')) counts['Order 11.2']++;
      if (ord.includes('Order 10.1') || b.category === 'Financial') counts['Order 10.1']++;
      if (ord.includes('Order 5.1')) counts['Order 5.1']++;
      if (ord.includes('Order 13.1')) counts['Order 13.1']++;
      if (ord.includes('Order 4.1')) counts['Order 4.1']++;
      if (ord.includes('Order 7.3')) counts['Order 7.3']++;
    });
    return counts;
  }, [allBreaches]);

  // Copy Form 2 Schedule to Clipboard
  const handleCopySchedule = () => {
    const rows = allBreaches.map((b, i) => {
      return `${i + 1}. Date: ${b.date} ${b.time || ''} | Order: ${b.breachedOrderNumber || 'Order'} | Severity: ${b.breachSeverity || 'Moderate'} | Summary: ${b.title} - ${b.description} | Evidence: ${b.citation}`;
    }).join('\n\n');

    const header = `IN THE FAMILY COURT OF WESTERN AUSTRALIA (PERTH)\nCASE 4344/2023 - HAWKINS v HAWKINS\nSCHEDULE OF ORDER CONTRAVENTIONS (FORM 2 ANNEXURE)\nTotal Breaches Logged: ${allBreaches.length}\n${'='.repeat(70)}\n\n`;

    navigator.clipboard.writeText(header + rows);
    setCopiedSchedule(true);
    setTimeout(() => setCopiedSchedule(false), 2500);
  };

  return (
    <div className="space-y-6 pb-12" id="breach-timeline-container">
      {/* Header & Context Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 font-serif flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-rose-600" />
              <span>Breach Timeline & Monthly Calendar Visualizer</span>
            </h1>
            <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-[11px] font-bold rounded-full border border-rose-200">
              {allBreaches.length} Documented Breaches
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Systematic monthly mapping of order compliance breaches under <em>Family Law Act 1975</em> Part VII Division 13A. Identify recurring behavioral cycles prior to mediation or contravention hearings.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start lg:self-auto flex-wrap">
          <button
            onClick={() => setIsBreachReportModalOpen(true)}
            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-sm transition-colors border border-rose-700"
            id="open-breach-summary-report-btn"
          >
            <FileText className="w-3.5 h-3.5 text-amber-300" />
            <span>Breach Summary Report</span>
          </button>

          <button
            onClick={() => setIsExportModalOpen(true)}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs rounded-lg flex items-center gap-1.5 shadow-sm transition-colors"
            id="open-schedule-export-btn"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>Court Breach Schedule (Form 2)</span>
          </button>

          {onNavigateToCompliance && (
            <button
              onClick={onNavigateToCompliance}
              className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-medium text-xs rounded-lg flex items-center gap-1.5 shadow-sm transition-colors"
              id="goto-compliance-matrix-btn"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
              <span>Order Matrix</span>
            </button>
          )}

          {onNavigateToAffidavit && (
            <button
              onClick={onNavigateToAffidavit}
              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-lg flex items-center gap-1.5 shadow-sm transition-colors"
              id="goto-affidavit-drafter-btn"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Draft Affidavit</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI & High-Level Pattern Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-slate-500 text-xs font-medium block">Total Breaches</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-rose-600">{allBreaches.length}</span>
            <span className="text-[11px] text-slate-500">Documented</span>
          </div>
          <span className="text-[11px] text-rose-600 font-medium mt-0.5 block">FLA Div 13A Contraventions</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-slate-500 text-xs font-medium block">Peak Non-Compliance Day</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-amber-600">Friday</span>
            <span className="text-[11px] text-amber-600 font-semibold">(40%)</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">14:00-15:30 Handover Window</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-slate-500 text-xs font-medium block">Order 9.1 Avg Comm Lag</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-purple-700">89.0h</span>
            <span className="text-[11px] text-purple-600 font-semibold">Max: 126h</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Court Threshold: 42.0h</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-slate-500 text-xs font-medium block">Care Schedule Disrupted</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-slate-800">9 Days</span>
            <span className="text-[11px] text-slate-500">Total Lost</span>
          </div>
          <span className="text-[11px] text-emerald-600 font-medium mt-0.5 block">s 70NEB Make-up Claim</span>
        </div>
      </div>

      {/* Systemic Pattern Recognition Intelligence Panel */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden" id="pattern-recognition-panel">
        <div className="p-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-bold tracking-tight">Recurring Non-Compliance Patterns Engine</h2>
            <span className="text-xs text-slate-400 hidden md:inline">• Click pattern to isolate on monthly calendar</span>
          </div>
          {activePatternFilter && (
            <button
              onClick={() => setActivePatternFilter(null)}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-amber-300 px-2.5 py-1 rounded flex items-center gap-1 transition-colors self-start sm:self-auto"
            >
              <X className="w-3 h-3" />
              <span>Clear Pattern Filter</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-100 p-2">
          {/* Pattern 1 */}
          <button
            onClick={() => {
              setActivePatternFilter(activePatternFilter === 'friday-changeovers' ? null : 'friday-changeovers');
              setCurrentYear(2024);
              setCurrentMonth(3); // Jump to April 2024
              setSelectedDay('2024-04-12');
            }}
            className={`p-3 text-left rounded-lg transition-all ${
              activePatternFilter === 'friday-changeovers'
                ? 'bg-rose-50 ring-2 ring-rose-500/80 shadow-sm'
                : 'hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="px-2 py-0.5 bg-rose-100 text-rose-800 font-bold text-[10px] rounded">
                Pattern A (Order 4.2)
              </span>
              <span className="text-[11px] font-bold text-rose-700">{patternCounts.fridayChangeovers} Incidents</span>
            </div>
            <h3 className="text-xs font-bold text-slate-900">Friday 15:30 Pre-Weekend Cut-Off</h3>
            <p className="text-[11px] text-slate-600 mt-1 line-clamp-2">
              Mother signs children out 30-45 mins before the 15:30 school bell, taking them on unannounced trips or declaring sudden uncertified colds.
            </p>
            <div className="mt-2 text-[10px] text-rose-700 font-semibold flex items-center gap-1">
              <span>Isolate Friday Changeovers</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </button>

          {/* Pattern 2 */}
          <button
            onClick={() => {
              setActivePatternFilter(activePatternFilter === 'communication-blackouts' ? null : 'communication-blackouts');
              setCurrentYear(2024);
              setCurrentMonth(4); // Jump to May 2024
              setSelectedDay('2024-05-07');
            }}
            className={`p-3 text-left rounded-lg transition-all ${
              activePatternFilter === 'communication-blackouts'
                ? 'bg-amber-50 ring-2 ring-amber-500/80 shadow-sm'
                : 'hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold text-[10px] rounded">
                Pattern B (Order 9.1)
              </span>
              <span className="text-[11px] font-bold text-amber-700">{patternCounts.communicationBlackouts} Incidents</span>
            </div>
            <h3 className="text-xs font-bold text-slate-900">Strategic 42h Comm Blackouts</h3>
            <p className="text-[11px] text-slate-600 mt-1 line-clamp-2">
              Communication delays (68h to 126h) cluster specifically when financial sharing (dental quote, levies) or holiday schedule agreements are requested.
            </p>
            <div className="mt-2 text-[10px] text-amber-700 font-semibold flex items-center gap-1">
              <span>Isolate Email Blackouts</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </button>

          {/* Pattern 3 */}
          <button
            onClick={() => {
              setActivePatternFilter(activePatternFilter === 'public-denigration' ? null : 'public-denigration');
              setCurrentYear(2024);
              setCurrentMonth(4); // Jump to May 2024
              setSelectedDay('2024-05-19');
            }}
            className={`p-3 text-left rounded-lg transition-all ${
              activePatternFilter === 'public-denigration'
                ? 'bg-indigo-50 ring-2 ring-indigo-500/80 shadow-sm'
                : 'hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 font-bold text-[10px] rounded">
                Pattern C (Order 11.2)
              </span>
              <span className="text-[11px] font-bold text-indigo-700">{patternCounts.publicDenigration} Incidents</span>
            </div>
            <h3 className="text-xs font-bold text-slate-900">Extracurricular Public Denigration</h3>
            <p className="text-[11px] text-slate-600 mt-1 line-clamp-2">
              Verbal abuse and social media disparagement documented at school gate handovers and in front of Mason and Isabella.
            </p>
            <div className="mt-2 text-[10px] text-indigo-700 font-semibold flex items-center gap-1">
              <span>Isolate Denigration Events</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </button>

          {/* Pattern 4 */}
          <button
            onClick={() => {
              setActivePatternFilter(activePatternFilter === 'medical-travel-evasion' ? null : 'medical-travel-evasion');
              setCurrentYear(2024);
              setCurrentMonth(6); // Jump to July 2024
              setSelectedDay('2024-07-04');
            }}
            className={`p-3 text-left rounded-lg transition-all ${
              activePatternFilter === 'medical-travel-evasion'
                ? 'bg-purple-50 ring-2 ring-purple-500/80 shadow-sm'
                : 'hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="px-2 py-0.5 bg-purple-100 text-purple-800 font-bold text-[10px] rounded">
                Pattern D (Order 5.1 & 13.1)
              </span>
              <span className="text-[11px] font-bold text-purple-700">{patternCounts.medicalTravelEvasion} Incidents</span>
            </div>
            <h3 className="text-xs font-bold text-slate-900">Medical & Regional Travel Evasion</h3>
            <p className="text-[11px] text-slate-600 mt-1 line-clamp-2">
              Concealing hospital emergency admissions and booking regional trips without mandatory 28-day notice.
            </p>
            <div className="mt-2 text-[10px] text-purple-700 font-semibold flex items-center gap-1">
              <span>Isolate Medical/Travel</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </button>
        </div>
      </div>

      {/* Main Interactive Calendar Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 8 Cols: Calendar Controls & Monthly Grid */}
        <div className="lg:col-span-8 space-y-4">
          {/* Calendar Header & Month Navigation */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <button
                    onClick={handlePrevMonth}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors"
                    title="Previous Month"
                    id="prev-month-btn"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleNextMonth}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors"
                    title="Next Month"
                    id="next-month-btn"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <h2 className="text-base font-bold text-slate-900 font-serif">
                    {monthName} {currentYear}
                  </h2>
                  <span className="text-xs text-slate-500">
                    {currentMonthBreachCount === 0 
                      ? 'No breaches registered in this month' 
                      : `${currentMonthBreachCount} order contravention${currentMonthBreachCount > 1 ? 's' : ''} logged`}
                  </span>
                </div>
              </div>

              {/* Toggle Scheduled Friday Changeovers */}
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-medium text-slate-600">
                <input
                  type="checkbox"
                  checked={showScheduledChangeovers}
                  onChange={(e) => setShowScheduledChangeovers(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                />
                <span>Show Scheduled Friday Changeovers</span>
              </label>
            </div>

            {/* Quick Month Jump Pills */}
            <div className="pt-3 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
              <span className="text-[11px] font-medium text-slate-400 shrink-0 mr-1">Case Months:</span>
              {monthOptions.map((opt) => {
                const isActive = opt.year === currentYear && opt.month === currentMonth;
                // Count breaches in this month
                const count = filteredBreaches.filter(b => {
                  const [y, m] = b.date.split('-').map(Number);
                  return y === opt.year && m - 1 === opt.month;
                }).length;

                return (
                  <button
                    key={`${opt.year}-${opt.month}`}
                    onClick={() => handleQuickMonthSelect(opt.year, opt.month)}
                    className={`px-2.5 py-1 rounded-md text-xs whitespace-nowrap font-medium transition-all shrink-0 flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-sm'
                        : count > 0
                        ? 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {count > 0 && (
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                        isActive ? 'bg-rose-500 text-white' : 'bg-rose-200 text-rose-900'
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Filter Toolbar */}
            <div className="mt-3 pt-3 border-t border-slate-100 space-y-2 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 text-slate-500 font-medium shrink-0">
                  <Filter className="w-3.5 h-3.5" />
                  <span>Filters:</span>
                </div>

                {/* Multi-Select Parenting Order Category Dropdown */}
                <div className="relative" ref={categoryDropdownRef} id="category-multiselect-dropdown-container">
                  <button
                    type="button"
                    onClick={() => setIsCategoryDropdownOpen(prev => !prev)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all shadow-2xs ${
                      isCategoryDropdownOpen
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-900 ring-2 ring-indigo-500/20'
                        : selectedCategories.length < ALL_CATEGORY_IDS.length
                        ? 'bg-indigo-50/80 border-indigo-200 text-indigo-900 hover:bg-indigo-100/70'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                    id="order-category-multiselect-button"
                    aria-expanded={isCategoryDropdownOpen}
                    title="Filter calendar by specific parenting order categories"
                  >
                    <Layers className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Categories:</span>
                    {selectedCategories.length === ALL_CATEGORY_IDS.length ? (
                      <span className="px-1.5 py-0.2 bg-slate-100 text-slate-700 text-[10px] font-bold rounded">
                        All ({ALL_CATEGORY_IDS.length})
                      </span>
                    ) : selectedCategories.length === 0 ? (
                      <span className="px-1.5 py-0.2 bg-rose-100 text-rose-800 text-[10px] font-bold rounded">
                        None (0)
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.2 bg-indigo-600 text-white text-[10px] font-bold rounded">
                        {selectedCategories.length} of {ALL_CATEGORY_IDS.length}
                      </span>
                    )}
                    {isCategoryDropdownOpen ? (
                      <ChevronUp className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
                    )}
                  </button>

                  {/* Dropdown Popover */}
                  {isCategoryDropdownOpen && (
                    <div 
                      className="absolute left-0 top-full mt-1.5 z-40 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200 p-3 space-y-2.5 animate-in fade-in-50 zoom-in-95 duration-100"
                      id="category-multiselect-popover"
                    >
                      {/* Popover Header */}
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Parenting Order Categories</span>
                          </h4>
                          <span className="text-[10px] text-slate-500">Filter calendar breaches by order topic</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={handleSelectAllCategories}
                            className="px-2 py-0.5 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded transition-colors"
                          >
                            Select All
                          </button>
                          <span className="text-slate-200">•</span>
                          <button
                            type="button"
                            onClick={handleClearAllCategories}
                            className="px-2 py-0.5 text-[10px] font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          >
                            Clear
                          </button>
                        </div>
                      </div>

                      {/* Quick Filter Presets */}
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 space-y-1.5">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                          Quick Presets:
                        </span>
                        <div className="flex flex-wrap items-center gap-1 text-[11px]">
                          <button
                            type="button"
                            onClick={() => setSelectedCategories(['Communication', 'Pick-up/Drop-off', 'Financial'])}
                            className="px-2 py-0.5 bg-white hover:bg-slate-100 border border-slate-200 rounded text-[10px] font-semibold text-slate-700 transition-colors shadow-2xs"
                            title="Communication + Pick-up/Drop-off + Financial"
                          >
                            Core 3 (Comm, Handover, Financial)
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedCategories(['Communication'])}
                            className="px-2 py-0.5 bg-white hover:bg-slate-100 border border-slate-200 rounded text-[10px] font-semibold text-slate-700 transition-colors shadow-2xs"
                          >
                            Comm Only
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedCategories(['Pick-up/Drop-off'])}
                            className="px-2 py-0.5 bg-white hover:bg-slate-100 border border-slate-200 rounded text-[10px] font-semibold text-slate-700 transition-colors shadow-2xs"
                          >
                            Handovers Only
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedCategories(['Financial'])}
                            className="px-2 py-0.5 bg-white hover:bg-slate-100 border border-slate-200 rounded text-[10px] font-semibold text-slate-700 transition-colors shadow-2xs"
                          >
                            Financial Only
                          </button>
                        </div>
                      </div>

                      {/* Checkbox Options List */}
                      <div className="space-y-1 max-h-60 overflow-y-auto pr-1 scrollbar-thin">
                        {PARENTING_ORDER_CATEGORIES.map((cat) => {
                          const isChecked = selectedCategories.includes(cat.id);
                          const count = categoryBreachCounts[cat.id] || 0;

                          return (
                            <label
                              key={cat.id}
                              className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer transition-colors text-xs select-none border ${
                                isChecked
                                  ? 'bg-slate-50/90 border-slate-200 hover:bg-slate-100/80'
                                  : 'bg-white border-transparent hover:bg-slate-50 opacity-60 hover:opacity-90'
                              }`}
                            >
                              <div className="pt-0.5 shrink-0">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleToggleCategory(cat.id)}
                                  className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                                />
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className={`w-2 h-2 rounded-full shrink-0 ${cat.dotColor}`} />
                                    <span className={`font-bold ${isChecked ? 'text-slate-900' : 'text-slate-600'}`}>
                                      {cat.name}
                                    </span>
                                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium">
                                      {cat.orderClauses}
                                    </span>
                                  </div>

                                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold shrink-0 ${
                                    count > 0 
                                      ? isChecked ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-600'
                                      : 'bg-slate-100 text-slate-400'
                                  }`}>
                                    {count} {count === 1 ? 'breach' : 'breaches'}
                                  </span>
                                </div>

                                <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                                  {cat.description}
                                </p>
                              </div>
                            </label>
                          );
                        })}
                      </div>

                      {/* Popover Footer */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">
                          {selectedCategories.length === 0 ? (
                            <span className="text-rose-600 font-bold">0 categories selected</span>
                          ) : (
                            <span>
                              <strong>{selectedCategories.length}</strong> of {PARENTING_ORDER_CATEGORIES.length} active
                            </span>
                          )}
                        </span>

                        <button
                          type="button"
                          onClick={() => setIsCategoryDropdownOpen(false)}
                          className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-xs transition-colors"
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Order Filter */}
                <select
                  value={filterOrder}
                  onChange={(e) => setFilterOrder(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  id="filter-order-select"
                >
                  <option value="ALL">All Orders</option>
                  <option value="Order 4.2">Order 4.2 (Changeovers)</option>
                  <option value="Order 9.1">Order 9.1 (42h Communication)</option>
                  <option value="Order 11.2">Order 11.2 (Non-Disparagement)</option>
                  <option value="Order 10.1">Order 10.1 (Financial Sharing)</option>
                  <option value="Order 5.1">Order 5.1 (Medical Notice)</option>
                  <option value="Order 13.1">Order 13.1 (Regional Travel)</option>
                  <option value="Order 4.1">Order 4.1 (Shared Responsibility)</option>
                  <option value="Order 7.3">Order 7.3 (Educational Access)</option>
                </select>

                {/* Severity Filter */}
                <select
                  value={filterSeverity}
                  onChange={(e) => setFilterSeverity(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  id="filter-severity-select"
                >
                  <option value="ALL">All Severities</option>
                  <option value="Severe">Severe (Withholding/Abuse)</option>
                  <option value="Moderate">Moderate (Blackout/Lags)</option>
                  <option value="Minor">Minor</option>
                </select>

                {/* Child Filter */}
                <select
                  value={filterChild}
                  onChange={(e) => setFilterChild(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  id="filter-child-select"
                >
                  <option value="ALL">Both Children</option>
                  <option value="Isabella">Isabella (10)</option>
                  <option value="Mason">Mason (9)</option>
                </select>

                {(filterOrder !== 'ALL' || filterSeverity !== 'ALL' || filterChild !== 'ALL' || activePatternFilter || selectedCategories.length < ALL_CATEGORY_IDS.length) && (
                  <button
                    onClick={() => {
                      setFilterOrder('ALL');
                      setFilterSeverity('ALL');
                      setFilterChild('ALL');
                      setActivePatternFilter(null);
                      setSelectedCategories(ALL_CATEGORY_IDS);
                    }}
                    className="text-xs text-rose-600 hover:text-rose-800 font-medium ml-auto flex items-center gap-1 transition-colors"
                    id="reset-breach-filters-btn"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset All Filters</span>
                  </button>
                )}
              </div>

              {/* Active Category Filter Chips Bar (when not all categories selected) */}
              {selectedCategories.length < ALL_CATEGORY_IDS.length && (
                <div className="flex items-center gap-1.5 flex-wrap pt-1 text-xs animate-in fade-in duration-100" id="active-category-chips-bar">
                  <span className="text-[11px] font-medium text-slate-400 shrink-0 flex items-center gap-1">
                    <Tag className="w-3 h-3 text-indigo-600" />
                    <span>Active Categories:</span>
                  </span>

                  {selectedCategories.length === 0 ? (
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-xs font-semibold rounded-md border border-rose-200">
                        No categories active (All breaches hidden)
                      </span>
                      <button
                        type="button"
                        onClick={handleSelectAllCategories}
                        className="text-xs text-indigo-600 hover:text-indigo-800 hover:underline font-bold"
                      >
                        Enable All Categories
                      </button>
                    </div>
                  ) : (
                    <>
                      {selectedCategories.map((catId) => {
                        const cat = PARENTING_ORDER_CATEGORIES.find(c => c.id === catId);
                        if (!cat) return null;
                        return (
                          <span
                            key={catId}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border ${cat.badgeBg} ${cat.badgeText} ${cat.borderCol}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${cat.dotColor}`} />
                            <span>{cat.name}</span>
                            <button
                              type="button"
                              onClick={() => handleToggleCategory(catId)}
                              className="hover:opacity-75 focus:outline-none ml-0.5 text-slate-500 hover:text-slate-900"
                              title={`Remove ${cat.name} filter`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        );
                      })}

                      <button
                        type="button"
                        onClick={handleSelectAllCategories}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold hover:underline ml-1"
                      >
                        Reset Categories ({ALL_CATEGORY_IDS.length})
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 7-Column Calendar Grid */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden" id="calendar-grid">
            {/* Days of week header */}
            <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200 text-center text-xs font-semibold text-slate-600 py-2.5">
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span className="text-indigo-600">Fri (Changeover)</span>
              <span className="text-slate-400">Sat</span>
              <span className="text-slate-400">Sun</span>
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
              {/* Empty leading cells */}
              {Array.from({ length: firstDayIndex }).map((_, idx) => (
                <div key={`empty-lead-${idx}`} className="h-28 bg-slate-50/50 p-1.5" />
              ))}

              {/* Days of the month */}
              {Array.from({ length: daysInMonth }).map((_, dayIdx) => {
                const dayNum = dayIdx + 1;
                const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                const breaches = monthBreachesMap.get(dateStr) || [];
                const isSelected = selectedDay === dateStr;
                const isScheduledFriday = showScheduledChangeovers && isScheduledChangeoverFriday(currentYear, currentMonth, dayNum);
                const hasBreach = breaches.length > 0;
                const highestSeverity = breaches.some(b => b.breachSeverity === 'Severe')
                  ? 'Severe'
                  : breaches.some(b => b.breachSeverity === 'Moderate')
                  ? 'Moderate'
                  : breaches.length > 0
                  ? 'Minor'
                  : null;

                // Day cell styling based on status
                let cellBg = 'bg-white hover:bg-slate-50/80';
                let borderAccent = '';

                if (hasBreach) {
                  if (highestSeverity === 'Severe') {
                    cellBg = 'bg-rose-50/80 hover:bg-rose-100/60';
                    borderAccent = 'border-l-4 border-l-rose-600';
                  } else if (highestSeverity === 'Moderate') {
                    cellBg = 'bg-amber-50/70 hover:bg-amber-100/60';
                    borderAccent = 'border-l-4 border-l-amber-500';
                  } else {
                    cellBg = 'bg-yellow-50/70 hover:bg-yellow-100/60';
                    borderAccent = 'border-l-4 border-l-yellow-400';
                  }
                } else if (isScheduledFriday) {
                  cellBg = 'bg-indigo-50/40 hover:bg-indigo-50/80';
                }

                return (
                  <button
                    key={`day-${dayNum}`}
                    onClick={() => setSelectedDay(dateStr)}
                    className={`h-28 p-1.5 text-left flex flex-col justify-between transition-all relative ${cellBg} ${borderAccent} ${
                      isSelected ? 'ring-2 ring-indigo-600 z-10 shadow-sm' : ''
                    }`}
                  >
                    {/* Day Number and Badges Header */}
                    <div className="flex items-center justify-between w-full">
                      <span className={`text-xs font-bold ${
                        isSelected 
                          ? 'w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center text-[11px]' 
                          : hasBreach 
                          ? 'text-rose-900 font-extrabold' 
                          : 'text-slate-700'
                      }`}>
                        {dayNum}
                      </span>

                      {/* Scheduled changeover badge */}
                      {isScheduledFriday && (
                        <span className="text-[9px] font-bold text-indigo-700 bg-indigo-100/80 px-1 py-0.2 rounded" title="Alternate Friday School Changeover 15:30">
                          15:30 Handover
                        </span>
                      )}
                    </div>

                    {/* Breach Pills on this day */}
                    <div className="space-y-1 my-auto overflow-hidden">
                      {breaches.map((b) => (
                        <div
                          key={b.id}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold leading-tight truncate border ${
                            b.breachSeverity === 'Severe'
                              ? 'bg-rose-100 text-rose-900 border-rose-300'
                              : b.breachSeverity === 'Moderate'
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : 'bg-yellow-100 text-yellow-900 border-yellow-300'
                          }`}
                          title={`${b.breachedOrderNumber}: ${b.title}`}
                        >
                          <span className="font-extrabold">{b.breachedOrderNumber?.split(' ')[0]} {b.breachedOrderNumber?.split(' ')[1]}</span>: {b.title}
                        </div>
                      ))}
                    </div>

                    {/* Footer / Incident summary marker */}
                    <div className="flex items-center justify-between text-[9px] text-slate-400">
                      {hasBreach ? (
                        <span className="font-semibold text-rose-700 flex items-center gap-0.5">
                          <AlertOctagon className="w-2.5 h-2.5" />
                          <span>{breaches.length} {breaches.length === 1 ? 'Contravention' : 'Contraventions'}</span>
                        </span>
                      ) : (
                        <span></span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right 4 Cols: Day Breach & Compliance Dossier Inspector */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sticky top-20" id="day-dossier-inspector">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Day Compliance Dossier
                </span>
                <h3 className="text-base font-bold text-slate-900 font-serif">
                  {new Date(selectedDay + 'T00:00:00').toLocaleDateString('en-AU', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </h3>
              </div>

              {selectedDayBreaches.length > 0 ? (
                <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-xs font-bold rounded-full border border-rose-200 flex items-center gap-1">
                  <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
                  <span>{selectedDayBreaches.length} Breached</span>
                </span>
              ) : (
                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded-full">
                  No Breaches
                </span>
              )}
            </div>

            {/* Breaches List for the Selected Day */}
            {selectedDayBreaches.length > 0 ? (
              <div className="mt-3 space-y-4 max-h-[580px] overflow-y-auto pr-1 scrollbar-thin">
                {selectedDayBreaches.map((breach) => {
                  const linkedDoc = documents.find(d => d.id === breach.primaryDocId);

                  return (
                    <div 
                      key={breach.id}
                      className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/40 space-y-2.5"
                    >
                      {/* Breach Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-2 py-0.5 bg-rose-600 text-white text-[10px] font-bold rounded">
                              {breach.breachedOrderNumber || 'Order Breach'}
                            </span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              breach.breachSeverity === 'Severe'
                                ? 'bg-rose-200 text-rose-900'
                                : breach.breachSeverity === 'Moderate'
                                ? 'bg-amber-200 text-amber-900'
                                : 'bg-slate-200 text-slate-800'
                            }`}>
                              {breach.breachSeverity || 'Moderate'} Severity
                            </span>
                            {breach.time && (
                              <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {breach.time} AWST
                              </span>
                            )}
                          </div>
                          <h4 className="text-xs font-bold text-slate-900 mt-1.5 leading-snug">
                            {breach.title}
                          </h4>

                          {/* Breach Categories */}
                          <div className="flex items-center gap-1 flex-wrap mt-1">
                            {getBreachCategories(breach).map((catId) => {
                              const cat = PARENTING_ORDER_CATEGORIES.find(c => c.id === catId);
                              if (!cat) return null;
                              return (
                                <span
                                  key={catId}
                                  className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${cat.badgeBg} ${cat.badgeText} ${cat.borderCol} flex items-center gap-1`}
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full ${cat.dotColor}`} />
                                  <span>{cat.name}</span>
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Fact Narrative */}
                      <p className="text-xs text-slate-700 leading-relaxed bg-white/80 p-2.5 rounded-lg border border-rose-100">
                        {breach.description}
                      </p>

                      {/* Meta Tags */}
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div className="bg-white/60 p-2 rounded border border-slate-100">
                          <span className="text-slate-400 block text-[10px]">Children Impacted</span>
                          <span className="font-semibold text-slate-800">
                            {breach.childrenMentioned.join(', ') || 'Both'}
                          </span>
                        </div>
                        <div className="bg-white/60 p-2 rounded border border-slate-100">
                          <span className="text-slate-400 block text-[10px]">Evidentiary Weight</span>
                          <span className="font-semibold text-indigo-700">
                            {breach.evidentiaryWeight}
                          </span>
                        </div>
                      </div>

                      {/* Response Lag if applicable */}
                      {breach.responseLagHours && breach.responseLagHours > 42 && (
                        <div className="bg-amber-100/70 border border-amber-200 text-amber-900 px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between">
                          <span className="font-semibold">Response Latency Lag:</span>
                          <span className="font-bold text-amber-800">{breach.responseLagHours} hrs (Threshold: 42h)</span>
                        </div>
                      )}

                      {/* Statutory Consequence under FLA */}
                      <div className="bg-slate-900 text-slate-100 p-2.5 rounded-lg text-[11px] space-y-1">
                        <div className="flex items-center gap-1 text-amber-400 font-bold text-[10px] uppercase tracking-wider">
                          <ShieldAlert className="w-3 h-3" />
                          <span>Statutory Remedy (FLA Part VII Div 13A)</span>
                        </div>
                        <p className="text-slate-300 text-[11px] leading-snug">
                          {breach.breachedOrderNumber?.includes('Order 4.2') 
                            ? 'Prima facie contravention without reasonable excuse (s 70NFB). Entitles Applicant to compensatory make-up time under s 70NEB(1)(a) and indemnity legal costs.'
                            : breach.breachedOrderNumber?.includes('Order 9.1')
                            ? 'Ongoing violation of communication mandate. Grounds for strict court-monitored OurFamilyWizard channel and deemed-consent provisions.'
                            : breach.breachedOrderNumber?.includes('Order 11.2')
                            ? 'Violation of child welfare injunction (s 60CC best interests). Warrant for non-approach boundaries and formal judicial admonition.'
                            : breach.breachedOrderNumber?.includes('Order 10.1') || breach.category === 'Financial'
                            ? 'Unilateral financial withholding and non-contribution to extraordinary expenses. Grounds for enforcement and cost compensation.'
                            : 'Contravention under s 70NFB. Entitles Applicant to restorative directions and enforcement orders.'}
                        </p>
                      </div>

                      {/* Primary Evidence Citation & Link */}
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] text-slate-500 font-medium truncate max-w-[180px]">
                          Ref: <strong className="text-slate-700">{breach.citation}</strong>
                        </span>

                        {linkedDoc ? (
                          <button
                            onClick={() => onViewDocument(linkedDoc)}
                            className="px-2.5 py-1 bg-white hover:bg-slate-100 text-indigo-600 border border-indigo-200 rounded text-xs font-semibold flex items-center gap-1 shadow-2xs transition-colors shrink-0"
                            title="Inspect Primary Documentary Evidence"
                          >
                            <Eye className="w-3 h-3" />
                            <span>View Evidence</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400">Archived Record</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              (() => {
                const unfilteredBreachesForDay = allBreaches.filter(b => b.date === selectedDay);
                if (unfilteredBreachesForDay.length > 0) {
                  return (
                    <div className="py-6 px-3 text-center space-y-2 bg-amber-50/70 rounded-xl border border-amber-200" id="filtered-day-empty-state">
                      <AlertTriangle className="w-7 h-7 text-amber-600 mx-auto" />
                      <p className="text-xs font-bold text-amber-900">
                        {unfilteredBreachesForDay.length} contravention{unfilteredBreachesForDay.length === 1 ? '' : 's'} hidden by active filters
                      </p>
                      <p className="text-[11px] text-amber-700 max-w-xs mx-auto">
                        This day contains documented breaches under categories currently toggled off in your filter.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCategories(ALL_CATEGORY_IDS);
                          setFilterOrder('ALL');
                          setFilterSeverity('ALL');
                          setFilterChild('ALL');
                        }}
                        className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-colors shadow-2xs inline-flex items-center gap-1"
                      >
                        <Layers className="w-3 h-3" />
                        <span>Enable All Categories</span>
                      </button>
                    </div>
                  );
                }

                return (
                  <div className="py-8 text-center space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                    <p className="text-xs text-slate-600 font-medium">
                      No contraventions recorded on this date.
                    </p>
                    <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                      Click on any highlighted calendar day (marked in red or amber) to inspect the specific order breach details and evidentiary proof.
                    </p>
                  </div>
                );
              })()
            )}
          </div>
        </div>
      </div>

      {/* Temporal Analytics: Heatmap of Breaches by Day-of-Week & Order Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Day-of-Week Distribution */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
              <span>Day-of-Week Contravention Distribution</span>
            </h3>
            <span className="text-[11px] text-slate-500 font-medium">Friday peaks at 40%</span>
          </div>

          <div className="space-y-2">
            {dayOfWeekStats.map((item) => (
              <div key={item.day} className="flex items-center gap-2 text-xs">
                <span className="w-20 text-slate-600 font-medium shrink-0">{item.day}</span>
                <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      item.day === 'Friday'
                        ? 'bg-rose-500'
                        : item.day === 'Sunday'
                        ? 'bg-amber-500'
                        : 'bg-indigo-400'
                    }`}
                    style={{ width: `${Math.max(item.percentage * 2, item.count > 0 ? 8 : 0)}%` }}
                  />
                </div>
                <span className="w-12 text-right font-bold text-slate-700 shrink-0">
                  {item.count} <span className="text-[10px] text-slate-400 font-normal">({item.percentage}%)</span>
                </span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-slate-500 mt-3 pt-2 border-t border-slate-100">
            <strong>Day-of-Week Distribution:</strong> {dayOfWeekStats.find(d => d.day === 'Friday')?.percentage ?? 0}% of {allBreaches.length} recorded contravention{allBreaches.length === 1 ? '' : 's'} occur{allBreaches.length === 1 ? 's' : ''} on a Friday, based on the documents currently in the case record.
          </p>
        </div>

        {/* Breaches by Order Category */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
              <span>Contraventions by Order Clause</span>
            </h3>
            <span className="text-[11px] text-slate-500 font-medium">20 Total Documented</span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-700 font-medium">Order 9.1 (42h Written Communication)</span>
              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold rounded text-xs">{orderBreakdownStats['Order 9.1']} Breaches</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-700 font-medium">Order 4.2 (Care Schedule & Changeovers)</span>
              <span className="px-2 py-0.5 bg-rose-100 text-rose-800 font-bold rounded text-xs">{orderBreakdownStats['Order 4.2']} Breaches</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-700 font-medium">Order 11.2 (Non-Disparagement / Abuse)</span>
              <span className="px-2 py-0.5 bg-purple-100 text-purple-800 font-bold rounded text-xs">{orderBreakdownStats['Order 11.2']} Breaches</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-700 font-medium">Order 10.1 (Financial Sharing & Extraordinary Levies)</span>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded text-xs">{orderBreakdownStats['Order 10.1']} Breaches</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-700 font-medium">Order 5.1 (Medical 24h Written Notice)</span>
              <span className="px-2 py-0.5 bg-slate-100 text-slate-800 font-bold rounded text-xs">{orderBreakdownStats['Order 5.1']} Breaches</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-700 font-medium">Order 13.1 (28-Day Regional Travel Notice)</span>
              <span className="px-2 py-0.5 bg-slate-100 text-slate-800 font-bold rounded text-xs">{orderBreakdownStats['Order 13.1']} Breaches</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-700 font-medium">Order 4.1 (Shared Parental Responsibility)</span>
              <span className="px-2 py-0.5 bg-slate-100 text-slate-800 font-bold rounded text-xs">{orderBreakdownStats['Order 4.1']} Breaches</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-700 font-medium">Order 7.3 (Educational Access & Conferences)</span>
              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-bold rounded text-xs">{orderBreakdownStats['Order 7.3']} Breaches</span>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Form 2 Contravention Grounds:</span>
            <span className="font-bold text-rose-600">FLA 1975 Part VII Div 13A</span>
          </div>
        </div>
      </div>

      {/* Modal: Form 2 Schedule of Breaches Court Export */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-4xl max-h-[85vh] rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-sm font-bold tracking-tight">Form 2 Application for Contravention - Schedule of Breaches</h3>
                  <span className="text-xs text-slate-400">Family Court of Western Australia (Case 4344/2023)</span>
                </div>
              </div>
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content Table */}
            <div className="p-4 overflow-y-auto flex-1 space-y-4">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs text-slate-700">
                <p>
                  <strong>Court Practice Note:</strong> Pursuant to Family Law Rules and FCWA practice, this schedule maps all alleged contraventions with reference to specific orders, dates, times, and primary objective annexures for Form 2 Contravention filing.
                </p>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5 w-12 text-center">#</th>
                      <th className="p-2.5 w-24">Date & Time</th>
                      <th className="p-2.5 w-28">Order Clause</th>
                      <th className="p-2.5">Specific Contravention Fact</th>
                      <th className="p-2.5 w-32">Primary Evidence</th>
                      <th className="p-2.5 w-28">Relief Sought</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {allBreaches.map((b, idx) => (
                      <tr key={b.id} className="hover:bg-slate-50">
                        <td className="p-2.5 text-center font-bold text-slate-500">{idx + 1}</td>
                        <td className="p-2.5 whitespace-nowrap font-medium text-slate-900">
                          {b.date}<br />
                          <span className="text-[10px] text-slate-400">{b.time || '15:30'} AWST</span>
                        </td>
                        <td className="p-2.5 font-bold text-rose-700 whitespace-nowrap">
                          {b.breachedOrderNumber || 'Order'}
                        </td>
                        <td className="p-2.5 text-slate-700">
                          <strong className="text-slate-900 block mb-0.5">{b.title}</strong>
                          {b.description}
                        </td>
                        <td className="p-2.5 font-mono text-[11px] text-indigo-700 whitespace-nowrap">
                          {b.citation}
                        </td>
                        <td className="p-2.5 text-[11px] font-medium text-slate-800">
                          {b.breachedOrderNumber?.includes('Order 4.2') 
                            ? 'Compensatory Time (s 70NEB)'
                            : b.breachedOrderNumber?.includes('Order 9.1')
                            ? 'AppClose Channel Order'
                            : b.breachedOrderNumber?.includes('Order 11.2')
                            ? 'Restraining Direction & Bond'
                            : 'Order Enforcement'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                {allBreaches.length} Contraventions formatted for Form 2 Annexure Schedule
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopySchedule}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  {copiedSchedule ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-300" />
                      <span>Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy Schedule for Affidavit / Form 2</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Automated Breach Summary Report Legal Brief Modal */}
      <BreachSummaryReportModal
        isOpen={isBreachReportModalOpen}
        onClose={() => setIsBreachReportModalOpen(false)}
        timeline={timeline}
        orders={orders}
        documents={documents}
        onViewDocument={onViewDocument}
        onNavigateToAffidavit={onNavigateToAffidavit}
      />
    </div>
  );
};
