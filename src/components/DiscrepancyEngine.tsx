import React, { useState } from 'react';
import { 
  AlertTriangle, 
  ExternalLink, 
  ShieldAlert, 
  FileSearch, 
  Sparkles, 
  Plus, 
  Copy,
  Check,
  Calendar,
  FileText
} from 'lucide-react';
import { DiscrepancyItem, DocumentRecord } from '../types';

interface DiscrepancyEngineProps {
  discrepancies: DiscrepancyItem[];
  documents: DocumentRecord[];
  onViewDocument: (doc: DocumentRecord) => void;
  onAddDiscrepancy: (item: DiscrepancyItem) => void;
  onNavigateToAffidavit?: () => void;
  onNavigateToTimeline?: () => void;
}

export const DiscrepancyEngine: React.FC<DiscrepancyEngineProps> = ({
  discrepancies,
  documents,
  onViewDocument,
  onAddDiscrepancy,
  onNavigateToAffidavit,
  onNavigateToTimeline,
}) => {
  const [testClaim, setTestClaim] = useState('');
  const [testSource, setTestSource] = useState('Respondent Email / Affidavit');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyCitation = (item: DiscrepancyItem) => {
    const text = `CONTRADICTION PARTICULAR [${item.id}]:\nRespondent Claim: "${item.claimText}" (${item.claimSource})\nFactual Reality: ${item.conflictingFact}\nPrimary Proof: ${item.evidenceCitation}\nLegal Impact: ${item.legalImpact}`;
    navigator.clipboard.writeText(text);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleTestClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testClaim.trim()) return;

    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      const res = await fetch('/api/gemini/discrepancy-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claimText: testClaim,
          claimSource: testSource,
          claimDate: new Date().toISOString().split('T')[0],
        }),
      });

      const data = await res.json();
      setAnalysisResult(data);
    } catch (err) {
      console.error('Failed to run discrepancy check:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveTestedDiscrepancy = () => {
    if (!analysisResult) return;

    const newItem: DiscrepancyItem = {
      id: `DISC-${Date.now().toString().slice(-3)}`,
      claimText: testClaim,
      claimSource: testSource,
      claimDate: new Date().toISOString().split('T')[0],
      conflictingFact: analysisResult.conflictingFacts?.[0] || 'Contradicted by primary records.',
      evidenceDocId: documents[0]?.id || `DOC-${Date.now().toString().slice(-4)}`,
      evidenceCitation: analysisResult.evidenceCitations?.[0] || 'Verified Objective Record',
      evidentiaryWeight: analysisResult.evidentiaryWeight || 'Third-Party Objective',
      severity: analysisResult.severity || 'High',
      legalImpact: analysisResult.legalImpact || 'Impeaches credibility under FLA s 60CC.',
    };

    onAddDiscrepancy(newItem);
    setTestClaim('');
    setAnalysisResult(null);
  };

  return (
    <div className="space-y-6 pb-12" id="discrepancy-engine-container">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 font-serif flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-rose-600" />
          <span>Contradiction &amp; Discrepancy Engine</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Real-time cross-referencing of Respondent assertions against sworn court orders, school audits, and telecommunication logs.
        </p>
      </div>

      {/* Interactive Claim Cross-Referencing Tool */}
      <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800 shadow-md space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-bold text-white">Cross-Reference New Claim / Assertion</h2>
          </div>
          <span className="text-[11px] text-slate-400">Vector &amp; Primary Document Matching</span>
        </div>

        <form onSubmit={handleTestClaim} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Statement / Allegation to Cross-Examine
              </label>
              <textarea
                rows={2}
                required
                value={testClaim}
                onChange={(e) => setTestClaim(e.target.value)}
                placeholder="e.g., 'Father has never attended any doctor appointments for Isabella' or 'I never withheld the kids on 12 April'..."
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
                id="test-claim-input"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Originating Source</label>
              <input
                type="text"
                value={testSource}
                onChange={(e) => setTestSource(e.target.value)}
                placeholder="e.g. Affidavit Para 18, SMS, Mediation brief"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
                id="test-source-input"
              />
              <button
                type="submit"
                disabled={isAnalyzing || !testClaim.trim()}
                className="w-full mt-2 py-2 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                id="run-discrepancy-btn"
              >
                {isAnalyzing ? (
                  <span>Cross-Referencing Vault...</span>
                ) : (
                  <>
                    <FileSearch className="w-3.5 h-3.5" />
                    <span>Run Discrepancy Analysis</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Live Analysis Output */}
        {analysisResult && (
          <div className="p-4 bg-slate-800/90 rounded-xl border border-slate-700 space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span className="text-xs font-bold text-rose-300">
                  {analysisResult.contradictionFound ? 'Direct Contradiction Identified' : 'No Immediate Conflict'}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-900/60 text-rose-200 border border-rose-700">
                  Severity: {analysisResult.severity || 'High'}
                </span>
              </div>
              <button
                onClick={handleSaveTestedDiscrepancy}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded flex items-center gap-1"
                id="save-discrepancy-to-case-btn"
              >
                <Plus className="w-3 h-3" />
                <span>Add to Case Discrepancies</span>
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-700/80">
                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Conflicting Primary Evidence:</span>
                <ul className="list-disc pl-4 space-y-1 text-slate-200">
                  {analysisResult.conflictingFacts?.map((fact: string, i: number) => (
                    <li key={i}>{fact}</li>
                  ))}
                </ul>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 bg-slate-900/60 rounded border border-slate-800 text-slate-300">
                  <strong className="text-amber-400 block mb-0.5">Admissibility &amp; Legal Impact:</strong>
                  {analysisResult.legalImpact}
                </div>
                <div className="p-2 bg-slate-900/60 rounded border border-slate-800 text-slate-300">
                  <strong className="text-indigo-400 block mb-0.5">Cross-Examination Strategy:</strong>
                  <ul className="list-decimal pl-3 space-y-0.5 text-[10px]">
                    {analysisResult.recommendedCrossExaminationQuestions?.slice(0, 2).map((q: string, i: number) => (
                      <li key={i}>{q}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Verified Discrepancies Table / Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <span className="font-semibold text-slate-700">Verified Case Contradictions ({discrepancies.length})</span>
          <span>Impeachable under WA Evidence Act</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {discrepancies.map((item) => {
            const linkedDoc = documents.find(d => d.id === item.evidenceDocId);
            return (
              <div 
                key={item.id}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3 flex flex-col justify-between hover:border-slate-300 transition-all"
                id={`discrepancy-card-${item.id}`}
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 bg-slate-100 text-slate-800 rounded">
                      {item.id}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      item.severity === 'High' 
                        ? 'bg-rose-100 text-rose-700 border-rose-200' 
                        : 'bg-amber-100 text-amber-800 border-amber-200'
                    }`}>
                      {item.severity} Severity
                    </span>
                  </div>

                  {/* Opposing Claim */}
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Respondent Claim</span>
                    <p className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs italic text-slate-800 font-serif mt-1">
                      "{item.claimText}"
                    </p>
                    <span className="text-[10px] text-slate-400 block mt-0.5">{item.claimSource}</span>
                  </div>

                  {/* Conflicting Fact */}
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">Factual Reality (Verified)</span>
                    <p className="p-2.5 bg-emerald-50/60 border border-emerald-200 rounded-lg text-xs font-medium text-emerald-950 mt-1">
                      {item.conflictingFact}
                    </p>
                  </div>

                  {/* Legal Impact */}
                  <div className="p-2 bg-slate-50 rounded-lg border border-slate-200/80 text-[11px] text-slate-600">
                    <strong className="text-slate-800">Legal Impact: </strong>
                    {item.legalImpact}
                  </div>
                </div>

                {/* Primary Source Citation & Cross-Links Footer */}
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      Proof:
                    </span>
                    {linkedDoc ? (
                      <button
                        onClick={() => onViewDocument(linkedDoc)}
                        className="inline-flex items-center gap-1.5 text-xs font-mono font-medium text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded transition-colors"
                        id={`view-discrepancy-doc-${item.id}`}
                        title="Open source document in Evidence Vault"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>{linkedDoc.annexureNumber || linkedDoc.id}</span>
                      </button>
                    ) : (
                      <span className="font-mono text-xs text-slate-600">{item.evidenceCitation}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Copy Citation Particular */}
                    <button
                      onClick={() => handleCopyCitation(item)}
                      className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition"
                      title="Copy Impeachment Particular for Submissions"
                      id={`copy-discrepancy-citation-${item.id}`}
                    >
                      {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>

                    {/* Cross link to Timeline */}
                    {onNavigateToTimeline && (
                      <button
                        onClick={onNavigateToTimeline}
                        className="p-1.5 text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 rounded transition"
                        title="View Event on Chronological Timeline"
                        id={`timeline-link-${item.id}`}
                      >
                        <Calendar className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Cross link to Affidavit Drafter */}
                    {onNavigateToAffidavit && (
                      <button
                        onClick={onNavigateToAffidavit}
                        className="px-2 py-1 text-xs font-semibold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 rounded transition flex items-center gap-1"
                        title="Draft Form 2 Affidavit Paragraph"
                        id={`affidavit-link-${item.id}`}
                      >
                        <FileText className="w-3 h-3" />
                        <span>Draft in Affidavit</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
