import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
  CanvasObject,
  ToolMode,
  PageInfo,
  TextObject,
  ImageObject,
  ShapeObject,
  DrawingObject,
  WhiteoutObject,
} from '../types/pdf';
import { renderPdfPageToCanvas } from '../services/pdfService';
import { RotateCw } from 'lucide-react';

interface MainEditorCanvasProps {
  pdfDoc: pdfjsLib.PDFDocumentProxy | null;
  pages: PageInfo[];
  currentPageIndex: number;
  onPageVisible: (pageIndex: number) => void;
  zoom: number;
  currentTool: ToolMode;
  onToolUsed: () => void;
  objects: CanvasObject[];
  selectedObjectId: string | null;
  onSelectObject: (id: string | null) => void;
  onUpdateObject: (updated: CanvasObject) => void;
  onAddObject: (newObj: CanvasObject) => void;
  onDeleteObject: (id: string) => void;
  onRecordHistory: () => void;
}

type DragMode = 'move' | 'nw' | 'ne' | 'se' | 'sw' | 'n' | 'e' | 's' | 'w' | 'rotate' | null;

interface SinglePageProps {
  pdfDoc: pdfjsLib.PDFDocumentProxy | null;
  page: PageInfo;
  zoom: number;
  currentTool: ToolMode;
  onToolUsed: () => void;
  pageObjects: CanvasObject[];
  selectedObjectId: string | null;
  onSelectObject: (id: string | null) => void;
  onUpdateObject: (updated: CanvasObject) => void;
  onAddObject: (newObj: CanvasObject) => void;
  onRecordHistory: () => void;
  startInteraction: (e: React.MouseEvent, mode: DragMode, obj: CanvasObject, pageRect: DOMRect) => void;
  isDrawing: boolean;
  drawingPageIndex: number | null;
  currentDrawPoints: { x: number; y: number }[];
  onStartDrawing: (pageIndex: number, startPt: { x: number; y: number }) => void;
}

