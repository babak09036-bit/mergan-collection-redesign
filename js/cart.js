/* ==========================================================================
   Mergan Collection — cart & favourites (local demo state, persisted in localStorage)
   No order is placed and no payment is processed.
   ========================================================================== */
(function () {
  "use strict";
  const { $, util, toast } = window.Mergan;
  const CART_KEY = "mergan:cart";
  const FAV_KEY = "mergan:favs";

  let products = new Map();
  let cart = util.store.get(CART_KEY, []);     // [{ id, size, qty }]
  let favs = new Set(util.store.get(FAV_KEY, [])); // product ids

  const keyOf = (id, size) => id + "|" + (size || "");
  const save = () => util.store.set(CART_KEY, cart);
  const saveFavs = () => util.store.set(FAV_KEY, Array.from(favs));

  function sanitize() {
    cart = cart.filter((l) => products.has(l.id) && l.qty > 0 && products.get(l.id).price);
    favs = new Set(Array.from(favs).filter((id) => products.has(id)));
  }

  /* ---------- Cart operations ---------- */
  function add(id, size, qty = 1) {
    const p = products.get(id);
    if (!p || !p.price) return;
    const line = cart.find((l) => keyOf(l.id, l.size) === keyOf(id, size));
    if (line) line.qty = Math.min(line.qty + qty, 10);
    else cart.push({ id, size: size || "", qty });
    save();
    render();
    bump();
    toast(
      '<svg class="icon icon--sm" aria-hidden="true"><use href="#i-check"/></svg>' +
      util.esc(p.name) + " به سبد اضافه شد. " +
      '<button type="button" data-open="cart-drawer">مشاهده سبد</button>'
    );
  }

  function setQty(key, qty) {
    const line = cart.find((l) => keyOf(l.id, l.size) === key);
    if (!line) return;
    line.qty = Math.max(1, Math.min(qty, 10));
    save();
    render();
  }

  function remove(key) {
    cart = cart.filter((l) => keyOf(l.id, l.size) !== key);
    save();
    render();
    const list = $("#cart-list");
    const next = list.querySelector(".cart-item__remove") || $("#cart-drawer [data-close]");
    if (next) next.focus();
  }

  const count = () => cart.reduce((s, l) => s + l.qty, 0);
  const subtotal = () => cart.reduce((s, l) => s + products.get(l.id).price * l.qty, 0);

  function bump() {
    const dot = $("[data-cart-count]");
    dot.classList.remove("is-bump");
    void dot.offsetWidth;
    dot.classList.add("is-bump");
  }

  /* ---------- Favourites ---------- */
  function toggleFav(id, btn) {
    const on = !favs.has(id);
    on ? favs.add(id) : favs.delete(id);
    saveFavs();
    syncFavButtons();
    renderFavs();
    if (btn) {
      btn.classList.remove("is-pop");
      void btn.offsetWidth;
      btn.classList.add("is-pop");
    }
    const p = products.get(id);
    toast(on ? util.esc(p.name) + " به علاقه‌مندی‌ها اضافه شد." : "از علاقه‌مندی‌ها حذف شد.", 2000);
  }

  function syncFavButtons() {
    document.querySelectorAll("[data-fav]").forEach((b) => {
      const on = favs.has(Number(b.dataset.fav));
      b.setAttribute("aria-pressed", String(on));
      b.setAttribute("aria-label", (on ? "حذف از علاقه‌مندی‌ها: " : "افزودن به علاقه‌مندی‌ها: ") + b.dataset.name);
    });
    document.querySelectorAll("[data-fav-count]").forEach((n) => { n.textContent = util.faNum(favs.size); });
  }

  /* ---------- Rendering ---------- */
  function lineHTML(l) {
    const p = products.get(l.id);
    const key = keyOf(l.id, l.size);
    return `
      <li class="cart-item" data-key="${util.esc(key)}">
        <img src="${p.images[0]}" width="76" height="95" alt="" loading="lazy">
        <div>
          <p class="cart-item__name"><a href="${util.esc(p.url)}" target="_blank" rel="noopener">${util.esc(p.name)}</a></p>
          ${l.size ? `<p class="cart-item__meta">سایز: ${util.esc(l.size)}</p>` : ""}
          <p class="cart-item__price">${util.price(p.price * l.qty)}</p>
          <div class="qty" role="group" aria-label="تعداد ${util.esc(p.name)}">
            <button type="button" data-qty="+1" aria-label="افزایش تعداد"><svg class="icon" aria-hidden="true"><use href="#i-plus"/></svg></button>
            <output aria-live="polite">${util.faNum(l.qty)}</output>
            <button type="button" data-qty="-1" aria-label="کاهش تعداد" ${l.qty <= 1 ? "disabled" : ""}><svg class="icon" aria-hidden="true"><use href="#i-minus"/></svg></button>
          </div>
        </div>
        <button class="icon-btn cart-item__remove" type="button" data-remove aria-label="حذف ${util.esc(p.name)} از سبد"><svg class="icon icon--sm" aria-hidden="true"><use href="#i-trash"/></svg></button>
      </li>`;
  }

  function render() {
    const n = count();
    const dot = $("[data-cart-count]");
    dot.textContent = util.faNum(n);
    dot.hidden = n === 0;
    $("[data-cart-count-pill]").textContent = util.faNum(n);
    document.querySelectorAll('[data-open="cart-drawer"].icon-btn').forEach((b) => {
      b.setAttribute("aria-label", n ? `سبد خرید، ${util.faNum(n)} کالا` : "سبد خرید");
    });
    $("#cart-list").innerHTML = cart.map(lineHTML).join("");
    $("#cart-empty").hidden = cart.length > 0;
    $("#cart-foot").hidden = cart.length === 0;
    $("#cart-subtotal").textContent = util.price(subtotal());
  }

  function renderFavs() {
    const items = Array.from(favs).map((id) => products.get(id));
    $("#fav-list").innerHTML = items.map((p) => `
      <li class="cart-item">
        <img src="${p.images[0]}" width="76" height="95" alt="" loading="lazy">
        <div>
          <p class="cart-item__name">${util.esc(p.name)}</p>
          ${p.price ? `<p class="cart-item__price">${util.price(p.price)}</p>` : ""}
          <button class="link-arrow" type="button" data-qv="${p.id}">مشاهده سریع <svg class="icon icon--sm" aria-hidden="true"><use href="#i-arrow"/></svg></button>
        </div>
        <button class="icon-btn cart-item__remove" type="button" data-fav="${p.id}" data-name="${util.esc(p.name)}" aria-pressed="true"><svg class="icon icon--sm" aria-hidden="true"><use href="#i-close"/></svg></button>
      </li>`).join("");
    $("#fav-empty").hidden = items.length > 0;
    syncFavButtons();
  }

  /* ---------- Events (delegated) ---------- */
  $("#cart-list").addEventListener("click", (e) => {
    const item = e.target.closest(".cart-item");
    if (!item) return;
    const key = item.dataset.key;
    const qtyBtn = e.target.closest("[data-qty]");
    if (qtyBtn) {
      const line = cart.find((l) => keyOf(l.id, l.size) === key);
      setQty(key, line.qty + Number(qtyBtn.dataset.qty));
      const again = document.querySelector(`.cart-item[data-key="${CSS.escape(key)}"] [data-qty="${qtyBtn.dataset.qty}"]`);
      if (again && !again.disabled) again.focus();
      else if (again) document.querySelector(`.cart-item[data-key="${CSS.escape(key)}"] [data-qty="+1"]`).focus();
      return;
    }
    if (e.target.closest("[data-remove]")) remove(key);
  });

  document.addEventListener("click", (e) => {
    const fav = e.target.closest("[data-fav]");
    if (fav) { e.preventDefault(); toggleFav(Number(fav.dataset.fav), fav); }
  });

  /* Keep tabs in sync */
  window.addEventListener("storage", (e) => {
    if (e.key === CART_KEY) { cart = util.store.get(CART_KEY, []); sanitize(); render(); }
    if (e.key === FAV_KEY) { favs = new Set(util.store.get(FAV_KEY, [])); sanitize(); renderFavs(); }
  });

  function init(map) {
    products = map;
    sanitize();
    render();
    renderFavs();
  }

  window.Mergan.cart = { init, add, remove, setQty, count, subtotal, toggleFav, syncFavButtons, isFav: (id) => favs.has(id) };
})();
