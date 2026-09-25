# Fet Features (unofficial)

Browser extension that customizes how FetLife pages are displayed — four
feature areas, one toolbar popup.

**Unofficial. Not affiliated with, sponsored by or endorsed by BitLove Inc.
or FetLife.** This extension changes how pages are displayed in *your own
browser* only. It sends no data anywhere, injects no requests and stores
nothing but your settings (via browser sync storage).

> **Use at your own risk.** FetLife's Terms of Use contain broad language
> about modifying the service. We consider client-side display filtering
> comparable to ad blockers or dark-mode extensions, but we cannot rule out
> that BitLove sees it differently.

## Features

- **Notifications** — filter the notifications page by type: loves,
  comments on your content, mentions, follows & follow requests, friend &
  relationship requests, groups & discussions and everything else, each
  with its own toggle.
- **Home feed** — choose how "X loved N pictures" thumbnail grids appear:
  hidden, normal or bigger thumbnails.
- **Message requests** — optionally hide requests from senders whose
  self-identified gender label is "M", shown as a count line instead.
  Hidden means hidden, not deleted.
- **Alert badges** — hide the red counters on the top-bar icons (inbox,
  message requests, notifications), each individually toggleable.
- Global on/off switch; settings sync across your own browser profile via
  `storage.sync`. Endless scrolling keeps working with all features
  active; everything survives Turbo page navigations.

## How it works

- `src/core.js` holds the shared infrastructure: settings (with migration
  from the pre-merge Fet Notification Filter schema), a feature registry,
  a MutationObserver + Turbo hooks, and the Waypoint refresh bridge.
  Settings are initialized to defaults synchronously in `boot()` — the
  observer and Turbo listeners can fire before the async storage read
  resolves, and `run()` must never see null settings.
- Each feature lives in `src/features/<name>.js` + `.css` and registers
  itself via `FF.register({ id, matches, tag, apply })`. Detection is
  content- or structure-based, never layout-class-based; hiding and
  resizing are pure CSS driven by `data-ff-*` attributes on `<html>`, so
  elements added by endless scrolling are covered automatically.
- The badges module needs no DOM tagging at all: it targets FetLife's own
  Stimulus counter hooks (`data-nav--links-target="…Count"`) via `:has()`.
- A page-world script (`src/page.js`, `world: MAIN`) debounces
  `Waypoint.refreshAll()` after display changes so infinite scroll keeps
  working, and nudges loading if the filtered page no longer fills the
  viewport.

## Repo layout

```
src/
├── core.js               shared infrastructure (settings, registry, lifecycle)
├── boot.js               starts the core after all modules registered
├── page.js               Waypoint refresh bridge (world: MAIN)
├── features/             one .js + .css per feature module
│   ├── notifications.*
│   ├── home.*
│   ├── requests.*
│   └── badges.*
└── popup.*               toolbar popup (one section per feature)
manifest.chrome.json      Chrome MV3 manifest
manifest.firefox.json     Firefox MV3 manifest (desktop + Android)
build.sh                  produces dist/chrome.zip and dist/firefox.zip
```

Adding a feature: create `src/features/<name>.js` (+ `.css` if it hides or
restyles anything), register it with `FF.register`, add both files to both
manifests (js before `src/boot.js`), extend `DEFAULTS`/`normalize` in
`core.js` and `popup.js`, and add a popup section.

## Development install

**Chrome:** run `./build.sh`, then `chrome://extensions` → Developer mode →
"Load unpacked" → select `dist/chrome` (the folder containing
`manifest.json`, not `src/`).

**Firefox:** `about:debugging#/runtime/this-firefox` → "Load Temporary
Add-on" → select the `manifest.json` inside an unpacked `dist/firefox.zip`.
Requires Firefox 140+ (142+ on Android).

## Known limitations

- Classification is based on the mid-2026 DOM; text patterns assume the
  English UI. Redesigns may require an update — the failure mode is safe
  (unrecognized content stays visible under "everything else").
- Request filtering matches only the exact gender tokens "M" and "Man".
  Rows without a parsable age/gender label stay visible.
- Home-feed thumbnails are 160px CDN sources; "bigger" upscales them and
  gets soft beyond ~250px cells. Full-size fetching would require network
  requests and is deliberately not implemented.
- Hiding alert badges removes the red counters, not the counts inside the
  nav links' hover tooltips or the browser tab title.
- FetLife sometimes creates several notification blocks for the same
  content; with loves hidden these can look like duplicated comments
  (upstream behavior, not a bug).
- Safari and iOS are not supported.

Misclassified something? Please
[open an issue](https://github.com/kraehennest/fnf/issues) and include the
element's outerHTML if you can.

## Credits

Built by [@Annamesoeur](https://fetlife.com/Annamesoeur) and
[@kraehe](https://fetlife.com/kraehe). MIT licensed — see
[LICENSE](LICENSE). Privacy policy: [PRIVACY.md](PRIVACY.md).
