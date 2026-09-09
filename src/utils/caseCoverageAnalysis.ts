import {
  CHILD_NAMES,
  CHILD_TIMELINE_CATEGORIES,
  ChildName,
  CommunicationMessage,
  CourtCriterion,
  CoverageFinding,
  CoverageReport,
  DocumentRecord,
  IssueConcern,
  KnowledgeGap,
  ParentingOrder,
  PartyProfile,
  ResponseRequirement,
  TimelineEvent,
} from '../types';
import { assessMessage } from './communicationProductivity';
import {
  deriveChildImpacts,
  getChildCategoryCounts,
  getEmptyChildCategories,
} from './childTimelineService';

/**
 * Case coverage analysis.
 *
 * Answers the questions the assistant is asked most: "why has nothing been
 * generated from this document?" and "what don't we know yet?".
 *
 * Every finding is derived from the actual store — nothing is invented. The
 * `likelyCause` field encodes the real behaviour of this application's
 * ingestion pipeline so the diagnosis is specific rather than generic.
 */

export interface CoverageInput {
  documents: DocumentRecord[];
  timeline: TimelineEvent[];
  communicationMessages: CommunicationMessage[];
  responseRequirements: ResponseRequirement[];
  partyProfiles: PartyProfile[];
  courtCriteria: CourtCriterion[];
  orders: ParentingOrder[];
  issuesConcerns: IssueConcern[];
  knowledgeGaps: KnowledgeGap[];
}

let findingSeq = 0;
const nextId = (prefix: string) => `${prefix}-${(++findingSeq).toString().padStart(3, '0')}`;

/** Documents that produced no timeline event, with a specific diagnosis. */
function analyseDocumentTimelineCoverage(
  documents: DocumentRecord[],
  timeline: TimelineEvent[]
): CoverageFinding[] {
  const citedDocIds = new Set<string>();
  timeline.forEach(e => {
    if (e.primaryDocId) citedDocIds.add(e.primaryDocId);
  });

  return documents
    .filter(d => !citedDocIds.has(d.id))
    .map(doc => {
      const hasBreachLanguage =
        /\b(breach|withheld|withholding|failed to|did not|no notice|contravention|delay)\b/i.test(
          `${doc.title} ${doc.excerpt} ${doc.fullText || ''}`
        );

      // The real pipeline rule: DocumentIngestionModal only emits a
      // TimelineEvent when the AI flags BOTH createTimelineEvent AND
      // hasBreach. Non-breach documents are therefore filed as evidence
      // only, and never reach the chronology.
      const likelyCause = hasBreachLanguage
        ? 'The document contains contravention language, but ingestion did not flag `hasBreach`. This usually means the breach wording sits in the document body rather than the extracted excerpt, so the classifier never saw it — common with long PDF/SMS exports where only the first ~260 characters are summarised.'
        : 'Timeline events are only auto-created during ingestion when the AI flags the document as evidencing an order breach. This document was classified as non-breach corroborating evidence, so it was filed to the vault but never written to the chronology. That is the pipeline behaving as configured, not a failure.';

      return {
        id: nextId('COV-TL'),
        type: 'document_no_timeline_event' as const,
        severity: hasBreachLanguage ? ('High' as const) : ('Moderate' as const),
        subject: doc.title,
        subjectId: doc.id,
        explanation: `No timeline event references [${doc.id}]. The document is in the vault (${doc.category}, ${doc.evidentiaryWeight}, dated ${doc.date}) but contributes nothing to the chronology.`,
        likelyCause,
        remediation: hasBreachLanguage
          ? `Re-run ingestion review on [${doc.id}] with the full text loaded, or add a timeline event manually citing it. Check whether the breach relates to Order 4.2, 5.1, 9.1 or 13.1.`
          : `If this document evidences a dated fact worth pleading (an appointment attended, a notice given, a payment made), add a non-breach timeline event citing [${doc.id}]. Non-breach events are still probative on s 60CC(2)(d) parental capacity.`,
      };
    });
}

/** Timeline events with no child attribution at all. */
function analyseChildAttribution(timeline: TimelineEvent[]): CoverageFinding[] {
  return timeline
    .filter(e => deriveChildImpacts(e).length === 0)
    .map(e => ({
      id: nextId('COV-CHILD'),
      type: 'document_no_child_attribution' as const,
      severity: 'High' as const,
      subject: e.title,
      subjectId: e.id,
      explanation: `Timeline event ${e.id} (${e.date}) names no child, so it appears on neither Isabella's nor Mason's own timeline.`,
      likelyCause:
        'The event was created without `childrenMentioned` populated, or the source text referred to the children only obliquely (e.g. "them", "the kids") in a passage the extractor did not read.',
      remediation:
        'Attribute the event to the affected child or children so it files into their own timeline categories. Events with no child attribution cannot support any s 60CC submission about that child.',
    }));
}

