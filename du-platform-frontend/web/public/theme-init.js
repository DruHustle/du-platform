// Apply before the first paint, without inline script or relaxed CSP rules.
(function () {
  var preference = "system";
  try {
    var saved = window.localStorage.getItem("theme");
    if (saved === "light" || saved === "dark" || saved === "system")
      preference = saved;
  } catch (_) {
    /* Storage is optional. */
  }
  var dark =
    preference === "dark" ||
    (preference === "system" &&
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", Boolean(dark));
  document.documentElement.dataset.themePreference = preference;
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", dark ? "#0f172a" : "#f8fafb");
})();
