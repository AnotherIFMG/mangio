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

Cloudflare Pages build settings:

- Production branch: `main`
- Framework preset: `None`
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: repository root (leave blank)

The build uses Node.js built-ins with no external dependencies and copies only public site files into `dist/`. Hosting and the `mangio.dev` domain are configured separately in Cloudflare.

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

## Recipe pages and Universal Links

- `/r/<slug>` is rendered by the Pages Function `functions/r/[slug].js`, so Open Graph and the schema.org Recipe are in the HTML without JavaScript. The recipe comes from the `public-recipe` edge function in the app's Supabase; only `published` and `unlisted` rows of `recipe_publications` answer, anything else gets the landing page with a 404.
- `recipe.js` adds ingredient ticks (this browser only) and step timers, and counts taps on "Save to my Cookbook".
- "Save to my Cookbook" is a plain link to `https://open.mangio.pages.dev/r/<slug>`. A link to the page's own host stays in Safari (Universal Links rule); a link to another host opens the app when it is installed. Without the app, the same recipe loads on `open.` with "Mangio is coming to the App Store soon" in place of the button, no Safari error.
- `open.mangio.pages.dev` is the Cloudflare branch alias of the `open` branch. **After every push to `main`, also run `git push origin main:open`**, or the `open.` host serves an old copy.
- Dish photo: `starter_recipes.image_url` (any public https URL, 1200×630 or larger). It becomes `og:image`, the large preview card and the hero; without it the Mangio mark is the fallback.
- `/.well-known/apple-app-site-association` lets the iPhone app (`NX6V99ZFW6.irene.mangio-ai`) open `/r/*`. `/list/*` stays in the browser on purpose.
