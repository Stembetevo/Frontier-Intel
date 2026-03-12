import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'destructive' | 'outline' | 'ghost';
  isLoading?: boolean;
}

export const NeonButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', isLoading, children, disabled, ...props }, ref) => {
    const variants = {
      primary: "bg-primary/10 text-primary border-primary hover:bg-primary/20 hover:glow-cyan",
      destructive: "bg-destructive/10 text-destructive border-destructive hover:bg-destructive/20 hover:glow-red",
      outline: "bg-transparent text-foreground border-border hover:border-primary/50 hover:text-primary",
      ghost: "bg-transparent text-muted-foreground border-transparent hover:text-foreground hover:bg-white/5"
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          "relative inline-flex items-center justify-center px-4 py-2 border font-display tracking-widest text-sm uppercase transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed",
          variants[variant],
          variant !== 'ghost' && "tactical-border",
          className
        )}
        {...props}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);
NeonButton.displayName = "NeonButton";

export const TacticalPanel = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={cn("panel-glass tactical-border p-4 relative overflow-hidden", className)}>
    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-50" />
    {children}
  </div>
);

export const ThreatBadge = ({ level, className }: { level: string, className?: string }) => {
  const colors = {
    HIGH: "bg-destructive/20 text-destructive border-destructive shadow-[0_0_8px_rgba(255,42,42,0.4)]",
    MEDIUM: "bg-warning/20 text-warning border-warning shadow-[0_0_8px_rgba(255,184,0,0.4)]",
    LOW: "bg-safe/20 text-safe border-safe shadow-[0_0_8px_rgba(0,255,102,0.4)]",
    UNKNOWN: "bg-muted text-muted-foreground border-border"
  };
  
  return (
    <span className={cn(
      "px-2 py-0.5 text-xs font-bold uppercase border tracking-wider rounded-sm backdrop-blur-sm",
      colors[level as keyof typeof colors] || colors.UNKNOWN,
      className
    )}>
      {level}
    </span>
  );
};
