import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("Persian and Arabic read as passages; reviewed translations appear below and stale ones disappear", async ({
  page,
}, info) => {
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
  await page.goto("/admin/kalam/new");
  const slug = `passage-reader-${Date.now()}`;
  await page.getByLabel("URL slug", { exact: true }).fill(slug);
  await page
    .getByLabel("Poet / author")
    .selectOption({ label: "Studio Poet (published)" });
  for (const [label, title, body] of [
    ["فارسی", "آزمون فارسی", "واژه روشن است\nراهی به فردا\n\nسطر آخر"],
    ["العربية", "اختبار عربي", "صوت جديد\nنور بعيد"],
  ]) {
    await page
      .getByRole("group", { name: "Editor language" })
      .getByRole("button", { name: new RegExp(label) })
      .click();
    await page.getByLabel(`${label} title`, { exact: true }).fill(title);
    await page.getByLabel(`${label} text`, { exact: true }).fill(body);
  }
  await page
    .getByLabel("Source, attribution")
    .fill(
      "Original isolated browser test text; permission to publish this test.",
    );
  await page.getByLabel("Publication status").selectOption("published");
  await page.getByRole("button", { name: "Publish changes" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Your changes were saved.",
  );
  await page.getByLabel("Search", { exact: true }).fill(slug);
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.locator(".record-title")).toHaveCount(1);
  await page.locator(".record-title").click();
  await expect(page).toHaveURL(/\/admin\/kalam\/[a-f0-9-]{36}(?:\?|$)/);
  const edit = page.url();
  await page
    .getByRole("link", { name: "Manage Persian / Arabic translations →" })
    .click();
  await expect(page).toHaveURL(/\/translations(?:\?|$)/);
  const translationUrl = page.url();
  await page.getByLabel("Original language").selectOption("fa");
  await page
    .getByLabel("Passage translation", { exact: true })
    .fill("یہ ایک الگ ٹیسٹ کا ترجمہ ہے۔");
  await page
    .getByLabel("Translator and source")
    .fill("Original translation written for this isolated browser test.");
  await page
    .getByRole("button", { name: "Save translation", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Translation saved");
  const entry = page.url();
  await page.goto(`/kalam/${slug}?lang=fa`);
  await expect(page.locator(".poem")).toHaveAttribute("lang", "fa");
  await expect(page.locator(".poem button")).toHaveCount(0);
  await expect(page.locator(".passage-original")).toHaveCount(2);
  await expect(page.locator(".passage-original").last()).toHaveText("سطر آخر");
  await expect(page.locator(".passage-translation")).toHaveCount(0);
  await page.goto(entry);
  await page.getByLabel("Publication status").selectOption("published");
  await page
    .getByRole("button", { name: "Save translation", exact: true })
    .click();
  await expect(page.locator("main").getByRole("alert")).toContainText("Review");
  await page.getByLabel("I reviewed this translation").check();
  const previousVersion = await page
    .locator('input[name="version"]')
    .inputValue();
  await page
    .getByRole("button", { name: "Save translation", exact: true })
    .click();
  await expect(page.locator('input[name="version"]')).not.toHaveValue(
    previousVersion,
  );
  await expect(page.getByRole("status")).toContainText("Translation saved");
  await page.goto(`/kalam/${slug}?lang=fa`);
  await expect(page.locator(".passage-translation p")).toHaveText(
    "یہ ایک الگ ٹیسٹ کا ترجمہ ہے۔",
  );
  await expect(page.locator(".passage-translation")).toHaveAttribute(
    "lang",
    "ur",
  );
  await expect(page.locator(".passage-translation")).toHaveAttribute(
    "dir",
    "rtl",
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    `http://127.0.0.1:3104/kalam/${slug}`,
  );
  await page.getByRole("button", { name: "العربية", exact: true }).click();
  await expect(page.locator(".poem")).toHaveAttribute("lang", "ar");
  await expect(page.locator(".poem button")).toHaveCount(0);
  await expect(page.locator(".passage-translation")).toHaveCount(0);
  expect(
    (await new AxeBuilder({ page }).include("main").analyze()).violations,
  ).toEqual([]);
  await page.goto(`/kalam/${slug}?lang=fa`);
  await page.screenshot({
    path: `test-results/persian-passage-reader-${info.project.name}.png`,
    fullPage: true,
  });
  await page.goto(edit);
  await page
    .getByRole("group", { name: "Editor language" })
    .getByRole("button", { name: /فارسی/ })
    .click();
  await page
    .getByLabel("فارسی text", { exact: true })
    .fill("واژه روشن است\nراهی به فردا\n\nسطر آخر\nسطر نو");
  await page.getByRole("button", { name: "Publish changes" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Your changes were saved.",
  );
  await page.goto(`/kalam/${slug}?lang=fa`);
  await expect(page.locator(".passage-translation")).toHaveCount(0);
  await page.goto(translationUrl);
  await expect(page.getByText(/source changed/)).toBeVisible();
});
