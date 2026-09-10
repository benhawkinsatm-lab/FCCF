// ═══════════════════════════════════════════════════════════════════
// CHILDREN — canonical identifiers used across profiles and timelines
// ═══════════════════════════════════════════════════════════════════

export type ChildName = 'Isabella' | 'Mason';

export const CHILD_NAMES: ChildName[] = ['Isabella', 'Mason'];

/**
 * Per-child timeline categories. Every child carries their OWN timeline
 * broken down by these categories, independent of the case-wide
 * DocumentCategory used for evidence filing.
 */
export type ChildTimelineCategory =
  | 'Health & Medical'
  | 'Education & School'
  | 'Emotional & Psychological'
  | 'Care Time & Handover'
  | 'Extracurricular & Social'
  | 'Views & Wishes Expressed'
  | 'Safety & Wellbeing'
  | 'Developmental & Therapy';

export const CHILD_TIMELINE_CATEGORIES: ChildTimelineCategory[] = [
  'Health & Medical',
  'Education & School',
  'Emotional & Psychological',
  'Care Time & Handover',
  'Extracurricular & Social',
  'Views & Wishes Expressed',
  'Safety & Wellbeing',
  'Developmental & Therapy',
];

// ═══════════════════════════════════════════════════════════════════
// COMMUNICATION PRODUCTIVITY — "non-productive" capture axis
// ═══════════════════════════════════════════════════════════════════

/**
 * Productivity is a SEPARATE axis from tone. A message can be perfectly
 * civil in tone (Neutral) and still be non-productive in substance — e.g.
 * a reply inside the Order 9.1 window that answers nothing. Recording the
 * two independently is what makes the "responded but did not engage"
 * pattern provable rather than merely assertable.
 */
export type CommunicationProductivity =
  | 'Productive'
  | 'Partially Productive'
  | 'Non-Productive'
  | 'Unassessed';

export type NonProductiveMarker =
  | 'No Substantive Answer'
  | 'Deflection / Counter-Accusation'
  | 'Historical Grievance Raised'
  | 'Disparagement of Other Parent'
  | 'Stonewalling / Refusal to Engage'
  | 'Repetition of Settled Matter'
  | 'Unilateral Directive (No Consultation)'
  | 'No Child-Related Content'
  | 'Emotional Escalation'
  | 'Volume Without Information'
  | 'Deferred Without Date';

export const NON_PRODUCTIVE_MARKERS: NonProductiveMarker[] = [
  'No Substantive Answer',
  'Deflection / Counter-Accusation',
  'Historical Grievance Raised',
  'Disparagement of Other Parent',
  'Stonewalling / Refusal to Engage',
  'Repetition of Settled Matter',
  'Unilateral Directive (No Consultation)',
  'No Child-Related Content',
  'Emotional Escalation',
  'Volume Without Information',
  'Deferred Without Date',
];

export interface ProductivityAssessment {
  productivity: CommunicationProductivity;
  markers: NonProductiveMarker[];
  /** True only if the message actually answered what was asked. */
  substantiveResponse: boolean;
  /** True if the message contains content about the children at all. */
  childFocusedContent: boolean;
  rationale: string;
  assessedBy: 'AI Review' | 'Deterministic Classifier' | 'Manual';
  assessedAt: string;
  /** s 60CC(2)(d) co-parenting capacity linkage, where applicable. */
  s60CCFactorRef?: string;
}

export type DocumentCategory = 
  | 'Medical' 
  | 'Education' 
  | 'Legal/Court' 
  | 'Direct Communication' 
  | 'Financial' 
  | 'Extracurricular';

export type EvidentiaryWeight = 
  | 'Sworn/Official' 
  | 'Third-Party Objective' 
  | 'Unverified Claim';

