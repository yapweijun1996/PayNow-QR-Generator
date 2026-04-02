# PayNow QR Generator

A lightweight, client-side web application for generating Singapore PayNow QR codes. No backend, no signup — works entirely in the browser.

## Features

- **UEN Input** — Enter your Unique Entity Number to identify your business
- **Amount Field** — Specify the payment amount (with S$ prefix)
- **Expiry Date** — Optionally set an expiry date for the QR code
- **Reference Number** — Include a reference number for payment tracking
- **Company Name** — Display your company name on the QR code
- **QR Code Generation** — Generates EMVCO-compliant PayNow QR codes
- **Custom Logo Overlay** — PayNow logo centered on the QR code
- **Download as PNG** — Export QR code in multiple sizes (256 / 512 / 1024 px)
- **Custom Filename** — Downloads named as `PayNow_{Company}_{Amount}.png`
- **Print-Friendly** — Clean print layout showing only the QR code
- **Mobile Responsive** — Optimized for all screen sizes
- **Accessible** — ARIA attributes, focus management, and keyboard-friendly

## Technologies Used

- HTML5
- CSS3 (CSS custom properties, flexbox)
- Vanilla JavaScript (ES6)
- [QRious](https://github.com/neocotic/qrious) — QR code canvas rendering
- [PayNow QR](https://github.com/nickolanack/PaynowQR) — EMVCO PayNow string generation

## Getting Started

### Prerequisites

- A modern web browser (Chrome, Firefox, Safari, Edge)

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yapweijun1996/PayNow-QR-Generator.git
   ```
2. Open `index.html` in your browser — no build step required.

## Usage

1. Enter your **UEN** (required).
2. Optionally fill in the amount, expiry date, reference number, and company name.
3. Click **Generate QR Code**.
4. Select your preferred download size and click **Download PNG**.

## Demo

**Live:** https://yapweijun1996.github.io/PayNow-QR-Generator/

**CodePen:** https://codepen.io/yapweijun1996/pen/oNKeBLz

<img width="411" alt="PayNow QR Generator" src="https://github.com/user-attachments/assets/6a3d9ec4-85f5-4103-91c8-a8be702d1071">

## License

This project uses the [QRious](https://github.com/neocotic/qrious) library (GPL v3).
