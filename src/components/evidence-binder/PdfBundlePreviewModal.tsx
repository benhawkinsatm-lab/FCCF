import React, { useState, useMemo } from 'react';
import {
  X,
  Download,
  Printer,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Layers,
  ZoomIn,
  ZoomOut,
  Sparkles,
  StickyNote,
  Check,
  Loader2,
  Eye,
  FileCheck
} from 'lucide-react';
import { DocumentRecord } from '../../types';
import { BinderCoversheetConfig, DocumentAnnotation } from './types';
import { generateEvidenceBinderPdf, sortAndGroupDocuments } from './pdfExportUtil';

interface PdfBundlePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  documents: DocumentRecord[];
  coversheetConfig: BinderCoversheetConfig;
  annotations: DocumentAnnotation[];
  onOpenCoversheetSettings: () => void;
  onUpdateCoversheetConfig: (cfg: BinderCoversheetConfig) => void;
}

export const PdfBundlePreviewModal: React.FC<PdfBundlePreviewModalProps> = ({
  isOpen,
  onClose,
  documents,
  coversheetConfig,
  annotations,
  onOpenCoversheetSettings,
  onUpdateCoversheetConfig
}) => {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportSuccess, setExportSuccess] = useState<boolean>(false);

  // Grouped documents
  const groupedSections = useMemo(() => {
    return sortAndGroupDocuments(documents, coversheetConfig.groupBy);
  }, [documents, coversheetConfig.groupBy]);

  // Flatten ordered documents
  const orderedDocuments = useMemo(() => {
    return groupedSections.flatMap(s => s.documents);
  }, [groupedSections]);

  // Calculate total pages in preview:
  // Page 1: Coversheet
  // Page 2: Table of Contents (if enabled)
  // Page 3...: One or more pages per document (approx 1 page per document exhibit)
  const totalPages = 1 + (coversheetConfig.includeTableOfContents ? 1 : 0) + orderedDocuments.length;

  if (!isOpen) return null;

  const handleExportPdf = () => {
    setIsExporting(true);
    setExportSuccess(false);

    try {
      setTimeout(() => {
        const doc = generateEvidenceBinderPdf({
          documents,
          coversheetConfig,
          annotations
        });

        const safeFilename = `${coversheetConfig.caseName.replace(/[^a-zA-Z0-9]/g, '_')}_Evidence_Bundle_${coversheetConfig.fileNumber.replace('/', '_')}.pdf`;
        doc.save(safeFilename);

        setIsExporting(false);
        setExportSuccess(true);
        setTimeout(() => setExportSuccess(false), 3000);
      }, 500);
    } catch (err) {
      console.error('Error exporting PDF bundle:', err);
      setIsExporting(false);
      alert('Failed to generate PDF. Please check your document text and try again.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Determine what document corresponds to the current page
  const isCoversheetPage = currentPage === 1;
  const isTocPage = coversheetConfig.includeTableOfContents && currentPage === 2;
  const exhibitOffset = coversheetConfig.includeTableOfContents ? 2 : 1;
  const currentDocIndex = currentPage > exhibitOffset ? currentPage - exhibitOffset - 1 : 0;
  const currentDoc = orderedDocuments[currentDocIndex] || orderedDocuments[0];
  const currentDocAnnotations = annotations.filter(a => a.docId === currentDoc?.id);

  // Automated Metrics for Coversheet
  const categoriesCount: Record<string, number> = {};
  const weightCount: Record<string, number> = {};
  const tagSummary: Record<string, number> = {};
  let earliestDate = documents[0]?.date || '';
  let latestDate = documents[0]?.date || '';

  documents.forEach(d => {
    categoriesCount[d.category] = (categoriesCount[d.category] || 0) + 1;
    weightCount[d.evidentiaryWeight] = (weightCount[d.evidentiaryWeight] || 0) + 1;
    if (d.tags) {
      d.tags.forEach(t => {
        tagSummary[t] = (tagSummary[t] || 0) + 1;
      });
    }
    if (d.date < earliestDate) earliestDate = d.date;
    if (d.date > latestDate) latestDate = d.date;
  });

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/80 backdrop-blur-md overflow-hidden">
      {/* Top Controls Bar */}
      <div className="bg-slate-900 border-b border-slate-800 text-white px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30">
            <Eye className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xs font-bold font-serif tracking-wide uppercase">
                Court PDF Bundle Reconstructed Preview
              </h1>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-indigo-500/30 text-indigo-300 border border-indigo-500/40">
                {coversheetConfig.fileNumber}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {documents.length} Selected Exhibits • Page {currentPage} of {totalPages}
            </p>
          </div>
        </div>

        {/* Center: Page Stepper & Zoom */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="p-1.5 text-slate-300 hover:text-white disabled:text-slate-600 transition cursor-pointer"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 text-xs font-mono font-semibold text-slate-200">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className="p-1.5 text-slate-300 hover:text-white disabled:text-slate-600 transition cursor-pointer"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-1 bg-slate-800 rounded-lg p-0.5 border border-slate-700">
            <button
              type="button"
              onClick={() => setZoomLevel(z => Math.max(70, z - 10))}
              className="p-1.5 text-slate-400 hover:text-white transition cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono px-1 text-slate-300">
              {zoomLevel}%
            </span>
            <button
              type="button"
              onClick={() => setZoomLevel(z => Math.min(140, z + 10))}
              className="p-1.5 text-slate-400 hover:text-white transition cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Quick toggle annotations */}
          <button
            type="button"
            onClick={() => onUpdateCoversheetConfig({ ...coversheetConfig, includeAnnotations: !coversheetConfig.includeAnnotations })}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition flex items-center gap-1.5 cursor-pointer ${
              coversheetConfig.includeAnnotations
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
            title="Toggle whether highlights and sticky notes are embedded in PDF"
          >
            <StickyNote className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Annotations:</span>
            <span>{coversheetConfig.includeAnnotations ? 'ON' : 'OFF'}</span>
          </button>

          {/* Coversheet Settings */}
          <button
            type="button"
            onClick={onOpenCoversheetSettings}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden md:inline">Coversheet Options</span>
          </button>

          {/* Print */}
          <button
            type="button"
            onClick={handlePrint}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
            title="Print Bundle"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Print</span>
          </button>

          {/* Export to PDF Button */}
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={isExporting}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow-md flex items-center gap-1.5 transition cursor-pointer"
          >
            {isExporting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : exportSuccess ? (
              <Check className="w-3.5 h-3.5 text-emerald-300" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>{isExporting ? 'Generating PDF...' : exportSuccess ? 'Exported!' : 'Export to PDF'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer ml-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Preview Container with Side Thumbnails and Central Paper Sheet */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Thumbnails Navigator */}
        <div className="w-48 bg-slate-900/90 border-r border-slate-800 p-3 overflow-y-auto space-y-2 hidden md:block shrink-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block px-1">
            Bundle Outline
          </span>

          {/* Page 1 Thumbnail: Coversheet */}
          <button
            type="button"
            onClick={() => setCurrentPage(1)}
            className={`w-full text-left p-2 rounded-lg border transition text-xs cursor-pointer ${
              currentPage === 1
                ? 'bg-indigo-950/60 border-indigo-500 text-white'
                : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center justify-between font-mono text-[10px] mb-0.5">
              <span>PAGE 1</span>
              <FileCheck className="w-3 h-3 text-amber-400" />
            </div>
            <div className="font-semibold truncate text-slate-200">Official Coversheet</div>
            <div className="text-[10px] text-slate-400 truncate">Certificate &amp; Jurat</div>
          </button>

          {/* Page 2 Thumbnail: TOC (if enabled) */}
          {coversheetConfig.includeTableOfContents && (
            <button
              type="button"
              onClick={() => setCurrentPage(2)}
              className={`w-full text-left p-2 rounded-lg border transition text-xs cursor-pointer ${
                currentPage === 2
                  ? 'bg-indigo-950/60 border-indigo-500 text-white'
                  : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center justify-between font-mono text-[10px] mb-0.5">
                <span>PAGE 2</span>
                <Layers className="w-3 h-3 text-indigo-400" />
              </div>
              <div className="font-semibold truncate text-slate-200">Table of Annexures</div>
              <div className="text-[10px] text-slate-400 truncate">Master Index (1-{documents.length})</div>
            </button>
          )}

          <div className="pt-2 border-t border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block px-1 mb-1.5">
              Exhibit Pages ({orderedDocuments.length})
            </span>
            <div className="space-y-1">
              {orderedDocuments.map((doc, idx) => {
                const pageNum = exhibitOffset + idx + 1;
                const isSelected = currentPage === pageNum;
                const annCount = annotations.filter(a => a.docId === doc.id).length;

                return (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-full text-left p-1.5 rounded-lg border transition text-xs cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-950/60 border-indigo-500 text-white'
                        : 'bg-slate-800/40 border-slate-700/40 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between font-mono text-[10px]">
                      <span>{doc.annexureNumber || `BJH-${idx + 1}`}</span>
                      {annCount > 0 && (
                        <span className="text-[9px] px-1 rounded bg-amber-500/20 text-amber-300 font-bold">
                          {annCount}
                        </span>
                      )}
                    </div>
                    <div className="truncate font-medium text-slate-300 text-[11px]">
                      {doc.title}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Central Reconstructed Paper Canvas */}
        <div className="flex-1 bg-slate-950 p-4 sm:p-8 overflow-y-auto flex justify-center items-start">
          <div
            style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
            className="transition-transform duration-150"
          >
            {/* LEGAL A4 SHEET CONTAINER */}
            <div className="w-[794px] min-h-[1123px] bg-white text-slate-900 rounded-xs shadow-2xl p-14 border border-slate-300 flex flex-col justify-between font-sans relative">
              {/* Top Watermark / Status */}
              <div className="absolute top-3 right-6 text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                Court Filing Bundle • Exhibit Annexure
              </div>

              {/* PAGE CONTENT RENDERING */}
              {isCoversheetPage && (
                <div className="space-y-6">
                  {/* Decorative Border Box */}
                  <div className="border-4 border-double border-slate-900 p-8 space-y-5 bg-slate-50/40">
                    <div className="text-center space-y-1.5">
                      <h2 className="text-xs uppercase tracking-widest font-bold text-slate-700 font-serif">
                        {coversheetConfig.courtName}
                      </h2>
                      <div className="text-xs font-mono font-bold text-slate-800">
                        REGISTRY: {coversheetConfig.registry.toUpperCase()} &nbsp;•&nbsp; FILE NUMBER: {coversheetConfig.fileNumber}
                      </div>
                      <div className="pt-2 text-xs font-serif text-slate-800 font-medium">
                        <div><strong>{coversheetConfig.applicantName}</strong> (Applicant)</div>
                        <div className="italic text-slate-500 text-[11px]">- and -</div>
                        <div><strong>{coversheetConfig.respondentName}</strong> (Respondent)</div>
                      </div>
                      <div className="pt-4 border-t-2 border-slate-900 mt-3">
                        <h1 className="text-base font-bold uppercase tracking-wider font-serif text-slate-950">
                          {coversheetConfig.bundleTitle}
                        </h1>
                        <p className="text-[11px] text-slate-600 font-serif italic pt-0.5">
                          Certificate of Identification of Exhibits pursuant to Family Law Rules
                        </p>
                      </div>
                    </div>

                    {/* Recital */}
                    <div className="text-xs font-serif leading-relaxed text-slate-800 pt-2 space-y-2">
                      <p>
                        This is the consolidated Bundle of Evidence containing <strong>{documents.length}</strong> primary evidentiary records and exhibits, marked sequentially <strong>"Annexure BJH-1"</strong> to <strong>"Annexure BJH-{documents.length}"</strong>, referred to in the Affidavit of <strong>{coversheetConfig.deponentName}</strong> sworn at Perth on <strong>{coversheetConfig.filingDate}</strong>.
                      </p>
                      {coversheetConfig.matterDescription && (
                        <p className="italic text-slate-600 text-[11px] bg-white p-2.5 rounded border border-slate-200">
                          <strong>Matter Details:</strong> {coversheetConfig.matterDescription}
                        </p>
                      )}
                    </div>

                    {/* Automated Statistical Summary Box */}
                    {coversheetConfig.includeSummaryStats && (
                      <div className="bg-white rounded-lg p-4 border border-slate-300 space-y-2 font-sans">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                          <span className="text-[11px] font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                            Automated Evidence Dossier Summary
                          </span>
                          <span className="text-[10px] font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded font-bold">
                            {documents.length} Annexures Indexed
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-xs text-slate-700">
                          <div>
                            <span className="text-[10px] font-semibold text-slate-500 uppercase block">Date Range:</span>
                            <span className="font-mono text-slate-900 font-semibold">{earliestDate} to {latestDate}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-semibold text-slate-500 uppercase block">Bundle Organization:</span>
                            <span className="capitalize font-semibold text-slate-900">
                              {coversheetConfig.groupBy === 'chronological' ? 'Strict Chronological' : `By ${coversheetConfig.groupBy}`}
                            </span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-[10px] font-semibold text-slate-500 uppercase block">Categories Breakdown:</span>
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {Object.entries(categoriesCount).map(([cat, count]) => (
                                <span key={cat} className="text-[10px] px-2 py-0.5 bg-slate-100 rounded text-slate-800 font-medium">
                                  {cat}: <strong>{count}</strong>
                                </span>
                              ))}
                            </div>
                          </div>
                          {Object.keys(tagSummary).length > 0 && (
                            <div className="col-span-2">
                              <span className="text-[10px] font-semibold text-slate-500 uppercase block">Batch Tags Applied:</span>
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {Object.entries(tagSummary).map(([tag, count]) => (
                                  <span key={tag} className="text-[10px] px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-200 rounded font-medium">
                                    #{tag} ({count})
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Jurat / Signature Block */}
                    <div className="pt-8 grid grid-cols-2 gap-8 text-xs font-serif text-slate-800">
                      <div>
                        <div className="border-b-2 border-slate-700 w-56 mb-1.5 h-10"></div>
                        <div className="font-bold text-slate-900">Deponent: {coversheetConfig.deponentName}</div>
                        <div className="text-[10px] text-slate-500 font-sans">Sworn at Perth this {coversheetConfig.filingDate}</div>
                      </div>
                      <div>
                        <div className="border-b-2 border-slate-700 w-64 mb-1.5 h-10"></div>
                        <div className="font-bold text-slate-900">{coversheetConfig.witnessTitle}</div>
                        <div className="text-[10px] text-slate-500 font-sans">{coversheetConfig.solicitorFirmOrDeponentNote}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Page 2: Table of Annexures */}
              {isTocPage && (
                <div className="space-y-6">
                  <div className="text-center space-y-1 border-b border-slate-300 pb-3">
                    <h2 className="text-sm font-bold uppercase tracking-wider font-serif text-slate-900">
                      MASTER SCHEDULE OF PRIMARY EVIDENTIARY RECORDS
                    </h2>
                    <p className="text-xs text-slate-500 font-serif italic">
                      Chronological Index of Annexures BJH-1 to BJH-{documents.length} referred to in Affidavit
                    </p>
                  </div>

                  <div className="border border-slate-300 rounded overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse font-sans">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-800 text-[11px]">
                          <th className="p-2.5 w-20">Annexure</th>
                          <th className="p-2.5 w-24">Date</th>
                          <th className="p-2.5">Title &amp; Factual Description</th>
                          <th className="p-2.5 w-32">Tags / Category</th>
                          <th className="p-2.5 w-32">Source Origin</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-[11px]">
                        {orderedDocuments.map((doc, idx) => (
                          <tr key={doc.id} className="hover:bg-slate-50">
                            <td className="p-2 font-mono font-bold text-indigo-900 whitespace-nowrap">
                              {doc.annexureNumber || `BJH-${idx + 1}`}
                            </td>
                            <td className="p-2 font-mono text-slate-700 whitespace-nowrap">
                              {doc.date}
                            </td>
                            <td className="p-2">
                              <div className="font-semibold text-slate-900">{doc.title}</div>
                              <div className="text-[10px] text-slate-500 italic truncate max-w-xs">
                                "{doc.excerpt}"
                              </div>
                            </td>
                            <td className="p-2">
                              {doc.tags && doc.tags.length > 0 ? (
                                <span className="text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-900 border border-amber-200 rounded font-mono font-semibold">
                                  #{doc.tags[0]}
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-600">{doc.category}</span>
                              )}
                            </td>
                            <td className="p-2 text-slate-700">
                              {doc.sourceOrigin}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Page 3+: Document Exhibit Pages */}
              {!isCoversheetPage && !isTocPage && currentDoc && (
                <div className="space-y-6">
                  {/* Official Annexure Banner */}
                  <div className="bg-slate-900 text-white p-4 rounded-xs flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold font-serif uppercase tracking-wide text-amber-300">
                        {currentDoc.annexureNumber || `ANNEXURE BJH-${currentDocIndex + 1}`}
                      </div>
                      <div className="text-[11px] text-slate-300 font-serif">
                        REFERRED TO IN THE AFFIDAVIT OF BENJAMIN JAMES HAWKINS
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-mono font-bold text-indigo-200">
                        EXHIBIT {currentDocIndex + 1} OF {documents.length}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        CASE NO: {coversheetConfig.fileNumber}
                      </div>
                    </div>
                  </div>

                  {/* Exhibit Metadata Banner */}
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-1.5 text-xs font-sans">
                    <h3 className="text-base font-bold text-slate-950 font-serif">
                      {currentDoc.title}
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-600 text-[11px] pt-1">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase block">Date:</span>
                        <strong className="font-mono text-slate-800">{currentDoc.date}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase block">Origin:</span>
                        <span className="font-semibold text-slate-800">{currentDoc.sourceOrigin}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase block">Category:</span>
                        <span className="font-semibold text-slate-800">{currentDoc.category}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase block">Weight:</span>
                        <span className="font-semibold text-purple-800">{currentDoc.evidentiaryWeight}</span>
                      </div>
                    </div>

                    {currentDoc.tags && currentDoc.tags.length > 0 && (
                      <div className="pt-2 flex flex-wrap items-center gap-1">
                        <span className="text-[10px] text-slate-400 uppercase mr-1">Tags:</span>
                        {currentDoc.tags.map(t => (
                          <span
                            key={t}
                            className="text-[10px] px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 font-medium"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Excerpt Blockquote */}
                  {currentDoc.excerpt && (
                    <div className="bg-amber-50/60 p-3.5 rounded-lg border-l-4 border-amber-500 text-xs italic font-serif text-slate-800 leading-relaxed">
                      "{currentDoc.excerpt}"
                    </div>
                  )}

                  {/* Primary Document Transcription */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-700 font-sans">
                        Document Record &amp; Transcription Text
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        File Type: {currentDoc.fileType.toUpperCase()}
                      </span>
                    </div>

                    <div className="p-4 bg-slate-50/60 rounded border border-slate-200 font-mono text-xs text-slate-800 leading-relaxed whitespace-pre-wrap max-h-72 overflow-y-auto">
                      {currentDoc.fullText || currentDoc.excerpt || 'No full text available.'}
                    </div>
                  </div>

                  {/* Highlight Annotations & Sticky Notes Section */}
                  {coversheetConfig.includeAnnotations && (
                    <div className="space-y-2.5 pt-2">
                      <div className="flex items-center justify-between border-b border-amber-200 pb-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-amber-900 font-sans flex items-center gap-1.5">
                          <StickyNote className="w-3.5 h-3.5 text-amber-600" />
                          Evidentiary Annotations &amp; Sticky Notes ({currentDocAnnotations.length})
                        </span>
                        <span className="text-[10px] text-amber-700 italic">
                          Embedded for judicial examination
                        </span>
                      </div>

                      {currentDocAnnotations.length === 0 ? (
                        <div className="text-center py-4 bg-slate-50 rounded border border-dashed border-slate-200 text-slate-400 text-xs italic">
                          No sticky notes or annotations for this exhibit. (You can add them in the Evidence Binder).
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-2.5">
                          {currentDocAnnotations.map(ann => (
                            <div
                              key={ann.id}
                              className="p-3 bg-amber-50 rounded-lg border border-amber-200 shadow-2xs space-y-1 relative"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-200/80 text-amber-900">
                                  {ann.type === 'highlight' ? 'Highlight Quote' : 'Sticky Note'}
                                </span>
                                {ann.categoryTag && (
                                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                                    #{ann.categoryTag}
                                  </span>
                                )}
                              </div>

                              {ann.textSnippet && (
                                <div className="text-xs italic text-slate-800 font-serif border-l-2 border-amber-500 pl-2 my-1">
                                  "{ann.textSnippet}"
                                </div>
                              )}

                              <p className="text-xs text-slate-900 font-medium font-sans">
                                {ann.comment}
                              </p>

                              <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-amber-200/60 font-sans">
                                <span>Deponent Note: {ann.author}</span>
                                <span>{ann.createdAt}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Legal A4 Page Footer */}
              <div className="border-t border-slate-200 pt-3 text-[10px] text-slate-400 flex items-center justify-between font-mono mt-8">
                <span>IN THE FAMILY COURT OF WA • CASE NO: {coversheetConfig.fileNumber}</span>
                <span>HAWKINS v HAWKINS</span>
                <span>PAGE {currentPage} OF {totalPages}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
