/**
 * Lock-aware upsert/reconciliation helpers for AI-refresh merges.
 *
 * The rule this file exists to enforce: an AI refresh is an ETL worker, not
 * the source of truth. It may INSERT new records and UPDATE unlocked ones,
 * but it must never silently drop or overwrite a record a user has verified
 * or locked, and it must never replace a populated value with null/undefined
 * or an empty array just because the latest AI pass didn't happen to
 * re-derive it.
 */

export interface Lockable {
  isUserVerified?: boolean;
  immutableLock?: boolean;
}

const isLocked = (record: Lockable | undefined): boolean =>
  Boolean(record?.isUserVerified || record?.immutableLock);

const isEmptyValue = (value: unknown): boolean =>
  value === null ||
  value === undefined ||
  (Array.isArray(value) && value.length === 0) ||
  (typeof value === 'string' && value.trim() === '');

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
  keyFn: (item: T) => string
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
    byKey.set(key, mergeFieldsPreservingPopulated(current, item));
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
