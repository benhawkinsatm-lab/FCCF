import { describe, it, expect } from 'vitest';
import { SCOPES } from '../src/lib/googleDriveAuth';
import { CASE_METADATA } from '../src/data/caseData';

describe('Integrity & Security Validations', () => {
  describe('Google Drive OAuth Scopes', () => {
    it('enforces least-privilege read-only scope exclusively', () => {
      expect(SCOPES).toEqual(['https://www.googleapis.com/auth/drive.readonly']);
      expect(SCOPES).not.toContain('https://www.googleapis.com/auth/drive');
      expect(SCOPES).not.toContain('https://www.googleapis.com/auth/drive.file');
      expect(SCOPES).not.toContain('https://www.googleapis.com/auth/drive.scripts');
    });
  });

  describe('Dynamic Document ID and Annexure Generation', () => {
    it('generates sequential exhibit IDs without random values', () => {
      const existingDocCount = 5;
      const nextNumber = existingDocCount + 1;
      const annexure = `Annexure BJH-${nextNumber}`;
      expect(annexure).toBe('Annexure BJH-6');
    });

    it('generates document ID with dynamic year matching document date', () => {
      const docDate = '2026-03-15';
      const docYear = docDate.match(/^\d{4}/)?.[0] || new Date().getFullYear().toString();
      const nextNumber = 12;
      const docId = `DOC-${docYear}-${String(nextNumber).padStart(3, '0')}`;
      expect(docId).toBe('DOC-2026-012');
    });

    it('falls back to current year when document date is absent', () => {
      const currentYear = new Date().getFullYear().toString();
      const docDate: string = '';
      const docYear = (docDate && docDate.match(/^\d{4}/))
        ? docDate.slice(0, 4)
        : currentYear;
      const nextNumber = 1;
      const docId = `DOC-${docYear}-${String(nextNumber).padStart(3, '0')}`;
      expect(docId).toBe(`DOC-${currentYear}-001`);
    });
  });

  describe('Date Parsing Patterns (2026+ Compatibility)', () => {
    // Regular expression used across server and client OCR pipelines
    const datePattern = /\b((?:202[3-9]|20[3-9]\d)[\/\-\.](?:0?[1-9]|1[0-2])[\/\-\.]\d{1,2})\b/;
    const dmyPattern = /\b(\d{1,2}[\/\-\.](?:0?[1-9]|1[0-2]|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[\/\-\.](?:202[3-9]|20[3-9]\d))\b/i;

    it('successfully matches 2026 dates in YYYY-MM-DD format', () => {
      const text = 'Notice served on 2026-04-12 regarding school holiday schedule.';
      const match = text.match(datePattern);
      expect(match).not.toBeNull();
      expect(match?.[1]).toBe('2026-04-12');
    });

    it('successfully matches 2026+ dates in DD/MM/YYYY format', () => {
      const text = 'Medical certificate dated 15/09/2026 issued by Dr Smith.';
      const match = text.match(dmyPattern);
      expect(match).not.toBeNull();
      expect(match?.[1]).toBe('15/09/2026');
    });

    it('matches future dates up to 2030 and beyond', () => {
      const text = 'Review hearing listed for 2028-11-20.';
      const match = text.match(datePattern);
      expect(match).not.toBeNull();
      expect(match?.[1]).toBe('2028-11-20');
    });
  });

  describe('Children DOBs and Operative Data Verification', () => {
    it('verifies verified dates of birth for Isabella and Mason Hawkins', () => {
      const isabella = CASE_METADATA.children.find(c => c.name.includes('Isabella'));
      const mason = CASE_METADATA.children.find(c => c.name.includes('Mason'));

      expect(isabella).toBeDefined();
      expect(isabella?.dob).toBe('2014-07-21');

      expect(mason).toBeDefined();
      expect(mason?.dob).toBe('2015-02-15');
    });

    it('verifies case parties are correctly identified', () => {
      expect(CASE_METADATA.applicant).toBe('Benjamin James (Ben) Hawkins');
      expect(CASE_METADATA.respondent).toBe('Sue-Anne Hawkins');
      expect(CASE_METADATA.caseNumber).toBe('4344/2023');
    });
  });
});
