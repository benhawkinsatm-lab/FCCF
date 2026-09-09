import { describe, it, expect } from 'vitest';
import {
  analyzeCaseCoverage,
  generateCoverageSummaryText
} from '../src/utils/caseCoverageAnalysis';
import {
  DocumentRecord,
  TimelineEvent,
  CommunicationMessage
} from '../src/types';

describe('Case Coverage Analysis & Missing Knowledge Diagnostics', () => {
  const sampleDoc: DocumentRecord = {
    id: 'DOC-2024-001',
    title: 'Mobile Device SMS Export',
    category: 'Direct Communication',
    date: '2024-04-12',
    sourceOrigin: 'Telstra Mobile Transcript',
    evidentiaryWeight: 'Third-Party Objective',
    annexureNumber: 'Annexure BJH-4',
    fileType: 'pdf',
    fileSize: '1.2 MB',
    excerpt: 'SMS exchange regarding Busselton withholding.',
    fullText: 'Full SMS logs.',
  };

  const sampleEvent: TimelineEvent = {
    id: 'EVT-001',
    date: '2024-04-12',
    title: 'Busselton Withholding',
    description: 'Care time denied without notice.',
    category: 'Direct Communication',
    sourceOrigin: 'SMS Record',
    evidentiaryWeight: 'Third-Party Objective',
    partiesInvolved: ['Benjamin Hawkins', 'Sue-Anne Hawkins'],
    childrenMentioned: ['Isabella', 'Mason'],
    primaryDocId: 'DOC-2024-001',
    citation: '[DOC-2024-001] Annexure BJH-4',
    orderBreachFlag: true,
  };

  const sampleMsg: CommunicationMessage = {
    id: 'MSG-001',
    sender: 'Sue-Anne Hawkins',
    recipient: 'Benjamin Hawkins',
    timestamp: '2024-04-12 16:30',
    channel: 'SMS',
    content: "I've taken the kids to Busselton. Deal with it. This is final.",
    tone: 'Hostile',
    breachOf42HourMandate: true,
    docRefId: 'DOC-2024-001',
  };

  it('reports 100% document-to-timeline coverage when all documents are cited in chronology', () => {
    const report = analyzeCaseCoverage({
      documents: [sampleDoc],
      timeline: [sampleEvent],
      communicationMessages: [sampleMsg],
      responseRequirements: [],
      partyProfiles: [],
      courtCriteria: [],
      orders: [],
      issuesConcerns: [],
      knowledgeGaps: [],
    });

    expect(report.totals.documents).toBe(1);
    expect(report.totals.documentsWithTimelineEvents).toBe(1);
    expect(report.totals.documentsWithoutTimelineEvents).toBe(0);
    expect(report.totals.timelineEvents).toBe(1);
  });

  it('flags unlinked documents as coverage gaps with specific diagnosis', () => {
    const orphanDoc: DocumentRecord = {
      id: 'DOC-2024-099',
      title: 'Unlinked Medical Dental Invoice',
      category: 'Medical',
      date: '2024-05-10',
      sourceOrigin: 'Dental Clinic',
      evidentiaryWeight: 'Third-Party Objective',
      annexureNumber: 'Annexure BJH-99',
      fileType: 'medical_report',
      fileSize: '300 KB',
      excerpt: 'Routine orthodontic review invoice.',
      fullText: 'Invoice text.',
    };

    const report = analyzeCaseCoverage({
      documents: [sampleDoc, orphanDoc],
      timeline: [sampleEvent],
      communicationMessages: [],
      responseRequirements: [],
      partyProfiles: [],
      courtCriteria: [],
      orders: [],
      issuesConcerns: [],
      knowledgeGaps: [],
    });

    expect(report.totals.documentsWithoutTimelineEvents).toBe(1);
    const finding = report.findings.find(f => f.subjectId === 'DOC-2024-099');
    expect(finding).toBeDefined();
    expect(finding?.type).toBe('document_no_timeline_event');
    expect(finding?.explanation).toContain('No timeline event references [DOC-2024-099]');
  });

  it('generates human-readable coverage summary text for AI assistant', () => {
    const report = analyzeCaseCoverage({
      documents: [sampleDoc],
      timeline: [sampleEvent],
      communicationMessages: [sampleMsg],
      responseRequirements: [],
      partyProfiles: [],
      courtCriteria: [],
      orders: [],
      issuesConcerns: [],
      knowledgeGaps: [],
    });

    const summaryText = generateCoverageSummaryText(report);
    expect(summaryText).toContain('COVERAGE TOTALS:');
    expect(summaryText).toContain('"documents":1');
    expect(summaryText).toContain('CHILD Isabella:');
    expect(summaryText).toContain('CHILD Mason:');
  });
});
