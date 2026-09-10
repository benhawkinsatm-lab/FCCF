import { useState, useEffect, useMemo, useRef, useCallback, lazy, Suspense } from 'react';
import { 
  INITIAL_DOCUMENTS, 
  INITIAL_TIMELINE_EVENTS, 
  PARENTING_ORDERS, 
  DISCREPANCIES, 
  KNOWLEDGE_GAPS, 
  COMMUNICATION_LOGS,
  INITIAL_RESPONSE_REQUIREMENTS,
  INITIAL_PARTY_PROFILES,
  INITIAL_ISSUES_CONCERNS,
  INITIAL_COURT_CRITERIA,
  INITIAL_PROPOSED_ORDERS,
  PARENT_RESOLUTIONS
} from './data/caseData';
import { 
  DocumentRecord, 
  TimelineEvent, 
  ParentingOrder, 
  DiscrepancyItem, 
  KnowledgeGap, 
  CommunicationMessage,
  ResponseRequirement,
  PartyProfile,
  IssueConcern,
  CourtCriterion,
  ProposedParentingOrder,
  ParentResolutionRequest
} from './types';
import { Navbar, ActiveTab } from './components/Navbar';
import { DashboardOverview } from './components/DashboardOverview';
import { FloatingCaseAssistant } from './components/FloatingCaseAssistant';

// Lazy-loaded tab components for on-demand code splitting
const PartyProfiles = lazy(() => import('./components/PartyProfiles').then(m => ({ default: m.PartyProfiles })));
const IssuesConcerns = lazy(() => import('./components/IssuesConcerns').then(m => ({ default: m.IssuesConcerns })));
const CourtCriteria = lazy(() => import('./components/CourtCriteria').then(m => ({ default: m.CourtCriteria })));
const ProposedOrders = lazy(() => import('./components/ProposedOrders').then(m => ({ default: m.ProposedOrders })));
const TimelineLedger = lazy(() => import('./components/TimelineLedger').then(m => ({ default: m.TimelineLedger })));
const BreachTimeline = lazy(() => import('./components/BreachTimeline').then(m => ({ default: m.BreachTimeline })));
const DiscrepancyEngine = lazy(() => import('./components/DiscrepancyEngine').then(m => ({ default: m.DiscrepancyEngine })));
const ComplianceMatrix = lazy(() => import('./components/ComplianceMatrix').then(m => ({ default: m.ComplianceMatrix })));
const ResponseTracker = lazy(() => import('./components/ResponseTracker').then(m => ({ default: m.ResponseTracker })));
const BiffAdvisor = lazy(() => import('./components/BiffAdvisor').then(m => ({ default: m.BiffAdvisor })));
const MediationSimulator = lazy(() => import('./components/MediationSimulator').then(m => ({ default: m.MediationSimulator })));
const AffidavitDrafter = lazy(() => import('./components/AffidavitDrafter').then(m => ({ default: m.AffidavitDrafter })));
const IntelligentChatbot = lazy(() => import('./components/IntelligentChatbot').then(m => ({ default: m.IntelligentChatbot })));
const GoogleDriveVault = lazy(() => import('./components/GoogleDriveVault').then(m => ({ default: m.GoogleDriveVault })));
const KnowledgeGapAnalyzer = lazy(() => import('./components/KnowledgeGapAnalyzer').then(m => ({ default: m.KnowledgeGapAnalyzer })));
const CommunicationAnalytics = lazy(() => import('./components/CommunicationAnalytics').then(m => ({ default: m.CommunicationAnalytics })));
const ParentResolutions = lazy(() => import('./components/ParentResolutions').then(m => ({ default: m.ParentResolutions })));
const EvidenceBinder = lazy(() => import('./components/EvidenceBinder').then(m => ({ default: m.EvidenceBinder })));
const DocumentLibrary = lazy(() => import('./components/DocumentLibrary').then(m => ({ default: m.DocumentLibrary })));

// Lazy-loaded modal dialogs
const DocumentDetailModal = lazy(() => import('./components/DocumentDetailModal').then(m => ({ default: m.DocumentDetailModal })));
const DocumentIngestionModal = lazy(() => import('./components/DocumentIngestionModal').then(m => ({ default: m.DocumentIngestionModal })));
const BulkFolderImportModal = lazy(() => import('./components/BulkFolderImportModal').then(m => ({ default: m.BulkFolderImportModal })));
const SelfHostedStorageModal = lazy(() => import('./components/SelfHostedStorageModal').then(m => ({ default: m.SelfHostedStorageModal })));
const DeleteDocumentWarningModal = lazy(() => import('./components/document-library/DeleteDocumentWarningModal').then(m => ({ default: m.DeleteDocumentWarningModal })));
import { ensureAssessments } from './utils/communicationProductivity';
import { upsertProfiles, upsertTimelineEvents, upsertCommunications, timelineEventKey, isLocked } from './utils/reconcile';
import { deleteOriginalFile } from './utils/originalFileStorage';
import { UndoDeletionToast } from './components/document-library/UndoDeletionToast';
import {
  inspectDocumentDependencies,
  executeCascadingDocumentDeletion,
  restoreDeletionSnapshot,
  DocumentDependencyDetail,
  DeletionUndoSnapshot
} from './utils/documentDependencyService';
import { X, CheckCircle2 } from 'lucide-react';
import {
  CaseDataStore,
  fetchSelfHostedState,
  saveSelfHostedState,
} from './services/selfHostedStorage';

