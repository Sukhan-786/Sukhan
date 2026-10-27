export type Passage = { surface: string; start: number; end: number };
// Exact Unicode code-point offsets, matching PostgreSQL substring. No words are altered.
export function readingPassages(body: string, prose = false): Passage[] {
  const lines: Passage[] = [];
  let offset = 0;
  for (const line of body.split("\n")) {
    const length = Array.from(line).length;
    lines.push({ surface: line, start: offset, end: offset + length });
    offset += length + 1;
  }
  const groups: Passage[][] = [];
  let paragraph: Passage[] = [];
  for (const line of lines) {
    if (!line.surface.trim()) {
      if (paragraph.length) groups.push(paragraph);
      paragraph = [];
    } else paragraph.push(line);
  }
  if (paragraph.length) groups.push(paragraph);
  const result: Passage[] = [];
  for (const group of groups) {
    const width = prose ? group.length : 2;
    for (let i = 0; i < group.length; i += width) {
      const chunk = group.slice(i, i + width);
      result.push({
        surface: chunk.map((l) => l.surface).join("\n"),
        start: chunk[0].start,
        end: chunk.at(-1)!.end,
      });
    }
  }
  return result;
}
