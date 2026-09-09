import React, { useState } from 'react';
import {
  X,
  Tags,
  Plus,
  Check,
  FolderCheck,
  Layers
} from 'lucide-react';
import { DocumentRecord } from '../../types';

interface BinderBatchTagModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDocuments: DocumentRecord[];
  allLibraryTags: string[];
  onApplyBatchTags: (targetDocIds: string[], tags: string[], action: 'add' | 'replace' | 'remove') => void;
}

const PRESET_BATCH_TAGS = [
  'Financial',
  'Communications',
  'Court Orders',
  'Medical',
  'School Records',
  'Extracurricular',
  'Third-Party Audits',
  'Police & Incident',
  'High Priority',
  'Contravention Proof'
];

export const BinderBatchTagModal: React.FC<BinderBatchTagModalProps> = ({
  isOpen,
  onClose,
  selectedDocuments,
  allLibraryTags,
  onApplyBatchTags
}) => {
  const [selectedTags, setSelectedTags] = useState<string[]>(['Financial']);
  const [customTagInput, setCustomTagInput] = useState('');
  const [batchAction, setBatchAction] = useState<'add' | 'replace' | 'remove'>('add');
  const [isSuccessFeedback, setIsSuccessFeedback] = useState(false);

  if (!isOpen) return null;

  const toggleTagSelection = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleAddCustomTag = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = customTagInput.trim().replace(/^#/, '');
    if (!clean) return;
    if (!selectedTags.includes(clean)) {
      setSelectedTags(prev => [...prev, clean]);
    }
    setCustomTagInput('');
  };

  const handleExecute = () => {
    if (selectedTags.length === 0) return;
    const targetDocIds = selectedDocuments.map(d => d.id);
    onApplyBatchTags(targetDocIds, selectedTags, batchAction);
    setIsSuccessFeedback(true);
    setTimeout(() => {
      setIsSuccessFeedback(false);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-xl text-indigo-800">
              <Tags className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 font-serif">
                Batch Categorize &amp; Tag Documents
              </h2>
              <p className="text-xs text-slate-500">
                Apply category tags to {selectedDocuments.length} selected evidence documents for grouped binder export
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Target Documents Preview */}
          <div className="bg-indigo-50/60 rounded-xl p-3 border border-indigo-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-700" />
              <span className="text-xs font-semibold text-indigo-950">
                Targeting <strong className="font-bold">{selectedDocuments.length}</strong> selected documents in binder
              </span>
            </div>
            <span className="text-[11px] text-indigo-700 font-mono">
              BJH-1 to BJH-{selectedDocuments.length}
            </span>
          </div>

          {/* Action Type */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Batch Operation:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setBatchAction('add')}
                className={`py-2 px-3 rounded-lg border text-xs font-semibold text-center transition cursor-pointer ${
                  batchAction === 'add'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                + Add Tags
              </button>
              <button
                type="button"
                onClick={() => setBatchAction('replace')}
                className={`py-2 px-3 rounded-lg border text-xs font-semibold text-center transition cursor-pointer ${
                  batchAction === 'replace'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                ⇄ Replace Tags
              </button>
              <button
                type="button"
                onClick={() => setBatchAction('remove')}
                className={`py-2 px-3 rounded-lg border text-xs font-semibold text-center transition cursor-pointer ${
                  batchAction === 'remove'
                    ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                - Remove Tags
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {batchAction === 'add' && 'Appends the selected tags to the documents while keeping existing ones.'}
              {batchAction === 'replace' && 'Replaces all existing tags on the selected documents with these new tags.'}
              {batchAction === 'remove' && 'Removes these specific tags from the selected documents.'}
            </p>
          </div>

          {/* Preset Category Tags */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Select Preset Legal Tags:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_BATCH_TAGS.map(tag => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTagSelection(tag)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-amber-500 text-white border-amber-500 shadow-2xs'
                        : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    <span>#{tag}</span>
                    {isSelected && <Check className="w-3 h-3" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Add Custom Tag */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Or Type a Custom Tag:
            </label>
            <form onSubmit={handleAddCustomTag} className="flex gap-2">
              <input
                type="text"
                value={customTagInput}
                onChange={(e) => setCustomTagInput(e.target.value)}
                placeholder="e.g. Subpoena, Supervised Visit, Bank Statements..."
                className="flex-1 text-xs py-2 px-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 bg-white"
              />
              <button
                type="submit"
                className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs rounded-lg flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </form>
          </div>

          {/* Selected Tags Summary */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
              Tags to be applied ({selectedTags.length}):
            </span>
            {selectedTags.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No tags selected.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {selectedTags.map(t => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300"
                  >
                    #{t}
                    <button
                      type="button"
                      onClick={() => toggleTagSelection(t)}
                      className="hover:text-rose-700 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:text-slate-800 font-semibold text-xs"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExecute}
            disabled={selectedTags.length === 0}
            className={`px-5 py-2 font-bold text-xs rounded-lg shadow-sm flex items-center gap-1.5 transition cursor-pointer ${
              selectedTags.length === 0
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            {isSuccessFeedback ? <Check className="w-3.5 h-3.5" /> : <FolderCheck className="w-3.5 h-3.5" />}
            <span>{isSuccessFeedback ? 'Batch Tags Applied!' : `Apply to ${selectedDocuments.length} Documents`}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
