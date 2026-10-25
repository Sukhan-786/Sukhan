export const maxImportBytes = 400000;
export function decodeTextImport(bytes: Uint8Array): string {
  if (bytes.byteLength > maxImportBytes)
    throw new Error("Choose a text file smaller than 400 KB.");
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error("Save the file as UTF-8 text, then try again.");
  }
  text = text.replace(/\r\n?/g, "\n");
  if (text.includes("\u0000"))
    throw new Error("Choose a plain text file without binary content.");
  if (!text.trim()) throw new Error("The text file is empty.");
  if (text.length > 100000)
    throw new Error("Text must contain at most 100,000 characters.");
  return text;
}
