// The recipe page /r/<slug>: ingredient ticks, step timers and
// "Save to my Cookbook". The page is complete without this script; it only
// adds the timers and counts the save tap (no personal data, only the link's
// UTM labels).

const ENDPOINT = "https://slhbazaxkfgjozcfhifu.supabase.co/functions/v1/public-recipe";
const page = document.querySelector(".recipe-page");
const slug = page ? page.dataset.slug : "";

// Ticks stay in this browser only, per recipe.
const tickKey = `mangio-recipe-ticks:${slug}`;
function loadTicks() {
  try { return new Set(JSON.parse(localStorage.getItem(tickKey) || "[]")); } catch { return new Set(); }
}
function saveTicks(ticks) {
  try { localStorage.setItem(tickKey, JSON.stringify([...ticks])); } catch {}
}
const ticks = loadTicks();
document.querySelectorAll(".ingredient input").forEach((box) => {
  box.checked = ticks.has(box.id);
  box.addEventListener("change", () => {
    if (box.checked) ticks.add(box.id); else ticks.delete(box.id);
    saveTicks(ticks);
  });
});

// One countdown per step; tapping a running timer stops it.
function format(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
document.querySelectorAll(".timer").forEach((button) => {
  const label = button.querySelector("span");
  const idle = label.textContent;
  let interval = null;
  button.addEventListener("click", () => {
    if (interval) {
      clearInterval(interval);
      interval = null;
      button.classList.remove("running", "done");
      label.textContent = idle;
      return;
    }
    const end = Date.now() + Number(button.dataset.minutes) * 60000;
    button.classList.remove("done");
    button.classList.add("running");
    const tick = () => {
      const left = Math.max(0, Math.round((end - Date.now()) / 1000));
      label.textContent = format(left);
      if (left === 0) {
        clearInterval(interval);
        interval = null;
        button.classList.remove("running");
        button.classList.add("done");
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      }
    };
    tick();
    interval = setInterval(tick, 1000);
  });
});

// "Save to my Cookbook": count the tap, then open the recipe in the app.
// No fallback yet: Safari first asks "Open in Mangio?", and a timer would
// leave the page while the person is still choosing. Without the app the
// browser says it cannot open the link (P1: deferred link, App Store).
const save = document.getElementById("save");
if (save) {
  save.addEventListener("click", (event) => {
    event.preventDefault();
    const params = new URLSearchParams(location.search);
    const utm = {
      source: params.get("utm_source") || undefined,
      medium: params.get("utm_medium") || undefined,
      campaign: params.get("utm_campaign") || undefined,
    };
    try {
      fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, event: "save_tap", utm }),
        keepalive: true,
      }).catch(() => {});
    } catch {}
    location.href = save.getAttribute("href");
  });
}
