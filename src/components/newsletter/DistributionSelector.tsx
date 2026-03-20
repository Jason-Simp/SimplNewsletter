import type { DistributionOption } from "@/types/newsletter";

type Props = {
  options: DistributionOption[];
  onToggle: (channel: DistributionOption["channel"]) => void;
};

export function DistributionSelector({ options, onToggle }: Props) {
  return (
    <section className="rounded-editorial border border-slate-200 bg-white p-6 shadow-editorial">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand-secondary">
            Distribution targets
          </p>
          <h2 className="mt-2 font-display text-3xl text-brand-navy">Choose per issue</h2>
        </div>
        <p className="max-w-xs text-sm leading-6 text-brand-muted">
          Not every issue needs every output. Writers should select only the channels they want to
          generate or publish for that newsletter.
        </p>
      </div>

      <div className="grid gap-3">
        {options.map((option) => (
          <button
            key={option.channel}
            className={`rounded-[24px] border p-4 text-left ${
              option.selected ? "border-brand-primary bg-brand-background" : "border-slate-200"
            }`}
            onClick={() => onToggle(option.channel)}
            type="button"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="text-base font-semibold text-brand-text">{option.label}</div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] ${
                  option.selected ? "bg-brand-primary text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                {option.selected ? "Selected" : "Off"}
              </span>
            </div>
            <div className="mt-2 text-sm leading-6 text-brand-muted">{option.description}</div>
          </button>
        ))}
      </div>
    </section>
  );
}
