import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({
  className,
  showHandle = true,
  ...props
}: React.ComponentProps<"textarea"> & { showHandle?: boolean }) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-input placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/30 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-16 w-full rounded-xl border bg-transparent p-3 text-base shadow-md shadow-secondary/80 transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        showHandle ? "resize-y" : "resize-none",
        "hover:shadow-none hover:bg-muted hover:border-border/0 transition-all duration-200 ease-out",
        className
      )}
      {...props}
    />
  );
}

export { Textarea };
