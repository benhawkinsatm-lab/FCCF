/**
 * Lock-aware upsert/reconciliation helpers for AI-refresh merges.
 *
 * The rule this file exists to enforce: an AI refresh is an ETL worker, not
 * the source of truth. It may INSERT new records and UPDATE unlocked ones,
 * but it must never silently drop or overwrite a record a user has verified
 * or locked, and it must never replace a populated value with null/undefined
 * or an empty array just because the latest AI pass didn't happen to
 * re-derive it.
 *
 * Records are matched on a deterministic natural key rather than on `id`
 * alone, because successive AI passes over the same underlying evidence can
 * (and do) mint a new id for what is, in substance, the same event or
 * message. Matching by natural key means a re-run merges into the existing
 * record instead of creating a duplicate; the existing record's own id is
 * always kept so nothing that references it (order breach counts, citation
 * links) goes stale.
 */

export interface Lockable {
  isUserVerified?: boolean;
  immutableLock?: boolean;
}

export const isLocked = (record: Lockable | undefined): boolean =>
  Boolean(record?.isUserVerified || record?.immutableLock);

const isEmptyValue = (value: unknown): boolean =>
  value === null ||
  value === undefined ||
  (Array.isArray(value) && value.length === 0) ||
  (typeof value === 'string' && value.trim() === '');

/** Small, deterministic, dependency-free string hash for natural keys. */
export function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Shallow field-level merge: for every key the incoming record carries,
 * keep the existing value if the incoming one is empty/null/undefined and
 * the existing one is not -- otherwise take the incoming value. This is
 * "monotonic expansion": a re-run that fails to re-derive a field should
 * never erase it.
 */
export function mergeFieldsPreservingPopulated<T extends Record<string, any>>(
  existing: T,
  incoming: T
): T {
  const merged: Record<string, any> = { ...existing };
  for (const key of Object.keys(incoming)) {
    const incomingVal = incoming[key];
    const existingVal = existing[key];
    if (isEmptyValue(incomingVal) && !isEmptyValue(existingVal)) {
      continue; // keep the existing, populated value
    }
    merged[key] = incomingVal;
  }
  return merged as T;
}

/**
 * Upserts `incoming` records into `existing` by a natural/primary key.
 * - A record whose EXISTING copy is locked (isUserVerified/immutableLock)
 *   is left completely untouched, even if the incoming batch has a newer
 *   version of it.
 * - A record that exists and is unlocked is field-merged so a re-run that
 *   omits a previously-populated field doesn't blank it out.
 * - A record with no existing match is inserted as-is.
 * - Existing records not present in `incoming` at all are always kept --
 *   an AI refresh must never DROP/TRUNCATE the accumulated ledger.
 */
export function upsertByKey<T extends Lockable & Record<string, any>>(
  existing: T[],
  incoming: T[],
  keyFn: (item: T) => string,
  mergeFn: (existing: T, incoming: T) => T = mergeFieldsPreservingPopulated
): T[] {
  const byKey = new Map<string, T>();
  existing.forEach(item => byKey.set(keyFn(item), item));

  incoming.forEach(item => {
    const key = keyFn(item);
    const current = byKey.get(key);
    if (!current) {
      byKey.set(key, item);
      return;
    }
    if (isLocked(current)) {
      return; // preserve locked records untouched
    }
    byKey.set(key, mergeFn(current, item));
  });

  return Array.from(byKey.values());
}

/**
 * Party-profile-shaped upsert: profiles are keyed by id and, when locked,
 * are preserved unchanged rather than replaced by the AI's regenerated
 * profile for that party.
 */
export function upsertProfiles<T extends Lockable & { id: string }>(
  existing: T[],
  incoming: T[]
): T[] {
  return upsertByKey(existing, incoming, p => p.id);
}

// --- Timeline events: doc_id + event_type + target_order -------------------

interface TimelineEventLike extends Lockable {
  id: string;
  primaryDocId?: string;
  category?: string;
  orderBreachFlag?: boolean;
  breachedOrderNumber?: string;
  childImpacts?: ChildImpactLike[];
}

interface ChildImpactLike extends Lockable {
  child: string;
  childCategory: string;
}

/** doc_id + event_type + target_order, e.g. "DOC-2025-048_BREACH_ORDER-9". */
export function timelineEventKey(e: TimelineEventLike): string {
  const docId = e.primaryDocId || e.id;
  const eventType = e.orderBreachFlag ? 'BREACH' : (e.category || 'EVENT');
  const targetOrder = e.breachedOrderNumber || 'NONE';
  return `${docId}_${eventType}_${targetOrder}`;
}

/** child + category -- child impacts are merged within their parent event. */
export function childImpactKey(ci: ChildImpactLike): string {
  return `${ci.child}_${ci.childCategory}`;
}

export function mergeChildImpacts<T extends ChildImpactLike>(
  existing: T[] = [],
  incoming: T[] = []
): T[] {
  return upsertByKey(existing as any, incoming as any, childImpactKey) as T[];
}

function mergeTimelineEvent<T extends TimelineEventLike>(existing: T, incoming: T): T {
  const merged = mergeFieldsPreservingPopulated(existing, incoming);
  merged.childImpacts = mergeChildImpacts(existing.childImpacts, incoming.childImpacts);
  merged.id = existing.id; // keep the existing id stable -- other records reference it
  return merged;
}

/**
 * Upserts timeline events by the doc_id+event_type+target_order natural
 * key instead of by id, so a re-ingestion/regeneration pass that mints a
 * new id for the same underlying document+breach/order merges into the
 * existing entry rather than duplicating it.
 */
export function upsertTimelineEvents<T extends TimelineEventLike>(
  existing: T[],
  incoming: T[]
): T[] {
  return upsertByKey(existing as any, incoming as any, timelineEventKey as any, mergeTimelineEvent as any) as T[];
}

// --- Communications: source_doc_id + line_hash ------------------------------

interface CommunicationLike extends Lockable {
  id: string;
  docRefId?: string;
  content?: string;
  timestamp?: string;
}

/** source_doc_id + a hash of the message content/timestamp, falling back to id. */
export function communicationKey(m: CommunicationLike): string {
  if (m.docRefId) {
    return `${m.docRefId}_${hashString(`${m.content || ''}|${m.timestamp || ''}`)}`;
  }
  return m.id;
}

function mergeCommunication<T extends CommunicationLike>(existing: T, incoming: T): T {
  const merged = mergeFieldsPreservingPopulated(existing, incoming);
  merged.id = existing.id; // keep the existing id stable
  return merged;
}

export function upsertCommunications<T extends CommunicationLike>(
  existing: T[],
  incoming: T[]
): T[] {
  return upsertByKey(existing as any, incoming as any, communicationKey as any, mergeCommunication as any) as T[];
}
