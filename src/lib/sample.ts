import type { Artist, Kalam } from "./types";
export const sampleArtists: Artist[] = [
  {
    id: "10000000-0000-4000-8000-000000000001",
    slug: "sukhan-studio",
    name: "Sukhan Studio",
    name_ur: "سخن اسٹوڈیو",
    kind: "both",
    bio: "Original demonstration verses created for the Sukhan foundation. Replace these with verified, permission-cleared work before launch.",
    status: "published",
    rights_note:
      "Original illustrative sample content; editorial review required before launch.",
  },
];
export const sampleKalam: Kalam[] = [
  {
    id: "20000000-0000-4000-8000-000000000001",
    slug: "a-lamp-of-words",
    form: "nazm",
    summary:
      "A small meditation on words, light, and the company we find in a poem.",
    poet_id: sampleArtists[0].id,
    poet: sampleArtists[0],
    status: "published",
    rights_note:
      "Original demonstration verse, not attributed to a historical poet.",
    updated_at: "2026-10-24T00:00:00Z",
    texts: [
      {
        language: "ur",
        title: "لفظوں کا چراغ",
        body: "لفظوں کا چراغ جلتا ہے\nخاموشی میں راستہ ملتا ہے\n\nتم ایک صدا بن کر آؤ\nدل سے دل کا در کھلتا ہے",
      },
      {
        language: "roman",
        title: "Lafzon ka charagh",
        body: "Lafzon ka charagh jalta hai\nKhamoshi mein rasta milta hai\n\nTum ek sada ban kar aao\nDil se dil ka dar khulta hai",
      },
      {
        language: "en",
        title: "A lamp of words",
        body: "A lamp of words is burning,\nA path appears in quiet.\n\nCome as a voice,\nAnd heart opens to heart.",
      },
      {
        language: "fa",
        title: "چراغ واژه‌ها",
        body: "چراغ واژه‌ها روشن است\nدر سکوت راهی پیدا می‌شود\n\nچون صدایی بیا\nتا دری از دل به دل گشوده شود",
      },
    ],
    media: [],
  },
  {
    id: "20000000-0000-4000-8000-000000000002",
    slug: "the-evening-page",
    form: "sher",
    summary: "An evening, an open page, and a moment to begin again.",
    poet_id: sampleArtists[0].id,
    poet: sampleArtists[0],
    status: "published",
    rights_note: "Original demonstration verse.",
    updated_at: "2026-10-24T00:00:00Z",
    texts: [
      {
        language: "en",
        title: "The evening page",
        body: "The evening leaves a page beside the door;\nWe write a little, then we listen more.",
      },
      {
        language: "roman",
        title: "Shaam ka safha",
        body: "Shaam dar par ek safha chhor jaati hai\nKuchh likhte hain, phir khamoshi aati hai",
      },
    ],
    media: [],
  },
];