const SinglePageItem: React.FC<SinglePageProps> = ({
  pdfDoc,
  page,
  zoom,
  currentTool,
  onToolUsed,
  pageObjects,
  selectedObjectId,
  onSelectObject,
  onAddObject,
  onRecordHistory,
  startInteraction,
  isDrawing,
  drawingPageIndex,
  currentDrawPoints,
  onStartDrawing,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);

  // Render PDF page to canvas
  useEffect(() => {
    let isCancelled = false;
    async function render() {
      if (!pdfDoc || !canvasRef.current) return;
      setIsRendering(true);
      setRenderError(null);
      try {
        await renderPdfPageToCanvas(
          pdfDoc,
          page.pageNumber,
          canvasRef.current,
          zoom,
          page.rotation
        );
      } catch (err: any) {
        if (!isCancelled) {
          console.error(`Page ${page.pageNumber} render error:`, err);
          setRenderError(`Halaman ${page.pageNumber} gagal dimuat`);
        }
      } finally {
        if (!isCancelled) setIsRendering(false);
      }
    }

    render();
    return () => {
      isCancelled = true;
    };
  }, [pdfDoc, page.pageNumber, zoom, page.rotation]);

  const canvasWidth = page.width * zoom;
  const canvasHeight = page.height * zoom;

  const handleOverlayMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target !== overlayRef.current && !(e.target as HTMLElement).classList.contains('page-overlay-surface')) {
      return;
    }

    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Click coordinates in PDF points (72 DPI)
    const clickX = (e.clientX - rect.left) / zoom;
    const clickY = (e.clientY - rect.top) / zoom;

    if (currentTool === 'select') {
      onSelectObject(null);
      return;
    }

    onRecordHistory();

    if (currentTool === 'text') {
      const newText: TextObject = {
        id: `text_${Date.now()}`,
        pageIndex: page.pageIndex,
        type: 'text',
        x: Math.max(10, Math.round(clickX)),
        y: Math.max(10, Math.round(clickY)),
        width: 180,
        height: 36,
        text: 'Ketik teks di sini...',
        fontSize: 14,
        fontFamily: 'Helvetica',
        color: '#1E293B',
        rotation: 0,
        opacity: 1,
        textAlign: 'left',
      };
      onAddObject(newText);
      onSelectObject(newText.id);
      onToolUsed();
    } else if (currentTool === 'rect') {
      const newRect: ShapeObject = {
        id: `rect_${Date.now()}`,
        pageIndex: page.pageIndex,
        type: 'rect',
        x: Math.max(10, Math.round(clickX)),
        y: Math.max(10, Math.round(clickY)),
        width: 140,
        height: 90,
        fillColor: 'transparent',
        strokeColor: '#2563EB',
        strokeWidth: 2,
        rotation: 0,
        opacity: 1,
      };
      onAddObject(newRect);
      onSelectObject(newRect.id);
      onToolUsed();
    } else if (currentTool === 'circle') {
      const newCircle: ShapeObject = {
        id: `circle_${Date.now()}`,
        pageIndex: page.pageIndex,
        type: 'circle',
        x: Math.max(10, Math.round(clickX)),
        y: Math.max(10, Math.round(clickY)),
        width: 100,
        height: 100,
        fillColor: 'transparent',
        strokeColor: '#2563EB',
        strokeWidth: 2,
        rotation: 0,
        opacity: 1,
      };
      onAddObject(newCircle);
      onSelectObject(newCircle.id);
      onToolUsed();
    } else if (currentTool === 'line') {
      const newLine: ShapeObject = {
        id: `line_${Date.now()}`,
        pageIndex: page.pageIndex,
        type: 'line',
        x: Math.max(10, Math.round(clickX)),
        y: Math.max(10, Math.round(clickY)),
        width: 120,
        height: 0,
        fillColor: 'transparent',
        strokeColor: '#1E293B',
        strokeWidth: 2,
        rotation: 0,
        opacity: 1,
      };
      onAddObject(newLine);
      onSelectObject(newLine.id);
      onToolUsed();
    } else if (currentTool === 'arrow') {
      const newArrow: ShapeObject = {
        id: `arrow_${Date.now()}`,
        pageIndex: page.pageIndex,
        type: 'arrow',
        x: Math.max(10, Math.round(clickX)),
        y: Math.max(10, Math.round(clickY)),
        width: 120,
        height: 40,
        fillColor: 'transparent',
        strokeColor: '#DC2626',
        strokeWidth: 2,
        rotation: 0,
        opacity: 1,
      };
      onAddObject(newArrow);
      onSelectObject(newArrow.id);
      onToolUsed();
    } else if (currentTool === 'whiteout') {
      const newWhiteout: WhiteoutObject = {
        id: `whiteout_${Date.now()}`,
        pageIndex: page.pageIndex,
        type: 'whiteout',
        x: Math.max(10, Math.round(clickX)),
        y: Math.max(10, Math.round(clickY)),
        width: 150,
        height: 28,
        fillColor: '#FFFFFF',
        replacementText: '',
        replacementFontSize: 12,
        replacementColor: '#000000',
        rotation: 0,
        opacity: 1,
      };
      onAddObject(newWhiteout);
      onSelectObject(newWhiteout.id);
      onToolUsed();
    } else if (currentTool === 'draw' || currentTool === 'highlight') {
      onStartDrawing(page.pageIndex, { x: clickX, y: clickY });
    }
  };

  return (
    <div
      id={`pdf-page-${page.pageIndex}`}
      data-page-index={page.pageIndex}
      className="pdf-page-container relative bg-white pdf-page-shadow rounded-xs transition-shadow my-4"
      style={{
        width: canvasWidth,
        height: canvasHeight,
      }}
    >
      {/* Page Number Label in Top-Left Corner */}
      <div className="absolute -top-5 left-0 text-[10px] font-mono text-slate-400 select-none">
        Halaman {page.pageNumber}
      </div>

      {/* PDF Base Canvas Layer */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 block pointer-events-none"
        style={{ width: canvasWidth, height: canvasHeight }}
      />

      {/* Loading Skeleton */}
      {isRendering && (
        <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex items-center justify-center z-10">
          <div className="flex flex-col items-center gap-2">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-[11px] font-medium text-slate-500">
              Memuat Halaman {page.pageNumber}...
            </span>
          </div>
        </div>
      )}

      {/* Render Error */}
      {renderError && (
        <div className="absolute inset-0 flex items-center justify-center p-4 bg-red-50 text-red-600 text-xs text-center z-10">
          {renderError}
        </div>
      )}

      {/* Interactive Page Annotation Overlay */}
      <div
        ref={overlayRef}
        onMouseDown={handleOverlayMouseDown}
        className={`page-overlay-surface absolute inset-0 overflow-hidden ${
          currentTool !== 'select' ? 'cursor-crosshair' : 'cursor-default'
        }`}
      >
        {/* Active freehand drawing path on this page */}
        {isDrawing && drawingPageIndex === page.pageIndex && currentDrawPoints.length > 1 && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-30">
            <polyline
              fill="none"
              stroke={currentTool === 'highlight' ? '#facc15' : '#2563EB'}
              strokeWidth={(currentTool === 'highlight' ? 14 : 3) * zoom}
              strokeOpacity={currentTool === 'highlight' ? 0.35 : 1}
              strokeLinecap="round"
              strokeLinejoin="round"
              points={currentDrawPoints
                .map((p) => `${p.x * zoom},${p.y * zoom}`)
                .join(' ')}
            />
          </svg>
        )}

        {/* Page Objects */}
        {pageObjects.map((obj) => {
          const isSelected = obj.id === selectedObjectId;
          const left = obj.x * zoom;
          const top = obj.y * zoom;
          const width = obj.width * zoom;
          const height = obj.height * zoom;

          return (
            <div
              key={obj.id}
              onMouseDown={(e) => {
                if (currentTool === 'select') {
                  const rect = overlayRef.current?.getBoundingClientRect();
                  if (rect) {
                    startInteraction(e, 'move', obj, rect);
                  }
                }
              }}
              className={`absolute ${isSelected ? 'z-20' : 'z-10'}`}
              style={{
                left,
                top,
                width,
                height,
                transform: `rotate(${obj.rotation || 0}deg)`,
                transformOrigin: 'center center',
                opacity: obj.opacity ?? 1,
              }}
            >
              {/* Text Object */}
              {obj.type === 'text' && (
                <div
                  className="w-full h-full overflow-hidden p-1 select-none break-words"
                  style={{
                    fontSize: (obj as TextObject).fontSize * zoom,
                    fontFamily: (obj as TextObject).fontFamily,
                    color: (obj as TextObject).color,
                    fontWeight: (obj as TextObject).isBold ? 'bold' : 'normal',
                    fontStyle: (obj as TextObject).isItalic ? 'italic' : 'normal',
                    textDecoration: (obj as TextObject).isUnderline ? 'underline' : 'none',
                    textAlign: (obj as TextObject).textAlign || 'left',
                    backgroundColor: (obj as TextObject).backgroundColor || 'transparent',
                  }}
                >
                  {(obj as TextObject).text}
                </div>
              )}

              {/* Image Object */}
              {obj.type === 'image' && (
                <img
                  src={(obj as ImageObject).src}
                  alt="Disisipkan"
                  className="w-full h-full object-contain pointer-events-none select-none"
                  draggable={false}
                />
              )}

              {/* Shapes */}
              {obj.type === 'rect' && (
                <div
                  className="w-full h-full"
                  style={{
                    backgroundColor: (obj as ShapeObject).fillColor,
                    borderColor: (obj as ShapeObject).strokeColor,
                    borderWidth: ((obj as ShapeObject).strokeWidth || 1) * zoom,
                    borderStyle: 'solid',
                  }}
                />
              )}

              {obj.type === 'circle' && (
                <div
                  className="w-full h-full rounded-full"
                  style={{
                    backgroundColor: (obj as ShapeObject).fillColor,
                    borderColor: (obj as ShapeObject).strokeColor,
                    borderWidth: ((obj as ShapeObject).strokeWidth || 1) * zoom,
                    borderStyle: 'solid',
                  }}
                />
              )}

              {obj.type === 'line' && (
                <svg className="w-full h-full overflow-visible pointer-events-none">
                  <line
                    x1="0"
                    y1="0"
                    x2={width}
                    y2={height}
                    stroke={(obj as ShapeObject).strokeColor}
                    strokeWidth={((obj as ShapeObject).strokeWidth || 2) * zoom}
                  />
                </svg>
              )}

              {obj.type === 'arrow' && (
                <svg className="w-full h-full overflow-visible pointer-events-none">
                  <defs>
                    <marker
                      id={`arrow-head-${obj.id}`}
                      markerWidth="8"
                      markerHeight="8"
                      refX="6"
                      refY="4"
                      orient="auto"
                    >
                      <path d="M 0 0 L 8 4 L 0 8 z" fill={(obj as ShapeObject).strokeColor} />
                    </marker>
                  </defs>
                  <line
                    x1="0"
                    y1="0"
                    x2={width}
                    y2={height}
                    stroke={(obj as ShapeObject).strokeColor}
                    strokeWidth={((obj as ShapeObject).strokeWidth || 2) * zoom}
                    markerEnd={`url(#arrow-head-${obj.id})`}
                  />
                </svg>
              )}

              {obj.type === 'whiteout' && (
                <div
                  className="w-full h-full flex items-center px-1"
                  style={{
                    backgroundColor: (obj as WhiteoutObject).fillColor || '#ffffff',
                  }}
                >
                  {(obj as WhiteoutObject).replacementText && (
                    <span
                      className="truncate"
                      style={{
                        fontSize: ((obj as WhiteoutObject).replacementFontSize || 12) * zoom,
                        color: (obj as WhiteoutObject).replacementColor || '#000000',
                      }}
                    >
                      {(obj as WhiteoutObject).replacementText}
                    </span>
                  )}
                </div>
              )}

              {/* Freehand drawings & highlights */}
              {(obj.type === 'draw' || obj.type === 'highlight') && (
                <svg className="w-full h-full overflow-visible pointer-events-none">
                  <polyline
                    fill="none"
                    stroke={(obj as DrawingObject).strokeColor}
                    strokeWidth={((obj as DrawingObject).strokeWidth || 3) * zoom}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={((obj as DrawingObject).points || [])
                      .map((p) => `${p.x * zoom},${p.y * zoom}`)
                      .join(' ')}
                  />
                </svg>
              )}

              {/* Bounding Box & Transform Handles */}
              {isSelected && (
                <div className="absolute inset-0 border-2 border-blue-600 pointer-events-none">
                  {/* Rotate Handle */}
                  <div
                    onMouseDown={(e) => {
                      const rect = overlayRef.current?.getBoundingClientRect();
                      if (rect) startInteraction(e, 'rotate', obj, rect);
                    }}
                    className="absolute -top-7 left-1/2 -translate-x-1/2 w-5 h-5 bg-white border border-blue-600 rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing pointer-events-auto shadow-xs"
                    title="Putar Objek"
                  >
                    <RotateCw className="w-3 h-3 text-blue-600" />
                  </div>
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0.5 h-2 bg-blue-600" />

                  {/* Corner Handles */}
                  <div
                    onMouseDown={(e) => {
                      const rect = overlayRef.current?.getBoundingClientRect();
                      if (rect) startInteraction(e, 'nw', obj, rect);
                    }}
                    className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-blue-600 rounded-xs cursor-nwse-resize pointer-events-auto shadow-xs"
                  />
                  <div
                    onMouseDown={(e) => {
                      const rect = overlayRef.current?.getBoundingClientRect();
                      if (rect) startInteraction(e, 'ne', obj, rect);
                    }}
                    className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-blue-600 rounded-xs cursor-nesw-resize pointer-events-auto shadow-xs"
                  />
                  <div
                    onMouseDown={(e) => {
                      const rect = overlayRef.current?.getBoundingClientRect();
                      if (rect) startInteraction(e, 'se', obj, rect);
                    }}
                    className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-blue-600 rounded-xs cursor-nwse-resize pointer-events-auto shadow-xs"
                  />
                  <div
                    onMouseDown={(e) => {
                      const rect = overlayRef.current?.getBoundingClientRect();
                      if (rect) startInteraction(e, 'sw', obj, rect);
                    }}
                    className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-blue-600 rounded-xs cursor-nesw-resize pointer-events-auto shadow-xs"
                  />

                  {/* Edge Handles */}
                  <div
                    onMouseDown={(e) => {
                      const rect = overlayRef.current?.getBoundingClientRect();
                      if (rect) startInteraction(e, 'n', obj, rect);
                    }}
                    className="absolute -top-1 left-1/2 -translate-x-1/2 w-2.5 h-2 bg-white border-2 border-blue-600 rounded-xs cursor-ns-resize pointer-events-auto"
                  />
                  <div
                    onMouseDown={(e) => {
                      const rect = overlayRef.current?.getBoundingClientRect();
                      if (rect) startInteraction(e, 's', obj, rect);
                    }}
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2.5 h-2 bg-white border-2 border-blue-600 rounded-xs cursor-ns-resize pointer-events-auto"
                  />
                  <div
                    onMouseDown={(e) => {
                      const rect = overlayRef.current?.getBoundingClientRect();
                      if (rect) startInteraction(e, 'w', obj, rect);
                    }}
                    className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2.5 bg-white border-2 border-blue-600 rounded-xs cursor-ew-resize pointer-events-auto"
                  />
                  <div
                    onMouseDown={(e) => {
                      const rect = overlayRef.current?.getBoundingClientRect();
                      if (rect) startInteraction(e, 'e', obj, rect);
                    }}
                    className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-2.5 bg-white border-2 border-blue-600 rounded-xs cursor-ew-resize pointer-events-auto"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const MainEditorCanvas: React.FC<MainEditorCanvasProps> = ({
  pdfDoc,
  pages,
  currentPageIndex,
  onPageVisible,
  zoom,
  currentTool,
  onToolUsed,
  objects,
  selectedObjectId,
  onSelectObject,
  onUpdateObject,
  onAddObject,
  onDeleteObject,
  onRecordHistory,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Active interaction states
  const [dragMode, setDragMode] = useState<DragMode>(null);
  const [activePageRect, setActivePageRect] = useState<DOMRect | null>(null);
  const [dragStart, setDragStart] = useState<{
    mouseX: number;
    mouseY: number;
    objX: number;
    objY: number;
    objW: number;
    objH: number;
    rotation: number;
    centerX: number;
    centerY: number;
  } | null>(null);

  // Drawing state for Pen / Highlight
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingPageIndex, setDrawingPageIndex] = useState<number | null>(null);
  const [currentDrawPoints, setCurrentDrawPoints] = useState<{ x: number; y: number }[]>([]);

  // Selected Object lookup
  const selectedObject = objects.find((o) => o.id === selectedObjectId);

  // Auto-detect which page is visible on scroll (IntersectionObserver)
  useEffect(() => {
    const container = containerRef.current;
    if (!container || pages.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Find entry with largest intersection ratio
        let bestEntry: IntersectionObserverEntry | null = null;
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (!bestEntry || entry.intersectionRatio > bestEntry.intersectionRatio) {
              bestEntry = entry;
            }
          }
        });

        if (bestEntry) {
          const idx = Number((bestEntry as IntersectionObserverEntry).target.getAttribute('data-page-index'));
          if (!isNaN(idx)) {
            onPageVisible(idx);
          }
        }
      },
      {
        root: container,
        threshold: [0.2, 0.5, 0.8],
      }
    );

    const pageDoms = container.querySelectorAll('.pdf-page-container');
    pageDoms.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [pages.length, zoom, onPageVisible]);

  // Keyboard navigation & deletion
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedObject) return;
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        onDeleteObject(selectedObject.id);
      } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const delta = e.shiftKey ? 10 : 1;
        let newX = selectedObject.x;
        let newY = selectedObject.y;
        if (e.key === 'ArrowUp') newY -= delta;
        if (e.key === 'ArrowDown') newY += delta;
        if (e.key === 'ArrowLeft') newX -= delta;
        if (e.key === 'ArrowRight') newX += delta;

        onUpdateObject({
          ...selectedObject,
          x: Math.round(newX),
          y: Math.round(newY),
        });
      } else if (e.key === 'Escape') {
        onSelectObject(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedObject, onDeleteObject, onUpdateObject, onSelectObject]);

  // Start interaction (move, rotate, resize)
  const startInteraction = (
    e: React.MouseEvent,
    mode: DragMode,
    obj: CanvasObject,
    pageRect: DOMRect
  ) => {
    e.stopPropagation();
    e.preventDefault();
    onRecordHistory();
    onSelectObject(obj.id);

    const centerX = obj.x + obj.width / 2;
    const centerY = obj.y + obj.height / 2;

    setDragMode(mode);
    setActivePageRect(pageRect);
    setDragStart({
      mouseX: e.clientX,
      mouseY: e.clientY,
      objX: obj.x,
      objY: obj.y,
      objW: obj.width,
      objH: obj.height,
      rotation: obj.rotation || 0,
      centerX,
      centerY,
    });
  };

  const startDrawingOnPage = (pageIdx: number, startPt: { x: number; y: number }) => {
    setIsDrawing(true);
    setDrawingPageIndex(pageIdx);
    setCurrentDrawPoints([startPt]);
  };

  // Global mousemove for drag, resize, rotate, and drawing
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isDrawing && drawingPageIndex !== null) {
        const pageDom = document.getElementById(`pdf-page-${drawingPageIndex}`);
        if (!pageDom) return;
        const rect = pageDom.getBoundingClientRect();
        const ptX = (e.clientX - rect.left) / zoom;
        const ptY = (e.clientY - rect.top) / zoom;
        setCurrentDrawPoints((prev) => [...prev, { x: ptX, y: ptY }]);
        return;
      }

      if (!dragMode || !dragStart || !selectedObject || !activePageRect) return;

      const deltaX = (e.clientX - dragStart.mouseX) / zoom;
      const deltaY = (e.clientY - dragStart.mouseY) / zoom;

      if (dragMode === 'move') {
        onUpdateObject({
          ...selectedObject,
          x: Math.round(dragStart.objX + deltaX),
          y: Math.round(dragStart.objY + deltaY),
        });
      } else if (dragMode === 'rotate') {
        const centerScreenX = activePageRect.left + dragStart.centerX * zoom;
        const centerScreenY = activePageRect.top + dragStart.centerY * zoom;
        const angleRad = Math.atan2(e.clientY - centerScreenY, e.clientX - centerScreenX);
        let angleDeg = Math.round((angleRad * 180) / Math.PI + 90);
        if (angleDeg < 0) angleDeg += 360;
        if (e.shiftKey) {
          angleDeg = Math.round(angleDeg / 15) * 15;
        }
        onUpdateObject({
          ...selectedObject,
          rotation: angleDeg,
        });
      } else {
        // Resizing
        let newX = dragStart.objX;
        let newY = dragStart.objY;
        let newW = dragStart.objW;
        let newH = dragStart.objH;

        if (dragMode.includes('e')) newW = Math.max(16, dragStart.objW + deltaX);
        if (dragMode.includes('s')) newH = Math.max(12, dragStart.objH + deltaY);
        if (dragMode.includes('w')) {
          const proposedW = dragStart.objW - deltaX;
          if (proposedW > 16) {
            newW = proposedW;
            newX = dragStart.objX + deltaX;
          }
        }
        if (dragMode.includes('n')) {
          const proposedH = dragStart.objH - deltaY;
          if (proposedH > 12) {
            newH = proposedH;
            newY = dragStart.objY + deltaY;
          }
        }

        if (selectedObject.isLockedRatio || selectedObject.type === 'image' || e.shiftKey) {
          const ratio = dragStart.objW / dragStart.objH;
          if (dragMode === 'se' || dragMode === 'nw' || dragMode === 'ne' || dragMode === 'sw') {
            newH = newW / ratio;
          }
        }

        onUpdateObject({
          ...selectedObject,
          x: Math.round(newX),
          y: Math.round(newY),
          width: Math.round(newW),
          height: Math.round(newH),
        });
      }
    },
    [isDrawing, drawingPageIndex, dragMode, dragStart, selectedObject, activePageRect, zoom, onUpdateObject]
  );

  const handleMouseUp = useCallback(() => {
    if (isDrawing && drawingPageIndex !== null && currentDrawPoints.length > 1) {
      const isHighlight = currentTool === 'highlight';
      const minX = Math.min(...currentDrawPoints.map((p) => p.x));
      const minY = Math.min(...currentDrawPoints.map((p) => p.y));
      const maxX = Math.max(...currentDrawPoints.map((p) => p.x));
      const maxY = Math.max(...currentDrawPoints.map((p) => p.y));

      const relPoints = currentDrawPoints.map((p) => ({
        x: p.x - minX,
        y: p.y - minY,
      }));

      const newDrawing: DrawingObject = {
        id: `draw_${Date.now()}`,
        pageIndex: drawingPageIndex,
        type: isHighlight ? 'highlight' : 'draw',
        x: Math.round(minX),
        y: Math.round(minY),
        width: Math.max(10, Math.round(maxX - minX)),
        height: Math.max(10, Math.round(maxY - minY)),
        points: relPoints,
        strokeColor: isHighlight ? '#facc15' : '#2563EB',
        strokeWidth: isHighlight ? 14 : 3,
        rotation: 0,
        opacity: isHighlight ? 0.35 : 1,
      };

      onAddObject(newDrawing);
      onSelectObject(newDrawing.id);
      onToolUsed();
    }

    setIsDrawing(false);
    setDrawingPageIndex(null);
    setCurrentDrawPoints([]);
    setDragMode(null);
    setDragStart(null);
    setActivePageRect(null);
  }, [isDrawing, drawingPageIndex, currentDrawPoints, currentTool, onAddObject, onSelectObject, onToolUsed]);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  return (
    <div
      ref={containerRef}
      className="flex-1 bg-slate-100 overflow-y-auto overflow-x-auto p-8 select-none flex flex-col items-center"
    >
      {/* Continuous Document Flow: All pages stacked vertically */}
      <div className="flex flex-col items-center w-full max-w-full space-y-8">
        {pages.map((page) => {
          const pageObjects = objects.filter((o) => o.pageIndex === page.pageIndex);

          return (
            <SinglePageItem
              key={`page-${page.pageNumber}-${page.pageIndex}`}
              pdfDoc={pdfDoc}
              page={page}
              zoom={zoom}
              currentTool={currentTool}
              onToolUsed={onToolUsed}
              pageObjects={pageObjects}
              selectedObjectId={selectedObjectId}
              onSelectObject={onSelectObject}
              onUpdateObject={onUpdateObject}
              onAddObject={onAddObject}
              onRecordHistory={onRecordHistory}
              startInteraction={startInteraction}
              isDrawing={isDrawing}
              drawingPageIndex={drawingPageIndex}
              currentDrawPoints={currentDrawPoints}
              onStartDrawing={startDrawingOnPage}
            />
          );
        })}
      </div>
    </div>
  );
};
