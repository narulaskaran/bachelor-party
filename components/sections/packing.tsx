"use client";

import { useSyncExternalStore, type ReactNode } from "react";
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
  preview = false,
}: {
  packing: PackingItem[];
  slug: string;
  /** Host guest preview — static list, no checkoff or packing-storage writes. */
  preview?: boolean;
}) {
  const items = nonemptyPacking(packing);
  if (items.length === 0) return null;
  if (preview) return <StaticPackingList items={items} />;
  return <InteractivePackingList items={items} slug={slug} />;
}

function PackingShell({ children }: { children: ReactNode }) {
  return (
    <section id="pack" className="scroll-mt-20 py-12 sm:py-16">
      <h2 className={sectionTitleClass}>Pack</h2>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">Don&apos;t forget these.</p>
      <ul className="mt-8 flex max-w-xl flex-col">{children}</ul>
    </section>
  );
}

function ItemCopy({ item }: { item: PackingItem }) {
  return (
    <>
      <span className="font-medium">{item.title}</span>
      {item.note ? <span className="text-sm text-muted-foreground">{item.note}</span> : null}
    </>
  );
}

function StaticPackingList({ items }: { items: PackingItem[] }) {
  return (
    <PackingShell>
      {items.map((item, index) => (
        <li key={`${item.title}-${index}`}>
          <div className="flex min-h-11 flex-col items-start justify-center text-left">
            <ItemCopy item={item} />
          </div>
        </li>
      ))}
    </PackingShell>
  );
}

function InteractivePackingList({
  items,
  slug,
}: {
  items: PackingItem[];
  slug: string;
}) {
  const raw = useSyncExternalStore(
    subscribePackingChecks,
    () => getPackingChecksSnapshot(slug),
    () => null,
  );
  const checked = parsePackingChecks(raw);

  function setItemChecked(title: string, value: boolean) {
    const next = { ...checked };
    if (value) next[title] = true;
    else delete next[title];
    writePackingChecks(slug, next);
  }

  return (
    <PackingShell>
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
                <ItemCopy item={item} />
              </Label>
            </div>
          </li>
        );
      })}
    </PackingShell>
  );
}
