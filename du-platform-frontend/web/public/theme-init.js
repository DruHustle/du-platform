// Retire the old appearance preference without clearing other visitor settings.
try {
  localStorage.removeItem("theme");
} catch {
  // Storage can be unavailable in private browsing.
}
