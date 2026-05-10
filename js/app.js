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

  const SAMPLE = {
    uen: "201812345A",
    amount: "25.00",
    expiry: "",
    refNumber: "INV-2024-001",
    company: "Demo Pte Ltd",
  };

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
  const sampleBtn = $("load-sample");
  const updateBanner = $("update-banner");
  const updateReloadBtn = $("update-reload");

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
    isLoadingFromHistory = true;
    form.requestSubmit();
  }

  // ============================================================
  // Logo preloader (returns a promise so the first submit always has the logo)
  // ============================================================
  let logoImg = null;
  let logoReady = null;

  function preloadLogo() {
    logoReady = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        logoImg = img;
        resolve();
      };
      img.onerror = () => {
        logoImg = null;
        resolve();
      };
      img.src = LOGO_SRC;
    });
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

  // Render a QR code to <canvas> using qrcode-generator (MIT, Kazuhiko Arase).
  // Type 0 = auto-pick smallest version; error correction "M" = ~15%, enough
  // to survive the centered logo overlay we draw afterwards.
  function renderQR(canvas, qrString, size) {
    const qr = qrcode(0, "M");
    qr.addData(qrString);
    qr.make();

    const moduleCount = qr.getModuleCount();
    const margin = 4; // quiet zone in modules, EMVCO/PayNow scanners expect >=4
    const cellSize = size / (moduleCount + margin * 2);

    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = QR_BG;
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = QR_COLOR;
    for (let r = 0; r < moduleCount; r++) {
      for (let c = 0; c < moduleCount; c++) {
        if (qr.isDark(r, c)) {
          ctx.fillRect(
            (c + margin) * cellSize,
            (r + margin) * cellSize,
            cellSize,
            cellSize
          );
        }
      }
    }
    drawLogo(canvas, size);
  }

  // ============================================================
  // Form submission
  // ============================================================
  form.addEventListener("submit", async (e) => {
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

    // Wait for logo to finish loading on first submit so the QR is never logo-less.
    await logoReady;

    renderQR(qrCanvas, currentQRString, BASE_SIZE);
    qrCanvas.style.display = "block";

    showSuccess();
    qrOutput.classList.add("visible");
    qrOutput.scrollIntoView({ behavior: "smooth", block: "nearest" });

    if (isLoadingFromHistory) {
      isLoadingFromHistory = false;
    } else {
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
    }
  });

  uenInput.addEventListener("input", () => {
    uenInput.classList.remove("input-error");
  });

  // ============================================================
  // Sample loader (demo helper)
  // ============================================================
  function loadSample() {
    uenInput.value = SAMPLE.uen;
    amountInput.value = SAMPLE.amount;
    expiryInput.value = SAMPLE.expiry;
    refNumberInput.value = SAMPLE.refNumber;
    companyInput.value = SAMPLE.company;
    uenInput.classList.remove("input-error");
    isLoadingFromHistory = true; // don't pollute history with the demo entry
    form.requestSubmit();
  }
  if (sampleBtn) sampleBtn.addEventListener("click", loadSample);

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
      parts.push(company.replace(/[^a-zA-Z0-9一-鿿]/g, "_"));
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
    renderQR(offscreen, currentQRString, size);
    exportCanvas(offscreen);
  });

  // ============================================================
  // Clear history
  // ============================================================
  clearHistoryBtn.addEventListener("click", () => {
    clearHistory();
  });

  // ============================================================
  // Service Worker registration with update prompt
  // ============================================================
  function showUpdateBanner(onAccept) {
    if (!updateBanner) return onAccept();
    updateBanner.hidden = false;
    updateReloadBtn?.addEventListener("click", () => onAccept(), { once: true });
  }

  function registerSW() {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("./sw.js")
      .then((reg) => {
        // A new SW found while the page is already controlled → it's an update.
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              showUpdateBanner(() => {
                newWorker.postMessage({ type: "SKIP_WAITING" });
              });
            }
          });
        });

        // Periodic update probe — once per hour and on tab refocus.
        setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") reg.update().catch(() => {});
        });
      })
      .catch(() => {});

    // After SKIP_WAITING activates the new SW, the browser swaps controllers — reload once.
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  }

  // ============================================================
  // Init
  // ============================================================
  preloadLogo();
  registerSW();
  openDB()
    .then(() => getAllHistory())
    .then(renderHistory)
    .catch(() => {});
})();
