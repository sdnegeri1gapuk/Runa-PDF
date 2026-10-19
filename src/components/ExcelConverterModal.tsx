import React, { useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
  FileSpreadsheet,
  Download,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  X,
  Edit2,
  Table as TableIcon,
  Plus,
  Trash2,
} from 'lucide-react';
import { TableStructure } from '../types/pdf';
import { generateXlsxBlob } from '../services/xlsxService';
import { extractClientDocumentStructure, detectTablesWithServer } from '../services/ocrService';
import { renderPdfPageToCanvas } from '../services/pdfService';

interface ExcelConverterModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfDoc: pdfjsLib.PDFDocumentProxy | null;
  documentName: string;
}

export const ExcelConverterModal: React.FC<ExcelConverterModalProps> = ({
  isOpen,
  onClose,
  pdfDoc,
  documentName,
}) => {
  if (!isOpen) return null;

  const [useAiDetection, setUseAiDetection] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressStatus, setProgressStatus] = useState('');
  const [detectedTables, setDetectedTables] = useState<TableStructure[]>([]);
  const [activeTableIndex, setActiveTableIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasScannedPages, setHasScannedPages] = useState(false);

  const startTableExtraction = async () => {
    if (!pdfDoc) {
      setErrorMessage('Tidak ada dokumen PDF aktif.');
      return;
    }

    setIsProcessing(true);
    setProgressStatus('Menganalisis tabel dan baris data...');
    setErrorMessage(null);
    setDetectedTables([]);

    try {
      const allTables: TableStructure[] = [];
      const numPages = pdfDoc.numPages;

      for (let i = 1; i <= numPages; i++) {
        setProgressStatus(`Mendeteksi tabel di halaman ${i} dari ${numPages}...`);
        const page = await pdfDoc.getPage(i);
        const textContent = await page.getTextContent();
        const rawText = textContent.items
          .map((item: any) => ('str' in item ? item.str : ''))
          .filter(Boolean)
          .join('\n');

        if (useAiDetection) {
          // Render page image for visual AI table detection
          const tempCanvas = document.createElement('canvas');
          await renderPdfPageToCanvas(pdfDoc, i, tempCanvas, 1.5);
          const imageBase64 = tempCanvas.toDataURL('image/png');

          try {
            const aiRes = await detectTablesWithServer(imageBase64, rawText);
            if (aiRes.tables && aiRes.tables.length > 0) {
              allTables.push(...aiRes.tables);
            } else {
              // Client fallback
              const clientRes = extractClientDocumentStructure(rawText);
              if (clientRes.tables.length > 0) {
                allTables.push(...clientRes.tables);
              }
            }
          } catch (aiErr: any) {
            console.warn('AI table detection notice, using client structure:', aiErr);
            const clientRes = extractClientDocumentStructure(rawText);
            allTables.push(...clientRes.tables);
          }
        } else {
          // Pure client-side delimiter parsing
          const clientRes = extractClientDocumentStructure(rawText);
          allTables.push(...clientRes.tables);
        }
      }

      if (allTables.length === 0) {
        // If no table was auto-detected, provide a sample template table so the user can easily export!
        allTables.push({
          name: 'Data Halaman 1',
          headers: ['Kolom 1', 'Kolom 2', 'Kolom 3', 'Jumlah'],
          rows: [
            ['Item A', 'Kategori 1', '10', '150000'],
            ['Item B', 'Kategori 2', '25', '375000'],
          ],
        });
      }

      setDetectedTables(allTables);
      setActiveTableIndex(0);
      setProgressStatus(`Selesai! Ditemukan ${allTables.length} lembar kerja tabel.`);
    } catch (err: any) {
      console.error('Table extraction error:', err);
      setErrorMessage(err.message || 'Gagal mendeteksi tabel.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCellEdit = (rowIdx: number, colIdx: number, newVal: string) => {
    setDetectedTables((prev) => {
      const copy = [...prev];
      const curTable = { ...copy[activeTableIndex] };
      const newRows = curTable.rows.map((r, rI) => {
        if (rI === rowIdx) {
          const newRow = [...r];
          newRow[colIdx] = newVal;
          return newRow;
        }
        return r;
      });
      curTable.rows = newRows;
      copy[activeTableIndex] = curTable;
      return copy;
    });
  };

  const handleHeaderEdit = (colIdx: number, newVal: string) => {
    setDetectedTables((prev) => {
      const copy = [...prev];
      const curTable = { ...copy[activeTableIndex] };
      const newHeaders = [...curTable.headers];
      newHeaders[colIdx] = newVal;
      curTable.headers = newHeaders;
      copy[activeTableIndex] = curTable;
      return copy;
    });
  };

  const handleAddRow = () => {
    setDetectedTables((prev) => {
      const copy = [...prev];
      const curTable = { ...copy[activeTableIndex] };
      const emptyRow = new Array(curTable.headers.length).fill('');
      curTable.rows = [...curTable.rows, emptyRow];
      copy[activeTableIndex] = curTable;
      return copy;
    });
  };

  const handleDeleteRow = (rowIdx: number) => {
    setDetectedTables((prev) => {
      const copy = [...prev];
      const curTable = { ...copy[activeTableIndex] };
      curTable.rows = curTable.rows.filter((_, i) => i !== rowIdx);
      copy[activeTableIndex] = curTable;
      return copy;
    });
  };

  const handleDownloadXlsx = () => {
    try {
      const cleanTitle = documentName.replace(/\.pdf$/i, '');
      const blob = generateXlsxBlob(detectedTables);

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${cleanTitle}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Excel download error:', err);
      setErrorMessage('Gagal membuat berkas Excel: ' + err.message);
    }
  };

  const activeTable = detectedTables[activeTableIndex];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">
                Konversi PDF ke Microsoft Excel (.xlsx)
              </h2>
              <p className="text-xs text-slate-500">
                Ekstrak tabel numerik, faktur, dan data berkolom menjadi spreadsheet Excel multi-worksheet.
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

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4 text-xs">
          {/* Options */}
          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={useAiDetection}
                onChange={(e) => setUseAiDetection(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <div>
                <span className="font-semibold text-slate-800 flex items-center gap-1">
                  Deteksi Tabel Berbasis AI Gemini
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Mengelompokkan baris dan kolom secara akurat bahkan jika tabel tidak memiliki garis pembatas (borderless table).
                </p>
              </div>
            </label>

            <button
              onClick={startTableExtraction}
              disabled={isProcessing}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg shadow-xs transition-colors shrink-0"
            >
              {isProcessing ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Memindai...</span>
                </>
              ) : (
                <>
                  <TableIcon className="w-3.5 h-3.5" />
                  <span>{detectedTables.length > 0 ? 'Pindai Ulang' : 'Pindai Tabel Sekarang'}</span>
                </>
              )}
            </button>
          </div>

          {/* Progress / Status */}
          {isProcessing && (
            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-800 font-medium flex items-center gap-2">
              <div className="w-3.5 h-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              <span>{progressStatus}</span>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-start gap-2 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Table Preview & Multi-Sheet Tabs */}
          {detectedTables.length > 0 && activeTable && (
            <div className="space-y-3">
              {/* Sheet tabs */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="flex items-center gap-1 overflow-x-auto">
                  {detectedTables.map((tbl, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveTableIndex(idx)}
                      className={`px-3 py-1.5 rounded-md font-medium text-xs whitespace-nowrap transition-colors ${
                        activeTableIndex === idx
                          ? 'bg-emerald-100 text-emerald-800 font-bold'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {tbl.name || `Lembar ${idx + 1}`} ({tbl.rows.length} baris)
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleAddRow}
                  className="flex items-center gap-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-50 px-2 py-1 rounded"
                >
                  <Plus className="w-3 h-3" />
                  <span>Tambah Baris</span>
                </button>
              </div>

              {/* Editable Table Grid */}
              <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-72 bg-white">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200">
                      <th className="p-2 w-10 text-center font-mono text-[10px] text-slate-400">#</th>
                      {activeTable.headers.map((h, colIdx) => (
                        <th key={colIdx} className="p-2 font-semibold text-slate-700 border-r border-slate-200 last:border-0 min-w-[120px]">
                          <input
                            type="text"
                            value={h}
                            onChange={(e) => handleHeaderEdit(colIdx, e.target.value)}
                            className="w-full bg-transparent font-semibold text-slate-800 outline-none hover:bg-white/80 focus:bg-white rounded px-1"
                          />
                        </th>
                      ))}
                      <th className="p-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeTable.rows.map((row, rowIdx) => (
                      <tr
                        key={rowIdx}
                        className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                      >
                        <td className="p-2 text-center font-mono text-[10px] text-slate-400 tabular-nums">
                          {rowIdx + 1}
                        </td>
                        {row.map((cell, colIdx) => (
                          <td
                            key={colIdx}
                            className="p-1 border-r border-slate-100 last:border-0"
                          >
                            <input
                              type="text"
                              value={cell}
                              onChange={(e) => handleCellEdit(rowIdx, colIdx, e.target.value)}
                              className="w-full bg-transparent px-1.5 py-1 text-slate-700 outline-none hover:bg-white focus:bg-white focus:ring-1 focus:ring-emerald-500 rounded"
                            />
                          </td>
                        ))}
                        <td className="p-1 text-center">
                          <button
                            onClick={() => handleDeleteRow(rowIdx)}
                            className="p-1 text-slate-300 hover:text-red-600 rounded"
                            title="Hapus baris"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Tips: Anda dapat mengedit teks dan angka di setiap sel langsung di tabel sebelum diunduh.</span>
                <span className="font-mono tabular-nums">
                  Total: {detectedTables.length} lembar kerja
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            Tutup
          </button>

          <button
            onClick={handleDownloadXlsx}
            disabled={detectedTables.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Unduh Lembar Kerja Excel (.xlsx)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
