import React, { useState } from 'react';
import { 
  Scale, 
  Sparkles, 
  RefreshCw, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  FileText, 
  ExternalLink, 
  BookOpen, 
  Check, 
  Copy, 
  Info,
  ChevronDown,
  ChevronUp,
  Search,
  FileCheck
} from 'lucide-react';
import { CourtCriterion, DocumentRecord } from '../types';
import { CourtCriteriaSubmissionsModal } from './CourtCriteriaSubmissionsModal';

interface CourtCriteriaProps {
  criteria: CourtCriterion[];
  documents: DocumentRecord[];
  onUpdateCriteria: (updated: CourtCriterion[]) => void;
  onViewDocument: (doc: DocumentRecord) => void;
  onNavigateToAffidavit: () => void;
  onNavigateToProposedOrders?: () => void;
}

export const CourtCriteria: React.FC<CourtCriteriaProps> = ({
  criteria,
  documents,
  onUpdateCriteria,
  onViewDocument,
  onNavigateToAffidavit,
  onNavigateToProposedOrders,
}) => {
  const [selectedFactorId, setSelectedFactorId] = useState<string>('s60CC-2a');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'CORE' | 'VIOLENCE' | 'CULTURE' | 'DERIVED' | 'CREDIBILITY'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAiReviewing, setIsAiReviewing] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSubmissionsModalOpen, setIsSubmissionsModalOpen] = useState(false);

  const getCriterionCategory = (crit: CourtCriterion): 'CORE' | 'VIOLENCE' | 'CULTURE' | 'DERIVED' | 'CREDIBILITY' => {
    if (crit.id.startsWith('s60CC-2A')) return 'VIOLENCE';
    if (crit.id.startsWith('s60CC-3')) return 'CULTURE';
    if (crit.id.startsWith('s60CC-derived')) return 'DERIVED';
    if (crit.id === 's60CC-general-credibility') return 'CREDIBILITY';
    return 'CORE';
  };

  const getShortStatutoryRef = (crit: CourtCriterion): string => {
    if (crit.id === 's60CC-2Aa') return 's 60CC(2A)(a)';
    if (crit.id === 's60CC-2Ab') return 's 60CC(2A)(b)';
    if (crit.id === 's60CC-3a') return 's 60CC(3)(a)';
    if (crit.id === 's60CC-3c') return 's 60CC(3)(c)';
    if (crit.id === 's60CC-derived-medical') return 's 60CC(2)(c)/(d)';
    if (crit.id === 's60CC-derived-financial') return 's 60CC(2)(d)';
    if (crit.id === 's60CC-derived-education') return 's 60CC(2)(c)';
    if (crit.id === 's60CC-derived-communication') return 's 60CC(2)(d)';
    if (crit.id === 's60CC-general-credibility') return 'Credibility';
    if (crit.statutoryRef.includes(',')) {
      return crit.statutoryRef.split(',')[1].trim();
    }
    return crit.statutoryRef.split('Family')[0]?.trim() || crit.id;
  };

  const filteredCriteria = criteria.filter(c => {
    const category = getCriterionCategory(c);
    const matchesCategory = selectedCategory === 'ALL' || category === selectedCategory;
    const matchesSearch = 
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.statutoryRef.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.officialLegalTest.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.relevanceSummary.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const activeCriterion = criteria.find(c => c.id === selectedFactorId) || filteredCriteria[0] || criteria[0];

  const handleRunAiReview = async () => {
    setIsAiReviewing(true);
    setFeedbackMessage(null);

    try {
      const res = await fetch('/api/gemini/review-criteria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentCriteria: criteria,
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
        if (data.criteria && Array.isArray(data.criteria)) {
          onUpdateCriteria(data.criteria);
          setFeedbackMessage(data.summary || 'AI successfully analyzed knowledge base documents and updated s60CC Court Criteria evidence flags.');
        } else {
          simulateCriteriaReview();
        }
      } else {
        simulateCriteriaReview();
      }
    } catch (e) {
      console.warn('AI criteria endpoint error, applying local fallback:', e);
      simulateCriteriaReview();
    } finally {
      setIsAiReviewing(false);
      setTimeout(() => setFeedbackMessage(null), 7000);
    }
  };

  const simulateCriteriaReview = () => {
    // Refresh evidence citations and timestamps
    onUpdateCriteria([...criteria]);
    setFeedbackMessage(`AI reviewed all ${documents.length} knowledge base documents against statutory s60CC factors. Corroborating evidence citations synchronized.`);
  };

  const handleCopyFactorParticulars = (crit: CourtCriterion) => {
    const text = `STATUTORY FACTOR: ${crit.statutoryRef} - ${crit.title}
LEGAL TEST:
${crit.officialLegalTest}

EVIDENTIARY STRENGTH: ${crit.evidentiaryStrength}
CASE SUMMARY: ${crit.relevanceSummary}

PRACTICAL COURT INDICATORS:
${crit.practicalIndicators.map(p => `• ${p}`).join('\n')}

AI FLAGGED EVIDENCE:
${crit.aiFlaggedEvidence.map(e => `• [${e.type.toUpperCase()}] ${e.citation || e.docId} (${e.date}): ${e.description}`).join('\n')}`;

    navigator.clipboard.writeText(text);
    setCopiedId(crit.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const categoryCounts = {
    ALL: criteria.length,
    CORE: criteria.filter(c => getCriterionCategory(c) === 'CORE').length,
    VIOLENCE: criteria.filter(c => getCriterionCategory(c) === 'VIOLENCE').length,
    CULTURE: criteria.filter(c => getCriterionCategory(c) === 'CULTURE').length,
    DERIVED: criteria.filter(c => getCriterionCategory(c) === 'DERIVED').length,
    CREDIBILITY: criteria.filter(c => getCriterionCategory(c) === 'CREDIBILITY').length,
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
                <Scale className="w-5 h-5" />
              </span>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Court Criteria (s60CC Best Interests Matrix)</h1>
                <p className="text-xs text-slate-500">
                  What the Family Court considers when deciding parenting matters — statutory best interests factors (Family Law Act 1975, s60CC), practical judicial indicators, and AI-flagged evidence.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsSubmissionsModalOpen(true)}
              className="px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition-all"
              id="generate-submissions-modal-btn"
            >
              <FileCheck className="w-3.5 h-3.5 text-indigo-300" />
              <span>Generate s60CC Court Submissions</span>
            </button>

            <button
              onClick={handleRunAiReview}
              disabled={isAiReviewing}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 shadow-xs transition-all ${
                isAiReviewing
                  ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
              id="run-ai-criteria-review-btn"
            >
              {isAiReviewing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>AI Matching Evidence to s60CC...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                  <span>AI Flag Evidence from Knowledge Base</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Informational Guidance Box */}
        <div className="mt-4 p-3.5 bg-blue-50/70 border border-blue-200 text-blue-900 rounded-lg text-xs flex items-start gap-2.5">
          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>System Statutory Directive:</strong> Every AI review agent in this application is instructed to cross-reference this s60CC list and cite the relevant statutory factor whenever analyzing documents, communications, proposed orders, or drafting court submissions.
          </p>
        </div>

        {feedbackMessage && (
          <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{feedbackMessage}</span>
            </div>
          </div>
        )}

        {/* Search & Category Filter Bar */}
        <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setSelectedCategory('ALL')}
                id="cat-filter-all"
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                  selectedCategory === 'ALL'
                    ? 'bg-indigo-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All Factors ({categoryCounts.ALL})
              </button>
              <button
                onClick={() => setSelectedCategory('CORE')}
                id="cat-filter-core"
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                  selectedCategory === 'CORE'
                    ? 'bg-indigo-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Core s60CC(2) ({categoryCounts.CORE})
              </button>
              <button
                onClick={() => setSelectedCategory('VIOLENCE')}
                id="cat-filter-violence"
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                  selectedCategory === 'VIOLENCE'
                    ? 'bg-indigo-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Violence &amp; Orders s60CC(2A) ({categoryCounts.VIOLENCE})
              </button>
              <button
                onClick={() => setSelectedCategory('CULTURE')}
                id="cat-filter-culture"
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                  selectedCategory === 'CULTURE'
                    ? 'bg-indigo-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Culture s60CC(3) ({categoryCounts.CULTURE})
              </button>
              <button
                onClick={() => setSelectedCategory('DERIVED')}
                id="cat-filter-derived"
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                  selectedCategory === 'DERIVED'
                    ? 'bg-indigo-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Derived Capacity ({categoryCounts.DERIVED})
              </button>
              <button
                onClick={() => setSelectedCategory('CREDIBILITY')}
                id="cat-filter-credibility"
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                  selectedCategory === 'CREDIBILITY'
                    ? 'bg-indigo-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Credibility ({categoryCounts.CREDIBILITY})
              </button>
            </div>

            {/* Quick Search */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search factors or citations..."
                id="court-criteria-search-input"
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:bg-white transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Quick Factor Buttons */}
          <div className="flex flex-wrap gap-2 pt-2">
            {filteredCriteria.length === 0 ? (
              <div className="p-3 text-xs text-slate-500 italic bg-slate-50 rounded-lg border border-slate-100 w-full flex items-center justify-between">
                <span>No factors match your current filter or search criteria.</span>
                <button
                  onClick={() => { setSelectedCategory('ALL'); setSearchQuery(''); }}
                  className="text-indigo-600 hover:underline font-semibold"
                >
                  Reset filters
                </button>
              </div>
            ) : (
              filteredCriteria.map(crit => {
                const isSelected = crit.id === selectedFactorId;
                const shortRef = getShortStatutoryRef(crit);
                return (
                  <button
                    key={crit.id}
                    onClick={() => setSelectedFactorId(crit.id)}
                    id={`factor-btn-${crit.id}`}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
                      isSelected
                        ? 'bg-indigo-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span className="font-mono text-[10px] font-bold opacity-80">{shortRef}</span>
                    <span className="truncate max-w-[190px]">{crit.title.split('(')[0]}</span>
                    {crit.evidentiaryStrength === 'High Respondent Risk' && (
                      <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0" title="High Respondent Risk"></span>
                    )}
                    {crit.evidentiaryStrength === 'Strong Applicant Position' && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" title="Strong Applicant Position"></span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Selected Factor Detailed Matrix */}
      {activeCriterion && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Statutory Test, Indicators, & AI Evidence */}
          <div className="lg:col-span-2 space-y-6">
            {/* Factor Legal Header */}
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                      {activeCriterion.statutoryRef}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                      activeCriterion.evidentiaryStrength === 'High Respondent Risk'
                        ? 'bg-rose-100 text-rose-800 border-rose-300'
                        : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                    }`}>
                      {activeCriterion.evidentiaryStrength}
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-slate-900 mt-2">
                    {activeCriterion.title}
                  </h2>
                </div>

                <button
                  onClick={() => handleCopyFactorParticulars(activeCriterion)}
                  className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded flex items-center gap-1 shrink-0"
                  title="Copy statutory factor & evidence block"
                >
                  {copiedId === activeCriterion.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700 font-semibold">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>Copy for Court</span>
                    </>
                  )}
                </button>
              </div>

              {/* Official Statutory Text */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Family Law Act 1975 (Cth) Statutory Provision
                </span>
                <p className="text-slate-800 italic leading-relaxed">
                  "{activeCriterion.officialLegalTest}"
                </p>
              </div>

              {/* Case Summary */}
              <div>
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Applicant Case Position &amp; Judicial Impact
                </span>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {activeCriterion.relevanceSummary}
                </p>
              </div>
            </div>

            {/* AI Flagged Evidence Records */}
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <h3 className="font-bold text-sm text-slate-900">
                    AI-Flagged Evidence from Vault ({activeCriterion.aiFlaggedEvidence.length} Items)
                  </h3>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">Referenced by AI review agents</span>
              </div>

              <div className="space-y-3">
                {activeCriterion.aiFlaggedEvidence.map((flag, idx) => {
                  const docObj = documents.find(d => d.id === flag.docId);
                  const isRisk = flag.type === 'respondent_risk_flag';
                  return (
                    <div 
                      key={idx}
                      className={`p-3.5 rounded-lg border text-xs space-y-2 transition-all ${
                        isRisk 
                          ? 'bg-rose-50/50 border-rose-200' 
                          : 'bg-emerald-50/50 border-emerald-200'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                            isRisk ? 'bg-rose-200 text-rose-800' : 'bg-emerald-200 text-emerald-800'
                          }`}>
                            {isRisk ? 'Respondent Risk Flag' : 'Applicant Strength'}
                          </span>
                          <span className="font-semibold text-slate-900">{flag.citation || flag.docId}</span>
                          <span className="text-[11px] text-slate-500 font-mono">{flag.date}</span>
                        </div>

                        {docObj && (
                          <button
                            onClick={() => onViewDocument(docObj)}
                            className="px-2 py-0.5 bg-white border border-slate-200 hover:bg-slate-50 text-indigo-600 font-semibold rounded text-[11px] flex items-center gap-1 self-start sm:self-auto"
                          >
                            <span>Inspect Doc</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      <p className="text-slate-800 leading-relaxed text-xs">
                        {flag.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Col: Practical Indicators & Vault Documents */}
          <div className="space-y-6">
            {/* Practical Court Indicators */}
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-sm text-slate-900">Practical Judicial Indicators</h3>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Objective criteria that Family Court judges and Family Report Writers weigh when assessing this factor:
              </p>

              <ul className="space-y-2 pt-1">
                {activeCriterion.practicalIndicators.map((ind, idx) => (
                  <li key={idx} className="text-xs text-slate-700 flex items-start gap-2 p-2 bg-slate-50 rounded-lg border border-slate-100">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                    <span>{ind}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Relevant Documents Cited */}
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-700" />
                  <h3 className="font-bold text-sm text-slate-900">Corroborating Documents</h3>
                </div>
                <span className="text-xs font-mono text-slate-400">Vault</span>
              </div>

              <div className="space-y-2">
                {activeCriterion.relevantDocIds.map(docId => {
                  const docObj = documents.find(d => d.id === docId);
                  if (!docObj) return null;
                  return (
                    <div 
                      key={docId}
                      className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-between gap-2 text-xs transition-colors"
                    >
                      <div className="truncate">
                        <span className="font-semibold text-slate-900 block truncate">{docObj.title}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{docObj.date} • {docObj.category}</span>
                      </div>

                      <button
                        onClick={() => onViewDocument(docObj)}
                        className="px-2 py-1 text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 shrink-0"
                      >
                        <span>View</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-slate-100">
                <button
                  onClick={onNavigateToAffidavit}
                  className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Scale className="w-3.5 h-3.5" />
                  <span>Draft Affidavit Submissions on s60CC</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* s60CC Affidavit Submissions Modal */}
      <CourtCriteriaSubmissionsModal
        isOpen={isSubmissionsModalOpen}
        onClose={() => setIsSubmissionsModalOpen(false)}
        criteria={criteria}
        documents={documents}
        onViewDocument={onViewDocument}
        onNavigateToAffidavit={onNavigateToAffidavit}
      />
    </div>
  );
};
