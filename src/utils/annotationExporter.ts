import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { PDFAnnotation } from '../types';

/**
 * Helper to convert hex colors to normalized 0..1 rgb
 */
function hexToRgbColor(hex: string): { r: number; g: number; b: number } {
  let clean = (hex || '').replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) return { r: 0.9, g: 0.1, b: 0.1 };
  return {
    r: ((num >> 16) & 255) / 255,
    g: ((num >> 8) & 255) / 255,
    b: (num & 255) / 255,
  };
}

/**
 * Bakes annotations directly into a PDF binary so they are permanently visible
 * and printable in any PDF viewer (Adobe Acrobat, Preview, Chrome, Edge).
 */
export async function bakeAnnotationsToPDF(
  pdfBuffer: ArrayBuffer | Uint8Array,
  annotations: PDFAnnotation[]
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const totalPages = pdfDoc.getPageCount();

  let helveticaFont: any = null;
  try {
    helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  } catch {
    /* fallback if embedding font fails */
  }

  for (const ann of annotations) {
    const pageIndex = ann.pageNum - 1;
    if (pageIndex < 0 || pageIndex >= totalPages) continue;

    const page = pdfDoc.getPage(pageIndex);
    const { width: pWidth, height: pHeight } = page.getSize();
    const { r, g, b } = hexToRgbColor(ann.color);
    const color = rgb(r, g, b);

    // 1. Highlight
    if (ann.type === 'highlight' && ann.rect) {
      const rw = ann.rect.width * pWidth;
      const rh = ann.rect.height * pHeight;
      const rx = ann.rect.x * pWidth;
      const ry = pHeight - ann.rect.y * pHeight - rh;

      page.drawRectangle({
        x: rx,
        y: ry,
        width: rw,
        height: rh,
        color,
        opacity: ann.opacity ?? 0.35,
      });
    }

    // 2. Underline
    else if (ann.type === 'underline' && ann.rect) {
      const rw = ann.rect.width * pWidth;
      const rh = ann.rect.height * pHeight;
      const rx = ann.rect.x * pWidth;
      const ry = pHeight - ann.rect.y * pHeight - rh;

      page.drawLine({
        start: { x: rx, y: ry },
        end: { x: rx + rw, y: ry },
        color,
        thickness: ann.strokeWidth || 1.5,
        opacity: ann.opacity ?? 0.9,
      });
    }

    // 3. Strikeout
    else if (ann.type === 'strikeout' && ann.rect) {
      const rw = ann.rect.width * pWidth;
      const rh = ann.rect.height * pHeight;
      const rx = ann.rect.x * pWidth;
      const ry = pHeight - ann.rect.y * pHeight - rh / 2;

      page.drawLine({
        start: { x: rx, y: ry },
        end: { x: rx + rw, y: ry },
        color,
        thickness: ann.strokeWidth || 1.5,
        opacity: ann.opacity ?? 0.9,
      });
    }

    // 4. Rectangle
    else if (ann.type === 'rectangle' && ann.rect) {
      const rw = ann.rect.width * pWidth;
      const rh = ann.rect.height * pHeight;
      const rx = ann.rect.x * pWidth;
      const ry = pHeight - ann.rect.y * pHeight - rh;

      page.drawRectangle({
        x: rx,
        y: ry,
        width: rw,
        height: rh,
        borderColor: color,
        borderWidth: ann.strokeWidth || 2,
        opacity: ann.opacity ?? 1,
      });
    }

    // 5. Line & Arrow
    else if ((ann.type === 'line' || ann.type === 'arrow') && ann.points && ann.points.length >= 2) {
      const p1 = ann.points[0];
      const p2 = ann.points[1];
      const start = { x: p1.x * pWidth, y: pHeight - p1.y * pHeight };
      const end = { x: p2.x * pWidth, y: pHeight - p2.y * pHeight };

      page.drawLine({
        start,
        end,
        color,
        thickness: ann.strokeWidth || 2,
        opacity: ann.opacity ?? 1,
      });
    }

    // 6. Pen / Freehand Drawing
    else if (ann.type === 'pen' && ann.points && ann.points.length > 1) {
      const strokeThickness = ann.strokeWidth || 2;
      for (let i = 0; i < ann.points.length - 1; i++) {
        const p1 = ann.points[i];
        const p2 = ann.points[i + 1];
        page.drawLine({
          start: { x: p1.x * pWidth, y: pHeight - p1.y * pHeight },
          end: { x: p2.x * pWidth, y: pHeight - p2.y * pHeight },
          color,
          thickness: strokeThickness,
          opacity: ann.opacity ?? 1,
        });
      }
    }

    // 7. Textbox & Sticky Notes
    else if ((ann.type === 'textbox' || ann.type === 'sticky-note') && ann.rect && ann.text) {
      const rw = Math.max(ann.rect.width * pWidth, 80);
      const rh = Math.max(ann.rect.height * pHeight, 24);
      const rx = ann.rect.x * pWidth;
      const ry = pHeight - ann.rect.y * pHeight - rh;

      // Draw background container
      page.drawRectangle({
        x: rx,
        y: ry,
        width: rw,
        height: rh,
        color: ann.type === 'sticky-note' ? rgb(1, 0.95, 0.75) : rgb(1, 1, 1),
        borderColor: color,
        borderWidth: 1,
        opacity: 0.95,
      });

      // Draw text
      if (helveticaFont) {
        const textFontSize = Math.max(8, Math.min(ann.fontSize || 10, 16));
        const sanitized = ann.text.replace(/[\r\n]+/g, ' ').slice(0, 120);
        page.drawText(sanitized, {
          x: rx + 4,
          y: ry + rh - textFontSize - 3,
          size: textFontSize,
          font: helveticaFont,
          color: rgb(0.1, 0.1, 0.1),
        });
      }
    }
  }

  return await pdfDoc.save();
}

