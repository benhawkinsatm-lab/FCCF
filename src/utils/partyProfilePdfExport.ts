import { jsPDF } from 'jspdf';
import { PartyProfile, VerbatimExample } from '../types';

const MARGIN = 18;
const LINE_H = 5;

/**
 * Builds a court-ready PDF report for a single party (or child) profile,
 * following the same jsPDF/A4/"times" styling used by the evidence binder
 * export so exports across the app look consistent.
 */
export function generatePartyProfilePdf(profile: PartyProfile): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - MARGIN * 2;
  let y = MARGIN;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - MARGIN) {
      doc.addPage();
      y = MARGIN;
    }
  };

  const heading = (text: string) => {
    ensureSpace(12);
    y += 4;
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, y, pageWidth - MARGIN, y);
    y += 6;
    doc.setFont('times', 'bold');
    doc.setFontSize(11.5);
    doc.setTextColor(15, 23, 42);
    doc.text(text.toUpperCase(), MARGIN, y);
    y += 6;
  };

  const paragraph = (text: string, opts?: { italic?: boolean; size?: number }) => {
    if (!text) return;
    doc.setFont('times', opts?.italic ? 'italic' : 'normal');
    doc.setFontSize(opts?.size || 9.5);
    doc.setTextColor(30, 41, 59);
    const lines = doc.splitTextToSize(text, contentWidth);
    ensureSpace(lines.length * LINE_H);
    doc.text(lines, MARGIN, y);
    y += lines.length * LINE_H + 2;
  };

  const keyValue = (label: string, value: string) => {
    if (!value) return;
    const labelText = `${label}: `;
    doc.setFont('times', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(71, 85, 105);
    const labelWidth = doc.getTextWidth(labelText);
    doc.setFont('times', 'normal');
    doc.setTextColor(30, 41, 59);
    const lines = doc.splitTextToSize(value, contentWidth - labelWidth);
    ensureSpace(lines.length * LINE_H);
    doc.setFont('times', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text(labelText, MARGIN, y);
    doc.setFont('times', 'normal');
    doc.setTextColor(30, 41, 59);
    doc.text(lines, MARGIN + labelWidth, y);
    y += lines.length * LINE_H + 1.5;
  };

  const bulletList = (items: string[], label?: string) => {
    if (!items || items.length === 0) return;
    if (label) {
      doc.setFont('times', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      ensureSpace(LINE_H);
      doc.text(label, MARGIN, y);
      y += LINE_H;
    }
    doc.setFont('times', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    items.forEach((item) => {
      const lines = doc.splitTextToSize(`•  ${item}`, contentWidth - 4);
      ensureSpace(lines.length * LINE_H);
      doc.text(lines, MARGIN + 2, y);
      y += lines.length * LINE_H;
    });
    y += 2;
  };

  const verbatimList = (examples: VerbatimExample[] | undefined, label: string) => {
    if (!examples || examples.length === 0) return;
    doc.setFont('times', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    ensureSpace(LINE_H);
    doc.text(label, MARGIN, y);
    y += LINE_H;
    examples.forEach((ex) => {
      const quote = `"${ex.excerpt}"`;
      const lines = doc.splitTextToSize(quote, contentWidth - 4);
      ensureSpace(lines.length * LINE_H + LINE_H);
      doc.setFont('times', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.text(lines, MARGIN + 2, y);
      y += lines.length * LINE_H;
      const meta = [ex.date, ex.context].filter(Boolean).join(' — ');
      if (meta) {
        doc.setFont('times', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text(meta, MARGIN + 2, y);
        y += LINE_H;
      }
    });
    y += 2;
  };

  // --- Header ---
  doc.setFont('times', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text('FAMILY COURT OF WESTERN AUSTRALIA (PERTH REGISTRY)', pageWidth / 2, y, { align: 'center' });
  y += 6;
  doc.setFont('times', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(71, 85, 105);
  doc.text('FILE NUMBER: 4344/2023  •  PARTY PROFILE REPORT', pageWidth / 2, y, { align: 'center' });
  y += 8;

  doc.setFillColor(241, 245, 249);
  doc.rect(MARGIN, y - 5, contentWidth, 16, 'F');
  doc.setDrawColor(100, 116, 139);
  doc.setLineWidth(0.4);
  doc.rect(MARGIN, y - 5, contentWidth, 16, 'D');
  doc.setFont('times', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(profile.partyName, pageWidth / 2, y, { align: 'center' });
  doc.setFontSize(9);
  doc.setFont('times', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(profile.role, pageWidth / 2, y + 6, { align: 'center' });
  y += 16;

  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`Generated: ${new Date().toLocaleString('en-AU')}`, pageWidth / 2, y, { align: 'center' });
  y += 8;

  paragraph(profile.summary);

  if (profile.childDetail) {
    const cd = profile.childDetail;
    heading('Child Overview');
    keyValue('School', cd.school || '');
    keyValue('Year Level', cd.yearLevel || '');
    bulletList(cd.developmentalNeeds, 'Developmental Needs');

    heading('Health & Medical');
    paragraph(cd.healthAndMedical.summary);
    bulletList(cd.healthAndMedical.conditions, 'Conditions');
    bulletList(cd.healthAndMedical.treatingProviders, 'Treating Providers');
    if (cd.healthAndMedical.complianceNotes) paragraph(cd.healthAndMedical.complianceNotes, { italic: true });

    heading('Education & Schooling');
    paragraph(cd.educationAndSchooling.summary);
    if (cd.educationAndSchooling.attendanceNotes) paragraph(cd.educationAndSchooling.attendanceNotes, { italic: true });
    bulletList(cd.educationAndSchooling.supportNeeds, 'Support Needs');

    heading('Emotional & Psychological');
    paragraph(cd.emotionalAndPsychological.summary);
    bulletList(cd.emotionalAndPsychological.observedIndicators, 'Observed Indicators');
    if (cd.emotionalAndPsychological.exposureToConflictNotes) {
      paragraph(cd.emotionalAndPsychological.exposureToConflictNotes, { italic: true });
    }

    heading('Views Expressed (s 60CC(2)(b))');
    paragraph(cd.viewsExpressed.summary);
    verbatimList(cd.viewsExpressed.recordedViews, 'Recorded Views');
    if (cd.viewsExpressed.weightConsiderations) paragraph(cd.viewsExpressed.weightConsiderations, { italic: true });

    heading('Extracurricular & Social');
    paragraph(cd.extracurricularAndSocial.summary);
    bulletList(cd.extracurricularAndSocial.activities, 'Activities');

    heading('Safety & Risk Notes');
    paragraph(cd.safetyAndRiskNotes || 'No safety or risk concerns recorded.');

    bulletList(cd.s60CCFactorLinks, 's 60CC Factor Links');
  } else {
    heading('Behaviour');
    paragraph(profile.behaviour.summary);
    keyValue('Order Compliance Rating', profile.behaviour.orderComplianceRating);
    keyValue('Observed Incidents', String(profile.behaviour.observedIncidentsCount));
    bulletList(profile.behaviour.traits, 'Traits');
    bulletList(profile.behaviour.riskFactors, 'Risk Factors');

    heading('Concerns');
    bulletList(profile.concerns.raisedByParty, 'Raised By This Party');
    bulletList(profile.concerns.substantiatedConcernsAgainstParty, 'Substantiated Concerns Against This Party');
    if (profile.concerns.safetyAndWellbeingNotes) {
      paragraph(profile.concerns.safetyAndWellbeingNotes, { italic: true });
    }

    heading('Communication Tone Pattern');
    keyValue('Primary Tone', profile.communicationTonePattern.primaryTone);
    keyValue('Avg. Response Latency (hrs)', String(profile.communicationTonePattern.avgResponseLatencyHours));
    keyValue('Order 9 Breach Rate', profile.communicationTonePattern.order9BreachRate);
    bulletList(profile.communicationTonePattern.toneCharacteristics, 'Tone Characteristics');
    verbatimList(profile.communicationTonePattern.verbatimExamples, 'Verbatim Examples');

    if (profile.communicationProductivityPattern) {
      const cp = profile.communicationProductivityPattern;
      heading('Communication Productivity');
      keyValue('Productive', String(cp.productiveCount));
      keyValue('Partially Productive', String(cp.partiallyProductiveCount));
      keyValue('Non-Productive', String(cp.nonProductiveCount));
      keyValue('Non-Productive Rate', cp.nonProductiveRate);
      keyValue('Substantive Response Rate', cp.substantiveResponseRate);
      bulletList(cp.dominantNonProductiveMarkers, 'Dominant Non-Productive Markers');
      verbatimList(cp.nonProductiveExamples, 'Non-Productive Examples');
      if (cp.assessmentNote) paragraph(cp.assessmentNote, { italic: true });
    }

    heading('Parenting Capacity');
    keyValue('School Engagement', profile.parentingCapacity.schoolEngagement);
    keyValue('Medical Management', profile.parentingCapacity.medicalManagement);
    keyValue('Routine Consistency', profile.parentingCapacity.routineConsistency);
  }

  if (profile.evidentiaryReferences && profile.evidentiaryReferences.length > 0) {
    heading('Evidentiary References');
    profile.evidentiaryReferences.forEach((ref) => {
      keyValue(ref.docId, `${ref.title} — ${ref.citation}${ref.note ? ` (${ref.note})` : ''}`);
    });
  }

  if (profile.lastAiReviewTimestamp) {
    ensureSpace(8);
    doc.setFont('times', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Last AI Review: ${new Date(profile.lastAiReviewTimestamp).toLocaleString('en-AU')}${profile.isUserVerified ? ' • User Verified' : ''}`,
      MARGIN,
      pageHeight - 10
    );
  }

  // Footer on every page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('times', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text('PARTY PROFILE REPORT • FAMILY COURT OF WA • CASE NO 4344/2023', pageWidth / 2, pageHeight - 10, { align: 'center' });
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - MARGIN, pageHeight - 10, { align: 'right' });
  }

  return doc;
}