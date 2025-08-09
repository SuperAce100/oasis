"use client";

import * as React from "react";
import { Calendar as CalendarUI } from "@/components/ui/calendar";

export type CalendarAppProps = React.HTMLAttributes<HTMLDivElement>;

export function CalendarApp({ className, ...props }: CalendarAppProps) {
  const [selected, setSelected] = React.useState<Date | undefined>(new Date());

  return (
    <div className={"w-full h-full p-1 " + (className ?? "")} {...props}>
      <CalendarUI
        mode="single"
        selected={selected}
        onSelect={setSelected}
        className="rounded-md"
      />
    </div>
  );
}

export default CalendarApp;


