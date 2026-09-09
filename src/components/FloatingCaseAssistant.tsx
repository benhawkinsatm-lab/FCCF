import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Sparkles,
  Send,
  X,
  Minus,
  Maximize2,
  Minimize2,
  MessageSquare,
  Radar,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  Users,
  FileSearch,
  Lightbulb,
  ChevronRight,
  Copy,
  Check,
} from 'lucide-react';
import {
  CommunicationMessage,
  CourtCriterion,
  CoverageFinding,
  DiscrepancyItem,
  DocumentRecord,
  IssueConcern,
  KnowledgeGap,
  ParentingOrder,
  PartyProfile,
  ResponseRequirement,
  TimelineEvent,
} from '../types';
import { buildCoverageReport, summariseCoverageForPrompt } from '../utils/caseCoverageAnalysis';
import { assessMessage } from '../utils/communicationProductivity';

interface AssistantMessage {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: string;
  citations?: { docId: string; title: string }[];
  isCoverageGrounded?: boolean;
}

interface FloatingCaseAssistantProps {
  documents: DocumentRecord[];
  timeline: TimelineEvent[];
  communicationMessages: CommunicationMessage[];
  responseRequirements: ResponseRequirement[];
  partyProfiles: PartyProfile[];
  courtCriteria: CourtCriterion[];
  orders: ParentingOrder[];
  issuesConcerns: IssueConcern[];
  knowledgeGaps: KnowledgeGap[];
  discrepancies: DiscrepancyItem[];
  onViewDocument: (doc: DocumentRecord) => void;
}

const SUGGESTED_PROMPTS = [
  {
    icon: FileSearch,
    label: 'Why has no timeline event been generated from my documents?',
    query:
      'Go through every document in the vault that has not produced a timeline event. For each one, tell me specifically why the ingestion pipeline did not generate an event from it, and what I need to do to fix it.',
  },
  {
    icon: Users,
    label: "What is missing from Isabella's and Mason's records?",
    query:
      "Review Isabella's and Mason's individual profiles and their own timeline categories. Tell me exactly which categories are empty for each child, what evidence would fill them, and which s 60CC factors are currently unsupported for each child.",
  },
  {
    icon: MessageSquare,
    label: 'Show me the non-productive communication pattern',
    query:
      'Analyse the communication record for non-productive messages. Distinguish replies that were late from replies that arrived on time but answered nothing, and explain how each supports an Order 9.1 argument.',
  },
  {
    icon: Lightbulb,
    label: 'What knowledge is the case still missing?',
    query:
      'Based on everything recorded, identify the most significant gaps in my evidence. Prioritise them by how much they weaken a s 60CC submission, and tell me what specific document or record would close each one.',
  },
];

const SEVERITY_STYLES: Record<CoverageFinding['severity'], string> = {
  Critical: 'bg-rose-50 border-rose-300 text-rose-900',
  High: 'bg-amber-50 border-amber-300 text-amber-900',
  Moderate: 'bg-slate-50 border-slate-300 text-slate-800',
  Informational: 'bg-blue-50 border-blue-200 text-blue-900',
};

const SEVERITY_DOT: Record<CoverageFinding['severity'], string> = {
  Critical: 'bg-rose-500',
  High: 'bg-amber-500',
  Moderate: 'bg-slate-400',
  Informational: 'bg-blue-400',
};

