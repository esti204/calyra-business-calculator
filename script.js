/* ============================================================
   CALYRA — script.js
   Shared utilities for auth pages + dashboard
   ============================================================ */

// ── Theme ──────────────────────────────────────────────────────
function getTheme() {
  return localStorage.getItem('calyra_theme') || 'light';
}
const currencyRates = {
  USD: 1,
  BDT: 110,
  EUR: 0.92,
  INR: 83
};

const currencySymbols = {
  USD: "$",
  BDT: "৳",
  EUR: "€",
  INR: "₹"
};
const currencySelector = document.getElementById("currencySelector");

let currentCurrency = localStorage.getItem("currency") || "USD";

if (currencySelector) {
  currencySelector.value = currentCurrency;

  currencySelector.addEventListener("change", () => {
    currentCurrency = currencySelector.value;
    localStorage.setItem("currency", currentCurrency);
    updateAllValues();
  });
}
function convertCurrency(amount) {
  return amount * currencyRates[currentCurrency];
}

function formatCurrency(amount) {
  return currencySymbols[currentCurrency] + convertCurrency(amount).toFixed(2);
}

function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem('calyra_theme', t);
  const icon = document.getElementById('themeIcon');
  if (icon) {
    icon.innerHTML = t === 'dark'
      ? '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>'
      : '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
  }
}

function toggleTheme() {
  applyTheme(getTheme() === 'dark' ? 'light' : 'dark');
}

// Apply theme immediately
applyTheme(getTheme());

// ── Alerts ─────────────────────────────────────────────────────
function showAlert(alertId, msgId, msg) {
  const el = document.getElementById(alertId);
  const msgEl = document.getElementById(msgId);
  if (el) { msgEl.textContent = msg; el.classList.add('show'); }
}

function hideAlert(alertId) {
  const el = document.getElementById(alertId);
  if (el) el.classList.remove('show');
}

// ── Password Toggle ────────────────────────────────────────────
function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  if (input.type === 'password') {
    input.type = 'text';
    btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
  } else {
    input.type = 'password';
    btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
  }
}

// ── Format Currency ────────────────────────────────────────────
function formatCurrency(val, symbol = '$') {
  if (isNaN(val)) return symbol + '0.00';
  return symbol + Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatPercent(val) {
  if (isNaN(val)) return '0.00%';
  return Number(val).toFixed(2) + '%';
}

function formatNumber(val, dp = 2) {
  if (isNaN(val)) return '0';
  return Number(val).toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });
}
