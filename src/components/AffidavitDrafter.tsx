import React, { useState } from 'react';
import { 
  FileText, 
  Sparkles, 
  Copy, 
  Check, 
  Printer, 
  ExternalLink, 
  RefreshCw
} from 'lucide-react';
import { TimelineEvent, DocumentRecord } from '../types';
import { FCWA_TEMPLATES } from '../data/caseData';

interface AffidavitDrafterProps {
  timeline: TimelineEvent[];
  documents: DocumentRecord[];
  onViewDocument: (doc: DocumentRecord) => void;
}

export const AffidavitDrafter: React.FC<AffidavitDrafterProps> = ({
  timeline,
  documents,
  onViewDocument,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState('FCWA-FORM-AFFIDAVIT');
  const [topic, setTopic] = useState('Contravention of Interim Orders (Parenting Schedule & Notice Breaches)');
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
  const [isDrafting, setIsDrafting] = useState(false);
  const [draftResult, setDraftResult] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);

  const toggleEventSelect = (id: string) => {
    setSelectedEventIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleDraft = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsDrafting(true);

    try {
      const res = await fetch('/api/gemini/affidavit-drafter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedEventIds,
          topic,
          specificRequests: selectedEventIds.length > 0
            ? `Focus on the ${selectedEventIds.length} selected chronological timeline exhibits and contemporaneous evidence regarding "${topic}".`
            : `Focus on contemporaneous exhibits, verified communication logs, and compliance records regarding "${topic}".`,
        }),
      });
      const data = await res.json();
      setDraftResult(data);
    } catch (err) {
      console.error('Failed to generate affidavit draft:', err);
    } finally {
      setIsDrafting(false);
    }
  };

  const handleCopyText = () => {
    if (!draftResult) return;
    let fullText = `${draftResult.court}\nCASE NO: ${draftResult.caseNumber}\n\n${draftResult.title}\nDEPONENT: ${draftResult.deponent}\n\n`;
    draftResult.paragraphs?.forEach((p: any) => {
      if (p.heading) fullText += `\n${p.heading}\n`;
      fullText += `${p.num}. ${p.text}\n`;
    });
    fullText += `\nSWORN at Perth in the State of Western Australia this _____ day of ____________ ${new Date().getFullYear()}.\nBefore me: __________________________ (Justice of the Peace / Australian Legal Practitioner)`;
    
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12" id="affidavit-drafter-container">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 font-serif flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-600" />
            <span>Automated Form &amp; Affidavit Drafter</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Auto-populates Family Court of WA legal templates (Affidavit, Form 1, Form 2 Contravention) from verified timeline events with zero-hallucination citations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {draftResult && (
            <>
              <button
                onClick={handlePrint}
                className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm transition-colors"
                id="print-affidavit-btn"
              >
                <Printer className="w-3.5 h-3.5 text-slate-500" />
                <span>Print Legal View</span>
              </button>
              <button
                onClick={handleCopyText}
                className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm transition-colors"
                id="copy-affidavit-btn"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied Full Draft' : 'Copy Affidavit'}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Configuration Console */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
        {/* Template Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {FCWA_TEMPLATES.map((tmpl) => (
            <div
              key={tmpl.id}
              onClick={() => setSelectedTemplate(tmpl.id)}
              className={`p-3 rounded-lg border cursor-pointer transition-all text-xs space-y-1 ${
                selectedTemplate === tmpl.id
                  ? 'bg-slate-900 text-white border-slate-800 shadow-sm'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span className="font-bold block">{tmpl.name}</span>
              <p className={`text-[11px] line-clamp-2 ${selectedTemplate === tmpl.id ? 'text-slate-300' : 'text-slate-500'}`}>
                {tmpl.description}
              </p>
            </div>
          ))}
        </div>

        {/* Topic Input */}
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-700">Application Matter / Affidavit Topic</label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-900"
            id="affidavit-topic-input"
          />
        </div>

        {/* Fact Selector from Timeline */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800">
              Select Facts to Include in Sworn Numbered Paragraphs:
            </label>
            <span className="text-[11px] text-slate-400">
              {selectedEventIds.length} incidents selected
            </span>
          </div>

          <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 bg-slate-50 border border-slate-200 rounded-lg">
            {timeline.map((evt) => {
              const isChecked = selectedEventIds.includes(evt.id);
              return (
                <label 
                  key={evt.id} 
                  className={`flex items-start gap-2 p-2 rounded cursor-pointer transition-colors text-xs ${
                    isChecked ? 'bg-white shadow-2xs border border-slate-200' : 'hover:bg-slate-100/80'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleEventSelect(evt.id)}
                    className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-700">{evt.date}</span>
                      <span className="font-semibold text-slate-900">{evt.title}</span>
                      {evt.orderBreachFlag && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 font-bold">
                          {evt.breachedOrderNumber || 'Breach'}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{evt.description}</p>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-100">
          <button
            onClick={() => handleDraft()}
            disabled={isDrafting}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-2 shadow-sm"
            id="execute-draft-affidavit-btn"
          >
            {isDrafting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Extracting Facts &amp; Formatting Jurat...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Generate Sworn Affidavit Document</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Formatted Legal Document Output */}
      {draftResult && (
        <div className="bg-white rounded-xl border border-slate-300 p-8 sm:p-12 shadow-lg space-y-6 print:p-0 print:border-none print:shadow-none animate-in fade-in duration-200" id="court-affidavit-document">
          {/* Formal Court Header */}
          <div className="text-center border-b-2 border-slate-800 pb-4 space-y-1">
            <h2 className="text-xs uppercase tracking-widest font-serif font-bold text-slate-700">
              IN THE FAMILY COURT OF WESTERN AUSTRALIA
            </h2>
            <h3 className="text-xs font-mono font-bold text-slate-800">
              HELD AT PERTH • FILE NO: 4344/2023
            </h3>
            <div className="pt-2 text-xs font-serif text-slate-600">
              <div>BETWEEN: <strong>BENJAMIN JAMES HAWKINS</strong> (Applicant)</div>
              <div>-and-</div>
              <div><strong>SUE-ANNE HAWKINS</strong> (Respondent)</div>
            </div>
            <h1 className="text-base font-serif font-bold uppercase tracking-wider text-slate-900 pt-3">
              {draftResult.title}
            </h1>
          </div>

          {/* Numbered Paragraphs */}
          <div className="space-y-4 font-serif text-sm leading-relaxed text-slate-900">
            {draftResult.paragraphs?.map((p: any) => {
              const linkedDoc = documents.find(d => d.id === p.citationDocId);
              return (
                <div key={p.num} className="space-y-1.5 group">
                  {p.heading && (
                    <h4 className="text-xs font-sans font-bold uppercase tracking-wider text-slate-600 pt-2 pb-1 border-b border-slate-100">
                      {p.heading}
                    </h4>
                  )}
                  <div className="flex items-start gap-3">
                    <span className="font-bold text-slate-800 w-6 shrink-0">{p.num}.</span>
                    <div className="flex-1 space-y-1">
                      <p className="text-slate-800 leading-relaxed">{p.text}</p>
                      
                      {/* Annexure Citation Badge */}
                      {linkedDoc && (
                        <button
                          onClick={() => onViewDocument(linkedDoc)}
                          className="inline-flex items-center gap-1 text-[11px] font-mono text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded print:hidden"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>{p.citationText}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Table of Annexures */}
          {draftResult.annexures && draftResult.annexures.length > 0 && (
            <div className="pt-4 border-t border-slate-200 space-y-2">
              <h4 className="text-xs font-sans font-bold uppercase tracking-wider text-slate-600">
                Index of Produced Annexures
              </h4>
              <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg overflow-hidden text-xs">
                {draftResult.annexures.map((ann: any, idx: number) => {
                  const linkedDoc = documents.find(d => d.id === ann.docId);
                  return (
                    <div key={idx} className="p-2.5 bg-slate-50 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-amber-700">Annexure "{ann.letter}"</span>
                        <span className="text-slate-700">{ann.description}</span>
                        <span className="text-slate-400 font-mono">({ann.date})</span>
                      </div>
                      {linkedDoc && (
                        <button
                          onClick={() => onViewDocument(linkedDoc)}
                          className="text-xs font-semibold text-indigo-600 hover:underline print:hidden flex items-center gap-1"
                        >
                          <span>View Doc</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Formal Jurat Block */}
          <div className="pt-6 border-t-2 border-slate-800 grid grid-cols-2 gap-8 text-xs font-serif text-slate-800">
            <div className="space-y-4">
              <p>
                SWORN by the Deponent Benjamin James Hawkins at Perth in the State of Western Australia this _____ day of ___________________ {new Date().getFullYear()}.
              </p>
              <div className="pt-8 border-b border-slate-400 w-48"></div>
              <span className="text-[11px] text-slate-500">Signature of Deponent (Benjamin Hawkins)</span>
            </div>

            <div className="space-y-4">
              <p>
                Before me:
              </p>
              <div className="pt-8 border-b border-slate-400 w-64"></div>
              <span className="text-[11px] text-slate-500">
                Justice of the Peace / Australian Legal Practitioner
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
