/*
 * Trigger Happy — content script.
 * Injects a fixed, centered, pointer-events-none host with a shadow root,
 * then renders the crosshair from synced settings. Page CSS/JS can't touch it.
 */
(() => {
  const HOST_ID = 'trigger-happy-root';
  let host = null;
  let root = null;

  function ensureHost() {
    if (host) return;
    host = document.createElement('div');
    host.id = HOST_ID;
    host.style.cssText =
      'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);' +
      'z-index:2147483647;pointer-events:none;display:none;';
    root = host.attachShadow({ mode: 'open' });
    (document.documentElement || document.body).appendChild(host);
  }

  async function refresh() {
    try {
      const { settings } = await chrome.storage.sync.get({ settings: TH.DEFAULTS });
      const hostname = location.hostname || '';
      const siteHidden = !!(settings.hiddenSites && settings.hiddenSites[hostname]);
      const visible = !!settings.enabled && !siteHidden;
      host.style.display = visible ? 'block' : 'none';
      if (visible) root.innerHTML = renderCrosshairSVG(settings);
    } catch {
      // Extension context invalidated (e.g. after update/reload) — nothing to do.
    }
  }

  function start() {
    ensureHost();
    chrome.storage.onChanged.addListener((_changes, area) => {
      if (area === 'sync') refresh();
    });
    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (msg && msg.type === 'th-get-site') {
        sendResponse({ hostname: location.hostname || '' });
      }
      return false;
    });
    refresh();
  }

  if (document.documentElement) {
    start();
  } else {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  }
})();