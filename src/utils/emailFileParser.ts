/**
 * Parses .eml (RFC822 MIME) and .msg (Outlook binary/CFBF) email files into
 * a normalized, readable text payload -- a "From/To/Date/Subject" header
 * block followed by the message body -- so downstream AI document parsing
 * (see bulkIngestionPipeline.ts and DocumentIngestionModal.tsx) sees an
 * email exactly the way it would if the user had pasted the text in
 * manually, rather than raw MIME source (.eml) or an unreadable binary
 * blob (.msg).
 *
 * .eml is parsed entirely client-side with postal-mime (a zero-dependency,
 * browser-safe RFC822 parser). .msg is Outlook's legacy binary/CFBF
 * format and its reader (@kenjiuno/msgreader) pulls in iconv-lite for
 * legacy code-page decoding, which needs Node's Buffer -- so .msg files
 * are sent to the server's /api/parse-msg endpoint, which does the actual
 * parsing in the Node process and returns the same normalized shape. The
 * original file bytes are still preserved separately via
 * originalFileStorage.ts either way, so "Open Original File" hands back
 * the exact .eml/.msg the user uploaded regardless of which path parsed it.
 */
import PostalMime from 'postal-mime';
import type { Address } from 'postal-mime';

export interface ParsedEmailFile {
  /** Formatted "From/To/.../Subject" header block + body, ready for AI parsing. */
  textPayload: string;
  subject: string;
  from: string;
  date: string;
  attachmentNames: string[];
}

/** True for a .eml or .msg file, by extension or (when the browser sets it) MIME type. */
export function isEmailFile(file: File): boolean {
  const name = (file.name || '').toLowerCase();
  const type = (file.type || '').toLowerCase();
  return (
    name.endsWith('.eml') ||
    name.endsWith('.msg') ||
    type === 'message/rfc822' ||
    type === 'application/vnd.ms-outlook'
  );
}

function formatAddressList(addresses: Address[] | undefined): string {
  if (!addresses || addresses.length === 0) return '';
  return addresses
    .map(a => {
      if ('address' in a && a.address) {
        return a.name ? `${a.name} <${a.address}>` : a.address;
      }
      if ('group' in a && a.group) {
        return formatAddressList(a.group);
      }
      return a.name || '';
    })
    .filter(Boolean)
    .join(', ');
}

/** Crude HTML-to-text fallback for messages that only carry an HTML body. */
function htmlToPlainText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<\/(p|div|tr|table|li)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function buildTextPayload(headerLines: Array<[string, string]>, attachmentNames: string[], body: string): string {
  const header = headerLines
    .filter(([, value]) => value && value.trim().length > 0)
    .map(([label, value]) => `${label}: ${value}`)
    .join('\n');
  const attachmentsLine = attachmentNames.length > 0 ? `Attachments: ${attachmentNames.join(', ')}\n` : '';
  return `${header}\n${attachmentsLine}\n${body || '(No message body content.)'}`.trim();
}

async function parseEml(file: File): Promise<ParsedEmailFile> {
  const buffer = await file.arrayBuffer();
  const email = await PostalMime.parse(buffer);

  const from = formatAddressList(email.from ? [email.from] : undefined);
  const to = formatAddressList(email.to);
  const cc = formatAddressList(email.cc);
  const date = email.date || '';
  const subject = email.subject || file.name.replace(/\.eml$/i, '');
  const attachmentNames = (email.attachments || [])
    .map(a => a.filename)
    .filter((n): n is string => Boolean(n));
  const body = email.text || (email.html ? htmlToPlainText(email.html) : '');

  return {
    textPayload: buildTextPayload(
      [
        ['From', from],
        ['To', to],
        ['Cc', cc],
        ['Date', date],
        ['Subject', subject],
      ],
      attachmentNames,
      body
    ),
    subject,
    from,
    date,
    attachmentNames,
  };
}

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

async function parseMsg(file: File): Promise<ParsedEmailFile> {
  const base64Data = await fileToBase64(file);
  const res = await fetch('/api/parse-msg', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base64Data, fileName: file.name }),
  });
  if (!res.ok) {
    throw new Error(`Server could not parse .msg file (status ${res.status})`);
  }
  const data = await res.json();
  return {
    textPayload: data.textPayload || '',
    subject: data.subject || file.name.replace(/\.msg$/i, ''),
    from: data.from || '',
    date: data.date || '',
    attachmentNames: Array.isArray(data.attachmentNames) ? data.attachmentNames : [],
  };
}

/**
 * Parses a .eml or .msg File into a normalized text payload. Never throws:
 * a parse failure falls back to a minimal payload built from the filename
 * alone, so a malformed/corrupted email file still ingests as *something*
 * (with an accurate title, at minimum) rather than aborting the whole
 * import for that file.
 */
export async function parseEmailFile(file: File): Promise<ParsedEmailFile> {
  try {
    const name = (file.name || '').toLowerCase();
    if (name.endsWith('.msg') || file.type === 'application/vnd.ms-outlook') {
      return await parseMsg(file);
    }
    return await parseEml(file);
  } catch (err) {
    console.warn(`Failed to parse email file "${file.name}", falling back to filename-only metadata:`, err);
    const subject = file.name.replace(/\.(eml|msg)$/i, '');
    return {
      textPayload: `Subject: ${subject}\n\n(This email file could not be parsed. The original is still stored and can be opened directly.)`,
      subject,
      from: '',
      date: '',
      attachmentNames: [],
    };
  }
}
