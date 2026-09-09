import React, { useState } from 'react';
import {
  X,
  Highlighter,
  StickyNote,
  Plus,
  Trash2,
  Check,
  Tag,
  Calendar,
  User,
  Quote,
  Sparkles
} from 'lucide-react';
import { DocumentRecord } from '../../types';
import { DocumentAnnotation, AnnotationColor } from './types';

interface DocumentAnnotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: DocumentRecord;
  annotations: DocumentAnnotation[];
  onSaveAnnotation: (ann: DocumentAnnotation) => void;
  onDeleteAnnotation: (id: string) => void;
}

const COLOR_OPTIONS: { key: AnnotationColor; label: string; bgClass: string; borderClass: string; textClass: string }[] = [
  { key: 'yellow', label: 'Yellow', bgClass: 'bg-yellow-100', borderClass: 'border-yellow-400', textClass: 'text-yellow-900' },
  { key: 'amber', label: 'Amber', bgClass: 'bg-amber-100', borderClass: 'border-amber-400', textClass: 'text-amber-900' },
  { key: 'emerald', label: 'Green', bgClass: 'bg-emerald-100', borderClass: 'border-emerald-400', textClass: 'text-emerald-900' },
  { key: 'sky', label: 'Blue', bgClass: 'bg-sky-100', borderClass: 'border-sky-400', textClass: 'text-sky-900' },
  { key: 'rose', label: 'Rose', bgClass: 'bg-rose-100', borderClass: 'border-rose-400', textClass: 'text-rose-900' },
  { key: 'purple', label: 'Purple', bgClass: 'bg-purple-100', borderClass: 'border-purple-400', textClass: 'text-purple-900' },
];

const PRESET_TAGS = [
  'Order Breach',
  'Direct Contradiction',
  'Financial Non-Disclosure',
  'Third-Party Corroboration',
  'Child Well-Being',
  'Hostile Communication',
  'Urgent Legal Filing'
];

