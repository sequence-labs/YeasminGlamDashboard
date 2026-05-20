import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
    return (
      <textarea
      className={cn(
        "crm-input-focus flex min-h-[88px] w-full rounded-lg border border-input bg-card px-3.5 py-2.5 text-sm text-foreground leading-relaxed " +
        "shadow-[inset_0_1px_0_0_hsl(var(--card-border)/0.4)] " +
        "transition-[border-color,box-shadow,background-color] duration-200 ease-out " +
        "placeholder:text-muted-foreground/80 " +
        "hover:border-[hsl(var(--border))] " +
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
