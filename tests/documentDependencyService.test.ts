import { describe, it, expect, beforeAll } from 'vitest';
import {
  inspectDocumentDependencies,
  executeCascadingDocumentDeletion,
  restoreDeletionSnapshot,
  CaseStateSnapshot
} from '../src/utils/documentDependencyService';
import {
  DocumentRecord,
  TimelineEvent,
  ResponseRequirement,
  DiscrepancyItem,
  CourtCriterion
} from '../src/types';

beforeAll(() => {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (key: string) => store.get(key) || null,
    setItem: (key: string, val: string) => { store.set(key, val); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => store.clear(),
    key: (i: number) => Array.from(store.keys())[i] || null,
    get length() { return store.size; },
  } as Storage;
});

describe('Document Dependency & Cascading Deletion Service', () => {
  const sampleDoc: DocumentRecord = {
    id: 'DOC-2024-001',
    title: 'Bassendean Primary School Attendance Report',
    category: 'Education',
    date: '2024-03-28',
    sourceOrigin: 'Bassendean PS Principal',
    evidentiaryWeight: 'Third-Party Objective',
    annexureNumber: 'Annexure BJH-2',
    fileType: 'school_record',
    fileSize: '450 KB',
    excerpt: 'Official attendance record showing zero late arrivals.',
    fullText: 'Full official attendance ledger.',
  };

  const sampleEvent: TimelineEvent = {
    id: 'EVT-001',
    date: '2024-03-28',
    title: 'Bassendean PS Audit Submitted',
    description: 'Attendance records submitted.',
    category: 'Education',
    sourceOrigin: 'School Ledger',
    evidentiaryWeight: 'Third-Party Objective',
    partiesInvolved: ['Benjamin Hawkins', 'Sue-Anne Hawkins'],
    childrenMentioned: ['Isabella', 'Mason'],
    primaryDocId: 'DOC-2024-001',
    citation: '[DOC-2024-001] Annexure BJH-2',
    orderBreachFlag: false,
  };

  const sampleReq: ResponseRequirement = {
    id: 'REQ-001',
    format: 'SMS',
    sourceDocId: 'DOC-2024-001',
    sourceCitation: 'Annexure BJH-2',
    dateRequested: '2024-03-28',
    informationRequested: 'Provide term schedule',
    daysOverdue: 0,
    status: 'waiting',
    requestingParty: 'Benjamin Hawkins',
    respondingParty: 'Sue-Anne Hawkins',
    statutoryBasis: 'Order 9 (42-Hour Written Communication Mandate)',
    priority: 'High',
  };

  const sampleDiscrepancy: DiscrepancyItem = {
    id: 'DISC-001',
    claimText: 'Respondent claims Father never attends school events',
    claimSource: 'Affidavit',
    claimDate: '2024-03-28',
    conflictingFact: 'Audit confirms 100% Father attendance',
    evidenceDocId: 'DOC-2024-001',
    evidenceCitation: 'Annexure BJH-2',
    evidentiaryWeight: 'Third-Party Objective',
    severity: 'High',
    legalImpact: 'Undermines credibility',
  };

  const sampleCriterion: CourtCriterion = {
    id: 'CRIT-001',
    statutoryRef: 's60CC(2)(a)',
    title: 'Safety and Protection',
    officialLegalTest: 'Protection from harm',
    practicalIndicators: ['School safety'],
    aiFlaggedEvidence: [
      {
        type: 'favorable_to_applicant',
        description: 'Consistent school attendance record',
        docId: 'DOC-2024-001',
      },
    ],
    evidentiaryStrength: 'Strong Applicant Position',
    relevantDocIds: ['DOC-2024-001'],
    relevanceSummary: 'School records support capacity',
  };

  const baseState: CaseStateSnapshot = {
    documents: [sampleDoc],
    timeline: [sampleEvent],
    orders: [],
    discrepancies: [sampleDiscrepancy],
    communicationMessages: [],
    responseRequirements: [sampleReq],
    courtCriteria: [sampleCriterion],
    issuesConcerns: [],
    partyProfiles: [],
    proposedOrders: [],
  };

  it('accurately discovers all linked dependencies for a document', () => {
    const deps = inspectDocumentDependencies([sampleDoc], baseState);

    expect(deps).toHaveLength(1);
    const dep = deps[0];
    expect(dep.doc.id).toBe('DOC-2024-001');
    expect(dep.timelineEvents).toHaveLength(1);
    expect(dep.responseRequirements).toHaveLength(1);
    expect(dep.discrepancies).toHaveLength(1);
    expect(dep.courtCriteria).toHaveLength(1);
    expect(dep.totalAssociatedCount).toBe(4);
  });

  it('executes cascading deletion and creates a complete undo snapshot', () => {
    const result = executeCascadingDocumentDeletion([sampleDoc.id], baseState);

    expect(result.updatedState.documents).toHaveLength(0);
    expect(result.updatedState.timeline).toHaveLength(0);
    expect(result.updatedState.responseRequirements).toHaveLength(0);
    expect(result.updatedState.discrepancies).toHaveLength(0);
    expect(result.updatedState.courtCriteria[0].relevantDocIds).not.toContain('DOC-2024-001');

    expect(result.undoSnapshot.deletedDocIds).toContain('DOC-2024-001');
    expect(result.undoSnapshot.summary.documentsCount).toBe(1);
    expect(result.undoSnapshot.summary.timelineEventsCount).toBe(1);
    expect(result.undoSnapshot.summary.responseRequirementsCount).toBe(1);
  });

  it('restores state accurately from a deletion snapshot', () => {
    const deletionResult = executeCascadingDocumentDeletion([sampleDoc.id], baseState);
    const restored = restoreDeletionSnapshot(deletionResult.undoSnapshot);

    expect(restored.restoredState.documents).toHaveLength(1);
    expect(restored.restoredState.documents[0].id).toBe('DOC-2024-001');
    expect(restored.restoredState.timeline).toHaveLength(1);
    expect(restored.restoredState.responseRequirements).toHaveLength(1);
    expect(restored.restoredState.discrepancies).toHaveLength(1);
    expect(restored.restoredState.courtCriteria[0].relevantDocIds).toContain('DOC-2024-001');
  });
});
