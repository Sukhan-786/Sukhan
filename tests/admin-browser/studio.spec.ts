import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
async function login(page: Page, email = "admin@example.test") {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(email);
  await page
    .getByLabel("Password", { exact: true })
    .fill("fixture-only-password");
  await page.getByRole("button", { name: "Sign in to the studio" }).click();
  await expect(
    page.getByRole("heading", { name: "Good words start here." }),
  ).toBeVisible();
}
test("dashboard, cursor navigation, filters and accessible mobile layout", async ({
  page,
}, info) => {
  await login(page);
  await expect(
    page
      .getByRole("navigation", { name: "Editorial navigation" })
      .getByRole("link", { name: "Overview" }),
  ).toHaveAttribute("aria-current", "page");
  await page
    .getByRole("navigation", { name: "Editorial navigation" })
    .getByRole("link", { name: "Kalam", exact: false })
    .click();
  await page.getByLabel("Search", { exact: true }).fill("studio-poem");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.locator(".record-title")).toHaveCount(25);
  const first = await page.locator(".record-title").allTextContents();
  await page.getByRole("link", { name: "Older →" }).click();
  await expect(page.locator(".record-title")).toHaveCount(6);
  await page.getByRole("link", { name: "← Newer" }).click();
  await expect(page.locator(".record-title")).toHaveText(first);
  await page.getByLabel("Search", { exact: true }).fill("چراغ");
  await page.getByLabel("Status", { exact: true }).selectOption("draft");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.locator("tbody tr")).toHaveCount(15);
  expect(
    (await new AxeBuilder({ page }).include(".admin-layout").analyze())
      .violations,
  ).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `test-results/admin-library-${info.project.name}.png`,
    fullPage: true,
    caret: "initial",
  });
});
test("create a published poet with validation feedback and save confirmation", async ({
  page,
}) => {
  await login(page);
  await page.goto("/admin/artists/new");
  await page
    .getByLabel("URL slug", { exact: true })
    .fill(`new-poet-${Date.now()}`);
  await page.getByLabel("Name", { exact: true }).fill("New studio poet");
  await page.getByLabel("Publication status").selectOption("published");
  await page.getByRole("button", { name: "Publish changes" }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "highlighted fields",
  );
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue(
    "New studio poet",
  );
  await page
    .getByLabel("Source, attribution")
    .fill("Original test profile, permission granted.");
  await page.getByRole("button", { name: "Publish changes" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Your changes were saved." }),
  ).toContainText("Your changes were saved.");
});
test("multilingual poetry, preserved attachments, validation and public reading", async ({
  page,
}, info) => {
  await login(page);
  await page.goto("/admin/kalam/new");
  const slug = `new-words-${Date.now()}`;
  await page.getByLabel("URL slug", { exact: true }).fill(slug);
  await page
    .getByLabel("Poet / author")
    .selectOption({ label: "Studio Poet (published)" });
  await page.getByRole("button", { name: /English/ }).click();
  await page
    .getByLabel("English title", { exact: true })
    .fill("Words for a new morning");
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "highlighted fields",
  );
  await page.getByRole("link", { name: /English text/ }).click();
  await expect(page.getByLabel("English text", { exact: true })).toBeFocused();
  await page
    .getByLabel("English text", { exact: true })
    .fill("A small light\nA new morning");
  await page.getByRole("button", { name: /اردو/ }).click();
  await page.getByLabel("اردو title", { exact: true }).fill("نئی صبح");
  await page.getByLabel("اردو text", { exact: true }).fill("الفاظ کی روشنی");
  await page.getByRole("button", { name: "Preview current script" }).click();
  await expect(page.locator(".editor-preview")).toHaveAttribute("dir", "rtl");
  for (const [language, label, title, body, direction] of [
    ["hi", "हिन्दी", "नई सुबह", "शब्दों की रोशनी\nएक नई सुबह", "ltr"],
    ["ar", "العربية", "صباح جديد", "نور الكلمات\nصباح جديد", "rtl"],
    ["roman", "Roman Urdu", "Nayi subah", "Lafzon ki roshni", "ltr"],
    ["fa", "فارسی", "صبح نو", "روشنایی واژه‌ها", "rtl"],
  ]) {
    await page.getByRole("button", { name: new RegExp(label) }).click();
    await page.getByLabel(`${label} title`, { exact: true }).fill(title);
    if (language === "hi") {
      await page.locator("#hi_import").setInputFiles({
        name: "invalid.txt",
        mimeType: "text/plain",
        buffer: Buffer.from([0xff]),
      });
      await expect(page.locator("main").getByRole("alert")).toContainText(
        "UTF-8",
      );
      await expect(page.locator("#hi_body")).toHaveValue("");
    }
    await page.locator(`#${language}_import`).setInputFiles({
      name: `${language}.txt`,
      mimeType: "text/plain",
      buffer: Buffer.from(body.replaceAll("\n", "\r\n"), "utf8"),
    });
    await expect(page.locator(`#${language}_body`)).toHaveValue(body);
    await expect(page.locator(`#${language}_body`)).toHaveAttribute(
      "dir",
      direction,
    );
    await expect(page.locator(".editor-preview")).toHaveAttribute(
      "dir",
      direction,
    );
    await expect(page.locator(".editor-preview h2")).toHaveText(title);
  }
  await page.getByLabel("Morning voice").check();
  await page.getByLabel("Find a recording").fill("Evening");
  await expect(page.getByLabel("Morning voice")).toBeHidden();
  await page
    .getByLabel("Source, attribution")
    .fill("Original studio test poem.");
  await page.getByLabel("Publication status").selectOption("published");
  expect(
    (await new AxeBuilder({ page }).include(".admin-layout").analyze())
      .violations,
  ).toEqual([]);
  await page.screenshot({
    path: `test-results/admin-editor-${info.project.name}.png`,
    fullPage: true,
    caret: "initial",
  });
  await page.getByRole("button", { name: "Publish changes" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Your changes were saved." }),
  ).toContainText("Your changes were saved.");
  await page.goto(`/kalam/${slug}`);
  await expect(page.getByRole("heading", { name: "نئی صبح" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Morning voice" }),
  ).toBeVisible();
  for (const [label, title, body, direction, tag] of [
    ["हिन्दी", "नई सुबह", "शब्दों की रोशनी\nएक नई सुबह", "ltr", "hi"],
    ["العربية", "صباح جديد", "نور الكلمات\nصباح جديد", "rtl", "ar"],
    ["Roman Urdu", "Nayi subah", "Lafzon ki roshni", "ltr", "ur-Latn"],
    ["فارسی", "صبح نو", "روشنایی واژه‌ها", "rtl", "fa"],
    [
      "English",
      "Words for a new morning",
      "A small light\nA new morning",
      "ltr",
      "en",
    ],
  ]) {
    await page.getByRole("button", { name: label, exact: true }).click();
    await expect(page.locator(".poem")).toHaveAttribute("lang", tag);
    await expect(page.locator(".poem")).toHaveAttribute("dir", direction);
    await expect(page.locator(".poem h2")).toHaveText(title);
    await expect(page.locator(".poem p")).toHaveText(body);
  }
});
test("unsaved changes are protected and editors cannot edit published records", async ({
  page,
}) => {
  await login(page);
  await page.goto("/admin/artists/new");
  await page.getByLabel("Name", { exact: true }).fill("Unfinished profile");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("link", { name: "Back to library" }).click();
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue(
    "Unfinished profile",
  );
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("link", { name: "Back to library" }).click();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await login(page, "editor@example.test");
  await page.goto("/admin/artists/new");
  await expect(
    page.getByLabel("Publication status").locator("option[value=published]"),
  ).toHaveCount(0);
  await page.goto("/admin/artists/b0000000-0000-4000-8000-000000000001");
  await expect(page.getByLabel("Name", { exact: true })).toBeDisabled();
  await expect(
    page.getByText(
      "Published records can only be changed by an administrator.",
    ),
  ).toBeVisible();
});
test("ordinary authenticated readers cannot enter the admin dashboard", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("Email address").fill("reader@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("fixture-only-password");
  await page.getByRole("button", { name: "Sign in to the studio" }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "does not have a staff role",
  );
  await expect(
    page.getByRole("navigation", { name: "Editorial navigation" }),
  ).toHaveCount(0);
});
