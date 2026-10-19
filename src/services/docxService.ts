import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
} from 'docx';
import { DocumentStructureElement } from '../types/pdf';

export interface DocxGenerationOptions {
  title?: string;
  creator?: string;
  elements: DocumentStructureElement[];
}

/**
 * Generates a genuine Microsoft Word (.docx) file from extracted PDF elements and returns a Blob
 */
export async function generateDocxBlob(options: DocxGenerationOptions): Promise<Blob> {
  const docChildren: (Paragraph | Table)[] = [];

  // Title paragraph
  if (options.title) {
    docChildren.push(
      new Paragraph({
        text: options.title,
        heading: HeadingLevel.TITLE,
        spacing: { after: 300 },
      })
    );
  }

  for (const el of options.elements) {
    if (el.type === 'heading_1') {
      docChildren.push(
        new Paragraph({
          text: el.content,
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 240, after: 120 },
        })
      );
    } else if (el.type === 'heading_2') {
      docChildren.push(
        new Paragraph({
          text: el.content,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 180, after: 80 },
        })
      );
    } else if (el.type === 'list_item') {
      docChildren.push(
        new Paragraph({
          bullet: { level: 0 },
          children: [new TextRun({ text: el.content.replace(/^[•\-\*]\s*/, '') })],
          spacing: { after: 80 },
        })
      );
    } else if (el.type === 'table' && el.tableData && el.tableData.length > 0) {
      // Build a genuine Word Table with headers and borders
      const rows = el.tableData.map((rowCells, rowIdx) => {
        const isHeader = rowIdx === 0;
        return new TableRow({
          tableHeader: isHeader,
          children: rowCells.map((cellText) => {
            return new TableCell({
              width: {
                size: Math.floor(100 / Math.max(1, rowCells.length)),
                type: WidthType.PERCENTAGE,
              },
              shading: isHeader
                ? { fill: 'E2E8F0' } // Light slate header background
                : rowIdx % 2 === 1
                ? { fill: 'F8FAFC' }
                : undefined,
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: cellText.trim(),
                      bold: isHeader,
                      size: isHeader ? 20 : 19, // 10pt / 9.5pt in half-points
                    }),
                  ],
                  spacing: { before: 80, after: 80 },
                }),
              ],
            });
          }),
        });
      });

      docChildren.push(
        new Table({
          rows,
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
            left: { style: BorderStyle.NONE },
            right: { style: BorderStyle.NONE },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' },
            insideVertical: { style: BorderStyle.NONE },
          },
        })
      );

      // Spacer after table
      docChildren.push(
        new Paragraph({
          spacing: { after: 200 },
        })
      );
    } else {
      // Standard paragraph
      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: el.content,
              size: 22, // 11pt
            }),
          ],
          spacing: { after: 140, line: 280 },
        })
      );
    }
  }

  const doc = new Document({
    creator: options.creator || 'PDF Studio',
    title: options.title || 'Dokumen Dikonversi',
    description: 'Dikonversi secara otomatis oleh PDF Studio dengan pemeliharaan tata letak.',
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440, // 1 inch in twips
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children: docChildren,
      },
    ],
  });

  return await Packer.toBlob(doc);
}
