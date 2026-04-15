import ExcelJS from "exceljs";

export type PredictionValidationResult =
  | { ok: true; rowCount: number; columns: string[] }
  | { ok: false; error: string };

/**
 * Validate the structure of a submitted prediction Excel file.
 *
 * Requirements (permissive but structural):
 * - File must open as .xlsx
 * - At least one worksheet
 * - Active sheet must have a header row
 * - Header must contain a "Part" column (or similar) and 12 monthly columns
 *   OR a Month column and a Predicted column
 * - At least 3 data rows (can be relaxed; we're looking for the 3 held-back parts × 12 months structure)
 *
 * We don't crash on minor deviations — we let the grader make the final call.
 * This validator is to catch obvious template mismatches early.
 */
export async function validatePredictionFile(
  buffer: Buffer
): Promise<PredictionValidationResult> {
  const wb = new ExcelJS.Workbook();
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (wb.xlsx as any).load(buffer);
  } catch {
    return { ok: false, error: "The file could not be opened as an Excel .xlsx workbook." };
  }

  if (wb.worksheets.length === 0) {
    return { ok: false, error: "The workbook has no sheets." };
  }

  // Look for a sheet that has plausible header/data
  for (const ws of wb.worksheets) {
    if (ws.rowCount < 2) continue;

    const headerRow = ws.getRow(1);
    const columns: string[] = [];
    headerRow.eachCell({ includeEmpty: false }, (cell) => {
      const v = cell.value;
      columns.push(typeof v === "string" ? v : String(v ?? "").trim());
    });

    if (columns.length < 2) continue;

    const lower = columns.map((c) => c.toLowerCase());
    const hasPart = lower.some((c) => c.includes("part"));
    const hasPredOrMonth =
      lower.some((c) => c.includes("predict") || c.includes("forecast")) ||
      lower.some((c) => /^\d{4}-\d{2}$|^\w+\s\d{4}$|^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(c));

    if (hasPart && hasPredOrMonth) {
      return {
        ok: true,
        rowCount: ws.rowCount - 1,
        columns,
      };
    }
  }

  return {
    ok: false,
    error:
      "The prediction file does not match the expected template structure. Expected a sheet with a 'Part' column and either a 'Predicted' column or monthly columns.",
  };
}
