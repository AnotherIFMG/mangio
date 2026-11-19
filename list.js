// The shopping list behind a share link: /list/<token>.
// Reads and ticks through the `shared-list` edge function; the token is the
// only key. Polls while the tab is visible so ticks from the owner's phone
// show up here too.

const ENDPOINT = "https://slhbazaxkfgjozcfhifu.supabase.co/functions/v1/shared-list";
const POLL_MS = 3000;
// Same aisles, order and emoji as the List tab in the app (ShoppingAisle).
const ZONES = [
  ["produce", "🥦", "Produce", "Frutta e verdura"],
  ["dairyEggs", "🥛", "Dairy & Eggs", "Latticini e uova"],
  ["meatSeafood", "🥩", "Meat & Seafood", "Carne e pesce"],
  ["bakery", "🥖", "Bakery", "Panetteria"],
  ["pantry", "🥫", "Pantry & Dry Goods", "Dispensa"],
  ["sauces", "🧴", "Sauces & Oils", "Salse e oli"],
  ["spices", "🌶", "Spices & Herbs", "Spezie ed erbe"],
  ["supplements", "💊", "Supplements", "Integratori"],
  ["drinks", "🥤", "Drinks", "Bevande"],
  ["snacks", "🍫", "Snacks", "Snack"],
  ["household", "🧹", "Household", "Casa"],
  ["other", "📦", "Other", "Altro"],
];
const TITLES = { "Shopping List": ["Shopping list", "Lista della spesa"] };

const token = (location.pathname.match(/^\/list\/([A-Za-z0-9]{6,64})\/?$/) || [])[1] || "";
let language = "en";
try {
  const stored = localStorage.getItem("mangio-language");
  language = stored ? (stored === "it" ? "it" : "en") : (navigator.language || "").toLowerCase().startsWith("it") ? "it" : "en";
} catch {}

let list = null;
// Ticks not confirmed by the server yet: itemId -> checked.
const pending = new Map();
let pollTimer = null;

const $ = (id) => document.getElementById(id);

function setLanguage(lang) {
  language = lang;
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-en]").forEach((el) => { el.textContent = el.dataset[lang]; });
  document.querySelectorAll("[data-lang]").forEach((el) => el.setAttribute("aria-pressed", String(el.dataset.lang === lang)));
  try { localStorage.setItem("mangio-language", lang); } catch {}
  render();
}

async function call(body) {
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, ...body }),
    cache: "no-store",
  });
  if (response.status === 404) return { expired: true };
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

function show(state) {
  $("loading").hidden = state !== "loading";
  $("expired").hidden = state !== "expired";
  $("list").hidden = state !== "list";
  $("live").hidden = state !== "list";
}

function quantityText(item) {
  const qty = Number(item.quantity);
  if (!Number.isFinite(qty) || qty <= 0) return item.unit || "";
  const shown = Number.isInteger(qty) ? String(qty) : String(Math.round(qty * 10) / 10);
  const unit = item.unit && !["pcs", "piece", "pc"].includes(item.unit) ? ` ${item.unit}` : "";
  return shown + unit;
}

function isChecked(item) {
  return pending.has(item.id) ? pending.get(item.id) : item.checked;
}

function zoneOf(item) {
  return ZONES.some(([key]) => key === item.storeZone) ? item.storeZone : "other";
}

const SVG = "http://www.w3.org/2000/svg";

// An aisle opens with the app's capsule: its pastel, a muted glyph, the
// name in small capitals and how many are left.
function section(id, key, emoji, heading, count) {
  const element = document.createElement("section");
  element.className = "zone";
  element.id = id;
  const h2 = document.createElement("h2");
  h2.className = "aisle";
  h2.style.background = `var(--${key})`;
  const glyph = document.createElement("span");
  glyph.className = "glyph";
  glyph.setAttribute("aria-hidden", "true");
  glyph.textContent = emoji;
  const name = document.createElement("span");
  name.textContent = heading;
  const n = document.createElement("span");
  n.className = "n";
  n.textContent = String(count);
  h2.append(glyph, name, n);
  element.append(h2);
  return element;
}

