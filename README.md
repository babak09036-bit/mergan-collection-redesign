# Mergan Collection — Landing Page Redesign

A premium, RTL Persian landing page for [mergancollection.com](https://mergancollection.com/), built with plain HTML, CSS and vanilla JavaScript. No frameworks, no build step, no runtime dependencies: open `index.html` in a modern browser, or serve the folder with any static server.

## Structure

```
index.html              Page markup (all 23 sections) + inlined icon sprite
assets/
  images/
    logo/               Original Mergan logo (trimmed, WebP + PNG)
    hero/               Original autumn/winter banner (desktop, 1200px, mobile crop)
    categories/         Original line-art category SVGs (hidden layers stripped: 126 KB → ~5–17 KB)
    products/           Product photos from the store, 720px WebP (2 per product)
    collections/        Curated product photography for collection cards
    banners/            Campaign images + original "Women's Wear" line-art banner
    lifestyle/          Detail shots for style cards, journal and gallery
  icons/icons.svg       Custom thin-line SVG sprite (same symbols are inlined in index.html)
  fonts/                Vazirmatn (Persian) + Cormorant Garamond (English headings), both SIL OFL
css/
  style.css             Tokens, base, header and section layouts
  components.css        Buttons, product cards, drawers, modal, accordion, forms
  responsive.css        1440 / 1200 / 992 / 768 / 576 / 375 breakpoints + reduced motion
js/
  products.js           Local product dataset (49 real products)
  ui.js                 Overlays (focus trap, Esc, return focus), header, menus, accordion, newsletter
  cart.js               Cart + favourites, persisted in localStorage
  search.js             Persian-aware client-side search
  main.js               Product rendering, quick view, discovery tabs, carousel, journal dialog
```

The icon sprite is inlined because browsers block external `<use href="file.svg#id">` references when the page is opened from `file://`.

## Data sources

Everything shown comes from the public store:

- **Products** — names, prices (Toman), categories, sizes, colours, short descriptions and links from the WooCommerce Store API (`/wp-json/wc/store/v1/products`).
- **Best sellers** — the store's own `orderby=popularity` ranking; no sales numbers are shown.
- **New arrivals** — the "جدیدترین محصولات" list on the current homepage.
- **FAQ** — answers copied from the store's About / FAQ page.
- **Contact** — phone, WhatsApp and Instagram links from the current footer and contact page.

Left out on purpose because the site does not publish them: email address, postal address, business hours, Telegram account, a men's category, terms-of-use page. No ratings, reviews, discounts or stock claims were invented.

## Behaviour notes

- **Cart** is a front-end demo: add, quantity, remove and subtotal work and persist in `localStorage`, but no order is placed. The drawer says so and links to the real shop.
- **Newsletter** validates the email and stores it in this browser only; nothing is sent to a server.
- **Admin toolbar** (WordPress-style preview bar) is off. Enable it for development by defining `window.MERGAN_CONFIG = { adminToolbar: true }` before `js/ui.js` loads.
- **Accessibility**: skip link, semantic landmarks, keyboard-operable menus/tabs/accordions, focus-trapped dialogs that restore focus, visible focus rings, `prefers-reduced-motion` support. Olive buttons use a deeper olive (`#5F6B53`) so white text meets WCAG AA; the brand olive `#89977B` is used for icons, lines and accents.

## Updating product data

`js/products.js` was generated from the Store API. To refresh it, re-export the products you want with the same fields (`id, name, price, categories, type, url, images, sizes, colors, details, inStock, sections`) and download the images into `assets/images/products/`.

## Credits

Imagery, logo and product information © Mergan Collection. Fonts: [Vazirmatn](https://github.com/rastikerdar/vazirmatn) and [Cormorant Garamond](https://github.com/CatharsisFonts/Cormorant), both under the SIL Open Font License.
