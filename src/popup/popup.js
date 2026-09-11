/* Trigger Happy — popup logic. Reads/writes the synced `settings` object;
 * content scripts pick up every change live via storage.onChanged. */
(() => {
  const $ = (id) => document.getElementById(id);
  const PRESETS = ['#ffffff', '#ff3d3d', '#00e676', '#00e5ff', '#ffd54f', '#ff40ff', '#ff9100'];

  let settings = { ...TH.DEFAULTS };
  let siteHost = null;

  function save() {
    chrome.storage.sync.set({ settings });
  }

  /* ---------- preview + control reflection ---------- */

  function apply() {
    // master switch
    $('enabled').checked = !!settings.enabled;

    // preview
    $('preview').innerHTML = renderPreview(settings);

    // style buttons
    for (const btn of $('styles').children) {
      btn.classList.toggle('active', btn.dataset.style === settings.style);
    }

    // color
    $('color').value = normalizeHex(settings.color);
    for (const sw of $('swatches').children) {
      sw.classList.toggle('active', sw.dataset.color === normalizeHex(settings.color));
    }

    // sliders
    setSlider('size', settings.size);
    setSlider('thickness', settings.thickness);
    setSlider('gap', settings.gap);
    setSlider('opacity', settings.opacity);
    $('outline').checked = !!settings.outline;

    // gap is meaningless for dot/circle styles — dim it
    const gapRelevant = !['dot', 'circle'].includes(settings.style);
    $('gap').disabled = !gapRelevant;
    $('gap').closest('.row').style.opacity = gapRelevant ? '1' : '0.4';

    // per-site
    const siteRow = $('siteHidden').closest('.row');
    if (siteHost) {
      siteRow.style.display = '';
      $('siteHost').textContent = siteHost;
      $('siteHidden').checked = !!(settings.hiddenSites && settings.hiddenSites[siteHost]);
    } else {
      $('siteHost').textContent = 'this page';
      $('siteHidden').checked = false;
      siteRow.style.opacity = '0.4';
      $('siteHidden').disabled = true;
    }
  }

  function renderPreview(s) {
    const svg = TH.renderCrosshairSVG({ ...s, opacity: 1 });
    // scale real crosshair into the preview box
    return `<div style="transform:scale(0.9)">${svg}</div>`;
  }

  function setSlider(id, value) {
    const el = $(id);
    el.value = value;
    $(id + 'Val').textContent = id === 'opacity' ? Math.round(value * 100) + '%' : value;
  }

  function normalizeHex(c) {
    c = String(c || '');
    if (/^#[0-9a-f]{6}$/i.test(c)) return c.toLowerCase();
    if (/^#[0-9a-f]{3}$/i.test(c)) return '#' + c.slice(1).replace(/./g, (ch) => ch + ch).toLowerCase();
    return TH.DEFAULTS.color;
  }

  /* ---------- build static controls ---------- */

  function buildStyleButtons() {
    const wrap = $('styles');
    for (const st of TH.STYLES) {
      const btn = document.createElement('button');
      btn.dataset.style = st.id;
      btn.title = st.label;
      const mini = document.createElement('span');
      mini.className = 'mini';
      mini.innerHTML = TH.renderCrosshairSVG({
        style: st.id, color: '#cfd8dc', size: st.id === 'dot' ? 14 : st.id === 'circle' || st.id === 'dotCircle' ? 18 : 11,
        thickness: 2, gap: st.id === 'xcross' ? 2 : 3, opacity: 1, outline: true
      });
      btn.appendChild(mini);
      btn.appendChild(document.createTextNode(st.label));
      btn.addEventListener('click', () => { settings.style = st.id; save(); apply(); });
      wrap.appendChild(btn);
    }
  }

  function buildSwatches() {
    const wrap = $('swatches');
    for (const hex of PRESETS) {
      const sw = document.createElement('button');
      sw.dataset.color = hex;
      sw.style.background = hex;
      sw.title = hex;
      sw.addEventListener('click', () => { settings.color = hex; save(); apply(); });
      wrap.appendChild(sw);
    }
  }

  /* ---------- wiring ---------- */

  function bind() {
    $('enabled').addEventListener('change', (e) => { settings.enabled = e.target.checked; save(); apply(); });
    $('color').addEventListener('input', (e) => { settings.color = e.target.value; save(); apply(); });
    $('size').addEventListener('input', (e) => { settings.size = +e.target.value; save(); apply(); });
    $('thickness').addEventListener('input', (e) => { settings.thickness = +e.target.value; save(); apply(); });
    $('gap').addEventListener('input', (e) => { settings.gap = +e.target.value; save(); apply(); });
    $('opacity').addEventListener('input', (e) => { settings.opacity = +e.target.value; save(); apply(); });
    $('outline').addEventListener('change', (e) => { settings.outline = e.target.checked; save(); apply(); });

    $('siteHidden').addEventListener('change', (e) => {
      if (!siteHost) return;
      const hiddenSites = { ...(settings.hiddenSites || {}) };
      if (e.target.checked) hiddenSites[siteHost] = true;
      else delete hiddenSites[siteHost];
      settings.hiddenSites = hiddenSites;
      save();
    });

    $('reset').addEventListener('click', () => {
      settings = { ...TH.DEFAULTS, hiddenSites: {} };
      save();
      apply();
    });

    $('openShortcuts').addEventListener('click', () => {
      chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
    });
  }

  /* Chrome (138+) no longer assigns suggested_key hotkeys on install, and
   * reloads/conflicts can drop existing bindings — surface the real state. */
  async function checkHotkey() {
    try {
      const cmds = await chrome.commands.getAll();
      const cmd = (cmds || []).find((c) => c.name === 'toggle-crosshair');
      const keys = cmd && cmd.shortcut ? cmd.shortcut.split('+') : null;
      $('hotkeyWarn').classList.toggle('hidden', !!keys);
      $('hotkeyHint').innerHTML = keys
        ? 'Shortcut: ' + keys.map((k) => `<kbd>${k}</kbd>`).join('+')
        : 'Shortcut: <em>not set — see banner above</em>';
    } catch {
      // commands API unavailable — leave the footer alone
    }
  }

  /* ---------- init ---------- */

  async function init() {
    const { settings: stored } = await chrome.storage.sync.get({ settings: TH.DEFAULTS });
    settings = { ...TH.DEFAULTS, ...stored };

    buildStyleButtons();
    buildSwatches();
    bind();
    apply();
    checkHotkey();

    // Ask the content script of the active tab which site we're on.
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.id != null) {
        const resp = await chrome.tabs.sendMessage(tab.id, { type: 'th-get-site' });
        siteHost = (resp && resp.hostname) || null;
        apply(); // reflect per-site state now that we know the host
      }
    } catch {
      siteHost = null; // no content script here (chrome://, web store, ...)
    }
  }

  init();
})();