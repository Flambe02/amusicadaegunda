import { forwardRef } from 'react';

const variants = {
  primary: 'bg-app-yellow text-black hover:brightness-105',
  secondary: 'border border-white/14 bg-white/5 text-white hover:bg-white/10',
  ghost: 'text-white/72 hover:text-white hover:bg-white/5',
};

const sizes = {
  sm: 'h-9 px-3 text-xs',
  md: 'h-11 px-4 text-sm',
  lg: 'h-13 px-5 text-base',
};

const AppButton = forwardRef(function AppButton(
  { variant = 'primary', size = 'md', disabled = false, type = 'button', className = '', children, ...rest },
  ref
) {
  const v = variants[variant] ?? variants.primary;
  const s = sizes[size] ?? sizes.md;
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-full font-bold transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45 ${v} ${s} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
});

export default AppButton;
