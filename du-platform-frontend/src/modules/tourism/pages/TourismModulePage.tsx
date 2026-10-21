import { useState, useMemo, useRef } from "react";
import Layout from "@/components/Layout";
import SwipeRail from "@/components/discovery/SwipeRail";
import DiscoveryTile from "@/components/discovery/DiscoveryTile";
import DiscoverySection from "@/components/discovery/DiscoverySection";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Camera,
  Calendar,
  Shield,
  Award,
  Brain,
  Globe,
  Building2,
  Car,
  Globe2,
  Dog,
  TrendingUp,
} from "lucide-react";
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
  const [selectedAttraction, setSelectedAttraction] =
    useState<Attraction | null>(null);
  const attractionTrigger = useRef<HTMLButtonElement | null>(null);
  const openAttraction = (
    attraction: Attraction,
    trigger: HTMLButtonElement
  ) => {
    attractionTrigger.current = trigger;
    setSelectedAttraction(attraction);
  };
  const getTranslatedList = (key: string, fallback: string[]) => {
    const value = t(key, { returnObjects: true });
    return Array.isArray(value) && value.length > 0
      ? (value as string[])
      : fallback;
  };

  const heroSlides = useMemo(
    () => [
      {
        image: "/images/pages/tourism/victoria_falls.webp",
        badge: t("tourism.hero.badge1") || "Visit Zimbabwe",
        badgeIcon: Globe,
        title: t("tourism.hero.title1") || "Find your",
        titleHighlight: t("tourism.hero.highlight1") || "Zimbabwe journey",
        subtitle:
          t("tourism.hero.subtitle1") ||
          "Compare waterfalls, wildlife and heritage destinations, then turn your interests into a trip plan.",
      },
      {
        image: "/images/pages/shop/zimbabwe_shop_hero.webp",
        badge: t("tourism.hero.badge2") || "Cultural Heritage",
        badgeIcon: Award,
        title: t("tourism.hero.title2") || "Explore living heritage",
        subtitle:
          t("tourism.hero.subtitle2") ||
          "Explore historical places and cultural experiences to include alongside family visits and sightseeing.",
      },
      {
        image: "/images/pages/tourism/african-elephant.jpg",
        badge: t("tourism.hero.badge3") || "Adventure",
        badgeIcon: Car,
        title: t("tourism.hero.title3") || "Wildlife & Safari",
        subtitle:
          t("tourism.hero.subtitle3") ||
          "Unforgettable encounters in pristine national parks.",
      },
      {
        image: "/images/pages/tourism/great_zimbabwe.jpeg",
        badge: t("tourism.hero.badge4") || "Historical Site",
        badgeIcon: Building2,
        title: t("tourism.hero.title4") || "Great Zimbabwe",
        subtitle:
          t("tourism.hero.subtitle4") ||
          "Ancient stone ruins showcasing medieval African civilization.",
      },
      {
        image: "/images/pages/tourism/cheetah.png",
        badge: t("tourism.hero.badge3") || "Adventure",
        badgeIcon: Dog,
        title: t("tourism.hero.title3") || "Wildlife & Safari",
        subtitle:
          t("tourism.hero.subtitle3") ||
          "Unforgettable encounters in pristine national parks.",
      },
      {
        image: "/images/pages/tourism/mana_pools.jpg",
        badge: t("tourism.hero.badge6") || "UNESCO Wilderness",
        badgeIcon: Globe2,
        title: t("tourism.hero.title6") || "Mana Pools Experience",
        subtitle:
          t("tourism.hero.subtitle6") ||
          "River-fed plains, walking safaris, and premium wildlife viewing in one of Africa's iconic landscapes.",
      },
      {
        image: "/images/pages/tourism/dest_hwange.png",
        badge: t("tourism.hero.badge7") || "National Parks",
        badgeIcon: Shield,
        title: t("tourism.hero.title7") || "Hwange Wildlife Corridor",
        subtitle:
          t("tourism.hero.subtitle7") ||
          "Zimbabwe's largest national park, known for elephant herds and strong safari potential.",
      },
      {
        image: "/images/pages/tourism/kariba_sunset.jpg",
        badge: t("tourism.hero.badge8") || "Lake & Leisure",
        badgeIcon: TrendingUp,
        title: t("tourism.hero.title8") || "Kariba Adventure Tourism",
        subtitle:
          t("tourism.hero.subtitle8") ||
          "Houseboats, sport fishing, and scenic cruises continue to attract regional and international visitors.",
      },
    ],
    [t]
  );

  const attractions: Attraction[] = [
    {
      name: t("tourism.attractions.vicfalls.name") || "Victoria Falls",
      image: "/images/pages/tourism/victoria_falls.webp",
      highlights: [
        t("tourism.attractions.vicfalls.h1") || "UNESCO World Heritage",
        t("tourism.attractions.vicfalls.h2") || "Adventure Hub",
        t("tourism.attractions.vicfalls.h3") || "Wildlife Viewing",
      ],
      summary:
        t("tourism.attractions.vicfalls.summary") ||
        "Known locally as Mosi-oa-Tunya (The Smoke That Thunders), Victoria Falls is one of the largest waterfalls on earth and a flagship destination for Zimbabwe.",
      quickFacts: getTranslatedList("tourism.attractions.vicfalls.quickFacts", [
        "Located on the Zambezi River at the Zimbabwe-Zambia border.",
        "Approximate width is 1.7 km with a drop of over 100 m at its deepest sections.",
        "Protected within the Mosi-oa-Tunya / Victoria Falls World Heritage landscape.",
      ]),
      experiences: getTranslatedList(
        "tourism.attractions.vicfalls.experiences",
        [
          "Scenic viewpoints, rainforest walks, and photography trails.",
          "Adventure options such as rafting, bungee jumping, and helicopter flights.",
          "Nearby safari and river experiences in surrounding protected areas.",
        ]
      ),
      bestTime:
        t("tourism.attractions.vicfalls.bestTime") ||
        "High-water spectacle is usually strongest from late rainy season into early dry season; lower-water months are often preferred for some adventure activities.",
      sourceLinks: [
        {
          label:
            t("tourism.attractions.vicfalls.sources.vf") ||
            "ZTA: Victoria Falls",
          url: "https://zimbabwetourism.net/portfolios/victoria-falls/",
        },
        {
          label:
            t("tourism.attractions.vicfalls.sources.vfnp") ||
            "ZTA: Victoria Falls National Park",
          url: "https://zimbabwetourism.net/portfolios/victoria-falls-national-park/",
        },
      ],
    },
    {
      name: t("tourism.attractions.greatzim.name") || "Great Zimbabwe",
      image: "/images/pages/tourism/great_zimbabwe.jpeg",
      highlights: [
        t("tourism.attractions.greatzim.h1") || "UNESCO World Heritage",
        t("tourism.attractions.greatzim.h2") || "Historical Site",
        t("tourism.attractions.greatzim.h3") || "Cultural Heritage",
      ],
      summary:
        t("tourism.attractions.greatzim.summary") ||
        "Great Zimbabwe is the country's signature archaeological monument and one of the most important pre-colonial stone-built complexes in southern Africa.",
      quickFacts: getTranslatedList("tourism.attractions.greatzim.quickFacts", [
        "Constructed and expanded between the 11th and 15th centuries.",
        "Famous for dry-stone masonry built without mortar.",
        "Represents the political and cultural center of the historic Zimbabwe civilization.",
      ]),
      experiences: getTranslatedList(
        "tourism.attractions.greatzim.experiences",
        [
          "Explore the Hill Complex, Great Enclosure, and Valley Ruins.",
          "Interpretive historical tours and local cultural storytelling.",
          "Panoramic viewpoints over the wider Masvingo landscape.",
        ]
      ),
      bestTime:
        t("tourism.attractions.greatzim.bestTime") ||
        "Accessible year-round; dry season months are generally better for walking and site exploration.",
      sourceLinks: [
        {
          label:
            t("tourism.attractions.greatzim.sources.gz") ||
            "ZTA: Great Zimbabwe Ruins",
          url: "https://zimbabwetourism.net/portfolios/great-zimbabwe-ruins/",
        },
      ],
    },
    {
      name: t("tourism.attractions.kariba.name") || "Kariba Dam",
      image: "/images/pages/tourism/kariba_dam.webp",
      highlights: [
        t("tourism.attractions.kariba.h1") || "Water Sports",
        t("tourism.attractions.kariba.h2") || "Tiger Fishing",
        t("tourism.attractions.kariba.h3") || "Scenic Sunset",
      ],
      summary:
        t("tourism.attractions.kariba.summary") ||
        "Lake Kariba is a major inland water destination known for houseboat tourism, fishing, and wildlife-rich shorelines.",
      quickFacts: getTranslatedList("tourism.attractions.kariba.quickFacts", [
        "Sits on the Zambezi corridor and supports both tourism and recreation.",
        "Popular for boat-based travel, fishing tourism, and sunset cruises.",
        "Connected to nearby wildlife areas including Matusadona-facing zones.",
      ]),
      experiences: getTranslatedList("tourism.attractions.kariba.experiences", [
        "Houseboat holidays and shoreline lodges.",
        "Tiger fishing and birdwatching itineraries.",
        "Game-viewing combinations with lake and park circuits.",
      ]),
      bestTime:
        t("tourism.attractions.kariba.bestTime") ||
        "Dry season is typically preferred for wildlife viewing; lake activities operate across most of the year.",
      sourceLinks: [
        {
          label:
            t("tourism.attractions.kariba.sources.kariba") ||
            "ZTA: Lake Kariba Recreational Park",
          url: "https://zimbabwetourism.net/portfolios/lake-kariba-recreational-park/",
        },
      ],
    },
    {
      name: t("tourism.attractions.rocks.name") || "Balancing Rocks",
      image: "/images/pages/tourism/balancing_rocks.jpg",
      highlights: [
        t("tourism.attractions.rocks.h1") || "National Symbol",
        t("tourism.attractions.rocks.h2") || "Photography",
        t("tourism.attractions.rocks.h3") || "Natural Wonder",
      ],
      summary:
        t("tourism.attractions.rocks.summary") ||
        "Zimbabwe's balancing rocks are granite formations shaped over long geological periods and are closely linked to national identity.",
      quickFacts: getTranslatedList("tourism.attractions.rocks.quickFacts", [
        "Prominent around Matobo and other granite landscapes.",
        "Featured in national symbolism, including currency imagery.",
        "Formed through weathering and erosion of ancient granite outcrops.",
      ]),
      experiences: getTranslatedList("tourism.attractions.rocks.experiences", [
        "Landscape photography and short nature walks.",
        "Rock-art and heritage combinations in Matobo areas.",
        "Scenic drives linking Harare and Matobo viewpoints.",
      ]),
      bestTime:
        t("tourism.attractions.rocks.bestTime") ||
        "Year-round attraction; clear dry-season weather often gives the best visibility for photos.",
      sourceLinks: [
        {
          label:
            t("tourism.attractions.rocks.sources.chiremba") ||
            "ZTA: Chiremba Balancing Rocks",
          url: "https://zimbabwetourism.net/portfolios/chiremba-balancing-rocks/",
        },
        {
          label:
            t("tourism.attractions.rocks.sources.matobo") ||
            "ZTA: Matobo Hills",
          url: "https://zimbabwetourism.net/portfolios/matobo-hills/",
        },
      ],
    },
  ];

  const otherAttractions: Attraction[] = [
    {
      name:
        t("tourism.other_attractions.hwange.name") || "Hwange National Park",
      image: "/images/pages/tourism/dest_hwange.png",
      highlights: getTranslatedList(
        "tourism.other_attractions.hwange.highlights",
        ["Big Five", "Elephant Herds", "Safari"]
      ),
      summary:
        t("tourism.other_attractions.hwange.desc") ||
        "Zimbabwe's largest park, famous for its massive elephant herds and diverse wildlife.",
      quickFacts: getTranslatedList(
        "tourism.other_attractions.hwange.quickFacts",
        [
          "Located in western Zimbabwe and linked to major safari circuits.",
          "Known for one of Africa's largest elephant populations.",
          "Strong dry-season game viewing around pumped waterholes.",
        ]
      ),
      experiences: getTranslatedList(
        "tourism.other_attractions.hwange.experiences",
        [
          "Game drives and guided safari experiences.",
          "Birdwatching and photography-focused itineraries.",
          "Lodge and camp stays across multiple park zones.",
        ]
      ),
      bestTime:
        t("tourism.other_attractions.hwange.bestTime") ||
        "Peak wildlife concentration is usually in the dry months when water sources are limited.",
      sourceLinks: [
        {
          label: t("tourism.other_attractions.hwange.source") || "ZTA: Hwange",
          url: "https://zimbabwetourism.net/",
        },
      ],
    },
    {
      name:
        t("tourism.other_attractions.matobo.name") || "Matobo National Park",
      image: "/images/pages/tourism/dest_matobo.jpg",
      highlights: getTranslatedList(
        "tourism.other_attractions.matobo.highlights",
        ["UNESCO", "Rock Formations", "Heritage"]
      ),
      summary:
        t("tourism.other_attractions.matobo.desc") ||
        "A UNESCO World Heritage site known for its balancing rocks and spiritual history.",
      quickFacts: getTranslatedList(
        "tourism.other_attractions.matobo.quickFacts",
        [
          "Recognized for cultural landscapes and granite outcrops.",
          "Home to major historical and spiritual heritage sites.",
          "Important rhino and bird habitat in Zimbabwe.",
        ]
      ),
      experiences: getTranslatedList(
        "tourism.other_attractions.matobo.experiences",
        [
          "Rock-art and heritage tours.",
          "Scenic drives through granite formations.",
          "Wildlife tracking and cultural storytelling.",
        ]
      ),
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
      name:
        t("tourism.other_attractions.eastern_highlands.name") ||
        "Eastern Highlands",
      image: "/images/pages/tourism/mutarazi_falls.jpg",
      highlights: getTranslatedList(
        "tourism.other_attractions.eastern_highlands.highlights",
        ["Mountains", "Waterfalls", "Cool Climate"]
      ),
      summary:
        t("tourism.other_attractions.eastern_highlands.desc") ||
        "A cool, mountainous region offering lush forests, waterfalls, and misty peaks.",
      quickFacts: getTranslatedList(
        "tourism.other_attractions.eastern_highlands.quickFacts",
        [
          "Stretches along Zimbabwe's eastern border.",
          "Includes Nyanga, Vumba, and Chimanimani landscapes.",
          "Known for hiking, scenic lodges, and highland weather.",
        ]
      ),
      experiences: getTranslatedList(
        "tourism.other_attractions.eastern_highlands.experiences",
        [
          "Hiking and nature trails.",
          "Waterfall viewpoints and adventure activities.",
          "Mountain lodge retreats and weekend escapes.",
        ]
      ),
      bestTime:
        t("tourism.other_attractions.eastern_highlands.bestTime") ||
        "Dry months generally offer clearer views and better trail conditions.",
      sourceLinks: [
        {
          label:
            t("tourism.other_attractions.eastern_highlands.source") ||
            "ZTA: Eastern Highlands",
          url: "https://zimbabwetourism.net/",
        },
      ],
    },
    {
      name: t("tourism.other_attractions.mana_pools.name") || "Mana Pools",
      image: "/images/pages/tourism/dest_mana_pools.jpg",
      highlights: getTranslatedList(
        "tourism.other_attractions.mana_pools.highlights",
        ["UNESCO", "Walking Safari", "Wilderness"]
      ),
      summary:
        t("tourism.other_attractions.mana_pools.desc") ||
        "A remote UNESCO site famous for its river-fed pools and walking safaris.",
      quickFacts: getTranslatedList(
        "tourism.other_attractions.mana_pools.quickFacts",
        [
          "Set along the lower Zambezi floodplain.",
          "Recognized globally for wilderness value and biodiversity.",
          "Strong seasonal game concentration in dry months.",
        ]
      ),
      experiences: getTranslatedList(
        "tourism.other_attractions.mana_pools.experiences",
        [
          "Guided walking safaris.",
          "Canoeing and river-based wildlife viewing.",
          "Premium low-impact safari camps.",
        ]
      ),
      bestTime:
        t("tourism.other_attractions.mana_pools.bestTime") ||
        "Dry season is typically preferred for high-density wildlife viewing.",
      sourceLinks: [
        {
          label:
            t("tourism.other_attractions.mana_pools.source") ||
            "ZTA: Mana Pools",
          url: "https://zimbabwetourism.net/",
        },
      ],
    },
    {
      name:
        t("tourism.other_attractions.nyanga.name") || "Nyanga National Park",
      image: "/images/pages/tourism/dest_nyanga.jpg",
      highlights: getTranslatedList(
        "tourism.other_attractions.nyanga.highlights",
        ["Highlands", "Falls", "Scenic Drives"]
      ),
      summary:
        t("tourism.other_attractions.nyanga.desc") ||
        "The 'Little Scotland' of Africa, home to Zimbabwe's highest peak and deepest falls.",
      quickFacts: getTranslatedList(
        "tourism.other_attractions.nyanga.quickFacts",
        [
          "Includes Mount Nyangani and major highland attractions.",
          "Popular for cooler climate tourism and mountain scenery.",
          "Important domestic and regional leisure destination.",
        ]
      ),
      experiences: getTranslatedList(
        "tourism.other_attractions.nyanga.experiences",
        [
          "Hiking and mountain viewpoints.",
          "Trout fishing and outdoor recreation.",
          "Road trips across highland circuits.",
        ]
      ),
      bestTime:
        t("tourism.other_attractions.nyanga.bestTime") ||
        "Year-round destination; clear weather periods are best for mountain views.",
      sourceLinks: [
        {
          label: t("tourism.other_attractions.nyanga.source") || "ZTA: Nyanga",
          url: "https://zimbabwetourism.net/",
        },
      ],
    },
    {
      name: t("tourism.other_attractions.gonarezhou.name") || "Gonarezhou",
      image: "/images/pages/tourism/dest_gonarezhou.jpg",
      highlights: getTranslatedList(
        "tourism.other_attractions.gonarezhou.highlights",
        ["Chilojo Cliffs", "Elephants", "Wild Frontier"]
      ),
      summary:
        t("tourism.other_attractions.gonarezhou.desc") ||
        "The 'Place of Elephants,' characterized by the stunning red Chilojo Cliffs.",
      quickFacts: getTranslatedList(
        "tourism.other_attractions.gonarezhou.quickFacts",
        [
          "Major transfrontier conservation destination in southeastern Zimbabwe.",
          "Known for remote, low-traffic wilderness experiences.",
          "Home to significant elephant and predator populations.",
        ]
      ),
      experiences: getTranslatedList(
        "tourism.other_attractions.gonarezhou.experiences",
        [
          "Remote game drives and wilderness camping.",
          "Photography around Chilojo Cliffs and river corridors.",
          "Cross-border circuit planning with nearby regional parks.",
        ]
      ),
      bestTime:
        t("tourism.other_attractions.gonarezhou.bestTime") ||
        "Dry months are usually best for access and concentrated wildlife viewing.",
      sourceLinks: [
        {
          label:
            t("tourism.other_attractions.gonarezhou.source") ||
            "ZTA: Gonarezhou",
          url: "https://zimbabwetourism.net/",
        },
      ],
    },
  ];

  const onesaTouristFeatures = [
    {
      icon: Brain,
      title: t("tourism.onesa.guide.title") || "Local Insights",
      description:
        t("tourism.onesa.guide.desc") ||
        "Ask about local etiquette, food and places to research before you travel.",
      image: "/images/pages/technology/zim_think.jpg",
      href: "/onesa-ai-chat",
      cta: t("tourism.onesa.cta.chat", { defaultValue: "Chat with Onesa" }),
    },
    {
      icon: Camera,
      title: t("tourism.onesa.navigate.title") || "Augmented Reality Guide",
      description:
        t("tourism.onesa.navigate.desc") ||
        "Explore destinations with a camera preview, Onesa’s place guidance and optional narration.",
      image: "/images/pages/tourism/great_zimbabwe.jpeg",
      href: "/onesa-ai-tourism-augmented-experience",
      cta: t("tourism.onesa.cta.local_guide_ar", {
        defaultValue: "Explore in AR",
      }),
    },
    {
      icon: Calendar,
      title: t("tourism.onesa.plan.title") || "Custom Itineraries",
      description:
        t("tourism.onesa.plan.desc") ||
        "Create a draft itinerary based on your interests, dates and travel preferences.",
      image: "/images/pages/tourism/victoria_falls.webp",
      href: "/onesa-ai-book-trip",
      cta: t("tourism.onesa.cta.plan_trip", { defaultValue: "Plan your trip" }),
    },
    {
      icon: Globe2,
      title: t("tourism.onesa.virtual_preview.title", {
        defaultValue: "Interactive previews",
      }),
      description: t("tourism.onesa.virtual_preview.desc", {
        defaultValue:
          "Try the Sample City demo with panoramic scenes and optional headset support. Zimbabwe destination tours are not available yet.",
      }),
      image: "/images/pages/tourism/vr-walk/vf_360_01.jpg",
      href: "/onesa-ai-tourism-virtual-experience",
      cta: t("tourism.intro.virtual_experience_center_cta", {
        defaultValue: "Explore virtual previews",
      }),
    },
  ];

  return (
    <Layout>
      {/* Hero Section */}
      <section id="hero">
        <SubPageHero heroSlides={heroSlides} />
      </section>

      <DiscoverySection
        id="attractions"
        title={t("tourism.attractions_title", {
          defaultValue: "Must-Visit Destinations",
        })}
        action={
          <Button
            asChild
            className="bg-zim-gold text-slate-950 hover:bg-yellow-300"
          >
            <Link href="/onesa-ai-tourism-virtual-experience">
              {t("tourism.intro.virtual_experience_center_cta", {
                defaultValue: "Explore virtual previews",
              })}
            </Link>
          </Button>
        }
      >
        <SwipeRail
          label={t("tourism.attractions_title", {
            defaultValue: "Must-Visit Destinations",
          })}
        >
          {attractions.map(attraction => (
            <DiscoveryTile
              key={attraction.name}
              onSelect={event =>
                openAttraction(attraction, event.currentTarget)
              }
              title={attraction.name}
              image={attraction.image}
              footer={
                <span className="discovery-tile-link">
                  <span>
                    {t("tourism.attraction_card.tap_for_details", {
                      defaultValue: "Tap for more details",
                    })}
                  </span>
                  <span className="discovery-tile-plus">
                    <Plus aria-hidden="true" />
                  </span>
                </span>
              }
            >
              <ul className="discovery-tags">
                {attraction.highlights.map(highlight => (
                  <li key={highlight}>{highlight}</li>
                ))}
              </ul>
              <p className="mt-4 line-clamp-3">{attraction.summary}</p>
            </DiscoveryTile>
          ))}
        </SwipeRail>
        <div className="discovery-introduction">
          <details className="editorial-details mt-5">
            <summary>
              {t("tourism.intro.read_more", {
                defaultValue: "More about travelling in Zimbabwe",
              })}
            </summary>
            <div className="mt-4 space-y-4">
              <p className="text-sm leading-7">
                {t("tourism.intro.p1", {
                  defaultValue:
                    "Start with the places that interest you: waterfalls, stone cities, wildlife parks or lake landscapes. Open a destination card for highlights, visit ideas and links to further information.",
                })}
              </p>
              <p className="mt-3 text-left text-sm text-white/75 font-light leading-relaxed">
                {t("tourism.intro.p2_before_ar") ||
                  "Explore a destination with Onesa's"}{" "}
                <span className="text-zim-gold font-semibold">
                  {t("tourism.intro.local_guide_ar") ||
                    "camera and location guide"}
                </span>{" "}
                {t("tourism.intro.p2_after_ar") ||
                  "for place information and optional narration. Camera and location access are optional. The virtual experience offers interactive previews you can explore before travelling."}
              </p>
              <p className="mt-3 text-left text-sm text-white/75 font-light leading-relaxed">
                {t("tourism.intro.p3_before_gastro") || "Zimbabwe's"}{" "}
                <span className="text-zim-gold font-semibold">
                  {t("tourism.intro.gastronomy_tourism") ||
                    "gastronomy tourism"}
                </span>{" "}
                {t("tourism.intro.p3_between") ||
                  "can be part of your itinerary, from sadza and local relishes to coffee-growing areas and lakeside food experiences."}{" "}
                <span className="text-zim-gold font-semibold">
                  {t("tourism.intro.cultural_tourism") || "Cultural tourism"}
                </span>{" "}
                {t("tourism.intro.p3_after_cultural") ||
                  "adds heritage sites, music, sculpture and community traditions to the journey. Combine these with wildlife destinations to suit your interests, then confirm current visitor arrangements locally."}
              </p>
            </div>
          </details>
        </div>
      </DiscoverySection>
      <DiscoverySection
        title={t("tourism.other_attractions_title", {
          defaultValue: "Other Incredible Destinations",
        })}
        description={t("tourism.other_attractions_subtitle", {
          defaultValue:
            "Beyond the iconic landmarks, Zimbabwe offers diverse landscapes and wildlife experiences across the country.",
        })}
      >
        <SwipeRail
          label={t("tourism.other_attractions_title", {
            defaultValue: "Other Incredible Destinations",
          })}
        >
          {otherAttractions.map(dest => (
            <DiscoveryTile
              key={dest.name}
              onSelect={event => openAttraction(dest, event.currentTarget)}
              title={dest.name}
              image={dest.image}
              footer={
                <span className="discovery-tile-link">
                  <span>
                    {t("tourism.attraction_card.tap_for_details", {
                      defaultValue: "Tap for more details",
                    })}
                  </span>
                  <span className="discovery-tile-plus">
                    <Plus aria-hidden="true" />
                  </span>
                </span>
              }
            >
              <p className="line-clamp-3">{dest.summary}</p>
            </DiscoveryTile>
          ))}
        </SwipeRail>
      </DiscoverySection>

      <DiscoverySection
        title={t("tourism.onesa.badge", { defaultValue: "Onesa AI Companion" })}
        description={t("tourism.onesa.companion_subtitle", {
          defaultValue:
            "Discuss your interests, compare places and plan a route. Check opening hours, transport and availability directly before travelling.",
        })}
      >
        <div className="discovery-introduction space-y-3">
          <p className="text-base leading-7">
            {t("tourism.onesa.companion_title", {
              defaultValue: "Explore destinations and build a draft itinerary",
            })}
          </p>
          <p className="text-sm leading-7">
            {t("tourism.onesa.personalized_experience", {
              defaultValue:
                "Explore places that match your interests, then refine the plan with current information from providers.",
            })}
          </p>
        </div>
        <SwipeRail
          label={t("tourism.onesa.badge", {
            defaultValue: "Onesa AI Companion",
          })}
        >
          {onesaTouristFeatures.map(feature => (
            <DiscoveryTile
              key={feature.title}
              title={feature.title}
              icon={feature.icon}
              image={feature.image}
              footer={
                <Button
                  asChild
                  className="w-full bg-zim-gold text-slate-950 hover:bg-yellow-300"
                >
                  <Link href={feature.href}>{feature.cta}</Link>
                </Button>
              }
            >
              <p>{feature.description}</p>
            </DiscoveryTile>
          ))}
        </SwipeRail>
      </DiscoverySection>

      <Dialog
        open={Boolean(selectedAttraction)}
        onOpenChange={open => !open && setSelectedAttraction(null)}
      >
        <DialogContent
          onCloseAutoFocus={event => {
            if (attractionTrigger.current?.isConnected) {
              event.preventDefault();
              attractionTrigger.current.focus({ preventScroll: true });
            }
          }}
          className="max-w-3xl mx-auto max-h-[85vh] overflow-y-auto bg-slate-950 border-white/10 text-white"
        >
          {selectedAttraction ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg font-black tracking-tight">
                  {selectedAttraction.name}
                </DialogTitle>
                <DialogDescription className="text-white/70">
                  {selectedAttraction.summary}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                <img
                  src={selectedAttraction.image}
                  alt={selectedAttraction.name}
                  className="w-full h-56 object-cover rounded-2xl border border-white/10"
                />

                <div>
                  <h4 className="text-sm font-black uppercase tracking-widest text-zim-gold mb-2">
                    {t("tourism.attraction_dialog.quick_facts") ||
                      "Quick Facts"}
                  </h4>
                  <ul className="space-y-2">
                    {selectedAttraction.quickFacts.map(fact => (
                      <li
                        key={fact}
                        className="text-sm text-white/75 leading-relaxed"
                      >
                        • {fact}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="text-sm font-black uppercase tracking-widest text-zim-gold mb-2">
                    {t("tourism.attraction_dialog.what_to_do") || "What To Do"}
                  </h4>
                  <ul className="space-y-2">
                    {selectedAttraction.experiences.map(exp => (
                      <li
                        key={exp}
                        className="text-sm text-white/75 leading-relaxed"
                      >
                        • {exp}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                  <p className="text-xs font-black uppercase tracking-widest text-zim-gold mb-1">
                    {t("tourism.attraction_dialog.best_time") ||
                      "Best Time Guidance"}
                  </p>
                  <p className="text-sm text-white/75 leading-relaxed">
                    {selectedAttraction.bestTime}
                  </p>
                </div>

                <div>
                  <h4 className="text-sm font-black uppercase tracking-widest text-zim-gold mb-2">
                    {t("tourism.attraction_dialog.official_sources") ||
                      "Official Sources"}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedAttraction.sourceLinks.map(link => (
                      <a
                        key={link.url}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button
                          variant="outline"
                          className="border-white/20 text-white hover:bg-white hover:text-zim-black font-black uppercase tracking-widest text-[10px] rounded-full"
                        >
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
    </Layout>
  );
}
