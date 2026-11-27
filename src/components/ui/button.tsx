import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-2xl font-medium transition active:scale-[0.99] disabled:pointer-events-none disabled:opacity-45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy',
  {
    variants: {
      variant: {
        default: 'bg-persimmon text-white hover:bg-persimmon-2',
        navy: 'bg-navy text-paper',
        outline: 'border border-line bg-card text-ink',
        ghost: 'bg-transparent text-ink',
        danger: 'bg-bad text-white',
      },
      size: {
        default: 'h-12 px-4 text-base',
        lg: 'h-14 px-5 text-base',
        sm: 'h-10 px-3 text-sm',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

export function Button({
  className,
  variant,
  size,
  asChild = false,
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'button'
  return <Comp className={cn(buttonVariants({ variant, size }), className)} type={asChild ? undefined : type} {...props} />
}
