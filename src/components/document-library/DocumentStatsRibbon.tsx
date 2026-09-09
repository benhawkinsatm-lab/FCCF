import React from 'react';
import { 
  FileText, 
  ShieldCheck, 
  Scale, 
  FolderArchive, 
  Tag
} from 'lucide-react';
import { DocumentRecord } from '../../types';

interface DocumentStatsRibbonProps {
  documents: DocumentRecord[];
  filteredCount: number;
  totalUniqueTagsCount?: number;
  onOpenTagFilter?: () => void;
}

export const DocumentStatsRibbon: React.FC<DocumentStatsRibbonProps> = ({
  documents,
  filteredCount,
  totalUniqueTagsCount,
  onOpenTagFilter,
}) => {
  const total = documents.length;
  const withAnnexures = documents.filter(d => d.annexureNumber).length;
  const swornCount = documents.filter(d => d.evidentiaryWeight === 'Sworn/Official').length;
  const thirdPartyCount = documents.filter(d => d.evidentiaryWeight === 'Third-Party Objective').length;

  const verifiedRate = total > 0 ? Math.round(((swornCount + thirdPartyCount) / total) * 100) : 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {/* Total Documents */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
        <div className="p-2 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100">
          <FileText className="w-4 h-4" />
        </div>
        <div>
          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
            Total Ingested
          </div>
          <div className="text-base font-bold text-slate-900 font-serif">
            {total} <span className="text-xs text-slate-500 font-sans font-normal">Records</span>
          </div>
        </div>
      </div>

      {/* Court Annexures */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
        <div className="p-2 rounded-lg bg-amber-50 text-amber-800 border border-amber-200">
          <FolderArchive className="w-4 h-4" />
        </div>
        <div>
          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
            Assigned Annexures
          </div>
          <div className="text-base font-bold text-amber-900 font-serif">
            {withAnnexures} <span className="text-xs text-slate-500 font-sans font-normal">BJH Series</span>
          </div>
        </div>
      </div>

      {/* Objective Evidence Ratio */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
        <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
          <ShieldCheck className="w-4 h-4" />
        </div>
        <div>
          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
            High Evidentiary Proof
          </div>
          <div className="text-base font-bold text-emerald-700 font-serif">
            {verifiedRate}% <span className="text-xs text-slate-500 font-sans font-normal">({swornCount + thirdPartyCount} verified)</span>
          </div>
        </div>
      </div>

      {/* Custom Metadata Tags */}
      <div 
        className={`bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3 ${
          onOpenTagFilter ? 'cursor-pointer hover:border-amber-300 hover:bg-amber-50/20 transition' : ''
        }`}
        onClick={onOpenTagFilter}
        title="Filter by custom metadata tags"
      >
        <div className="p-2 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
          <Tag className="w-4 h-4" />
        </div>
        <div>
          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
            Metadata Tags
          </div>
          <div className="text-base font-bold text-slate-900 font-serif">
            {totalUniqueTagsCount ?? 0} <span className="text-xs text-slate-500 font-sans font-normal">Active Tags</span>
          </div>
        </div>
      </div>

      {/* Active Selection / Filter State */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3 col-span-2 sm:col-span-1">
        <div className="p-2 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
          <Scale className="w-4 h-4" />
        </div>
        <div>
          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
            Filtered View
          </div>
          <div className="text-base font-bold text-slate-900 font-serif">
            {filteredCount} <span className="text-xs text-slate-500 font-sans font-normal">of {total} shown</span>
          </div>
        </div>
      </div>
    </div>
  );
};
