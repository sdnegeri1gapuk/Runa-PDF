import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { PageInfo } from '../types/pdf';

// Configure PDF.js worker
if (typeof window !== 'undefined') {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  } catch (err) {
    console.warn('PDF.js worker initialization notice:', err);
  }
}

/**
 * Load PDF from ArrayBuffer and inspect its pages
 */
export async function loadPdfDocument(data: Uint8Array | ArrayBuffer): Promise<{
  pdfDoc: pdfjsLib.PDFDocumentProxy;
  pages: PageInfo[];
}> {
  // Clone data into a fresh Uint8Array so PDF.js worker does not detach the caller's ArrayBuffer
  const uint8 = data instanceof Uint8Array ? data : new Uint8Array(data);
  const clonedData = uint8.slice();

  const loadingTask = pdfjsLib.getDocument({
    data: clonedData,
    useSystemFonts: true,
  });

  const pdfDoc = await loadingTask.promise;
  const totalPages = pdfDoc.numPages;
  const pages: PageInfo[] = [];

  for (let i = 1; i <= totalPages; i++) {
    const page = await pdfDoc.getPage(i);
    const viewport = page.getViewport({ scale: 1.0 });

    // Extract raw text for search and quick preview
    let extractedText = '';
    try {
      const textContent = await page.getTextContent();
      extractedText = textContent.items
        .map((item: any) => ('str' in item ? item.str : ''))
        .filter(Boolean)
        .join(' ');
    } catch {
      // Ignore text extraction errors on scanned pages
    }

    pages.push({
      pageIndex: i - 1,
      pageNumber: i,
      width: viewport.width,
      height: viewport.height,
      rotation: viewport.rotation,
      extractedText,
    });
  }

  return { pdfDoc, pages };
}

/**
 * Render a single PDF page to an HTML5 Canvas element
 */
export async function renderPdfPageToCanvas(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  scale: number = 1.0,
  rotation: number = 0
): Promise<void> {
  const page = await pdfDoc.getPage(pageNumber);
  const viewport = page.getViewport({ scale, rotation });

  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return;

  canvas.width = viewport.width;
  canvas.height = viewport.height;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({
    canvasContext: ctx,
    viewport,
    canvas: canvas,
  } as any).promise;
}

/**
 * Render a page thumbnail as a data URL
 */
export async function generatePageThumbnail(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  thumbWidth: number = 160
): Promise<string> {
  const page = await pdfDoc.getPage(pageNumber);
  const unscaledViewport = page.getViewport({ scale: 1.0 });
  const scale = thumbWidth / unscaledViewport.width;
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({
    canvasContext: ctx,
    viewport,
    canvas: canvas,
  } as any).promise;

  return canvas.toDataURL('image/jpeg', 0.85);
}

/**
 * Generate a high quality Indonesian business sample PDF (Invoice & Report)
 * for testing editing, text overlays, page manipulation, Word, and Excel conversion.
 */
