# Deck v2 plan: one principle per chapter

Working file: `slides.qmd` in this folder. Today the deck is 20 slides; after this plan it is 27.
"S#" below means the slide number in the CURRENT deck, "N#" the number in the NEW deck.
Widgets are edited with `build/revise_widgets.py` (vw.edit), re-exported with `build/export.cjs`,
and the deck is rendered with Quarto at
`/Applications/Positron.app/Contents/Resources/app/quarto/bin/quarto render slides.qmd`.

This supersedes the "loop spine" proposal in `OUTLINE.md`. Its small fixes (augment SQL, HAVING,
iframe titles, iframe preload) are folded in below.

---

## 0. What the audience leaves with

| Chapter | Principle as it appears on its own slide | Recap tagline | Proof widgets |
|---|---|---|---|
| Data | Treat interactions like data queries: do they enable access to and transformation of the underlying data? | *Interactions are queries* | parameterize, structure, augment |
| Visuals | Strategically remove, edit, and add elements to make comparisons easy to see | *Remove, edit, add* | sel_filter, sel_highlight, sel_count |
| Inputs | Inputs express a question, then adjust it. Make them cheap to express and reified so they are cheap to change *(wording to workshop, see §6)* | *Express, then adjust* | in_drag/corner/center, re_none/move/handles |

Each chapter now has the same shape: divider (animated hand-off) → 3 examples → summative
principle slide. That repetition is what makes the principles stick.

---

## 1. New running order

| N# | From | Title (on slide) | Change | Size |
|---:|:---:|---|---|:---:|
| 1 | S1 | Principles for Effective Interactive Visualizations | keep | – |
| 2 | new | **We are entering the golden age of interactive graphics** | Meros example wall (20 clips), blur + statement on advance | L |
| 3 | S2 | What is an effective interactive visualization? | light-gray "Where should I get donuts in Houston?" above the cards; Hypotheses → Questions | S |
| 4 | S3 | What is an effective interactive visualization? | title; Hypotheses → Questions; SVG text ≥ 24 | S |
| 5 | S4 | What is an effective interactive visualization? | same | S |
| 6 | S5 | What is an effective interactive visualization? | title; captions to floor size | S |
| 7 | S6 | What is an effective interactive visualization? | HYPOTHESES → QUESTIONS | S |
| 8 | S15 | Interactions come in many flavors. Today: selection | moved forward; equal weight → grow selection 3× → light it orange; zoo link large | L |
| 9 | S7 | Interactive visualizations have 3 parts | INTERACTION → INPUTS | S |
| 10 | S8 | Chapter 1: Data | animated hand-off (all lit → only DATA lit) | M |
| 11 | S9 | Questions as Data Queries | drop loop diagram; 3 rows Question / SQL / Answer + 4th row "? / ? / widget" | L |
| 12 | S10 | Interactive visualizations are SQL queries | rail label "Single Selection"; big SQL; WHERE highlighted | M |
| 13 | S11 | Interactive visualizations are SQL queries | "Multi-Selection"; GROUP BY highlighted | M |
| 14 | S12 | Interactive visualizations are SQL queries | "Select to Look Up" (term TBD, §6); JOIN highlighted; SQL joins `reviews` not `walking_distances` | M |
| 15 | S13 | Treat interactions like data queries – do they enable access and transformation to the underlying data? | replace "growing data" SVG with 3 columns Single / Multi / Join, widgets re-embedded at 0.46×, one question circle each | L |
| 16 | S14 | Chapter 2: Visuals | animated hand-off (DATA → VISUALS) | S |
| 17 | S16a | Selections can remove elements | sel_filter alone, large; question card | M |
| 18 | S16b | Selections can edit elements | sel_highlight alone (revised widget); question card | M |
| 19 | S16c | Selections can add elements | sel_count alone (revised widget); question card | M |
| 20 | new | Strategically Remove, Edit, and Add Elements to make comparisons easy to see | three widgets at 0.9× with their three questions | M |
| 21 | S17 | Chapter 3: Inputs | animated hand-off (VISUALS → INPUTS) | S |
| 22 | new | Inputs express a question, then adjust it | two cards: 1 · Express, 2 · Adjust | M |
| 23 | S18 | Expressing the selection: three inputs, one answer | trio kept; captions to floor size | S |
| 24 | S19 | Reification enables adjustment over time | trio; re_move gains arrow keys, re_handles gains side handles | M |
| 25 | new | *(Inputs principle, wording TBD)* | statement slide | S |
| 26 | S20 | Three parts, three principles | recap as three bands with full sentences (see spec) | M |
| 27 | new | Now follow Ryan into the interaction zoo, with the tool that made every visualization here: vibe widget | wall returns, blurred, with the statement | M |

