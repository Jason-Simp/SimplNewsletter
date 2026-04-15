const distributionChannels = [
  {
    name: "School website feed",
    description: "Add each newsletter to the hosted school archive and expose it through a feed that a website can pull automatically.",
    status: "Ready"
  },
  {
    name: "PDF export",
    description: "Separate print-aware layout inspired by the editorial sample newsletter.",
    status: "Next"
  }
];

export function DistributionPanel() {
  return (
    <section className="rounded-editorial border border-slate-200 bg-[#0f2745] p-6 text-white shadow-editorial">
      <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#f3c7b7]">Distribution</p>
      <h2 className="mt-2 font-display text-3xl">Website and PDF</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200">
        Keep this part simple. The main delivery path is the school&apos;s website feed and archive, with PDF
        as the optional export when someone needs a file.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
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
