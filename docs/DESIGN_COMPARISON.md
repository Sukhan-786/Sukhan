# Rekhta / Sukhan visual revision — 24 October 2026

Rekhta was inspected live at desktop and mobile widths. Sukhan's green/cream design was replaced with white/grey surfaces, compact navigation, pink controls, a full-width collection banner, centred poetry and denser discovery sections.

| Element                | Measured Rekhta reference                       | Updated Sukhan                                  |
| ---------------------- | ----------------------------------------------- | ----------------------------------------------- |
| Desktop viewport       | 1440 × 1000                                     | 1440 × 1000                                     |
| Desktop header         | 64px                                            | 64px                                            |
| Banner at 1440px       | 432px                                           | 432px                                           |
| Content column         | 1168px                                          | 1168px                                          |
| Section heading        | LatoX, 16px, 5px tracking                       | Same web font, size and tracking                |
| Roman verse            | Merriweather Extended Light Italic, 24px / 48px | Same web font, size and line height             |
| Author credit          | Merriweather Heavy, uppercase                   | Same web font, uppercase                        |
| Urdu                   | Mehr Nastaliq family                            | Official Mehr Nastaliq Web v2, locally embedded |
| Mobile viewport        | 390 × 844                                       | 390 × 844                                       |
| Mobile header / banner | About 140px / 218px                             | About 140px / 218px                             |

The Latin fonts are unmodified copies of the publicly served reference web fonts, whose metadata identifies SIL OFL 1.1. The Urdu font is the official publisher's web release under CC BY-SA 4.0. Notices and attribution are included in `public/fonts` and the footer. No third-party font request is required to render Sukhan.

This matches typography and layout conventions. It is not a pixel-identical clone: Sukhan retains its own name, original artwork, sample literature and available features. No Rekhta logo, poet portraits, advertisements or poetry collection was imported. Grey and mobile pink text were darkened slightly to pass contrast checks. Labels link to implemented Sukhan features.

Rekhta rotates its banners, so the recorded desktop and mobile reference views show different promotions. The self-contained comparison HTML provides a desktop/mobile toggle for the captured pairs.

## Verification

Production build, lint and TypeScript pass. All 26 application/database/component tests and all 16 desktop/mobile browser tests pass. Automated axe accessibility checks pass on the tested pages. New controls tested include collection navigation, featured poem switching, Urdu direction, translation and text download. Header/banner geometry was measured in the rendered browser.

Existing database and hosting blockers remain unchanged. Nothing was deployed remotely.

## Sources

- [Rekhta homepage](https://www.rekhta.org/)
- [Reference web font definitions](https://rekhtastaticcdn.pc.cdn.bitgravity.com/css/font.css?v=0.0.7)
- [Official Mehr Nastaliq Web release](https://mehrtype.com/product/mehr-nastaliq-web/)
- [Font credits and license notices](../public/fonts/FONT-CREDITS.md)