Section marker (top right): none on N1–N9 · D on N10–N15 · V on N16–N20 · I on N21–N25 · all three on N26 · none on N27.

---

## 2. Slide-by-slide spec

### N2 · Golden age wall (new)

**Source.** `/Users/dwootton/Downloads/mx-examples/meros-deck/`. The wall block in `merosdeck.html`
(between `<!-- WALL:start -->` and `<!-- WALL:end -->`) is already laid out for a 1280×720 stage, so its
`left/top/width/--rot` values drop straight into our slide. Copy `media/*.mp4` and `media/*.jpg` (posters)
into `deck/media/` (≈ 5 MB; skip the `.webm` variants, Chrome plays mp4).

**Behaviour.** Slide opens on 20 clips playing, cards staggering in (the Meros `excard-in` keyframes).
One advance: wall blurs (`filter: blur(11px)`), the white gradient veil washes in from the left, and the
statement lands in `.big-title` type. Second advance moves on.

**Build.**
- `build/make_wall.py` (new, ~40 lines): read the WALL block from the Meros file, rewrite `poster`/`src`
  paths to `media/…`, drop the `.webm` sources, emit `_wall.qmd` as a `{=html}` raw block. Both N2 and
  N27 pull it in with `{{< include _wall.qmd >}}` so the wall is authored once.
- Markup per slide:
  ```
  ## {.no-rule .wall-slide data-menu-title="Golden age"}
  {{< include _wall.qmd >}}
  ::: {.exveil}
  :::
  ::: {.wall-copy .fragment data-fragment-index="1"}
  <h1 class="big-title">We are entering the golden age of interactive graphics</h1>
  :::
  ```
- SCSS: port `.exwall`, `.excard`, `@keyframes excard-in`, `.exveil` from `merosdeck.html`. Trigger the
  blur/veil from the fragment with no JS: `.wall-slide:has(.wall-copy.visible) .exwall { filter: blur(11px);
  transform: scale(1.04) }` and the same for `.exveil { opacity: 1 }`.
- Videos carry `muted loop playsinline data-autoplay preload="auto"`. Reveal plays `data-autoplay` media
  when the slide shows and pauses it when you leave, so the 20 clips cost nothing on other slides.
- `.exwall { position:absolute; inset:0; overflow:hidden }` inside the section; several cards sit at
  negative offsets on purpose (bleed).

**Fallback** if the full-bleed veil fights the theme: keep the normal `##` title and put the wall in the
slide body at 0.8× height. Decide at render.

### N3–N7 · "What is an effective interactive visualization?"

- All five slides take that exact title.
- N3: add `[Where should I get donuts in Houston?]{.lead-q}` above the three cards, `.lead-q { color:
  $vw-ink-faint; font-size: 0.85em; font-weight: 500 }`. Circle label "Hypotheses" → "Questions"
  (SVG `<text>`). Card text `0.62em` → `0.8em` (the cards have room).
- N4, N5: SVG text "Hypotheses" → "Questions"; "Interactive Vis" is 15 and 19 viewBox units (≈ 16 and
  20 px on screen). Raise to 24 units minimum. If it no longer fits the small circle on N4, grow that circle
  (`r=78` → `r=92`) rather than shrink the type. The tooltip-style label "Well, where is close?" (15 units)
  → 22 units and widen its box.
- N6: captions `0.42em` → `0.8em`; the three widgets stay native 352×400 (3 × 352 = 1056 px fits).
- N7: "HYPOTHESES" → "QUESTIONS". Nothing else.

