export function xmlEscape(value: string) {
  return value.replace(
    /[<>&"']/g,
    (c) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&apos;",
      })[c]!,
  );
}
export function sitemapPaths(counts: { poetry: number; dictionary: number }) {
  const paths = ["/sitemap.xml"];
  for (const kind of ["poetry", "dictionary"] as const) {
    const count = Math.max(0, Math.min(10000000, Math.floor(counts[kind])));
    for (let i = 0; i < Math.ceil(count / 1000); i++)
      paths.push(`/sitemaps/${kind}-${i}.xml`);
  }
  return paths;
}
