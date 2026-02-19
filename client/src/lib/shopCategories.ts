export type ShopBaseCategory = "sports" | "crafts" | "food";

export type ShopSegmentKey =
  | "beverages"
  | "cereals"
  | "sauces_spices"
  | "snacks"
  | "oils_spreads"
  | "proteins"
  | "crafts"
  | "apparel";

export type ShopCategoryConfig = {
  key: ShopSegmentKey;
  baseCategory: ShopBaseCategory;
  title: string;
  description: string;
  images: string[];
  keywords: string[];
};

export const SHOP_CATEGORY_CONFIG: ShopCategoryConfig[] = [
  {
    key: "beverages",
    baseCategory: "food",
    title: "Beverages",
    description: "Mazoe, Maheu, and other homegrown drink favorites.",
    images: [
      "/images/pages/shop/food_mazoe.jpg",
      "/images/pages/shop/food_mazoe.jpg",
      "/images/pages/shop/food_mazoe.jpg",
      "/images/pages/shop/food_mazoe.jpg",
      "/images/pages/shop/food_mazoe.jpg",
    ],
    keywords: ["mazoe", "maheu", "drink", "beverage", "cordial", "juice"],
  },
  {
    key: "cereals",
    baseCategory: "food",
    title: "Cereals & Breakfast",
    description: "Cerevita blends and everyday breakfast staples.",
    images: [
      "/images/pages/shop/food_cerevita1.png",
      "/images/pages/shop/food_cerevita1.png",
      "/images/pages/shop/food_cerevita1.png",
      "/images/pages/shop/food_cerevita1.png",
      "/images/pages/shop/food_cerevita1.png",
    ],
    keywords: ["cerevita", "cereal", "corn", "wheat", "banana", "malt", "breakfast"],
  },
  {
    key: "sauces_spices",
    baseCategory: "food",
    title: "Sauces & Spices",
    description: "Madras curry, peri-peri sauces, and flavor essentials.",
    images: [
      "/images/pages/shop/food_dovi1.webp",
      "/images/pages/shop/food_dovi1.webp",
      "/images/pages/shop/food_dovi1.webp",
      "/images/pages/shop/food_dovi1.webp",
      "/images/pages/shop/food_dovi1.webp",
    ],
    keywords: ["curry", "sauce", "spice", "seasoning", "royco", "peri peri", "masala", "madras"],
  },
  {
    key: "snacks",
    baseCategory: "food",
    title: "Snacks & Treats",
    description: "Maputi, biscuits, and nostalgic grab-and-go bites.",
    images: [
      "/images/pages/shop/food_maputi.png",
      "/images/pages/shop/food_maputi.png",
      "/images/pages/shop/food_maputi.png",
      "/images/pages/shop/food_maputi.png",
      "/images/pages/shop/food_maputi.png",
    ],
    keywords: ["maputi", "biscuit", "cream", "snack", "pie", "treat"],
  },
  {
    key: "oils_spreads",
    baseCategory: "food",
    title: "Cooking Oils & Spreads",
    description: "Everyday cooking oils and pantry spread essentials.",
    images: [
      "/images/pages/shop/food_dovi1.webp",
      "/images/pages/shop/food_dovi1.webp",
      "/images/pages/shop/food_dovi1.webp",
      "/images/pages/shop/food_dovi1.webp",
      "/images/pages/shop/food_dovi1.webp",
    ],
    keywords: ["oil", "sunflower", "jam", "spread", "butter", "cooking"],
  },
  {
    key: "proteins",
    baseCategory: "food",
    title: "Protein & Pantry",
    description: "Kapenta and protein-rich staples for family meals.",
    images: [
      "/images/pages/shop/food_kapenta1.jpg",
      "/images/pages/shop/food_kapenta1.jpg",
      "/images/pages/shop/food_kapenta1.jpg",
      "/images/pages/shop/food_kapenta1.jpg",
      "/images/pages/shop/food_kapenta1.jpg",
    ],
    keywords: ["kapenta", "fish", "meat", "beef", "pork", "protein"],
  },
  {
    key: "crafts",
    baseCategory: "crafts",
    title: "Arts & Crafts",
    description: "Authentic artisan pieces rooted in Zimbabwean heritage.",
    images: [
      "/images/pages/shop/crafts_stone_sculptures1.png",
      "/images/pages/shop/crafts_stone_sculptures2.jpg",
      "/images/pages/shop/crafts_stone_sculptures3.jpg",
      "/images/pages/shop/crafts_binga_baskets1.jpg",
      "/images/pages/shop/crafts_beaded_jewelry1.jpg",
    ],
    keywords: ["basket", "sculpture", "beaded", "craft", "jewelry", "jewellery", "stone"],
  },
  {
    key: "apparel",
    baseCategory: "sports",
    title: "Sports Apparel",
    description: "Rugby, cricket, and football fan kits.",
    images: [
      "/images/pages/shop/sports_rugby_jersey.jpg",
      "/images/pages/shop/sports_cricket_jersey.png",
      "/images/pages/shop/sports_football_jersey.png",
      "/images/pages/shop/sports_rugby_jersey.jpg",
      "/images/pages/shop/sports_cricket_jersey.png",
    ],
    keywords: ["kit", "jersey", "rugby", "cricket", "football", "sports", "apparel"],
  },
];
