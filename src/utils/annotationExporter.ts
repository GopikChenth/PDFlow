import { PDFAnnotation } from '../types';

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
      xml += `      <contents>${sanitize(ann.text)}</contents>\n`;
      xml += `    </freetext>\n`;
    } else if (ann.type === 'sticky-note' && ann.rect) {
      const { x, y } = ann.rect;
      const rectStr = `${x.toFixed(4)},${y.toFixed(4)},${(x + 0.05).toFixed(4)},${(y + 0.05).toFixed(4)}`;
      xml += `    <text page="${pageZeroIndex}" color="${colorHex}" rect="${rectStr}" date="D:${dateStr}" name="${ann.id}">\n`;
      xml += `      <contents>${sanitize(ann.text)}</contents>\n`;
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
export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
