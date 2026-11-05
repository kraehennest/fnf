# Fet Features (unofficial)

Browser extension that customizes how FetLife pages are displayed — five
feature areas, one toolbar popup.

**Unofficial. Not affiliated with, sponsored by or endorsed by BitLove Inc.
or FetLife.** This extension changes how pages are displayed in *your own
browser* only. It sends no data anywhere, injects no requests and stores
nothing but your settings and your own mute list (locally).

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
- **Alert badges** — hide the red counters on the top-bar icons (inbox,
  message requests, notifications), each individually toggleable.
- **Mute list** — keep a personal list of people and decide how their
  content appears everywhere on the site (comments, message requests,
  notifications, feed entries): **highlighted** (default — marked with a
  red outline so you can judge requests and comments at a glance) or
  **hidden** entirely. Add people one page at a time from a group's
  member pages (a collector bar appears there; "auto-collect while
  paging" harvests each page you open yourself), or import a plain-text
  list. Export, import and clear from the popup. No cap on list size.
  **Limits, honestly:** muting is not blocking — it changes what *you*
  see, not what others see; only FetLife's own block feature does that.
  And the collector only works where member lists are visible — private
  groups don't expose theirs, so their members can't be collected.
- Global on/off switch. Settings sync across your own browser profile via
  `storage.sync`; the mute list lives in `storage.local` on the device
  (use export/import to move it). Endless scrolling keeps working with
  all features active; everything survives Turbo page navigations.

## How it works

- `src/core.js` holds the shared infrastructure: settings (with migration
  from the pre-merge Fet Notification Filter schema), a feature registry,
  a MutationObserver + Turbo hooks, and the Waypoint refresh bridge.
  Settings are initialized to defaults synchronously in `boot()` so early
  callbacks never see null settings.
- Each feature lives in `src/features/<name>.js` + `.css` and registers
  itself via `FF.register({ id, matches, tag, apply })`. Detection is
  content- or structure-based, never layout-class-based; hiding and
  resizing are pure CSS driven by `data-ff-*` attributes, so elements
  added by endless scrolling are covered automatically.
- The mute module tags any comment widget, request row, feed article or
  notification section whose *actor* (first profile link in the unit) is
  on the list; the innermost unit wins, so a muted comment under a
  non-muted person's picture hides only the comment. The collector reads
  ONLY the DOM of member pages the user navigates to — the extension
  never fetches pages itself.
- The badges module needs no DOM tagging at all: it targets FetLife's own
  Stimulus counter hooks (`data-nav--links-target="…Count"`) via `:has()`.
- A page-world script (`src/page.js`, `world: MAIN`) debounces
  `Waypoint.refreshAll()` after display changes so infinite scroll keeps
  working.

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
│   ├── badges.*
│   └── mutelist.*
└── popup.*               toolbar popup (one section per feature)
manifest.chrome.json      Chrome MV3 manifest
manifest.firefox.json     Firefox MV3 manifest (desktop + Android)
build.sh                  produces dist/chrome.zip and dist/firefox.zip
```

Adding a feature: create `src/features/<name>.js` (+ `.css`), register it
with `FF.register`, add both files to both manifests (js before
`src/boot.js`), extend `DEFAULTS`/`normalize` in `core.js` and `popup.js`,
and add a popup section.

## Development install

**Chrome:** run `./build.sh`, then `chrome://extensions` → Developer mode →
"Load unpacked" → select `dist/chrome` (the folder containing
`manifest.json`, not `src/`).

**Firefox:** `about:debugging#/runtime/this-firefox` → "Load Temporary
Add-on" → select the `manifest.json` inside an unpacked `dist/firefox.zip`.
Requires Firefox 140+ (142+ on Android).

## Known limitations

- Classification is based on the 2026 DOM; the notifications page is
  currently English-only upstream, so text patterns are stable in
  practice. Redesigns may require an update — the failure mode is safe
  (unrecognized content stays visible).
- Mute detection uses the unit's first profile link as its actor; on page
  types we have not sampled, this can occasionally hide or keep the wrong
  row. Please report misbehaving elements with their outerHTML.
- Group membership is a coarse signal: member lists include lurkers and
  people who joined to push back. Muting is reversible and local, but
  review your list if someone seems missing or wrongly muted.
- Private groups do not expose member lists; the collector cannot gather
  members there. Individual names can still be added via import.
- The mute list does not sync between devices (deliberately: sync storage
  is capped at ~100 KB; lists can be far larger). Use export/import.
- Request filtering matches only the exact gender tokens "M" and "Man".
- Home-feed thumbnails are 160px sources; "bigger" gets soft beyond ~250px.
- Hiding alert badges removes the red counters, not the counts in hover
  tooltips or the tab title.
- Safari and iOS are not supported.

Misclassified something? Please
[open an issue](https://github.com/kraehennest/fnf/issues) and include the
element's outerHTML if you can.

## Credits

Built by [@kraehe](https://fetlife.com/kraehe). MIT licensed — see
[LICENSE](LICENSE). Privacy policy: [PRIVACY.md](PRIVACY.md).
