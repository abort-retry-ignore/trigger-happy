/*
 * Trigger Happy — shared crosshair renderer.
 * Loaded as a plain script by both the content script (isolated world)
 * and the popup. Exposes a single global: TH = { DEFAULTS, STYLES, renderCrosshairSVG }.
 */
(() => {
  const DEFAULTS = {
    enabled: true,
    style: 'crossGap', // cross | crossGap | tshape | xcross | dot | circle | dotCircle
    color: '#00e676',
    size: 24, // distance from center to arm tip (px)
    thickness: 2, // px
    gap: 6, // px, hollow center for arm styles
    opacity: 0.9,
    outline: true,
    hiddenSites: {} // { [hostname]: true }
  };

  const STYLES = [
    { id: 'cross', label: 'Cross' },
    { id: 'crossGap', label: 'Gap' },
    { id: 'tshape', label: 'T-Shape' },
    { id: 'xcross', label: 'X' },
    { id: 'dot', label: 'Dot' },
    { id: 'circle', label: 'Circle' },
    { id: 'dotCircle', label: 'Dot + Circle' }
  ];

  function escColor(c) {
    return /^#[0-9a-fA-F]{3,8}$/.test(String(c)) ? c : DEFAULTS.color;
  }

  /**
   * Build the crosshair as an SVG markup string, centered on (0,0).
   * Caller decides where to place it and how big the viewport is.
   */
  function renderCrosshairSVG(s) {
    s = { ...DEFAULTS, ...s };
    const color = escColor(s.color);
    const t = Math.max(1, Math.round(s.thickness));
    const size = Math.max(4, s.size);
    const gap = Math.min(Math.max(0, s.gap), Math.max(0, size - 2));
    const c = color;
    const o = 'rgba(0,0,0,0.9)';
    const parts = { main: [], out: [] };

    const line = (arr, x1, y1, x2, y2, w, col) =>
      arr.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/>`);
    const circle = (arr, r, col, fill, w) =>
      arr.push(`<circle r="${r}" ${fill ? `fill="${col}"` : `fill="none" stroke="${col}" stroke-width="${w}"`}/>`);

    let E = size; // max extent from center
    const st = s.style;

    if (st === 'dot') {
      const r = Math.max(2, size * 0.28);
      E = r;
      if (s.outline) circle(parts.out, r + 1, o, true);
      circle(parts.main, r, c, true);
    } else if (st === 'circle') {
      const r = Math.max(3, size * 0.55);
      E = r + t;
      if (s.outline) circle(parts.out, r + 1, o, false, t + 2);
      circle(parts.main, r, c, false, t);
    } else if (st === 'dotCircle') {
      const r = Math.max(3, size * 0.55);
      const dr = Math.max(1.5, size * 0.12);
      E = r + t;
      if (s.outline) {
        circle(parts.out, r + 1, o, false, t + 2);
        circle(parts.out, dr + 1, o, true);
      }
      circle(parts.main, r, c, false, t);
      circle(parts.main, dr, c, true);
    } else {
      if (st === 'xcross') {
        const k = Math.SQRT1_2;
        const g2 = gap * k;
        const h2 = size * k;
        for (const [sx, sy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
          if (s.outline) line(parts.out, g2 * sx, g2 * sy, h2 * sx, h2 * sy, t + 2, o);
          line(parts.main, g2 * sx, g2 * sy, h2 * sx, h2 * sy, t, c);
        }
        E = size * k + t;
      } else {
        const arms = st === 'tshape' ? ['t', 'l', 'r'] : ['t', 'b', 'l', 'r'];
        for (const arm of arms) {
          let x1 = 0, y1 = 0, x2 = 0, y2 = 0;
          if (arm === 't') { x2 = 0; y2 = -size; y1 = -gap; }
          if (arm === 'b') { y2 = size; y1 = gap; }
          if (arm === 'l') { x2 = -size; x1 = -gap; }
          if (arm === 'r') { x2 = size; x1 = gap; }
          if (s.outline) line(parts.out, x1, y1, x2, y2, t + 2, o);
          line(parts.main, x1, y1, x2, y2, t, c);
        }
        E = size + t / 2;
      }
    }

    const C = Math.ceil(E + 2); // margin so outlines/caps never clip
    const W = C * 2;
    const svgParts = s.outline ? parts.out.join('') + parts.main.join('') : parts.main.join('');
    return `<svg width="${W}" height="${W}" viewBox="${-C} ${-C} ${W} ${W}" xmlns="http://www.w3.org/2000/svg" style="display:block;opacity:${s.opacity}">${svgParts}</svg>`;
  }

  globalThis.TH = { DEFAULTS, STYLES, renderCrosshairSVG };
})();