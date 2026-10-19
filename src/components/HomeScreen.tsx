import React, { useState, useRef } from 'react';
import {
  ArrowLeft,
  FilePlus,
  FileText,
  Edit3,
  Highlighter,
  PenTool,
  Layers,
  FolderOpen,
  Info,
  Printer,
  FileSpreadsheet,
  Scissors,
  CheckCircle2,
  ShieldCheck,
  MousePointerClick,
  ScrollText,
  UploadCloud,
  ChevronRight,
  FileCheck,
} from 'lucide-react';
import { OpenDocumentTab } from '../types/pdf';

interface HomeScreenProps {
  onOpenDocuments: (files: File[]) => void;
  onCreateBlankDocument: () => void;
  onGoToEditor: () => void;
  hasActiveDocument: boolean;
  activeDocumentName: string;
  openTabs?: OpenDocumentTab[];
  activeTabId?: string;
  onSelectTab?: (tabId: string) => void;
  onTriggerAction: (
    action: 'edit' | 'annotate' | 'sign' | 'combine' | 'organize' | 'word' | 'excel'
  ) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onOpenDocuments,
  onCreateBlankDocument,
  onGoToEditor,
  hasActiveDocument,
  activeDocumentName,
  openTabs = [],
  activeTabId = '',
  onSelectTab,
  onTriggerAction,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Compute time-based greeting matching the user's reference screenshot
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 4 && hour < 11) return 'Selamat Pagi / Good Morning';
    if (hour >= 11 && hour < 15) return 'Selamat Siang / Good Afternoon';
    if (hour >= 15 && hour < 19) return 'Selamat Sore / Good Afternoon';
    return 'Selamat Malam / Good Evening';
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      onOpenDocuments(files);
    }
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    );

    if (droppedFiles.length > 0) {
      onOpenDocuments(droppedFiles);
    }
  };

  return (
    <div className="flex h-screen w-screen bg-[#F8FAFC] select-none overflow-hidden font-sans">
      {/* Hidden Multiple File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="application/pdf"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Left Sidebar (Dark Navy / Slate) */}
      <aside className="w-56 bg-[#1F2430] text-slate-300 flex flex-col shrink-0 overflow-y-auto py-5 select-none border-r border-slate-800">
        {/* Back Button (Circle with Arrow Left to Editor) */}
        <div className="px-5 mb-6 flex items-center justify-between">
          <button
            onClick={onGoToEditor}
            disabled={!hasActiveDocument}
            className={`w-9 h-9 rounded-full border border-slate-500 flex items-center justify-center transition-all ${
              hasActiveDocument
                ? 'text-white hover:bg-slate-700 hover:border-white cursor-pointer shadow-sm'
                : 'text-slate-600 border-slate-700 cursor-not-allowed opacity-40'
            }`}
            title={
              hasActiveDocument
                ? `Kembali ke Editor (${openTabs.length} dokumen terbuka)`
                : 'Buka atau pilih dokumen terlebih dahulu'
            }
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          {hasActiveDocument && (
            <span className="text-[10px] text-blue-400 font-mono">
              {openTabs.length} Tab Aktif
            </span>
          )}
        </div>

        {/* Real, Functional Navigation Menu Items */}
        <nav className="flex-1 space-y-0.5 text-xs">
          <button className="w-full text-left px-6 py-2.5 bg-[#2B3242] text-white font-medium flex items-center gap-2.5 transition-colors cursor-default">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span>Home (Beranda)</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full text-left px-6 py-2.5 text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors flex items-center justify-between group cursor-pointer"
            title="Buka satu atau beberapa berkas PDF sekaligus"
          >
            <div className="flex items-center gap-2">
              <FolderOpen className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-400" />
              <span>Buka File PDF</span>
            </div>
            <span className="text-[9px] px-1.5 py-0.5 bg-blue-900/60 text-blue-300 rounded font-mono">
              Multipel
            </span>
          </button>

          <button
            onClick={onCreateBlankDocument}
            className="w-full text-left px-6 py-2.5 text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors flex items-center gap-2 group cursor-pointer"
            title="Buat dokumen PDF kosong baru 1 halaman"
          >
            <FilePlus className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-400" />
            <span>Dokumen Baru Kosong</span>
          </button>

          <button
            onClick={() => onTriggerAction('combine')}
            className="w-full text-left px-6 py-2.5 text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors flex items-center gap-2 group cursor-pointer"
            title="Gabungkan beberapa file PDF menjadi satu"
          >
            <Layers className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-400" />
            <span>Gabung Dokumen</span>
          </button>

          <button
            onClick={() => onTriggerAction('organize')}
            className="w-full text-left px-6 py-2.5 text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors flex items-center gap-2 group cursor-pointer"
            title="Pecah dan ekstrak halaman PDF"
          >
            <Scissors className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-400" />
            <span>Pisah & Ekstrak</span>
          </button>

          <button
            onClick={() => onTriggerAction('word')}
            className="w-full text-left px-6 py-2.5 text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors flex items-center gap-2 group cursor-pointer"
            title="Konversi dokumen PDF ke format Word DOCX"
          >
            <FileText className="w-3.5 h-3.5 text-indigo-400" />
            <span>Konversi Word (DOCX)</span>
          </button>

          <button
            onClick={() => onTriggerAction('excel')}
            className="w-full text-left px-6 py-2.5 text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors flex items-center gap-2 group cursor-pointer"
            title="Ekstrak tabel PDF ke format Excel XLSX"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Konversi Excel (XLSX)</span>
          </button>

          {/* Clean divider line */}
          <div className="pt-3 pb-2 px-6">
            <div className="h-px bg-slate-700/60 w-full" />
          </div>

          <button
            onClick={() => window.print()}
            className="w-full text-left px-6 py-2.5 text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak (Print)</span>
          </button>

          <button
            onClick={() => setShowInfoModal(true)}
            className="w-full text-left px-6 py-2.5 text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Info className="w-3.5 h-3.5" />
            <span>Info & Panduan Fitur</span>
          </button>
        </nav>
      </aside>

      {/* Main Content View */}
      <main className="flex-1 flex flex-col overflow-y-auto px-8 lg:px-12 py-6">
        {/* Top Centered Brand Label */}
        <div className="text-center mb-5">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            PDF Studio Pro • Platform Pengolah Dokumen Profesional
          </span>
        </div>

        {/* Greeting Headline */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-light text-slate-900 tracking-tight">
              {getGreeting()}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Buka satu atau beberapa berkas PDF Anda untuk mulai mengedit, memberi tanda tangan, atau mengonversi.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onCreateBlankDocument}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
              title="Buat dokumen baru kosong"
            >
              <FilePlus className="w-3.5 h-3.5 text-slate-600" />
              <span>Dokumen Baru Kosong</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors cursor-pointer"
              title="Buka satu atau beberapa berkas PDF dari komputer"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Buka Multipel File...</span>
            </button>
          </div>
        </div>

        {/* Feature Quick Action Cards (7 Cards matching reference screenshot) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3.5 mb-8">
          {/* Card 1: Create PDF From File (Supports multiple file selection) */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="group flex flex-col items-center cursor-pointer text-center focus:outline-none"
            title="Buka satu atau beberapa file PDF dari perangkat"
          >
            <div className="w-24 h-28 bg-white border border-slate-200 rounded-lg shadow-2xs hover:shadow-md hover:border-blue-500 transition-all flex items-center justify-center mb-2.5 relative">
              <div className="w-10 h-10 rounded border border-slate-300 flex items-center justify-center relative bg-slate-50 group-hover:border-blue-500 transition-colors">
                <FileText className="w-5 h-5 text-slate-600 group-hover:text-blue-600 transition-colors" />
                <span className="absolute -bottom-1 -right-1 bg-blue-600 text-white rounded-full w-4 h-4 text-[10px] font-bold flex items-center justify-center">
                  +
                </span>
              </div>
            </div>
            <span className="text-[11px] font-medium text-slate-700 leading-tight group-hover:text-blue-600">
              Create PDF From File
            </span>
          </button>

          {/* Card 2: Create & Combine */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="group flex flex-col items-center cursor-pointer text-center focus:outline-none"
            title="Pilih beberapa berkas PDF sekaligus untuk digabungkan"
          >
            <div className="w-24 h-28 bg-white border border-slate-200 rounded-lg shadow-2xs hover:shadow-md hover:border-blue-500 transition-all flex items-center justify-center mb-2.5">
              <div className="relative w-9 h-9">
                <div className="absolute top-0 right-0 w-7 h-7 border border-slate-300 rounded bg-slate-50" />
                <div className="absolute bottom-0 left-0 w-7 h-7 border border-slate-400 rounded bg-white group-hover:border-blue-500 flex items-center justify-center shadow-2xs">
                  <Layers className="w-4 h-4 text-slate-700 group-hover:text-blue-600 transition-colors" />
                </div>
              </div>
            </div>
            <span className="text-[11px] font-medium text-slate-700 leading-tight group-hover:text-blue-600">
              Create & Combine
            </span>
          </button>

          {/* Card 3: Edit */}
          <button
            onClick={() => {
              if (hasActiveDocument) onGoToEditor();
              else fileInputRef.current?.click();
            }}
            className="group flex flex-col items-center cursor-pointer text-center focus:outline-none"
            title={hasActiveDocument ? "Lanjutkan mengedit dokumen aktif" : "Buka berkas PDF untuk diedit"}
          >
            <div className="w-24 h-28 bg-white border border-slate-200 rounded-lg shadow-2xs hover:shadow-md hover:border-blue-500 transition-all flex items-center justify-center mb-2.5">
              <div className="w-10 h-10 border border-slate-300 rounded bg-slate-50 flex flex-col items-center justify-center group-hover:border-blue-500 transition-colors p-1">
                <div className="flex items-center gap-0.5 text-[9px] font-bold text-slate-700 group-hover:text-blue-600">
                  <span>Aa</span>
                  <Edit3 className="w-2.5 h-2.5" />
                </div>
                <div className="w-full h-1 bg-blue-200 rounded-full mt-1" />
              </div>
            </div>
            <span className="text-[11px] font-medium text-slate-700 leading-tight group-hover:text-blue-600">
              Edit
            </span>
          </button>

          {/* Card 4: Annotate */}
          <button
            onClick={() => {
              if (hasActiveDocument) {
                onGoToEditor();
                onTriggerAction('annotate');
              } else {
                fileInputRef.current?.click();
              }
            }}
            className="group flex flex-col items-center cursor-pointer text-center focus:outline-none"
            title={hasActiveDocument ? "Beri anotasi pada dokumen" : "Buka berkas PDF untuk dianotasi"}
          >
            <div className="w-24 h-28 bg-white border border-slate-200 rounded-lg shadow-2xs hover:shadow-md hover:border-blue-500 transition-all flex items-center justify-center mb-2.5">
              <div className="w-10 h-10 border border-slate-300 rounded bg-slate-50 flex items-center justify-center group-hover:border-blue-500 transition-colors">
                <Highlighter className="w-5 h-5 text-teal-600" />
              </div>
            </div>
            <span className="text-[11px] font-medium text-slate-700 leading-tight group-hover:text-blue-600">
              Annotate
            </span>
          </button>

          {/* Card 5: QuickSign */}
          <button
            onClick={() => {
              if (hasActiveDocument) {
                onGoToEditor();
                onTriggerAction('sign');
              } else {
                fileInputRef.current?.click();
              }
            }}
            className="group flex flex-col items-center cursor-pointer text-center focus:outline-none"
            title={hasActiveDocument ? "Beri tanda tangan digital" : "Buka berkas PDF untuk ditandatangani"}
          >
            <div className="w-24 h-28 bg-white border border-slate-200 rounded-lg shadow-2xs hover:shadow-md hover:border-blue-500 transition-all flex items-center justify-center mb-2.5">
              <div className="w-10 h-10 border border-slate-300 rounded bg-slate-50 flex flex-col items-center justify-center group-hover:border-blue-500 transition-colors">
                <span className="font-serif italic font-semibold text-xs text-teal-700">Sign</span>
                <PenTool className="w-3 h-3 text-slate-500 mt-0.5" />
              </div>
            </div>
            <span className="text-[11px] font-medium text-slate-700 leading-tight group-hover:text-blue-600">
              QuickSign
            </span>
          </button>

          {/* Card 6: Combine */}
          <button
            onClick={() => onTriggerAction('combine')}
            className="group flex flex-col items-center cursor-pointer text-center focus:outline-none"
            title="Gabungkan beberapa dokumen PDF"
          >
            <div className="w-24 h-28 bg-white border border-slate-200 rounded-lg shadow-2xs hover:shadow-md hover:border-blue-500 transition-all flex items-center justify-center mb-2.5">
              <div className="w-10 h-10 border border-slate-300 rounded bg-slate-50 flex items-center justify-center group-hover:border-blue-500 transition-colors">
                <Layers className="w-5 h-5 text-teal-600" />
              </div>
            </div>
            <span className="text-[11px] font-medium text-slate-700 leading-tight group-hover:text-blue-600">
              Combine
            </span>
          </button>

          {/* Card 7: Organize */}
          <button
            onClick={() => onTriggerAction('organize')}
            className="group flex flex-col items-center cursor-pointer text-center focus:outline-none"
            title="Kelola, putar, pisahkan, dan hapus halaman"
          >
            <div className="w-24 h-28 bg-white border border-slate-200 rounded-lg shadow-2xs hover:shadow-md hover:border-blue-500 transition-all flex items-center justify-center mb-2.5">
              <div className="w-10 h-10 border border-slate-300 rounded bg-slate-50 flex items-center justify-center group-hover:border-blue-500 transition-colors">
                <Scissors className="w-5 h-5 text-slate-600 group-hover:text-blue-600" />
              </div>
            </div>
            <span className="text-[11px] font-medium text-slate-700 leading-tight group-hover:text-blue-600">
              Organize
            </span>
          </button>
        </div>

        {/* WELCOME, INTRODUCTION & QUICK START SECTION (Replacing fake recent files) */}
        <div className="flex-1 flex flex-col space-y-6">
          {/* 1. Drag & Drop Upload Zone Banner */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
              isDraggingOver
                ? 'border-blue-500 bg-blue-50/80 shadow-md scale-[1.005]'
                : 'border-slate-300 hover:border-blue-400 bg-white shadow-2xs hover:bg-slate-50/50'
            }`}
          >
            <div className="max-w-md mx-auto flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-3 shadow-2xs">
                <UploadCloud className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-800">
                Tarik & Lepas Berkas PDF Anda ke Sini
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Atau klik untuk memilih berkas dari komputer. Anda dapat memilih{' '}
                <strong className="text-slate-700 font-semibold">beberapa berkas PDF sekaligus</strong> untuk dibuka dalam multi-tab.
              </p>
              <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-700 rounded-md text-[11px] font-medium">
                <MousePointerClick className="w-3.5 h-3.5 text-blue-600" />
                <span>Klik untuk Jelajahi Berkas PDF</span>
              </div>
            </div>
          </div>

          {/* 2. If there are active open documents in the current session, show them clearly! */}
          {openTabs.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-150 mb-3">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-blue-600" />
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Dokumen yang Sedang Terbuka di Sesi Ini ({openTabs.length})
                  </h3>
                </div>
                <button
                  onClick={onGoToEditor}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                >
                  <span>Buka di Editor</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {openTabs.map((tab) => (
                  <div
                    key={tab.id}
                    onClick={() => {
                      if (onSelectTab) onSelectTab(tab.id);
                      onGoToEditor();
                    }}
                    className={`p-3 rounded-lg border flex items-center justify-between transition-all cursor-pointer group ${
                      tab.id === activeTabId
                        ? 'border-blue-500 bg-blue-50/40 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/80'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <div className="w-7 h-8 rounded border border-red-200 bg-red-50 text-red-600 flex flex-col items-center justify-center shrink-0 shadow-2xs font-mono text-[8px] font-bold">
                        PDF
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-semibold text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                          {tab.name}
                        </h4>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {tab.pages.length} Halaman
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-600 shrink-0 font-medium group-hover:border-blue-400 group-hover:text-blue-600">
                      Buka
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Welcome & Introduction Features Section */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6">
            <div className="max-w-2xl mb-5">
              <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span>Perkenalan Fitur Unggulan PDF Studio</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Aplikasi PDF modern yang dirancang untuk produktivitas dokumen harian Anda tanpa batasan.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Feature 1 */}
              <div className="p-4 rounded-lg bg-slate-50/80 border border-slate-200/80 flex flex-col justify-between">
                <div>
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center mb-2.5">
                    <FolderOpen className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 mb-1">
                    Multi-Tab & Banyak File
                  </h4>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Buka dan kelola banyak berkas PDF secara bersamaan dalam tab terpisah tanpa perlu menutup dokumen sebelumnya.
                  </p>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="p-4 rounded-lg bg-slate-50/80 border border-slate-200/80 flex flex-col justify-between">
                <div>
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center mb-2.5">
                    <ScrollText className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 mb-1">
                    Continuous Vertical Scroll
                  </h4>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Scroll semua halaman ke bawah dengan lancar tanpa harus mengklik tombol ganti halaman satu per satu.
                  </p>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="p-4 rounded-lg bg-slate-50/80 border border-slate-200/80 flex flex-col justify-between">
                <div>
                  <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center mb-2.5">
                    <Edit3 className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 mb-1">
                    Editor & Anotasi Lengkap
                  </h4>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Tambahkan teks bebas, sisipkan gambar, bubuhkan tanda tangan digital, stempel resmi, dan penanda stabilo.
                  </p>
                </div>
              </div>

              {/* Feature 4 */}
              <div className="p-4 rounded-lg bg-slate-50/80 border border-slate-200/80 flex flex-col justify-between">
                <div>
                  <div className="w-8 h-8 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center mb-2.5">
                    <FileText className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 mb-1">
                    Konversi Word (DOCX) Asli
                  </h4>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Ubah berkas PDF menjadi dokumen Microsoft Word (.docx) siap edit dengan struktur paragraf yang rapi.
                  </p>
                </div>
              </div>

              {/* Feature 5 */}
              <div className="p-4 rounded-lg bg-slate-50/80 border border-slate-200/80 flex flex-col justify-between">
                <div>
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2.5">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 mb-1">
                    Konversi Excel (XLSX) Asli
                  </h4>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Ekstrak tabel dan data tabular dari PDF langsung ke file spreadsheet Microsoft Excel (.xlsx).
                  </p>
                </div>
              </div>

              {/* Feature 6 */}
              <div className="p-4 rounded-lg bg-slate-50/80 border border-slate-200/80 flex flex-col justify-between">
                <div>
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center mb-2.5">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 mb-1">
                    100% Aman & Berjalan Lokal
                  </h4>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Pemrosesan dokumen dilakukan langsung di peramban Anda. Dokumen sensitif Anda tetap terjaga kerahasiaannya.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Info Modal */}
      {showInfoModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-5 text-xs space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="font-bold text-sm text-slate-800">Panduan Fitur PDF Studio Pro</span>
              <button
                onClick={() => setShowInfoModal(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <p className="text-slate-600 leading-relaxed">
              PDF Studio Pro dirancang untuk kemudahan pengelolaan dokumen:
            </p>
            <ul className="space-y-2 text-slate-700">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span><strong>Buka Multipel File:</strong> Buka banyak PDF sekaligus dari komputer Anda.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span><strong>Scroll Vertikal Menyeluruh:</strong> Semua halaman PDF otomatis tampil berurutan ke bawah tanpa klik tombol ganti halaman.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span><strong>Edit & Anotasi:</strong> Tambahkan teks, gambar tanda tangan, bentuk, garis, dan highlight.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span><strong>Konversi Nyata:</strong> Unduh berkas .docx dan .xlsx hasil ekstraksi asli.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span><strong>Gabung & Pisah:</strong> Susun ulang, hapus, putar, atau gabungkan beberapa PDF menjadi satu.</span>
              </li>
            </ul>
            <div className="pt-3 border-t flex justify-end">
              <button
                onClick={() => setShowInfoModal(false)}
                className="px-4 py-1.5 bg-blue-600 text-white rounded font-medium cursor-pointer hover:bg-blue-700"
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
