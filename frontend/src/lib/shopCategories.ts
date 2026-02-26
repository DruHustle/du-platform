export type ShopBaseCategory = "sports" | "crafts" | "food"| "beverages";

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
      "/images/pages/shop/beverage_mazoe_blackberry_1.png",
      "/images/pages/shop/beverage_mazoe_creamsoda_1.png",
      "/images/pages/shop/beverage_mazoe_orange_1.png",
      "/images/pages/shop/beverage_mazoe_orange_6.png",
      "/images/pages/shop/beverage_mazoe_raspberry_1.png",
      "/images/pages/shop/beverage_mazoe_raspberry_6.png",
      "/images/pages/shop/beverage_pfuko_1.png",
      "/images/pages/shop/beverage_pfuko_12.png",
      
    ],
    keywords: ["mazoe", "maheu", "drink", "pfuko", "beverage", "cordial", "juice"],
  },
  {
    key: "cereals",
    baseCategory: "food",
    title: "Cereals & Breakfast",
    description: "Cerevita blends and everyday breakfast staples.",
    images: [
      "/images/pages/shop/food_cerevita_choco_malt_1.png",
      "/images/pages/shop/food_cerevita_corn_banana_1.png",
      "/images/pages/shop/food_cerevita_corn_wheat_1.png",
  
    ],
    keywords: ["cerevita", "cereal", "corn", "wheat", "banana", "malt", "breakfast"],
  },
  {
    key: "sauces_spices",
    baseCategory: "food",
    title: "Sauces & Spices",
    description: "Madras curry, peri-peri sauces, and flavor essentials.",
    images: [

      "/images/pages/shop/food_periperi_1.png",
      "/images/pages/shop/food_royco_beef_1.png",
       "/images/pages/shop/food_curry_mild_1.png",
      "/images/pages/shop/food_curry_hot_1.png",
    
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
      "/images/pages/shop/food_pork_pie_1.png",
      "/images/pages/shop/food_dried_mango_1.jpg",
    
    ],
    keywords: ["maputi", "biscuit", "creams", "snack", "pie", "treat"],
  },
  {
    key: "oils_spreads",
    baseCategory: "food",
    title: "Spreads",
    description: "Everyday pantry spread essentials.",
    images: [
     "/images/pages/shop/food_sunjam_1.png",
    "/images/pages/shop/food_mama_dovi_1.png",
    ],
    keywords: [ "jam", "spread", "butter",],
  },
  {
    key: "proteins",
    baseCategory: "food",
    title: "Protein & Pantry",
    description: "Kapenta and protein-rich staples for family meals.",
    images: [
      "/images/pages/shop/food_kapenta_1.jpg",
      "/images/pages/shop/food_madora_1.png",
  
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
