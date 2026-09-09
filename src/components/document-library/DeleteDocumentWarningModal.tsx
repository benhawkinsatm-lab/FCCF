import React, { useState } from 'react';
import { 
  AlertTriangle, 
  Trash2, 
  X, 
  Calendar, 
  Scale, 
  FileText, 
  Layers, 
  ShieldAlert, 
  StickyNote, 
  Highlighter, 
  Clock, 
  MessageSquare, 
  UserCheck, 
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Info
} from 'lucide-react';
import { DocumentRecord } from '../../types';
import { DocumentDependencyDetail } from '../../utils/documentDependencyService';

interface DeleteDocumentWarningModalProps {
  dependencies: DocumentDependencyDetail[];
  onConfirm: () => void;
  onClose: () => void;
  isDeleting?: boolean;
}

export const DeleteDocumentWarningModal: React.FC<DeleteDocumentWarningModalProps> = ({
  dependencies,
  onConfirm,
  onClose,
  isDeleting = false,
}) => {
  const [activeDocIndex, setActiveDocIndex] = useState(0);
  const [expandedSection, setExpandedSection] = useState<string | null>('all');

  if (!dependencies || dependencies.length === 0) return null;

  const totalAssociatedItems = dependencies.reduce((acc, d) => acc + d.totalAssociatedCount, 0);
  const totalDocsCount = dependencies.length;
  const currentDetail = dependencies[activeDocIndex] || dependencies[0];
  const currentDoc = currentDetail.doc;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-rose-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        id="delete-document-warning-modal"
        role="dialog"
        aria-modal="true"
      >
        {/* Header Banner */}
        <div className="p-5 border-b border-rose-100 bg-rose-50/80 flex items-start justify-between">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 bg-rose-600 text-white rounded-xl shadow-md shrink-0 mt-0.5">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-200 text-rose-900 uppercase tracking-wider">
                  <ShieldAlert className="w-3 h-3 text-rose-700" />
                  Irreversible Vault Action
                </span>
                <span className="text-xs text-slate-500 font-mono">Case 4344/2023</span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 mt-1">
                {totalDocsCount === 1 
                  ? `Delete Document: "${currentDoc.title}"` 
                  : `Delete ${totalDocsCount} Selected Documents`}
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Review the document details and all associated records that will be permanently removed.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-rose-100/80 transition cursor-pointer"
            id="close-delete-modal-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Multi-Doc Selector Tab bar if multiple documents are selected for deletion */}
        {totalDocsCount > 1 && (
          <div className="px-5 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center gap-2 overflow-x-auto">
            <span className="text-xs font-semibold text-slate-600 shrink-0">Documents ({totalDocsCount}):</span>
            {dependencies.map((dep, idx) => (
              <button
                key={dep.doc.id}
                type="button"
                onClick={() => setActiveDocIndex(idx)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 flex items-center gap-1.5 transition cursor-pointer ${
                  activeDocIndex === idx
                    ? 'bg-rose-600 text-white shadow-xs font-bold'
                    : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                }`}
                id={`tab-delete-doc-${dep.doc.id}`}
              >
                <span>{dep.doc.annexureNumber || dep.doc.id}</span>
                {dep.totalAssociatedCount > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    activeDocIndex === idx ? 'bg-rose-700 text-rose-100' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {dep.totalAssociatedCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Modal Scrollable Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4 text-xs bg-slate-50/50">
          {/* Target Document Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold px-2 py-0.5 bg-slate-100 text-slate-800 rounded border border-slate-200">
                  {currentDoc.id}
                </span>
                {currentDoc.annexureNumber && (
                  <span className="font-mono text-xs font-bold px-2 py-0.5 bg-amber-100 text-amber-900 rounded border border-amber-300">
                    {currentDoc.annexureNumber}
                  </span>
                )}
                <span className="text-[11px] font-medium px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full border border-slate-200">
                  {currentDoc.category}
                </span>
              </div>
              <div className="flex items-center gap-3 text-slate-500 text-[11px]">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  {currentDoc.date}
                </span>
                <span>•</span>
                <span className="truncate max-w-[200px]" title={currentDoc.sourceOrigin}>
                  {currentDoc.sourceOrigin}
                </span>
              </div>
            </div>

            <h3 className="text-sm font-bold text-slate-900">{currentDoc.title}</h3>

            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 font-serif italic text-slate-600 text-xs line-clamp-2">
              "{currentDoc.excerpt}"
            </div>
          </div>

          {/* Associated Items Warning Section */}
          {currentDetail.totalAssociatedCount > 0 ? (
            <div className="bg-rose-50 border border-rose-300 rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-rose-950 uppercase tracking-wide">
                    Associated Records &amp; Notes Will Be Permanently Deleted ({currentDetail.totalAssociatedCount} items)
                  </h4>
                  <p className="text-xs text-rose-800 mt-0.5">
                    This document is referenced by other records in the case ledger. Confirming deletion will automatically cascade and delete the following linked items:
                  </p>
                </div>
              </div>

              {/* Itemized Lists */}
              <div className="space-y-2.5 pt-1">
                {/* 1. Timeline Events */}
                {currentDetail.timelineEvents.length > 0 && (
                  <div className="bg-white rounded-lg border border-rose-200 p-3 space-y-1.5">
                    <div className="flex items-center justify-between text-slate-700 font-bold">
                      <span className="flex items-center gap-1.5 text-rose-950">
                        <Clock className="w-3.5 h-3.5 text-rose-600" />
                        <span>Timeline Ledger Events ({currentDetail.timelineEvents.length})</span>
                      </span>
                      <span className="text-[10px] text-rose-700 font-medium">Will be removed from timeline</span>
                    </div>
                    <div className="space-y-1.5 divide-y divide-slate-100">
                      {currentDetail.timelineEvents.map(ev => (
                        <div key={ev.id} className="pt-1.5 first:pt-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-slate-900">{ev.title}</span>
                            <span className="text-[11px] text-slate-500 font-mono">{ev.date}</span>
                          </div>
                          <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-1">{ev.description}</p>
                          {ev.orderBreachFlag && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.2 rounded mt-1">
                              Breach of Order {ev.breachedOrderNumber || 'Order'} ({ev.breachSeverity || 'Flagged'})
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Discrepancies */}
                {currentDetail.discrepancies.length > 0 && (
                  <div className="bg-white rounded-lg border border-rose-200 p-3 space-y-1.5">
                    <div className="flex items-center justify-between text-slate-700 font-bold">
                      <span className="flex items-center gap-1.5 text-rose-950">
                        <Scale className="w-3.5 h-3.5 text-rose-600" />
                        <span>Discrepancies &amp; Contradictions ({currentDetail.discrepancies.length})</span>
                      </span>
                      <span className="text-[10px] text-rose-700 font-medium">Will be removed from discrepancy engine</span>
                    </div>
                    <div className="space-y-1.5 divide-y divide-slate-100">
                      {currentDetail.discrepancies.map(disc => (
                        <div key={disc.id} className="pt-1.5 first:pt-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-slate-900">Claim: "{disc.claimText.slice(0, 60)}..."</span>
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-900">
                              {disc.severity} Severity
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 mt-0.5">
                            <strong className="text-slate-700">Contradicted by fact:</strong> {disc.conflictingFact}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Evidence Annotations & Sticky Notes */}
                {currentDetail.annotations.length > 0 && (
                  <div className="bg-white rounded-lg border border-rose-200 p-3 space-y-1.5">
                    <div className="flex items-center justify-between text-slate-700 font-bold">
                      <span className="flex items-center gap-1.5 text-rose-950">
                        <StickyNote className="w-3.5 h-3.5 text-rose-600" />
                        <span>Evidence Binder Annotations &amp; Sticky Notes ({currentDetail.annotations.length})</span>
                      </span>
                      <span className="text-[10px] text-rose-700 font-medium">Will be removed from binder</span>
                    </div>
                    <div className="space-y-1.5 divide-y divide-slate-100">
                      {currentDetail.annotations.map(ann => (
                        <div key={ann.id} className="pt-1.5 first:pt-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              {ann.type === 'sticky_note' ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-900">
                                  <StickyNote className="w-2.5 h-2.5" /> Sticky Note
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-900">
                                  <Highlighter className="w-2.5 h-2.5" /> Highlight
                                </span>
                              )}
                              {ann.categoryTag && (
                                <span className="text-[10px] text-slate-500 font-medium">#{ann.categoryTag}</span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">{ann.createdAt}</span>
                          </div>
                          <p className="text-[11px] text-slate-700 font-serif italic mt-1 bg-amber-50/60 p-1.5 rounded border border-amber-100">
                            "{ann.textSnippet}"
                          </p>
                          <p className="text-[11px] text-slate-600 mt-1">
                            <strong className="text-slate-700">Legal Analysis Note:</strong> {ann.comment}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. Court Criteria Links */}
                {currentDetail.courtCriteria.length > 0 && (
                  <div className="bg-white rounded-lg border border-rose-200 p-3 space-y-1.5">
                    <span className="flex items-center gap-1.5 text-rose-950 font-bold">
                      <Scale className="w-3.5 h-3.5 text-rose-600" />
                      <span>Court Criteria &amp; Statutory Submissions ({currentDetail.courtCriteria.length})</span>
                    </span>
                    <div className="space-y-1 divide-y divide-slate-100">
                      {currentDetail.courtCriteria.map((item, idx) => (
                        <div key={idx} className="pt-1 first:pt-0">
                          <span className="font-semibold text-slate-900">{item.criterion.statutoryRef}</span>
                          <p className="text-[11px] text-slate-600">{item.matchReason}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. Issue & Child Well-being Concerns */}
                {currentDetail.issuesConcerns.length > 0 && (
                  <div className="bg-white rounded-lg border border-rose-200 p-3 space-y-1.5">
                    <span className="flex items-center gap-1.5 text-rose-950 font-bold">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                      <span>Child Well-Being Concerns ({currentDetail.issuesConcerns.length})</span>
                    </span>
                    <div className="space-y-1 divide-y divide-slate-100">
                      {currentDetail.issuesConcerns.map((item, idx) => (
                        <div key={idx} className="pt-1 first:pt-0">
                          <span className="font-semibold text-slate-900">{item.issue.title}</span>
                          <p className="text-[11px] text-slate-600">{item.matchReason}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 6. Communication Messages */}
                {currentDetail.communicationMessages.length > 0 && (
                  <div className="bg-white rounded-lg border border-rose-200 p-3 space-y-1.5">
                    <span className="flex items-center gap-1.5 text-rose-950 font-bold">
                      <MessageSquare className="w-3.5 h-3.5 text-rose-600" />
                      <span>Communication Thread Logs ({currentDetail.communicationMessages.length})</span>
                    </span>
                    <div className="space-y-1 divide-y divide-slate-100">
                      {currentDetail.communicationMessages.map(msg => (
                        <div key={msg.id} className="pt-1 first:pt-0">
                          <span className="font-semibold text-slate-900">{msg.sender} ({msg.channel})</span>
                          <p className="text-[11px] text-slate-600 line-clamp-1">{msg.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 7. Response Requirements */}
                {currentDetail.responseRequirements.length > 0 && (
                  <div className="bg-white rounded-lg border border-rose-200 p-3 space-y-1.5">
                    <span className="flex items-center gap-1.5 text-rose-950 font-bold">
                      <Clock className="w-3.5 h-3.5 text-rose-600" />
                      <span>Response Obligations ({currentDetail.responseRequirements.length})</span>
                    </span>
                    <div className="space-y-1 divide-y divide-slate-100">
                      {currentDetail.responseRequirements.map(req => (
                        <div key={req.id} className="pt-1 first:pt-0">
                          <span className="font-semibold text-slate-900">{req.informationRequested}</span>
                          <p className="text-[11px] text-slate-600">Status: {req.status} (from {req.requestingParty})</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 8. Party Profiles & Proposed Orders */}
                {(currentDetail.partyProfiles.length > 0 || currentDetail.proposedOrders.length > 0) && (
                  <div className="bg-white rounded-lg border border-rose-200 p-3 space-y-1.5">
                    <span className="flex items-center gap-1.5 text-rose-950 font-bold">
                      <UserCheck className="w-3.5 h-3.5 text-rose-600" />
                      <span>Profile &amp; Proposed Order Citations</span>
                    </span>
                    <div className="space-y-1 divide-y divide-slate-100">
                      {currentDetail.partyProfiles.map((p, idx) => (
                        <div key={`p-${idx}`} className="pt-1 first:pt-0">
                          <span className="font-semibold text-slate-900">{p.profile.partyName} ({p.profile.role})</span>
                          <p className="text-[11px] text-slate-600">{p.matchReason}</p>
                        </div>
                      ))}
                      {currentDetail.proposedOrders.map((o, idx) => (
                        <div key={`o-${idx}`} className="pt-1 first:pt-0">
                          <span className="font-semibold text-slate-900">Order {o.order.orderNumber}: {o.order.title}</span>
                          <p className="text-[11px] text-slate-600">{o.matchReason}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
                  No Dependent Records Found
                </h4>
                <p className="text-xs text-emerald-800 mt-0.5">
                  There are currently no timeline events, discrepancies, notes, or statutory criteria referencing this document. Removing it from the vault is clean and will not alter any other case records.
                </p>
              </div>
            </div>
          )}

          {/* Critical Warning Footer Notice */}
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-2.5 text-amber-900">
            <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <strong>Family Court Compliance Note:</strong> Deleting this record will update your local repository and automatically synchronize changes to your connected self-hosted storage. Ensure that any primary copies required for filing are saved externally.
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
            id="cancel-delete-modal-btn"
          >
            Cancel / Keep Document
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition cursor-pointer"
            id="confirm-delete-modal-btn"
          >
            <Trash2 className="w-4 h-4" />
            <span>
              {isDeleting
                ? 'Deleting Records...'
                : totalAssociatedItems > 0
                ? `Confirm & Delete Document (${totalAssociatedItems} Linked Item${totalAssociatedItems > 1 ? 's' : ''})`
                : 'Confirm & Delete Document'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
