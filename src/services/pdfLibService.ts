import {
  PDFDocument,
  rgb,
  StandardFonts,
  degrees,
  PDFPage,
} from 'pdf-lib';
import { CanvasObject, TextObject, ImageObject, ShapeObject, WhiteoutObject, DrawingObject } from '../types/pdf';

/**
 * Convert hex color string (#RRGGBB) to pdf-lib rgb(r, g, b)
 */
function hexToRgbColor(hex: string, defaultRgb = rgb(0, 0, 0)) {
  if (!hex || hex === 'transparent') return defaultRgb;
  const clean = hex.replace('#', '');
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16) / 255;
    const g = parseInt(clean[1] + clean[1], 16) / 255;
    const b = parseInt(clean[2] + clean[2], 16) / 255;
    return rgb(r, g, b);
  }
  if (clean.length === 6) {
    const r = parseInt(clean.substring(0, 2), 16) / 255;
    const g = parseInt(clean.substring(2, 4), 16) / 255;
    const b = parseInt(clean.substring(4, 6), 16) / 255;
    return rgb(r, g, b);
  }
  return defaultRgb;
}

/**
 * Embed canvas objects (text, image, shapes, drawings, whiteout) into an existing PDF
 * and return the modified PDF Uint8Array bytes.
 */
export async function exportEditedPdf(
  originalPdfBytes: Uint8Array,
  objects: CanvasObject[]
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(originalPdfBytes);
  const totalPages = pdfDoc.getPageCount();

  // Pre-load standard fonts
  const fontHelvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontHelveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontTimes = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const fontTimesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const fontCourier = await pdfDoc.embedFont(StandardFonts.Courier);
  const fontCourierBold = await pdfDoc.embedFont(StandardFonts.CourierBold);

  const getFont = (family?: string, isBold?: boolean) => {
    if (family === 'Times') return isBold ? fontTimesBold : fontTimes;
    if (family === 'Courier') return isBold ? fontCourierBold : fontCourier;
    return isBold ? fontHelveticaBold : fontHelvetica;
  };

  for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
    const page = pdfDoc.getPage(pageIdx);
    const { width: pageW, height: pageH } = page.getSize();
    const pageObjects = objects.filter((o) => o.pageIndex === pageIdx);

    for (const obj of pageObjects) {
      // PDF Coordinate system: (0,0) is bottom-left, canvas (0,0) is top-left
      // obj.y is top edge in canvas, so in PDF: pdfY = pageH - obj.y - obj.height
      const pdfX = obj.x;
      const pdfY = pageH - obj.y - obj.height;

      if (obj.type === 'whiteout') {
        const whiteout = obj as WhiteoutObject;
        page.drawRectangle({
          x: pdfX,
          y: pdfY,
          width: whiteout.width,
          height: whiteout.height,
          color: hexToRgbColor(whiteout.fillColor || '#ffffff', rgb(1, 1, 1)),
          opacity: whiteout.opacity ?? 1,
        });

        if (whiteout.replacementText) {
          const font = fontHelvetica;
          const fontSize = whiteout.replacementFontSize || 12;
          page.drawText(whiteout.replacementText, {
            x: pdfX + 4,
            y: pdfY + (whiteout.height - fontSize) / 2 + 2,
            size: fontSize,
            font,
            color: hexToRgbColor(whiteout.replacementColor || '#000000'),
          });
        }
      } else if (obj.type === 'image') {
        const imgObj = obj as ImageObject;
        try {
          let embeddedImage;
          if (imgObj.src.startsWith('data:image/png')) {
            const base64Data = imgObj.src.replace(/^data:image\/png;base64,/, '');
            const bytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
            embeddedImage = await pdfDoc.embedPng(bytes);
          } else {
            // JPEG or WebP converted to JPEG data URL
            const cleanBase64 = imgObj.src.replace(/^data:image\/\w+;base64,/, '');
            const bytes = Uint8Array.from(atob(cleanBase64), (c) => c.charCodeAt(0));
            embeddedImage = await pdfDoc.embedJpg(bytes);
          }

          if (embeddedImage) {
            page.drawImage(embeddedImage, {
              x: pdfX,
              y: pdfY,
              width: imgObj.width,
              height: imgObj.height,
              opacity: imgObj.opacity ?? 1,
              rotate: degrees(imgObj.rotation || 0),
            });
          }
        } catch (err) {
          console.error('Failed to embed image in PDF export:', err);
        }
      } else if (obj.type === 'text') {
        const textObj = obj as TextObject;
        const font = getFont(textObj.fontFamily, textObj.isBold);
        const fontSize = textObj.fontSize || 12;

        if (textObj.backgroundColor && textObj.backgroundColor !== 'transparent') {
          page.drawRectangle({
            x: pdfX,
            y: pdfY,
            width: textObj.width,
            height: textObj.height,
            color: hexToRgbColor(textObj.backgroundColor),
            opacity: textObj.opacity ?? 1,
          });
        }

        // Multiline text handling
        const lines = (textObj.text || '').split('\n');
        const lineHeight = fontSize * 1.25;
        let lineY = pdfY + textObj.height - fontSize;

        for (const line of lines) {
          if (!line) {
            lineY -= lineHeight;
            continue;
          }
          let lineX = pdfX;
          if (textObj.textAlign === 'center') {
            const lineWidth = font.widthOfTextAtSize(line, fontSize);
            lineX = pdfX + Math.max(0, (textObj.width - lineWidth) / 2);
          } else if (textObj.textAlign === 'right') {
            const lineWidth = font.widthOfTextAtSize(line, fontSize);
            lineX = pdfX + Math.max(0, textObj.width - lineWidth);
          }

          page.drawText(line, {
            x: lineX,
            y: lineY,
            size: fontSize,
            font,
            color: hexToRgbColor(textObj.color || '#000000'),
            opacity: textObj.opacity ?? 1,
            rotate: degrees(textObj.rotation || 0),
          });

          lineY -= lineHeight;
        }
      } else if (obj.type === 'rect') {
        const shape = obj as ShapeObject;
        const hasFill = shape.fillColor && shape.fillColor !== 'transparent';
        page.drawRectangle({
          x: pdfX,
          y: pdfY,
          width: shape.width,
          height: shape.height,
          color: hasFill ? hexToRgbColor(shape.fillColor) : undefined,
          borderColor: shape.strokeWidth > 0 ? hexToRgbColor(shape.strokeColor) : undefined,
          borderWidth: shape.strokeWidth || 0,
          opacity: shape.opacity ?? 1,
          rotate: degrees(shape.rotation || 0),
        });
      } else if (obj.type === 'circle') {
        const shape = obj as ShapeObject;
        const hasFill = shape.fillColor && shape.fillColor !== 'transparent';
        const xRadius = shape.width / 2;
        const yRadius = shape.height / 2;
        page.drawEllipse({
          x: pdfX + xRadius,
          y: pdfY + yRadius,
          xScale: xRadius,
          yScale: yRadius,
          color: hasFill ? hexToRgbColor(shape.fillColor) : undefined,
          borderColor: shape.strokeWidth > 0 ? hexToRgbColor(shape.strokeColor) : undefined,
          borderWidth: shape.strokeWidth || 0,
          opacity: shape.opacity ?? 1,
        });
      } else if (obj.type === 'line' || obj.type === 'arrow') {
        const shape = obj as ShapeObject;
        page.drawLine({
          start: { x: pdfX, y: pdfY + shape.height },
          end: { x: pdfX + shape.width, y: pdfY },
          thickness: shape.strokeWidth || 2,
          color: hexToRgbColor(shape.strokeColor || '#000000'),
          opacity: shape.opacity ?? 1,
        });
        if (obj.type === 'arrow') {
          // Draw small arrow head
          const endX = pdfX + shape.width;
          const endY = pdfY;
          page.drawCircle({
            x: endX,
            y: endY,
            size: (shape.strokeWidth || 2) * 1.5,
            color: hexToRgbColor(shape.strokeColor || '#000000'),
            opacity: shape.opacity ?? 1,
          });
        }
      } else if (obj.type === 'draw' || obj.type === 'highlight') {
        const drawObj = obj as DrawingObject;
        if (drawObj.points && drawObj.points.length > 1) {
          const isHighlight = drawObj.type === 'highlight';
          const strokeCol = hexToRgbColor(drawObj.strokeColor || '#facc15');
          const opacity = isHighlight ? (drawObj.opacity ?? 0.35) : (drawObj.opacity ?? 1);

          for (let i = 0; i < drawObj.points.length - 1; i++) {
            const p1 = drawObj.points[i];
            const p2 = drawObj.points[i + 1];
            page.drawLine({
              start: { x: pdfX + p1.x, y: pageH - (obj.y + p1.y) },
              end: { x: pdfX + p2.x, y: pageH - (obj.y + p2.y) },
              thickness: drawObj.strokeWidth || (isHighlight ? 12 : 2),
              color: strokeCol,
              opacity,
            });
          }
        }
      }
    }
  }

  return await pdfDoc.save();
}

