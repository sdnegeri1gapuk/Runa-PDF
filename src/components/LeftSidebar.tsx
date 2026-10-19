import React from 'react';
import {
  Plus,
  Trash2,
  Copy,
  RotateCw,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { PageInfo } from '../types/pdf';

interface LeftSidebarProps {
  pages: PageInfo[];
  currentPageIndex: number;
  onSelectPage: (index: number) => void;
  onAddBlankPage: () => void;
  onDuplicatePage: (index: number) => void;
  onDeletePage: (index: number) => void;
  onRotatePage: (index: number) => void;
  onMovePage: (fromIndex: number, toIndex: number) => void;
  pageThumbnails: Record<number, string>;
  isProcessing: boolean;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  pages,
  currentPageIndex,
  onSelectPage,
  onAddBlankPage,
  onDuplicatePage,
  onDeletePage,
  onRotatePage,
  onMovePage,
  pageThumbnails,
  isProcessing,
}) => {
  return (
    <aside className="w-56 border-r border-slate-200 bg-slate-50 flex flex-col shrink-0 select-none overflow-hidden h-full">
      {/* Sidebar Header */}
      <div className="p-3 border-b border-slate-200 bg-white flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-slate-700">Halaman</span>
          <span className="text-[11px] text-slate-400 font-mono tabular-nums">
            ({pages.length})
          </span>
        </div>
        <button
          onClick={onAddBlankPage}
          disabled={isProcessing}
          className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 rounded transition-colors"
          title="Tambah Halaman Kosong"
        >
          <Plus className="w-3 h-3" />
          <span>Tambah</span>
        </button>
      </div>

      {/* Pages Thumbnail List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {pages.map((page, index) => {
          const isSelected = index === currentPageIndex;
          const thumbnail = pageThumbnails[page.pageNumber];

          return (
            <div
              key={`page-${page.pageNumber}-${index}`}
              onClick={() => {
                onSelectPage(index);
                const el = document.getElementById(`pdf-page-${index}`);
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }}
              className={`group relative rounded-lg border transition-all cursor-pointer bg-white p-2 ${
                isSelected
                  ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Header row: Page number & actions */}
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className={`text-[11px] font-mono tabular-nums font-medium ${
                    isSelected ? 'text-blue-700 font-bold' : 'text-slate-500'
                  }`}
                >
                  Hal {page.pageNumber}
                </span>

                {/* Quick actions popup on hover or selected */}
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {index > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onMovePage(index, index - 1);
                      }}
                      className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100"
                      title="Geser ke Atas"
                    >
                      <ChevronUp className="w-3 h-3" />
                    </button>
                  )}
                  {index < pages.length - 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onMovePage(index, index + 1);
                      }}
                      className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100"
                      title="Geser ke Bawah"
                    >
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRotatePage(index);
                    }}
                    className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100"
                    title="Putar 90° Searah Jarum Jam"
                  >
                    <RotateCw className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicatePage(index);
                    }}
                    className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100"
                    title="Duplikat Halaman"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                  {pages.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeletePage(index);
                      }}
                      className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50"
                      title="Hapus Halaman"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Page Thumbnail Canvas/Image */}
              <div className="w-full aspect-[1/1.414] bg-slate-100 rounded border border-slate-150 overflow-hidden flex items-center justify-center relative">
                {thumbnail ? (
                  <img
                    src={thumbnail}
                    alt={`Halaman ${page.pageNumber}`}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-400 gap-1">
                    <div className="w-4 h-4 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin" />
                    <span className="text-[10px]">Memuat...</span>
                  </div>
                )}

                {/* Subtle aspect ratio badge */}
                <span className="absolute bottom-1 right-1 text-[9px] font-mono tabular-nums text-slate-400 bg-white/80 backdrop-blur-xs px-1 rounded">
                  {Math.round(page.width)}×{Math.round(page.height)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
};
