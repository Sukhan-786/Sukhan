import { getHomepageConfig, getHomepageData } from "@/lib/homepage-data";
import { HomepageView } from "@/components/homepage-view";
export async function generateMetadata() {
  const config = await getHomepageConfig();
  return {
    title: { absolute: config.seo_title },
    description: config.seo_description,
    alternates: { canonical: "/" },
    openGraph: {
      title: config.seo_title,
      description: config.seo_description,
      url: "/",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: config.seo_title,
      description: config.seo_description,
    },
  };
}
export default async function Home() {
  const config = await getHomepageConfig(),
    data = await getHomepageData(config);
  return <HomepageView config={config} {...data} />;
}
