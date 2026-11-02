import React, { useRef, useState, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
  Plus,
  Trash2,
  Copy,
  RotateCw,
  ChevronUp,
  ChevronDown,
  FileText,
} from 'lucide-react';
import { PageInfo } from '../types/pdf';

interface LeftSidebarProps {
  pdfDoc: pdfjsLib.PDFDocumentProxy | null;
  pages: PageInfo[];
  currentPageIndex: number;
  onSelectPage: (index: number) => void;
  onAddBlankPage: () => void;
  onDuplicatePage: (index: number) => void;
  onDeletePage: (index: number) => void;
  onRotatePage: (index: number) => void;
  onMovePage: (fromIndex: number, toIndex: number) => void;
  pageThumbnails?: Record<number, string>;
  isProcessing: boolean;
}

/**
 * Dedicated Page Thumbnail Canvas component.
 * Renders directly from PDF.js proxy with immediate response,
 * local render cancellation, and smooth fallback.
 */
const PageThumbnailCanvas: React.FC<{
  pdfDoc: pdfjsLib.PDFDocumentProxy | null;
  page: PageInfo;
  cachedUrl?: string;
}> = ({ pdfDoc, page, cachedUrl }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(!cachedUrl);
  const [isRendered, setIsRendered] = useState(false);
  const [error, setError] = useState(false);
  const renderTaskRef = useRef<any>(null);

  useEffect(() => {
    // If a cached image url is provided and valid, use it directly
    if (cachedUrl) {
      setIsLoading(false);
      return;
    }

    if (!pdfDoc || !canvasRef.current) {
      setIsLoading(true);
      return;
    }

    let isCancelled = false;
    setIsLoading(true);
    setError(false);

    // Cancel existing render if any
    if (renderTaskRef.current) {
      try {
        renderTaskRef.current.cancel();
      } catch {}
      renderTaskRef.current = null;
    }

    async function doRender() {
      try {
        const pageProxy = await pdfDoc!.getPage(page.pageNumber);
        if (isCancelled || !canvasRef.current) return;

        const rotation = (page.rotation || 0) % 360;
        const unscaledViewport = pageProxy.getViewport({ scale: 1.0, rotation });

        // Target thumbnail width in CSS pixels ~ 180px for high definition
        const targetWidth = 180;
        const scale = targetWidth / Math.max(unscaledViewport.width, 1);
        const viewport = pageProxy.getViewport({ scale, rotation });

        const canvas = canvasRef.current;
        canvas.width = Math.max(1, Math.floor(viewport.width));
        canvas.height = Math.max(1, Math.floor(viewport.height));

        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const renderTask = pageProxy.render({
          canvasContext: ctx,
          viewport,
          canvas,
        } as any);

        renderTaskRef.current = renderTask;
        await renderTask.promise;

        if (!isCancelled) {
          setIsRendered(true);
          setIsLoading(false);
          renderTaskRef.current = null;
        }
      } catch (err: any) {
        if (err?.name === 'RenderingCancelledException') {
          return;
        }
        if (!isCancelled) {
          console.warn(`Gagal render preview halaman ${page.pageNumber}:`, err);
          setError(true);
          setIsLoading(false);
        }
      }
    }

    doRender();

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {}
        renderTaskRef.current = null;
      }
    };
  }, [pdfDoc, page.pageNumber, page.rotation, cachedUrl]);

  return (
    <div className="w-full h-full flex items-center justify-center relative overflow-hidden bg-white">
      {cachedUrl ? (
        <img
          src={cachedUrl}
          alt={`Halaman ${page.pageNumber}`}
          className="w-full h-full object-contain"
        />
      ) : (
        <canvas
          ref={canvasRef}
          className={`w-full h-full object-contain ${isRendered ? 'block' : 'hidden'}`}
        />
      )}

      {isLoading && !isRendered && !cachedUrl && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-1 bg-slate-50">
          <div className="w-4 h-4 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin" />
          <span className="text-[10px]">Memuat...</span>
        </div>
      )}

      {error && !isRendered && !cachedUrl && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-1 bg-slate-100 p-2 text-center">
          <FileText className="w-5 h-5 text-slate-400" />
          <span className="text-[10px] font-medium text-slate-600">Hal {page.pageNumber}</span>
          <span className="text-[9px] text-slate-400">Pratinjau Halaman</span>
        </div>
      )}
    </div>
  );
};

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  pdfDoc,
  pages,
  currentPageIndex,
  onSelectPage,
  onAddBlankPage,
  onDuplicatePage,
  onDeletePage,
  onRotatePage,
  onMovePage,
  pageThumbnails = {},
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
          className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 rounded transition-colors cursor-pointer"
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
                const targetId = `pdf-page-${page.pageIndex !== undefined ? page.pageIndex : index}`;
                const el = document.getElementById(targetId) || document.getElementById(`pdf-page-${index}`);
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }}
              className={`group relative rounded-lg border transition-all cursor-pointer bg-white p-2 ${
                isSelected
                  ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 shadow-2xs'
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
                      className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 cursor-pointer"
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
                      className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 cursor-pointer"
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
                    className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 cursor-pointer"
                    title="Putar 90° Searah Jarum Jam"
                  >
                    <RotateCw className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicatePage(index);
                    }}
                    className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 cursor-pointer"
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
                      className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 cursor-pointer"
                      title="Hapus Halaman"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Page Thumbnail Canvas/Image */}
              <div className="w-full aspect-[1/1.414] bg-slate-100 rounded border border-slate-150 overflow-hidden flex items-center justify-center relative">
                <PageThumbnailCanvas
                  pdfDoc={pdfDoc}
                  page={page}
                  cachedUrl={thumbnail}
                />

                {/* Subtle aspect ratio badge */}
                <span className="absolute bottom-1 right-1 text-[9px] font-mono tabular-nums text-slate-500 bg-white/90 backdrop-blur-xs px-1 py-0.5 rounded shadow-2xs border border-slate-200/50 pointer-events-none">
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
