import React, { useState } from 'react';
import { 
  AlertOctagon, 
  Clock, 
  CheckCircle2, 
  FileCheck, 
  ArrowRight, 
  Scale, 
  Mail, 
  Users, 
  FileText, 
  AlertTriangle,
  Send,
  ExternalLink,
  CalendarDays,
  ShieldAlert,
  SlidersHorizontal,
  Calendar,
  Bell
} from 'lucide-react';
import { DocumentRecord, TimelineEvent, ParentingOrder, DiscrepancyItem, CourtCriterion } from '../types';
import { ActiveTab } from './Navbar';
import { SingleExpertBriefingModal } from './SingleExpertBriefingModal';

interface DashboardOverviewProps {
  documents: DocumentRecord[];
  timeline: TimelineEvent[];
  orders: ParentingOrder[];
  discrepancies: DiscrepancyItem[];
  courtCriteria?: CourtCriterion[];
  setActiveTab: (tab: ActiveTab) => void;
  onViewDocument: (doc: DocumentRecord) => void;
  onQuickQuerySubmit: (query: string) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  documents,
  timeline,
  orders,
  discrepancies,
  courtCriteria = [],
  setActiveTab,
  onViewDocument,
  onQuickQuerySubmit,
}) => {
  const [quickQuery, setQuickQuery] = useState('');
  const [isExpertModalOpen, setIsExpertModalOpen] = useState(false);

  const breaches = timeline.filter(e => e.orderBreachFlag);
  const severeBreaches = breaches.filter(e => e.breachSeverity === 'Severe');
  const mandate42hBreaches = timeline.filter(e => e.responseLagHours && e.responseLagHours > 42);
  const maxResponseLagHours = mandate42hBreaches.reduce((max, e) => Math.max(max, e.responseLagHours || 0), 0);
  const verifiedDocumentPct = documents.length
    ? Math.round((documents.filter(d => d.evidentiaryWeight !== 'Unverified Claim').length / documents.length) * 100)
    : 0;

  // Overall compliance rate
  const avgCompliance = Math.round(
    orders.reduce((acc, o) => acc + (o.complianceRate || 0), 0) / (orders.length || 1)
  );

  const handleQuickSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickQuery.trim()) return;
    onQuickQuerySubmit(quickQuery);
    setActiveTab('chat');
  };

  return (
    <div className="space-y-6 pb-12" id="dashboard-overview-container">
      {/* Top Welcome / Case Status Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-6 text-white border border-slate-700/80 shadow-lg relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-2">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold">
            <Scale className="w-3.5 h-3.5" />
            <span>Active Case 4344/2023 • Family Court of WA (Perth)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-serif">
            Hawkins v Hawkins Intelligence Command Center
          </h1>
          <p className="text-slate-300 text-sm leading-relaxed">
            Secure, local repository for Benjamin James Hawkins. Rigorously cross-referencing timeline events, sworn affidavits, and third-party objective records against Interim Orders under Family Law Act 1975 &amp; Family Court Act 1997 (WA).
          </p>
        </div>

        {/* Quick Search inside banner */}
        <form onSubmit={handleQuickSearch} className="mt-5 relative z-10 max-w-2xl flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={quickQuery}
              onChange={(e) => setQuickQuery(e.target.value)}
              placeholder="Ask AI with zero-hallucination citations (e.g. 'Evidence proving school attendance', 'List 42-hour rule breaches')..."
              className="w-full pl-4 pr-10 py-2.5 bg-slate-900/90 border border-slate-600 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
              id="dashboard-quick-query-input"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 shadow-md shrink-0"
            id="dashboard-quick-query-btn"
          >
            <span>Query Vault</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Admissible Records</span>
            <FileCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{documents.length}</span>
            <span className="text-[11px] text-emerald-600 font-medium">{verifiedDocumentPct}% Verified</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Indexed as Annexures BJH</p>
        </div>

        <button 
          onClick={() => setActiveTab('breaches')}
          className="bg-white p-4 rounded-xl border border-rose-200/80 shadow-sm bg-rose-50/20 text-left hover:border-rose-400 hover:shadow-md transition-all cursor-pointer group"
          id="kpi-order-contraventions-btn"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span className="group-hover:text-rose-700 transition-colors">Order Contraventions</span>
            <AlertOctagon className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-rose-700">{breaches.length}</span>
            <span className="text-[11px] text-rose-600 font-semibold">{severeBreaches.length} Severe</span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <p className="text-[11px] text-slate-400">Part VII Div 13A breaches</p>
            <span className="text-[10px] text-rose-600 font-bold group-hover:underline flex items-center gap-0.5">
              <span>Calendar</span>
              <ArrowRight className="w-2.5 h-2.5" />
            </span>
          </div>
        </button>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Overall Compliance</span>
            <CheckCircle2 className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{avgCompliance}%</span>
            <span className="text-[11px] text-amber-600 font-medium">Respondent Rate</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Across {orders.length} active order{orders.length === 1 ? '' : 's'}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>42h Mandate Breaches</span>
            <Clock className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-indigo-900">{mandate42hBreaches.length}</span>
            <span className="text-[11px] text-indigo-600 font-medium">Max {maxResponseLagHours}h lag</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Order 9.1 communications</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Sworn Discrepancies</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-700">{discrepancies.length}</span>
            <span className="text-[11px] text-amber-600 font-medium">Impeachable</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Cross-examined facts</p>
        </div>
      </div>

      {/* Main 2-Column Command Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Order Compliance Matrix & Recent Timeline Events */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Compliance Matrix Widget */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden" id="widget-compliance-matrix">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Order Compliance Matrix</h2>
                <p className="text-xs text-slate-500">Real-world incidents mapped directly against Interim Orders (14 Nov 2023)</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveTab('breaches')}
                  className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 bg-rose-50 hover:bg-rose-100 px-2 py-1 rounded transition-colors"
                  id="view-breach-timeline-btn"
                >
                  <CalendarDays className="w-3.5 h-3.5" />
                  <span>Breach Calendar</span>
                </button>
                <button
                  onClick={() => setActiveTab('compliance')}
                  className="text-xs text-amber-600 hover:text-amber-700 font-semibold flex items-center gap-1"
                  id="view-full-compliance-btn"
                >
                  <span>Full Matrix</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="p-4 space-y-3">
              {orders.map((order) => (
                <div key={order.id} className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{order.orderNumber}:</span>
                      <span className="font-medium text-slate-700">{order.title}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {order.breachesCount > 0 ? (
                        <span className="px-2 py-0.5 bg-rose-100 text-rose-700 font-bold rounded text-[11px]">
                          {order.breachesCount} Breaches
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 font-bold rounded text-[11px]">
                          Compliant
                        </span>
                      )}
                      <span className="font-mono font-bold text-slate-800">{order.complianceRate}%</span>
                    </div>
                  </div>
                  {/* Progress Bar */}
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        order.complianceRate >= 80 
                          ? 'bg-emerald-500' 
                          : order.complianceRate >= 60 
                          ? 'bg-amber-500' 
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${order.complianceRate}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chronological Incident Stream */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden" id="widget-recent-timeline">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Recent Evidentiary Timeline Events</h2>
                <p className="text-xs text-slate-500">Every event backed by primary source citation</p>
              </div>
              <button
                onClick={() => setActiveTab('timeline')}
                className="text-xs text-amber-600 hover:text-amber-700 font-semibold flex items-center gap-1"
                id="view-full-timeline-btn"
              >
                <span>Full Timeline Ledger</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {timeline.slice(0, 5).map((event) => {
                const linkedDoc = documents.find(d => d.id === event.primaryDocId);
                return (
                  <div key={event.id} className="p-4 hover:bg-slate-50/80 transition-colors flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-bold text-slate-600">{event.date}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {event.category}
                        </span>
                        {event.orderBreachFlag && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 border border-rose-300 flex items-center gap-0.5">
                            <AlertOctagon className="w-2.5 h-2.5" />
                            {event.breachedOrderNumber || 'Order Breach'}
                          </span>
                        )}
                        {event.responseLagHours && event.responseLagHours > 42 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                            {event.responseLagHours}h Lag (Breach)
                          </span>
                        )}
                      </div>
                      <h3 className="text-xs font-bold text-slate-900">{event.title}</h3>
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{event.description}</p>
                      
                      {/* Clickable Zero-Hallucination Citation */}
                      {linkedDoc && (
                        <button
                          onClick={() => onViewDocument(linkedDoc)}
                          className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded transition-colors mt-1"
                          id={`cite-btn-${event.id}`}
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>{event.citation}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: High-Impact Discrepancy Spotlight & Quick Action Tiles */}
        <div className="space-y-6">
          {/* Discrepancy Spotlight Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden" id="widget-discrepancy-spotlight">
            <div className="p-4 border-b border-slate-100 bg-rose-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <h2 className="text-sm font-bold text-slate-900">Discrepancy Spotlight</h2>
              </div>
              <button
                onClick={() => setActiveTab('discrepancies')}
                className="text-xs text-rose-700 hover:text-rose-900 font-semibold"
                id="view-all-discrepancies-btn"
              >
                All ({discrepancies.length})
              </button>
            </div>

            <div className="p-4 space-y-3">
              {discrepancies[0] && (
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="font-bold text-slate-500 uppercase text-[10px] tracking-wider block">Respondent Sworn Claim</span>
                    <p className="p-2.5 bg-slate-100 border border-slate-200 rounded-lg text-slate-800 italic mt-1 font-serif">
                      "{discrepancies[0].claimText}"
                    </p>
                    <span className="text-[10px] text-slate-400 block mt-0.5">{discrepancies[0].claimSource}</span>
                  </div>

                  <div>
                    <span className="font-bold text-emerald-700 uppercase text-[10px] tracking-wider block">Proven Primary Fact</span>
                    <p className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 font-medium mt-1">
                      {discrepancies[0].conflictingFact}
                    </p>
                  </div>

                  <div className="pt-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Primary Evidence Document</span>
                    <button
                      onClick={() => {
                        const d = documents.find(doc => doc.id === discrepancies[0].evidenceDocId);
                        if (d) onViewDocument(d);
                      }}
                      className="inline-flex items-center gap-1.5 text-xs text-indigo-700 hover:underline font-mono font-semibold mt-1"
                      id="spotlight-citation-btn"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>{discrepancies[0].evidenceCitation}</span>
                    </button>
                  </div>

                  <div className="p-2 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-900">
                    <strong>Legal Impact:</strong> {discrepancies[0].legalImpact}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Tactical Launchpad */}
          <div className="bg-slate-900 text-white rounded-xl p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
              <Scale className="w-4 h-4 text-amber-400" />
              <span>Tactical Legal Workflows</span>
            </h2>

            <div className="space-y-2">
              <button
                onClick={() => setActiveTab('biff')}
                className="w-full text-left p-3 rounded-lg bg-slate-800/90 hover:bg-slate-800 border border-slate-700 hover:border-amber-500/50 transition-all flex items-center justify-between text-xs group"
                id="launch-biff-btn"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-md bg-amber-500/20 text-amber-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-200 group-hover:text-amber-300 block">Draft BIFF Email Response</span>
                    <span className="text-[11px] text-slate-400">Neutralize traps &amp; check 42h mandate</span>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400" />
              </button>

              <button
                onClick={() => setActiveTab('mediation')}
                className="w-full text-left p-3 rounded-lg bg-slate-800/90 hover:bg-slate-800 border border-slate-700 hover:border-amber-500/50 transition-all flex items-center justify-between text-xs group"
                id="launch-mediation-btn"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-md bg-indigo-500/20 text-indigo-400">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-200 group-hover:text-indigo-300 block">Mediation Red-Team Simulator</span>
                    <span className="text-[11px] text-slate-400">Stress-test care schedule proposals</span>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400" />
              </button>

              <button
                onClick={() => setActiveTab('affidavit')}
                className="w-full text-left p-3 rounded-lg bg-slate-800/90 hover:bg-slate-800 border border-slate-700 hover:border-amber-500/50 transition-all flex items-center justify-between text-xs group"
                id="launch-affidavit-btn"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-md bg-emerald-500/20 text-emerald-400">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-200 group-hover:text-emerald-300 block">Form 2 Contravention &amp; Affidavit</span>
                    <span className="text-[11px] text-slate-400">Compile sworn numbered paragraphs</span>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400" />
              </button>

              <div className="pt-2 border-t border-slate-800 grid grid-cols-2 gap-2">
                <button
                  onClick={() => setIsExpertModalOpen(true)}
                  className="p-2.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-left transition-colors group col-span-2"
                  id="launch-expert-brief-btn"
                >
                  <div className="flex items-center gap-1.5 text-amber-400 font-semibold text-xs">
                    <Users className="w-3.5 h-3.5" />
                    <span>Single Expert Briefing Pack</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block leading-tight">
                    Generate Form 2 Family Consultant brief with third-party records &amp; children profiles
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('profiles')}
                  className="p-2.5 rounded-lg bg-slate-800/70 hover:bg-slate-800 border border-slate-700 text-left transition-colors group"
                  id="launch-profiles-btn"
                >
                  <div className="flex items-center gap-1.5 text-amber-400 font-semibold text-[11px]">
                    <Users className="w-3 h-3" />
                    <span>Party Profiles</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block leading-tight">Behavior &amp; Tone</span>
                </button>

                <button
                  onClick={() => setActiveTab('issues')}
                  className="p-2.5 rounded-lg bg-slate-800/70 hover:bg-slate-800 border border-slate-700 text-left transition-colors group"
                  id="launch-issues-btn"
                >
                  <div className="flex items-center gap-1.5 text-rose-400 font-semibold text-[11px]">
                    <ShieldAlert className="w-3 h-3" />
                    <span>Issues/Concerns</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block leading-tight">Medical &amp; care risks</span>
                </button>

                <button
                  onClick={() => setActiveTab('criteria')}
                  className="p-2.5 rounded-lg bg-slate-800/70 hover:bg-slate-800 border border-slate-700 text-left transition-colors group"
                  id="launch-criteria-btn"
                >
                  <div className="flex items-center gap-1.5 text-indigo-400 font-semibold text-[11px]">
                    <Scale className="w-3 h-3" />
                    <span>Court Criteria</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block leading-tight">s60CC Best Interests</span>
                </button>

                <button
                  onClick={() => setActiveTab('proposed-orders')}
                  className="p-2.5 rounded-lg bg-slate-800/70 hover:bg-slate-800 border border-slate-700 text-left transition-colors group"
                  id="launch-orders-btn"
                >
                  <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-[11px]">
                    <SlidersHorizontal className="w-3 h-3" />
                    <span>Proposed Orders</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block leading-tight">AI Viability Assessment</span>
                </button>
              </div>
            </div>
          </div>

          {/* Children Context Box */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3 text-xs">
            <h3 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider">Children Profile &amp; Best Interests (s 60CC)</h3>
            
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">Isabella Hawkins</span>
                <span className="text-[11px] text-slate-500 font-mono">b. 21 July 2014 (Age 10)</span>
              </div>
              <p className="text-slate-600 text-[11px]">
                Year 5 at Bassendean PS.
              </p>
            </div>

            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">Mason Hawkins</span>
                <span className="text-[11px] text-slate-500 font-mono">b. 15 February 2015 (Age 9)</span>
              </div>
              <p className="text-slate-600 text-[11px]">
                Year 4 at Bassendean PS.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Single Expert Witness Briefing Modal */}
      <SingleExpertBriefingModal
        isOpen={isExpertModalOpen}
        onClose={() => setIsExpertModalOpen(false)}
        documents={documents}
        timeline={timeline}
        orders={orders}
        courtCriteria={courtCriteria}
        onViewDocument={onViewDocument}
      />
    </div>
  );
};
