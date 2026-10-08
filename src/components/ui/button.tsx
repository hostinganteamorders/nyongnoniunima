import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap active-scale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue/30 disabled:pointer-events-none disabled:opacity-50 text-button transition-all duration-150',
  {
    variants: {
      variant: {
        primary: 'bg-primary-blue text-white rounded-pill px-6 py-2.5 hover:bg-primary-blue-dark',
        secondary: 'bg-light-gray text-dark-text rounded-pill px-6 py-2.5 border border-border hover:bg-border',
        accent: 'bg-accent text-dark-text rounded-pill px-6 py-2.5 hover:bg-accent-light font-bold',
        'icon-circular': 'bg-light-gray text-dark-text rounded-full size-[40px] hover:bg-border',
        ghost: 'hover:bg-light-gray text-dark-text rounded-pill px-6 py-2.5',
        link: 'text-primary-blue underline-offset-4 hover:underline px-2 py-2.5',
        outline: 'border border-primary-blue bg-transparent hover:bg-primary-blue hover:text-white text-primary-blue rounded-pill px-6 py-2.5',
        translucent: 'bg-white/10 text-white rounded-xxl px-4 py-2 border border-white/20 backdrop-blur-sm hover:bg-white/20',
      },
      size: {
        default: '',
        sm: 'text-xs px-3 py-1.5 h-auto rounded-sm',
        lg: 'text-body-lg px-8 py-3 h-auto rounded-pill',
        icon: 'size-[40px] p-0 flex items-center justify-center rounded-full',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  },
)
Button.displayName = 'Button'

export { Button, buttonVariants }
