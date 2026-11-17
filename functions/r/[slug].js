// A published Mangio recipe behind a link: /r/<slug>.
// Rendered here, on the server, so Instagram, TikTok and Google see the
// Open Graph preview and the schema.org Recipe without running JavaScript.
// The recipe comes from the `public-recipe` edge function in the app's
// Supabase; only published and unlisted recipes answer there.
// The page shows the whole recipe: nothing waits behind an install.

const ENDPOINT = "https://slhbazaxkfgjozcfhifu.supabase.co/functions/v1/public-recipe";
const SITE = "https://mangio.pages.dev";
const FALLBACK_IMAGE = `${SITE}/assets/mangio-mark.jpg`;
// "Save to my Cookbook" links here: another host, so iOS hands the tap to
// the app (a link to the page's own host stays in Safari). Without the app
// the same recipe loads on this host and says the app is coming, with no
// Safari error. Served by the `open` branch of this repo (branch alias).
const OPEN_SITE = "https://open.mangio.pages.dev";
const SLUG_PATTERN = /^[a-z0-9-]{1,80}$/;
// Link-preview and search crawlers: they get the page, but are not counted
// as people opening it.
const BOT_PATTERN = /bot|crawl|spider|slurp|facebookexternalhit|facebookcatalog|meta-externalagent|whatsapp|telegram|discord|slack|embedly|pinterest|preview|headless|lighthouse|curl|wget|python|go-http/i;

const UTM_KEYS = { source: "utm_source", medium: "utm_medium", campaign: "utm_campaign" };

export async function onRequestGet({ params, request, env }) {
  const slug = String(params.slug || "");
  if (!SLUG_PATTERN.test(slug)) return notFound(request, env);

  const url = new URL(request.url);
  const utm = {};
  for (const [key, param] of Object.entries(UTM_KEYS)) {
    const value = url.searchParams.get(param);
    if (value) utm[key] = value.slice(0, 128);
  }
  const isBot = BOT_PATTERN.test(request.headers.get("user-agent") || "");
  // On the open host the person already counted as a view and a save tap.
  const appMissing = url.hostname.startsWith("open.");

  let data;
  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(isBot || appMissing ? { slug } : { slug, event: "view", utm }),
    });
    if (response.status === 404) return notFound(request, env);
    if (!response.ok) return unavailable();
    data = await response.json();
  } catch {
    return unavailable();
  }

  return new Response(renderPage(data, utm, { appMissing }), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      ...(data.listed && !appMissing ? {} : { "X-Robots-Tag": "noindex" }),
    },
  });
}

// An unknown, draft or archived recipe: the landing page, with a 404 status.
async function notFound(request, env) {
  const landing = await env.ASSETS.fetch(new URL("/", request.url));
  return new Response(landing.body, {
    status: 404,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
  });
}

function unavailable() {
  return new Response(null, { status: 503, headers: { "Retry-After": "30", "Cache-Control": "no-store" } });
}

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const FRACTIONS = { 0.25: "¼", 0.5: "½", 0.75: "¾", 0.33: "⅓", 0.67: "⅔" };

function number(value) {
  const whole = Math.floor(value);
  const rest = Math.round((value - whole) * 100) / 100;
  if (rest === 0) return String(whole);
  const fraction = FRACTIONS[rest];
  if (fraction) return whole === 0 ? fraction : `${whole}${fraction}`;
  return String(Math.round(value * 10) / 10);
}

// "400 g", "2 cloves", "to taste": the amount column of one ingredient.
export function amount(ingredient) {
  const unit = String(ingredient.unit || "").trim();
  if (unit === "to taste") return "to taste";
  const quantity = typeof ingredient.quantity === "number" && ingredient.quantity > 0 ? number(ingredient.quantity) : "";
  if (unit === "pc" || unit === "pcs" || unit === "piece" || unit === "pieces") return quantity;
  return [quantity, unit].filter(Boolean).join(" ");
}

function isoMinutes(minutes) {
  return `PT${Math.max(0, Math.round(minutes || 0))}M`;
}

function grams(value) {
  return typeof value === "number" ? `${Math.round(value * 10) / 10} g` : undefined;
}

export function recipeJSONLD(data) {
  const r = data.recipe;
  const total = (r.time_prep_min || 0) + (r.time_cook_min || 0);
  const nutrition = typeof r.kcal === "number" ? {
    "@type": "NutritionInformation",
    servingSize: "1 serving",
    calories: `${Math.round(r.kcal)} kcal`,
    proteinContent: grams(r.protein_g),
    fatContent: grams(r.fat_g),
    carbohydrateContent: grams(r.carbs_g),
    fiberContent: grams(r.fiber_g),
  } : undefined;
  const ld = {
    "@context": "https://schema.org",
    "@type": "Recipe",
    name: r.title,
    description: r.description_text,
    image: [data.imageURL || FALLBACK_IMAGE],
    author: { "@type": "Organization", name: "Mangio", url: SITE },
    datePublished: data.updatedAt ? String(data.updatedAt).slice(0, 10) : undefined,
    prepTime: isoMinutes(r.time_prep_min),
    cookTime: isoMinutes(r.time_cook_min),
    totalTime: isoMinutes(total),
    recipeYield: `${r.servings} servings`,
    recipeCategory: r.meal_type,
    recipeCuisine: r.cuisine || undefined,
    keywords: (r.tags || []).join(", ") || undefined,
    nutrition,
    recipeIngredient: (r.ingredients || []).map((i) => {
      const a = amount(i);
      if (a === "to taste") return `${i.name}, to taste`;
      return [a, i.name].filter(Boolean).join(" ");
    }),
    recipeInstructions: (r.steps || []).map((s) => ({
      "@type": "HowToStep",
      name: s.title || undefined,
      text: s.instruction,
      url: `${data.url}#step-${s.step_number}`,
    })),
  };
  // A recipe text can contain "</script>": < is escaped inside the JSON.
  return JSON.stringify(ld).replace(/</g, "\\u003c");
}

