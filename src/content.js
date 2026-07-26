/**
 * Notification Filter for FetLife (unofficial)
 * Content script: classifies notification <section> elements and applies
 * user-configured visibility rules.
 *
 * Classification is content-based, NOT class-based: FetLife's mb-3.5 / mb-1
 * Tailwind classes distinguish "detail body" vs "single row" notifications,
 * not likes vs comments. Comments on own content and follows also render
 * as mb-3.5.
 */
(() => {
  'use strict';

  const API = typeof browser !== 'undefined' ? browser : chrome;

  /** Notification types. Keys are stored in settings and used in data attributes. */
  const TYPES = ['like', 'comment', 'mention', 'follow', 'friend', 'group', 'other'];

  const DEFAULT_SETTINGS = {
    enabled: true,
    hide: {
      like: true,
      comment: false,
      mention: false,
      follow: false,
      friend: false,
      group: false,
      other: false,
    },
  };

  let settings = structuredClone(DEFAULT_SETTINGS);

  /** Heart/love SVG path prefix used by FetLife for loves (language-independent). */
  const HEART_PATH_PREFIX = 'M4.634 1';

  /**
   * Classify a notification <section>.
   * Order matters: comment detection must precede like detection, because
   * comment bodies contain love icons/counts of their own.
   */
  function classify(section) {
    // Embedded comment widget (comments on own pictures/posts/writings)
    if (section.querySelector('[data-comment-id], .comment__copy, [data-comment-anchor]')) {
      return 'comment';
    }

    const text = section.textContent || '';

    // Single-row types (usually mb-1)
    if (/mentioned you in a comment/i.test(text)) return 'mention';
    if (/friend request/i.test(text)) return 'friend';
    if (/(new discussion|posted in|joined your group|in your group)/i.test(text)) return 'group';
    if (/started following you/i.test(text)) return 'follow';

    // Loves: language-independent heart icon in the section body (not inside a
    // comment widget — excluded above), or "love(s)/loved" wording as fallback.
    const hasHeart = [...section.querySelectorAll('svg path')].some((p) =>
      (p.getAttribute('d') || '').startsWith(HEART_PATH_PREFIX)
    );
    if (hasHeart || /\blove[ds]?\b/i.test(text)) return 'like';

    return 'other';
  }

  /** Tag every untagged notification section under #main-content. */
  function tagSections(root = document) {
    const sections = root.querySelectorAll(
      '#main-content section:not([data-fnf-type])'
    );
    let tagged = 0;
    for (const section of sections) {
      section.dataset.fnfType = classify(section);
      tagged++;
    }
    return tagged;
  }

  /** Reflect settings as attributes on <html>; CSS does the actual hiding. */
  function applySettings() {
    const html = document.documentElement;
    html.toggleAttribute('data-fnf-enabled', !!settings.enabled);
    for (const type of TYPES) {
      html.toggleAttribute(`data-fnf-hide-${type}`, !!settings.hide[type]);
    }
  }

  /** Ask the page-world script to refresh Waypoint trigger points (debounced there). */
  function requestWaypointRefresh() {
    window.dispatchEvent(new CustomEvent('fnf:refresh-waypoints'));
  }

  function isNotificationsPage() {
    return location.pathname.startsWith('/notifications');
  }

  function run() {
    if (!isNotificationsPage()) return;
    const tagged = tagSections();
    applySettings();
    if (tagged > 0) requestWaypointRefresh();
  }

  // --- Settings lifecycle ------------------------------------------------

  async function loadSettings() {
    try {
      const stored = await API.storage.sync.get('settings');
      if (stored && stored.settings) {
        settings = {
          ...structuredClone(DEFAULT_SETTINGS),
          ...stored.settings,
          hide: { ...DEFAULT_SETTINGS.hide, ...(stored.settings.hide || {}) },
        };
      }
    } catch (e) {
      // storage unavailable -> defaults
    }
    run();
  }

  API.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes.settings) {
      settings = {
        ...structuredClone(DEFAULT_SETTINGS),
        ...changes.settings.newValue,
        hide: {
          ...DEFAULT_SETTINGS.hide,
          ...((changes.settings.newValue || {}).hide || {}),
        },
      };
      applySettings();
      requestWaypointRefresh();
    }
  });

  // --- DOM lifecycle ------------------------------------------------------

  // Endless scrolling appends new sections; tag them as they arrive.
  let observerScheduled = false;
  const observer = new MutationObserver(() => {
    if (observerScheduled) return;
    observerScheduled = true;
    requestAnimationFrame(() => {
      observerScheduled = false;
      run();
    });
  });

  function startObserver() {
    const target = document.querySelector('#main-content') || document.body;
    observer.observe(target, { childList: true, subtree: true });
  }

  // Turbo (Hotwire) navigates without full page loads.
  document.addEventListener('turbo:load', run);
  document.addEventListener('turbo:render', run);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      startObserver();
      loadSettings();
    });
  } else {
    startObserver();
    loadSettings();
  }
})();
