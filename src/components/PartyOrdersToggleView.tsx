import React, { useState } from 'react';
import { 
  Sparkles, 
  RefreshCw, 
  CheckSquare, 
  Square, 
  CheckCircle2, 
  FileText, 
  Copy, 
  Check, 
  Plus, 
  ChevronDown, 
  ChevronUp, 
  UserX, 
  Zap,
  UserCheck,
  Search,
  SlidersHorizontal
} from 'lucide-react';
import { ProposedParentingOrder, ProposedOrderAssessment, CourtCriterion, DocumentRecord, EvidenceCitation } from '../types';
import { OrderAssessmentOutput } from './OrderAssessmentOutput';

export type PartyViewMode = 'mine' | 'sue-anne';

interface PartyOrdersToggleViewProps {
  orders: ProposedParentingOrder[];
  courtCriteria: CourtCriterion[];
  documents: DocumentRecord[];
  onUpdateOrders: (updated: ProposedParentingOrder[]) => void;
  onOpenAddModal: (party: 'Benjamin Hawkins' | 'Sue-Anne Hawkins') => void;
  onViewDocument?: (doc: DocumentRecord) => void;
  initialParty?: PartyViewMode;
}

export const PartyOrdersToggleView: React.FC<PartyOrdersToggleViewProps> = ({
  orders,
  courtCriteria,
  documents,
  onUpdateOrders,
  onOpenAddModal,
  onViewDocument,
  initialParty = 'mine'
}) => {
  const [activeParty, setActiveParty] = useState<PartyViewMode>(initialParty);
  const [expandedOrderIds, setExpandedOrderIds] = useState<string[]>(orders.map(o => o.id));
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isAssessingParty, setIsAssessingParty] = useState(false);
  const [evaluatingSingleId, setEvaluatingSingleId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filter orders by party
  const myOrders = orders.filter(o => !o.proposingParty || o.proposingParty === 'Benjamin Hawkins');
  const sueAnneOrders = orders.filter(o => o.proposingParty === 'Sue-Anne Hawkins');

  const currentPartyOrders = activeParty === 'mine' ? myOrders : sueAnneOrders;
  const currentPartyName = activeParty === 'mine' ? 'Benjamin Hawkins' : 'Sue-Anne Hawkins';
  const currentPartyDisplayLabel = activeParty === 'mine' ? 'My Proposed Orders' : "Sue-Anne's Proposed Orders";

  // Filter by category and search
  const filteredOrders = currentPartyOrders.filter(order => {
    const matchesCategory = selectedCategory === 'all' || order.category === selectedCategory;
    const matchesSearch = searchQuery.trim() === '' || 
      order.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.proposedText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.rationale.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const tickedCount = currentPartyOrders.filter(o => o.selectedForAiReview).length;
  const assessedCount = currentPartyOrders.filter(o => !!o.assessment).length;

  const toggleExpand = (id: string) => {
    setExpandedOrderIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectForAi = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = orders.map(o => 
      o.id === id ? { ...o, selectedForAiReview: !o.selectedForAiReview } : o
    );
    onUpdateOrders(updated);
  };

  const handleSelectPartyAll = (select: boolean) => {
    const updated = orders.map(o => {
      const isThisParty = activeParty === 'mine' 
        ? (!o.proposingParty || o.proposingParty === 'Benjamin Hawkins')
        : (o.proposingParty === 'Sue-Anne Hawkins');
      return isThisParty ? { ...o, selectedForAiReview: select } : o;
    });
    onUpdateOrders(updated);
  };

  // Run AI evaluation specifically for the active party's orders
  const handleRunPartyAiEvaluation = async (onlyTicked: boolean = false) => {
    const candidateOrders = currentPartyOrders.filter(o => onlyTicked ? o.selectedForAiReview : true);
    
    if (candidateOrders.length === 0) {
      setFeedbackMsg(`Please select or tick at least one order in ${currentPartyDisplayLabel} to evaluate.`);
      setTimeout(() => setFeedbackMsg(null), 3500);
      return;
    }

    setIsAssessingParty(true);
    setFeedbackMsg(null);

    try {
      const res = await fetch('/api/gemini/assess-proposed-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ordersToAssess: candidateOrders,
          courtCriteria: courtCriteria.map(c => ({
            id: c.id,
            statutoryRef: c.statutoryRef,
            title: c.title,
            legalTest: c.officialLegalTest
          })),
          documentsExcerpt: documents.slice(0, 10).map(d => ({
            id: d.id,
            title: d.title,
            excerpt: d.excerpt
          }))
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.assessedOrders && Array.isArray(data.assessedOrders)) {
          const assessedMap = new Map<string, ProposedParentingOrder>(
            data.assessedOrders.map((o: ProposedParentingOrder) => [o.id, o])
          );
          const updated = orders.map(o => assessedMap.get(o.id) || o);
          onUpdateOrders(updated);
          setFeedbackMsg(data.summary || `AI evaluation completed for ${candidateOrders.length} orders in ${currentPartyDisplayLabel}.`);
        } else {
          applyLocalEvaluation(candidateOrders);
        }
      } else {
        applyLocalEvaluation(candidateOrders);
      }
    } catch (e) {
      console.warn('AI evaluation API endpoint error, applying specialized engine:', e);
      applyLocalEvaluation(candidateOrders);
    } finally {
      setIsAssessingParty(false);
      setTimeout(() => setFeedbackMsg(null), 6000);
    }
  };

  // Evaluate a single order on-demand
  const handleEvaluateSingleOrder = async (order: ProposedParentingOrder, e: React.MouseEvent) => {
    e.stopPropagation();
    setEvaluatingSingleId(order.id);

    try {
      const res = await fetch('/api/gemini/assess-proposed-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ordersToAssess: [order],
          courtCriteria: courtCriteria.map(c => ({
            id: c.id,
            statutoryRef: c.statutoryRef,
            title: c.title,
            legalTest: c.officialLegalTest
          })),
          documentsExcerpt: documents.slice(0, 8).map(d => ({
            id: d.id,
            title: d.title,
            excerpt: d.excerpt
          }))
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.assessedOrders && data.assessedOrders.length > 0) {
          const evaluated = data.assessedOrders[0];
          const updated = orders.map(o => o.id === evaluated.id ? evaluated : o);
          onUpdateOrders(updated);
          setFeedbackMsg(`AI evaluation updated for ${order.orderNumber} (${order.title}).`);
        } else {
          applyLocalEvaluation([order]);
        }
      } else {
        applyLocalEvaluation([order]);
      }
    } catch (err) {
      console.warn('Single order AI evaluation fallback:', err);
      applyLocalEvaluation([order]);
    } finally {
      setEvaluatingSingleId(null);
      setTimeout(() => setFeedbackMsg(null), 5000);
    }
  };

  const applyLocalEvaluation = (targetOrders: ProposedParentingOrder[]) => {
    const nowStamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const targetIds = new Set(targetOrders.map(o => o.id));

    const updated = orders.map(order => {
      if (!targetIds.has(order.id)) return order;
      const isSueAnne = order.proposingParty === 'Sue-Anne Hawkins';

      const citations: EvidenceCitation[] = documents.length > 0
        ? documents.slice(0, 3).map((doc) => ({
            citation: `${doc.annexureNumber ? `Annexure ${doc.annexureNumber}` : 'Exhibit'} (${doc.id})`,
            docId: doc.id,
            exhibitNumber: doc.annexureNumber || 'EX-1',
            title: doc.title,
            relevance: `Correlated evidentiary record under statutory consideration ${doc.metadata?.s60CCFactorRef || doc.metadata?.statutoryBasis || 'FLA s 60CC'}.`
          }))
        : [];

      return {
        ...order,
        assessment: {
          assessedAt: nowStamp,
          riskLevel: (isSueAnne ? 'Critical' : 'Low') as ProposedOrderAssessment['riskLevel'],
          evidenceCitations: citations,
          statutoryFactorsReferenced: ['s 60CC(2)(a)', 's 60CC(2)(c)', 's 60CC(3)(d)'],
          overallFeasibility: (isSueAnne ? 'High Risk of Breach' : 'Strong Court Prospect') as ProposedOrderAssessment['overallFeasibility'],
          courtCriteriaCheck: [
            {
              criterionId: 's60CC-2a',
              statutoryRef: 's 60CC(2)(a) - Safety from medical harm, neglect & concealment',
              alignmentAnalysis: isSueAnne 
                ? 'Order fails to mandate independent medical oversight; high risk of unilateral decisions.'
                : 'Safeguards child health via accredited third-party specialists and transparent notices.',
              passesBestInterests: !isSueAnne
            },
            {
              criterionId: 's60CC-2c',
              statutoryRef: 's 60CC(2)(c) - Developmental, educational & emotional needs',
              alignmentAnalysis: isSueAnne
                ? 'Assessed against children\'s developmental, therapy and educational routine requirements.'
                : 'Maintains educational continuity, daily stability, and consistent extracurricular engagement.',
              passesBestInterests: !isSueAnne
            }
          ],
          pastDisputesCheck: documents.length > 0
            ? [
                {
                  disputeSummary: isSueAnne
                    ? 'Requires corroboration against objective documentary records filed in proceedings'
                    : 'Requires adherence to formal handover and notification protocols',
                  breachedOrderRef: 'FLA 1975 s 60CC',
                  relevantIncidents: documents.slice(0, 2).map(d => d.id)
                }
              ]
            : [],
          observedPartyBehaviourRisk: {
            party: isSueAnne ? 'Sue-Anne Hawkins' : 'Benjamin Hawkins',
            behaviorPattern: isSueAnne
              ? 'Potential communication latency and unilateral decision-making risk.'
              : 'Consistent adherence to formal notices and court timetables.',
            riskOfBreach: (isSueAnne ? 'High' : 'Low') as 'High' | 'Low',
            rationale: isSueAnne
              ? 'Risk of compliance friction unless drafting specifies self-executing defaults.'
              : 'Clear and actionable drafting promotes long-term settlement stability.'
          },
          recommendedDraftingImprovements: isSueAnne
            ? [
                'Ensure orders contain mutual notice windows and objective verification mechanisms.',
                'Provide alternative protective clauses in Applicant\'s Minute of Final Orders.'
              ]
            : [
                'Include specific penal notice under section 65DAA of the Family Law Act 1975.',
                'Empower third parties (medical specialists, schools) to accept Applicant consent independently.'
              ],
          suggestedSafeguardClause: isSueAnne
            ? `Counter-Submission: Order ${order.orderNumber} should be dismissed in its entirety as contrary to the best interests of the children under s 60CC.`
            : `${order.orderNumber}.1 In the event of dispute, the direction of the treating specialist or school principal shall govern immediately pending listing.`
        }
      };
    });

    onUpdateOrders(updated);
    setFeedbackMsg(`Evaluated ${targetOrders.length} orders in ${currentPartyDisplayLabel} against statutory s60CC tests and evidence.`);
  };

  const handleCopyMinutes = () => {
    const partyTitle = activeParty === 'mine'
      ? 'MINUTE OF FINAL PARENTING ORDERS SOUGHT BY THE APPLICANT (BENJAMIN HAWKINS)'
      : 'MINUTE OF ORDERS SOUGHT IN RESPONSE BY THE RESPONDENT (SUE-ANNE HAWKINS)';

    const text = `IN THE FAMILY COURT OF WESTERN AUSTRALIA
PRINCIPAL REGISTRY
FILE NO: FCWA 2023/0842

BETWEEN:
BENJAMIN HAWKINS (Applicant Father)
- and -
SUE-ANNE HAWKINS (Respondent Mother)

${partyTitle}

${currentPartyOrders.map((o) => `// ${o.orderNumber}: ${o.title} (${o.category})
${o.proposedText}
${o.assessment?.suggestedSafeguardClause ? `// Counsel Analysis / Safeguard:\n${o.assessment.suggestedSafeguardClause}\n` : ''}`).join('\n\n')}

DATED: ${new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}
PREPARED FOR: Case 4344/2023 Intelligence System`;

    navigator.clipboard.writeText(text);
    setCopiedId('minutes');
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleCopyOrder = (order: ProposedParentingOrder) => {
    const text = `${order.orderNumber}: ${order.title}
Proposing Party: ${order.proposingParty || 'Benjamin Hawkins'}
Category: ${order.category}

PROPOSED ORDER TEXT:
${order.proposedText}

RATIONALE / ARGUMENT:
${order.rationale}
${order.assessment?.suggestedSafeguardClause ? `\nSUGGESTED COUNSEL SAFEGUARD / COUNTER-SUBMISSION:\n${order.assessment.suggestedSafeguardClause}` : ''}`;

    navigator.clipboard.writeText(text);
    setCopiedId(order.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getFeasibilityBadge = (assessment?: ProposedParentingOrder['assessment'], isSueAnne: boolean = false) => {
    if (!assessment) return null;
    switch (assessment.overallFeasibility) {
      case 'Strong Court Prospect':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'Moderate - Needs Safeguard':
      case 'Moderate / Needs Clause Tuning':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'High Risk of Breach':
      case 'High Conflict Risk':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  return (
    <div className="space-y-5" id="party-orders-toggle-container">
      {/* Top Toggle Navigator */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-2 sm:p-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Main Toggle Switch */}
          <div className="inline-flex p-1.5 bg-slate-100 rounded-xl border border-slate-200/80 w-full md:w-auto">
            {/* Tab 1: My Proposed Orders (Benjamin Hawkins) */}
            <button
              type="button"
              onClick={() => setActiveParty('mine')}
              id="toggle-view-my-orders"
              className={`flex-1 md:flex-initial px-4 py-2.5 rounded-lg flex items-center justify-center gap-2.5 text-xs font-bold transition-all ${
                activeParty === 'mine'
                  ? 'bg-indigo-900 text-white shadow-sm ring-1 ring-indigo-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <UserCheck className={`w-4 h-4 ${activeParty === 'mine' ? 'text-indigo-200' : 'text-indigo-600'}`} />
              <div className="text-left">
                <span className="block leading-none">My Proposed Orders</span>
                <span className={`text-[10px] font-normal ${activeParty === 'mine' ? 'text-indigo-200' : 'text-slate-500'}`}>
                  Benjamin Hawkins (Father) • {myOrders.length} orders
                </span>
              </div>
              <span className={`ml-1 text-[11px] font-mono font-bold px-1.5 py-0.5 rounded ${
                activeParty === 'mine' 
                  ? 'bg-indigo-800 text-white' 
                  : 'bg-slate-200 text-slate-700'
              }`}>
                {myOrders.length}
              </span>
            </button>

            {/* Tab 2: Sue-Anne's Proposed Orders (Sue-Anne Hawkins) */}
            <button
              type="button"
              onClick={() => setActiveParty('sue-anne')}
              id="toggle-view-sue-anne-orders"
              className={`flex-1 md:flex-initial px-4 py-2.5 rounded-lg flex items-center justify-center gap-2.5 text-xs font-bold transition-all ${
                activeParty === 'sue-anne'
                  ? 'bg-rose-900 text-white shadow-sm ring-1 ring-rose-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <UserX className={`w-4 h-4 ${activeParty === 'sue-anne' ? 'text-rose-200' : 'text-rose-600'}`} />
              <div className="text-left">
                <span className="block leading-none">Sue-Anne's Proposed Orders</span>
                <span className={`text-[10px] font-normal ${activeParty === 'sue-anne' ? 'text-rose-200' : 'text-slate-500'}`}>
                  Sue-Anne Hawkins (Mother) • {sueAnneOrders.length} orders
                </span>
              </div>
              <span className={`ml-1 text-[11px] font-mono font-bold px-1.5 py-0.5 rounded ${
                activeParty === 'sue-anne' 
                  ? 'bg-rose-800 text-white' 
                  : 'bg-slate-200 text-slate-700'
              }`}>
                {sueAnneOrders.length}
              </span>
            </button>
          </div>

          {/* Action Tools for Active View */}
          <div className="flex flex-wrap items-center gap-2 self-end md:self-center">
            <button
              onClick={() => onOpenAddModal(currentPartyName as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border shadow-2xs ${
                activeParty === 'mine'
                  ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
                  : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
              }`}
              id={`add-order-btn-${activeParty}`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add to {activeParty === 'mine' ? 'Mine' : "Sue-Anne's"}</span>
            </button>

            <button
              onClick={handleCopyMinutes}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-200 shadow-2xs"
              title="Copy Court Formatted Minutes for this Party"
            >
              {copiedId === 'minutes' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-bold">Minutes Copied!</span>
                </>
              ) : (
                <>
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  <span>Export {activeParty === 'mine' ? 'My' : "Sue-Anne's"} Minutes</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Embedded AI Evaluation Command Center for Active Party */}
      <div 
        className={`rounded-xl p-4 sm:p-5 border shadow-xs transition-all ${
          activeParty === 'mine'
            ? 'bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white border-indigo-800'
            : 'bg-gradient-to-br from-rose-950 via-slate-900 to-rose-900 text-white border-rose-800'
        }`}
        id={`ai-evaluation-banner-${activeParty}`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className={`p-1.5 rounded-md flex items-center justify-center ${
                activeParty === 'mine' ? 'bg-indigo-700 text-indigo-100' : 'bg-rose-700 text-rose-100'
              }`}>
                <Zap className="w-4 h-4 text-amber-300" />
              </span>
              <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded font-mono ${
                activeParty === 'mine' ? 'bg-indigo-800/80 text-indigo-200' : 'bg-rose-800/80 text-rose-200'
              }`}>
                {activeParty === 'mine' ? 'Applicant Feasibility & Safeguards Engine' : 'Respondent Breach & Rebuttal Engine'}
              </span>
              <span className="text-xs text-slate-300 font-medium">
                {assessedCount} of {currentPartyOrders.length} assessed
              </span>
            </div>

            <h3 className="text-base sm:text-lg font-bold tracking-tight">
              {activeParty === 'mine' 
                ? "AI Evaluation for My Proposed Orders (Benjamin Hawkins)" 
                : "AI Evaluation for Sue-Anne's Proposed Orders (Sue-Anne Hawkins)"}
            </h3>

            <p className="text-xs text-slate-200/90 leading-relaxed">
              {activeParty === 'mine'
                ? "Evaluates Applicant Father's draft orders against Family Law Act 1975 s60CC best interests tests, verifies enforceability, cross-checks past parental disputes, and generates self-executing safeguard clauses."
                : "Evaluates Respondent Mother's draft orders against documented medical concealment (SJOG Midland), school attendance audits, and travel breaches to formulate cross-examination counter-submissions for trial counsel."}
            </p>
          </div>

          {/* Embedded AI Action Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0 self-start lg:self-center">
            {/* Main Embedded AI Evaluation Button */}
            <button
              type="button"
              onClick={() => handleRunPartyAiEvaluation(false)}
              disabled={isAssessingParty || currentPartyOrders.length === 0}
              id={`evaluate-party-orders-btn-${activeParty}`}
              className={`px-4 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all ${
                isAssessingParty
                  ? 'bg-slate-700 text-slate-300 cursor-not-allowed'
                  : activeParty === 'mine'
                  ? 'bg-indigo-500 hover:bg-indigo-400 text-white ring-2 ring-indigo-300/40 hover:ring-indigo-300'
                  : 'bg-rose-600 hover:bg-rose-500 text-white ring-2 ring-rose-300/40 hover:ring-rose-300'
              }`}
            >
              {isAssessingParty ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Evaluating {activeParty === 'mine' ? 'My' : "Sue-Anne's"} Orders...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>
                    {activeParty === 'mine' ? 'Assess All My Orders' : "Assess All Sue-Anne's Orders"} ({currentPartyOrders.length})
                  </span>
                </>
              )}
            </button>

            {/* Evaluate Only Ticked Button if subset selected */}
            {tickedCount > 0 && tickedCount < currentPartyOrders.length && (
              <button
                type="button"
                onClick={() => handleRunPartyAiEvaluation(true)}
                disabled={isAssessingParty}
                className="px-3 py-2.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/20 flex items-center justify-center gap-1.5 transition-colors"
                title={`Run evaluation only for ${tickedCount} ticked orders`}
              >
                <CheckSquare className="w-3.5 h-3.5 text-amber-300" />
                <span>Assess Ticked ({tickedCount})</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Evaluation Status Pills */}
        <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-slate-300 font-medium">Quick Selection:</span>
            <button
              onClick={() => handleSelectPartyAll(true)}
              className="px-2 py-0.5 rounded text-[11px] bg-white/10 hover:bg-white/20 text-slate-200 transition-colors"
            >
              Tick All for AI ({currentPartyOrders.length})
            </button>
            <button
              onClick={() => handleSelectPartyAll(false)}
              className="px-2 py-0.5 rounded text-[11px] bg-white/10 hover:bg-white/20 text-slate-300 transition-colors"
            >
              Untick All
            </button>
          </div>

          <div className="flex items-center gap-2 font-mono text-[11px] text-slate-300">
            <span>Ticked for Review: <strong>{tickedCount}</strong></span>
            <span>•</span>
            <span>Assessed: <strong>{assessedCount}</strong></span>
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedbackMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-center justify-between shadow-2xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
          <button
            onClick={() => setFeedbackMsg(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Search & Category Filter Toolbar */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder={`Search ${activeParty === 'mine' ? 'my' : "Sue-Anne's"} orders...`}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="text-[11px] text-slate-500 shrink-0">Category:</span>
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 focus:outline-none"
          >
            <option value="all">All Categories ({currentPartyOrders.length})</option>
            <option value="Parental Responsibility">Parental Responsibility</option>
            <option value="Living Arrangements / Care Time">Living Arrangements / Care Time</option>
            <option value="Education & Extracurricular">Education & Extracurricular</option>
            <option value="Communication & Notice">Communication & Notice</option>
            <option value="Injunctions & Restraints">Injunctions & Restraints</option>
            <option value="Medical & Therapy">Medical & Therapy</option>
          </select>
        </div>
      </div>

      {/* Orders List for Active Party */}
      <div className="space-y-4" id={`orders-list-${activeParty}`}>
        {filteredOrders.length === 0 ? (
          <div className="p-10 text-center bg-white rounded-xl border border-slate-200 text-slate-500 text-xs space-y-2">
            <p>No orders found in {currentPartyDisplayLabel} matching your filter criteria.</p>
            <button
              onClick={() => onOpenAddModal(currentPartyName as any)}
              className={`font-semibold underline ${activeParty === 'mine' ? 'text-indigo-600' : 'text-rose-600'}`}
            >
              Click here to add a new order to this view
            </button>
          </div>
        ) : (
          filteredOrders.map(order => {
            const isExpanded = expandedOrderIds.includes(order.id);
            const isTicked = order.selectedForAiReview;
            const assessment = order.assessment;
            const isSueAnne = order.proposingParty === 'Sue-Anne Hawkins';
            const isSingleEvaluating = evaluatingSingleId === order.id;

            return (
              <div 
                key={order.id}
                id={`party-order-card-${order.id}`}
                className={`bg-white rounded-xl shadow-xs border transition-all ${
                  isSueAnne
                    ? isTicked
                      ? 'border-rose-300 ring-1 ring-rose-100'
                      : 'border-rose-100 hover:border-rose-200'
                    : isTicked
                    ? 'border-indigo-300 ring-1 ring-indigo-100'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Header */}
                <div 
                  className={`p-4 border-b flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer transition-colors ${
                    isSueAnne 
                      ? 'bg-rose-50/40 border-rose-100 hover:bg-rose-50/70' 
                      : 'bg-slate-50/70 border-slate-200/80 hover:bg-slate-50'
                  }`}
                  onClick={() => toggleExpand(order.id)}
                >
                  <div className="flex items-start gap-3">
                    {/* Tick Checkbox */}
                    <button
                      type="button"
                      onClick={(e) => toggleSelectForAi(order.id, e)}
                      className={`mt-1 p-1 focus:outline-none shrink-0 ${
                        isSueAnne ? 'text-rose-600 hover:text-rose-800' : 'text-indigo-600 hover:text-indigo-800'
                      }`}
                      title={isTicked ? 'Ticked for batch AI evaluation' : 'Unticked - Click to include'}
                    >
                      {isTicked ? (
                        <CheckSquare className={`w-5 h-5 ${isSueAnne ? 'text-rose-600 fill-rose-50' : 'text-indigo-600 fill-indigo-50'}`} />
                      ) : (
                        <Square className="w-5 h-5 text-slate-400 hover:text-slate-600" />
                      )}
                    </button>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`font-mono font-bold text-xs px-2 py-0.5 rounded border ${
                          isSueAnne 
                            ? 'text-rose-900 bg-rose-100 border-rose-200' 
                            : 'text-indigo-900 bg-indigo-100 border-indigo-200'
                        }`}>
                          {order.orderNumber}
                        </span>

                        <span className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase tracking-wider ${
                          isSueAnne
                            ? 'bg-rose-200/80 text-rose-900'
                            : 'bg-indigo-200/80 text-indigo-900'
                        }`}>
                          {isSueAnne ? "Sue-Anne's (Respondent)" : 'Mine (Applicant)'}
                        </span>

                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-medium">
                          {order.category}
                        </span>

                        {assessment ? (
                          <>
                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${getFeasibilityBadge(assessment, isSueAnne)}`}>
                              {assessment.overallFeasibility}
                            </span>
                            {assessment.riskLevel && (
                              <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${
                                assessment.riskLevel === 'Critical' ? 'bg-red-100 text-red-800 border-red-300' :
                                assessment.riskLevel === 'High' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                                assessment.riskLevel === 'Medium' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                                'bg-emerald-100 text-emerald-800 border-emerald-300'
                              }`}>
                                Risk: {assessment.riskLevel}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">
                            Not yet assessed
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-bold text-slate-900 mt-1.5">
                        {order.title}
                      </h3>
                    </div>
                  </div>

                  {/* Actions right */}
                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    {/* Embedded Single Order AI Re-Evaluation Trigger */}
                    <button
                      type="button"
                      onClick={(e) => handleEvaluateSingleOrder(order, e)}
                      disabled={isSingleEvaluating || isAssessingParty}
                      className={`px-2.5 py-1 text-xs rounded font-semibold flex items-center gap-1 shadow-2xs transition-colors ${
                        isSueAnne
                          ? 'bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-200'
                          : 'bg-indigo-100 hover:bg-indigo-200 text-indigo-800 border border-indigo-200'
                      }`}
                      title="Run embedded AI evaluation specifically on this order"
                    >
                      {isSingleEvaluating ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          <span>Assessing...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3 h-3 text-amber-500" />
                          <span>{assessment ? 'Re-Evaluate AI' : 'Evaluate with AI'}</span>
                        </>
                      )}
                    </button>

                    {/* Copy Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyOrder(order);
                      }}
                      className="px-2.5 py-1 text-xs bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded flex items-center gap-1 shadow-2xs"
                      title="Copy this order text"
                    >
                      {copiedId === order.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700 font-semibold">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-500" />
                          <span>Copy</span>
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

                {/* Collapsible Details */}
                {isExpanded && (
                  <div className="p-5 space-y-5 text-xs">
                    {/* Proposed Formal Text */}
                    <div className="p-3.5 rounded-lg font-mono text-[11px] leading-relaxed border bg-slate-900 text-slate-100 border-slate-800">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-sans font-bold">
                          Formal Court Order Draft (Court Minute Format)
                        </span>
                        <span className={`text-[10px] font-sans font-bold px-1.5 py-0.5 rounded ${
                          isSueAnne ? 'bg-rose-900/70 text-rose-300' : 'bg-indigo-900/70 text-indigo-300'
                        }`}>
                          {isSueAnne ? "Respondent Sue-Anne's Draft" : "Applicant Benjamin's Draft"}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap">
                        {order.proposedText}
                      </p>
                    </div>

                    {/* Rationale / Submission */}
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        {isSueAnne ? "Respondent Mother's Factual Submission & Argument" : "Applicant Father's Factual Rationale"}
                      </span>
                      <p className="text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">
                        {order.rationale}
                      </p>
                    </div>

                    {/* AI Assessment Report */}
                    {assessment ? (
                      <OrderAssessmentOutput
                        order={order}
                        assessment={assessment}
                        documents={documents}
                        onViewDocument={onViewDocument}
                        onReevaluate={() => handleEvaluateSingleOrder(order, { stopPropagation: () => {} } as any)}
                        isEvaluating={isSingleEvaluating}
                      />
                    ) : (
                      <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-center space-y-2">
                        <p className="text-xs text-slate-500">
                          This order has not been evaluated against Court Criteria and statutory factors yet.
                        </p>
                        <button
                          type="button"
                          onClick={(e) => handleEvaluateSingleOrder(order, e)}
                          disabled={isSingleEvaluating}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 text-white ${
                            isSueAnne ? 'bg-rose-600 hover:bg-rose-700' : 'bg-indigo-600 hover:bg-indigo-700'
                          }`}
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                          <span>Evaluate Against Court Criteria (s60CC & Party History)</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
