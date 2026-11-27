import type { InputHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'h-12 w-full rounded-2xl border border-line bg-card px-3 text-base text-ink outline-none placeholder:text-ink/35 focus:border-navy',
        className,
      )}
      {...props}
    />
  )
}
