import {
  CHILD_NAMES,
  CHILD_TIMELINE_CATEGORIES,
  ChildImpactRecord,
  ChildName,
  ChildTimelineCategory,
  TimelineEvent,
} from '../types';

/**
 * Per-child timeline service.
 *
 * The case-wide timeline is filed by DocumentCategory (Medical, Education,
 * Legal/Court...). That taxonomy is about where evidence came from. Each
 * child additionally needs their OWN timeline filed by what the event meant
 * for that child — which is the taxonomy the Court actually reasons in when
 * applying s 60CC. This module derives the second view from the first, and
 * preserves any explicit per-child attribution the AI has already recorded.
 */

const CATEGORY_KEYWORDS: { category: ChildTimelineCategory; patterns: RegExp[] }[] = [
  {
    category: 'Views & Wishes Expressed',
    patterns: [
      /\b(said|told|expressed|wants?|wishes?|asked to|doesn'?t want)\b.{0,40}\b(stay|live|see|go)\b/i,
      /\bcounsell?or\b/i,
      /\bfamily report\b/i,
      /\bchild'?s views?\b/i,
    ],
  },
  {
    category: 'Health & Medical',
    patterns: [
      /\b(hospital|asthma|inhaler|prescription|medication|gp|doctor|clinic|emergency|ed presentation|discharge|paediatric|dental|orthodont)\b/i,
    ],
  },
  {
    category: 'Developmental & Therapy',
    patterns: [
      /\b(speech patholog|occupational therap|psycholog|counsell?ing|developmental|allied health|therapy)\b/i,
    ],
  },
  {
    category: 'Education & School',
    patterns: [
      /\b(school|attendance|absent|late|teacher|principal|report card|homework|parent[- ]teacher|enrol)\b/i,
    ],
  },
  {
    category: 'Extracurricular & Social',
    patterns: [
      /\b(football|swimming|training|club|sport|birthday|playdate|friends?)\b/i,
    ],
  },
  {
    category: 'Care Time & Handover',
    patterns: [
      /\b(changeover|handover|pick[- ]?up|drop[- ]?off|withheld?|withholding|care time|weekend|holiday|travel|relocat)\b/i,
    ],
  },
  {
    category: 'Safety & Wellbeing',
    patterns: [
      /\b(safety|police|violence|fvro|restraining|neglect|unsafe|harm|incident)\b/i,
    ],
  },
  {
    category: 'Emotional & Psychological',
    patterns: [
      /\b(distress|upset|anxious|anxiety|withdrawn|crying|disparage|denigrat|conflict|argument|in front of the (kids|children))\b/i,
    ],
  },
];

/** Map a case-wide DocumentCategory to a sensible child category default. */
const DOC_CATEGORY_DEFAULT: Record<string, ChildTimelineCategory> = {
  Medical: 'Health & Medical',
  Education: 'Education & School',
  Extracurricular: 'Extracurricular & Social',
  'Legal/Court': 'Care Time & Handover',
  'Direct Communication': 'Care Time & Handover',
  Financial: 'Care Time & Handover',
};

/**
 * Infer which of the child's own timeline categories an event belongs in.
 * Keyword evidence wins; document category is the fallback.
 */
export function inferChildCategory(event: TimelineEvent): ChildTimelineCategory {
  const haystack = `${event.title} ${event.description} ${event.breachedOrderNumber || ''}`;

  for (const { category, patterns } of CATEGORY_KEYWORDS) {
    if (patterns.some(p => p.test(haystack))) return category;
  }

  return DOC_CATEGORY_DEFAULT[event.category] || 'Care Time & Handover';
}

function severityFor(event: TimelineEvent): ChildImpactRecord['severity'] {
  if (event.breachSeverity === 'Severe') return 'Critical';
  if (event.breachSeverity === 'Moderate') return 'High';
  if (event.orderBreachFlag) return 'Moderate';
  return 'Informational';
}

/**
 * Produce per-child impact records for an event that has none recorded.
 * Marked directlyEvidenced=false where the child was inferred from a
 * blanket "both children" attribution rather than named in the source.
 */
export function deriveChildImpacts(event: TimelineEvent): ChildImpactRecord[] {
  if (event.childImpacts && event.childImpacts.length > 0) return event.childImpacts;

  const children = event.childrenMentioned?.length ? event.childrenMentioned : [];
  if (children.length === 0) return [];

  const category = inferChildCategory(event);
  const severity = severityFor(event);
  const namedInText = (child: ChildName) =>
    new RegExp(`\\b${child}\\b`, 'i').test(`${event.title} ${event.description}`);

  return children.map(child => ({
    child,
    childCategory: category,
    impactSummary: event.description?.slice(0, 220) || event.title,
    severity,
    s60CCFactorRef: undefined,
    directlyEvidenced: namedInText(child),
    sourceExcerpt: undefined,
  }));
}

export interface ChildTimelineEntry {
  event: TimelineEvent;
  impact: ChildImpactRecord;
}

/** All timeline entries belonging to one child, newest first. */
export function getChildTimeline(
  timeline: TimelineEvent[],
  child: ChildName
): ChildTimelineEntry[] {
  const entries: ChildTimelineEntry[] = [];

  timeline.forEach(event => {
    deriveChildImpacts(event)
      .filter(i => i.child === child)
      .forEach(impact => entries.push({ event, impact }));
  });

  return entries.sort((a, b) => (a.event.date < b.event.date ? 1 : -1));
}

/** Entry counts across this child's own categories. */
export function getChildCategoryCounts(
  timeline: TimelineEvent[],
  child: ChildName
): Partial<Record<ChildTimelineCategory, number>> {
  const counts: Partial<Record<ChildTimelineCategory, number>> = {};
  CHILD_TIMELINE_CATEGORIES.forEach(c => {
    counts[c] = 0;
  });

  getChildTimeline(timeline, child).forEach(({ impact }) => {
    counts[impact.childCategory] = (counts[impact.childCategory] || 0) + 1;
  });

  return counts;
}

/** Categories with no recorded entries — direct input to gap analysis. */
export function getEmptyChildCategories(
  timeline: TimelineEvent[],
  child: ChildName
): ChildTimelineCategory[] {
  const counts = getChildCategoryCounts(timeline, child);
  return CHILD_TIMELINE_CATEGORIES.filter(c => !counts[c]);
}

/** Convenience: category counts for every child at once. */
export function getAllChildCategoryCounts(
  timeline: TimelineEvent[]
): Record<ChildName, Partial<Record<ChildTimelineCategory, number>>> {
  return CHILD_NAMES.reduce((acc, child) => {
    acc[child] = getChildCategoryCounts(timeline, child);
    return acc;
  }, {} as Record<ChildName, Partial<Record<ChildTimelineCategory, number>>>);
}

export const CHILD_CATEGORY_STYLES: Record<ChildTimelineCategory, string> = {
  'Health & Medical': 'bg-emerald-50 text-emerald-800 border-emerald-200',
  'Education & School': 'bg-blue-50 text-blue-800 border-blue-200',
  'Emotional & Psychological': 'bg-purple-50 text-purple-800 border-purple-200',
  'Care Time & Handover': 'bg-amber-50 text-amber-800 border-amber-200',
  'Extracurricular & Social': 'bg-teal-50 text-teal-800 border-teal-200',
  'Views & Wishes Expressed': 'bg-indigo-50 text-indigo-800 border-indigo-200',
  'Safety & Wellbeing': 'bg-rose-50 text-rose-800 border-rose-200',
  'Developmental & Therapy': 'bg-cyan-50 text-cyan-800 border-cyan-200',
};
