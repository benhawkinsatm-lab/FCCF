import {
  DocumentRecord,
  DocumentCategory,
  EvidentiaryWeight,
  ResponseRequirement,
  ResponseFormat,
  TimelineEvent,
  ChildName,
  ChildImpactRecord,
  CommunicationProductivity,
  NonProductiveMarker,
} from '../types';
import { performOcr, isImageFile, OcrResult } from '../services/ocrService';
import { classifyProductivity, detectChildrenReferenced } from './communicationProductivity';
import { inferChildCategory } from './childTimelineService';
import { storeOriginalFile } from './originalFileStorage';

// Infers a concrete fileType for a Direct Communication document from its
// actual content, since the DocumentRecord fileType union has no generic
// "communication" value. Defaults to 'email' (the more common ingestion
// case -- exported email threads/PDFs) and only classifies as 'sms' when
// the content itself looks like a short text-message exchange.
function inferCommsFileType(text: string, sourceOrigin: string): 'sms' | 'email' {
  const t = `${text} ${sourceOrigin}`.toLowerCase();
  if (/\bsms\b|text message|imessage|\btexted\b|\btext thread\b/.test(t)) return 'sms';
  if (/\bfrom:|\bto:|\bsubject:|\bsent:|@[\w.-]+\.(com|org|net|gov|edu)/.test(t)) return 'email';
  // No clear header/keyword signal: short excerpts read like a text exchange,
  // longer ones like an email thread.
  return text.length < 400 ? 'sms' : 'email';
}


export interface IngestedFileResult {
  document: DocumentRecord;
  responseRequirement: ResponseRequirement | null;
  timelineEvent: TimelineEvent | null;
}

/**
 * Reads a File's contents as needed for parsing: runs Tesseract OCR for
 * images, reads PDFs/binaries as base64, and reads everything else as text.
 * This mirrors DocumentIngestionModal's single-file handling exactly, so a
 * bulk-imported file goes through the identical OCR + text-extraction path
 * as a manually uploaded one.
 */
