# GeoGrain project page

Source of the project page for **GeoGrain: Granularity-Aware Layout-to-Image Generation for Small Objects in Remote
Sensing Imagery** (Taehwan Kim, Jeonghyeok Do, Munchurl Kim; KAIST; arXiv preprint, 2026).

- Live page: https://kaist-viclab.github.io/GeoGrain_site/
- Code repository: https://github.com/KAIST-VICLab/GeoGrain

The page is plain HTML, CSS and JavaScript with no build step and no dependencies other than Google Fonts.
GitHub Pages serves it from the repository root (`.nojekyll` turns off Jekyll processing).

## Preview locally

Serve the folder over HTTP rather than opening `index.html` from disk, so that every path resolves as it does on GitHub Pages:

```bash
cd GeoGrain_site
python3 -m http.server 8000
# then open localhost:8000 in a browser
```

## Layout

```
index.html                the page (results first: headline figure, interactive gallery and paper figures, quantitative
                          results, then the method)
static/css/family.css     styles shared with the other KAIST-VICLab family pages (the same file on each)
static/js/family.js       scripts shared with those pages: navigation, abstract toggle, pending links, BibTeX copy,
                          image lightbox, tabs, table scroll cues
static/css/style.css      GeoGrain brand colours (top of the file), the gallery, comparison slider and table extras,
                          the alignment of all text (section 8) and the phone layout
static/js/main.js         interactive gallery: tile strips in carousels with large previous / next buttons either side
                          and the arrow keys working whenever the gallery is on screen; each dataset's current example
                          and the ones either side of it load ahead, the rest as they are reached; the comparison
                          slider with a choice of both sides; the even word spaces of justified text below 1100 px
static/images/            paper figures: *_900 ... *_2800 are inline, *_full open in the lightbox, each as .avif with its
                          .jpg as the fallback; og.jpg (social preview) and the logo files
static/gallery/           gallery images as they appear in the paper's comparison figures (input OBBs drawn on them),
                          one folder per dataset (soda, aitod, dior), each as .avif with its .jpg as the fallback
```

## Image formats

Every photo-like image of the page exists twice: as AVIF (quality 70, full-resolution 4:4:4 chroma) and as the JPEG it was
made from. The AVIF files are about a third of the JPEGs (gallery 79.5 MB -> 26.5 MB) at 40-45 dB PSNR against them, and
look the same at 3x zoom, including the thin box outlines and the small text of the diagrams. Browsers that read AVIF get
it (figures through `<picture>`, gallery and lightbox images through `family.js`, which tests support once with a 2 x 2
AVIF); the others, and any AVIF request that fails, get the JPEG. og.jpg, the favicons and the SVG logo files are left as
they are. The AVIF copies are encoded from the JPEGs with sharp (libvips + libaom): figures at each width from the
`_full` master (Lanczos), gallery images at 1024 px, sheets from the 1024 px images reduced to 512 px.

## Gallery

Six examples per dataset (SODA-A, AI-TOD-R, DIOR-R), each with the input layout, the seven baselines, GeoGrain and the
real image. They are the examples of the paper's appendix figures, two per figure: SODA-A Figs. 8-10, AI-TOD-R Figs. 11-13,
DIOR-R Figs. 14-16.

Files per example (`static/gallery/<set>/<set><k>_...`): one 1024 px image per tile (`_input`, `_aerogen`, ..., `_geograin`,
`_real`), opened in the comparison slider, and one tile sheet, `_tiles`: the ten tiles at 512 px side by side, in the
order of the page (input, AeroGen, CC-Diff, CC-Diff++, FICGen, SiamLayout, LayTrol, TerraDiT, GeoGrain, real); each file
as .avif and .jpg. Every tile of an example shows its cell of the sheet, so an example costs one request instead of ten.
GitHub Pages answers "429 Rate limit exceeded" for a few minutes when one address sends many requests in a short time;
fewer requests keep the page clear of it, and an image that is refused anyway stays hidden and is fetched again after a
few seconds instead of showing as broken.

The comparison slider opens on the 1024 px images themselves: those of GeoGrain and the real image of the example on
screen are fetched a moment after its tiles, a tile's own as the pointer rests on it (or it takes focus), and the rest of
an example once its slider is open, so that a click shows both sides sharp at once and switching either side is instant.
Only when an image has not arrived after 0.3 s (a slow connection, a refused request) does its tile from the sheet stand
in until it does. The JPEG sheets: Lanczos to 512 px, quality 84, 4:2:0, progressive.

## Logo

The GeoGrain logo is included: `static/images/logo.svg` is the hero title (its text is outlined, so no font is needed),
`icon.svg` is the navigation and footer mark, and `icon_square.svg` (the SVG favicon), `favicon-32.png`, `favicon-64.png` and
`apple-touch-icon.png` are the browser and home-screen icons. The page title and headings use the typeface of the family
pages, Outfit (loaded from Google Fonts), and the series ink, `#1C2738`. The accent colour is the logo's purple, `#4F3F95`
("Grain"), the hue of the paper's table rows for GeoGrain; `#F5F1F9`, the tint of those rows in the paper, fills highlighted
rows and tiles. The logo's blue, `#2F6FB1` ("Geo"), marks "Remote Sensing" in the title. All colours of the page are set at
the top of `static/css/style.css`.