/**
 * Exports annotations to Adobe XFDF (XML Forms Data Format) standard
 */
export function exportToXFDF(annotations: PDFAnnotation[], docName: string): string {
  const sanitize = (str?: string) => (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<xfdf xmlns="http://ns.adobe.com/xfdf/" xml:space="preserve">\n`;
  xml += `  <f href="${sanitize(docName)}"/>\n`;
  xml += `  <annots>\n`;

  annotations.forEach((ann) => {
    const pageZeroIndex = Math.max(0, ann.pageNum - 1);
    const colorHex = ann.color.startsWith('#') ? ann.color : '#ff0000';
    const dateStr = new Date(ann.createdAt).toISOString();

    if (ann.type === 'pen' && ann.points && ann.points.length > 0) {
      const gesture = ann.points.map((p) => `${p.x.toFixed(4)},${p.y.toFixed(4)}`).join(';');
      xml += `    <ink page="${pageZeroIndex}" color="${colorHex}" width="${ann.strokeWidth || 2}" date="D:${dateStr}" name="${ann.id}">\n`;
      xml += `      <inklist>\n`;
      xml += `        <gesture>${gesture}</gesture>\n`;
      xml += `      </inklist>\n`;
      xml += `    </ink>\n`;
    } else if (ann.type === 'highlight' && ann.rect) {
      const { x, y, width, height } = ann.rect;
      const rectStr = `${x.toFixed(4)},${y.toFixed(4)},${(x + width).toFixed(4)},${(y + height).toFixed(4)}`;
      xml += `    <highlight page="${pageZeroIndex}" color="${colorHex}" opacity="${ann.opacity || 0.5}" rect="${rectStr}" date="D:${dateStr}" name="${ann.id}">\n`;
      if (ann.text) xml += `      <contents>${sanitize(ann.text)}</contents>\n`;
      xml += `    </highlight>\n`;
    } else if (ann.type === 'underline' && ann.rect) {
      const { x, y, width, height } = ann.rect;
      const rectStr = `${x.toFixed(4)},${y.toFixed(4)},${(x + width).toFixed(4)},${(y + height).toFixed(4)}`;
      xml += `    <underline page="${pageZeroIndex}" color="${colorHex}" rect="${rectStr}" date="D:${dateStr}" name="${ann.id}"/>\n`;
    } else if (ann.type === 'strikeout' && ann.rect) {
      const { x, y, width, height } = ann.rect;
      const rectStr = `${x.toFixed(4)},${y.toFixed(4)},${(x + width).toFixed(4)},${(y + height).toFixed(4)}`;
      xml += `    <strikeout page="${pageZeroIndex}" color="${colorHex}" rect="${rectStr}" date="D:${dateStr}" name="${ann.id}"/>\n`;
    } else if (ann.type === 'rectangle' && ann.rect) {
      const { x, y, width, height } = ann.rect;
      const rectStr = `${x.toFixed(4)},${y.toFixed(4)},${(x + width).toFixed(4)},${(y + height).toFixed(4)}`;
      xml += `    <square page="${pageZeroIndex}" color="${colorHex}" width="${ann.strokeWidth || 2}" rect="${rectStr}" date="D:${dateStr}" name="${ann.id}"/>\n`;
    } else if (ann.type === 'line' && ann.points && ann.points.length >= 2) {
      const start = ann.points[0];
      const end = ann.points[1];
      xml += `    <line page="${pageZeroIndex}" color="${colorHex}" width="${ann.strokeWidth || 2}" start="${start.x.toFixed(4)},${start.y.toFixed(4)}" end="${end.x.toFixed(4)},${end.y.toFixed(4)}" date="D:${dateStr}" name="${ann.id}"/>\n`;
    } else if (ann.type === 'textbox' && ann.rect) {
      const { x, y, width, height } = ann.rect;
      const rectStr = `${x.toFixed(4)},${y.toFixed(4)},${(x + width).toFixed(4)},${(y + height).toFixed(4)}`;
      xml += `    <freetext page="${pageZeroIndex}" color="${colorHex}" rect="${rectStr}" date="D:${dateStr}" name="${ann.id}">\n`;
      if (ann.text) xml += `      <contents>${sanitize(ann.text)}</contents>\n`;
      xml += `    </freetext>\n`;
    } else if (ann.type === 'sticky-note' && ann.rect) {
      const { x, y } = ann.rect;
      const rectStr = `${x.toFixed(4)},${y.toFixed(4)},${(x + 0.05).toFixed(4)},${(y + 0.05).toFixed(4)}`;
      xml += `    <text page="${pageZeroIndex}" color="${colorHex}" rect="${rectStr}" date="D:${dateStr}" name="${ann.id}">\n`;
      if (ann.text) xml += `      <contents>${sanitize(ann.text)}</contents>\n`;
      xml += `    </text>\n`;
    }
  });

  xml += `  </annots>\n`;
  xml += `</xfdf>\n`;
  return xml;
}

/**
 * Exports annotations to standard JSON format
 */
export function exportToJSON(annotations: PDFAnnotation[], docName: string): string {
  const payload = {
    document: docName,
    exportedAt: new Date().toISOString(),
    totalAnnotations: annotations.length,
    annotations,
  };
  return JSON.stringify(payload, null, 2);
}

/**
 * Triggers browser file download
 */
export function downloadFile(content: string | Uint8Array, filename: string, mimeType: string) {
  const blob = new Blob([content as any], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