/** Communications with no productivity assessment recorded. */
function analyseCommunicationProductivity(
  messages: CommunicationMessage[]
): CoverageFinding[] {
  const findings: CoverageFinding[] = [];

  const unassessed = messages.filter(m => !m.productivityAssessment);
  if (unassessed.length > 0) {
    findings.push({
      id: nextId('COV-PROD'),
      type: 'communication_unassessed_productivity',
      severity: 'Moderate',
      subject: `${unassessed.length} communication(s) without a stored productivity assessment`,
      explanation: `${unassessed.length} of ${messages.length} ingested communications carry no saved productivity classification. They are being scored on the fly by the deterministic classifier, which is weaker than an AI review because it cannot see the request each message was answering.`,
      likelyCause:
        'These messages were ingested before productivity capture was enabled, or an AI communications review has not been run since they were added.',
      remediation:
        'Run an AI review over the communications ledger so each message gets a stored assessment with markers and rationale attached to the record.',
    });
  }

  return findings;
}

/** Responses closed as "completed" that were substantively worthless. */
function analyseNonProductiveClosures(
  requirements: ResponseRequirement[]
): CoverageFinding[] {
  return requirements
    .filter(
      r =>
        r.status === 'completed' &&
        (r.responseProductivity === 'Non-Productive' || r.substantiveResponse === false)
    )
    .map(r => ({
      id: nextId('COV-RESP'),
      type: 'response_completed_but_non_productive' as const,
      severity: 'High' as const,
      subject: r.informationRequested.slice(0, 90),
      subjectId: r.id,
      explanation: `Requirement ${r.id} is marked completed, but the reply supplied no substantive answer. Timeliness was satisfied; the obligation was not.`,
      likelyCause:
        'The 42-hour clock stops when any reply arrives. Substance is tracked on a separate axis, which is why this shows as completed in the tracker.',
      remediation:
        'Cite this as an Order 9.1 contravention in substance: a response that does not answer the parenting query does not discharge the obligation. Pair it with the productivity markers recorded on the message.',
    }));
}

/** Statutory criteria carrying no flagged evidence. */
function analyseCriteriaCoverage(criteria: CourtCriterion[]): CoverageFinding[] {
  return criteria
    .filter(c => !c.aiFlaggedEvidence || c.aiFlaggedEvidence.length === 0)
    .map(c => ({
      id: nextId('COV-CRIT'),
      type: 'criterion_no_evidence' as const,
      severity: c.statutoryRef.includes('60CC(2)(a)') ? ('Critical' as const) : ('Moderate' as const),
      subject: c.title,
      subjectId: c.id,
      explanation: `${c.statutoryRef} has no evidence flagged against it. The Court must weigh this factor; on the current record there is nothing to put before it.`,
      likelyCause:
        'Either no ingested document has been matched to this factor by an AI criteria review, or the vault genuinely holds no material addressing it.',
      remediation: `Run an AI criteria review, and if it still comes back empty, treat this as a live evidence-gathering task for ${c.statutoryRef}.`,
    }));
}

/** Orders with no compliance evidence either way. */
function analyseOrderCoverage(
  orders: ParentingOrder[],
  timeline: TimelineEvent[]
): CoverageFinding[] {
  return orders
    .filter(o => {
      const referenced = timeline.some(e =>
        (e.breachedOrderNumber || '').includes(o.orderNumber)
      );
      return !referenced && o.associatedEventIds.length === 0;
    })
    .map(o => ({
      id: nextId('COV-ORD'),
      type: 'order_no_compliance_evidence' as const,
      severity: 'Moderate' as const,
      subject: `${o.orderNumber} — ${o.title}`,
      subjectId: o.id,
      explanation: `No timeline event evidences either compliance with or breach of ${o.orderNumber}.`,
      likelyCause:
        'No ingested document has been linked to this order. Compliance evidence is often never filed because nothing goes wrong — but that leaves the record silent.',
      remediation: `Consider ingesting routine records that demonstrate the pattern under ${o.orderNumber}. Positive compliance evidence is as useful as breach evidence when parental capacity is contested.`,
    }));
}

