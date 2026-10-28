/* ==========================================================================
   Mergan Collection — UI primitives
   Exposes a single global namespace: window.Mergan
   ========================================================================== */
(function () {
  "use strict";

  /* Development configuration. The WordPress-style admin toolbar is for
     authenticated preview only and stays off for customers. */
  const CONFIG = Object.assign({ adminToolbar: false }, window.MERGAN_CONFIG || {});

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ---------- Utilities ---------- */
  const util = {
    faNum(n) { return Number(n).toLocaleString("fa-IR"); },
    price(n) { return Number(n).toLocaleString("fa-IR") + " تومان"; },
    esc(str) {
      return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    },
    store: {
      get(key, fallback) {
        try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
      },
      set(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage unavailable: keep in-memory state */ }
      },
    },
  };

  /* ---------- Overlays: drawers, search, modals ---------- */
  const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';
  const backdrop = $("#backdrop");
  let current = null;
  let returnFocus = null;
  let closeTimer = null;

  function setTriggers(id, expanded) {
    $$(`[data-open="${id}"][aria-expanded]`).forEach((b) => b.setAttribute("aria-expanded", String(expanded)));
  }

  function openOverlay(id, trigger) {
    const el = document.getElementById(id);
    if (!el) return;
    if (current === el) return;
    const restoreTo = current ? returnFocus : (trigger || document.activeElement);
    if (current) closeOverlay({ restore: false, instant: true });
    clearTimeout(closeTimer);
    returnFocus = restoreTo;
    current = el;
    closeMenus();

    el.hidden = false;
    backdrop.hidden = false;
    document.body.classList.add("is-locked");
    setTriggers(id, true);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      el.classList.add("is-open");
      backdrop.classList.add("is-open");
    }));
    const focusTarget = el.querySelector("[data-autofocus], input[type=search]") || el.querySelector(FOCUSABLE);
    if (focusTarget) setTimeout(() => focusTarget.focus({ preventScroll: true }), 60);
    el.dispatchEvent(new CustomEvent("overlay:open"));
  }

  function closeOverlay({ restore = true, instant = false } = {}) {
    if (!current) return;
    const el = current;
    current = null;
    el.classList.remove("is-open");
    backdrop.classList.remove("is-open");
    setTriggers(el.id, false);
    const finish = () => {
      el.hidden = true;
      if (!current) {
        backdrop.hidden = true;
        document.body.classList.remove("is-locked");
      }
    };
    if (instant || reducedMotion.matches) finish();
    else closeTimer = setTimeout(finish, 420);
    if (restore && returnFocus && document.contains(returnFocus)) returnFocus.focus({ preventScroll: true });
    el.dispatchEvent(new CustomEvent("overlay:close"));
  }

  function trapFocus(e) {
    if (!current || e.key !== "Tab") return;
    const items = $$(FOCUSABLE, current).filter((n) => n.offsetParent !== null || n === document.activeElement);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    else if (!current.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
  }

  /* Navigate to an in-page target after the overlay (and scroll lock) is gone */
  function goTo(hash) {
    const target = hash && hash.length > 1 ? document.querySelector(hash) : null;
    if (!target) return;
    setTimeout(() => {
      target.scrollIntoView({ behavior: reducedMotion.matches ? "auto" : "smooth", block: "start" });
      if (history.pushState) history.pushState(null, "", hash);
    }, 30);
  }

  document.addEventListener("click", (e) => {
    const opener = e.target.closest("[data-open]");
    if (opener) {
      e.preventDefault();
      openOverlay(opener.dataset.open, opener);
      return;
    }
    const closer = e.target.closest("[data-close]");
    if (closer && current && current.contains(closer)) {
      const href = closer.getAttribute("href");
      const goto = closer.dataset.goto || (href && href.startsWith("#") ? href : null);
      if (goto) e.preventDefault();
      closeOverlay({ restore: !goto, instant: Boolean(goto) });
      if (goto) goTo(goto);
    }
  });
  backdrop.addEventListener("click", () => closeOverlay());

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (current) { closeOverlay(); return; }
      closeMenus(true);
    }
    trapFocus(e);
  });

  /* ---------- Dropdown menus (mega menu, account) ---------- */
  const menus = [];

  function registerMenu(trigger, panel, { hover = false } = {}) {
    if (!trigger || !panel) return;
    const wrap = trigger.parentElement;
    const menu = { trigger, panel };
    const set = (open) => {
      panel.hidden = !open;
      trigger.setAttribute("aria-expanded", String(open));
    };
    menu.set = set;
    menus.push(menu);

    trigger.addEventListener("click", () => {
      const open = panel.hidden;
      closeMenus();
      set(open);
    });
    wrap.addEventListener("focusout", (e) => {
      if (!wrap.contains(e.relatedTarget)) set(false);
    });
    if (hover && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      let t;
      wrap.addEventListener("mouseenter", () => { clearTimeout(t); t = setTimeout(() => { closeMenus(); set(true); }, 120); });
      wrap.addEventListener("mouseleave", () => { clearTimeout(t); t = setTimeout(() => set(false), 180); });
    }
    panel.addEventListener("click", (e) => { if (e.target.closest("a, button")) set(false); });
  }

  function closeMenus(focusTrigger = false) {
    menus.forEach((m) => {
      if (!m.panel.hidden) {
        m.set(false);
        if (focusTrigger) m.trigger.focus();
      }
    });
  }
  document.addEventListener("click", (e) => {
    menus.forEach((m) => {
      if (!m.panel.hidden && !m.trigger.parentElement.contains(e.target)) m.set(false);
    });
  });

  /* ---------- Accordion ---------- */
  function togglePanel(btn, open) {
    const panel = document.getElementById(btn.getAttribute("aria-controls"));
    if (!panel) return;
    btn.setAttribute("aria-expanded", String(open));
    if (open) {
      panel.hidden = false;
      requestAnimationFrame(() => panel.classList.add("is-open"));
    } else {
      panel.classList.remove("is-open");
      const done = () => { if (btn.getAttribute("aria-expanded") === "false") panel.hidden = true; };
      reducedMotion.matches ? done() : setTimeout(done, 420);
    }
  }

  function initAccordions() {
    $$("[data-accordion]").forEach((acc) => {
      const buttons = $$(".accordion__btn", acc);
      buttons.forEach((btn, i) => {
        btn.addEventListener("click", () => togglePanel(btn, btn.getAttribute("aria-expanded") !== "true"));
        btn.addEventListener("keydown", (e) => {
          const map = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: buttons.length - 1 };
          if (!(e.key in map)) return;
          e.preventDefault();
          buttons[(map[e.key] + buttons.length) % buttons.length].focus();
        });
      });
    });
  }

  /* ---------- Header, announcement, back to top ---------- */
  function initHeader() {
    const header = $("#site-header");
    const toTop = $("#to-top");
    let ticking = false;
    const update = () => {
      const y = window.scrollY;
      header.classList.toggle("is-scrolled", y > 40);
      const show = y > 900;
      if (show) toTop.hidden = false;
      toTop.classList.toggle("is-show", show);
      ticking = false;
    };
    window.addEventListener("scroll", () => {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    update();
    toTop.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: reducedMotion.matches ? "auto" : "smooth" });
      const brand = $(".brand");
      if (brand) brand.focus({ preventScroll: true });
    });
  }

  function initAnnouncement() {
    const bar = $("#announce");
    if (!bar) return;
    try { if (sessionStorage.getItem("mergan:announce-closed")) { bar.remove(); return; } } catch (e) { /* ignore */ }
    const items = $$(".announce__item", bar);
    let i = 0;
    let paused = false;
    bar.addEventListener("mouseenter", () => { paused = true; });
    bar.addEventListener("mouseleave", () => { paused = false; });
    bar.addEventListener("focusin", () => { paused = true; });
    bar.addEventListener("focusout", () => { paused = false; });
    const timer = setInterval(() => {
      if (paused || document.hidden) return;
      items[i].classList.remove("is-active");
      i = (i + 1) % items.length;
      items[i].classList.add("is-active");
    }, 5000);
    $(".announce__close", bar).addEventListener("click", () => {
      clearInterval(timer);
      bar.remove();
      try { sessionStorage.setItem("mergan:announce-closed", "1"); } catch (e) { /* ignore */ }
      $(".brand").focus();
    });
  }

  /* ---------- Drawer category accordion & footer accordions ---------- */
  function initDisclosure() {
    $$(".drawer-nav__toggle").forEach((btn) => {
      btn.addEventListener("click", () => {
        const open = btn.getAttribute("aria-expanded") !== "true";
        btn.setAttribute("aria-expanded", String(open));
        document.getElementById(btn.getAttribute("aria-controls")).hidden = !open;
      });
    });

    const mobile = window.matchMedia("(max-width: 768px)");
    const toggles = $$(".footer__toggle");
    const sync = () => {
      toggles.forEach((btn) => {
        const list = document.getElementById(btn.getAttribute("aria-controls"));
        if (mobile.matches) {
          btn.disabled = false;
          btn.setAttribute("aria-expanded", "false");
          list.classList.add("is-collapsed");
        } else {
          btn.disabled = true;
          btn.removeAttribute("aria-expanded");
          list.classList.remove("is-collapsed");
        }
      });
    };
    toggles.forEach((btn) => {
      btn.addEventListener("click", () => {
        if (!mobile.matches) return;
        const open = btn.getAttribute("aria-expanded") !== "true";
        btn.setAttribute("aria-expanded", String(open));
        document.getElementById(btn.getAttribute("aria-controls")).classList.toggle("is-collapsed", !open);
      });
    });
    mobile.addEventListener("change", sync);
    sync();
  }

  /* ---------- Newsletter (local demo only — nothing is sent to a server) ---------- */
  function initNewsletter() {
    const form = $("#newsletter-form");
    if (!form) return;
    const input = $("#news-email", form);
    const msg = $("#news-msg", form);
    const show = (text, type) => {
      msg.textContent = text;
      msg.className = "form-msg is-" + type;
    };
    input.addEventListener("input", () => {
      if (input.getAttribute("aria-invalid") === "true" && input.validity.valid) {
        input.removeAttribute("aria-invalid");
        show("", "idle");
      }
    });
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const value = input.value.trim();
      input.value = value;
      if (!value) {
        input.setAttribute("aria-invalid", "true");
        show("لطفا آدرس ایمیل خود را وارد کنید.", "error");
        input.focus();
        return;
      }
      if (!input.validity.valid || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
        input.setAttribute("aria-invalid", "true");
        show("آدرس ایمیل معتبر نیست؛ مثلا name@example.com", "error");
        input.focus();
        return;
      }
      const list = util.store.get("mergan:newsletter", []);
      const exists = list.includes(value.toLowerCase());
      if (!exists) util.store.set("mergan:newsletter", list.concat(value.toLowerCase()));
      input.removeAttribute("aria-invalid");
      form.reset();
      show(exists
        ? "این ایمیل قبلا در این مرورگر ثبت شده است."
        : "ایمیل شما در این مرورگر ذخیره شد. (نسخه نمایشی: اطلاعات به سروری ارسال نمی‌شود.)", "success");
    });
  }

  /* ---------- Toast ---------- */
  const toastEl = $("#toast");
  let toastTimer;
  function toast(html, ms = 2800) {
    toastEl.innerHTML = html;
    toastEl.hidden = false;
    requestAnimationFrame(() => toastEl.classList.add("is-show"));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.classList.remove("is-show");
      setTimeout(() => { toastEl.hidden = true; }, 300);
    }, ms);
  }

  /* ---------- Dev-only admin toolbar ---------- */
  function initAdminToolbar() {
    if (!CONFIG.adminToolbar) return;
    const bar = document.createElement("div");
    bar.className = "admin-bar";
    bar.setAttribute("role", "navigation");
    bar.setAttribute("aria-label", "نوار مدیریت (پیش‌نمایش توسعه)");
    bar.innerHTML =
      '<a href="https://mergancollection.com/wp-admin/">پیشخوان</a>' +
      '<a href="https://mergancollection.com/wp-admin/edit.php?post_type=product">محصولات</a>' +
      '<a href="https://mergancollection.com/wp-admin/edit.php?post_type=shop_order">سفارش‌ها</a>' +
      '<span class="admin-bar__tag">Preview mode</span>';
    document.body.prepend(bar);
  }

  /* ---------- Misc ---------- */
  function initYear() {
    const el = $("[data-year]");
    if (!el) return;
    try {
      el.textContent = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric" }).format(new Date()).replace(/[^\d۰-۹]/g, "");
    } catch (e) { /* keep static year */ }
  }

  function init() {
    initAdminToolbar();
    initAnnouncement();
    initHeader();
    initAccordions();
    initDisclosure();
    initNewsletter();
    initYear();
    registerMenu($(".main-nav__trigger"), $("#mega-shop"), { hover: true });
    registerMenu($("#account-btn"), $("#account-menu"));
  }

  window.Mergan = { $, $$, util, toast, overlay: { open: openOverlay, close: closeOverlay, goTo }, closeMenus, reducedMotion };
  document.addEventListener("DOMContentLoaded", init);
})();
