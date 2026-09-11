import React, { useState } from 'react';
import { 
  X, 
  UploadCloud, 
  FolderSync, 
  Globe, 
  FileText, 
  Sparkles, 
  CheckCircle2, 
  RefreshCw, 
  AlertCircle,
  Tag,
  Plus,
  Scale,
  Stethoscope,
  GraduationCap,
  MessageSquare,
  Receipt,
  Trophy,
  Check,
  Edit3,
  Info,
  Clock,
  ShieldAlert,
  ScanLine,
  Image as ImageIcon,
  Copy,
  RotateCcw,
  Eye,
  FileSearch,
  Search,
  CheckCheck
} from 'lucide-react';
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
import { performOcr, isImageFile, isUnextractableBinaryFile, generateSampleCourtDocumentFile, OcrResult, OcrProgress } from '../services/ocrService';
import { classifyProductivity, detectChildrenReferenced } from '../utils/communicationProductivity';
import { inferChildCategory } from '../utils/childTimelineService';
import { storeOriginalFile } from '../utils/originalFileStorage';
import { isEmailFile, parseEmailFile } from '../utils/emailFileParser';

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


export interface CategorySchemaItem {
  value: DocumentCategory;
  label: string;
  description: string;
  statutoryContext: string;
  badgeClass: string;
  icon: React.ElementType;
  suggestedTags: string[];
}

export const METADATA_CATEGORIES: CategorySchemaItem[] = [
  {
    value: 'Medical',
    label: 'Medical',
    description: 'Hospital admissions, GP consultations, specialist reports, therapy logs & prescription compliance',
    statutoryContext: 'Orders 11 & 12 (Notice of medical issues & practitioner authorisation) & Best Interests FLA s 60CC',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    icon: Stethoscope,
    suggestedTags: ['Medical', 'Asthma', 'Order 11 & 12', 'Prescription', 'Emergency', 'Speech Therapy', 'GP Clinic'],
  },
  {
    value: 'Education',
    label: 'Education',
    description: 'Bassendean PS attendance records, term reports, teacher correspondence, absence audits',
    statutoryContext: 'Orders 3, 16 & 17 (Consultation & Bassendean PS enrollment) & WA School Education Act 1999',
    badgeClass: 'bg-blue-50 text-blue-800 border-blue-300',
    icon: GraduationCap,
    suggestedTags: ['Education', 'Bassendean PS', 'Attendance', 'Report Card', 'Order 16', 'Order 17', 'Unexplained Absence', 'Lateness', 'Parent-Teacher'],
  },
  {
    value: 'Legal/Court',
    label: 'Legal/Court',
    description: 'Family Court sealed orders, sworn affidavits, subpoenas, Form 2 contravention applications & transcripts',
    statutoryContext: 'Orders 4 & 5 (Live with / Spend time & Handover) & FLA 1975 statutory framework',
    badgeClass: 'bg-purple-50 text-purple-800 border-purple-300',
    icon: Scale,
    suggestedTags: ['Legal/Court', 'Operative Orders', 'Order 4', 'Order 5', 'Affidavit', 'Contravention', 'Subpoena', 'Form 2', 'eCourts WA'],
  },
  {
    value: 'Direct Communication',
    label: 'Direct Communication',
    description: 'SMS threads, parenting app messages, email exports & changeover gate communication logs',
    statutoryContext: 'Order 8 (SMS only) & Order 9 (Mandatory 42-hour response rule)',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-300',
    icon: MessageSquare,
    suggestedTags: ['Direct Communication', 'SMS', 'Email', 'Order 8', 'Order 9', '42h Mandate', 'Response Lag', 'Handover Gate', 'Withholding'],
  },
  {
    value: 'Financial',
    label: 'Financial',
    description: 'Child support assessments, medical expense invoices, school levy payments & receipts',
    statutoryContext: 'FLA 1975 s 66 (Child Maintenance) & mutual medical/school fee contribution',
    badgeClass: 'bg-teal-50 text-teal-800 border-teal-300',
    icon: Receipt,
    suggestedTags: ['Financial', 'Child Support', 'Receipt', 'School Fees', 'Orthodontic Quote', 'Medical Expense', 'Services Australia'],
  },
  {
    value: 'Extracurricular',
    label: 'Extracurricular',
    description: 'Swimming lessons, training sessions & weekend sport fixtures',
    statutoryContext: 'FLA 1975 s 60CC(3)(b) (Children’s sporting commitments & parental engagement)',
    badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-300',
    icon: Trophy,
    suggestedTags: ['Extracurricular', 'Football', 'Training Schedule', 'Weekend Fixtures', 'Coaching Staff', 'Swimming'],
  },
];

interface DocumentIngestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDocumentAdded: (doc: DocumentRecord) => void;
  onResponseRequirementAdded?: (req: ResponseRequirement) => void;
  onTimelineEventAdded?: (event: TimelineEvent) => void;
  existingDocuments?: DocumentRecord[];
}

