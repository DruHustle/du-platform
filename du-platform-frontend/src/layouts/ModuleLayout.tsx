import type { PropsWithChildren, ReactNode } from 'react';

type ModuleLayoutProps = PropsWithChildren<{
  title: string;
  subtitle?: string;
  hero?: ReactNode;
}>;

export default function ModuleLayout({ title, subtitle, hero, children }: ModuleLayoutProps) {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
        <h1 className="text-3xl font-black tracking-tight text-white">{title}</h1>
        {subtitle ? <p className="mt-2 max-w-3xl text-sm text-white/70">{subtitle}</p> : null}
        {hero ? <div className="mt-4">{hero}</div> : null}
      </header>
      {children}
    </section>
  );
}
