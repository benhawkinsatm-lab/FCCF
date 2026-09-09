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
  CaseSettings
} from '../types';

export const CASE_METADATA: CaseSettings = {
  caseNumber: '4344/2023',
  court: 'Family Court of Western Australia',
  registry: 'Perth',
  applicant: 'Benjamin James (Ben) Hawkins',
  respondent: 'Sue-Anne Hawkins',
  children: [
    { name: 'Isabella Hawkins', dob: '2014-07-12', age: 10, school: 'Bassendean Primary School' },
    { name: 'Mason Hawkins', dob: '2015-02-18', age: 9, school: 'Bassendean Primary School' },
  ],
  ordersDate: '2023-11-14',
  statutoryRegime: 'Family Law Act 1975 (Cth) / Family Court Act 1997 (WA)',
  counsel: 'Davies & Associates Family Lawyers',
  responseWindowHours: 42,
  medicalNoticeHours: 24,
  travelNoticeDays: 28,
  strictZeroHallucination: true,
  aiModel: 'gemini-2.5-flash',
  enforceDocumentCitation: true,
  driveImportFolder: 'FCWA_Case_4344_Import_Inbox',
  autoIngestPolling: true,
};

// Verified Primary Evidence Documents
export const INITIAL_DOCUMENTS: DocumentRecord[] = [
  {
    id: 'DOC-2024-001',
    title: 'Mobile Device SMS Export (+61404533981)',
    category: 'Direct Communication',
    date: '2024-03-21',
    sourceOrigin: 'Mobile Device SMS Backup (+61404533981 / Sue-Anne Hawkins)',
    evidentiaryWeight: 'Third-Party Objective',
    fileType: 'pdf',
    fileSize: '27.4 MB (28,065.6 KB)',
    annexureNumber: 'BJH-1',
    excerpt: 'Contemporaneous mobile device SMS communication log exported from carrier/handset (+61404533981). Creation: 2024-03-21 via Skia/PDF m122. Admissible under Evidence Act 1906 (WA) s 79C and Evidence Act 1995 (Cth) s 48 as objective proof of notices, changeover communications, and response latencies.',
    fullText: 'Mobile Device SMS Export (+61404533981)\nFile Format: PDF (28,065.6 KB)\nCreation Date: 2024-03-21 05:03:00 UTC\nEngine: Skia/PDF m122 (Chromium 122.0.0.0 Edg/122.0.0.0)\nParty/Recipient: Sue-Anne Hawkins (+61404533981)\nAdmissibility Status: Admissible contemporaneous business/device record.\nSummary: Complete chronological mobile device text communication thread establishing contemporaneous changeover notices, school attendance discussions, medical therapy consultation notices, and timestamped response latency against the 42-hour court mandate (Order 9.1).',
    tags: ['SMS Export', 'Contemporaneous Record', 'Order 9.1 Compliance', 'Mobile Device Audit', 'Admissible Evidence'],
    metadata: {
      creator: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Edg/122.0.0.0',
      producer: 'Skia/PDF m122',
      creationDate: '2024-03-21T05:03:00Z',
      fileSizeKb: 28065.6,
      admissibility: 'Admissible under Evidence Act 1906 (WA) s 79C / Family Law Act 1975 s 69ZX',
      targetNumber: '+61404533981'
    }
  }
];

// All mock timeline events removed
export const INITIAL_TIMELINE_EVENTS: TimelineEvent[] = [];

// All mock orders removed
export const PARENTING_ORDERS: ParentingOrder[] = [];

// All mock discrepancies removed
export const DISCREPANCIES: DiscrepancyItem[] = [];

// All mock knowledge gaps removed
export const KNOWLEDGE_GAPS: KnowledgeGap[] = [];

// All mock communication logs removed
export const COMMUNICATION_LOGS: CommunicationMessage[] = [];

