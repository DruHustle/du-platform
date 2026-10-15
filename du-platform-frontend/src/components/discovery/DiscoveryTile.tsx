import type { ReactNode, MouseEvent } from "react";
import type { LucideIcon } from "lucide-react";
import InstantImage from "@/components/InstantImage";

type Props = {
  title: string;
  image?: string;
  icon?: LucideIcon;
  children: ReactNode;
  footer?: ReactNode;
  number?: number;
  headingLevel?: 2 | 3;
  onSelect?: (event: MouseEvent<HTMLButtonElement>) => void;
};
export default function DiscoveryTile({
  title,
  image,
  icon: Icon,
  children,
  footer,
  number,
  headingLevel = 3,
  onSelect,
}: Props) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <article
      className={`discovery-tile${image ? " discovery-tile-with-image" : ""}`}
    >
      {onSelect && (
        <button
          type="button"
          className="discovery-tile-target"
          aria-label={title}
          onClick={onSelect}
        />
      )}
      {image && (
        <div className="discovery-tile-image">
          <InstantImage
            src={image}
            alt=""
            draggable={false}
            loading="lazy"
            fetchPriority="low"
            wrapperClassName="h-full w-full bg-slate-900"
            className="h-full w-full object-cover"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-slate-900/35 to-transparent"
          />
        </div>
      )}
      <div className="discovery-tile-content">
        <div className="discovery-tile-heading">
          {Icon && (
            <span className="discovery-tile-icon">
              <Icon aria-hidden="true" />
            </span>
          )}
          {number !== undefined && (
            <span className="discovery-tile-number">
              {String(number).padStart(2, "0")}
            </span>
          )}
          <Heading>{title}</Heading>
        </div>
        <div className="discovery-tile-copy">{children}</div>
        {footer && <div className="discovery-tile-footer">{footer}</div>}
      </div>
    </article>
  );
}
