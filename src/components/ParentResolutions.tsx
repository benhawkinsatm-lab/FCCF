import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Users,
  Sparkles,
  Loader2,
  AlertCircle,
  Plus,
  Trash2,
  Pencil,
  Download,
  X,
  Check,
  Filter,
  MessagesSquare,
} from 'lucide-react';
import { ParentResolutionRequest, DocumentRecord, CommunicationMessage } from '../types';

interface ParentResolutionsProps {
  resolutions: ParentResolutionRequest[];
  documents: DocumentRecord[];
  communicationMessages: CommunicationMessage[];
  onAdd: (item: ParentResolutionRequest) => void;
  onUpdate: (item: ParentResolutionRequest) => void;
  onDelete: (id: string) => void;
  onGenerate: (generated: ParentResolutionRequest[]) => void;
}

type CategoryOpt = ParentResolutionRequest['category'];
type StatusOpt = ParentResolutionRequest['responseStatus'];
type ToneOpt = ParentResolutionRequest['toneOfParties'];
type ProductivityOpt = ParentResolutionRequest['productivity'];
type PartyOpt = ParentResolutionRequest['requestedBy'];

const CATEGORIES: CategoryOpt[] = ['Medical', 'School', 'Care Arrangements', 'Financial', 'Legal', 'Extracurricular', 'Other'];
const STATUSES: StatusOpt[] = ['Open', 'In Progress', 'Closed', 'Unresponded'];
const TONES: ToneOpt[] = ['Hostile', 'Neutral', 'Cooperative'];
const PRODUCTIVITY: ProductivityOpt[] = ['Productive', 'Partially Productive', 'Non-Productive', 'Unassessed'];
const PARTIES: PartyOpt[] = ['Benjamin Hawkins', 'Sue-Anne Hawkins', 'Third Party'];

const STATUS_BADGE: Record<StatusOpt, string> = {
  Open: 'bg-blue-100 text-blue-700 border-blue-200',
  'In Progress': 'bg-amber-100 text-amber-700 border-amber-200',
  Closed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Unresponded: 'bg-rose-100 text-rose-700 border-rose-200',
};