async function readFileForIngestion(file: File): Promise<{ base64: string; textPayload: string; ocrResult: OcrResult | null }> {
  if (isImageFile(file)) {
    const ocrResult = await performOcr(file);
    const base64 = await fileToBase64(file);
    return { base64, textPayload: ocrResult.text, ocrResult };
  }

  if (file.type === 'application/pdf') {
    const base64 = await fileToBase64(file);
    return { base64, textPayload: '', ocrResult: null };
  }

  const textPayload = await file.text();
  return { base64: '', textPayload, ocrResult: null };
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = (event.target?.result as string) || '';
      resolve(dataUrl.split(',')[1] || '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Calls the same /api/gemini/ocr-parse endpoint the single-document
 * ingestion flow uses, and applies the same defaulting rules as
 * DocumentIngestionModal.autoParseFile so a bulk-imported document is
 * indistinguishable in quality from a manually reviewed one.
 */
async function parseDocumentMetadata(nameHint: string, mime: string, base64Data: string, textPayload: string) {
  const safeText = textPayload && textPayload.length > 200000
    ? textPayload.slice(0, 180000) + '\n\n[... Text truncated for legal parsing ...]'
    : textPayload;

  let res = await fetch('/api/gemini/ocr-parse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rawText: safeText || '',
      textContent: safeText || '',
      fileName: nameHint || 'Ingested_Document',
      fileData: base64Data || '',
      mimeType: mime || 'text/plain',
    }),
  });

  if (res.status === 413) {
    res = await fetch('/api/gemini/ocr-parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rawText: (safeText || '').slice(0, 40000),
        textContent: (safeText || '').slice(0, 40000),
        fileName: nameHint || 'Ingested_Document',
        fileData: '',
        mimeType: mime || 'text/plain',
      }),
    });
  }

  if (!res.ok) {
    throw new Error(`AI parser returned status ${res.status}`);
  }

  const data = await res.json();
  const detectedCategory = (data.documentCategory as DocumentCategory) || 'Direct Communication';

  const initialTags: string[] = Array.isArray(data.tags) && data.tags.length > 0
    ? data.tags
    : [detectedCategory, 'Case 4344 Evidence'];

  const lower = (textPayload + ' ' + nameHint + ' ' + (data.summaryExcerpt || '')).toLowerCase();
  const hasBreach = Boolean(data.hasBreach || lower.includes('withhold') || (lower.includes('asthma') && lower.includes('hospital')));
  const breachedOrder = data.breachedOrderNumber || (hasBreach ? (lower.includes('hospital') ? 'Order 5.1' : lower.includes('withhold') ? 'Order 4.2 & 13.1' : 'Order 9.1') : null);

  const requiresResponse = Boolean(data.requiresResponse || lower.includes('please confirm') || lower.includes('respond') || lower.includes('inquiry') || lower.includes('consent') || lower.includes('asthma'));
  const detectedFormat: ResponseFormat = data.responseFormat || (lower.includes('sms') ? 'SMS' : lower.includes('clinic') || lower.includes('hospital') ? 'Medical Clinic Notice' : lower.includes('school') ? 'School Notice' : 'Email');
  const responseStatus: 'waiting' | 'completed' = data.responseStatus || (data.responseDate ? 'completed' : 'waiting');

  return {
    title: data.title || nameHint.replace(/\.[^/.]+$/, '').replace(/_/g, ' ') || 'Ingested Document',
    date: data.documentDate || new Date().toISOString().split('T')[0],
    category: detectedCategory,
    sourceOrigin: data.sourceOrigin || nameHint || 'Direct Ingestion',
    evidentiaryWeight: (data.evidentiaryWeight || 'Third-Party Objective') as EvidentiaryWeight,
    excerpt: data.summaryExcerpt || (textPayload.slice(0, 200) + '...'),
    extractedFullText: data.extractedFullText || textPayload,
    tags: initialTags,
    requiresResponse,
    responseFormat: detectedFormat,
    informationRequested: data.informationRequested || (requiresResponse ? (data.summaryExcerpt || textPayload.slice(0, 140)) : ''),
    responseDetails: data.responseDetails || (responseStatus === 'waiting' ? 'Awaiting response from Respondent.' : 'Recorded response from evidence.'),
    responseDate: data.responseDate || (responseStatus === 'completed' ? new Date().toISOString().split('T')[0] : ''),
    daysOverdue: Number(data.daysOverdue) || 0,
    responseStatus,
    statutoryBasis: data.statutoryBasis || (detectedCategory === 'Medical' ? 'Order 5.1 (24h Medical Notice)' : 'Order 9.1 (42-Hour Written Communication Mandate)'),
    hasBreach,
    breachedOrderNumber: breachedOrder,
    breachSeverity: (data.breachSeverity as any) || (hasBreach ? 'Severe' : null),
    breachSummary: data.breachSummary || (hasBreach ? `Observed non-compliance with ${breachedOrder}.` : null),
    createTimelineEvent: data.createTimelineEvent ?? true,
    s60CCFactorRef: data.s60CCFactorRef || (detectedCategory === 'Medical' ? 's60CC(2)(a) - Safety from neglect & medical harm' : 's60CC(2)(e) - Benefit of relationship with each parent'),
    communicationProductivity:
      (data.communicationProductivity as CommunicationProductivity) ||
      classifyProductivity({ content: textPayload, isReply: responseStatus === 'completed' }).productivity,
    nonProductiveMarkers:
      (data.nonProductiveMarkers as NonProductiveMarker[]) ||
      classifyProductivity({ content: textPayload, isReply: responseStatus === 'completed' }).markers,
    substantiveResponse: data.substantiveResponse !== undefined ? data.substantiveResponse : null,
    productivityRationale: data.productivityRationale || '',
    childrenMentioned:
      (data.childrenMentioned as ChildName[]) ||
      detectChildrenReferenced(`${textPayload} ${nameHint} ${data.summaryExcerpt || ''}`),
    childImpacts: (data.childImpacts as ChildImpactRecord[]) || undefined,
  };
}

/**
 * Runs a single File through the full OCR + AI ingestion pipeline -- the
 * same one the manual "Ingest Document / OCR" flow uses -- and returns the
 * DocumentRecord/ResponseRequirement/TimelineEvent it produces, built with
 * the identical field logic as DocumentIngestionModal's manual submit
 * handler. Used by the bulk local-folder importer so every file, whether
 * ingested one at a time or in bulk, goes through the same real pipeline.
 */
