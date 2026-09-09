import { DocumentAnnotation } from './types';

const STORAGE_KEY = 'hawkins_evidence_binder_annotations_v1';

export const INITIAL_ANNOTATIONS: DocumentAnnotation[] = [
  {
    id: 'ann-1',
    docId: 'doc-1',
    type: 'sticky_note',
    textSnippet: 'School attendance report indicating 14 unnotified absences during Respondent custody weeks',
    comment: 'Direct contradiction with Respondent Affidavit para 12 claiming 100% punctual attendance. Demonstrates failure to facilitate schooling pursuant to Interim Order 4.',
    color: 'amber',
    author: 'Benjamin Hawkins (Applicant)',
    createdAt: '2024-03-15',
    categoryTag: 'Order Breach'
  },
  {
    id: 'ann-2',
    docId: 'doc-2',
    type: 'highlight',
    textSnippet: 'Notice of relocation out of Bassendean catchment area without prior 30-day written notification',
    comment: 'Material breach of Order 9 (Specific Issues - Relocation / Schooling). Respondent executed lease agreement unilaterally.',
    color: 'rose',
    author: 'Benjamin Hawkins (Applicant)',
    createdAt: '2024-04-02',
    categoryTag: 'Court Order Breach'
  },
  {
    id: 'ann-3',
    docId: 'doc-3',
    type: 'sticky_note',
    textSnippet: 'Speech therapy invoice dated 12/04/2024 showing full settlement by Applicant ($380.00)',
    comment: 'Proof of sole financial underwriting of children special medical expenses. Respondent has failed to reimburse 50% share despite three formal written demands.',
    color: 'emerald',
    author: 'Benjamin Hawkins (Applicant)',
    createdAt: '2024-04-14',
    categoryTag: 'Financial Non-Compliance'
  },
  {
    id: 'ann-4',
    docId: 'doc-4',
    type: 'highlight',
    textSnippet: 'You are not taking Isabella this weekend regardless of what the magistrate said in December',
    comment: 'Unambiguous refusal to adhere to defined weekend spend-time orders (Order 2.1). High evidential value regarding contravention application.',
    color: 'yellow',
    author: 'Benjamin Hawkins (Applicant)',
    createdAt: '2024-05-18',
    categoryTag: 'Direct Communication'
  }
];

export function getStoredAnnotations(): DocumentAnnotation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_ANNOTATIONS));
      return INITIAL_ANNOTATIONS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_ANNOTATIONS;
  } catch (err) {
    console.warn('Failed to parse annotations from localStorage:', err);
    return INITIAL_ANNOTATIONS;
  }
}

export function saveStoredAnnotations(annotations: DocumentAnnotation[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(annotations));
  } catch (err) {
    console.warn('Failed to save annotations to localStorage:', err);
  }
}

export function getAnnotationsForDoc(docId: string): DocumentAnnotation[] {
  const all = getStoredAnnotations();
  return all.filter(a => a.docId === docId);
}

export function deleteAnnotationsForDocs(docIds: string[]): DocumentAnnotation[] {
  const idSet = new Set(docIds);
  const all = getStoredAnnotations();
  const remaining = all.filter(a => !idSet.has(a.docId));
  saveStoredAnnotations(remaining);
  return remaining;
}

export function deleteAnnotationsForDoc(docId: string): DocumentAnnotation[] {
  return deleteAnnotationsForDocs([docId]);
}
