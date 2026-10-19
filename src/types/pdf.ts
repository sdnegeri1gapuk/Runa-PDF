export type ToolMode = 
  | 'select'
  | 'text'
  | 'image'
  | 'rect'
  | 'circle'
  | 'line'
  | 'arrow'
  | 'draw'
  | 'highlight'
  | 'whiteout';

export type ActiveAppView = 'editor' | 'convert_word' | 'convert_excel' | 'tools' | 'home';

import * as pdfjsLib from 'pdfjs-dist';

export interface RecentDocumentItem {
  id: string;
  name: string;
  path: string;
  dateModified: string;
  timestamp: number;
  sizeKb?: number;
  totalPages?: number;
}

export interface OpenDocumentTab {
  id: string;
  name: string;
  pdfBytes: Uint8Array;
  pdfDoc: pdfjsLib.PDFDocumentProxy;
  pages: PageInfo[];
  currentPageIndex: number;
  pageThumbnails: Record<number, string>;
  objects: CanvasObject[];
  undoStack: CanvasObject[][];
  redoStack: CanvasObject[][];
  zoom: number;
  hasUnsavedChanges?: boolean;
}

export interface BaseCanvasObject {
  id: string;
  pageIndex: number;
  x: number; // in PDF points (72 DPI)
  y: number; // in PDF points
  width: number;
  height: number;
  rotation: number; // in degrees
  opacity: number; // 0 to 1
  isLockedRatio?: boolean;
}

export interface TextObject extends BaseCanvasObject {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily: 'Helvetica' | 'Times' | 'Courier';
  color: string;
  isBold?: boolean;
  isItalic?: boolean;
  isUnderline?: boolean;
  textAlign?: 'left' | 'center' | 'right';
  backgroundColor?: string;
}

export interface ImageObject extends BaseCanvasObject {
  type: 'image';
  src: string; // base64 data URL
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp';
  naturalWidth: number;
  naturalHeight: number;
}

export interface ShapeObject extends BaseCanvasObject {
  type: 'rect' | 'circle' | 'line' | 'arrow';
  fillColor: string; // 'transparent' or hex
  strokeColor: string;
  strokeWidth: number;
}

export interface DrawingObject extends BaseCanvasObject {
  type: 'draw' | 'highlight';
  points: { x: number; y: number }[]; // relative to x, y
  strokeColor: string;
  strokeWidth: number;
}

export interface WhiteoutObject extends BaseCanvasObject {
  type: 'whiteout';
  fillColor: string; // usually #FFFFFF
  replacementText?: string;
  replacementFontSize?: number;
  replacementColor?: string;
}

export type CanvasObject = 
  | TextObject 
  | ImageObject 
  | ShapeObject 
  | DrawingObject 
  | WhiteoutObject;

export interface PageInfo {
  pageIndex: number;
  pageNumber: number;
  width: number; // in PDF points
  height: number; // in PDF points
  rotation: number; // 0, 90, 180, 270
  thumbnailUrl?: string;
  extractedText?: string;
}

export interface DocumentProject {
  id: string;
  name: string;
  fileBytes?: Uint8Array;
  totalPages: number;
  pages: PageInfo[];
  objects: CanvasObject[];
  createdAt: number;
  updatedAt: number;
}

export interface TableStructure {
  name: string;
  headers: string[];
  rows: string[][];
}

export interface DocumentStructureElement {
  type: 'heading_1' | 'heading_2' | 'paragraph' | 'table' | 'list_item';
  content: string;
  tableData?: string[][];
}
