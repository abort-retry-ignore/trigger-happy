/*
 * Trigger Happy — service worker.
 * Seeds default settings, updates the action badge, and handles the
 * toggle-crosshair keyboard command.
 */

const DEFAULTS = {
  enabled: true,
  style: 'crossGap',
  color: '#00e676',
  size: 24,
  thickness: 2,
  gap: 6,
  opacity: 0.9,
  outline: true,
  hiddenSites: {}
};

function updateBadge() {
  chrome.storage.sync.get({ settings: DEFAULTS }, ({ settings }) => {
    const on = !!settings.enabled;
    chrome.action.setBadgeText({ text: on ? 'ON' : '' });
    chrome.action.setBadgeBackgroundColor({ color: on ? '#1b5e20' : '#616161' });
  });
}

chrome.runtime.onInstalled.addListener(async () => {
  const { settings } = await chrome.storage.sync.get({ settings: null });
  if (!settings) {
    await chrome.storage.sync.set({ settings: DEFAULTS });
  }
  updateBadge();
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'toggle-crosshair') return;
  const { settings } = await chrome.storage.sync.get({ settings: DEFAULTS });
  await chrome.storage.sync.set({ settings: { ...settings, enabled: !settings.enabled } });
});

chrome.storage.onChanged.addListener((_changes, area) => {
  if (area === 'sync') updateBadge();
});

updateBadge();