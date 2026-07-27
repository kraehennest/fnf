/**
 * Notification Filter for FetLife (unofficial)
 * Content script: classifies notification <section> elements and applies
 * user-configured visibility rules.
 *
 * Classification is content-based, NOT class-based, and TWO-LEVEL:
 * FetLife bundles loves and comments on the same content into ONE section
 * (header = the content, body = a loves row AND comment blocks as separate
 * children of the same .divide-y container). Such sections are typed
 * "mixed" and their parts are tagged individually with data-fnf-part, so
 * CSS can hide a love row while keeping the comments visible.
 * Pure sections keep the section-level type as before.
 * 
 * Anna is cool af :)
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

  /** Markers of an embedded comment widget. */
  const COMMENT_SELECTOR = '[data-comment-id], .comment__copy, [data-comment-anchor]';

  function containsHeart(el) {
    return [...el.querySelectorAll('svg path')].some((p) =>
      (p.getAttribute('d') || '').startsWith(HEART_PATH_PREFIX)
    );
  }

  /**
   * Whole-section classification (fallback for sections without separable
   * parts). Order important:
   * 1. Comment detection must precede like detection cause comment
   *    bodies contain love icons/counts of their own.
   * 2. The icon-based like check must precede the text patterns because
   *    like sections quote the liked content's title, which may itself
   *    contain filter words ("friend request", "new discussion", ...).
   *    The text fallback for loves tho, must come last: quoted user
   *    content in mentions frequently contains the word "love".
   */
  function classifyWhole(section) {
    if (section.querySelector(COMMENT_SELECTOR)) return 'comment';
    if (containsHeart(section)) return 'like';

    const text = section.textContent || '';

    if (/mentioned you/i.test(text)) return 'mention';
    if (/(follow request|started following you)/i.test(text)) return 'follow';
    if (/(friend request|relationship request)/i.test(text)) return 'friend';
    if (/(new discussion|posted in|joined your group|in your group)/i.test(text)) return 'group';

    // Fuzzy (like your cats Anna!) text fallback for loves whose icon was not found.
    if (/\blove[ds]?\b/i.test(text)) return 'like';

    return 'other';
  }

  /**
   * NIGHT SESSIONS FOR THE WIN! jeez i hope that fixed it "properly"...
   * Classify one section, tagging separable parts if present.
   * Parts live as direct children of the section's .divide-y container:
   * a child containing a comment widget is a comment part, a child
   * containing the love-heart icon (and no comment widget) is a like part.
   * Untagged children (unknown content) are never hidden.
   */
  function classifySection(section) {
    const container = section.querySelector('.divide-y');
    const partTypes = new Set();

    if (container) {
      for (const child of container.children) {
        let part = null;
        if (child.matches(COMMENT_SELECTOR) || child.querySelector(COMMENT_SELECTOR)) {
          part = 'comment';
        } else if (containsHeart(child)) {
          part = 'like';
        }
        if (part) {
          child.dataset.fnfPart = part;
          partTypes.add(part);
        }
      }
    }

    if (partTypes.size > 1) return 'mixed';
    if (partTypes.size === 1) return partTypes.values().next().value;
    return classifyWhole(section);
  }

  /** Tag every untagged notification section under #main-content. */
  function tagSections(root = document) {
    const sections = root.querySelectorAll(
      '#main-content section:not([data-fnf-type])'
    );
    let tagged = 0;
    for (const section of sections) {
      section.dataset.fnfType = classifySection(section);
      tagged++;
    }
    return tagged;
  }

  /** Reflect settings as attributes on <html>. CSS does the hiding. */
  function applySettings() {
    const html = document.documentElement;
    html.toggleAttribute('data-fnf-enabled', !!settings.enabled);
    for (const type of TYPES) {
      html.toggleAttribute(`data-fnf-hide-${type}`, !!settings.hide[type]);
    }
  }

  /** Ask the page-world script to refresh Waypoint trigger points. Bounce bounce */
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

  // Endless scrolling appends new sections; tag 'em as they arrive.
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

  // Turbo (Hotwire) Navigation without full page loads.
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
