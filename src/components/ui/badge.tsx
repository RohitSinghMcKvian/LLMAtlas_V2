import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary/10 text-primary ring-1 ring-inset ring-primary/15",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        outline: "text-foreground",
        success: "border-transparent bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
        warning: "border-transparent bg-amber-500/15 text-amber-600 dark:text-amber-400",
        destructive: "border-transparent bg-destructive/15 text-destructive",
        learn: "border-transparent bg-sky-500/15 text-sky-700 dark:text-sky-300",
        research: "border-transparent bg-violet-500/15 text-violet-700 dark:text-violet-300",
        develop: "border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-400",
        "frontier-free":
          "border-transparent text-white font-semibold shadow-sm " +
          "bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 " +
          "dark:from-amber-400 dark:via-yellow-400 dark:to-amber-500",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