### N8 · Intents zoo (moved from S15)

**Sequence.** Fragments 1–5: the five cards arrive one at a time at *equal* weight (drop `.is-focus`
from the markup default). Fragment 6: selection grows to ≈ 3× the others. Fragment 7: selection turns
orange (the existing `.is-focus` styling), the other four go 45 % gray. Below the row, always visible:
"More of the zoo: vis-society.github.io/lectures/interaction-zoo" at 0.85em.

**Build without JS.** Two empty state spans inside `.taxo`:
`<span class="fragment st-grow" data-fragment-index="6"></span>` and `st-lit` at index 7, then:
```scss
.taxo { display:flex; gap:.85rem; }
.taxo-item { flex:1 1 0; min-width:0; transition: flex-grow .6s cubic-bezier(.22,.68,.16,1), opacity .4s, filter .4s; }
.taxo:has(.st-grow.visible) .taxo-item.sel { flex-grow: 3; }
.taxo:has(.st-grow.visible) .taxo-item:not(.sel) .gl { opacity: 0; height: 0; }
.taxo:has(.st-lit.visible)  .taxo-item:not(.sel) { filter: grayscale(1); opacity: .45; }
.taxo:has(.st-lit.visible)  .taxo-item.sel { /* current .is-focus rules */ }
.taxo-item .ico { width: 56%; height: auto; }           // icon scales with the card
```
Equal stage: cards ≈ 228 px wide; grown stage: selection ≈ 505 px, others ≈ 168 px.
Names `0.55em` mono uppercase → `0.8em` Space Grotesk mixed case (fits 168 px). Glosses `0.45em` →
`0.8em`, shown at equal weight and hidden on the four shrunk cards.

**Open:** keep selection first (left) or move it to the middle so it grows symmetrically. Recommend middle.

### N9 · Three parts (S7)

INTERACTION → INPUTS in the equation SVG. Keep the four fragments. Also rename in the three dividers,
the recap, `README.md`, and the `.mini-stages` `s-interaction` class (rename to `s-inputs` or leave the
class and change only visible text).

### N10, N16, N21 · Chapter dividers, animated hand-off

Each divider opens showing the state the previous section left (N10: all three lit, because N9 just
built the equation; N16: only DATA lit; N21: only VISUALS lit). One advance dims the old term and
lights the new one, both in the same 600 ms. Reveal *custom fragments* do this with no JS:
```html
<g class="eq-term fragment custom go-dim" data-fragment-index="1">…DATA…</g>
<g class="eq-term fragment custom go-lit" data-fragment-index="1">…VISUALS…</g>
```
```scss
.eq-term { transition: filter .6s ease, opacity .6s ease; }
.reveal .fragment.custom.go-dim.visible { filter: grayscale(1); opacity: .45; }
.reveal .fragment.custom.go-lit         { filter: grayscale(1); opacity: .45; }
.reveal .fragment.custom.go-lit.visible { filter: none; opacity: 1; }
```
The result circle is never dimmed. The `.mini-stages` marker on a divider shows the *new* chapter only.

### N11 · Questions as Data Queries (S9, rebuilt)

Drop the loop SVG and the ASK/SEE JS. Four rows, each `Question | SQL | Answer`, one fragment per row.
SQL is raw HTML (not a fenced block) so tokens can be marked:

| Question | SQL | Answer |
|---|---|---|
| "what donut shop is closest to me?" | `SELECT name, dist(shop, me)` / `FROM shops` / `ORDER BY dist LIMIT 1` | Bagby Rings · 0.35 mi |
| "what's the donut shop on Westheimer and Dunlavy?" | `SELECT name` / `FROM shops` / `WHERE corner = 'Westheimer & Dunlavy'` | Westheimer Crullers |
| "what are the average weekend waits in the Heights?" | `SELECT AVG(weekend_wait)` / `FROM shops` / `WHERE neighborhood = 'The Heights'` | 28.3 min |
| **?** | **?** | `in_center` widget at 0.35× (123×140) |

