/**
 * Fet Features — notifications module
 * Classifies notification <section> elements on /notifications by content
 * (two-level: sections bundling loves + comments on the same content get
 * type "mixed" with individually tagged parts). See repo docs for the
 * classification rationale; ordering inside classifyWhole is load-bearing.
 */
'use strict';

(() => {
  const TYPES = ['like', 'comment', 'mention', 'follow', 'friend', 'group', 'other'];
  const HEART_PATH_PREFIX = 'M4.634 1';
  const COMMENT_SELECTOR = '[data-comment-id], .comment__copy, [data-comment-anchor]';

  function containsHeart(el) {
    return [...el.querySelectorAll('svg path')].some((p) =>
      (p.getAttribute('d') || '').startsWith(HEART_PATH_PREFIX)
    );
  }

  /**
   * Whole-section fallback. Order matters, twice over:
   * 1. Comment markers before the heart check (comments contain love icons).
   * 2. Icon-based like check before text patterns (liked content titles may
   *    contain filter words), but the fuzzy love-text fallback LAST
   *    (mentions frequently quote text containing "love").
   */
  function classifyWhole(section) {
    if (section.querySelector(COMMENT_SELECTOR)) return 'comment';
    if (containsHeart(section)) return 'like';

    const text = section.textContent || '';

    if (/mentioned you/i.test(text)) return 'mention';
    if (/(follow request|started following you)/i.test(text)) return 'follow';
    if (/(friend request|relationship request)/i.test(text)) return 'friend';
    if (/(new discussion|posted in|joined your group|in your group)/i.test(text)) return 'group';
    if (/\blove[ds]?\b/i.test(text)) return 'like';

    return 'other';
  }

  /** Tag separable parts (loves + comments bundled per content item). */
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
          child.dataset.ffPart = part;
          partTypes.add(part);
        }
      }
    }

    if (partTypes.size > 1) return 'mixed';
    if (partTypes.size === 1) return partTypes.values().next().value;
    return classifyWhole(section);
  }

  FF.register({
    id: 'notifications',

    matches(loc) {
      return loc.pathname.startsWith('/notifications');
    },

    tag() {
      const sections = document.querySelectorAll(
        '#main-content section:not([data-ff-type])'
      );
      let tagged = 0;
      for (const section of sections) {
        section.dataset.ffType = classifySection(section);
        tagged++;
      }
      return tagged;
    },

    apply(html, settings) {
      for (const type of TYPES) {
        html.toggleAttribute(`data-ff-hide-${type}`, !!settings.notifications[type]);
      }
    },
  });
})();
