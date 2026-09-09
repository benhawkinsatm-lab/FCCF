import { jsPDF } from 'jspdf';
import { DocumentRecord } from '../../types';
import { BinderCoversheetConfig, DocumentAnnotation } from './types';

export interface GeneratePdfOptions {
  documents: DocumentRecord[];
  coversheetConfig: BinderCoversheetConfig;
  annotations: DocumentAnnotation[];
}

export function sortAndGroupDocuments(
  docs: DocumentRecord[],
  groupBy: BinderCoversheetConfig['groupBy']
): { groupName: string; documents: DocumentRecord[] }[] {
  if (groupBy === 'tag') {
    const map = new Map<string, DocumentRecord[]>();
    docs.forEach(doc => {
      const tags = doc.tags && doc.tags.length > 0 ? doc.tags : ['Untagged / General'];
      tags.forEach(tag => {
        const key = tag.startsWith('#') ? tag : `#${tag}`;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(doc);
      });
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([groupName, documents]) => ({
        groupName,
        documents: documents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      }));
  }

  if (groupBy === 'category') {
    const map = new Map<string, DocumentRecord[]>();
    docs.forEach(doc => {
      const key = doc.category || 'Other';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(doc);
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([groupName, documents]) => ({
        groupName,
        documents: documents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      }));
  }

  if (groupBy === 'weight') {
    const map = new Map<string, DocumentRecord[]>();
    docs.forEach(doc => {
      const key = doc.evidentiaryWeight || 'Other';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(doc);
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([groupName, documents]) => ({
        groupName,
        documents: documents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      }));
  }

  // Default: Chronological
  const sorted = [...docs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return [{ groupName: 'Master Chronological Order', documents: sorted }];
}

export function generateEvidenceBinderPdf({
  documents,
  coversheetConfig,
  annotations
}: GeneratePdfOptions): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // ~210 mm
  const pageHeight = doc.internal.pageSize.getHeight(); // ~297 mm
  const margin = 18;
  const contentWidth = pageWidth - (margin * 2);

  // Group and sort documents
  const groupedSections = sortAndGroupDocuments(documents, coversheetConfig.groupBy);

  // --- PAGE 1: COURT COVERSHEET ---
  // Border decoration
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.8);
  doc.rect(margin - 4, margin - 4, contentWidth + 8, pageHeight - (margin * 2) + 8);

  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.2);
  doc.rect(margin - 2, margin - 2, contentWidth + 4, pageHeight - (margin * 2) + 4);

  let y = margin + 8;

  // Court Title
  doc.setFont('times', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(coversheetConfig.courtName.toUpperCase(), pageWidth / 2, y, { align: 'center' });

  y += 6;
  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text(`REGISTRY: ${coversheetConfig.registry}   •   FILE NUMBER: ${coversheetConfig.fileNumber}`, pageWidth / 2, y, { align: 'center' });

  y += 7;
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.line(margin + 10, y, pageWidth - margin - 10, y);

  y += 8;
  // Parties
  doc.setFont('times', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(`${coversheetConfig.applicantName} (Applicant)`, pageWidth / 2, y, { align: 'center' });

  y += 5;
  doc.setFont('times', 'italic');
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text('- and -', pageWidth / 2, y, { align: 'center' });

  y += 5;
  doc.setFont('times', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(`${coversheetConfig.respondentName} (Respondent)`, pageWidth / 2, y, { align: 'center' });

  y += 10;
  // Title Banner
  doc.setFillColor(241, 245, 249);
  doc.rect(margin + 5, y - 4, contentWidth - 10, 16, 'F');
  doc.setDrawColor(100, 116, 139);
  doc.setLineWidth(0.5);
  doc.rect(margin + 5, y - 4, contentWidth - 10, 16, 'D');

  doc.setFont('times', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(coversheetConfig.bundleTitle.toUpperCase(), pageWidth / 2, y + 4, { align: 'center' });
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('CERTIFICATE OF IDENTIFICATION OF EXHIBITS PURSUANT TO FAMILY LAW RULES', pageWidth / 2, y + 9, { align: 'center' });

  y += 22;

  // Deponent Recital
  doc.setFont('times', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  const recitalText = `This is the consolidated Bundle of Evidence containing ${documents.length} identified exhibits and primary documents, marked sequentially Annexure BJH-1 to BJH-${documents.length}, referred to in the Affidavit of ${coversheetConfig.deponentName} sworn at Perth on ${coversheetConfig.filingDate}.`;
  const splitRecital = doc.splitTextToSize(recitalText, contentWidth - 8);
  doc.text(splitRecital, margin + 4, y);
  y += (splitRecital.length * 4.5) + 4;

  if (coversheetConfig.matterDescription) {
    doc.setFont('times', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    const purposeSplit = doc.splitTextToSize(`Matter Details: ${coversheetConfig.matterDescription}`, contentWidth - 8);
    doc.text(purposeSplit, margin + 4, y);
    y += (purposeSplit.length * 4.2) + 6;
  }

  // Summary Statistics Box
  if (coversheetConfig.includeSummaryStats) {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin + 4, y, contentWidth - 8, 38, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text('AUTOMATED EVIDENCE DOSSIER SUMMARY', margin + 8, y + 6);

    // Compute metrics
    const categoriesCount: Record<string, number> = {};
    const weightCount: Record<string, number> = {};
    const tagsCount: Record<string, number> = {};
    let earliestDate = documents[0]?.date || '';
    let latestDate = documents[0]?.date || '';

    documents.forEach(d => {
      categoriesCount[d.category] = (categoriesCount[d.category] || 0) + 1;
      weightCount[d.evidentiaryWeight] = (weightCount[d.evidentiaryWeight] || 0) + 1;
      if (d.tags) {
        d.tags.forEach(t => {
          tagsCount[t] = (tagsCount[t] || 0) + 1;
        });
      }
      if (d.date < earliestDate) earliestDate = d.date;
      if (d.date > latestDate) latestDate = d.date;
    });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    doc.text(`Total Exhibits: ${documents.length} documents`, margin + 8, y + 13);
    doc.text(`Chronological Span: ${earliestDate} to ${latestDate}`, margin + 8, y + 18);
    doc.text(`Grouping Mode: ${coversheetConfig.groupBy.toUpperCase()}`, margin + 8, y + 23);

    const catSummary = Object.entries(categoriesCount)
      .slice(0, 4)
      .map(([k, v]) => `${k} (${v})`)
      .join('  •  ');
    doc.text(`Categories: ${catSummary}`, margin + 8, y + 28);

    const weightSummary = Object.entries(weightCount)
      .map(([k, v]) => `${k} (${v})`)
      .join('  •  ');
    doc.text(`Weights: ${weightSummary}`, margin + 8, y + 33);

    y += 44;
  }

  // Jurat / Signature Block
  const juratY = pageHeight - margin - 32;
  doc.setFont('times', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text(`Sworn by the Deponent, ${coversheetConfig.deponentName}:`, margin + 4, juratY);
  doc.text(`Witnessed before an authorized officer:`, pageWidth / 2 + 10, juratY);

  doc.setDrawColor(100, 116, 139);
  doc.setLineWidth(0.3);
  doc.line(margin + 4, juratY + 16, margin + 70, juratY + 16);
  doc.line(pageWidth / 2 + 10, juratY + 16, pageWidth - margin - 10, juratY + 16);

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Signature of Deponent', margin + 4, juratY + 20);
  doc.text(coversheetConfig.witnessTitle, pageWidth / 2 + 10, juratY + 20);
  doc.text(`Filing Date: ${coversheetConfig.filingDate}`, margin + 4, juratY + 25);
  doc.text(coversheetConfig.solicitorFirmOrDeponentNote, pageWidth / 2 + 10, juratY + 25);

  // Footer coversheet
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text('COURT DOCUMENT BUNDLE • FAMILY COURT OF WA • CASE NO 4344/2023', pageWidth / 2, pageHeight - 10, { align: 'center' });

  // --- PAGE 2: MASTER TABLE OF CONTENTS / INDEX ---
  if (coversheetConfig.includeTableOfContents) {
    doc.addPage();
    let cy = margin;

    // Header
    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text('MASTER SCHEDULE OF ANNEXURES & PRIMARY EVIDENCE', pageWidth / 2, cy + 4, { align: 'center' });

    cy += 7;
    doc.setFont('times', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text('Schedule of documents sequentially indexed for cross-examination and judicial review', pageWidth / 2, cy + 2, { align: 'center' });

    cy += 8;
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.4);
    doc.line(margin, cy, pageWidth - margin, cy);
    cy += 4;

    // Table Header
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, cy, contentWidth, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text('ANNEXURE', margin + 2, cy + 5);
    doc.text('DATE', margin + 24, cy + 5);
    doc.text('TITLE & DESCRIPTION', margin + 44, cy + 5);
    doc.text('CATEGORY / TAGS', margin + 115, cy + 5);
    doc.text('SOURCE ORIGIN', margin + 148, cy + 5);

    cy += 8;

    let exhibitIndex = 1;
    groupedSections.forEach(section => {
      // Group section banner if multiple groups
      if (groupedSections.length > 1) {
        if (cy > pageHeight - margin - 15) {
          doc.addPage();
          cy = margin + 6;
        }
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, cy, contentWidth, 6, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(79, 70, 229);
        doc.text(`Group: ${section.groupName} (${section.documents.length} exhibits)`, margin + 3, cy + 4.5);
        cy += 7;
      }

      section.documents.forEach(item => {
        if (cy > pageHeight - margin - 12) {
          doc.addPage();
          cy = margin + 6;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(30, 41, 59);
        doc.text(item.annexureNumber || `BJH-${exhibitIndex}`, margin + 2, cy + 3.5);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        doc.text(item.date, margin + 24, cy + 3.5);

        doc.setTextColor(15, 23, 42);
        const truncatedTitle = item.title.length > 42 ? item.title.substring(0, 40) + '...' : item.title;
        doc.text(truncatedTitle, margin + 44, cy + 3.5);

        // Tags or Category
        const tagText = item.tags && item.tags.length > 0 ? `#${item.tags[0]}` : item.category;
        doc.setTextColor(79, 70, 229);
        doc.text(tagText.substring(0, 18), margin + 115, cy + 3.5);

        doc.setTextColor(71, 85, 105);
        doc.text(item.sourceOrigin.substring(0, 18), margin + 148, cy + 3.5);

        cy += 6;
        doc.setDrawColor(241, 245, 249);
        doc.setLineWidth(0.2);
        doc.line(margin, cy - 1, pageWidth - margin, cy - 1);
        exhibitIndex++;
      });
    });

    // Page number
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text('Table of Annexures — Family Court of WA Case 4344/2023', pageWidth / 2, pageHeight - 10, { align: 'center' });
  }

  // --- DOCUMENT EXHIBIT PAGES ---
  let annexureCounter = 1;
  groupedSections.forEach(section => {
    section.documents.forEach(docRecord => {
      doc.addPage();
      let ey = margin;

      // Official Annexure Banner
      doc.setFillColor(30, 41, 59);
      doc.rect(margin, ey, contentWidth, 14, 'F');

      doc.setFont('times', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(255, 255, 255);
      const annLabel = docRecord.annexureNumber || `ANNEXURE BJH-${annexureCounter}`;
      doc.text(annLabel.toUpperCase(), margin + 5, ey + 6);

      doc.setFont('times', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(203, 213, 225);
      doc.text(`IN THE FAMILY COURT OF WESTERN AUSTRALIA • FILE 4344/2023`, margin + 5, ey + 11);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(253, 224, 71);
      doc.text(`EXHIBIT #${annexureCounter} OF ${documents.length}`, pageWidth - margin - 5, ey + 6, { align: 'right' });

      ey += 18;

      // Document Header Metadata Card
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.roundedRect(margin, ey, contentWidth, 24, 2, 2, 'FD');

      doc.setFont('times', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text(docRecord.title, margin + 4, ey + 6);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(`Date of Document: ${docRecord.date}   •   Source: ${docRecord.sourceOrigin}`, margin + 4, ey + 12);
      doc.text(`Category: ${docRecord.category}   •   Evidentiary Weight: ${docRecord.evidentiaryWeight}`, margin + 4, ey + 17);

      if (docRecord.tags && docRecord.tags.length > 0) {
        const tagStr = docRecord.tags.map(t => `#${t}`).join('  ');
        doc.setTextColor(79, 70, 229);
        doc.text(`Tags: ${tagStr}`, margin + 4, ey + 22);
      }

      ey += 28;

      // Excerpt Blockquote
      if (docRecord.excerpt) {
        doc.setFillColor(254, 252, 232);
        doc.setDrawColor(253, 224, 71);
        doc.setLineWidth(0.5);
        doc.rect(margin, ey, contentWidth, 14, 'FD');

        doc.setFont('times', 'italic');
        doc.setFontSize(8.5);
        doc.setTextColor(113, 63, 18);
        const splitExcerpt = doc.splitTextToSize(`"${docRecord.excerpt}"`, contentWidth - 8);
        doc.text(splitExcerpt, margin + 4, ey + 5.5);

        ey += 18;
      }

      // Full Text Section
      doc.setFont('times', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text('DOCUMENT RECORD TEXT & TRANSCRIPTION', margin, ey);
      ey += 4;

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(margin, ey, pageWidth - margin, ey);
      ey += 5;

      doc.setFont('courier', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);

      const rawText = docRecord.fullText || docRecord.excerpt || 'No full text available for this exhibit record.';
      const splitBody = doc.splitTextToSize(rawText, contentWidth);

      // We fit text lines gracefully
      const maxLinesOnFirstPage = coversheetConfig.includeAnnotations ? 14 : 22;
      const linesToPrint = splitBody.slice(0, maxLinesOnFirstPage);
      doc.text(linesToPrint, margin, ey);
      ey += (linesToPrint.length * 4.2) + 6;

      // Annotations & Sticky Notes Section
      if (coversheetConfig.includeAnnotations) {
        const docAnnotations = annotations.filter(a => a.docId === docRecord.id);
        if (docAnnotations.length > 0) {
          if (ey > pageHeight - margin - 40) {
            doc.addPage();
            ey = margin + 6;
          }

          doc.setFillColor(254, 243, 199);
          doc.setDrawColor(245, 158, 11);
          doc.setLineWidth(0.4);
          doc.roundedRect(margin, ey, contentWidth, 8, 1.5, 1.5, 'FD');

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.setTextColor(146, 64, 14);
          doc.text(`EVIDENTIARY ANNOTATIONS & STICKY NOTES (${docAnnotations.length})`, margin + 4, ey + 5.5);
          ey += 11;

          docAnnotations.forEach(ann => {
            if (ey > pageHeight - margin - 22) {
              doc.addPage();
              ey = margin + 6;
            }

            // Sticky note box styling
            doc.setFillColor(255, 251, 235);
            doc.setDrawColor(252, 211, 77);
            doc.setLineWidth(0.3);
            doc.roundedRect(margin + 2, ey, contentWidth - 4, 18, 1.5, 1.5, 'FD');

            // Tag & Author
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.setTextColor(180, 83, 9);
            const tagLabel = ann.categoryTag ? `[${ann.categoryTag.toUpperCase()}] ` : '';
            doc.text(`${tagLabel}Highlighted: "${ann.textSnippet.substring(0, 70)}..."`, margin + 6, ey + 5);

            // Commentary
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(51, 65, 85);
            const noteText = `Note: ${ann.comment}`;
            const splitNote = doc.splitTextToSize(noteText, contentWidth - 12);
            doc.text(splitNote.slice(0, 2), margin + 6, ey + 9.5);

            doc.setFontSize(6.5);
            doc.setTextColor(148, 163, 184);
            doc.text(`By: ${ann.author} • ${ann.createdAt}`, margin + 6, ey + 15.5);

            ey += 21;
          });
        }
      }

      // Page footer
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Annexure ${annLabel} • In the Family Court of WA (File 4344/2023) • Hawkins v Hawkins`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );

      annexureCounter++;
    });
  });

  return doc;
}
