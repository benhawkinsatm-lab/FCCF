import { 
  DocumentRecord, 
  TimelineEvent, 
  ParentingOrder, 
  DiscrepancyItem, 
  CommunicationMessage, 
  ResponseRequirement, 
  CourtCriterion, 
  IssueConcern, 
  PartyProfile, 
  ProposedParentingOrder 
} from '../types';
import { DocumentAnnotation } from '../components/evidence-binder/types';
import { getStoredAnnotations, deleteAnnotationsForDocs, saveStoredAnnotations } from '../components/evidence-binder/annotationStorage';

export interface DocumentDependencyDetail {
  doc: DocumentRecord;
  timelineEvents: TimelineEvent[];
  discrepancies: DiscrepancyItem[];
  annotations: DocumentAnnotation[];
  communicationMessages: CommunicationMessage[];
  responseRequirements: ResponseRequirement[];
  courtCriteria: { criterion: CourtCriterion; matchReason: string }[];
  issuesConcerns: { issue: IssueConcern; matchReason: string }[];
  partyProfiles: { profile: PartyProfile; matchReason: string }[];
  proposedOrders: { order: ProposedParentingOrder; matchReason: string }[];
  totalAssociatedCount: number;
}

export interface CaseStateSnapshot {
  documents: DocumentRecord[];
  timeline: TimelineEvent[];
  orders: ParentingOrder[];
  discrepancies: DiscrepancyItem[];
  communicationMessages: CommunicationMessage[];
  responseRequirements: ResponseRequirement[];
  courtCriteria: CourtCriterion[];
  issuesConcerns: IssueConcern[];
  partyProfiles: PartyProfile[];
  proposedOrders: ProposedParentingOrder[];
}

export interface DeletionUndoSnapshot {
  id: string;
  deletedAt: number;
  gracePeriodMs: number;
  deletedDocIds: string[];
  deletedDocTitles: string[];
  previousState: CaseStateSnapshot;
  previousAnnotations: DocumentAnnotation[];
  summary: {
    documentsCount: number;
    timelineEventsCount: number;
    discrepanciesCount: number;
    annotationsCount: number;
    communicationMessagesCount: number;
    responseRequirementsCount: number;
    courtCriteriaPrunedCount: number;
    issuesPrunedCount: number;
    profilesPrunedCount: number;
    proposedOrdersPrunedCount: number;
    totalCascadeCount: number;
  };
}

export interface CascadingDeletionResult {
  updatedState: CaseStateSnapshot;
  deletedDocIds: string[];
  summary: {
    documentsCount: number;
    timelineEventsCount: number;
    discrepanciesCount: number;
    annotationsCount: number;
    communicationMessagesCount: number;
    responseRequirementsCount: number;
    courtCriteriaPrunedCount: number;
    issuesPrunedCount: number;
    profilesPrunedCount: number;
    proposedOrdersPrunedCount: number;
    totalCascadeCount: number;
  };
  undoSnapshot: DeletionUndoSnapshot;
}

/**
 * Scans all state stores for items that reference the provided document IDs.
 */
