import { useState, useEffect, useMemo } from "react";
import Layout from "@/components/Layout";
import ContactForm from "@/components/ContactForm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MapPin, Calendar, Shield, CreditCard, Award, CheckCircle2, Brain, Sparkles, Globe, Building2, Car, Globe2, Heart, Dog, TrendingUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import SubPageHero from "@/components/SubPageHero";
import { Link } from "wouter";

type Attraction = {
  name: string;
  image: string;
  highlights: string[];
  summary: string;
  quickFacts: string[];
  experiences: string[];
  bestTime: string;
  sourceLinks: Array<{ label: string; url: string }>;
};

export default function Tourism() {
  const { t } = useTranslation();
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
  const [selectedAttraction, setSelectedAttraction] = useState<Attraction | null>(null);
  const [conversationIndex, setConversationIndex] = useState(0);
  const [showConversationAnswer, setShowConversationAnswer] = useState(false);
  const getTranslatedList = (key: string, fallback: string[]) => {
    const value = t(key, { returnObjects: true });
    return Array.isArray(value) && value.length > 0 ? (value as string[]) : fallback;
  };
  const tx = (key: string, fallback: string) => t(key, { defaultValue: fallback });

  const heroSlides = useMemo(() => [
    {
      image: "/images/pages/tourism/victoria_falls.jpg",
      badge: t('tourism.hero.badge1') || "Visit Zimbabwe",
      badgeIcon: Globe,
      title: t('tourism.hero.title1') || "Discover the Majesty",
      titleHighlight: t('tourism.hero.highlight1') || "World-Class Beauty",
      subtitle: t('tourism.hero.subtitle1') || "From Victoria Falls to Great Zimbabwe, experience the heart of Africa.",
      buttons: [
        { text: t('tourism.hero.book_trip') || "Book Trip", variant: "primary", link: "/onesa-ai-book-trip" },
        { text: t('tourism.hero.virtual_center') || "Virtual Reality Center", variant: "outline", link: "/onesa-ai-tourism-virtual-experience", showArrow: true },
        { text: t('tourism.hero.local_guide_ar') || "Local AR Experience", variant: "outline", link: "/onesa-ai-tourism-augmented-experience", showArrow: true }
      ]
    },
    {
      image: "/images/pages/shop/zimbabwe_shop_hero.jpg",
      badge: t('tourism.hero.badge2') || "Cultural Heritage",
      badgeIcon: Award,
      title: t('tourism.hero.title2') || "Rich History",
      subtitle: t('tourism.hero.subtitle2') || "Explore ancient civilizations and vibrant modern culture.",
      buttons: [
        { text: t('tourism.hero.book_trip') || "Book Trip", variant: "primary", link: "/onesa-ai-book-trip" }
      ]
    },
    {
      image: "/images/pages/wikimedia/african-elephant.jpg",
      badge: t('tourism.hero.badge3') || "Adventure",
      badgeIcon: Car,
      title: t('tourism.hero.title3') || "Wildlife & Safari",
      subtitle: t('tourism.hero.subtitle3') || "Unforgettable encounters in pristine national parks.",
      buttons: [
        { text: t('tourism.hero.virtual_center') || "Virtual Reality Center", variant: "outline", link: "/onesa-ai-tourism-virtual-experience", showArrow: true }
      ]
    },
    {
      image: "/images/pages/tourism/great_zimbabwe.jpeg",
      badge: t('tourism.hero.badge4') || "Historical Site",
      badgeIcon: Building2,
      title: t('tourism.hero.title4') || "Great Zimbabwe",
      subtitle: t('tourism.hero.subtitle4') || "Ancient stone ruins showcasing medieval African civilization.",
      buttons: [
        { text: t('tourism.hero.local_guide_ar') || "Local AR Experience", variant: "outline", link: "/onesa-ai-tourism-augmented-experience", showArrow: true }
      ]
    }
    ,
    {
      image: "/images/pages/tourism/cheetah.png",
      badge: t('tourism.hero.badge3') || "Adventure",
      badgeIcon: Dog,
      title: t('tourism.hero.title3') || "Wildlife & Safari",
      subtitle: t('tourism.hero.subtitle3') || "Unforgettable encounters in pristine national parks.",
      buttons: [
        { text: t('tourism.hero.book_trip') || "Book Trip", variant: "primary", link: "/onesa-ai-book-trip" }
      ]
    },
    {
      image: "/images/pages/tourism/mana_pools.jpg",
      badge: t("tourism.hero.badge6") || "UNESCO Wilderness",
      badgeIcon: Globe2,
      title: t("tourism.hero.title6") || "Mana Pools Experience",
      subtitle: t("tourism.hero.subtitle6") || "River-fed plains, walking safaris, and premium wildlife viewing in one of Africa's iconic landscapes.",
      buttons: [
        { text: t('tourism.hero.virtual_center') || "Virtual Reality Center", variant: "outline", link: "/onesa-ai-tourism-virtual-experience", showArrow: true }
      ]
    },
    {
      image: "/images/pages/tourism/dest_hwange.png",
      badge: t("tourism.hero.badge7") || "National Parks",
      badgeIcon: Shield,
      title: t("tourism.hero.title7") || "Hwange Wildlife Corridor",
      subtitle: t("tourism.hero.subtitle7") || "Zimbabwe's largest national park, known for elephant herds and strong safari potential.",
      buttons: [
        { text: t('tourism.hero.local_guide_ar') || "Local AR Experience", variant: "outline", link: "/onesa-ai-tourism-augmented-experience", showArrow: true }
      ]
    },
    {
      image: "/images/pages/tourism/kariba_sunset.jpg",
      badge: t("tourism.hero.badge8") || "Lake & Leisure",
      badgeIcon: TrendingUp,
      title: t("tourism.hero.title8") || "Kariba Adventure Tourism",
      subtitle: t("tourism.hero.subtitle8") || "Houseboats, sport fishing, and scenic cruises continue to attract regional and international visitors.",
      buttons: [
        { text: t('tourism.hero.book_trip') || "Book Trip", variant: "primary", link: "/onesa-ai-book-trip" }
      ]
    }
  
  ], [t]);

  useEffect(() => {
    const heroTimer = setInterval(() => {
      setCurrentHeroIndex((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(heroTimer);
  }, [heroSlides.length]);

  const phoneConversation = useMemo(
    () => [
      {
        question: tx(
          "tourism.onesa.phone_conversation.q1",
          "Onesa, what's the best local spot for traditional Sadza in Harare tonight?"
        ),
        answer: tx(
          "tourism.onesa.phone_conversation.a1",
          "For an authentic Sadza experience in Harare, head to Mbare Musika. The local vendors there serve up delicious, freshly made Sadza with a variety of tasty relishes. It's a favorite among locals and offers a true taste of Zimbabwean cuisine. Just ask for 'Sadza ne Nyama' (Sadza with meat) for a hearty meal!"
        ),
      },
      {
        question: tx(
          "tourism.onesa.phone_conversation.q2",
          "Great. Is it safe to go there at night, and what time should I arrive?"
        ),
        answer: tx(
          "tourism.onesa.phone_conversation.a2",
          "Aim for early evening, ideally before 8:00 PM, and use a trusted ride service. For first-time visitors, going with a local guide or friend is best for a smoother experience."
        ),
      },
      {
        question: tx(
          "tourism.onesa.phone_conversation.q3",
          "Can you suggest one backup restaurant near the city center if it's too crowded?"
        ),
        answer: tx(
          "tourism.onesa.phone_conversation.a3",
          "Yes. Try a traditional restaurant in Avondale or the CBD that serves Sadza, beef stew, and leafy greens. Ask for fresh-cooked meals and local relishes for the most authentic plate."
        ),
      },
      {
        question: tx(
          "tourism.onesa.phone_conversation.q4",
          "Perfect. Add transport advice and a rough dinner budget for two."
        ),
        answer: tx(
          "tourism.onesa.phone_conversation.a4",
          "Plan around USD 20 to USD 35 for two, depending on drinks and sides. For transport, use registered taxis or app rides, share your live location, and keep your return trip booked in advance."
        ),
      },
    ],
    [t]
  );

  useEffect(() => {
    setShowConversationAnswer(false);

    const answerTimer = window.setTimeout(() => {
      setShowConversationAnswer(true);
    }, 1200);

    const nextConversationTimer = window.setTimeout(() => {
      setConversationIndex((prev) => (prev + 1) % phoneConversation.length);
    }, 7600);

    return () => {
      window.clearTimeout(answerTimer);
      window.clearTimeout(nextConversationTimer);
    };
  }, [conversationIndex, phoneConversation.length]);

  const introData = {
    icon: Heart,
    title: t('tourism.objective_title') || "Our Vision",
    description: t('tourism.objective_subtitle') || "To build a global gateway connecting Zimbabwe’s culture, products, tourism, and investment opportunities."
  };

  const attractions: Attraction[] = [
    {
      name: t('tourism.attractions.vicfalls.name') || "Victoria Falls",
      image: "/images/pages/tourism/victoria_falls.jpg",
      highlights: [
        t('tourism.attractions.vicfalls.h1') || "UNESCO World Heritage",
        t('tourism.attractions.vicfalls.h2') || "Adventure Hub",
        t('tourism.attractions.vicfalls.h3') || "Wildlife Viewing"
      ],
      summary: t('tourism.attractions.vicfalls.summary') || "Known locally as Mosi-oa-Tunya (The Smoke That Thunders), Victoria Falls is one of the largest waterfalls on earth and a flagship destination for Zimbabwe.",
      quickFacts: getTranslatedList("tourism.attractions.vicfalls.quickFacts", [
        "Located on the Zambezi River at the Zimbabwe-Zambia border.",
        "Approximate width is 1.7 km with a drop of over 100 m at its deepest sections.",
        "Protected within the Mosi-oa-Tunya / Victoria Falls World Heritage landscape."
      ]),
      experiences: getTranslatedList("tourism.attractions.vicfalls.experiences", [
        "Scenic viewpoints, rainforest walks, and photography trails.",
        "Adventure options such as rafting, bungee jumping, and helicopter flights.",
        "Nearby safari and river experiences in surrounding protected areas."
      ]),
      bestTime: t("tourism.attractions.vicfalls.bestTime") || "High-water spectacle is usually strongest from late rainy season into early dry season; lower-water months are often preferred for some adventure activities.",
      sourceLinks: [
        { label: t("tourism.attractions.vicfalls.sources.vf") || "ZTA: Victoria Falls", url: "https://zimbabwetourism.net/portfolios/victoria-falls/" },
        { label: t("tourism.attractions.vicfalls.sources.vfnp") || "ZTA: Victoria Falls National Park", url: "https://zimbabwetourism.net/portfolios/victoria-falls-national-park/" }
      ]
    },
    {
      name: t('tourism.attractions.greatzim.name') || "Great Zimbabwe",
      image: "/images/pages/tourism/great_zimbabwe.jpeg",
      highlights: [
        t('tourism.attractions.greatzim.h1') || "UNESCO World Heritage",
        t('tourism.attractions.greatzim.h2') || "Historical Site",
        t('tourism.attractions.greatzim.h3') || "Cultural Heritage"
      ],
      summary: t('tourism.attractions.greatzim.summary') || "Great Zimbabwe is the country's signature archaeological monument and one of the most important pre-colonial stone-built complexes in southern Africa.",
      quickFacts: getTranslatedList("tourism.attractions.greatzim.quickFacts", [
        "Constructed and expanded between the 11th and 15th centuries.",
        "Famous for dry-stone masonry built without mortar.",
        "Represents the political and cultural center of the historic Zimbabwe civilization."
      ]),
      experiences: getTranslatedList("tourism.attractions.greatzim.experiences", [
        "Explore the Hill Complex, Great Enclosure, and Valley Ruins.",
        "Interpretive historical tours and local cultural storytelling.",
        "Panoramic viewpoints over the wider Masvingo landscape."
      ]),
      bestTime: t("tourism.attractions.greatzim.bestTime") || "Accessible year-round; dry season months are generally better for walking and site exploration.",
      sourceLinks: [
        { label: t("tourism.attractions.greatzim.sources.gz") || "ZTA: Great Zimbabwe Ruins", url: "https://zimbabwetourism.net/portfolios/great-zimbabwe-ruins/" }
      ]
    },
    {
      name: t('tourism.attractions.kariba.name') || "Kariba Dam",
      image: "/images/pages/tourism/kariba_dam.webp",
      highlights: [
        t('tourism.attractions.kariba.h1') || "Water Sports",
        t('tourism.attractions.kariba.h2') || "Tiger Fishing",
        t('tourism.attractions.kariba.h3') || "Scenic Sunset"
      ],
      summary: t('tourism.attractions.kariba.summary') || "Lake Kariba is a major inland water destination known for houseboat tourism, fishing, and wildlife-rich shorelines.",
      quickFacts: getTranslatedList("tourism.attractions.kariba.quickFacts", [
        "Sits on the Zambezi corridor and supports both tourism and recreation.",
        "Popular for boat-based travel, fishing tourism, and sunset cruises.",
        "Connected to nearby wildlife areas including Matusadona-facing zones."
      ]),
      experiences: getTranslatedList("tourism.attractions.kariba.experiences", [
        "Houseboat holidays and shoreline lodges.",
        "Tiger fishing and birdwatching itineraries.",
        "Game-viewing combinations with lake and park circuits."
      ]),
      bestTime: t("tourism.attractions.kariba.bestTime") || "Dry season is typically preferred for wildlife viewing; lake activities operate across most of the year.",
      sourceLinks: [
        { label: t("tourism.attractions.kariba.sources.kariba") || "ZTA: Lake Kariba Recreational Park", url: "https://zimbabwetourism.net/portfolios/lake-kariba-recreational-park/" }
      ]
    },
    {
      name: t('tourism.attractions.rocks.name') || "Balancing Rocks",
      image: "/images/pages/tourism/balancing_rocks.jpg",
      highlights: [
        t('tourism.attractions.rocks.h1') || "National Symbol",
        t('tourism.attractions.rocks.h2') || "Photography",
        t('tourism.attractions.rocks.h3') || "Natural Wonder"
      ],
      summary: t('tourism.attractions.rocks.summary') || "Zimbabwe's balancing rocks are granite formations shaped over long geological periods and are closely linked to national identity.",
      quickFacts: getTranslatedList("tourism.attractions.rocks.quickFacts", [
        "Prominent around Matobo and other granite landscapes.",
        "Featured in national symbolism, including currency imagery.",
        "Formed through weathering and erosion of ancient granite outcrops."
      ]),
      experiences: getTranslatedList("tourism.attractions.rocks.experiences", [
        "Landscape photography and short nature walks.",
        "Rock-art and heritage combinations in Matobo areas.",
        "Scenic drives linking Harare and Matobo viewpoints."
      ]),
      bestTime: t("tourism.attractions.rocks.bestTime") || "Year-round attraction; clear dry-season weather often gives the best visibility for photos.",
      sourceLinks: [
        { label: t("tourism.attractions.rocks.sources.chiremba") || "ZTA: Chiremba Balancing Rocks", url: "https://zimbabwetourism.net/portfolios/chiremba-balancing-rocks/" },
        { label: t("tourism.attractions.rocks.sources.matobo") || "ZTA: Matobo Hills", url: "https://zimbabwetourism.net/portfolios/matobo-hills/" }
      ]
    },
  ];

  const otherAttractions: Attraction[] = [
    {
      name: t("tourism.other_attractions.hwange.name") || "Hwange National Park",
      image: "/images/pages/tourism/dest_hwange.png",
      highlights: getTranslatedList("tourism.other_attractions.hwange.highlights", ["Big Five", "Elephant Herds", "Safari"]),
      summary:
        t("tourism.other_attractions.hwange.desc") ||
        "Zimbabwe's largest park, famous for its massive elephant herds and diverse wildlife.",
      quickFacts: getTranslatedList("tourism.other_attractions.hwange.quickFacts", [
        "Located in western Zimbabwe and linked to major safari circuits.",
        "Known for one of Africa's largest elephant populations.",
        "Strong dry-season game viewing around pumped waterholes.",
      ]),
      experiences: getTranslatedList("tourism.other_attractions.hwange.experiences", [
        "Game drives and guided safari experiences.",
        "Birdwatching and photography-focused itineraries.",
        "Lodge and camp stays across multiple park zones.",
      ]),
      bestTime:
        t("tourism.other_attractions.hwange.bestTime") ||
        "Peak wildlife concentration is usually in the dry months when water sources are limited.",
      sourceLinks: [{ label: t("tourism.other_attractions.hwange.source") || "ZTA: Hwange", url: "https://zimbabwetourism.net/" }],
    },
    {
      name: t("tourism.other_attractions.matobo.name") || "Matobo National Park",
      image: "/images/pages/tourism/dest_matobo.jpg",
      highlights: getTranslatedList("tourism.other_attractions.matobo.highlights", ["UNESCO", "Rock Formations", "Heritage"]),
      summary:
        t("tourism.other_attractions.matobo.desc") ||
        "A UNESCO World Heritage site known for its balancing rocks and spiritual history.",
      quickFacts: getTranslatedList("tourism.other_attractions.matobo.quickFacts", [
        "Recognized for cultural landscapes and granite outcrops.",
        "Home to major historical and spiritual heritage sites.",
        "Important rhino and bird habitat in Zimbabwe.",
      ]),
      experiences: getTranslatedList("tourism.other_attractions.matobo.experiences", [
        "Rock-art and heritage tours.",
        "Scenic drives through granite formations.",
        "Wildlife tracking and cultural storytelling.",
      ]),
      bestTime:
        t("tourism.other_attractions.matobo.bestTime") ||
        "Accessible year-round; cooler dry months are ideal for walking and exploration.",
      sourceLinks: [
        {
          label: t("tourism.other_attractions.matobo.source") || "ZTA: Matobo",
          url: "https://zimbabwetourism.net/portfolios/matobo-hills/",
        },
      ],
    },
    {
      name: t("tourism.other_attractions.eastern_highlands.name") || "Eastern Highlands",
      image: "/images/pages/tourism/mutarazi_falls.jpg",
      highlights: getTranslatedList("tourism.other_attractions.eastern_highlands.highlights", ["Mountains", "Waterfalls", "Cool Climate"]),
      summary:
        t("tourism.other_attractions.eastern_highlands.desc") ||
        "A cool, mountainous region offering lush forests, waterfalls, and misty peaks.",
      quickFacts: getTranslatedList("tourism.other_attractions.eastern_highlands.quickFacts", [
        "Stretches along Zimbabwe's eastern border.",
        "Includes Nyanga, Vumba, and Chimanimani landscapes.",
        "Known for hiking, scenic lodges, and highland weather.",
      ]),
      experiences: getTranslatedList("tourism.other_attractions.eastern_highlands.experiences", [
        "Hiking and nature trails.",
        "Waterfall viewpoints and adventure activities.",
        "Mountain lodge retreats and weekend escapes.",
      ]),
      bestTime:
        t("tourism.other_attractions.eastern_highlands.bestTime") ||
        "Dry months generally offer clearer views and better trail conditions.",
      sourceLinks: [
        {
          label: t("tourism.other_attractions.eastern_highlands.source") || "ZTA: Eastern Highlands",
          url: "https://zimbabwetourism.net/",
        },
      ],
    },
    {
      name: t("tourism.other_attractions.mana_pools.name") || "Mana Pools",
      image: "/images/pages/tourism/dest_mana_pools.jpg",
      highlights: getTranslatedList("tourism.other_attractions.mana_pools.highlights", ["UNESCO", "Walking Safari", "Wilderness"]),
      summary:
        t("tourism.other_attractions.mana_pools.desc") ||
        "A remote UNESCO site famous for its river-fed pools and walking safaris.",
      quickFacts: getTranslatedList("tourism.other_attractions.mana_pools.quickFacts", [
        "Set along the lower Zambezi floodplain.",
        "Recognized globally for wilderness value and biodiversity.",
        "Strong seasonal game concentration in dry months.",
      ]),
      experiences: getTranslatedList("tourism.other_attractions.mana_pools.experiences", [
        "Guided walking safaris.",
        "Canoeing and river-based wildlife viewing.",
        "Premium low-impact safari camps.",
      ]),
      bestTime:
        t("tourism.other_attractions.mana_pools.bestTime") ||
        "Dry season is typically preferred for high-density wildlife viewing.",
      sourceLinks: [{ label: t("tourism.other_attractions.mana_pools.source") || "ZTA: Mana Pools", url: "https://zimbabwetourism.net/" }],
    },
    {
      name: t("tourism.other_attractions.nyanga.name") || "Nyanga National Park",
      image: "/images/pages/tourism/dest_nyanga.jpg",
      highlights: getTranslatedList("tourism.other_attractions.nyanga.highlights", ["Highlands", "Falls", "Scenic Drives"]),
      summary:
        t("tourism.other_attractions.nyanga.desc") ||
        "The 'Little Scotland' of Africa, home to Zimbabwe's highest peak and deepest falls.",
      quickFacts: getTranslatedList("tourism.other_attractions.nyanga.quickFacts", [
        "Includes Mount Nyangani and major highland attractions.",
        "Popular for cooler climate tourism and mountain scenery.",
        "Important domestic and regional leisure destination.",
      ]),
      experiences: getTranslatedList("tourism.other_attractions.nyanga.experiences", [
        "Hiking and mountain viewpoints.",
        "Trout fishing and outdoor recreation.",
        "Road trips across highland circuits.",
      ]),
      bestTime:
        t("tourism.other_attractions.nyanga.bestTime") ||
        "Year-round destination; clear weather periods are best for mountain views.",
      sourceLinks: [{ label: t("tourism.other_attractions.nyanga.source") || "ZTA: Nyanga", url: "https://zimbabwetourism.net/" }],
    },
    {
      name: t("tourism.other_attractions.gonarezhou.name") || "Gonarezhou",
      image: "/images/pages/tourism/dest_gonarezhou.jpg",
      highlights: getTranslatedList("tourism.other_attractions.gonarezhou.highlights", ["Chilojo Cliffs", "Elephants", "Wild Frontier"]),
      summary:
        t("tourism.other_attractions.gonarezhou.desc") ||
        "The 'Place of Elephants,' characterized by the stunning red Chilojo Cliffs.",
      quickFacts: getTranslatedList("tourism.other_attractions.gonarezhou.quickFacts", [
        "Major transfrontier conservation destination in southeastern Zimbabwe.",
        "Known for remote, low-traffic wilderness experiences.",
        "Home to significant elephant and predator populations.",
      ]),
      experiences: getTranslatedList("tourism.other_attractions.gonarezhou.experiences", [
        "Remote game drives and wilderness camping.",
        "Photography around Chilojo Cliffs and river corridors.",
        "Cross-border circuit planning with nearby regional parks.",
      ]),
      bestTime:
        t("tourism.other_attractions.gonarezhou.bestTime") ||
        "Dry months are usually best for access and concentrated wildlife viewing.",
      sourceLinks: [{ label: t("tourism.other_attractions.gonarezhou.source") || "ZTA: Gonarezhou", url: "https://zimbabwetourism.net/" }],
    },
  ];

  const planningInfo = [
    { icon: MapPin, title: t('tourism.planning.visa.title') || "Visa Requirements", description: t('tourism.planning.visa.desc') || "Essential entry information for international travelers.", details: [t('tourism.planning.visa.d1') || "e-Visa application system available", t('tourism.planning.visa.d2') || "Visa on arrival for many nationalities", t('tourism.planning.visa.d3') || "Valid passport (6 months) required"] },
    { icon: Shield, title: t('tourism.planning.health.title') || "Health & Safety", description: t('tourism.planning.health.desc') || "Stay healthy and safe during your Zimbabwean adventure.", details: [t('tourism.planning.health.d1') || "Yellow fever certificate if applicable", t('tourism.planning.health.d2') || "Malaria prophylaxis recommended", t('tourism.planning.health.d3') || "Comprehensive travel insurance advised"] },
    { icon: CreditCard, title: t('tourism.planning.payment.title') || "Currency & Payments", description: t('tourism.planning.payment.desc') || "Navigating the local financial landscape.", details: [t('tourism.planning.payment.d1') || "Multi-currency system (USD widely accepted)", t('tourism.planning.payment.d2') || "Visa and Mastercard accepted in major hotels", t('tourism.planning.payment.d3') || "Mobile money (EcoCash) widely used"] },
    { icon: Calendar, title: t('tourism.planning.time.title') || "Best Time to Visit", description: t('tourism.planning.time.desc') || "Timing your trip for the best experience.", details: [t('tourism.planning.time.d1') || "May to October for wildlife viewing", t('tourism.planning.time.d2') || "February to May for Victoria Falls", t('tourism.planning.time.d3') || "Pleasant year-round temperate climate"] }
  ];

  const onesaTouristFeatures = [
    { icon: Brain, title: t('tourism.onesa.guide.title') || "Local Insights", description: t('tourism.onesa.guide.desc') || "Understand local etiquette, tipping culture, and social norms." },
    { icon: MapPin, title: t('tourism.onesa.navigate.title') || "Smart Navigation", description: t('tourism.onesa.navigate.desc') || "Find the best routes and hidden spots known only to locals." },
    { icon: Calendar, title: t('tourism.onesa.plan.title') || "Custom Itineraries", description: t('tourism.onesa.plan.desc') || "AI-generated plans based on your interests and travel style." }
  ];

  return (
    <Layout>
      {/* Hero Section */}
      <section id="hero">
        <SubPageHero heroSlides={heroSlides} intro={introData} />
      </section>

      {/* Key Attractions - Cinematic Glass Grid */}
      <section id="attractions" className="p-5 bg-slate-950 relative overflow-hidden">
        <div className="container relative z-10 px-6 mx-auto">
          <div className="outer-glass-panel rounded-[2rem] border border-white/10 bg-white/[0.02] p-8 md:p-10">
            <div className="mb-10 text-center">
              <h2 className="section-title-compact">{t("tourism.attractions_title") || "Must-Visit Destinations"}</h2>
              <p className="mt-4 text-left text-sm text-white/75 font-light leading-relaxed">
                {t("tourism.intro.p1") ||
                  "Zimbabwe is crafted for discovery, from world-famous waterfalls and ancient stone cities to safari frontiers and lake adventures. Guided by the ZimBho tourism vision and the national brand promise, Zimbabwe: A World of Wonders, every route can combine landscapes, story, culture, and unforgettable hospitality."}
              </p>
              <p className="mt-3 text-left text-sm text-white/75 font-light leading-relaxed">
                {t("tourism.intro.p2_before_ar") || "When you are onsite, use Onesa's"}{" "}
                <span className="text-zim-gold font-semibold">{t("tourism.intro.local_guide_ar") || "Local guide AR"}</span>{" "}
                {t("tourism.intro.p2_after_ar") ||
                  "feature for a full AI-powered AR experience. You can also visit our AI-powered Virtual Experience Center to preview destinations before your trip."}
              </p>
              <p className="mt-3 text-left text-sm text-white/75 font-light leading-relaxed">
                {t("tourism.intro.p3_before_gastro") || "Zimbabwe's"}{" "}
                <span className="text-zim-gold font-semibold">{t("tourism.intro.gastronomy_tourism") || "gastronomy tourism"}</span>{" "}
                {t("tourism.intro.p3_between") ||
                  "is also a core part of the journey: from traditional dishes like sadza with nyama and muriwo, to freshwater fish from Kariba, local coffee routes in the Eastern Highlands, and market-to-table food experiences in major cities."}{" "}
                <span className="text-zim-gold font-semibold">{t("tourism.intro.cultural_tourism") || "Cultural tourism"}</span>{" "}
                {t("tourism.intro.p3_after_cultural") ||
                  "adds another layer through living heritage traditions, community storytelling, mbira and dance performances, contemporary stone sculpture, and historical sites that connect visitors to the country's identity across generations. Wildlife tourism completes the experience with Big Five and birding circuits, guided safari drives in Hwange and Mana Pools, and conservation-led encounters across Zimbabwe's national parks and protected landscapes."}
              </p>
              <div className="mt-6 flex justify-center">
                <Button asChild className="bg-zim-gold text-zim-black hover:bg-white transition-all px-7 py-2 h-auto rounded-full font-black text-[10px] uppercase tracking-[0.2em]">
                  <Link href="/onesa-ai-tourism-virtual-experience">
                    {t("tourism.intro.virtual_experience_center_cta") || "Virtual Experience Center"}
                  </Link>
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {attractions.map((attraction, index) => (
                <motion.div key={index} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                  <button type="button" className="block w-full text-left" onClick={() => setSelectedAttraction(attraction)}>
                    <div className="group relative h-[450px] rounded-[2rem] overflow-hidden border border-white/10 bg-white/[0.02] shadow-[0_20px_50px_rgba(0,0,0,0.3)] transition-all duration-500 hover:-translate-y-2 cursor-pointer">
                      <img src={attraction.image} className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1500ms] group-hover:scale-110 saturate-[0.8]" />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
                      
                      <div className="absolute inset-0 p-8 flex flex-col justify-end">
                        <h3 className="text-lg font-black text-white tracking-tight mb-4 group-hover:text-zim-gold transition-colors">{attraction.name}</h3>
                        <div className="flex flex-wrap gap-2 mb-6">
                          {attraction.highlights.map((highlight, idx) => (
                            <span key={idx} className="text-[10px] font-black uppercase tracking-widest bg-white/10 backdrop-blur-xl text-white/80 px-3 py-1 rounded-full border border-white/10">
                              {highlight}
                            </span>
                          ))}
                        </div>
                        <p className="text-sm text-white/70 font-light leading-relaxed line-clamp-2 group-hover:text-white transition-colors">{attraction.summary}</p>
                        <p className="text-[10px] text-zim-gold/90 mt-3 font-black uppercase tracking-widest">
                          {t("tourism.attraction_card.tap_for_details") || "Tap for more details"}
                        </p>
                      </div>
                    </div>
                  </button>
                </motion.div>
              ))}
            </div>

            {/* Other Destinations - Compact Glass Grid */}
            <div className="pt-10">
              <div className="mb-10 text-center">
                <h2 className="section-title-compact mb-3">{t("tourism.other_attractions_title") || "Other Incredible Destinations"}</h2>
                <p className="text-sm text-white/75 max-w-3xl mx-auto font-light leading-relaxed">{t("tourism.other_attractions_subtitle") || "Beyond the iconic landmarks, Zimbabwe offers diverse landscapes and wildlife experiences across the country."}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {otherAttractions.map((dest, i) => (
                  <motion.div key={i} whileHover={{ y: -5 }} className="rounded-[1.5rem] border border-white/10 bg-white/[0.02] overflow-hidden group">
                    <button type="button" className="block cursor-pointer w-full text-left" onClick={() => setSelectedAttraction(dest)}>
                      <div className="h-44 overflow-hidden relative">
                        <img src={dest.image} className="w-full h-full object-cover grayscale-[0.4] group-hover:grayscale-0 transition-all duration-700" />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 to-transparent" />
                      </div>
                      <div className="p-5">
                        <h4 className="text-base font-bold text-white mb-2 group-hover:text-zim-gold transition-colors">{dest.name}</h4>
                        <p className="text-xs text-white/70 leading-snug font-light">{dest.summary}</p>
                        <p className="text-[10px] text-zim-gold/90 mt-3 font-black uppercase tracking-widest">
                          {t("tourism.attraction_card.tap_for_details") || "Tap for more details"}
                        </p>
                      </div>
                    </button>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Onesa AI Tourist Companion Section - Glassy UI Upgrade */}
      <section className="p-5 bg-slate-950 relative overflow-hidden">
        <div className="container relative z-10 px-6 mx-auto">
          <div className="outer-glass-panel rounded-[2rem] border border-white/10 bg-white/[0.02] p-8 md:p-10">
            <div className="mb-10 text-center">
              <h2 className="section-title-compact">{t('tourism.onesa.title') || "Your Local Guide in Your Pocket"}</h2>
              <p className="text-sm text-white/75 max-w-3xl mx-auto mt-4 font-light leading-relaxed">
                {t('tourism.onesa.subtitle') || "Navigating Zimbabwe can be complex. Onesa AI understands local travel dynamics and practical on-the-ground context to keep your trip seamless."}
              </p>
            </div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="relative p-8 md:p-10 rounded-[2rem] overflow-hidden border border-white/5 bg-white/[0.01] group"
            >
             {/* The Crispy Edge Finish */}
             <span className="absolute inset-0 rounded-[2rem] border border-white/5 pointer-events-none" />
            
             <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
              {/* Left Column */}
              <div className="lg:col-span-6 space-y-8">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-zim-gold/10 rounded-xl border border-zim-gold/20">
                    <Sparkles className="h-5 w-5 text-zim-gold" />
                  </div>
                  <Badge variant="outline" className="border-zim-gold/40 text-zim-gold px-3 py-0.5 text-[10px] font-black uppercase tracking-widest">
                    {t('tourism.onesa.badge') || "Onesa AI Companion"}
                  </Badge>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-black text-white leading-tight">{t('tourism.onesa.companion_title') || "From booking flights,accurate weather information or discovering local gems, Onesa AI has you covered"}</h3>
                  <p className="text-sm text-white/70 leading-relaxed font-light">{t('tourism.onesa.companion_subtitle') || "Onesa AI helps you plan your trip and navigate the ins and outs once you're here. From understanding local etiquette to finding hidden gems, Onesa is your perfect travel companion."}</p>
                  <p className="text-sm text-white/70 leading-relaxed font-light">
                    {t("tourism.onesa.personalized_experience") ||
                      "Personalised experience. - powerful recommendation engine providing information that makes your travel unique and unforgettable."}
                  </p>
                </div>

                <div className="space-y-3">
                  {onesaTouristFeatures.map((feature, idx) => {
                    const Icon = feature.icon;
                    return (
                      <div key={idx} className="flex items-center gap-4 rounded-[2rem] border border-white/5 bg-white/[0.01] p-7">
                        <div className="p-2 rounded-xl bg-zim-gold/10 border border-zim-gold/20">
                          <Icon className="h-5 w-5 text-zim-gold" />
                        </div>
                        <div>
                          <h4 className="text-lg font-black text-white tracking-tight">{feature.title}</h4>
                          <p className="text-white/70 text-sm leading-relaxed">{feature.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="grid w-full grid-cols-1 gap-2 md:grid-cols-3">
                  <Button
                    asChild
                    className="w-full justify-center bg-zim-gold text-zim-black hover:bg-white transition-all px-3 py-2 h-auto min-h-[42px] rounded-full font-black text-[10px] uppercase tracking-[0.14em] md:tracking-[0.12em] gap-0.5 text-center whitespace-normal leading-tight"
                  >
                    <Link href="/onesa-ai-chat">{t("tourism.onesa.cta.chat") || "Chat with Onesa"}</Link>
                  </Button>
                  <Button
                    asChild
                    className="w-full justify-center bg-zim-gold text-zim-black hover:bg-white transition-all px-3 py-2 h-auto min-h-[42px] rounded-full font-black text-[10px] uppercase tracking-[0.14em] md:tracking-[0.12em] gap-0.5 text-center whitespace-normal leading-tight"
                  >
                    <Link href="/onesa-ai-book-trip">{t("tourism.onesa.cta.plan_trip") || "Plan your trip"}</Link>
                  </Button>
                  <Button
                    asChild
                    className="w-full justify-center bg-zim-gold text-zim-black hover:bg-white transition-all px-3 py-2 h-auto min-h-[42px] rounded-full font-black text-[10px] uppercase tracking-[0.14em] md:tracking-[0.12em] gap-0.5 text-center whitespace-normal leading-tight"
                  >
                    <Link href="/onesa-ai-tourism-augmented-experience">{t("tourism.onesa.cta.local_guide_ar") || "Local guide AR"}</Link>
                  </Button>
                </div>
              </div>

              {/* Right Column: Phone Mockup */}
              <div className="lg:col-span-6 flex justify-center lg:justify-end">
                <div className="relative w-full max-w-[300px] aspect-[9/18.5] rounded-[3rem] p-3 border-[6px] border-white/10 bg-zinc-950 overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.8)]">
                  <div className="relative h-full w-full rounded-[2.2rem] overflow-hidden bg-slate-950">
                    <img src="/images/pages/technology/zim_think.jpg" className="w-full h-full object-cover opacity-40 group-hover:scale-105 transition-transform duration-[3000ms]" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
                    <div className="absolute inset-x-4 bottom-8 space-y-4">
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={`question-${conversationIndex}`}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.35 }}
                          className="bg-zim-gold p-4 rounded-2xl rounded-br-none shadow-xl w-[90%] ml-auto"
                        >
                          <p className="text-zim-black text-[11px] font-bold leading-tight">
                            {phoneConversation[conversationIndex]?.question}
                          </p>
                        </motion.div>
                      </AnimatePresence>

                      <AnimatePresence>
                        {showConversationAnswer && (
                          <motion.div
                            key={`answer-${conversationIndex}`}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.35 }}
                            className="bg-white/10 backdrop-blur-2xl p-4 rounded-2xl rounded-bl-none border border-white/20 shadow-2xl"
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-zim-gold animate-pulse shadow-[0_0_8px_rgba(212,175,55,1)]" />
                              <span className="text-[9px] font-black text-zim-gold uppercase tracking-[0.2em]">
                                {t("tourism.onesa.name") || "Onesa AI"}
                              </span>
                            </div>
                            <p className="text-white text-[11px] leading-relaxed font-light">
                              {phoneConversation[conversationIndex]?.answer}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            </motion.div>
          </div>
        </div>
      </section>

      <Dialog open={Boolean(selectedAttraction)} onOpenChange={(open) => !open && setSelectedAttraction(null)}>
        <DialogContent className="max-w-3xl mx-auto max-h-[85vh] overflow-y-auto bg-slate-950 border-white/10 text-white">
          {selectedAttraction ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg font-black tracking-tight">{selectedAttraction.name}</DialogTitle>
                <DialogDescription className="text-white/70">
                  {selectedAttraction.summary}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                <img src={selectedAttraction.image} alt={selectedAttraction.name} className="w-full h-56 object-cover rounded-2xl border border-white/10" />

                <div>
                  <h4 className="text-sm font-black uppercase tracking-widest text-zim-gold mb-2">
                    {t("tourism.attraction_dialog.quick_facts") || "Quick Facts"}
                  </h4>
                  <ul className="space-y-2">
                    {selectedAttraction.quickFacts.map((fact) => (
                      <li key={fact} className="text-sm text-white/75 leading-relaxed">• {fact}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="text-sm font-black uppercase tracking-widest text-zim-gold mb-2">
                    {t("tourism.attraction_dialog.what_to_do") || "What To Do"}
                  </h4>
                  <ul className="space-y-2">
                    {selectedAttraction.experiences.map((exp) => (
                      <li key={exp} className="text-sm text-white/75 leading-relaxed">• {exp}</li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                  <p className="text-xs font-black uppercase tracking-widest text-zim-gold mb-1">
                    {t("tourism.attraction_dialog.best_time") || "Best Time Guidance"}
                  </p>
                  <p className="text-sm text-white/75 leading-relaxed">{selectedAttraction.bestTime}</p>
                </div>

                <div>
                  <h4 className="text-sm font-black uppercase tracking-widest text-zim-gold mb-2">
                    {t("tourism.attraction_dialog.official_sources") || "Official Sources"}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedAttraction.sourceLinks.map((link) => (
                      <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" className="border-white/20 text-white hover:bg-white hover:text-zim-black font-black uppercase tracking-widest text-[10px] rounded-full">
                          {link.label}
                        </Button>
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Planning Info - High-End Dashboard Style */}
      <section id="plan-visit" className="pt-5 pb-10 bg-slate-950 relative overflow-hidden">
        <div className="container relative z-10 px-6 mx-auto">
          <div className="outer-glass-panel rounded-[2rem] border border-white/10 bg-white/[0.02] p-8 md:p-10">
            <div className="mb-10 text-center">
              <h2 className="section-title-compact">{t("tourism.planning.essential_info") || "Essential Planning Information"}</h2>
              <p className="section-subtitle-compact">{t("tourism.planning.essential_desc") || "Everything you need to know to ensure a seamless and unforgettable adventure in Zimbabwe."}</p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {planningInfo.map((info, index) => {
                const Icon = info.icon;
                return (
                  <div
                    key={index}
                    className="h-full rounded-[2rem] border border-white/10 bg-white/[0.02] p-5 transition-all duration-300 hover:bg-white/[0.04]"
                  >
                    <div className="mb-4 flex items-center gap-3">
                      <div className="rounded-xl border border-zim-gold/25 bg-zim-gold/10 p-2.5">
                        <Icon className="h-5 w-5 text-zim-gold" />
                      </div>
                      <h3 className="text-lg font-black text-white tracking-tight">{info.title}</h3>
                    </div>

                    <p className="mb-4 text-sm font-light leading-relaxed text-white/70">{info.description}</p>

                    <ul className="space-y-2">
                      {info.details.map((detail, idx) => (
                        <li key={idx} className="flex items-start gap-3 text-sm leading-relaxed text-white/75">
                          <CheckCircle2 className="mt-[2px] h-4 w-4 shrink-0 text-zim-gold/80" />
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

    </Layout>
  );
}
