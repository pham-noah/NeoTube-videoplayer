// Liquid Glass look for m.youtube.com. The ytm-* selectors follow YouTube's
// current mobile markup and may need adjusting when it changes.
//
// Design rules this file follows (they are what keeps it from feeling clunky):
//  - Blur is expensive and every blurred element is a separate compositing layer,
//    so only the three bars that float over content get it (search bar, the
//    pinned header bar, the bottom tab bar). Chips, cards and thumbnails use a
//    flat translucent fill, never blur.
//  - One glass recipe for every bar: fill + faint top gloss + inset rim + a soft
//    shadow. Shape and spacing differ, the material does not.
//  - Nothing here changes the size of a box YouTube lays out around. The rim is
//    an inset shadow, not a border, and the top bars take no margin beyond the
//    one the search bar already had: YouTube derives the content offset from
//    those heights, and growing them put the bars over the chip row before.
//  - Round the picture, not the card. Clipping a whole card to a radius cuts
//    into the title and channel text beside it.
//
// Every declaration is !important on purpose. YouTube's own stylesheet beats a
// plain element selector on the bars, so without it the pivot bar keeps its own
// position, border and height and only the background and radius take -- which
// reads as half-applied glass.
//
// Card note: m.youtube.com no longer renders ytm-rich-item-renderer at all.
// Feed and search cards are ytm-media-item inside ytm-video-with-context-renderer,
// with ytm-thumbnail-cover / yt-thumbnail-view-model carrying the image.
//
// Assumes YouTube's dark theme (the page background is forced dark below).
export const glassCss = (accent: string, reduceEffects = false) => `
:root {
  --accent: ${accent};
  --nt-fill: color-mix(in srgb, var(--accent) 11%, rgba(255,255,255,.08));
  /* "Reduce effects" (settings.reduceEffects) swaps the bars to an opaque accent
     tint and drops the blur: three blurred compositing layers over a scrolling
     feed is the expensive part, and the tinted fill alone still reads as glass.
     Mirrors the opaque fallback in components/glass/GlassSurface.tsx. */
  --nt-bar-fill: ${reduceEffects ? 'color-mix(in srgb, var(--accent) 22%, #151826)' : 'var(--nt-fill)'};
  --nt-bar-blur: ${reduceEffects ? 'none' : 'blur(20px) saturate(170%)'};
  --nt-gloss: linear-gradient(180deg, rgba(255,255,255,.16), rgba(255,255,255,0) 60%);
  --nt-rim: inset 0 1px 0 rgba(255,255,255,.34), inset 0 0 0 1px rgba(255,255,255,.1);
  --nt-lift: 0 6px 20px rgba(0,0,0,.28);
  color-scheme: dark;
}

/* A quiet accent glow behind everything. It sits on the root canvas, so it only
   shows where YouTube's own containers are transparent -- and it is what the
   bars have something to blur over besides thumbnails. */
html {
  background:
    radial-gradient(110% 55% at 8% 0%, color-mix(in srgb, var(--accent) 26%, transparent), transparent 62%),
    radial-gradient(90% 45% at 100% 100%, color-mix(in srgb, var(--accent) 16%, transparent), transparent 62%),
    #0b0d14 fixed !important;
  -webkit-tap-highlight-color: transparent !important;
}
body {
  background: transparent !important;
  /* The tab bar floats over the page; without this the last cards sit under it. */
  padding-bottom: calc(92px + env(safe-area-inset-bottom, 0px)) !important;
}

/* The three blurred bars. */
ytm-mobile-topbar-renderer,
ytm-header-bar,
ytm-pivot-bar-renderer {
  background-color: var(--nt-bar-fill) !important;
  background-image: var(--nt-gloss) !important;
  backdrop-filter: var(--nt-bar-blur) !important;
  -webkit-backdrop-filter: var(--nt-bar-blur) !important;
  border: 0 !important;
  box-shadow: var(--nt-rim), var(--nt-lift) !important;
}

/* margin/border would grow this content-box element past YouTube's own height,
   and the content offset below is derived from that height -- so the bar ends up
   over the chip row. The rim is an inset shadow, which cannot change the box. */
ytm-mobile-topbar-renderer {
  margin: 0 12px !important;
  border-radius: 26px !important;
}

/* The header stack YouTube pins to the top. ytm-header wraps it and
   ytm-header-bar is the bar that remains once the search bar has scrolled
   away -- both appear in YouTube's own stylesheet rule that fixes them at
   top:0. The wrapper must be clear or the bar reads as a black strip over the
   page on scroll. The bar is full width, so only its bottom corners round: a
   floating pill here would need a margin, and a margin grows the box. */
ytm-header { background: transparent !important; }
ytm-header-bar { border-radius: 0 0 26px 26px !important; }

/* The chips read transparent, but the bar holding them still painted YouTube's
   surface fill -- that is the opaque band behind the filter row. ytm-, not
   ytd-: the app loads m.youtube.com, the mobile renderer set. */
ytm-feed-filter-chip-bar-renderer { background: transparent !important; }

/* Floating tab bar. */
ytm-pivot-bar-renderer {
  position: fixed !important;
  left: 16px !important;
  right: 16px !important;
  bottom: calc(14px + env(safe-area-inset-bottom, 0px)) !important;
  width: auto !important;
  height: 64px !important;
  border-radius: 32px !important;
  z-index: 2200 !important;
  overflow: hidden !important;
}
/* Light catches a glass edge unevenly: bright top-left, faint bottom-right. A
   border can't do a gradient on a translucent fill, so the rim is a masked ring
   (fixed position above makes the bar its own containing block). */
ytm-pivot-bar-renderer::before {
  content: '' !important;
  position: absolute !important;
  inset: 0 !important;
  padding: 1px !important;
  border-radius: inherit !important;
  background: linear-gradient(135deg, rgba(255,255,255,.62), rgba(255,255,255,.08) 42%, rgba(255,255,255,.2)) !important;
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0) !important;
  -webkit-mask-composite: xor !important;
  mask-composite: exclude !important;
  pointer-events: none !important;
}

/* Chips: flat glass, no blur -- there can be dozens on screen. */
ytm-chip-cloud-chip-renderer,
ytm-search-filter-group-renderer {
  background: rgba(255,255,255,.08) !important;
  border: 0 !important;
  border-radius: 999px !important;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.14) !important;
  /* Smaller than YouTube's own, but not below a comfortable tap height. */
  height: 30px !important;
  min-height: 30px !important;
  padding: 0 13px !important;
}
ytm-chip-cloud-chip-renderer span,
ytm-search-filter-group-renderer span { font-size: 13px !important; }
/* The selected chip has to read as selected, or the row is just a list of
   identical pills. Matches whichever marker YouTube puts on it. */
ytm-chip-cloud-chip-renderer:has(.selected, [aria-selected='true'], [aria-pressed='true']) {
  background: color-mix(in srgb, var(--accent) 38%, rgba(255,255,255,.06)) !important;
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 70%, white 15%) !important;
}

/* Cards stay unclipped so text keeps its breathing room; only the image rounds. */
ytm-video-with-context-renderer,
ytm-media-item,
ytm-shorts-lockup-view-model { background: transparent !important; }
ytm-thumbnail-cover,
yt-thumbnail-view-model {
  border-radius: 20px !important;
  overflow: hidden !important;
  box-shadow: 0 0 0 1px rgba(255,255,255,.07) !important;
}

/* Users who ask for less transparency, or WebViews without backdrop-filter, get
   an opaque tinted bar instead of a washed-out see-through one. */
@media (prefers-reduced-transparency: reduce) {
  ytm-mobile-topbar-renderer,
  ytm-header-bar,
  ytm-pivot-bar-renderer {
    background-color: color-mix(in srgb, var(--accent) 22%, #151826) !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
  }
}
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  ytm-mobile-topbar-renderer,
  ytm-header-bar,
  ytm-pivot-bar-renderer {
    background-color: color-mix(in srgb, var(--accent) 22%, #151826) !important;
  }
}
`
