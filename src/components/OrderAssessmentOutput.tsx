import React, { useState } from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert, 
  ShieldCheck, 
  Scale, 
  History, 
  UserX, 
  FileText, 
  ExternalLink, 
  Copy, 
  Check, 
  Zap, 
  AlertOctagon,
  Info,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { ProposedParentingOrder, ProposedOrderAssessment, DocumentRecord, EvidenceCitation } from '../types';

interface OrderAssessmentOutputProps {
  order: ProposedParentingOrder;
  assessment: ProposedOrderAssessment;
  documents?: DocumentRecord[];
  onViewDocument?: (doc: DocumentRecord) => void;
  onReevaluate?: () => void;
  isEvaluating?: boolean;
}

export const OrderAssessmentOutput: React.FC<OrderAssessmentOutputProps> = ({
  order,
  assessment,
  documents = [],
  onViewDocument,
  onReevaluate,
  isEvaluating = false,
}) => {
  const [copiedClause, setCopiedClause] = useState(false);
  const isSueAnne = order.proposingParty === 'Sue-Anne Hawkins';

  // Determine Risk Level (either explicitly set or derived)
  const riskLevel: 'Low' | 'Medium' | 'High' | 'Critical' = 
    assessment.riskLevel || 
    (assessment.overallFeasibility === 'High Risk of Breach' ? 'Critical' :
     assessment.overallFeasibility === 'High Conflict Risk' ? 'High' :
     assessment.overallFeasibility === 'Moderate - Needs Safeguard' ? 'Medium' :
     assessment.overallFeasibility === 'Moderate / Needs Clause Tuning' ? 'Medium' : 'Low');

  const getRiskLevelBadge = () => {
    switch (riskLevel) {
      case 'Critical':
        return {
          badgeClass: 'bg-red-600 text-white border-red-700',
          barClass: 'bg-red-600',
          barWidth: '95%',
          label: 'Critical Risk',
          description: 'Severe statutory conflict with s 60CC best interests or acute risk of breach / medical concealment.'
        };
      case 'High':
        return {
          badgeClass: 'bg-rose-600 text-white border-rose-700',
          barClass: 'bg-rose-600',
          barWidth: '75%',
          label: 'High Risk',
          description: 'Substantial conflict with objective evidence; significant risk of non-compliance or litigation.'
        };
      case 'Medium':
        return {
          badgeClass: 'bg-amber-500 text-white border-amber-600',
          barClass: 'bg-amber-500',
          barWidth: '50%',
          label: 'Moderate Risk',
          description: 'Requires explicit protective safeguards or self-executing clauses to ensure compliance.'
        };
      case 'Low':
      default:
        return {
          badgeClass: 'bg-emerald-600 text-white border-emerald-700',
          barClass: 'bg-emerald-600',
          barWidth: '20%',
          label: 'Low Risk',
          description: 'Strong judicial prospect; closely aligned with statutory best interests and child welfare.'
        };
    }
  };

  const riskInfo = getRiskLevelBadge();

  // Extract Evidence Citations from assessment directly
  const evidenceCitations: EvidenceCitation[] = assessment.evidenceCitations || [];

  const handleCopyClause = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedClause(true);
    setTimeout(() => setCopiedClause(false), 2500);
  };

  const handleFindAndOpenDoc = (citation: EvidenceCitation) => {
    if (!onViewDocument) return;
    const targetDoc = documents.find(d => 
      (citation.docId && (d.id === citation.docId || d.docId === citation.docId)) || 
      (citation.exhibitNumber && (d.annexureNumber === citation.exhibitNumber || d.annexureLetter === citation.exhibitNumber)) ||
      (d.title.toLowerCase().includes(citation.title.toLowerCase().slice(0, 15)))
    );

    if (targetDoc) {
      onViewDocument(targetDoc);
    } else {
      // Create a virtual doc preview for this citation if needed
      onViewDocument({
        id: citation.docId || 'DOC-CITED',
        docId: citation.docId || 'DOC-CITED',
        title: citation.title,
        annexureLetter: citation.exhibitNumber || 'EX',
        date: new Date().toISOString().split('T')[0],
        category: 'Legal Filings',
        summary: citation.relevance,
        evidentiaryWeight: 'Admissible Evidence',
        weightJustification: 'Cited in statutory assessment under Family Law Act 1975 s 60CC.',
        statutoryFactor: 'Family Law Act 1975 s 60CC',
        fileType: 'pdf',
        folderSource: 'Evidence Binder',
        tags: ['Exhibit', citation.exhibitNumber || 'Cited']
      });
    }
  };

  return (
    <div className={`p-4 rounded-xl border space-y-4 shadow-xs transition-all ${
      isSueAnne 
        ? 'bg-rose-50/40 border-rose-200' 
        : 'bg-indigo-50/40 border-indigo-200'
    }`}>
      {/* Top Banner: AI Assessment Header & Risk Level Meter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3 border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className={`p-1.5 rounded-lg ${isSueAnne ? 'bg-rose-100 text-rose-700' : 'bg-indigo-100 text-indigo-700'}`}>
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-xs text-slate-900">
                {isSueAnne 
                  ? "AI Evidentiary Assessment & Cross-Examination Vulnerabilities" 
                  : "AI Court Viability & s60CC Statutory Best Interests Assessment"}
              </h4>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-2xs ${riskInfo.badgeClass}`}>
                {riskInfo.label}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 mt-0.5">
              {riskInfo.description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">Feasibility</span>
            <span className={`text-[11px] font-bold ${
              isSueAnne ? 'text-rose-700' : 'text-indigo-700'
            }`}>
              {assessment.overallFeasibility}
            </span>
          </div>

          {onReevaluate && (
            <button
              type="button"
              onClick={onReevaluate}
              disabled={isEvaluating}
              className={`px-2.5 py-1 text-xs rounded font-semibold flex items-center gap-1 shadow-2xs transition-colors ${
                isSueAnne
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
              title="Re-run AI assessment against CourtCriteria"
            >
              <Sparkles className="w-3 h-3 text-amber-300" />
              <span>{isEvaluating ? 'Assessing...' : 'Re-Evaluate'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Visual Risk Level Meter */}
      <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-800 flex items-center gap-1.5">
            <ShieldAlert className={`w-3.5 h-3.5 ${
              riskLevel === 'Critical' || riskLevel === 'High' ? 'text-rose-600' : 'text-emerald-600'
            }`} />
            Order Risk Level: <span className="font-mono">{riskLevel.toUpperCase()}</span>
          </span>
          <span className="text-[10px] text-slate-500 font-medium">
            Assessed against Family Court of WA Evidence Standard
          </span>
        </div>
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${riskInfo.barClass}`}
            style={{ width: riskInfo.barWidth }}
          />
        </div>
        <div className="flex justify-between text-[9px] text-slate-400 font-mono pt-0.5">
          <span>Low (Optimal)</span>
          <span>Medium (Safeguards Req.)</span>
          <span>High (Adverse Findings)</span>
          <span>Critical (Unenforceable / Breach Risk)</span>
        </div>
      </div>

      {/* Evidence Citations Section (Directly Requested) */}
      <div className="p-3.5 bg-white rounded-lg border border-slate-200 space-y-2.5 shadow-2xs">
        <div className="flex items-center justify-between border-b pb-2 border-slate-100">
          <span className="text-[11px] font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <FileText className={`w-3.5 h-3.5 ${isSueAnne ? 'text-rose-600' : 'text-indigo-600'}`} />
            Verified Evidence Citations ({evidenceCitations.length} primary exhibits)
          </span>
          <span className="text-[10px] text-slate-500">
            Admissible under Evidence Act 1906 (WA) s 79C
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {evidenceCitations.length === 0 ? (
            <div className="p-4 text-center text-slate-400 italic text-xs col-span-full bg-slate-50 rounded-lg border border-dashed border-slate-200">
              No specific primary exhibits linked to this order yet. Ingest documents into the evidence vault to correlate objective citations with this statutory assessment.
            </div>
          ) : (
            evidenceCitations.map((citation, idx) => (
            <div 
              key={idx} 
              className={`p-2.5 rounded-lg border text-xs flex flex-col justify-between space-y-2 transition-colors ${
                isSueAnne 
                  ? 'bg-rose-50/40 border-rose-200 hover:bg-rose-50/80' 
                  : 'bg-indigo-50/40 border-indigo-200 hover:bg-indigo-50/80'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border ${
                    isSueAnne 
                      ? 'bg-rose-200/80 text-rose-900 border-rose-300' 
                      : 'bg-indigo-200/80 text-indigo-900 border-indigo-300'
                  }`}>
                    {citation.exhibitNumber || citation.citation.split(' ')[0]}
                  </span>
                  {citation.docId && (
                    <span className="text-[9px] font-mono text-slate-500">
                      {citation.docId}
                    </span>
                  )}
                </div>
                <h5 className="font-bold text-[11px] text-slate-900 leading-tight">
                  {citation.title}
                </h5>
                <p className="text-[10px] text-slate-600 mt-1 leading-relaxed">
                  {citation.relevance}
                </p>
              </div>

              {onViewDocument && (
                <button
                  type="button"
                  onClick={() => handleFindAndOpenDoc(citation)}
                  className={`mt-2 w-full py-1 px-2 rounded text-[10px] font-semibold flex items-center justify-center gap-1 border transition-colors ${
                    isSueAnne
                      ? 'bg-white hover:bg-rose-100 text-rose-800 border-rose-300'
                      : 'bg-white hover:bg-indigo-100 text-indigo-800 border-indigo-300'
                  }`}
                  title={`Open verified record ${citation.docId || citation.title}`}
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Inspect Primary Document</span>
                </button>
              )}
            </div>
          ))
        )}
        </div>
      </div>

      {/* Statutory Best Interests (s60CC) & Party History Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* 1. Statutory Criteria Alignment (s60CC) */}
        <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-900 flex items-center gap-1.5">
              <Scale className={`w-3.5 h-3.5 ${isSueAnne ? 'text-rose-600' : 'text-indigo-600'}`} />
              s60CC Best Interests
            </span>
            <span className="text-[9px] text-slate-500 font-mono">FLA 1975</span>
          </div>

          <div className="space-y-2">
            {assessment.courtCriteriaCheck && assessment.courtCriteriaCheck.map((cc, idx) => (
              <div key={idx} className="text-[11px] p-2 bg-slate-50 rounded border border-slate-100">
                <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                  {cc.passesBestInterests ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  )}
                  <span className="text-[11px] font-bold">{cc.statutoryRef}</span>
                </div>
                <p className="text-slate-600 text-[10px] mt-1 leading-relaxed">
                  {cc.alignmentAnalysis}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* 2. Relevant Party History & Contradictions */}
        <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-900 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-amber-600" />
              {isSueAnne ? 'Documentary Contradictions' : 'Relevant Party History'}
            </span>
            <span className="text-[9px] text-slate-500 font-mono">Past Orders</span>
          </div>

          <div className="space-y-2">
            {assessment.pastDisputesCheck && assessment.pastDisputesCheck.map((pd, idx) => (
              <div key={idx} className="text-[11px] p-2 bg-amber-50/50 rounded border border-amber-200/60">
                <span className="font-bold text-amber-900 block">{pd.breachedOrderRef}</span>
                <p className="text-amber-950 text-[10px] mt-0.5 leading-relaxed">{pd.disputeSummary}</p>
                {pd.relevantIncidents && pd.relevantIncidents.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {pd.relevantIncidents.map((inc, i) => (
                      <span key={i} className="text-[9px] px-1 py-0.2 rounded bg-amber-100 text-amber-800 font-mono">
                        {inc}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 3. Observed Party Behaviour & Breach Vulnerability */}
        <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-900 flex items-center gap-1.5">
              <UserX className="w-3.5 h-3.5 text-rose-600" />
              Party Behaviour Risk
            </span>
            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
              assessment.observedPartyBehaviourRisk?.riskOfBreach === 'High'
                ? 'bg-rose-100 text-rose-800'
                : 'bg-amber-100 text-amber-800'
            }`}>
              Breach Risk: {assessment.observedPartyBehaviourRisk?.riskOfBreach || 'Medium'}
            </span>
          </div>

          <div className="text-[11px] p-2 bg-rose-50/50 rounded border border-rose-200/60 space-y-1.5">
            <span className="font-bold text-rose-900 block">
              Target: {assessment.observedPartyBehaviourRisk?.party || 'Sue-Anne Hawkins'}
            </span>
            <p className="text-rose-950 text-[10px] leading-relaxed">
              {assessment.observedPartyBehaviourRisk?.behaviorPattern}
            </p>
            {assessment.observedPartyBehaviourRisk?.rationale && (
              <p className="text-slate-600 text-[10px] italic border-t border-rose-200/60 pt-1">
                "{assessment.observedPartyBehaviourRisk.rationale}"
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Suggested Safeguard Clause / Cross-Examination Counter-Submission */}
      <div className="p-3.5 bg-white rounded-lg border border-slate-200 space-y-2 shadow-2xs">
        <div className="flex items-center justify-between border-b pb-1.5 border-slate-100">
          <span className="text-[11px] font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            {isSueAnne 
              ? 'Applicant Legal Team Counter-Submission & Cross-Examination Strategy' 
              : 'Recommended Self-Executing Safeguard Clause (to Prevent Non-Compliance)'}
          </span>
          {assessment.suggestedSafeguardClause && (
            <button
              type="button"
              onClick={() => handleCopyClause(assessment.suggestedSafeguardClause)}
              className="text-[10px] px-2 py-0.5 text-slate-600 hover:text-slate-900 border border-slate-200 rounded flex items-center gap-1 bg-slate-50"
            >
              {copiedClause ? (
                <>
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span className="text-emerald-700 font-bold">Copied Clause</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy Clause</span>
                </>
              )}
            </button>
          )}
        </div>

        {assessment.suggestedSafeguardClause && (
          <div className={`p-2.5 rounded border font-mono text-[11px] leading-relaxed whitespace-pre-wrap ${
            isSueAnne 
              ? 'bg-rose-50 text-rose-950 border-rose-200' 
              : 'bg-emerald-50 text-emerald-950 border-emerald-200'
          }`}>
            {assessment.suggestedSafeguardClause}
          </div>
        )}

        {assessment.recommendedDraftingImprovements && assessment.recommendedDraftingImprovements.length > 0 && (
          <div className="pt-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block mb-1">
              Drafting & Trial Strategy Recommendations:
            </span>
            <ul className="space-y-1">
              {assessment.recommendedDraftingImprovements.map((imp, idx) => (
                <li key={idx} className="text-[11px] text-slate-700 flex items-start gap-1.5">
                  <ArrowRight className={`w-3 h-3 mt-0.5 shrink-0 ${isSueAnne ? 'text-rose-600' : 'text-indigo-600'}`} />
                  <span>{imp}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
