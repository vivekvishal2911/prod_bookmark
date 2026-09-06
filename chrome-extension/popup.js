"use strict";

// Popup: capture the current tab's URL, ask for a name/alias + category,
// and save into the board's own storage (chrome.storage.local). No Chrome-bookmark sync.

const NEW_CATEGORY = "__new__";

const els = {
  fav: document.getElementById("fav"),
  url: document.getElementById("url"),
  name: document.getElementById("name"),
  category: document.getElementById("category"),
  newCategory: document.getElementById("newCategory"),
  save: document.getElementById("save"),
  msg: document.getElementById("msg"),
};

let currentUrl = "";

function id() { return Math.random().toString(36).slice(2, 10); }
function prettyUrl(u) { try { return new URL(u).hostname.replace(/^www\./, ""); } catch (e) { return u; } }

function faviconImg(url) {
  try {
    const u = new URL(chrome.runtime.getURL("/_favicon/"));
    u.searchParams.set("pageUrl", url);
    u.searchParams.set("size", "32");
    const img = document.createElement("img");
    img.src = u.toString();
    return img;
  } catch (e) { return document.createTextNode("★"); }
}

function getBoard(cb) {
  chrome.storage.local.get("board", function (r) {
    const b = r.board && Array.isArray(r.board.columns) ? r.board : { columns: [] };
    cb(b);
  });
}

function showMsg(text, kind) {
  els.msg.textContent = text;
  els.msg.className = "msg" + (kind ? " " + kind : "");
}

// ---- init: read active tab + populate categories ----
chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
  const tab = tabs && tabs[0];
  if (!tab || !tab.url || /^(chrome|edge|about|chrome-extension):/i.test(tab.url)) {
    els.url.textContent = "This page can't be bookmarked";
    els.name.disabled = true;
    els.save.disabled = true;
    showMsg("Open a normal web page, then click the icon.", "err");
    return;
  }
  currentUrl = tab.url;
  els.url.textContent = tab.url;
  els.fav.appendChild(faviconImg(tab.url));
  els.name.value = (tab.title || prettyUrl(tab.url)).trim();
  els.name.select();
});

getBoard(function (board) {
  const opts = [];
  board.columns.forEach(function (c) {
    opts.push('<option value="' + encodeURIComponent(c.title) + '">' + escapeHtml(c.title) + "</option>");
  });
  opts.push('<option value="' + NEW_CATEGORY + '">＋ New category…</option>');
  els.category.innerHTML = opts.join("");
  // if no categories yet, jump straight to "new category" mode
  if (board.columns.length === 0) {
    els.category.value = NEW_CATEGORY;
    toggleNewCategory();
    els.newCategory.value = "Bookmarks";
  }
});

function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function toggleNewCategory() {
  els.newCategory.style.display = els.category.value === NEW_CATEGORY ? "block" : "none";
}
els.category.addEventListener("change", function () {
  toggleNewCategory();
  if (els.category.value === NEW_CATEGORY) els.newCategory.focus();
});

// ---- save ----
function save() {
  if (!currentUrl) return;
  const name = els.name.value.trim() || prettyUrl(currentUrl);

  let categoryTitle;
  if (els.category.value === NEW_CATEGORY) {
    categoryTitle = els.newCategory.value.trim();
    if (!categoryTitle) { els.newCategory.focus(); showMsg("Enter a category name.", "err"); return; }
  } else {
    categoryTitle = decodeURIComponent(els.category.value);
  }

  const COLORS = ["#5b8cff", "#8a5bff", "#ff5b6e", "#28c391", "#ffb02e", "#ff7aa8", "#38bdf8", "#a3e635"];

  getBoard(function (board) {
    let col = board.columns.find(function (c) { return c.title === categoryTitle; });
    if (!col) {
      col = { id: id(), title: categoryTitle, color: COLORS[board.columns.length % COLORS.length], bookmarks: [] };
      board.columns.push(col);
    }
    col.bookmarks.push({ id: id(), title: name, url: currentUrl });
    chrome.storage.local.set({ board: board }, function () {
      if (chrome.runtime.lastError) { showMsg("Save failed: " + chrome.runtime.lastError.message, "err"); return; }
      showMsg("Saved to “" + categoryTitle + "”", "ok");
      setTimeout(function () { window.close(); }, 650);
    });
  });
}

els.save.addEventListener("click", save);
els.name.addEventListener("keydown", function (e) { if (e.key === "Enter") save(); });
els.newCategory.addEventListener("keydown", function (e) { if (e.key === "Enter") save(); });
