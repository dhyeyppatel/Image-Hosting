/**
 * Dhyey Space — Image page JavaScript
 * Handles: copy buttons, toast notifications, theme toggle
 */

// ── Theme (shared) ──────────────────────────────────────────
const THEME_KEY = "dhyey_theme";
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(THEME_KEY, theme);
  const btn = document.getElementById("theme-toggle");
  if (btn) btn.textContent = theme === "dark" ? "☀️" : "🌙";
}
function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const preferred = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  applyTheme(saved || preferred);
}

// ── Toast (shared) ──────────────────────────────────────────
function showToast(message, type = "info", duration = 3000) {
  const icons = { success: "✅", error: "❌", info: "ℹ️", warning: "⚠️" };
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${icons[type]}</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("toast-exit");
    toast.addEventListener("animationend", () => toast.remove());
  }, duration);
}

// ── Copy ────────────────────────────────────────────────────
async function copyText(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
    if (btn) {
      const original = btn.textContent;
      btn.textContent = "Copied!";
      btn.classList.add("copied");
      setTimeout(() => {
        btn.textContent = original;
        btn.classList.remove("copied");
      }, 2000);
    }
    showToast("Copied to clipboard!", "success", 2000);
  } catch {
    showToast("Copy failed — please copy manually.", "error");
  }
}

// ── Copy buttons ────────────────────────────────────────────
function initCopyButtons() {
  // data-copy-value buttons copy a static value
  document.querySelectorAll("[data-copy-value]").forEach((btn) => {
    btn.addEventListener("click", () => copyText(btn.getAttribute("data-copy-value"), btn));
  });

  // data-copy-from buttons copy from an input/element
  document.querySelectorAll("[data-copy-from]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const el = document.getElementById(btn.getAttribute("data-copy-from"));
      if (el) copyText(el.value || el.textContent.trim(), btn);
    });
  });
}

// ── Init ────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initCopyButtons();

  const themeBtn = document.getElementById("theme-toggle");
  if (themeBtn) {
    themeBtn.addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-theme") || "dark";
      applyTheme(current === "dark" ? "light" : "dark");
    });
  }
});