export const FloatingCaseAssistant: React.FC<FloatingCaseAssistantProps> = ({
  documents,
  timeline,
  communicationMessages,
  responseRequirements,
  partyProfiles,
  courtCriteria,
  orders,
  issuesConcerns,
  knowledgeGaps,
  discrepancies,
  onViewDocument,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activePanel, setActivePanel] = useState<'ask' | 'coverage'>('ask');
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedFindingId, setExpandedFindingId] = useState<string | null>(null);

  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const scrollAnchorRef = useRef<HTMLDivElement>(null);

  // Deterministic coverage analysis — recomputed whenever the store changes.
  const coverage = useMemo(
    () =>
      buildCoverageReport({
        documents,
        timeline,
        communicationMessages,
        responseRequirements,
        partyProfiles,
        courtCriteria,
        orders,
        issuesConcerns,
        knowledgeGaps,
      }),
    [
      documents,
      timeline,
      communicationMessages,
      responseRequirements,
      partyProfiles,
      courtCriteria,
      orders,
      issuesConcerns,
      knowledgeGaps,
    ]
  );

  const criticalCount = coverage.findings.filter(
    f => f.severity === 'Critical' || f.severity === 'High'
  ).length;

  useEffect(() => {
    if (isOpen && activePanel === 'ask') {
      scrollAnchorRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, isOpen, activePanel]);

  const nowLabel = () =>
    new Date().toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' });

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const submitQuery = async (rawQuery: string) => {
    const query = rawQuery.trim();
    if (!query || isLoading) return;

    const userMsg: AssistantMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: nowLabel(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/gemini/case-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          history: messages.slice(-8).map(m => ({ sender: m.sender, text: m.text })),
          coverageSummary: summariseCoverageForPrompt(coverage),
          caseState: buildCaseStatePayload({
            documents,
            timeline,
            communicationMessages,
            responseRequirements,
            partyProfiles,
            courtCriteria,
            orders,
            issuesConcerns,
            knowledgeGaps,
            discrepancies,
          }),
        }),
      });

      const data = await res.json();

      setMessages(prev => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          sender: 'agent',
          text: data.reply || 'No response was returned.',
          timestamp: nowLabel(),
          citations: Array.isArray(data.citations) ? data.citations : [],
          isCoverageGrounded: Boolean(data.coverageGrounded),
        },
      ]);
    } catch (err) {
      console.warn('Case assistant request failed, answering from local coverage analysis:', err);
      setMessages(prev => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          sender: 'agent',
          text: buildLocalFallbackAnswer(query, coverage),
          timestamp: nowLabel(),
          isCoverageGrounded: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Collapsed launcher ────────────────────────────────────────────
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        id="floating-assistant-launcher"
        title="Open Case Assistant"
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 pl-3.5 pr-4 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-full shadow-2xl border border-slate-700 transition-all hover:scale-105 group"
      >
        <span className="relative flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-amber-400" />
          {criticalCount > 0 && (
            <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold bg-rose-500 text-white rounded-full border-2 border-slate-900">
              {criticalCount > 99 ? '99+' : criticalCount}
            </span>
          )}
        </span>
        <span className="text-xs font-semibold hidden sm:inline">Case Assistant</span>
      </button>
    );
  }

  const panelSize = isExpanded
    ? 'w-[min(760px,calc(100vw-3rem))] h-[min(820px,calc(100vh-6rem))]'
    : 'w-[min(430px,calc(100vw-3rem))] h-[min(620px,calc(100vh-6rem))]';

  return (
    <div
      id="floating-assistant-panel"
      className={`fixed bottom-6 right-6 z-40 ${panelSize} bg-white rounded-2xl shadow-2xl border border-slate-300 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200`}
    >
      {/* Header */}
      <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="p-1.5 bg-amber-500/15 border border-amber-500/30 rounded-lg shrink-0">
            <Sparkles className="w-4 h-4 text-amber-400" />
          </span>
          <div className="min-w-0">
            <div className="text-xs font-bold tracking-tight truncate">Case Assistant</div>
            <div className="text-[10px] text-slate-400 truncate">
              Gemini · grounded in all recorded case data
            </div>
          </div>
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={() => setIsExpanded(v => !v)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            title={isExpanded ? 'Restore size' : 'Expand'}
            id="assistant-expand-btn"
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            title="Minimise"
            id="assistant-minimise-btn"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              setIsOpen(false);
              setMessages([]);
            }}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            title="Close and clear conversation"
            id="assistant-close-btn"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Panel tabs */}
      <div className="flex border-b border-slate-200 bg-slate-50 shrink-0">
        <button
          onClick={() => setActivePanel('ask')}
          className={`flex-1 px-3 py-2 text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
            activePanel === 'ask'
              ? 'text-slate-900 border-b-2 border-slate-900 bg-white'
              : 'text-slate-500 hover:text-slate-700'
          }`}
          id="assistant-tab-ask"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Ask</span>
        </button>
        <button
          onClick={() => setActivePanel('coverage')}
          className={`flex-1 px-3 py-2 text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
            activePanel === 'coverage'
              ? 'text-slate-900 border-b-2 border-slate-900 bg-white'
              : 'text-slate-500 hover:text-slate-700'
          }`}
          id="assistant-tab-coverage"
        >
          <Radar className="w-3.5 h-3.5" />
          <span>Coverage</span>
          {criticalCount > 0 && (
            <span className="px-1.5 py-0.5 text-[9px] font-bold bg-rose-500 text-white rounded-full">
              {criticalCount}
            </span>
          )}
        </button>
      </div>

      {/* ── ASK PANEL ─────────────────────────────────────────────── */}
      {activePanel === 'ask' && (
        <>
          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50">
            {messages.length === 0 && (
              <div className="space-y-3">
                <div className="p-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-600 leading-relaxed">
                  I can answer questions across everything recorded in this case —{' '}
                  <strong className="text-slate-900">{documents.length}</strong> documents,{' '}
                  <strong className="text-slate-900">{timeline.length}</strong> timeline events,{' '}
                  <strong className="text-slate-900">{communicationMessages.length}</strong>{' '}
                  communications, and{' '}
                  <strong className="text-slate-900">{partyProfiles.length}</strong> party profiles.
                  <br />
                  <br />
                  I can also explain why something{' '}
                  <em className="text-slate-900 not-italic font-semibold">wasn't</em> generated — a
                  missing timeline event, an empty child category, an unevidenced statutory factor —
                  and what would close the gap.
                </div>

                <div className="space-y-1.5">
                  {SUGGESTED_PROMPTS.map((p, i) => {
                    const Icon = p.icon;
                    return (
                      <button
                        key={i}
                        onClick={() => submitQuery(p.query)}
                        className="w-full text-left p-2.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-700 flex items-start gap-2 transition group"
                      >
                        <Icon className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                        <span className="flex-1">{p.label}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 shrink-0 mt-0.5" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[90%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-slate-900 text-white'
                      : 'bg-white border border-slate-200 text-slate-800'
                  }`}
                >
                  <div className="whitespace-pre-wrap break-words">{msg.text}</div>

                  {msg.sender === 'agent' && (
                    <>
                      {msg.citations && msg.citations.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap gap-1">
                          {msg.citations.map((c, i) => {
                            const doc = documents.find(d => d.id === c.docId);
                            return (
                              <button
                                key={i}
                                onClick={() => doc && onViewDocument(doc)}
                                disabled={!doc}
                                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono border ${
                                  doc
                                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                                    : 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
                                }`}
                                title={doc ? `Open ${c.title}` : 'Document not in vault'}
                              >
                                <ExternalLink className="w-2.5 h-2.5" />
                                <span>{c.docId}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      <div className="mt-1.5 flex items-center justify-between gap-2">
                        <span className="text-[10px] text-slate-400">
                          {msg.timestamp}
                          {msg.isCoverageGrounded && ' · coverage-grounded'}
                        </span>
                        <button
                          onClick={() => handleCopy(msg.id, msg.text)}
                          className="text-slate-400 hover:text-slate-700 p-0.5 rounded"
                          title="Copy response"
                        >
                          {copiedId === msg.id ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-500 flex items-center gap-2">
                  <RefreshCw className="w-3 h-3 animate-spin text-indigo-600" />
                  <span>Reading the case record…</span>
                </div>
              </div>
            )}

            <div ref={scrollAnchorRef} />
          </div>

          {/* Composer */}
          <div className="p-2.5 border-t border-slate-200 bg-white shrink-0">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    submitQuery(input);
                  }
                }}
                rows={1}
                placeholder="Ask about anything recorded, or why something wasn't…"
                id="assistant-input"
                className="flex-1 resize-none px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 max-h-24"
              />
              <button
                onClick={() => submitQuery(input)}
                disabled={!input.trim() || isLoading}
                id="assistant-send-btn"
                className={`p-2 rounded-lg transition shrink-0 ${
                  input.trim() && !isLoading
                    ? 'bg-slate-900 text-white hover:bg-slate-800'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
                title="Send"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5 px-0.5">
              Answers are grounded in the case vault. Not legal advice.
            </p>
          </div>
        </>
      )}

      {/* ── COVERAGE PANEL ────────────────────────────────────────── */}
      {activePanel === 'coverage' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50">
          {/* Totals */}
          <div className="grid grid-cols-2 gap-2">
            <CoverageStat
              label="Docs → no event"
              value={coverage.totals.documentsWithoutTimelineEvents}
              total={coverage.totals.documents}
              danger={coverage.totals.documentsWithoutTimelineEvents > 0}
            />
            <CoverageStat
              label="Events w/ child attribution"
              value={coverage.totals.timelineEventsWithChildAttribution}
              total={coverage.totals.timelineEvents}
            />
            <CoverageStat
              label="Non-productive comms"
              value={coverage.totals.nonProductiveCommunications}
              total={coverage.totals.communications}
              danger={coverage.totals.nonProductiveCommunications > 0}
            />
            <CoverageStat
              label="Criteria w/o evidence"
              value={coverage.totals.criteriaWithoutEvidence}
              total={courtCriteria.length}
              danger={coverage.totals.criteriaWithoutEvidence > 0}
            />
          </div>

          {/* Per-child coverage */}
          <div className="bg-white border border-slate-200 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Users className="w-3.5 h-3.5 text-indigo-600" />
              <span className="text-xs font-bold text-slate-900">Per-Child Timeline Coverage</span>
            </div>
            <div className="space-y-2">
              {coverage.perChild.map(c => (
                <div key={c.child} className="p-2 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900">{c.child}</span>
                    <span className="flex items-center gap-1.5">
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold ${
                          c.profilePresent
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {c.profilePresent ? 'Profile ✓' : 'No profile'}
                      </span>
                      <span className="font-mono text-[10px] text-slate-500">
                        {c.eventCount} event{c.eventCount === 1 ? '' : 's'}
                      </span>
                    </span>
                  </div>

                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {Object.entries(c.categoryCounts).map(([cat, count]) => (
                      <span
                        key={cat}
                        className={`text-[9px] px-1.5 py-0.5 rounded border ${
                          count
                            ? 'bg-white text-slate-700 border-slate-300'
                            : 'bg-slate-100 text-slate-400 border-slate-200 line-through'
                        }`}
                        title={count ? `${count} entries` : 'No entries recorded'}
                      >
                        {cat} {count ? `· ${count}` : ''}
                      </span>
                    ))}
                  </div>

                  <div className="mt-1 text-[10px] text-slate-500">
                    Last AI review: {c.lastReviewed || 'never'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Missing knowledge insights */}
          {coverage.missingKnowledgeInsights.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-xs font-bold text-slate-900">Missing Knowledge Insights</span>
              </div>
              <ul className="space-y-1.5">
                {coverage.missingKnowledgeInsights.map((insight, i) => (
                  <li key={i} className="text-[11px] text-slate-700 flex items-start gap-1.5 leading-relaxed">
                    <span className="text-amber-500 font-bold shrink-0">•</span>
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Findings */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-0.5">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                Findings ({coverage.findings.length})
              </span>
              <button
                onClick={() => {
                  setActivePanel('ask');
                  submitQuery(
                    'Explain the top coverage findings in the case record. For each, tell me why the record is missing that item and exactly what to do about it.'
                  );
                }}
                className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800"
              >
                Ask about these →
              </button>
            </div>

            {coverage.findings.length === 0 && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
                No coverage gaps detected. Every document has produced a timeline entry, both
                children carry attributed events, and each statutory criterion has evidence flagged.
              </div>
            )}

            {coverage.findings.slice(0, 40).map(f => {
              const open = expandedFindingId === f.id;
              return (
                <div
                  key={f.id}
                  className={`border rounded-xl overflow-hidden ${SEVERITY_STYLES[f.severity]}`}
                >
                  <button
                    onClick={() => setExpandedFindingId(open ? null : f.id)}
                    className="w-full text-left p-2.5 flex items-start gap-2"
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${SEVERITY_DOT[f.severity]}`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-bold truncate">{f.subject}</div>
                      <div className="text-[10px] opacity-70 font-mono mt-0.5">
                        {f.severity}
                        {f.subjectId ? ` · ${f.subjectId}` : ''}
                        {f.affectedChild ? ` · ${f.affectedChild}` : ''}
                      </div>
                    </div>
                    <ChevronRight
                      className={`w-3.5 h-3.5 shrink-0 mt-0.5 opacity-50 transition-transform ${
                        open ? 'rotate-90' : ''
                      }`}
                    />
                  </button>

                  {open && (
                    <div className="px-2.5 pb-2.5 space-y-2 text-[11px] leading-relaxed">
                      <div>
                        <span className="font-bold uppercase text-[9px] tracking-wider opacity-60 block">
                          What's missing
                        </span>
                        {f.explanation}
                      </div>
                      <div>
                        <span className="font-bold uppercase text-[9px] tracking-wider opacity-60 block">
                          Why it wasn't generated
                        </span>
                        {f.likelyCause}
                      </div>
                      <div>
                        <span className="font-bold uppercase text-[9px] tracking-wider opacity-60 block">
                          How to fix it
                        </span>
                        {f.remediation}
                      </div>
                      <button
                        onClick={() => {
                          setActivePanel('ask');
                          submitQuery(
                            `Regarding "${f.subject}"${
                              f.subjectId ? ` (${f.subjectId})` : ''
                            }: explain in detail why this was not generated from the documents on file, and give me a concrete step-by-step remedy.`
                          );
                        }}
                        className="mt-1 px-2 py-1 bg-white/70 hover:bg-white border border-current/20 rounded-lg text-[10px] font-semibold inline-flex items-center gap-1"
                      >
                        <Sparkles className="w-2.5 h-2.5" />
                        Ask the assistant about this
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="text-[10px] text-slate-400 text-center pt-1">
            Analysis computed locally from the case store · {new Date(coverage.generatedAt).toLocaleString('en-AU')}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Small presentational helper ──────────────────────────────────────
const CoverageStat: React.FC<{
  label: string;
  value: number;
  total: number;
  danger?: boolean;
}> = ({ label, value, total, danger }) => (
  <div
    className={`p-2.5 rounded-xl border ${
      danger ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-200'
    }`}
  >
    <div className="text-[10px] text-slate-500 leading-tight">{label}</div>
    <div className={`text-lg font-bold ${danger ? 'text-rose-700' : 'text-slate-900'}`}>
      {value}
      <span className="text-[11px] font-medium text-slate-400"> / {total}</span>
    </div>
  </div>
);

// ── Case state payload ───────────────────────────────────────────────
/**
 * Compact projection of the whole case store for the model. Trimmed so the
 * assistant can see across every section without blowing the context window.
 */
function buildCaseStatePayload(state: {
  documents: DocumentRecord[];
  timeline: TimelineEvent[];
  communicationMessages: CommunicationMessage[];
  responseRequirements: ResponseRequirement[];
  partyProfiles: PartyProfile[];
  courtCriteria: CourtCriterion[];
  orders: ParentingOrder[];
  issuesConcerns: IssueConcern[];
  knowledgeGaps: KnowledgeGap[];
  discrepancies: DiscrepancyItem[];
}) {
  return {
    documents: state.documents.slice(0, 40).map(d => ({
      id: d.id,
      title: d.title,
      category: d.category,
      date: d.date,
      sourceOrigin: d.sourceOrigin,
      weight: d.evidentiaryWeight,
      annexure: d.annexureNumber,
      excerpt: (d.excerpt || '').slice(0, 400),
    })),
    timeline: state.timeline.slice(0, 60).map(e => ({
      id: e.id,
      date: e.date,
      title: e.title,
      category: e.category,
      primaryDocId: e.primaryDocId,
      breach: e.orderBreachFlag,
      breachedOrder: e.breachedOrderNumber,
      severity: e.breachSeverity,
      children: e.childrenMentioned,
      childImpacts: e.childImpacts,
      generatedBy: e.generatedBy,
    })),
    communications: state.communicationMessages.slice(0, 60).map(m => {
      const a = assessMessage(m);
      return {
        id: m.id,
        timestamp: m.timestamp,
        sender: m.sender,
        channel: m.channel,
        tone: m.tone,
        lagHours: m.lagHours,
        breach42h: m.breachOf42HourMandate,
        productivity: a.productivity,
        nonProductiveMarkers: a.markers,
        substantiveResponse: a.substantiveResponse,
        childrenReferenced: m.childrenReferenced,
        content: (m.content || '').slice(0, 300),
      };
    }),
    responseRequirements: state.responseRequirements.slice(0, 40).map(r => ({
      id: r.id,
      status: r.status,
      requested: r.informationRequested,
      dateRequested: r.dateRequested,
      hoursOverdue: r.hoursOverdue,
      responseProductivity: r.responseProductivity,
      substantiveResponse: r.substantiveResponse,
      statutoryBasis: r.statutoryBasis,
    })),
    partyProfiles: state.partyProfiles.map(p => ({
      id: p.id,
      partyName: p.partyName,
      role: p.role,
      lastAiReviewTimestamp: p.lastAiReviewTimestamp,
      productivityPattern: p.communicationProductivityPattern,
      childDetail: p.childDetail,
    })),
    courtCriteria: state.courtCriteria.map(c => ({
      id: c.id,
      statutoryRef: c.statutoryRef,
      title: c.title,
      evidenceCount: c.aiFlaggedEvidence?.length || 0,
      strength: c.evidentiaryStrength,
    })),
    orders: state.orders.map(o => ({
      orderNumber: o.orderNumber,
      title: o.title,
      breaches: o.breachesCount,
      complianceRate: o.complianceRate,
    })),
    issues: state.issuesConcerns.slice(0, 25).map(i => ({
      id: i.id,
      title: i.title,
      severity: i.severity,
      affectedChildren: i.affectedChildren,
      status: i.status,
    })),
    knowledgeGaps: state.knowledgeGaps.slice(0, 25).map(g => ({
      id: g.id,
      gap: g.gapDescription,
      urgency: g.urgency,
      resolved: g.resolved,
      relatedChild: g.relatedChild,
    })),
    discrepancies: state.discrepancies.slice(0, 20).map(d => ({
      id: d.id,
      claim: (d.claimText || '').slice(0, 160),
      severity: d.severity,
    })),
  };
}

// ── Offline fallback ─────────────────────────────────────────────────
/**
 * When the Gemini endpoint is unreachable, answer from the deterministic
 * coverage analysis rather than failing. This keeps the "why wasn't this
 * generated" capability working with no API key configured at all.
 */
function buildLocalFallbackAnswer(
  query: string,
  coverage: ReturnType<typeof buildCoverageReport>
): string {
  const q = query.toLowerCase();
  const lines: string[] = ['[LOCAL COVERAGE ANALYSIS — AI endpoint unavailable]', ''];

  const wantsTimeline = /timeline|event|generat|why|missing|not (created|produced)/.test(q);
  const wantsChildren = /child|isabella|mason|profile/.test(q);
  const wantsComms = /communicat|non.?productive|message|order 9|42/.test(q);

  if (wantsChildren || !wantsTimeline) {
    lines.push('PER-CHILD COVERAGE');
    coverage.perChild.forEach(c => {
      lines.push(
        `• ${c.child}: profile ${c.profilePresent ? 'present' : 'MISSING'}, ${c.eventCount} attributed event(s), ${c.emptyCategories.length} empty categor${c.emptyCategories.length === 1 ? 'y' : 'ies'}${c.emptyCategories.length ? ` (${c.emptyCategories.join(', ')})` : ''}.`
      );
    });
    lines.push('');
  }

  if (wantsComms) {
    lines.push(
      `COMMUNICATIONS: ${coverage.totals.nonProductiveCommunications} of ${coverage.totals.communications} classified Non-Productive; ${coverage.totals.communicationsAssessedForProductivity} carry a stored assessment.`,
      ''
    );
  }

  const relevant = coverage.findings
    .filter(f => (wantsTimeline ? f.type === 'document_no_timeline_event' : true))
    .slice(0, 8);

  if (relevant.length > 0) {
    lines.push('FINDINGS');
    relevant.forEach(f => {
      lines.push(`• [${f.severity}] ${f.subject}`);
      lines.push(`  Missing: ${f.explanation}`);
      lines.push(`  Cause: ${f.likelyCause}`);
      lines.push(`  Fix: ${f.remediation}`);
      lines.push('');
    });
  }

  if (coverage.missingKnowledgeInsights.length > 0) {
    lines.push('MISSING KNOWLEDGE');
    coverage.missingKnowledgeInsights.forEach(i => lines.push(`• ${i}`));
  }

  return lines.join('\n');
}
