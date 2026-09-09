import React, { useState } from 'react';
import { 
  HelpCircle, 
  AlertCircle, 
  CheckCircle2, 
  Plus, 
  ExternalLink, 
  FileSearch, 
  ShieldAlert, 
  ArrowRight
} from 'lucide-react';
import { KnowledgeGap, DocumentCategory } from '../types';

interface KnowledgeGapAnalyzerProps {
  gaps: KnowledgeGap[];
  onToggleGapResolved: (id: string) => void;
  onAddGap: (gap: KnowledgeGap) => void;
}

export const KnowledgeGapAnalyzer: React.FC<KnowledgeGapAnalyzerProps> = ({
  gaps,
  onToggleGapResolved,
  onAddGap,
}) => {
  const [filter, setFilter] = useState<'All' | 'Open' | 'Resolved'>('All');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newGap, setNewGap] = useState({
    gapDescription: '',
    category: 'Medical' as DocumentCategory,
    urgency: 'High' as 'Critical' | 'High' | 'Routine',
    targetCorroboration: '',
    recommendedQuestion: '',
    suggestedAction: '',
  });

  const filteredGaps = gaps.filter(g => {
    if (filter === 'All') return true;
    if (filter === 'Open') return !g.resolved;
    if (filter === 'Resolved') return g.resolved;
    return true;
  });

  const handleCreateGap = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGap.gapDescription.trim()) return;

    const created: KnowledgeGap = {
      id: `GAP-${Date.now().toString().slice(-3)}`,
      gapDescription: newGap.gapDescription,
      category: newGap.category,
      urgency: newGap.urgency,
      targetCorroboration: newGap.targetCorroboration,
      recommendedQuestion: newGap.recommendedQuestion || 'Has the records keeper provided formal certified copies?',
      suggestedAction: newGap.suggestedAction || 'Issue Rule 15.01 Subpoena / Order for Inspection',
      resolved: false,
    };

    onAddGap(created);
    setIsAddModalOpen(false);
  };

  return (
    <div className="space-y-6 pb-12" id="knowledge-gap-analyzer-container">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 font-serif flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-blue-600" />
            <span>Knowledge Gap Analyzer</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Proactively detects uncorroborated assertions and recommends targeted subpoenas or discovery under FCWA Rules.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-sm transition-colors"
          id="add-gap-btn"
        >
          <Plus className="w-4 h-4" />
          <span>Flag New Evidentiary Gap</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-xs">
        {(['All', 'Open', 'Resolved'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              filter === tab
                ? 'bg-slate-900 text-white font-bold'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Gaps Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredGaps.map((gap) => {
          return (
            <div 
              key={gap.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4 flex flex-col justify-between"
              id={`gap-card-${gap.id}`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 bg-slate-100 text-slate-800 rounded">
                      {gap.id}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      gap.urgency === 'Critical'
                        ? 'bg-rose-100 text-rose-700 border-rose-200'
                        : gap.urgency === 'High'
                        ? 'bg-amber-100 text-amber-800 border-amber-200'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}>
                      {gap.urgency} Urgency
                    </span>
                  </div>

                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${gap.resolved ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                    {gap.resolved ? 'Resolved' : 'Pending Discovery'}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900">{gap.gapDescription}</h3>

                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
                  <span className="font-bold text-slate-700 block text-[11px]">
                    Target Corroborating Source:
                  </span>
                  <span className="text-indigo-700 font-medium font-mono">{gap.targetCorroboration}</span>
                </div>

                {/* Specific Questions */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Discovery &amp; Interrogatory Target:
                  </span>
                  <p className="text-xs text-slate-700 italic">
                    "{gap.recommendedQuestion}"
                  </p>
                </div>
              </div>

              {/* Suggested Action Bar */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-[11px] font-medium text-slate-500">
                  Action: <strong className="text-slate-800">{gap.suggestedAction}</strong>
                </span>
                <button
                  onClick={() => onToggleGapResolved(gap.id)}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded transition-colors flex items-center gap-1 ${
                    gap.resolved 
                      ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' 
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{gap.resolved ? 'Completed' : 'Mark Resolved'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 font-serif">Flag Evidentiary Gap</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-xs">✕</button>
            </div>

            <form onSubmit={handleCreateGap} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Gap Subject / Missing Evidence</label>
                <input
                  type="text"
                  required
                  value={newGap.gapDescription}
                  onChange={(e) => setNewGap({ ...newGap, gapDescription: e.target.value })}
                  placeholder="e.g. Specialist Medical Assessment Notes"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target Corroborating Source</label>
                <input
                  type="text"
                  required
                  value={newGap.targetCorroboration}
                  onChange={(e) => setNewGap({ ...newGap, targetCorroboration: e.target.value })}
                  placeholder="e.g. Midland Paediatric Clinic"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Urgency</label>
                  <select
                    value={newGap.urgency}
                    onChange={(e) => setNewGap({ ...newGap, urgency: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                  >
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Routine">Routine</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Suggested Procedural Step</label>
                  <input
                    type="text"
                    value={newGap.suggestedAction}
                    onChange={(e) => setNewGap({ ...newGap, suggestedAction: e.target.value })}
                    placeholder="e.g. Issue Rule 15.01 Subpoena"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target Question to Ask</label>
                <textarea
                  rows={2}
                  value={newGap.recommendedQuestion}
                  onChange={(e) => setNewGap({ ...newGap, recommendedQuestion: e.target.value })}
                  placeholder="e.g. Did the treating clinician record parental notification?"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs"
                >
                  Save Gap
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
