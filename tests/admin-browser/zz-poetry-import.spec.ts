import { test, expect } from "@playwright/test";
test("supplied poetry import checks the real shard and resumes after a saved batch", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.goto("/login");
  await page.getByLabel("Email address").fill("admin@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("fixture-only-password");
  await page.getByRole("button", { name: "Sign in to the studio" }).click();
  await expect(
    page.getByRole("heading", { name: "Good words start here." }),
  ).toBeVisible();
  await page.goto("/admin/import-poetry");
  const progress = page.getByRole("progressbar", {
    name: "Poetry import progress",
  });
  let previous = Number(await progress.getAttribute("value"));
  await page.getByLabel("I have checked the supplied source notices").check();
  await page
    .getByRole("button", {
      name: previous
        ? "Resume poetry import"
        : "Import and publish supplied poetry",
      exact: true,
    })
    .click();
  await expect
    .poll(async () => Number(await progress.getAttribute("value")), {
      timeout: 30000,
    })
    .toBeGreaterThan(previous);
  await page
    .getByRole("button", { name: "Pause after current batch", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Resume poetry import", exact: true }),
  ).toBeEnabled({ timeout: 30000 });
  previous = Number(await progress.getAttribute("value"));
  await page.reload();
  await expect(progress).toHaveAttribute("value", String(previous));
  await page.getByLabel("I have checked the supplied source notices").check();
  await page
    .getByRole("button", { name: "Resume poetry import", exact: true })
    .click();
  await expect
    .poll(async () => Number(await progress.getAttribute("value")), {
      timeout: 30000,
    })
    .toBeGreaterThan(previous);
  await page
    .getByRole("button", { name: "Pause after current batch", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Resume poetry import", exact: true }),
  ).toBeEnabled({ timeout: 30000 });
  await expect(page.locator(".poetry-import-panel")).toContainText(
    "new works saved",
  );
  await expect(page.locator("main").getByRole("alert")).toHaveCount(0);
  await page.goto("/catalogue?lang=roman");
  await expect(page.locator(".kalam-card")).not.toHaveCount(0);
  await page.locator(".kalam-card h3 a").first().click();
  await expect(page.locator(".poem")).toHaveAttribute("lang", "ur-Latn");
  await expect(page.locator(".provenance")).toContainText(
    "User-supplied Urdu corpus",
  );
});
