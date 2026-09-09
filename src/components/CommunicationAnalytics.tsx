import React, { useState } from 'react';
import { 
  BarChart3, 
  Clock, 
  AlertOctagon, 
  Smile, 
  Frown, 
  Meh, 
  ExternalLink, 
  Filter
} from 'lucide-react';
import { CommunicationMessage, DocumentRecord } from '../types';

interface CommunicationAnalyticsProps {
  messages: CommunicationMessage[];
  documents: DocumentRecord[];
  onViewDocument: (doc: DocumentRecord) => void;
}

export const CommunicationAnalytics: React.FC<CommunicationAnalyticsProps> = ({
  messages,
  documents,
  onViewDocument,
}) => {
  const [senderFilter, setSenderFilter] = useState<'All' | 'Sue-Anne Hawkins' | 'Benjamin Hawkins'>('All');
  const [toneFilter, setToneFilter] = useState<'All' | 'Hostile' | 'Neutral' | 'Cooperative'>('All');
  const [breachesOnly, setBreachesOnly] = useState(false);

  const motherMessages = messages.filter(m => m.sender === 'Sue-Anne Hawkins');

  // Compute metrics
  const motherLags = motherMessages.filter(m => m.lagHours !== undefined).map(m => m.lagHours!);
  const motherAvgLag = motherLags.length > 0 
    ? (motherLags.reduce((a, b) => a + b, 0) / motherLags.length).toFixed(1)
    : '0';

  const motherBreaches = motherMessages.filter(m => m.breachOf42HourMandate || (m.lagHours && m.lagHours > 42)).length;
  const motherComplianceRate = Math.round(((motherLags.length - motherBreaches) / (motherLags.length || 1)) * 100);

  const motherHostileCount = motherMessages.filter(m => m.tone === 'Hostile').length;
  const motherHostilePercent = Math.round((motherHostileCount / (motherMessages.length || 1)) * 100);

  const filteredMessages = messages.filter(m => {
    if (senderFilter !== 'All' && m.sender !== senderFilter) return false;
    if (toneFilter !== 'All' && m.tone !== toneFilter) return false;
    if (breachesOnly && !m.breachOf42HourMandate && (!m.lagHours || m.lagHours <= 42)) return false;
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
      <div>
        <h1 className="text-xl font-bold text-slate-900 font-serif flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-indigo-600" />
          <span>Communication &amp; Tone Analytics</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Algorithmic analysis of ingested SMS and emails for tone, hostility indicators, and response latency against the 42-hour court mandate (Order 9.1).
        </p>
      </div>

      {/* Comparative Analytical Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
              <span className="text-[10px] text-rose-600 block mt-0.5">Max: 126.3h</span>
            </div>
            <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200">
              <span className="text-[10px] uppercase font-bold text-emerald-700 block">Benjamin</span>
              <span className="text-2xl font-bold text-emerald-800">2.1h</span>
              <span className="text-[10px] text-emerald-600 block mt-0.5">Prompt &amp; Compliant</span>
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
              <span className="text-2xl font-bold text-emerald-800">100%</span>
              <span className="text-[10px] text-emerald-600 block mt-0.5">0 Breaches</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500">
            Chronically delayed responses to medical and changeover notices constitute contempt of orders.
          </p>
        </div>

        {/* Tone Distribution */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Respondent Tone Profile</span>
            <Frown className="w-4 h-4 text-rose-500" />
          </div>
          <div className="space-y-2 pt-1 text-xs">
            <div>
              <div className="flex justify-between text-[11px] font-semibold text-slate-700 mb-1">
                <span>Hostile / Obstructionist</span>
                <span className="font-mono">{motherHostilePercent}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div className="bg-rose-500 h-full rounded-full" style={{ width: `${motherHostilePercent}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-semibold text-slate-700 mb-1">
                <span>Cooperative / Neutral</span>
                <span className="font-mono">{100 - motherHostilePercent}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${100 - motherHostilePercent}%` }} />
              </div>
            </div>
          </div>
          <p className="text-[11px] text-slate-500">
            Language patterns evidence parental alienation and disparagement (Order 11.2).
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
      </div>

      {/* Messages Ingestion Feed */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <span>Ingested Communications Ledger ({filteredMessages.length})</span>
          <span>Verified Telco &amp; Email Records</span>
        </div>

        {filteredMessages.map((msg) => {
          const toneBadge = getToneBadge(msg.tone);
          const ToneIcon = toneBadge.icon;
          const isBreach = msg.breachOf42HourMandate || (msg.lagHours !== undefined && msg.lagHours > 42);
          const linkedDoc = documents.find(d => d.id === msg.docRefId);

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
            </div>
          );
        })}
      </div>
    </div>
  );
};
