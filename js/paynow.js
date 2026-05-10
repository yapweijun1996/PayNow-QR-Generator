/*!
 * paynow.js — Singapore PayNow EMVCO QR string builder
 *
 * Implements the publicly-documented SGQR / EMVCO Merchant Presented Mode
 * format (TLV + CRC16-CCITT). No third-party dependencies. Authored from
 * scratch — copyright (c) 2026 Yap Wei Jun. Licensed under the MIT License.
 *
 * Usage (drop-in replacement for the older PaynowQR vendor file):
 *
 *   const qr = new PaynowQR({
 *     uen:       "201812345A",      // or mobile: "+6591234567"
 *     amount:    25.00,             // optional, SGD, becomes tag 54
 *     editable:  true,              // amount editable by payer; static/dynamic flag
 *     expiry:    "20241231",        // YYYYMMDD, optional
 *     refNumber: "INV-2024-001",    // optional, tag 62/01
 *     company:   "Demo Pte Ltd",    // optional, tag 59 (max 25 chars)
 *   });
 *   const string = qr.output();     // EMVCO-compliant string for any QR encoder
 */
(function (root) {
  "use strict";

  // CRC16-CCITT-FALSE: poly=0x1021, init=0xFFFF, no reflection, no xorout.
  // Required by the EMVCO spec for tag 63 (the trailing checksum).
  function crc16(str) {
    let crc = 0xffff;
    for (let i = 0; i < str.length; i++) {
      crc ^= str.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) {
        crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
      }
    }
    return crc.toString(16).toUpperCase().padStart(4, "0");
  }

  // Format a TLV (tag-length-value) triple. Length is two ASCII digits of
  // value's character count. Empty values produce an empty string so the
  // caller can compose optional tags without conditional plumbing.
  function tlv(id, value) {
    if (value === undefined || value === null || value === "") return "";
    const v = String(value);
    return id + String(v.length).padStart(2, "0") + v;
  }

  function PaynowQR(opts) {
    this.opts = opts || {};
  }

  PaynowQR.prototype.output = function () {
    const o = this.opts;
    const useUEN = !!o.uen;
    const identifier = o.uen || o.mobile || "";
    if (!identifier) {
      throw new Error("PaynowQR: either uen or mobile is required");
    }

    // Tag 26 — Merchant Account Information (PayNow-specific subtree)
    let merchant = "";
    merchant += tlv("00", "SG.PAYNOW");
    merchant += tlv("01", useUEN ? "2" : "0");           // 2 = UEN, 0 = mobile
    merchant += tlv("02", identifier);
    merchant += tlv("03", o.editable ? "1" : "0");        // editable amount flag
    if (o.expiry) merchant += tlv("04", String(o.expiry).slice(0, 8));

    // Tag 62 — Additional Data Field Template (only sub-tag 01 = reference)
    let additional = "";
    if (o.refNumber) additional += tlv("01", String(o.refNumber));

    let s = "";
    s += tlv("00", "01");                                 // Payload Format Indicator
    s += tlv("01", o.editable ? "12" : "11");             // 11 = static, 12 = dynamic
    s += tlv("26", merchant);
    s += tlv("52", "0000");                               // Merchant Category Code
    s += tlv("53", "702");                                // SGD per ISO 4217
    const amt = Number(o.amount);
    if (Number.isFinite(amt) && amt > 0) {
      s += tlv("54", amt.toFixed(2));
    }
    s += tlv("58", "SG");
    if (o.company) s += tlv("59", String(o.company).slice(0, 25));
    s += tlv("60", "Singapore");
    if (additional) s += tlv("62", additional);

    // CRC is computed across all preceding bytes plus the literal "6304"
    // (tag id + length of the CRC value itself), per the EMVCO spec.
    s += "6304";
    s += crc16(s);
    return s;
  };

  root.PaynowQR = PaynowQR;
})(typeof window !== "undefined" ? window : globalThis);
