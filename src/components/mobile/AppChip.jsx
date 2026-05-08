const variants = {
  default: 'border border-white/12 bg-white/5 text-white/72',
  solid: 'bg-app-yellow text-black border border-app-yellow/0',
  active: 'border border-app-yellow/35 bg-app-yellow/12 text-app-yellow',
};

export default function AppChip({ variant = 'default', className = '', children, ...rest }) {
  const v = variants[variant] ?? variants.default;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.06em] ${v} ${className}`}
      {...rest}
    >
      {children}
    </span>
  );
}
