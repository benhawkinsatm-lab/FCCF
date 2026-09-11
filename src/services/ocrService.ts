import Tesseract from 'tesseract.js';

export interface OcrProgress {
  status: string;
  progress: number; // 0 to 100
}

export interface OcrResult {
  text: string;
  confidence: number;
  wordCount: number;
  lineCount: number;
  durationMs: number;
}

/**
 * Clean up OCR extracted text for legal indexing:
 * - Normalize excessive blank lines
 * - Fix common OCR artifacts while preserving legal case numbers and quotes
 */
export function cleanOcrText(rawText: string): string {
  if (!rawText) return '';
  return rawText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Remove null bytes or non-printable chars except newlines and tabs
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Replace 3+ consecutive line breaks with 2
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Perform optical character recognition on an image (File, Blob, base64 data URL, or HTMLImageElement)
 */
export async function performOcr(
  imageSource: File | Blob | string,
  onProgress?: (progress: OcrProgress) => void
): Promise<OcrResult> {
  const startTime = Date.now();

  try {
    if (onProgress) {
      onProgress({ status: 'Initializing OCR engine...', progress: 5 });
    }

    const result = await Tesseract.recognize(
      imageSource,
      'eng',
      {
        logger: (m) => {
          if (!onProgress) return;
          if (m.status === 'loading tesseract core') {
            onProgress({ status: 'Loading OCR core engine...', progress: Math.round((m.progress || 0) * 20) });
          } else if (m.status === 'initializing tesseract' || m.status === 'initialized tesseract') {
            onProgress({ status: 'Initializing court dictionary...', progress: 25 });
          } else if (m.status === 'loading language traineddata') {
            onProgress({ status: 'Loading language trained data...', progress: 35 + Math.round((m.progress || 0) * 15) });
          } else if (m.status === 'recognizing text') {
            onProgress({
              status: `Extracting text from image (${Math.round((m.progress || 0) * 100)}%)...`,
              progress: 50 + Math.round((m.progress || 0) * 48),
            });
          }
        },
      }
    );

    const rawText = result.data?.text || '';
    const cleaned = cleanOcrText(rawText);
    const confidence = Math.round(result.data?.confidence || 0);
    const words = cleaned ? cleaned.split(/\s+/).filter(Boolean).length : 0;
    const lines = cleaned ? cleaned.split('\n').filter(Boolean).length : 0;

    if (onProgress) {
      onProgress({ status: 'OCR extraction complete', progress: 100 });
    }

    return {
      text: cleaned,
      confidence,
      wordCount: words,
      lineCount: lines,
      durationMs: Date.now() - startTime,
    };
  } catch (error: any) {
    console.error('Tesseract OCR error:', error);
    throw new Error(error?.message || 'Optical character recognition failed on this document image.');
  }
}

/**
 * Check if a file is an image that can be processed by OCR
 */
export function isImageFile(file: File | { type?: string; name?: string }): boolean {
  if (file.type && file.type.startsWith('image/')) {
    return true;
  }
  const name = file.name || '';
  return /\.(png|jpe?g|webp|bmp|gif|tiff|svg)$/i.test(name);
}

/**
 * Extensions and MIME types for files whose bytes are binary/compressed and
 * must never be decoded as UTF-8 text. This includes plain archives (.zip,
 * .7z, .rar, .gz, .tar) as well as Office Open XML documents (.docx/.xlsx/
 * .pptx are themselves ZIP containers under the hood), legacy binary Office
 * formats, and common media containers. Calling File#text() /
 * FileReader.readAsText() on one of these does not fail -- it silently
 * returns unparsed binary/compressed fragments (mojibake, or raw NUL bytes)
 * that look superficially like text, so callers must check this BEFORE
 * choosing a text-decode path, not after seeing garbled output.
 */
const UNEXTRACTABLE_BINARY_EXTENSIONS = /\.(zip|7z|rar|gz|tgz|tar|docx?|xlsx?|pptx?|odt|ods|odp|exe|dmg|iso|mp3|mp4|wav|avi|mov|mkv)$/i;
const UNEXTRACTABLE_BINARY_MIME_TYPES = new Set([
  'application/zip',
  'application/x-zip-compressed',
  'application/x-7z-compressed',
  'application/x-rar-compressed',
  'application/gzip',
  'application/x-tar',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/msword',
  'application/vnd.ms-excel',
  'application/vnd.ms-powerpoint',
]);

/**
 * True for a file whose content is binary/compressed and cannot be safely
 * decoded as UTF-8 text. Callers must not pass such a file through
 * file.text()/FileReader.readAsText(), and should not feed its raw bytes
 * to a text/document AI parser either -- the correct handling is to
 * preserve the original file and record honestly that no text content
 * could be extracted, per the zero-hallucination requirement.
 */
export function isUnextractableBinaryFile(file: File | { type?: string; name?: string }): boolean {
  const type = (file.type || '').toLowerCase();
  if (UNEXTRACTABLE_BINARY_MIME_TYPES.has(type)) return true;
  const name = (file.name || '').toLowerCase();
  return UNEXTRACTABLE_BINARY_EXTENSIONS.test(name);
}

/**
 * Generates an authentic sample court document image on an HTML5 canvas
 * and returns it as a PNG File for immediate one-click testing of OCR in the browser.
 */
export function generateSampleCourtDocumentFile(): File {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 1600;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas context not available');
  }

  // Background - Aged court document off-white paper
  ctx.fillStyle = '#fbfbfa';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle border / margin line
  ctx.strokeStyle = '#d4d4d8';
  ctx.lineWidth = 2;
  ctx.strokeRect(60, 60, canvas.width - 120, canvas.height - 120);

  // Header Title
  ctx.fillStyle = '#18181b';
  ctx.font = 'bold 28px serif';
  ctx.textAlign = 'center';
  ctx.fillText('IN THE FAMILY COURT OF WESTERN AUSTRALIA', canvas.width / 2, 130);

  ctx.font = '18px serif';
  ctx.fillText('HELD AT 150 TERRACE ROAD, PERTH WA 6000', canvas.width / 2, 165);

  ctx.font = 'bold 20px monospace';
  ctx.fillText('COURT FILE NUMBER: PTW 4344 / 2023', canvas.width / 2, 210);

  // Divider line
  ctx.strokeStyle = '#18181b';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(100, 235);
  ctx.lineTo(canvas.width - 100, 235);
  ctx.stroke();

  // Parties
  ctx.textAlign = 'left';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('BETWEEN:', 100, 280);

  ctx.font = '17px sans-serif';
  ctx.fillText('BENJAMIN JOHN HAWKINS', 140, 315);
  ctx.font = 'italic 15px sans-serif';
  ctx.fillText('(Applicant Father)', 440, 315);

  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('AND', 100, 355);

  ctx.font = '17px sans-serif';
  ctx.fillText('SUE-ANNE HAWKINS', 140, 395);
  ctx.font = 'italic 15px sans-serif';
  ctx.fillText('(Respondent Mother)', 440, 395);

  // Document Heading
  ctx.textAlign = 'center';
  ctx.font = 'bold 22px serif';
  ctx.fillText('HOSPITAL EMERGENCY DEPARTMENT DISCHARGE NOTICE', canvas.width / 2, 470);
  ctx.font = 'italic 16px serif';
  ctx.fillText('Evidentiary Annexure BJH-04 — Compliance with Interim Order 5.1', canvas.width / 2, 505);

  // Body content lines
  ctx.textAlign = 'left';
  ctx.font = '16px serif';
  ctx.fillStyle = '#27272a';

  const bodyLines = [
    'PATIENT IDENTIFICATION & CLINICAL SUMMARY:',
    'Patient Name: Isabella Hawkins     Date of Birth: 14/05/2016 (Age: 7)',
    'Facility: Hospital Emergency Department',
    'Admission Date: 20 November 2023 at 18:42 AWST',
    'Discharge Date: 21 November 2023 at 08:30 AWST',
    '',
    'CLINICAL DIAGNOSIS & OBSERVATIONS:',
    '1. Acute moderate asthma exacerbation presenting with tachypnea, audible wheezing, and SpO2 91%.',
    '2. Administered 6 x bursts Salbutamol (Ventolin) via spacer with oral prednisolone 20mg.',
    '3. Patient stabilized following 14 hours observation in Paediatric Short Stay Unit.',
    '4. Ongoing Action Plan: Daily Budesonide 200mcg preventer plus Ventolin as required.',
    '',
    'STATUTORY & COURT NOTIFICATION REQUIREMENTS:',
    'Under Sealed Interim Order 5.1 of 12 October 2023, each parent is strictly required to provide',
    'written notice within 24 hours of any hospital emergency admission or specialist medical consultation.',
    'Notice of this emergency admission was withheld from the Applicant until 26 November 2023.',
    '',
    'VERIFICATION & OFFICER ATTESTATION:',
    'Attending Paediatric Registrar: Dr. R. Patel, MBBS, FRACP (AHPRA Reg: MED000189422)',
    'Clinical Unit: Paediatric Emergency Medicine, Midland Public Hospital',
    'Certified contemporaneous copy extracted from eCourts WA Case Portal Archive.'
  ];

  let currentY = 560;
  for (const line of bodyLines) {
    if (line.startsWith('PATIENT') || line.startsWith('CLINICAL') || line.startsWith('STATUTORY') || line.startsWith('VERIFICATION')) {
      ctx.font = 'bold 17px sans-serif';
      ctx.fillStyle = '#09090b';
      ctx.fillText(line, 100, currentY);
      currentY += 32;
    } else if (line === '') {
      currentY += 16;
    } else {
      ctx.font = '16px serif';
      ctx.fillStyle = '#27272a';
      ctx.fillText(line, 100, currentY);
      currentY += 28;
    }
  }

  // Official Seal Stamp Simulation
  ctx.save();
  ctx.translate(canvas.width - 240, canvas.height - 240);
  ctx.rotate(-0.12);
  ctx.strokeStyle = '#b91c1c';
  ctx.fillStyle = '#b91c1c';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, 75, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, 68, 0, Math.PI * 2);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('FAMILY COURT OF WA', 0, -35);
  ctx.fillText('CASE 4344/2023', 0, -15);
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('FILED EVIDENCE', 0, 10);
  ctx.font = '10px monospace';
  ctx.fillText('SEALED RECORD', 0, 32);
  ctx.fillText('21 NOV 2023', 0, 48);
  ctx.restore();

  // Convert canvas to Blob then File
  const dataUrl = canvas.toDataURL('image/png');
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  const blob = new Blob([u8arr], { type: mime });
  return new File([blob], 'Hospital_Discharge_Notice_Order_5.1.png', { type: 'image/png' });
}

