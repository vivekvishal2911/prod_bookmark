"use strict";

(function () {
  const COLORS = ["#5b8cff", "#8a5bff", "#ff5b6e", "#28c391", "#ffb02e", "#ff7aa8", "#38bdf8", "#a3e635"];
  const THEME_KEY = "bookmarkBoard.theme";

  const board = document.getElementById("board");
  const todoCol = document.getElementById("todoCol");
  const searchInput = document.getElementById("search");
  const footer = document.getElementById("footer");
  const TODO_OPEN_KEY = "bookmarkBoard.todoCompletedOpen";

  let state = { columns: [], todos: [] };
  let saving = false; // guard so our own writes don't trigger a redundant re-render
  let focusTodoAdd = false; // refocus the add box after re-render

  function id() { return Math.random().toString(36).slice(2, 10); }
  function prettyUrl(url) { try { return new URL(url).hostname.replace(/^www\./, ""); } catch (e) { return url; } }
  function ensureShape(b) {
    const out = (b && Array.isArray(b.columns)) ? b : { columns: [] };
    if (!Array.isArray(out.todos)) out.todos = [];
    return out;
  }

  // ---------- security: only allow safe link schemes ----------
  const SAFE_SCHEMES = ["http:", "https:", "mailto:", "ftp:"];
  function safeHref(url) {
    try { const u = new URL(url); if (SAFE_SCHEMES.indexOf(u.protocol) !== -1) return u.href; } catch (e) {}
    return null;
  }

  // ---------- toast + inline confirm (no native alert/confirm) ----------
  const toastHost = document.getElementById("toasts");
  function toast(msg, kind) {
    const el = document.createElement("div");
    el.className = "toast" + (kind ? " " + kind : "");
    el.textContent = msg;
    toastHost.appendChild(el);
    requestAnimationFrame(function () { el.classList.add("show"); });
    setTimeout(function () { el.classList.remove("show"); setTimeout(function () { el.remove(); }, 240); }, 2600);
  }

  const confirmOverlay = document.getElementById("confirmOverlay");
  const confirmMsgEl = document.getElementById("confirmMsg");
  const confirmTitleEl = document.getElementById("confirmTitle");
  const confirmOkBtn = document.getElementById("confirmOk");
  const confirmCancelBtn = document.getElementById("confirmCancel");
  let confirmCb = null;
  function confirmAction(opts, cb) {
    confirmTitleEl.textContent = opts.title || "Are you sure?";
    confirmMsgEl.textContent = opts.message || "";
    confirmOkBtn.textContent = opts.okLabel || "Delete";
    confirmCb = cb;
    confirmOverlay.classList.add("open");
  }
  function closeConfirm() { confirmOverlay.classList.remove("open"); confirmCb = null; }
  confirmOkBtn.addEventListener("click", function () { const cb = confirmCb; closeConfirm(); if (cb) cb(); });
  confirmCancelBtn.addEventListener("click", closeConfirm);
  confirmOverlay.addEventListener("click", function (e) { if (e.target === confirmOverlay) closeConfirm(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && confirmOverlay.classList.contains("open")) closeConfirm(); });

  // ---------- storage ----------
  function loadBoard(cb) {
    chrome.storage.local.get("board", function (r) {
      state = ensureShape(r.board);
      if (cb) cb();
    });
  }
  function save() {
    saving = true;
    chrome.storage.local.set({ board: state }, function () { saving = false; });
    render();
  }

  // ---------- favicons (Chrome's local cache, no network) ----------
  function faviconFor(url, title) {
    try {
      const u = new URL(chrome.runtime.getURL("/_favicon/"));
      u.searchParams.set("pageUrl", url);
      u.searchParams.set("size", "32");
      const img = document.createElement("img");
      img.loading = "lazy"; img.alt = "";
      img.src = u.toString();
      img.onerror = function () { this.replaceWith(document.createTextNode((prettyUrl(url) || title || "?").charAt(0).toUpperCase())); };
      return img;
    } catch (e) { return document.createTextNode((title || "?").charAt(0).toUpperCase()); }
  }

  // ---------- render ----------
  function render() {
    const q = searchInput.value.trim().toLowerCase();
    board.innerHTML = "";
    let shown = 0, totalMatches = 0;

    state.columns.forEach(function (col) {
      const filtered = col.bookmarks.filter(function (b) {
        return !q || b.title.toLowerCase().includes(q) || b.url.toLowerCase().includes(q);
      });
      if (q && filtered.length === 0) return;
      shown++; totalMatches += filtered.length;

      const colEl = document.createElement("section");
      colEl.className = "column";

      const head = document.createElement("div");
      head.className = "col-head";

      const grip = document.createElement("span");
      grip.className = "col-grip";
      grip.textContent = "⠿";
      grip.title = "Drag to reorder category";
      grip.draggable = true;

      const dot = document.createElement("span");
      dot.className = "dot"; dot.style.background = col.color;

      const title = document.createElement("div");
      title.className = "col-title";
      title.contentEditable = "true"; title.spellcheck = false;
      title.textContent = col.title;
      title.addEventListener("blur", function () { col.title = title.textContent.trim() || "Untitled"; save(); });
      title.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); title.blur(); } });

      const count = document.createElement("span");
      count.className = "col-count"; count.textContent = filtered.length;

      // menu (color + delete)
      const menuWrap = document.createElement("div");
      menuWrap.className = "col-menu";
      const menuBtn = document.createElement("button");
      menuBtn.className = "icon-btn"; menuBtn.innerHTML = "⋯";
      const pop = document.createElement("div");
      pop.className = "menu-pop";
      const sw = document.createElement("div");
      sw.className = "swatches";
      COLORS.forEach(function (c) {
        const s = document.createElement("span");
        s.className = "swatch"; s.style.background = c;
        if (c === col.color) s.style.borderColor = "var(--text)";
        s.addEventListener("click", function () { col.color = c; save(); });
        sw.appendChild(s);
      });
      const delCat = document.createElement("button");
      delCat.className = "danger"; delCat.textContent = "🗑 Delete category";
      delCat.addEventListener("click", function () {
        confirmAction({
          title: "Delete category?",
          message: 'This removes "' + col.title + '" and its ' + col.bookmarks.length + " bookmark(s).",
          okLabel: "Delete"
        }, function () {
          state.columns = state.columns.filter(function (c) { return c.id !== col.id; });
          save(); toast("Category deleted");
        });
      });
      pop.appendChild(sw); pop.appendChild(delCat);
      menuBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        document.querySelectorAll(".menu-pop.open").forEach(function (p) { if (p !== pop) p.classList.remove("open"); });
        pop.classList.toggle("open");
      });
      menuWrap.appendChild(menuBtn); menuWrap.appendChild(pop);

      head.appendChild(grip); head.appendChild(dot); head.appendChild(title); head.appendChild(count); head.appendChild(menuWrap);

      // column reorder via the grip handle; drop above/below based on cursor position
      grip.addEventListener("dragstart", function (e) {
        e.dataTransfer.setData("text/col", col.id);
        e.dataTransfer.effectAllowed = "move";
        try { e.dataTransfer.setDragImage(colEl, 20, 20); } catch (err) {}
        colEl.classList.add("dragging");
      });
      grip.addEventListener("dragend", function () { colEl.classList.remove("dragging"); });

      function clearColDrop() { colEl.classList.remove("drop-before", "drop-after"); }
      colEl.addEventListener("dragover", function (e) {
        if (!e.dataTransfer.types.includes("text/col")) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        const rect = colEl.getBoundingClientRect();
        const after = e.clientY > rect.top + rect.height / 2;
        colEl.classList.toggle("drop-after", after);
        colEl.classList.toggle("drop-before", !after);
      });
      colEl.addEventListener("dragleave", function (e) { if (!colEl.contains(e.relatedTarget)) clearColDrop(); });
      colEl.addEventListener("drop", function (e) {
        if (!e.dataTransfer.types.includes("text/col")) return;
        e.preventDefault();
        e.stopPropagation();
        const after = colEl.classList.contains("drop-after");
        clearColDrop();
        const dragged = e.dataTransfer.getData("text/col");
        if (dragged && dragged !== col.id) reorderColumn(dragged, col.id, after);
      });

      const body = document.createElement("div");
      body.className = "col-body";
      filtered.forEach(function (bm) { body.appendChild(renderBookmark(col, bm)); });
      if (col.bookmarks.length === 0) {
        const hint = document.createElement("div"); hint.className = "empty-hint"; hint.textContent = "No bookmarks yet"; body.appendChild(hint);
      }

      // bookmark drop target
      body.addEventListener("dragover", function (e) { if (e.dataTransfer.types.includes("text/bm")) { e.preventDefault(); body.classList.add("drag-over"); } });
      body.addEventListener("dragleave", function (e) { if (!body.contains(e.relatedTarget)) body.classList.remove("drag-over"); });
      body.addEventListener("drop", function (e) {
        if (!e.dataTransfer.types.includes("text/bm")) return;
        e.preventDefault(); body.classList.remove("drag-over");
        const data = JSON.parse(e.dataTransfer.getData("text/bm"));
        moveBookmark(data.colId, data.bmId, col.id, afterElement(body, e.clientY));
      });

      const foot = document.createElement("div");
      foot.style.padding = "2px 6px 8px";
      const addBm = document.createElement("button");
      addBm.className = "add-bm"; addBm.textContent = "＋ Add bookmark";
      addBm.addEventListener("click", function () { openBookmarkModal(col.id, null); });
      foot.appendChild(addBm);

      colEl.appendChild(head); colEl.appendChild(body); colEl.appendChild(foot);
      board.appendChild(colEl);
    });

    // add-category tile (hidden while searching)
    if (!q) {
      const addCol = document.createElement("button");
      addCol.className = "add-col"; addCol.textContent = "＋ Add category";
      addCol.addEventListener("click", addColumn);
      board.appendChild(addCol);
    } else if (shown === 0) {
      showMessage('No bookmarks match "' + searchInput.value.trim() + '"');
    }
    if (state.columns.length === 0 && !q) {
      showMessage("No bookmarks yet. Click the toolbar icon on any page to save it, or add a category.");
    }

    const total = state.columns.reduce(function (n, c) { return n + c.bookmarks.length; }, 0);
    footer.textContent = q
      ? totalMatches + " match" + (totalMatches === 1 ? "" : "es")
      : total + " bookmarks · " + state.columns.length + " categories · click the toolbar icon to save the current page";

    renderTodo();
  }

  // ---------- To-Do column ----------
  function renderTodo() {
    todoCol.innerHTML = "";
    const active = state.todos.filter(function (t) { return !t.done; });
    const done = state.todos.filter(function (t) { return t.done; });

    const colEl = document.createElement("div");
    colEl.className = "column";

    // header
    const head = document.createElement("div");
    head.className = "col-head"; head.style.cursor = "default";
    const dot = document.createElement("span"); dot.className = "dot"; dot.style.background = "#28c391";
    const title = document.createElement("div"); title.className = "col-title"; title.textContent = "To-Do";
    const count = document.createElement("span"); count.className = "col-count"; count.textContent = active.length;
    head.appendChild(dot); head.appendChild(title); head.appendChild(count);

    // add box
    const addWrap = document.createElement("div");
    addWrap.className = "todo-add";
    const addInput = document.createElement("input");
    addInput.type = "text"; addInput.placeholder = "Add a task…";
    addInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        const text = addInput.value.trim();
        if (!text) return;
        state.todos.unshift({ id: id(), text: text, done: false });
        focusTodoAdd = true;
        save();
      }
    });
    addWrap.appendChild(addInput);

    // active list
    const activeList = document.createElement("div");
    activeList.className = "todo-list";
    if (active.length === 0) {
      const e = document.createElement("div"); e.className = "todo-empty"; e.textContent = "Nothing to do 🎉";
      activeList.appendChild(e);
    } else {
      active.forEach(function (t) { activeList.appendChild(renderTodoItem(t)); });
    }

    colEl.appendChild(head); colEl.appendChild(addWrap); colEl.appendChild(activeList);

    // completed (collapsible)
    if (done.length) {
      const sec = document.createElement("div");
      sec.className = "todo-sec";
      const open = getCompletedOpen();
      const toggle = document.createElement("button");
      toggle.className = "todo-sec-toggle" + (open ? " open" : "");
      toggle.innerHTML = '<span class="chev">▸</span> Completed (' + done.length + ")";
      const list = document.createElement("div");
      list.className = "todo-list";
      list.hidden = !open;
      done.forEach(function (t) { list.appendChild(renderTodoItem(t)); });
      toggle.addEventListener("click", function () {
        const nowOpen = list.hidden;
        list.hidden = !nowOpen;
        toggle.classList.toggle("open", nowOpen);
        setCompletedOpen(nowOpen);
      });
      sec.appendChild(toggle); sec.appendChild(list);
      colEl.appendChild(sec);
    }

    todoCol.appendChild(colEl);

    if (focusTodoAdd) { focusTodoAdd = false; addInput.focus(); }
  }

  function renderTodoItem(t) {
    const row = document.createElement("div");
    row.className = "todo-item" + (t.done ? " done" : "");

    const check = document.createElement("input");
    check.type = "checkbox"; check.className = "todo-check"; check.checked = !!t.done;
    check.title = t.done ? "Mark active" : "Mark done";
    check.addEventListener("change", function () {
      t.done = check.checked;
      if (t.done) { setCompletedOpen(true); } // reveal Completed so the move is visible
      save();
    });

    const text = document.createElement("div");
    text.className = "todo-text"; text.textContent = t.text;
    if (!t.done) {
      text.contentEditable = "true"; text.spellcheck = false;
      text.addEventListener("blur", function () {
        const v = text.textContent.trim();
        if (!v) { state.todos = state.todos.filter(function (x) { return x.id !== t.id; }); save(); return; }
        if (v !== t.text) { t.text = v; save(); }
      });
      text.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); text.blur(); } });
    }

    const del = document.createElement("button");
    del.className = "todo-del"; del.title = "Delete task"; del.textContent = "✕";
    del.addEventListener("click", function () {
      state.todos = state.todos.filter(function (x) { return x.id !== t.id; });
      save();
    });

    row.appendChild(check); row.appendChild(text); row.appendChild(del);
    return row;
  }

  function getCompletedOpen() { try { return localStorage.getItem(TODO_OPEN_KEY) === "1"; } catch (e) { return false; } }
  function setCompletedOpen(v) { try { localStorage.setItem(TODO_OPEN_KEY, v ? "1" : "0"); } catch (e) {} }

  function renderBookmark(col, bm) {
    const a = document.createElement("a");
    a.className = "bookmark"; a.title = bm.title + " — " + bm.url;
    const href = safeHref(bm.url);
    if (href) {
      a.href = href;
    } else {
      a.classList.add("unsafe");
      a.title = "Blocked unsafe link: " + bm.url;
      a.addEventListener("click", function (e) { e.preventDefault(); toast("Blocked an unsafe (non-http) link", "err"); });
    }
    a.draggable = true; a.dataset.bmId = bm.id;
    a.addEventListener("dragstart", function (e) { e.dataTransfer.setData("text/bm", JSON.stringify({ colId: col.id, bmId: bm.id })); e.dataTransfer.effectAllowed = "move"; a.classList.add("dragging"); });
    a.addEventListener("dragend", function () { a.classList.remove("dragging"); });
    a.addEventListener("dblclick", function (e) { e.preventDefault(); openBookmarkModal(col.id, bm.id); });

    const fav = document.createElement("div"); fav.className = "favicon"; fav.appendChild(faviconFor(bm.url, bm.title));
    const txt = document.createElement("div"); txt.className = "bm-text";
    const t = document.createElement("div"); t.className = "bm-title"; t.textContent = bm.title;
    const u = document.createElement("div"); u.className = "bm-url"; u.textContent = prettyUrl(bm.url);
    txt.appendChild(t); txt.appendChild(u);

    const del = document.createElement("button");
    del.className = "bm-del"; del.title = "Remove"; del.textContent = "✕";
    del.addEventListener("click", function (e) {
      e.preventDefault(); e.stopPropagation();
      col.bookmarks = col.bookmarks.filter(function (b) { return b.id !== bm.id; });
      save();
    });

    a.appendChild(fav); a.appendChild(txt); a.appendChild(del);
    return a;
  }

  function showMessage(text) {
    const none = document.createElement("div");
    none.className = "empty-hint"; none.style.gridColumn = "1 / -1"; none.style.padding = "40px";
    none.textContent = text; board.appendChild(none);
  }

  function afterElement(container, y) {
    const els = Array.prototype.slice.call(container.querySelectorAll(".bookmark:not(.dragging)"));
    let closest = { offset: -Infinity, el: null };
    els.forEach(function (el) {
      const box = el.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) closest = { offset: offset, el: el };
    });
    return closest.el;
  }

  function moveBookmark(fromColId, bmId, toColId, beforeEl) {
    const fromCol = state.columns.find(function (c) { return c.id === fromColId; });
    const toCol = state.columns.find(function (c) { return c.id === toColId; });
    if (!fromCol || !toCol) return;
    const idx = fromCol.bookmarks.findIndex(function (b) { return b.id === bmId; });
    if (idx < 0) return;
    const [bm] = fromCol.bookmarks.splice(idx, 1);
    let insertAt = toCol.bookmarks.length;
    if (beforeEl && beforeEl.dataset.bmId) {
      const ti = toCol.bookmarks.findIndex(function (b) { return b.id === beforeEl.dataset.bmId; });
      if (ti >= 0) insertAt = ti;
    }
    toCol.bookmarks.splice(insertAt, 0, bm);
    save();
  }

  function addColumn() {
    state.columns.push({ id: id(), title: "New Category", color: COLORS[state.columns.length % COLORS.length], bookmarks: [] });
    save();
  }

  // move a category to just before/after a target category
  function reorderColumn(draggedId, targetId, after) {
    const from = state.columns.findIndex(function (c) { return c.id === draggedId; });
    if (from < 0) return;
    const [m] = state.columns.splice(from, 1);
    let to = state.columns.findIndex(function (c) { return c.id === targetId; });
    if (to < 0) { state.columns.push(m); save(); return; }
    if (after) to += 1;
    state.columns.splice(to, 0, m);
    save();
  }

  // ---------- add / edit modal ----------
  const overlay = document.getElementById("bmOverlay");
  const bmTitle = document.getElementById("bmTitle");
  const bmUrl = document.getElementById("bmUrl");
  const bmModalTitle = document.getElementById("bmModalTitle");
  let editing = null;

  function openBookmarkModal(colId, bmId) {
    editing = { colId: colId, bmId: bmId };
    if (bmId) {
      const col = state.columns.find(function (c) { return c.id === colId; });
      const bm = col.bookmarks.find(function (b) { return b.id === bmId; });
      bmModalTitle.textContent = "Edit bookmark"; bmTitle.value = bm.title; bmUrl.value = bm.url;
    } else {
      bmModalTitle.textContent = "Add bookmark"; bmTitle.value = ""; bmUrl.value = "";
    }
    overlay.classList.add("open");
    setTimeout(function () { bmTitle.focus(); }, 30);
  }
  function closeModal() { overlay.classList.remove("open"); editing = null; }
  function saveModal() {
    if (!editing) return;
    let url = bmUrl.value.trim(); let title = bmTitle.value.trim();
    if (!url) { bmUrl.focus(); return; }
    if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(url)) url = "https://" + url;
    if (!safeHref(url)) { toast("Enter a valid http(s) URL", "err"); bmUrl.focus(); return; }
    if (!title) title = prettyUrl(url);
    const col = state.columns.find(function (c) { return c.id === editing.colId; });
    if (!col) { closeModal(); return; }
    if (editing.bmId) {
      const bm = col.bookmarks.find(function (b) { return b.id === editing.bmId; });
      bm.title = title; bm.url = url;
    } else {
      col.bookmarks.push({ id: id(), title: title, url: url });
    }
    save(); closeModal();
  }
  document.getElementById("bmSave").addEventListener("click", saveModal);
  document.getElementById("bmCancel").addEventListener("click", closeModal);
  overlay.addEventListener("click", function (e) { if (e.target === overlay) closeModal(); });
  [bmTitle, bmUrl].forEach(function (inp) {
    inp.addEventListener("keydown", function (e) { if (e.key === "Enter") saveModal(); if (e.key === "Escape") closeModal(); });
  });

  // ---------- import bookmarks (Netscape HTML) ----------
  function parseNetscape(html) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const cols = [];
    let colorIdx = 0;
    const nextColor = function () { return COLORS[colorIdx++ % COLORS.length]; };

    function collectLinks(dl) {
      const links = [];
      dl.querySelectorAll(":scope > dt > a[href]").forEach(function (a) {
        const url = a.getAttribute("href");
        if (!url || /^(javascript:|place:|about:|data:)/i.test(url)) return;
        links.push({ id: id(), title: (a.textContent || "").trim() || prettyUrl(url), url: url });
      });
      return links;
    }
    function pushCol(title, bms) {
      if (!bms.length) return;
      const ex = cols.find(function (c) { return c.title === title; });
      if (ex) ex.bookmarks = ex.bookmarks.concat(bms);
      else cols.push({ id: id(), title: title || "Imported", color: nextColor(), bookmarks: bms });
    }
    function walkDl(dl, name) {
      pushCol(name, collectLinks(dl));
      dl.querySelectorAll(":scope > dt > h3").forEach(function (h3) {
        const dt = h3.parentElement;
        let sub = dt.querySelector(":scope > dl");
        if (!sub) { const s = dt.nextElementSibling; if (s && s.tagName === "DL") sub = s; }
        if (sub) walkDl(sub, (h3.textContent || "").trim());
      });
    }
    doc.querySelectorAll("dl").forEach(function (dl) { if (!dl.closest("dt")) walkDl(dl, "Imported"); });
    return cols;
  }

  function mergeColumns(incoming) {
    let added = 0;
    incoming.forEach(function (inc) {
      if (!inc.bookmarks.length) return;
      const existing = state.columns.find(function (c) { return c.title === inc.title; });
      if (existing) {
        const seen = new Set(existing.bookmarks.map(function (b) { return b.url; }));
        inc.bookmarks.forEach(function (b) { if (!seen.has(b.url)) { existing.bookmarks.push(b); added++; } });
      } else {
        state.columns.push(inc);
        added += inc.bookmarks.length;
      }
    });
    return added;
  }

  const htmlInput = document.getElementById("htmlInput");
  document.getElementById("importHtmlBtn").addEventListener("click", function () { htmlInput.click(); });
  htmlInput.addEventListener("change", function () {
    const f = htmlInput.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = function () {
      try {
        const cols = parseNetscape(reader.result);
        const total = cols.reduce(function (n, c) { return n + c.bookmarks.length; }, 0);
        if (!total) { toast("No bookmarks found in that HTML file.", "err"); htmlInput.value = ""; return; }
        const added = mergeColumns(cols);
        save();
        toast("Imported " + added + " bookmark" + (added === 1 ? "" : "s") + " across " + cols.length + " folder" + (cols.length === 1 ? "" : "s") + ".", "ok");
      } catch (e) { toast("Could not parse that bookmarks file.", "err"); }
      htmlInput.value = "";
    };
    reader.readAsText(f);
  });

  // ---------- export bookmarks (Netscape HTML) ----------
  function escHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function buildNetscape() {
    const now = Math.floor(Date.now() / 1000);
    const lines = [
      "<!DOCTYPE NETSCAPE-Bookmark-file-1>",
      '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
      "<TITLE>Bookmarks</TITLE>",
      "<H1>Bookmarks</H1>",
      "<DL><p>"
    ];
    state.columns.forEach(function (col) {
      lines.push('    <DT><H3 ADD_DATE="' + now + '">' + escHtml(col.title) + "</H3>");
      lines.push("    <DL><p>");
      col.bookmarks.forEach(function (bm) {
        lines.push('        <DT><A HREF="' + escHtml(bm.url) + '" ADD_DATE="' + now + '">' + escHtml(bm.title) + "</A>");
      });
      lines.push("    </DL><p>");
    });
    lines.push("</DL><p>");
    return lines.join("\n") + "\n";
  }
  document.getElementById("exportHtmlBtn").addEventListener("click", function () {
    const total = state.columns.reduce(function (n, c) { return n + c.bookmarks.length; }, 0);
    if (!total) { toast("No bookmarks to export yet.", "err"); return; }
    const blob = new Blob([buildNetscape()], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    const d = new Date();
    const stamp = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    a.download = "bookmarks-" + stamp + ".html";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    toast("Exported " + total + " bookmark" + (total === 1 ? "" : "s"), "ok");
  });

  // drop a category onto empty board space (or the Add-category tile) → send it to the end
  function moveColumnToEnd(draggedId) {
    const from = state.columns.findIndex(function (c) { return c.id === draggedId; });
    if (from < 0) return;
    const [m] = state.columns.splice(from, 1);
    state.columns.push(m);
    save();
  }
  board.addEventListener("dragover", function (e) {
    if (!e.dataTransfer.types.includes("text/col")) return;
    e.preventDefault();
    const overCol = e.target.closest && e.target.closest(".column");
    board.classList.toggle("append-hint", !overCol);
  });
  board.addEventListener("dragleave", function (e) { if (!board.contains(e.relatedTarget)) board.classList.remove("append-hint"); });
  board.addEventListener("drop", function (e) {
    if (!e.dataTransfer.types.includes("text/col")) return;
    board.classList.remove("append-hint");
    const overCol = e.target.closest && e.target.closest(".column");
    if (overCol) return; // a specific category handled it
    e.preventDefault();
    const dragged = e.dataTransfer.getData("text/col");
    if (dragged) moveColumnToEnd(dragged);
  });

  // ---------- toolbar ----------
  document.getElementById("addColBtn").addEventListener("click", addColumn);
  searchInput.addEventListener("input", render);
  searchInput.addEventListener("keydown", function (e) { if (e.key === "Escape") { searchInput.value = ""; render(); } });
  document.addEventListener("click", function () { document.querySelectorAll(".menu-pop.open").forEach(function (p) { p.classList.remove("open"); }); });

  // ---------- live refresh when the popup (or another tab) changes storage ----------
  chrome.storage.onChanged.addListener(function (changes, area) {
    if (area === "local" && changes.board && !saving) {
      state = ensureShape(changes.board.newValue);
      render();
    }
  });

  // ---------- theme ----------
  const themeBtn = document.getElementById("themeBtn");
  function applyTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    themeBtn.textContent = t === "light" ? "☀" : "🌙";
    try { localStorage.setItem(THEME_KEY, t); } catch (e) {}
  }
  let savedTheme = "dark";
  try { savedTheme = localStorage.getItem(THEME_KEY) || "dark"; } catch (e) {}
  applyTheme(savedTheme);
  themeBtn.addEventListener("click", function () {
    applyTheme(document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light");
  });

  // ---------- go ----------
  loadBoard(render);
})();
