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
test("homepage draft, ordered sections, private preview and administrator publishing", async ({
  page,
  context,
}, info) => {
  await login(page);
  await page.goto("/admin/homepage");
  const heading = `Words for ${info.project.name}`;
  await page.getByLabel("Banner heading", { exact: true }).first().fill(heading);
  await page.getByLabel("Upload banner image").setInputFiles({
    name: "unsafe.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'),
  });
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "not accepted",
  );
  await page.getByLabel("New section type").selectOption("text");
  await page.getByRole("button", { name: "Add section", exact: true }).click();
  await page
    .getByLabel("Section title", { exact: true })
    .fill(`A private editorial note ${info.project.name}`);
  await page
    .getByLabel("Section text", { exact: true })
    .fill("This should remain private until publishing.");
  await page.getByLabel("Show this section").uncheck();
  await page
    .getByRole("button", {
      name: `Move A private editorial note ${info.project.name} up`,
    })
    .click();
  await expect(
    page.getByRole("button", { name: "Publish saved homepage" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Save homepage draft" }).click();
  await expect(page.getByRole("status")).toContainText("Draft saved");
  const preview = await context.newPage();
  await preview.goto("/admin/homepage/preview");
  await expect(
    preview.getByRole("heading", { name: heading, exact: true }),
  ).toBeVisible();
  await expect(
    preview.getByRole("heading", {
      name: `A private editorial note ${info.project.name}`,
      exact: true,
    }),
  ).toHaveCount(0);
  const anon = await context.browser()!.newContext();
  const viewer = await anon.newPage();
  await viewer.goto("/");
  await expect(
    viewer.getByRole("heading", { name: heading, exact: true }),
  ).toHaveCount(0);
  await viewer.goto("/admin/homepage/preview");
  await expect(viewer).toHaveURL(/\/login/);
  await page.getByRole("button", { name: "Publish saved homepage" }).click();
  await expect(page.getByRole("status")).toContainText("now published");
  await viewer.goto("/");
  await expect(
    viewer.getByRole("heading", { name: heading, exact: true }),
  ).toBeVisible();
  await page.goto("/admin/homepage");
  expect(
    (await new AxeBuilder({ page }).include(".homepage-builder").analyze())
      .violations,
  ).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `test-results/homepage-editor-${info.project.name}.png`,
    fullPage: true,
  });
  await viewer.screenshot({
    path: `test-results/homepage-public-${info.project.name}.png`,
    fullPage: true,
  });
  await anon.close();
  await preview.close();
});
test("editor can prepare the homepage but cannot publish", async ({ page }) => {
  await login(page, "editor@example.test");
  await page.goto("/admin/homepage");
  await expect(
    page.getByRole("heading", { name: "Your homepage, your way." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Publish saved homepage" }),
  ).toHaveCount(0);
  await expect(page.getByLabel("Upload banner image")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Save homepage draft" }),
  ).toBeEnabled();
});
