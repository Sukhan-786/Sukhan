import "server-only";
import { cache } from "react";
import { homepageKalam, listArtists } from "./data";
import type { Kalam, Artist } from "./types";
import { createPublicClient } from "./supabase/public";
import {
  defaultHomepageConfig,
  homepageConfigSchema,
  type HomepageConfig,
} from "./homepage";
export const getHomepageConfig = cache(
  async function getHomepageConfig(): Promise<HomepageConfig> {
    const db = createPublicClient();
    if (!db) return defaultHomepageConfig;
    const { data, error } = await db
      .from("homepage_public")
      .select("config")
      .eq("id", true)
      .maybeSingle();
    if (error) throw Error("The homepage settings could not be loaded.");
    const parsed = homepageConfigSchema.safeParse(data?.config);
    return parsed.success ? parsed.data : defaultHomepageConfig;
  },
);

export async function getHomepageData(config: HomepageConfig) {
  const ids = [...new Set(config.sections.flatMap((s) => s.kalam_ids))];
  const scripts = [
    ...new Set(
      config.sections
        .filter((s) => s.enabled && ["daily", "library"].includes(s.type))
        .map((s) => s.language),
    ),
  ];
  const [feeds, selected, artists] = await Promise.all([
    Promise.all(scripts.map((language) => homepageKalam(language))),
    ids.length ? homepageKalam(undefined, ids) : Promise.resolve([]),
    listArtists(),
  ]);
  const items = [
    ...new Map([...feeds.flat(), ...selected].map((k) => [k.id, k])).values(),
  ].map((k) => ({
    ...k,
    texts: k.texts.map((t) => ({
      ...t,
      body: t.body.split("\n").filter(Boolean).slice(0, 4).join("\n"),
    })),
    poet: k.poet ? { ...k.poet, bio: "" } : null,
  }));
  return {
    items: items as Kalam[],
    artists: artists.map((a) => ({ ...a, bio: "" })) as Artist[],
  };
}
