import type { EncodingId } from "./sources";

/**
 * Decodes an uploaded CSV. "auto" tries UTF-8 and falls back to Windows-1252 when
 * the bytes aren't valid UTF-8 (typical of CSVs saved by older Excel versions),
 * so accents don't turn into "�".
 */
export function decodeCsv(bytes: ArrayBuffer, encoding: EncodingId) {
  if (encoding === "windows-1252")
    return new TextDecoder("windows-1252").decode(bytes);
  if (encoding === "utf-8") return new TextDecoder("utf-8").decode(bytes);
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
}
