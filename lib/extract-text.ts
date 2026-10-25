import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";

const TEXT_EXTENSIONS = new Set([
  "txt",
  "md",
  "markdown",
  "csv",
  "json",
  "log",
]);

export function titleFromFilename(filename: string): string {
  return filename.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
}

export function getExtension(filename: string): string {
  const parts = filename.toLowerCase().split(".");
  return parts.length > 1 ? parts.at(-1)! : "";
}

export function isSupportedUpload(filename: string): boolean {
  const ext = getExtension(filename);
  return TEXT_EXTENSIONS.has(ext) || ext === "pdf" || ext === "docx";
}

/**
 * Extract plain text from an uploaded file (txt/md/pdf/docx).
 */
export async function extractTextFromFile(
  file: File | Blob,
  filename: string
): Promise<string> {
  const ext = getExtension(filename);
  const buffer = Buffer.from(await file.arrayBuffer());

  if (TEXT_EXTENSIONS.has(ext)) {
    return buffer.toString("utf-8").trim();
  }

  if (ext === "pdf") {
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text } = await extractText(pdf, { mergePages: true });
    const plain = Array.isArray(text) ? text.join("\n") : String(text ?? "");
    return plain.trim();
  }

  if (ext === "docx") {
    const result = await mammoth.extractRawText({ buffer });
    return result.value.trim();
  }

  throw new Error(
    `Unsupported file type ".${ext}". Use .txt, .md, .pdf, or .docx`
  );
}
