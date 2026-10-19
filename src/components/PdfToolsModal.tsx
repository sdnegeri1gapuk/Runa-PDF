import React, { useState } from 'react';
import {
  Layers,
  Scissors,
  Minimize2,
  FileText,
  Stamp,
  Download,
  Plus,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import {
  mergePdfFiles,
  splitOrExtractPages,
  addWatermarkAndPageNumbers,
} from '../services/pdfLibService';

interface PdfToolsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPdfBytes: Uint8Array | null;
  documentName: string;
  totalPages: number;
  onLoadNewPdfBytes: (bytes: Uint8Array, newName: string) => void;
}

type ToolTab = 'merge' | 'split' | 'extract' | 'watermark' | 'compress';

export const PdfToolsModal: React.FC<PdfToolsModalProps> = ({
  isOpen,
  onClose,
  currentPdfBytes,
  documentName,
  totalPages,
  onLoadNewPdfBytes,
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<ToolTab>('watermark');
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Merge state
  const [mergeFiles, setMergeFiles] = useState<{ name: string; bytes: Uint8Array }[]>([]);

  // Split & Extract state
  const [splitRange, setSplitRange] = useState('1');

  // Watermark & Page Numbers state
  const [watermarkText, setWatermarkText] = useState('RAHASIA & CONFIDENTIAL');
  const [enableWatermark, setEnableWatermark] = useState(true);
  const [enablePageNumbers, setEnablePageNumbers] = useState(true);
  const [pageNumberPosition, setPageNumberPosition] = useState<'bottom-center' | 'bottom-right' | 'top-right'>('bottom-center');

  // Compress state
  const [compressLevel, setCompressLevel] = useState<'normal' | 'high'>('normal');

  const handleAddMergeFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result instanceof ArrayBuffer) {
          setMergeFiles((prev) => [
            ...prev,
            { name: file.name, bytes: new Uint8Array(reader.result as ArrayBuffer) },
          ]);
        }
      };
      reader.readAsArrayBuffer(file);
    }
    e.target.value = '';
  };

  const executeMerge = async () => {
    if (!currentPdfBytes && mergeFiles.length === 0) {
      setErrorMessage('Harap tambahkan minimal 2 file PDF untuk digabungkan.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const listToMerge: Uint8Array[] = [];
      if (currentPdfBytes) listToMerge.push(currentPdfBytes);
      mergeFiles.forEach((f) => listToMerge.push(f.bytes));

      const mergedBytes = await mergePdfFiles(listToMerge);
      const newName = `Gabungan_${documentName}`;

      onLoadNewPdfBytes(mergedBytes, newName);
      setSuccessMessage(`Berhasil menggabungkan ${listToMerge.length} berkas PDF!`);
    } catch (err: any) {
      setErrorMessage('Gagal menggabungkan PDF: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const executeSplitOrExtract = async () => {
    if (!currentPdfBytes) {
      setErrorMessage('Tidak ada berkas PDF yang aktif.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      // Parse ranges e.g. "1-2, 4" -> indexes [0, 1, 3]
      const parts = splitRange.split(',').map((s) => s.trim());
      const pageIndexes: number[] = [];

      for (const part of parts) {
        if (part.includes('-')) {
          const [startStr, endStr] = part.split('-');
          const start = parseInt(startStr, 10);
          const end = parseInt(endStr, 10);
          if (!isNaN(start) && !isNaN(end)) {
            for (let p = Math.max(1, start); p <= Math.min(totalPages, end); p++) {
              pageIndexes.push(p - 1);
            }
          }
        } else {
          const p = parseInt(part, 10);
          if (!isNaN(p) && p >= 1 && p <= totalPages) {
            pageIndexes.push(p - 1);
          }
        }
      }

      if (pageIndexes.length === 0) {
        throw new Error('Rentang halaman tidak valid.');
      }

      const extractedBytes = await splitOrExtractPages(currentPdfBytes, pageIndexes);
      const newName = `Ekstrak_${splitRange.replace(/\s+/g, '')}_${documentName}`;

      onLoadNewPdfBytes(extractedBytes, newName);
      setSuccessMessage(`Berhasil mengekstrak ${pageIndexes.length} halaman!`);
    } catch (err: any) {
      setErrorMessage('Gagal memproses halaman: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const executeWatermark = async () => {
    if (!currentPdfBytes) {
      setErrorMessage('Tidak ada berkas PDF yang aktif.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const stampedBytes = await addWatermarkAndPageNumbers(currentPdfBytes, {
        watermarkText: enableWatermark ? watermarkText : undefined,
        addPageNumbers: enablePageNumbers,
        pageNumberPosition,
      });

      onLoadNewPdfBytes(stampedBytes, `Cap_${documentName}`);
      setSuccessMessage('Berhasil menambahkan cap watermark dan nomor halaman!');
    } catch (err: any) {
      setErrorMessage('Gagal menambahkan watermark: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const executeCompress = async () => {
    if (!currentPdfBytes) {
      setErrorMessage('Tidak ada berkas PDF yang aktif.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      // PDF-Lib serialization cleans unreferenced objects and optimizes cross-reference tables
      const { PDFDocument } = await import('pdf-lib');
      const doc = await PDFDocument.load(currentPdfBytes);
      const compressedBytes = await doc.save({ useObjectStreams: true });

      const originalSize = (currentPdfBytes.length / 1024).toFixed(1);
      const newSize = (compressedBytes.length / 1024).toFixed(1);

      onLoadNewPdfBytes(compressedBytes, `Optimum_${documentName}`);
      setSuccessMessage(
        `Dokumen berhasil dioptimasi! Ukuran: ${originalSize} KB → ${newSize} KB.`
      );
    } catch (err: any) {
      setErrorMessage('Gagal mengompres PDF: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden text-xs">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">Alat Manajemen PDF</h2>
              <p className="text-slate-500">
                Operasi lanjutan: Watermark, Penggabungan, Pemisahan, dan Optimasi dokumen.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 px-4 pt-3 border-b border-slate-200 bg-slate-50">
          <button
            onClick={() => setActiveTab('watermark')}
            className={`px-3 py-2 font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'watermark'
                ? 'border-blue-600 text-blue-600 bg-white rounded-t-md'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Stamp className="w-3.5 h-3.5" />
            <span>Watermark & Nomor</span>
          </button>

          <button
            onClick={() => setActiveTab('merge')}
            className={`px-3 py-2 font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'merge'
                ? 'border-blue-600 text-blue-600 bg-white rounded-t-md'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Gabung PDF</span>
          </button>

          <button
            onClick={() => setActiveTab('split')}
            className={`px-3 py-2 font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'split'
                ? 'border-blue-600 text-blue-600 bg-white rounded-t-md'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>Pisah & Ekstrak</span>
          </button>

          <button
            onClick={() => setActiveTab('compress')}
            className={`px-3 py-2 font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'compress'
                ? 'border-blue-600 text-blue-600 bg-white rounded-t-md'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span>Kompresi & Optimasi</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {/* Notification feedback */}
          {successMessage && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Watermark Tab */}
          {activeTab === 'watermark' && (
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-2">
                <label className="flex items-center gap-2 font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    checked={enableWatermark}
                    onChange={(e) => setEnableWatermark(e.target.checked)}
                    className="rounded text-blue-600"
                  />
                  <span>Bubuhkan Teks Watermark (Cap Miring)</span>
                </label>
                {enableWatermark && (
                  <input
                    type="text"
                    value={watermarkText}
                    onChange={(e) => setWatermarkText(e.target.value)}
                    placeholder="Contoh: RAHASIA, DRAF, SALINAN..."
                    className="w-full border border-slate-200 rounded p-1.5 bg-white outline-none focus:border-blue-500"
                  />
                )}
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-2">
                <label className="flex items-center gap-2 font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    checked={enablePageNumbers}
                    onChange={(e) => setEnablePageNumbers(e.target.checked)}
                    className="rounded text-blue-600"
                  />
                  <span>Sertakan Penomoran Halaman Otomatis</span>
                </label>
                {enablePageNumbers && (
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-slate-600">Posisi:</span>
                    <select
                      value={pageNumberPosition}
                      onChange={(e) => setPageNumberPosition(e.target.value as any)}
                      className="border border-slate-200 rounded px-2 py-1 bg-white outline-none"
                    >
                      <option value="bottom-center">Bawah Tengah</option>
                      <option value="bottom-right">Bawah Kanan</option>
                      <option value="top-right">Atas Kanan</option>
                    </select>
                  </div>
                )}
              </div>

              <button
                onClick={executeWatermark}
                disabled={isProcessing}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-lg shadow-xs transition-colors"
              >
                {isProcessing ? 'Menerapkan...' : 'Terapkan ke Seluruh Halaman'}
              </button>
            </div>
          )}

          {/* Merge Tab */}
          {activeTab === 'merge' && (
            <div className="space-y-3">
              <p className="text-slate-600">
                Gabungkan dokumen yang sedang aktif ({documentName}) dengan file PDF lainnya secara berurutan.
              </p>

              <div className="border border-dashed border-slate-300 rounded-lg p-4 text-center bg-slate-50">
                <input
                  type="file"
                  id="merge-file-input"
                  multiple
                  accept="application/pdf"
                  onChange={handleAddMergeFile}
                  className="hidden"
                />
                <label
                  htmlFor="merge-file-input"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg font-medium text-slate-700 cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Pilih Berkas PDF Tambahan</span>
                </label>
              </div>

              {mergeFiles.length > 0 && (
                <div className="space-y-1.5">
                  <span className="font-semibold text-slate-700">Berkas yang akan digabung:</span>
                  <div className="p-2 border border-slate-200 rounded-lg bg-slate-50 flex items-center justify-between text-blue-700 font-medium">
                    <span>1. {documentName} (Dokumen Aktif)</span>
                  </div>
                  {mergeFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="p-2 border border-slate-200 rounded-lg bg-white flex items-center justify-between"
                    >
                      <span>{idx + 2}. {file.name}</span>
                      <button
                        onClick={() =>
                          setMergeFiles((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="text-slate-400 hover:text-red-600 p-1 rounded"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={executeMerge}
                disabled={isProcessing || mergeFiles.length === 0}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-lg shadow-xs transition-colors"
              >
                {isProcessing ? 'Menggabungkan...' : 'Gabungkan PDF Sekarang'}
              </button>
            </div>
          )}

          {/* Split / Extract Tab */}
          {activeTab === 'split' && (
            <div className="space-y-3">
              <p className="text-slate-600">
                Pilih halaman yang ingin disimpan ke dalam berkas PDF baru.
              </p>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Rentang Halaman (Total {totalPages} Halaman):
                </label>
                <input
                  type="text"
                  value={splitRange}
                  onChange={(e) => setSplitRange(e.target.value)}
                  placeholder="Contoh: 1-2 atau 1, 3, 5"
                  className="w-full border border-slate-200 rounded p-2 font-mono outline-none focus:border-blue-500"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Format: pisahkan dengan tanda hubung untuk rentang (1-3) atau koma untuk halaman spesifik (1, 3).
                </span>
              </div>

              <button
                onClick={executeSplitOrExtract}
                disabled={isProcessing}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-lg shadow-xs transition-colors"
              >
                {isProcessing ? 'Mengekstrak...' : 'Ekstrak & Buka Dokumen Baru'}
              </button>
            </div>
          )}

          {/* Compress Tab */}
          {activeTab === 'compress' && (
            <div className="space-y-3">
              <p className="text-slate-600">
                Optimalkan struktur internal berkas PDF, bersihkan elemen yang tidak digunakan, dan kompres metadata.
              </p>

              <button
                onClick={executeCompress}
                disabled={isProcessing}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-lg shadow-xs transition-colors"
              >
                {isProcessing ? 'Mengompresi...' : 'Kompres & Optimalkan PDF'}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 rounded-md transition-colors"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};
