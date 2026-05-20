import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "crm-input-focus flex min-h-10 w-full rounded-lg border border-input bg-card px-3.5 py-2 text-sm text-foreground " +
          "shadow-[inset_0_1px_0_0_hsl(var(--card-border)/0.4)] " +
          "transition-[border-color,box-shadow,background-color] duration-200 ease-out " +
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground " +
          "placeholder:text-muted-foreground/80 " +
          "hover:border-[hsl(var(--border))] " +
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
