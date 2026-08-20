import { 
  FileText, 
  Layers, 
  Combine, 
  Scissors, 
  Minimize2, 
  Stamp, 
  Lock 
} from 'lucide-react';
import { DocumentSheet, NavItem, ToolItem, RecentDoc } from '../types';

export const DOCUMENTS: readonly DocumentSheet[] = [
  {
    id: 'doc-1',
    title: 'CONFIDENTIAL // SYSTEM ARCHITECTURE SPECIFICATION',
    type: 'Architecture Brief',
    badge: 'AES-256 ENCRYPTED',
    badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    date: 'OCT 2026',
    author: 'Chief Systems Architect',
    pages: 32,
    size: '4.8 MB',
  },
  {
    id: 'doc-2',
    title: 'Q4 2026 FINANCIAL AUDIT & REVENUE ANALYSIS',
    type: 'Financial Ledger',
    badge: 'VERIFIED AUDIT',
    badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    date: 'NOV 2026',
    author: 'Principal Controller',
    pages: 18,
    size: '2.1 MB',
  },
  {
    id: 'doc-3',
    title: 'MASTER INTELLECTUAL PROPERTY & NDA AGREEMENT',
    type: 'Legal Contract',
    badge: 'EXECUTED & SEALED',
    badgeColor: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    date: 'DEC 2026',
    author: 'General Counsel',
    pages: 12,
    size: '1.4 MB',
  },
  {
    id: 'doc-4',
    title: 'VECTOR CAD PRECISION BLUEPRINT & SCHEMATICS',
    type: 'Engineering CAD',
    badge: '300 DPI VECTOR',
    badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    date: 'JAN 2027',
    author: 'Lead Hardware Engineer',
    pages: 8,
    size: '14.6 MB',
  },
  {
    id: 'doc-5',
    title: 'NEO-GROTESK DESIGN SYSTEM & TOKENS GUIDE',
    type: 'Brand Guidelines',
    badge: 'SYSTEM CERTIFIED',
    badgeColor: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    date: 'FEB 2027',
    author: 'Design Operations',
    pages: 24,
    size: '7.9 MB',
  },
] as const;

export const NAV_ITEMS: readonly NavItem[] = [
  { id: 'recent', label: 'Recent Documents', icon: Layers },
  { id: 'viewer', label: 'PDF Viewer', icon: FileText },
  { id: 'organizer', label: 'Page Organizer', icon: Layers },
] as const;

export const TOOL_ITEMS: readonly ToolItem[] = [
  { id: 'merge', label: 'Merge PDF', icon: Combine },
  { id: 'split', label: 'Split & Extract', icon: Scissors },
  { id: 'compress', label: 'Compress PDF', icon: Minimize2 },
  { id: 'watermark', label: 'Watermark', icon: Stamp },
  { id: 'protect', label: 'Protect & Unlock', icon: Lock },
] as const;

export const RECENT_DOCS: readonly RecentDoc[] = [];
