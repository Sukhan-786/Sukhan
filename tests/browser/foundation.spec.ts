import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("homepage, navigation and accessibility", async ({ page }, info) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "WORDS THAT STAY",
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Foundation preview", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "explore poetry" }),
  ).toHaveAttribute("href", "/catalogue");
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page
    .locator(
      info.project.name === "mobile"
        ? ".mobile-menu summary"
        : ".more-menu summary",
    )
    .click();
  const menu = page.getByRole("navigation", {
    name:
      info.project.name === "mobile"
        ? "Expanded navigation"
        : "Main navigation",
    exact: true,
  });
  await menu.getByRole("link", { name: "Dictionary", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Sukhan Dictionary", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Word", { exact: true }).fill("dekhaa");
  await page.getByRole("button", { name: "Look up word", exact: true }).click();
  await expect(
    page.getByText("No reviewed entries found yet.", { exact: true }),
  ).toBeVisible();
});
test("search spans scripts, poet names, form filters and empty results", async ({
  page,
}) => {
  await page.goto("/catalogue");
  await page.getByLabel("Search words, titles or poets").fill("چراغ");
  await page
    .getByRole("search", { name: "Catalogue search" })
    .getByRole("button", { name: /Search/ })
    .click();
  await expect(
    page.getByRole("heading", { name: "A lamp of words" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "The evening page" }),
  ).toHaveCount(0);
  await page.getByLabel("Search words, titles or poets").fill("studio");
  await page.getByLabel("Literary form").selectOption("sher");
  await page
    .getByRole("search", { name: "Catalogue search" })
    .getByRole("button", { name: /Search/ })
    .click();
  await expect(
    page.getByRole("heading", { name: "The evening page" }),
  ).toBeVisible();
  await page
    .getByLabel("Search words, titles or poets")
    .fill("nothing-matches");
  await page
    .getByRole("search", { name: "Catalogue search" })
    .getByRole("button", { name: /Search/ })
    .click();
  await expect(
    page.getByRole("heading", { name: "No works found" }),
  ).toBeVisible();
});
test("four-script reader switches language, direction and text size", async ({
  page,
}) => {
  await page.goto("/kalam/a-lamp-of-words");
  await expect(page.locator(".poem")).toHaveAttribute("dir", "rtl");
  await page.getByRole("button", { name: "English", exact: true }).click();
  await expect(page.locator(".poem")).toHaveAttribute("lang", "en");
  await expect(page.locator(".poem")).toHaveAttribute("dir", "ltr");
  await expect(page.locator(".poem p")).toContainText(
    "A lamp of words is burning",
  );
  await page.getByRole("button", { name: "Roman Urdu", exact: true }).click();
  await expect(page.locator(".poem")).toHaveAttribute("lang", "ur-Latn");
  await page.getByRole("button", { name: "فارسی", exact: true }).click();
  await expect(page.locator(".poem")).toHaveAttribute("lang", "fa");
  await page.getByLabel("Text size").fill("36");
  await expect(page.locator(".poem p")).toHaveCSS("font-size", "36px");
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});
test("missing scripts are disabled and artist pages show related work", async ({
  page,
}) => {
  await page.goto("/kalam/the-evening-page");
  await expect(
    page.getByRole("button", { name: "اردو", exact: true }),
  ).toBeDisabled();
  await page.goto("/artists/sukhan-studio");
  await expect(
    page.getByRole("heading", { name: "Sukhan Studio", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "A lamp of words", exact: true }),
  ).toBeVisible();
});
test("all admin routes are protected and setup is explicit", async ({
  page,
}) => {
  for (const path of [
    "/admin",
    "/admin/kalam/new",
    "/admin/artists/new",
    "/admin/media/new",
  ]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login\?reason=setup/);
    await expect(
      page.getByRole("button", { name: "Sign in to the studio" }),
    ).toBeDisabled();
  }
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});
test("SEO, sitemap, noindex preview and missing pages", async ({
  page,
  request,
}) => {
  await page.goto("/kalam/a-lamp-of-words");
  await expect(page).toHaveTitle("A lamp of words | Sukhan");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "http://localhost:3000/kalam/a-lamp-of-words",
  );
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
  const json = await page
    .locator('script[type="application/ld+json"]')
    .textContent();
  expect(JSON.parse(json || "{}")["@type"]).toBe("CreativeWork");
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  expect(await sitemap.text()).toContain("/kalam/a-lamp-of-words");
  const robots = await request.get("/robots.txt");
  expect(await robots.text()).toContain("Disallow: /");
  const missing = await page.goto("/kalam/does-not-exist");
  expect(missing?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { name: "This page isn’t in the library." }),
  ).toBeVisible();
});
test("media library has an honest empty state", async ({ page }) => {
  await page.goto("/media");
  await expect(
    page.getByRole("heading", { name: "A space for our voices" }),
  ).toBeVisible();
  await expect(page.locator("audio,video")).toHaveCount(0);
});

test("homepage collection and poetry controls work", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Next collection", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "EVERY LINE, A WORLD" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Previous collection", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "WORDS THAT STAY" }),
  ).toBeVisible();
  const featured = page.getByRole("region", {
    name: "Featured poetry",
    exact: true,
  });
  await featured.getByRole("button", { name: "اردو", exact: true }).click();
  await expect(featured.locator("blockquote")).toHaveAttribute("dir", "rtl");
  await featured
    .getByRole("button", { name: "Translation", exact: true })
    .click();
  await expect(featured.locator(".featured-translation")).toContainText(
    "A lamp of words",
  );
  await featured
    .getByRole("button", { name: "Next poem", exact: true })
    .click();
  await expect(featured.locator("blockquote")).toContainText(
    "The evening leaves",
  );
  const downloadPromise = page.waitForEvent("download");
  await featured.getByRole("button", { name: "Download", exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("the-evening-page-en.txt");
});
