export type AnnotationColor = 'yellow' | 'amber' | 'emerald' | 'sky' | 'rose' | 'purple';

export interface DocumentAnnotation {
  id: string;
  docId: string;
  type: 'highlight' | 'sticky_note';
  textSnippet: string; // The quoted or highlighted text in the document
  comment: string; // Deponent or legal counsel commentary
  color: AnnotationColor;
  author: string;
  createdAt: string;
  categoryTag?: string; // e.g. "Order Breach", "Contradiction", "Financial Disclosure"
}

export type BinderGroupingMode = 'chronological' | 'tag' | 'category' | 'weight';

export interface BinderCoversheetConfig {
  courtName: string;
  registry: string;
  fileNumber: string;
  caseName: string;
  applicantName: string;
  respondentName: string;
  deponentName: string;
  witnessTitle: string;
  filingDate: string;
  bundleTitle: string;
  matterDescription: string;
  solicitorFirmOrDeponentNote: string;
  includeSummaryStats: boolean;
  includeTableOfContents: boolean;
  includeAnnotations: boolean;
  groupBy: BinderGroupingMode;
}

export interface BatchTagPayload {
  targetDocIds: string[];
  tags: string[];
  action: 'add' | 'replace' | 'remove';
}
