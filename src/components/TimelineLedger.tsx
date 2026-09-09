import React from 'react';
import { TimelineEvent, DocumentRecord } from '../types';
import { VisualTimeline } from './VisualTimeline';

interface TimelineLedgerProps {
  timeline: TimelineEvent[];
  documents: DocumentRecord[];
  onViewDocument: (doc: DocumentRecord) => void;
  onAddEvent: (event: TimelineEvent) => void;
}

export const TimelineLedger: React.FC<TimelineLedgerProps> = ({
  timeline,
  documents,
  onViewDocument,
  onAddEvent,
}) => {
  return (
    <VisualTimeline
      timeline={timeline}
      documents={documents}
      onViewDocument={onViewDocument}
      onAddEvent={onAddEvent}
    />
  );
};