// "Bought today" in the serif italic, between two hairlines, as in the app.
function boughtSection(id, heading) {
  const element = document.createElement("section");
  element.className = "zone bought";
  element.id = id;
  const head = document.createElement("div");
  head.className = "bought-head";
  const h2 = document.createElement("h2");
  h2.textContent = heading;
  head.append(h2);
  element.append(head);
  return element;
}

// The ring and the handwriting walk from Mangio blue to green as the list
// empties, like ShoppingProgressRing.
function hexToRgb(hex) {
  const value = hex.trim().replace("#", "");
  return [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16));
}
function tint(fraction) {
  const styles = getComputedStyle(document.documentElement);
  const from = hexToRgb(styles.getPropertyValue("--blue"));
  const to = hexToRgb(styles.getPropertyValue("--green"));
  const t = Math.min(Math.max(fraction, 0), 1);
  return `rgb(${from.map((c, i) => Math.round(c + (to[i] - c) * t)).join(",")})`;
}

function renderCorner(boughtCount, total, leftCount) {
  const it = language === "it";
  const fraction = total ? boughtCount / total : 0;
  const color = tint(fraction);
  const done = total > 0 && boughtCount >= total;
  $("corner").hidden = total === 0;
  $("corner").classList.toggle("done", done);
  $("left").textContent = done ? (it ? "fatto!" : "all done") : (it ? `${leftCount} rimasti` : `${leftCount} left`);
  $("left").style.color = color;
  $("count").textContent = `${boughtCount}/${total}`;
  const fill = $("ring-fill");
  fill.style.stroke = color;
  fill.style.opacity = fraction > 0 ? "1" : "0";
  $("ring-label").textContent = done ? "✓" : `${Math.round(fraction * 100)}%`;
  $("ring-label").style.color = done ? color : "";
  drawRingShare(fraction);
}

// The coloured dashes cover only the bought share of the circle: a second
// dashed circle, clipped to a pie slice.
function drawRingShare(fraction) {
  const ring = $("ring");
  let clip = ring.querySelector("clipPath");
  if (!clip) {
    const defs = document.createElementNS(SVG, "defs");
    clip = document.createElementNS(SVG, "clipPath");
    clip.id = "ring-share";
    const slice = document.createElementNS(SVG, "path");
    clip.append(slice);
    defs.append(clip);
    ring.prepend(defs);
    $("ring-fill").setAttribute("clip-path", "url(#ring-share)");
  }
  const slice = clip.firstChild;
  if (fraction >= 1) {
    slice.setAttribute("d", "M0 0H52V52H0Z");
    return;
  }
  const angle = fraction * 2 * Math.PI;
  const x = 26 + 30 * Math.cos(angle);
  const y = 26 + 30 * Math.sin(angle);
  const large = fraction > 0.5 ? 1 : 0;
  slice.setAttribute("d", fraction <= 0 ? "" : `M26 26 L56 26 A30 30 0 ${large} 1 ${x.toFixed(2)} ${y.toFixed(2)} Z`);
}

function render() {
  if (!list) return;
  const it = language === "it";
  const titles = TITLES[list.title];
  $("title").textContent = titles ? titles[it ? 1 : 0] : list.title;

  const total = list.items.length;
  const bought = list.items.filter(isChecked);
  const toBuy = list.items.filter((item) => !isChecked(item));
  renderCorner(bought.length, total, toBuy.length);
  $("empty").hidden = total > 0;

  const zones = $("zones");
  const chips = $("chips");
  zones.replaceChildren();
  chips.replaceChildren();

  // Like the List tab: what's left to buy, by aisle; bought items sink to
  // the bottom, newest tick first.
  const shown = [];
  for (const [key, emoji, en, itLabel] of ZONES) {
    const items = toBuy.filter((item) => zoneOf(item) === key);
    if (!items.length) continue;
    const label = it ? itLabel : en;
    const element = section(`aisle-${key}`, key, emoji, label, items.length);
    for (const item of items) element.append(row(item));
    zones.append(element);
    shown.push([`aisle-${key}`, label]);
  }
  if (bought.length) {
    const label = it ? "Comprato oggi" : "Bought today";
    const element = boughtSection("aisle-bought", label);
    for (const item of bought) element.append(row(item));
    zones.append(element);
    shown.push(["aisle-bought", label]);
  }

  // Jump bar, like the chips above the List tab: tap an aisle, land on it.
  if (shown.length > 1) {
    chips.append(chip("top", it ? "Tutto" : "All"));
    for (const [id, label] of shown) chips.append(chip(id, label));
  }
  chips.hidden = shown.length <= 1;
}

