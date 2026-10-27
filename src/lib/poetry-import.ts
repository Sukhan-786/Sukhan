import { z } from "zod";
import manifest from "../../public/data/poetry/manifest.json";
import { slug, kalamSchema } from "./validation";
export const poetryManifest = manifest;
export type PoetryProgress = {
  source_id: string;
  total: number;
  processed: number;
  inserted: number;
  skipped: number;
  updated_at: string;
};
const texts = kalamSchema.shape.texts;
export const poetryRowSchema = z
  .object({
    id: z.uuid(),
    source_key: z.string().regex(/^[a-f0-9]{64}$/),
    slug,
    poet_slug: slug,
    poet_name: z.string().trim().min(1).max(160),
    poet_name_ur: z.string().max(160),
    form: kalamSchema.shape.form,
    texts,
    source_note: z.string().trim().min(1).max(2000),
  })
  .strict();
export type PoetryRow = z.infer<typeof poetryRowSchema>;
export const poetryBatchSchema = z
  .object({
    source_id: z.enum([
      "urdu-ghazals-v1",
      "urdu-couplets-v1",
      "persian-texts-v1",
    ]),
    offset: z.number().int().min(0),
    rows: z.array(poetryRowSchema).min(1).max(200),
  })
  .strict();
export async function* readPoetryLines(
  stream: ReadableStream<Uint8Array>,
): AsyncGenerator<PoetryRow> {
  const reader = stream.getReader(),
    decoder = new TextDecoder("utf-8", { fatal: true });
  let buffer = "",
    count = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      let pos: number;
      while ((pos = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, pos);
        buffer = buffer.slice(pos + 1);
        if (!line.trim()) continue;
        if (line.length > 700000 || ++count > 2000)
          throw Error("Unexpected poetry shard size.");
        yield poetryRowSchema.parse(JSON.parse(line));
      }
      if (buffer.length > 700000) throw Error("A poetry row is too large.");
      if (done) break;
    }
    if (buffer.trim()) {
      if (++count > 2000) throw Error("Unexpected poetry shard size.");
      yield poetryRowSchema.parse(JSON.parse(buffer));
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