export interface DocumentRecord {
  id: string;
  title: string;
  category: DocumentCategory;
  date: string; // YYYY-MM-DD
  sourceOrigin: string; // e.g. Bassendean Primary School, Sue-Anne SMS, eCourts Portal
  evidentiaryWeight: EvidentiaryWeight;
  fileType: 'pdf' | 'email' | 'sms' | 'court_order' | 'medical_report' | 'school_record' | 'financial';
  excerpt: string;
  fullText: string;
  annexureNumber?: string;
  fileSize?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface TimelineEvent {
  id: string;
  date: string; // YYYY-MM-DD
  time?: string;
  title: string;
  description: string;
  category: DocumentCategory;
  sourceOrigin: string;
  evidentiaryWeight: EvidentiaryWeight;
  partiesInvolved: string[];
  childrenMentioned: ChildName[];
  primaryDocId: string;
  citation: string;
  orderBreachFlag: boolean;
  breachedOrderNumber?: string;
  breachSeverity?: 'Minor' | 'Moderate' | 'Severe';
  sentimentScore?: 'Hostile' | 'Neutral' | 'Cooperative';
  responseLagHours?: number; // Flag if > 42 hours

  /**
   * Per-child attribution. One entry per affected child, filed under that
   * child's OWN timeline category. This is what drives the per-child
   * timelines on each child's party profile.
   */
  childImpacts?: ChildImpactRecord[];

  /** Productivity classification where this event arises from a communication. */
  communicationProductivity?: CommunicationProductivity;
  nonProductiveMarkers?: NonProductiveMarker[];

  /** Provenance: how this event came to exist (used by the coverage engine). */
  generatedBy?: 'AI Ingestion' | 'AI Review' | 'Manual Entry' | 'Drive Import';
  generationRationale?: string;
}

/**
 * A single child's stake in a timeline event, categorised into that
 * child's own timeline taxonomy.
 */
export interface ChildImpactRecord {
  child: ChildName;
  childCategory: ChildTimelineCategory;
  impactSummary: string;
  severity: 'Critical' | 'High' | 'Moderate' | 'Low' | 'Informational';
  s60CCFactorRef?: string;
  /** False when the child is inferred rather than named in the source. */
  directlyEvidenced: boolean;
  sourceExcerpt?: string;
}

export type ParentingOrderCategory = 
  | 'Communication' 
  | 'Pick-up/Drop-off' 
  | 'Financial' 
  | 'Medical/Health' 
  | 'Education' 
  | 'Non-Disparagement' 
  | 'Travel/Passports';

export interface ParentingOrder {
  id: string;
  orderNumber: string;
  title: string;
  orderText: string;
  statutoryBasis: string;
  category: 'Care Arrangements' | 'Communication (42h Mandate)' | 'Education' | 'Medical/Health' | 'Non-Disparagement' | 'Travel/Passports' | 'Financial';
  breachThresholdHours?: number;
  breachesCount: number;
  complianceRate: number; // percentage
  associatedEventIds: string[];
}

export interface DiscrepancyItem {
  id: string;
  claimText: string;
  claimSource: string;
  claimDate: string;
  conflictingFact: string;
  evidenceDocId: string;
  evidenceCitation: string;
  evidentiaryWeight: EvidentiaryWeight;
  severity: 'High' | 'Medium' | 'Low';
  legalImpact: string;
}

export interface KnowledgeGap {
  id: string;
  gapDescription: string;
  category: DocumentCategory;
  urgency: 'Critical' | 'High' | 'Routine';
  targetCorroboration: string;
  recommendedQuestion: string;
  suggestedAction: string;
  resolved: boolean;

  /** Provenance so the assistant can explain where a gap came from. */
  detectedBy?: 'AI Review' | 'Coverage Engine' | 'Manual';
  originDocIds?: string[];
  relatedChild?: ChildName | 'Both' | 'N/A';
}

export interface CommunicationMessage {
  id: string;
  sender: 'Benjamin Hawkins' | 'Sue-Anne Hawkins' | 'Third Party';
  recipient: string;
  timestamp: string;
  channel: 'SMS' | 'Email';
  content: string;
  tone: 'Hostile' | 'Neutral' | 'Cooperative';
  responseToId?: string;
  lagHours?: number;
  breachOf42HourMandate: boolean;
  docRefId: string;