## Figures and tables

The paper figures are white and cropped to their content, so no frame sits on their edge: the headline figure stands on
the white page with no frame, and the figures on the tinted bands lie on white sheets with a margin all round and no
outline (section 6 of `static/css/style.css`). Table 1 is narrower than the results tables, and each dataset's size
classes form one aligned block (class, lower bound, dash, upper bound) in its column.

## Text alignment

Section 8 of `static/css/style.css` sets the alignment of every block of text. A block that runs over more than one line
(section leads, gallery intros, the abstract, the key points, table notes, figure and table captions) is justified to both
edges of its box; a block that fits on one line is centred. A caption is exactly as wide as its figure or table, so a long
caption's edges are the figure's edges, as in the paper. Words are not hyphenated automatically, since browsers differ in
whether they can (the Claude desktop app's browser cannot), which would break the lines differently from one reader to the
next; three words of the abstract carry soft hyphens (`&shy;`) instead. The measures are chosen line by line for these
breaks, each in the middle of a range of widths that give the same lines: the section leads at 920 px, the gallery intros
at 786 px, the abstract panel at 862 px and Fig. 2 at 668 px. `static/js/main.js` tidies the captions whose width follows
the window: a caption whose last line would be a stub of a word or two takes a slightly tighter word space when that is
enough to lose it, a two-line caption that still has one is set on two balanced, centred lines, and a single line nearly as
wide as its figure runs to both edges. From 1101 to 1303 px the key points, whose columns follow the window there, are flush
left. The hero and the section titles are centred display lines. Hyphenated names (AI-TOD-R, Layout-to-Image, TerraDiT-Ω,
...) and number ranges such as 1–4 are wrapped in `<span class="nowrap">` in `index.html`, so a line never breaks inside
them; keep these spans when the text is edited or the page is regenerated.

Below 1100 px (tablets, phones) every measure follows the window, so the lines cannot be chosen one by one; the same blocks
stay justified all the same. The browser hyphenates long words there (`hyphens: auto`: 6+ letters, 2+ before the break and
3+ after it, as in TeX), and `static/js/main.js` evens out the word spaces of each block as it comes near the screen: it
tries a few word and letter spacings (word space -0.05 to +0.08 em, letter space -0.01 to +0.01 em) and keeps the one whose
loosest line is tightest, a block on screen or above it keeping its number of lines, so nothing in view moves. Because
Safari hyphenates capitalised words too, the script first puts the one-word method names (GeoGrain, SiamLayout, SceneKID,
...) in `.nowrap` spans; the long compounds marked `nowrap-l` in `index.html` (Layout-to-Image, image–text, FLUX.2 [klein]
4B, ...) may break at their own hyphen or dash there, as a short measure needs. None of this runs above 1100 px, where the
page is exactly as described above.

## Phones

On a phone the end of `static/css/style.css` changes a few things; wider screens are as described above.

- Up to 560 px, the tab rows (paper figures, results) become a grid of two tabs per row, an odd last tab across both, so no
  tab is scrolled out of sight; the three dataset chips of the gallery share one row, each with its count under its name.
- Up to 640 px, the gallery hint sits 22 px under the gallery, its two parts on two centred lines ("Swipe or use ... to
  change example" / "Tap an image to open the comparison slider"), and the footer is one centred column (mark, venue,
  affiliation, links).
- Up to 600 px, a BibTeX line too long for the screen wraps under its own value (a hanging indent); the copied text keeps
  the source's line breaks.

At any width, a tap or a click never leaves a focus ring round a container (the gallery carousel, a tab panel, a table
scroller): Safari focuses the nearest focusable container on a tap, and a closing dialog hands focus back to it. `main.js`
marks the page `.pointer-input` on a pointer press and clears it on a key press, so the keyboard keeps every ring.

The stylesheets and scripts are linked with a `?v=` query in `index.html` (the first 8 hex digits of the file's MD5); change it whenever one of those files
changes, so that browsers holding the old file in their cache (GitHub Pages lets them keep it for ten minutes) load the
new one at once.

## Paper and arXiv links

Link order: Code, arXiv, then Paper, in the hero buttons and in the footer; the navigation bar's button is Code. The
colours match the badges of the code repository's README and are taken from the logo, one step lighter so that they sit
with the page: Code (the link to the other home) in purple `#6F64B3`, arXiv in the car's red `#B74751`, Paper in blue
`#3A74B2`, Gallery in teal `#178378` and BibTeX in charcoal `#353D4D` (`static/css/style.css`, end of the file). A link
that is not public yet keeps its colour and carries a "soon" chip until its real address is set.

- arXiv: the paper is not on arXiv yet. Until it is, the hero's arXiv button, the footer's arXiv link and the BibTeX
  entry carry a placeholder identifier; such a link is shown as pending (the buttons
  carry a "soon" badge) and does not navigate. Setting the identifier in `index.html` is enough; no CSS or JavaScript
  file needs editing.
- Paper: not public yet. The hero's Paper button and the footer's Paper link carry a `data-soon` attribute: they are
  shown as pending and do not navigate, with or without JavaScript. To publish the paper, put the PDF at
  `static/paper/GeoGrain.pdf`, set it as their `href` and remove `data-soon` in `index.html`.
- Contact: the footer's Contact link writes to the first author, taehwankim@kaist.ac.kr.
