# 🎯 Trigger Happy

A Chrome extension that pins a fully customizable crosshair to the **exact center of your screen**. Built for browser FPS games — Krunker, Shell Shockers, Voxiom, 1v1.LOL, Zombs Royale, or anything you play in a tab.

Inspired by [Crosshair Pro](https://github.com/antoniobrandao/crosshair-chrome-extension) and the various crosshair overlays on the Chrome Web Store, rebuilt from scratch as a clean, zero-dependency Manifest V3 extension.

## Features

- **7 crosshair styles** — cross, gap cross, T-shape, X, dot, circle, dot + circle
- **Tune everything** — color (presets + custom picker), size, thickness, gap, opacity
- **Black outline** for contrast on any background (bright sky, white walls, …)
- **Live preview** in the popup — see exactly what you'll get before you play
- **Per-site toggle** — hide the crosshair on specific sites (e.g. don't want it on GitHub)
- **Keyboard shortcut** — `Alt+Shift+X` toggles the overlay instantly (set it once in `chrome://extensions/shortcuts`)
- **Ifriend-ly** — renders in every frame, so games embedded in iframes still get a crosshair
- **Fullscreen-proof** — stays visible and dead-center in both browser fullscreen (F11) and Fullscreen-API fullscreen (e.g. Xbox Cloud Gaming's fullscreen button) by reparenting into the fullscreen element
- **Zero dependencies, no build step** — clone and load

## Install (unpacked)

1. Clone this repo
2. Open `chrome://extensions`
3. Enable **Developer mode** (top right)
4. Click **Load unpacked** and select the `trigger-happy/` folder
5. Pin 🎯 Trigger Happy to your toolbar

## Keyboard shortcut

The toggle hotkey (`Alt+Shift+X` by default) is **not assigned automatically** on modern Chrome (138+ stopped applying `suggested_key` on install) — and reloading an unpacked extension can drop an existing binding. To set it:

1. Open `chrome://extensions/shortcuts`
2. Find **Trigger Happy → Toggle the crosshair overlay**
3. Click the input box and press `Alt+Shift+X` (or any combo you prefer)

The popup shows your current binding and shows a warning banner (plus an orange `!` badge) when none is set. On Linux, avoid combos your desktop environment uses — `Alt+Shift` is sometimes bound to keyboard-layout switching, which eats the keypress before Chrome sees it.

## Usage

1. Set the hotkey (above), then press it with a web page focused to toggle the crosshair
2. Open the popup to pick a style, color, and tuning — changes apply live
3. Use **This site → Hide crosshair on …** to exclude individual sites

Settings sync across your Chrome profile via `chrome.storage.sync`.

## Project layout

```
trigger-happy/
├── manifest.json            # Manifest V3
├── icons/                   # generated PNGs (scripts/gen-icons.js)
├── src/
│   ├── shared/render.js     # crosshair SVG renderer + defaults (shared by popup & content script)
│   ├── content/content.js   # shadow-DOM overlay injected into every page/frame
│   ├── background/background.js  # service worker: defaults, badge, Alt+Shift+X toggle
│   └── popup/               # customization UI
└── scripts/gen-icons.js     # regenerates icons (node scripts/gen-icons.js)
```

## Packaging for the Web Store

```bash
git archive --format=zip --prefix=trigger-happy/ -o trigger-happy-1.0.0.zip HEAD
```

## Fair play

A visual overlay gives you a consistent reference point; it does not read game memory, inject code into games, or automate anything. That said, always check the rules of the game/lobby you're playing in — some competitive environments treat overlays as cheating. Use responsibly.

## License

[MIT](LICENSE)