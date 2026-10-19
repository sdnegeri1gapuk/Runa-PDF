import React, { useRef } from 'react';
import {
  FileText,
  Upload,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
  FileSpreadsheet,
  Layers,
  Sparkles,
  Home,
  Plus,
  X,
  FilePlus,
} from 'lucide-react';
import { ActiveAppView, OpenDocumentTab } from '../types/pdf';

interface TopNavbarProps {
  documentName: string;
  onRenameDocument: (newName: string) => void;
  activeView: ActiveAppView;
  setActiveView: (view: ActiveAppView) => void;
  onFileUpload: (files: File[]) => void;
  onLoadSample?: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onFitWidth: () => void;
  onExportPdf: () => void;
  isExporting: boolean;
  hasUnsavedChanges: boolean;
  tabs?: OpenDocumentTab[];
  activeTabId?: string;
  onSelectTab?: (tabId: string) => void;
  onCloseTab?: (tabId: string) => void;
  onCombineAllTabs?: () => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  documentName,
  onRenameDocument,
  activeView,
  setActiveView,
  onFileUpload,
  onLoadSample,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  zoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onFitWidth,
  onExportPdf,
  isExporting,
  hasUnsavedChanges,
  tabs = [],
  activeTabId = '',
  onSelectTab,
  onCloseTab,
  onCombineAllTabs,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      onFileUpload(files);
    }
    e.target.value = '';
  };

  return (
    <div className="flex flex-col bg-white border-b border-slate-200 select-none shrink-0 z-20">
      {/* Top Main Toolbar Header */}
      <header className="h-13 px-4 flex items-center justify-between gap-4 border-b border-slate-150">
        {/* Zone 1: Brand Wordmark & Home Button */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => setActiveView('home')}
            className="flex items-center gap-2 hover:opacity-85 transition-opacity text-left cursor-pointer"
            title="Buka Beranda PDF Studio"
          >
            <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              PS
            </div>
            <span className="font-bold text-sm tracking-tight text-slate-900 whitespace-nowrap">
              PDF Studio
            </span>
          </button>

          <span className="text-slate-300 font-light" aria-hidden="true">|</span>

          <button
            onClick={() => setActiveView('home')}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
              activeView === 'home'
                ? 'bg-blue-50 text-blue-700 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="Kembali ke Halaman Awal"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Beranda</span>
          </button>
        </div>

        {/* Zone 2: Navigation Links / Workflow Switchers */}
        <nav className="hidden lg:flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs font-medium">
          <button
            onClick={() => setActiveView('editor')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all whitespace-nowrap ${
              activeView === 'editor'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-blue-600" />
            <span>Editor Dokumen</span>
          </button>

          <button
            onClick={() => setActiveView('convert_word')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all whitespace-nowrap ${
              activeView === 'convert_word'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-indigo-600" />
            <span>Konversi Word (DOCX)</span>
          </button>

          <button
            onClick={() => setActiveView('convert_excel')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all whitespace-nowrap ${
              activeView === 'convert_excel'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Konversi Excel (XLSX)</span>
          </button>

          <button
            onClick={() => setActiveView('tools')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all whitespace-nowrap ${
              activeView === 'tools'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-slate-700" />
            <span>Alat PDF</span>
          </button>
        </nav>

        {/* Zone 3: Toolbar Controls & Primary Export Action */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Hidden Multi-file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="application/pdf"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Open PDF button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap cursor-pointer"
            title="Buka satu atau beberapa berkas PDF sekaligus"
          >
            <Upload className="w-3 h-3" />
            <span className="hidden sm:inline">Buka PDF</span>
          </button>

          <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />

          {/* Undo & Redo */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent rounded transition-colors"
              title="Urungkan (Ctrl+Z)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent rounded transition-colors"
              title="Ulangi (Ctrl+Y)"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />

          {/* Zoom Controls */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={onZoomOut}
              className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
              title="Perkecil Zoom"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <button
              onClick={onResetZoom}
              className="px-1.5 py-0.5 text-xs font-mono font-medium text-slate-700 hover:bg-slate-100 rounded tabular-nums"
              title="Kembalikan ke 100%"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              onClick={onZoomIn}
              className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
              title="Perbesar Zoom"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
            <button
              onClick={onFitWidth}
              className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
              title="Sesuaikan Lebar"
            >
              <Maximize2 className="w-3 h-3" />
            </button>
          </div>

          {/* Export PDF Button */}
          <button
            onClick={onExportPdf}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 rounded-lg shadow-xs transition-colors whitespace-nowrap shrink-0 ml-1"
          >
            {isExporting ? (
              <>
                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Mengekspor...</span>
              </>
            ) : (
              <>
                <Download className="w-3 h-3" />
                <span>Ekspor PDF</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Document Tabs Bar (Multi-File Support) */}
      <div className="h-9 px-3 bg-slate-100 flex items-center justify-between gap-2 overflow-x-auto">
        <div className="flex items-center gap-1 overflow-x-auto flex-1 py-1">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <div
                key={tab.id}
                onClick={() => onSelectTab && onSelectTab(tab.id)}
                className={`group flex items-center gap-2 px-3 py-1 text-xs rounded-t-md transition-all cursor-pointer whitespace-nowrap max-w-[220px] ${
                  isActive
                    ? 'bg-white text-slate-900 font-medium shadow-2xs border-t-2 border-t-blue-600'
                    : 'bg-slate-200/70 text-slate-600 hover:bg-slate-200 hover:text-slate-900 border-t-2 border-t-transparent'
                }`}
              >
                <div className="w-3.5 h-4 rounded-2xs border border-red-300 bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                  <span className="text-[6px] font-extrabold font-mono">PDF</span>
                </div>

                <span className="truncate" title={tab.name}>
                  {tab.name}
                </span>

                {tab.hasUnsavedChanges && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" title="Ada perubahan" />
                )}

                {tabs.length > 1 && onCloseTab && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCloseTab(tab.id);
                    }}
                    className="p-0.5 text-slate-400 hover:text-red-600 hover:bg-slate-200 rounded transition-colors ml-0.5"
                    title="Tutup berkas ini"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}

          {/* Add more files button (+) */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-600 hover:text-blue-600 hover:bg-slate-200/80 rounded transition-colors shrink-0"
            title="Buka berkas PDF tambahan..."
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Tambah Berkas</span>
          </button>
        </div>

        {/* Combine all tabs button if more than 1 tab open */}
        {tabs.length > 1 && onCombineAllTabs && (
          <button
            onClick={onCombineAllTabs}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded transition-colors whitespace-nowrap shrink-0"
            title="Gabungkan semua berkas yang sedang dibuka menjadi satu berkas PDF baru"
          >
            <Layers className="w-3 h-3 text-blue-600" />
            <span>Gabungkan Semua Tab ({tabs.length})</span>
          </button>
        )}
      </div>
    </div>
  );
};
