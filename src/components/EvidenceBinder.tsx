import React, { useState, useMemo, useEffect } from 'react';
import { 
  FolderArchive, 
  Printer, 
  Download, 
  ExternalLink, 
  FileCheck, 
  Check, 
  Copy, 
  Scale,
  ShieldCheck,
  Archive,
  Eye,
  StickyNote,
  Highlighter,
  Tags,
  SlidersHorizontal,
  Plus,
  Layers,
  Sparkles,
  FileText
} from 'lucide-react';
import { DocumentRecord, TimelineEvent, ParentingOrder, DiscrepancyItem, CourtCriterion } from '../types';
import { CaseDossierExportModal } from './CaseDossierExportModal';
import { 
  BinderCoversheetConfig, 
  DocumentAnnotation, 
  BinderGroupingMode 
} from './evidence-binder/types';
import { 
  getStoredAnnotations, 
  saveStoredAnnotations 
} from './evidence-binder/annotationStorage';
import { 
  generateEvidenceBinderPdf 
} from './evidence-binder/pdfExportUtil';
import { 
  DocumentAnnotationModal 
} from './evidence-binder/DocumentAnnotationModal';
import { 
  BinderBatchTagModal 
} from './evidence-binder/BinderBatchTagModal';
import { 
  CoversheetSettingsModal, 
  DEFAULT_COVERSHEET_CONFIG 
} from './evidence-binder/CoversheetSettingsModal';
import { 
  PdfBundlePreviewModal 
} from './evidence-binder/PdfBundlePreviewModal';

interface EvidenceBinderProps {
  documents: DocumentRecord[];
  onViewDocument: (doc: DocumentRecord) => void;
  preselectedDocIds?: string[];
  timeline?: TimelineEvent[];
  orders?: ParentingOrder[];
  discrepancies?: DiscrepancyItem[];
  courtCriteria?: CourtCriterion[];
  onUpdateDocuments?: (docs: DocumentRecord[]) => void;
}

