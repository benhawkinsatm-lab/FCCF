import React, { useState, useEffect } from 'react';
import { 
  Tag, 
  X, 
  Plus, 
  Check, 
  Sparkles, 
  AlertCircle, 
  Bookmark
} from 'lucide-react';
import { DocumentRecord } from '../../types';

interface DocumentTagManagerModalProps {
  document: DocumentRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveTags: (docId: string, updatedTags: string[]) => void;
  allExistingTags: string[];
}

export const RECOMMENDED_LEGAL_TAGS: { name: string; category: string }[] = [
  { name: 'Order 5.1 Breach', category: 'Court Orders' },
  { name: 'Order 9.1 Breach', category: 'Court Orders' },
  { name: 'Order 13.1 Travel', category: 'Court Orders' },
  { name: 'Order 2.1 Communication', category: 'Court Orders' },
  { name: 'Form 2 Exhibit', category: 'Evidence' },
  { name: 'Affidavit Evidence', category: 'Evidence' },
  { name: 'Contradiction', category: 'Evidence' },
  { name: 'Subpoena Material', category: 'Evidence' },
  { name: 'Medical Emergency', category: 'Context' },
  { name: 'School Notice', category: 'Context' },
  { name: 'Withholding', category: 'Context' },
  { name: 'Financial Expense', category: 'Context' },
  { name: 'Unilateral Decision', category: 'Context' },
  { name: 'Urgent Review', category: 'Workflow' },
  { name: 'Flagged for Lawyer', category: 'Workflow' },
  { name: 'High Evidentiary Weight', category: 'Evidence' }
];