export function inspectDocumentDependencies(
  docs: DocumentRecord[],
  caseState: CaseStateSnapshot
): DocumentDependencyDetail[] {
  const allAnnotations = getStoredAnnotations();

  return docs.map(doc => {
    const docId = doc.id;

    // 1. Timeline Events
    const matchedTimelineEvents = (caseState.timeline || []).filter(
      ev => ev.primaryDocId === docId || (ev.citation && ev.citation.includes(docId))
    );

    // 2. Discrepancies
    const matchedDiscrepancies = (caseState.discrepancies || []).filter(
      disc => disc.evidenceDocId === docId || (disc.evidenceCitation && disc.evidenceCitation.includes(docId))
    );

    // 3. Evidence Annotations & Sticky Notes
    const matchedAnnotations = allAnnotations.filter(
      ann => ann.docId === docId
    );

    // 4. Communication Logs
    const matchedCommunications = (caseState.communicationMessages || []).filter(
      msg => msg.docRefId === docId
    );

    // 5. Response Requirements
    const matchedRequirements = (caseState.responseRequirements || []).filter(
      req => req.sourceDocId === docId || (req.sourceCitation && req.sourceCitation.includes(docId))
    );

    // 6. Court Criteria
    const matchedCourtCriteria: { criterion: CourtCriterion; matchReason: string }[] = [];
    (caseState.courtCriteria || []).forEach(crit => {
      const isRelevant = crit.relevantDocIds && crit.relevantDocIds.includes(docId);
      const flaggedEv = (crit.aiFlaggedEvidence || []).find(ev => ev.docId === docId);
      if (isRelevant || flaggedEv) {
        matchedCourtCriteria.push({
          criterion: crit,
          matchReason: isRelevant 
            ? `Listed as relevant supporting evidence for ${crit.statutoryRef}`
            : `Flagged under ${crit.statutoryRef}: "${flaggedEv?.description || ''}"`
        });
      }
    });

    // 7. Issues & Concerns
    const matchedIssues: { issue: IssueConcern; matchReason: string }[] = [];
    (caseState.issuesConcerns || []).forEach(issue => {
      const match = (issue.corroboratingEvidence || []).find(ev => ev.docId === docId);
      if (match) {
        matchedIssues.push({
          issue,
          matchReason: `Corroborating record for "${issue.title}" (${match.citation || match.title})`
        });
      }
    });

    // 8. Party Profiles
    const matchedProfiles: { profile: PartyProfile; matchReason: string }[] = [];
    (caseState.partyProfiles || []).forEach(prof => {
      const match = (prof.evidentiaryReferences || []).find(ref => ref.docId === docId);
      if (match) {
        matchedProfiles.push({
          profile: prof,
          matchReason: `Evidentiary citation on profile of ${prof.partyName} (${prof.role}): "${match.note || match.title}"`
        });
      }
    });

    // 9. Proposed Orders
    const matchedOrders: { order: ProposedParentingOrder; matchReason: string }[] = [];
    (caseState.proposedOrders || []).forEach(ord => {
      const match = ord.assessment?.evidenceCitations?.find(c => c.docId === docId);
      if (match) {
        matchedOrders.push({
          order: ord,
          matchReason: `Assessment feasibility citation for Order ${ord.orderNumber}: "${match.relevance || match.title}"`
        });
      }
    });

    const totalAssociatedCount = 
      matchedTimelineEvents.length +
      matchedDiscrepancies.length +
      matchedAnnotations.length +
      matchedCommunications.length +
      matchedRequirements.length +
      matchedCourtCriteria.length +
      matchedIssues.length +
      matchedProfiles.length +
      matchedOrders.length;

    return {
      doc,
      timelineEvents: matchedTimelineEvents,
      discrepancies: matchedDiscrepancies,
      annotations: matchedAnnotations,
      communicationMessages: matchedCommunications,
      responseRequirements: matchedRequirements,
      courtCriteria: matchedCourtCriteria,
      issuesConcerns: matchedIssues,
      partyProfiles: matchedProfiles,
      proposedOrders: matchedOrders,
      totalAssociatedCount,
    };
  });
}

/**
 * Executes a full cascading cleanup:
 * - Deletes the documents
 * - Deletes dependent timeline events & updates affected parenting orders
 * - Deletes dependent discrepancies
 * - Deletes dependent communications
 * - Deletes dependent response requirements
 * - Prunes references from Court Criteria, Issues/Concerns, Party Profiles, Proposed Orders
 * - Deletes stored annotations from localStorage
 */
