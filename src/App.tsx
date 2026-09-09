import React, { useState, useEffect, useMemo } from 'react';
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
  INITIAL_PROPOSED_ORDERS
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
  ProposedParentingOrder
} from './types';
import { Navbar, ActiveTab } from './components/Navbar';
import { DashboardOverview } from './components/DashboardOverview';
import { PartyProfiles } from './components/PartyProfiles';
import { IssuesConcerns } from './components/IssuesConcerns';
import { CourtCriteria } from './components/CourtCriteria';
import { ProposedOrders } from './components/ProposedOrders';
import { TimelineLedger } from './components/TimelineLedger';
import { BreachTimeline } from './components/BreachTimeline';
import { DiscrepancyEngine } from './components/DiscrepancyEngine';
import { ComplianceMatrix } from './components/ComplianceMatrix';
import { ResponseTracker } from './components/ResponseTracker';
import { BiffAdvisor } from './components/BiffAdvisor';
import { MediationSimulator } from './components/MediationSimulator';
import { AffidavitDrafter } from './components/AffidavitDrafter';
import { IntelligentChatbot } from './components/IntelligentChatbot';
import { GoogleDriveVault } from './components/GoogleDriveVault';
import { KnowledgeGapAnalyzer } from './components/KnowledgeGapAnalyzer';
import { CommunicationAnalytics } from './components/CommunicationAnalytics';
import { EvidenceBinder } from './components/EvidenceBinder';
import { DocumentLibrary } from './components/DocumentLibrary';
import { DocumentDetailModal } from './components/DocumentDetailModal';
import { DocumentIngestionModal } from './components/DocumentIngestionModal';
import { SelfHostedStorageModal } from './components/SelfHostedStorageModal';
import { DeleteDocumentWarningModal } from './components/document-library/DeleteDocumentWarningModal';
import { UndoDeletionToast } from './components/document-library/UndoDeletionToast';
import {
  inspectDocumentDependencies,
  executeCascadingDocumentDeletion,
  restoreDeletionSnapshot,
  DocumentDependencyDetail,
  DeletionUndoSnapshot
} from './utils/documentDependencyService';
import { Trash2, X, CheckCircle2, RotateCcw } from 'lucide-react';
import {
  CaseDataStore,
  fetchSelfHostedState,
  saveSelfHostedState,
} from './services/selfHostedStorage';

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

  // Self-Hosted Storage Sync States
  const [isStorageModalOpen, setIsStorageModalOpen] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error' | 'offline'>('synced');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [isServerInitialized, setIsServerInitialized] = useState<boolean>(false);

  // Modal States
  const [selectedDocument, setSelectedDocument] = useState<DocumentRecord | null>(null);
  const [isIngestionOpen, setIsIngestionOpen] = useState<boolean>(false);
  const [chatInitialQuery, setChatInitialQuery] = useState<string>('');
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
          if (Array.isArray(d.communicationMessages)) setCommunicationMessages(d.communicationMessages);
          if (Array.isArray(d.responseRequirements)) setResponseRequirements(d.responseRequirements);
          if (Array.isArray(d.partyProfiles)) setPartyProfiles(d.partyProfiles);
          if (Array.isArray(d.issuesConcerns)) setIssuesConcerns(d.issuesConcerns);
          if (Array.isArray(d.courtCriteria)) setCourtCriteria(d.courtCriteria);
          if (Array.isArray(d.proposedOrders)) setProposedOrders(d.proposedOrders);
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
  ]);

  const handleStoreRestored = (newStore: CaseDataStore) => {
    if (Array.isArray(newStore.documents)) setDocuments(newStore.documents);
    if (Array.isArray(newStore.timeline)) setTimeline(newStore.timeline);
    if (Array.isArray(newStore.orders)) setOrders(newStore.orders);
    if (Array.isArray(newStore.discrepancies)) setDiscrepancies(newStore.discrepancies);
    if (Array.isArray(newStore.knowledgeGaps)) setKnowledgeGaps(newStore.knowledgeGaps);
    if (Array.isArray(newStore.communicationMessages)) setCommunicationMessages(newStore.communicationMessages);
    if (Array.isArray(newStore.responseRequirements)) setResponseRequirements(newStore.responseRequirements);
    if (Array.isArray(newStore.partyProfiles)) setPartyProfiles(newStore.partyProfiles);
    if (Array.isArray(newStore.issuesConcerns)) setIssuesConcerns(newStore.issuesConcerns);
    if (Array.isArray(newStore.courtCriteria)) setCourtCriteria(newStore.courtCriteria);
    if (Array.isArray(newStore.proposedOrders)) setProposedOrders(newStore.proposedOrders);
    setSyncStatus('synced');
    setLastSyncTime(new Date().toISOString());
  };

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
  const handleAddTimelineEvent = (newEvent: TimelineEvent) => {
    setTimeline(prev => [newEvent, ...prev]);
    if (newEvent.orderBreachFlag && newEvent.breachedOrderNumber) {
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

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans selection:bg-amber-200 selection:text-slate-900">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        openIngestion={() => setIsIngestionOpen(true)}
        openStorageModal={() => setIsStorageModalOpen(true)}
        syncStatus={syncStatus}
        discrepancyCount={discrepancies.length}
        breachCount={breachCount}
        gapCount={openGapCount}
        waitingResponseCount={waitingResponseCount}
        issuesCount={issuesCount}
        tickedOrdersCount={tickedOrdersCount}
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

        {activeTab === 'profiles' && (
          <PartyProfiles
            profiles={partyProfiles}
            documents={documents}
            onUpdateProfiles={setPartyProfiles}
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
            onViewDocument={(doc) => setSelectedDocument(doc)}
            onAddDiscrepancy={handleAddDiscrepancy}
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
              setActiveTab('biff');
            }}
            onNavigateToAffidavit={() => setActiveTab('affidavit')}
            onNavigateToCompliance={() => setActiveTab('compliance')}
          />
        )}

        {activeTab === 'biff' && (
          <BiffAdvisor />
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
            onToggleGapResolved={handleToggleGapResolved}
            onAddGap={handleAddGap}
          />
        )}

        {activeTab === 'analytics' && (
          <CommunicationAnalytics
            messages={communicationMessages}
            documents={documents}
            onViewDocument={(doc) => setSelectedDocument(doc)}
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
      </main>

      {/* Global Modals */}
      <DocumentDetailModal
        document={selectedDocument}
        onClose={() => setSelectedDocument(null)}
        onDelete={(doc) => handleRequestDeleteDocuments([doc])}
      />

      {/* Delete Document Cascade Warning & Confirmation Modal */}
      {deletionDependencies && deletionDependencies.length > 0 && (
        <DeleteDocumentWarningModal
          dependencies={deletionDependencies}
          onConfirm={handleConfirmDeleteDocuments}
          onClose={handleCancelDeleteDocuments}
          isDeleting={isDeletingRecords}
        />
      )}

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

      <DocumentIngestionModal
        isOpen={isIngestionOpen}
        onClose={() => setIsIngestionOpen(false)}
        onDocumentAdded={handleDocumentAdded}
        onResponseRequirementAdded={handleAddResponseRequirement}
        onTimelineEventAdded={handleAddTimelineEvent}
      />

      <SelfHostedStorageModal
        isOpen={isStorageModalOpen}
        onClose={() => setIsStorageModalOpen(false)}
        currentStoreData={currentStoreData}
        onStoreRestored={handleStoreRestored}
        lastSyncTime={lastSyncTime}
        syncStatus={syncStatus}
      />
    </div>
  );
}
