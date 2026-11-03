// Presentation anchors used by the web destination cards.
const anchors: Record<string, string> = {
  "victoria_falls.webp": "victoria-falls", "great_zimbabwe.jpeg": "great-zimbabwe",
  "kariba_dam.webp": "kariba", "balancing_rocks.jpg": "balancing-rocks",
  "dest_hwange.png": "hwange", "dest_matobo.jpg": "matobo",
  "mutarazi_falls.jpg": "eastern-highlands", "dest_mana_pools.jpg": "mana-pools",
  "dest_nyanga.jpg": "nyanga", "dest_gonarezhou.jpg": "gonarezhou",
};
export function tourismDestinationAnchor(image: string) {
  return anchors[image.split("/").at(-1) || ""];
}
