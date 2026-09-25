/**
 * Fet Features (unofficial) — core
 * Shared infrastructure for all feature modules: settings (with migration
 * from the pre-merge Fet Notification Filter schema), feature registry,
 * DOM lifecycle (MutationObserver + Turbo hooks) and the Waypoint refresh
 * bridge to the page world.
 *
 * Load order matters (see manifest): core.js first, then the feature
 * modules under src/features/ (each calls FF.register), then boot.js.
 * Content scripts of one extension share a single execution context, so
 * this top-level const is visible to the later files.
 */
'use strict';

const FF = {
  api: typeof browser !== 'undefined' ? browser : chrome,

  DEFAULTS: {
    enabled: true,
    notifications: {
      like: true,
      comment: false,
      mention: false,
      follow: false,
      friend: false,
      group: false,
      other: false,
    },
    home: {
      pictures: 'normal', // hidden | normal | large
    },
    requests: {
      hideMale: false,
    },
    badges: {
      inbox: false,
      requests: false,
      notifications: false,
    },
  },

  settings: null,
  features: [],

  register(feature) {
    this.features.push(feature);
  },

  /**
   * Normalize stored settings against defaults. Migrates the legacy
   * Fet Notification Filter schema, where notification toggles lived
   * under `hide` instead of `notifications`.
   */
  normalize(raw) {
    const d = structuredClone(this.DEFAULTS);
    if (!raw) return d;
    const legacyNotifications = raw.hide && !raw.notifications ? raw.hide : null;
    return {
      enabled: raw.enabled !== undefined ? !!raw.enabled : d.enabled,
      notifications: {
        ...d.notifications,
        ...(raw.notifications || legacyNotifications || {}),
      },
      home: { ...d.home, ...(raw.home || {}) },
      requests: { ...d.requests, ...(raw.requests || {}) },
      badges: { ...d.badges, ...(raw.badges || {}) },
    };
  },

  /** Ask the page-world script to refresh Waypoint trigger points (debounced there). */
  requestWaypointRefresh() {
    window.dispatchEvent(new CustomEvent('ff:refresh-waypoints'));
  },

  /** Tag current DOM (per matching feature) and reflect settings as attributes. */
  run() {
    if (!this.settings) return;
    let tagged = 0;
    for (const feature of this.features) {
      if (feature.matches && !feature.matches(location)) continue;
      if (feature.tag) tagged += feature.tag() || 0;
    }
    this.applySettings();
    if (tagged > 0) this.requestWaypointRefresh();
  },

  applySettings() {
    const html = document.documentElement;
    html.toggleAttribute('data-ff-enabled', !!this.settings.enabled);
    for (const feature of this.features) {
      if (feature.apply) feature.apply(html, this.settings);
    }
  },

  async loadSettings() {
    let raw = null;
    try {
      const stored = await this.api.storage.sync.get('settings');
      raw = stored && stored.settings;
    } catch (e) {
      /* storage unavailable -> defaults */
    }
    this.settings = this.normalize(raw);
    this.run();
  },

  boot() {
    // Start with normalized defaults IMMEDIATELY: the observer and Turbo
    // listeners below can fire before the async storage read resolves, and
    // run()/applySettings() must never see null settings (that race threw
    // "Cannot read properties of null (reading 'enabled')" on busy pages).
    this.settings = this.normalize(null);

    this.api.storage.onChanged.addListener((changes, area) => {
      if (area === 'sync' && changes.settings) {
        this.settings = this.normalize(changes.settings.newValue);
        this.applySettings();
        this.requestWaypointRefresh();
      }
    });

    let scheduled = false;
    const observer = new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        this.run();
      });
    });

    const start = () => {
      observer.observe(document.body, { childList: true, subtree: true });
      this.loadSettings();
    };

    document.addEventListener('turbo:load', () => this.run());
    document.addEventListener('turbo:render', () => this.run());

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', start);
    } else {
      start();
    }
  },
};
