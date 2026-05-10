# PayNow QR Generator

A lightweight, client-side web application for generating Singapore PayNow QR codes. No backend, no signup — works entirely in the browser.

**Live demo**: https://yapweijun1996.github.io/PayNow-QR-Generator/

## Features

- **UEN Input** — Enter your Unique Entity Number to identify your business
- **Amount Field** — Specify the payment amount (with S$ prefix)
- **Expiry Date** — Optionally set an expiry date for the QR code
- **Reference Number** — Include a reference number for payment tracking
- **Company Name** — Display your company name on the QR code
- **QR Code Generation** — Generates EMVCO-compliant PayNow QR codes
- **Custom Logo Overlay** — PayNow logo centered on the QR code
- **Try with sample data** — One-click demo so first-time visitors see the result instantly
- **Download as PNG** — Export QR code in multiple sizes (256 / 512 / 1024 px)
- **Custom Filename** — Downloads named as `PayNow_{Company}_{Amount}.png`
- **History (IndexedDB)** — Recent QR codes saved locally for quick re-use
- **Print-Friendly** — Clean print layout showing only the QR code
- **PWA + Offline** — Installable to home screen, works offline once loaded
- **Auto-update prompt** — Banner notifies you when a new version is available
- **iOS Safe-area aware** — Notch / Dynamic Island never overlap content
- **Mobile Responsive** — Optimized for all screen sizes
- **Accessible** — ARIA attributes, focus management, keyboard-friendly
- **SEO-ready** — Open Graph, Twitter Card, JSON-LD `WebApplication` schema, sitemap

## Technologies

- HTML5 / CSS3 (custom properties, flexbox, `env(safe-area-inset-*)`)
- Vanilla JavaScript (ES6, no build step)
- Service Worker (versioned cache + stale-while-revalidate + offline fallback)
- [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) — QR code generation (**MIT**, by Kazuhiko Arase)
- `js/paynow.js` — own EMVCO PayNow TLV builder (**MIT**, ~80 lines, no dependencies)

## Run locally

No build step. Open `index.html` in a modern browser, or serve over HTTP:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

A local HTTP server is recommended over `file://` so the Service Worker registers correctly.

## Deploy — GitHub Pages via GitHub Actions

This repo ships with [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) which deploys the entire repo root to GitHub Pages on every push to `main`.

**One-time setup**:
1. GitHub repo → **Settings** → **Pages** → **Build and deployment** → **Source** → **GitHub Actions**.
2. Push to `main`. The workflow runs automatically. The site URL appears under the workflow run.

**Manual trigger**: Actions tab → *Deploy to GitHub Pages* → *Run workflow*.

## SEO

GitHub Pages serves static HTML over HTTPS with no `noindex` header — Google indexes it normally. This project ships:

- `<title>`, `<meta name="description">`, canonical URL
- Open Graph + Twitter Card for social previews
- JSON-LD `WebApplication` structured data for Google rich results
- [`robots.txt`](robots.txt) + [`sitemap.xml`](sitemap.xml)
- Semantic HTML (`<main>`, `<header>`, `<section>`, `<footer>`)

After deploy, submit the sitemap in [Google Search Console](https://search.google.com/search-console) to speed up indexing.

## PWA notes

- `sw.js` uses versioned cache (`paynow-qr-${VERSION}`). Bump `VERSION` on every release; old caches are deleted on activate.
- Strategy: navigation requests are *network-first* (you always see fresh HTML when online); same-origin GETs are *stale-while-revalidate*.
- A new Service Worker waits in the background and triggers an in-page banner — the user controls the moment of reload, so half-typed forms aren't lost.
- Offline navigations fall back to [`offline.html`](offline.html).

## Usage

1. Enter your **UEN** (required), or click *Try with sample data*.
2. Optionally fill in the amount, expiry date, reference number, and company name.
3. Click **Generate QR Code**.
4. Select your preferred download size and click **Download PNG**.

## License

**[MIT](LICENSE)** — free for any use, including commercial closed-source products. No copyleft, no attribution required at runtime, no royalties.

Every file shipped in this repository is MIT-licensed:

- Project source code (Yap Wei Jun, 2026)
- [`js/paynow.js`](js/paynow.js) — own EMVCO PayNow TLV builder, written from the public SGQR / EMVCO Merchant Presented Mode specification
- [`js/qrcode-generator.js`](js/qrcode-generator.js) — Kazuhiko Arase, 2009

You can fork it, sell it, embed it in a paid SaaS, or ship it inside a closed-source app — just keep the MIT notice somewhere in your distribution (the bundled [LICENSE](LICENSE) file is enough).
