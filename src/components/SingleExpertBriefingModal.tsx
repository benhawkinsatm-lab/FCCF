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
  Scale
} from 'lucide-react';
import { DocumentRecord, TimelineEvent, CourtCriterion, ParentingOrder } from '../types';

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

### A. ISABELLA HAWKINS (Born 14 February 2014, Age 10)
- **Schooling:** Bassendean Primary School (Year 5). Strong academic progress in literacy and mathematics.
- **Welfare & Emotional State:** Demonstrates mature emotional awareness. Shows anxiety when parental handovers involve friction or when school attendance is disrupted.
- **Extracurriculars:** Enrolled in junior swimming squad and weekend netball. Father consistently attends training sessions and meets all registration requirements.
- **Father's Parenting Relationship:** Open, communicative, supportive of academic homework routine, establishes predictable bedtime routines.

### B. MASON HAWKINS (Born 22 May 2015, Age 9)
- **Schooling:** Bassendean Primary School (Year 4). Enjoys practical science, reading, and sports.
- **Medical Profile - Chronic Asthma:** Mason suffers from chronic bronchial asthma requiring a strict GP Asthma Action Plan (Ventolin + daily preventer Seretide).
- **Critical Medical Incident (24 May 2024):** Mason experienced an acute asthma exacerbation during Mother's care requiring Emergency Department admission at St John of God Midland Hospital [Exhibit BJH-8].
  - The Mother failed to notify the Father within the mandatory 4-hour window under Order 7.3, only mentioning the hospitalization 28 hours later via text message.
  - The Father attended the hospital immediately upon learning of the discharge to coordinate follow-up with the family GP and purchase replacement spacer devices.

---

## 3. COMPARATIVE PARENTAL CAPACITIES & THIRD-PARTY VERIFICATION

### 3.1 Educational Support & School Attendance (Bassendean Primary School)
- **Father's Care:** Zero unexcused absences. Zero late arrivals across 2023–2024 school years. Father actively communicates with class teachers and attends all parent-teacher conferences [Exhibit BJH-2].
- **Mother's Care:** 5 unexcused absences and 7 recorded tardy arrivals in Semester 1, 2024.

### 3.2 Medical Diligence & Transparency
- **Father:** Fully transparent, maintains duplicate prescription supplies, implements GP Asthma Action Plan, pays 50% shared specialist dental and physiotherapy accounts immediately upon receipt [Exhibit BJH-3].
- **Mother:** History of non-disclosure regarding hospital emergency visits, 42-hour communication defaults regarding medical questions, and delays in administering prescribed preventative inhalers [Exhibit BJH-8].

### 3.3 Communication Protocol Compliance (Order 9.1 - 42-Hour Rule)
- Under Interim Order 9.1, non-emergency parenting communications must be responded to within 42 hours.
- Objective audit of OurFamilyWizard and SMS communications reveals:
  - **Father:** Average response latency of 4.2 hours (100% compliance rate).
  - **Mother:** 14 documented contraventions exceeding 42 hours (average latency of 68.4 hours; maximum latency of 126 hours regarding dental consent).

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
                  <li>The protective and medical needs of Mason in light of his chronic asthma diagnosis and recent emergency hospital admission.</li>
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

              {/* Isabella Card */}
              <div className="border border-slate-200 rounded-xl p-5 bg-white shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Isabella Hawkins (Age 10)</h3>
                    <p className="text-xs text-slate-500">Born 14 February 2014 &bull; Year 5 Student at Bassendean Primary School</p>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    High Academic Performance
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs pt-1">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                    <strong className="text-slate-900 block">Emotional Presentation:</strong>
                    <p className="text-slate-600">Empathetic, mature for her age. Can exhibit stress and withdraw when conflict arises at physical handovers.</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                    <strong className="text-slate-900 block">Extracurricular Stability:</strong>
                    <p className="text-slate-600">Junior squad swimmer &amp; netball. Father ensures 100% on-time attendance for Saturday morning matches.</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                    <strong className="text-slate-900 block">Parental Attachment:</strong>
                    <p className="text-slate-600">Close bond with both parents; relies on Father for structured routine, homework guidance, and quiet reading time.</p>
                  </div>
                </div>
              </div>

              {/* Mason Card */}
              <div className="border border-slate-200 rounded-xl p-5 bg-white shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Mason Hawkins (Age 9)</h3>
                    <p className="text-xs text-slate-500">Born 22 May 2015 &bull; Year 4 Student at Bassendean Primary School</p>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
                    Chronic Medical Vulnerability (Asthma)
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs pt-1">
                  <div className="p-3 bg-rose-50/60 rounded-lg border border-rose-200 space-y-1">
                    <strong className="text-rose-950 block">Asthma Management:</strong>
                    <p className="text-rose-900">Requires daily preventative corticosteroid and prompt administration of Ventolin during wheezing episodes.</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                    <strong className="text-slate-900 block">School Experience:</strong>
                    <p className="text-slate-600">Loves science and hands-on projects. Demonstrates eagerness to learn when attendance is uninterrupted.</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                    <strong className="text-slate-900 block">Protective Need:</strong>
                    <p className="text-slate-600">Strict requirement that both households maintain active Asthma Action Plans and disclose acute events promptly.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'medical_school' && (
            <div className="max-w-4xl mx-auto space-y-6 text-sm">
              <h2 className="text-base font-bold font-serif text-slate-900 border-b border-slate-200 pb-2">
                Third-Party Institutional Evidentiary Audit
              </h2>

              {/* Bassendean PS Section */}
              <div className="border border-slate-200 rounded-xl p-5 bg-white space-y-3">
                <div className="flex items-center gap-2 text-slate-900 font-bold">
                  <GraduationCap className="w-5 h-5 text-indigo-600" />
                  <span>Primary School Attendance &amp; Welfare Records</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Independent attendance roll data submitted by the school demonstrates a marked divergence in school attendance and punctuality depending on which parent holds physical care:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
                  <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-lg space-y-1">
                    <strong className="text-emerald-900 font-bold block">Father's Care Periods:</strong>
                    <ul className="list-disc pl-4 space-y-0.5 text-emerald-950">
                      <li><strong>0</strong> Unexcused Absences</li>
                      <li><strong>0</strong> Tardy Arrivals</li>
                      <li>100% homework submission and active involvement in school events.</li>
                    </ul>
                  </div>

                  <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-lg space-y-1">
                    <strong className="text-rose-900 font-bold block">Mother's Care Periods:</strong>
                    <ul className="list-disc pl-4 space-y-0.5 text-rose-950">
                      <li><strong>5</strong> Unexcused Absences (Term 1 &amp; 2)</li>
                      <li><strong>7</strong> Tardy Arrivals after 8:50 AM bell</li>
                      <li>Unconfirmed illness claim contradicted by travel records.</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Hospital Section */}
              <div className="border border-slate-200 rounded-xl p-5 bg-white space-y-3">
                <div className="flex items-center gap-2 text-slate-900 font-bold">
                  <HeartPulse className="w-5 h-5 text-rose-600" />
                  <span>Hospital Emergency Admission Records</span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1 text-slate-700">
                  <div><strong>Date of Admission:</strong> 24 May 2024 at 18:30</div>
                  <div><strong>Discharge Date:</strong> 25 May 2024 at 09:15</div>
                  <div><strong>Diagnosis:</strong> Acute moderate asthma exacerbation, O2 saturation 91% on room air.</div>
                  <div><strong>Order 7.3 Contravention:</strong> Mother did not notify Father until 28 hours post-discharge.</div>
                </div>
              </div>
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
