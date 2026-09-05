import JSZip from 'jszip';
import { PDFDocument } from 'pdf-lib';

/**
 * Helper to convert an image Blob/bytes into a PNG/JPEG Uint8Array using an offscreen canvas.
 * Handles WebP, GIF, progressive JPEG, and any browser-supported formats that pdf-lib cannot embed directly.
 */
async function rasterizeToPngBytes(bytes: Uint8Array, mimeType: string): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([bytes.buffer as ArrayBuffer], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Failed to create canvas context for comic image rasterization');
        }
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(async (pngBlob) => {
          if (!pngBlob) {
            reject(new Error('Canvas toBlob returned null'));
            return;
          }
          const buf = await pngBlob.arrayBuffer();
          resolve(new Uint8Array(buf));
        }, 'image/png');
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image in browser for rasterization'));
    };

    img.src = url;
  });
}

/**
 * Loads a Comic Book Archive (.cbz, .cbr, .cbn, .zip) and converts it into a PDF Document buffer.
 */
export async function loadComicBookArchive(file: File): Promise<{ pdfBytes: Uint8Array; pageCount: number }> {
  const arrayBuffer = await file.arrayBuffer();
  let zip: JSZip;

  try {
    zip = await JSZip.loadAsync(arrayBuffer);
  } catch {
    throw new Error(
      `Could not open "${file.name}" as a comic archive. If this is a RAR-based CBR file, please re-archive or convert it to CBZ (ZIP format).`
    );
  }

  // Find all image files, excluding Mac OS metadata & hidden files
  const imageExtensions = /\.(jpe?g|png|webp|gif|bmp|avif)$/i;
  const imageEntries = Object.values(zip.files).filter((entry) => {
    if (entry.dir) return false;
    if (entry.name.includes('__MACOSX/') || entry.name.startsWith('.')) return false;
    return imageExtensions.test(entry.name);
  });

  if (imageEntries.length === 0) {
    throw new Error(`No supported comic page images found inside "${file.name}".`);
  }

  // Natural alphanumeric sort for page order (page1, page2, page10, etc.)
  imageEntries.sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
  );

  const pdfDoc = await PDFDocument.create();

  for (let i = 0; i < imageEntries.length; i++) {
    const entry = imageEntries[i];
    const imageBytes = await entry.async('uint8array');
    const lowerName = entry.name.toLowerCase();

    let embeddedImage;

    if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) {
      try {
        embeddedImage = await pdfDoc.embedJpg(imageBytes);
      } catch {
        // Fallback through rasterization
        const pngBytes = await rasterizeToPngBytes(imageBytes, 'image/jpeg');
        embeddedImage = await pdfDoc.embedPng(pngBytes);
      }
    } else if (lowerName.endsWith('.png')) {
      try {
        embeddedImage = await pdfDoc.embedPng(imageBytes);
      } catch {
        const pngBytes = await rasterizeToPngBytes(imageBytes, 'image/png');
        embeddedImage = await pdfDoc.embedPng(pngBytes);
      }
    } else {
      // WebP, GIF, BMP, etc.
      const mime = lowerName.endsWith('.webp')
        ? 'image/webp'
        : lowerName.endsWith('.gif')
        ? 'image/gif'
        : 'image/png';
      const pngBytes = await rasterizeToPngBytes(imageBytes, mime);
      embeddedImage = await pdfDoc.embedPng(pngBytes);
    }

    const page = pdfDoc.addPage([embeddedImage.width, embeddedImage.height]);
    page.drawImage(embeddedImage, {
      x: 0,
      y: 0,
      width: embeddedImage.width,
      height: embeddedImage.height,
    });
  }

  const pdfBytes = await pdfDoc.save();
  return {
    pdfBytes,
    pageCount: imageEntries.length,
  };
}