/** Per-child coverage: profile presence, empty categories, review recency. */
function analyseChildCoverage(
  timeline: TimelineEvent[],
  profiles: PartyProfile[]
): { findings: CoverageFinding[]; perChild: CoverageReport['perChild'] } {
  const findings: CoverageFinding[] = [];
  const perChild: CoverageReport['perChild'] = [];

  CHILD_NAMES.forEach((child: ChildName) => {
    const profile = profiles.find(
      p => p.role === `Child (${child})` || p.childDetail?.childName === child
    );
    const counts = getChildCategoryCounts(timeline, child);
    const empty = getEmptyChildCategories(timeline, child);
    const eventCount = Object.values(counts).reduce<number>((a, b) => a + (b || 0), 0);

    perChild.push({
      child,
      profilePresent: Boolean(profile),
      eventCount,
      categoryCounts: counts,
      emptyCategories: empty,
      lastReviewed: profile?.lastAiReviewTimestamp,
    });

    if (!profile) {
      findings.push({
        id: nextId('COV-PROF'),
        type: 'child_profile_never_reviewed',
        severity: 'Critical',
        subject: `${child} has no party profile`,
        explanation: `${child} is a subject child of these proceedings but holds no profile record, so no AI review can write findings about them.`,
        likelyCause: 'The baseline profile set was seeded with the two parents only.',
        remediation: `Create a Child (${child}) profile so AI reviews can record developmental, medical, educational and expressed-views findings against it.`,
        affectedChild: child,
      });
    } else if (!profile.lastAiReviewTimestamp) {
      findings.push({
        id: nextId('COV-PROF'),
        type: 'child_profile_never_reviewed',
        severity: 'High',
        subject: `${child}'s profile has never been AI-reviewed`,
        subjectId: profile.id,
        explanation: `${child}'s profile exists but carries no review timestamp — its content is the seeded baseline, not findings drawn from the vault.`,
        likelyCause: 'No AI profile review has been run since the profile was created.',
        remediation: 'Run "AI Review & Refresh Profiles" on the Party Profiles tab.',
        affectedChild: child,
      });
    }

    empty.forEach(category => {
      findings.push({
        id: nextId('COV-CAT'),
        type: 'child_timeline_category_empty',
        severity: category === 'Views & Wishes Expressed' ? 'High' : 'Moderate',
        subject: `${child} — ${category}: no entries`,
        explanation: `${child}'s "${category}" timeline category holds no events.`,
        likelyCause:
          category === 'Views & Wishes Expressed'
            ? 'Children\'s views are typically only captured through a family report, counsellor note, or ICL interview — none of which appear in the vault.'
            : `No ingested document has produced an event that classifies into ${category} for ${child}.`,
        remediation:
          category === 'Views & Wishes Expressed'
            ? `s 60CC(2)(b) requires the Court to consider ${child}'s views. Consider a family report or school counsellor record.`
            : `Ingest records bearing on ${child}'s ${category.toLowerCase()}, or confirm the category is genuinely not in issue for ${child}.`,
        affectedChild: child,
      });
    });
  });

  return { findings, perChild };
}

/** Build narrative insights about what the case does not yet know. */
function buildMissingKnowledgeInsights(
  input: CoverageInput,
  findings: CoverageFinding[],
  perChild: CoverageReport['perChild']
): string[] {
  const insights: string[] = [];

  const noTimeline = findings.filter(f => f.type === 'document_no_timeline_event').length;
  if (noTimeline > 0) {
    insights.push(
      `${noTimeline} of ${input.documents.length} vault documents contribute nothing to the chronology. The dominant cause is the ingestion rule that only writes a timeline event when a breach is flagged — non-breach evidence is filed and then goes quiet.`
    );
  }

  if (input.timeline.length === 0 && input.documents.length > 0) {
    insights.push(
      'The chronology is completely empty while the vault holds documents. Nothing can currently be pleaded chronologically, and every s 60CC factor will read as unevidenced until events are generated.'
    );
  }

  const nonProductive = input.communicationMessages.filter(
    m => assessMessage(m).productivity === 'Non-Productive'
  ).length;
  if (input.communicationMessages.length > 0) {
    insights.push(
      `${nonProductive} of ${input.communicationMessages.length} communications are classified Non-Productive. Where those replies landed inside 42 hours, the Order 9.1 breach is one of substance rather than timing — argue it that way or it will look like compliance.`
    );
  } else {
    insights.push(
      'No communication records have been ingested, so no Order 9.1 latency or productivity analysis is possible. The SMS export in the vault has not been broken out into individual messages.'
    );
  }

  perChild.forEach(c => {
    if (c.eventCount === 0) {
      insights.push(
        `${c.child} has no events on their own timeline. Any submission specific to ${c.child} is presently unsupported.`
      );
    } else if (c.emptyCategories.length >= 4) {
      insights.push(
        `${c.child}'s record is narrow: ${c.emptyCategories.length} of ${CHILD_TIMELINE_CATEGORIES.length} categories are empty (${c.emptyCategories.slice(0, 3).join(', ')}${c.emptyCategories.length > 3 ? '…' : ''}).`
      );
    }
  });

  const criteriaEmpty = findings.filter(f => f.type === 'criterion_no_evidence').length;
  if (criteriaEmpty > 0) {
    insights.push(
      `${criteriaEmpty} statutory criteria carry no flagged evidence. s 60CC requires the Court to consider each — silence on a factor is not neutral, it is an evidentiary gap the other side can fill.`
    );
  }

  const unresolvedGaps = input.knowledgeGaps.filter(g => !g.resolved).length;
  if (unresolvedGaps > 0) {
    insights.push(`${unresolvedGaps} previously identified knowledge gaps remain unresolved.`);
  }

  return insights;
}

