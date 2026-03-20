import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#123A69_0%,#0F2745_100%)] px-6 py-10">
      <div className="mx-auto grid min-h-[85vh] max-w-7xl items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="text-white">
          <div className="text-xs font-bold uppercase tracking-[0.3em] text-[#7DB3F1]">
            The Wire by SchoolAmplified
          </div>
          <h1 className="mt-4 max-w-3xl font-display text-6xl leading-none">
            Member login for school newsletter operations.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-200">
            Sign in to manage school profiles, member access, vector-linked content generation, and
            multi-channel publishing inside one system.
          </p>
        </section>

        <div className="flex justify-center lg:justify-end">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
