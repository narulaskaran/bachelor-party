"use client";

import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export const LANDING_PANEL_MOTION_MS = 300;

export const landingPanelMotionClass =
  "duration-300 ease-out motion-reduce:transition-none";

export function LandingFold({
  open,
  animate,
  children,
  closedTranslateClass = "translate-y-2",
  className,
  innerClassName,
  ...props
}: {
  open: boolean;
  animate: boolean;
  children: ReactNode;
  closedTranslateClass?: string;
  innerClassName?: string;
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-landing-fold=""
      className={cn(
        "grid min-h-0",
        open ? "grid-rows-[1fr] opacity-100" : "pointer-events-none grid-rows-[0fr] opacity-0",
        animate && cn("transition-[grid-template-rows,opacity]", landingPanelMotionClass),
        className,
      )}
      {...props}
    >
      <div className="min-h-0 overflow-hidden">
        <div
          className={cn(
            animate && cn("transition-transform", landingPanelMotionClass),
            open ? "translate-y-0" : closedTranslateClass,
            innerClassName,
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

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
      className={cn("col-start-1 row-start-1 min-h-0", !open && "pointer-events-none")}
    >
      <LandingFold open={open} animate={animate} innerClassName="scroll-mt-20 py-10 sm:py-12">
        {children}
      </LandingFold>
    </section>
  );
}
