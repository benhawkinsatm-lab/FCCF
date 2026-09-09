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
  childrenMentioned: ('Isabella' | 'Mason')[];
  primaryDocId: string;
  citation: string;
  orderBreachFlag: boolean;
  breachedOrderNumber?: string;
  breachSeverity?: 'Minor' | 'Moderate' | 'Severe';
  sentimentScore?: 'Hostile' | 'Neutral' | 'Cooperative';
  responseLagHours?: number; // Flag if > 42 hours
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
  parentingCapacity: {
    schoolEngagement: string;
    medicalManagement: string;
    routineConsistency: string;
  };
  evidentiaryReferences: { docId: string; title: string; citation: string; note: string }[];
  lastAiReviewTimestamp?: string;
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
  aiModel: 'gemini-2.5-flash' | 'gemini-2.5-pro';
  enforceDocumentCitation: boolean;
  driveImportFolder: string;
  autoIngestPolling: boolean;
}

