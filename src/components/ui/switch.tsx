import * as SwitchPrimitive from '@radix-ui/react-switch'
import { cn } from '../../lib/utils'

export function Switch({
  checked,
  onCheckedChange,
  label,
}: {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  label: string
}) {
  return (
    <label className="flex min-h-12 items-center justify-between gap-3 rounded-2xl border border-line bg-card px-3">
      <span className="text-base">{label}</span>
      <SwitchPrimitive.Root
        checked={checked}
        onCheckedChange={onCheckedChange}
        className={cn(
          'relative h-7 w-12 shrink-0 rounded-full transition',
          checked ? 'bg-moss' : 'bg-line',
        )}
      >
        <SwitchPrimitive.Thumb className="block h-6 w-6 translate-x-0.5 rounded-full bg-white transition data-[state=checked]:translate-x-5" />
      </SwitchPrimitive.Root>
    </label>
  )
}