  /**
   * Substance assessment, independent of tone and of the 42-hour clock.
   * A message can be on time and civil yet still Non-Productive.
   */
  productivityAssessment?: ProductivityAssessment;

  /** Children this message actually concerns, for per-child attribution. */
  childrenReferenced?: ChildName[];

  /** What was asked of this party, where the message is a reply. */
  requestAddressed?: string;
}

/**
 * A single inter-party request for information or confirmation between the
 * two parents (e.g. "Did Emma see the paediatrician about her allergy?" or
 * "Please confirm collection time for Friday") and how it was resolved.
 * Populated by AI extraction from ingested documents/communications, or
 * added manually -- this array is empty by default (zero-hallucination
 * pattern: no synthetic rows until real case material supports them).
 */
export interface ParentResolutionRequest {
  id: string;

  /** ISO date (YYYY-MM-DD) the request was made. */
  dateOfRequest: string;

  requestedBy: 'Benjamin Hawkins' | 'Sue-Anne Hawkins' | 'Third Party';
  requestedTo: 'Benjamin Hawkins' | 'Sue-Anne Hawkins' | 'Third Party';

  /** What was actually asked for or requested confirmation of. */
  informationRequested: string;

  category: 'Medical' | 'School' | 'Care Arrangements' | 'Financial' | 'Legal' | 'Extracurricular' | 'Other';

  responseStatus: 'Open' | 'In Progress' | 'Closed' | 'Unresponded';

  /** What information/confirmation was actually provided in response, if any. */
  informationProvided: string;

  toneOfParties: 'Hostile' | 'Neutral' | 'Cooperative';

  productivity: 'Productive' | 'Partially Productive' | 'Non-Productive' | 'Unassessed';

  /** Document IDs this request/response was extracted from, for citation/verification. */
  originDocIds?: string[];

  detectedBy?: 'AI Review' | 'Manual';

  notes?: string;
}

export interface BiffAdviceResult {
  tacticalConsiderations: string[];
  emotionalTrapsRemoved: string[];
  biffDraft: {
    subject: string;
    body: string;
    wordCount: number;
    breakdown: {
      brief: string;
      informative: string;
      friendly: string;
      firm: string;
    };
  };
  counselEscalation: {
    shouldEscalate: boolean;
    legalThresholdAnalysis: string;
    statutoryViolations: string[];
    briefForLawyer: string;
  };
}

export interface MediationSimulatorMessage {
  id: string;
  sender: 'Mediator' | 'Opposing Counsel' | 'Ben Hawkins';
  text: string;
  strategicNote?: string;
  suggestedCounters?: string[];
  relevantCitations?: { docId: string; label: string }[];
}

export interface AffidavitDraftSection {
  num: number;
  heading?: string;
  text: string;
  citationDocId: string;
  citationText: string;
  annexureRef?: string;
}

export interface EvidenceBinderItem {
  annexureLetter: string;
  docId: string;
  title: string;
  date: string;
  sourceOrigin: string;
  evidentiaryWeight: EvidentiaryWeight;
  pageCount: number;
  selected: boolean;
}

export type ResponseFormat = 
  | 'Email' 
  | 'SMS' 
  | 'Court Application' 
  | 'Formal Letter' 
  | 'Medical Clinic Notice' 
  | 'School Notice' 
  | 'Co-Parenting App';

export interface ResponseRequirement {
  id: string;
  format: ResponseFormat;
  dateRequested: string; // YYYY-MM-DD or YYYY-MM-DD HH:mm
  informationRequested: string;
  responseDetails?: string;
  responseDate?: string | null; // YYYY-MM-DD or null if awaiting
  daysOverdue: number; // 0 if on time or within mandate; >0 if past deadline
  hoursOverdue?: number; // precise Order 9.1 42h latency
  status: 'waiting' | 'completed';
  requestingParty: 'Benjamin Hawkins' | 'Sue-Anne Hawkins' | 'Third Party';
  respondingParty: 'Sue-Anne Hawkins' | 'Benjamin Hawkins' | 'Third Party';
  sourceDocId?: string;
  sourceCitation?: string;
  statutoryBasis?: string; // e.g. "Order 9.1 (42h Mandate)", "Order 5.1 (24h Medical Notice)"
  priority?: 'Critical' | 'High' | 'Routine';
  aiReviewRationale?: string;
  actionsTaken?: string[];

