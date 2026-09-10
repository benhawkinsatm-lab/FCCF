import React, { useState } from 'react';
import { 
  BarChart3, 
  Clock, 
  AlertOctagon, 
  Smile, 
  Frown, 
  Meh, 
  ExternalLink, 
  MessageSquareOff,
  Users,
  Sparkles,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { CommunicationMessage, CommunicationProductivity, DocumentRecord } from '../types';
import {
  assessMessage,
  detectChildrenReferenced,
  summariseProductivityForParty,
  PRODUCTIVITY_BADGE_CLASSES,
} from '../utils/communicationProductivity';

interface CommunicationAnalyticsProps {
  messages: CommunicationMessage[];
  documents: DocumentRecord[];
  onViewDocument: (doc: DocumentRecord) => void;
  onGenerateMessages?: (generated: CommunicationMessage[]) => void;
}

export const CommunicationAnalytics: React.FC<CommunicationAnalyticsProps> = ({
  messages,
  documents,
  onViewDocument,
  onGenerateMessages,
}) => {
  const [senderFilter, setSenderFilter] = useState<'All' | 'Sue-Anne Hawkins' | 'Benjamin Hawkins'>('All');
  const [toneFilter, setToneFilter] = useState<'All' | 'Hostile' | 'Neutral' | 'Cooperative'>('All');
  const [breachesOnly, setBreachesOnly] = useState(false);
  const [productivityFilter, setProductivityFilter] = useState<'All' | CommunicationProductivity>('All');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const handleGenerateFromDocuments = async () => {
    setIsGenerating(true);
    setGenerationError(null);
    try {
      const res = await fetch('/api/gemini/generate-communications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documents }),
      });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data = await res.json();
      const generated: CommunicationMessage[] = Array.isArray(data.messages) ? data.messages : [];
      if (generated.length === 0) {
        setGenerationError(data.note || 'No communication records could be extracted from the documents currently in the case record.');
      } else if (onGenerateMessages) {
        onGenerateMessages(generated);
      }
    } catch (err) {
      setGenerationError('AI generation failed. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const motherMessages = messages.filter(m => m.sender === 'Sue-Anne Hawkins');
  const fatherMessages = messages.filter(m => m.sender === 'Benjamin Hawkins');

  // Productivity is assessed independently of tone and of the 42-hour clock.
  const motherProductivity = summariseProductivityForParty(messages, 'Sue-Anne Hawkins');
  const fatherProductivity = summariseProductivityForParty(messages, 'Benjamin Hawkins');

  // The critical pattern: replies that arrived ON TIME yet answered nothing.
  // These look like compliance in a latency-only view.
  const timelyButEmpty = messages.filter(m => {
    const a = assessMessage(m);
    const onTime = !m.breachOf42HourMandate && (m.lagHours === undefined || m.lagHours <= 42);
    return onTime && a.productivity === 'Non-Productive';
  });

  // Compute metrics
  const motherLags = motherMessages.filter(m => m.lagHours !== undefined).map(m => m.lagHours!);
  const motherAvgLag = motherLags.length > 0 
    ? (motherLags.reduce((a, b) => a + b, 0) / motherLags.length).toFixed(1)
    : '0';
  const motherMaxLag = motherLags.length > 0 ? Math.max(...motherLags).toFixed(1) : '0';

  const motherBreaches = motherMessages.filter(m => m.breachOf42HourMandate || (m.lagHours && m.lagHours > 42)).length;
  const motherComplianceRate = Math.round(((motherLags.length - motherBreaches) / (motherLags.length || 1)) * 100);

  const motherHostileCount = motherMessages.filter(m => m.tone === 'Hostile').length;
  const motherHostilePercent = Math.round((motherHostileCount / (motherMessages.length || 1)) * 100);

  const fatherLags = fatherMessages.filter(m => m.lagHours !== undefined).map(m => m.lagHours!);
  const fatherAvgLag = fatherLags.length > 0 
    ? (fatherLags.reduce((a, b) => a + b, 0) / fatherLags.length).toFixed(1)
    : '0';
  const fatherMaxLag = fatherLags.length > 0 ? Math.max(...fatherLags).toFixed(1) : '0';

  const fatherBreaches = fatherMessages.filter(m => m.breachOf42HourMandate || (m.lagHours && m.lagHours > 42)).length;
  const fatherComplianceRate = Math.round(((fatherLags.length - fatherBreaches) / (fatherLags.length || 1)) * 100);

  const fatherHostileCount = fatherMessages.filter(m => m.tone === 'Hostile').length;
  const fatherHostilePercent = Math.round((fatherHostileCount / (fatherMessages.length || 1)) * 100);

  const filteredMessages = messages.filter(m => {
    if (senderFilter !== 'All' && m.sender !== senderFilter) return false;
    if (toneFilter !== 'All' && m.tone !== toneFilter) return false;
    if (breachesOnly && !m.breachOf42HourMandate && (!m.lagHours || m.lagHours <= 42)) return false;
    if (productivityFilter !== 'All' && assessMessage(m).productivity !== productivityFilter) return false;
    return true;
  });

  const getToneBadge = (tone: string) => {
    switch (tone) {
      case 'Hostile':
        return {
          bg: 'bg-rose-100 text-rose-800 border-rose-200',
          icon: Frown,
        };
      case 'Cooperative':
        return {
          bg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          icon: Smile,
        };
      default:
        return {
          bg: 'bg-slate-100 text-slate-800 border-slate-200',
          icon: Meh,
        };
    }
  };

  return (
    <div className="space-y-6 pb-12" id="communication-analytics-container">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 font-serif flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            <span>Communication, Tone &amp; Productivity Analytics</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 max-w-3xl">
            Algorithmic analysis of ingested SMS and emails across three independent axes: <strong>tone</strong> (how it was said),
            <strong> productivity</strong> (whether it moved a parenting question forward), and <strong>latency</strong> against the
            42-hour court mandate (Order 9.1). A civil, on-time reply that answered nothing fails the second test while passing the other two.
          </p>
        </div>
        <button
          id="generate-communications-ai-btn"
          onClick={handleGenerateFromDocuments}
          disabled={isGenerating}
          className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
        >
          {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          <span>{isGenerating ? 'Generating…' : messages.length > 0 ? 'Regenerate from Documents' : 'Generate from Documents'}</span>
        </button>
      </div>

      {generationError && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{generationError}</span>
        </div>
      )}

      {/* Comparative Analytical Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Productivity — substance, assessed independently of tone & timing */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Non-Productive Rate</span>
            <MessageSquareOff className="w-4 h-4 text-rose-500" />
          </div>
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="p-2.5 bg-rose-50 rounded-lg border border-rose-200">
              <span className="text-[10px] uppercase font-bold text-rose-700 block">Sue-Anne</span>
              <span className="text-2xl font-bold text-rose-800">{motherProductivity.nonProductiveRate}</span>
              <span className="text-[10px] text-rose-600 block mt-0.5">
                {motherProductivity.nonProductiveCount} non-productive
              </span>
            </div>
            <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200">
              <span className="text-[10px] uppercase font-bold text-emerald-700 block">Benjamin</span>
              <span className="text-2xl font-bold text-emerald-800">{fatherProductivity.nonProductiveRate}</span>
              <span className="text-[10px] text-emerald-600 block mt-0.5">
                {fatherProductivity.nonProductiveCount} non-productive
              </span>
            </div>
          </div>

          {timelyButEmpty.length > 0 && (
            <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg">
              <span className="text-[11px] font-bold text-amber-900 block">
                {timelyButEmpty.length} replied within 42h but answered nothing
              </span>
              <span className="text-[10px] text-amber-800 leading-snug block mt-0.5">
                These read as compliant on latency alone. Order 9.1 requires a
                response in substance, not merely a message inside the window.
              </span>
            </div>
          )}

          <p className="text-[11px] text-slate-500">
            Substance is scored separately from tone: a civil, on-time reply that
            supplies no information is still <strong>Non-Productive</strong>.
          </p>
        </div>

        {/* Latency Comparison */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Average Response Latency</span>
            <Clock className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="p-2.5 bg-rose-50 rounded-lg border border-rose-200">
              <span className="text-[10px] uppercase font-bold text-rose-700 block">Sue-Anne</span>
              <span className="text-2xl font-bold text-rose-800">{motherAvgLag}h</span>
              <span className="text-[10px] text-rose-600 block mt-0.5">Max: {motherMaxLag}h</span>
            </div>
            <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200">
              <span className="text-[10px] uppercase font-bold text-emerald-700 block">Benjamin</span>
              <span className="text-2xl font-bold text-emerald-800">{fatherAvgLag}h</span>
              <span className="text-[10px] text-emerald-600 block mt-0.5">Max: {fatherMaxLag}h</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500">
            Order 9.1 stipulates non-urgent communications must be answered within <strong>42 hours</strong>.
          </p>
        </div>

        {/* 42h Mandate Compliance Rate */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Order 9.1 Compliance Rate</span>
            <AlertOctagon className="w-4 h-4 text-amber-500" />
          </div>
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200">
              <span className="text-[10px] uppercase font-bold text-amber-800 block">Sue-Anne</span>
              <span className="text-2xl font-bold text-amber-900">{motherComplianceRate}%</span>
              <span className="text-[10px] text-amber-700 block mt-0.5">{motherBreaches} Flagged Breaches</span>
            </div>
            <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200">
              <span className="text-[10px] uppercase font-bold text-emerald-700 block">Benjamin</span>
              <span className="text-2xl font-bold text-emerald-800">{fatherComplianceRate}%</span>
              <span className="text-[10px] text-emerald-600 block mt-0.5">{fatherBreaches} Flagged Breaches</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500">
            Order 9.1 requires a response within 42 hours to non-urgent communications; a delayed response is flagged as a breach above.
          </p>
        </div>

        {/* Tone Distribution */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Tone Profile</span>
            <Frown className="w-4 h-4 text-rose-500" />
          </div>
          <div className="space-y-2 pt-1 text-xs">
            <div>
              <div className="flex justify-between text-[11px] font-semibold text-slate-700 mb-1">
                <span>Sue-Anne &mdash; Hostile / Obstructionist</span>
                <span className="font-mono">{motherHostilePercent}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div className="bg-rose-500 h-full rounded-full" style={{ width: `${motherHostilePercent}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-semibold text-slate-700 mb-1">
                <span>Benjamin &mdash; Hostile / Obstructionist</span>
                <span className="font-mono">{fatherHostilePercent}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div className="bg-rose-500 h-full rounded-full" style={{ width: `${fatherHostilePercent}%` }} />
              </div>
            </div>
          </div>
          <p className="text-[11px] text-slate-500">
            Tone is classified per message from its actual language at ingestion; this chart is a summary of those classifications, not an independent finding.
          </p>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-medium">Sender:</span>
          {(['All', 'Sue-Anne Hawkins', 'Benjamin Hawkins'] as const).map(s => (
            <button
              key={s}
              onClick={() => setSenderFilter(s)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                senderFilter === s ? 'bg-slate-900 text-white font-bold' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {s === 'All' ? 'All Parties' : s.split(' ')[0]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-medium">Tone:</span>
          {(['All', 'Hostile', 'Neutral', 'Cooperative'] as const).map(t => (
            <button
              key={t}
              onClick={() => setToneFilter(t)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                toneFilter === t ? 'bg-indigo-600 text-white font-bold' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t}
            </button>
          ))}

          <button
            onClick={() => setBreachesOnly(!breachesOnly)}
            className={`px-2.5 py-1 rounded-lg font-bold border transition-colors flex items-center gap-1 ${
              breachesOnly ? 'bg-rose-500 text-white border-rose-600' : 'bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            <AlertOctagon className="w-3 h-3" />
            <span>&gt;42h Breaches</span>
          </button>
        </div>

        {/* Productivity filter — separate axis from tone above */}
        <div className="flex items-center gap-2 w-full pt-2 mt-1 border-t border-slate-100">
          <span className="text-slate-400 font-medium flex items-center gap-1">
            <MessageSquareOff className="w-3 h-3" />
            Productivity:
          </span>
          {(['All', 'Productive', 'Partially Productive', 'Non-Productive', 'Unassessed'] as const).map(p => (
            <button
              key={p}
              onClick={() => setProductivityFilter(p)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                productivityFilter === p
                  ? 'bg-rose-600 text-white font-bold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Messages Ingestion Feed */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <span>Ingested Communications Ledger ({filteredMessages.length})</span>
          <span>Verified Telco &amp; Email Records</span>
        </div>

        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center text-center py-16 px-6 bg-white border border-slate-200 rounded-xl">
            <MessageSquareOff className="w-10 h-10 text-slate-300 mb-3" />
            <h2 className="text-sm font-bold text-slate-900">No Communications Recorded Yet</h2>
            <p className="text-xs text-slate-500 mt-1 max-w-md">
              This ledger is populated from SMS and email records ingested into the case (via document ingestion), then classified with &quot;Generate from Documents&quot; above. There is nothing to display until then.
            </p>
          </div>
        )}

        {messages.length > 0 && filteredMessages.length === 0 && (
          <div className="text-center py-10 text-xs text-slate-400">
            No ingested communications match the current filters.
          </div>
        )}

        {filteredMessages.map((msg) => {
          const toneBadge = getToneBadge(msg.tone);
          const ToneIcon = toneBadge.icon;
          const isBreach = msg.breachOf42HourMandate || (msg.lagHours !== undefined && msg.lagHours > 42);
          const linkedDoc = documents.find(d => d.id === msg.docRefId);
          const productivity = assessMessage(msg);
          const isNonProductive = productivity.productivity === 'Non-Productive';
          // Prefer the stored attribution; fall back to detecting from content.
          const childrenRef =
            msg.childrenReferenced && msg.childrenReferenced.length > 0
              ? msg.childrenReferenced
              : detectChildrenReferenced(msg.content || '');

          return (
            <div 
              key={msg.id}
              className={`p-4 bg-white rounded-xl border transition-all hover:shadow-2xs space-y-2 ${
                isBreach ? 'border-rose-300 bg-rose-50/10' : 'border-slate-200'
              }`}
              id={`comm-msg-${msg.id}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                    {msg.timestamp}
                  </span>
                  <span className={`text-xs font-bold ${msg.sender.includes('Sue-Anne') ? 'text-rose-700' : 'text-indigo-700'}`}>
                    {msg.sender}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">via {msg.channel}</span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Tone badge */}
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${toneBadge.bg}`}>
                    <ToneIcon className="w-3 h-3" />
                    <span>{msg.tone}</span>
                  </span>

                  {/* Productivity badge — separate axis from tone */}
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                      PRODUCTIVITY_BADGE_CLASSES[productivity.productivity]
                    }`}
                    title={productivity.rationale}
                  >
                    <MessageSquareOff className="w-3 h-3" />
                    <span>{productivity.productivity}</span>
                  </span>

                  {/* Children this message actually concerns */}
                  {childrenRef && childrenRef.length > 0 && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      <span>{childrenRef.join(', ')}</span>
                    </span>
                  )}

                  {/* 42h Breach Tag */}
                  {isBreach && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                      <AlertOctagon className="w-3 h-3 text-rose-600" />
                      <span>{msg.lagHours ? `${msg.lagHours}h Delay` : 'Delayed'} (Order 9.1 Breach)</span>
                    </span>
                  )}

                  {msg.lagHours !== undefined && !isBreach && msg.lagHours > 0 && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                      {msg.lagHours}h lag
                    </span>
                  )}

                  {linkedDoc && (
                    <button
                      onClick={() => onViewDocument(linkedDoc)}
                      className="inline-flex items-center gap-1 text-[11px] font-mono text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded ml-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>{linkedDoc.annexureNumber || linkedDoc.id}</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg text-xs text-slate-800 font-sans leading-relaxed">
                "{msg.content}"
              </div>

              {/* Non-productive markers & rationale */}
              {isNonProductive && (
                <div className="p-2.5 bg-rose-50/70 border border-rose-200 rounded-lg space-y-1.5">
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="text-[10px] font-bold text-rose-900 uppercase tracking-wider mr-1">
                      Non-productive markers:
                    </span>
                    {productivity.markers.length > 0 ? (
                      productivity.markers.map((mk, i) => (
                        <span
                          key={i}
                          className="text-[10px] px-1.5 py-0.5 bg-white text-rose-800 border border-rose-300 rounded font-medium"
                        >
                          {mk}
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] text-rose-700">General lack of substance</span>
                    )}
                  </div>
                  <p className="text-[11px] text-rose-900 leading-snug">{productivity.rationale}</p>
                  {productivity.s60CCFactorRef && (
                    <p className="text-[10px] text-rose-700 font-mono">
                      {productivity.s60CCFactorRef}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