// Real statutory form templates preserved
export const FCWA_TEMPLATES = [
  {
    id: 'FCWA-FORM-1',
    name: 'Form 1: Initiating Application (Parenting Orders)',
    jurisdiction: 'Family Court of Western Australia',
    description: 'Application for final and interim parenting orders pursuant to Family Court Act 1997 (WA) & Family Law Act 1975 (Cth)',
    sections: ['Part A: Orders Sought', 'Part B: The Children', 'Part C: Previous Orders', 'Part D: Family Dispute Resolution (s 60I)'],
  },
  {
    id: 'FCWA-FORM-AFFIDAVIT',
    name: 'Affidavit (Family Court of WA Standard Form)',
    jurisdiction: 'Family Court of Western Australia',
    description: 'Sworn evidence in chief of deponent with formal numbered paragraphs and jurat.',
    sections: ['Deponent Details', 'Background & Orders', 'Care Arrangements', 'Medical & Education', 'Contraventions & Breaches', 'Annexures Certificate'],
  },
  {
    id: 'FCWA-FORM-CONTRAVENTION',
    name: 'Form 2: Application for Contravention (Div 13A)',
    jurisdiction: 'Family Court of Western Australia',
    description: 'Application alleging contravention of parenting orders without reasonable excuse.',
    sections: ['Order Alleged Contravened', 'Particulars of Breach', 'Reasonable Excuse Assessment', 'Penalties Sought (s 70NFB)'],
  }
];

// All mock response requirements removed
export const INITIAL_RESPONSE_REQUIREMENTS: ResponseRequirement[] = [];

// Clean party profile baseline structures for proceedings
export const INITIAL_PARTY_PROFILES: PartyProfile[] = [
  {
    id: 'PROF-001',
    partyName: 'Benjamin Hawkins',
    role: 'Applicant (Father)',
    age: 41,
    summary: 'Applicant Father in Family Court of WA proceedings.',
    behaviour: {
      summary: 'Awaiting evidentiary assessment.',
      traits: [],
      orderComplianceRating: 'N/A',
      observedIncidentsCount: 0,
      riskFactors: []
    },
    concerns: {
      raisedByParty: [],
      substantiatedConcernsAgainstParty: [],
      safetyAndWellbeingNotes: ''
    },
    communicationTonePattern: {
      primaryTone: 'Neutral',
      avgResponseLatencyHours: 0,
      order9BreachRate: '0.0%',
      toneCharacteristics: [],
      verbatimExamples: []
    },
    parentingCapacity: {
      schoolEngagement: '',
      medicalManagement: '',
      routineConsistency: ''
    },
    evidentiaryReferences: []
  },
  {
    id: 'PROF-002',
    partyName: 'Sue-Anne Hawkins',
    role: 'Respondent (Mother)',
    age: 39,
    summary: 'Respondent Mother in Family Court of WA proceedings.',
    behaviour: {
      summary: 'Awaiting evidentiary assessment.',
      traits: [],
      orderComplianceRating: 'N/A',
      observedIncidentsCount: 0,
      riskFactors: []
    },
    concerns: {
      raisedByParty: [],
      substantiatedConcernsAgainstParty: [],
      safetyAndWellbeingNotes: ''
    },
    communicationTonePattern: {
      primaryTone: 'Neutral',
      avgResponseLatencyHours: 0,
      order9BreachRate: '0.0%',
      toneCharacteristics: [],
      verbatimExamples: []
    },
    parentingCapacity: {
      schoolEngagement: '',
      medicalManagement: '',
      routineConsistency: ''
    },
    evidentiaryReferences: []
  }
];

// All mock issues removed
export const INITIAL_ISSUES_CONCERNS: IssueConcern[] = [];

