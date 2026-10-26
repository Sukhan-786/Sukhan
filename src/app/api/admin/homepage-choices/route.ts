import { requireStaff } from "@/lib/auth";
import { listKalam, listArtists } from "@/lib/data";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  await requireStaff();
  const params = new URL(request.url).searchParams,
    q = (params.get("q") || "").trim().slice(0, 160),
    kind = params.get("kind");
  try {
    const items =
      kind === "artist"
        ? (await listArtists())
            .filter(
              (a) =>
                !q ||
                (a.name + " " + a.name_ur)
                  .toLocaleLowerCase()
                  .includes(q.toLocaleLowerCase()),
            )
            .slice(0, 24)
            .map((a) => ({ id: a.id, label: a.name, slug: a.slug }))
        : (await listKalam({ q })).items.map((k) => ({
            id: k.id,
            label:
              (k.texts.find((t) => t.language === "ur") || k.texts[0])?.title +
              " — " +
              (k.poet?.name || "Sukhan"),
            slug: k.slug,
          }));
    return Response.json(
      { items },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { error: "Published choices could not be loaded." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
