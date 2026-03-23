"use client";

import { useEffect } from "react";

type NoticeTone = "success" | "error" | "info";

const toneStyles: Record<NoticeTone, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  error: "border-red-200 bg-red-50 text-red-900",
  info: "border-blue-200 bg-blue-50 text-blue-900"
};

export function ActionNotice({
  message,
  tone,
  onDismiss
}: {
  message: string;
  tone: NoticeTone;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const timeoutId = window.setTimeout(onDismiss, 4200);

    return () => window.clearTimeout(timeoutId);
  }, [message, onDismiss]);

  return (
    <div className="pointer-events-none fixed right-6 top-6 z-50 flex max-w-sm justify-end">
      <div
        className={`pointer-events-auto rounded-[22px] border px-5 py-4 shadow-[0_18px_44px_rgba(15,39,69,0.14)] ${toneStyles[tone]}`}
        role="status"
      >
        <div className="flex items-start gap-4">
          <div className="min-w-0">
            <div className="text-xs font-bold uppercase tracking-[0.22em]">Update</div>
            <p className="mt-1 text-sm font-medium leading-6">{message}</p>
          </div>
          <button
            aria-label="Dismiss notification"
            className="rounded-full border border-current/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em]"
            onClick={onDismiss}
            type="button"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
