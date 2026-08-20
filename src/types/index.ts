import { LucideIcon } from 'lucide-react';

export type PageView = 'firstPage' | 'workspace';

export interface DocumentSheet {
  id: string;
  title: string;
  type: string;
  badge: string;
  badgeColor: string;
  date: string;
  author: string;
  pages: number;
  size: string;
}

export interface RecentDoc {
  id: string;
  title: string;
  pages: number;
  size: string;
  time: string;
  status: 'Verified' | 'Encrypted' | 'Vector' | 'Locked';
}

export interface LoadedPDF {
  id: string;
  name: string;
  size: string;
  rawSize: number;
  blobUrl: string;
  file: File;
  loadedAt: Date;
}

export interface OrganizerPageItem {
  id: string;
  originalPageNumber: number; // 1-indexed
  rotation: number; // 0, 90, 180, 270
  selected?: boolean;
}

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  count?: number;
}

export interface ToolItem {
  id: string;
  label: string;
  icon: LucideIcon;
}
