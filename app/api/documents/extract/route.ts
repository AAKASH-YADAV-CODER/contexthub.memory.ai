import { NextResponse } from "next/server";
import {
  extractTextFromFile,
  isSupportedUpload,
  titleFromFilename,
} from "@/lib/extract-text";

/**
 * Extract text from an uploaded file so the UI can preview before saving.
 * FormData field: "file"
 */
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "file is required" },
        { status: 400 }
      );
    }

    if (!isSupportedUpload(file.name)) {
      return NextResponse.json(
        {
          error:
            "Unsupported type. Upload .txt, .md, .pdf, or .docx",
        },
        { status: 400 }
      );
    }

    // ~10MB guard
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large (max 10MB)" },
        { status: 400 }
      );
    }

    const content = await extractTextFromFile(file, file.name);

    if (!content) {
      return NextResponse.json(
        { error: "No text could be extracted from this file" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      title: titleFromFilename(file.name),
      content,
      filename: file.name,
      characters: content.length,
    });
  } catch (error) {
    console.error("Extract error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to extract text",
      },
      { status: 500 }
    );
  }
}
