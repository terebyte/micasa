import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

// cal.com cards: 12px radius, 1px hairline, generous padding.
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-lg border bg-card p-4 text-card-foreground sm:p-5', className)}
      {...props}
    />
  )
}
