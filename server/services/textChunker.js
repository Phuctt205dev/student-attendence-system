export const chunkText = (text, chunkSize = 4000, overlap = 200, maxChunks = 8) => {
  if (!text) return [];

  const chunks = [];
  let startIndex = 0;

  while (startIndex < text.length && chunks.length < maxChunks) {
    let endIndex = startIndex + chunkSize;

    if (endIndex < text.length) {
      const nextNewline = text.indexOf('\n', endIndex);
      const nextPeriod = text.indexOf('. ', endIndex);

      if (nextNewline !== -1 && nextNewline - endIndex < 200) {
        endIndex = nextNewline + 1;
      } else if (nextPeriod !== -1 && nextPeriod - endIndex < 100) {
        endIndex = nextPeriod + 2;
      }
    } else {
      endIndex = text.length;
    }

    chunks.push(text.substring(startIndex, endIndex).trim());

    if (endIndex >= text.length) break;

    startIndex = endIndex - overlap;
    if (startIndex < 0) startIndex = 0;
  }

  return chunks;
};
