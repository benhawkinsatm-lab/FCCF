import { describe, it, expect } from 'vitest';
import {
  assessCommunicationProductivity,
  detectNonProductiveMarkers,
  detectChildrenReferenced,
  ensureAssessments
} from '../src/utils/communicationProductivity';
import { CommunicationMessage } from '../src/types';

describe('Communication Productivity & Non-Productive Markers', () => {
  it('detects Stonewalling / Refusal to Engage', () => {
    const text = 'I am not going to discuss this with you. Talk to my lawyer.';
    const markers = detectNonProductiveMarkers(text);
    expect(markers).toContain('Stonewalling / Refusal to Engage');
  });

  it('detects Deflection and Counter-Accusations', () => {
    const text = "You're the one who broke the agreement, you always do this.";
    const markers = detectNonProductiveMarkers(text);
    expect(markers).toContain('Deflection / Counter-Accusation');
  });

  it('detects Unilateral Directives without consultation', () => {
    const text = "I've already booked the holiday flights for Isabella and Mason. This is final.";
    const markers = detectNonProductiveMarkers(text);
    expect(markers).toContain('Unilateral Directive (No Consultation)');
  });

  it('detects Deferred Without Date evasions', () => {
    const text = "I'll let you know when I have time, we'll see.";
    const markers = detectNonProductiveMarkers(text);
    expect(markers).toContain('Deferred Without Date');
  });

  it('classifies substantive and productive coordination as Productive', () => {
    const text = 'Confirmed. I will collect Isabella and Mason from Bassendean Primary School at 3:00pm on Friday pursuant to Order 4.';
    const assessment = assessCommunicationProductivity({
      content: text,
      isReply: true,
    });
    expect(assessment.productivity).toBe('Productive');
    expect(assessment.substantiveResponse).toBe(true);
    expect(assessment.markers).toHaveLength(0);
  });

  it('classifies evasive message as Non-Productive even if courteous', () => {
    const text = 'Thank you for your message. However, no further correspondence will be entered into on this topic.';
    const assessment = assessCommunicationProductivity({
      content: text,
      isReply: true,
    });
    expect(assessment.productivity).toBe('Non-Productive');
    expect(assessment.substantiveResponse).toBe(false);
    expect(assessment.markers).toContain('Stonewalling / Refusal to Engage');
  });

  it('correctly attributes named children in communication text', () => {
    expect(detectChildrenReferenced('Please send Isabella medication')).toEqual(['Isabella']);
    expect(detectChildrenReferenced('Mason has soccer practice')).toEqual(['Mason']);
    expect(detectChildrenReferenced('Both kids are ready for collection')).toEqual(['Isabella', 'Mason']);
  });

  it('ensures unassessed communications in a list receive deterministic assessments', () => {
    const rawMessages: CommunicationMessage[] = [
      {
        id: 'MSG-001',
        sender: 'Sue-Anne Hawkins',
        recipient: 'Benjamin Hawkins',
        timestamp: '2024-05-24 14:00',
        channel: 'SMS',
        content: 'Deal with it. Talk to my lawyer. Mason has nothing to say to you.',
        tone: 'Hostile',
        breachOf42HourMandate: false,
        docRefId: 'DOC-2024-001',
      },
    ];

    const assessed = ensureAssessments(rawMessages);
    expect(assessed[0].productivityAssessment).toBeDefined();
    expect(assessed[0].productivityAssessment?.productivity).toBe('Non-Productive');
    expect(assessed[0].childrenReferenced).toContain('Mason');
  });
});
