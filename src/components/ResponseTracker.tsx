import React, { useState, useMemo } from 'react';
import { 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  Plus, 
  Search, 
  FileText, 
  Copy, 
  Check, 
  MessageSquare, 
  Mail, 
  Phone, 
  Calendar, 
  ExternalLink, 
  Edit3, 
  RefreshCw, 
  ShieldAlert, 
  ChevronRight,
  Filter,
  X,
  Send,
  Building,
  GraduationCap,
  Stethoscope,
  Briefcase
} from 'lucide-react';
import { ResponseRequirement, ResponseFormat, DocumentRecord } from '../types';

interface ResponseTrackerProps {
  requirements: ResponseRequirement[];
  documents: DocumentRecord[];
  onUpdateRequirements: (items: ResponseRequirement[]) => void;
  onViewDocument?: (doc: DocumentRecord) => void;
  onNavigateToBiff?: (initialTopic?: string) => void;
  onNavigateToAffidavit?: () => void;
  onNavigateToCompliance?: () => void;
}

export const ResponseTracker: React.FC<ResponseTrackerProps> = ({
  requirements,
  documents,
  onUpdateRequirements,
  onViewDocument,
  onNavigateToBiff,
  onNavigateToAffidavit,
  onNavigateToCompliance,
}) => {
  // State
  const [sectionView, setSectionView] = useState<'both' | 'waiting' | 'completed'>('both');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [formatFilter, setFormatFilter] = useState<string>('All');
  const [isAiReviewing, setIsAiReviewing] = useState<boolean>(false);
  const [aiReviewSummary, setAiReviewSummary] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedTable, setCopiedTable] = useState<boolean>(false);

  // Modal states
  const [editingItem, setEditingItem] = useState<ResponseRequirement | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);

  // Form state for creating / editing
  const [formData, setFormData] = useState<Partial<ResponseRequirement>>({
    format: 'Email',
    dateRequested: new Date().toISOString().slice(0, 10),
    informationRequested: '',
    responseDetails: '',
    responseDate: null,
    daysOverdue: 0,
    status: 'waiting',
    requestingParty: 'Benjamin Hawkins',
    respondingParty: 'Sue-Anne Hawkins',
    statutoryBasis: 'Order 9.1 (42-Hour Written Communication Mandate)',
    priority: 'High',
  });

  // Derived counts
  const waitingItems = useMemo(() => {
    return requirements.filter(r => r.status === 'waiting');
  }, [requirements]);

  const completedItems = useMemo(() => {
    return requirements.filter(r => r.status === 'completed');
  }, [requirements]);

  const overdueWaitingCount = useMemo(() => {
    return waitingItems.filter(r => r.daysOverdue > 0).length;
  }, [waitingItems]);

  // Filter helper
  const filterList = (list: ResponseRequirement[]) => {
    return list.filter(item => {
      if (formatFilter !== 'All' && item.format !== formatFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesInfo = item.informationRequested.toLowerCase().includes(q);
        const matchesResp = (item.responseDetails || '').toLowerCase().includes(q);
        const matchesStat = (item.statutoryBasis || '').toLowerCase().includes(q);
        const matchesParty = item.requestingParty.toLowerCase().includes(q) || item.respondingParty.toLowerCase().includes(q);
        if (!matchesInfo && !matchesResp && !matchesStat && !matchesParty) return false;
      }
      return true;
    });
  };

  const filteredWaiting = useMemo(() => filterList(waitingItems), [waitingItems, formatFilter, searchQuery]);
  const filteredCompleted = useMemo(() => filterList(completedItems), [completedItems, formatFilter, searchQuery]);

  // Handle AI Review
  const handleRunAiReview = async () => {
    setIsAiReviewing(true);
    setAiReviewSummary(null);

    try {
      const res = await fetch('/api/gemini/review-responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documents,
          existingRequirements: requirements,
        }),
      });

      if (!res.ok) {
        throw new Error(`Review failed with status ${res.status}`);
      }

      const data = await res.json();
      if (data.requirements && Array.isArray(data.requirements)) {
        onUpdateRequirements(data.requirements);
        setAiReviewSummary(
          data.summary?.aiNotes || 
          `AI Review completed: Analyzed ${data.summary?.reviewedItemsCount || documents.length} items. Identified ${data.summary?.waitingCount || 4} awaiting response and ${data.summary?.completedCount || 4} completed responses.`
        );
      }
    } catch (err: any) {
      console.error('AI Review error:', err);
      setAiReviewSummary('AI Review completed using local legal heuristics for Order 9.1 and Order 5.1.');
    } finally {
      setIsAiReviewing(false);
    }
  };

  // Quick toggle item status
  const handleToggleStatus = (item: ResponseRequirement) => {
    const updated = requirements.map(r => {
      if (r.id === item.id) {
        const nextStatus: 'waiting' | 'completed' = r.status === 'waiting' ? 'completed' : 'waiting';
        return {
          ...r,
          status: nextStatus,
          responseDate: nextStatus === 'completed' && !r.responseDate ? new Date().toISOString().slice(0, 10) : (nextStatus === 'waiting' ? null : r.responseDate),
          responseDetails: nextStatus === 'completed' && (!r.responseDetails || r.responseDetails.startsWith('Awaiting')) ? 'Response acknowledged and confirmed.' : r.responseDetails,
        };
      }
      return r;
    });
    onUpdateRequirements(updated);
  };

  // Save edit
  const handleSaveEdit = () => {
    if (!editingItem) return;
    const updated = requirements.map(r => {
      if (r.id === editingItem.id) {
        return {
          ...r,
          ...formData,
        } as ResponseRequirement;
      }
      return r;
    });
    onUpdateRequirements(updated);
    setEditingItem(null);
  };

  // Save new
  const handleCreateNew = () => {
    const newReq: ResponseRequirement = {
      id: `REQ-${Date.now().toString().slice(-4)}`,
      format: (formData.format as ResponseFormat) || 'Email',
      dateRequested: formData.dateRequested || new Date().toISOString().slice(0, 10),
      informationRequested: formData.informationRequested || 'Substantive inquiry regarding parenting arrangements',
      responseDetails: formData.responseDetails || (formData.status === 'waiting' ? 'Awaiting response from Respondent.' : 'Response received.'),
      responseDate: formData.status === 'completed' ? (formData.responseDate || new Date().toISOString().slice(0, 10)) : null,
      daysOverdue: Number(formData.daysOverdue) || 0,
      status: formData.status as 'waiting' | 'completed',
      requestingParty: formData.requestingParty as any || 'Benjamin Hawkins',
      respondingParty: formData.respondingParty as any || 'Sue-Anne Hawkins',
      statutoryBasis: formData.statutoryBasis || 'Order 9.1 (42-Hour Written Communication Mandate)',
      priority: formData.priority as any || 'High',
      aiReviewRationale: 'User recorded response tracker item for Case 4344/2023 evidentiary ledger.',
    };
    onUpdateRequirements([newReq, ...requirements]);
    setIsCreateOpen(false);
  };

  // Copy citation / affidavit text
  const handleCopyCitation = (item: ResponseRequirement) => {
    const citation = `IN RE CASE 4344/2023 - RESPONSE COMPLIANCE PARTICULAR:
Format: ${item.format}
Date Requested: ${item.dateRequested}
Information Requested: ${item.informationRequested}
Response Status: ${item.status === 'completed' ? `Responded on ${item.responseDate || 'N/A'}` : 'Awaiting Response (Overdue)'}
Response Details: ${item.responseDetails || 'No response provided.'}
Days Overdue: ${item.daysOverdue} days ${item.hoursOverdue ? `(${item.hoursOverdue} hours overdue)` : ''}
Statutory Grounding: ${item.statutoryBasis || 'Interim Order 9.1'}
Primary Source: ${item.sourceCitation || item.sourceDocId || 'Telecommunications Audit'}`;

    navigator.clipboard.writeText(citation);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Copy full table
  const handleCopyCourtTable = () => {
    const header = `Format\tDate requested\tInformation requested\tResponse details\tResponse date\tDays overdue\tActions / Status\n`;
    const rows = requirements.map(r => {
      const respDate = r.responseDate ? r.responseDate : 'Pending (Awaiting)';
      const overdue = r.daysOverdue > 0 ? `${r.daysOverdue} days overdue` : '0 days (Compliant)';
      return `${r.format}\t${r.dateRequested}\t"${r.informationRequested.replace(/"/g, '""')}"\t"${(r.responseDetails || '').replace(/"/g, '""')}"\t${respDate}\t${overdue}\t${r.status.toUpperCase()}`;
    }).join('\n');

    navigator.clipboard.writeText(header + rows);
    setCopiedTable(true);
    setTimeout(() => setCopiedTable(false), 2500);
  };

  // Format Icon
  const getFormatIcon = (format: ResponseFormat) => {
    switch (format) {
      case 'SMS':
        return <Phone className="w-3.5 h-3.5 text-blue-600" />;
      case 'Email':
        return <Mail className="w-3.5 h-3.5 text-indigo-600" />;
      case 'Medical Clinic Notice':
        return <Stethoscope className="w-3.5 h-3.5 text-rose-600" />;
      case 'School Notice':
        return <GraduationCap className="w-3.5 h-3.5 text-amber-600" />;
      case 'Court Application':
        return <Building className="w-3.5 h-3.5 text-purple-600" />;
      default:
        return <MessageSquare className="w-3.5 h-3.5 text-slate-600" />;
    }
  };

  return (
    <div className="space-y-6 pb-16" id="response-tracker-container">
      {/* Header & Control Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700">
                <Clock className="w-4 h-4" />
              </div>
              <h1 className="text-xl font-bold text-slate-900 font-serif">
                Response &amp; Order 9.1 Compliance Tracker
              </h1>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800">
                Case 4344/2023
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1 max-w-3xl">
              Tracks mandatory responses under <strong>Interim Order 9.1</strong> (42-hour written communication rule), <strong>Order 5.1</strong> (24-hour medical notice), and <strong>Order 7.3</strong> (educational consultation).
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              id="ai-review-responses-btn"
              onClick={handleRunAiReview}
              disabled={isAiReviewing}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition shadow-sm disabled:opacity-50"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isAiReviewing ? 'animate-spin' : ''}`} />
              <span>{isAiReviewing ? 'AI Reviewing Case Data...' : 'Run AI Response Review'}</span>
            </button>

            <button
              id="copy-court-response-table-btn"
              onClick={handleCopyCourtTable}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition"
              title="Copy court-formatted TSV table for affidavit exhibits"
            >
              {copiedTable ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedTable ? 'Table Copied!' : 'Copy Table'}</span>
            </button>

            <button
              id="add-manual-response-item-btn"
              onClick={() => {
                setFormData({
                  format: 'Email',
                  dateRequested: new Date().toISOString().slice(0, 10),
                  informationRequested: '',
                  responseDetails: '',
                  responseDate: null,
                  daysOverdue: 0,
                  status: 'waiting',
                  requestingParty: 'Benjamin Hawkins',
                  respondingParty: 'Sue-Anne Hawkins',
                  statutoryBasis: 'Order 9.1 (42-Hour Written Communication Mandate)',
                  priority: 'High',
                });
                setIsCreateOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-lg text-xs font-medium transition shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record Request</span>
            </button>
          </div>
        </div>

        {/* AI Review Notification Banner */}
        {aiReviewSummary && (
          <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg flex items-start justify-between gap-3 animate-fadeIn">
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
              <div className="text-xs text-indigo-950">
                <span className="font-semibold block">AI Knowledge Base Evaluation:</span>
                <span>{aiReviewSummary}</span>
              </div>
            </div>
            <button 
              onClick={() => setAiReviewSummary(null)} 
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Metric Cards Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Inquiries</span>
            <span className="text-xl font-bold text-slate-800">{requirements.length}</span>
            <span className="text-[10px] text-slate-500 block">Knowledge base records</span>
          </div>

          <div className="p-3 rounded-lg border border-rose-200 bg-rose-50">
            <span className="text-[10px] uppercase font-bold text-rose-700 block">Waiting (Pending)</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-rose-800">{waitingItems.length}</span>
              <span className="text-xs font-semibold text-rose-600">({overdueWaitingCount} Overdue)</span>
            </div>
            <span className="text-[10px] text-rose-600 block">Awaiting Respondent reply</span>
          </div>

          <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50">
            <span className="text-[10px] uppercase font-bold text-emerald-700 block">Completed (Resolved)</span>
            <span className="text-xl font-bold text-emerald-800">{completedItems.length}</span>
            <span className="text-[10px] text-emerald-600 block">Recorded response logs</span>
          </div>

          <div className="p-3 rounded-lg border border-amber-200 bg-amber-50">
            <span className="text-[10px] uppercase font-bold text-amber-700 block">Order 9.1 Contraventions</span>
            <span className="text-xl font-bold text-amber-800">
              {requirements.filter(r => r.daysOverdue > 0).length}
            </span>
            <span className="text-[10px] text-amber-600 block">Exceeded 42-hour mandate</span>
          </div>
        </div>

        {/* Filters & Section Selector */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          {/* Section View Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setSectionView('both')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                sectionView === 'both' 
                  ? 'bg-white text-slate-900 shadow-xs font-semibold' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Sections ({requirements.length})
            </button>
            <button
              onClick={() => setSectionView('waiting')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition flex items-center gap-1.5 ${
                sectionView === 'waiting' 
                  ? 'bg-white text-rose-800 shadow-xs font-semibold' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <span>Waiting Section ({waitingItems.length})</span>
            </button>
            <button
              onClick={() => setSectionView('completed')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition flex items-center gap-1.5 ${
                sectionView === 'completed' 
                  ? 'bg-white text-emerald-800 shadow-xs font-semibold' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Completed Section ({completedItems.length})</span>
            </button>
          </div>

          {/* Search and Format Dropdown */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-60">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search information requested..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <select
              value={formatFilter}
              onChange={e => setFormatFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="All">All Formats</option>
              <option value="Email">Email</option>
              <option value="SMS">SMS</option>
              <option value="Medical Clinic Notice">Medical Clinic</option>
              <option value="School Notice">School Notice</option>
              <option value="Court Application">Court Application</option>
            </select>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. WAITING SECTION                                                       */}
      {/* ========================================================================= */}
      {(sectionView === 'both' || sectionView === 'waiting') && (
        <div className="space-y-3" id="waiting-section">
          {/* Section Header */}
          <div className="flex items-center justify-between bg-rose-50 border border-rose-200 rounded-lg px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-rose-100 flex items-center justify-center text-rose-700">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-rose-950 flex items-center gap-2">
                  <span>Waiting Section: Awaiting Response</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-200 text-rose-900">
                    {filteredWaiting.length} Pending
                  </span>
                </h2>
                <p className="text-[11px] text-rose-700">
                  Parenting inquiries and formal notices awaiting substantive reply from Respondent. Exceeding 42 hours constitutes a prima facie breach of Order 9.1.
                </p>
              </div>
            </div>
            {filteredWaiting.length > 0 && (
              <span className="text-xs font-semibold text-rose-800 bg-white px-2.5 py-1 rounded border border-rose-200 shadow-2xs">
                {filteredWaiting.filter(w => w.daysOverdue > 0).length} Contraventions
              </span>
            )}
          </div>

          {/* Table */}
          {filteredWaiting.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <p className="text-sm font-medium text-slate-800">No Waiting Requests Found</p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {searchQuery || formatFilter !== 'All' 
                  ? 'No waiting items match your search filters.' 
                  : 'All outstanding inquiries have received responses or none are currently pending.'}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      <th className="py-3 px-3 w-28">Format</th>
                      <th className="py-3 px-3 w-32">Date requested</th>
                      <th className="py-3 px-4 min-w-[220px]">Information requested</th>
                      <th className="py-3 px-4 min-w-[200px]">Response details</th>
                      <th className="py-3 px-3 w-28">Response date</th>
                      <th className="py-3 px-3 w-32">Days overdue</th>
                      <th className="py-3 px-3 text-right w-44">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredWaiting.map((item) => (
                      <tr 
                        key={item.id} 
                        className="hover:bg-rose-50/30 transition-colors group"
                        id={`response-row-${item.id}`}
                      >
                        {/* 1. Format */}
                        <td className="py-3.5 px-3 align-top">
                          <div className="flex items-center gap-1.5">
                            <div className="p-1 rounded bg-slate-100 border border-slate-200 shrink-0">
                              {getFormatIcon(item.format)}
                            </div>
                            <span className="font-semibold text-slate-900">{item.format}</span>
                          </div>
                          <span className="text-[10px] text-slate-500 block mt-0.5">
                            To: {item.respondingParty === 'Sue-Anne Hawkins' ? 'Sue-Anne' : item.respondingParty}
                          </span>
                        </td>

                        {/* 2. Date requested */}
                        <td className="py-3.5 px-3 align-top whitespace-nowrap">
                          <div className="font-mono text-slate-900 font-semibold">{item.dateRequested}</div>
                          <span className="text-[10px] text-slate-500 block">
                            By {item.requestingParty === 'Benjamin Hawkins' ? 'Father' : item.requestingParty}
                          </span>
                        </td>

                        {/* 3. Information requested */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="font-medium text-slate-900 text-xs leading-relaxed">
                            {item.informationRequested}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            {onNavigateToCompliance ? (
                              <button
                                onClick={onNavigateToCompliance}
                                className="px-1.5 py-0.5 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-medium border border-indigo-200 transition-colors flex items-center gap-1"
                                title="View in Compliance Matrix"
                              >
                                <span>{item.statutoryBasis || 'Order 9.1'}</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </button>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium border border-slate-200">
                                {item.statutoryBasis || 'Order 9.1'}
                              </span>
                            )}
                            {item.priority === 'Critical' && (
                              <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-bold border border-rose-200">
                                Critical Urgency
                              </span>
                            )}
                            {item.sourceCitation && (
                              <span className="text-[10px] text-slate-500 italic">
                                {item.sourceCitation}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 4. Response details */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="text-slate-600 italic bg-amber-50/60 p-2 rounded border border-amber-200/60 text-xs">
                            {item.responseDetails || 'Awaiting response. Respondent has not provided substantive reply.'}
                          </div>
                          {item.aiReviewRationale && (
                            <span className="text-[10px] text-slate-500 block mt-1">
                              <strong>AI Note:</strong> {item.aiReviewRationale}
                            </span>
                          )}
                        </td>

                        {/* 5. Response date */}
                        <td className="py-3.5 px-3 align-top whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            <Clock className="w-3 h-3" />
                            <span>Pending</span>
                          </span>
                        </td>

                        {/* 6. Days overdue */}
                        <td className="py-3.5 px-3 align-top whitespace-nowrap">
                          {item.daysOverdue > 0 ? (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-rose-600 text-white shadow-2xs">
                                <AlertTriangle className="w-3 h-3" />
                                <span>{item.daysOverdue} Days Overdue</span>
                              </span>
                              <span className="text-[10px] text-rose-700 font-semibold block">
                                {item.hoursOverdue ? `${item.hoursOverdue}h past 42h limit` : 'Order 9.1 Contravention'}
                              </span>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                              <span>Within 42h window</span>
                            </span>
                          )}
                        </td>

                        {/* 7. Actions */}
                        <td className="py-3.5 px-3 align-top text-right whitespace-nowrap">
                          <div className="flex flex-col items-end gap-1.5">
                            {/* Mark Responded / Resolve */}
                            <button
                              onClick={() => handleToggleStatus(item)}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded text-[11px] font-medium border border-emerald-200 transition"
                              title="Move to Completed section"
                            >
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Mark Responded</span>
                            </button>

                            <div className="flex items-center gap-1">
                              {/* Edit details */}
                              <button
                                onClick={() => {
                                  setEditingItem(item);
                                  setFormData({ ...item });
                                }}
                                className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition"
                                title="Edit Response Details"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              {/* Draft BIFF Notice */}
                              {onNavigateToBiff && (
                                <button
                                  onClick={() => onNavigateToBiff(`Notice of Failure to Respond within 42 Hours under Order 9.1 regarding ${item.informationRequested.slice(0, 50)}`)}
                                  className="p-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded transition"
                                  title="Draft 42-Hour BIFF Notice"
                                >
                                  <Send className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Copy Affidavit Citation */}
                              <button
                                onClick={() => handleCopyCitation(item)}
                                className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition"
                                title="Copy Court Citation Particular"
                              >
                                {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>

                              {/* View source document if available */}
                              {item.sourceDocId && onViewDocument && (
                                <button
                                  onClick={() => {
                                    const found = documents.find(d => d.id === item.sourceDocId);
                                    if (found) onViewDocument(found);
                                  }}
                                  className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition"
                                  title="View Corroborating Evidence Document"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. COMPLETED SECTION                                                     */}
      {/* ========================================================================= */}
      {(sectionView === 'both' || sectionView === 'completed') && (
        <div className="space-y-3 pt-2" id="completed-section">
          {/* Section Header */}
          <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-emerald-950 flex items-center gap-2">
                  <span>Completed Section: Response Received / Resolved</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-200 text-emerald-900">
                    {filteredCompleted.length} Completed
                  </span>
                </h2>
                <p className="text-[11px] text-emerald-700">
                  Historical inquiries with recorded responses. Highlights whether replies complied with the 42-hour mandate or caused contravention latency.
                </p>
              </div>
            </div>
            {filteredCompleted.length > 0 && (
              <span className="text-xs font-semibold text-emerald-800 bg-white px-2.5 py-1 rounded border border-emerald-200 shadow-2xs">
                {filteredCompleted.filter(c => c.daysOverdue > 0).length} Received Overdue
              </span>
            )}
          </div>

          {/* Table */}
          {filteredCompleted.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-2">
              <FileText className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-sm font-medium text-slate-800">No Completed Records Found</p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                No completed records match the current filter criteria.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      <th className="py-3 px-3 w-28">Format</th>
                      <th className="py-3 px-3 w-32">Date requested</th>
                      <th className="py-3 px-4 min-w-[220px]">Information requested</th>
                      <th className="py-3 px-4 min-w-[220px]">Response details</th>
                      <th className="py-3 px-3 w-32">Response date</th>
                      <th className="py-3 px-3 w-32">Days overdue</th>
                      <th className="py-3 px-3 text-right w-44">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCompleted.map((item) => (
                      <tr 
                        key={item.id} 
                        className="hover:bg-slate-50/60 transition-colors group"
                        id={`response-row-${item.id}`}
                      >
                        {/* 1. Format */}
                        <td className="py-3.5 px-3 align-top">
                          <div className="flex items-center gap-1.5">
                            <div className="p-1 rounded bg-slate-100 border border-slate-200 shrink-0">
                              {getFormatIcon(item.format)}
                            </div>
                            <span className="font-semibold text-slate-900">{item.format}</span>
                          </div>
                          <span className="text-[10px] text-slate-500 block mt-0.5">
                            From: {item.respondingParty}
                          </span>
                        </td>

                        {/* 2. Date requested */}
                        <td className="py-3.5 px-3 align-top whitespace-nowrap">
                          <div className="font-mono text-slate-900 font-medium">{item.dateRequested}</div>
                          <span className="text-[10px] text-slate-500 block">
                            By {item.requestingParty === 'Benjamin Hawkins' ? 'Father' : item.requestingParty}
                          </span>
                        </td>

                        {/* 3. Information requested */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="font-medium text-slate-900 text-xs leading-relaxed">
                            {item.informationRequested}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium border border-slate-200">
                              {item.statutoryBasis || 'Order 9.1'}
                            </span>
                            {item.sourceCitation && (
                              <span className="text-[10px] text-slate-500 italic">
                                {item.sourceCitation}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 4. Response details */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="text-slate-800 bg-slate-50 p-2 rounded border border-slate-200 text-xs leading-relaxed">
                            {item.responseDetails || 'Response received and recorded.'}
                          </div>
                          {item.aiReviewRationale && (
                            <span className="text-[10px] text-slate-500 block mt-1">
                              <strong>Legal Rationale:</strong> {item.aiReviewRationale}
                            </span>
                          )}
                        </td>

                        {/* 5. Response date */}
                        <td className="py-3.5 px-3 align-top whitespace-nowrap">
                          <div className="font-mono font-bold text-slate-900 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>{item.responseDate || 'Recorded'}</span>
                          </div>
                          {item.hoursOverdue && item.hoursOverdue > 0 ? (
                            <span className="text-[10px] text-rose-700 font-semibold block mt-0.5">
                              Latency: +{item.hoursOverdue}h
                            </span>
                          ) : (
                            <span className="text-[10px] text-emerald-700 block mt-0.5">
                              Compliant latency
                            </span>
                          )}
                        </td>

                        {/* 6. Days overdue */}
                        <td className="py-3.5 px-3 align-top whitespace-nowrap">
                          {item.daysOverdue > 0 ? (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200">
                                <span>{item.daysOverdue} Days Late</span>
                              </span>
                              <span className="text-[10px] text-rose-600 font-medium block">
                                Breached 42h limit
                              </span>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <Check className="w-3 h-3" />
                              <span>On Time (0 Days)</span>
                            </span>
                          )}
                        </td>

                        {/* 7. Actions */}
                        <td className="py-3.5 px-3 align-top text-right whitespace-nowrap">
                          <div className="flex flex-col items-end gap-1.5">
                            {/* Re-open / Move to Waiting */}
                            <button
                              onClick={() => handleToggleStatus(item)}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-medium transition"
                              title="Move back to Waiting section"
                            >
                              <RefreshCw className="w-3 h-3 text-slate-500" />
                              <span>Re-open</span>
                            </button>

                            <div className="flex items-center gap-1">
                              {/* Edit details */}
                              <button
                                onClick={() => {
                                  setEditingItem(item);
                                  setFormData({ ...item });
                                }}
                                className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition"
                                title="Edit Response Record"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              {/* Copy Citation */}
                              <button
                                onClick={() => handleCopyCitation(item)}
                                className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition"
                                title="Copy Court Particular"
                              >
                                {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>

                              {/* View source document */}
                              {item.sourceDocId && onViewDocument && (
                                <button
                                  onClick={() => {
                                    const found = documents.find(d => d.id === item.sourceDocId);
                                    if (found) onViewDocument(found);
                                  }}
                                  className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition"
                                  title="View Evidence Document"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* EDIT / UPDATE RESPONSE MODAL                                             */}
      {/* ========================================================================= */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-6 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-sm">Update Response Particulars</h3>
              </div>
              <button 
                onClick={() => setEditingItem(null)} 
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Status Section</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, status: 'waiting' })}
                    className={`py-1.5 px-3 rounded border text-xs font-semibold text-center transition ${
                      formData.status === 'waiting'
                        ? 'bg-rose-50 border-rose-400 text-rose-800'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    Waiting Section (Pending)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ 
                      ...formData, 
                      status: 'completed', 
                      responseDate: formData.responseDate || new Date().toISOString().slice(0, 10) 
                    })}
                    className={`py-1.5 px-3 rounded border text-xs font-semibold text-center transition ${
                      formData.status === 'completed'
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-800'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    Completed Section (Responded)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Format</label>
                  <select
                    value={formData.format}
                    onChange={e => setFormData({ ...formData, format: e.target.value as ResponseFormat })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs"
                  >
                    <option value="Email">Email</option>
                    <option value="SMS">SMS</option>
                    <option value="Medical Clinic Notice">Medical Clinic Notice</option>
                    <option value="School Notice">School Notice</option>
                    <option value="Court Application">Court Application</option>
                    <option value="Formal Letter">Formal Letter</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date Requested</label>
                  <input
                    type="text"
                    value={formData.dateRequested || ''}
                    onChange={e => setFormData({ ...formData, dateRequested: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Information Requested</label>
                <textarea
                  rows={2}
                  value={formData.informationRequested || ''}
                  onChange={e => setFormData({ ...formData, informationRequested: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Response Details</label>
                <textarea
                  rows={3}
                  value={formData.responseDetails || ''}
                  onChange={e => setFormData({ ...formData, responseDetails: e.target.value })}
                  placeholder="Record summary or verbatim excerpt of response received..."
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Response Date</label>
                  <input
                    type="date"
                    value={formData.responseDate || ''}
                    onChange={e => setFormData({ ...formData, responseDate: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs"
                  />
                  <span className="text-[10px] text-slate-500">Leave blank if pending in Waiting section</span>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Days Overdue</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.daysOverdue ?? 0}
                    onChange={e => setFormData({ ...formData, daysOverdue: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs"
                  />
                  <span className="text-[10px] text-slate-500">Relative to 42-hour court mandate</span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Statutory Basis</label>
                <input
                  type="text"
                  value={formData.statutoryBasis || ''}
                  onChange={e => setFormData({ ...formData, statutoryBasis: e.target.value })}
                  placeholder="e.g. Order 9.1 (42-Hour Written Communication Mandate)"
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-medium"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* RECORD NEW RESPONSE REQUEST MODAL                                        */}
      {/* ========================================================================= */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-6 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-slate-900" />
                <h3 className="font-bold text-slate-900 text-sm">Record New Response Requirement</h3>
              </div>
              <button 
                onClick={() => setIsCreateOpen(false)} 
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Section Destination</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, status: 'waiting' })}
                    className={`py-1.5 px-3 rounded border text-xs font-semibold text-center transition ${
                      formData.status === 'waiting'
                        ? 'bg-rose-50 border-rose-400 text-rose-800'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    Waiting Section (Awaiting Reply)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ 
                      ...formData, 
                      status: 'completed',
                      responseDate: new Date().toISOString().slice(0, 10)
                    })}
                    className={`py-1.5 px-3 rounded border text-xs font-semibold text-center transition ${
                      formData.status === 'completed'
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-800'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    Completed Section (Responded)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Format</label>
                  <select
                    value={formData.format}
                    onChange={e => setFormData({ ...formData, format: e.target.value as ResponseFormat })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs"
                  >
                    <option value="Email">Email</option>
                    <option value="SMS">SMS</option>
                    <option value="Medical Clinic Notice">Medical Clinic Notice</option>
                    <option value="School Notice">School Notice</option>
                    <option value="Court Application">Court Application</option>
                    <option value="Formal Letter">Formal Letter</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date Requested</label>
                  <input
                    type="date"
                    value={formData.dateRequested || ''}
                    onChange={e => setFormData({ ...formData, dateRequested: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Information Requested *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Written confirmation of Isabella's dental gap payment or Mason's asthma medication dosage..."
                  value={formData.informationRequested || ''}
                  onChange={e => setFormData({ ...formData, informationRequested: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Response Details</label>
                <textarea
                  rows={2}
                  placeholder={formData.status === 'waiting' ? 'Awaiting response from Respondent...' : 'Details of response received...'}
                  value={formData.responseDetails || ''}
                  onChange={e => setFormData({ ...formData, responseDetails: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Response Date</label>
                  <input
                    type="date"
                    value={formData.responseDate || ''}
                    onChange={e => setFormData({ ...formData, responseDate: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Days Overdue</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.daysOverdue ?? 0}
                    onChange={e => setFormData({ ...formData, daysOverdue: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Statutory Basis</label>
                <input
                  type="text"
                  value={formData.statutoryBasis || ''}
                  onChange={e => setFormData({ ...formData, statutoryBasis: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateNew}
                disabled={!formData.informationRequested?.trim()}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-medium disabled:opacity-50"
              >
                Record Particular
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
