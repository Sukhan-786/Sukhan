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
    await page
      .getByRole("group", { name: "Editor language" })
      .getByRole("button", { name: new RegExp(label) })
      .click();
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

async function saveMeaningForm(page: Page, label: string) {
  const version = await page.locator('input[name="version"]').inputValue();
  await page.getByRole("button", { name: label, exact: true }).click();
  await expect(page.locator('input[name="version"]')).not.toHaveValue(version);
  await expect(page.locator("form.editor")).toHaveAttribute(
    "aria-busy",
    "false",
  );
}
test("reviewed word meanings publish by occurrence, support Hindi/Arabic and require re-review after text edits", async ({
  page,
}, info) => {
  test.setTimeout(120_000);
  await login(page);
  const slug = `meaning-work-${Date.now()}`;
  await page.goto("/admin/kalam/new");
  await page.getByLabel("URL slug", { exact: true }).fill(slug);
  await page
    .getByLabel("Poet / author")
    .selectOption({ label: "Studio Poet (published)" });
  for (const [label, title, body] of [
    ["اردو", "دل", "دل کی روشنی"],
    ["English", "An original heart", "A heart, and a heart."],
    ["हिन्दी", "दिल", "दिल की रोशनी"],
    ["العربية", "القلب", "نور القلب"],
  ]) {
    await page
      .getByRole("group", { name: "Editor language" })
      .getByRole("button", { name: new RegExp(label) })
      .click();
    await page.getByLabel(`${label} title`, { exact: true }).fill(title);
    await page.getByLabel(`${label} text`, { exact: true }).fill(body);
  }
  await page.getByLabel("Source, attribution").fill("Original fixture poem.");
  await page.getByLabel("Publication status").selectOption("published");
  await page.getByRole("button", { name: "Publish changes" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Your changes were saved.",
  );
  await page.getByLabel("Search", { exact: true }).fill(slug);
  await page.getByRole("button", { name: "Apply filters" }).click();
  const editPath = await page
    .getByRole("link", { name: "An original heart", exact: true })
    .getAttribute("href");
  expect(editPath).toMatch(/^\/admin\/kalam\/[a-f0-9-]+$/);
  await page.goto(editPath!);
  await page
    .getByRole("link", { name: "Manage reviewed word meanings" })
    .click();
  await expect(page).toHaveURL(/\/meanings$/);
  const meaningsPath = new URL(page.url()).pathname;
  await page.getByLabel("Poem script").selectOption("en");
  await page
    .getByRole("button", { name: "Select heart at character 3", exact: true })
    .click();
  await page.getByLabel("English meaning", { exact: true }).fill("affection");
  await page.getByLabel("اردو meaning", { exact: true }).fill("محبت");
  await page.getByLabel("हिन्दी meaning", { exact: true }).fill("प्रेम");
  await page.getByLabel("العربية meaning", { exact: true }).fill("محبة");
  await page
    .getByLabel("Source or editorial attribution")
    .fill("Original editorial definition for this test.");
  await saveMeaningForm(page, "Save meaning draft");
  await expect(
    page.getByRole("status").filter({ hasText: "Meaning saved." }),
  ).toBeVisible();
  const entryUrl = page.url();
  await page.goto(`/kalam/${slug}`);
  await page.getByRole("button", { name: "English", exact: true }).click();
  await expect(page.locator(".meaning-word")).toHaveCount(0);
  await page.goto(entryUrl);
  await page.getByLabel("Meaning status").selectOption("published");
  await page.getByRole("button", { name: "Publish reviewed meaning" }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "Confirm your review",
  );
  await page.getByLabel("I reviewed this word").check();
  await saveMeaningForm(page, "Publish reviewed meaning");
  await expect(
    page.getByRole("status").filter({ hasText: "Meaning saved." }),
  ).toBeVisible();
  await page.goto(`/kalam/${slug}`);
  await page.getByRole("button", { name: "English", exact: true }).click();
  await expect(page.locator(".poem p")).toHaveText("A heart, and a heart.");
  await expect(page.locator(".meaning-word")).toHaveCount(1);
  const word = page.getByRole("button", {
    name: "Meaning of heart",
    exact: true,
  });
  await word.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  for (const meaning of ["affection", "محبت", "प्रेम", "محبة"])
    await expect(dialog.getByText(meaning, { exact: true })).toBeVisible();
  expect(
    (await new AxeBuilder({ page }).include(".reading-shell").analyze())
      .violations,
  ).toEqual([]);
  await page.screenshot({
    path: `test-results/word-meaning-dialog-${info.project.name}.png`,
    fullPage: true,
  });
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(word).toBeFocused();
  for (const [script, token, label, dir] of [
    ["hi", "दिल", "हिन्दी", "ltr"],
    ["ar", "القلب", "العربية", "rtl"],
  ]) {
    await page.goto(meaningsPath);
    await page.getByLabel("Poem script").selectOption(script);
    await page
      .getByRole("button", { name: new RegExp(`Select ${token} at character`) })
      .click();
    await page.getByLabel("English meaning", { exact: true }).fill("heart");
    await page
      .getByLabel("Source or editorial attribution")
      .fill("Original reviewed test definition.");
    await page.getByLabel("Meaning status").selectOption("published");
    await page.getByLabel("I reviewed this word").check();
    await page
      .getByRole("button", { name: "Publish reviewed meaning" })
      .click();
    await expect(
      page.getByRole("status").filter({ hasText: "Meaning saved." }),
    ).toBeVisible();
    await page.goto(`/kalam/${slug}`);
    await page.getByRole("button", { name: label, exact: true }).click();
    await page
      .getByRole("button", { name: `Meaning of ${token}`, exact: true })
      .click();
    await expect(
      page
        .getByRole("dialog")
        .getByRole("heading", { name: token, exact: true }),
    ).toHaveAttribute("dir", dir);
    await page
      .getByRole("button", { name: "Close meaning", exact: true })
      .click();
  }
  await page.goto(editPath!);
  await page.getByRole("button", { name: /English/ }).click();
  await page
    .getByLabel("English text", { exact: true })
    .fill("A heart, and a heart.\nA revised line.");
  await page.getByRole("button", { name: "Publish changes" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Your changes were saved.",
  );
  await page.goto(`/kalam/${slug}`);
  await page.getByRole("button", { name: "English", exact: true }).click();
  await expect(page.locator(".meaning-word")).toHaveCount(0);
  await page.getByRole("button", { name: "हिन्दी", exact: true }).click();
  await expect(page.locator(".meaning-word")).toHaveCount(1);
  await page.goto(entryUrl);
  await expect(
    page.getByText("The poem text changed.", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Select heart at character 3", exact: true })
    .click();
  await page.getByLabel("I reviewed this word").check();
  expect(
    (await new AxeBuilder({ page }).include(".admin-layout").analyze())
      .violations,
  ).toEqual([]);
  await page.screenshot({
    path: `test-results/word-meaning-admin-${info.project.name}.png`,
    fullPage: true,
  });
  await saveMeaningForm(page, "Publish reviewed meaning");
  await expect(
    page.getByRole("status").filter({ hasText: "Meaning saved." }),
  ).toBeVisible();
  await page.goto(entryUrl);
  await page.getByLabel("Meaning status").selectOption("archived");
  await saveMeaningForm(page, "Archive meaning");
  await expect(
    page.getByRole("status").filter({ hasText: "Meaning saved." }),
  ).toBeVisible();
  await page.goto(`/kalam/${slug}`);
  await page.getByRole("button", { name: "English", exact: true }).click();
  await expect(page.locator(".meaning-word")).toHaveCount(0);
});

test("shared dictionary imports JSON and automatically resolves repeated poem words after review", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  await login(page);
  const wordId = `dekhaa-${Date.now()}`;
  const example = {
    word_id: wordId,
    roman: "dekhaa",
    urdu: "دیکھا",
    hindi: "देखा",
    part_of_speech: "verb",
    english_meanings: ["saw", "seen", "observed"],
    arabic_meanings: ["رأى", "شاهد"],
    urdu_meanings: ["نظر سے مشاہدہ کیا"],
    wazan: ["22"],
    wazan_note: "User example; checked for this isolated test.",
    root_word: "dekhnaa",
    audio_url: null,
  };
  await page.goto("/admin/dictionary");
  await page.getByText("Import one word from JSON", { exact: true }).click();
  await page
    .getByLabel("Dictionary JSON", { exact: true })
    .fill(JSON.stringify(example));
  await page.getByRole("button", { name: "Load JSON into form" }).click();
  await expect(page.getByLabel("Word ID", { exact: true })).toHaveValue(wordId);
  await expect(page.getByLabel("اردو spelling", { exact: true })).toHaveValue(
    "دیکھا",
  );
  await expect(
    page.getByLabel("English meanings — one per line", { exact: true }),
  ).toHaveValue("saw\nseen\nobserved");
  await page
    .getByRole("button", { name: "Save dictionary draft", exact: true })
    .click();
  await expect(page).toHaveURL(/entry=[a-f0-9-]+&notice=saved/);
  await expect(
    page.getByRole("status").filter({ hasText: "Dictionary entry saved." }),
  ).toBeVisible();
  const entryUrl = page.url();
  const lookup = await page.request.get(
    "/api/dictionary?language=roman&word=dekhaa",
  );
  expect(await lookup.json()).toEqual({ entries: [], wordBank: [] });
  const bad = await page.request.get(
    "/api/dictionary?language=bad&word=dekhaa",
  );
  expect(bad.status()).toBe(400);
  await page
    .getByLabel("Dictionary status", { exact: true })
    .selectOption("published");
  await page
    .getByRole("button", { name: "Publish reviewed dictionary entry" })
    .click();
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "attribution",
  );
  await page
    .getByLabel("Source or editorial attribution", { exact: true })
    .fill("User-provided example reviewed for the isolated test.");
  await page.getByLabel("I reviewed the spellings").check();
  const old = await page.locator('input[name="version"]').inputValue();
  await page
    .getByRole("button", { name: "Publish reviewed dictionary entry" })
    .click();
  await expect(page.locator('input[name="version"]')).not.toHaveValue(old);
  await expect(page.locator("form[aria-busy]")).toHaveAttribute(
    "aria-busy",
    "false",
  );
  await expect(page.getByLabel("Word ID", { exact: true })).toHaveValue(wordId);
  expect(
    (await new AxeBuilder({ page }).include(".admin-layout").analyze())
      .violations,
  ).toEqual([]);
  await page.screenshot({
    path: `test-results/dictionary-admin-${info.project.name}.png`,
    fullPage: true,
  });
  const slug = `dictionary-poem-${Date.now()}`;
  await page.goto("/admin/kalam/new");
  await page.getByLabel("URL slug", { exact: true }).fill(slug);
  await page
    .getByLabel("Poet / author")
    .selectOption({ label: "Studio Poet (published)" });
  for (const [label, title, body] of [
    ["Roman Urdu", "An original line", "dekhaa,  dekhaa.\nmystery"],
    ["اردو", "دیکھا", "دیکھا"],
    ["हिन्दी", "देखा", "देखा"],
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
    .fill("Original isolated test line.");
  await page.getByLabel("Publication status").selectOption("published");
  await page.getByRole("button", { name: "Publish changes" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Your changes were saved." }),
  ).toBeVisible();
  await page.goto(`/kalam/${slug}`);
  await page.getByRole("button", { name: "Roman Urdu", exact: true }).click();
  await expect(page.locator(".poem p")).toHaveText("dekhaa,  dekhaa.\nmystery");
  const words = page.getByRole("button", {
    name: "Dictionary meaning of dekhaa",
    exact: true,
  });
  await expect(words).toHaveCount(2);
  await words.nth(1).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("saw", { exact: true })).toBeVisible();
  await expect(dialog.getByText("دیکھا", { exact: true })).toBeVisible();
  await expect(dialog.getByText("देखा", { exact: true })).toBeVisible();
  await expect(dialog.getByText("verb", { exact: true })).toBeVisible();
  await expect(dialog.getByText("رأى", { exact: true })).toBeVisible();
  await expect(
    dialog.getByRole("region", { name: "Reviewed wazan" }),
  ).toContainText("22");
  await expect(dialog.getByText("dekhnaa", { exact: true })).toBeVisible();
  await expect(dialog.locator("audio")).toHaveCount(0);
  expect(
    (await new AxeBuilder({ page }).include(".reading-shell").analyze())
      .violations,
  ).toEqual([]);
  await page.screenshot({
    path: `test-results/dictionary-reader-${info.project.name}.png`,
    fullPage: false,
  });
  await page.keyboard.press("Escape");
  await expect(words.nth(1)).toBeFocused();
  await page
    .getByRole("button", { name: "Dictionary meaning of mystery", exact: true })
    .click();
  await expect(dialog).toContainText("No reviewed dictionary entry");
  await page.keyboard.press("Escape");
  for (const label of ["اردو", "हिन्दी"]) {
    await page
      .getByRole("group", { name: "Reading language" })
      .getByRole("button", { name: label, exact: true })
      .click();
    await page.locator(".dictionary-word").first().click();
    await expect(dialog.getByText("saw", { exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
  }
  await page.goto(`/dictionary/${wordId}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("dekhaa");
  await expect(page.locator(".dictionary-definition")).toContainText(
    "observed",
  );
  await page.goto(entryUrl);
  await page
    .getByLabel("Dictionary status", { exact: true })
    .selectOption("archived");
  const version = await page.locator('input[name="version"]').inputValue();
  await page.getByRole("button", { name: "Archive dictionary entry" }).click();
  await expect(page.locator('input[name="version"]')).not.toHaveValue(version);
  const archived = await page.request.get(
    "/api/dictionary?language=roman&word=dekhaa",
  );
  expect(await archived.json()).toEqual({ entries: [], wordBank: [] });
  await page.goto(`/dictionary/${wordId}`);
  await expect(
    page.getByRole("heading", { name: "This page isn’t in the library." }),
  ).toBeVisible();
});

test("large Urdu word bank imports resumably and exposes labelled candidates without inventing Arabic meanings", async ({
  page,
}, info) => {
  test.setTimeout(240000);
  await login(page);
  await page.goto("/admin/dictionary/word-bank");
  const progress = page.getByRole("progressbar", {
    name: "Word bank import progress",
  });
  if ((await progress.getAttribute("value")) !== "154781") {
    await page
      .getByRole("button", {
        name: "Import 154,781 Urdu word forms",
        exact: true,
      })
      .click();
    await expect
      .poll(async () => Number(await progress.getAttribute("value")), {
        timeout: 60000,
      })
      .toBeGreaterThan(0);
    await page
      .getByRole("button", { name: "Pause after current batch" })
      .click();
    await expect(
      page.getByRole("button", {
        name: "Resume word bank import",
        exact: true,
      }),
    ).toBeEnabled({ timeout: 30000 });
    await page.reload();
    await page
      .getByRole("button", { name: "Resume word bank import", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Import complete", exact: true }),
    ).toBeVisible({ timeout: 150000 });
  }
  await expect(progress).toHaveAttribute("value", "154781");
  await expect(page.locator("main")).toContainText("154,781 new forms saved");
  await page.getByLabel("Urdu word or prefix", { exact: true }).fill("چلو");
  await page
    .getByRole("button", { name: "Search word bank", exact: true })
    .click();
  await expect(page.locator(".dictionary-list strong").first()).toHaveText(
    "چلو",
  );
  expect(
    (await new AxeBuilder({ page }).include(".admin-layout").analyze())
      .violations,
  ).toEqual([]);
  await page.screenshot({
    path: `test-results/word-bank-admin-${info.project.name}.png`,
    fullPage: true,
  });
  await page
    .getByRole("link", { name: "Create reviewed definition" })
    .first()
    .click();
  await expect(page.getByLabel("اردو spelling", { exact: true })).toHaveValue(
    "چلو",
  );
  await expect(
    page.getByLabel("Arabic meanings — one per line", { exact: true }),
  ).toHaveValue("");
  const response = await page.request.get(
    "/api/dictionary?language=ur&word=" + encodeURIComponent("چلو"),
  );
  expect(response.status()).toBe(200);
  const result = await response.json();
  expect(result.entries).toEqual([]);
  expect(result.wordBank[0].headword).toBe("چلو");
  await page.goto("/dictionary?language=ur&q=" + encodeURIComponent("چلو"));
  await expect(page.locator(".dictionary-definition")).toContainText(
    "Wazan candidates",
  );
  await expect(page.locator(".dictionary-definition")).toContainText(
    "Arabic meanings have not been added",
  );
  await expect(page.locator(".dictionary-definition")).toContainText("1(1/2)");
  expect(
    (await new AxeBuilder({ page }).include("main").analyze()).violations,
  ).toEqual([]);
  await page.screenshot({
    path: `test-results/word-bank-public-${info.project.name}.png`,
    fullPage: true,
  });
});