export const DocumentTagManagerModal: React.FC<DocumentTagManagerModalProps> = ({
  document,
  isOpen,
  onClose,
  onSaveTags,
  allExistingTags,
}) => {
  const [currentTags, setCurrentTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);

  useEffect(() => {
    if (document) {
      setCurrentTags(document.tags || []);
      setTagInput('');
      setInputError(null);
    }
  }, [document]);

  if (!isOpen || !document) return null;

  const handleAddTag = (rawTag: string) => {
    const trimmed = rawTag.trim().replace(/^#/, '');
    if (!trimmed) return;

    // Support comma-separated tags
    const tagsToAdd = trimmed
      .split(',')
      .map(t => t.trim().replace(/^#/, ''))
      .filter(t => t.length > 0);

    let addedCount = 0;
    const nextTags = [...currentTags];

    tagsToAdd.forEach(tag => {
      const exists = nextTags.some(t => t.toLowerCase() === tag.toLowerCase());
      if (!exists) {
        nextTags.push(tag);
        addedCount++;
      }
    });

    if (addedCount === 0 && tagsToAdd.length === 1) {
      setInputError(`Tag "#${tagsToAdd[0]}" is already assigned to this document.`);
      return;
    }

    setCurrentTags(nextTags);
    setTagInput('');
    setInputError(null);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setCurrentTags(prev => prev.filter(t => t.toLowerCase() !== tagToRemove.toLowerCase()));
    setInputError(null);
  };

  const handleToggleRecommended = (tagName: string) => {
    const exists = currentTags.some(t => t.toLowerCase() === tagName.toLowerCase());
    if (exists) {
      handleRemoveTag(tagName);
    } else {
      handleAddTag(tagName);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag(tagInput);
    }
  };

  const handleSave = () => {
    onSaveTags(document.id, currentTags);
    onClose();
  };

  // Filter recommendations or existing tags not yet assigned
  const otherExistingTags = allExistingTags.filter(
    t => !currentTags.some(curr => curr.toLowerCase() === t.toLowerCase())
  );

  return (
    <div 
      className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl max-w-xl w-full flex flex-col overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-amber-400 font-mono uppercase tracking-wider">
                  Custom Metadata Tags
                </span>
                {document.annexureNumber && (
                  <span className="text-[11px] font-mono font-bold bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded">
                    {document.annexureNumber}
                  </span>
                )}
                <span className="text-[11px] text-slate-400 font-mono">
                  {document.id}
                </span>
              </div>
              <h2 className="text-sm font-bold text-white line-clamp-1 mt-0.5">
                {document.title}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          {/* Active Tags on Document */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-2">
              Active Metadata Tags ({currentTags.length})
            </label>
            
            {currentTags.length === 0 ? (
              <div className="p-3 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-slate-400 italic">
                No custom tags assigned yet. Add custom tags below or pick from recommended case tags.
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5 p-3 bg-slate-50 rounded-xl border border-slate-200">
                {currentTags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-amber-300 text-amber-950 text-xs font-semibold shadow-2xs group"
                  >
                    <span>#{tag}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="p-0.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                      title={`Remove tag #${tag}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Add New Custom Tag Form */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-700 block">
              Create New Custom Tag:
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">
                  #
                </span>
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => {
                    setTagInput(e.target.value);
                    if (inputError) setInputError(null);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="e.g. Subpoenaed 12-Oct, Dr Foster Note, Order 5.1 Breach..."
                  className="w-full pl-7 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 placeholder:text-slate-400 transition"
                  id="custom-tag-input-field"
                />
              </div>
              <button
                type="button"
                onClick={() => handleAddTag(tagInput)}
                disabled={!tagInput.trim()}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl transition flex items-center gap-1.5 shrink-0 shadow-2xs cursor-pointer"
                id="add-custom-tag-btn"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Tag</span>
              </button>
            </div>
            {inputError && (
              <p className="text-[11px] text-rose-600 flex items-center gap-1 mt-1">
                <AlertCircle className="w-3 h-3" />
                <span>{inputError}</span>
              </p>
            )}
            <p className="text-[10px] text-slate-400">
              Tip: You can enter multiple tags separated by commas or press Enter to add instantly.
            </p>
          </div>

          {/* Recommended Case & Court Tags */}
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <div className="flex items-center gap-1.5 text-slate-700 font-bold text-[11px]">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Recommended Case &amp; Evidence Tags:</span>
            </div>
            
            <div className="flex flex-wrap gap-1.5">
              {RECOMMENDED_LEGAL_TAGS.map(rec => {
                const isAssigned = currentTags.some(
                  t => t.toLowerCase() === rec.name.toLowerCase()
                );
                return (
                  <button
                    key={rec.name}
                    type="button"
                    onClick={() => handleToggleRecommended(rec.name)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1 border ${
                      isAssigned
                        ? 'bg-amber-100 border-amber-400 text-amber-950 font-semibold shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-amber-50 hover:text-amber-900 hover:border-amber-200'
                    }`}
                  >
                    {isAssigned ? (
                      <Check className="w-3 h-3 text-amber-700" />
                    ) : (
                      <Plus className="w-3 h-3 text-slate-400" />
                    )}
                    <span>#{rec.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Existing Tags from Other Documents (Reuse across library) */}
          {otherExistingTags.length > 0 && (
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <div className="flex items-center gap-1.5 text-slate-600 font-semibold text-[11px]">
                <Bookmark className="w-3.5 h-3.5 text-slate-400" />
                <span>Existing Tags from Other Exhibits:</span>
              </div>
              <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-1">
                {otherExistingTags.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleAddTag(tag)}
                    className="px-2 py-0.5 rounded-md text-[11px] bg-slate-100 border border-slate-200 text-slate-700 hover:bg-amber-100 hover:text-amber-900 transition flex items-center gap-1"
                  >
                    <Plus className="w-2.5 h-2.5 text-slate-400" />
                    <span>#{tag}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500">
            Tags sync with the Chronological Ledger and Evidence Binder.
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 bg-white border border-slate-200 text-slate-700 font-medium rounded-xl hover:bg-slate-100 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
              id="save-tags-submit-btn"
            >
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Apply Tags</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
