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
  await expect(page.getByRole("status")).toContainText(
    "Your changes were saved.",
  );
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
  await expect(page.getByRole("status")).toContainText(
    "Your changes were saved.",
  );
  await page.goto(`/kalam/${slug}`);
  await expect(page.getByRole("heading", { name: "نئی صبح" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Morning voice" }),
  ).toBeVisible();
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
