export const languages = ["ur", "roman", "fa", "en"] as const;
export type Language = (typeof languages)[number];
export const languageLabels: Record<Language, string> = {
  ur: "اردو",
  roman: "Roman Urdu",
  fa: "فارسی",
  en: "English",
};
export const languageTags: Record<Language, string> = {
  ur: "ur",
  roman: "ur-Latn",
  fa: "fa",
  en: "en",
};
export const forms = ["ghazal", "nazm", "sher", "rubai", "prose"] as const;
export type Status = "draft" | "published";
export type StaffRole = "admin" | "editor";
export type Artist = {
  id: string;
  slug: string;
  name: string;
  name_ur: string;
  kind: "poet" | "artist" | "both";
  bio: string;
  status: Status;
  rights_note: string;
  created_at?: string;
  updated_at?: string;
};
export type KalamText = { language: Language; title: string; body: string };
export type Media = {
  id: string;
  updated_at?: string;
  title: string;
  kind: "audio" | "video";
  url: string;
  caption_url: string;
  transcript: string;
  language: Language;
  performer_id: string | null;
  performer?: Artist | null;
  status: Status;
  rights_note: string;
};
export type Kalam = {
  id: string;
  slug: string;
  form: (typeof forms)[number];
  summary: string;
  poet_id: string;
  poet: Artist | null;
  status: Status;
  rights_note: string;
  updated_at: string;
  texts: KalamText[];
  media: Media[];
};