function TabLoadingSkeleton() {
  return (
    <div className="w-full space-y-6 animate-pulse py-6" role="status" aria-label="Loading tab view">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-6 bg-slate-200 rounded-lg w-56" />
          <div className="h-3.5 bg-slate-200 rounded w-80" />
        </div>
        <div className="h-9 bg-slate-200 rounded-lg w-28" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        <div className="h-24 bg-slate-200/80 rounded-xl" />
        <div className="h-24 bg-slate-200/80 rounded-xl" />
        <div className="h-24 bg-slate-200/80 rounded-xl" />
      </div>
      <div className="h-80 bg-slate-200/70 rounded-2xl mt-4" />
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [documents, setDocuments] = useState<DocumentRecord[]>(INITIAL_DOCUMENTS);
  const [timeline, setTimeline] = useState<TimelineEvent[]>(INITIAL_TIMELINE_EVENTS);
  const [orders, setOrders] = useState<ParentingOrder[]>(PARENTING_ORDERS);
  const [discrepancies, setDiscrepancies] = useState<DiscrepancyItem[]>(DISCREPANCIES);
  const [knowledgeGaps, setKnowledgeGaps] = useState<KnowledgeGap[]>(KNOWLEDGE_GAPS);
  const [communicationMessages, setCommunicationMessages] = useState<CommunicationMessage[]>(COMMUNICATION_LOGS);
  const [responseRequirements, setResponseRequirements] = useState<ResponseRequirement[]>(INITIAL_RESPONSE_REQUIREMENTS);
  const [partyProfiles, setPartyProfiles] = useState<PartyProfile[]>(INITIAL_PARTY_PROFILES);
  const [issuesConcerns, setIssuesConcerns] = useState<IssueConcern[]>(INITIAL_ISSUES_CONCERNS);
  const [courtCriteria, setCourtCriteria] = useState<CourtCriterion[]>(INITIAL_COURT_CRITERIA);
  const [proposedOrders, setProposedOrders] = useState<ProposedParentingOrder[]>(INITIAL_PROPOSED_ORDERS);
  const [parentResolutions, setParentResolutions] = useState<ParentResolutionRequest[]>(PARENT_RESOLUTIONS);

  // Self-Hosted Storage Sync States
  const [isStorageModalOpen, setIsStorageModalOpen] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error' | 'offline'>('synced');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [isServerInitialized, setIsServerInitialized] = useState<boolean>(false);

  // Modal States
  const [selectedDocument, setSelectedDocument] = useState<DocumentRecord | null>(null);
  const [isIngestionOpen, setIsIngestionOpen] = useState<boolean>(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState<boolean>(false);
  const [chatInitialQuery, setChatInitialQuery] = useState<string>('');
  const [biffInitialContext, setBiffInitialContext] = useState<string>('');
  const [binderPreselectedIds, setBinderPreselectedIds] = useState<string[] | undefined>(undefined);

  // Document Deletion & Cascade Warning States
  const [docsPendingDeletion, setDocsPendingDeletion] = useState<DocumentRecord[] | null>(null);
  const [deletionDependencies, setDeletionDependencies] = useState<DocumentDependencyDetail[] | null>(null);
  const [isDeletingRecords, setIsDeletingRecords] = useState<boolean>(false);
  const [activeUndoSnapshot, setActiveUndoSnapshot] = useState<DeletionUndoSnapshot | null>(null);
  const [restoredNotification, setRestoredNotification] = useState<{ message: string; submessage?: string } | null>(null);

  // Initialize and load from self-hosted disk on mount
  useEffect(() => {
    let isMounted = true;
    const initializeStore = async () => {
      try {
        const remote = await fetchSelfHostedState();
        if (!isMounted) return;

        if (remote.exists && remote.data) {
          const d = remote.data;
          if (Array.isArray(d.documents)) setDocuments(d.documents);
          if (Array.isArray(d.timeline)) setTimeline(d.timeline);
          if (Array.isArray(d.orders)) setOrders(d.orders);
          if (Array.isArray(d.discrepancies)) setDiscrepancies(d.discrepancies);
          if (Array.isArray(d.knowledgeGaps)) setKnowledgeGaps(d.knowledgeGaps);
          // Backfill productivity assessments so every restored message
          // carries a non-productive classification, not just new ones.
          if (Array.isArray(d.communicationMessages)) setCommunicationMessages(ensureAssessments(d.communicationMessages));
          if (Array.isArray(d.responseRequirements)) setResponseRequirements(d.responseRequirements);
          if (Array.isArray(d.partyProfiles)) setPartyProfiles(d.partyProfiles);
          if (Array.isArray(d.issuesConcerns)) setIssuesConcerns(d.issuesConcerns);
          if (Array.isArray(d.courtCriteria)) setCourtCriteria(d.courtCriteria);
          if (Array.isArray(d.proposedOrders)) setProposedOrders(d.proposedOrders);
          if (Array.isArray(d.parentResolutions)) setParentResolutions(d.parentResolutions);
          setLastSyncTime(remote.lastUpdated);
          setSyncStatus('synced');
        } else {
          // Fresh server: seed with current baseline state
          const initialPayload: CaseDataStore = {
            documents: INITIAL_DOCUMENTS,
            timeline: INITIAL_TIMELINE_EVENTS,
            orders: PARENTING_ORDERS,
            discrepancies: DISCREPANCIES,
            knowledgeGaps: KNOWLEDGE_GAPS,
            communicationMessages: COMMUNICATION_LOGS,
            responseRequirements: INITIAL_RESPONSE_REQUIREMENTS,
            partyProfiles: INITIAL_PARTY_PROFILES,
            issuesConcerns: INITIAL_ISSUES_CONCERNS,
            courtCriteria: INITIAL_COURT_CRITERIA,
            proposedOrders: INITIAL_PROPOSED_ORDERS,
            parentResolutions: PARENT_RESOLUTIONS,
          };
          const res = await saveSelfHostedState(initialPayload, false);
          if (isMounted) {
            setLastSyncTime(res.lastUpdated);
            setSyncStatus('synced');
          }
        }
      } catch (err) {
        console.warn('Initial server state fetch failed, using memory state:', err);
        if (isMounted) setSyncStatus('offline');
      } finally {
        if (isMounted) setIsServerInitialized(true);
      }
    };

    initializeStore();
    return () => {
      isMounted = false;
    };
  }, []);

  // Debounced auto-sync to self-hosted store whenever state changes
  useEffect(() => {
    if (!isServerInitialized) return;

    setSyncStatus('syncing');
    const timer = setTimeout(async () => {
      try {
        const payload: CaseDataStore = {
          documents,
          timeline,
          orders,
          discrepancies,
          knowledgeGaps,
          communicationMessages,
          responseRequirements,
          partyProfiles,
          issuesConcerns,
          courtCriteria,
          proposedOrders,
          parentResolutions,
        };
        const res = await saveSelfHostedState(payload, false);
        setLastSyncTime(res.lastUpdated);
        setSyncStatus('synced');
      } catch (err) {
        console.warn('Auto-sync to self-hosted store failed:', err);
        setSyncStatus('error');
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [
    isServerInitialized,
    documents,
    timeline,
    orders,
    discrepancies,
    knowledgeGaps,
    communicationMessages,
    responseRequirements,
    partyProfiles,
    issuesConcerns,
    courtCriteria,
    proposedOrders,
    parentResolutions,
  ]);

  const currentStoreData = useMemo<CaseDataStore>(() => ({
    documents,
    timeline,
    orders,
    discrepancies,
    knowledgeGaps,
    communicationMessages,
    responseRequirements,
    partyProfiles,
    issuesConcerns,
    courtCriteria,
    proposedOrders,
    parentResolutions,
  }), [
    documents,
    timeline,
    orders,
    discrepancies,
    knowledgeGaps,
    communicationMessages,
    responseRequirements,
    partyProfiles,
    issuesConcerns,
    courtCriteria,
    proposedOrders,
    parentResolutions,
  ]);

  const handleStoreRestored = (newStore: CaseDataStore) => {
    if (Array.isArray(newStore.documents)) setDocuments(newStore.documents);
    if (Array.isArray(newStore.timeline)) setTimeline(newStore.timeline);
    if (Array.isArray(newStore.orders)) setOrders(newStore.orders);
    if (Array.isArray(newStore.discrepancies)) setDiscrepancies(newStore.discrepancies);
    if (Array.isArray(newStore.knowledgeGaps)) setKnowledgeGaps(newStore.knowledgeGaps);
    if (Array.isArray(newStore.communicationMessages)) setCommunicationMessages(ensureAssessments(newStore.communicationMessages));
    if (Array.isArray(newStore.responseRequirements)) setResponseRequirements(newStore.responseRequirements);
    if (Array.isArray(newStore.partyProfiles)) setPartyProfiles(newStore.partyProfiles);
    if (Array.isArray(newStore.issuesConcerns)) setIssuesConcerns(newStore.issuesConcerns);
    if (Array.isArray(newStore.courtCriteria)) setCourtCriteria(newStore.courtCriteria);
    if (Array.isArray(newStore.proposedOrders)) setProposedOrders(newStore.proposedOrders);
    if (Array.isArray(newStore.parentResolutions)) setParentResolutions(newStore.parentResolutions);
    setSyncStatus('synced');
    setLastSyncTime(new Date().toISOString());
  };

  // Always-current mirror of the full case-data store, kept in sync on
  // every render (not debounced) so an immediate save can read the latest
  // committed state without waiting on the 1200ms autosave timer below.
  const latestStateRef = useRef<CaseDataStore>(currentStoreData);
  useEffect(() => {
    latestStateRef.current = currentStoreData;
  }, [currentStoreData]);

  // Snapshot of the store taken the moment a bulk import starts, used as
  // the base onto which each file's incremental progress is merged (see
  // handleBulkFileCommitted below). Captured once per run rather than
  // re-read from latestStateRef on every file, so a run's own earlier
  // flushes are never double-counted against it.
  const bulkImportBaselineRef = useRef<CaseDataStore | null>(null);
  const handleOpenBulkImport = useCallback(() => {
    bulkImportBaselineRef.current = latestStateRef.current;
    setIsBulkImportOpen(true);
  }, []);

  // Persists one bulk-import file's progress to the server immediately,
  // rather than waiting for the debounced autosave effect to notice the
  // state change and fire ~1.2s after the user goes quiet. A bulk import
  // can add dozens of documents back to back with no quiet gap between
  // them, so without this, a refresh, crashed tab, or a second open tab
  // mid-run can lose everything the run had added so far. This is purely
  // an additional, more frequent save -- it does not replace the regular
  // React state updates the modal also makes via onDocumentAdded /
  // onResponseRequirementAdded / onTimelineEventAdded, which still drive
  // the UI and the debounced autosave as before.
  const handleBulkFileCommitted = useCallback(async (progress: {
    documents: DocumentRecord[];
    responseRequirements?: ResponseRequirement[];
    timelineEvents?: TimelineEvent[];
  }) => {
    const base = bulkImportBaselineRef.current || latestStateRef.current;
    const payload: CaseDataStore = {
      ...base,
      documents: progress.documents,
      responseRequirements: progress.responseRequirements
        ? [...progress.responseRequirements, ...base.responseRequirements]
        : base.responseRequirements,
      timeline: progress.timelineEvents
        ? [...progress.timelineEvents, ...base.timeline]
        : base.timeline,
    };
    try {
      const res = await saveSelfHostedState(payload, false);
      latestStateRef.current = payload;
      setLastSyncTime(res.lastUpdated);
      setSyncStatus('synced');
    } catch (err) {
      // Non-fatal: the debounced autosave effect will retry shortly from
      // whatever the React state ends up holding. This immediate flush
      // exists only to shrink the window in which an in-progress bulk
      // import's work is unsaved -- it is not the only save path.
      console.warn('Bulk-import incremental save failed (will retry via debounced autosave):', err);
    }
  }, []);

  // Handlers
  const handleUpdateDocuments = (updatedDocs: DocumentRecord[]) => {
    setDocuments(updatedDocs);
  };

  const handleOpenBinderWithSubset = (subsetIds: string[]) => {
    setBinderPreselectedIds(subsetIds);
    setActiveTab('binder');
  };

  const handleAddResponseRequirement = (newReq: ResponseRequirement) => {
    setResponseRequirements(prev => [newReq, ...prev]);
  };
  const handleUpdateTimelineEventDirect = (updatedEvent: TimelineEvent) => {
    setTimeline(prev => prev.map(e => (e.id === updatedEvent.id ? updatedEvent : e)));
  };

  const handleAddTimelineEvent = (newEvent: TimelineEvent) => {
    const newKey = timelineEventKey(newEvent);
    const existingEvent = timeline.find(e => e.id === newEvent.id || timelineEventKey(e) === newKey);
    if (existingEvent && isLocked(existingEvent)) {
      return; // locked record: an AI/ingestion refresh must never overwrite it
    }
    setTimeline(prev => upsertTimelineEvents(prev, [newEvent]));
    if (!existingEvent && newEvent.orderBreachFlag && newEvent.breachedOrderNumber) {
      setOrders(prevOrders => 
        prevOrders.map(o => {
          if (newEvent.breachedOrderNumber?.includes(o.orderNumber)) {
            const newCount = o.breachesCount + 1;
            const newRate = Math.max(0, o.complianceRate - 12);
            return {
              ...o,
              breachesCount: newCount,
              complianceRate: newRate,
              associatedEventIds: [...o.associatedEventIds, newEvent.id],
            };
          }
          return o;
        })
      );
    }
  };

  const handleAddDiscrepancy = (newDisc: DiscrepancyItem) => {
    setDiscrepancies(prev => [newDisc, ...prev]);
  };

  const handleToggleGapResolved = (id: string) => {
    setKnowledgeGaps(prev => 
      prev.map(g => (g.id === id ? { ...g, resolved: !g.resolved } : g))
    );
  };

  const handleAddGap = (newGap: KnowledgeGap) => {
    setKnowledgeGaps(prev => [newGap, ...prev]);
  };

  const handleDocumentAdded = (newDoc: DocumentRecord) => {
    setDocuments(prev => [newDoc, ...prev]);
  };

  // Deletion Request & Cascading Execution Handlers
  const handleRequestDeleteDocuments = (docsToDelete: DocumentRecord[]) => {
    if (!docsToDelete || docsToDelete.length === 0) return;
    const deps = inspectDocumentDependencies(docsToDelete, {
      documents,
      timeline,
      orders,
      discrepancies,
      communicationMessages,
      responseRequirements,
      courtCriteria,
      issuesConcerns,
      partyProfiles,
      proposedOrders,
    });
    setDocsPendingDeletion(docsToDelete);
    setDeletionDependencies(deps);
  };

  const handleConfirmDeleteDocuments = () => {
    if (!docsPendingDeletion || docsPendingDeletion.length === 0) return;
    setIsDeletingRecords(true);

    const docIds = docsPendingDeletion.map(d => d.id);
    // Best-effort cleanup of any stored original-file copy so deleting a
    // document record does not leave an orphaned file behind on the server.
    docIds.forEach(id => deleteOriginalFile(id));
    const result = executeCascadingDocumentDeletion(docIds, {
      documents,
      timeline,
      orders,
      discrepancies,
      communicationMessages,
      responseRequirements,
      courtCriteria,
      issuesConcerns,
      partyProfiles,
      proposedOrders,
    });

    // Update state collections from updatedState
    setDocuments(result.updatedState.documents);
    setTimeline(result.updatedState.timeline);
    setOrders(result.updatedState.orders);
    setDiscrepancies(result.updatedState.discrepancies);
    setCommunicationMessages(result.updatedState.communicationMessages);
    setResponseRequirements(result.updatedState.responseRequirements);
    setCourtCriteria(result.updatedState.courtCriteria);
    setIssuesConcerns(result.updatedState.issuesConcerns);
    setPartyProfiles(result.updatedState.partyProfiles);
    setProposedOrders(result.updatedState.proposedOrders);

    // If currently viewing one of the deleted docs in modal, close it
    if (selectedDocument && docIds.includes(selectedDocument.id)) {
      setSelectedDocument(null);
    }

    // Set active undo snapshot for the grace period
    setActiveUndoSnapshot(result.undoSnapshot);
    setRestoredNotification(null);

    setDocsPendingDeletion(null);
    setDeletionDependencies(null);
    setIsDeletingRecords(false);
  };

  const handleUndoDeletion = (snapshotToUndo: DeletionUndoSnapshot) => {
    const { restoredState } = restoreDeletionSnapshot(snapshotToUndo);

    // Restore state collections
    setDocuments(restoredState.documents);
    setTimeline(restoredState.timeline);
    setOrders(restoredState.orders);
    setDiscrepancies(restoredState.discrepancies);
    setCommunicationMessages(restoredState.communicationMessages);
    setResponseRequirements(restoredState.responseRequirements);
    setCourtCriteria(restoredState.courtCriteria);
    setIssuesConcerns(restoredState.issuesConcerns);
    setPartyProfiles(restoredState.partyProfiles);
    setProposedOrders(restoredState.proposedOrders);

    // Dismiss active undo
    setActiveUndoSnapshot(null);

    // Display restoration confirmation
    const docCount = snapshotToUndo.deletedDocIds.length;
    const docTitles = snapshotToUndo.deletedDocTitles.slice(0, 2).join(', ');
    const extraDocs = snapshotToUndo.deletedDocTitles.length > 2
      ? ` and ${snapshotToUndo.deletedDocTitles.length - 2} more`
      : '';
    const cascadeCount = snapshotToUndo.summary.totalCascadeCount;

    setRestoredNotification({
      message: `Restored ${docCount} document(s) (${docTitles}${extraDocs}) to the evidentiary vault.`,
      submessage: cascadeCount > 0
        ? `Reinstated ${cascadeCount} associated items (timeline entries, contradictions, notes, and criteria links).`
        : 'All records restored to original status.'
    });

    setTimeout(() => {
      setRestoredNotification(null);
    }, 6000);
  };

  const handleCancelDeleteDocuments = () => {
    setDocsPendingDeletion(null);
    setDeletionDependencies(null);
    setIsDeletingRecords(false);
  };

  const handleQuickQuerySubmit = (query: string) => {
    setChatInitialQuery(query);
    setActiveTab('chat');
  };

  const breachCount = timeline.filter(e => e.orderBreachFlag).length;
  const openGapCount = knowledgeGaps.filter(g => !g.resolved).length;
  const waitingResponseCount = responseRequirements.filter(r => r.status === 'waiting').length;
  const tickedOrdersCount = proposedOrders.filter(o => o.selectedForAiReview).length;
  const issuesCount = issuesConcerns.length;
  const openParentResolutionsCount = parentResolutions.filter(r => r.responseStatus === 'Open' || r.responseStatus === 'Unresponded').length;

  const handleAddParentResolution = (item: ParentResolutionRequest) => {
    setParentResolutions(prev => [item, ...prev]);
  };

  const handleUpdateParentResolution = (item: ParentResolutionRequest) => {
    setParentResolutions(prev => prev.map(r => (r.id === item.id ? item : r)));
  };

  const handleDeleteParentResolution = (id: string) => {
    setParentResolutions(prev => prev.filter(r => r.id !== id));
  };

  const handleGenerateParentResolutions = (generated: ParentResolutionRequest[]) => {
    setParentResolutions(prev => {
      const byId = new Map(prev.map(r => [r.id, r]));
      generated.forEach(r => byId.set(r.id, r));
      return Array.from(byId.values());
    });
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans selection:bg-amber-200 selection:text-slate-900">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        openIngestion={() => setIsIngestionOpen(true)}
        openBulkImport={handleOpenBulkImport}
        openStorageModal={() => setIsStorageModalOpen(true)}
        syncStatus={syncStatus}
        discrepancyCount={discrepancies.length}
        breachCount={breachCount}
        gapCount={openGapCount}
        waitingResponseCount={waitingResponseCount}
        issuesCount={issuesCount}
        tickedOrdersCount={tickedOrdersCount}
        openParentResolutionsCount={openParentResolutionsCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        {activeTab === 'dashboard' && (
          <DashboardOverview
            documents={documents}
            timeline={timeline}
            orders={orders}
            discrepancies={discrepancies}
            courtCriteria={courtCriteria}
            setActiveTab={setActiveTab}
            onViewDocument={(doc) => setSelectedDocument(doc)}
            onQuickQuerySubmit={handleQuickQuerySubmit}
          />
        )}

        <Suspense fallback={<TabLoadingSkeleton />}>
        {activeTab === 'profiles' && (
          <PartyProfiles
            profiles={partyProfiles}
            documents={documents}
            timeline={timeline}
            communicationMessages={communicationMessages}
            onUpdateProfiles={(generated) => setPartyProfiles(prev => upsertProfiles(prev, generated))}
            onToggleProfileLock={(id) => setPartyProfiles(prev => prev.map(p => (p.id === id ? { ...p, immutableLock: !p.immutableLock } : p)))}
            onViewDocument={(doc) => setSelectedDocument(doc)}
            onNavigateToAffidavit={() => setActiveTab('affidavit')}
            onNavigateToBreaches={() => setActiveTab('breaches')}
          />
        )}

        {activeTab === 'issues' && (
          <IssuesConcerns
            issues={issuesConcerns}
            documents={documents}
            onUpdateIssues={setIssuesConcerns}
            onViewDocument={(doc) => setSelectedDocument(doc)}
            onNavigateToAffidavit={() => setActiveTab('affidavit')}
            onNavigateToCriteria={() => setActiveTab('criteria')}
          />
        )}

        {activeTab === 'criteria' && (
          <CourtCriteria
            criteria={courtCriteria}
            documents={documents}
            onUpdateCriteria={setCourtCriteria}
            onViewDocument={(doc) => setSelectedDocument(doc)}
            onNavigateToAffidavit={() => setActiveTab('affidavit')}
            onNavigateToProposedOrders={() => setActiveTab('proposed-orders')}
          />
        )}

        {activeTab === 'proposed-orders' && (
          <ProposedOrders
            orders={proposedOrders}
            courtCriteria={courtCriteria}
            documents={documents}
            onUpdateOrders={setProposedOrders}
            onNavigateToAffidavit={() => setActiveTab('affidavit')}
            onNavigateToCriteria={() => setActiveTab('criteria')}
            onViewDocument={(doc) => setSelectedDocument(doc)}
          />
        )}

        {activeTab === 'timeline' && (
          <TimelineLedger
            timeline={timeline}
            documents={documents}
            onViewDocument={(doc) => setSelectedDocument(doc)}
            onAddEvent={handleAddTimelineEvent}
            onUpdateEvent={handleUpdateTimelineEventDirect}
          />
        )}

        {activeTab === 'breaches' && (
          <BreachTimeline
            timeline={timeline}
            orders={orders}
            documents={documents}
            onViewDocument={(doc) => setSelectedDocument(doc)}
            onNavigateToCompliance={() => setActiveTab('compliance')}
            onNavigateToAffidavit={() => setActiveTab('affidavit')}
          />
        )}

        {activeTab === 'discrepancies' && (
          <DiscrepancyEngine
            discrepancies={discrepancies}
            documents={documents}
            timeline={timeline}
            onViewDocument={(doc) => setSelectedDocument(doc)}
            onAddDiscrepancy={handleAddDiscrepancy}
            onGenerateDiscrepancies={(generated) => setDiscrepancies(prev => {
              const byId = new Map(prev.map(d => [d.id, d]));
              generated.forEach(d => byId.set(d.id, d));
              return Array.from(byId.values());
            })}
            onNavigateToAffidavit={() => setActiveTab('affidavit')}
            onNavigateToTimeline={() => setActiveTab('timeline')}
          />
        )}

        {activeTab === 'compliance' && (
          <ComplianceMatrix
            orders={orders}
            timeline={timeline}
            documents={documents}
            onViewDocument={(doc) => setSelectedDocument(doc)}
            onNavigateToAffidavit={() => setActiveTab('affidavit')}
            onNavigateToBreachTimeline={() => setActiveTab('breaches')}
            onNavigateToResponseTracker={() => setActiveTab('responses')}
          />
        )}

        {activeTab === 'responses' && (
          <ResponseTracker
            requirements={responseRequirements}
            documents={documents}
            onUpdateRequirements={setResponseRequirements}
            onViewDocument={(doc) => setSelectedDocument(doc)}
            onNavigateToBiff={(initialTopic) => {
              if (initialTopic) {
                setBiffInitialContext(initialTopic);
              }
              setActiveTab('biff');
            }}
            onNavigateToAffidavit={() => setActiveTab('affidavit')}
            onNavigateToCompliance={() => setActiveTab('compliance')}
          />
        )}

        {activeTab === 'biff' && (
          <BiffAdvisor initialContext={biffInitialContext} />
        )}

        {activeTab === 'mediation' && (
          <MediationSimulator
            documents={documents}
            onViewDocument={(doc) => setSelectedDocument(doc)}
          />
        )}

        {activeTab === 'affidavit' && (
          <AffidavitDrafter
            timeline={timeline}
            documents={documents}
            onViewDocument={(doc) => setSelectedDocument(doc)}
          />
        )}

        {activeTab === 'chat' && (
          <IntelligentChatbot
            documents={documents}
            onViewDocument={(doc) => setSelectedDocument(doc)}
            initialQuery={chatInitialQuery}
            onClearInitialQuery={() => setChatInitialQuery('')}
          />
        )}

        {activeTab === 'drive' && (
          <GoogleDriveVault
            documents={documents}
            onDocumentImported={handleDocumentAdded}
            onTimelineEventAdded={handleAddTimelineEvent}
            onViewDocument={(doc) => setSelectedDocument(doc)}
          />
        )}

        {activeTab === 'gaps' && (
          <KnowledgeGapAnalyzer
            gaps={knowledgeGaps}
            documents={documents}
            timeline={timeline}
            onToggleGapResolved={handleToggleGapResolved}
            onAddGap={handleAddGap}
            onGenerateGaps={(generated) => setKnowledgeGaps(prev => {
              const byId = new Map(prev.map(g => [g.id, g]));
              generated.forEach(g => byId.set(g.id, g));
              return Array.from(byId.values());
            })}
          />
        )}

        {activeTab === 'analytics' && (
          <CommunicationAnalytics
            messages={communicationMessages}
            documents={documents}
            onViewDocument={(doc) => setSelectedDocument(doc)}
            onGenerateMessages={(generated) => {
              setCommunicationMessages(prev => ensureAssessments(upsertCommunications(prev, generated)));
            }}
            onUpdateMessage={(updated) => {
              setCommunicationMessages(prev => ensureAssessments(prev.map(m => (m.id === updated.id ? updated : m))));
            }}
          />
        )}

        {activeTab === 'parent-resolutions' && (
          <ParentResolutions
            resolutions={parentResolutions}
            documents={documents}
            communicationMessages={communicationMessages}
            onAdd={handleAddParentResolution}
            onUpdate={handleUpdateParentResolution}
            onDelete={handleDeleteParentResolution}
            onGenerate={handleGenerateParentResolutions}
          />
        )}

        {activeTab === 'binder' && (
          <EvidenceBinder
            documents={documents}
            onViewDocument={(doc) => setSelectedDocument(doc)}
            preselectedDocIds={binderPreselectedIds}
            timeline={timeline}
            orders={orders}
            discrepancies={discrepancies}
            courtCriteria={courtCriteria}
            onUpdateDocuments={handleUpdateDocuments}
          />
        )}

        {activeTab === 'documents' && (
          <DocumentLibrary
            documents={documents}
            onViewDocument={(doc) => setSelectedDocument(doc)}
            openIngestion={() => setIsIngestionOpen(true)}
            onUpdateDocuments={handleUpdateDocuments}
            onOpenBinderWithSubset={handleOpenBinderWithSubset}
            onNavigateToResponseTracker={() => setActiveTab('responses')}
            onDeleteDocument={(doc) => handleRequestDeleteDocuments([doc])}
            onDeleteDocuments={handleRequestDeleteDocuments}
          />
        )}
        </Suspense>
      </main>

      {/* Global Modals */}
      <Suspense fallback={null}>
        {selectedDocument && (
          <DocumentDetailModal
            document={selectedDocument}
            onClose={() => setSelectedDocument(null)}
            onDelete={(doc) => handleRequestDeleteDocuments([doc])}
          />
        )}

        {deletionDependencies && deletionDependencies.length > 0 && (
          <DeleteDocumentWarningModal
            dependencies={deletionDependencies}
            onConfirm={handleConfirmDeleteDocuments}
            onClose={handleCancelDeleteDocuments}
            isDeleting={isDeletingRecords}
          />
        )}

        {isIngestionOpen && (
          <DocumentIngestionModal
            isOpen={isIngestionOpen}
            onClose={() => setIsIngestionOpen(false)}
            onDocumentAdded={handleDocumentAdded}
            onResponseRequirementAdded={handleAddResponseRequirement}
            onTimelineEventAdded={handleAddTimelineEvent}
            existingDocuments={documents}
          />
        )}

        {isBulkImportOpen && (
          <BulkFolderImportModal
            isOpen={isBulkImportOpen}
            onClose={() => setIsBulkImportOpen(false)}
            onDocumentAdded={handleDocumentAdded}
            onResponseRequirementAdded={handleAddResponseRequirement}
            onTimelineEventAdded={handleAddTimelineEvent}
            onFileCommitted={handleBulkFileCommitted}
            existingDocuments={documents}
          />
        )}

        {isStorageModalOpen && (
          <SelfHostedStorageModal
            isOpen={isStorageModalOpen}
            onClose={() => setIsStorageModalOpen(false)}
            currentStoreData={currentStoreData}
            onStoreRestored={handleStoreRestored}
            lastSyncTime={lastSyncTime}
            syncStatus={syncStatus}
          />
        )}
      </Suspense>

      {/* Undo Deletion Toast with Grace Period */}
      {activeUndoSnapshot && (
        <UndoDeletionToast
          snapshot={activeUndoSnapshot}
          onUndo={handleUndoDeletion}
          onDismiss={() => setActiveUndoSnapshot(null)}
        />
      )}

      {/* Restoration Success Feedback Banner */}
      {restoredNotification && (
        <div 
          className="fixed bottom-6 right-6 z-50 max-w-md bg-slate-950 text-white rounded-2xl shadow-2xl border border-emerald-500/50 p-4 flex items-start gap-3 animate-in slide-in-from-bottom-5 duration-200"
          id="restoration-toast-notification"
          role="status"
        >
          <div className="p-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl shrink-0 mt-0.5">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-xs flex-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-emerald-300 uppercase tracking-wider text-[10px]">Restored to Vault</span>
            </div>
            <div className="font-bold text-slate-100 mt-0.5">{restoredNotification.message}</div>
            {restoredNotification.submessage && (
              <div className="text-slate-300 mt-1 text-[11px] leading-relaxed">{restoredNotification.submessage}</div>
            )}
          </div>
          <button 
            onClick={() => setRestoredNotification(null)}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
            id="close-restoration-toast-btn"
            title="Dismiss notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Persistent, minimisable case assistant — available on every tab.
          Queries the entire recorded store and explains coverage gaps. */}
      <FloatingCaseAssistant
        documents={documents}
        timeline={timeline}
        communicationMessages={communicationMessages}
        responseRequirements={responseRequirements}
        partyProfiles={partyProfiles}
        courtCriteria={courtCriteria}
        orders={orders}
        issuesConcerns={issuesConcerns}
        knowledgeGaps={knowledgeGaps}
        discrepancies={discrepancies}
        onViewDocument={(doc) => setSelectedDocument(doc)}
      />
    </div>
  );
}
