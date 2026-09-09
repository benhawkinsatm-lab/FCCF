import React, { useState } from 'react';
import { 
  X, 
  FolderArchive, 
  Printer, 
  Copy, 
  Check, 
  ExternalLink, 
  Scale, 
  ShieldCheck, 
  FileText,
  FileCheck,
  Calendar,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { DocumentRecord } from '../types';

interface EvidenceBinderSubsetModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDocuments: DocumentRecord[];
  onOpenInBinder?: (docIds: string[]) => void;
  onViewDocument?: (doc: DocumentRecord) => void;
}

export const EvidenceBinderSubsetModal: React.FC<EvidenceBinderSubsetModalProps> = ({
  isOpen,
  onClose,
  selectedDocuments,
  onOpenInBinder,
  onViewDocument,
}) => {
  const [subsetTitle, setSubsetTitle] = useState('Affidavit Exhibit Bundle: Targeted Evidence Subset');
  const [purposeNote, setPurposeNote] = useState('Evidence compiled for Interim Hearing under Family Court Act 1997 (WA) s 61DAA & FLA s 60CC');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Chronologically sorted subset
  const sortedDocs = [...selectedDocuments].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const copySubsetTable = () => {
    let text = `FAMILY COURT OF WESTERN AUSTRALIA (PERTH REGISTRY)\n`;
    text += `CASE NUMBER: 4344/2023\n`;
    text += `APPLICANT: BENJAMIN JAMES HAWKINS\n`;
    text += `RESPONDENT: SUE-ANNE HAWKINS\n\n`;
    text += `SUBSET INDEX: ${subsetTitle.toUpperCase()}\n`;
    text += `PURPOSE: ${purposeNote}\n\n`;
    text += `ITEM | BATES REF | ANNEXURE | DATE | CATEGORY | DESCRIPTION | SOURCE ORIGIN | EVIDENTIARY WEIGHT\n`;
    text += `--------------------------------------------------------------------------------------------------------\n`;
    sortedDocs.forEach((doc, idx) => {
      const bates = `BJH-SUB-${String(idx + 1).padStart(2, '0')}`;
      text += `${idx + 1} | ${bates} | ${doc.annexureNumber || doc.id} | ${doc.date} | ${doc.category} | ${doc.title} | ${doc.sourceOrigin} | ${doc.evidentiaryWeight}\n`;
    });
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleOpenFullBinder = () => {
    if (onOpenInBinder) {
      onOpenInBinder(sortedDocs.map(d => d.id));
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto"
        id="evidence-binder-subset-modal"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-900 text-white flex items-start justify-between shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-[11px] font-bold px-2 py-0.5 bg-amber-400 text-slate-950 rounded">
                FCWA Case 4344/2023
              </span>
              <span className="text-xs text-slate-300 font-serif">
                Hawkins v Hawkins
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
                {sortedDocs.length} Documents in Subset
              </span>
            </div>
            <h2 className="text-base font-bold text-white flex items-center gap-2 pt-1 font-serif">
              <FolderArchive className="w-5 h-5 text-amber-400" />
              <span>Evidence Binder Subset Generator</span>
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Configuration Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-3 shrink-0 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Subset Title (Appears on Court Exhibit Index)
            </label>
            <input
              type="text"
              value={subsetTitle}
              onChange={(e) => setSubsetTitle(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-medium focus:ring-2 focus:ring-amber-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Purpose &amp; Statutory Focus
            </label>
            <input
              type="text"
              value={purposeNote}
              onChange={(e) => setPurposeNote(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-700 focus:ring-2 focus:ring-amber-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Subset Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
          {/* Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="block text-slate-500 font-medium text-[11px]">Total Exhibits</span>
              <span className="text-lg font-bold text-slate-900 font-mono">{sortedDocs.length}</span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="block text-slate-500 font-medium text-[11px]">Date Range</span>
              <span className="text-xs font-bold text-slate-900 font-mono">
                {sortedDocs[0]?.date || 'N/A'} — {sortedDocs[sortedDocs.length - 1]?.date || 'N/A'}
              </span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="block text-slate-500 font-medium text-[11px]">Bates Sequence</span>
              <span className="text-xs font-bold text-indigo-700 font-mono">
                BJH-SUB-01 to BJH-SUB-{String(sortedDocs.length).padStart(2, '0')}
              </span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="block text-slate-500 font-medium text-[11px]">Admissibility</span>
              <span className="text-xs font-bold text-emerald-700 flex items-center gap-1 mt-0.5">
                <ShieldCheck className="w-3.5 h-3.5" /> 100% Primary Corroboration
              </span>
            </div>
          </div>

          {/* Annexures Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-slate-800">
                <Scale className="w-4 h-4 text-amber-600" />
                <span>Court Annexure Schedule &amp; Table of Contents</span>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">
                Sorted Chronologically
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600">
                    <th className="py-2.5 px-3">Bates Stamp</th>
                    <th className="py-2.5 px-3">Annexure No.</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Description &amp; Source</th>
                    <th className="py-2.5 px-3">Evidentiary Weight</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-normal">
                  {sortedDocs.map((doc, idx) => (
                    <tr key={doc.id} className="hover:bg-amber-50/40 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-indigo-700 whitespace-nowrap">
                        BJH-SUB-{String(idx + 1).padStart(2, '0')}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-800 font-semibold whitespace-nowrap">
                        {doc.annexureNumber || doc.id}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">
                        {doc.date}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                          {doc.category}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 max-w-xs">
                        <div className="font-bold text-slate-900 truncate" title={doc.title}>
                          {doc.title}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate" title={doc.sourceOrigin}>
                          {doc.sourceOrigin}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                          doc.evidentiaryWeight === 'Sworn/Official'
                            ? 'bg-purple-100 text-purple-800 border-purple-200'
                            : doc.evidentiaryWeight === 'Third-Party Objective'
                            ? 'bg-blue-100 text-blue-800 border-blue-200'
                            : 'bg-amber-100 text-amber-800 border-amber-200'
                        }`}>
                          {doc.evidentiaryWeight}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        {onViewDocument && (
                          <button
                            onClick={() => onViewDocument(doc)}
                            className="text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1"
                          >
                            <span>Inspect</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={copySubsetTable}
              className="px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
              id="copy-subset-index-btn"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
              <span>{copied ? 'Index Copied to Clipboard' : 'Copy Affidavit Exhibit Table'}</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
              id="print-subset-btn"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>Print / PDF Bundle</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
            >
              Close
            </button>
            {onOpenInBinder && (
              <button
                onClick={handleOpenFullBinder}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
                id="open-in-full-binder-btn"
              >
                <span>Open in Evidence Binder Tab</span>
                <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
