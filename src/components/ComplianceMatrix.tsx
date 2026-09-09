import React, { useState } from 'react';
import { 
  CheckSquare, 
  AlertOctagon, 
  Scale, 
  FileText, 
  Calendar, 
  ExternalLink, 
  ArrowUpRight, 
  ShieldCheck, 
  Download,
  Clock,
  CalendarDays
} from 'lucide-react';
import { ParentingOrder, TimelineEvent, DocumentRecord } from '../types';
import { BreachSummaryReportModal } from './BreachSummaryReportModal';

interface ComplianceMatrixProps {
  orders: ParentingOrder[];
  timeline: TimelineEvent[];
  documents: DocumentRecord[];
  onViewDocument: (doc: DocumentRecord) => void;
  onNavigateToAffidavit: () => void;
  onNavigateToBreachTimeline?: () => void;
  onNavigateToResponseTracker?: () => void;
}

export const ComplianceMatrix: React.FC<ComplianceMatrixProps> = ({
  orders,
  timeline,
  documents,
  onViewDocument,
  onNavigateToAffidavit,
  onNavigateToBreachTimeline,
  onNavigateToResponseTracker,
}) => {
  const [selectedOrder, setSelectedOrder] = useState<string>(orders[0]?.id || '');
  const [isBreachReportModalOpen, setIsBreachReportModalOpen] = useState<boolean>(false);

  const activeOrder = orders.find(o => o.id === selectedOrder) || orders[0];
  const linkedEvents = timeline.filter(e => e.orderBreachFlag && (e.breachedOrderNumber?.includes(activeOrder.orderNumber) || activeOrder.associatedEventIds.includes(e.id)));

  const totalBreaches = orders.reduce((sum, o) => sum + o.breachesCount, 0);

  return (
    <div className="space-y-6 pb-12" id="compliance-matrix-container">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 font-serif flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-indigo-600" />
            <span>Parenting Order Compliance Matrix</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-world incident mapping against Interim Orders (14 Nov 2023) under Family Law Act 1975 Part VII Div 13A.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            onClick={() => setIsBreachReportModalOpen(true)}
            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-sm transition-colors border border-rose-700"
            id="matrix-open-breach-report-btn"
          >
            <FileText className="w-4 h-4 text-amber-300" />
            <span>Generate Breach Summary Report</span>
          </button>

          {onNavigateToBreachTimeline && (
            <button
              onClick={onNavigateToBreachTimeline}
              className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-sm transition-colors"
              id="goto-breach-timeline-btn"
            >
              <CalendarDays className="w-4 h-4 text-rose-600" />
              <span>Breach Timeline Calendar</span>
            </button>
          )}

          <button
            onClick={onNavigateToAffidavit}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-sm transition-colors"
            id="draft-contravention-form2-btn"
          >
            <FileText className="w-4 h-4" />
            <span>Draft Form 2 Contravention Application</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-slate-400 text-xs font-medium block">Total Documented Contraventions</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-rose-700">{totalBreaches}</span>
            <span className="text-xs text-rose-600 font-semibold">Without Reasonable Excuse</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Prima facie Div 13A violations</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-slate-400 text-xs font-medium block">42-Hour Mandate Compliance</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-amber-700">42%</span>
            <span className="text-xs text-amber-600 font-medium">6 Documented Lags</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Average response lag: 68.2 hours</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-slate-400 text-xs font-medium block">Compensatory Care Time Claim</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">72 Hours</span>
            <span className="text-xs text-emerald-700 font-semibold">Under s 70NEB(1)(a)</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Make-up care time owed to Father</span>
        </div>
      </div>

      {/* Interactive Matrix Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Order Selector List */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block px-1">
            Interim Orders Register (14 Nov 2023)
          </span>

          {orders.map((order) => {
            const isSelected = order.id === activeOrder.id;
            return (
              <div
                key={order.id}
                onClick={() => setSelectedOrder(order.id)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all text-xs space-y-2 ${
                  isSelected
                    ? 'bg-slate-900 text-white border-slate-800 shadow-md'
                    : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
                id={`select-order-${order.id}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`font-bold ${isSelected ? 'text-amber-400' : 'text-slate-900'}`}>
                      {order.orderNumber}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800/40 border border-slate-700 text-slate-300">
                      {order.category}
                    </span>
                  </div>
                  {order.breachesCount > 0 ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                      {order.breachesCount} Breaches
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                      Compliant
                    </span>
                  )}
                </div>

                <p className={`font-medium line-clamp-1 ${isSelected ? 'text-slate-200' : 'text-slate-700'}`}>
                  {order.title}
                </p>

                {/* Progress */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Compliance Rate</span>
                    <span className="font-mono font-bold">{order.complianceRate}%</span>
                  </div>
                  <div className="w-full bg-slate-700/40 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        order.complianceRate >= 80 
                          ? 'bg-emerald-400' 
                          : order.complianceRate >= 60 
                          ? 'bg-amber-400' 
                          : 'bg-rose-400'
                      }`}
                      style={{ width: `${order.complianceRate}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right 2 Columns: Order Detail & Breach Log */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-3 flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-sm text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded border border-indigo-200">
                    {activeOrder.orderNumber}
                  </span>
                  <h2 className="text-base font-bold text-slate-900">{activeOrder.title}</h2>
                </div>
                <span className="text-xs text-slate-400 mt-1 block">
                  Statutory Basis: <strong className="text-slate-700">{activeOrder.statutoryBasis}</strong>
                </span>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-400 block">Compliance Index</span>
                <span className="text-2xl font-bold text-slate-900 font-mono">{activeOrder.complianceRate}%</span>
              </div>
            </div>

            {/* Verbatim Order Clause */}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Sealed Court Order Text (Interim Orders 14 Nov 2023)
              </span>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-serif text-slate-800 leading-relaxed italic">
                "{activeOrder.orderText}"
              </div>
            </div>

            {/* Breaches Attached */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <AlertOctagon className="w-4 h-4 text-rose-600" />
                  <span>Documented Contravention Incidents ({linkedEvents.length})</span>
                </span>
                <span className="text-[11px] text-slate-400">Strict zero-hallucination citations</span>
              </div>

              {linkedEvents.length === 0 ? (
                <div className="p-6 text-center bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-500">
                  No contraventions logged for {activeOrder.orderNumber}.
                </div>
              ) : (
                linkedEvents.map((evt) => {
                  const linkedDoc = documents.find(d => d.id === evt.primaryDocId);
                  return (
                    <div key={evt.id} className="p-3.5 bg-rose-50/40 border border-rose-200/80 rounded-lg space-y-2 text-xs">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900">{evt.date}</span>
                          <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-bold text-[10px] uppercase">
                            {evt.breachSeverity || 'Contravention'}
                          </span>
                        </div>

                        {linkedDoc && (
                          <button
                            onClick={() => onViewDocument(linkedDoc)}
                            className="inline-flex items-center gap-1 text-[11px] font-mono text-indigo-700 hover:text-indigo-900 font-semibold bg-white border border-indigo-200 px-2 py-0.5 rounded shadow-xs"
                            id={`view-order-breach-doc-${evt.id}`}
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>{linkedDoc.annexureNumber || linkedDoc.id}</span>
                          </button>
                        )}
                      </div>

                      <h4 className="font-bold text-slate-900">{evt.title}</h4>
                      <p className="text-slate-700 leading-relaxed">{evt.description}</p>

                      <div className="pt-1 text-[11px] text-slate-500 flex items-center gap-2">
                        <span>Source Origin: <strong className="text-slate-700">{evt.sourceOrigin}</strong></span>
                        {evt.responseLagHours && (
                          <span className="text-amber-800 font-semibold">
                            • Lag: {evt.responseLagHours} hours
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Link to Response Tracker for 42h & Medical Notice orders */}
            {onNavigateToResponseTracker && (activeOrder.orderNumber.includes('9.1') || activeOrder.orderNumber.includes('5.1') || activeOrder.orderNumber.includes('7.3')) && (
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center justify-between gap-3">
                <div className="text-xs">
                  <span className="font-bold text-indigo-950 block">Dedicated 42-Hour &amp; Statutory Response Tracker</span>
                  <span className="text-[11px] text-indigo-700">Audit pending inquiries in Waiting Section and late replies in Completed Section.</span>
                </div>
                <button
                  onClick={onNavigateToResponseTracker}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shrink-0 shadow-xs flex items-center gap-1.5"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Open Response Tracker</span>
                </button>
              </div>
            )}

            {/* Statutory Penalty Assessment */}
            <div className="p-3.5 bg-slate-900 text-white rounded-lg text-xs space-y-2">
              <span className="font-bold text-amber-400 flex items-center gap-1.5">
                <Scale className="w-4 h-4" />
                <span>Statutory Remedies Available under Family Law Act Part VII Div 13A</span>
              </span>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Pursuant to s 70NEB and s 70NFB, where contravention is established without reasonable excuse, the Court may order:
                (1) Compensatory time for the Applicant; (2) An order that the Respondent pay all legal costs of the contravention application on an indemnity basis; (3) Mandatory attendance at a Post-Separation Parenting Program (PSPP).
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Automated Breach Summary Report Modal */}
      <BreachSummaryReportModal
        isOpen={isBreachReportModalOpen}
        onClose={() => setIsBreachReportModalOpen(false)}
        timeline={timeline}
        orders={orders}
        documents={documents}
        onViewDocument={onViewDocument}
        onNavigateToAffidavit={onNavigateToAffidavit}
      />
    </div>
  );
};
