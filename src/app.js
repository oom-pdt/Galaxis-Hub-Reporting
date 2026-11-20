// Galaxis Hub Reporting — start-up. Loaded last, after the Reports module has registered its screens.

function initApp() {
  devScreens.sort((a, b) => (a.group === b.group ? 0 : a.group === 'Agency' ? -1 : 1));
  devRecordToggleDefaults();
  // Open the screen in the link, if any (syncUrl replaces rather than pushes until start-up is done).
  if (!applyRoute(location.hash)) render();
  urlReplace = false;
}

initApp();
