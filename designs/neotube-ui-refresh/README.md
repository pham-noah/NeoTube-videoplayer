# NeoTube UI/UX refresh — design pack

Design-only. No production code is changed by this folder; it exists so the
implementation has a target.

Open **`mockups.html`** in a browser (self-contained, no network) — that is the deliverable.
The PNGs next to it are the same sections, for quick viewing or for a PR description.

| File | What it is |
| --- | --- |
| `mockups.html` | The design sheet: tokens, four before/after screens, states. 390×844 phone frames drawn in the proposed tokens. |
| `00-tokens.png` | Tokens panel — colour, measured contrast, type scale, radius, motion. |
| `01-watch.png` | Watch + toolbar, before/after. |
| `02-feeds.png` | Feeds, before/after. |
| `03-library.png` | Library drawer, before/after. |
| `04-appearance.png` | Settings → Appearance, before/after. |
| `05-states.png` | Empty + loading states. |
| `00-audit.md` | Current UI as built, screen inventory, current tokens, the top 5 problems with evidence. |
| `01-tokens.md` | The visual language: colour tokens (measured), type scale, spacing, radius, elevation, motion, and what to delete. |
| `02-spec.md` | Per-screen implementation notes: files, component APIs, states, i18n keys, verification, risks. |
| `current-ui/` | Real device frames extracted from `store-assets/app-preview/captures/*.mp4` (1206×2622) — the "before" evidence. |

## The five problems, in one line each

1. The toolbar has no surface, so on a light page its icons land at **3.45:1** — it is the
   primary navigation.
2. Two visual languages on every screen: the native drawer resolves to near-white over a
   light page, and the info sheet imitates YouTube, so NeoTube's glass identity is absent
   from the main screen.
3. Settings look like stock iOS, and the accent users pick is nearly invisible — no swatch
   on the row that leads to it, no accent on selection, native switches.
4. Feeds repeat avatar + channel + age + overflow on every row even when filtered to one
   channel, and mark nothing as new.
5. Library and History have no empty state — a first-run user sees a blank panel.

## The three moves

1. **A bar material that survives a white page.** `frostBar` at 0.84–0.86 alpha (10.2:1)
   instead of the sheet's 0.56 (3.45:1). Token change, not a redesign.
2. **Accent as material.** One accent drives glass wash, selection and links — and the
   Appearance screen opens with a live toolbar preview so the theme is shown, not described.
3. **One state language.** `EmptyState` + `Skeleton`, promoted from the empty states Feeds
   already does well, used by every list.

Start with `02-spec.md` §0 (tokens) and §1 (primitives); the four screens then fall out of
class changes rather than new components.

## Rebuilding the PNGs

The PNGs are screenshots of `mockups.html` at a 1280 px viewport, 1× device scale, clipped
to each section plus a 22 px margin. If you edit the HTML, re-capture rather than letting
them drift:

```bash
# any headless chrome will do; the sheet needs a viewport at least 1240 px wide
chrome --headless --screenshot=out.png --window-size=1280,7000 \
  --default-background-color=00000000 file:///<path>/mockups.html
```

The section ids are `#tokens`, `#watch`, `#feeds`, `#library`, `#appearance`, `#states`.
