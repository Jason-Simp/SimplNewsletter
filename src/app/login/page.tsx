import { LoginForm } from "@/components/auth/LoginForm";
import { HomeLink } from "@/components/navigation/HomeLink";

export default function LoginPage({
  searchParams
}: {
  searchParams?: { mode?: string; role?: string };
}) {
  const initialMode =
    searchParams?.mode === "signup" || searchParams?.mode === "magic" ? searchParams.mode : "signin";
  const audience = searchParams?.role === "admin" ? "admin" : "member";
  const supportBlocks =
    audience === "admin"
      ? [
          {
            title: "Best for implementers",
            body: "Use this path when you are setting up schools, managing users, checking readiness, or supporting multiple school dashboards."
          },
          {
            title: "What happens after sign-in",
            body: "You will land in the admin workspace where you can manage school profiles, users, website publishing, and setup progress."
          }
        ]
      : [
          {
            title: "Best for school teams",
            body: "Use this path if you are writing newsletters, reviewing drafts, or publishing for one school."
          },
          {
            title: "What happens after sign-up",
            body: "New users create the account first, then finish setup so the system knows which school workspace to use."
          }
        ];

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#123A69_0%,#0F2745_100%)] px-6 py-10">
      <div className="mx-auto grid min-h-[85vh] max-w-7xl items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="text-white">
          <HomeLink />
          <div className="mt-6 text-xs font-bold uppercase tracking-[0.3em] text-[#7DB3F1]">
            The Wire by SchoolAmplified
          </div>
          <h1 className="mt-4 max-w-3xl font-display text-6xl leading-none">
            {audience === "admin"
              ? "Admin access for multi-school implementation."
              : "Secure access for school newsletter teams."}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-200">
            {audience === "admin"
              ? "Use this login for implementation and admin dashboard work across multiple schools."
              : "Existing members can sign in. New invited users can create an account with their signup code and start working inside their school workspace."}
          </p>

          <div className="mt-8 grid max-w-2xl gap-4">
            {supportBlocks.map((block) => (
              <div key={block.title} className="rounded-[24px] border border-white/10 bg-white/5 p-5">
                <div className="text-sm font-semibold text-white">{block.title}</div>
                <div className="mt-2 text-sm leading-6 text-slate-200">{block.body}</div>
              </div>
            ))}
          </div>
        </section>

        <div className="flex justify-center lg:justify-end">
          <LoginForm audience={audience} initialMode={initialMode} />
        </div>
      </div>
    </main>
  );
}