export async function ingestFileEndToEnd(file: File, docSequenceNumber: number): Promise<IngestedFileResult> {
  const { base64, textPayload, ocrResult } = await readFileForIngestion(file);
  const parsedMetadata = await parseDocumentMetadata(file.name, file.type || 'application/octet-stream', base64, textPayload);

  const docYear = (parsedMetadata.date && /^\d{4}/.test(parsedMetadata.date))
    ? parsedMetadata.date.slice(0, 4)
    : new Date().getFullYear().toString();
  const docId = `DOC-${docYear}-${String(docSequenceNumber).padStart(3, '0')}`;
  const annexureNumber = `Annexure BJH-${docSequenceNumber}`;

  const document: DocumentRecord = {
    id: docId,
    title: parsedMetadata.title || 'Ingested Evidence Document',
    category: parsedMetadata.category,
    date: parsedMetadata.date,
    sourceOrigin: parsedMetadata.sourceOrigin,
    evidentiaryWeight: parsedMetadata.evidentiaryWeight,
    annexureNumber,
    fileType: parsedMetadata.category === 'Legal/Court' ? 'court_order'
      : parsedMetadata.category === 'Medical' ? 'medical_report'
      : parsedMetadata.category === 'Education' ? 'school_record'
      : parsedMetadata.category === 'Financial' ? 'financial'
      : parsedMetadata.category === 'Direct Communication' ? inferCommsFileType(textPayload || parsedMetadata.excerpt || '', parsedMetadata.sourceOrigin || '')
      : 'pdf',
    fileSize: ocrResult ? `${(Math.max(12, Math.round((textPayload.length * 0.8) / 100)) / 10).toFixed(1)} KB (OCR)` : `${(Math.max(1, Math.round(file.size / 1024)) / 1024).toFixed(2)} MB`,
    excerpt: parsedMetadata.excerpt || 'Verified evidence record.',
    fullText: textPayload || parsedMetadata.excerpt || 'Verified document content.',
    tags: parsedMetadata.tags,
    metadata: {
      tags: parsedMetadata.tags,
      ingestedAt: new Date().toISOString(),
      ingestionVector: 'bulk-folder-import',
      evidentiaryCategory: parsedMetadata.category,
      ocrEngine: ocrResult ? 'Tesseract.js' : undefined,
      ocrConfidence: ocrResult ? ocrResult.confidence : undefined,
      ocrWordCount: ocrResult ? ocrResult.wordCount : undefined,
      ocrLineCount: ocrResult ? ocrResult.lineCount : undefined,
      ocrDurationMs: ocrResult ? ocrResult.durationMs : undefined,
      isOcrProcessed: Boolean(ocrResult),
    },
  };

  // Persist a retrievable copy of the source file itself (not just the
  // extracted text/metadata above), the same as the manual single-document
  // ingestion flow does -- so a document imported via the bulk folder
  // pipeline still has a working "Open Original File" action, even though
  // the bulk pipeline deletes its ephemeral copy in public/upload once
  // ingestion of this file completes. Non-fatal on failure.
  document.originalFileRef = await storeOriginalFile(docId, file);

  let responseRequirement: ResponseRequirement | null = null;
  try {
  if (parsedMetadata.requiresResponse) {
    responseRequirement = {
      id: `REQ-${Date.now().toString().slice(-4)}-${docSequenceNumber}`,
      format: parsedMetadata.responseFormat,
      dateRequested: parsedMetadata.date,
      informationRequested: parsedMetadata.informationRequested || parsedMetadata.title,
      responseDetails: parsedMetadata.responseDetails || (parsedMetadata.responseStatus === 'waiting' ? 'Awaiting response from Respondent.' : 'Response received.'),
      responseDate: parsedMetadata.responseStatus === 'completed' ? (parsedMetadata.responseDate || parsedMetadata.date) : null,
      daysOverdue: Number(parsedMetadata.daysOverdue) || 0,
      status: parsedMetadata.responseStatus,
      requestingParty: 'Benjamin Hawkins',
      respondingParty: 'Sue-Anne Hawkins',
      statutoryBasis: parsedMetadata.statutoryBasis || 'Order 9 (42-Hour Written Communication Mandate)',
      priority: parsedMetadata.daysOverdue > 3 ? 'Critical' : (parsedMetadata.daysOverdue > 0 ? 'High' : 'Routine'),
      sourceDocId: docId,
      sourceCitation: document.annexureNumber,
      aiReviewRationale: `Determined from bulk AI review of ingested evidence "${document.title}".`,
      responseProductivity: parsedMetadata.communicationProductivity,
      substantiveResponse: parsedMetadata.substantiveResponse === null ? undefined : parsedMetadata.substantiveResponse,
      nonProductiveMarkers: parsedMetadata.nonProductiveMarkers,
      productivityRationale: parsedMetadata.productivityRationale,
      childrenConcerned: parsedMetadata.childrenMentioned,
    };
  }
  } catch (err) {
    console.warn("Bulk ingestion: response-requirement derivation failed for this file, continuing without it:", err);
  }

  let timelineEvent: TimelineEvent | null = null;
  try {
  if (parsedMetadata.createTimelineEvent) {
    const isBreach = Boolean(parsedMetadata.hasBreach);
    const attributedChildren: ChildName[] =
      parsedMetadata.childrenMentioned && parsedMetadata.childrenMentioned.length > 0
        ? parsedMetadata.childrenMentioned
        : detectChildrenReferenced(`${parsedMetadata.title} ${parsedMetadata.excerpt} ${parsedMetadata.extractedFullText || ''}`);

    const baseEvent: TimelineEvent = {
      id: `EVT-${Date.now().toString().slice(-4)}-${docSequenceNumber}`,
      date: parsedMetadata.date,
      title: isBreach ? `Contravention: ${parsedMetadata.breachedOrderNumber || 'Court Order'}` : parsedMetadata.title,
      description: (isBreach ? parsedMetadata.breachSummary : null) || parsedMetadata.excerpt,
      category: parsedMetadata.category,
      sourceOrigin: parsedMetadata.sourceOrigin || 'Primary Document',
      evidentiaryWeight: parsedMetadata.evidentiaryWeight,
      partiesInvolved: ['Benjamin Hawkins', 'Sue-Anne Hawkins'],
      childrenMentioned: attributedChildren,
      primaryDocId: docId,
      citation: `[${docId}] ${document.annexureNumber}`,
      orderBreachFlag: isBreach,
      breachedOrderNumber: isBreach ? parsedMetadata.breachedOrderNumber || 'Order 9.1' : undefined,
      breachSeverity: isBreach ? parsedMetadata.breachSeverity || 'Severe' : undefined,
      communicationProductivity: parsedMetadata.communicationProductivity,
      nonProductiveMarkers: parsedMetadata.nonProductiveMarkers,
      generatedBy: 'AI Ingestion',
      generationRationale: isBreach
        ? `Auto-generated at bulk ingestion: document flagged as evidencing a contravention of ${parsedMetadata.breachedOrderNumber || 'a parenting order'}.`
        : 'Auto-generated at bulk ingestion: dated, sourced record added to the chronology as non-breach corroborating evidence.',
    };

    const childCategory = inferChildCategory(baseEvent);
    baseEvent.childImpacts =
      parsedMetadata.childImpacts && parsedMetadata.childImpacts.length > 0
        ? parsedMetadata.childImpacts
        : attributedChildren.map(child => ({
            child,
            childCategory,
            impactSummary: parsedMetadata.excerpt?.slice(0, 220) || parsedMetadata.title,
            severity: isBreach ? (parsedMetadata.breachSeverity === 'Severe' ? 'Critical' : 'High') : 'Informational',
            s60CCFactorRef: parsedMetadata.s60CCFactorRef,
            directlyEvidenced: new RegExp(`\\b${child}\\b`, 'i').test(
              `${parsedMetadata.title} ${parsedMetadata.excerpt} ${parsedMetadata.extractedFullText || ''}`
            ),
          }));

    timelineEvent = baseEvent;
  }
  } catch (err) {
    console.warn("Bulk ingestion: timeline-event derivation failed for this file, continuing without it:", err);
  }

  return { document, responseRequirement, timelineEvent };
}
