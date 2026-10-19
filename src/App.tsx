/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
  CanvasObject,
  ToolMode,
  ActiveAppView,
  PageInfo,
  ImageObject,
  OpenDocumentTab,
  RecentDocumentItem,
} from './types/pdf';
import {
  loadPdfDocument,
  generatePageThumbnail,
} from './services/pdfService';
import {
  exportEditedPdf,
  addBlankPage,
  duplicatePage,
  deletePage,
  rotatePage,
  reorderPages,
  mergePdfFiles,
  createBlankPdfDocument,
} from './services/pdfLibService';
import { saveProjectToDb, getLatestProject } from './services/dbService';
import { TopNavbar } from './components/TopNavbar';
import { LeftSidebar } from './components/LeftSidebar';
import { EditorToolbar } from './components/EditorToolbar';
import { MainEditorCanvas } from './components/MainEditorCanvas';
import { RightPropertiesPanel } from './components/RightPropertiesPanel';
import { BottomStatusBar } from './components/BottomStatusBar';
import { WordConverterModal } from './components/WordConverterModal';
import { ExcelConverterModal } from './components/ExcelConverterModal';
import { PdfToolsModal } from './components/PdfToolsModal';
import { SignatureModal } from './components/SignatureModal';
import { HomeScreen } from './components/HomeScreen';

