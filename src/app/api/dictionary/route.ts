import { lookupDictionary, lookupWordBank } from "@/lib/dictionary-data";
import { languages, type Language } from "@/lib/types";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const url = new URL(request.url),
    language = url.searchParams.get("language") || "",
    word = (url.searchParams.get("word") || "").trim();
  const headers = { "Cache-Control": "no-store" };
  if (
    !languages.includes(language as Language) ||
    !word ||
    Array.from(word).length > 200
  )
    return Response.json(
      { error: "Choose a supported script and a word under 201 characters." },
      { status: 400, headers },
    );
  try {
    const entries = await lookupDictionary(language as Language, word);
    const wordBank = entries.length
      ? []
      : await lookupWordBank(language as Language, word);
    return Response.json({ entries, wordBank }, { headers });
  } catch {
    return Response.json(
      { error: "Dictionary lookup is unavailable." },
      { status: 503, headers },
    );
  }
}
