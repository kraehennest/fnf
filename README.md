# Fet Notification Filter

Browser extension that filters the FetLife notifications page by notification
type — e.g. hide loves, keep comments and mentions.

**Unofficial. Not affiliated with, sponsored by or endorsed by BitLove Inc.
or FetLife.** This extension changes how pages are displayed in *your own
browser* only. It sends no data anywhere, injects no requests, and stores
nothing but your filter settings (via browser sync storage).

> **Use at your own risk.** FetLife's Terms of Use contain broad language
> about modifying the service. We consider client-side display filtering
> comparable to ad blockers or dark-mode extensions, but we cannot rule out
> that BitLove sees it differently. Worst realistic case is account-level
> consequences for users.

## How it works

- FetLife's `mb-3.5` / `mb-1` section classes do **not** map to
  likes vs. comments (comments on your own content and follows also render
  as `mb-3.5`). The content script therefore classifies each notification
  `<section>` by content: embedded comment widgets (`[data-comment-id]`),
  the love-heart SVG path, and text patterns as fallback. Each section gets
  a `data-fnf-type` attribute.
- Hiding is pure CSS driven by attributes on `<html>`, so sections added by
  endless scrolling are covered automatically.
- Hiding sections shrinks the page and stales the trigger points of the
  Waypoint library FetLife uses for endless scrolling. A page-world script
  (`world: MAIN`) debounces `Waypoint.refreshAll()` after each change and
  nudges loading with a synthetic scroll event if the filtered page no
  longer fills the viewport.
- FetLife uses Hotwire Turbo; the script re-runs on `turbo:load` /
  `turbo:render` and via a MutationObserver.

## Repo layout

```
src/                  shared code (content script, page script, popup)
manifest.chrome.json  Chrome MV3 manifest
manifest.firefox.json Firefox MV3 manifest (desktop + Android)
build.sh              produces dist/chrome.zip and dist/firefox.zip
```

## Development install

**Chrome:** `chrome://extensions` → Developer mode → "Load unpacked" → point
at a folder containing `src/` plus `manifest.chrome.json` renamed to
`manifest.json` (or run `./build.sh` and unpack `dist/chrome.zip`).

**Firefox:** `about:debugging#/runtime/this-firefox` → "Load Temporary
Add-on" → select the `manifest.json` inside an unpacked `dist/firefox.zip`.
Requires Firefox ≥ 128 (for `world: MAIN` content scripts).

**Firefox for Android:** supported target; distribution goes through
addons.mozilla.org (AMO). For local testing see Mozilla's
[web-ext run on Android](https://extensionworkshop.com/documentation/develop/developing-extensions-for-firefox-for-android/)
workflow.

## Distribution

- Firefox (desktop + Android): AMO listing (signing is mandatory).
- Chrome: Chrome Web Store (one-time $5 developer fee).
- Safari/iOS: not covered; would require an Xcode-wrapped app. iOS users can
  potentially reuse the core logic as a userscript via the "Userscripts" app.

Store listings must keep the "unofficial" disclaimer and must not use
FetLife trademarks or artwork in icons or promo images.

## Known limitations / open questions

- Classification heuristics are based on the July 2026 DOM and English UI
  strings (heart-SVG and comment-widget checks are language-independent;
  text patterns are not). A FetLife redesign can break selectors.
- The `notifications` fetch endpoint returns data that might allow cleaner
  type detection; not yet reverse-mapped.
