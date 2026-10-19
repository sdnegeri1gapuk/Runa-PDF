import React from 'react';
import { PageInfo, CanvasObject } from '../types/pdf';

interface BottomStatusBarProps {
  currentPage: PageInfo;
  totalPages: number;
  zoom: number;
  statusMessage: string;
  selectedObject: CanvasObject | null;
}

export const BottomStatusBar: React.FC<BottomStatusBarProps> = ({
  currentPage,
  totalPages,
  zoom,
  statusMessage,
  selectedObject,
}) => {
  const isA4 =
    Math.round(currentPage.width) === 595 && Math.round(currentPage.height) === 842;
  const isLetter =
    Math.round(currentPage.width) === 612 && Math.round(currentPage.height) === 792;
  const pageFormat = isA4 ? 'A4' : isLetter ? 'Letter' : 'Kustom';

  return (
    <footer className="h-7 border-t border-slate-200 bg-white px-4 flex items-center justify-between text-[11px] text-slate-500 select-none shrink-0 z-20">
      {/* Left zone: Page navigation count & format */}
      <div className="flex items-center gap-3">
        <span className="font-mono tabular-nums font-medium text-slate-700">
          Halaman {currentPage.pageNumber} / {totalPages}
        </span>
        <span className="text-slate-300" aria-hidden="true">·</span>
        <span className="font-mono tabular-nums text-slate-500">
          {pageFormat} ({Math.round(currentPage.width)} × {Math.round(currentPage.height)} pt)
        </span>
        {selectedObject && (
          <>
            <span className="text-slate-300" aria-hidden="true">·</span>
            <span className="font-medium text-blue-600">
              Elemen terpilih: {selectedObject.type} (X: {selectedObject.x}, Y: {selectedObject.y})
            </span>
          </>
        )}
      </div>

      {/* Right zone: Document status & Zoom indicator */}
      <div className="flex items-center gap-3">
        <span className="truncate max-w-[280px] text-slate-600">
          {statusMessage}
        </span>
        <span className="text-slate-300" aria-hidden="true">·</span>
        <span className="font-mono tabular-nums font-semibold text-slate-700">
          {Math.round(zoom * 100)}%
        </span>
      </div>
    </footer>
  );
};
