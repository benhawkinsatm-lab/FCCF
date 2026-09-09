import React, { useState } from 'react';
import { 
  Mail, 
  Sparkles, 
  Copy, 
  Check, 
  AlertCircle, 
  ShieldCheck, 
  FileText, 
  Scale, 
  Send,
  RefreshCw,
  Clock,
  ThumbsUp
} from 'lucide-react';
import { BiffAdviceResult } from '../types';

export const BiffAdvisor: React.FC = () => {
  const [draftText, setDraftText] = useState("");
  const [context, setContext] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<BiffAdviceResult | null>(null);
  const [copiedBiff, setCopiedBiff] = useState(false);
  const [copiedCounsel, setCopiedCounsel] = useState(false);

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!draftText.trim()) return;

    setIsGenerating(true);
    try {
      const res = await fetch('/api/gemini/biff-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draftText,
          recipient: 'Sue-Anne Hawkins',
          context,
        }),
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error('Failed to run BIFF advisor:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyBiff = () => {
    if (!result?.biffDraft?.body) return;
    const full = `Subject: ${result.biffDraft.subject}\n\n${result.biffDraft.body}`;
    navigator.clipboard.writeText(full);
    setCopiedBiff(true);
    setTimeout(() => setCopiedBiff(false), 2000);
  };

  const handleCopyCounsel = () => {
    if (!result?.counselEscalation?.briefForLawyer) return;
    navigator.clipboard.writeText(result.counselEscalation.briefForLawyer);
    setCopiedCounsel(true);
    setTimeout(() => setCopiedCounsel(false), 2000);
  };

  return (
    <div className="space-y-6 pb-12" id="biff-advisor-container">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 font-serif flex items-center gap-2">
          <Mail className="w-5 h-5 text-amber-500" />
          <span>Strategic Email Drafter &amp; BIFF Advisor</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Reviews communication under the Bill Eddy High-Conflict framework (Brief, Informative, Friendly, Firm) with automatic counsel escalation analysis.
        </p>
      </div>

      {/* Input Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
        <form onSubmit={handleGenerate} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-800">
                Your Draft Correspondence (or Quick Emotional Reaction)
              </label>
              <span className="text-[11px] text-slate-400">
                AI will neutralize traps, remove emotional heat, and align with Order 9.1
              </span>
            </div>
            <textarea
              rows={4}
              required
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              placeholder="Paste your raw email draft or text message to Sue-Anne..."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-amber-400 focus:outline-none leading-relaxed"
              id="raw-draft-input"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Background Context / Relevant Incident
              </label>
              <input
                type="text"
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="e.g. Friday changeover missed, medical receipt pending, holiday request..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800"
                id="draft-context-input"
              />
            </div>

            <div className="pt-4 sm:pt-0 flex items-end">
              <button
                type="submit"
                disabled={isGenerating || !draftText.trim()}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-300 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                id="generate-biff-btn"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing &amp; Redrafting...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate BIFF Draft &amp; Escalation</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Results Section */}
      {result && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Top 2 Columns: Tactical Considerations & Emotional Traps Removed */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tactical Considerations */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Tactical &amp; Legal Considerations</span>
              </div>
              <ul className="space-y-1.5 text-xs text-slate-700">
                {result.tacticalConsiderations?.map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-emerald-500 font-bold">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Emotional Traps Removed */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <AlertCircle className="w-4 h-4 text-rose-500" />
                <span>Emotional Traps Removed (Depolarization)</span>
              </div>
              <ul className="space-y-1.5 text-xs text-slate-700">
                {result.emotionalTrapsRemoved?.map((trap, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-rose-500 font-bold">✕</span>
                    <span>{trap}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* The BIFF Output Card */}
          <div className="bg-white rounded-xl border-2 border-emerald-500/30 p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider">
                    Recommended Court-Ready Draft
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {result.biffDraft.wordCount} words
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 pt-1">
                  Subject: {result.biffDraft.subject}
                </h3>
              </div>

              <button
                onClick={handleCopyBiff}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                id="copy-biff-text-btn"
              >
                {copiedBiff ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedBiff ? 'Copied to Clipboard' : 'Copy BIFF Email'}</span>
              </button>
            </div>

            {/* Email Body */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-sans whitespace-pre-wrap leading-relaxed shadow-inner">
              {result.biffDraft.body}
            </div>

            {/* BIFF 4-Pillar Breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-[11px]">
              <div className="p-2.5 rounded-lg bg-blue-50/60 border border-blue-200 text-blue-900">
                <strong className="block font-bold mb-0.5">B - Brief:</strong>
                {result.biffDraft.breakdown?.brief}
              </div>
              <div className="p-2.5 rounded-lg bg-amber-50/60 border border-amber-200 text-amber-900">
                <strong className="block font-bold mb-0.5">I - Informative:</strong>
                {result.biffDraft.breakdown?.informative}
              </div>
              <div className="p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-200 text-emerald-900">
                <strong className="block font-bold mb-0.5">F - Friendly:</strong>
                {result.biffDraft.breakdown?.friendly}
              </div>
              <div className="p-2.5 rounded-lg bg-purple-50/60 border border-purple-200 text-purple-900">
                <strong className="block font-bold mb-0.5">F - Firm:</strong>
                {result.biffDraft.breakdown?.firm}
              </div>
            </div>
          </div>

          {/* Counsel Escalation Assessment */}
          <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800 shadow-md space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Counsel Escalation Threshold Analysis</h3>
                {result.counselEscalation.shouldEscalate ? (
                  <span className="px-2 py-0.5 bg-rose-500 text-white font-bold rounded text-[10px] uppercase">
                    Escalation Recommended
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-emerald-600 text-white font-bold rounded text-[10px] uppercase">
                    Handle Directly Via BIFF
                  </span>
                )}
              </div>

              <button
                onClick={handleCopyCounsel}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded border border-slate-700 flex items-center gap-1.5 transition-colors"
                id="copy-counsel-memo-btn"
              >
                {copiedCounsel ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCounsel ? 'Memo Copied' : 'Copy Briefing Memo'}</span>
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {result.counselEscalation.legalThresholdAnalysis}
            </p>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
              {result.counselEscalation.briefForLawyer}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
