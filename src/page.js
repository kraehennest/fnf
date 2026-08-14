/**
 * Fet Features (unofficial)
 * Page-world script (world: MAIN). Refreshes Waypoint trigger points after
 * display changes, since hiding or resizing elements changes page height
 * and stales the endless-scrolling triggers.
 */
(() => {
  'use strict';

  let timer = null;

  function refresh() {
    timer = null;
    try {
      if (typeof Waypoint !== 'undefined' && typeof Waypoint.refreshAll === 'function') {
        Waypoint.refreshAll();
      }
    } catch (e) {
      /* Waypoint absent or errored — nothing to do */
    }
    if (document.documentElement.scrollHeight <= window.innerHeight + 100) {
      window.dispatchEvent(new Event('scroll'));
    }
  }

  window.addEventListener('ff:refresh-waypoints', () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(refresh, 150);
  });
})();