/**
 * Add a blank page to PDF
 */
export async function addBlankPage(pdfBytes: Uint8Array, atIndex?: number): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const standardPageSize: [number, number] = [595.28, 841.89]; // A4
  if (atIndex !== undefined && atIndex >= 0 && atIndex <= pdfDoc.getPageCount()) {
    pdfDoc.insertPage(atIndex, standardPageSize);
  } else {
    pdfDoc.addPage(standardPageSize);
  }
  return await pdfDoc.save();
}

/**
 * Duplicate a page in PDF
 */
export async function duplicatePage(pdfBytes: Uint8Array, pageIndex: number): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const [copiedPage] = await pdfDoc.copyPages(pdfDoc, [pageIndex]);
  pdfDoc.insertPage(pageIndex + 1, copiedPage);
  return await pdfDoc.save();
}

/**
 * Delete a page from PDF (ensures at least 1 page remains)
 */
export async function deletePage(pdfBytes: Uint8Array, pageIndex: number): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  if (pdfDoc.getPageCount() <= 1) {
    throw new Error('Dokumen harus memiliki minimal satu halaman.');
  }
  pdfDoc.removePage(pageIndex);
  return await pdfDoc.save();
}

/**
 * Rotate a page by 90 degrees clockwise or counter-clockwise
 */
