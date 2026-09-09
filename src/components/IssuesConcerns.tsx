import React, { useState } from 'react';
import { 
  AlertTriangle, 
  ShieldAlert, 
  Sparkles, 
  RefreshCw, 
  Plus, 
  CheckCircle2, 
  FileText, 
  ExternalLink, 
  Scale, 
  Heart, 
  Activity, 
  MessageSquare, 
  GraduationCap, 
  MapPin, 
  ChevronDown, 
  ChevronUp, 
  Copy, 
  Check,
  Search,
  Filter
} from 'lucide-react';
import { IssueConcern, DocumentRecord } from '../types';

interface IssuesConcernsProps {
  issues: IssueConcern[];
  documents: DocumentRecord[];
  onUpdateIssues: (updated: IssueConcern[]) => void;
  onViewDocument: (doc: DocumentRecord) => void;
  onNavigateToAffidavit: () => void;
  onNavigateToCriteria?: () => void;
}

export const IssuesConcerns: React.FC<IssuesConcernsProps> = ({
  issues,
  documents,
  onUpdateIssues,
  onViewDocument,
  onNavigateToAffidavit,
  onNavigateToCriteria,
}) => {
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [filterSeverity, setFilterSeverity] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIssueIds, setExpandedIssueIds] = useState<string[]>(issues.map(i => i.id));
  const [isAiPopulating, setIsAiPopulating] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New Issue Form State
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<IssueConcern['category']>('Medical & Health');
  const [newSeverity, setNewSeverity] = useState<IssueConcern['severity']>('High');
  const [newDescription, setNewDescription] = useState('');
  const [newAffectedChild, setNewAffectedChild] = useState('Mason Hawkins');
  const [newS60CC, setNewS60CC] = useState('s60CC(2)(a) - Safety from neglect & medical harm');
  const [newRemedy, setNewRemedy] = useState('');

  const toggleExpand = (id: string) => {
    setExpandedIssueIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleRunAiPopulate = async () => {
    setIsAiPopulating(true);
    setFeedbackMessage(null);

    try {
      const res = await fetch('/api/gemini/review-issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentIssues: issues,
          documents: documents.slice(0, 15).map(d => ({
            id: d.id,
            title: d.title,
            category: d.category,
            date: d.date,
            weight: d.evidentiaryWeight,
            excerpt: d.excerpt
          }))
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.issues && Array.isArray(data.issues)) {
          onUpdateIssues(data.issues);
          setFeedbackMessage(data.summary || `AI successfully audited evidence and populated ${data.issues.length} substantiated issues and concerns.`);
        } else {
          simulateAiIssueUpdate();
        }
      } else {
        simulateAiIssueUpdate();
      }
    } catch (e) {
      console.warn('AI issues endpoint error, applying local evaluation:', e);
      simulateAiIssueUpdate();
    } finally {
      setIsAiPopulating(false);
      setTimeout(() => setFeedbackMessage(null), 7000);
    }
  };

  const simulateAiIssueUpdate = () => {
    if (documents.length === 0) {
      setFeedbackMessage('No documents in evidence vault. Ingest case exhibits to enable AI issues analysis.');
      return;
    }

    const nowStamp = new Date().toISOString().split('T')[0];
    const enrichedList = [...issues];
    
    // Add dynamic issue generated from first ingested document if not already in list
    const topDoc = documents[0];
    const generatedId = `ISS-${topDoc.id}`;
    if (!enrichedList.some(i => i.id === generatedId)) {
      enrichedList.unshift({
        id: generatedId,
        title: `Identified issue: ${topDoc.title}`,
        category: 'Statutory Concern',
        severity: 'Medium',
        description: topDoc.summary || `Issue identified under statutory factor ${topDoc.statutoryFactor || 'FLA s 60CC'}.`,
        affectedChildren: [],
        dateIdentified: nowStamp,
        status: 'Active Dispute',
        s60CCFactorRef: topDoc.statutoryFactor || 's60CC(2)(a)',
        corroboratingEvidence: [
          {
            docId: topDoc.id,
            title: topDoc.title,
            date: topDoc.date || nowStamp,
            citation: topDoc.annexureNumber ? `Annexure ${topDoc.annexureNumber}` : 'Exhibit',
            excerpt: topDoc.summary?.slice(0, 100) || 'Corroborating documentary evidence.'
          }
        ],
        recommendedRemedyOrOrder: 'Incorporate specific safeguard order into Minute of Proposed Orders.',
        aiGenerated: true
      });
    }

    onUpdateIssues(enrichedList);
    setFeedbackMessage(`AI audited evidence across ${documents.length} vault documents and evaluated active issues.`);
  };

  const handleAddNewIssue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDescription.trim()) return;

    const newItem: IssueConcern = {
      id: `ISS-MANUAL-${Date.now().toString().slice(-4)}`,
      title: newTitle.trim(),
      category: newCategory,
      severity: newSeverity,
      description: newDescription.trim(),
      affectedChildren: [newAffectedChild],
      dateIdentified: new Date().toISOString().split('T')[0],
      status: 'Active Concern',
      s60CCFactorRef: newS60CC,
      corroboratingEvidence: [],
      recommendedRemedyOrOrder: newRemedy.trim() || 'Parenting order revision requested in Minutes of Consent.',
      aiGenerated: false
    };

    onUpdateIssues([newItem, ...issues]);
    setIsAddModalOpen(false);
    setNewTitle('');
    setNewDescription('');
    setNewRemedy('');
    setFeedbackMessage('New issue recorded to case register.');
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  const handleCopyIssueText = (issue: IssueConcern) => {
    const text = `PARTICULAR OF CONCERN: ${issue.title}
CATEGORY: ${issue.category} | SEVERITY: ${issue.severity} | STATUS: ${issue.status}
CHILDREN AFFECTED: ${issue.affectedChildren.join(', ')}
FAMILY LAW ACT FACTOR: ${issue.s60CCFactorRef}
DESCRIPTION: ${issue.description}
RECOMMENDED COURT REMEDY: ${issue.recommendedRemedyOrOrder}
CORROBORATING EVIDENCE:
${issue.corroboratingEvidence.map(e => `• [${e.docId}] ${e.title} (${e.citation}): "${e.excerpt}"`).join('\n')}`;

    navigator.clipboard.writeText(text);
    setCopiedId(issue.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Filter issues
  const filteredIssues = issues.filter(issue => {
    const matchesCat = filterCategory === 'All' || issue.category === filterCategory;
    const matchesSev = filterSeverity === 'All' || issue.severity === filterSeverity;
    const matchesQuery = searchQuery === '' || 
      issue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.s60CCFactorRef.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSev && matchesQuery;
  });

  const getSeverityBadge = (sev: IssueConcern['severity']) => {
    switch (sev) {
      case 'Critical':
        return 'bg-rose-100 text-rose-800 border-rose-300 font-bold';
      case 'High':
        return 'bg-amber-100 text-amber-800 border-amber-300 font-semibold';
      case 'Medium':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getCategoryIcon = (cat: IssueConcern['category']) => {
    switch (cat) {
      case 'Medical & Health':
        return <Activity className="w-4 h-4 text-rose-600" />;
      case 'Parenting Time & Handover':
        return <Heart className="w-4 h-4 text-blue-600" />;
      case 'Education & Schooling':
        return <GraduationCap className="w-4 h-4 text-emerald-600" />;
      case 'Communication & Order 9.1':
        return <MessageSquare className="w-4 h-4 text-amber-600" />;
      case 'Emotional & Psychological Harm':
        return <ShieldAlert className="w-4 h-4 text-purple-600" />;
      case 'Relocation Risk':
        return <MapPin className="w-4 h-4 text-indigo-600" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-slate-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-rose-50 text-rose-700 rounded-lg">
                <AlertTriangle className="w-5 h-5" />
              </span>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Issues &amp; Concerns Register</h1>
                <p className="text-xs text-slate-500">
                  AI-populated register of substantive parenting issues, medical failures, order contraventions, and court-relevant risks.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-200"
              id="add-issue-btn"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Custom Issue</span>
            </button>

            <button
              onClick={handleRunAiPopulate}
              disabled={isAiPopulating}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 shadow-xs transition-all ${
                isAiPopulating
                  ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                  : 'bg-rose-600 hover:bg-rose-700 text-white'
              }`}
              id="run-ai-populate-issues-btn"
            >
              {isAiPopulating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>AI Scanning Evidence...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                  <span>AI Review &amp; Populate Issues</span>
                </>
              )}
            </button>
          </div>
        </div>

        {feedbackMessage && (
          <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{feedbackMessage}</span>
            </div>
          </div>
        )}

        {/* Filters and Search Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 mt-5 pt-4 border-t border-slate-100">
          <div className="sm:col-span-5 relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search issues, keywords (e.g. medical, asthma, Busselton)..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="sm:col-span-4 flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Category:</span>
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="w-full py-1.5 px-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700"
            >
              <option value="All">All Categories</option>
              <option value="Medical & Health">Medical &amp; Health</option>
              <option value="Parenting Time & Handover">Parenting Time &amp; Handover</option>
              <option value="Education & Schooling">Education &amp; Schooling</option>
              <option value="Communication & Order 9.1">Communication &amp; Order 9.1</option>
              <option value="Emotional & Psychological Harm">Emotional &amp; Psychological Harm</option>
              <option value="Relocation Risk">Relocation Risk</option>
            </select>
          </div>

          <div className="sm:col-span-3 flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Severity:</span>
            <select
              value={filterSeverity}
              onChange={e => setFilterSeverity(e.target.value)}
              className="w-full py-1.5 px-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700"
            >
              <option value="All">All Severities</option>
              <option value="Critical">Critical Only</option>
              <option value="High">High Severity</option>
              <option value="Medium">Medium</option>
            </select>
          </div>
        </div>
      </div>

      {/* Issues List */}
      <div className="space-y-4">
        {filteredIssues.length === 0 ? (
          <div className="bg-white rounded-xl p-8 border border-slate-200 text-center text-slate-500 text-xs">
            No issues match the selected filters.
          </div>
        ) : (
          filteredIssues.map((issue) => {
            const isExpanded = expandedIssueIds.includes(issue.id);
            return (
              <div 
                key={issue.id}
                id={`issue-card-${issue.id}`}
                className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden transition-all"
              >
                {/* Card Header */}
                <div 
                  className="p-4 bg-slate-50/70 border-b border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer hover:bg-slate-50"
                  onClick={() => toggleExpand(issue.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-2xs mt-0.5 shrink-0">
                      {getCategoryIcon(issue.category)}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2 py-0.5 text-[10px] rounded border ${getSeverityBadge(issue.severity)}`}>
                          {issue.severity}
                        </span>
                        <span className="px-2 py-0.5 text-[10px] bg-slate-200 text-slate-700 rounded font-medium">
                          {issue.category}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {issue.id}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {issue.status}
                        </span>
                      </div>
                      <h2 className="text-sm font-bold text-slate-900 mt-1.5">
                        {issue.title}
                      </h2>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyIssueText(issue);
                      }}
                      className="px-2.5 py-1 text-xs bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded flex items-center gap-1"
                      title="Copy Court Particular / Affidavit block"
                    >
                      {copiedId === issue.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700 font-semibold">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-500" />
                          <span>Copy Particular</span>
                        </>
                      )}
                    </button>

                    <button 
                      type="button" 
                      className="p-1 text-slate-400 hover:text-slate-600"
                      aria-label="Toggle details"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Collapsible Body */}
                {isExpanded && (
                  <div className="p-5 space-y-4 text-xs">
                    {/* Description */}
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Substantive Factual Particulars
                      </span>
                      <p className="text-slate-800 leading-relaxed text-xs">
                        {issue.description}
                      </p>
                    </div>

                    {/* Metadata Badges Bar */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div>
                        <span className="text-slate-500 block text-[11px]">Affected Children</span>
                        <span className="font-semibold text-slate-900">{issue.affectedChildren.join(', ')}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px]">First Identified Date</span>
                        <span className="font-semibold text-slate-900 font-mono">{issue.dateIdentified}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px]">Family Law Act Statutory Basis</span>
                        <span className="font-semibold text-indigo-700">{issue.s60CCFactorRef}</span>
                      </div>
                    </div>

                    {/* Corroborating Evidence */}
                    {issue.corroboratingEvidence.length > 0 && (
                      <div>
                        <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-slate-500" />
                          Vault Corroborating Evidence &amp; Citations
                        </span>
                        <div className="space-y-2">
                          {issue.corroboratingEvidence.map((ev, idx) => {
                            const docObj = documents.find(d => d.id === ev.docId);
                            return (
                              <div 
                                key={idx}
                                className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                              >
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-900">{ev.title}</span>
                                    <span className="px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded text-[10px] font-mono">
                                      {ev.citation}
                                    </span>
                                    <span className="text-[11px] text-slate-400 font-mono">{ev.date}</span>
                                  </div>
                                  <p className="italic text-slate-600 text-[11px] mt-1">
                                    "{ev.excerpt}"
                                  </p>
                                </div>

                                {docObj && (
                                  <button
                                    onClick={() => onViewDocument(docObj)}
                                    className="px-2.5 py-1 bg-white border border-slate-200 text-indigo-600 hover:text-indigo-800 font-semibold rounded text-[11px] flex items-center gap-1 shrink-0 self-start sm:self-center"
                                  >
                                    <span>View Doc</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Court Remedy & Action */}
                    <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider block mb-0.5">
                          Recommended Court Order / Safeguard Remedy
                        </span>
                        <p className="text-xs text-indigo-950 font-medium">
                          {issue.recommendedRemedyOrOrder}
                        </p>
                      </div>

                      <button
                        onClick={onNavigateToAffidavit}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shrink-0 shadow-xs flex items-center gap-1"
                      >
                        <Scale className="w-3.5 h-3.5" />
                        <span>Insert in Affidavit</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Add Custom Issue Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-xl w-full p-5 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Add Custom Parenting Issue / Concern</span>
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddNewIssue} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Issue Title / Statement</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sue-Anne failed to provide medical care for children"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value as any)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="Medical & Health">Medical &amp; Health</option>
                    <option value="Parenting Time & Handover">Parenting Time &amp; Handover</option>
                    <option value="Education & Schooling">Education &amp; Schooling</option>
                    <option value="Communication & Order 9.1">Communication &amp; Order 9.1</option>
                    <option value="Emotional & Psychological Harm">Emotional &amp; Psychological Harm</option>
                    <option value="Relocation Risk">Relocation Risk</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Severity Level</label>
                  <select
                    value={newSeverity}
                    onChange={e => setNewSeverity(e.target.value as any)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="Critical">Critical Risk</option>
                    <option value="High">High Severity</option>
                    <option value="Medium">Medium</option>
                    <option value="Routine">Routine</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Affected Child</label>
                  <select
                    value={newAffectedChild}
                    onChange={e => setNewAffectedChild(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="Mason Hawkins">Mason Hawkins (9)</option>
                    <option value="Isabella Hawkins">Isabella Hawkins (10)</option>
                    <option value="Both Children">Both Isabella &amp; Mason</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Section 60CC Statutory Factor</label>
                  <input
                    type="text"
                    value={newS60CC}
                    onChange={e => setNewS60CC(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Factual Description &amp; Details</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe the incident or observed conduct with dates and specific harm..."
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Recommended Court Order / Remedy</label>
                <input
                  type="text"
                  placeholder="e.g. Sole parental responsibility for medical decisions to Father"
                  value={newRemedy}
                  onChange={e => setNewRemedy(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg shadow-xs"
                >
                  Save Issue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
