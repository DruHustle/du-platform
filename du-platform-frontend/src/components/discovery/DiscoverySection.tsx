import type { ReactNode } from "react";

type Props = {
  id?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
};
export default function DiscoverySection({
  id,
  title,
  description,
  action,
  children,
}: Props) {
  return (
    <section id={id} className="discovery-section">
      <div className="discovery-section-layout">
        <header className="section-heading mb-7">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <h2 className="page-section-title max-w-4xl">{title}</h2>
            {action}
          </div>
          {description && (
            <p className="mt-4 max-w-3xl text-sm leading-7">{description}</p>
          )}
        </header>
        {children}
      </div>
    </section>
  );
}
