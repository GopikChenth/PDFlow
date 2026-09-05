import JSZip from 'jszip';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

/**
 * Clean HTML entities and tags into plain readable text
 */
function extractTextBlocks(htmlContent: string): { type: 'h1' | 'h2' | 'p'; text: string }[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  const blocks: { type: 'h1' | 'h2' | 'p'; text: string }[] = [];

  const elements = doc.body.querySelectorAll('h1, h2, h3, h4, p, blockquote, div');
  if (elements.length === 0) {
    const rawText = doc.body.textContent || '';
    rawText.split('\n\n').forEach((para) => {
      const clean = para.trim().replace(/\s+/g, ' ');
      if (clean) blocks.push({ type: 'p', text: clean });
    });
    return blocks;
  }

  elements.forEach((el) => {
    const tag = el.tagName.toLowerCase();
    const text = el.textContent?.trim().replace(/\s+/g, ' ') || '';
    if (!text) return;

    if (tag === 'h1' || tag === 'h2') {
      blocks.push({ type: 'h1', text });
    } else if (tag === 'h3' || tag === 'h4') {
      blocks.push({ type: 'h2', text });
    } else if (tag === 'p' || tag === 'blockquote') {
      blocks.push({ type: 'p', text });
    } else if (tag === 'div' && el.children.length === 0) {
      blocks.push({ type: 'p', text });
    }
  });

  return blocks;
}

/**
 * Helper to split text into lines that fit within a maximum width for a given font and size.
 */
function wrapText(text: string, maxWidth: number, fontSize: number, font: any): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const width = font.widthOfTextAtSize(testLine, fontSize);
    if (width <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

/**
 * Loads an EPUB ebook file, parses its spine & chapters, and renders an in-memory PDF.
 */
export async function loadEpubBook(file: File): Promise<{ pdfBytes: Uint8Array; pageCount: number; title: string }> {
  const arrayBuffer = await file.arrayBuffer();
  let zip: JSZip;

  try {
    zip = await JSZip.loadAsync(arrayBuffer);
  } catch {
    throw new Error(`Could not unpack "${file.name}" as an EPUB zip archive.`);
  }

  // 1. Locate container.xml
  const containerEntry = zip.file('META-INF/container.xml');
  if (!containerEntry) {
    throw new Error('Invalid EPUB: missing META-INF/container.xml');
  }

  const containerXml = await containerEntry.async('text');
  const parser = new DOMParser();
  const containerDoc = parser.parseFromString(containerXml, 'application/xml');
  const rootfile = containerDoc.querySelector('rootfile');
  const opfPath = rootfile?.getAttribute('full-path') || 'OEBPS/content.opf';

  // 2. Read OPF file
  const opfEntry = zip.file(opfPath);
  if (!opfEntry) {
    throw new Error(`Invalid EPUB: missing package file at "${opfPath}"`);
  }

  const opfXml = await opfEntry.async('text');
  const opfDoc = parser.parseFromString(opfXml, 'application/xml');

  // Extract metadata
  const title = opfDoc.querySelector('title')?.textContent?.trim() || file.name.replace(/\.epub$/i, '');
  const author = opfDoc.querySelector('creator')?.textContent?.trim() || 'Unknown Author';

  // Extract manifest
  const manifestItems: Record<string, string> = {};
  const basePath = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : '';

  opfDoc.querySelectorAll('manifest > item').forEach((item) => {
    const id = item.getAttribute('id');
    const href = item.getAttribute('href');
    if (id && href) {
      // Decode URI components if any
      const fullPath = basePath + decodeURIComponent(href);
      manifestItems[id] = fullPath;
    }
  });

  // Extract spine order
  const spineIds: string[] = [];
  opfDoc.querySelectorAll('spine > itemref').forEach((itemref) => {
    const idref = itemref.getAttribute('idref');
    if (idref && manifestItems[idref]) {
      spineIds.push(manifestItems[idref]);
    }
  });

  // 3. Build PDF Document with Book Layout
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const fontBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const fontItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);

  const pageWidth = 504; // standard 5x8 book proportion (points)
  const pageHeight = 684;
  const marginX = 48;
  const marginTop = 56;
  const marginBottom = 52;
  const contentWidth = pageWidth - marginX * 2;

  // Title Page
  const titlePage = pdfDoc.addPage([pageWidth, pageHeight]);
  const titleLines = wrapText(title, contentWidth - 40, 24, fontBold);
  let titleY = pageHeight / 2 + 80;

  titleLines.forEach((line) => {
    const lineWidth = fontBold.widthOfTextAtSize(line, 24);
    titlePage.drawText(line, {
      x: (pageWidth - lineWidth) / 2,
      y: titleY,
      size: 24,
      font: fontBold,
      color: rgb(0.12, 0.12, 0.14),
    });
    titleY -= 32;
  });

  titleY -= 16;
  const authorWidth = fontItalic.widthOfTextAtSize(author, 14);
  titlePage.drawText(author, {
    x: (pageWidth - authorWidth) / 2,
    y: titleY,
    size: 14,
    font: fontItalic,
    color: rgb(0.35, 0.35, 0.4),
  });

  // Helper to start a new page
  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let cursorY = pageHeight - marginTop;

  const checkPageBreak = (neededHeight: number) => {
    if (cursorY - neededHeight < marginBottom) {
      currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      cursorY = pageHeight - marginTop;
    }
  };

  // 4. Render Chapters
  for (const chapterPath of spineIds) {
    const chapterEntry = zip.file(chapterPath);
    if (!chapterEntry) continue;

    const chapterHtml = await chapterEntry.async('text');
    const blocks = extractTextBlocks(chapterHtml);
    if (blocks.length === 0) continue;

    // Start chapter on fresh page if current page already has content
    if (cursorY < pageHeight - marginTop - 100) {
      currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      cursorY = pageHeight - marginTop;
    }

    for (const block of blocks) {
      if (block.type === 'h1' || block.type === 'h2') {
        const fontSize = block.type === 'h1' ? 18 : 14;
        const font = fontBold;
        const lines = wrapText(block.text, contentWidth, fontSize, font);

        checkPageBreak(lines.length * (fontSize + 6) + 30);
        cursorY -= 16;

        for (const line of lines) {
          currentPage.drawText(line, {
            x: marginX,
            y: cursorY,
            size: fontSize,
            font,
            color: rgb(0.1, 0.1, 0.12),
          });
          cursorY -= fontSize + 6;
        }
        cursorY -= 10;
      } else {
        // Paragraph
        const fontSize = 11;
        const lineHeight = 16;
        const lines = wrapText(block.text, contentWidth, fontSize, fontRegular);

        checkPageBreak(lines.length * lineHeight + 8);

        for (const line of lines) {
          currentPage.drawText(line, {
            x: marginX,
            y: cursorY,
            size: fontSize,
            font: fontRegular,
            color: rgb(0.18, 0.18, 0.2),
          });
          cursorY -= lineHeight;
        }
        cursorY -= 8; // Paragraph spacing
      }
    }
  }

  const pdfBytes = await pdfDoc.save();
  return {
    pdfBytes,
    pageCount: pdfDoc.getPageCount(),
    title,
  };
}