export function executeCascadingDocumentDeletion(
  docIdsToDelete: string[],
  currentState: CaseStateSnapshot
): CascadingDeletionResult {
  const docIdSet = new Set(docIdsToDelete);

  // 1. Filter documents
  const updatedDocuments = (currentState.documents || []).filter(
    d => !docIdSet.has(d.id)
  );

  // 2. Identify timeline events to delete
  const timelineEventsToDelete = (currentState.timeline || []).filter(
    ev => docIdSet.has(ev.primaryDocId)
  );
  const deletedEventIdSet = new Set(timelineEventsToDelete.map(e => e.id));

  const updatedTimeline = (currentState.timeline || []).filter(
    ev => !deletedEventIdSet.has(ev.id)
  );

  // 3. Update Parenting Orders if any associatedEventIds were deleted
  const updatedOrders = (currentState.orders || []).map(order => {
    const hasDeletedEvents = (order.associatedEventIds || []).some(id => deletedEventIdSet.has(id));
    if (!hasDeletedEvents) return order;

    const remainingEventIds = (order.associatedEventIds || []).filter(id => !deletedEventIdSet.has(id));
    // Count how many breaches were removed for this order
    const removedBreachesCount = timelineEventsToDelete.filter(
      e => e.orderBreachFlag && e.breachedOrderNumber && e.breachedOrderNumber.includes(order.orderNumber)
    ).length;

    const newBreachesCount = Math.max(0, order.breachesCount - removedBreachesCount);
    // Recalculate estimated compliance rate
    const newComplianceRate = Math.min(100, Math.max(0, 100 - (newBreachesCount * 12)));

    return {
      ...order,
      associatedEventIds: remainingEventIds,
      breachesCount: newBreachesCount,
      complianceRate: newComplianceRate,
    };
  });

  // 4. Filter Discrepancies
  const updatedDiscrepancies = (currentState.discrepancies || []).filter(
    disc => !docIdSet.has(disc.evidenceDocId)
  );
  const discrepanciesCount = (currentState.discrepancies || []).length - updatedDiscrepancies.length;

  // 5. Filter Communications
  const updatedCommunications = (currentState.communicationMessages || []).filter(
    msg => !docIdSet.has(msg.docRefId)
  );
  const communicationMessagesCount = (currentState.communicationMessages || []).length - updatedCommunications.length;

  // 6. Filter Response Requirements
  const updatedRequirements = (currentState.responseRequirements || []).filter(
    req => !req.sourceDocId || !docIdSet.has(req.sourceDocId)
  );
  const responseRequirementsCount = (currentState.responseRequirements || []).length - updatedRequirements.length;

  // 7. Prune Court Criteria
  let courtCriteriaPrunedCount = 0;
  const updatedCourtCriteria = (currentState.courtCriteria || []).map(crit => {
    const hasDoc = (crit.relevantDocIds || []).some(id => docIdSet.has(id));
    const hasFlagged = (crit.aiFlaggedEvidence || []).some(ev => ev.docId && docIdSet.has(ev.docId));
    
    if (!hasDoc && !hasFlagged) return crit;
    
    courtCriteriaPrunedCount++;
    return {
      ...crit,
      relevantDocIds: (crit.relevantDocIds || []).filter(id => !docIdSet.has(id)),
      aiFlaggedEvidence: (crit.aiFlaggedEvidence || []).filter(ev => !ev.docId || !docIdSet.has(ev.docId)),
    };
  });

  // 8. Prune Issues & Concerns
  let issuesPrunedCount = 0;
  const updatedIssuesConcerns = (currentState.issuesConcerns || []).map(issue => {
    const hasDoc = (issue.corroboratingEvidence || []).some(ev => docIdSet.has(ev.docId));
    if (!hasDoc) return issue;

    issuesPrunedCount++;
    return {
      ...issue,
      corroboratingEvidence: (issue.corroboratingEvidence || []).filter(ev => !docIdSet.has(ev.docId)),
    };
  });

  // 9. Prune Party Profiles
  let profilesPrunedCount = 0;
  const updatedPartyProfiles = (currentState.partyProfiles || []).map(profile => {
    const hasDoc = (profile.evidentiaryReferences || []).some(ref => docIdSet.has(ref.docId));
    if (!hasDoc) return profile;

    profilesPrunedCount++;
    return {
      ...profile,
      evidentiaryReferences: (profile.evidentiaryReferences || []).filter(ref => !docIdSet.has(ref.docId)),
    };
  });

  // 10. Prune Proposed Orders
  let proposedOrdersPrunedCount = 0;
  const updatedProposedOrders = (currentState.proposedOrders || []).map(order => {
    if (!order.assessment?.evidenceCitations) return order;
    const hasDoc = order.assessment.evidenceCitations.some(c => c.docId && docIdSet.has(c.docId));
    if (!hasDoc) return order;

    proposedOrdersPrunedCount++;
    return {
      ...order,
      assessment: {
        ...order.assessment,
        evidenceCitations: order.assessment.evidenceCitations.filter(c => !c.docId || !docIdSet.has(c.docId)),
      }
    };
  });

  // 11. Purge Evidence Binder Annotations & Sticky Notes from localStorage
  const beforeAnnotations = getStoredAnnotations();
  deleteAnnotationsForDocs(docIdsToDelete);
  const annotationsCount = beforeAnnotations.filter(a => docIdSet.has(a.docId)).length;

  const totalCascadeCount = 
    timelineEventsToDelete.length +
    discrepanciesCount +
    communicationMessagesCount +
    responseRequirementsCount +
    annotationsCount +
    courtCriteriaPrunedCount +
    issuesPrunedCount +
    profilesPrunedCount +
    proposedOrdersPrunedCount;

  const summary = {
    documentsCount: docIdsToDelete.length,
    timelineEventsCount: timelineEventsToDelete.length,
    discrepanciesCount,
    annotationsCount,
    communicationMessagesCount,
    responseRequirementsCount,
    courtCriteriaPrunedCount,
    issuesPrunedCount,
    profilesPrunedCount,
    proposedOrdersPrunedCount,
    totalCascadeCount,
  };

  const deletedDocTitles = (currentState.documents || [])
    .filter(d => docIdSet.has(d.id))
    .map(d => d.title);

  const undoSnapshot: DeletionUndoSnapshot = {
    id: `undo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    deletedAt: Date.now(),
    gracePeriodMs: 25000,
    deletedDocIds: [...docIdsToDelete],
    deletedDocTitles,
    previousState: {
      documents: [...(currentState.documents || [])],
      timeline: [...(currentState.timeline || [])],
      orders: [...(currentState.orders || [])],
      discrepancies: [...(currentState.discrepancies || [])],
      communicationMessages: [...(currentState.communicationMessages || [])],
      responseRequirements: [...(currentState.responseRequirements || [])],
      courtCriteria: [...(currentState.courtCriteria || [])],
      issuesConcerns: [...(currentState.issuesConcerns || [])],
      partyProfiles: [...(currentState.partyProfiles || [])],
      proposedOrders: [...(currentState.proposedOrders || [])],
    },
    previousAnnotations: beforeAnnotations,
    summary,
  };

  return {
    updatedState: {
      documents: updatedDocuments,
      timeline: updatedTimeline,
      orders: updatedOrders,
      discrepancies: updatedDiscrepancies,
      communicationMessages: updatedCommunications,
      responseRequirements: updatedRequirements,
      courtCriteria: updatedCourtCriteria,
      issuesConcerns: updatedIssuesConcerns,
      partyProfiles: updatedPartyProfiles,
      proposedOrders: updatedProposedOrders,
    },
    deletedDocIds: docIdsToDelete,
    summary,
    undoSnapshot,
  };
}

/**
 * Restores a previously deleted set of documents and their associated records.
 * Returns the restored CaseStateSnapshot and restores annotations back into localStorage.
 */
export function restoreDeletionSnapshot(snapshot: DeletionUndoSnapshot): {
  restoredState: CaseStateSnapshot;
  restoredAnnotationsCount: number;
} {
  // 1. Re-populate local storage annotations
  saveStoredAnnotations(snapshot.previousAnnotations);

  // 2. Return full previous state snapshot
  return {
    restoredState: snapshot.previousState,
    restoredAnnotationsCount: snapshot.previousAnnotations.length,
  };
}

