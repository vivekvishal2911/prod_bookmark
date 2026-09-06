# Privacy Policy — Bookmarks Board

_Last updated: 2026-09-01_

Bookmarks Board is a Chrome extension that shows your bookmarks and to-do list on a
new-tab dashboard. Your privacy is simple to explain: **the extension does not collect,
transmit, or share any of your data. Everything stays on your device.**

## What data the extension handles

- **Bookmarks and to-do items you create** — stored locally in your browser via
  `chrome.storage.local`. They never leave your machine.
- **The current tab's URL and title** — read only at the moment you click the toolbar
  icon, so it can pre-fill the "save this page" form. It is used only to create the
  bookmark you choose to save and is not stored or sent anywhere else.
- **Site icons (favicons)** — rendered from Chrome's own local favicon cache via the
  built-in `_favicon` API. No requests are made to external servers for icons.

## What the extension does NOT do

- No analytics, tracking, or telemetry.
- No accounts, and no data sent to us or any third party.
- No remote code execution; all code ships inside the extension package.
- No reading or modifying your Chrome bookmarks, browsing history, or other tabs.

## Permissions and why they are needed

- **storage** — save your board (bookmarks + to-dos) on your device.
- **activeTab** — read the current tab's URL/title when you click the icon to save it.
- **favicon** — display site icons from Chrome's local cache.

## Data retention and control

All data lives in your browser's local extension storage. You can remove it at any time
by deleting bookmarks/categories in the app, or by removing the extension (which clears
its storage). You can also export your bookmarks to an HTML file at any time.

## Contact

Questions about this policy: <your contact email>.
