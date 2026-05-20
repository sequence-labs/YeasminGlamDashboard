import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium tracking-tight " +
  "transition-[transform,background-color,border-color,box-shadow,color] duration-200 ease-out " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background " +
  "disabled:pointer-events-none disabled:opacity-50 " +
  "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 " +
  "active-elevate-2",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground border border-[hsl(var(--primary)/0.95)] " +
          "shadow-[inset_0_1px_0_0_hsl(0_0%_100%/0.14),0_6px_16px_-8px_hsl(var(--primary)/0.55),0_1px_2px_0_hsl(var(--primary)/0.18)] " +
          "hover:bg-[hsl(var(--primary-hover))] hover:shadow-[inset_0_1px_0_0_hsl(0_0%_100%/0.16),0_8px_20px_-8px_hsl(var(--primary)/0.6),0_1px_3px_0_hsl(var(--primary)/0.22)]",
        destructive:
          "bg-destructive text-destructive-foreground border border-destructive-border/85 " +
          "shadow-[inset_0_1px_0_0_hsl(0_0%_100%/0.12),0_6px_16px_-8px_hsl(var(--destructive)/0.55)] " +
          "hover:bg-destructive/92",
        outline:
          "border bg-card text-foreground border-[hsl(var(--border))] " +
          "shadow-[0_1px_0_0_hsl(var(--card-border)/0.5),0_4px_12px_-8px_var(--elevate-3)] " +
          "hover:border-[hsl(var(--primary)/0.4)] hover:bg-[hsl(var(--primary)/0.04)] hover:text-foreground",
        secondary:
          "bg-secondary text-secondary-foreground border border-secondary-border " +
          "shadow-[0_1px_0_0_hsl(var(--card-border)/0.4)] " +
          "hover:bg-secondary/85",
        ghost:
          "border border-transparent text-foreground " +
          "hover:bg-muted hover:text-foreground",
        link:
          "text-primary underline-offset-[5px] decoration-[1px] decoration-primary/50 " +
          "hover:underline hover:decoration-primary",
        gold:
          "bg-card text-foreground border border-[hsl(var(--gold)/0.5)] " +
          "shadow-[inset_0_1px_0_0_hsl(var(--gold)/0.18),0_4px_14px_-8px_hsl(var(--gold)/0.5)] " +
          "hover:border-[hsl(var(--gold)/0.85)] hover:text-foreground",
      },
      size: {
        default: "min-h-10 px-4 py-2",
        sm: "min-h-8 rounded-md px-3 text-xs",
        lg: "min-h-11 rounded-lg px-6 text-[15px]",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