export default function App() {
  const [documentName, setDocumentName] = useState('');
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [pageThumbnails, setPageThumbnails] = useState<Record<number, string>>({});

  // Canvas objects & selection
  const [objects, setObjects] = useState<CanvasObject[]>([]);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);

  // Multi-document tabs support
  const [tabs, setTabs] = useState<OpenDocumentTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('tab-initial');

  // Tools & View state - Default to 'home' view when opening the app
  const [currentTool, setCurrentTool] = useState<ToolMode>('select');
  const [activeView, setActiveView] = useState<ActiveAppView>('home');
  const [zoom, setZoom] = useState<number>(1.1);
  const [statusMessage, setStatusMessage] = useState('Memuat PDF Studio...');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Modals
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);

  // History stack for Undo/Redo
  const [undoStack, setUndoStack] = useState<CanvasObject[][]>([]);
  const [redoStack, setRedoStack] = useState<CanvasObject[][]>([]);

  const recordHistory = useCallback(() => {
    setUndoStack((prev) => [...prev.slice(-25), JSON.parse(JSON.stringify(objects))]);
    setRedoStack([]);
    setHasUnsavedChanges(true);
    // Sync unsaved indicator to active tab
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTabId ? { ...t, hasUnsavedChanges: true } : t))
    );
  }, [objects, activeTabId]);

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setRedoStack((prev) => [...prev, JSON.parse(JSON.stringify(objects))]);
    setUndoStack((prev) => prev.slice(0, prev.length - 1));
    setObjects(previous);
    setSelectedObjectId(null);
    setStatusMessage('Perubahan dibatalkan');
  }, [undoStack, objects]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack((prev) => [...prev, JSON.parse(JSON.stringify(objects))]);
    setRedoStack((prev) => prev.slice(0, prev.length - 1));
    setObjects(next);
    setSelectedObjectId(null);
    setStatusMessage('Perubahan diulangi');
  }, [redoStack, objects]);

  // Load a PDF from Uint8Array bytes
  const loadPdfFromBytes = useCallback(
    async (bytes: Uint8Array, name: string, initialObjects: CanvasObject[] = []) => {
      setIsProcessing(true);
      setStatusMessage('Memuat halaman dokumen PDF...');
      try {
        const safeBytes = bytes.slice();
        const { pdfDoc: loadedDoc, pages: loadedPages } = await loadPdfDocument(safeBytes);
        const newBytesCopy = safeBytes.slice();

        setPdfBytes(newBytesCopy);
        setPdfDoc(loadedDoc);
        setPages(loadedPages);
        setCurrentPageIndex(0);
        setDocumentName(name);
        setObjects(initialObjects);
        setSelectedObjectId(null);
        setUndoStack([]);
        setRedoStack([]);

        const tabId = `tab_${Date.now()}`;
        setActiveTabId(tabId);

        // Generate thumbnails asynchronously
        const thumbs: Record<number, string> = {};
        for (const p of loadedPages) {
          try {
            const url = await generatePageThumbnail(loadedDoc, p.pageNumber, 180);
            thumbs[p.pageNumber] = url;
          } catch {
            // Ignore single thumb error
          }
        }
        setPageThumbnails(thumbs);

        // Update tabs collection
        setTabs((prev) => {
          const tabItem: OpenDocumentTab = {
            id: tabId,
            name,
            pdfBytes: newBytesCopy,
            pdfDoc: loadedDoc,
            pages: loadedPages,
            currentPageIndex: 0,
            pageThumbnails: thumbs,
            objects: initialObjects,
            undoStack: [],
            redoStack: [],
            zoom: 1.1,
            hasUnsavedChanges: false,
          };
          const existingIdx = prev.findIndex((t) => t.name === name);
          if (existingIdx !== -1) {
            const updated = [...prev];
            updated[existingIdx] = tabItem;
            return updated;
          }
          return [...prev, tabItem];
        });

        setStatusMessage('Dokumen siap diedit');
      } catch (err: any) {
        console.error('Error loading PDF:', err);
        setStatusMessage('Gagal membuka file PDF: ' + (err.message || 'Format tidak valid'));
      } finally {
        setIsProcessing(false);
      }
    },
    []
  );

  // Initialize: load latest saved project or create rich sample document
  useEffect(() => {
    let isCancelled = false;
    async function initApp() {
      try {
        const saved = await getLatestProject();
        if (saved && saved.fileBytes && saved.fileBytes.buffer.byteLength > 0 && !isCancelled) {
          await loadPdfFromBytes(saved.fileBytes, saved.name, saved.objects || []);
          return;
        }
      } catch (err) {
        console.warn('Could not restore previous project:', err);
      }

      if (!isCancelled) {
        setStatusMessage('PDF Studio siap digunakan. Silakan buka file PDF Anda.');
      }
    }

    initApp();
    return () => {
      isCancelled = true;
    };
  }, [loadPdfFromBytes]);

  // Auto-save active project to IndexedDB
  useEffect(() => {
    if (!pdfBytes || pages.length === 0 || pdfBytes.buffer.byteLength === 0) return;
    const timeout = setTimeout(() => {
      if (pdfBytes.buffer.byteLength > 0) {
        saveProjectToDb({
          id: 'current_active_project',
          name: documentName,
          fileBytes: pdfBytes.slice(),
          totalPages: pages.length,
          pages,
          objects,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
    }, 1500);

    return () => clearTimeout(timeout);
  }, [pdfBytes, documentName, pages, objects]);

  // Global keyboard shortcuts (Ctrl+Z, Ctrl+Y)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleUndo, handleRedo]);

  // User Multiple File Upload handler
  const handleOpenMultipleFiles = async (files: File[]) => {
    if (!files || files.length === 0) return;
    setIsProcessing(true);
    setStatusMessage(`Membuka ${files.length} berkas PDF...`);

    const newTabs: OpenDocumentTab[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        continue;
      }
      try {
        const arrayBuffer = await file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        const { pdfDoc: loadedDoc, pages: loadedPages } = await loadPdfDocument(bytes.slice());

        const tabId = `tab_${Date.now()}_${i}`;
        const newTab: OpenDocumentTab = {
          id: tabId,
          name: file.name,
          pdfBytes: bytes.slice(),
          pdfDoc: loadedDoc,
          pages: loadedPages,
          currentPageIndex: 0,
          pageThumbnails: {},
          objects: [],
          undoStack: [],
          redoStack: [],
          zoom: 1.1,
          hasUnsavedChanges: false,
        };

        // Async generate thumbnail
        generatePageThumbnail(loadedDoc, 1, 180).then((thumb) => {
          setTabs((prev) =>
            prev.map((t) =>
              t.id === tabId
                ? { ...t, pageThumbnails: { ...t.pageThumbnails, 1: thumb } }
                : t
            )
          );
        });

        newTabs.push(newTab);
      } catch (err: any) {
        console.error(`Gagal memuat ${file.name}:`, err);
      }
    }

    if (newTabs.length > 0) {
      setTabs((prev) => [...prev, ...newTabs]);
      // Switch to first newly added tab
      const firstTab = newTabs[0];
      setActiveTabId(firstTab.id);
      setDocumentName(firstTab.name);
      setPdfBytes(firstTab.pdfBytes);
      setPdfDoc(firstTab.pdfDoc);
      setPages(firstTab.pages);
      setCurrentPageIndex(0);
      setObjects([]);
      setPageThumbnails(firstTab.pageThumbnails);
      setActiveView('editor');
      setStatusMessage(`Berhasil membuka ${newTabs.length} berkas PDF`);
    } else {
      setStatusMessage('Gagal membuka berkas PDF');
    }

    setIsProcessing(false);
  };

  // Switch between tabs
  const handleSelectTab = (tabId: string) => {
    // Save current active tab state
    setTabs((prev) =>
      prev.map((t) =>
        t.id === activeTabId
          ? {
              ...t,
              name: documentName,
              pdfBytes: pdfBytes ? pdfBytes.slice() : t.pdfBytes,
              pdfDoc: pdfDoc || t.pdfDoc,
              pages,
              currentPageIndex,
              pageThumbnails,
              objects,
              undoStack,
              redoStack,
              zoom,
              hasUnsavedChanges,
            }
          : t
      )
    );

    const target = tabs.find((t) => t.id === tabId);
    if (!target) return;

    setActiveTabId(target.id);
    setDocumentName(target.name);
    setPdfBytes(target.pdfBytes.slice());
    setPdfDoc(target.pdfDoc);
    setPages(target.pages);
    setCurrentPageIndex(target.currentPageIndex);
    setObjects(target.objects);
    setPageThumbnails(target.pageThumbnails);
    setUndoStack(target.undoStack);
    setRedoStack(target.redoStack);
    setZoom(target.zoom || 1.1);
    setHasUnsavedChanges(target.hasUnsavedChanges || false);
    setSelectedObjectId(null);
  };

  // Close a specific tab
  const handleCloseTab = (tabId: string) => {
    if (tabs.length <= 1) return;
    const remaining = tabs.filter((t) => t.id !== tabId);
    setTabs(remaining);
    if (activeTabId === tabId) {
      const nextTab = remaining[0];
      handleSelectTab(nextTab.id);
    }
  };

  // Combine all open tabs into a single PDF
  const handleCombineAllTabs = async () => {
    if (tabs.length < 2) return;
    setIsProcessing(true);
    setStatusMessage(`Menggabungkan ${tabs.length} berkas...`);
    try {
      const allBytes = tabs.map((t) => t.pdfBytes);
      const merged = await mergePdfFiles(allBytes);
      const newName = `Gabungan_${tabs.length}_Berkas.pdf`;
      await loadPdfFromBytes(merged, newName);
      setStatusMessage('Semua tab berhasil digabungkan!');
    } catch (err: any) {
      alert('Gagal menggabungkan: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Create clean blank 1-page PDF document
  const handleCreateBlankDocument = async () => {
    setIsProcessing(true);
    setStatusMessage('Membuat dokumen baru kosong...');
    try {
      const blankBytes = await createBlankPdfDocument();
      await loadPdfFromBytes(blankBytes, 'Dokumen_Baru.pdf');
      setActiveView('editor');
      setStatusMessage('Dokumen baru kosong siap diedit');
    } catch (err: any) {
      console.error(err);
      setStatusMessage('Gagal membuat dokumen: ' + (err.message || 'Error'));
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle quick actions triggered from Home Screen cards
  const handleTriggerAction = (
    action: 'edit' | 'annotate' | 'sign' | 'combine' | 'organize' | 'word' | 'excel'
  ) => {
    if (action === 'edit') {
      setActiveView('editor');
      setCurrentTool('select');
    } else if (action === 'annotate') {
      setActiveView('editor');
      setCurrentTool('highlight');
    } else if (action === 'sign') {
      setActiveView('editor');
      setIsSignatureModalOpen(true);
    } else if (action === 'combine') {
      setActiveView('tools');
    } else if (action === 'organize') {
      setActiveView('tools');
    } else if (action === 'word') {
      setActiveView('convert_word');
    } else if (action === 'excel') {
      setActiveView('convert_excel');
    }
  };

  // Zoom handlers
  const handleZoomIn = () => setZoom((z) => Math.min(2.5, Math.round((z + 0.15) * 100) / 100));
  const handleZoomOut = () => setZoom((z) => Math.max(0.4, Math.round((z - 0.15) * 100) / 100));
  const handleResetZoom = () => setZoom(1.0);
  const handleFitWidth = () => setZoom(1.25);

  // Object manipulations
  const handleAddObject = (newObj: CanvasObject) => {
    recordHistory();
    setObjects((prev) => [...prev, newObj]);
    setSelectedObjectId(newObj.id);
  };

  const handleUpdateObject = (updated: CanvasObject) => {
    setObjects((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
    setHasUnsavedChanges(true);
  };

  const handleDeleteObject = (id: string) => {
    recordHistory();
    setObjects((prev) => prev.filter((o) => o.id !== id));
    if (selectedObjectId === id) setSelectedObjectId(null);
  };

  const handleDuplicateObject = (obj: CanvasObject) => {
    recordHistory();
    const cloned: CanvasObject = {
      ...JSON.parse(JSON.stringify(obj)),
      id: `${obj.type}_${Date.now()}`,
      x: obj.x + 20,
      y: obj.y + 20,
    };
    setObjects((prev) => [...prev, cloned]);
    setSelectedObjectId(cloned.id);
  };

  const handleBringForward = (id: string) => {
    recordHistory();
    setObjects((prev) => {
      const idx = prev.findIndex((o) => o.id === id);
      if (idx === -1 || idx === prev.length - 1) return prev;
      const copy = [...prev];
      const [item] = copy.splice(idx, 1);
      copy.push(item);
      return copy;
    });
  };

  const handleSendBackward = (id: string) => {
    recordHistory();
    setObjects((prev) => {
      const idx = prev.findIndex((o) => o.id === id);
      if (idx <= 0) return prev;
      const copy = [...prev];
      const [item] = copy.splice(idx, 1);
      copy.unshift(item);
      return copy;
    });
  };

  // Insert image from computer onto active PDF page
  const handleInsertImageFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result as string;
      const img = new Image();
      img.onload = () => {
        recordHistory();
        const curPage = pages[currentPageIndex] || { width: 595, height: 842 };
        const maxW = 200;
        const scale = maxW / img.naturalWidth;
        const width = maxW;
        const height = Math.round(img.naturalHeight * scale);

        const newImageObj: ImageObject = {
          id: `img_${Date.now()}`,
          pageIndex: currentPageIndex,
          type: 'image',
          src,
          mimeType: file.type as any,
          x: Math.round((curPage.width - width) / 2),
          y: Math.round((curPage.height - height) / 3),
          width,
          height,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          rotation: 0,
          opacity: 1,
          isLockedRatio: true,
        };

        handleAddObject(newImageObj);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  // Page Operations
  const handleAddBlankPage = async () => {
    if (!pdfBytes) return;
    setIsProcessing(true);
    setStatusMessage('Menambahkan halaman kosong...');
    try {
      const newBytes = await addBlankPage(pdfBytes);
      await loadPdfFromBytes(newBytes, documentName, objects);
      setCurrentPageIndex(pages.length);
    } catch (err: any) {
      alert('Gagal menambah halaman: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDuplicatePage = async (index: number) => {
    if (!pdfBytes) return;
    setIsProcessing(true);
    setStatusMessage(`Menduplikasi halaman ${index + 1}...`);
    try {
      const newBytes = await duplicatePage(pdfBytes, index);
      // Duplicate objects on that page too
      const clonedObjs = objects
        .filter((o) => o.pageIndex === index)
        .map((o) => ({
          ...JSON.parse(JSON.stringify(o)),
          id: `${o.type}_${Date.now()}_dup`,
          pageIndex: index + 1,
        }));
      await loadPdfFromBytes(newBytes, documentName, [...objects, ...clonedObjs]);
      setCurrentPageIndex(index + 1);
    } catch (err: any) {
      alert('Gagal menduplikasi halaman: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeletePage = async (index: number) => {
    if (!pdfBytes || pages.length <= 1) return;
    if (!confirm(`Hapus halaman ${index + 1}? Tindakan ini tidak dapat dibatalkan.`)) return;
    setIsProcessing(true);
    setStatusMessage(`Menghapus halaman ${index + 1}...`);
    try {
      const newBytes = await deletePage(pdfBytes, index);
      const remainingObjs = objects
        .filter((o) => o.pageIndex !== index)
        .map((o) => (o.pageIndex > index ? { ...o, pageIndex: o.pageIndex - 1 } : o));
      await loadPdfFromBytes(newBytes, documentName, remainingObjs);
      setCurrentPageIndex((prev) => Math.max(0, Math.min(prev, pages.length - 2)));
    } catch (err: any) {
      alert('Gagal menghapus halaman: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRotatePage = async (index: number) => {
    if (!pdfBytes) return;
    setIsProcessing(true);
    setStatusMessage(`Memutar halaman ${index + 1}...`);
    try {
      const newBytes = await rotatePage(pdfBytes, index, 90);
      await loadPdfFromBytes(newBytes, documentName, objects);
    } catch (err: any) {
      alert('Gagal memutar halaman: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMovePage = async (fromIndex: number, toIndex: number) => {
    if (!pdfBytes) return;
    setIsProcessing(true);
    setStatusMessage('Mengatur ulang urutan halaman...');
    try {
      const order = pages.map((_, i) => i);
      const [moved] = order.splice(fromIndex, 1);
      order.splice(toIndex, 0, moved);

      const newBytes = await reorderPages(pdfBytes, order);
      // Remap object pageIndexes
      const remappedObjs = objects.map((obj) => {
        const newIdx = order.indexOf(obj.pageIndex);
        return { ...obj, pageIndex: newIdx !== -1 ? newIdx : obj.pageIndex };
      });
      await loadPdfFromBytes(newBytes, documentName, remappedObjs);
      setCurrentPageIndex(toIndex);
    } catch (err: any) {
      alert('Gagal menggeser halaman: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Export Edited PDF
  const handleExportPdf = async () => {
    if (!pdfBytes) return;
    setIsExporting(true);
    setStatusMessage('Menyatukan perubahan dan mengekspor dokumen...');
    try {
      const editedBytes = await exportEditedPdf(pdfBytes, objects);
      const blob = new Blob([editedBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cleanName = documentName.replace(/\.pdf$/i, '');
      a.download = `${cleanName}_diedit.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setHasUnsavedChanges(false);
      setStatusMessage('PDF berhasil diekspor dan diunduh!');
    } catch (err: any) {
      console.error('Export error:', err);
      alert('Gagal mengekspor PDF: ' + err.message);
      setStatusMessage('Ekspor gagal.');
    } finally {
      setIsExporting(false);
    }
  };

  const currentPage = pages[currentPageIndex] || {
    pageIndex: 0,
    pageNumber: 1,
    width: 595.28,
    height: 841.89,
    rotation: 0,
  };

  const selectedObject = objects.find((o) => o.id === selectedObjectId) || null;

  if (activeView === 'home') {
    return (
      <div className="h-screen w-screen bg-[#F8FAFC] overflow-hidden select-none font-sans">
        <HomeScreen
          onOpenDocuments={handleOpenMultipleFiles}
          onCreateBlankDocument={handleCreateBlankDocument}
          onGoToEditor={() => setActiveView('editor')}
          hasActiveDocument={Boolean(pdfBytes)}
          activeDocumentName={documentName}
          openTabs={tabs}
          activeTabId={activeTabId}
          onSelectTab={handleSelectTab}
          onTriggerAction={handleTriggerAction}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-[#F8FAFC] overflow-hidden select-none font-sans">
      {/* Top Navbar with Multi-Document Tabs */}
      <TopNavbar
        documentName={documentName}
        onRenameDocument={setDocumentName}
        activeView={activeView}
        setActiveView={setActiveView}
        onFileUpload={handleOpenMultipleFiles}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        zoom={zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetZoom={handleResetZoom}
        onFitWidth={handleFitWidth}
        onExportPdf={handleExportPdf}
        isExporting={isExporting}
        hasUnsavedChanges={hasUnsavedChanges}
        tabs={tabs}
        activeTabId={activeTabId}
        onSelectTab={handleSelectTab}
        onCloseTab={handleCloseTab}
        onCombineAllTabs={handleCombineAllTabs}
      />

      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Sidebar: Pages & Thumbnails */}
        <LeftSidebar
          pages={pages}
          currentPageIndex={currentPageIndex}
          onSelectPage={setCurrentPageIndex}
          onAddBlankPage={handleAddBlankPage}
          onDuplicatePage={handleDuplicatePage}
          onDeletePage={handleDeletePage}
          onRotatePage={handleRotatePage}
          onMovePage={handleMovePage}
          pageThumbnails={pageThumbnails}
          isProcessing={isProcessing}
        />

        {/* Center: Canvas & Floating Toolbar */}
        <div className="flex-1 flex flex-col relative overflow-hidden">
          {/* Sub-toolbar centered at top of canvas */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
            <EditorToolbar
              currentTool={currentTool}
              onSelectTool={setCurrentTool}
              onInsertImageFile={handleInsertImageFile}
              onOpenSignatureModal={() => setIsSignatureModalOpen(true)}
            />
          </div>

          {/* Interactive Continuous PDF Page Canvas */}
          <MainEditorCanvas
            pdfDoc={pdfDoc}
            pages={pages}
            currentPageIndex={currentPageIndex}
            onPageVisible={setCurrentPageIndex}
            zoom={zoom}
            currentTool={currentTool}
            onToolUsed={() => setCurrentTool('select')}
            objects={objects}
            selectedObjectId={selectedObjectId}
            onSelectObject={setSelectedObjectId}
            onUpdateObject={handleUpdateObject}
            onAddObject={handleAddObject}
            onDeleteObject={handleDeleteObject}
            onRecordHistory={recordHistory}
          />
        </div>

        {/* Right Properties Panel */}
        <RightPropertiesPanel
          selectedObject={selectedObject}
          onUpdateObject={handleUpdateObject}
          onDeleteObject={handleDeleteObject}
          onDuplicateObject={handleDuplicateObject}
          onBringForward={handleBringForward}
          onSendBackward={handleSendBackward}
        />
      </div>

      {/* Bottom Status Bar */}
      <BottomStatusBar
        currentPage={currentPage}
        totalPages={pages.length || 1}
        zoom={zoom}
        statusMessage={statusMessage}
        selectedObject={selectedObject}
      />

      {/* Dedicated Modals */}
      <WordConverterModal
        isOpen={activeView === 'convert_word'}
        onClose={() => setActiveView('editor')}
        pdfDoc={pdfDoc}
        documentName={documentName}
      />

      <ExcelConverterModal
        isOpen={activeView === 'convert_excel'}
        onClose={() => setActiveView('editor')}
        pdfDoc={pdfDoc}
        documentName={documentName}
      />

      <PdfToolsModal
        isOpen={activeView === 'tools'}
        onClose={() => setActiveView('editor')}
        currentPdfBytes={pdfBytes}
        documentName={documentName}
        totalPages={pages.length || 1}
        onLoadNewPdfBytes={(bytes, newName) => loadPdfFromBytes(bytes, newName)}
      />

      <SignatureModal
        isOpen={isSignatureModalOpen}
        onClose={() => setIsSignatureModalOpen(false)}
        currentPageIndex={currentPageIndex}
        onAddObject={handleAddObject}
      />
    </div>
  );
}