Token classes: `.kw` = SELECT (bold, white) · `.sel` = the selected data (`name`, `AVG(weekend_wait)`,
orange `#f97316`) · `.tx` = transforms/clauses (`dist()`, `ORDER BY`, `WHERE`, `AVG`, green `#478d4b`).
Same three classes are reused on N12–N14. Answers are verified against the CSV (Bagby Rings is 0.35 mi from
the marker start; the Heights mean is 28.33).

Layout budget: title ≈ 95 px, four rows ≈ 130 px each (SQL at 0.8em = 24 px × 1.35 line height × 3 lines
≈ 97 px + padding). Row 4's widget is the tallest thing; if it does not fit, use a static PNG of the
`in_center` end state instead of the iframe.

Speaker beat this sets up: rows 1–3 are questions someone typed as SQL; row 4 is a question nobody typed,
because the interaction *is* the query. That is the bridge to N12.

### N12–N14 · "Interactive visualizations are SQL queries" (S10–S12)

- Title on all three; rail labels **Single Selection** / **Multi-Selection** / **Select to Look Up** (§6).
  Delete the small-print rail descriptions (they are 10.6 px and unrecoverable); each row is label only.
- Widen the rail: `.cols.c-13 { grid-template-columns: minmax(0,1.1fr) minmax(0,2.2fr) }` (rail ≈ 400 px)
  and show the 814×548 widgets at 0.92× (`.widget-wrap.scale-92`) so they still fit.
- SQL at 0.8em mono (24 px ≈ 14.4 px per character → keep every line ≤ 26 characters):

  N12 (WHERE banded):
  ```sql
  SELECT *
  FROM shops
  WHERE dist(shop, me) < r
  ```
  N13 (GROUP BY banded; drops the pointless `HAVING`):
  ```sql
  SELECT grp, AVG(wait)
  FROM shops
  WHERE grp IS NOT NULL
  GROUP BY grp
  ```
  N14 (JOIN banded; now matches what the widget actually does):
  ```sql
  SELECT s.name, r.text
  FROM shops s
  JOIN reviews r
    ON r.shop_id = s.shop_id
  WHERE s.shop_id = :clicked
  ```
  The banded clause gets `.hl { background: rgba(249,115,22,.28); outline: 2px solid $vw-accent; }` on the
  whole line, on top of the `.kw/.sel/.tx` colouring.
- The `.stage-row` rail keeps its dim/live logic; three rows + SQL ≈ 400 px, fits under the title.

### N15 · Principle slide, Data (S13 rebuilt)

Title exactly: *Treat Interactions like Data Queries – do they enable access and transformation to the
underlying data?* (two lines at h2 size). Three columns, each: mono label (Single Selection / Multi-Selection
/ Select to Look Up) → the corresponding WIDE widget re-embedded at 0.46× (374×252) → a `questions`
mini-circle (the S16 `.hyp-mini` SVG, enlarged to 72 px, one dot lit) beside one question at 0.8em:

- Single: "Which shops are within a mile of me?"
- Multi: "Does the Heights wait longer than Montrose?"
- Look up: "What do people say about this shop?"

Height: 150 (title) + 36 + 252 + 12 + 100 ≈ 550 px. Embedding the same widget file on two slides is
already done for `close.html`; each iframe is independent.

### N17–N19 · Remove / Edit / Add (S16 split)

Two columns. Left: the widget alone at 1.2× (422×480). Right, vertically centred: the question in a
`.vwcard.hyp` at 0.9em bold, and one mechanism line at 0.8em.

| N | Title | Widget | Question card | Mechanism line |
|---|---|---|---|---|
| 17 | Selections can remove elements | sel_filter | What is the relationship of this data with outliers removed? | brush → gone → axes re-fit |
| 18 | Selections can edit elements | sel_highlight (revised) | How do the selected items compare against my baseline? | pick a group → only colour changes |
| 19 | Selections can add elements | sel_count (revised) | What simpler calculations help to show these comparisons? | region → a new mark with the numbers |

