/**
 * Split long text into fixed-size chunks for RAG.
 * Overlap keeps a little context at chunk boundaries.
 */
export function chunkText(
  text: string,
  size = 500,
  overlap = 50
): string[] {
  const cleaned = text.trim();
  if (!cleaned) return [];

  if (cleaned.length <= size) {
    return [cleaned];
  }

  const chunks: string[] = [];
  let i = 0;

  while (i < cleaned.length) {
    const end = Math.min(i + size, cleaned.length);
    chunks.push(cleaned.slice(i, end));
    if (end >= cleaned.length) break;
    i = end - overlap;
  }

  return chunks;
}
