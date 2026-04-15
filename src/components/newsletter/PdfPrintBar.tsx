"use client";

import { useEffect } from "react";

export function PdfPrintBar({ autoPrint = false }: { autoPrint?: boolean }) {
  useEffect(() => {
    if (!autoPrint) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      window.print();
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [autoPrint]);

  return (
    <div className="mb-6 rounded-[28px] border border-slate-200 bg-white px-6 py-5 shadow-editorial print:hidden">
      <div className="text-xs font-bold uppercase tracking-[0.3em] text-brand-secondary">PDF export</div>
      <h1 className="mt-2 font-display text-4xl text-brand-navy">Print or save as PDF</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-brand-muted">
        This view is formatted for a clean browser print. Use the button below, then choose
        &quot;Save as PDF&quot; in your browser.
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <button
          className="rounded-full bg-brand-primary px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white"
          onClick={() => window.print()}
          type="button"
        >
          Print or save as PDF
        </button>
      </div>
    </div>
  );
}