// Core statutory criteria under Family Law Act 1975 s 60CC (Cleaned of all mock evidence citations)
export const INITIAL_COURT_CRITERIA: CourtCriterion[] = [
  {
    id: 's60CC-2a',
    statutoryRef: 'Family Law Act 1975, s 60CC(2)(a)',
    title: 'Arrangements that promote the safety of the children and caregivers (from harm, neglect & violence)',
    officialLegalTest: 'What arrangements will promote the safety (including safety from family violence, abuse, neglect, or other harm) of the child, and each person who has care of the child.',
    practicalIndicators: [
      'Diligent medical compliance and prompt emergency disclosure (Asthma, medication, hospitalisations)',
      'Stable physical environment without sudden unannounced travel or residential flight',
      'Protection from emotional volatility and hostile confrontations during handovers',
      'Presence of safety nets and trusted medical providers'
    ],
    aiFlaggedEvidence: [],
    evidentiaryStrength: 'Neutral',
    relevantDocIds: [],
    relevanceSummary: 'Awaiting document ingestion and evidentiary analysis against s 60CC(2)(a).'
  },
  {
    id: 's60CC-2b',
    statutoryRef: 'Family Law Act 1975, s 60CC(2)(b)',
    title: 'Any views expressed by the children',
    officialLegalTest: 'Any views expressed by the child, and any factors (such as the child’s maturity or level of understanding) that the court thinks are relevant to the weight it should give to the child’s views.',
    practicalIndicators: [
      'Wishes expressed to school counsellors or family report writers',
      'Freedom from parental coaching or alienating pressure',
      'Desire for calm transitions between homes without feeling caught in conflict'
    ],
    aiFlaggedEvidence: [],
    evidentiaryStrength: 'Neutral',
    relevantDocIds: [],
    relevanceSummary: 'Awaiting documentary evidence or expert reports regarding children\'s expressed views.'
  },
  {
    id: 's60CC-2c',
    statutoryRef: 'Family Law Act 1975, s 60CC(2)(c)',
    title: 'Developmental, psychological, emotional and cultural needs of the children',
    officialLegalTest: 'The developmental, psychological, emotional and cultural needs of the child.',
    practicalIndicators: [
      'Uninterrupted continuity in educational and allied therapy interventions',
      'Consistent daily routine, homework completion, and sleep schedules',
      'Support for peer relationships and extracurricular sports'
    ],
    aiFlaggedEvidence: [],
    evidentiaryStrength: 'Neutral',
    relevantDocIds: [],
    relevanceSummary: 'Awaiting therapy, school, and developmental records.'
  },
  {
    id: 's60CC-2d',
    statutoryRef: 'Family Law Act 1975, s 60CC(2)(d)',
    title: 'Capacity of each person to provide for the children\'s needs',
    officialLegalTest: 'The capacity of each person who has parental responsibility for the child to provide for the child’s developmental, psychological, emotional and cultural needs.',
    practicalIndicators: [
      'Financial and practical commitment to healthcare and education',
      'Emotional maturity and ability to separate adult disputes from parenting',
      'Punctuality, organization, and adherence to legal agreements'
    ],
    aiFlaggedEvidence: [],
    evidentiaryStrength: 'Neutral',
    relevantDocIds: [],
    relevanceSummary: 'Awaiting records demonstrating each party\'s parenting capacity and adherence to routine.'
  },
  {
    id: 's60CC-2e',
    statutoryRef: 'Family Law Act 1975, s 60CC(2)(e)',
    title: 'Benefit to the children of having a relationship with each parent',
    officialLegalTest: 'The benefit to the child of having a relationship with the child’s parents, and other people significant to the child, where it is safe to do so.',
    practicalIndicators: [
      'Willingness of each parent to facilitate and encourage a positive bond with the other parent',
      'Absence of gatekeeping or unilateral withholding of parenting time',
      'Support for telephone and electronic contact during non-residential periods'
    ],
    aiFlaggedEvidence: [],
    evidentiaryStrength: 'Neutral',
    relevantDocIds: [],
    relevanceSummary: 'Awaiting records regarding facilitation of relationship with each parent.'
  },
  {
    id: 's60CC-2f',
    statutoryRef: 'Family Law Act 1975, s 60CC(2)(f)',
    title: 'Anything else relevant to the circumstances of the children',
    officialLegalTest: 'Anything else that is relevant to the particular circumstances of the child (e.g. geographical stability, practical implementation of orders).',
    practicalIndicators: [
      'Proximity to children\'s primary school and peer networks',
      'Clear, enforceable drafting of handover times and communication channels to prevent future litigation'
    ],
    aiFlaggedEvidence: [],
    evidentiaryStrength: 'Neutral',
    relevantDocIds: [],
    relevanceSummary: 'Awaiting evidence on geographical stability and practical order implementation.'
  },
  {
    id: 's60CC-2Aa',
    statutoryRef: 's60CC(2A)(a) Family Law Act 1975 (Cth)',
    title: 'History of family violence, abuse or neglect',
    officialLegalTest: 'Any history of family violence, abuse or neglect involving the child or a person caring for the child - the court must specifically consider this.',
    practicalIndicators: [
      'Incidents of verbal abuse, gate confrontations, or intimidation witnessed by children',
      'Medical neglect through intentional withholding of emergency care plans or prescribed medicines',
      'Coercive gatekeeping and threats to alienate children from the other parent',
      'Impact of domestic conflict on children\'s emotional and psychological security'
    ],
    aiFlaggedEvidence: [],
    evidentiaryStrength: 'Neutral',
    relevantDocIds: [],
    relevanceSummary: 'Awaiting evidentiary filings regarding family safety and historical interactions.'
  },
  {
    id: 's60CC-2Ab',
    statutoryRef: 's60CC(2A)(b) Family Law Act 1975 (Cth)',
    title: 'Existing family violence orders',
    officialLegalTest: 'Any family violence order that applies, or has applied, to the child or a member of the child\'s family.',
    practicalIndicators: [
      'Existence, terms, and history of state Family Violence Restraining Orders (FVROs)',
      'Consistency between Family Court parenting orders and state protection orders',
      'Misuse of police callouts or vexatious applications to disrupt court-ordered care'
    ],
    aiFlaggedEvidence: [],
    evidentiaryStrength: 'Neutral',
    relevantDocIds: [],
    relevanceSummary: 'Awaiting court registry searches or protection order records.'
  },
  {
    id: 's60CC-3a',
    statutoryRef: 's60CC(3)(a) Family Law Act 1975 (Cth)',
    title: 'Aboriginal or Torres Strait Islander child\'s right to enjoy their culture',
    officialLegalTest: 'For a child who is Aboriginal or Torres Strait Islander: the child\'s right to enjoy their culture, including the right to connect with, and maintain their connection with, family, community, culture, country and language.',
    practicalIndicators: [
      'Verification of Indigenous ancestry or cultural connection for either lineage',
      'Opportunities for child to participate in community, cultural, and language events',
      'Preservation of kinship ties and connection with extended Indigenous family'
    ],
    aiFlaggedEvidence: [],
    evidentiaryStrength: 'Neutral',
    relevantDocIds: [],
    relevanceSummary: 'Awaiting cultural heritage background and details.'
  },
  {
    id: 's60CC-3c',
    statutoryRef: 's60CC(3)(c) Family Law Act 1975 (Cth)',
    title: 'Likely impact of proposed orders on cultural rights',
    officialLegalTest: 'The likely impact any proposed parenting order will have on the Aboriginal or Torres Strait Islander child\'s right to enjoy their culture.',
    practicalIndicators: [
      'Assessment of proposed living arrangements on child\'s cultural connections',
      'Safeguards against cultural alienation or severed community ties'
    ],
    aiFlaggedEvidence: [],
    evidentiaryStrength: 'Neutral',
    relevantDocIds: [],
    relevanceSummary: 'Awaiting proposed orders review against cultural impact.'
  },
  {
    id: 's60CC-derived-medical',
    statutoryRef: 'derived from s60CC(2)(c)/(d)',
    title: 'Provides medical and health care when required',
    officialLegalTest: 'Whether a parent responds appropriately to the child\'s medical and health needs - an indicator relevant to developmental/psychological needs and parental capacity.',
    practicalIndicators: [
      'Immediate written disclosure within 24 hours of non-routine medical consultations and emergencies (Order 5.1)',
      'Diligent administration and adherence to specialist asthma and medication protocols',
      'Timely attendance and proactive engagement with allied health specialists',
      'Sharing of hospital discharge summaries and medical practitioner directions'
    ],
    aiFlaggedEvidence: [],
    evidentiaryStrength: 'Neutral',
    relevantDocIds: [],
    relevanceSummary: 'Awaiting medical reports, discharge notes, and prescription logs.'
  },
  {
    id: 's60CC-derived-financial',
    statutoryRef: 'derived from s60CC(2)(d); see also Child Support (Assessment) Act 1989',
    title: 'Provides financial support for the child',
    officialLegalTest: 'Whether a parent meets their financial obligations toward the child (e.g. child support, shared costs) - relevant to capacity to provide for the child\'s needs.',
    practicalIndicators: [
      'Compliance with Services Australia Child Support assessments and on-time transfers',
      'Equal 50% sharing of agreed school levies, uniforms, and out-of-pocket medical bills',
      'Provision of required stationery, devices, and sporting gear during residential periods'
    ],
    aiFlaggedEvidence: [],
    evidentiaryStrength: 'Neutral',
    relevantDocIds: [],
    relevanceSummary: 'Awaiting child support statements and expense contribution records.'
  },
  {
    id: 's60CC-derived-education',
    statutoryRef: 'derived from s60CC(2)(c)',
    title: 'Facilitates the child\'s education needs',
    officialLegalTest: 'Whether a parent supports the child\'s schooling and educational needs.',
    practicalIndicators: [
      'Maintenance of regular, punctual school attendance and avoidance of unexcused absences',
      'Joint attendance and constructive participation in parent-teacher interviews',
      'Supervision of homework, reading records, and extracurricular school programs',
      'Respect for educational boundaries and staff at changeover locations'
    ],
    aiFlaggedEvidence: [],
    evidentiaryStrength: 'Neutral',
    relevantDocIds: [],
    relevanceSummary: 'Awaiting school attendance audits and teacher reports.'
  },
  {
    id: 's60CC-derived-communication',
    statutoryRef: 'derived from s60CC(2)(d)',
    title: 'Responds to communications in a timely manner',
    officialLegalTest: 'Whether a parent communicates and responds to the other parent (and relevant third parties, e.g. schools) about the child in a timely, cooperative manner - relevant to co-parenting capacity.',
    practicalIndicators: [
      'Compliance with response timelines for written parenting queries',
      'Use of courteous, business-like, and child-centered communication (BIFF standards)',
      'Prompt responses to urgent school, medical, and travel coordination messages',
      'Avoidance of strategic communication blackouts immediately prior to handovers'
    ],
    aiFlaggedEvidence: [],
    evidentiaryStrength: 'Neutral',
    relevantDocIds: [],
    relevanceSummary: 'Awaiting communication records, email threads, and messaging audits.'
  },
  {
    id: 's60CC-general-credibility',
    statutoryRef: 'general credibility consideration',
    title: 'Provides truthful information to the Court and professionals',
    officialLegalTest: 'Whether a parent has provided honest, non-misleading information to the Court, family report writers, or other professionals involved in the matter - relevant to credibility and best-interests assessment generally.',
    practicalIndicators: [
      'Accuracy of sworn affidavit statements when tested against objective third-party documentary records',
      'Full candor with treating doctors, allied health professionals, and school executives',
      'Absence of fabricated emergencies or deceptive reasons for cancelling scheduled care time'
    ],
    aiFlaggedEvidence: [],
    evidentiaryStrength: 'Neutral',
    relevantDocIds: [],
    relevanceSummary: 'Awaiting sworn affidavits and corroborating third-party documents.'
  }
];

// All mock proposed orders removed
export const INITIAL_PROPOSED_ORDERS: ProposedParentingOrder[] = [];
