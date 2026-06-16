/**
 * Dhyey Space — Upload page JavaScript
 * Handles: drag-drop, click-to-upload, paste, XHR upload, progress, results, toasts
 */

// ── Theme management ───────────────────────────────────────
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

// ── Toast notifications ────────────────────────────────────
function showToast(message, type = "info", duration = 4000) {
  const icons = { success: "✅", error: "❌", info: "ℹ️", warning: "⚠️" };
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${icons[type] || "ℹ️"}</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("toast-exit");
    toast.addEventListener("animationend", () => toast.remove());
  }, duration);
}

// ── Copy to clipboard ──────────────────────────────────────
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

// ── Upload logic ───────────────────────────────────────────
const MAX_SIZE_MB = window.DHYEY_MAX_SIZE_MB || 20;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function formatBytes(bytes) {
  if (bytes >= 1_048_576) return (bytes / 1_048_576).toFixed(1) + " MB";
  if (bytes >= 1_024) return (bytes / 1_024).toFixed(1) + " KB";
  return bytes + " B";
}

function validateFile(file) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    showToast(`Unsupported format: ${file.type || "unknown"}. Use JPG, PNG, WEBP or GIF.`, "error");
    return false;
  }
  if (file.size > MAX_SIZE_BYTES) {
    showToast(`File too large (${formatBytes(file.size)}). Max: ${MAX_SIZE_MB} MB.`, "error");
    return false;
  }
  if (file.size === 0) {
    showToast("File is empty.", "error");
    return false;
  }
  return true;
}

async function uploadFile(file) {
  if (!validateFile(file)) return;

  const progress = document.getElementById("progress-container");
  const progressFill = document.getElementById("progress-fill");
  const progressText = document.getElementById("progress-text");
  const resultPanel = document.getElementById("result-panel");
  const uploadBtn = document.getElementById("upload-btn");

  // Show progress, hide old results
  progress.classList.add("visible");
  resultPanel.classList.remove("visible");
  progressFill.classList.add("indeterminate");
  progressText.textContent = "Uploading…";
  if (uploadBtn) uploadBtn.disabled = true;

  const formData = new FormData();
  formData.append("file", file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 100);
        progressFill.classList.remove("indeterminate");
        progressFill.style.width = pct + "%";
        progressText.textContent = `Uploading… ${pct}%`;
      }
    });

    xhr.addEventListener("load", () => {
      if (uploadBtn) uploadBtn.disabled = false;
      progressFill.classList.remove("indeterminate");
      progressFill.style.width = "100%";

      if (xhr.status === 200) {
        try {
          const data = JSON.parse(xhr.responseText);
          if (data.success) {
            progressText.textContent = "Upload complete!";
            showResultPanel(data, file);
            showToast("Image uploaded successfully!", "success");
            resolve(data);
          } else {
            throw new Error(data.detail || "Upload failed.");
          }
        } catch (err) {
          showToast(err.message, "error");
          progress.classList.remove("visible");
          reject(err);
        }
      } else {
        let detail = "Upload failed.";
        try {
          detail = JSON.parse(xhr.responseText).detail || detail;
        } catch {}
        showToast(detail, "error");
        progress.classList.remove("visible");
        reject(new Error(detail));
      }
    });

    xhr.addEventListener("error", () => {
      if (uploadBtn) uploadBtn.disabled = false;
      showToast("Network error. Please try again.", "error");
      progress.classList.remove("visible");
      reject(new Error("Network error"));
    });

    xhr.open("POST", "/upload");
    xhr.send(formData);
  });
}

function showResultPanel(data, file) {
  const resultPanel = document.getElementById("result-panel");
  const previewImg = document.getElementById("result-preview");
  const pageUrlInput = document.getElementById("page-url-input");
  const directUrlInput = document.getElementById("direct-url-input");
  const viewPageBtn = document.getElementById("view-page-btn");

  // Local preview
  const objectURL = URL.createObjectURL(file);
  previewImg.src = objectURL;
  previewImg.onload = () => URL.revokeObjectURL(objectURL);

  pageUrlInput.value = data.page_url;
  directUrlInput.value = data.direct_url;
  if (viewPageBtn) viewPageBtn.href = data.page_url;

  resultPanel.classList.add("visible");
  resultPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

// ── Drag & Drop ─────────────────────────────────────────────
function initDragDrop() {
  const zone = document.getElementById("upload-zone");
  if (!zone) return;

  ["dragenter", "dragover"].forEach((ev) => {
    zone.addEventListener(ev, (e) => {
      e.preventDefault();
      e.stopPropagation();
      zone.classList.add("drag-over");
    });
  });

  ["dragleave", "dragend"].forEach((ev) => {
    zone.addEventListener(ev, (e) => {
      if (!zone.contains(e.relatedTarget)) zone.classList.remove("drag-over");
    });
  });

  zone.addEventListener("drop", (e) => {
    e.preventDefault();
    e.stopPropagation();
    zone.classList.remove("drag-over");
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  });

  // Click to open file picker
  zone.addEventListener("click", (e) => {
    if (e.target.closest(".btn")) return; // don't re-trigger on buttons
    document.getElementById("file-input").click();
  });
}

// ── Paste support ────────────────────────────────────────────
function initPaste() {
  document.addEventListener("paste", (e) => {
    const items = Array.from(e.clipboardData?.items || []);
    const imageItem = items.find((i) => i.type.startsWith("image/"));
    if (imageItem) {
      const file = imageItem.getAsFile();
      if (file) {
        showToast("Image pasted — uploading…", "info", 2000);
        uploadFile(file);
      }
    }
  });
}

// ── File input change ────────────────────────────────────────
function initFileInput() {
  const input = document.getElementById("file-input");
  if (!input) return;
  input.addEventListener("change", () => {
    if (input.files[0]) uploadFile(input.files[0]);
    input.value = ""; // reset so same file can be re-selected
  });
}

// ── Copy buttons in result panel ────────────────────────────
function initCopyButtons() {
  document.querySelectorAll("[data-copy-from]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const sourceId = btn.getAttribute("data-copy-from");
      const source = document.getElementById(sourceId);
      if (source) copyText(source.value || source.textContent.trim(), btn);
    });
  });
}

// ── Init ─────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initDragDrop();
  initPaste();
  initFileInput();
  initCopyButtons();

  const themeBtn = document.getElementById("theme-toggle");
  if (themeBtn) {
    themeBtn.addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-theme") || "dark";
      applyTheme(current === "dark" ? "light" : "dark");
    });
  }
});
