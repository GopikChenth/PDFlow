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
  pageCount?: number;
  currentPage?: number;
  zoomScale?: number;
  rotation?: number;
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

// ----------------------------------------------------
// PDF Viewer Advanced Suite Types
// ----------------------------------------------------

export type PageLayoutMode = 'continuous' | 'single' | 'two-page' | 'facing-pages';

export type NavSidebarTab = 'thumbnails' | 'outline' | 'bookmarks' | 'annotations' | 'attachments' | 'search';

export interface PDFOutlineNode {
  title: string;
  dest?: any;
  pageNumber?: number;
  items?: PDFOutlineNode[];
  expanded?: boolean;
}

export interface PDFBookmark {
  id: string;
  docId: string;
  pageNumber: number;
  title: string;
  color: string;
  createdAt: Date;
}

export interface PDFAttachment {
  filename: string;
  size?: string;
  rawSize?: number;
  content: Uint8Array;
}

export interface SearchMatch {
  pageNum: number;
  matchIndex: number;
  textSnippet: string;
  startIndex: number;
  endIndex: number;
}

export interface MultiDocSearchResult {
  docId: string;
  docName: string;
  matches: SearchMatch[];
}

export interface ReflowSettings {
  fontSize: number; // in px, e.g. 16
  lineHeight: number; // e.g. 1.7
  fontFamily: 'sans' | 'serif' | 'mono';
  maxWidth: number; // in px, e.g. 720
}

// ----------------------------------------------------
// Markup, Drawing & Annotation Suite Types
// ----------------------------------------------------

export type AnnotationToolType = 
  | 'select'
  | 'highlight'
  | 'underline'
  | 'strikeout'
  | 'squiggly'
  | 'callout'
  | 'pen'
  | 'rectangle'
  | 'arrow'
  | 'line'
  | 'polygon'
  | 'measure-distance'
  | 'measure-area'
  | 'sticky-note'
  | 'textbox'
  | 'voice-note';

export interface CommentReply {
  id: string;
  author: string;
  content: string;
  createdAt: Date;
}

export interface PDFAnnotation {
  id: string;
  docId: string;
  pageNum: number; // 1-indexed
  type: AnnotationToolType;
  // Normalized 0..1 bounding box or anchor
  rect?: { x: number; y: number; width: number; height: number };
  // Normalized 0..1 point array for pen paths, lines, arrows, polygons, and measurements
  points?: Array<{ x: number; y: number }>;
  color: string;
  strokeWidth?: number;
  opacity?: number;
  // Text content for text boxes, callouts, and notes
  text?: string;
  fontSize?: number;
  // Callout leader pointer target (normalized 0..1)
  calloutTarget?: { x: number; y: number };
  // Threaded replies for sticky notes & callouts
  comments?: CommentReply[];
  // Audio media / voice comment
  audioBlobUrl?: string;
  audioDuration?: number;
  // Measurement formatted display string (e.g. "5.4 cm", "24.5 sq cm")
  measurementValue?: string;
  author?: string;
  createdAt: Date;
  updatedAt?: Date;
}