/** Run the full coverage analysis. Pure, deterministic, no network. */
export function buildCoverageReport(input: CoverageInput): CoverageReport {
  findingSeq = 0;

  const documentFindings = analyseDocumentTimelineCoverage(input.documents, input.timeline);
  const attributionFindings = analyseChildAttribution(input.timeline);
  const productivityFindings = analyseCommunicationProductivity(input.communicationMessages);
  const closureFindings = analyseNonProductiveClosures(input.responseRequirements);
  const criteriaFindings = analyseCriteriaCoverage(input.courtCriteria);
  const orderFindings = analyseOrderCoverage(input.orders, input.timeline);
  const { findings: childFindings, perChild } = analyseChildCoverage(
    input.timeline,
    input.partyProfiles
  );

  const findings = [
    ...childFindings,
    ...documentFindings,
    ...attributionFindings,
    ...closureFindings,
    ...criteriaFindings,
    ...orderFindings,
    ...productivityFindings,
  ];

  const severityRank = { Critical: 0, High: 1, Moderate: 2, Informational: 3 };
  findings.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);

  const citedDocIds = new Set(input.timeline.map(e => e.primaryDocId).filter(Boolean));
  const assessedComms = input.communicationMessages.filter(m => m.productivityAssessment).length;
  const nonProductiveComms = input.communicationMessages.filter(
    m => assessMessage(m).productivity === 'Non-Productive'
  ).length;

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      documents: input.documents.length,
      documentsWithTimelineEvents: citedDocIds.size,
      documentsWithoutTimelineEvents: documentFindings.length,
      timelineEvents: input.timeline.length,
      timelineEventsWithChildAttribution: input.timeline.filter(
        e => deriveChildImpacts(e).length > 0
      ).length,
      communications: input.communicationMessages.length,
      communicationsAssessedForProductivity: assessedComms,
      nonProductiveCommunications: nonProductiveComms,
      childProfilesPresent: perChild.filter(c => c.profilePresent).length,
      emptyChildTimelineCategories: perChild.reduce(
        (sum, c) => sum + c.emptyCategories.length,
        0
      ),
      criteriaWithoutEvidence: criteriaFindings.length,
    },
    perChild,
    findings,
    missingKnowledgeInsights: buildMissingKnowledgeInsights(input, findings, perChild),
  };
}

/** Compact form for sending to the model without blowing the context. */
export function summariseCoverageForPrompt(report: CoverageReport): string {
  const lines: string[] = [];
  lines.push('COVERAGE TOTALS: ' + JSON.stringify(report.totals));

  report.perChild.forEach(c => {
    lines.push(
      `CHILD ${c.child}: profile=${c.profilePresent ? 'present' : 'MISSING'}, events=${c.eventCount}, emptyCategories=[${c.emptyCategories.join(', ')}], lastReviewed=${c.lastReviewed || 'never'}`
    );
  });

  lines.push('TOP FINDINGS:');
  report.findings.slice(0, 25).forEach(f => {
    lines.push(
      `- [${f.severity}] (${f.type}) ${f.subject}${f.subjectId ? ` {${f.subjectId}}` : ''} :: ${f.explanation} CAUSE: ${f.likelyCause} FIX: ${f.remediation}`
    );
  });

  lines.push('MISSING-KNOWLEDGE INSIGHTS:');
  report.missingKnowledgeInsights.forEach(i => lines.push(`- ${i}`));

  return lines.join('\n');
}

export const analyzeCaseCoverage = buildCoverageReport;
export const generateCoverageSummaryText = summariseCoverageForPrompt;
