import { PDFParse } from "pdf-parse";

export interface PdfExtractionResult {
  extractedText?: string;
  extractionError?: string;
  extractionStatus: "COMPLETED" | "FAILED";
}

export async function extractPdfText(fileBuffer: Buffer): Promise<PdfExtractionResult> {
  if (!hasPdfSignature(fileBuffer)) {
    return {
      extractionStatus: "FAILED",
      extractionError: "Uploaded file does not have a valid PDF signature"
    };
  }

  try {
    const parser = new PDFParse({ data: fileBuffer });
    const parsedPdf = await parser.getText();
    await parser.destroy();
    const extractedText = parsedPdf.text.trim();

    return {
      extractionStatus: "COMPLETED",
      extractedText
    };
  } catch (error) {
    return {
      extractionStatus: "FAILED",
      extractionError: error instanceof Error ? error.message : "PDF text extraction failed"
    };
  }
}

function hasPdfSignature(fileBuffer: Buffer): boolean {
  return fileBuffer.subarray(0, 5).toString("utf8") === "%PDF-";
}
