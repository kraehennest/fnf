/**
 * Notification Filter for FetLife (unofficial)
 * Page-world script (world: MAIN). Has access to the site's own globals,
 * in particular the Waypoint library used for endless scrolling.
 *
 * Hiding sections shrinks the page, which makes Waypoint's cached
 * triggerPoint values stale. refreshAll() recomputes them. If the filtered
 * page no longer fills the viewport, the sentinel can never be reached by
 * scrolling — in that case we nudge loading by dispatching a scroll event
 * after refresh.
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
    // Fallback: if the visible page is shorter than the viewport after
    // filtering, trigger a scroll event so lazy loaders re-evaluate.
    if (document.documentElement.scrollHeight <= window.innerHeight + 100) {
      window.dispatchEvent(new Event('scroll'));
    }
  }

  window.addEventListener('fnf:refresh-waypoints', () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(refresh, 150);
  });
})();
