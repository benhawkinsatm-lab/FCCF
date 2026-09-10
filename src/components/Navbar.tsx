import React from 'react';
import { 
  Scale, 
  LayoutDashboard, 
  Clock, 
  AlertTriangle, 
  CheckSquare, 
  Mail, 
  Users, 
  MessageSquare, 
  HelpCircle, 
  BarChart3, 
  FolderArchive,
  UploadCloud,
  ShieldCheck,
  CalendarDays,
  ShieldAlert,
  FileCheck,
  Database,
  FolderSync as FolderSyncIcon,
  MessagesSquare
} from 'lucide-react';
import { CASE_METADATA } from '../data/caseData';

export type ActiveTab = 
  | 'dashboard'
  | 'profiles'
  | 'issues'
  | 'criteria'
  | 'proposed-orders'
  | 'timeline'
  | 'breaches'
  | 'compliance'
  | 'responses'
  | 'discrepancies'
  | 'biff'
  | 'mediation'
  | 'affidavit'
  | 'chat'
  | 'drive'
  | 'gaps'
  | 'analytics'
  | 'binder'
  | 'documents'
  | 'parent-resolutions';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  openIngestion: () => void;
  openBulkImport?: () => void;
  openStorageModal: () => void;
  syncStatus?: 'synced' | 'syncing' | 'error' | 'offline';
  discrepancyCount: number;
  breachCount: number;
  gapCount: number;
  waitingResponseCount?: number;
  issuesCount?: number;
  tickedOrdersCount?: number;
  openParentResolutionsCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  openIngestion,
  openBulkImport,
  openStorageModal,
  syncStatus = 'synced',
  discrepancyCount,
  breachCount,
  gapCount,
  waitingResponseCount = 0,
  issuesCount = 0,
  tickedOrdersCount = 0,
  openParentResolutionsCount = 0,
}) => {
  const tabs = [
    { id: 'dashboard' as ActiveTab, label: 'Command Center', icon: LayoutDashboard },
    { id: 'profiles' as ActiveTab, label: 'Party Profiles', icon: Users },
    { id: 'issues' as ActiveTab, label: 'Issues & Concerns', icon: ShieldAlert, badge: issuesCount, badgeColor: 'bg-rose-600' },
    { id: 'criteria' as ActiveTab, label: 'Court Criteria (s60CC)', icon: Scale },
    { id: 'proposed-orders' as ActiveTab, label: 'Proposed Parenting Orders', icon: FileCheck, badge: tickedOrdersCount, badgeColor: 'bg-indigo-600' },
    { id: 'responses' as ActiveTab, label: 'Responses Required', icon: Clock, badge: waitingResponseCount, badgeColor: 'bg-rose-500' },
    { id: 'timeline' as ActiveTab, label: 'Visual Timeline', icon: Clock },
    { id: 'breaches' as ActiveTab, label: 'Breach Timeline', icon: CalendarDays, badge: breachCount, badgeColor: 'bg-rose-600' },
    { id: 'compliance' as ActiveTab, label: 'Order Compliance', icon: CheckSquare },
    { id: 'discrepancies' as ActiveTab, label: 'Discrepancy Engine', icon: AlertTriangle, badge: discrepancyCount, badgeColor: 'bg-rose-500' },
    { id: 'biff' as ActiveTab, label: 'BIFF Drafter', icon: Mail },
    { id: 'mediation' as ActiveTab, label: 'Mediation Red-Team', icon: Users },
    // 'affidavit' and 'drive' tabs hidden from navigation per user request
    // (2026-09-10) -- components/routes are left intact, just not linked here.
    { id: 'chat' as ActiveTab, label: 'Legal AI Chat', icon: MessageSquare },
    { id: 'gaps' as ActiveTab, label: 'Knowledge Gaps', icon: HelpCircle, badge: gapCount, badgeColor: 'bg-blue-500' },
    { id: 'analytics' as ActiveTab, label: 'Comm Analytics', icon: BarChart3 },
    { id: 'parent-resolutions' as ActiveTab, label: 'Parent Resolutions', icon: MessagesSquare, badge: openParentResolutionsCount, badgeColor: 'bg-amber-500' },
    { id: 'binder' as ActiveTab, label: 'Evidence Binder', icon: FolderArchive },
    { id: 'documents' as ActiveTab, label: 'Document Vault', icon: ShieldCheck },
  ];

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 sticky top-0 z-40 shadow-md">
      {/* Top Meta Bar */}
      <div className="max-w-7xl mx-auto px-4 py-2 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 font-bold tracking-tight text-amber-400">
            <Scale className="w-4 h-4" />
            <span>FCWA Case {CASE_METADATA.caseNumber}</span>
          </div>
          <span className="text-slate-600 hidden sm:inline">•</span>
          <span className="text-slate-300">
            <strong className="text-white">Applicant:</strong> {CASE_METADATA.applicant}
          </span>
          <span className="text-slate-600 hidden sm:inline">•</span>
          <span className="text-slate-300">
            <strong className="text-white">Respondent:</strong> {CASE_METADATA.respondent}
          </span>
          <span className="text-slate-600 hidden md:inline">•</span>
          <div className="hidden md:flex items-center gap-1.5 text-slate-400">
            <span>Children:</span>
            <span className="px-1.5 py-0.5 bg-slate-800 text-slate-200 rounded font-medium">Isabella (10)</span>
            <span className="px-1.5 py-0.5 bg-slate-800 text-slate-200 rounded font-medium">Mason (9)</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 rounded text-[11px] font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Strict Zero-Hallucination
          </span>

          <button
            onClick={openStorageModal}
            id="top-storage-btn"
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 rounded text-xs transition-colors flex items-center gap-1.5 shadow-sm"
            title="Self-Hosted Case Database & Storage Manager"
          >
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Self-Hosted Store</span>
            <span className={`w-1.5 h-1.5 rounded-full ${syncStatus === 'synced' ? 'bg-emerald-400 animate-pulse' : syncStatus === 'syncing' ? 'bg-amber-400 animate-spin' : 'bg-slate-400'}`}></span>
          </button>

          <button
            onClick={openIngestion}
            className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded text-xs transition-colors flex items-center gap-1 shadow-sm"
            id="top-ingest-btn"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Ingest Document / OCR</span>
          </button>

          {openBulkImport && (
            <button
              onClick={openBulkImport}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 rounded text-xs transition-colors flex items-center gap-1.5 shadow-sm"
              id="top-bulk-import-btn"
              title="Bulk-import every file in the local public/upload folder through OCR + AI ingestion"
            >
              <FolderSyncIcon className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Bulk Import Folder</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="max-w-7xl mx-auto px-4 overflow-x-auto no-scrollbar">
        <nav className="flex space-x-1 py-1.5 min-w-max" aria-label="Main Navigation">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                id={`tab-${tab.id}`}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className={`px-1.5 py-0.2 text-[10px] font-bold text-white rounded-full ${tab.badgeColor}`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
