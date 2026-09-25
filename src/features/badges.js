/**
 * Fet Features — badges module
 * Hides the red alert-count badges on the top-nav icons (inbox, message
 * requests, notifications), each individually toggleable.
 *
 * No DOM tagging needed: FetLife's own counter code addresses these
 * elements through Stimulus targets (data-nav--links-target="inboxCount"
 * etc.), which are functional anchors and far more redesign-stable than
 * layout classes. Hiding is pure CSS via :has() on those targets; this
 * module only reflects the settings as attributes on <html>.
 */
'use strict';

(() => {
  const BADGES = ['inbox', 'requests', 'notifications'];

  FF.register({
    id: 'badges',

    // The nav bar is on every page.
    matches() {
      return true;
    },

    apply(html, settings) {
      const b = settings.badges || {};
      for (const key of BADGES) {
        html.toggleAttribute(`data-ff-hide-badge-${key}`, !!b[key]);
      }
    },
  });
})();
