import { DocumentRecord } from '../types';
import { ingestFileEndToEnd } from './bulkIngestionPipeline';

/**
 * Re-runs the full AI ingestion pipeline (OCR / text extraction / binary
 * detection / AI classification -- the same pipeline used for a fresh
 * upload) against a document's already-stored original file, and returns
 * a refreshed DocumentRecord.
 *
 * This exists so a document ingested under an earlier, buggy version of
 * the pipeline (e.g. one that decoded a binary/archive file as text, or
 * that failed because the AI parser was rate-limited) can be corrected
 * without re-uploading the source file -- the original bytes are already
 * preserved server-side via originalFileStorage.
 *
 * The document's identity (id, annexureNumber) and its stored original
 * file reference are preserved unchanged; every AI-derived field (title,
 * category, date, sourceOrigin, evidentiaryWeight, excerpt, fullText,
 * tags, metadata, etc.) is replaced with the freshly re-parsed result.
 */
export async function reingestDocument(doc: DocumentRecord): Promise<DocumentRecord> {
  if (!doc.originalFileRef) {
    throw new Error(
      'No original file is stored for this document, so it cannot be re-processed. ' +
      'This is expected for documents ingested before original-file preservation was added, ' +
      'or where the original could not be saved at the time.'
    );
  }

  const res = await fetch(`/api/files/${encodeURIComponent(doc.id)}`);
  if (!res.ok) {
    throw new Error(`Could not retrieve the stored original file (HTTP ${res.status}).`);
  }
  const blob = await res.blob();
  const fileName =
    doc.originalFileRef.originalFileName || doc.originalFileRef.storedFileName || doc.title || doc.id;
  const mimeType = doc.originalFileRef.mimeType || blob.type || 'application/octet-stream';
  const file = new File([blob], fileName, { type: mimeType });

  const { document: reprocessed } = await ingestFileEndToEnd(file, 0);

  return {
    ...reprocessed,
    id: doc.id,
    annexureNumber: doc.annexureNumber,
    originalFileRef: doc.originalFileRef,
  };
}

/**
 * Re-processes multiple documents sequentially (not in parallel) so a
 * shared, potentially rate-limited AI parsing endpoint isn't hit with a
 * burst of concurrent requests. Never throws: each document's outcome
 * (updated record, or the error) is reported individually so one failure
 * doesn't abort the rest of the batch.
 */
export async function reingestDocuments(
  docs: DocumentRecord[],
  onProgress?: (completed: number, total: number) => void
): Promise<{ updated: DocumentRecord[]; failures: { doc: DocumentRecord; error: string }[] }> {
  const updated: DocumentRecord[] = [];
  const failures: { doc: DocumentRecord; error: string }[] = [];

  for (let i = 0; i < docs.length; i++) {
    const doc = docs[i];
    try {
      const result = await reingestDocument(doc);
      updated.push(result);
    } catch (err: any) {
      failures.push({ doc, error: err?.message || 'Unknown error' });
    }
    onProgress?.(i + 1, docs.length);
  }

  return { updated, failures };
}