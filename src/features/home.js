/**
 * Fet Features — home module
 * Tags "loved pictures" thumbnail grids in the home feed. Detection is
 * structural: a grid inside an <article> whose direct children are
 * /pictures/ links with thumbnails. Sizing/hiding is pure CSS.
 */
'use strict';

(() => {
  const SIZES = ['hidden', 'normal', 'large'];

  FF.register({
    id: 'home',

    // Loved-picture grids can appear on the feed and activity views;
    // structural detection is specific enough to run everywhere.
    matches() {
      return true;
    },

    tag() {
      const grids = document.querySelectorAll('div.grid:not([data-ff-grid])');
      let tagged = 0;
      for (const grid of grids) {
        if (!grid.closest('article')) continue;
        if (grid.querySelectorAll(':scope > a[href*="/pictures/"] img').length === 0) continue;
        grid.dataset.ffGrid = 'loved-pictures';
        tagged++;
      }
      return tagged;
    },

    apply(html, settings) {
      const mode = SIZES.includes(settings.home.pictures)
        ? settings.home.pictures
        : 'normal';
      html.setAttribute('data-ff-pics', mode);
    },
  });
})();