const TONE_BADGE: Record<ToneOpt, string> = {
  Hostile: 'bg-rose-100 text-rose-700 border-rose-200',
  Neutral: 'bg-slate-100 text-slate-600 border-slate-200',
  Cooperative: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

const PRODUCTIVITY_BADGE: Record<ProductivityOpt, string> = {
  Productive: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Partially Productive': 'bg-amber-100 text-amber-700 border-amber-200',
  'Non-Productive': 'bg-rose-100 text-rose-700 border-rose-200',
  Unassessed: 'bg-slate-100 text-slate-600 border-slate-200',
};

const CATEGORY_BADGE: Record<CategoryOpt, string> = {
  Medical: 'bg-rose-100 text-rose-700 border-rose-200',
  School: 'bg-blue-100 text-blue-700 border-blue-200',
  'Care Arrangements': 'bg-indigo-100 text-indigo-700 border-indigo-200',
  Financial: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Legal: 'bg-purple-100 text-purple-700 border-purple-200',
  Extracurricular: 'bg-amber-100 text-amber-700 border-amber-200',
  Other: 'bg-slate-100 text-slate-600 border-slate-200',
};

function emptyForm(): ParentResolutionRequest {
  return {
    id: `PR-${Date.now()}`,
    dateOfRequest: new Date().toISOString().split('T')[0],
    requestedBy: 'Benjamin Hawkins',
    requestedTo: 'Sue-Anne Hawkins',
    informationRequested: '',
    category: 'Other',
    responseStatus: 'Open',
    informationProvided: '',
    toneOfParties: 'Neutral',
    productivity: 'Unassessed',
    originDocIds: [],
    detectedBy: 'Manual',
    notes: '',
  };
}

export const ParentResolutions: React.FC<ParentResolutionsProps> = ({
  resolutions,
  documents,
  communicationMessages,
  onAdd,
  onUpdate,
  onDelete,
  onGenerate,
}) => {
  const [categoryFilter, setCategoryFilter] = useState<'All' | CategoryOpt>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | StatusOpt>('All');
  const [toneFilter, setToneFilter] = useState<'All' | ToneOpt>('All');
  const [productivityFilter, setProductivityFilter] = useState<'All' | ProductivityOpt>('All');
  const [partyFilter, setPartyFilter] = useState<'All' | PartyOpt>('All');
  const [searchText, setSearchText] = useState('');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState<ParentResolutionRequest>(emptyForm());
  const [isEditing, setIsEditing] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const autoGenerateAttempted = useRef(false);

  const handleGenerateFromDocuments = async () => {
    setIsGenerating(true);
    setGenerationError(null);
    try {
      const res = await fetch('/api/gemini/generate-parent-resolutions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documents, communicationMessages }),
      });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data = await res.json();
      const generated: ParentResolutionRequest[] = Array.isArray(data.requests) ? data.requests : [];
      if (generated.length === 0) {
        setGenerationError(data.note || 'No inter-parent requests could be extracted from the material currently in the case record.');
      } else {
        onGenerate(generated);
      }
    } catch (err) {
      setGenerationError('AI generation failed. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Auto-populate once on first load when the table is empty and there is
  // candidate material to extract from, mirroring Communication Analytics --
  // never overrides existing rows and never loops on a genuine empty result.
  useEffect(() => {
    if (autoGenerateAttempted.current) return;
    if (resolutions.length > 0) return;
    const hasCandidateMaterial = communicationMessages.length > 0 || documents.some(
      d => d.category === 'Direct Communication' || d.fileType === 'sms' || d.fileType === 'email' || d.fileType === 'court_order' || d.fileType === 'medical_report' || d.fileType === 'school_record'
    );
    if (!hasCandidateMaterial) return;
    autoGenerateAttempted.current = true;
    handleGenerateFromDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documents, communicationMessages, resolutions.length]);

  const filtered = useMemo(() => {
    return resolutions.filter(r => {
      if (categoryFilter !== 'All' && r.category !== categoryFilter) return false;
      if (statusFilter !== 'All' && r.responseStatus !== statusFilter) return false;
      if (toneFilter !== 'All' && r.toneOfParties !== toneFilter) return false;
      if (productivityFilter !== 'All' && r.productivity !== productivityFilter) return false;
      if (partyFilter !== 'All' && r.requestedBy !== partyFilter && r.requestedTo !== partyFilter) return false;
      if (searchText.trim()) {
        const q = searchText.trim().toLowerCase();
        const haystack = `${r.informationRequested} ${r.informationProvided} ${r.notes || ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    }).sort((a, b) => (b.dateOfRequest || '').localeCompare(a.dateOfRequest || ''));
  }, [resolutions, categoryFilter, statusFilter, toneFilter, productivityFilter, partyFilter, searchText]);

  const openAddForm = () => {
    setFormData(emptyForm());
    setIsEditing(false);
    setIsFormOpen(true);
  };

  const openEditForm = (item: ParentResolutionRequest) => {
    setFormData({ ...item });
    setIsEditing(true);
    setIsFormOpen(true);
  };

  const handleSaveForm = () => {
    if (!formData.informationRequested.trim()) return;
    if (isEditing) {
      onUpdate(formData);
    } else {
      onAdd(formData);
    }
    setIsFormOpen(false);
  };

  const handleExportCsv = () => {
    const header = 'Date of Request,Requested By,Information Requested,Category,Requested To,Response Status,Information Provided,Tone of Parties,Productivity\n';
    const esc = (v: string) => `"${(v || '').replace(/"/g, '""')}"`;
    const rows = filtered.map(r => [
      esc(r.dateOfRequest),
      esc(r.requestedBy),
      esc(r.informationRequested),
      esc(r.category),
      esc(r.requestedTo),
      esc(r.responseStatus),
      esc(r.informationProvided),
      esc(r.toneOfParties),
      esc(r.productivity),
    ].join(',')).join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Parent_Resolutions_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openCount = resolutions.filter(r => r.responseStatus === 'Open' || r.responseStatus === 'Unresponded').length;

  return (
    <div className="space-y-5 pb-16">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <MessagesSquare className="w-5 h-5 text-indigo-600" />
            Parent Resolutions
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Requests for information or confirmation exchanged between the parties, and how each was resolved.
            {resolutions.length > 0 && (
              <span className="ml-1 font-medium text-slate-600">
                {resolutions.length} total &middot; {openCount} still open/unresponded
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleGenerateFromDocuments}
            disabled={isGenerating}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-semibold transition-colors"
          >
            {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {isGenerating ? 'Analyzing…' : 'Generate from Documents'}
          </button>
          <button
            onClick={handleExportCsv}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-slate-700 text-xs font-semibold transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            onClick={openAddForm}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Request
          </button>
        </div>
      </div>

      {generationError && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{generationError}</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 bg-white border border-slate-200 rounded-xl p-3">
        <Filter className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          type="text"
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          placeholder="Search requests…"
          className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-400 min-w-[160px] flex-1"
        />
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value as any)} className="text-xs px-2 py-1.5 rounded-lg border border-slate-200 bg-white">
          <option value="All">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="text-xs px-2 py-1.5 rounded-lg border border-slate-200 bg-white">
          <option value="All">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={toneFilter} onChange={e => setToneFilter(e.target.value as any)} className="text-xs px-2 py-1.5 rounded-lg border border-slate-200 bg-white">
          <option value="All">All Tones</option>
          {TONES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={productivityFilter} onChange={e => setProductivityFilter(e.target.value as any)} className="text-xs px-2 py-1.5 rounded-lg border border-slate-200 bg-white">
          <option value="All">All Productivity</option>
          {PRODUCTIVITY.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={partyFilter} onChange={e => setPartyFilter(e.target.value as any)} className="text-xs px-2 py-1.5 rounded-lg border border-slate-200 bg-white">
          <option value="All">Either Party</option>
          {PARTIES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white border border-dashed border-slate-200 rounded-xl">
          {isGenerating ? (
            <>
              <Loader2 className="w-8 h-8 text-indigo-400 mx-auto mb-3 animate-spin" />
              <p className="text-sm text-slate-500">Analyzing ingested documents and communications…</p>
            </>
          ) : (
            <>
              <Users className="w-8 h-8 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">
                {resolutions.length === 0
                  ? 'No parent resolution requests yet. Use "Generate from Documents" or add one manually.'
                  : 'No requests match the current filters.'}
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-left text-slate-500 uppercase tracking-wide">
                <th className="px-3 py-2.5 font-semibold">Date</th>
                <th className="px-3 py-2.5 font-semibold">Requested By</th>
                <th className="px-3 py-2.5 font-semibold min-w-[180px]">Information Requested</th>
                <th className="px-3 py-2.5 font-semibold">Category</th>
                <th className="px-3 py-2.5 font-semibold">Requested To</th>
                <th className="px-3 py-2.5 font-semibold">Status</th>
                <th className="px-3 py-2.5 font-semibold min-w-[180px]">Information Provided</th>
                <th className="px-3 py-2.5 font-semibold">Tone</th>
                <th className="px-3 py-2.5 font-semibold">Productivity</th>
                <th className="px-3 py-2.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50 align-top">
                  <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{r.dateOfRequest || '—'}</td>
                  <td className="px-3 py-2.5 text-slate-700 font-medium whitespace-nowrap">{r.requestedBy}</td>
                  <td className="px-3 py-2.5 text-slate-700">{r.informationRequested}</td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-block px-2 py-0.5 rounded-full border text-[11px] font-medium ${CATEGORY_BADGE[r.category]}`}>{r.category}</span>
                  </td>
                  <td className="px-3 py-2.5 text-slate-700 font-medium whitespace-nowrap">{r.requestedTo}</td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-block px-2 py-0.5 rounded-full border text-[11px] font-medium ${STATUS_BADGE[r.responseStatus]}`}>{r.responseStatus}</span>
                  </td>
                  <td className="px-3 py-2.5 text-slate-600">{r.informationProvided || <span className="text-slate-300 italic">None recorded</span>}</td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-block px-2 py-0.5 rounded-full border text-[11px] font-medium ${TONE_BADGE[r.toneOfParties]}`}>{r.toneOfParties}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-block px-2 py-0.5 rounded-full border text-[11px] font-medium ${PRODUCTIVITY_BADGE[r.productivity]}`}>{r.productivity}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEditForm(r)} title="Edit" className="p-1.5 rounded-md hover:bg-slate-200 text-slate-500 hover:text-slate-700">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      {confirmDeleteId === r.id ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => { onDelete(r.id); setConfirmDeleteId(null); }} title="Confirm delete" className="p-1.5 rounded-md bg-rose-100 text-rose-700 hover:bg-rose-200">
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setConfirmDeleteId(null)} title="Cancel" className="p-1.5 rounded-md hover:bg-slate-200 text-slate-500">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmDeleteId(r.id)} title="Delete" className="p-1.5 rounded-md hover:bg-rose-100 text-slate-400 hover:text-rose-600">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setIsFormOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-800">{isEditing ? 'Edit Request' : 'Add Request'}</h3>
              <button onClick={() => setIsFormOpen(false)} className="p-1 rounded-md hover:bg-slate-100 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 uppercase">Date of Request</label>
                  <input type="date" value={formData.dateOfRequest} onChange={e => setFormData({ ...formData, dateOfRequest: e.target.value })} className="w-full mt-1 text-xs px-2.5 py-1.5 rounded-lg border border-slate-200" />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 uppercase">Category</label>
                  <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value as CategoryOpt })} className="w-full mt-1 text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 uppercase">Requested By</label>
                  <select value={formData.requestedBy} onChange={e => setFormData({ ...formData, requestedBy: e.target.value as PartyOpt })} className="w-full mt-1 text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white">
                    {PARTIES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 uppercase">Requested To</label>
                  <select value={formData.requestedTo} onChange={e => setFormData({ ...formData, requestedTo: e.target.value as PartyOpt })} className="w-full mt-1 text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white">
                    {PARTIES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase">Information Requested</label>
                <textarea value={formData.informationRequested} onChange={e => setFormData({ ...formData, informationRequested: e.target.value })} rows={2} className="w-full mt-1 text-xs px-2.5 py-1.5 rounded-lg border border-slate-200" />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase">Information Provided</label>
                <textarea value={formData.informationProvided} onChange={e => setFormData({ ...formData, informationProvided: e.target.value })} rows={2} className="w-full mt-1 text-xs px-2.5 py-1.5 rounded-lg border border-slate-200" />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 uppercase">Response Status</label>
                  <select value={formData.responseStatus} onChange={e => setFormData({ ...formData, responseStatus: e.target.value as StatusOpt })} className="w-full mt-1 text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white">
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 uppercase">Tone</label>
                  <select value={formData.toneOfParties} onChange={e => setFormData({ ...formData, toneOfParties: e.target.value as ToneOpt })} className="w-full mt-1 text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white">
                    {TONES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 uppercase">Productivity</label>
                  <select value={formData.productivity} onChange={e => setFormData({ ...formData, productivity: e.target.value as ProductivityOpt })} className="w-full mt-1 text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white">
                    {PRODUCTIVITY.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase">Notes (optional)</label>
                <textarea value={formData.notes || ''} onChange={e => setFormData({ ...formData, notes: e.target.value })} rows={2} className="w-full mt-1 text-xs px-2.5 py-1.5 rounded-lg border border-slate-200" />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-5">
              <button onClick={() => setIsFormOpen(false)} className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
              <button
                onClick={handleSaveForm}
                disabled={!formData.informationRequested.trim()}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
              >
                {isEditing ? 'Save Changes' : 'Add Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
