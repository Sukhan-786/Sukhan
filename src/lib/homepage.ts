import { z } from "zod";
import { languages } from "./types";
export const homepageSectionTypes = [
  "banner",
  "daily",
  "collections",
  "word",
  "artists",
  "library",
  "text",
] as const;
export const homepageSectionLabels = {
  banner: "Banner",
  daily: "Featured poetry",
  collections: "Collection cards",
  word: "Word of the day",
  artists: "Poets and artists",
  library: "Poetry collection",
  text: "Text section",
} as const;
const publicLink = z
  .string()
  .trim()
  .max(2048)
  .regex(
    /^\/(?:$|(?:catalogue|artists|media|dictionary|kalam)(?:[/?#][^\\\u0000-\u001f]*)?$)/,
    "Choose a public Sukhan page, such as /catalogue or /kalam/your-poem.",
  );
export const homepageImage = z
  .string()
  .trim()
  .max(2048)
  .refine((value) => {
    if (!value) return true;
    if (
      /^\/(?:images|uploads)\/[a-zA-Z0-9_./-]+$/.test(value) &&
      !value.includes("..")
    )
      return true;
    try {
      const u = new URL(value);
      return u.protocol === "https:" && !u.username && !u.password;
    } catch {
      return false;
    }
  }, "Use an HTTPS image URL or a local /images/ file.");
const slide = z
  .object({
    eyebrow: z.string().trim().max(100),
    title: z.string().trim().min(1).max(120),
    subtitle: z.string().trim().max(240),
    urdu: z.string().trim().max(100),
    href: publicLink,
    button_label: z.string().trim().min(1).max(60),
    image_url: homepageImage,
  })
  .strict();
const card = z
  .object({
    title: z.string().trim().min(1).max(80),
    description: z.string().trim().max(180),
    urdu: z.string().trim().max(80),
    href: publicLink,
  })
  .strict();
export const homepageSectionSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]{1,64}$/),
    type: z.enum(homepageSectionTypes),
    enabled: z.boolean(),
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().max(1000),
    body: z.string().trim().max(3000),
    href: publicLink,
    button_label: z.string().trim().max(80),
    urdu: z.string().trim().max(500),
    roman: z.string().trim().max(100),
    language: z.enum(languages),
    limit: z.number().int().min(1).max(12),
    kalam_ids: z.array(z.uuid()).max(12),
    artist_ids: z.array(z.uuid()).max(12),
    slides: z.array(slide).max(5),
    cards: z.array(card).max(8),
  })
  .strict()
  .refine((s) => s.type !== "banner" || s.slides.length > 0, {
    message: "A banner needs at least one slide.",
    path: ["slides"],
  });
export const homepageConfigSchema = z
  .object({
    version: z.literal(1),
    seo_title: z.string().trim().min(1).max(100),
    seo_description: z.string().trim().min(1).max(200),
    sections: z.array(homepageSectionSchema).min(1).max(12),
  })
  .strict()
  .refine(
    (v) => new Set(v.sections.map((s) => s.id)).size === v.sections.length,
    { message: "Section IDs must be unique.", path: ["sections"] },
  )
  .refine((v) => v.sections.some((s) => s.enabled), {
    message: "Keep at least one section visible.",
    path: ["sections"],
  });
export type HomepageSection = z.infer<typeof homepageSectionSchema>;
export type HomepageConfig = z.infer<typeof homepageConfigSchema>;
export function newHomepageSection(
  type: HomepageSection["type"],
  id: string,
): HomepageSection {
  return {
    id,
    type,
    enabled: true,
    title: homepageSectionLabels[type],
    description: "",
    body: "",
    href: "/catalogue",
    button_label: "Explore poetry",
    urdu: "",
    roman: "",
    language: "ur",
    limit: type === "artists" ? 4 : 3,
    kalam_ids: [],
    artist_ids: [],
    slides:
      type === "banner"
        ? [
            {
              eyebrow: "THE SUKHAN COLLECTION",
              title: "Words that stay",
              subtitle: "A world of poetry. A home for you.",
              urdu: "سخن",
              href: "/catalogue",
              button_label: "Explore poetry",
              image_url: "",
            },
          ]
        : [],
    cards:
      type === "collections"
        ? [
            {
              title: "Ghazals",
              description: "A world in every couplet",
              urdu: "غزل",
              href: "/catalogue?form=ghazal",
            },
            {
              title: "Nazms",
              description: "Poetry, without boundaries",
              urdu: "نظم",
              href: "/catalogue?form=nazm",
            },
            {
              title: "Voices & performances",
              description: "Words, brought to life",
              urdu: "آواز",
              href: "/media",
            },
          ]
        : [],
  };
}
export const defaultHomepageConfig: HomepageConfig = {
  version: 1,
  seo_title: "Sukhan — A home for words & voices",
  seo_description:
    "Discover Urdu and Persian literature, read poetry in multiple scripts, and explore poets, audio and video.",
  sections: [
    newHomepageSection("banner", "banner"),
    {
      ...newHomepageSection("daily", "daily"),
      title: "TODAY’S SUKHAN SELECTION",
      limit: 5,
    },
    {
      ...newHomepageSection("collections", "collections"),
      title: "EXPLORE SUKHAN",
    },
    {
      ...newHomepageSection("word", "word"),
      title: "A WORD TO KEEP",
      urdu: "سخن",
      roman: "sukhan",
      description: "speech · words · poetry",
      body: "The art of putting a feeling into words.",
      button_label: "Find your next favourite verse",
    },
    {
      ...newHomepageSection("artists", "artists"),
      title: "POETS & ARTISTS",
      description:
        "Discover the people behind the words and the voices behind the verses.",
      button_label: "View all poets & artists",
      href: "/artists",
    },
    {
      ...newHomepageSection("library", "library"),
      title: "THE SUKHAN LIBRARY",
      button_label: "See the full collection",
    },
  ],
};
export function parseHomepageConfig(raw: string): HomepageConfig {
  if (new TextEncoder().encode(raw).length > 200000)
    throw Error("Homepage settings are too large.");
  let input: unknown;
  try {
    input = JSON.parse(raw);
  } catch {
    throw Error("Invalid homepage settings.");
  }
  const parsed = homepageConfigSchema.safeParse(input);
  if (!parsed.success)
    throw Error(
      parsed.error.issues[0]?.message || "Check the homepage fields.",
    );
  return parsed.data;
}
