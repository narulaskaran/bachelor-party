"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  getPackingChecksSnapshot,
  parsePackingChecks,
  subscribePackingChecks,
  writePackingChecks,
} from "@/lib/packing-storage";
import type { PackingItem } from "@/lib/party-types";
import { nonemptyPacking } from "@/lib/trip-sections";
import { sectionTitleClass } from "@/lib/type";

export function PackingSection({
  packing,
  slug,
}: {
  packing: PackingItem[];
  slug: string;
}) {
  const items = nonemptyPacking(packing);
  // getServerSnapshot is already null, but the first client paint can still
  // call getSnapshot (window exists) when this fiber is not hydrating. Keep
  // checks empty until mount so Checkbox HTML matches the server.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);
  const raw = useSyncExternalStore(
    subscribePackingChecks,
    () => getPackingChecksSnapshot(slug),
    () => null,
  );
  const checked = parsePackingChecks(hydrated ? raw : null);

  function setItemChecked(title: string, value: boolean) {
    const next = { ...checked };
    if (value) next[title] = true;
    else delete next[title];
    writePackingChecks(slug, next);
  }

  if (items.length === 0) return null;

  return (
    <section id="pack" className="scroll-mt-20 py-12 sm:py-16">
      <h2 className={sectionTitleClass}>Pack</h2>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">Don&apos;t forget these.</p>

      <ul className="mt-8 flex max-w-xl flex-col">
        {items.map((item, index) => {
          const id = `pack-${index}`;
          const isChecked = Boolean(checked[item.title]);
          return (
            <li key={`${item.title}-${index}`}>
              <div className="flex min-h-11 items-center gap-3">
                <Checkbox
                  id={id}
                  checked={isChecked}
                  onCheckedChange={(value) => setItemChecked(item.title, value === true)}
                />
                <Label
                  htmlFor={id}
                  className="flex min-h-11 min-w-0 flex-1 cursor-pointer flex-col items-start justify-center text-left font-normal"
                >
                  <span className="font-medium">{item.title}</span>
                  {item.note ? (
                    <span className="text-sm text-muted-foreground">{item.note}</span>
                  ) : null}
                </Label>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
