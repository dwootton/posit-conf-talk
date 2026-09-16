# Talk outline: one idea, said three times

Working notes for the posit::conf deck (`slides.qmd`). Produced 2026-09-15 from a six-angle
framing pass, judged, critiqued and revised, then checked against the widget sources and the
bundled reveal.js. Everything below reuses the sixteen built widgets. No new widget is needed.

## The problem, stated once

The title promises principles. The chapters deliver taxonomies from three different literatures:
parameterize / structure / augment (query language), a five-card intent zoo, remove / change / add
(visual response), three input gestures, a three-rung reification ladder. Seventeen named things in
fifteen minutes. The opening says effective = overlap between the vis and the viewer's questions,
and then nothing returns to the question until the recap.

## The unifying idea

**A selection is the viewer's question made concrete.** A circle held over the map is "where is
close?"; two groups on the map is "the Heights versus Montrose". That question makes a round trip
the deck already draws on the loop slide: it goes in as a gesture, becomes a query, comes back as a
picture, and the picture hands back the next question.

Data, Visuals and Interaction are the three places on that trip where the question gets lost, and
the losses are not the same kind:

- **Data**: the query was the author's, not the viewer's (`close` hard-codes the five nearest,
  whoever you are).
- **Visuals**: the picture does the tool's first example (a highlight) when the question was
  "what does the rest look like without these?"
- **Interaction**: the answer was exactly right, then thrown away on mouseup, so the follow-up
  question costs as much as the first one.

The first two are failures of fit. The third is the loop failing to run again. One test covers all
three: **does the viewer's question survive the round trip?**

The layers are separable, not independent. `orthogonal` on slide 3 proves exactly that much: the
gesture is fine, the response is fine, and nothing it can compute is a question anyone brought.
Each can fail on its own, so you check all three of one widget. That is why there are three chapters.

## The takeaway (say it word for word on the spine slide and the recap)

> A selection is the viewer's question: choose the query it runs, decide what happens to the rest,
> and leave it adjustable.

## Three principles (should-statements, one per chapter card)

### Data: A selection is a query. Decide which one: filter, group_by, or join.

The sub-items become worked examples, not things to memorise. Rail labels become `filter` /
`group_by` / `join` (the verbs the room already types, neutral between R and Python), with
"Query Parameterization / Structuring / Augmentation" as small print for the literature link.

- **filter** (`parameterize`): the radius is the viewer's parameter and belongs in the WHERE.
- **group_by** (`structure`): a single selection cannot say "versus". Two groups write a column the
  table never had.
- **join** (`augment`): some questions have no column. A click of one shop is the join key into a
  reviews table the chart never loaded. A join, a model, an API, a simulation: anything that is a
  function of the selection lives here.

Why not "Selection / Multi-selection / Augmentation" as in the draft outline: "selection" is now the
primitive of the whole talk, so it cannot also be one leaf of one chapter, and "multi-selection"
hides that `structure`'s point is a derived group column.

### Visuals: Decide what happens to everything you did not select.

This is the axis that actually separates Ch.2 from Ch.1. Ch.1 is which rows the selection names.
Ch.2 is what the picture does with the rows it did not name. (The critic was right that "remove" is
a data transform in every grammar the room uses; framing Ch.2 around *the rest* is what stops it
being a second filter chapter.) The deck's three captions are already questions about the rest:

- **refit** (`sel_filter`): "what does the rest look like without it?" Brush the outlier away, the
  rest refit, the axes reopen.
- **context** (`sel_highlight`): "how does this compare to the rest?" The rest stay, only colour
  changes. Highlight still computes membership; the comparison happens in the eye, which is what
  "versus" asks for.
- **baseline** (`sel_count`): "what is true of this group as a whole?" The region becomes a mark,
  the rest become the inside-versus-outside baseline.
- **gone** (spoken, not shown): Shiny's `brushedPoints()` into a table. The fourth answer.

Remove / Recolor / Add stay as small print. Do not say highlight is "the default" in Altair or
Vega-Lite; a selection there does nothing until bound. Say "the one-liner the docs teach first".
"Default" is accurate for Plotly's selected/unselected styling and for Shiny's filtered table.

### Interaction: Make the selection an object the viewer adjusts, not a gesture they redo.

