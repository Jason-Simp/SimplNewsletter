export default function AdminPage() {
  return (
    <section className="grid gap-6">
      <div>
        <div className="text-xs font-bold uppercase tracking-[0.3em] text-brand-secondary">Overview</div>
        <h1 className="mt-2 font-display text-5xl text-brand-navy">Admin dashboard</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-brand-muted">
          Use this dashboard to manage schools, member access, branding, publishing defaults, and agent
          integrations for The Wire.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Stat label="Schools" value="12" />
        <Stat label="Active members" value="38" />
        <Stat label="Issues published" value="148" />
        <Stat label="Agent-linked schools" value="9" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-editorial border border-slate-200 bg-[#F7F9FC] p-6">
          <div className="text-sm font-semibold text-brand-text">What this dashboard needs to control</div>
          <ul className="mt-4 grid gap-3 text-sm leading-6 text-brand-muted">
            <li>School profile setup and branding</li>
            <li>Member login and invite flows</li>
            <li>Publishing mode defaults by school</li>
            <li>Vector project code linkage</li>
            <li>Distribution defaults and archive settings</li>
          </ul>
        </article>

        <article className="rounded-editorial border border-slate-200 bg-white p-6">
          <div className="text-sm font-semibold text-brand-text">Next connected systems</div>
          <ul className="mt-4 grid gap-3 text-sm leading-6 text-brand-muted">
            <li>Supabase auth roles and member invitations</li>
            <li>School-specific agent endpoint configuration</li>
            <li>Render worker jobs for PDF, audio, and video processing</li>
            <li>Final vector-store sync tracking and audit history</li>
          </ul>
        </article>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-editorial border border-slate-200 bg-white p-6">
      <div className="text-xs font-bold uppercase tracking-[0.25em] text-brand-secondary">{label}</div>
      <div className="mt-3 text-4xl font-bold text-brand-navy">{value}</div>
    </article>
  );
}
