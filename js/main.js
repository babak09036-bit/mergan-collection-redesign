/* ==========================================================================
   Mergan Collection — product sections, quick view, discovery, journal
   ========================================================================== */
(function () {
  "use strict";
  const { $, $$, util, overlay, reducedMotion } = window.Mergan;

  const PRODUCTS = window.MERGAN_PRODUCTS || [];
  const byId = new Map(PRODUCTS.map((p) => [p.id, p]));

  const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "2XL", "XXL"];
  const sortSizes = (sizes) => sizes.slice().sort((a, b) => {
    const ia = SIZE_ORDER.indexOf(a), ib = SIZE_ORDER.indexOf(b);
    if (ia > -1 && ib > -1) return ia - ib;
    if (!isNaN(a) && !isNaN(b)) return a - b;
    return 0;
  });

  const COLLECTIONS = ["کالکشن زمستانه", "کالکشن تابستانه"];
  const categoryOf = (p) => p.categories.find((c) => !COLLECTIONS.includes(c)) || p.categories[0] || "";
  const needsChoice = (p) => p.sizes.length > 1 || p.colors.length > 1;

  const DISCOVER_GROUPS = {
    knit: ["knitwear", "cardigan"],
    bottoms: ["trousers", "skirt"],
    vest: ["vest"],
    shirts: ["blouse", "dress"],
    tops: ["top"],
  };

  /* ---------- Product card ---------- */
  function cardHTML(p, { variant = "card", label = "", rank = 0, eager = false } = {}) {
    const name = util.esc(p.name);
    const url = util.esc(p.url);
    const loading = eager ? "" : 'loading="lazy"';
    const tag = !p.inStock ? '<span class="p-card__label p-card__label--out">ناموجود</span>'
      : label ? `<span class="p-card__label">${util.esc(label)}</span>` : "";
    const price = p.price
      ? `<p class="p-card__price">${p.regularPrice ? `<del>${util.price(p.regularPrice)}</del>` : ""}<span>${util.price(p.price)}</span></p>`
      : "";
    return `
      <article class="p-card p-card--${variant}" data-id="${p.id}">
        <div class="p-card__media">
          <a href="${url}" target="_blank" rel="noopener" tabindex="-1" aria-hidden="true">
            <img class="p-card__main" src="${p.images[0]}" width="720" height="900" ${loading} decoding="async" alt="${name}">
            ${p.images[1] ? `<img class="p-card__alt" src="${p.images[1]}" width="720" height="900" loading="lazy" decoding="async" alt="">` : ""}
          </a>
          ${tag}
          <div class="p-card__tools">
            <button class="p-card__tool" type="button" data-fav="${p.id}" data-name="${name}" aria-pressed="false" aria-label="افزودن به علاقه‌مندی‌ها: ${name}"><svg class="icon" aria-hidden="true"><use href="#i-heart"/></svg></button>
            <button class="p-card__tool p-card__tool--qv" type="button" data-qv="${p.id}" aria-label="مشاهده سریع ${name}"><svg class="icon" aria-hidden="true"><use href="#i-eye"/></svg></button>
          </div>
          ${rank ? `<span class="p-card__rank" lang="en" dir="ltr" aria-hidden="true">${String(rank).padStart(2, "0")}</span>` : ""}
        </div>
        <div class="p-card__body">
          <p class="p-card__cat">${util.esc(categoryOf(p))}</p>
          <h3 class="p-card__name"><a href="${url}" target="_blank" rel="noopener">${name}</a></h3>
          ${price}
          <div class="p-card__actions">
            <button class="btn btn--primary btn--sm" type="button" data-add="${p.id}" ${p.inStock && p.price ? "" : "disabled"} aria-label="افزودن ${name} به سبد خرید">افزودن به سبد</button>
            <a class="btn btn--ghost btn--sm" href="${url}" target="_blank" rel="noopener" aria-label="جزئیات ${name} در فروشگاه مرگان">جزئیات</a>
          </div>
        </div>
      </article>`;
  }

  function renderSections() {
    $$("[data-products]").forEach((list) => {
      const key = list.dataset.products;
      const variant = list.dataset.variant || "card";
      const items = PRODUCTS.filter((p) => p.sections.includes(key));
      list.innerHTML = items.map((p, i) => `<li data-type="${p.type}">${cardHTML(p, {
        variant,
        label: list.dataset.label || (key === "featured" ? "ست پیشنهادی" : ""),
        rank: variant === "ranked" ? i + 1 : 0,
      })}</li>`).join("");
    });
  }

  /* ---------- Featured carousel ---------- */
  function initCarousels() {
    $$("[data-scroll]").forEach((btn) => {
      const track = document.getElementById(btn.dataset.scroll);
      btn.addEventListener("click", () => {
        const card = track.querySelector("li");
        const step = card ? card.getBoundingClientRect().width + 20 : track.clientWidth * 0.8;
        // RTL: moving "next" scrolls toward the left (negative scrollLeft)
        track.scrollBy({ left: btn.dataset.dir === "next" ? -step : step, behavior: reducedMotion.matches ? "auto" : "smooth" });
      });
    });
    $$(".carousel").forEach((track) => {
      const prev = $(`[data-scroll="${track.id}"][data-dir="prev"]`);
      const next = $(`[data-scroll="${track.id}"][data-dir="next"]`);
      const update = () => {
        const x = Math.abs(track.scrollLeft);
        if (prev) prev.disabled = x < 4;
        if (next) next.disabled = x + track.clientWidth >= track.scrollWidth - 4;
      };
      track.addEventListener("scroll", update, { passive: true });
      window.addEventListener("resize", update);
      update();
    });
  }

  /* ---------- Discovery tabs + load more ---------- */
  function initDiscover() {
    const grid = $("#discover-grid");
    const more = $("#discover-more");
    const tabs = $$(".discover .tab");
    let filter = "all";
    let limit = 9;

    const apply = () => {
      const items = $$("li", grid);
      const matching = items.filter((li) => filter === "all" || DISCOVER_GROUPS[filter].includes(li.dataset.type));
      items.forEach((li) => { li.hidden = true; });
      matching.slice(0, limit).forEach((li) => { li.hidden = false; });
      more.hidden = matching.length <= limit;
    };

    const select = (tab, focus) => {
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute("aria-selected", String(on));
        t.tabIndex = on ? 0 : -1;
      });
      if (focus) tab.focus();
      filter = tab.dataset.filter;
      limit = 9;
      grid.setAttribute("aria-label", "محصولات: " + tab.textContent.trim());
      apply();
    };

    tabs.forEach((tab, i) => {
      tab.addEventListener("click", () => select(tab));
      tab.addEventListener("keydown", (e) => {
        // RTL: ArrowLeft moves forward
        const map = { ArrowLeft: i + 1, ArrowRight: i - 1, Home: 0, End: tabs.length - 1 };
        if (!(e.key in map)) return;
        e.preventDefault();
        select(tabs[(map[e.key] + tabs.length) % tabs.length], true);
      });
    });
    more.addEventListener("click", () => {
      const firstNew = $$("li", grid).filter((li) => li.hidden && (filter === "all" || DISCOVER_GROUPS[filter].includes(li.dataset.type)))[0];
      limit += 6;
      apply();
      const target = firstNew && firstNew.querySelector(".p-card__name a");
      if (target) target.focus({ preventScroll: true });
    });
    apply();
  }

  /* ---------- Quick view ---------- */
  function optionGroup(name, legend, values) {
    if (!values.length) return "";
    const single = values.length === 1;
    return `
      <fieldset class="qv__field" style="border:0;padding:0;margin:0">
        <legend>${legend}${single ? "" : ' <span aria-hidden="true">*</span>'}</legend>
        <div class="qv__sizes">
          ${values.map((v, i) => `<label><input type="radio" name="${name}" value="${util.esc(v)}" ${single && i === 0 ? "checked" : ""} ${single ? "" : "required"}><span>${util.esc(v)}</span></label>`).join("")}
        </div>
      </fieldset>`;
  }

  function openQuickView(id, trigger) {
    const p = byId.get(id);
    if (!p) return;
    const name = util.esc(p.name);
    const sizes = sortSizes(p.sizes);
    $("#qv-content").dataset.id = p.id;
    $("#qv-content").innerHTML = `
      <div class="qv__gallery">
        <img class="qv__main" id="qv-main" src="${p.images[0]}" width="720" height="900" alt="${name}">
        ${p.images.length > 1 ? `<div class="qv__thumbs" role="group" aria-label="تصاویر محصول">
          ${p.images.map((src, i) => `<button type="button" data-thumb="${src}" aria-pressed="${i === 0}" aria-label="تصویر ${util.faNum(i + 1)}"><img src="${src}" width="64" height="80" alt=""></button>`).join("")}
        </div>` : ""}
      </div>
      <form class="qv__info" id="qv-form" novalidate>
        <p class="p-card__cat">${util.esc(p.categories.join(" · "))}</p>
        <h2 id="qv-title">${name}</h2>
        ${p.price ? `<p class="qv__price">${util.price(p.price)}</p>` : ""}
        ${p.details.length ? `<div class="qv__details">${p.details.map((d) => `<p>${util.esc(d)}</p>`).join("")}</div>` : ""}
        ${optionGroup("qv-size", "سایز", sizes)}
        ${optionGroup("qv-color", "رنگ", p.colors)}
        <p class="form-msg is-error" id="qv-msg" role="alert"></p>
        <div class="qv__actions">
          <button class="btn btn--primary btn--block" type="submit" ${p.inStock && p.price ? "" : "disabled"}>
            <svg class="icon icon--sm" aria-hidden="true"><use href="#i-bag"/></svg>${p.inStock ? "افزودن به سبد خرید" : "ناموجود"}
          </button>
          <a class="btn btn--ghost btn--block" href="${util.esc(p.url)}" target="_blank" rel="noopener">مشاهده جزئیات کامل در فروشگاه مرگان</a>
          <p class="qv__note">قیمت و موجودی نهایی را در صفحه محصول بررسی کنید؛ اندازه‌های دقیق در توضیحات محصول درج شده است.</p>
        </div>
      </form>`;
    overlay.open("quick-view", trigger);
  }

  $("#qv-content").addEventListener("click", (e) => {
    const thumb = e.target.closest("[data-thumb]");
    if (!thumb) return;
    $("#qv-main").src = thumb.dataset.thumb;
    $$("[data-thumb]", $("#qv-content")).forEach((b) => b.setAttribute("aria-pressed", String(b === thumb)));
  });

  $("#qv-content").addEventListener("submit", (e) => {
    e.preventDefault();
    const form = e.target;
    const id = Number($("#qv-content").dataset.id);
    const missing = Array.from(form.querySelectorAll("fieldset")).find((fs) => fs.querySelector("[required]") && !fs.querySelector("input:checked"));
    if (missing) {
      $("#qv-msg").textContent = "لطفا " + missing.querySelector("legend").firstChild.textContent.trim() + " را انتخاب کنید.";
      missing.querySelector("input").focus();
      return;
    }
    const choice = [form.elements["qv-size"], form.elements["qv-color"]]
      .map((el) => (el && el.value) || "")
      .filter(Boolean).join(" · ");
    window.Mergan.cart.add(id, choice);
    overlay.close();
  });

  /* ---------- Journal articles ---------- */
  const ARTICLES = {
    autumn: {
      eyebrow: "راهنمای استایل",
      title: "راهنمای استایل پاییزی",
      img: "assets/images/lifestyle/journal-autumn-guide.webp",
      alt: "نمای نزدیک از بافت مشبک کرم",
      body: [
        "پاییز فصل لایه‌هاست. صبح خنک است و ظهر گرم، پس لباسی به کار می‌آید که بشود یک تکه‌اش را درآورد یا اضافه کرد.",
        "از رنگ شروع کنید: قهوه‌ای، کرم، زیتونی و طوسی با هم کنار می‌آیند و با جین آبی هم خوب می‌نشینند. یک تیشرت بافت راه‌راه یا یک بافت مشبک سبک، پایه خوبی برای هفته‌های اول پاییز است.",
        "بعد یک تکه لایه‌ای اضافه کنید؛ وست بافت روی شومیز یا کاردیگان روی تیشرت. وقتی هوا سردتر شد، همین ترکیب زیر یک کاپشن هم جواب می‌دهد.",
      ],
      picks: [16967, 16808, 16628],
    },
    warm: {
      eyebrow: "زمستان",
      title: "انتخاب لباس‌های گرم",
      img: "assets/images/lifestyle/journal-warm-pieces.webp",
      alt: "دامن بافت فون زیر نور پنجره",
      body: [
        "لباس گرم لزوما حجیم نیست. جنس پارچه و ترتیب لایه‌ها به اندازه ضخامت اهمیت دارد.",
        "بافت موهر سبک است و گرما را خوب نگه می‌دارد؛ برای روزهایی که پالتو نمی‌پوشید انتخاب مناسبی است. لگ چرم داخل‌کرک هم زیر بافت‌های بلند گرم و مرتب می‌ماند.",
        "برای سرمای جدی‌تر، پافر یا کاپشن پفکی را روی یک لایه بافت نازک بپوشید تا در فضای بسته هم راحت باشید.",
      ],
      picks: [16855, 16274, 16961],
    },
    neutral: {
      eyebrow: "رنگ",
      title: "ترکیب رنگ‌های خنثی در استایل روزمره",
      img: "assets/images/lifestyle/journal-neutral-tones.webp",
      alt: "شومیز لینن بژ برند Zara",
      body: [
        "رنگ‌های خنثی کمد را ساده می‌کنند؛ تقریبا هر تکه با بقیه جور درمی‌آید.",
        "یک قاعده ساده: یک رنگ روشن، یک رنگ تیره و یک بافت متفاوت. مثلا شومیز سفید شیری با جین سرمه‌ای و وست بافت کرم.",
        "برای اینکه ظاهر یکنواخت نشود، با جنس پارچه بازی کنید: لینن کنار بافت، جین کنار کتان. تفاوت جنس‌ها همان تنوعی را می‌سازد که معمولا از رنگ‌های تند انتظار داریم.",
      ],
      picks: [16481, 16484, 16448],
    },
  };

  function openArticle(key, trigger) {
    const a = ARTICLES[key];
    if (!a) return;
    $("#article-content").innerHTML = `
      <figure class="article__media"><img src="${a.img}" width="720" height="900" alt="${util.esc(a.alt)}"></figure>
      <div class="article__body">
        <p class="story__meta">مجله مرگان · ${util.esc(a.eyebrow)}</p>
        <h2 id="article-title">${util.esc(a.title)}</h2>
        ${a.body.map((t) => `<p>${util.esc(t)}</p>`).join("")}
        <h3>انتخاب‌های مرتبط</h3>
        <div class="article__picks">
          ${a.picks.map((id) => byId.get(id)).filter(Boolean).map((p) => `
            <button class="article__pick" type="button" data-qv="${p.id}">
              <img src="${p.images[0]}" width="720" height="900" alt="" loading="lazy">
              <span>${util.esc(p.name)}</span>
            </button>`).join("")}
        </div>
      </div>`;
    overlay.open("article-dialog", trigger);
  }

  /* ---------- Delegated product actions ---------- */
  document.addEventListener("click", (e) => {
    const add = e.target.closest("[data-add]");
    if (add) {
      const p = byId.get(Number(add.dataset.add));
      if (needsChoice(p)) { openQuickView(p.id, add); return; }
      window.Mergan.cart.add(p.id, [p.sizes[0], p.colors[0]].filter(Boolean).join(" · "));
      add.classList.add("is-added");
      add.innerHTML = '<svg class="icon icon--sm" aria-hidden="true"><use href="#i-check"/></svg>اضافه شد';
      setTimeout(() => { add.classList.remove("is-added"); add.textContent = "افزودن به سبد"; }, 1600);
      return;
    }
    const qv = e.target.closest("[data-qv]");
    if (qv) { openQuickView(Number(qv.dataset.qv), qv); return; }
    const art = e.target.closest("[data-article]");
    if (art) openArticle(art.dataset.article, art);
  });

  /* ---------- Boot ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    renderSections();
    initCarousels();
    initDiscover();
    window.Mergan.cart.init(byId);
    window.Mergan.search.build(PRODUCTS);
    window.Mergan.cart.syncFavButtons();
  });
})();
