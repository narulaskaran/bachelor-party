import type { Activity } from "@/lib/party-types";

const VOTE_OPTIONS = [
  { value: "hyped", label: "Hyped" },
  { value: "fine", label: "Fine either way" },
  { value: "pass", label: "Pass" },
];

export function VoteActivityGroup({
  activity,
  defaultValue,
}: {
  activity: Activity;
  defaultValue?: string;
}) {
  return (
    <fieldset
      role="radiogroup"
      aria-labelledby={`vote-${activity.slug}-label`}
      className="border-t border-border py-4 first:border-t-0"
    >
      <legend
        id={`vote-${activity.slug}-label`}
        className="float-none w-full font-medium"
      >
        {activity.name}
      </legend>
      {activity.description ? (
        <p className="mt-1 text-sm text-muted-foreground">
          {activity.description}
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {VOTE_OPTIONS.map((opt) => (
          <label
            key={opt.value}
            className="inline-flex cursor-pointer items-center rounded-full border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50"
          >
            <input
              type="radio"
              name={`pref:${activity.slug}`}
              value={opt.value}
              defaultChecked={defaultValue === opt.value}
              className="sr-only"
            />
            <span>{opt.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
