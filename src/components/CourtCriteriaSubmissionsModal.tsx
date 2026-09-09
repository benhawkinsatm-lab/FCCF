import React, { useState } from 'react';
import {
  X,
  Printer,
  Copy,
  Check,
  Download,
  Scale,
  FileText,
  ExternalLink,
  Send,
  Sparkles,
  ShieldAlert,
  CheckCircle2,
  Filter
} from 'lucide-react';
import { CourtCriterion, DocumentRecord } from '../types';

interface CourtCriteriaSubmissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  criteria: CourtCriterion[];
  documents: DocumentRecord[];
  onViewDocument?: (doc: DocumentRecord) => void;
  onNavigateToAffidavit?: () => void;
}

export const CourtCriteriaSubmissionsModal: React.FC<CourtCriteriaSubmissionsModalProps> = ({
  isOpen,
  onClose,
  criteria,
  documents,
  onViewDocument,
  onNavigateToAffidavit,
}) => {
  const [selectedFactorIds, setSelectedFactorIds] = useState<string[]>(
    criteria.map(c => c.id)
  );
  const [copied, setCopied] = useState(false);
  const [activeView, setActiveView] = useState<'preview' | 'text'>('preview');

  if (!isOpen) return null;

  const toggleFactor = (id: string) => {
    setSelectedFactorIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const selectAll = () => setSelectedFactorIds(criteria.map(c => c.id));
  const selectEvidencedOnly = () => {
    setSelectedFactorIds(criteria.filter(c => c.aiFlaggedEvidence && c.aiFlaggedEvidence.length > 0).map(c => c.id));
  };

  const includedCriteria = criteria.filter(c => selectedFactorIds.includes(c.id));

  const generateMarkdownText = (): string => {
    let md = `# IN THE FAMILY COURT OF WESTERN AUSTRALIA (PERTH)
**REGISTRY:** PERTH  
**FILE NUMBER:** 4344/2023  

**IN THE PARENTING MATTER OF:**  
**BENJAMIN JAMES HAWKINS** (Applicant / Father)  
**and**  
**SUE-ANNE HAWKINS** (Respondent / Mother)  

**SUBJECT CHILDREN:**  
- Isabella Hawkins (Born 14 February 2014)  
- Mason Hawkins (Born 22 May 2015)  

---

## OUTLINE OF SUBMISSIONS: STATUTORY BEST INTERESTS (s 60CC FAMILY LAW ACT 1975)
*Filed on behalf of the Applicant Father, Benjamin James Hawkins*

### 1. STATUTORY FRAMEWORK & SUMMARY
1. Pursuant to section 60CA of the *Family Law Act 1975* (Cth) and section 66A of the *Family Court Act 1997* (WA), in deciding whether to make a particular parenting order in relation to a child, the Court must regard the best interests of the child as the paramount consideration.
2. Section 60CC sets out the mandatory matters the Court must consider in determining what is in the child's best interests.
3. The Applicant submits that the objective documentary record, supported by independent third-party evidence from Bassendean Primary School, St John of God Midland Hospital, and telecommunication logs, firmly establishes that the proposed parenting orders serve the children's developmental, physical, and psychological best interests.

---

### 2. DETAILED STATUTORY BEST INTERESTS CONSIDERATIONS

`;

    includedCriteria.forEach((crit, idx) => {
      md += `#### ${idx + 1}. ${crit.title.toUpperCase()} [${crit.statutoryRef}]\n`;
      md += `**A. Legal Principle / Statutory Test:**  \n${crit.officialLegalTest}\n\n`;
      md += `**B. Evidentiary Position:** ${crit.evidentiaryStrength}\n\n`;
      md += `**C. Submissions on Evidence:**  \n${crit.relevanceSummary}\n\n`;

      if (crit.aiFlaggedEvidence && crit.aiFlaggedEvidence.length > 0) {
        md += `**D. Primary Evidentiary Citations:**\n`;
        crit.aiFlaggedEvidence.forEach(ev => {
          const flagType = ev.type === 'respondent_risk_flag' ? 'Respondent Risk / Breach' : 'Applicant Positive Compliance';
          md += `- **[${flagType}]** (${ev.date || 'Record'}): ${ev.description} *(Citation: ${ev.citation || ev.docId})*\n`;
        });
        md += '\n';
      }

      md += `---\n\n`;
    });

    md += `### 3. CONCLUSION & RELIEF SOUGHT
The Applicant Father respectfully submits that the documentary evidence compels the making of orders in terms of the Applicant's Minute of Proposed Orders, providing stability, healthcare diligence, and educational continuity for Isabella and Mason.

**DATED:** ${new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}  
**SUBMITTED BY:** Benjamin James Hawkins (Applicant)  
`;
    return md;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateMarkdownText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const text = generateMarkdownText();
    const blob = new Blob([text], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Hawkins_s60CC_Best_Interests_Submissions_${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-600/30 text-indigo-300 border border-indigo-500/30">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight text-white font-serif">
                  Affidavit Submissions Generator: s 60CC Best Interests
                </h2>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-indigo-900/60 text-indigo-200 border border-indigo-700">
                  Case 4344/2023
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Formal legal submissions structured under Family Law Act 1975 s 60CC with verified exhibit citations.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            id="close-submissions-modal-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar & Selector */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Factor Selection Quick Actions */}
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-slate-700">Included Factors ({includedCriteria.length}/{criteria.length}):</span>
              <button
                onClick={selectAll}
                className="px-2.5 py-1 rounded bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-medium"
              >
                Select All (15)
              </button>
              <button
                onClick={selectEvidencedOnly}
                className="px-2.5 py-1 rounded bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-medium"
              >
                With Evidence Flags Only
              </button>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs">
                <button
                  onClick={() => setActiveView('preview')}
                  className={`px-3 py-1 rounded-md font-medium transition ${
                    activeView === 'preview' ? 'bg-indigo-900 text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Court Preview
                </button>
                <button
                  onClick={() => setActiveView('text')}
                  className={`px-3 py-1 rounded-md font-medium transition ${
                    activeView === 'text' ? 'bg-indigo-900 text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Plain Markdown
                </button>
              </div>

              <button
                onClick={handleCopy}
                className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
                id="copy-submissions-btn"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-600" />
                    <span>Copy Submissions</span>
                  </>
                )}
              </button>

              <button
                onClick={handlePrint}
                className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
                id="print-submissions-btn"
              >
                <Printer className="w-3.5 h-3.5 text-slate-600" />
                <span>Print PDF</span>
              </button>

              <button
                onClick={handleDownload}
                className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
                id="download-submissions-btn"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                <span>Download .md</span>
              </button>

              {onNavigateToAffidavit && (
                <button
                  onClick={() => {
                    onClose();
                    onNavigateToAffidavit();
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
                  id="send-to-affidavit-drafter-btn"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send to Affidavit Drafter</span>
                </button>
              )}
            </div>
          </div>

          {/* Factor Chips */}
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pt-1">
            {criteria.map(crit => {
              const isSelected = selectedFactorIds.includes(crit.id);
              return (
                <button
                  key={crit.id}
                  onClick={() => toggleFactor(crit.id)}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-indigo-100 text-indigo-900 border border-indigo-300'
                      : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-indigo-600' : 'bg-slate-300'}`}></span>
                  <span className="font-mono text-[10px] font-bold">{crit.statutoryRef.split(',')[1]?.trim() || crit.id}</span>
                  <span className="truncate max-w-[140px]">{crit.title.split('(')[0]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-white font-serif text-slate-900 leading-relaxed print:p-0">
          {activeView === 'text' ? (
            <pre className="font-mono text-xs whitespace-pre-wrap bg-slate-50 p-4 rounded-xl border border-slate-200 text-slate-800 select-all">
              {generateMarkdownText()}
            </pre>
          ) : (
            <div className="max-w-4xl mx-auto space-y-6 text-sm">
              {/* Formal Court Heading */}
              <div className="border-b-2 border-slate-900 pb-4 text-center space-y-1 font-sans">
                <div className="text-xs font-bold uppercase tracking-widest text-slate-600">
                  In the Family Court of Western Australia (Perth Registry)
                </div>
                <div className="text-sm font-bold text-slate-900">
                  Case Number: 4344/2023
                </div>
                <div className="text-xs text-slate-600 pt-1 font-mono">
                  Hawkins &amp; Hawkins (Parenting Proceedings)
                </div>
                <div className="text-base font-serif font-bold text-slate-900 pt-2 uppercase tracking-wide">
                  Applicant Father's Outline of Submissions: Statutory Best Interests
                </div>
                <div className="text-xs italic text-slate-500 font-serif">
                  Pursuant to s 60CC of the Family Law Act 1975 (Cth) &amp; s 66A of the Family Court Act 1997 (WA)
                </div>
              </div>

              {/* Children particulars */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-sans grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <strong className="text-slate-700">Applicant Father:</strong> Benjamin James Hawkins
                </div>
                <div>
                  <strong className="text-slate-700">Respondent Mother:</strong> Sue-Anne Hawkins
                </div>
                <div>
                  <strong className="text-slate-700">Child 1:</strong> Isabella Hawkins (b. 14 Feb 2014, Age 10)
                </div>
                <div>
                  <strong className="text-slate-700">Child 2:</strong> Mason Hawkins (b. 22 May 2015, Age 9)
                </div>
              </div>

              {/* Factors list */}
              <div className="space-y-6 pt-2">
                {includedCriteria.map((crit, idx) => (
                  <div key={crit.id} className="border border-slate-200 rounded-xl p-5 bg-white shadow-xs space-y-3 font-sans">
                    <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <div>
                        <span className="font-mono text-xs font-bold text-indigo-900 block">
                          Paragraph {idx + 1}. {crit.statutoryRef}
                        </span>
                        <h3 className="text-sm font-bold text-slate-900 font-serif mt-0.5">
                          {crit.title}
                        </h3>
                      </div>
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border shrink-0 ${
                        crit.evidentiaryStrength === 'High Respondent Risk'
                          ? 'bg-rose-100 text-rose-800 border-rose-200'
                          : crit.evidentiaryStrength === 'Strong Applicant Position'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {crit.evidentiaryStrength}
                      </span>
                    </div>

                    <div className="text-xs space-y-2 text-slate-700">
                      <div>
                        <strong className="text-slate-900 font-semibold">Statutory Test:</strong>{' '}
                        <span className="italic">{crit.officialLegalTest}</span>
                      </div>

                      <div>
                        <strong className="text-slate-900 font-semibold">Submissions:</strong>{' '}
                        <span>{crit.relevanceSummary}</span>
                      </div>
                    </div>

                    {/* Flagged Evidence */}
                    {crit.aiFlaggedEvidence && crit.aiFlaggedEvidence.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1.5">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                          Evidentiary Corroboration &amp; Exhibits:
                        </span>
                        <div className="space-y-1.5">
                          {crit.aiFlaggedEvidence.map((ev, evIdx) => {
                            const linkedDoc = documents.find(d => d.id === ev.docId);
                            const isRisk = ev.type === 'respondent_risk_flag';
                            return (
                              <div
                                key={evIdx}
                                className={`p-2.5 rounded-lg border text-xs flex items-start justify-between gap-3 ${
                                  isRisk
                                    ? 'bg-rose-50/70 border-rose-200 text-rose-950'
                                    : 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                                }`}
                              >
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-1.5 font-semibold text-[11px]">
                                    {isRisk ? (
                                      <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                    ) : (
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                    )}
                                    <span>{ev.date ? `${ev.date} — ` : ''}{isRisk ? 'Respondent Risk / Contravention' : 'Applicant Protective Record'}</span>
                                  </div>
                                  <p className="text-xs leading-relaxed">{ev.description}</p>
                                </div>

                                {linkedDoc && onViewDocument ? (
                                  <button
                                    onClick={() => onViewDocument(linkedDoc)}
                                    className="px-2 py-1 bg-white border border-slate-300 hover:border-indigo-400 text-indigo-700 font-mono text-[11px] font-semibold rounded shrink-0 flex items-center gap-1 shadow-2xs"
                                    title="View primary source exhibit"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    <span>{ev.citation || linkedDoc.annexureNumber || linkedDoc.id}</span>
                                  </button>
                                ) : (
                                  <span className="font-mono text-[10px] font-bold text-slate-500 shrink-0">
                                    {ev.citation || ev.docId}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Signature Footer */}
              <div className="pt-8 border-t border-slate-300 font-sans text-xs space-y-4">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="border-b border-slate-400 pb-1 mb-1 font-serif font-bold text-slate-900">
                      Benjamin James Hawkins
                    </div>
                    <div className="text-slate-600">Applicant Father (In Person)</div>
                  </div>
                  <div>
                    <div className="border-b border-slate-400 pb-1 mb-1 font-serif font-bold text-slate-900">
                      {new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                    <div className="text-slate-600">Date of Filing</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
