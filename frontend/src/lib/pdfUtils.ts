/**
 * Utility to accurately extract total page count from a PDF file, Blob, ArrayBuffer, or URL.
 * Works natively in modern browsers using TextDecoder and PDF syntax parsing.
 */
export async function extractPdfPageCount(
  source: File | Blob | ArrayBuffer | string
): Promise<number | null> {
  try {
    let arrayBuffer: ArrayBuffer;

    if (source instanceof ArrayBuffer) {
      arrayBuffer = source;
    } else if (source instanceof Blob) {
      arrayBuffer = await source.arrayBuffer();
    } else if (typeof source === 'string') {
      if (source.startsWith('data:application/pdf;base64,')) {
        const base64 = source.split(',')[1];
        const binaryStr = atob(base64);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        arrayBuffer = bytes.buffer;
      } else {
        const res = await fetch(source);
        if (!res.ok) return null;
        arrayBuffer = await res.arrayBuffer();
      }
    } else {
      return null;
    }

    const decoder = new TextDecoder('latin1');
    const pdfText = decoder.decode(new Uint8Array(arrayBuffer));

    // 1. Primary check: Count distinct /Type /Page objects (excluding /Type /Pages)
    const pageMatches = pdfText.match(/\/Type\s*\/Page(?![a-zA-Z])/g);
    if (pageMatches && pageMatches.length > 0) {
      return pageMatches.length;
    }

    // 2. Fallback check: Look for root /Type /Pages ... /Count N
    const countMatch = pdfText.match(/\/Type\s*\/Pages[^>]*\/Count\s+(\d+)/);
    if (countMatch && countMatch[1]) {
      const parsed = parseInt(countMatch[1], 10);
      if (parsed > 0) return parsed;
    }

    // 3. Fallback check: Look for maximum /Count N
    const anyCountMatches = pdfText.match(/\/Count\s+(\d+)/g);
    if (anyCountMatches && anyCountMatches.length > 0) {
      let maxCount = 0;
      for (const m of anyCountMatches) {
        const num = parseInt(m.replace('/Count', '').trim(), 10);
        if (num > maxCount) maxCount = num;
      }
      if (maxCount > 0) return maxCount;
    }
  } catch (err) {
    console.warn('extractPdfPageCount error:', err);
  }

  return null;
}
