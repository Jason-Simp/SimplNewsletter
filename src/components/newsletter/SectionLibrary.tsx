import type { NewsletterSection } from "@/types/newsletter";

type Props = {
  sections: NewsletterSection[];
  onToggle: (id: string) => void;
};

export function SectionLibrary({ sections, onToggle }: Props) {
  return (
    <section className="rounded-editorial border border-slate-200 bg-white p-6 shadow-editorial">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand-secondary">
            Section Library
          </p>
          <h2 className="font-display text-3xl text-brand-navy">Newsletter structure</h2>
        </div>
        <p className="max-w-xs text-sm leading-6 text-brand-muted">
          Toggle sections on or off. In the real build this same model should drive web, email, PDF,
          blog, and HTML export rendering.
        </p>
      </div>

      <div className="grid gap-3">
        {sections.map((section) => (
          <button
            key={section.id}
            className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
              section.enabled
                ? "border-brand-primary/20 bg-brand-background"
                : "border-slate-200 bg-slate-50 text-slate-400"
            }`}
            onClick={() => onToggle(section.id)}
            type="button"
          >
            <div>
              <div className="font-semibold text-brand-text">{section.title}</div>
              <div className="text-sm capitalize text-brand-muted">{section.type.replaceAll("_", " ")}</div>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] ${
                section.enabled
                  ? "bg-brand-primary text-white"
                  : "bg-slate-200 text-slate-600"
              }`}
            >
              {section.enabled ? "Enabled" : "Hidden"}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
