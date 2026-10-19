import * as XLSX from 'xlsx';
import { TableStructure } from '../types/pdf';

/**
 * Clean cell values: detect numbers, percentages, or keep as formatted text
 */
function parseCellValue(val: string): string | number {
  if (typeof val !== 'string') return val;
  const trimmed = val.trim();
  if (!trimmed) return '';

  // Check Indonesian currency format e.g. "Rp 1.500.000" or "$ 120.50"
  const cleanCurrency = trimmed.replace(/^(Rp|\$|€|¥)\s*/i, '').replace(/\./g, '').replace(/,/g, '.');
  if (/^-?\d+(\.\d+)?$/.test(cleanCurrency) && cleanCurrency.length > 0) {
    // Keep as number if valid
    const num = Number(cleanCurrency);
    if (!isNaN(num) && cleanCurrency.length < 15) {
      return num;
    }
  }

  // Check pure numeric integer or float
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    const num = Number(trimmed);
    if (!isNaN(num)) return num;
  }

  return trimmed;
}

/**
 * Generate a genuine Microsoft Excel (.xlsx) file with multiple worksheets
 */
export function generateXlsxBlob(tables: TableStructure[]): Blob {
  const wb = XLSX.utils.book_new();

  if (!tables || tables.length === 0) {
    // Fallback sheet
    const ws = XLSX.utils.aoa_to_sheet([['Data Dokumen'], ['Tidak ada tabel terstruktur yang terdeteksi.']]);
    XLSX.utils.book_append_sheet(wb, ws, 'Ringkasan');
  } else {
    tables.forEach((table, idx) => {
      // Build 2D array: headers as row 0, then table rows
      const sheetData: (string | number)[][] = [];

      if (table.headers && table.headers.length > 0) {
        sheetData.push(table.headers);
      }

      if (table.rows && table.rows.length > 0) {
        for (const row of table.rows) {
          sheetData.push(row.map(parseCellValue));
        }
      }

      const ws = XLSX.utils.aoa_to_sheet(sheetData);

      // Auto-calculate column widths
      const colWidths = (table.headers || []).map((h, colIdx) => {
        let maxLen = h.length;
        for (const row of table.rows || []) {
          const cellStr = String(row[colIdx] || '');
          if (cellStr.length > maxLen) {
            maxLen = Math.min(50, cellStr.length);
          }
        }
        return { wch: Math.max(12, maxLen + 3) };
      });
      ws['!cols'] = colWidths;

      // Safe sheet name (Excel limits sheet names to 31 chars and bans \ / ? * : [ ])
      let safeSheetName = (table.name || `Tabel ${idx + 1}`)
        .replace(/[\\/?*:[\]]/g, '')
        .trim()
        .substring(0, 31);
      if (!safeSheetName) safeSheetName = `Tabel ${idx + 1}`;

      // Avoid duplicate sheet names
      if (wb.SheetNames.includes(safeSheetName)) {
        safeSheetName = `${safeSheetName.substring(0, 28)} (${idx + 1})`;
      }

      XLSX.utils.book_append_sheet(wb, ws, safeSheetName);
    });
  }

  const wbOut = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbOut], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
