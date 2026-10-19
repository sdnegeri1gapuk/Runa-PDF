import { DocumentStructureElement, TableStructure } from '../types/pdf';

export interface OcrResult {
  isScanned: boolean;
  fullText: string;
  elements: DocumentStructureElement[];
}

export interface TableDetectionResult {
  tablesFound: boolean;
  message?: string;
  tables: TableStructure[];
}

/**
 * Call the server-side Gemini OCR endpoint
 */
export async function performServerOcr(imageBase64: string): Promise<OcrResult> {
  const response = await fetch('/api/ocr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imageBase64,
      language: 'Indonesian',
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Koneksi ke server OCR gagal' }));
    throw new Error(err.error || `Server OCR Error (${response.status})`);
  }

  const result = await response.json();
  return result.data;
}

/**
 * Call the server-side Gemini table detection endpoint
 */
export async function detectTablesWithServer(
  imageBase64?: string,
  textContent?: string
): Promise<TableDetectionResult> {
  const response = await fetch('/api/detect-tables', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imageBase64,
      textContent,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Deteksi tabel gagal' }));
    throw new Error(err.error || `Table Detection Error (${response.status})`);
  }

  const result = await response.json();
  return result.data;
}

/**
 * Fast client-side rule-based table and structure detector for native PDF text
 */
export function extractClientDocumentStructure(rawText: string): {
  elements: DocumentStructureElement[];
  tables: TableStructure[];
} {
  const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
  const elements: DocumentStructureElement[] = [];
  const detectedTables: TableStructure[] = [];

  let currentParagraph = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect bullet or numbered lists
    if (/^[•\-\*]\s+/.test(line) || /^\d+[\.\)]\s+/.test(line)) {
      if (currentParagraph) {
        elements.push({ type: 'paragraph', content: currentParagraph });
        currentParagraph = '';
      }
      elements.push({ type: 'list_item', content: line });
      continue;
    }

    // Detect all-caps or short heading-like lines
    if (
      line.length < 60 &&
      (line === line.toUpperCase() && /[A-Z]/.test(line) || /^(bab|pasal|bagian|lampiran)\s+/i.test(line))
    ) {
      if (currentParagraph) {
        elements.push({ type: 'paragraph', content: currentParagraph });
        currentParagraph = '';
      }
      elements.push({
        type: line.length < 35 ? 'heading_1' : 'heading_2',
        content: line,
      });
      continue;
    }

    // Detect table-like lines with delimiters (tabs, multiple spaces, pipes)
    const delimiterSplit = line.split(/(\t|\s{3,}|\s*\|\s*)/).filter((s) => s.trim().length > 0 && s !== '|');
    if (delimiterSplit.length >= 3) {
      // Looks like a table row!
      if (currentParagraph) {
        elements.push({ type: 'paragraph', content: currentParagraph });
        currentParagraph = '';
      }

      // Collect contiguous table rows
      const tableRows: string[][] = [delimiterSplit];
      let j = i + 1;
      while (j < lines.length) {
        const nextLine = lines[j];
        const nextCols = nextLine.split(/(\t|\s{3,}|\s*\|\s*)/).filter((s) => s.trim().length > 0 && s !== '|');
        if (nextCols.length >= 2) {
          tableRows.push(nextCols);
          j++;
        } else {
          break;
        }
      }

      if (tableRows.length >= 2) {
        // We found a table!
        const headers = tableRows[0];
        const dataRows = tableRows.slice(1);
        const tableName = `Tabel ${detectedTables.length + 1}`;
        detectedTables.push({
          name: tableName,
          headers,
          rows: dataRows,
        });
        elements.push({
          type: 'table',
          content: tableName,
          tableData: tableRows,
        });
        i = j - 1; // Advance loop
        continue;
      }
    }

    // Regular paragraph continuation
    if (currentParagraph) {
      currentParagraph += ' ' + line;
    } else {
      currentParagraph = line;
    }
  }

  if (currentParagraph) {
    elements.push({ type: 'paragraph', content: currentParagraph });
  }

  return { elements, tables: detectedTables };
}
