import { DocumentRecord, DocumentCategory, EvidentiaryWeight } from '../../types';

export type DocumentViewMode = 'table' | 'split' | 'grouped' | 'grid';
export type DisplayDensity = 'compact' | 'comfortable';

export type SortField = 'date' | 'annexure' | 'title' | 'weight' | 'category' | 'origin';
export type SortDirection = 'asc' | 'desc';

export type GroupByField = 'category' | 'year' | 'weight' | 'origin' | 'tag';

export type TagFilterMode = 'any' | 'all';

export interface DocumentFilterState {
  search: string;
  category: string; // 'All' or DocumentCategory
  weight: string; // 'All' or EvidentiaryWeight
  tag: string | null;
  selectedTags?: string[];
  tagFilterMode?: TagFilterMode;
  origin: string; // 'All' or specific origin
  year: string; // 'All' or e.g. '2024', '2023'
}