let selectedChip = "top";
function chip(target, label) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "chip";
  button.textContent = label;
  button.setAttribute("aria-pressed", String(selectedChip === target));
  button.addEventListener("click", () => {
    selectedChip = target;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (target === "top") window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    else document.getElementById(target)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    $("chips").querySelectorAll(".chip").forEach((el) => el.setAttribute("aria-pressed", String(el === button)));
  });
  return button;
}

function row(item) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "row" + (pending.has(item.id) ? " pending" : "");
  button.setAttribute("role", "checkbox");
  button.setAttribute("aria-checked", String(isChecked(item)));
  const box = document.createElement("span");
  box.className = "box";
  box.setAttribute("aria-hidden", "true");
  // The app's thin blue circle; ticked, it fills with a white check.
  box.innerHTML = '<svg viewBox="0 0 22 22"><circle cx="11" cy="11" r="10"/><path d="M6.6 11.3l3 3 5.8-6.2"/></svg>';
  const text = document.createElement("span");
  text.className = "text";
  const name = document.createElement("b");
  name.textContent = item.name;
  name.append(strike(item.id));
  text.append(name);
  const qty = quantityText(item);
  if (qty) {
    const small = document.createElement("small");
    small.textContent = qty;
    text.append(small);
  }
  button.append(box, text);
  button.addEventListener("click", () => toggle(item));
  return button;
}

// A pencil line across the name, a little past it, with its own small
// wobble per item so a list never looks stamped (PenStrikeLine).
function strike(id) {
  const bytes = String(id).replace(/[^0-9a-f]/gi, "").padEnd(8, "8");
  const j = (i) => (parseInt(bytes.slice(i * 2, i * 2 + 2), 16) - 128) / 128;
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("class", "strike");
  svg.setAttribute("viewBox", "0 0 100 8");
  svg.setAttribute("preserveAspectRatio", "none");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS(SVG, "path");
  path.setAttribute("d", `M0 ${4 + j(0) * 1.5} C33 ${1.5 + j(1)} 66 ${6 + j(2)} 100 ${3 + j(3) * 1.5}`);
  path.setAttribute("pathLength", "110");
  svg.append(path);
  return svg;
}

function toggle(item) {
  pending.set(item.id, !isChecked(item));
  render();
  flush();
}

// Sends unconfirmed ticks one at a time, in order, so a quick tick and
// untick can't land on the server the wrong way round. Whatever fails stays
// pending and is retried on the next poll or when the connection is back.
let flushing = false;
async function flush() {
  if (flushing) return;
  flushing = true;
  try {
    while (pending.size) {
      const [itemId, checked] = pending.entries().next().value;
      let result;
      try {
        result = await call({ itemId, checked });
      } catch {
        $("offline").hidden = false;
        return;
      }
      if (!result.expired) {
        const item = list && list.items.find((entry) => entry.id === itemId);
        if (item) item.checked = checked;
      }
      // Re-ticked while the request was out: send the newer value next.
      if (pending.get(itemId) === checked) pending.delete(itemId);
      $("offline").hidden = true;
    }
  } finally {
    flushing = false;
    render();
  }
}

async function refresh() {
  try {
    const result = await call({});
    if (result.expired) {
      list = null;
      show("expired");
      stopPolling();
      return;
    }
    list = result;
    $("offline").hidden = pending.size === 0;
    show("list");
    render();
    if (pending.size && !flushing) flush();
  } catch {
    if (!list) show("loading");
    $("offline").hidden = false;
  }
}

function startPolling() {
  stopPolling();
  pollTimer = setInterval(() => { if (!document.hidden) refresh(); }, POLL_MS);
}

function stopPolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
}

document.querySelectorAll("[data-lang]").forEach((el) => el.addEventListener("click", () => setLanguage(el.dataset.lang)));
document.addEventListener("visibilitychange", () => { if (!document.hidden) refresh(); });
window.addEventListener("online", () => { refresh(); });

setLanguage(language);
if (!token) {
  show("expired");
} else {
  show("loading");
  refresh();
  startPolling();
}
