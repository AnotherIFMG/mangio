// The shopping list behind a share link: /list/<token>.
// Reads and ticks through the `shared-list` edge function; the token is the
// only key. Polls while the tab is visible so ticks from the owner's phone
// show up here too.

const ENDPOINT = "https://slhbazaxkfgjozcfhifu.supabase.co/functions/v1/shared-list";
const POLL_MS = 3000;
const ZONES = [
  ["produce", "Fruit & veg", "Frutta e verdura"],
  ["meat_fish", "Meat & fish", "Carne e pesce"],
  ["dairy", "Dairy", "Latticini"],
  ["eggs", "Eggs", "Uova"],
  ["bakery", "Bakery", "Panetteria"],
  ["pantry", "Pantry", "Dispensa"],
  ["sauces", "Sauces & spices", "Salse e spezie"],
  ["household", "Household", "Casa"],
  ["other", "Other", "Altro"],
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

function render() {
  if (!list) return;
  const lang = language === "it" ? 2 : 1;
  const titles = TITLES[list.title];
  $("title").textContent = titles ? titles[lang - 1] : list.title;

  const total = list.items.length;
  const done = list.items.filter(isChecked).length;
  $("progress-text").textContent = language === "it" ? `${done} di ${total} comprati` : `${done} of ${total} bought`;
  $("bar").style.width = total ? `${(done / total) * 100}%` : "0";
  $("empty").hidden = total > 0;

  const zones = $("zones");
  zones.replaceChildren();
  for (const [key, ...labels] of ZONES) {
    const items = list.items.filter((item) => (ZONES.some(([k]) => k === item.storeZone) ? item.storeZone : "other") === key);
    if (!items.length) continue;
    const section = document.createElement("section");
    section.className = "zone";
    const heading = document.createElement("h2");
    heading.textContent = labels[lang - 1];
    section.append(heading);
    for (const item of items) section.append(row(item));
    zones.append(section);
  }
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
  const text = document.createElement("span");
  text.className = "text";
  const name = document.createElement("b");
  name.textContent = item.name;
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
