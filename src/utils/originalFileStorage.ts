import { DocumentRecord } from '../types';

export type OriginalFileRef = NonNullable<DocumentRecord['originalFileRef']>;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = (reader.result as string) || '';
      resolve(dataUrl.split(',')[1] || '');
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * Persists the raw bytes of an ingested file to the server, keyed by the
 * document id, so the original (PDF / image / export / etc) stays
 * retrievable after ingestion. Previously ingestion only kept the
 * extracted text and JSON metadata, and the source file itself (single
 * document upload or bulk folder import alike) was discarded or, on the
 * bulk-import path, actively deleted. Failure here is non-fatal by design:
 * ingestion must never be blocked just because the original-file copy
 * could not be stored.
 */
export async function storeOriginalFile(docId: string, file: File): Promise<OriginalFileRef | undefined> {
  try {
    const base64Data = await fileToBase64(file);
    if (!base64Data) return undefined;
    const res = await fetch(`/api/files/${encodeURIComponent(docId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        base64Data,
        mimeType: file.type || 'application/octet-stream',
        fileName: file.name,
      }),
    });
    if (!res.ok) return undefined;
    const data = await res.json();
    return data?.stored ? (data.originalFileRef as OriginalFileRef) : undefined;
  } catch (err) {
    console.warn(`Failed to store original file for ${docId}:`, err);
    return undefined;
  }
}

/** Opens a document stored original file (if any) in a new browser tab. */
export function openOriginalFile(docId: string): void {
  window.open(`/api/files/${encodeURIComponent(docId)}`, '_blank', 'noopener,noreferrer');
}

/**
 * Removes a document stored original file from the server. Called when a
 * document record itself is deleted, so orphaned original-file copies do
 * not accumulate on disk. Best effort: a failed cleanup here does not undo
 * the document deletion the caller already committed to.
 */
export function deleteOriginalFile(docId: string): void {
  fetch(`/api/files/${encodeURIComponent(docId)}`, { method: 'DELETE' }).catch(() => {
    // best-effort cleanup only
  });
}