/*
 * Trigger Happy — content script.
 * Injects a fixed, centered, pointer-events-none host with a shadow root,
 * then renders the crosshair from synced settings. Page CSS/JS can't touch it.
 */
(() => {
  const HOST_ID = 'trigger-happy-root';
  let host = null;
  let root = null;
  let fsAnchor = null; // fullscreen element whose position we overrode

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

  /*
   * Keep the crosshair visible in fullscreen games (Xbox Cloud Gaming, etc.).
   * A fullscreen-API element renders in the browser's top layer, above every
   * other element — z-index can't beat it — so while fullscreen is active the
   * host must live INSIDE the fullscreen element. That element always fills
   * the viewport exactly, so its 50%/50% is still the exact screen center.
   */
  function placeHost() {
    const fsEl = document.fullscreenElement;
    if (fsEl) {
      if (fsEl.tagName === 'IFRAME') {
        // Fullscreening an iframe: the iframe's own content script handles
        // rendering; a child of an <iframe> element is never rendered anyway.
        return;
      }
      if (host.parentElement !== fsEl) {
        // Absolute positioning must resolve against the fullscreen element.
        // If it's statically positioned, give it a harmless containing block.
        if (getComputedStyle(fsEl).position === 'static') {
          fsEl.style.setProperty('position', 'relative');
          fsAnchor = fsEl;
        }
        fsEl.appendChild(host);
        host.style.position = 'absolute';
      }
    } else if (host.parentElement !== document.documentElement) {
      if (fsAnchor) {
        fsAnchor.style.removeProperty('position');
        fsAnchor = null;
      }
      (document.documentElement || document.body).appendChild(host);
      host.style.position = 'fixed';
    }
  }

  async function refresh() {
    try {
      const { settings } = await chrome.storage.sync.get({ settings: TH.DEFAULTS });
      const hostname = location.hostname || '';
      const siteHidden = !!(settings.hiddenSites && settings.hiddenSites[hostname]);
      const visible = !!settings.enabled && !siteHidden;
      host.style.display = visible ? 'block' : 'none';
      if (visible) root.innerHTML = TH.renderCrosshairSVG(settings);
    } catch (e) {
      // Extension context invalidated (e.g. after update/reload) — nothing to do.
      // Surface anything else so failures are debuggable.
      console.warn('[Trigger Happy] refresh failed:', e);
    }
  }

  function start() {
    ensureHost();
    placeHost();
    document.addEventListener('fullscreenchange', placeHost);
    // Cheap idempotent guard: some SPA re-renders can detach our node.
    setInterval(placeHost, 2000);
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