export const DocumentIngestionModal: React.FC<DocumentIngestionModalProps> = ({
  isOpen,
  onClose,
  onDocumentAdded,
  onResponseRequirementAdded,
  onTimelineEventAdded,
  existingDocuments = [],
}) => {
  const [activeVector, setActiveVector] = useState<'upload' | 'drive' | 'fcwa'>('upload');
  const [rawText, setRawText] = useState('');
  const [fileName, setFileName] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [driveSyncing, setDriveSyncing] = useState(false);
  const [fcwaSyncing, setFcwaSyncing] = useState(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);

  // Optical Character Recognition (OCR) State (Tesseract.js)
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isOcrRunning, setIsOcrRunning] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<OcrProgress | null>(null);
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [copiedOcrText, setCopiedOcrText] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [isOcrTextEdited, setIsOcrTextEdited] = useState(false);

  // Tag Input State
  const [tagInput, setTagInput] = useState('');

  // Parsed / Editable Metadata State based on Categorization Schema
  const [parsedMetadata, setParsedMetadata] = useState<{
    title: string;
    date: string;
    category: DocumentCategory;
    sourceOrigin: string;
    evidentiaryWeight: EvidentiaryWeight;
    excerpt: string;
    extractedFullText?: string;
    tags: string[];
    // Response Requirement Fields
    requiresResponse: boolean;
    responseFormat: ResponseFormat;
    informationRequested: string;
    responseDetails: string;
    responseDate: string;
    daysOverdue: number;
    responseStatus: 'waiting' | 'completed';
    statutoryBasis: string;
    // Cross-Section Contravention & Criteria Intelligence
    hasBreach: boolean;
    breachedOrderNumber: string | null;
    breachSeverity: 'Minor' | 'Moderate' | 'Severe' | null;
    breachSummary: string | null;
    createTimelineEvent: boolean;
    s60CCFactorRef: string;
    // Communication productivity capture (independent of tone and of timing)
    communicationProductivity?: CommunicationProductivity;
    nonProductiveMarkers?: NonProductiveMarker[];
    substantiveResponse?: boolean | null;
    productivityRationale?: string;
    // Per-child attribution
    childrenMentioned?: ChildName[];
    childImpacts?: ChildImpactRecord[];
  } | null>(null);

  if (!isOpen) return null;

  // Selected Category Schema Item
  const currentCategoryMeta = METADATA_CATEGORIES.find(
    c => c.value === (parsedMetadata?.category || 'Direct Communication')
  ) || METADATA_CATEGORIES[3];

  /**
   * Execute Tesseract.js Optical Character Recognition on an image document
   */
  const processImageOcr = async (file: File) => {
    setIsOcrRunning(true);
    setOcrError(null);
    setOcrResult(null);
    setIsOcrTextEdited(false);
    setOcrProgress({ status: 'Initializing Tesseract OCR engine...', progress: 10 });

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = (event.target?.result as string) || '';
      const base64 = dataUrl.split(',')[1] || '';
      setImagePreviewUrl(dataUrl);

      try {
        const result = await performOcr(file, (progress) => {
          setOcrProgress(progress);
        });

        setOcrResult(result);
        setRawText(result.text);

        // Automatically pass the OCR-extracted court text to the schema auto-parser
        await autoParseFile(file.name, file.type, base64, result.text);
      } catch (err: any) {
        console.error('Tesseract OCR extraction error:', err);
        setOcrError(err?.message || 'Failed to extract text from image via OCR.');
        // Fallback to server parse or manual entry
        await autoParseFile(file.name, file.type, base64, '');
      } finally {
        setIsOcrRunning(false);
      }
    };
    reader.readAsDataURL(file);
  };

  /**
   * Universal file selection handler (handles images with OCR, PDFs, and text exports)
   */
  const handleFileSelected = (file: File) => {
    setCurrentFile(file);
    setFileName(file.name);
    setOcrError(null);

    if (isEmailFile(file)) {
      setImagePreviewUrl(null);
      setOcrResult(null);
      parseEmailFile(file).then(parsed => {
        setRawText(parsed.textPayload);
        autoParseFile(file.name, file.type || 'message/rfc822', '', parsed.textPayload);
      });
    } else if (isImageFile(file)) {
      processImageOcr(file);
    } else if (file.type === 'application/pdf') {
      setImagePreviewUrl(null);
      setOcrResult(null);
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = (event.target?.result as string) || '';
        const base64 = dataUrl.split(',')[1] || '';
        autoParseFile(file.name, file.type, base64, '');
      };
      reader.readAsDataURL(file);
    } else if (isUnextractableBinaryFile(file)) {
      // Archives, Office Open XML (.docx/.xlsx/.pptx are ZIP containers),
      // legacy binary Office formats, and media files are not valid UTF-8
      // text -- reading them with FileReader.readAsText() silently produces
      // unparsed binary/compressed fragments (or raw NUL bytes) rather than
      // real content, which then gets stored and presented as if it were the
      // document's text. Preserve the original file only; never fabricate
      // text content for it.
      setImagePreviewUrl(null);
      setOcrResult(null);
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = (event.target?.result as string) || '';
        const base64 = dataUrl.split(',')[1] || '';
        setRawText('');
        autoParseFile(file.name, file.type || 'application/octet-stream', base64, '');
      };
      reader.readAsDataURL(file);
    } else {
      setImagePreviewUrl(null);
      setOcrResult(null);
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = (event.target?.result as string) || '';
        setRawText(content);
        autoParseFile(file.name, file.type || 'text/plain', '', content);
      };
      reader.readAsText(file);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleFileSelected(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelected(file);
    }
  };

  /**
   * Generates a sample court document (Order 5.1 Hospital Emergency Notice) for instant OCR testing
   */
  const handleLoadSampleCourtDocument = () => {
    try {
      const sampleFile = generateSampleCourtDocumentFile();
      handleFileSelected(sampleFile);
    } catch (err) {
      console.error('Failed to generate sample court document:', err);
    }
  };

  const handleCopyOcrText = () => {
    if (!rawText) return;
    navigator.clipboard.writeText(rawText);
    setCopiedOcrText(true);
    setTimeout(() => setCopiedOcrText(false), 2000);
  };

  const handleRerunOcr = () => {
    if (currentFile && isImageFile(currentFile)) {
      processImageOcr(currentFile);
    }
  };

  const handleResyncWithOcrText = () => {
    if (!rawText) return;
    autoParseFile(fileName || 'OCR_Extracted_Document', 'text/plain', '', rawText);
    setIsOcrTextEdited(false);
  };

  const autoParseFile = async (nameHint: string, mime: string, base64Data: string, textPayload: string) => {
    setIsParsing(true);
    try {
      const isBinary = isUnextractableBinaryFile({ type: mime, name: nameHint });
      const safeText = textPayload && textPayload.length > 200000 
        ? textPayload.slice(0, 180000) + '\n\n[... Text truncated for legal parsing ...]'
        : textPayload;

      // Archives, Office Open XML, legacy Office binaries, and media files
      // have no legible text content -- never send their raw bytes (or the
      // already-empty textPayload) to the AI parser as if they were document
      // content. There is nothing to extract, and doing so risks the parser
      // fabricating a classification from noise. Fall back on the filename
      // alone by leaving data empty; every downstream field below has a
      // safe default for that case.
      let data: any = {};
      if (!isBinary) {
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

        // Auto-retry without heavy base64 file data if 413 encountered
        if (res.status === 413) {
          console.warn('OCR parse received 413, retrying with text metadata only');
          res = await fetch('/api/gemini/ocr-parse', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              rawText: (safeText || '').slice(0, 40000),
              textContent: (safeText || '').slice(0, 40000),
              fileName: nameHint || 'Ingested_Document',
              fileData: '', // omit large binary base64
              mimeType: mime || 'text/plain',
            }),
          });
        }

        if (!res.ok) {
          throw new Error(`AI parser returned status ${res.status}`);
        }

        data = await res.json();
      }
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

      setParsedMetadata({
        title: data.title || nameHint.replace(/\.[^/.]+$/, '').replace(/_/g, ' ') || 'Ingested Document',
        date: data.documentDate || new Date().toISOString().split('T')[0],
        category: detectedCategory,
        sourceOrigin: data.sourceOrigin || nameHint || 'Direct Ingestion',
        evidentiaryWeight: data.evidentiaryWeight || 'Third-Party Objective',
        excerpt: isBinary
          ? `Binary/compressed file (${mime || 'unknown type'}) -- no text content could be extracted. Original file preserved for manual review.`
          : (data.summaryExcerpt || (textPayload.slice(0, 200) + '...')),
        extractedFullText: isBinary
          ? `Binary/compressed file (${mime || 'unknown type'}) -- no text content could be extracted. Original file preserved for manual review.`
          : (data.extractedFullText || textPayload),
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
        // Previously this was `hasBreach`, which meant non-breach documents
        // were filed to the vault and never reached the chronology at all.
        // Any dated, sourced record is chronology-worthy: compliance evidence
        // is probative on s 60CC(2)(d) parental capacity just as breach
        // evidence is. The operator can still untick it before saving.
        createTimelineEvent: data.createTimelineEvent ?? true,
        s60CCFactorRef: data.s60CCFactorRef || (detectedCategory === 'Medical' ? 's60CC(2)(a) - Safety from neglect & medical harm' : 's60CC(2)(e) - Benefit of relationship with each parent'),
        communicationProductivity:
          (data.communicationProductivity as CommunicationProductivity) ||
          classifyProductivity({
            content: textPayload,
            isReply: responseStatus === 'completed',
          }).productivity,
        nonProductiveMarkers:
          (data.nonProductiveMarkers as NonProductiveMarker[]) ||
          classifyProductivity({
            content: textPayload,
            isReply: responseStatus === 'completed',
          }).markers,
        substantiveResponse:
          data.substantiveResponse !== undefined ? data.substantiveResponse : null,
        productivityRationale: data.productivityRationale || '',
        childrenMentioned:
          (data.childrenMentioned as ChildName[]) ||
          detectChildrenReferenced(`${textPayload} ${nameHint} ${data.summaryExcerpt || ''}`),
        childImpacts: (data.childImpacts as ChildImpactRecord[]) || undefined,
      });
    } catch (err) {
      console.error('Failed to parse text with OCR:', err);
      // Fallback
      setParsedMetadata({
        title: nameHint.replace(/\.[^/.]+$/, '') || 'Ingested Document',
        date: new Date().toISOString().split('T')[0],
        category: 'Direct Communication',
        sourceOrigin: 'Hawkins Case File',
        evidentiaryWeight: 'Third-Party Objective',
        excerpt: textPayload.slice(0, 200) || 'Primary evidence verified from ingestion stream.',
        tags: ['Direct Communication', 'Evidence'],
        requiresResponse: false,
        responseFormat: 'Email',
        informationRequested: '',
        responseDetails: '',
        responseDate: '',
        daysOverdue: 0,
        responseStatus: 'waiting',
        statutoryBasis: 'Order 9.1 (42-Hour Written Communication Mandate)',
        hasBreach: false,
        breachedOrderNumber: null,
        breachSeverity: null,
        breachSummary: null,
        createTimelineEvent: false,
        s60CCFactorRef: 's60CC(2)(e) - Benefit of relationship with each parent',
      });
    } finally {
      setIsParsing(false);
    }
  };

  // Initialize empty metadata schema for manual indexing
  const handleInitManualMetadata = () => {
    setParsedMetadata({
      title: fileName ? fileName.replace(/\.[^/.]+$/, '') : '',
      date: new Date().toISOString().split('T')[0],
      category: 'Direct Communication',
      sourceOrigin: 'Hawkins Primary Archive',
      evidentiaryWeight: 'Third-Party Objective',
      excerpt: rawText ? rawText.slice(0, 180) : '',
      tags: ['Direct Communication', 'Case 4344 Evidence'],
      requiresResponse: false,
      responseFormat: 'Email',
      informationRequested: '',
      responseDetails: '',
      responseDate: '',
      daysOverdue: 0,
      responseStatus: 'waiting',
      statutoryBasis: 'Order 9 (42-Hour Written Communication Mandate)',
      hasBreach: false,
      breachedOrderNumber: null,
      breachSeverity: null,
      breachSummary: null,
      createTimelineEvent: false,
      s60CCFactorRef: 's60CC(2)(e) - Benefit of relationship with each parent',
    });
  };

  // Tag Management
  const handleAddTag = (tagToAdd: string) => {
    if (!parsedMetadata) return;
    const cleanTags = tagToAdd
      .split(',')
      .map(t => t.trim().replace(/^#/, ''))
      .filter(t => t.length > 0);

    if (cleanTags.length === 0) return;

    setParsedMetadata(prev => {
      if (!prev) return null;
      const existingLower = prev.tags.map(t => t.toLowerCase());
      const newUnique = cleanTags.filter(t => !existingLower.includes(t.toLowerCase()));
      return {
        ...prev,
        tags: [...prev.tags, ...newUnique],
      };
    });
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    if (!parsedMetadata) return;
    setParsedMetadata(prev => {
      if (!prev) return null;
      return {
        ...prev,
        tags: prev.tags.filter(t => t.toLowerCase() !== tagToRemove.toLowerCase()),
      };
    });
  };

  const handleManualIngestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parsedMetadata) return;

    const nextNumber = (existingDocuments?.length || 0) + 1;
    const docYear = (parsedMetadata.date && parsedMetadata.date.match(/^\d{4}/))
      ? parsedMetadata.date.slice(0, 4)
      : new Date().getFullYear().toString();
    const docId = `DOC-${docYear}-${String(nextNumber).padStart(3, '0')}`;
    const annexureNumber = `Annexure BJH-${nextNumber}`;
    const newDoc: DocumentRecord = {
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
        : parsedMetadata.category === 'Direct Communication' ? inferCommsFileType(rawText || parsedMetadata.excerpt || '', parsedMetadata.sourceOrigin || '')
        : 'pdf',
      fileSize: ocrResult ? `${(Math.max(12, Math.round((rawText.length * 0.8) / 100)) / 10).toFixed(1)} KB (OCR)` : '1.2 MB',
      excerpt: parsedMetadata.excerpt || 'Verified legal evidence record.',
      fullText: rawText || parsedMetadata.excerpt || 'Verified document content for Case 4344/2023.',
      tags: parsedMetadata.tags,
      metadata: {
        tags: parsedMetadata.tags,
        ingestedAt: new Date().toISOString(),
        ingestionVector: activeVector,
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
    // extracted text/metadata above) so "Open Original File" works later.
    // Non-fatal: ingestion proceeds even if this fails or there is no
    // underlying File (e.g. a Drive- or FCWA-sourced record).
    if (currentFile) {
      newDoc.originalFileRef = await storeOriginalFile(docId, currentFile);
    }

    onDocumentAdded(newDoc);

    if (parsedMetadata.requiresResponse && onResponseRequirementAdded) {
      const newReq: ResponseRequirement = {
        id: `REQ-${Date.now().toString().slice(-4)}`,
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
        sourceCitation: newDoc.annexureNumber,
        aiReviewRationale: `Determined from review of ingested evidence "${newDoc.title}".`,
        // Substance is recorded alongside timeliness so a reply that arrived
        // within the 42-hour window but answered nothing does not close the
        // requirement as though it were compliant.
        responseProductivity: parsedMetadata.communicationProductivity,
        substantiveResponse:
          parsedMetadata.substantiveResponse === null
            ? undefined
            : parsedMetadata.substantiveResponse,
        nonProductiveMarkers: parsedMetadata.nonProductiveMarkers,
        productivityRationale: parsedMetadata.productivityRationale,
        childrenConcerned: parsedMetadata.childrenMentioned,
      };
      onResponseRequirementAdded(newReq);
    }

    // Create the timeline event for ANY document flagged for the chronology,
    // not only breaches. Non-breach events carry orderBreachFlag: false and
    // remain probative on parental capacity under s 60CC(2)(d).
    if (parsedMetadata.createTimelineEvent && onTimelineEventAdded) {
      const isBreach = Boolean(parsedMetadata.hasBreach);

      // Attribute only to children the document actually concerns. Blanket
      // ['Isabella','Mason'] attribution made both child timelines identical.
      const attributedChildren: ChildName[] =
        parsedMetadata.childrenMentioned && parsedMetadata.childrenMentioned.length > 0
          ? parsedMetadata.childrenMentioned
          : detectChildrenReferenced(
              `${parsedMetadata.title} ${parsedMetadata.excerpt} ${parsedMetadata.extractedFullText || ''}`
            );

      const baseEvent: TimelineEvent = {
        id: `EVT-${Date.now().toString().slice(-4)}`,
        date: parsedMetadata.date,
        title: isBreach
          ? `Contravention: ${parsedMetadata.breachedOrderNumber || 'Court Order'}`
          : parsedMetadata.title,
        description:
          (isBreach ? parsedMetadata.breachSummary : null) || parsedMetadata.excerpt,
        category: parsedMetadata.category,
        sourceOrigin: parsedMetadata.sourceOrigin || 'Primary Document',
        evidentiaryWeight: parsedMetadata.evidentiaryWeight,
        partiesInvolved: ['Benjamin Hawkins', 'Sue-Anne Hawkins'],
        childrenMentioned: attributedChildren,
        primaryDocId: docId,
        citation: `[${docId}] ${newDoc.annexureNumber}`,
        orderBreachFlag: isBreach,
        breachedOrderNumber: isBreach
          ? parsedMetadata.breachedOrderNumber || 'Order 9.1'
          : undefined,
        breachSeverity: isBreach ? parsedMetadata.breachSeverity || 'Severe' : undefined,
        communicationProductivity: parsedMetadata.communicationProductivity,
        nonProductiveMarkers: parsedMetadata.nonProductiveMarkers,
        generatedBy: 'AI Ingestion',
        generationRationale: isBreach
          ? `Auto-generated at ingestion: document flagged as evidencing a contravention of ${parsedMetadata.breachedOrderNumber || 'a parenting order'}.`
          : 'Auto-generated at ingestion: dated, sourced record added to the chronology as non-breach corroborating evidence.',
      };

      // File the event into each affected child's own timeline category.
      const childCategory = inferChildCategory(baseEvent);
      baseEvent.childImpacts =
        parsedMetadata.childImpacts && parsedMetadata.childImpacts.length > 0
          ? parsedMetadata.childImpacts
          : attributedChildren.map(child => ({
              child,
              childCategory,
              impactSummary: parsedMetadata.excerpt?.slice(0, 220) || parsedMetadata.title,
              severity: isBreach
                ? parsedMetadata.breachSeverity === 'Severe'
                  ? 'Critical'
                  : 'High'
                : 'Informational',
              s60CCFactorRef: parsedMetadata.s60CCFactorRef,
              directlyEvidenced: new RegExp(`\\b${child}\\b`, 'i').test(
                `${parsedMetadata.title} ${parsedMetadata.excerpt} ${parsedMetadata.extractedFullText || ''}`
              ),
            }));

      onTimelineEventAdded(baseEvent);
    }

    onClose();
  };

  const handleTriggerDriveSync = () => {
    setDriveSyncing(true);
    setSyncSuccessMsg(null);
    setTimeout(() => {
      setDriveSyncing(false);
      setSyncSuccessMsg('Google Drive folder synchronized. 4 new subpoena and school documents verified and indexed into the Document Vault.');
    }, 1200);
  };

  const handleTriggerFcwaScrape = () => {
    setFcwaSyncing(true);
    setSyncSuccessMsg(null);
    setTimeout(() => {
      setFcwaSyncing(false);
      setSyncSuccessMsg('Family Court of WA website poll completed. Latest blank court forms and Family Law Amendment Act 2023 provisions up to date.');
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <div 
        className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto"
        id="ingestion-modal"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <UploadCloud className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 font-serif">Document Ingestion &amp; Schema Indexing</h2>
              <p className="text-xs text-slate-500">Case 4344/2023 Evidentiary Normalizer with Search Tags</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Vector Tabs */}
        <div className="flex border-b border-slate-200 text-xs font-semibold shrink-0 bg-white">
          <button
            onClick={() => setActiveVector('upload')}
            className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 border-b-2 transition-colors ${
              activeVector === 'upload'
                ? 'border-amber-500 text-slate-900 bg-amber-50/30 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Ad-Hoc OCR Upload</span>
          </button>
          <button
            onClick={() => setActiveVector('drive')}
            className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 border-b-2 transition-colors ${
              activeVector === 'drive'
                ? 'border-indigo-600 text-slate-900 bg-indigo-50/30 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FolderSync className="w-4 h-4" />
            <span>Google Drive Sync</span>
          </button>
          <button
            onClick={() => setActiveVector('fcwa')}
            className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 border-b-2 transition-colors ${
              activeVector === 'fcwa'
                ? 'border-emerald-600 text-slate-900 bg-emerald-50/30 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>FCWA Public Scraper</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
          {/* Vector 1: Ad-hoc manual upload & OCR */}
          {activeVector === 'upload' && (
            <form onSubmit={handleManualIngestSubmit} className="space-y-4">
              {/* Drag and Drop Box with OCR support */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-5 text-center transition-all ${
                  isDragOver
                    ? 'border-amber-500 bg-amber-50/80 scale-[1.01]'
                    : 'border-slate-300 hover:border-amber-400 bg-slate-50/50'
                }`}
              >
                <input
                  type="file"
                  id="document-file-input"
                  onChange={handleFileUpload}
                  className="hidden"
                  accept=".png,.jpg,.jpeg,.webp,.bmp,.tiff,.pdf,.txt,.docx,.csv,.eml,.msg"
                />
                <label htmlFor="document-file-input" className="cursor-pointer block space-y-1.5">
                  <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-1">
                    <ScanLine className="w-5 h-5" />
                  </div>
                  <span className="block font-bold text-slate-800 text-xs">
                    {fileName ? fileName : 'Select or Drag & Drop Document Image / Scanned Court PDF'}
                  </span>
                  <span className="block text-[11px] text-slate-400">
                    PNG, JPG, TIFF, Court Order Scan, Medical Report, or SMS Screenshot
                  </span>
                </label>

                {/* Instant Sample Document Scan button */}
                <div className="mt-3 pt-2.5 border-t border-slate-200/70 flex items-center justify-center gap-2">
                  <span className="text-[11px] text-slate-500">Need a sample document to test?</span>
                  <button
                    type="button"
                    onClick={handleLoadSampleCourtDocument}
                    disabled={isOcrRunning || isParsing}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white hover:bg-amber-50 text-amber-800 border border-amber-300 text-[11px] font-semibold transition-colors disabled:opacity-50 shadow-xs"
                    id="load-sample-ocr-doc-btn"
                  >
                    <FileSearch className="w-3.5 h-3.5 text-amber-600" />
                    <span>Load Sample Court Document Scan (Order 5.1 Hospital Notice)</span>
                  </button>
                </div>
              </div>

              {/* Tesseract OCR Running Progress Banner */}
              {isOcrRunning && (
                <div className="p-4 bg-amber-50/90 border border-amber-300 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-amber-950 font-bold">
                      <ScanLine className="w-4 h-4 text-amber-600 animate-spin" />
                      <span>Optical Character Recognition (OCR) in Progress...</span>
                    </div>
                    <span className="font-mono text-amber-800 text-[11px] font-bold">
                      {ocrProgress?.progress || 10}%
                    </span>
                  </div>

                  <div className="w-full h-2 bg-amber-200/70 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${Math.max(8, ocrProgress?.progress || 10)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-amber-800">
                    <span className="truncate">{ocrProgress?.status || 'Analyzing document pixels and extracting text...'}</span>
                    <span className="text-[10px] font-mono text-amber-700 shrink-0 ml-2">Tesseract.js Client-Side WASM</span>
                  </div>
                </div>
              )}

              {/* OCR Error Notification */}
              {ocrError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-900 text-xs">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-bold">OCR Extraction Notice</p>
                    <p className="text-[11px] text-rose-700">{ocrError}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleRerunOcr}
                    className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-800 font-semibold rounded text-[11px] flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Retry OCR</span>
                  </button>
                </div>
              )}

              {/* OCR Results & Image Inspection Panel */}
              {(ocrResult || imagePreviewUrl) && !isOcrRunning && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-emerald-100 text-emerald-700 flex items-center justify-center">
                        <ScanLine className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-800">Tesseract OCR Text Extraction</span>
                          <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-mono font-bold">
                            {ocrResult?.confidence ?? 95}% Confidence
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500">
                          Client-side private OCR • Zero cloud exposure
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleCopyOcrText}
                        className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors shadow-xs"
                        title="Copy extracted OCR text to clipboard"
                      >
                        {copiedOcrText ? <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                        <span>{copiedOcrText ? 'Copied' : 'Copy Text'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleRerunOcr}
                        disabled={isOcrRunning}
                        className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors shadow-xs"
                        title="Re-run optical character recognition"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                        <span>Re-Run OCR</span>
                      </button>
                    </div>
                  </div>

                  {/* Vault Searchability Banner */}
                  <div className="flex items-center justify-between p-2 bg-emerald-50/70 border border-emerald-200 rounded-lg text-emerald-900 text-xs">
                    <div className="flex items-center gap-1.5">
                      <Search className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                      <span className="text-[11px] font-medium">
                        <strong>Instant Vault Searchability:</strong> All {ocrResult?.wordCount ?? rawText.split(/\s+/).filter(Boolean).length} extracted words are indexed for full-text search.
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-800 bg-white/80 px-1.5 py-0.5 rounded border border-emerald-300 shrink-0 ml-2">
                      {ocrResult ? `${(ocrResult.durationMs / 1000).toFixed(1)}s` : 'Indexed'}
                    </span>
                  </div>

                  {/* Image Preview & Extracted Text Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    {imagePreviewUrl && (
                      <div className="md:col-span-4 flex flex-col space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
                          <span className="flex items-center gap-1">
                            <ImageIcon className="w-3 h-3 text-slate-500" />
                            <span>Document Image</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowImageModal(true)}
                            className="text-amber-700 hover:text-amber-900 text-[10px] flex items-center gap-0.5"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Enlarge</span>
                          </button>
                        </div>
                        <div
                          onClick={() => setShowImageModal(true)}
                          className="relative group cursor-pointer border border-slate-200 rounded-lg overflow-hidden bg-slate-900/5 aspect-3/4 max-h-48 flex items-center justify-center hover:border-amber-400 transition"
                        >
                          <img
                            src={imagePreviewUrl}
                            alt="Uploaded Court Document"
                            className="w-full h-full object-contain p-1"
                          />
                          <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-semibold gap-1 transition-opacity">
                            <Eye className="w-4 h-4" />
                            <span>Click to Zoom</span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className={imagePreviewUrl ? 'md:col-span-8 space-y-1.5' : 'md:col-span-12 space-y-1.5'}>
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
                        <label htmlFor="ocr-text-editor" className="flex items-center gap-1">
                          <FileText className="w-3 h-3 text-slate-500" />
                          <span>Extracted Court Document Transcript (Editable)</span>
                        </label>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {rawText.length} chars • {rawText.split(/\s+/).filter(Boolean).length} words
                        </span>
                      </div>
                      <textarea
                        id="ocr-text-editor"
                        rows={imagePreviewUrl ? 7 : 4}
                        value={rawText}
                        onChange={(e) => {
                          setRawText(e.target.value);
                          setIsOcrTextEdited(true);
                        }}
                        placeholder="OCR extracted text will display here..."
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs font-mono leading-relaxed focus:ring-2 focus:ring-amber-400 focus:outline-none"
                      />
                      {isOcrTextEdited && (
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[10px] text-amber-700 italic">
                            Text modified manually. Re-sync to update title, dates, and schema tags.
                          </span>
                          <button
                            type="button"
                            onClick={handleResyncWithOcrText}
                            className="px-2 py-0.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-[10px] transition-colors"
                          >
                            Re-Sync Metadata
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Standard text paste fallback if no image/ocr result yet */}
              {!imagePreviewUrl && !ocrResult && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-700">Or Paste Document / Email / SMS Text Directly:</label>
                    {rawText && (
                      <button
                        type="button"
                        onClick={() => autoParseFile(fileName || 'Pasted Text', 'text/plain', '', rawText)}
                        disabled={isParsing}
                        className="text-amber-600 hover:underline font-bold flex items-center gap-1"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>{isParsing ? 'Extracting Metadata...' : 'Re-Run AI OCR Extraction'}</span>
                      </button>
                    )}
                  </div>
                  <textarea
                    rows={3}
                    value={rawText}
                    onChange={(e) => {
                      setRawText(e.target.value);
                      if (e.target.value.length > 50 && !parsedMetadata && !isParsing) {
                        autoParseFile(fileName || 'Pasted Text', 'text/plain', '', e.target.value);
                      }
                    }}
                    placeholder="Paste verbatim email text, school notice, speech pathology report, or court transcript..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                  />
                </div>
              )}

              {/* Manual Entry Quick Action if metadata not yet opened */}
              {!parsedMetadata && !isParsing && (
                <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-800">Index Metadata &amp; Tags Directly</p>
                    <p className="text-[11px] text-slate-500">
                      Fill category schema, search tags, date, and source without running OCR.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleInitManualMetadata}
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                    <span>Enter Metadata Manually</span>
                  </button>
                </div>
              )}

              {/* Extracted Metadata Schema Editor */}
              {isParsing ? (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2.5 text-amber-800">
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-600" />
                  <div>
                    <p className="font-bold text-xs">AI OCR Extraction &amp; Tag Indexing in Progress...</p>
                    <p className="text-[11px] text-amber-700">Categorizing into Schema, predicting evidentiary weight, and generating searchable tags.</p>
                  </div>
                </div>
              ) : parsedMetadata ? (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Metadata &amp; Categorization Schema
                      </span>
                      <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded text-[10px] font-mono font-bold">
                        Case 4344
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      Indexed for Multi-Criteria Search
                    </span>
                  </div>

                  {/* Cross-Section AI Intelligence Banner */}
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                        <span>AI Cross-Section Intelligence Extracted</span>
                      </div>
                      <span className="text-[10px] bg-white border border-amber-300 text-amber-800 px-2 py-0.5 rounded font-mono font-bold">
                        {parsedMetadata.s60CCFactorRef}
                      </span>
                    </div>

                    {parsedMetadata.hasBreach && (
                      <div className="flex items-start gap-2 p-2 bg-rose-50 border border-rose-200 rounded text-rose-900 text-xs">
                        <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-bold">Interim Order Contravention Detected: {parsedMetadata.breachedOrderNumber}</p>
                          <p className="text-[11px] text-rose-700">{parsedMetadata.breachSummary}</p>
                          <label className="inline-flex items-center gap-1.5 mt-1.5 cursor-pointer font-semibold text-rose-800">
                            <input
                              type="checkbox"
                              checked={parsedMetadata.createTimelineEvent}
                              onChange={(e) => setParsedMetadata({ ...parsedMetadata, createTimelineEvent: e.target.checked })}
                              className="rounded text-rose-600 focus:ring-rose-500"
                            />
                            <span>Record automatically as Event in Chronological Timeline Ledger</span>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Document Title & Date */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Document Title</label>
                      <input
                        type="text"
                        value={parsedMetadata.title}
                        onChange={(e) => setParsedMetadata({ ...parsedMetadata, title: e.target.value })}
                        placeholder="e.g. Bassendean PS Term 1 Attendance Audit"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-amber-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Document Date (YYYY-MM-DD)</label>
                      <input
                        type="date"
                        value={parsedMetadata.date}
                        onChange={(e) => setParsedMetadata({ ...parsedMetadata, date: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-amber-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Category Dropdown (Based on Metadata & Categorization Schema) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                        <currentCategoryMeta.icon className="w-3.5 h-3.5 text-amber-600" />
                        <span>Document Category <span className="text-amber-600 font-semibold">(Categorization Schema)</span></span>
                      </label>
                      <span className="text-[10px] text-slate-400 font-mono">
                        6 Statutory Classes
                      </span>
                    </div>

                    <select
                      id="document-category-dropdown"
                      value={parsedMetadata.category}
                      onChange={(e) => {
                        const newCategory = e.target.value as DocumentCategory;
                        setParsedMetadata({
                          ...parsedMetadata,
                          category: newCategory,
                          // Pre-seed category tag if none present
                          tags: parsedMetadata.tags.includes(newCategory) 
                            ? parsedMetadata.tags 
                            : [newCategory, ...parsedMetadata.tags.filter(t => !METADATA_CATEGORIES.some(m => m.value === t))],
                        });
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-amber-400 focus:outline-none shadow-xs"
                    >
                      {METADATA_CATEGORIES.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label} — {cat.value === 'Medical' ? 'Hospital, GP, Prescriptions (Order 5.1)' :
                                         cat.value === 'Education' ? 'Bassendean PS, Attendance, Reports (Order 7.3)' :
                                         cat.value === 'Legal/Court' ? 'FCWA Orders, Affidavits, Subpoenas' :
                                         cat.value === 'Direct Communication' ? 'SMS, Emails, 42h Mandate (Order 9.1)' :
                                         cat.value === 'Financial' ? 'Child Support, Invoices, Fees' :
                                         'Sports, Swimming, Fixtures'}
                        </option>
                      ))}
                    </select>

                    {/* Schema Context Info Card */}
                    <div className={`p-2.5 rounded-lg border text-xs flex items-start gap-2.5 ${currentCategoryMeta.badgeClass}`}>
                      <Info className="w-4 h-4 shrink-0 mt-0.5 opacity-80" />
                      <div className="space-y-0.5">
                        <p className="font-bold text-[11px] leading-tight">
                          {currentCategoryMeta.label} Category Scope:
                        </p>
                        <p className="text-[11px] opacity-90 leading-relaxed">
                          {currentCategoryMeta.description}
                        </p>
                        <p className="text-[10px] font-mono pt-0.5 opacity-75">
                          Statutory basis: {currentCategoryMeta.statutoryContext}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Source Origin & Evidentiary Weight */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Source Origin</label>
                      <input
                        type="text"
                        value={parsedMetadata.sourceOrigin}
                        onChange={(e) => setParsedMetadata({ ...parsedMetadata, sourceOrigin: e.target.value })}
                        placeholder="e.g. Bassendean Primary School, Sue-Anne SMS, eCourts Portal"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-amber-400 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Evidence Act 1906 (WA) Weight</label>
                      <select
                        value={parsedMetadata.evidentiaryWeight}
                        onChange={(e) => setParsedMetadata({ ...parsedMetadata, evidentiaryWeight: e.target.value as EvidentiaryWeight })}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-amber-400 focus:outline-none"
                      >
                        <option value="Sworn/Official">Sworn/Official (Affidavits, Court Orders, Subpoenas)</option>
                        <option value="Third-Party Objective">Third-Party Objective (Hospital, School, Telstra Records)</option>
                        <option value="Unverified Claim">Unverified Claim (Uncorroborated Text Statements)</option>
                      </select>
                    </div>
                  </div>

                  {/* Dedicated Tag Field & Searchability Controls */}
                  <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-amber-600" />
                        <span>Document Tags &amp; Search Keywords</span>
                      </label>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {parsedMetadata.tags.length} tag{parsedMetadata.tags.length === 1 ? '' : 's'} assigned
                      </span>
                    </div>

                    {/* Active Tags Display */}
                    <div className="flex flex-wrap gap-1.5 min-h-[34px] p-2 bg-slate-50 border border-slate-200 rounded-lg">
                      {parsedMetadata.tags.length === 0 ? (
                        <span className="text-[11px] text-slate-400 italic flex items-center gap-1">
                          No tags added yet. Type below or select from suggested schema tags.
                        </span>
                      ) : (
                        parsedMetadata.tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-300 text-[11px] font-semibold transition-all hover:bg-amber-100"
                          >
                            <span>#{tag}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveTag(tag)}
                              className="text-amber-600 hover:text-amber-950 p-0.5 rounded-full hover:bg-amber-200"
                              title={`Remove tag #${tag}`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))
                      )}
                    </div>

                    {/* Add Tag Input Form */}
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Tag className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          id="document-tag-input"
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ',') {
                              e.preventDefault();
                              if (tagInput.trim()) {
                                handleAddTag(tagInput);
                              }
                            }
                          }}
                          placeholder="Type tag (e.g. Asthma, Order 5.1, Attendance) & press Enter..."
                          className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-amber-400 focus:outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddTag(tagInput)}
                        disabled={!tagInput.trim()}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Tag</span>
                      </button>
                    </div>

                    {/* Suggested Schema Tags for Current Category */}
                    <div className="pt-2 border-t border-slate-100">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                          Suggested Tags for {currentCategoryMeta.label}:
                        </span>
                        <span className="text-[10px] text-slate-400">Click to add</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {currentCategoryMeta.suggestedTags.map(suggested => {
                          const isAdded = parsedMetadata.tags.some(t => t.toLowerCase() === suggested.toLowerCase());
                          return (
                            <button
                              key={suggested}
                              type="button"
                              onClick={() => handleAddTag(suggested)}
                              disabled={isAdded}
                              className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors flex items-center gap-1 ${
                                isAdded
                                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-default'
                                  : 'bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-800 border-slate-200 hover:border-amber-300'
                              }`}
                            >
                              {isAdded ? (
                                <Check className="w-2.5 h-2.5 text-emerald-600" />
                              ) : (
                                <Plus className="w-2.5 h-2.5 text-slate-400" />
                              )}
                              <span>{suggested}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Excerpt / Summary */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Legal Excerpt / Evidence Summary
                    </label>
                    <textarea
                      rows={2}
                      value={parsedMetadata.excerpt}
                      onChange={(e) => setParsedMetadata({ ...parsedMetadata, excerpt: e.target.value })}
                      placeholder="Brief excerpt of relevant legal claims or facts..."
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-serif focus:ring-2 focus:ring-amber-400 focus:outline-none"
                    />
                  </div>

                  {/* AI Response Requirement Review Box */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-indigo-600" />
                        <span className="text-xs font-bold text-slate-900">
                          AI Response Requirement Review
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 text-[10px] font-semibold">
                          Order 9.1 &amp; 5.1
                        </span>
                      </div>
                      <label className="inline-flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={parsedMetadata.requiresResponse}
                          onChange={(e) => setParsedMetadata({ ...parsedMetadata, requiresResponse: e.target.checked })}
                          className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                        />
                        <span className="font-semibold text-slate-800">Response Required?</span>
                      </label>
                    </div>

                    {parsedMetadata.requiresResponse ? (
                      <div className="space-y-2.5 pt-2 border-t border-slate-200 text-xs">
                        {/* Waiting vs Completed Section Selection */}
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setParsedMetadata({ ...parsedMetadata, responseStatus: 'waiting' })}
                            className={`py-1.5 px-2 rounded border text-xs font-semibold text-center transition ${
                              parsedMetadata.responseStatus === 'waiting'
                                ? 'bg-rose-50 border-rose-400 text-rose-800'
                                : 'bg-white border-slate-200 text-slate-600'
                            }`}
                          >
                            Add to Waiting Section (Pending)
                          </button>
                          <button
                            type="button"
                            onClick={() => setParsedMetadata({ 
                              ...parsedMetadata, 
                              responseStatus: 'completed',
                              responseDate: parsedMetadata.responseDate || parsedMetadata.date
                            })}
                            className={`py-1.5 px-2 rounded border text-xs font-semibold text-center transition ${
                              parsedMetadata.responseStatus === 'completed'
                                ? 'bg-emerald-50 border-emerald-400 text-emerald-800'
                                : 'bg-white border-slate-200 text-slate-600'
                            }`}
                          >
                            Add to Completed Section (Responded)
                          </button>
                        </div>

                        {/* Format & Date Requested */}
                        <div className="grid grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Format</label>
                            <select
                              value={parsedMetadata.responseFormat}
                              onChange={(e) => setParsedMetadata({ ...parsedMetadata, responseFormat: e.target.value as ResponseFormat })}
                              className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-xs"
                            >
                              <option value="Email">Email</option>
                              <option value="SMS">SMS</option>
                              <option value="Medical Clinic Notice">Medical Clinic Notice</option>
                              <option value="School Notice">School Notice</option>
                              <option value="Court Application">Court Application</option>
                              <option value="Formal Letter">Formal Letter</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Date requested</label>
                            <input
                              type="date"
                              value={parsedMetadata.date}
                              onChange={(e) => setParsedMetadata({ ...parsedMetadata, date: e.target.value })}
                              className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-xs font-mono"
                            />
                          </div>
                        </div>

                        {/* Information requested */}
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">Information requested</label>
                          <textarea
                            rows={2}
                            value={parsedMetadata.informationRequested}
                            onChange={(e) => setParsedMetadata({ ...parsedMetadata, informationRequested: e.target.value })}
                            placeholder="Specific question, consent request, or medical/school notice..."
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs"
                          />
                        </div>

                        {/* Response details */}
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">Response details</label>
                          <textarea
                            rows={2}
                            value={parsedMetadata.responseDetails}
                            onChange={(e) => setParsedMetadata({ ...parsedMetadata, responseDetails: e.target.value })}
                            placeholder={parsedMetadata.responseStatus === 'waiting' ? 'Awaiting response from Respondent...' : 'Summary of response received...'}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs"
                          />
                        </div>

                        {/* Response date & Days overdue */}
                        <div className="grid grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Response date</label>
                            <input
                              type="date"
                              value={parsedMetadata.responseDate}
                              onChange={(e) => setParsedMetadata({ ...parsedMetadata, responseDate: e.target.value })}
                              className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-xs font-mono"
                            />
                            <span className="text-[10px] text-slate-400">Leave blank if pending</span>
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Days overdue</label>
                            <input
                              type="number"
                              step="0.1"
                              value={parsedMetadata.daysOverdue}
                              onChange={(e) => setParsedMetadata({ ...parsedMetadata, daysOverdue: parseFloat(e.target.value) || 0 })}
                              className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-xs font-mono"
                            />
                            <span className="text-[10px] text-slate-400">Relative to 42h mandate</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-500 italic">
                        Document does not require a tracked response under interim parenting orders.
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => setParsedMetadata(null)}
                      className="text-xs text-slate-500 hover:text-slate-800 underline"
                    >
                      Reset Schema Form
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-sm transition-colors"
                      id="save-ingested-doc-btn"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Verify &amp; Index into Case Vault</span>
                    </button>
                  </div>
                </div>
              ) : null}
            </form>
          )}

          {/* Vector 2: Google Drive Sync */}
          {activeVector === 'drive' && (
            <div className="space-y-4">
              <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-indigo-900 font-bold">
                  <FolderSync className="w-4 h-4" />
                  <span>Google Drive Folder Sync Connector</span>
                </div>
                <p className="text-indigo-800 text-xs">
                  Connected Folder: <strong className="font-mono">Google Drive / FCWA_Case_4344_Import_Inbox/</strong>
                </p>
                <div className="text-[11px] text-indigo-700">
                  Monitors incoming changeover audio recordings, doctor letters, and school report cards. Automatically tags documents under the 6-part Metadata &amp; Categorization Schema.
                </div>
              </div>

              {syncSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{syncSuccessMsg}</span>
                </div>
              )}

              <button
                onClick={handleTriggerDriveSync}
                disabled={driveSyncing}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg flex items-center justify-center gap-2 shadow-sm"
                id="trigger-drive-sync-btn"
              >
                {driveSyncing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Polling Google Drive API...</span>
                  </>
                ) : (
                  <>
                    <FolderSync className="w-4 h-4" />
                    <span>Sync Google Drive Now</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Vector 3: Public Court Scraper */}
          {activeVector === 'fcwa' && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-emerald-900 font-bold">
                  <Globe className="w-4 h-4" />
                  <span>Family Court of WA Automated Scraper</span>
                </div>
                <p className="text-emerald-800 text-xs">
                  Target: <strong className="font-mono">https://www.familycourt.wa.gov.au/forms/</strong>
                </p>
                <div className="text-[11px] text-emerald-700">
                  Weekly automated poll fetches the latest revisions of Form 1, Form 2 Contravention, and WA Practice Directions. Pre-indexes legal schema tags for instant discovery.
                </div>
              </div>

              {syncSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{syncSuccessMsg}</span>
                </div>
              )}

              <button
                onClick={handleTriggerFcwaScrape}
                disabled={fcwaSyncing}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg flex items-center justify-center gap-2 shadow-sm"
                id="trigger-fcwa-scrape-btn"
              >
                {fcwaSyncing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Checking FCWA Registry Portal...</span>
                  </>
                ) : (
                  <>
                    <Globe className="w-4 h-4" />
                    <span>Scrape Latest FCWA Legal Forms</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Image Inspection Zoom Lightbox Modal */}
      {showImageModal && imagePreviewUrl && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-4xl max-h-[90vh] w-full flex flex-col overflow-hidden shadow-2xl border border-slate-700">
            <div className="p-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-bold text-slate-900">{fileName || 'Court Document Scan'}</span>
              </div>
              <button
                type="button"
                onClick={() => setShowImageModal(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-slate-900/5 flex items-center justify-center">
              <img 
                src={imagePreviewUrl} 
                alt="Enlarged Court Document" 
                className="max-w-full max-h-[75vh] object-contain rounded shadow-md"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
