const distributionChannels = [
  {
    name: "Hosted web",
    description: "Publish to a branded school URL with archive support and analytics hooks.",
    status: "Ready next"
  },
  {
    name: "Email send",
    description: "Generate email-safe HTML, subject line, preview text, and future list sending jobs.",
    status: "Architecture defined"
  },
  {
    name: "Blog publish",
    description: "Create article-ready HTML for CMS posting or future adapter-based publishing.",
    status: "Renderer planned"
  },
  {
    name: "PDF export",
    description: "Separate print-aware layout inspired by the editorial sample newsletter.",
    status: "Worker task planned"
  },
  {
    name: "HTML export",
    description: "Produce standalone HTML for websites, archives, or manual publishing.",
    status: "Renderer planned"
  }
];

export function DistributionPanel() {
  return (
    <section className="rounded-editorial border border-slate-200 bg-[#0f2745] p-6 text-white shadow-editorial">
      <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#f3c7b7]">Distribution</p>
      <h2 className="mt-2 font-display text-3xl">One draft, many channels</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200">
        Distribution is treated as a product surface instead of an afterthought. The builder should
        preview and prepare every channel from the same structured source.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {distributionChannels.map((channel) => (
          <article key={channel.name} className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="text-sm font-bold uppercase tracking-[0.2em] text-[#e7b55e]">
              {channel.status}
            </div>
            <h3 className="mt-3 text-xl font-semibold">{channel.name}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-200">{channel.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
