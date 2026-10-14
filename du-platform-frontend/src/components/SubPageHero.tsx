import { useEffect } from "react";
import { LucideIcon } from "lucide-react";
import InstantImage, { preloadImages } from "@/components/InstantImage";

interface HeroSlide {
  image: string;
  badge?: string;
  badgeIcon?: LucideIcon;
  title: string;
  titleHighlight?: string;
  subtitle?: string;
  subtitleHighlightIcon?: LucideIcon;
  description?: string;
  descriptionIcon?: LucideIcon;
}

interface SubPageHeroProps {
  heroSlides: HeroSlide[];
  heroHeightClassName?: string;
}

export default function SubPageHero({
  heroSlides,
  heroHeightClassName,
}: SubPageHeroProps) {
  const current = heroSlides[0];

  useEffect(() => {
    if (current?.image) preloadImages([current.image], 1);
  }, [current?.image]);

  const renderIcon = (IconInput: LucideIcon | undefined, className: string) => {
    if (!IconInput) return null;
    return <IconInput className={className} />;
  };

  if (!current) return null;

  return (
    <div id="sub-page-hero-wrapper" className="flex flex-col w-full">
      <section
        className={`relative ${heroHeightClassName ?? "h-[40vh] min-h-[340px]"} w-full flex items-center justify-center overflow-hidden bg-slate-950`}
      >
        <div className="absolute inset-0 z-0 saturate-[1.1] brightness-[1.05]">
          <InstantImage
            src={current.image}
            alt=""
            aria-hidden="true"
            priority
            wrapperClassName="absolute inset-0 h-full w-full bg-slate-900"
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>

        <div
          className="absolute inset-0 z-10 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-slate-950/20"
          aria-hidden="true"
        />

        <div className="relative z-20 container mx-auto h-full px-6 md:px-12">
          <div className="flex h-full flex-col justify-end pb-12 pt-20 md:pb-14 md:pt-24">
            <div className="max-w-5xl">
              {(current.badge || current.badgeIcon) && (
                <div className="mb-4 flex items-center gap-3 drop-shadow-md">
                  {renderIcon(current.badgeIcon, "h-5 w-5 text-zim-gold")}
                  <span className="text-zim-gold text-[10px] md:text-xs font-bold uppercase tracking-[0.3em] border-l border-zim-gold/50 pl-4">
                    {current.badge}
                  </span>
                </div>
              )}

              <h1 className="mb-4 text-4xl font-black leading-[0.96] tracking-tighter text-white drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)] md:text-5xl lg:text-6xl">
                {current.title}
                {current.titleHighlight && (
                  <span className="text-zim-gold opacity-95 italic font-serif capitalize tracking-normal ml-3">
                    {current.titleHighlight}
                  </span>
                )}
              </h1>

              {current.subtitle && (
                <div className="mb-5 max-w-4xl drop-shadow-[0_8px_12px_rgba(0,0,0,0.45)]">
                  <p className="text-lg font-medium tracking-tight text-white md:text-xl">
                    {current.subtitle}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="absolute inset-0 pointer-events-none z-10 shadow-[inset_0_0_15vw_rgba(0,0,0,0.4)]" />
      </section>
    </div>
  );
}
