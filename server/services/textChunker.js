/**
 * Split long text into overlapping chunks for AI processing.
 */
export const chunkText = (text, chunkSize, overlap, maxChunks) => {
  const normalized = text.replace(/\r\n/g, '\n').trim();
  if (!normalized) return [];

  if (normalized.length <= chunkSize) {
    return [normalized];
  }

  const chunks = [];
  let start = 0;

  while (start < normalized.length && chunks.length < maxChunks) {
    let end = Math.min(start + chunkSize, normalized.length);

    if (end < normalized.length) {
      const slice = normalized.slice(start, end);
      const lastBreak = Math.max(
        slice.lastIndexOf('\n\n'),
        slice.lastIndexOf('\n'),
        slice.lastIndexOf('. ')
      );
      if (lastBreak > chunkSize * 0.5) {
        end = start + lastBreak + 1;
      }
    }

    const chunk = normalized.slice(start, end).trim();
    if (chunk) chunks.push(chunk);

    if (end >= normalized.length) break;
    start = Math.max(end - overlap, start + 1);
  }

  return chunks;
};