export async function createSampleDocument(): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const fontHelvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontHelveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Page 1: Laporan Faktur & Penjualan (Tabel Keuangan)
  const page1 = pdfDoc.addPage([595.28, 841.89]); // A4 in points
  const { width: p1W, height: p1H } = page1.getSize();

  // Header
  page1.drawText('PT NUSANTARA KREATIF DIGITAL', {
    x: 50,
    y: p1H - 60,
    size: 16,
    font: fontHelveticaBold,
    color: rgb(0.09, 0.38, 0.74), // Studio Blue
  });

  page1.drawText('FAKTUR PENJUALAN RESMI (INVOICE)', {
    x: 50,
    y: p1H - 82,
    size: 13,
    font: fontHelveticaBold,
    color: rgb(0.12, 0.16, 0.22),
  });

  page1.drawText('No: INV-2026/04/089   |   Tanggal: 18 Oktober 2026   |   Status: LUNAS', {
    x: 50,
    y: p1H - 102,
    size: 10,
    font: fontHelvetica,
    color: rgb(0.35, 0.42, 0.52),
  });

  // Client info
  page1.drawRectangle({
    x: 50,
    y: p1H - 170,
    width: p1W - 100,
    height: 52,
    color: rgb(0.96, 0.97, 0.99),
    borderColor: rgb(0.85, 0.89, 0.94),
    borderWidth: 1,
  });

  page1.drawText('Ditujukan Kepada:', {
    x: 65,
    y: p1H - 135,
    size: 9,
    font: fontHelveticaBold,
    color: rgb(0.2, 0.25, 0.33),
  });
  page1.drawText('Dinas Pendidikan & Kebudayaan Provinsi | Jl. Pemuda No. 45, Jakarta Pusat', {
    x: 65,
    y: p1H - 150,
    size: 9,
    font: fontHelvetica,
    color: rgb(0.35, 0.42, 0.52),
  });

  // Table Header
  const tableY = p1H - 200;
  page1.drawRectangle({
    x: 50,
    y: tableY - 24,
    width: p1W - 100,
    height: 24,
    color: rgb(0.09, 0.38, 0.74),
  });

  page1.drawText('No', { x: 60, y: tableY - 16, size: 9, font: fontHelveticaBold, color: rgb(1, 1, 1) });
  page1.drawText('Deskripsi Layanan / Produk', { x: 100, y: tableY - 16, size: 9, font: fontHelveticaBold, color: rgb(1, 1, 1) });
  page1.drawText('Kuantitas', { x: 330, y: tableY - 16, size: 9, font: fontHelveticaBold, color: rgb(1, 1, 1) });
  page1.drawText('Harga Satuan', { x: 400, y: tableY - 16, size: 9, font: fontHelveticaBold, color: rgb(1, 1, 1) });
  page1.drawText('Total (IDR)', { x: 490, y: tableY - 16, size: 9, font: fontHelveticaBold, color: rgb(1, 1, 1) });

  // Table Rows
  const items = [
    { no: '1', desc: 'Lisensi Perangkat Lunak PDF Studio Enterprise', qty: '12 Unit', price: 'Rp 1.500.000', total: 'Rp 18.000.000' },
    { no: '2', desc: 'Pelatihan Digitalisasi Arsip Dokumen Sekolah', qty: '2 Sesi', price: 'Rp 3.500.000', total: 'Rp 7.000.000' },
    { no: '3', desc: 'Modul Integrasi OCR & Ekstraksi Data Otomatis', qty: '1 Paket', price: 'Rp 5.500.000', total: 'Rp 5.500.000' },
    { no: '4', desc: 'Dukungan Teknis Prioritas 12 Bulan (SLA 99.9%)', qty: '1 Tahun', price: 'Rp 4.000.000', total: 'Rp 4.000.000' },
    { no: '5', desc: 'Konversi Format Dokumen Warisan ke Standar ISO', qty: '500 Hal', price: 'Rp 10.000', total: 'Rp 5.000.000' },
  ];

  let currentY = tableY - 24;
  items.forEach((item, idx) => {
    currentY -= 24;
    // Row background zebra
    if (idx % 2 === 1) {
      page1.drawRectangle({
        x: 50,
        y: currentY,
        width: p1W - 100,
        height: 24,
        color: rgb(0.97, 0.98, 0.99),
      });
    }

    // Border line bottom
    page1.drawLine({
      start: { x: 50, y: currentY },
      end: { x: p1W - 50, y: currentY },
      thickness: 0.5,
      color: rgb(0.85, 0.89, 0.94),
    });

    page1.drawText(item.no, { x: 65, y: currentY + 7, size: 9, font: fontHelvetica, color: rgb(0.2, 0.25, 0.33) });
    page1.drawText(item.desc, { x: 100, y: currentY + 7, size: 9, font: fontHelvetica, color: rgb(0.2, 0.25, 0.33) });
    page1.drawText(item.qty, { x: 335, y: currentY + 7, size: 9, font: fontHelvetica, color: rgb(0.2, 0.25, 0.33) });
    page1.drawText(item.price, { x: 400, y: currentY + 7, size: 9, font: fontHelvetica, color: rgb(0.2, 0.25, 0.33) });
    page1.drawText(item.total, { x: 490, y: currentY + 7, size: 9, font: fontHelveticaBold, color: rgb(0.09, 0.38, 0.74) });
  });

  // Total summary block
  const sumY = currentY - 70;
  page1.drawRectangle({
    x: 320,
    y: sumY,
    width: p1W - 370,
    height: 56,
    color: rgb(0.95, 0.97, 1.0),
    borderColor: rgb(0.75, 0.83, 0.95),
    borderWidth: 1,
  });

  page1.drawText('Subtotal: Rp 34.500.000', { x: 335, y: sumY + 36, size: 9, font: fontHelvetica, color: rgb(0.2, 0.25, 0.33) });
  page1.drawText('PPN 11%: Rp 3.795.000', { x: 335, y: sumY + 22, size: 9, font: fontHelvetica, color: rgb(0.2, 0.25, 0.33) });
  page1.drawText('TOTAL AKHIR: Rp 38.295.000', { x: 335, y: sumY + 8, size: 10, font: fontHelveticaBold, color: rgb(0.09, 0.38, 0.74) });

  // Notes & Signatures
  page1.drawText('Catatan Pembayaran:', { x: 50, y: 150, size: 9, font: fontHelveticaBold, color: rgb(0.2, 0.25, 0.33) });
  page1.drawText('Transfer melalui Bank Mandiri Rek: 123-00-9876543-2 a.n. PT Nusantara Kreatif Digital', { x: 50, y: 135, size: 8.5, font: fontHelvetica, color: rgb(0.35, 0.42, 0.52) });

  page1.drawText('Direktur Utama,', { x: 420, y: 150, size: 9, font: fontHelvetica, color: rgb(0.2, 0.25, 0.33) });
  page1.drawText('Bambang Hernowo, S.Kom., M.T.', { x: 380, y: 80, size: 9, font: fontHelveticaBold, color: rgb(0.12, 0.16, 0.22) });

  // Footer page 1
  page1.drawText('Halaman 1 dari 2 — Dokumen Resmi PDF Studio', {
    x: 50,
    y: 35,
    size: 8,
    font: fontHelvetica,
    color: rgb(0.6, 0.65, 0.72),
  });

  // Page 2: Ringkasan Eksekutif & Narasi Proyek
  const page2 = pdfDoc.addPage([595.28, 841.89]);
  const { width: p2W, height: p2H } = page2.getSize();

  page2.drawText('RINGKASAN EKSEKUTIF PROYEK DIGITALISASI', {
    x: 50,
    y: p2H - 60,
    size: 15,
    font: fontHelveticaBold,
    color: rgb(0.09, 0.38, 0.74),
  });

  page2.drawText('1. Latar Belakang Inisiatif', {
    x: 50,
    y: p2H - 95,
    size: 12,
    font: fontHelveticaBold,
    color: rgb(0.12, 0.16, 0.22),
  });

  const p1Text = [
    'Transformasi digital dalam administrasi arsip sekolah merupakan langkah strategis untuk',
    'meningkatkan transparansi, efisiensi penelusuran data, serta keamanan dokumen kurikulum.',
    'Melalui penerapan PDF Studio, seluruh dokumen fisik dapat dipindai, diindeks dengan OCR,',
    'dan dikonversi ke format yang dapat diedit seperti Microsoft Word dan Excel.',
  ];
  p1Text.forEach((line, idx) => {
    page2.drawText(line, { x: 50, y: p2H - 120 - idx * 16, size: 10, font: fontHelvetica, color: rgb(0.2, 0.25, 0.33) });
  });

  page2.drawText('2. Manfaat & Hasil Kerja', {
    x: 50,
    y: p2H - 200,
    size: 12,
    font: fontHelveticaBold,
    color: rgb(0.12, 0.16, 0.22),
  });

  const benefits = [
    '• Pengurangan waktu pencarian dokumen hingga 85% menggunakan pencarian teks penuh.',
    '• Integritas data terjamin dengan pembubuhan stempel dan tanda tangan digital terverifikasi.',
    '• Konversi otomatis tabel faktur menjadi spreadsheet Microsoft Excel tanpa entri ulang.',
    '• Kompatibilitas multi-perangkat bagi para tenaga pendidik dan staf administrasi.',
  ];
  benefits.forEach((item, idx) => {
    page2.drawText(item, { x: 55, y: p2H - 225 - idx * 20, size: 9.5, font: fontHelvetica, color: rgb(0.2, 0.25, 0.33) });
  });

  // Page 2 Footer
  page2.drawText('Halaman 2 dari 2 — Dokumen Resmi PDF Studio', {
    x: 50,
    y: 35,
    size: 8,
    font: fontHelvetica,
    color: rgb(0.6, 0.65, 0.72),
  });

  return await pdfDoc.save();
}
