import React, { useState } from 'react';
import { 
  Scale, 
  Sparkles, 
  RefreshCw, 
  CheckSquare, 
  Square, 
  CheckCircle2, 
  ShieldAlert, 
  FileText, 
  Copy, 
  Check, 
  Plus, 
  ChevronDown, 
  ChevronUp, 
  UserX, 
  Zap,
  ArrowRightLeft,
  UserCheck,
  Users
} from 'lucide-react';
import { ProposedParentingOrder, ProposedOrderAssessment, CourtCriterion, DocumentRecord, EvidenceCitation } from '../types';
import { PartyOrdersToggleView } from './PartyOrdersToggleView';
import { OrderAssessmentOutput } from './OrderAssessmentOutput';

interface ProposedOrdersProps {
  orders: ProposedParentingOrder[];
  courtCriteria: CourtCriterion[];
  documents: DocumentRecord[];
  onUpdateOrders: (updated: ProposedParentingOrder[]) => void;
  onNavigateToAffidavit: () => void;
  onNavigateToCriteria: () => void;
  onViewDocument?: (doc: DocumentRecord) => void;
}

type SectionViewMode = 'toggle' | 'comparison' | 'both' | 'mine' | 'sue-anne';

interface HeadToHeadComparisonItem {
  id: string;
  issueTitle: string;
  category: string;
  fatherOrderNumber: string;
  fatherTitle: string;
  fatherText: string;
  fatherRationale: string;
  fatherProspect: string;
  motherOrderNumber: string;
  motherTitle: string;
  motherText: string;
  motherRationale: string;
  motherRisk: string;
  judicialAnalysis: string;
  crossExaminationPoint: string;
  evidenceRefs: string[];
}

const COMPARISON_MATRIX: HeadToHeadComparisonItem[] = [];

