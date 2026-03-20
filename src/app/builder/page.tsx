import Image from "next/image";
import Link from "next/link";

import { IssueWizard } from "@/components/newsletter/IssueWizard";

export default function BuilderPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f6efe4_0%,#f4f8fc_48%,#ffffff_100%)] px-6 py-8 lg:px-10">
      <div className="mx-auto grid max-w-7xl gap-8">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-editorial border border-white/70 bg-white/80 px-6 py-5 shadow-editorial backdrop-blur">
          <div className="flex items-center gap-4">
            <Image
              alt="SchoolAmplified logo"
              className="h-11 w-auto"
              height={44}
              priority
              src="/brand/schoolamplified-logo.png"
              width={235}
            />
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-secondary">
                Front-end prototype
              </div>
              <div className="text-lg font-semibold text-brand-navy">Newsletter Builder Workspace</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-brand-text"
              href="/"
            >
              Overview
            </Link>
            <a
              className="rounded-full bg-brand-primary px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white"
              href="/TASKS.md"
            >
              Build phases
            </a>
          </div>
        </header>

        <IssueWizard />
      </div>
    </main>
  );
}
