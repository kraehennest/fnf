/**
 * Fet Features — mute list module
 * Maintains a local list of usernames whose content is hidden across the
 * site (notifications, message requests, comments, feed entries), plus a
 * collector that harvests usernames from group member pages the user
 * browses herself.
 *
 * Boundaries, deliberately: this is MUTING, not blocking. Muting hides
 * content in the user's own browser; only FetLife's own block feature
 * affects what the other account can see. The collector reads ONLY the
 * DOM of member-list pages the user navigates to (classic pagination) —
 * the extension never fetches pages itself, keeping the display-only /
 * zero-requests model intact.
 *
 * Storage: the list lives in storage.local (±10 MB quota; no artificial
 * cap — 7k usernames are ~100 KB). It therefore does NOT sync across
 * devices; export/import in the popup covers that. The on/off toggle
 * lives in the regular synced settings (settings.mute.enabled).
 */
'use strict';

(() => {
  const STORE_KEY = 'mutelist';
  const ARMED_KEY = 'mutelistArmed';

  /** Single-segment paths that are site routes, never profiles. */
  const RESERVED = new Set([
    'notifications', 'inbox', 'requests', 'conversations', 'groups',
    'events', 'places', 'search', 'settings', 'support', 'home',
    'explore', 'writings', 'videos', 'pictures', 'fetishes', 'login',
    'logout', 'signup', 'about', 'legalese', 'glossary', 'ads',
  ]);

  const PROFILE_RE = /^\/([A-Za-z0-9][\w-]*)$/;

  /** username -> array of source tags (e.g. "group:267916", "import", "manual") */
  let users = {};
  let userSet = new Set();
  let loaded = false;

  function rebuildSet() {
    userSet = new Set(Object.keys(users).map((u) => u.toLowerCase()));
  }

  async function loadList() {
    try {
      const stored = await FF.api.storage.local.get(STORE_KEY);
      users = (stored && stored[STORE_KEY] && stored[STORE_KEY].users) || {};
    } catch (e) {
      users = {};
    }
    rebuildSet();
    loaded = true;
    clearChecked();
    FF.run();
  }

  async function saveList() {
    await FF.api.storage.local.set({ [STORE_KEY]: { v: 1, users } });
  }

  FF.api.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes[STORE_KEY]) {
      users = (changes[STORE_KEY].newValue || {}).users || {};
      rebuildSet();
      clearChecked();
      FF.run();
    }
  });

  /** Re-check everything after the list changed. */
  function clearChecked() {
    for (const el of document.querySelectorAll('[data-ff-mute-checked]')) {
      el.removeAttribute('data-ff-mute-checked');
      el.removeAttribute('data-ff-muted');
    }
  }

  function profileNameFromAnchor(a) {
    const href = a.getAttribute('href') || '';
    const m = href.match(PROFILE_RE);
    if (!m) return null;
    const name = m[1];
    if (RESERVED.has(name.toLowerCase())) return null;
    return name;
  }

  /**
   * Row roots whose ACTOR (first profile link in the root) decides muting.
   * Order: most specific first, so a comment inside a notification section
   * is judged by the comment's author, not the section header.
   */
  const ROOT_SELECTORS = '[data-comment-id], .swipeout, article, #main-content section';

  function actorName(root) {
    for (const a of root.querySelectorAll('a[href]')) {
      const name = profileNameFromAnchor(a);
      if (name) return name;
    }
    return null;
  }

  function tagMuted() {
    if (!loaded || userSet.size === 0) return 0;
    let tagged = 0;
    for (const root of document.querySelectorAll(ROOT_SELECTORS)) {
      if (root.hasAttribute('data-ff-mute-checked')) continue;
      // Skip roots that contain one of the other root types — judge the
      // innermost unit, not its container.
      root.setAttribute('data-ff-mute-checked', '');
      const name = actorName(root);
      if (name && userSet.has(name.toLowerCase())) {
        root.setAttribute('data-ff-muted', '');
        tagged++;
      }
    }
    return tagged;
  }

  // --- Member-page collector ----------------------------------------------

  function memberPageGroupId() {
    const m = location.pathname.match(/^\/groups\/(\d+)\/members/);
    return m ? m[1] : null;
  }

  function pageMemberNames() {
    const names = new Set();
    const list = document.getElementById('group_members_list');
    if (!list) return names;
    for (const a of list.querySelectorAll('a[title][href^="/"]')) {
      const name = profileNameFromAnchor(a);
      if (name && name === a.getAttribute('title')) names.add(name);
    }
    return names;
  }

  async function addNames(names, tag) {
    let added = 0;
    for (const name of names) {
      if (!users[name]) {
        users[name] = [tag];
        added++;
      } else if (!users[name].includes(tag)) {
        users[name].push(tag);
      }
    }
    if (added > 0 || names.size > 0) {
      rebuildSet();
      await saveList();
    }
    return added;
  }

  async function isArmed(groupId) {
    try {
      const stored = await FF.api.storage.local.get(ARMED_KEY);
      return !!((stored && stored[ARMED_KEY]) || {})[groupId];
    } catch (e) {
      return false;
    }
  }

  async function setArmed(groupId, on) {
    const stored = await FF.api.storage.local.get(ARMED_KEY);
    const armed = (stored && stored[ARMED_KEY]) || {};
    if (on) armed[groupId] = Date.now();
    else delete armed[groupId];
    await FF.api.storage.local.set({ [ARMED_KEY]: armed });
  }

  let collectorBusy = false;

  async function ensureCollector() {
    const groupId = memberPageGroupId();
    const list = document.getElementById('group_members_list');
    if (!groupId || !list) return;
    if (collectorBusy) return;

    let bar = document.getElementById('ff-mute-collector');
    if (!bar) {
      collectorBusy = true;
      bar = document.createElement('div');
      bar.id = 'ff-mute-collector';

      const info = document.createElement('span');
      info.id = 'ff-mute-collector-info';

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = 'Mute members on this page';
      btn.addEventListener('click', async () => {
        const added = await addNames(pageMemberNames(), `group:${groupId}`);
        info.textContent = `${added} added · ${userSet.size} muted in total`;
      });

      const armLabel = document.createElement('label');
      const armBox = document.createElement('input');
      armBox.type = 'checkbox';
      armBox.addEventListener('change', async () => {
        await setArmed(groupId, armBox.checked);
        if (armBox.checked) {
          const added = await addNames(pageMemberNames(), `group:${groupId}`);
          info.textContent = `${added} added · ${userSet.size} muted in total — keep paging, each page is collected automatically`;
        }
      });
      armLabel.append(armBox, ' Auto-collect while paging');

      bar.append(info, btn, armLabel);
      list.parentElement.insertBefore(bar, list);

      const armed = await isArmed(groupId);
      armBox.checked = armed;
      if (armed) {
        const added = await addNames(pageMemberNames(), `group:${groupId}`);
        info.textContent = `${added} added · ${userSet.size} muted in total`;
      } else {
        const names = pageMemberNames();
        const known = [...names].filter((n) => userSet.has(n.toLowerCase())).length;
        info.textContent = `${names.size} members on this page · ${known} already muted`;
      }
      collectorBusy = false;
    }
  }

  // --- Feature registration -------------------------------------------------

  FF.register({
    id: 'mutelist',

    matches() {
      return true;
    },

    tag() {
      if (memberPageGroupId()) ensureCollector();
      return tagMuted();
    },

    apply(html, settings) {
      const mute = settings.mute || {};
      html.toggleAttribute('data-ff-mute-enabled', !!mute.enabled);
      html.setAttribute(
        'data-ff-mute-mode',
        mute.mode === 'hide' ? 'hide' : 'highlight'
      );
    },
  });

  loadList();
})();