function withUTM(base, utm) {
  const params = new URLSearchParams();
  for (const [key, param] of Object.entries(UTM_KEYS)) if (utm[key]) params.set(param, utm[key]);
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}

export function renderPage(data, utm = {}, { appMissing = false } = {}) {
  const r = data.recipe;
  const total = (r.time_prep_min || 0) + (r.time_cook_min || 0);
  const ingredients = r.ingredients || [];
  const steps = r.steps || [];
  const meta = [`${total} min`, `${ingredients.length} ingredients`, `${r.servings} servings`].join(" · ");
  const image = data.imageURL || FALLBACK_IMAGE;
  const description = r.description_text || meta;
  const appLink = withUTM(`${OPEN_SITE}/r/${data.slug}`, utm);
  const noindex = !data.listed || appMissing;
  // Copy approved by Irina 2026-11-17.
  const saveSection = appMissing
    ? `<section class="save" id="app-missing">
    <p class="save-title">Mangio is coming to the App Store soon</p>
    <p>Everything you need to cook is right here.</p>
  </section>`
    : `<section class="save">
    <a class="save-button" id="save" href="${esc(appLink)}">Save to my Cookbook</a>
    <p>Keep this recipe in Mangio.</p>
  </section>`;

  const ingredientRows = ingredients.map((i, index) => `
      <li><label class="ingredient"><input type="checkbox" id="ing-${index}"><span class="box" aria-hidden="true"></span><span class="name">${esc(i.name)}</span><span class="qty">${esc(amount(i))}</span></label></li>`).join("");

  const stepRows = steps.map((s) => {
    const timer = typeof s.duration_min === "number" && s.duration_min > 0 && s.timer_required
      ? `<button type="button" class="timer" data-minutes="${esc(s.duration_min)}" aria-label="${esc(s.duration_min)} min timer"><span>${esc(s.duration_min)} min</span></button>`
      : "";
    return `
      <li class="step" id="step-${esc(s.step_number)}">
        <span class="step-number">${esc(s.step_number)}</span>
        <div class="step-body">
          ${s.title ? `<h3>${esc(s.title)}</h3>` : ""}
          <p>${esc(s.instruction)}</p>
          ${s.tip ? `<p class="tip">${esc(s.tip)}</p>` : ""}
          ${timer}
        </div>
      </li>`;
  }).join("");

  return `<!doctype html>
<html lang="${esc(data.language || "en")}">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(r.title)} · Mangio</title>
<meta name="description" content="${esc(description)}">
${noindex ? '<meta name="robots" content="noindex">' : ""}
<link rel="canonical" href="${esc(data.url)}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Mangio">
<meta property="og:title" content="${esc(r.title)}">
<meta property="og:description" content="${esc(meta)}. ${esc(description)}">
<meta property="og:url" content="${esc(data.url)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:image:alt" content="${esc(r.title)}">
<meta name="twitter:card" content="${data.imageURL ? "summary_large_image" : "summary"}">
<meta name="twitter:title" content="${esc(r.title)}">
<meta name="twitter:description" content="${esc(meta)}">
<meta name="twitter:image" content="${esc(image)}">
<meta name="theme-color" content="#ffffff">
<link rel="icon" href="/assets/mangio-mark.jpg">
<link rel="stylesheet" href="/recipe.css">
<script type="application/ld+json">${recipeJSONLD(data)}</script>
<script src="/recipe.js" defer></script>
</head>
<body>
<main class="recipe-page" data-slug="${esc(data.slug)}">
  <header class="top">
    <a class="brand" href="/" aria-label="Mangio"><img src="/assets/mangio-mark.jpg" alt="" width="28" height="28"><span>mangio</span></a>
  </header>

  ${data.imageURL ? `<img class="hero" src="${esc(data.imageURL)}" alt="${esc(r.title)}" width="1200" height="900">` : ""}
  <h1>${esc(r.title)}</h1>
  <p class="meta">${esc(meta)}</p>
  ${r.description_text ? `<p class="lede">${esc(r.description_text)}</p>` : ""}

  <section aria-labelledby="ingredients-title">
    <h2 id="ingredients-title">Ingredients</h2>
    <ul class="ingredients">${ingredientRows}
    </ul>
  </section>

  <section aria-labelledby="cook-title">
    <h2 id="cook-title">Let’s cook</h2>
    <ol class="steps">${stepRows}
    </ol>
  </section>

  ${saveSection}
</main>
</body>
</html>`;
}