  /**
   * A response can be "completed" against the 42-hour clock and still be
   * worthless. These fields separate timeliness from substance so a reply
   * such as "deal with it" is recorded as answered-but-non-productive
   * rather than silently closing the requirement.
   */
  responseProductivity?: CommunicationProductivity;
  substantiveResponse?: boolean;
  nonProductiveMarkers?: NonProductiveMarker[];
  productivityRationale?: string;

  /** Children the request concerns, for per-child attribution. */
  childrenConcerned?: ChildName[];
  /** Order 9's 42-hour clock, judged independently of substantive productivity. */
  order9TimelinessMet?: boolean;
  /** Set when a reply was timely but consisted only of abuse, evasion, or refusal to engage. */
  contraventionType?: string;
}

export interface VerbatimExample {
  excerpt: string;
  date: string;
  context: string;
}

export interface PartyProfile {
  id: string;
  partyName: string;
  role: 'Applicant (Father)' | 'Respondent (Mother)' | 'Child (Isabella)' | 'Child (Mason)';
  age?: number;
  dob?: string;
  summary: string;
  behaviour: {
    summary: string;
    traits: string[];
    orderComplianceRating: 'Consistently Compliant' | 'Substantial / Willful Non-Compliance' | 'N/A';
    observedIncidentsCount: number;
    riskFactors: string[];
  };
  concerns: {
    raisedByParty: string[];
    substantiatedConcernsAgainstParty: string[];
    safetyAndWellbeingNotes: string;
  };
  communicationTonePattern: {
    primaryTone: 'BIFF / Professional' | 'Hostile / Combative' | 'Avoidant / High Latency' | 'Neutral';
    avgResponseLatencyHours: number;
    order9BreachRate: string;
    toneCharacteristics: string[];
    verbatimExamples: VerbatimExample[];
  };

  /**
   * Substance-of-communication metrics, recorded separately from tone.
   * Populated by AI review and by the deterministic classifier.
   */
  communicationProductivityPattern?: {
    productiveCount: number;
    partiallyProductiveCount: number;
    nonProductiveCount: number;
    /** e.g. "62.5%" */
    nonProductiveRate: string;
    /** e.g. "31.0%" — replies that actually answered the question asked. */
    substantiveResponseRate: string;
    dominantNonProductiveMarkers: NonProductiveMarker[];
    nonProductiveExamples: VerbatimExample[];
    assessmentNote: string;
  };

  parentingCapacity: {
    schoolEngagement: string;
    medicalManagement: string;
    routineConsistency: string;
  };
  evidentiaryReferences: { docId: string; title: string; citation: string; note: string }[];
  lastAiReviewTimestamp?: string;

  /**
   * Present only on child profiles (PROF-003 Isabella, PROF-004 Mason).
   * Parent-oriented blocks above stay empty/N-A for children.
   */
  childDetail?: ChildProfileDetail;
}

/**
 * Child-specific profile content. Children are parties to these proceedings
 * in their own right under s 60CC, so they carry their own substantive
 * record rather than being a footnote on a parent's profile.
 */
export interface ChildProfileDetail {
  childName: ChildName;
  school?: string;
  yearLevel?: string;