export const EvidenceBinder: React.FC<EvidenceBinderProps> = ({
  documents,
  onViewDocument,
  preselectedDocIds,
  timeline = [],
  orders = [],
  discrepancies = [],
  courtCriteria = [],
  onUpdateDocuments
}) => {
  const [selectedDocs, setSelectedDocs] = useState<string[]>(() => {
    if (preselectedDocIds && preselectedDocIds.length > 0) {
      return preselectedDocIds;
    }
    return documents.map(d => d.id);
  });
  const [copied, setCopied] = useState(false);
  const [isDossierModalOpen, setIsDossierModalOpen] = useState(false);

  // Annotations State
  const [annotations, setAnnotations] = useState<DocumentAnnotation[]>(() => getStoredAnnotations());
  const [annotationDoc, setAnnotationDoc] = useState<DocumentRecord | null>(null);

  // Coversheet & Grouping Settings
  const [coversheetConfig, setCoversheetConfig] = useState<BinderCoversheetConfig>(DEFAULT_COVERSHEET_CONFIG);
  const [isCoversheetSettingsOpen, setIsCoversheetSettingsOpen] = useState(false);

  // Batch Tagging Modal
  const [isBatchTagModalOpen, setIsBatchTagModalOpen] = useState(false);

  // Reconstructed PDF Bundle Preview Modal
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);

  // Quick Direct PDF Export State
  const [isDirectExporting, setIsDirectExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  useEffect(() => {
    if (preselectedDocIds && preselectedDocIds.length > 0) {
      setSelectedDocs(preselectedDocIds);
    }
  }, [preselectedDocIds]);

  // Sync annotations to localStorage
  const handleSaveAnnotation = (newAnn: DocumentAnnotation) => {
    const updated = [newAnn, ...annotations.filter(a => a.id !== newAnn.id)];
    setAnnotations(updated);
    saveStoredAnnotations(updated);
  };

  const handleDeleteAnnotation = (id: string) => {
    const updated = annotations.filter(a => a.id !== id);
    setAnnotations(updated);
    saveStoredAnnotations(updated);
  };

  const toggleSelect = (id: string) => {
    setSelectedDocs(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectAll = () => setSelectedDocs(documents.map(d => d.id));
  const deselectAll = () => setSelectedDocs([]);

  const activeDocuments = useMemo(() => {
    return documents
      .filter(d => selectedDocs.includes(d.id))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [documents, selectedDocs]);

  // All unique tags currently in library
  const allLibraryTags = useMemo(() => {
    const s = new Set<string>();
    documents.forEach(d => {
      if (d.tags) d.tags.forEach(t => s.add(t));
    });
    return Array.from(s).sort();
  }, [documents]);

  // Batch Tagging Execution Handler
  const handleApplyBatchTags = (targetDocIds: string[], tags: string[], action: 'add' | 'replace' | 'remove') => {
    if (!onUpdateDocuments) return;

    const updated = documents.map(doc => {
      if (!targetDocIds.includes(doc.id)) return doc;

      const current = doc.tags || [];
      let nextTags: string[] = [];

      if (action === 'add') {
        const set = new Set([...current, ...tags]);
        nextTags = Array.from(set);
      } else if (action === 'replace') {
        nextTags = [...tags];
      } else if (action === 'remove') {
        nextTags = current.filter(t => !tags.includes(t));
      }

      return { ...doc, tags: nextTags };
    });

    onUpdateDocuments(updated);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDirectExportPdf = () => {
    setIsDirectExporting(true);
    setExportSuccess(false);

    try {
      setTimeout(() => {
        const doc = generateEvidenceBinderPdf({
          documents: activeDocuments,
          coversheetConfig,
          annotations
        });

        const safeFilename = `${coversheetConfig.caseName.replace(/[^a-zA-Z0-9]/g, '_')}_Evidence_Bundle_${coversheetConfig.fileNumber.replace('/', '_')}.pdf`;
        doc.save(safeFilename);

        setIsDirectExporting(false);
        setExportSuccess(true);
        setTimeout(() => setExportSuccess(false), 3000);
      }, 400);
    } catch (err) {
      console.error('Error generating PDF:', err);
      setIsDirectExporting(false);
      alert('Failed to generate PDF. Please open the Preview Modal to review the bundle.');
    }
  };

  const copyIndexText = () => {
    let text = "FAMILY COURT OF WESTERN AUSTRALIA • CASE NO: 4344/2023\n";
    text += "HAWKINS v HAWKINS • INDEX OF ANNEXURES TO AFFIDAVIT OF BENJAMIN JAMES HAWKINS\n\n";
    text += "ANNEXURE | DATE | DESCRIPTION | SOURCE ORIGIN | EVIDENTIARY WEIGHT | TAGS\n";
    text += "--------------------------------------------------------------------------------\n";
    activeDocuments.forEach(doc => {
      const tagStr = doc.tags?.join(', ') || 'None';
      text += `${doc.annexureNumber || doc.id} | ${doc.date} | ${doc.title} | ${doc.sourceOrigin} | ${doc.evidentiaryWeight} | ${tagStr}\n`;
    });
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Total annotations on currently active documents
  const activeAnnotationsCount = useMemo(() => {
    const activeIds = new Set(activeDocuments.map(d => d.id));
    return annotations.filter(a => activeIds.has(a.docId)).length;
  }, [activeDocuments, annotations]);

  return (
    <div className="space-y-6 pb-12" id="evidence-binder-container">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 font-serif flex items-center gap-2">
            <FolderArchive className="w-5 h-5 text-amber-500" />
            <span>Evidence Binder &amp; Legal Filing Bundle</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Court-ready compilation of primary documents, automated coversheet, highlight annotations, and batch categorization for legal filing.
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Reconstructed Preview Modal Button */}
          <button
            onClick={() => setIsPdfPreviewOpen(true)}
            className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
            id="preview-pdf-bundle-btn"
            title="Preview reconstructed court bundle pages before exporting"
          >
            <Eye className="w-3.5 h-3.5 text-indigo-600" />
            <span>Preview PDF Bundle</span>
          </button>

          {/* Direct Export to PDF */}
          <button
            onClick={handleDirectExportPdf}
            disabled={isDirectExporting || activeDocuments.length === 0}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-sm transition cursor-pointer disabled:opacity-50"
            id="export-pdf-binder-btn"
            title="Generate and download formatted PDF with coversheet, index, and exhibits"
          >
            {exportSuccess ? (
              <Check className="w-3.5 h-3.5 text-emerald-300" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>{isDirectExporting ? 'Building PDF...' : exportSuccess ? 'Exported PDF!' : 'Export to PDF'}</span>
          </button>

          {/* Automated Coversheet Generator Settings */}
          <button
            onClick={() => setIsCoversheetSettingsOpen(true)}
            className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
            id="coversheet-settings-btn"
            title="Configure automated coversheet, case title, deponent details, and grouping order"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
            <span>Coversheet Options</span>
          </button>

          {/* Export Case Dossier ZIP */}
          <button
            onClick={() => setIsDossierModalOpen(true)}
            className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs rounded-lg flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
            id="export-dossier-zip-btn"
          >
            <Archive className="w-3.5 h-3.5 text-slate-500" />
            <span>Export ZIP</span>
          </button>

          {/* Copy Table */}
          <button
            onClick={copyIndexText}
            className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
            id="copy-binder-index-btn"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
            <span className="hidden sm:inline">{copied ? 'Index Copied' : 'Copy Table'}</span>
          </button>

          {/* Print Court Bundle */}
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            id="print-court-bundle-btn"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Feature Ribbon: Automated Coversheet, Batch Tagging & Annotations Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Coversheet Status Card */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-100 text-slate-800 rounded-lg">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Automated Coversheet</span>
              <span className="text-xs font-bold text-slate-800">
                {coversheetConfig.courtName.substring(0, 24)}...
              </span>
              <div className="text-[10px] text-slate-500">
                Filing Date: <strong className="text-slate-700">{coversheetConfig.filingDate}</strong>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsCoversheetSettingsOpen(true)}
            className="text-[11px] text-indigo-600 hover:underline font-semibold cursor-pointer"
          >
            Edit
          </button>
        </div>

        {/* Batch Tagging Card */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-50 text-amber-800 rounded-lg border border-amber-200">
              <Tags className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Batch Categorization</span>
              <span className="text-xs font-bold text-slate-800">
                {allLibraryTags.length} Categories / Tags Active
              </span>
              <div className="text-[10px] text-slate-500">
                e.g. Financial, Communications, Court Orders
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsBatchTagModalOpen(true)}
            disabled={activeDocuments.length === 0}
            className="text-[11px] text-amber-700 hover:underline font-semibold cursor-pointer disabled:opacity-40"
          >
            Batch Tag ({activeDocuments.length})
          </button>
        </div>

        {/* Annotations & Sticky Notes Card */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-rose-50 text-rose-800 rounded-lg border border-rose-200">
              <StickyNote className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Evidentiary Annotations</span>
              <span className="text-xs font-bold text-slate-800">
                {activeAnnotationsCount} Highlights &amp; Sticky Notes
              </span>
              <div className="text-[10px] text-slate-500">
                Export status: <strong className={coversheetConfig.includeAnnotations ? 'text-emerald-700' : 'text-slate-400'}>
                  {coversheetConfig.includeAnnotations ? 'Embedded in PDF' : 'Excluded'}
                </strong>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsPdfPreviewOpen(true)}
            className="text-[11px] text-rose-700 hover:underline font-semibold cursor-pointer"
          >
            Preview Notes
          </button>
        </div>
      </div>

      {/* Selector & Batch Controls Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Selected Annexures:</span>
            <span className="font-mono font-bold text-indigo-700 px-2 py-0.5 bg-indigo-50 rounded border border-indigo-200">
              {activeDocuments.length} of {documents.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={selectAll}
              className="text-indigo-600 hover:underline font-medium cursor-pointer"
            >
              Select All
            </button>
            <span className="text-slate-300">|</span>
            <button
              onClick={deselectAll}
              className="text-slate-500 hover:underline font-medium cursor-pointer"
            >
              Clear Selection
            </button>
          </div>
        </div>

        {/* Batch Tagging Action Button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsBatchTagModalOpen(true)}
            disabled={activeDocuments.length === 0}
            className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-semibold rounded-lg flex items-center gap-1.5 transition cursor-pointer disabled:opacity-40"
            title="Batch apply category tags to all selected documents"
          >
            <Tags className="w-3.5 h-3.5 text-amber-700" />
            <span>Batch Tag Selected ({activeDocuments.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setIsPdfPreviewOpen(true)}
            disabled={activeDocuments.length === 0}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg flex items-center gap-1.5 transition cursor-pointer disabled:opacity-40"
            title="Open reconstructed PDF preview"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Reconstructed View</span>
          </button>
        </div>
      </div>

      {/* Court Bundle Layout View */}
      <div className="bg-white rounded-xl border border-slate-300 p-8 sm:p-10 shadow-lg space-y-6 print:p-0 print:border-none print:shadow-none">
        {/* Certificate of Identification Cover */}
        <div className="border-2 border-slate-800 p-6 rounded-lg space-y-3 font-serif text-slate-900 bg-slate-50/50 relative">
          <button
            type="button"
            onClick={() => setIsCoversheetSettingsOpen(true)}
            className="absolute top-4 right-4 print:hidden text-xs text-indigo-700 bg-white hover:bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200 font-sans font-semibold flex items-center gap-1 cursor-pointer"
          >
            <SlidersHorizontal className="w-3 h-3" />
            <span>Configure Coversheet</span>
          </button>

          <div className="text-center space-y-1">
            <h2 className="text-xs uppercase tracking-widest font-bold text-slate-700">
              {coversheetConfig.courtName}
            </h2>
            <h3 className="text-xs font-mono font-bold text-slate-800">
              REGISTRY: {coversheetConfig.registry.toUpperCase()} &nbsp;•&nbsp; FILE NUMBER: {coversheetConfig.fileNumber}
            </h3>
            <p className="text-xs pt-1">
              {coversheetConfig.applicantName} (Applicant) and {coversheetConfig.respondentName} (Respondent)
            </p>
            <h1 className="text-base font-bold uppercase tracking-wide pt-2">
              {coversheetConfig.bundleTitle}
            </h1>
          </div>

          <p className="text-xs leading-relaxed pt-2">
            This is the Master Index of Annexures marked <strong>"BJH-1"</strong> to <strong>"BJH-{activeDocuments.length}"</strong> referred to in the Affidavit of <strong>{coversheetConfig.deponentName}</strong> sworn at Perth this {coversheetConfig.filingDate} before me:
          </p>

          <div className="pt-4 flex justify-between text-xs text-slate-600">
            <div>
              <div className="border-b border-slate-400 w-48 mb-1"></div>
              <span>Deponent ({coversheetConfig.deponentName})</span>
            </div>
            <div>
              <div className="border-b border-slate-400 w-64 mb-1"></div>
              <span>{coversheetConfig.witnessTitle}</span>
            </div>
          </div>
        </div>

        {/* Master Index Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-sans font-bold uppercase tracking-wider text-slate-700">
              Chronological Schedule of Primary Evidentiary Records
            </h3>
            <span className="text-[11px] text-slate-500 font-sans print:hidden">
              Tip: Click <strong>"Note / Highlight"</strong> to add sticky notes and text highlights before PDF export.
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-300 rounded-lg">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-800">
                  <th className="p-3 w-10 text-center print:hidden">Inc</th>
                  <th className="p-3 w-28">Annexure</th>
                  <th className="p-3 w-24">Date</th>
                  <th className="p-3">Title &amp; Factual Description</th>
                  <th className="p-3 w-40">Tags &amp; Annotations</th>
                  <th className="p-3 w-32">Source Origin</th>
                  <th className="p-3 w-28">Weight</th>
                  <th className="p-3 w-28 text-right print:hidden">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {activeDocuments.map((doc, idx) => {
                  const docAnnotations = annotations.filter(a => a.docId === doc.id);
                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 text-center print:hidden">
                        <input
                          type="checkbox"
                          checked={selectedDocs.includes(doc.id)}
                          onChange={() => toggleSelect(doc.id)}
                          className="rounded text-indigo-600 cursor-pointer"
                        />
                      </td>
                      <td className="p-3 font-mono font-bold text-indigo-900 whitespace-nowrap">
                        {doc.annexureNumber || `Annexure BJH-${idx + 1}`}
                      </td>
                      <td className="p-3 font-mono text-slate-700 whitespace-nowrap">
                        {doc.date}
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-slate-900">{doc.title}</div>
                        <div className="text-[11px] text-slate-500 italic mt-0.5 line-clamp-1">"{doc.excerpt}"</div>
                      </td>
                      <td className="p-3">
                        <div className="space-y-1.5">
                          {/* Tags */}
                          <div className="flex flex-wrap items-center gap-1">
                            {doc.tags && doc.tags.map(t => (
                              <span
                                key={t}
                                className="text-[9px] px-1.5 py-0.2 rounded bg-amber-50 text-amber-900 border border-amber-200 font-semibold"
                              >
                                #{t}
                              </span>
                            ))}
                            {(!doc.tags || doc.tags.length === 0) && (
                              <span className="text-[10px] text-slate-400 italic">No tags</span>
                            )}
                          </div>

                          {/* Annotation Badge / Quick Note Button */}
                          <div className="flex items-center gap-1">
                            {docAnnotations.length > 0 ? (
                              <button
                                type="button"
                                onClick={() => setAnnotationDoc(doc)}
                                className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100 transition cursor-pointer"
                                title="Click to view and edit notes/highlights"
                              >
                                <StickyNote className="w-2.5 h-2.5" />
                                <span>{docAnnotations.length} {docAnnotations.length === 1 ? 'Note' : 'Notes'}</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setAnnotationDoc(doc)}
                                className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-slate-500 hover:text-amber-800 hover:bg-amber-50 px-1.5 py-0.5 rounded border border-dashed border-slate-300 transition cursor-pointer"
                                title="Add sticky note or text highlight"
                              >
                                <Plus className="w-2.5 h-2.5" />
                                <span>Note</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-slate-700 font-medium">
                        {doc.sourceOrigin}
                      </td>
                      <td className="p-3">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                          doc.evidentiaryWeight === 'Sworn/Official'
                            ? 'bg-purple-50 text-purple-800 border-purple-200'
                            : doc.evidentiaryWeight === 'Third-Party Objective'
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}>
                          {doc.evidentiaryWeight}
                        </span>
                      </td>
                      <td className="p-3 text-right print:hidden">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setAnnotationDoc(doc)}
                            className="p-1 text-slate-500 hover:text-amber-800 hover:bg-amber-50 rounded transition cursor-pointer"
                            title="Add or edit highlighted annotations and sticky notes"
                          >
                            <Highlighter className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onViewDocument(doc)}
                            className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-900 font-semibold cursor-pointer"
                            id={`view-binder-annexure-${doc.id}`}
                          >
                            <span>View</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Reconstructed PDF Document Bundle Preview Modal */}
      <PdfBundlePreviewModal
        isOpen={isPdfPreviewOpen}
        onClose={() => setIsPdfPreviewOpen(false)}
        documents={activeDocuments}
        coversheetConfig={coversheetConfig}
        annotations={annotations}
        onOpenCoversheetSettings={() => {
          setIsPdfPreviewOpen(false);
          setIsCoversheetSettingsOpen(true);
        }}
        onUpdateCoversheetConfig={setCoversheetConfig}
      />

      {/* Document Annotation & Sticky Notes Modal */}
      {annotationDoc && (
        <DocumentAnnotationModal
          isOpen={Boolean(annotationDoc)}
          onClose={() => setAnnotationDoc(null)}
          document={annotationDoc}
          annotations={annotations}
          onSaveAnnotation={handleSaveAnnotation}
          onDeleteAnnotation={handleDeleteAnnotation}
        />
      )}

      {/* Batch Tagging Modal */}
      <BinderBatchTagModal
        isOpen={isBatchTagModalOpen}
        onClose={() => setIsBatchTagModalOpen(false)}
        selectedDocuments={activeDocuments}
        allLibraryTags={allLibraryTags}
        onApplyBatchTags={handleApplyBatchTags}
      />

      {/* Automated Coversheet Generator Settings Modal */}
      <CoversheetSettingsModal
        isOpen={isCoversheetSettingsOpen}
        onClose={() => setIsCoversheetSettingsOpen(false)}
        config={coversheetConfig}
        documents={activeDocuments}
        onSaveConfig={setCoversheetConfig}
      />

      {/* Case Dossier Export Modal (ZIP) */}
      <CaseDossierExportModal
        isOpen={isDossierModalOpen}
        onClose={() => setIsDossierModalOpen(false)}
        documents={activeDocuments}
        timeline={timeline}
        orders={orders}
        discrepancies={discrepancies}
        courtCriteria={courtCriteria}
      />
    </div>
  );
};
