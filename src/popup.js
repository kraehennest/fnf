(() => {
  'use strict';

  const API = typeof browser !== 'undefined' ? browser : chrome;

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

  const enabledEl = document.getElementById('enabled');
  const typeEls = [...document.querySelectorAll('input[data-type]')];

  let settings = structuredClone(DEFAULT_SETTINGS);

  function render() {
    enabledEl.checked = settings.enabled;
    document.body.classList.toggle('disabled', !settings.enabled);
    for (const el of typeEls) {
      el.checked = !!settings.hide[el.dataset.type];
    }
  }

  async function save() {
    await API.storage.sync.set({ settings });
  }

  enabledEl.addEventListener('change', () => {
    settings.enabled = enabledEl.checked;
    render();
    save();
  });

  for (const el of typeEls) {
    el.addEventListener('change', () => {
      settings.hide[el.dataset.type] = el.checked;
      save();
    });
  }

  (async () => {
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
      /* defaults */
    }
    render();
  })();
})();
