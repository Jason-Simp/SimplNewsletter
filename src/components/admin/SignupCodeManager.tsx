"use client";

import { useEffect, useState } from "react";

import type { SignupCodeRecord } from "@/types/signup-code";

export function SignupCodeManager() {
  const [codes, setCodes] = useState<SignupCodeRecord[]>([]);
  const [status, setStatus] = useState("Loading codes...");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [maxUses, setMaxUses] = useState("");

  useEffect(() => {
    async function loadCodes() {
      const response = await fetch("/api/signup-codes");
      const payload = await response.json();
      setCodes(payload.data ?? []);
      setStatus("Codes loaded.");
    }

    void loadCodes();
  }, []);

  const saveCode = async () => {
    setStatus("Saving code...");

    const response = await fetch("/api/signup-codes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        code,
        description,
        maxUses: maxUses ? Number(maxUses) : null
      })
    });

    const payload = await response.json();

    if (!response.ok) {
      setStatus(payload?.message ?? "Unable to save code.");
      return;
    }

    setCodes((current) => [payload.data, ...current.filter((item) => item.code !== payload.data.code)]);
    setCode("");
    setDescription("");
    setMaxUses("");
    setStatus("Code saved.");
  };

  return (
    <section className="grid gap-6">
      <div>
        <div className="text-xs font-bold uppercase tracking-[0.3em] text-brand-secondary">Signup codes</div>
        <h1 className="mt-2 font-display text-4xl text-brand-navy">Controlled account creation</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-brand-muted">
          Only people with a valid code can create an account. The default launch code is `thewire`.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded-editorial border border-slate-200 bg-[#F7F9FC] p-6">
          <div className="text-sm font-semibold text-brand-text">Create signup code</div>
          <div className="mt-4 grid gap-3">
            <input
              className="rounded-2xl border border-slate-200 px-4 py-3"
              onChange={(event) => setCode(event.target.value)}
              placeholder="Code"
              value={code}
            />
            <input
              className="rounded-2xl border border-slate-200 px-4 py-3"
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Description"
              value={description}
            />
            <input
              className="rounded-2xl border border-slate-200 px-4 py-3"
              onChange={(event) => setMaxUses(event.target.value)}
              placeholder="Max uses (optional)"
              value={maxUses}
            />
            <button
              className="rounded-full bg-brand-primary px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white"
              onClick={() => void saveCode()}
            >
              Save code
            </button>
            <div className="rounded-2xl bg-white px-4 py-3 text-sm text-brand-muted">{status}</div>
          </div>
        </article>

        <article className="rounded-editorial border border-slate-200 bg-white p-6">
          <div className="text-sm font-semibold text-brand-text">Active codes</div>
          <div className="mt-4 grid gap-3">
            {codes.map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-200 px-4 py-4">
                <div className="font-semibold text-brand-text">{item.code}</div>
                <div className="mt-1 text-sm text-brand-muted">
                  {item.description || "No description"}
                </div>
                <div className="mt-1 text-sm text-brand-muted">
                  Uses: {item.useCount}
                  {item.maxUses !== null ? ` / ${item.maxUses}` : " / unlimited"}
                </div>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
