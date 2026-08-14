/**
 * Fet Features — requests module
 * On /inbox/requests, tags each message-request row with the sender's
 * self-identified gender token. The meta span next to the username reads
 * e.g. "40M Switch" or "27M" — age digits followed by the gender
 * abbreviation. Only the exact token "M" counts as male; "MtF" etc. do
 * not match. Rows without a parsable token stay visible (fail-safe).
 */
'use strict';

(() => {
  /** Brand shown in the hidden-requests note. */
  const NOTE_BRAND = 'Fet Features';

  function isRequestsPage() {
    return location.pathname.startsWith('/inbox/requests');
  }

  /**
   * Informational line above the request list: "N requests hidden by …".
   * The site's own Requests counter keeps counting hidden rows, so this
   * prevents "the extension ate my messages" confusion. DOM is only
   * touched when the text actually changes, so the MutationObserver does
   * not loop on our own updates.
   */
  function updateHiddenNote(settings) {
    const active = settings.enabled && settings.requests.hideMale && isRequestsPage();
    const existing = document.getElementById('ff-hidden-note');

    const count = active
      ? document.querySelectorAll('.swipeout[data-ff-req="male"]').length
      : 0;

    if (!active || count === 0) {
      if (existing) existing.remove();
      return;
    }

    const label =
      count === 1
        ? `1 request hidden by ${NOTE_BRAND}`
        : `${count} requests hidden by ${NOTE_BRAND}`;

    if (existing) {
      if (existing.textContent !== label) existing.textContent = label;
      return;
    }

    const firstRow = document.querySelector('.swipeout');
    if (!firstRow || !firstRow.parentElement) return;
    const note = document.createElement('div');
    note.id = 'ff-hidden-note';
    note.textContent = label;
    firstRow.parentElement.insertBefore(note, firstRow);
  }

  FF.register({
    id: 'requests',

    matches(loc) {
      return loc.pathname.startsWith('/inbox/requests');
    },

    tag() {
      const rows = document.querySelectorAll('.swipeout:not([data-ff-req])');
      let tagged = 0;
      for (const row of rows) {
        let gender = null;
        const MALE_TOKENS = new Set(['M', 'Man', 'Male']);
        for (const span of row.querySelectorAll('span')) {
          const m = (span.textContent || '').trim().match(/^(\d{1,3})\s*([A-Za-z]+)/);
          if (m) {
            gender = m[2];
            break;
          }
        }
        row.dataset.ffReq = MALE_TOKENS.has(gender) ? 'male' : 'other';
        tagged++;
      }
      return tagged;
    },

    apply(html, settings) {
      html.toggleAttribute(
        'data-ff-hide-male-requests',
        !!(settings.requests && settings.requests.hideMale)
      );
      updateHiddenNote(settings);
    },
  });
})();
