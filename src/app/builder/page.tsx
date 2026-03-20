import Image from "next/image";
import Link from "next/link";

import { IssueWizard } from "@/components/newsletter/IssueWizard";
import { schoolAmplifiedBrand } from "@/lib/brand";

export default function BuilderPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#123A69_0%,#0F2745_100%)] px-6 py-8 lg:px-10">
      <div className="mx-auto grid max-w-7xl gap-8">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-editorial border border-white/10 bg-white px-6 py-5 shadow-editorial">
          <div className="flex items-center gap-4">
            <Image
              alt="The Wire by SchoolAmplified logo"
              className="h-11 w-auto"
              height={64}
              priority
              src={schoolAmplifiedBrand.logoUrl}
              width={280}
            />
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-secondary">
                {schoolAmplifiedBrand.name}
              </div>
              <div className="text-lg font-semibold text-brand-navy">Publishing Workspace</div>
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