"Change Elements" is renamed **Edit** everywhere (matches N20's title and your question wording).
Widget revisions are in §4. N18 and N19 both drop the 5,600-review outlier; N17 keeps it (it is the point).

### N20 · Principle slide, Visuals (new)

Title: *Strategically Remove, Edit, and Add Elements to make comparisons easy to see*. Three columns,
the three sel widgets at 0.9× (317×360) with **Remove / Edit / Add** mono labels and the three questions
at 0.8em underneath. 150 + 36 + 360 + 60 ≈ 610 px, so trim the caption to the question only. If the
room is short, static PNGs of each widget's end state are an acceptable stand-in here (the live versions
were just shown).

### N22 · Inputs intro (new)

Title: *Inputs express a question, then adjust it*. Two `.vwcard`s side by side, each a fragment:
**1 · Express** (icon: hand drawing a box; line: "the first gesture states the question") and
**2 · Adjust** (icon: box with handles and arrows; line: "the next ones refine it"). All text ≥ 0.8em.
Simplified from your draft "Inputs are how a user expresses what they want and continues to adjust that
over time"; keep the two-step structure, lose the clause.

### N23 · Expression (S18)

Title: *Expressing the selection: three inputs, one answer*. Trio unchanged (they all land on 21 shops /
24.1 min, which is the point). Captions: name at 0.8em mono + one line ≤ 5 words at 0.8em
("press, sweep, release" / "click two corners" / "one click, fixed size").

### N24 · Adjustment (S19)

Title: *Reification enables adjustment over time*. Trio kept; captions "Nothing remains" / "Move it" /
"Adjust it" at 0.8em; drop the `.rung` numerals (12.6 px and they rank transient as worst, which is wrong
for scanning). Widget revisions: re_move gets arrow-key nudging; re_handles gets draggable sides (§4).

### N25 · Principle slide, Inputs (new)

Statement in 1.2em type, centred, with **Express** and **Adjust** echoed as two orange words. Wording is
the one thing still open, see §6. Optionally the three re_* widgets as 0.5× thumbnails under it.

### N26 · Recap (S20)

The equation SVG cannot carry 24 px sentences: its columns are ≈ 280 px wide, so even "Treat interactions
as data queries" wraps to three lines. Recommend rebuilding the recap as **three horizontal bands**, each a
fragment: a 64 px coloured circle (DATA / VISUALS / INPUTS) + the full principle sentence at 0.8em +
its tagline in mono. Final fragment: the orange *Interactive Visualization* circle with "answers the
question". Fallback: keep the equation and use only the two-word taglines (Interactions are queries /
Remove, edit, add / Express, then adjust) at 26 viewBox units, no sub-lines.

### N27 · Hand-off to Ryan (new)

`{{< include _wall.qmd >}}` again, opening already blurred (no fragment: give the section `.is-focused`
from the start), veil on, statement in `.big-title`: *Now follow Ryan into the interaction zoo, with the
tool that made every visualization in this talk: vibe widget.* Byline row underneath. This bookends N2.

---

## 3. Cross-cutting changes

### 3.1 Typography floor: nothing under 24 px

Root is 30 px, so the floor is **0.8em** (and 24 viewBox units in the SVGs, which render ≈ 1:1). Audit
of everything currently below it in `theme/vibe-widgets.scss` and the SVGs:

| Where | Now | Action |
|---|---|---|
| `.vwcard.hyp` inline text (N3, N6) | 0.62em / 0.42em | 0.8em |
| `.stage-row h4` / `p` | 0.5em / 0.355em | h4 0.8em; delete the `p` descriptions |
| code blocks (`$code-block-font-size` 0.52em × 0.94 × 0.8 in rail) | ≈ 11.7 px | raw-HTML SQL at 0.8em (N11–N14); the SCSS variable can stay for anything else |
| `.taxo-item .nm` / `.gl` | 0.55em / 0.45em | 0.8em / 0.8em (see N8 for what hides when shrunk) |
| `.footnote` | 0.4em | 0.85em (`.zoo-link`) |
| `.trio .tcap .nm` / `.gl` / `.rung` | 0.4 / 0.4 / 0.42em | 0.8em / 0.8em / delete |
| `.recap-note`, `.widget-cap` | 0.42 / 0.34em | unused after rebuild; delete |
| `.eyebrow` (title) / `.byline` | 0.42em / 0.55em | 0.8em / 0.8em (the byline is a mono uppercase line; drop letter-spacing to 0.06em so it fits) |
| S9 Q/A cards | 0.5 / 0.48 / 0.4 / 0.38em | replaced by N11's 0.8em grid |
| SVG N4/N5 "Interactive Vis" | 15 / 19 units | 24 units, grow the circle |
| SVG N4/N5 "Well, where is close?" label | 15 units | 22 units, widen box (or drop it: the card beside says it) |
| SVG S13 "rows / + columns / + computed" | 13 units | slide is replaced |
| SVG recap taglines / sub-lines | 19 / 16 units | rebuilt as bands (0.8em) |
| `.mini-stages .dot` letters | 8 px | see 3.2 |
| `.slide-number` | 16.5 px | leave; it is chrome, not content |

