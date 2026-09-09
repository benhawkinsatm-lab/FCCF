import React, { useState } from 'react';
import {
  X,
  Download,
  Printer,
  Loader2,
  Check,
  FolderArchive
} from 'lucide-react';
import JSZip from 'jszip';
import { DocumentRecord, TimelineEvent, ParentingOrder, DiscrepancyItem, CourtCriterion } from '../types';

interface CaseDossierExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  documents: DocumentRecord[];
  timeline: TimelineEvent[];
  orders: ParentingOrder[];
  discrepancies: DiscrepancyItem[];
  courtCriteria?: CourtCriterion[];
}

export const CaseDossierExportModal: React.FC<CaseDossierExportModalProps> = ({
  isOpen,
  onClose,
  documents,
  timeline,
  orders,
  discrepancies,
  courtCriteria = [],
}) => {
  const [includeIndex, setIncludeIndex] = useState(true);
  const [includeAffidavit, setIncludeAffidavit] = useState(true);
  const [includeCriteria, setIncludeCriteria] = useState(true);
  const [includeExpert, setIncludeExpert] = useState(true);
  const [includeBreachCsv, setIncludeBreachCsv] = useState(true);
  const [includeTimelineCsv, setIncludeTimelineCsv] = useState(true);
  const [includeDiscrepancies, setIncludeDiscrepancies] = useState(true);
  const [includeDocBriefs, setIncludeDocBriefs] = useState(true);

  const [isZipping, setIsZipping] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (!isOpen) return null;

  const handleExportZip = async () => {
    setIsZipping(true);
    setDownloadSuccess(false);

    try {
      const zip = new JSZip();
      const folder = zip.folder("Hawkins_Case_4344_Dossier");

      // 1. Cover & Index
      if (includeIndex) {
        let indexContent = `FAMILY COURT OF WESTERN AUSTRALIA (PERTH REGISTRY)\n`;
        indexContent += `FILE NUMBER: 4344/2023\n`;
        indexContent += `MATTER: HAWKINS & HAWKINS\n`;
        indexContent += `APPLICANT: Benjamin James Hawkins\n`;
        indexContent += `RESPONDENT: Sue-Anne Hawkins\n`;
        indexContent += `CHILDREN: Isabella Hawkins (Age 10), Mason Hawkins (Age 9)\n`;
        indexContent += `GENERATED: ${new Date().toLocaleString('en-AU')}\n\n`;
        indexContent += `================================================================================\n`;
        indexContent += `TABLE OF CONTENTS & ANNEXURE INDEX (BJH-001 TO BJH-099)\n`;
        indexContent += `================================================================================\n\n`;
        indexContent += `ANNEXURE | DATE       | DESCRIPTION                              | ORIGIN             | EVIDENTIARY WEIGHT\n`;
        indexContent += `---------|------------|------------------------------------------|--------------------|--------------------\n`;
        documents.forEach(doc => {
          indexContent += `${(doc.annexureNumber || doc.id).padEnd(8)} | ${(doc.date).padEnd(10)} | ${(doc.title.slice(0, 40)).padEnd(40)} | ${(doc.sourceOrigin.slice(0, 18)).padEnd(18)} | ${doc.evidentiaryWeight}\n`;
        });
        folder?.file("00_CASE_INDEX_AND_COVER.txt", indexContent);
      }

      // 2. Form 2 Affidavit Particulars
      if (includeAffidavit) {
        let affContent = `# FORM 2 AFFIDAVIT OF BENJAMIN JAMES HAWKINS\n`;
        affContent += `In the Family Court of Western Australia (Perth Registry)\n`;
        affContent += `File No: 4344/2023\n\n`;
        affContent += `1. I am the Applicant Father in this matter and I make this affidavit from my own knowledge and records.\n`;
        affContent += `2. Since the Interim Orders of 14 November 2023, I have sought to maintain stable shared care of our children Isabella and Mason.\n`;
        affContent += `3. The Respondent Mother has engaged in continuous contraventions of Orders 1.1, 7.3, and 9.1 as detailed in the attached Impeachment Schedule.\n`;
        affContent += `4. Specifically regarding Order 7.3, on 24 May 2024 Mason suffered an acute asthma exacerbation requiring emergency hospitalization at St John of God Midland Hospital [Annexure BJH-8]. The Respondent failed to provide emergency notice within 4 hours.\n`;
        affContent += `5. Furthermore, under Order 9.1 the Respondent has repeatedly exceeded the 42-hour response mandate, accumulating average lags exceeding 68 hours.\n\n`;
        affContent += `Sworn by Benjamin James Hawkins\nat Perth, Western Australia on ${new Date().toLocaleDateString('en-AU')}\n`;
        folder?.file("01_FORM_2_AFFIDAVIT_DRAFT.md", affContent);
      }

      // 3. Section 60CC Submissions
      if (includeCriteria) {
        let critContent = `# SECTION 60CC BEST INTERESTS LEGAL SUBMISSIONS\n`;
        critContent += `Matter: Hawkins & Hawkins (File No. 4344/2023)\n\n`;
        critContent += `Pursuant to Section 60CC of the Family Law Act 1975 (Cth):\n\n`;
        critContent += `## 1. Safety and Protection of the Children (s60CC(2)(a))\n`;
        critContent += `The Father has instituted rigorous medical compliance protocols for Mason's chronic asthma, ensuring instant notification, GP action plans, and unhindered emergency care.\n\n`;
        critContent += `## 2. Children's Views and Emotional Well-being (s60CC(2)(b))\n`;
        critContent += `Both Isabella and Mason thrive under predictable routine and express relief when school-based handovers eliminate gate conflict.\n\n`;
        critContent += `## 3. Capacity of Each Parent to Provide for Needs (s60CC(2)(c))\n`;
        critContent += `The Father maintains a 100% on-time school attendance record and has attended every parent-teacher meeting at Bassendean Primary School.\n`;
        folder?.file("02_SECTION_60CC_SUBMISSIONS.md", critContent);
      }

      // 4. Single Expert Briefing Pack
      if (includeExpert) {
        let expertContent = `# BRIEF TO SINGLE EXPERT WITNESS / COURT FAMILY CONSULTANT\n`;
        expertContent += `Matter: Hawkins & Hawkins (File No. 4344/2023)\n\n`;
        expertContent += `To: Court-Appointed Expert\n`;
        expertContent += `From: Benjamin James Hawkins (Applicant Father)\n\n`;
        expertContent += `This briefing pack provides neutral third-party verification including attendance certificates from Bassendean Primary School, emergency medical records from St John of God Midland Hospital, and chronological communication logs.\n`;
        folder?.file("03_SINGLE_EXPERT_WITNESS_BRIEF.md", expertContent);
      }

      // 5. Breach Register CSV
      if (includeBreachCsv) {
        let csv = `Date,OrderBreached,Severity,Category,Description,PrimaryProof\n`;
        timeline.filter(t => t.orderBreachFlag).forEach(b => {
          csv += `"${b.date}","${b.breachedOrderNumber || ''}","${b.breachSeverity || ''}","${b.category || ''}","${b.title.replace(/"/g, '""')}","${b.primaryDocId || ''}"\n`;
        });
        folder?.file("04_ORDER_CONTRAVENTION_REGISTER.csv", csv);
      }

      // 6. Chronological Timeline CSV
      if (includeTimelineCsv) {
        let timeCsv = `Date,Time,Category,Title,Description,SourceDoc,BreachFlag,ResponseLagHours\n`;
        timeline.forEach(t => {
          timeCsv += `"${t.date}","${t.time || ''}","${t.category}","${t.title.replace(/"/g, '""')}","${t.description.replace(/"/g, '""')}","${t.primaryDocId || ''}","${t.orderBreachFlag ? 'YES' : 'NO'}","${t.responseLagHours || ''}"\n`;
        });
        folder?.file("05_CHRONOLOGICAL_TIMELINE.csv", timeCsv);
      }

      // 7. Sworn Contradictions Impeachment Schedule
      if (includeDiscrepancies) {
        let discContent = `# SCHEDULE OF SWORN CONTRADICTIONS & IMPEACHABLE DISCREPANCIES\n\n`;
        discrepancies.forEach((item, idx) => {
          discContent += `### Item ${idx + 1}: ${item.id}\n`;
          discContent += `- **Respondent Sworn Claim:** "${item.claimText}" (${item.claimSource})\n`;
          discContent += `- **Proven Factual Reality:** ${item.conflictingFact}\n`;
          discContent += `- **Primary Proof Citation:** ${item.evidenceCitation}\n`;
          discContent += `- **Legal Significance:** ${item.legalImpact}\n\n`;
        });
        folder?.file("06_IMPEACHMENT_SCHEDULE.md", discContent);
      }

      // 8. Individual Document Transcripts & Annexure Briefs
      if (includeDocBriefs) {
        const docFolder = folder?.folder("Annexures_BJH");
        documents.forEach(doc => {
          let dText = `ANNEXURE: ${doc.annexureNumber || doc.id}\n`;
          dText += `TITLE: ${doc.title}\n`;
          dText += `DATE: ${doc.date}\n`;
          dText += `CATEGORY: ${doc.category}\n`;
          dText += `SOURCE ORIGIN: ${doc.sourceOrigin}\n`;
          dText += `EVIDENTIARY WEIGHT: ${doc.evidentiaryWeight}\n\n`;
          dText += `SUMMARY / EXTRACT:\n${doc.excerpt || 'Verified Court Document'}\n\n`;
          if (doc.metadata) {
            dText += `METADATA:\n${JSON.stringify(doc.metadata, null, 2)}\n`;
          }
          docFolder?.file(`${doc.annexureNumber || doc.id}.txt`, dText);
        });
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Hawkins_Case_4344_Full_Dossier_${new Date().toISOString().split('T')[0]}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      setIsZipping(false);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err) {
      console.error('Error generating dossier zip:', err);
      setIsZipping(false);
    }
  };

  const handlePrintMaster = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <FolderArchive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-serif">
                Full Case Dossier ZIP Archive Export
              </h2>
              <p className="text-xs text-slate-400">
                Package all court evidence, sworn submissions, and institutional records into a structured offline bundle.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            id="close-dossier-modal-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 bg-white text-slate-800 text-xs">
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block">
              Dossier Metadata (Perth Registry)
            </span>
            <div className="grid grid-cols-2 gap-2 text-slate-600">
              <div><strong>File No:</strong> 4344/2023</div>
              <div><strong>Matter:</strong> Hawkins &amp; Hawkins</div>
              <div><strong>Indexed Annexures:</strong> {documents.length} verified records</div>
              <div><strong>Recorded Incidents:</strong> {timeline.length} timeline events</div>
            </div>
          </div>

          <div>
            <h3 className="font-bold text-slate-900 mb-2 uppercase tracking-wider text-[11px]">
              Select Modules to Include in ZIP Archive:
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={includeIndex}
                  onChange={e => setIncludeIndex(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="font-medium text-slate-800">Master Cover &amp; Table of Annexures</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={includeAffidavit}
                  onChange={e => setIncludeAffidavit(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="font-medium text-slate-800">Form 2 Affidavit Draft (.md)</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={includeCriteria}
                  onChange={e => setIncludeCriteria(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="font-medium text-slate-800">s60CC Best Interests Submissions</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={includeExpert}
                  onChange={e => setIncludeExpert(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="font-medium text-slate-800">Single Expert Witness Brief</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={includeBreachCsv}
                  onChange={e => setIncludeBreachCsv(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="font-medium text-slate-800">Contraventions Register (CSV)</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={includeTimelineCsv}
                  onChange={e => setIncludeTimelineCsv(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="font-medium text-slate-800">Chronological Timeline Ledger (CSV)</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={includeDiscrepancies}
                  onChange={e => setIncludeDiscrepancies(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="font-medium text-slate-800">Sworn Contradictions Impeachment</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={includeDocBriefs}
                  onChange={e => setIncludeDocBriefs(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="font-medium text-slate-800">Individual Annexure Files ({documents.length})</span>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={handlePrintMaster}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs flex items-center gap-1.5 shadow-2xs transition"
            id="print-master-dossier-btn"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>Print Master Binder</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-slate-600 hover:bg-slate-200 font-semibold text-xs transition"
            >
              Cancel
            </button>

            <button
              onClick={handleExportZip}
              disabled={isZipping}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition disabled:opacity-50"
              id="download-zip-dossier-btn"
            >
              {isZipping ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Building Archive ZIP...</span>
                </>
              ) : downloadSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>Dossier Downloaded!</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download Case Dossier ZIP</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