export const DocumentAnnotationModal: React.FC<DocumentAnnotationModalProps> = ({
  isOpen,
  onClose,
  document,
  annotations,
  onSaveAnnotation,
  onDeleteAnnotation
}) => {
  const docAnnotations = annotations.filter(a => a.docId === document.id);

  const [snippet, setSnippet] = useState('');
  const [comment, setComment] = useState('');
  const [color, setColor] = useState<AnnotationColor>('amber');
  const [annotationType, setAnnotationType] = useState<'highlight' | 'sticky_note'>('sticky_note');
  const [categoryTag, setCategoryTag] = useState('Order Breach');
  const [author, setAuthor] = useState('Benjamin Hawkins (Applicant)');
  const [isSuccessFeedback, setIsSuccessFeedback] = useState(false);

  if (!isOpen) return null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim() && !snippet.trim()) return;

    const newAnn: DocumentAnnotation = {
      id: `ann-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      docId: document.id,
      type: annotationType,
      textSnippet: snippet.trim() || document.excerpt || document.title,
      comment: comment.trim() || 'Evidentiary notation for court filing bundle.',
      color,
      author: author.trim() || 'Deponent',
      createdAt: new Date().toISOString().split('T')[0],
      categoryTag: categoryTag.trim() || undefined
    };

    onSaveAnnotation(newAnn);
    setSnippet('');
    setComment('');
    setIsSuccessFeedback(true);
    setTimeout(() => setIsSuccessFeedback(false), 2000);
  };

  const handleUseExcerptAsSnippet = () => {
    if (document.excerpt) {
      setSnippet(document.excerpt);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-xl text-amber-800">
              <Highlighter className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 font-serif">
                Exhibit Annotations &amp; Sticky Notes
              </h2>
              <p className="text-xs text-slate-500 truncate max-w-md">
                {document.annexureNumber ? `${document.annexureNumber}: ` : ''}{document.title}
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

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Document Reference Banner */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs space-y-2">
            <div className="flex items-center justify-between text-slate-500 font-mono text-[11px]">
              <span>Date: {document.date}</span>
              <span>Source: {document.sourceOrigin}</span>
              <span>Category: {document.category}</span>
            </div>
            <div className="italic text-slate-700 font-serif bg-white p-2.5 rounded border border-slate-200 relative">
              <Quote className="w-3.5 h-3.5 text-slate-400 inline mr-1 -mt-1" />
              "{document.excerpt || document.fullText?.substring(0, 180)}..."
              {document.excerpt && (
                <button
                  type="button"
                  onClick={handleUseExcerptAsSnippet}
                  className="mt-1.5 text-[10px] text-amber-700 font-semibold hover:underline block cursor-pointer"
                >
                  Use this quote as highlighted snippet
                </button>
              )}
            </div>
          </div>

          {/* Form to Add New Annotation */}
          <form onSubmit={handleCreate} className="bg-amber-50/40 rounded-xl p-4 border border-amber-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                <StickyNote className="w-3.5 h-3.5" />
                Add New Highlight or Sticky Note
              </span>
              <div className="flex items-center gap-1 bg-amber-100/70 p-0.5 rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => setAnnotationType('sticky_note')}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                    annotationType === 'sticky_note' ? 'bg-white text-amber-900 shadow-2xs' : 'text-amber-800'
                  }`}
                >
                  Sticky Note
                </button>
                <button
                  type="button"
                  onClick={() => setAnnotationType('highlight')}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                    annotationType === 'highlight' ? 'bg-white text-amber-900 shadow-2xs' : 'text-amber-800'
                  }`}
                >
                  Text Highlight
                </button>
              </div>
            </div>

            {/* Quoted / Highlighted Text Snippet */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Highlighted Text Quote / Subject:
              </label>
              <textarea
                value={snippet}
                onChange={(e) => setSnippet(e.target.value)}
                placeholder="Paste or type the specific passage to highlight from this exhibit..."
                rows={2}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
              />
            </div>

            {/* Legal Commentary / Sticky Note Note */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Legal Commentary / Sticky Note Note:
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="e.g. Demonstrates direct non-compliance with Order 4.3; cross-reference with Bank Statement Exhibit BJH-4..."
                rows={2}
                required
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
              />
            </div>

            {/* Color & Presets */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                  Highlight Color Theme:
                </label>
                <div className="flex items-center gap-1.5">
                  {COLOR_OPTIONS.map(c => (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => setColor(c.key)}
                      className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                        c.bgClass
                      } ${c.borderClass} ${color === c.key ? 'scale-115 ring-2 ring-slate-800' : 'hover:scale-105'}`}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                  Legal Category Tag:
                </label>
                <select
                  value={categoryTag}
                  onChange={(e) => setCategoryTag(e.target.value)}
                  className="w-full text-xs py-1.5 px-2 rounded-lg border border-slate-300 bg-white text-slate-800"
                >
                  {PRESET_TAGS.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <span className="text-[10px] text-slate-500">
                Will be embedded as an annotated callout in the PDF bundle export.
              </span>
              <button
                type="submit"
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition cursor-pointer"
              >
                {isSuccessFeedback ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                <span>{isSuccessFeedback ? 'Added!' : 'Add Annotation'}</span>
              </button>
            </div>
          </form>

          {/* List of Existing Annotations */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
              <span>Active Annotations for this Exhibit ({docAnnotations.length})</span>
            </h3>

            {docAnnotations.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
                No sticky notes or highlights added to this document yet. Use the form above to add an evidentiary note.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2.5">
                {docAnnotations.map((ann) => {
                  const col = COLOR_OPTIONS.find(c => c.key === ann.color) || COLOR_OPTIONS[0];
                  return (
                    <div
                      key={ann.id}
                      className={`p-3.5 rounded-xl border relative shadow-2xs space-y-1.5 ${col.bgClass} ${col.borderClass}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-white/80 border ${col.borderClass} ${col.textClass}`}>
                            {ann.type === 'highlight' ? 'Highlight' : 'Sticky Note'}
                          </span>
                          {ann.categoryTag && (
                            <span className="text-[10px] font-semibold text-slate-700 bg-white/60 px-1.5 py-0.5 rounded border border-slate-300">
                              #{ann.categoryTag}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => onDeleteAnnotation(ann.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                          title="Delete annotation"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {ann.textSnippet && (
                        <div className="text-xs italic text-slate-800 font-serif border-l-2 border-slate-400 pl-2">
                          "{ann.textSnippet}"
                        </div>
                      )}

                      <div className="text-xs text-slate-900 font-medium">
                        {ann.comment}
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-300/40">
                        <span>Author: {ann.author}</span>
                        <span>{ann.createdAt}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
