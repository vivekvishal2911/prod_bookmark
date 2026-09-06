# Bookmarks Board — Chrome extension

A Papaly-style bookmark dashboard that replaces your **New Tab** page, plus a To-Do
list. Bookmarks live in the extension's **own storage** (`chrome.storage.local`) — it
does **not** read or modify your Chrome bookmarks. Save the page you're on with a
custom name by clicking the toolbar icon.

## Install (Load unpacked)

1. Open `chrome://extensions`.
2. Turn on **Developer mode** (top-right).
3. Click **Load unpacked** and select this `chrome-extension` folder.
4. Open a new tab to see the board. Reload from the same page (↻ on the card) after any
   change to the files.

## Saving bookmarks

- **From the toolbar icon** — on any page, click the extension icon. The popup captures
  the current tab's URL, you give it a **name/alias**, pick or create a **category**,
  and hit Save. It appears on the board instantly.
- **On the board** — each category has a ＋ **Add bookmark** (name + URL); ＋ **Category**
  adds a column. Double-click a bookmark to edit it; ✕ deletes it; the ⋯ menu recolors
  or deletes a category.

## Board features

- **Compact rows** — favicon + name + faint domain on one line.
- **Search** filters across all bookmarks and hides categories with no matches.
- **Drag & drop** — move a bookmark between categories, reorder within one, or drag a
  category header to rearrange columns.
- **Dark / light** theme toggle (remembered).
- **📑 Import** — read a browser's exported bookmarks HTML (Netscape format); each
  folder becomes a category, merged into the board (deduped by URL).
- **⬇ Export** — download all categories/bookmarks as a standard bookmarks HTML file
  (`bookmarks-YYYY-MM-DD.html`), re-importable into Chrome, other browsers, or back here.
- Favicons come from Chrome's local cache via the `_favicon` API — no external requests.

## To-Do column

A pinned column on the right:

- Add tasks in the **Active** section; edit text inline; ✕ to delete.
- Check a task to **strike it through and move it to Completed**.
- **Completed** is a collapsible section (hidden by default), with a count.

## Permissions

- `storage` — save the board (bookmarks + to-dos) locally.
- `activeTab` — read the current tab's URL/title when you click the toolbar icon.
- `favicon` — render site icons from Chrome's local favicon cache.

## Files

- `manifest.json` — MV3 manifest; new-tab override, toolbar action (popup), icons, permissions.
- `newtab.html` / `newtab.js` — the board + To-Do, storage, search, drag, import/export.
- `popup.html` / `popup.js` — the toolbar quick-add popup.
- `icons/` — 16 / 32 / 48 / 128 px extension icons.
- `LICENSE` — MIT (fill in your name).
- `PRIVACY.md` — privacy policy (host it and use the URL in your store listing).

## Packaging for the Chrome Web Store

1. Fill in `LICENSE` (your name) and `PRIVACY.md` (your contact); host the privacy
   policy somewhere public (e.g. a GitHub Gist or Pages) for the listing URL.
2. Zip the **contents** of this folder (with `manifest.json` at the zip root):
   `cd chrome-extension && zip -r ../bookmarks-board.zip . -x '*.DS_Store'`
3. Upload at the [Developer Dashboard](https://chrome.google.com/webstore/devconsole)
   ($5 one-time registration), add screenshots (1280×800), a description, and the
   privacy disclosure (all data stays on-device), then submit.

## Security & privacy notes

- Rendered links are restricted to `http`/`https`/`mailto`/`ftp`; anything else (e.g. a
  `javascript:` URL from an imported file) is shown disabled and cannot execute.
- All data stays in `chrome.storage.local`; nothing is transmitted. Favicons come from
  Chrome's local cache. No analytics, no remote code.

## Notes

- This does not sync with Chrome's own bookmarks by design. Use **Import** to bring
  existing bookmarks in and **Export** to take them out.
- The standalone `../bookmarks.html` is a separate, non-extension version.
