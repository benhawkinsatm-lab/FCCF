import { describe, it, expect } from 'vitest';
import {
  deriveChildImpacts,
  getChildTimeline,
  inferChildCategory
} from '../src/utils/childTimelineService';
import { TimelineEvent } from '../src/types';

describe('Child Timeline Service & Attribution', () => {
  it('correctly infers Health & Medical category from keywords', () => {
    const event: TimelineEvent = {
      id: 'EVT-001',
      date: '2024-05-24',
      title: 'Emergency Department Presentation for Acute Asthma',
      description: 'Mason presented to hospital for acute asthma exacerbation.',
      category: 'Medical',
      sourceOrigin: 'Hospital Discharge Summary',
      evidentiaryWeight: 'Third-Party Objective',
      partiesInvolved: ['Sue-Anne Hawkins'],
      childrenMentioned: ['Mason'],
      primaryDocId: 'DOC-2024-008',
      citation: '[DOC-2024-008]',
      orderBreachFlag: true,
      breachedOrderNumber: 'Order 11',
      breachSeverity: 'Severe',
    };

    const category = inferChildCategory(event);
    expect(category).toBe('Health & Medical');
  });

  it('correctly infers Education & School category from keywords', () => {
    const event: TimelineEvent = {
      id: 'EVT-002',
      date: '2024-03-28',
      title: 'School Attendance Audit',
      description: 'Isabella attendance report at Bassendean Primary School shows zero unexcused absences during Father care.',
      category: 'Education',
      sourceOrigin: 'School Report',
      evidentiaryWeight: 'Third-Party Objective',
      partiesInvolved: ['Benjamin Hawkins'],
      childrenMentioned: ['Isabella'],
      primaryDocId: 'DOC-2024-002',
      citation: '[DOC-2024-002]',
      orderBreachFlag: false,
    };

    const category = inferChildCategory(event);
    expect(category).toBe('Education & School');
  });

  it('derives child impact records with directlyEvidenced flag correctly', () => {
    const event: TimelineEvent = {
      id: 'EVT-003',
      date: '2024-04-12',
      title: 'Weekend Care Withholding',
      description: 'Sue-Anne took Isabella away without notice, withholding care.',
      category: 'Direct Communication',
      sourceOrigin: 'SMS Record',
      evidentiaryWeight: 'Third-Party Objective',
      partiesInvolved: ['Sue-Anne Hawkins'],
      childrenMentioned: ['Isabella', 'Mason'],
      primaryDocId: 'DOC-2024-004',
      citation: '[DOC-2024-004]',
      orderBreachFlag: true,
      breachSeverity: 'Severe',
    };

    const impacts = deriveChildImpacts(event);
    expect(impacts).toHaveLength(2);

    const isabellaImpact = impacts.find(i => i.child === 'Isabella');
    const masonImpact = impacts.find(i => i.child === 'Mason');

    expect(isabellaImpact?.directlyEvidenced).toBe(true);
    // Mason wasn't named directly in the title or description text
    expect(masonImpact?.directlyEvidenced).toBe(false);
    expect(isabellaImpact?.severity).toBe('Critical');
  });

  it('retrieves child timeline ordered chronologically', () => {
    const events: TimelineEvent[] = [
      {
        id: 'EVT-010',
        date: '2024-01-15',
        title: 'Event 1',
        description: 'Isabella checkup',
        category: 'Medical',
        sourceOrigin: 'Clinic',
        evidentiaryWeight: 'Third-Party Objective',
        partiesInvolved: ['Benjamin Hawkins'],
        childrenMentioned: ['Isabella'],
        primaryDocId: 'DOC-01',
        citation: '[DOC-01]',
        orderBreachFlag: false,
      },
      {
        id: 'EVT-020',
        date: '2024-06-20',
        title: 'Event 2',
        description: 'Isabella school event',
        category: 'Education',
        sourceOrigin: 'School',
        evidentiaryWeight: 'Third-Party Objective',
        partiesInvolved: ['Benjamin Hawkins'],
        childrenMentioned: ['Isabella'],
        primaryDocId: 'DOC-02',
        citation: '[DOC-02]',
        orderBreachFlag: false,
      },
    ];

    const timeline = getChildTimeline(events, 'Isabella');
    expect(timeline).toHaveLength(2);
    expect(timeline[0].event.date).toBe('2024-06-20');
    expect(timeline[1].event.date).toBe('2024-01-15');
  });
});
