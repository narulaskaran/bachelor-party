"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function LandingPanelSection({
  id,
  open,
  animate,
  labelledBy,
  children,
}: {
  id: string;
  open: boolean;
  animate: boolean;
  labelledBy: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      data-open={open ? "true" : "false"}
      inert={!open}
      aria-hidden={open ? undefined : true}
      aria-labelledby={labelledBy}
      className={cn(
        "col-start-1 row-start-1 grid min-h-0",
        open ? "grid-rows-[1fr] opacity-100" : "pointer-events-none grid-rows-[0fr] opacity-0",
        animate &&
          "transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none",
      )}
    >
      <div className="min-h-0 overflow-hidden">
        <div
          className={cn(
            "scroll-mt-20 py-10 sm:py-12",
            animate && "transition-transform duration-300 ease-out motion-reduce:transition-none",
            open ? "translate-y-0" : "translate-y-2",
          )}
        >
          {children}
        </div>
      </div>
    </section>
  );
}