  developmentalNeeds: string[];

  healthAndMedical: {
    summary: string;
    conditions: string[];
    treatingProviders: string[];
    complianceNotes: string;
  };

  educationAndSchooling: {
    summary: string;
    attendanceNotes: string;
    supportNeeds: string[];
  };

  emotionalAndPsychological: {
    summary: string;
    observedIndicators: string[];
    exposureToConflictNotes: string;
  };

  /** s 60CC(2)(b) — views expressed by the child. */
  viewsExpressed: {
    summary: string;
    recordedViews: VerbatimExample[];
    weightConsiderations: string;
  };

  extracurricularAndSocial: {
    summary: string;
    activities: string[];
  };

  safetyAndRiskNotes: string;

  /** Live counts per this child's own timeline categories. */
  timelineCategoryCounts?: Partial<Record<ChildTimelineCategory, number>>;

  s60CCFactorLinks: string[];
}

export interface IssueConcern {
  id: string;
  title: string;
  category: 'Medical & Health' | 'Parenting Time & Handover' | 'Education & Schooling' | 'Communication & Order 9.1' | 'Emotional & Psychological Harm' | 'Relocation Risk';
  severity: 'Critical' | 'High' | 'Medium' | 'Routine';
  description: string;
  affectedChildren: string[];
  dateIdentified: string;
  status: 'Active Concern' | 'Escalated to Court' | 'Resolved / Mitigated' | 'Under Monitoring';
  s60CCFactorRef: string;
  corroboratingEvidence: { docId: string; title: string; date: string; citation: string; excerpt: string }[];
  recommendedRemedyOrOrder: string;
  aiGenerated?: boolean;
}

export interface CourtCriterion {
  id: string;
  statutoryRef: string;
  title: string;
  officialLegalTest: string;
  practicalIndicators: string[];
  aiFlaggedEvidence: {
    type: 'favorable_to_applicant' | 'respondent_risk_flag';
    description: string;
    docId?: string;
    citation?: string;
    date?: string;
  }[];
  evidentiaryStrength: 'Strong Applicant Position' | 'Moderate / Active Scrutiny' | 'High Respondent Risk' | 'Neutral';
  relevantDocIds: string[];
  relevanceSummary: string;
}

export interface EvidenceCitation {
  citation: string;
  docId?: string;
  title: string;
  exhibitNumber?: string;
  relevance: string;
}

export interface ProposedOrderAssessment {
  assessedAt: string;
  overallFeasibility: 'Strong Court Prospect' | 'Moderate / Needs Clause Tuning' | 'Moderate - Needs Safeguard' | 'High Conflict Risk' | 'High Risk of Breach';
  riskLevel?: 'Low' | 'Medium' | 'High' | 'Critical';
  evidenceCitations?: EvidenceCitation[];
  statutoryFactorsReferenced?: string[];
  courtCriteriaCheck: {
    criterionId: string;
    statutoryRef: string;
    alignmentAnalysis: string;
    passesBestInterests: boolean;
  }[];
  pastDisputesCheck: {
    disputeSummary: string;
    breachedOrderRef?: string;
    relevantIncidents: string[];
  }[];
  observedPartyBehaviourRisk: {
    party: string;
    behaviorPattern: string;
    riskOfBreach: 'High' | 'Medium' | 'Low';
    rationale: string;
  };
  recommendedDraftingImprovements: string[];
  suggestedSafeguardClause: string;
}

export interface ProposedParentingOrder {
  id: string;
  orderNumber: string;
  category: 'Parental Responsibility' | 'Living Arrangements / Care Time' | 'Medical & Therapy' | 'Education & Extracurricular' | 'Communication & Notice' | 'Injunctions & Restraints';
  title: string;
  proposedText: string;
  rationale: string;
  selectedForAiReview: boolean;
  proposingParty?: 'Benjamin Hawkins' | 'Sue-Anne Hawkins';
  assessment?: ProposedOrderAssessment;
}

export interface BreachReportMetrics {
  totalBreaches: number;
  severeCount: number;
  moderateCount: number;
  minorCount: number;
  byOrder: Record<string, number>;
  byCategory: Record<string, number>;
  avgCommunicationLagHours?: number;
  corroborationRatePercentage: number;
}

export interface BreachSummaryReport {
  reportTitle: string;
  caseNumber: string;
  parties: string;
  children: string;
  periodCovered: string;
  compiledDate: string;
  executiveSummary: string;
  patternAnalysis: string;
  statutoryContraventionAnalysis: {
    reasonableExcuseEvaluation: string;
    primaFacieGroundsSummary: string;
    statutoryProvisions: string[];
  };
  impactOnChildrenSummary: string;
  recommendedLegalRemedies: string[];
  breachMetrics: BreachReportMetrics;
  compiledBy?: string;
  evidentiaryStandardNote?: string;
}

export interface ChildProfile {
  name: string;
  dob: string;
  age: number;
  school?: string;
}

export interface CaseSettings {
  caseNumber: string;
  court: string;
  registry: string;
  applicant: string;
  respondent: string;
  children: ChildProfile[];
  ordersDate: string;
  statutoryRegime: string;
  counsel: string;
  responseWindowHours: number; // default 42
  medicalNoticeHours: number; // default 24
  travelNoticeDays: number; // default 28
  strictZeroHallucination: boolean;
  aiModel: 'gemini-3.8-flash' | 'gemini-3.5-flash' | 'gemini-3.1-flash-lite' | 'gemini-3.1-pro-preview' | 'gemini-2.5-flash' | 'gemini-2.5-pro';
  enforceDocumentCitation: boolean;
  driveImportFolder: string;
  autoIngestPolling: boolean;
}


// ═══════════════════════════════════════════════════════════════════
// COVERAGE ANALYSIS — powers the floating assistant's ability to explain
// why a record was NOT generated, and what knowledge is missing.
// ═══════════════════════════════════════════════════════════════════

export type CoverageIssueType =
  | 'document_no_timeline_event'
  | 'document_no_child_attribution'
  | 'document_no_response_link'
  | 'document_unread_fulltext'
  | 'communication_unassessed_productivity'
  | 'child_timeline_category_empty'
  | 'child_profile_never_reviewed'
  | 'criterion_no_evidence'
  | 'order_no_compliance_evidence'
  | 'timeline_event_uncited'
  | 'response_completed_but_non_productive';

export interface CoverageFinding {
  id: string;
  type: CoverageIssueType;
  severity: 'Critical' | 'High' | 'Moderate' | 'Informational';
  /** Human label for the thing that is missing coverage. */
  subject: string;
  subjectId?: string;
  /** What is missing, stated plainly. */
  explanation: string;
  /** Why the pipeline did not produce it — the diagnostic. */
  likelyCause: string;
  /** What to do about it. */
  remediation: string;
  affectedChild?: ChildName | 'Both';
}

export interface CoverageReport {
  generatedAt: string;
  totals: {
    documents: number;
    documentsWithTimelineEvents: number;
    documentsWithoutTimelineEvents: number;
    timelineEvents: number;
    timelineEventsWithChildAttribution: number;
    communications: number;
    communicationsAssessedForProductivity: number;
    nonProductiveCommunications: number;
    childProfilesPresent: number;
    emptyChildTimelineCategories: number;
    criteriaWithoutEvidence: number;
  };
  perChild: {
    child: ChildName;
    profilePresent: boolean;
    eventCount: number;
    categoryCounts: Partial<Record<ChildTimelineCategory, number>>;
    emptyCategories: ChildTimelineCategory[];
    lastReviewed?: string;
  }[];
  findings: CoverageFinding[];
  missingKnowledgeInsights: string[];
}
