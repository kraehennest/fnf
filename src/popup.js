(() => {
  'use strict';

  const API = typeof browser !== 'undefined' ? browser : chrome;

  const DEFAULTS = {
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
    home: { pictures: 'normal' },
    requests: { hideMale: false },
  };

  const enabledEl = document.getElementById('enabled');
  const notifEls = [...document.querySelectorAll('input[data-notif]')];
  const sizeEls = [...document.querySelectorAll('input[name="pictures"]')];
  const hideMaleEl = document.getElementById('hideMaleRequests');

  let settings = structuredClone(DEFAULTS);

  /** Same normalization as core.js, incl. legacy `hide` migration. */
  function normalize(raw) {
    const d = structuredClone(DEFAULTS);
    if (!raw) return d;
    const legacy = raw.hide && !raw.notifications ? raw.hide : null;
    return {
      enabled: raw.enabled !== undefined ? !!raw.enabled : d.enabled,
      notifications: { ...d.notifications, ...(raw.notifications || legacy || {}) },
      home: { ...d.home, ...(raw.home || {}) },
      requests: { ...d.requests, ...(raw.requests || {}) },
    };
  }

  function render() {
    enabledEl.checked = settings.enabled;
    document.body.classList.toggle('disabled', !settings.enabled);
    for (const el of notifEls) {
      el.checked = !!settings.notifications[el.dataset.notif];
    }
    for (const el of sizeEls) {
      el.checked = el.value === settings.home.pictures;
    }
    hideMaleEl.checked = !!settings.requests.hideMale;
  }

  async function save() {
    await API.storage.sync.set({ settings });
  }

  enabledEl.addEventListener('change', () => {
    settings.enabled = enabledEl.checked;
    render();
    save();
  });

  for (const el of notifEls) {
    el.addEventListener('change', () => {
      settings.notifications[el.dataset.notif] = el.checked;
      save();
    });
  }

  for (const el of sizeEls) {
    el.addEventListener('change', () => {
      if (el.checked) {
        settings.home.pictures = el.value;
        save();
      }
    });
  }

  hideMaleEl.addEventListener('change', () => {
    settings.requests.hideMale = hideMaleEl.checked;
    save();
  });

  (async () => {
    try {
      const stored = await API.storage.sync.get('settings');
      settings = normalize(stored && stored.settings);
    } catch (e) {
      /* defaults */
    }
    render();
  })();
})();
