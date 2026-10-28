// Stable anchors do not depend on the selected UI language.
export const TOURISM_SEARCH_DESTINATIONS = [
  {
    title: "Victoria Falls",
    id: "victoria-falls",
    aliases: ["vic falls", "waterfall", "livingstone"],
    images: ["victoria_falls.webp"],
  },
  {
    title: "Great Zimbabwe",
    id: "great-zimbabwe",
    aliases: ["masvingo", "heritage", "ruins"],
    images: ["great_zimbabwe.jpeg"],
  },
  {
    title: "Lake Kariba",
    id: "kariba",
    aliases: ["kariba dam", "lake", "fishing"],
    images: ["kariba_dam.webp"],
  },
  {
    title: "Balancing Rocks",
    id: "balancing-rocks",
    aliases: ["harare", "epworth"],
    images: ["balancing_rocks.jpg"],
  },
  {
    title: "Hwange National Park",
    id: "hwange",
    aliases: ["hwange", "wildlife", "safari"],
    images: ["dest_hwange.png"],
  },
  {
    title: "Matobo National Park",
    id: "matobo",
    aliases: ["matobo", "bulawayo"],
    images: ["dest_matobo.jpg"],
  },
  {
    title: "Eastern Highlands",
    id: "eastern-highlands",
    aliases: ["mutare", "mutarazi", "mountains"],
    images: ["mutarazi_falls.jpg"],
  },
  {
    title: "Mana Pools",
    id: "mana-pools",
    aliases: ["zambezi", "wildlife"],
    images: ["dest_mana_pools.jpg"],
  },
  {
    title: "Nyanga National Park",
    id: "nyanga",
    aliases: ["nyanga", "mount nyangani"],
    images: ["dest_nyanga.jpg"],
  },
  {
    title: "Gonarezhou National Park",
    id: "gonarezhou",
    aliases: ["gonarezhou", "chilojo"],
    images: ["dest_gonarezhou.jpg"],
  },
];
export function tourismDestinationAnchor(image: string) {
  return TOURISM_SEARCH_DESTINATIONS.find(d =>
    d.images.some(name => image.endsWith("/" + name))
  )?.id;
}
