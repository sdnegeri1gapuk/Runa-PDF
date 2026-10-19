import React, { useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
  FileText,
  Download,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  X,
  Eye,
  Settings2,
} from 'lucide-react';
import { DocumentStructureElement } from '../types/pdf';
import { generateDocxBlob } from '../services/docxService';
import { extractClientDocumentStructure, performServerOcr } from '../services/ocrService';
import { renderPdfPageToCanvas } from '../services/pdfService';

interface WordConverterModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfDoc: pdfjsLib.PDFDocumentProxy | null;
  documentName: string;
}

export const WordConverterModal: React.FC<WordConverterModalProps> = ({
  isOpen,
  onClose,
  pdfDoc,
  documentName,
}) => {
  if (!isOpen) return null;

  const [useOcr, setUseOcr] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [conversionProgress, setConversionProgress] = useState(0);
  const [progressStatus, setProgressStatus] = useState('');
  const [extractedElements, setExtractedElements] = useState<DocumentStructureElement[]>([]);
  const [conversionCompleted, setConversionCompleted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const startConversion = async () => {
    if (!pdfDoc) {
      setErrorMessage('Tidak ada dokumen PDF aktif.');
      return;
    }

    setIsConverting(true);
    setConversionProgress(10);
    setProgressStatus('Mengekstrak teks dan struktur halaman...');
    setErrorMessage(null);
    setConversionCompleted(false);

    try {
      const allElements: DocumentStructureElement[] = [];
      const numPages = pdfDoc.numPages;

      for (let i = 1; i <= numPages; i++) {
        setConversionProgress(Math.round((i / numPages) * 70));
        setProgressStatus(`Memproses halaman ${i} dari ${numPages}...`);

        const page = await pdfDoc.getPage(i);
        const textContent = await page.getTextContent();
        const rawText = textContent.items
          .map((item: any) => ('str' in item ? item.str : ''))
          .filter(Boolean)
          .join('\n');

        // Check if page appears scanned or empty
        const isPageScanned = rawText.trim().length < 50;

        if (useOcr || isPageScanned) {
          setProgressStatus(`Menjalankan OCR cerdas pada halaman ${i}...`);
          // Render page to canvas to get base64 image
          const tempCanvas = document.createElement('canvas');
          await renderPdfPageToCanvas(pdfDoc, i, tempCanvas, 1.5);
          const imageBase64 = tempCanvas.toDataURL('image/png');

          try {
            const ocrResult = await performServerOcr(imageBase64);
            if (ocrResult.elements && ocrResult.elements.length > 0) {
              allElements.push(...ocrResult.elements);
            } else {
              const fallback = extractClientDocumentStructure(ocrResult.fullText || rawText);
              allElements.push(...fallback.elements);
            }
          } catch (ocrErr: any) {
            console.warn('OCR error, falling back to client structure:', ocrErr);
            const fallback = extractClientDocumentStructure(rawText);
            allElements.push(...fallback.elements);
          }
        } else {
          // Native digital text extraction
          const { elements } = extractClientDocumentStructure(rawText);
          allElements.push(...elements);
        }
      }

      setConversionProgress(90);
      setProgressStatus('Menyusun tata letak dokumen Word (.docx)...');

      setExtractedElements(allElements);
      setConversionProgress(100);
      setConversionCompleted(true);
      setProgressStatus('Konversi selesai! Dokumen Word siap diunduh.');
    } catch (err: any) {
      console.error('Word conversion error:', err);
      setErrorMessage(err.message || 'Gagal mengonversi dokumen ke Word.');
    } finally {
      setIsConverting(false);
    }
  };

  const handleDownloadDocx = async () => {
    try {
      const cleanTitle = documentName.replace(/\.pdf$/i, '');
      const docxBlob = await generateDocxBlob({
        title: cleanTitle,
        creator: 'PDF Studio Pro',
        elements: extractedElements,
      });

      const url = URL.createObjectURL(docxBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${cleanTitle}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Download error:', err);
      setErrorMessage('Gagal membuat berkas DOCX: ' + err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">
                Konversi PDF ke Microsoft Word (.docx)
              </h2>
              <p className="text-xs text-slate-500">
                Ubah PDF menjadi berkas DOCX yang dapat diedit dengan mempertahankan paragraf dan tabel.
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

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4 text-xs">
          {/* Options Card */}
          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-slate-600" />
                <span className="font-semibold text-slate-700">Opsi Rekonstruksi Dokumen</span>
              </div>
            </div>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={useOcr}
                onChange={(e) => setUseOcr(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="font-medium text-slate-800 flex items-center gap-1">
                  Gunakan OCR Cerdas Gemini (Rekomendasi untuk dokumen pindaian/scan)
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-normal">
                  Mendeteksi teks dari gambar atau dokumen hasil foto, serta menata ulang judul dan tabel secara otomatis.
                </p>
              </div>
            </label>
          </div>

          {/* Progress bar */}
          {isConverting && (
            <div className="space-y-1.5 p-3 rounded-lg bg-blue-50 border border-blue-100">
              <div className="flex items-center justify-between text-xs text-blue-800 font-medium">
                <span>{progressStatus}</span>
                <span className="font-mono tabular-nums">{conversionProgress}%</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-blue-600 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${conversionProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-start gap-2 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Extracted Preview Section */}
          {conversionCompleted && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Pratinjau Struktur Elemen Word ({extractedElements.length} blok terdeteksi):
                </span>
              </div>

              <div className="max-h-52 overflow-y-auto border border-slate-200 rounded-lg p-3 bg-white space-y-2 text-slate-700">
                {extractedElements.slice(0, 15).map((el, idx) => (
                  <div key={idx} className="pb-1.5 border-b border-slate-100 last:border-0">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wide mr-2">
                      [{el.type}]
                    </span>
                    {el.type === 'table' && el.tableData ? (
                      <div className="text-[11px] text-blue-700 font-medium mt-1">
                        Tabel: {el.tableData.length} baris × {el.tableData[0]?.length || 0} kolom
                      </div>
                    ) : (
                      <span className="text-xs">{el.content}</span>
                    )}
                  </div>
                ))}
                {extractedElements.length > 15 && (
                  <p className="text-[11px] text-slate-400 text-center pt-1 italic">
                    dan {extractedElements.length - 15} elemen lainnya...
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            Tutup
          </button>

          <div className="flex items-center gap-2">
            {!conversionCompleted ? (
              <button
                onClick={startConversion}
                disabled={isConverting}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg shadow-xs transition-colors"
              >
                {isConverting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-3.5 h-3.5" />
                    <span>Mulai Konversi Word</span>
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleDownloadDocx}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh Dokumen Word (.docx)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
