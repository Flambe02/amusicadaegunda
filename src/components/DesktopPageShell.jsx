import { cn } from '@/lib/utils';

export function DesktopMetric({ label, value, accent = false }) {
  return (
    <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-5">
      <div className={cn('text-3xl font-black tracking-tight text-white', accent && 'text-[#FDE047]')}>
        {value}
      </div>
      <div className="mt-2 text-[11px] uppercase tracking-[0.24em] text-white/42">
        {label}
      </div>
    </div>
  );
}

export function DesktopSurface({ className, children }) {
  return (
    <section className={cn('glass-panel rounded-[32px] p-6 xl:p-7', className)}>
      {children}
    </section>
  );
}

export default function DesktopPageShell({
  badge,
  title,
  description,
  actions,
  stats,
  sideContent,
  children,
  className,
}) {
  return (
    <div className={cn('hidden lg:block space-y-8', className)}>
      <DesktopSurface className="desktop-shell-gradient overflow-hidden">
        <div className="grid gap-8 2xl:grid-cols-[minmax(0,1.4fr)_340px]">
          <div className="space-y-6">
            {badge ? (
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.28em] text-white/68">
                {badge}
              </div>
            ) : null}

            <div className="space-y-4">
              <h1 className="max-w-[14ch] text-[clamp(2.8rem,4vw,4.3rem)] font-black leading-[0.95] tracking-tight text-white 2xl:text-6xl">
                {title}
              </h1>
              {description ? (
                <p className="max-w-3xl text-base leading-7 text-white/62 2xl:text-lg">
                  {description}
                </p>
              ) : null}
            </div>

            {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
            {stats ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{stats}</div> : null}
          </div>

          {sideContent ? <div className="space-y-4">{sideContent}</div> : null}
        </div>
      </DesktopSurface>

      {children}
    </div>
  );
}
