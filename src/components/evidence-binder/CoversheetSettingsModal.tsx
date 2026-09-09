import React, { useState } from 'react';
import {
  X,
  Scale,
  Check,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { DocumentRecord } from '../../types';
import { BinderCoversheetConfig, BinderGroupingMode } from './types';

interface CoversheetSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: BinderCoversheetConfig;
  documents: DocumentRecord[];
  onSaveConfig: (updated: BinderCoversheetConfig) => void;
}

export const DEFAULT_COVERSHEET_CONFIG: BinderCoversheetConfig = {
  courtName: 'IN THE FAMILY COURT OF WESTERN AUSTRALIA',
  registry: 'Perth',
  fileNumber: '4344/2023',
  caseName: 'HAWKINS v HAWKINS',
  applicantName: 'BENJAMIN JAMES HAWKINS',
  respondentName: 'SUE-ANNE HAWKINS',
  deponentName: 'BENJAMIN JAMES HAWKINS',
  witnessTitle: 'Justice of the Peace / Australian Legal Practitioner',
  filingDate: new Date().toISOString().split('T')[0],
  bundleTitle: 'BUNDLE OF EVIDENCE & MASTER ANNEXURE INDEX',
  matterDescription: 'In the matter of parenting arrangements for Isabella Hawkins and Mason Hawkins pursuant to s 60CC of the Family Law Act 1975.',
  solicitorFirmOrDeponentNote: 'Prepared by Benjamin James Hawkins (Applicant in Person)',
  includeSummaryStats: true,
  includeTableOfContents: true,
  includeAnnotations: true,
  groupBy: 'chronological'
};

export const CoversheetSettingsModal: React.FC<CoversheetSettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  documents,
  onSaveConfig
}) => {
  const [form, setForm] = useState<BinderCoversheetConfig>(config);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleChange = (key: keyof BinderCoversheetConfig, val: any) => {
    setForm(prev => ({ ...prev, [key]: val }));
  };

  const handleReset = () => {
    setForm(DEFAULT_COVERSHEET_CONFIG);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig(form);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 600);
  };

  // Metrics summary
  const categoriesCount = new Set(documents.map(d => d.category)).size;
  const uniqueTags = new Set(documents.flatMap(d => d.tags || [])).size;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-900 rounded-xl text-amber-400">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 font-serif">
                Automated Coversheet &amp; Bundle Generator
              </h2>
              <p className="text-xs text-slate-500">
                Configure formal court headings, case title, deponent details, and grouping order
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

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {/* Automated Metrics Banner */}
          <div className="bg-amber-50 rounded-xl p-3.5 border border-amber-200 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="font-bold text-amber-950 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                Live Automated Coversheet Summary
              </span>
              <p className="text-[11px] text-amber-900">
                Coversheet prepends: <strong>{documents.length}</strong> exhibits • <strong>{categoriesCount}</strong> categories • <strong>{uniqueTags}</strong> unique tags
              </p>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="text-[11px] text-amber-800 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Reset Defaults
            </button>
          </div>

          {/* Court & Matter Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">
                Court Title (Header):
              </label>
              <input
                type="text"
                value={form.courtName}
                onChange={(e) => handleChange('courtName', e.target.value)}
                className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-800 font-serif uppercase bg-white"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Court File / Case Number:
              </label>
              <input
                type="text"
                value={form.fileNumber}
                onChange={(e) => handleChange('fileNumber', e.target.value)}
                className="w-full text-xs p-2 rounded-lg border border-slate-300 font-mono bg-white"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Filing Date:
              </label>
              <input
                type="date"
                value={form.filingDate}
                onChange={(e) => handleChange('filingDate', e.target.value)}
                className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Applicant (Deponent):
              </label>
              <input
                type="text"
                value={form.applicantName}
                onChange={(e) => handleChange('applicantName', e.target.value)}
                className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Respondent:
              </label>
              <input
                type="text"
                value={form.respondentName}
                onChange={(e) => handleChange('respondentName', e.target.value)}
                className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">
                Bundle Identification Title:
              </label>
              <input
                type="text"
                value={form.bundleTitle}
                onChange={(e) => handleChange('bundleTitle', e.target.value)}
                className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">
                Matter Context &amp; Statutory Reference:
              </label>
              <textarea
                value={form.matterDescription}
                onChange={(e) => handleChange('matterDescription', e.target.value)}
                rows={2}
                className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">
                Witness / Attestation Officer Description:
              </label>
              <input
                type="text"
                value={form.witnessTitle}
                onChange={(e) => handleChange('witnessTitle', e.target.value)}
                className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
              />
            </div>
          </div>

          {/* Grouping & Organization in Exported Binder */}
          <div className="border-t border-slate-200 pt-4 space-y-2">
            <label className="block font-bold text-slate-800 uppercase tracking-wider text-xs">
              Organization &amp; Grouping in Exported PDF:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { key: 'chronological', label: 'Chronological', desc: 'Date order' },
                { key: 'tag', label: 'By Batch Tag', desc: 'Financial, Comm, etc.' },
                { key: 'category', label: 'By Category', desc: 'Medical, Legal, etc.' },
                { key: 'weight', label: 'By Weight', desc: 'Official, Sworn, etc.' },
              ].map(opt => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => handleChange('groupBy', opt.key as BinderGroupingMode)}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                    form.groupBy === opt.key
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="font-bold text-xs">{opt.label}</div>
                  <div className={`text-[10px] ${form.groupBy === opt.key ? 'text-slate-300' : 'text-slate-500'}`}>
                    {opt.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Section Toggles */}
          <div className="border-t border-slate-200 pt-4 space-y-2">
            <label className="block font-bold text-slate-800 uppercase tracking-wider text-xs">
              Coversheet &amp; Content Inclusions:
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={form.includeSummaryStats}
                  onChange={(e) => handleChange('includeSummaryStats', e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <span className="font-semibold text-slate-900">Include Automated Statistical Summary Box</span>
                  <p className="text-[11px] text-slate-500">
                    Displays document count, category breakdown, and chronological date span on the coversheet.
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={form.includeTableOfContents}
                  onChange={(e) => handleChange('includeTableOfContents', e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <span className="font-semibold text-slate-900">Include Master Table of Annexures / Index</span>
                  <p className="text-[11px] text-slate-500">
                    Inserts Page 2 schedule mapping BJH-1 to BJH-N with dates, descriptions, categories, and source origins.
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={form.includeAnnotations}
                  onChange={(e) => handleChange('includeAnnotations', e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <div>
                  <span className="font-semibold text-amber-950">Include Highlight Annotations &amp; Sticky Notes</span>
                  <p className="text-[11px] text-amber-900">
                    Embeds highlighted text callouts, lawyer commentary, and deponent sticky notes directly into exhibit pages.
                  </p>
                </div>
              </label>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-800 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition cursor-pointer"
            >
              {savedSuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Check className="w-3.5 h-3.5" />}
              <span>{savedSuccess ? 'Settings Saved!' : 'Save Coversheet Settings'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
