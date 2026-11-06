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
    badges: { inbox: false, requests: false, notifications: false },
    mute: { enabled: true },
  };

  const enabledEl = document.getElementById('enabled');
  const notifEls = [...document.querySelectorAll('input[data-notif]')];
  const sizeEls = [...document.querySelectorAll('input[name="pictures"]')];
  const hideMaleEl = document.getElementById('hideMaleRequests');
  const badgeEls = [...document.querySelectorAll('input[data-badge]')];
  const muteEnabledEl = document.getElementById('muteEnabled');
  const muteCountEl = document.getElementById('muteCount');
  const muteExportEl = document.getElementById('muteExport');
  const muteImportEl = document.getElementById('muteImport');
  const muteImportFileEl = document.getElementById('muteImportFile');
  const muteClearEl = document.getElementById('muteClear');

  let muteUsers = {};

  async function loadMutelist() {
    try {
      const stored = await API.storage.local.get('mutelist');
      muteUsers = (stored && stored.mutelist && stored.mutelist.users) || {};
    } catch (e) {
      muteUsers = {};
    }
    muteCountEl.textContent = String(Object.keys(muteUsers).length);
  }

  async function saveMutelist() {
    await API.storage.local.set({ mutelist: { v: 1, users: muteUsers } });
    muteCountEl.textContent = String(Object.keys(muteUsers).length);
  }

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
      badges: { ...d.badges, ...(raw.badges || {}) },
      mute: { ...d.mute, ...(raw.mute || {}) },
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
    for (const el of badgeEls) {
      el.checked = !!settings.badges[el.dataset.badge];
    }
    muteEnabledEl.checked = !!(settings.mute && settings.mute.enabled);
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

  for (const el of badgeEls) {
    el.addEventListener('change', () => {
      settings.badges[el.dataset.badge] = el.checked;
      save();
    });
  }

  muteEnabledEl.addEventListener('change', () => {
    settings.mute = settings.mute || {};
    settings.mute.enabled = muteEnabledEl.checked;
    save();
  });

  muteExportEl.addEventListener('click', () => {
    const names = Object.keys(muteUsers).sort();
    const blob = new Blob([names.join('\n') + '\n'], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'fet-features-mutelist.txt';
    a.click();
    URL.revokeObjectURL(a.href);
  });

  muteImportEl.addEventListener('click', () => muteImportFileEl.click());

  muteImportFileEl.addEventListener('change', async () => {
    const file = muteImportFileEl.files && muteImportFileEl.files[0];
    if (!file) return;
    const text = await file.text();
    for (const line of text.split(/\r?\n/)) {
      const name = line.trim();
      if (!/^[\w-]+$/.test(name)) continue;
      if (!muteUsers[name]) muteUsers[name] = ['import'];
    }
    muteImportFileEl.value = '';
    await saveMutelist();
  });

  muteClearEl.addEventListener('click', async () => {
    if (!confirm('Remove ALL muted people? This cannot be undone (export first if unsure).')) return;
    muteUsers = {};
    await saveMutelist();
  });

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
    loadMutelist();
  })();
})();