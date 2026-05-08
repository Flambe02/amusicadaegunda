import { forwardRef } from 'react';

const AppCard = forwardRef(function AppCard({ className = '', children, as: As = 'div', ...rest }, ref) {
  return (
    <As
      ref={ref}
      className={`rounded-[18px] border border-app-border bg-app-charcoal/72 backdrop-blur-xl shadow-app-soft ${className}`}
      {...rest}
    >
      {children}
    </As>
  );
});

export default AppCard;
