import {
  ChildName,
  CommunicationMessage,
  CommunicationProductivity,
  NonProductiveMarker,
  ProductivityAssessment,
  VerbatimExample,
} from '../types';

/**
 * Deterministic communication-productivity classifier.
 *
 * Tone answers "how did they say it". Productivity answers "did it move a
 * parenting question forward". These are independent: a civil, on-time reply
 * that answers nothing is Non-Productive, and that is the pattern that
 * matters under FLA s 60CC(2)(d) (capacity to communicate about the child)
 * and Order 9.1, which requires a response — not merely a message.
 *
 * This runs client-side with no AI call so that every communication carries
 * an assessment even when the Gemini key is absent or a review has not been
 * run yet. AI review overwrites it with a richer assessment when available.
 */

interface MarkerRule {
  marker: NonProductiveMarker;
  patterns: RegExp[];
}

const MARKER_RULES: MarkerRule[] = [
  {
    marker: 'Stonewalling / Refusal to Engage',
    patterns: [
      /\bnot (going to |gonna )?(discuss|answer|respond|engage)\b/i,
      /\bdeal with it\b/i,
      /\bdon'?t contact me\b/i,
      /\bthis conversation is over\b/i,
      /\bno further (comment|correspondence|discussion)\b/i,
      /\btalk to my (lawyer|solicitor)\b/i,
    ],
  },
  {
    marker: 'Deflection / Counter-Accusation',
    patterns: [
      /\byou'?re the one who\b/i,
      /\bwhat about (when )?you\b/i,
      /\bmaybe if you\b/i,
      /\byou always\b/i,
      /\byou never\b/i,
      /\bafter what you did\b/i,
    ],
  },
  {
    marker: 'Historical Grievance Raised',
    patterns: [
      /\bback in (19|20)\d{2}\b/i,
      /\blike you did (last|when|before)\b/i,
      /\byears ago\b/i,
      /\bever since (the )?(separation|you left)\b/i,
      /\bfor the (hundredth|thousandth|millionth) time\b/i,
    ],
  },
  {
    marker: 'Disparagement of Other Parent',
    patterns: [
      /\b(pathetic|useless|liar|lying|manipulative|selfish|narcissist|deadbeat|unfit)\b/i,
      /\byou'?re a (terrible|bad|awful) (father|mother|parent)\b/i,
      /\bthe kids (hate|don'?t want to see) you\b/i,
    ],
  },
  {
    marker: 'Emotional Escalation',
    patterns: [
      /\b(disgusting|outrageous|unbelievable|how dare you)\b/i,
      /!{2,}/,
      /\b[A-Z]{6,}\b/,
    ],
  },
  {
    marker: 'Unilateral Directive (No Consultation)',
    patterns: [
      /\bi (have|'ve) (already )?(decided|booked|arranged|changed|cancelled)\b/i,
      /\bthis is (what'?s happening|final|not up for discussion)\b/i,
      /\byou'?ll (just )?have to\b/i,
      /\bi'?m keeping (them|the kids|her|him)\b/i,
    ],
  },
  {
    marker: 'Deferred Without Date',
    patterns: [
      /\bi'?ll (let you know|get back to you|sort it out)\b(?!.{0,40}\b(on|by|before)\b)/i,
      /\bwhen i (get a chance|have time)\b/i,
      /\bwe'?ll see\b/i,
      /\bsometime (soon|next week|later)\b/i,
    ],
  },
  {
    marker: 'Repetition of Settled Matter',
    patterns: [
      /\bas i (already |'ve already )?(said|told you|explained)\b/i,
      /\bi'?m not going over this again\b/i,
      /\bwe'?ve been through this\b/i,
    ],
  },
];

/** Signals that the message actually conveys usable parenting information. */
const SUBSTANTIVE_SIGNALS: RegExp[] = [
  /\b(yes|no|confirmed|agreed|approved)\b/i,
  /\b\d{1,2}[:.]\d{2}\s*(am|pm)?\b/i,
  /\b(mon|tues|wednes|thurs|fri|satur|sun)day\b/i,
  /\b\d{1,2}\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i,
  /\b\d{1,2}[\/\-]\d{1,2}([\/\-]\d{2,4})?\b/i,
  /\b(appointment|prescription|dosage|inhaler|referral|consent form|report card|invoice|receipt)\b/i,
  /\b(dr|doctor|clinic|hospital|school|principal|teacher|coach|therapist)\b/i,
  /\battach(ed|ing)\b/i,
  /\bi (will|'ll) (drop|collect|bring|pick) (them|her|him)\b/i,
];

const CHILD_PATTERNS: { child: ChildName; pattern: RegExp }[] = [
  { child: 'Isabella', pattern: /\b(isabella|izzy|bella)\b/i },
  { child: 'Mason', pattern: /\b(mason|mase)\b/i },
];

const GENERIC_CHILD_PATTERN =
  /\b(the (kids|children)|our (kids|children|daughter|son)|both (kids|children))\b/i;

/** Identify which children a piece of text actually concerns. */
export function detectChildrenReferenced(text: string): ChildName[] {
  const found = CHILD_PATTERNS.filter(c => c.pattern.test(text)).map(c => c.child);
  if (found.length > 0) return found;
  if (GENERIC_CHILD_PATTERN.test(text)) return ['Isabella', 'Mason'];
  return [];
}

export interface ProductivityInput {
  content: string;
  /** True when this message is a reply to a request/inquiry. */
  isReply?: boolean;
  /** The request being answered, if known — improves the assessment. */
  requestAddressed?: string;
  lagHours?: number;
}

/**
 * Classify a single communication. Pure function — no side effects,
 * no network. Safe to call on every render.
 */
export function classifyProductivity(input: ProductivityInput): ProductivityAssessment {
  const text = (input.content || '').trim();
  const markers: NonProductiveMarker[] = [];

  for (const rule of MARKER_RULES) {
    if (rule.patterns.some(p => p.test(text))) {
      markers.push(rule.marker);
    }
  }

  const wordCount = text ? text.split(/\s+/).filter(Boolean).length : 0;
  const childrenReferenced = detectChildrenReferenced(text);
  const childFocusedContent = childrenReferenced.length > 0;

  const substantiveSignalCount = SUBSTANTIVE_SIGNALS.filter(p => p.test(text)).length;

  // A reply carrying no concrete information does not answer anything.
  const answersSomething = substantiveSignalCount > 0;

  if (input.isReply && !answersSomething) {
    markers.push('No Substantive Answer');
  }

  if (!childFocusedContent && wordCount > 12) {
    markers.push('No Child-Related Content');
  }

  if (wordCount > 120 && substantiveSignalCount <= 1) {
    markers.push('Volume Without Information');
  }

  const uniqueMarkers = Array.from(new Set(markers));

  let productivity: CommunicationProductivity;
  if (!text) {
    productivity = 'Unassessed';
  } else if (uniqueMarkers.length === 0 && answersSomething) {
    productivity = 'Productive';
  } else if (uniqueMarkers.length >= 2 || uniqueMarkers.includes('No Substantive Answer')) {
    productivity = 'Non-Productive';
  } else if (uniqueMarkers.length === 1) {
    productivity = answersSomething ? 'Partially Productive' : 'Non-Productive';
  } else {
    productivity = 'Partially Productive';
  }

  const substantiveResponse = Boolean(input.isReply) && answersSomething && productivity !== 'Non-Productive';

  return {
    productivity,
    markers: uniqueMarkers,
    substantiveResponse: input.isReply ? substantiveResponse : answersSomething,
    childFocusedContent,
    rationale: buildRationale(productivity, uniqueMarkers, answersSomething, input),
    assessedBy: 'Deterministic Classifier',
    assessedAt: new Date().toISOString(),
    s60CCFactorRef:
      productivity === 'Non-Productive'
        ? 'derived from s 60CC(2)(d) — capacity to communicate constructively about the children'
        : undefined,
  };
}

function buildRationale(
  productivity: CommunicationProductivity,
  markers: NonProductiveMarker[],
  answersSomething: boolean,
  input: ProductivityInput
): string {
  if (productivity === 'Unassessed') {
    return 'No message content available to assess.';
  }

  const parts: string[] = [];

  if (productivity === 'Productive') {
    parts.push('Message conveys concrete, actionable parenting information.');
  } else {
    parts.push(
      `Classified ${productivity} on substance${
        markers.length ? `: ${markers.join('; ')}` : ''
      }.`
    );
  }

  if (input.isReply && !answersSomething) {
    parts.push(
      'A reply was sent but the information requested was not supplied — timeliness under Order 9.1 is therefore not the same as compliance in substance.'
    );
  }

  if (input.lagHours !== undefined && input.lagHours > 42 && productivity === 'Non-Productive') {
    parts.push(
      `Compounding factor: reply arrived at ${input.lagHours}h, outside the 42-hour written response mandate.`
    );
  }

  return parts.join(' ');
}

/** Returns the stored assessment, or derives one on the fly. */
export function assessMessage(msg: CommunicationMessage): ProductivityAssessment {
  if (msg.productivityAssessment) return msg.productivityAssessment;
  return classifyProductivity({
    content: msg.content,
    isReply: Boolean(msg.responseToId),
    requestAddressed: msg.requestAddressed,
    lagHours: msg.lagHours,
  });
}

/** Backfill assessments across a whole message set (used at load/ingest). */
export function ensureAssessments(messages: CommunicationMessage[]): CommunicationMessage[] {
  return messages.map(m =>
    m.productivityAssessment
      ? m
      : {
          ...m,
          productivityAssessment: assessMessage(m),
          childrenReferenced: m.childrenReferenced ?? detectChildrenReferenced(m.content),
        }
  );
}

export interface PartyProductivitySummary {
  productiveCount: number;
  partiallyProductiveCount: number;
  nonProductiveCount: number;
  nonProductiveRate: string;
  substantiveResponseRate: string;
  dominantNonProductiveMarkers: NonProductiveMarker[];
  nonProductiveExamples: VerbatimExample[];
  assessmentNote: string;
}

/**
 * Aggregate productivity metrics for one party — feeds directly into
 * PartyProfile.communicationProductivityPattern.
 */
export function summariseProductivityForParty(
  messages: CommunicationMessage[],
  partyName: string
): PartyProductivitySummary {
  const own = messages.filter(m => m.sender === partyName);
  const assessments = own.map(m => ({ msg: m, a: assessMessage(m) }));

  const productiveCount = assessments.filter(x => x.a.productivity === 'Productive').length;
  const partiallyProductiveCount = assessments.filter(
    x => x.a.productivity === 'Partially Productive'
  ).length;
  const nonProductiveCount = assessments.filter(x => x.a.productivity === 'Non-Productive').length;

  const assessedTotal = productiveCount + partiallyProductiveCount + nonProductiveCount;

  const replies = assessments.filter(x => Boolean(x.msg.responseToId));
  const substantiveReplies = replies.filter(x => x.a.substantiveResponse).length;

  const markerTally = new Map<NonProductiveMarker, number>();
  assessments.forEach(x =>
    x.a.markers.forEach(m => markerTally.set(m, (markerTally.get(m) || 0) + 1))
  );

  const dominantNonProductiveMarkers = Array.from(markerTally.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([marker]) => marker);

  const nonProductiveExamples: VerbatimExample[] = assessments
    .filter(x => x.a.productivity === 'Non-Productive')
    .slice(0, 3)
    .map(x => ({
      excerpt: x.msg.content.slice(0, 220),
      date: (x.msg.timestamp || '').slice(0, 10),
      context: x.a.markers[0] || 'Non-productive communication',
    }));

  return {
    productiveCount,
    partiallyProductiveCount,
    nonProductiveCount,
    nonProductiveRate: assessedTotal
      ? `${((nonProductiveCount / assessedTotal) * 100).toFixed(1)}%`
      : '0.0%',
    substantiveResponseRate: replies.length
      ? `${((substantiveReplies / replies.length) * 100).toFixed(1)}%`
      : 'N/A (no replies recorded)',
    dominantNonProductiveMarkers,
    nonProductiveExamples,
    assessmentNote: assessedTotal
      ? `${nonProductiveCount} of ${assessedTotal} assessed communications from ${partyName} conveyed no actionable parenting information. Substance is recorded separately from tone and from the Order 9.1 42-hour clock.`
      : `No communications from ${partyName} have been ingested yet — productivity cannot be assessed until communication records are added to the vault.`,
  };
}

export const PRODUCTIVITY_BADGE_CLASSES: Record<CommunicationProductivity, string> = {
  Productive: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'Partially Productive': 'bg-amber-100 text-amber-800 border-amber-200',
  'Non-Productive': 'bg-rose-100 text-rose-800 border-rose-300 font-bold',
  Unassessed: 'bg-slate-100 text-slate-600 border-slate-200',
};

export const assessCommunicationProductivity = classifyProductivity;

export function detectNonProductiveMarkers(text: string): NonProductiveMarker[] {
  return classifyProductivity({ content: text }).markers;
}

