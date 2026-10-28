/* ==========================================================================
   Mergan Collection — client-side product search over the local dataset
   ========================================================================== */
(function () {
  "use strict";
  const { $, util } = window.Mergan;

  const panel = $("#search-panel");
  const form = $("#search-form");
  const input = $("#search-input");
  const clearBtn = $("#search-clear");
  const results = $("#search-results");
  const status = $("#search-status");
  const suggest = $("#search-suggest");
  let index = [];

  /* Normalise Persian/Arabic variants so «كت»، «کت» and «کت‌» all match. */
  const DIGITS = { "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4", "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
                   "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4", "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9" };
  function normalize(str) {
    return String(str)
      .toLowerCase()
      .replace(/[يى]/g, "ی")
      .replace(/ك/g, "ک")
      .replace(/ة/g, "ه")
      .replace(/[أإآ]/g, "ا")
      .replace(/ؤ/g, "و")
      .replace(/[ً-ٰٟ]/g, "")      // Arabic diacritics
      .replace(/[‌‍‎‏]/g, " ") // ZWNJ / bidi marks
      .replace(/[۰-۹٠-٩]/g, (d) => DIGITS[d])
      .replace(/ـ/g, "")                           // tatweel
      .replace(/کاردیگان/g, "کاردیگن")
      .replace(/[^\p{L}\p{N}\s&]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function build(products) {
    index = products.map((p) => ({
      p,
      text: normalize([p.name, p.categories.join(" "), p.sizes.join(" ")].join(" ")),
      name: normalize(p.name),
    }));
  }

  function query(q) {
    const terms = normalize(q).split(" ").filter(Boolean);
    if (!terms.length) return [];
    return index
      .filter((row) => terms.every((t) => row.text.includes(t)))
      .map((row) => ({ p: row.p, score: terms.reduce((s, t) => s + (row.name.includes(t) ? 2 : 1) + (row.name.startsWith(t) ? 1 : 0), 0) }))
      .sort((a, b) => b.score - a.score)
      .map((r) => r.p);
  }

  function highlight(name, q) {
    let html = util.esc(name);
    q.trim().split(/\s+/).filter((t) => t.length > 1).forEach((t) => {
      const safe = util.esc(t).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      html = html.replace(new RegExp(safe, "g"), "<mark>$&</mark>");
    });
    return html;
  }

  function render(q) {
    const value = q.trim();
    clearBtn.hidden = !value;
    suggest.hidden = Boolean(value);
    if (!value) { results.innerHTML = ""; status.textContent = ""; return; }

    const hits = query(value);
    const external = "https://mergancollection.com/?s=" + encodeURIComponent(value) + "&post_type=product";
    if (!hits.length) {
      status.textContent = `نتیجه‌ای برای «${value}» در محصولات این صفحه پیدا نشد.`;
      results.innerHTML = `<li class="search-more"><a class="link-arrow" href="${external}">جستجوی «${util.esc(value)}» در فروشگاه مرگان <svg class="icon icon--sm" aria-hidden="true"><use href="#i-arrow"/></svg></a></li>`;
      return;
    }
    status.textContent = `${util.faNum(hits.length)} محصول پیدا شد.`;
    results.innerHTML = hits.slice(0, 8).map((p) => `
      <li>
        <button class="search-hit" type="button" data-qv="${p.id}">
          <img src="${p.images[0]}" width="64" height="80" alt="" loading="lazy">
          <span>
            <span class="search-hit__name">${highlight(p.name, value)}</span>
            <span class="search-hit__price">${p.price ? util.price(p.price) : ""}</span>
          </span>
        </button>
      </li>`).join("") +
      `<li class="search-more"><a class="link-arrow" href="${external}">مشاهده همه نتایج در فروشگاه مرگان <svg class="icon icon--sm" aria-hidden="true"><use href="#i-arrow"/></svg></a></li>`;
  }

  let t;
  input.addEventListener("input", () => {
    clearTimeout(t);
    t = setTimeout(() => render(input.value), 120);
  });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    render(input.value);
    const first = results.querySelector(".search-hit, a");
    if (first) first.focus();
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") {
      const first = results.querySelector(".search-hit");
      if (first) { e.preventDefault(); first.focus(); }
    }
  });
  results.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const items = Array.from(results.querySelectorAll(".search-hit, .search-more a"));
    const i = items.indexOf(document.activeElement);
    if (i < 0) return;
    e.preventDefault();
    if (e.key === "ArrowUp" && i === 0) input.focus();
    else (items[i + (e.key === "ArrowDown" ? 1 : -1)] || items[i]).focus();
  });
  clearBtn.addEventListener("click", () => {
    input.value = "";
    render("");
    input.focus();
  });
  suggest.addEventListener("click", (e) => {
    const chip = e.target.closest("[data-term]");
    if (!chip) return;
    input.value = chip.dataset.term;
    render(input.value);
    input.focus();
  });
  panel.addEventListener("overlay:open", () => input.select());

  window.Mergan.search = { build, query, normalize };
})();
