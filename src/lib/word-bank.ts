import { z } from "zod";
export const wordBankSource = "urduhack-aruuz-20261026-v1";
export const wordBankTotal = 154781;
export const wordBankHash =
  "2a719b0abc00eaac70cb2bac41b25e4dfedbd26a88b9e5336b9c1566880f53dc";
export const wordBankRowSchema = z
  .object({
    headword: z
      .string()
      .trim()
      .min(1)
      .max(200)
      .regex(/^[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff\u200c\u200d -]+$/u),
    wazan_candidates: z.array(z.string().regex(/^[=x-]{1,40}$/)).max(20),
  })
  .strict();
export const wordBankBatchSchema = z
  .object({
    offset: z.number().int().min(0).max(wordBankTotal),
    rows: z.array(wordBankRowSchema).min(1).max(1000),
  })
  .refine((v) => v.offset + v.rows.length <= wordBankTotal);
export type WordBankRow = z.infer<typeof wordBankRowSchema> & {
  source_id?: string;
};
export type WordBankProgress = {
  source_id: string;
  processed: number;
  inserted: number;
  updated_at: string;
};
export function displayWazanCandidate(pattern: string) {
  return pattern
    .replaceAll("=", "2")
    .replaceAll("-", "1")
    .replaceAll("x", "(1/2)");
}
/** Streaming parser bounds memory, row length and total rows. Never evaluates input. */
export async function* readWordBankLines(
  stream: ReadableStream<Uint8Array>,
): AsyncGenerator<WordBankRow> {
  const reader = stream.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let buffer = "",
    count = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      let newline;
      while ((newline = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, newline);
        buffer = buffer.slice(newline + 1);
        if (!line.trim()) continue;
        if (line.length > 16000 || ++count > wordBankTotal)
          throw Error("Unexpected word bank size.");
        yield wordBankRowSchema.parse(JSON.parse(line));
      }
      if (buffer.length > 16000) throw Error("Word bank row is too large.");
      if (done) break;
    }
    if (buffer.trim()) {
      if (++count > wordBankTotal) throw Error("Unexpected word bank size.");
      yield wordBankRowSchema.parse(JSON.parse(buffer));
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