The draft outline's easy-to-specify / easy-to-change / precise collapse into this one statement:

- **Easy to specify** is the foil, two spoken sentences opening the ladder: drag, two corners and
  one click all land the same count. The first question is cheap however you say it; what is left
  when you let go is not.
- **Easy to change** is the principle. `re_none` answers exactly and discards; "a bit west?" costs a
  full redraw and people stop after two tries. `re_move` is a thing you can nudge. `re_handles`
  makes every edge of the query editable.
- **Precise** is one clause in Ch.1 (the slider reads 0.80 mi; a slider is the precise instrument
  for a radius) and one in Ch.2 (a list is the precise instrument when the question is "the
  Heights", which no rectangle can say exactly). No snapping widget.

The ladder must not rank. Transient brushing is the canonical scanning instrument, and hover and
one-shot lookups want it. Drop the 1 / 2 / 3 numerals; caption the first cell "Nothing remains:
right for scanning, wrong for revising". Say "reification" once, credited, then "an object you can
hold". One footnote: Ch.2's filter dropped its box on purpose. For a removal, the question that
persists is the removed set and Reset is its handle. The principle is "leave the question
adjustable"; the form depends on the response.

## Chapter order: keep Data, Visuals, Interaction

Four of six framings and the synthesis kept D, V, I. The opening (orthogonal cannot compute any of
the questions) is a Data-layer argument, so Ch.1 continues it rather than jumping. The nesting also
runs D then V then I: Ch.1 teaches what the readout means, Ch.2 freezes the query and varies the
response, Ch.3 freezes both and varies the control. The spine slide states the causal order (ASK,
compute, SEE) once, and says out loud that the third loss is a different kind.

## Slide-by-slide (about 13.6 minutes, leaving buffer)

| # | Slide | Min | Change from current deck |
|---|-------|----:|--------------------------|
| 1 | Title | 0.25 | keep |
| 2 | Where should I get donuts in Houston? | 0.75 | circle text "Hypotheses" becomes "Questions"; small-print line under the cards: "Know the question before you build the selection." Retire pumpkin spice in speech ("a column; a toggle answers it; we'll see it once more at the end"). |
| 3 | Interactive is not effective | 1.0 | merge current slides 3 and 4 into one slide with fragments; `orthogonal`, then `close` as the fragment; name the five-nearest default here so slide 7 has a foil to fix |
| 4 | Overlap = Effective | 0.25 | "HYPOTHESES" becomes "QUESTIONS"; otherwise keep |
| 5 | A selection is a question on a round trip (spine) | 1.5 | merge current slides 7 (equation) and 9 (loop + Q/A cards). Keep the loop SVG; center label "interact" becomes "compute"; colour ASK / compute / SEE as Interaction / Data / Visuals. Drop the equation graphic and the three Q/A cards. `in_center` live beside it (one click, fixed region, reproducible readout). Takeaway line in large type. Absorb "selection only today" from the cut zoo slide. |
| 6 | Chapter card: A selection is a query. Decide which one: filter, group_by, or join. | 0.15 | replaces "Chapter 1: Data Transformation"; loop SVG with the compute leg bold |
| 7 | The selection is the filter | 1.0 | `parameterize`; rail label "filter", old name small; plum card. Drive: drag the target, click the slider thumb, then arrow keys. (Arrow keys with the map focused move the center, not the radius.) |
| 8 | Two selections are the group_by | 1.0 | `structure`; rail label "group_by"; drop `HAVING COUNT(*) > 0`; teal card. No pre-staging: the widget loads with both groups preset. Preset gap is 24.6 vs 21.0, 3.6 min. Say "watch the gap move" if you add a shop. |
| 9 | The selection is the join key | 0.75 | `augment`; rail label "join"; rewrite the rail SQL (see fixes). One live click. |
| 10 | Chapter card: Decide what happens to everything you did not select. | 0.15 | replaces "Chapter 2: Visuals"; loop SVG with the SEE leg bold |
| 11 | Same chart, same rows, three responses | 3.0 | `sel_filter` / `sel_highlight` / `sel_count`. Retitle (the trio is not clean here: two rectangles and a list click, and "selected" flips meaning in `sel_filter`). Captions question-first: "brush away: without it?" / "versus the rest?" / "as a whole?" with Remove / Recolor / Add small. Strip the `.hyp-mini` colour dots. Fix the `sel_filter` iframe title. Say once that the canvas moved to the scatter on purpose (removal is invisible on a map with no axes to refit). Foreshadow: "notice the box vanished when I let go." Hard cap 3.0. |
| 12 | Chapter card: Make the selection an object the viewer adjusts, not a gesture they redo. | 0.15 | replaces "Chapter 3: Interaction"; loop SVG with the ASK leg bold |
| 13 | Make the question a thing you can hold | 2.25 | `re_none` / `re_move` / `re_handles`. Remove `.rung` numerals; caption 1 "Nothing remains: right for scanning, wrong for revising". Two sentences from the cut input trio open this slide. `re_none` live once, `re_move` pre-staged, `re_handles` live (grab a corner, read the count change). Hard cap 2.25. |
| 14 | Three principles, one test (recap) | 1.0 | replaces "Three parts, three decisions". Premise line "Know the question." then the three should-statements with small-print verbs (filter · group_by · join / refit · context · baseline / adjust, not redo), then the takeaway word for word. Loop SVG fully lit. Interaction-zoo link as footer. |
| 15 | Closing photo | 0.4 | keep. Payoff closes all three questions: "Bagby Rings. 0.35 miles, 24-minute wait, no pumpkin spice. Go select something." |
| A | Appendix (after the closing slide, not in the run) | 0 | current slides 5 (wait / close / spice trio) and 18 (in_drag / in_corner / in_center trio) move here. Reachable in Q&A. Keeps all sixteen widgets in the deck. |

### Speaker line per slide

1. We went looking for donuts in Houston and came back with three things a selection has to do.
2. Three of us, three questions: wait times, what is close, pumpkin spice. Pumpkin spice is a column;
   a toggle answers it. Everything else today is judged against the other two. And the step before
   any of it, if you build for other people: know the question before you build the selection.
3. Fully interactive: hover, legend chips that persist, a filter that works. It answers none of our
   questions. The gesture is fine, the response is fine; nothing it can compute is a question we
   brought. Each layer can fail on its own, which is why there are three chapters. [fragment] Same
   data, same toolkit, this one answers "where is close". Watch the five purple shops: close here
   means the five nearest, decided by the author. Hold that.
4. Effective means the vis overlaps the questions the viewer actually has. The rest of the talk is
   where that overlap gets lost, and how to keep it.
5. One click, one region: read the count and the mean wait. That rectangle is a question made
   concrete. It goes in as a gesture, becomes a query, comes back as a picture, and the picture
   hands you the next question. Three places to lose it, and they are not the same kind of loss.
   At the first two the system can answer a nearby question instead of yours: a radius the author
   chose, a highlight the docs taught first. At the third the answer is exactly right and then gone
   when you let go. Selection only today; pan, sort and re-encode are a link on the recap.
6. First place to lose the question: the query is the author's, not the viewer's.
7. Slide 3 hard-coded close as the five nearest. Close to you might be a mile, to me a block. The
   radius is the viewer's parameter and it belongs in the WHERE. Drag the center; step the radius;
   the count, the mean wait and the ranked list recompute. A slider is the precise instrument for a
   radius, which is why it reads 0.80 and not "about here". Notice the answer lands in the tiles
   next to the map: the selection drives another output, which is what most of your apps do.
8. "What about wait times" becomes "the Heights versus Montrose". A single selection cannot say
   versus. Two groups write a column the table never had, and the chart can say the Heights side
   waits 3.6 minutes longer. Add a shop to a group and watch the gap move.
9. Some questions have no column. Click a shop, a selection of one, and it reaches outside the
   table and joins in reviews the chart never loaded. A join, a model, an API, a simulation:
   anything that is a function of the selection lives here.
10. The query returned rows. Second place to lose the question: the picture does something with
    the rest that you did not choose. Same chart, same rows; what happens on screen?
11. We moved to the scatter on purpose: removal is invisible on a map with no axes to refit. Three
    questions about the rest. "Without it": brush the 5,600-review outlier away, the rest refit,
    the axes reopen. "Versus the rest": pick a neighborhood from the list, the rest stay as context
    and nothing else moves; a list is the precise instrument when the question is the Heights.
    "As a whole": the region becomes a mark, the rest become the baseline. Highlight still computes
    membership; the comparison happens in your eye because that is what versus asks for. It is the
    one-liner the Altair docs teach first; Plotly dims the unselected by default; Shiny hands you a
    filtered table, where the rest is simply gone. Four answers, and the default is one you did not
    choose. And notice the box vanished when I let go. Hold that thought.
12. The picture handed you a new question. Third place to lose it: not a wrong answer this time,
    but a right one you cannot re-ask without starting over.
13. You saw three ways to draw the same region; drag, two corners, one click all land the same
    count. The first question is cheap however you say it; what is left when you let go is not.
    Quick drag on the first: nothing remains, and "a bit west?" means drawing the whole question
    again; people stop after two tries. Right for scanning, wrong for revising. Second: an object
    you can move, one drag. Third, live: handles, every edge of the query editable, and the count
    changes as I widen it. Researchers call this reification; call it making the question a thing
    you can hold. Reify when the viewer will revise; hover and one-shot lookups can stay transient.
    One footnote: chapter two's filter dropped its box on purpose. For a removal the question that
    persists is the removed set, and Reset is its handle. Shiny users, you already ship this; do
    not set resetOnNew to TRUE. Vega-Lite, your interval moves but has no handles. Observable Plot
    and hand-rolled d3: check what your brush does on mouseup.
14. Know the question. Then ask three things of the next selection you build. Which query is it:
    filter, group_by, or join? What happens to everything the viewer did not select: refit,
    context, baseline, or gone? When they want it a little different, do they adjust it or redo it?
    In Shiny terms: check it in the reactive, on the redraw, and on mouseup. One test underneath:
    does the viewer's question survive the round trip? A selection is the viewer's question: choose
    the query it runs, decide what happens to the rest, and leave it adjustable.
15. Bagby Rings. 0.35 miles, 24-minute wait, no pumpkin spice. Go select something. Thank you.

## Cuts, and why

- **Slide 15, the five-card zoo.** Five nouns with no widget, inside a talk about one interaction.
  "Today: selection only" becomes one spoken line on the spine slide; the vis-society link moves to
  the recap footer.
- **Slide 13, "Growing data".** A data-shape taxonomy dressed as a chapter close. The chapter card
  carries the should-statement and the recap carries the verbs.
- **Slide 7, the equation, and its three chapter-card copies.** The parts are legs of one trip, not
  addends. The loop SVG, relabeled, does the job on the spine, the three chapter cards (one leg
  bold each) and the recap (fully lit). No new geometry.
- **Slide 9's three Q/A cards.** The live `in_center` box gives the concrete referent. The 28.3
  figure (the Heights alone, three shops) goes with them.
- **Slide 5, the wait / close / spice trio, to the appendix.** `close` already appears as the
  fragment on slide 3; spice is retired on slide 2 and paid off on the closing slide. Cutting it
  lands the spine at about 2:15 instead of 3:00. **First thing to restore** if two rehearsals land
  under 13.5 minutes.
- **Slide 18, the drag / corners / center trio, to the appendix.** It is a 45-second non-result
  (that is its point). Its two sentences open the ladder; `in_center` does its job live on the
  spine slide.
- **The ladder numerals.** They encode "transient is worst", which is false for scanning.
- **The word "hypothesis"** everywhere except structure's Heights-versus-Montrose. Slide 2's cards
  are questions, not falsifiable claims. Two SVG text edits (slides 2 and 4). Optional, but a vis
  researcher in the room will notice the mismatch.
- **The word "brush" on slides.** "Selection" everywhere on screen; "brush" in speech only when a
  rectangle is on screen. Three of the demos are clicks or a list pick.
- **Any "precise" widget.** No slot for it; two spoken clauses cover it.
- **The spoken "9.4 minutes longer" and "28.3".** Both depend on hitting a region by hand. Read
  numbers off the widgets. Exceptions that are reproducible: the preset `structure` gap (3.6) as
  long as you read it before touching the groups.

Over-time cut order for the first long rehearsal, after the two appendix moves: (1) `augment`
becomes a spoken "join" line over `structure`'s end state (saves 0.5); (2) the `in_center` live box
on the spine becomes a pre-placed region with the numbers read, not drawn (saves 0.25). Never cut
the `sel_*` trio or the ladder.

## Small fixes in slides.qmd (verified against the source)

- **Line 474: augment rail SQL joins `walking_distances`** while the widget pulls reviews. Rewrite:
  `SELECT d.name, r.rating, r.text FROM donut_shops d JOIN reviews r ON r.shop_id = d.shop_id WHERE d.shop_id = :selected;`
- **Line 423: `HAVING COUNT(*) > 0`** on the structure rail does nothing; a SQL-literate room will
  wonder why it is there.
- **Line 673: `sel_filter` iframe title says "unselected shops are removed"**. Backwards; the brushed
  shops are the ones that go. "Selection removes: the brushed shops go and the axes refit".
- **`.hyp-mini` dots on the sel_* trio**: brick on the outlier cell and orange on the count cell are
  not questions; all three cells are wait questions on one scatter. Strip them.
- **Repeated heading "Human-Data Interaction Loop"** on the four Ch.1 slides: headers carry the
  claim now.

## Deck-level fix: widgets lose state between slides (verified in the bundled reveal.js)

`slides.html` emits `preloadIframes: null`. With preload off, reveal's `stopEmbeddedContent` runs on
the slide you leave with `unloadIframes` defaulting to true, and sets every `iframe[data-src]` to
`about:blank`. So any widget state you pre-stage (a region drawn on `sel_count`, a box placed on
`re_move`) is gone the moment you step to the next slide, and every per-item fragment on the two
trios triggers a fresh iframe load, which is a visible stall on stage.

Fix, then test:

1. In the `revealjs:` YAML block add `preload-iframes: true` and `view-distance: 25` (sixteen
   widgets stay resident; reveal only unloads when a slide leaves view-distance).
2. Remove `loading="lazy"` from the seventeen widget iframes; with preload on it only second-guesses
   reveal.
3. Delete the `include-in-header` script. Its src-setting block leaves `data-src` in place so it
   protects nothing against the blanking, and its `syncLoopUI` block drives Q/A cards that are now
   cut. No widget runs a continuous animation (no `setInterval` / `requestAnimationFrame` in any
   bundle), so keeping all sixteen resident costs only startup load. Open the deck a minute early.
4. Render, then: draw a region on `sel_count`, click a neighborhood on `sel_highlight`, place a box
   on `re_move`, jump to the recap, come back, confirm all three persist. Step backward through the
   slide 11 fragments and confirm nothing reloads.
5. If a specific widget still does not survive, swap a PNG of its end state into that one slide.
   Screenshots, not widget edits.

The YAML keys were not render-tested here (Quarto is at
`/Applications/Positron.app/Contents/Resources/app/quarto/bin`, not on PATH in this environment);
they are documented Quarto revealjs options and `slides.html` already emits `preloadIframes` and
`viewDistance` from defaults.

## Decisions only you can make

- **Loop spine vs. equation.** Recommended: retire the equation, relabel the loop SVG once
  (center "interact" becomes "compute"; three legs coloured), reuse it on the three chapter cards
  and the recap. The cheaper fallback that still gets most of the value: keep the equation, and
  just rewrite the three chapter cards and the recap as should-statements.
- **Appendix vs. delete** for the wait / close / spice and drag / corners / center trios.
  Recommended: appendix. Costs nothing on stage, keeps all sixteen widgets, and gives you the
  first thing to restore.
- **"Questions" vs. "Hypotheses".** Recommended: Questions (two SVG edits). If you want
  "hypothesis", rewrite the three cards as claims ("the Heights waits longer", "nothing good is
  within a mile"), which is more work and makes spice awkward.
- **"Precise" visibility.** Recommended: two spoken clauses. If you want it on a slide, a fourth
  small-print item under Interaction on the recap; the recap is better at three.
- **Tool-specific lines.** One sentence per chapter naming who the principle is for is in the
  script above. Verify before saying: plotly.js added persistent editable selections in 2.13
  (2022), so "Plotly box select vanishes on release" is version-dependent; the script names
  Observable Plot and hand-rolled d3 for Ch.3 and leaves Plotly out. The Shiny facts (brush
  persists, drags and resizes by default; `resetOnNew` defaults to FALSE) and the Vega-Lite fact
  (interval translates, no resize handles) are as stated.
