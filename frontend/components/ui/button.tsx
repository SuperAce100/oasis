import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-xl text-md font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive duration-300",
  {
    variants: {
      variant: {
        default:
          "border border-primary bg-primary/30 bg-gradient-to-b from-primary to-primary/50 text-primary-foreground shadow-lg shadow-slate-200/50 transition-all duration-200 hover:bg-white hover:shadow-lg active:bg-primary active:shadow-none hover:-translate-y-px active:translate-y-px",
        fancy:
          "border border-primary bg-primary/30 bg-radial-[at_50%_25%] from-primary/40 to-primary text-primary-foreground shadow-md inset-shadow-sm inset-shadow-white/50 transition-all duration-200 hover:bg-white hover:shadow-lg hover:inset-shadow-white active:bg-primary/30 active:shadow-none active:inset-shadow-primary/80  hover:-translate-y-px active:translate-y-px",
        destructive:
          "bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border shadow-lg hover:shadow-none shadow-slate-200/50 bg-transparent text-primary transition-all duration-200 hover:border-transparent hover:bg-primary/10 active:bg-primary/30",
        secondary:
          "border border-transparent bg-primary/10 text-primary transition-all duration-200 hover:border-primary/50 hover:bg-transparent  active:border-transparent active:border-primary active:ring-1",
        ghost:
          "bg-transparent text-primary transition-all duration-200 hover:border-transparent hover:bg-primary/10 active:bg-primary/30",
        link: "text-primary underline-offset-8 hover:underline-offset-4 active:underline-offset-2 hover:opacity-70 hover:underline active:text-foreground duration-100",
      },
      size: {
        default: "px-4 py-2",
        xs: "px-2 py-1.5 rounded-lg [&_svg:not([class*='size-'])]:size-3 text-xs",
        sm: "px-3 py-1.5 text-sm rounded-lg",
        lg: "px-5 py-2 text-lg",
        xl: "px-6 py-3 [&_svg:not([class*='size-'])]:size-5 text-xl",
        icon: "size-8 rounded-lg [&_svg:not([class*='size-'])]:size-4",
        iconSm: "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
        iconLg: "size-10 rounded-lg [&_svg:not([class*='size-'])]:size-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
