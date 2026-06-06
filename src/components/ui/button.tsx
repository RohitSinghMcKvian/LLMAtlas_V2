"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90 hover:shadow-md hover:shadow-primary/30 active:scale-[0.98]",
        gradient:
          "bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-500 text-white shadow-sm shadow-violet-500/20 hover:shadow-lg hover:shadow-violet-500/30 hover:brightness-110 active:scale-[0.98]",
        /**
         * brand — the signature amber→pink→violet→indigo gradient CTA.
         * Use for primary marketing/hero actions. Glow + subtle lift on hover.
         */
        brand:
          "brand-gradient text-white font-semibold shadow-lg shadow-violet-500/25 hover:shadow-xl hover:shadow-violet-500/35 hover:brightness-[1.07] active:scale-[0.98] [text-shadow:0_1px_2px_rgba(0,0,0,0.15)]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        /**
         * heroSecondary — designed for the dark video hero section.
         * Glass-morphism style: subtle white border + translucent bg.
         * Works beautifully on both the dark hero and dark-mode body.
         */
        heroSecondary:
          "border border-white/20 bg-white/[0.06] text-white/90 backdrop-blur-sm hover:bg-white/[0.12] hover:border-white/35 hover:text-white active:scale-[0.98] shadow-sm",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-12 rounded-lg px-6 text-base",
        xl: "h-14 rounded-xl px-8 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
