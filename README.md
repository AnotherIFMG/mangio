# Mangio landing page

Bilingual pre-launch landing page for **Mangio: Pantry Recipes**.

## Product promise

> Eat well for less. Waste nothing.

Mangio turns what is already in the kitchen into tonight's dinner, prioritising food that needs using first.

## Local preview

This is a dependency-free static site. From the project root, run:

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173`.

## Cloudflare deployment

The static files are compatible with Cloudflare Pages. Uploading this repository does not configure hosting or connect `mangio.dev`; deployment is a separate step.

The waitlist form is currently a design preview. It validates the email format locally, then explicitly reports that nothing was sent or saved. Connect persistent storage before launch.

## Design and screen replacements

The rebuilt design uses white, cool gray and Mangio blue, with overlapping iPhone concepts, an interactive three-screen demo, a larger preview dialog, recipe cards, reminder widgets and a working sample timer. English and Italian are available throughout. Scroll entrances and screen transitions respect reduced-motion preferences.

Put approved portrait screenshots in `assets/screens/`, then set the `pantry`, `dinner` and `shopping` paths for each language in `SCREEN_ASSETS` at the top of `script.js`. The same images appear in the hero, interactive demo and enlarged preview. Empty paths show the illustrative HTML screens. These are concept layouts, not representations of the finished app.

## Before launch

- Replace the concept app preview with approved product screenshots
- Connect `/api/waitlist` and add abuse protection
- Add privacy-policy and terms pages
- Confirm final USD and EUR pricing
- Add only verified testimonials
- Add an Open Graph image
- Run accessibility, performance and multilingual-copy checks

## Design review decisions

- `overused-font=arial`: intentional system sans for compact app UI and the bold, clean heading treatment in the supplied references. Serif accents and the Mangio mark supply the brand contrast.
- `italic-serif-display=*` scoped to `index.html`: intentional Georgia accent derived from the supplied GetDraft reference. The main promise remains upright sans serif. The detector does not support a font-specific value for this rule.
- Device and card shadows use neutral black with transparency; no chromatic glow exception is retained.

## Attribution

The design audit workflow uses [unslop](https://github.com/heydamir/unslop) by Damir Sokolovsky, licensed under CC BY 4.0.