**Inside the widgets** this rule cannot be met literally: the sel/in/re widgets are 352 px wide, and a 24 px
tick label is a third of the axis. Two-part rule instead: (a) in-widget text is ≥ 15 px native, readouts
(the count, the mean) ≥ 28 px, at most four ticks per axis, instruction lines and any label that is not
read aloud removed; (b) wherever a widget is alone on a slide it is shown at ≥ 1.2× (N17–N19), which puts
15 px labels at 18 px and the readouts at 34 px. The trios (N6, N23, N24) stay native. Say yes or no to
this bend before the widget pass starts; the alternative is regenerating those ten widgets at 528×600 native,
a much bigger LLM job.

**Audit tool.** After each render, run this in the deck page (served at `http://localhost:8765/slides.html`)
to list every text node under the floor with its slide index:
```js
[...document.querySelectorAll('.reveal .slides section')].flatMap((s, i) =>
  [...s.querySelectorAll('*')].filter(e => e.childNodes.length && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()))
    .map(e => ({ slide: i + 1, px: parseFloat(getComputedStyle(e).fontSize), text: e.textContent.trim().slice(0, 40) }))
    .filter(r => r.px < 24));
```
Run the same inside each widget page (`/widgets/<name>.html`) with the floor set to `24 / scale`.

### 3.2 Section marker

Only the current chapter lights: D on N10–N15, V on N16–N20, I on N21–N25, all on N26, none elsewhere.
(S9–S13 currently light D and I together; that is the bug you flagged.) Dots 18 px → 26 px, letters removed
(8 px; the colours already encode), and the chapter word added beside them at 0.8em mono: `● ○ ○ DATA`.
Keep the `.mini-stages > p { display:flex }` fix (pandoc puts the spans in one `<p>`).

### 3.3 Widgets must survive slide changes

`slides.html` currently emits `preloadIframes: null`, so reveal blanks every `iframe[data-src]` when you
leave its slide, and every per-cell fragment on a trio re-loads an iframe on stage. With widgets now
embedded on two slides each (N12–14 + N15, N17–19 + N20) this matters more. Fix in the YAML:
`preload-iframes: true`, `view-distance: 30`; remove `loading="lazy"` from every iframe; delete the
src-swapping and `syncLoopUI` blocks from `include-in-header` (nothing needs them after N11 is rebuilt).
All widgets are static React trees (no timers), so 19 resident iframes cost only startup. Open the deck a
minute early.

### 3.4 Renames, everywhere at once

- INTERACTION → INPUTS (equation, dividers, recap, README, `hostHtml` titles in `export.cjs`).
- Hypotheses → Questions (N3, N4, N5, N7 SVG text; `.hyp` class names can stay).
- Change Elements → Edit Elements.
- Query Parameterization / Structuring / Augmentation → Single Selection / Multi-Selection / Select to Look Up.

### 3.5 Scaled-iframe utility

Generalise the unused `.widget-scale-half` into `.widget-wrap[data-scale]`:
```scss
@each $s in (35, 46, 50, 90, 92, 120, 125) {
  .widget-wrap.scale-#{$s} iframe { transform: scale(#{$s / 100}); transform-origin: top left; }
}
```
with the wrapper's `width/height` set to `native × scale` in the markup. Pointer math inside the widgets
uses `clientX − getBoundingClientRect().left` in the iframe's own coordinate space, which the browser
maps through the outer transform correctly, so a scaled iframe should still hit-test properly. Verify on
N15 (0.46×) and N17 (1.2×) before trusting it: draw a region and check it lands under the cursor.

