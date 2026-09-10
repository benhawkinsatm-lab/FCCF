import React, { useState } from 'react';
import {
  X,
  Printer,
  Copy,
  Check,
  Download,
  ExternalLink,
  Users,
  HeartPulse,
  GraduationCap,
  Scale,
  Sparkles,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { DocumentRecord, TimelineEvent, CourtCriterion, ParentingOrder } from '../types';

interface GeneratedChildBrief {
  name: string;
  emotionalPresentation: string;
  extracurricularStability: string;
  parentalAttachment: string;
  medicalNote: string;
  schoolExperience: string;
  protectiveNeed: string;
  citations: string[];
}

interface GeneratedBriefData {
  children: GeneratedChildBrief[];
  schoolAudit: { summary: string; fatherCarePoints: string[]; motherCarePoints: string[]; citations: string[] } | null;
  hospitalAudit: { summary: string; citations: string[] } | null;
}

interface SingleExpertBriefingModalProps {
  isOpen: boolean;
  onClose: () => void;
  documents: DocumentRecord[];
  timeline: TimelineEvent[];
  orders: ParentingOrder[];
  courtCriteria: CourtCriterion[];
  onViewDocument?: (doc: DocumentRecord) => void;
}

export const SingleExpertBriefingModal: React.FC<SingleExpertBriefingModalProps> = ({
  isOpen,
  onClose,
  documents,
  timeline,
  orders,
  courtCriteria,
  onViewDocument,
}) => {
  const [activeSection, setActiveSection] = useState<'brief' | 'children' | 'medical_school' | 'compliance'>('brief');
  const [copied, setCopied] = useState(false);
  const [generatedBrief, setGeneratedBrief] = useState<GeneratedBriefData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const handleGenerateBrief = async () => {
    setIsGenerating(true);
    setGenerationError(null);
    try {
      const res = await fetch('/api/gemini/generate-expert-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documents, timeline }),
      });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data: GeneratedBriefData = await res.json();
      setGeneratedBrief(data);
    } catch (err) {
      setGenerationError('AI generation failed. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const NA = 'No documents in the case record currently address this.';

  if (!isOpen) return null;

  const generateFullBriefText = (): string => {
    return `# IN THE FAMILY COURT OF WESTERN AUSTRALIA (PERTH)
**FILE NUMBER:** 4344/2023
**MATTER:** HAWKINS & HAWKINS

---

# JOINT BRIEF TO SINGLE EXPERT WITNESS / COURT FAMILY REPORT WRITER
**Prepared on behalf of:** Benjamin James Hawkins (Applicant / Father)
**For the attention of:** Court Appointed Single Expert Witness / Family Consultant
**Children:**
- Isabella Hawkins (Female, Born 14 February 2014, Age 10)
- Mason Hawkins (Male, Born 22 May 2015, Age 9)

---

## 1. PURPOSE OF THIS BRIEF & BACKGROUND
1.1 This brief is provided to assist the Court Expert in conducting an independent family evaluation regarding the parenting arrangements that serve the best interests of Isabella and Mason pursuant to section 60CC of the *Family Law Act 1975* (Cth).
1.2 The parties separated in early 2023. On 14 November 2023, the Court made Interim Orders by consent setting a fortnightly shared-care regime (Orders 1.1–10.2).
1.3 The Applicant Father seeks orders formalizing a stable, predictable routine with equal shared parental responsibility for major long-term issues, supported by strict medical disclosure protocols and clear communication parameters.

---

## 2. PROFILE OF THE CHILDREN & DEVELOPMENTAL STATUS
${generatedBrief && generatedBrief.children.length > 0
  ? generatedBrief.children.map(c => `### ${c.name.toUpperCase()}
- **Emotional Presentation:** ${c.emotionalPresentation || NA}
- **Extracurricular Stability:** ${c.extracurricularStability || NA}
- **Parental Attachment:** ${c.parentalAttachment || NA}
- **Medical Note:** ${c.medicalNote || NA}
- **School Experience:** ${c.schoolExperience || NA}
- **Protective Need:** ${c.protectiveNeed || NA}
${c.citations?.length ? `- **Citations:** ${c.citations.join(', ')}` : ''}`).join('\n\n')
  : 'Not yet generated. Use "Generate with AI" to synthesize these profiles from the documents currently in the case record.'}

---

## 3. COMPARATIVE PARENTAL CAPACITIES & THIRD-PARTY VERIFICATION

### 3.1 Educational Support & School Attendance
${generatedBrief?.schoolAudit
  ? `${generatedBrief.schoolAudit.summary || NA}
- **Father's Care Periods:** ${(generatedBrief.schoolAudit.fatherCarePoints || []).join('; ') || NA}
- **Mother's Care Periods:** ${(generatedBrief.schoolAudit.motherCarePoints || []).join('; ') || NA}
${generatedBrief.schoolAudit.citations?.length ? `- **Citations:** ${generatedBrief.schoolAudit.citations.join(', ')}` : ''}`
  : 'No school attendance audit generated yet, or no school-related documents are currently in the case record.'}

### 3.2 Hospital / Medical Emergency Records
${generatedBrief?.hospitalAudit
  ? `${generatedBrief.hospitalAudit.summary || NA}
${generatedBrief.hospitalAudit.citations?.length ? `- **Citations:** ${generatedBrief.hospitalAudit.citations.join(', ')}` : ''}`
  : 'No hospital/medical emergency audit generated yet, or no such documents are currently in the case record.'}

---

## 4. CONCISE SUMMARY OF APPLICANT'S PROPOSED ORDERS
The Father proposes orders that:
1. Maintain equal shared parental responsibility for major long-term health, education, and religious decisions.
2. Maintain a predictable fortnightly pattern (5-9 or 7-7 shared care) with school-based changeovers on Friday afternoons to eliminate gate friction.
3. Enforce an unambiguous 2-hour emergency medical notification requirement with automatic reciprocal medical portal access for both parents.
4. Mandate BIFF (Brief, Informative, Friendly, Firm) communication through OurFamilyWizard with a continuing 42-hour response requirement.

**DATED:** ${new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}
**RESPECTFULLY SUBMITTED:** Benjamin James Hawkins (Applicant Father)
`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateFullBriefText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const text = generateFullBriefText();
    const blob = new Blob([text], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Hawkins_Single_Expert_Briefing_Pack_${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight text-white font-serif">
                  Single Expert Witness / Family Consultant Briefing Pack
                </h2>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-amber-900/60 text-amber-200 border border-amber-700">
                  Form 2 Evaluation
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Neutral, evidence-backed evaluation brief synthesizing children's welfare, institutional records, and compliance history.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            id="close-expert-briefing-modal-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation & Action Bar */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            <button
              onClick={() => setActiveSection('brief')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeSection === 'brief'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              Executive Brief
            </button>
            <button
              onClick={() => setActiveSection('children')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeSection === 'children'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              Children Profiles &amp; Needs
            </button>
            <button
              onClick={() => setActiveSection('medical_school')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeSection === 'medical_school'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              Third-Party Records (School &amp; Hospital)
            </button>
            <button
              onClick={() => setActiveSection('compliance')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeSection === 'compliance'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              Orders Compliance Audit
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerateBrief}
              disabled={isGenerating}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
              id="generate-brief-ai-btn"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{generatedBrief ? 'Regenerate with AI' : 'Generate with AI'}</span>
                </>
              )}
            </button>
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
              id="copy-brief-btn"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-600" />
                  <span>Copy Brief</span>
                </>
              )}
            </button>

            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
              id="print-brief-btn"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>Print PDF</span>
            </button>

            <button
              onClick={handleDownload}
              className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
              id="download-brief-btn"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Download .md</span>
            </button>
          </div>
        </div>

        {/* Content Viewport */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-white font-sans text-slate-800 leading-relaxed print:p-0">
          {activeSection === 'brief' && (
            <div className="max-w-4xl mx-auto space-y-6 text-sm">
              <div className="border-b-2 border-slate-900 pb-3 text-center space-y-1">
                <span className="text-xs uppercase tracking-widest text-slate-500 font-bold">
                  Confidential Family Evaluation Document
                </span>
                <h1 className="text-lg font-bold font-serif text-slate-900">
                  Single Expert Witness Briefing Pack: Best Interests Evaluation
                </h1>
                <p className="text-xs text-slate-600 font-mono">
                  Family Court of Western Australia (File 4344/2023) — Hawkins &amp; Hawkins
                </p>
              </div>

              {/* Case particulars */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="font-bold text-slate-500 uppercase text-[10px] block mb-1">Parties &amp; Representation</span>
                  <div className="space-y-1 text-slate-800">
                    <div><strong>Applicant (Father):</strong> Benjamin James Hawkins (Self-Represented)</div>
                    <div><strong>Respondent (Mother):</strong> Sue-Anne Hawkins</div>
                  </div>
                </div>
                <div>
                  <span className="font-bold text-slate-500 uppercase text-[10px] block mb-1">Subject Children</span>
                  <div className="space-y-1 text-slate-800">
                    <div><strong>Isabella Hawkins:</strong> Born 14 Feb 2014 (Age 10) — Year 5 Bassendean PS</div>
                    <div><strong>Mason Hawkins:</strong> Born 22 May 2015 (Age 9) — Year 4 Bassendean PS</div>
                  </div>
                </div>
              </div>

              {/* Terms of Reference Box */}
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2 text-xs">
                <div className="flex items-center gap-2 font-bold text-amber-900">
                  <Scale className="w-4 h-4 text-amber-700" />
                  <span>Terms of Reference &amp; Questions for the Single Expert</span>
                </div>
                <p className="text-amber-950 leading-relaxed">
                  The Court Family Consultant is respectfully requested to assess and report upon:
                </p>
                <ol className="list-decimal pl-5 space-y-1 text-amber-900">
                  <li>The nature and strength of the relationship between Isabella and Mason and each of their parents.</li>
                  <li>The capacity of each parent to communicate constructively, facilitate the children's relationship with the other parent, and provide stability.</li>
                  <li>The practical and emotional impact upon the children of the current fortnightly arrangements versus the proposed orders.</li>
                  <li>The protective and medical needs of each child, based on the medical records currently in evidence.</li>
                  <li>The recommended dispute resolution and decision-making framework to prevent future parental conflict.</li>
                </ol>
              </div>

              {/* Summary of Primary Evidence Documents */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Key Annexures Enclosed in Expert Vault:
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {documents.slice(0, 6).map(doc => (
                    <div
                      key={doc.id}
                      className="p-3 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition flex items-center justify-between gap-2 shadow-2xs"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-bold text-indigo-700 shrink-0">
                            {doc.annexureNumber || doc.id}
                          </span>
                          <span className="text-[10px] text-slate-500 truncate">({doc.date})</span>
                        </div>
                        <p className="text-xs font-medium text-slate-900 truncate">{doc.title}</p>
                      </div>
                      {onViewDocument && (
                        <button
                          onClick={() => onViewDocument(doc)}
                          className="p-1 text-slate-400 hover:text-indigo-600 rounded transition"
                          title="Open document"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'children' && (
            <div className="max-w-4xl mx-auto space-y-6 text-sm">
              <h2 className="text-base font-bold font-serif text-slate-900 border-b border-slate-200 pb-2">
                Detailed Developmental &amp; Welfare Profiles
              </h2>

              {generationError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{generationError}</span>
                </div>
              )}

              {!generatedBrief && !isGenerating && (
                <div className="flex flex-col items-center justify-center text-center py-16 px-6 bg-slate-50 border border-slate-200 rounded-xl">
                  <Sparkles className="w-8 h-8 text-slate-300 mb-3" />
                  <p className="text-xs text-slate-500 max-w-sm">
                    These profiles have not been generated yet. Click &quot;Generate with AI&quot; above to synthesize them from the documents currently in the case record.
                  </p>
                </div>
              )}

              {isGenerating && (
                <div className="flex items-center justify-center gap-2 py-16 text-slate-400 text-xs">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating from case documents...</span>
                </div>
              )}

              {generatedBrief && generatedBrief.children.map((child) => (
                <div key={child.name} className="border border-slate-200 rounded-xl p-5 bg-white shadow-xs space-y-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{child.name}</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs pt-1">
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                      <strong className="text-slate-900 block">Emotional Presentation:</strong>
                      <p className="text-slate-600">{child.emotionalPresentation || NA}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                      <strong className="text-slate-900 block">Extracurricular Stability:</strong>
                      <p className="text-slate-600">{child.extracurricularStability || NA}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                      <strong className="text-slate-900 block">Parental Attachment:</strong>
                      <p className="text-slate-600">{child.parentalAttachment || NA}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                      <strong className="text-slate-900 block">Medical Note:</strong>
                      <p className="text-slate-600">{child.medicalNote || NA}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                      <strong className="text-slate-900 block">School Experience:</strong>
                      <p className="text-slate-600">{child.schoolExperience || NA}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                      <strong className="text-slate-900 block">Protective Need:</strong>
                      <p className="text-slate-600">{child.protectiveNeed || NA}</p>
                    </div>
                  </div>
                  {child.citations?.length > 0 && (
                    <p className="text-[10px] text-slate-400 font-mono">Citations: {child.citations.join(', ')}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeSection === 'medical_school' && (
            <div className="max-w-4xl mx-auto space-y-6 text-sm">
              <h2 className="text-base font-bold font-serif text-slate-900 border-b border-slate-200 pb-2">
                Third-Party Institutional Evidentiary Audit
              </h2>

              {!generatedBrief && !isGenerating && (
                <div className="flex flex-col items-center justify-center text-center py-16 px-6 bg-slate-50 border border-slate-200 rounded-xl">
                  <Sparkles className="w-8 h-8 text-slate-300 mb-3" />
                  <p className="text-xs text-slate-500 max-w-sm">
                    This audit has not been generated yet. Click &quot;Generate with AI&quot; above to synthesize it from the documents currently in the case record.
                  </p>
                </div>
              )}

              {isGenerating && (
                <div className="flex items-center justify-center gap-2 py-16 text-slate-400 text-xs">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating from case documents...</span>
                </div>
              )}

              {generatedBrief && generatedBrief.schoolAudit && (
                <div className="border border-slate-200 rounded-xl p-5 bg-white space-y-3">
                  <div className="flex items-center gap-2 text-slate-900 font-bold">
                    <GraduationCap className="w-5 h-5 text-indigo-600" />
                    <span>Primary School Attendance &amp; Welfare Records</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{generatedBrief.schoolAudit.summary || NA}</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
                    <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-lg space-y-1">
                      <strong className="text-emerald-900 font-bold block">Father's Care Periods:</strong>
                      <ul className="list-disc pl-4 space-y-0.5 text-emerald-950">
                        {(generatedBrief.schoolAudit.fatherCarePoints || []).map((pt, idx) => <li key={idx}>{pt}</li>)}
                        {(!generatedBrief.schoolAudit.fatherCarePoints || generatedBrief.schoolAudit.fatherCarePoints.length === 0) && <li>{NA}</li>}
                      </ul>
                    </div>

                    <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-lg space-y-1">
                      <strong className="text-rose-900 font-bold block">Mother's Care Periods:</strong>
                      <ul className="list-disc pl-4 space-y-0.5 text-rose-950">
                        {(generatedBrief.schoolAudit.motherCarePoints || []).map((pt, idx) => <li key={idx}>{pt}</li>)}
                        {(!generatedBrief.schoolAudit.motherCarePoints || generatedBrief.schoolAudit.motherCarePoints.length === 0) && <li>{NA}</li>}
                      </ul>
                    </div>
                  </div>
                  {generatedBrief.schoolAudit.citations?.length > 0 && (
                    <p className="text-[10px] text-slate-400 font-mono">Citations: {generatedBrief.schoolAudit.citations.join(', ')}</p>
                  )}
                </div>
              )}

              {generatedBrief && generatedBrief.hospitalAudit && (
                <div className="border border-slate-200 rounded-xl p-5 bg-white space-y-3">
                  <div className="flex items-center gap-2 text-slate-900 font-bold">
                    <HeartPulse className="w-5 h-5 text-rose-600" />
                    <span>Hospital Emergency Admission Records</span>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1 text-slate-700">
                    <div>{generatedBrief.hospitalAudit.summary || NA}</div>
                  </div>
                  {generatedBrief.hospitalAudit.citations?.length > 0 && (
                    <p className="text-[10px] text-slate-400 font-mono">Citations: {generatedBrief.hospitalAudit.citations.join(', ')}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {activeSection === 'compliance' && (
            <div className="max-w-4xl mx-auto space-y-6 text-sm">
              <h2 className="text-base font-bold font-serif text-slate-900 border-b border-slate-200 pb-2">
                Orders Compliance Matrix Audit (Interim Orders 14 Nov 2023)
              </h2>

              <div className="space-y-3">
                {orders.map(order => (
                  <div key={order.id} className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-900">{order.orderNumber}: </span>
                        <span className="font-medium text-slate-700">{order.title}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {order.breachesCount > 0 ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            {order.breachesCount} Breaches Recorded
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            100% Compliant
                          </span>
                        )}
                        <span className="font-mono text-xs font-bold text-slate-800">{order.complianceRate}%</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600">{order.orderText}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
