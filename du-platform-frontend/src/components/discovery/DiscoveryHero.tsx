import type { ReactNode } from "react";
import InstantImage from "@/components/InstantImage";

type Props = {
  eyebrow: string;
  title: string;
  highlight: string;
  description?: string;
  principle?: string;
  image: string;
  imageAlt: string;
  caption: string;
  children: ReactNode;
};

export default function DiscoveryHero({
  eyebrow,
  title,
  highlight,
  description,
  principle,
  image,
  imageAlt,
  caption,
  children,
}: Props) {
  return (
    <section id="hero" className="discovery-hero">
      <div className="discovery-inner discovery-hero-grid">
        <div>
          <p className="discovery-eyebrow">{eyebrow}</p>
          <h1>
            {title}
            <span>{highlight}</span>
          </h1>
          {description && (
            <p className="discovery-hero-description">{description}</p>
          )}
          <div className="discovery-actions">{children}</div>
          {principle && <p className="discovery-hero-principle">{principle}</p>}
        </div>
        <figure className="discovery-hero-media">
          <InstantImage
            src={image}
            alt={imageAlt}
            priority
            wrapperClassName="h-full w-full"
            className="h-full w-full object-cover"
          />
          <figcaption>{caption}</figcaption>
        </figure>
      </div>
    </section>
  );
}
