(function () {
  "use strict";

  // ============================================================
  // Config
  // ============================================================
  const QR_COLOR = "#79207a";
  const QR_BG = "#ffffff";
  const BASE_SIZE = 512;
  const LOGO_WIDTH = 100;
  const LOGO_HEIGHT = 60;
  const LOGO_SRC = "./img/paynow_logo.jpg";
  const DB_NAME = "PayNowQRHistory";
  const DB_VERSION = 1;
  const STORE_NAME = "history";

  // ============================================================
  // DOM refs
  // ============================================================
  const $ = (id) => document.getElementById(id);
  const form = $("qr-form");
  const uenInput = $("uen");
  const amountInput = $("amount");
  const expiryInput = $("expiry");
  const refNumberInput = $("refNumber");
  const companyInput = $("company");
  const qrCanvas = $("qr-canvas");
  const qrOutput = $("qr-output");
  const successMsg = $("success-message");
  const errorMsg = $("error-message");
  const sizeSelect = $("qr-size");
  const downloadBtn = $("download-qr");
  const historyList = $("history-list");
  const historySection = $("history-section");
  const clearHistoryBtn = $("clear-history");

  // ============================================================
  // State
  // ============================================================
  let currentQRString = "";
  let db = null;
  let isLoadingFromHistory = false;

  // ============================================================
  // IndexedDB — history persistence
  // ============================================================
  function openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (e) => {
        const database = e.target.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          const store = database.createObjectStore(STORE_NAME, {
            keyPath: "id",
            autoIncrement: true,
          });
          store.createIndex("timestamp", "timestamp", { unique: false });
        }
      };

      request.onsuccess = (e) => {
        db = e.target.result;
        resolve(db);
      };

      request.onerror = (e) => {
        console.warn("IndexedDB unavailable:", e.target.error);
        reject(e.target.error);
      };
    });
  }

  function saveToHistory(entry) {
    if (!db) return;
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).add(entry);
  }

  function getAllHistory() {
    return new Promise((resolve) => {
      if (!db) return resolve([]);
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.index("timestamp").openCursor(null, "prev");
      const results = [];

      request.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };

      request.onerror = () => resolve([]);
    });
  }

  function clearHistory() {
    if (!db) return;
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).clear();
    renderHistory([]);
  }

  // ============================================================
  // History UI
  // ============================================================
  function renderHistory(entries) {
    if (!entries.length) {
      historySection.style.display = "none";
      return;
    }

    historySection.style.display = "block";
    historyList.innerHTML = "";

    entries.forEach((entry) => {
      const item = document.createElement("div");
      item.className = "history-item";

      const date = new Date(entry.timestamp);
      const timeStr =
        date.toLocaleDateString("en-SG", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }) +
        " " +
        date.toLocaleTimeString("en-SG", {
          hour: "2-digit",
          minute: "2-digit",
        });

      const label = entry.company || entry.uen;
      const amountStr = entry.amount ? " · S$" + entry.amount : "";

      item.innerHTML =
        '<div class="history-info">' +
        '<span class="history-label">' + escapeHTML(label) + escapeHTML(amountStr) + "</span>" +
        '<span class="history-time">' + escapeHTML(timeStr) + "</span>" +
        "</div>" +
        '<button type="button" class="history-load" aria-label="Load this QR code">Load</button>';

      item.querySelector(".history-load").addEventListener("click", () => {
        loadHistoryEntry(entry);
      });

      historyList.appendChild(item);
    });
  }

  function escapeHTML(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function loadHistoryEntry(entry) {
    uenInput.value = entry.uen;
    amountInput.value = entry.amount || "";
    expiryInput.value = entry.expiry || "";
    refNumberInput.value = entry.refNumber || "";
    companyInput.value = entry.company || "";
    form.requestSubmit();
  }

  // ============================================================
  // Logo preloader
  // ============================================================
  let logoImg = null;

  function preloadLogo() {
    const img = new Image();
    img.onload = () => {
      logoImg = img;
    };
    img.onerror = () => {
      logoImg = null;
    };
    img.src = LOGO_SRC;
  }

  // ============================================================
  // QR rendering
  // ============================================================
  function drawLogo(canvas, size) {
    if (!logoImg) return;
    const ctx = canvas.getContext("2d");
    const scale = size / BASE_SIZE;
    const w = LOGO_WIDTH * scale;
    const h = LOGO_HEIGHT * scale;
    ctx.drawImage(logoImg, (size - w) / 2, (size - h) / 2, w, h);
  }

  function renderQR(canvas, qrString, size) {
    new QRious({
      element: canvas,
      value: qrString,
      size: size,
      foreground: QR_COLOR,
      background: QR_BG,
    });
    drawLogo(canvas, size);
  }

  // ============================================================
  // Form submission
  // ============================================================
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const uen = uenInput.value.trim();
    if (!uen) {
      showError("Please enter a UEN before generating the QR code.");
      uenInput.classList.add("input-error");
      uenInput.focus();
      return;
    }

    uenInput.classList.remove("input-error");

    const amount = parseFloat(amountInput.value);
    const expiry = expiryInput.value.replace(/-/g, "");
    const refNumber = refNumberInput.value.trim();
    const company = companyInput.value.trim();

    const qrcode = new PaynowQR({
      uen: uen,
      amount: amount,
      editable: true,
      expiry: expiry,
      refNumber: refNumber,
      company: company,
    });

    currentQRString = qrcode.output();
    renderQR(qrCanvas, currentQRString, BASE_SIZE);
    qrCanvas.style.display = "block";

    showSuccess();
    qrOutput.classList.add("visible");
    qrOutput.scrollIntoView({ behavior: "smooth", block: "nearest" });

    // Save to history
    const entry = {
      uen: uen,
      amount: amountInput.value.trim(),
      expiry: expiryInput.value,
      refNumber: refNumber,
      company: company,
      timestamp: Date.now(),
    };
    saveToHistory(entry);
    getAllHistory().then(renderHistory);
  });

  uenInput.addEventListener("input", () => {
    uenInput.classList.remove("input-error");
  });

  // ============================================================
  // Messages
  // ============================================================
  function showError(msg) {
    errorMsg.textContent = msg;
    errorMsg.style.display = "block";
    successMsg.style.display = "none";
    qrOutput.classList.remove("visible");
  }

  function showSuccess() {
    successMsg.style.display = "block";
    errorMsg.style.display = "none";
  }

  // ============================================================
  // Download
  // ============================================================
  function buildFilename() {
    const parts = ["PayNow"];
    const company = companyInput.value.trim();
    const amount = amountInput.value.trim();
    if (company)
      parts.push(company.replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, "_"));
    if (amount) parts.push(amount);
    return parts.join("_") + ".png";
  }

  function exportCanvas(canvas) {
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = buildFilename();
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  }

  downloadBtn.addEventListener("click", () => {
    const size = parseInt(sizeSelect.value);
    const offscreen = document.createElement("canvas");
    offscreen.width = size;
    offscreen.height = size;

    new QRious({
      element: offscreen,
      value: currentQRString,
      size: size,
      foreground: QR_COLOR,
      background: QR_BG,
    });

    drawLogo(offscreen, size);
    exportCanvas(offscreen);
  });

  // ============================================================
  // Clear history
  // ============================================================
  clearHistoryBtn.addEventListener("click", () => {
    clearHistory();
  });

  // ============================================================
  // Init
  // ============================================================
  preloadLogo();
  openDB()
    .then(() => getAllHistory())
    .then(renderHistory)
    .catch(() => {});
})();
