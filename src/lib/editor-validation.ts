export function editorErrors(
  issues: { path: PropertyKey[]; message: string }[],
  texts: { language: string }[] = [],
) {
  const fields: Record<string, string> = {};
  for (const issue of issues) {
    const [root, index, field] = issue.path;
    const name =
      root === "texts"
        ? typeof index === "number" && texts[index]
          ? `${texts[index].language}_${String(field || "title")}`
          : "ur_title"
        : String(root || "slug");
    const readable = issue.message.startsWith("Too small")
      ? name.endsWith("_body")
        ? "Add the poem text for this script."
        : name.endsWith("_title")
          ? "Add a title for this script."
          : "Fill in this field."
      : issue.message.startsWith("Too big")
        ? "This field is too long. Shorten it before saving."
        : issue.message;
    fields[name] ||= readable;
  }
  return {
    error: "Please check the highlighted fields. Your changes are still here.",
    fields,
  };
}

export function editorFieldLabel(name: string) {
  const scripts: Record<string, string> = {
    ur: "Urdu",
    roman: "Roman Urdu",
    fa: "Persian",
    en: "English",
    hi: "Hindi",
    ar: "Arabic",
  };
  const match = name.match(/^(ur|roman|fa|en|hi|ar)_(title|body)$/);
  if (match)
    return `${scripts[match[1]]} ${match[2] === "body" ? "text" : "title"}`;
  const labels: Record<string, string> = {
    rights_note: "Source and rights notes",
    poet_id: "Poet / author",
    performer_id: "Performer",
    media_ids: "Recording attachments",
    caption_url: "Video captions",
    name_ur: "Name in Urdu",
    url: "Media URL",
    slug: "URL slug",
  };
  return labels[name] || name.replaceAll("_", " ");
}