---

## 4. Widget work (vw.edit queue)

Run with `python build/revise_widgets.py <name> "<request>"`, three at a time in separate cwds (the
`.vibewidget/widgets` filename collides otherwise), then `VIBE_REPO=~/Projects/vibe-widgets-sundai node
build/export.cjs <names>`. Each run is 2–5 minutes. **Before touching `augment`**, patch
`revise_widgets.py` to pass `reviews` in `inputs` (it only passes `basemap_image`; `make_augment_v2.py`
shows the payload), or the edit will drop the join.

Nothing invented inside a widget: no SQL readouts, no scripted buttons, every number from the data
(the standing rule from the last review).

**sel_highlight (N18, Edit).** The data check says no grouping in the synthetic data actually clusters in
reviews × wait; neighbourhoods have 1–4 shops and separation ratios of ≈ 1.1–1.4. Price level is the
honest exception: the three `$$$` shops sit at 36–44 min waits (mean 37 vs 19 and 25), so highlighting
them reads as a cluster. Request:
> Three changes. (1) Exclude the shop with review_count above 3000 from this chart entirely; the x axis fits the remaining shops. (2) Remove the neighborhood list on the left so the plot fills the width. Below the plot add one native `<select>` (square corners, 2px #1a1a1a border, monospace 15px) whose first option "Highlight…" clears; then "$ shops", "$$ shops", "$$$ shops" (price_level 1–3), then the five neighborhoods with the most shops. Choosing an option fills its shops #0f766e and every other circle #cbd5e1 with a 200 ms colour transition. (3) Legibility: tick labels 14px, axis titles 15px, tooltip 15px, at most four ticks per axis. Everything else unchanged: axes never move, no circle changes size or position, no annotation of any kind.

**sel_count (N19, Add).**
> Three changes. (1) Exclude the shop with review_count above 3000 entirely; the x axis fits the rest. (2) The summary card floats ABOVE the drawn region, horizontally centred on it (below it if there is no room above), and follows it. Its content becomes three monospace lines: the count as "7 shops" at 28px; a "wait" row and a "reviews" row that show only a small SVG triangle and the signed inside-minus-outside difference, e.g. "▲ +6.2 min" and "▼ −210 reviews" at 16px, the triangle pointing up in #ea580c when inside is higher and down in #3f8bdb when lower. No inside/outside columns, no divider, no labels beyond those. (3) Legibility: ticks 14px, axis titles 15px, at most four ticks per axis; remove the "drag a region" line. Everything else unchanged.

**sel_filter (N17, Remove).** Legibility only: ticks 14px, axis titles 15px, tooltip 15px, reset label
15px, four ticks per axis. Keep the outlier and the re-fit animation.

**re_move (N24).**
> When a rectangle exists, the arrow keys move it 8px per press (Shift+arrow 32px), clamped inside the map, with the selection and readout updating on every press. Make the map container focusable (tabindex=0) and focus it on any pointerdown so the keys work without an extra click; show a 2px #ea580c outline only on :focus-visible. Instruction line: "drag it, or use the arrow keys". Everything else unchanged.

**re_handles (N24).**
> Add four EDGE handles to the existing four corner handles: a 9px bone square with a 2px #1a1a1a border at the midpoint of each side. Dragging an edge handle moves only that side (the opposite side stays pinned, the other axis is unchanged); cursors ew-resize on left/right, ns-resize on top/bottom. Corner handles, interior drag, clamping and live readout are unchanged. Instruction line: "drag the box, a corner, or a side".

**Legibility pass** on the other eleven (orthogonal, wait, close, spice, parameterize, structure, augment,
in_drag, in_corner, in_center, re_none): one shared request, "minimum 15px for any text, readouts ≥ 28px,
tooltips 15px, at most four axis ticks, remove labels that are not needed to read the result; change nothing
else". Run these last; they are the least risky and the easiest to skip if time runs out.

After exporting, check each revised widget standalone at `/widgets/<name>.html` before rendering the deck.

---

## 5. Execution order

| Phase | Work | Est. | Gate |
|---|---|---|---|
| 0 | `git init && git add -A && git commit` in this folder (there is a `.gitignore` but no repo); copy Meros media; confirm `quarto render` still works untouched | 15 min | clean baseline commit |
| 1 | Structural pass on `slides.qmd`: reorder, retitle, renames (3.4), marker (3.2), iframe preload (3.3), theme floor for existing classes (3.1), delete dead JS. Render. | 2–3 h | every existing slide renders; audit script shows only widget-internal and to-be-rebuilt items |
| 2 | New and rebuilt slides: N2/N27 wall + `make_wall.py`, N8 grow/lit animation, divider hand-offs, N11 grid, N12–14 SQL rail, N15 columns, N17–N20, N22, N25, N26 bands. Render after each. | 3–4 h | all 27 slides render; fragments step correctly forwards and backwards |
| 3 | Widget queue (§4), in parallel with phase 2 since each run is unattended: sel_highlight, sel_count, re_move, re_handles first; sel_filter and the legibility pass after. Export, render. | ~1.5 h wall-clock | each widget checked standalone, then in place |
| 4 | Floor audit (3.1 script) on the deck and inside each widget; fix stragglers; shorten any title that wraps to three lines | 1 h | audit list empty except accepted widget items |
| 5 | Rehearsal checks: (a) draw a region on N19, jump to N26, come back, still there; (b) pointer accuracy on scaled iframes N15/N17; (c) N2 clips all playing, blur on advance, paused on N3; (d) arrow keys on re_move with the map focused; (e) time the run | 30 min | all pass |

Phases 1 and 3 can start together. Phase 2 depends on phase 1's reorder. Phase 4 needs both.

Useful during all of it: the deck is being served at `http://localhost:8765/slides.html` (python http.server
on this folder, started from the vibe-widgets checkout's `.claude/launch.json`); `Reveal.slide(i, 0, f)` in
the console jumps to a slide and fragment, since synthetic key events do not reach reveal reliably.

---

## 6. Decisions for you

1. **Term for the third data pattern** (S12 "Query Augmentation", your "Select to Join"). Candidates, with
   the thing they emphasise: **Select to Look Up** (plain verb, parallel to the user's action: select one,
   look up its reviews; recommended) · **Details on Demand** (Shneiderman's term, the room knows it, but it
   breaks the Single / Multi pattern) · **Selection as Key** (most precise: the selection is the join key) ·
   **Select to Enrich**. Whatever you pick is the rail label; the SQL keyword under it is JOIN either way.
2. **Inputs principle wording** (N25). Your draft: "Correspond inputs with the frequency of updates and
   typical interaction trace and reify inputs so they can be changed." Shorter candidates that keep the two
   ideas (match the input to how the question evolves; reify so it can be adjusted):
   - "Inputs should be as easy to adjust as they are to express." (recommended; six words each side)
   - "Design inputs for the second question: reify the selection so it is adjusted, not redrawn."
   - "Fit inputs to how often the question changes, and reify them so changing it is cheap."
3. **N8 title and selection position.** Title candidates: "Interactions come in many flavors. Today:
   selection" / "Many interactions, one to study today: selection". Selection first (left, as now) or middle.
4. **N2 form.** Full-bleed wall with veil and `.big-title` statement (Meros style, recommended) vs. normal
   titled slide with the wall in the body.
5. **N11 row 4.** Live `in_center` at 0.35× vs. a PNG of its end state.
6. **N18 grouping.** Price tiers + top neighbourhoods in one dropdown (recommended, honest to the data) vs.
   computed k-means clusters ("long waits / popular / quiet"; cleaner clusters, invented labels) vs. changing
   `make_data.py` so neighbourhoods cluster (touches every map widget's numbers; not recommended).
7. **In-widget font bend** (3.1): accept 15 px native + 1.2× embedding, or regenerate ten widgets at
   528×600.
8. **N26 form.** Three bands with full sentences (recommended) vs. the equation with two-word taglines.
9. **N27 statement wording** and whether Ryan's name appears on the slide or only in speech.