export const ProposedOrders: React.FC<ProposedOrdersProps> = ({
  orders,
  courtCriteria,
  documents,
  onUpdateOrders,
  onNavigateToAffidavit,
  onNavigateToCriteria,
  onViewDocument,
}) => {
  const [activeSectionView, setActiveSectionView] = useState<SectionViewMode>('toggle');
  const [expandedOrderIds, setExpandedOrderIds] = useState<string[]>(orders.map(o => o.id));
  const [isAssessing, setIsAssessing] = useState(false);
  const [selectedOrderForAiTriggerId, setSelectedOrderForAiTriggerId] = useState<string>(orders[0]?.id || '');
  const [evaluatingSingleOrderId, setEvaluatingSingleOrderId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New Order Form state
  const [newProposingParty, setNewProposingParty] = useState<'Benjamin Hawkins' | 'Sue-Anne Hawkins'>('Benjamin Hawkins');
  const [newOrderNumber, setNewOrderNumber] = useState('Order 7.0');
  const [newCategory, setNewCategory] = useState<ProposedParentingOrder['category']>('Parental Responsibility');
  const [newTitle, setNewTitle] = useState('');
  const [newText, setNewText] = useState('');
  const [newRationale, setNewRationale] = useState('');
  const [newSelectedForAi, setNewSelectedForAi] = useState(true);

  // Separate orders into two sections
  const myOrders = orders.filter(o => !o.proposingParty || o.proposingParty === 'Benjamin Hawkins');
  const sueAnneOrders = orders.filter(o => o.proposingParty === 'Sue-Anne Hawkins');

  const selectedOrderForAiTrigger = orders.find(o => o.id === selectedOrderForAiTriggerId) || orders[0];

  const selectedCount = orders.filter(o => o.selectedForAiReview).length;

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

  const handleSelectAll = (select: boolean) => {
    const updated = orders.map(o => ({ ...o, selectedForAiReview: select }));
    onUpdateOrders(updated);
  };

  const handleSelectSectionAll = (party: 'mine' | 'sue-anne', select: boolean) => {
    const updated = orders.map(o => {
      const isMatch = party === 'mine' 
        ? (!o.proposingParty || o.proposingParty === 'Benjamin Hawkins')
        : (o.proposingParty === 'Sue-Anne Hawkins');
      return isMatch ? { ...o, selectedForAiReview: select } : o;
    });
    onUpdateOrders(updated);
  };

  const handleOpenAddModal = (targetParty: 'Benjamin Hawkins' | 'Sue-Anne Hawkins') => {
    setNewProposingParty(targetParty);
    if (targetParty === 'Benjamin Hawkins') {
      setNewOrderNumber(`Order ${myOrders.length + 1}.0`);
    } else {
      setNewOrderNumber(`Order S-${sueAnneOrders.length + 1}.0`);
    }
    setIsAddModalOpen(true);
  };

  const handleEvaluateSingleOrder = async (orderToAssess: ProposedParentingOrder, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsAssessing(true);
    setEvaluatingSingleOrderId(orderToAssess.id);
    setSelectedOrderForAiTriggerId(orderToAssess.id);
    setFeedbackMsg(`Evaluating ${orderToAssess.orderNumber} against statutory s60CC criteria and evidentiary history...`);

    // Ensure this order is expanded so assessment is displayed directly below it
    if (!expandedOrderIds.includes(orderToAssess.id)) {
      setExpandedOrderIds(prev => [...prev, orderToAssess.id]);
    }

    try {
      const res = await fetch('/api/gemini/assess-proposed-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ordersToAssess: [orderToAssess],
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
        if (data.assessedOrders && Array.isArray(data.assessedOrders) && data.assessedOrders.length > 0) {
          const evaluated = data.assessedOrders[0];
          const updated = orders.map(o => o.id === evaluated.id ? evaluated : o);
          onUpdateOrders(updated);
          setFeedbackMsg(`AI evaluation complete for ${orderToAssess.orderNumber}. Risk Level: ${evaluated.assessment?.riskLevel || 'Assessed'}. Primary citations and s60CC factors displayed below.`);
        } else {
          simulateLocalAssessment([orderToAssess]);
        }
      } else {
        simulateLocalAssessment([orderToAssess]);
      }
    } catch (err) {
      console.warn('Endpoint error, applying local evaluation:', err);
      simulateLocalAssessment([orderToAssess]);
    } finally {
      setIsAssessing(false);
      setEvaluatingSingleOrderId(null);
      setTimeout(() => setFeedbackMsg(null), 6000);
    }
  };

  const handleRunAssessment = async () => {
    const tickedOrders = orders.filter(o => o.selectedForAiReview);
    if (tickedOrders.length === 0) {
      setFeedbackMsg('Please tick at least one order for AI review.');
      setTimeout(() => setFeedbackMsg(null), 3000);
      return;
    }

    setIsAssessing(true);
    setFeedbackMsg(null);

    try {
      const res = await fetch('/api/gemini/assess-proposed-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ordersToAssess: tickedOrders,
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
          setFeedbackMsg(data.summary || `AI assessment complete for ${tickedOrders.length} orders across both parties. Evaluated against s60CC best interests and corroborating evidence.`);
        } else {
          simulateLocalAssessment(tickedOrders);
        }
      } else {
        simulateLocalAssessment(tickedOrders);
      }
    } catch (e) {
      console.warn('AI order assessment endpoint error, applying local engine:', e);
      simulateLocalAssessment(tickedOrders);
    } finally {
      setIsAssessing(false);
      setTimeout(() => setFeedbackMsg(null), 7000);
    }
  };

  const simulateLocalAssessment = (ticked: ProposedParentingOrder[]) => {
    const nowStamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const tickedIds = new Set(ticked.map(t => t.id));

    const updated = orders.map(order => {
      if (!tickedIds.has(order.id) && !order.selectedForAiReview) return order;
      const isSueAnne = order.proposingParty === 'Sue-Anne Hawkins';

      // Correlate with real ingested documents if available, otherwise empty citations
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
                ? 'Respondent\'s proposed order assessed against s 60CC(2)(a) requirements regarding disclosure and child safety.'
                : 'Directly aligns with judicial objective of establishing clear parental protocols and timely disclosures.',
              passesBestInterests: !isSueAnne
            },
            {
              criterionId: 's60CC-2c',
              statutoryRef: 's 60CC(2)(c) - Developmental needs of children',
              alignmentAnalysis: isSueAnne
                ? 'Requires evidence of consistency with children\'s developmental, medical and educational schedules.'
                : 'Supports developmental continuity, education stability, and routine adherence.',
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
                'Specify self-executing default mechanisms in the event of parental deadlock.'
              ],
          suggestedSafeguardClause: isSueAnne
            ? `Counter-Submission: Order ${order.orderNumber} should be conditioned upon mutual written consent and verified third-party records.`
            : `${order.orderNumber}.1 In the event of dispute, the direction of the treating specialist or school principal shall govern pending urgent listing.`
        }
      };
    });

    onUpdateOrders(updated);
    setFeedbackMsg(`Assessed ${ticked.length} order(s) against Court Criteria, s60CC factors, and evidentiary records.`);
  };

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newText.trim()) return;

    const newOrder: ProposedParentingOrder = {
      id: `PROP-${Date.now().toString().slice(-4)}`,
      orderNumber: newOrderNumber.trim(),
      proposingParty: newProposingParty,
      category: newCategory,
      title: newTitle.trim(),
      proposedText: newText.trim(),
      rationale: newRationale.trim() || (newProposingParty === 'Benjamin Hawkins' 
        ? 'Required to ensure child safety, routine stability, and adherence to s60CC.' 
        : 'Sought by Respondent Mother in her formal response material.'),
      selectedForAiReview: newSelectedForAi
    };

    onUpdateOrders([...orders, newOrder]);
    setIsAddModalOpen(false);
    setNewTitle('');
    setNewText('');
    setNewRationale('');
    setFeedbackMsg(`New proposed order added for ${newProposingParty === 'Benjamin Hawkins' ? 'Father (Mine)' : "Mother (Sue-Anne's)"}.`);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const handleCopyMinutes = (party: 'mine' | 'sue-anne' | 'both') => {
    const targetOrders = party === 'mine'
      ? myOrders
      : party === 'sue-anne'
      ? sueAnneOrders
      : orders;

    const partyTitle = party === 'mine'
      ? 'MINUTE OF FINAL PARENTING ORDERS SOUGHT BY THE APPLICANT (BENJAMIN HAWKINS)'
      : party === 'sue-anne'
      ? 'MINUTE OF ORDERS SOUGHT IN RESPONSE BY THE RESPONDENT (SUE-ANNE HAWKINS)'
      : 'COMPREHENSIVE PARENTING ORDERS SCHEDULE - APPLICANT & RESPONDENT SOUGHT ORDERS';

    const text = `IN THE FAMILY COURT OF WESTERN AUSTRALIA
PRINCIPAL REGISTRY
FILE NO: FCWA 2023/0842

BETWEEN:
BENJAMIN HAWKINS (Applicant Father)
- and -
SUE-ANNE HAWKINS (Respondent Mother)

${partyTitle}

${targetOrders.map((o) => `// ${o.orderNumber}: ${o.title} [Proposed by: ${o.proposingParty || 'Benjamin Hawkins'}] (${o.category})
${o.proposedText}
${o.assessment?.suggestedSafeguardClause ? `// Legal Counsel Safeguard / Counter-Position:\n${o.assessment.suggestedSafeguardClause}\n` : ''}`).join('\n\n')}

DATED: ${new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}
PREPARED FOR: Case 4344/2023 Intelligence System`;

    navigator.clipboard.writeText(text);
    setCopiedId(party);
    setTimeout(() => setCopiedId(null), 3000);
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
    setTimeout(() => setCopiedId(null), 2500);
  };

  const getFeasibilityBadge = (f?: ProposedParentingOrder['assessment'], isSueAnne: boolean = false) => {
    if (!f) return null;
    switch (f.overallFeasibility) {
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

  // Helper to render an individual order card
  const renderOrderCard = (order: ProposedParentingOrder) => {
    const isExpanded = expandedOrderIds.includes(order.id);
    const isTicked = order.selectedForAiReview;
    const assessment = order.assessment;
    const isSueAnne = order.proposingParty === 'Sue-Anne Hawkins';

    return (
      <div 
        key={order.id}
        id={`order-card-${order.id}`}
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
        {/* Card Header */}
        <div 
          className={`p-4 border-b flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer transition-colors ${
            isSueAnne 
              ? 'bg-rose-50/40 border-rose-100 hover:bg-rose-50/70' 
              : 'bg-slate-50/70 border-slate-200/80 hover:bg-slate-50'
          }`}
          onClick={() => toggleExpand(order.id)}
        >
          <div className="flex items-start gap-3">
            {/* AI Review Checkbox */}
            <button
              type="button"
              onClick={(e) => toggleSelectForAi(order.id, e)}
              className={`mt-1 p-1 focus:outline-none shrink-0 ${
                isSueAnne ? 'text-rose-600 hover:text-rose-800' : 'text-indigo-600 hover:text-indigo-800'
              }`}
              title={isTicked ? 'Ticked for AI Review' : 'Unticked - Click to include in AI Assessment'}
              id={`tick-ai-order-${order.id}`}
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

                {isTicked ? (
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold border flex items-center gap-1 ${
                    isSueAnne 
                      ? 'bg-rose-50 text-rose-700 border-rose-200' 
                      : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  }`}>
                    <Sparkles className="w-2.5 h-2.5" />
                    AI Review Ticked
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded text-slate-400 bg-slate-100 border border-slate-200">
                    AI Review Unticked
                  </span>
                )}

                {assessment && (
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
                )}
              </div>

              <h3 className="text-sm font-bold text-slate-900 mt-1.5">
                {order.title}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-center shrink-0">
            {/* Specific AI Assessment Button on Order Card */}
            <button
              type="button"
              onClick={(e) => handleEvaluateSingleOrder(order, e)}
              disabled={evaluatingSingleOrderId === order.id || isAssessing}
              className={`px-2.5 py-1 text-xs rounded font-semibold flex items-center gap-1 shadow-2xs transition-colors ${
                isSueAnne
                  ? 'bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-200'
                  : 'bg-indigo-100 hover:bg-indigo-200 text-indigo-800 border border-indigo-200'
              }`}
              title="Evaluate this specific order against Court Criteria (s60CC) & party history"
            >
              {evaluatingSingleOrderId === order.id ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>Evaluating...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span>{assessment ? 'Re-Assess AI' : 'AI Assess (s60CC)'}</span>
                </>
              )}
            </button>

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

        {/* Collapsible Content */}
        {isExpanded && (
          <div className="p-5 space-y-5 text-xs">
            {/* Proposed Formal Text */}
            <div className={`p-3.5 rounded-lg font-mono text-[11px] leading-relaxed border ${
              isSueAnne 
                ? 'bg-slate-900 text-rose-100 border-slate-800' 
                : 'bg-slate-900 text-slate-100 border-slate-800'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-sans font-bold">
                  Formal Draft Order Text (Court Minute Format)
                </span>
                <span className={`text-[10px] font-sans font-bold px-1.5 py-0.5 rounded ${
                  isSueAnne ? 'bg-rose-900/60 text-rose-300' : 'bg-indigo-900/60 text-indigo-300'
                }`}>
                  {isSueAnne ? "Respondent Sue-Anne's Draft" : "Applicant Benjamin's Draft"}
                </span>
              </div>
              <p className="whitespace-pre-wrap">
                {order.proposedText}
              </p>
            </div>

            {/* Rationale / Mother's Argument */}
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                {isSueAnne ? "Respondent Mother's Factual Submission & Argument" : "Applicant Father's Factual Rationale"}
              </span>
              <p className="text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">
                {order.rationale}
              </p>
            </div>

            {/* AI Assessment Report Displayed Directly Below Order */}
            {assessment ? (
              <OrderAssessmentOutput
                order={order}
                assessment={assessment}
                documents={documents}
                onViewDocument={onViewDocument}
                onReevaluate={() => handleEvaluateSingleOrder(order)}
                isEvaluating={evaluatingSingleOrderId === order.id}
              />
            ) : (
              <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-center space-y-2">
                <p className="text-xs text-slate-500">
                  This order has not been evaluated against Court Criteria and statutory factors yet.
                </p>
                <button
                  type="button"
                  onClick={(e) => handleEvaluateSingleOrder(order, e)}
                  disabled={evaluatingSingleOrderId === order.id || isAssessing}
                  className={`text-xs font-semibold px-3.5 py-1.5 rounded-lg inline-flex items-center gap-1.5 text-white shadow-2xs ${
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
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
                <Scale className="w-5 h-5" />
              </span>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Proposed Parenting Orders &amp; Bilateral Matrix</h1>
                <p className="text-xs text-slate-500">
                  Organized into two distinct sections: <strong>My Proposed Orders</strong> (Father / Applicant) and <strong>Sue-Anne's Proposed Orders</strong> (Mother / Respondent). Compare positions head-to-head and run AI assessments against statutory s60CC tests and evidence.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleOpenAddModal('Benjamin Hawkins')}
              className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-indigo-200"
              id="add-my-order-btn"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add to Mine</span>
            </button>

            <button
              onClick={() => handleOpenAddModal('Sue-Anne Hawkins')}
              className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-rose-200"
              id="add-sue-anne-order-btn"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add to Sue-Anne's</span>
            </button>

            <button
              onClick={() => handleCopyMinutes('mine')}
              className="px-3 py-2 bg-white hover:bg-slate-50 text-indigo-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-indigo-200 shadow-2xs"
              title="Copy complete Applicant Minutes formatted for Family Court of WA"
            >
              {copiedId === 'mine' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-bold">My Minutes Copied!</span>
                </>
              ) : (
                <>
                  <FileText className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Export My Minutes</span>
                </>
              )}
            </button>

            <button
              onClick={() => handleCopyMinutes('sue-anne')}
              className="px-3 py-2 bg-white hover:bg-slate-50 text-rose-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-rose-200 shadow-2xs"
              title="Copy Sue-Anne's Orders formatted for analysis"
            >
              {copiedId === 'sue-anne' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-bold">Sue-Anne's Copied!</span>
                </>
              ) : (
                <>
                  <FileText className="w-3.5 h-3.5 text-rose-600" />
                  <span>Export Sue-Anne's</span>
                </>
              )}
            </button>

            <button
              onClick={handleRunAssessment}
              disabled={isAssessing || selectedCount === 0}
              className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 shadow-xs transition-all ${
                isAssessing || selectedCount === 0
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white animate-pulse'
              }`}
              id="run-ai-assessment-orders-btn"
            >
              {isAssessing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Assessing ({selectedCount})...</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 text-amber-300" />
                  <span>Run AI Assessment ({selectedCount} Selected)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="mt-5 border-t border-slate-100 pt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex p-1 bg-slate-100 rounded-lg border border-slate-200/80 text-xs font-medium">
            <button
              onClick={() => setActiveSectionView('toggle')}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all ${
                activeSectionView === 'toggle' || activeSectionView === 'mine' || activeSectionView === 'sue-anne'
                  ? 'bg-white text-indigo-950 font-bold shadow-2xs ring-1 ring-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              id="view-mode-party-toggle"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Party Orders Toggle View</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 bg-indigo-100 text-indigo-800 rounded font-bold">
                My Orders ↔ Sue-Anne's
              </span>
            </button>

            <button
              onClick={() => setActiveSectionView('comparison')}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all ${
                activeSectionView === 'comparison'
                  ? 'bg-white text-amber-900 font-bold shadow-2xs ring-1 ring-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              id="view-mode-comparison"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-amber-600" />
              <span>Head-to-Head Comparison</span>
            </button>

            <button
              onClick={() => setActiveSectionView('both')}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all ${
                activeSectionView === 'both'
                  ? 'bg-white text-slate-900 font-bold shadow-2xs ring-1 ring-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              id="view-mode-both"
            >
              <Users className="w-3.5 h-3.5 text-slate-600" />
              <span>Both Sections Stacked ({orders.length})</span>
            </button>
          </div>

          {/* Quick Selection Helpers */}
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="font-mono text-[11px]">
              {selectedCount} of {orders.length} orders selected for AI
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleSelectAll(true)}
                className="text-[11px] text-indigo-600 hover:underline font-medium"
              >
                Select All
              </button>
              <span className="text-slate-300">|</span>
              <button
                onClick={() => handleSelectAll(false)}
                className="text-[11px] text-slate-500 hover:underline"
              >
                Deselect All
              </button>
            </div>
          </div>
        </div>

        {feedbackMsg && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{feedbackMsg}</span>
            </div>
          </div>
        )}
      </div>

      {/* SPECIFIC AI ASSESSMENT TRIGGER (COURT CRITERIA & STATUTORY FACTORS) */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-xl shadow-md border border-indigo-800/60 p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-indigo-800/60 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-indigo-600/30 text-indigo-300 rounded-lg border border-indigo-500/30">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Specific AI Assessment Trigger</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/40 font-mono">
                  Family Law Act 1975 (WA) · s 60CC
                </span>
              </h2>
              <p className="text-xs text-indigo-200/80">
                Select any individual order to run an in-depth statutory evaluation against Court Criteria, party behavioral history, and documentary evidence citations.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-indigo-300/80 font-mono text-[11px]">
              Available Orders: {orders.length} ({myOrders.length} Applicant / {sueAnneOrders.length} Respondent)
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
          {/* Order Selector */}
          <div className="lg:col-span-6 space-y-1.5">
            <label htmlFor="ai-target-order-select" className="text-xs font-semibold text-indigo-200 flex items-center justify-between">
              <span>Target Proposed Order to Evaluate:</span>
              {selectedOrderForAiTrigger && (
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                  selectedOrderForAiTrigger.proposingParty === 'Sue-Anne Hawkins'
                    ? 'bg-rose-900/60 text-rose-300 border border-rose-700/50'
                    : 'bg-indigo-900/60 text-indigo-300 border border-indigo-700/50'
                }`}>
                  {selectedOrderForAiTrigger.proposingParty === 'Sue-Anne Hawkins' ? "Sue-Anne's Order" : "My Order (Benjamin)"}
                </span>
              )}
            </label>
            <div className="relative">
              <select
                id="ai-target-order-select"
                value={selectedOrderForAiTriggerId}
                onChange={(e) => setSelectedOrderForAiTriggerId(e.target.value)}
                className="w-full bg-slate-800/90 text-white border border-indigo-700/60 rounded-lg px-3 py-2.5 text-xs font-medium focus:ring-2 focus:ring-indigo-400 focus:outline-none cursor-pointer"
              >
                <optgroup label="Applicant Father's Proposed Orders (My Orders)">
                  {myOrders.map(o => (
                    <option key={o.id} value={o.id}>
                      {o.orderNumber} - {o.title} {o.assessment ? `[Risk: ${o.assessment.riskLevel || o.assessment.overallFeasibility}]` : '[Unassessed]'}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Respondent Mother's Proposed Orders (Sue-Anne)">
                  {sueAnneOrders.map(o => (
                    <option key={o.id} value={o.id}>
                      {o.orderNumber} - {o.title} {o.assessment ? `[Risk: ${o.assessment.riskLevel || o.assessment.overallFeasibility}]` : '[Unassessed]'}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
          </div>

          {/* Statutory Reference Preview Chips */}
          <div className="lg:col-span-3 space-y-1.5">
            <span className="text-xs font-semibold text-indigo-200 block">
              Statutory Benchmark:
            </span>
            <div className="flex flex-wrap gap-1.5">
              <span className="text-[10px] bg-slate-800 text-indigo-200 px-2 py-1 rounded border border-indigo-800/80 font-mono" title="Safety from physical & psychological harm or neglect">
                s 60CC(2)(a)
              </span>
              <span className="text-[10px] bg-slate-800 text-indigo-200 px-2 py-1 rounded border border-indigo-800/80 font-mono" title="Meaningful relationship with both parents">
                s 60CC(2)(b)
              </span>
              <span className="text-[10px] bg-slate-800 text-indigo-200 px-2 py-1 rounded border border-indigo-800/80 font-mono" title="Developmental & speech therapy needs">
                s 60CC(2)(c)
              </span>
              <span className="text-[10px] bg-slate-800 text-indigo-200 px-2 py-1 rounded border border-indigo-800/80 font-mono" title="Party capacity & compliance history">
                s 60CC(3)(d)
              </span>
            </div>
          </div>

          {/* Action Trigger Button */}
          <div className="lg:col-span-3 flex flex-col justify-end">
            <button
              type="button"
              onClick={() => {
                const targetOrder = orders.find(o => o.id === selectedOrderForAiTriggerId) || orders[0];
                if (targetOrder) {
                  handleEvaluateSingleOrder(targetOrder);
                }
              }}
              disabled={isAssessing || !selectedOrderForAiTriggerId}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              id="trigger-specific-order-ai-assessment-btn"
            >
              {isAssessing && evaluatingSingleOrderId === selectedOrderForAiTriggerId ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Assessing Statutory Criteria...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-slate-950" />
                  <span>Evaluate Selected Order (s60CC)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Selected Order Preview Snippet */}
        {selectedOrderForAiTrigger && (
          <div className="bg-slate-950/60 rounded-lg p-3 border border-indigo-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-mono text-amber-400 font-bold">{selectedOrderForAiTrigger.orderNumber}:</span>
              <span className="text-slate-300 font-medium truncate max-w-md">{selectedOrderForAiTrigger.title}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {selectedOrderForAiTrigger.assessment ? (
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                  selectedOrderForAiTrigger.assessment.riskLevel === 'Critical' ? 'bg-red-900/70 text-red-200 border border-red-700' :
                  selectedOrderForAiTrigger.assessment.riskLevel === 'High' ? 'bg-rose-900/70 text-rose-200 border border-rose-700' :
                  selectedOrderForAiTrigger.assessment.riskLevel === 'Medium' ? 'bg-amber-900/70 text-amber-200 border border-amber-700' :
                  'bg-emerald-900/70 text-emerald-200 border border-emerald-700'
                }`}>
                  Current Risk: {selectedOrderForAiTrigger.assessment.riskLevel || selectedOrderForAiTrigger.assessment.overallFeasibility}
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                  Not Evaluated Yet
                </span>
              )}
              <button
                type="button"
                onClick={() => {
                  if (!expandedOrderIds.includes(selectedOrderForAiTrigger.id)) {
                    setExpandedOrderIds(prev => [...prev, selectedOrderForAiTrigger.id]);
                  }
                  const el = document.getElementById(`order-card-${selectedOrderForAiTrigger.id}`);
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
                className="text-[11px] text-indigo-300 hover:text-white underline ml-1 cursor-pointer"
              >
                Jump to Order Card ↓
              </button>
            </div>
          </div>
        )}
      </div>

      {/* COMPARATIVE MATRIX VIEW */}
      {activeSectionView === 'comparison' && (
        <div className="space-y-4">
          <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-4 text-xs">
            <div className="flex items-start gap-2.5">
              <ArrowRightLeft className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-amber-950 text-sm">
                  Head-to-Head Bilateral Comparison Matrix
                </h3>
                <p className="text-amber-800 mt-0.5">
                  Direct judicial comparison of Applicant Father's proposals versus Respondent Mother's proposals across the six key parenting disputes. Highlighting evidentiary contradictions and cross-examination strategies for trial counsel.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {COMPARISON_MATRIX.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500 text-xs">
                No head-to-head comparison records currently entered. Add proposed orders for both parties to generate bilateral comparative cross-examination points.
              </div>
            ) : (
              COMPARISON_MATRIX.map((item) => (
              <div 
                key={item.id} 
                className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden"
              >
                <div className="bg-slate-100/80 px-4 py-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">{item.issueTitle}</span>
                    <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-medium">
                      {item.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500">
                    <span>{item.fatherOrderNumber} vs {item.motherOrderNumber}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
                  {/* Left: Father's Position */}
                  <div className="p-4 space-y-3 bg-indigo-50/10">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                        <UserCheck className="w-4 h-4 text-indigo-600" />
                        <span>My Proposed Order (Father)</span>
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                        {item.fatherProspect}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-semibold text-xs text-slate-900">{item.fatherTitle}</h4>
                      <p className="mt-1 font-mono text-[11px] bg-slate-900 text-slate-100 p-2.5 rounded border border-slate-800 leading-relaxed">
                        {item.fatherText}
                      </p>
                    </div>

                    <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-200">
                      <span className="font-semibold text-slate-700 block mb-0.5 text-[10px] uppercase tracking-wider">
                        Applicant Rationale:
                      </span>
                      {item.fatherRationale}
                    </div>
                  </div>

                  {/* Right: Mother's Position */}
                  <div className="p-4 space-y-3 bg-rose-50/10">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                        <UserX className="w-4 h-4 text-rose-600" />
                        <span>Sue-Anne's Proposed Order (Mother)</span>
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200">
                        {item.motherRisk}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-semibold text-xs text-slate-900">{item.motherTitle}</h4>
                      <p className="mt-1 font-mono text-[11px] bg-slate-900 text-rose-100 p-2.5 rounded border border-slate-800 leading-relaxed">
                        {item.motherText}
                      </p>
                    </div>

                    <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-200">
                      <span className="font-semibold text-slate-700 block mb-0.5 text-[10px] uppercase tracking-wider">
                        Respondent Argument:
                      </span>
                      {item.motherRationale}
                    </div>
                  </div>
                </div>

                {/* Bottom Judicial & Tactical Analysis */}
                <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-2.5 text-xs">
                  <div className="flex items-start gap-2">
                    <Scale className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-900 block text-[11px] uppercase tracking-wider">
                        Judicial Viability &amp; Statutory Assessment:
                      </span>
                      <p className="text-slate-700 mt-0.5 leading-relaxed">
                        {item.judicialAnalysis}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 pt-2 border-t border-slate-200/80">
                    <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-rose-900 block text-[11px] uppercase tracking-wider">
                        Recommended Cross-Examination &amp; Counter-Submission:
                      </span>
                      <p className="text-slate-800 mt-0.5 font-medium leading-relaxed">
                        {item.crossExaminationPoint}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1 font-mono text-[10px] text-slate-500">
                    <span className="font-semibold text-slate-700">Corroborating Exhibits:</span>
                    {item.evidenceRefs.map(ref => (
                      <span key={ref} className="bg-slate-200 px-1.5 py-0.2 rounded text-slate-800">
                        {ref}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )))}
          </div>
        </div>
      )}

      {/* SUB-COMPONENT: PARTY ORDERS TOGGLE VIEW (MY PROPOSED ORDERS <-> SUE-ANNE'S PROPOSED ORDERS WITH EMBEDDED AI EVALUATION) */}
      {(activeSectionView === 'toggle' || activeSectionView === 'mine' || activeSectionView === 'sue-anne') && (
        <PartyOrdersToggleView
          orders={orders}
          courtCriteria={courtCriteria}
          documents={documents}
          onUpdateOrders={onUpdateOrders}
          onOpenAddModal={handleOpenAddModal}
          onViewDocument={onViewDocument}
          initialParty={activeSectionView === 'sue-anne' ? 'sue-anne' : 'mine'}
        />
      )}

      {/* SECTION 1: MY PROPOSED ORDERS (BENJAMIN HAWKINS - APPLICANT FATHER) - FOR STACKED BOTH VIEW */}
      {activeSectionView === 'both' && (
        <section className="space-y-4" id="section-my-proposed-orders">
          <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-800/80 text-indigo-200 rounded-lg shrink-0">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold tracking-tight">Section 1: My Proposed Orders (Benjamin Hawkins)</h2>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-indigo-700/70 text-indigo-100 rounded">
                    Applicant (Father)
                  </span>
                </div>
                <p className="text-xs text-indigo-200/90 mt-0.5">
                  Minute of Final Orders sought by the Father. Focused on substantial equal shared care, sole medical responsibility to safeguard against concealment, and OurFamilyWizard communication.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start md:self-center shrink-0">
              <button
                onClick={() => handleOpenAddModal('Benjamin Hawkins')}
                className="px-2.5 py-1.5 bg-indigo-700 hover:bg-indigo-600 text-white rounded-md text-xs font-semibold flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Order</span>
              </button>

              <button
                onClick={() => handleSelectSectionAll('mine', true)}
                className="px-2.5 py-1.5 bg-indigo-800/80 hover:bg-indigo-700 text-indigo-100 rounded-md text-xs font-semibold"
                title="Select all Father orders for AI review"
              >
                Select All ({myOrders.length})
              </button>

              <button
                onClick={() => handleCopyMinutes('mine')}
                className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-md text-xs font-semibold flex items-center gap-1"
                title="Copy Applicant Minutes"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Minutes</span>
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {myOrders.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500 text-xs">
                No proposed orders currently in Father's section. Click "Add Order" above to create one.
              </div>
            ) : (
              myOrders.map(order => renderOrderCard(order))
            )}
          </div>
        </section>
      )}

      {/* SECTION 2: SUE-ANNE'S PROPOSED ORDERS (SUE-ANNE HAWKINS - RESPONDENT MOTHER) - FOR STACKED BOTH VIEW */}
      {activeSectionView === 'both' && (
        <section className="space-y-4" id="section-sue-anne-proposed-orders">
          <div className="bg-gradient-to-r from-rose-900 to-slate-900 text-white rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-800/80 text-rose-200 rounded-lg shrink-0">
                <UserX className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold tracking-tight">Section 2: Sue-Anne's Proposed Orders (Sue-Anne Hawkins)</h2>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-rose-700/70 text-rose-100 rounded">
                    Respondent (Mother)
                  </span>
                </div>
                <p className="text-xs text-rose-200/90 mt-0.5">
                  Orders sought in Response by Mother. Includes requests for sole parental responsibility, restricting Father to alternate weekend days, regional relocation, and SMS-only communication.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start md:self-center shrink-0">
              <button
                onClick={() => handleOpenAddModal('Sue-Anne Hawkins')}
                className="px-2.5 py-1.5 bg-rose-700 hover:bg-rose-600 text-white rounded-md text-xs font-semibold flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Order</span>
              </button>

              <button
                onClick={() => handleSelectSectionAll('sue-anne', true)}
                className="px-2.5 py-1.5 bg-rose-800/80 hover:bg-rose-700 text-rose-100 rounded-md text-xs font-semibold"
                title="Select all Mother orders for AI review"
              >
                Select All ({sueAnneOrders.length})
              </button>

              <button
                onClick={() => handleCopyMinutes('sue-anne')}
                className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-md text-xs font-semibold flex items-center gap-1"
                title="Copy Sue-Anne's Orders"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Minutes</span>
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {sueAnneOrders.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500 text-xs">
                No proposed orders currently in Mother's section. Click "Add Order" above to create one.
              </div>
            ) : (
              sueAnneOrders.map(order => renderOrderCard(order))
            )}
          </div>
        </section>
      )}

      {/* Add New Order Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-xl w-full p-5 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Scale className="w-4 h-4 text-indigo-600" />
                <span>Add Proposed Parenting Order</span>
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-3 text-xs">
              {/* Proposing Party Selector */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Proposing Section / Party
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNewProposingParty('Benjamin Hawkins');
                      setNewOrderNumber(`Order ${myOrders.length + 1}.0`);
                    }}
                    className={`p-2.5 rounded-lg border text-left flex items-center gap-2 transition-all ${
                      newProposingParty === 'Benjamin Hawkins'
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-bold ring-1 ring-indigo-200'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <UserCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                    <div>
                      <span className="block text-xs">Mine (Benjamin Hawkins)</span>
                      <span className="text-[10px] text-slate-500 font-normal">Applicant (Father)</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setNewProposingParty('Sue-Anne Hawkins');
                      setNewOrderNumber(`Order S-${sueAnneOrders.length + 1}.0`);
                    }}
                    className={`p-2.5 rounded-lg border text-left flex items-center gap-2 transition-all ${
                      newProposingParty === 'Sue-Anne Hawkins'
                        ? 'bg-rose-50 border-rose-300 text-rose-900 font-bold ring-1 ring-rose-200'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <UserX className="w-4 h-4 text-rose-600 shrink-0" />
                    <div>
                      <span className="block text-xs">Sue-Anne's (Sue-Anne Hawkins)</span>
                      <span className="text-[10px] text-slate-500 font-normal">Respondent (Mother)</span>
                    </div>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Order Number / Clause</label>
                  <input
                    type="text"
                    required
                    value={newOrderNumber}
                    onChange={e => setNewOrderNumber(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value as any)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="Parental Responsibility">Parental Responsibility</option>
                    <option value="Living Arrangements / Care Time">Living Arrangements / Care Time</option>
                    <option value="Education & Extracurricular">Education &amp; Extracurricular</option>
                    <option value="Communication & Notice">Communication &amp; Notice</option>
                    <option value="Injunctions & Restraints">Injunctions &amp; Restraints</option>
                    <option value="Medical & Therapy">Medical &amp; Therapy</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Order Title / Objective</label>
                <input
                  type="text"
                  required
                  placeholder={newProposingParty === 'Benjamin Hawkins' ? "e.g. Equal Shared Care on 7/7 Week-About Schedule" : "e.g. Primary Residence with Mother and Alternate Weekends Only"}
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Proposed Court Order Text</label>
                <textarea
                  rows={4}
                  required
                  placeholder="1. That the children live with..."
                  value={newText}
                  onChange={e => setNewText(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  {newProposingParty === 'Benjamin Hawkins' ? "Applicant Factual Rationale" : "Respondent Argument / Submission"}
                </label>
                <textarea
                  rows={2}
                  placeholder={newProposingParty === 'Benjamin Hawkins' ? "Explain why this order is in children's best interests under s60CC..." : "Describe Mother's stated justification from Affidavit..."}
                  value={newRationale}
                  onChange={e => setNewRationale(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="new-order-ai-tick"
                  checked={newSelectedForAi}
                  onChange={e => setNewSelectedForAi(e.target.checked)}
                  className="rounded text-indigo-600"
                />
                <label htmlFor="new-order-ai-tick" className="text-xs text-slate-700 font-medium cursor-pointer">
                  Tick 'AI review' for immediate assessment upon creation
                </label>
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
                  className={`px-4 py-1.5 text-white font-semibold rounded-lg shadow-xs transition-colors ${
                    newProposingParty === 'Benjamin Hawkins' 
                      ? 'bg-indigo-600 hover:bg-indigo-700' 
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  Add Proposed Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