export async function rotatePage(
  pdfBytes: Uint8Array,
  pageIndex: number,
  deltaDegrees: 90 | -90 = 90
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const page = pdfDoc.getPage(pageIndex);
  const currentRotation = page.getRotation().angle;
  const newRotation = (currentRotation + deltaDegrees + 360) % 360;
  page.setRotation(degrees(newRotation));
  return await pdfDoc.save();
}

/**
 * Reorder pages in PDF
 */
export async function reorderPages(
  pdfBytes: Uint8Array,
  newOrder: number[] // array of original page indexes
): Promise<Uint8Array> {
  const srcDoc = await PDFDocument.load(pdfBytes);
  const destDoc = await PDFDocument.create();
  const copiedPages = await destDoc.copyPages(srcDoc, newOrder);
  copiedPages.forEach((page) => destDoc.addPage(page));
  return await destDoc.save();
}

/**
 * Merge multiple PDF files into a single PDF
 */
export async function mergePdfFiles(pdfByteArrays: Uint8Array[]): Promise<Uint8Array> {
  const mergedDoc = await PDFDocument.create();
  for (const bytes of pdfByteArrays) {
    const doc = await PDFDocument.load(bytes);
    const pages = await mergedDoc.copyPages(doc, doc.getPageIndices());
    pages.forEach((page) => mergedDoc.addPage(page));
  }
  return await mergedDoc.save();
}

/**
 * Split a PDF into a new PDF containing only specified page ranges
 * (e.g., [0, 1] for pages 1 and 2)
 */
export async function splitOrExtractPages(
  pdfBytes: Uint8Array,
  pageIndexes: number[]
): Promise<Uint8Array> {
  const srcDoc = await PDFDocument.load(pdfBytes);
  const destDoc = await PDFDocument.create();
  const pages = await destDoc.copyPages(srcDoc, pageIndexes);
  pages.forEach((page) => destDoc.addPage(page));
  return await destDoc.save();
}

/**
 * Add Page Numbers and/or Watermark to all pages in a PDF
 */
export async function addWatermarkAndPageNumbers(
  pdfBytes: Uint8Array,
  options: {
    watermarkText?: string;
    addPageNumbers?: boolean;
    pageNumberPosition?: 'bottom-center' | 'bottom-right' | 'top-right';
  }
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const fontHelvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontHelveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const total = pdfDoc.getPageCount();

  for (let i = 0; i < total; i++) {
    const page = pdfDoc.getPage(i);
    const { width, height } = page.getSize();

    // Watermark
    if (options.watermarkText) {
      const text = options.watermarkText;
      const size = 48;
      const textWidth = fontHelveticaBold.widthOfTextAtSize(text, size);
      page.drawText(text, {
        x: (width - textWidth) / 2,
        y: height / 2,
        size,
        font: fontHelveticaBold,
        color: rgb(0.8, 0.8, 0.8),
        opacity: 0.25,
        rotate: degrees(45),
      });
    }

    // Page Numbers
    if (options.addPageNumbers) {
      const pageStr = `Halaman ${i + 1} dari ${total}`;
      const size = 9;
      const strWidth = fontHelvetica.widthOfTextAtSize(pageStr, size);
      let posX = (width - strWidth) / 2;
      let posY = 25;

      if (options.pageNumberPosition === 'bottom-right') {
        posX = width - strWidth - 40;
        posY = 25;
      } else if (options.pageNumberPosition === 'top-right') {
        posX = width - strWidth - 40;
        posY = height - 35;
      }

      page.drawText(pageStr, {
        x: posX,
        y: posY,
        size,
        font: fontHelvetica,
        color: rgb(0.4, 0.45, 0.55),
      });
    }
  }

  return await pdfDoc.save();
}

/**
 * Create a new, blank 1-page A4 PDF document
 */
export async function createBlankPdfDocument(): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  // Standard A4 dimensions: 595.28 x 841.89 points
  pdfDoc.addPage([595.28, 841.89]);
  return await pdfDoc.save();
}
