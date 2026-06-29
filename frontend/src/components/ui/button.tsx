import { type ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

const variants = {
  default: 'bg-accent-primary text-white hover:bg-accent-primary/90',
  ghost: 'text-text-secondary hover:bg-surface-elevated hover:text-text-primary',
  outline: 'border border-border-default text-text-secondary hover:bg-surface-elevated hover:text-text-primary',
  destructive: 'border border-danger/30 text-danger hover:bg-danger/10',
  secondary: 'bg-surface-elevated text-text-secondary hover:brightness-110',
} as const

const sizes = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-9 px-4 text-sm',
  lg: 'h-10 px-6 text-sm',
  icon: 'h-9 w-9',
} as const

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants
  size?: keyof typeof sizes
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-accent-primary/50 disabled:pointer-events-none disabled:opacity-50',
          variants[variant],
          sizes[size],
          className,
        )}
        {...props}
      />
    )
  },
)
Button.displayName = 'Button'
