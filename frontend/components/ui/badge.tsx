import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

type Color = "emerald" | "red" | "amber" | "sky" | "indigo" | "orange" | "primary";

const colorVariantsFancy = {
  primary: "border-primary/10 from-primary/10 to-primary/50 hover:bg-primary/10 text-primary/80",
  emerald:
    "border-emerald-300 from-emerald-200/20 to-emerald-300 hover:bg-emerald-100 text-emerald-600",
  red: "border-red-300 from-red-200/50 to-red-400/80 hover:bg-red-100 text-red-600",
  amber: "border-amber-300 from-amber-200/20 to-amber-200 hover:bg-amber-100 text-amber-600",
  sky: "border-sky-300 from-sky-200/20 to-sky-300 hover:bg-sky-100 text-sky-600",
  indigo: "border-indigo-300 from-indigo-200/20 to-indigo-300 hover:bg-indigo-100 text-indigo-600",
  orange: "border-orange-300 from-orange-200/20 to-orange-300 hover:bg-orange-100 text-orange-600",
};

const colorVariantsRegular = {
  primary: "bg-primary/10 hover:bg-primary/20 text-primary/80",
  emerald: "bg-emerald-100 hover:bg-emerald-200 text-emerald-600",
  red: "bg-red-100 hover:bg-red-200 text-red-600",
  amber: "bg-amber-100 hover:bg-amber-200 text-amber-600",
  sky: "bg-sky-100 hover:bg-sky-200 text-sky-600",
  indigo: "bg-indigo-100 hover:bg-indigo-200 text-indigo-600",
  orange: "bg-orange-100 hover:bg-orange-200 text-orange-600",
};

const colorVariantsOutline = {
  primary: "hover:bg-primary/10 hover:border-primary/80 [&>svg]:text-primary",
  emerald: "hover:bg-emerald-100 hover:border-emerald-300 [&>svg]:text-emerald-400",
  red: "hover:bg-red-100 hover:border-red-300 [&>svg]:text-red-400",
  amber: "hover:bg-amber-100 hover:border-amber-300 [&>svg]:text-amber-400",
  sky: "hover:bg-sky-100 hover:border-sky-300 [&>svg]:text-sky-400",
  indigo: "hover:bg-indigo-100 hover:border-indigo-300 [&>svg]:text-indigo-400",
  orange: "hover:bg-orange-100 hover:border-orange-300 [&>svg]:text-orange-400",
};

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-lg border px-1.5 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-0.5 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-all duration-300 overflow-hidden",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        regular: "border-none",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive:
          "border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground hover:bg-border/50",
        fancy:
          "bg-white bg-radial-[at_40%_30%] shadow-md inset-shadow-sm shadow-slate-400/10 inset-shadow-white/70 hover:scale-105 hover:rotate-2",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const colorVariantSets: Record<string, Record<Color, string>> = {
  fancy: colorVariantsFancy,
  regular: colorVariantsRegular,
  outline: colorVariantsOutline,
};

const dotVariants = cva("h-2 w-2 rounded-full mr-0.5", {
  variants: {
    color: {
      emerald: "bg-emerald-400",
      red: "bg-red-400",
      amber: "bg-amber-400",
      sky: "bg-sky-400",
      indigo: "bg-indigo-400",
      orange: "bg-orange-400",
      primary: "bg-primary/80",
    },
  },
});

function Badge({
  className,
  variant,
  asChild = false,
  color = "primary",
  showDot = false,
  children,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean; color?: Color; showDot?: boolean }) {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      data-slot="badge"
      className={cn(
        badgeVariants({ variant }),
        colorVariantSets[variant || "default"]?.[color],
        className
      )}
      {...props}
    >
      {showDot && <div className={dotVariants({ color })}></div>}
      {children}
    </Comp>
  );
}

export { Badge, badgeVariants };
export type { Color };
