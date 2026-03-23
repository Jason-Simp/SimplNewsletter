"use client";

import { useEffect, useMemo, useState } from "react";

import { extractPaletteFromImage } from "@/lib/color-extraction";
import { useAuthSession } from "@/lib/auth-client";
import type { SchoolProfile } from "@/types/school";
import type { MemberRecord } from "@/types/member";

const emptySchool: SchoolProfile = {
  id: "demo-new-school",
  name: "",
  tagline: "",
  logoUrl: "/brand/the-wire-logo.svg",
  websiteUrl: "",
  contactEmail: "",
  phone: "",
  address: "",
  primaryColor: "#123A69",
  secondaryColor: "#86201A",
  accentColor: "#3E86D1",
  backgroundColor: "#F7F9FC",
  textColor: "#142033",
  publishMode: "instant",
  generationProvider: "none",
  knowledgeProvider: "none",
  syncProvider: "none",
  assistantReference: "",
  integrationEndpoint: "",
  encryptedKnowledgeRef: ""
};

export function SchoolManager() {
  const { session } = useAuthSession();
  const [schools, setSchools] = useState<SchoolProfile[]>([]);
  const [activeSchoolId, setActiveSchoolId] = useState("");
  const [form, setForm] = useState<SchoolProfile>(emptySchool);
  const [status, setStatus] = useState("Loading schools...");
  const [member, setMember] = useState<MemberRecord | null>(null);

  useEffect(() => {
    async function loadMember() {
      if (!session?.user?.email) {
        return;
      }

      const response = await fetch(`/api/members/me?email=${encodeURIComponent(session.user.email)}`);
      const payload = response.ok ? await response.json() : null;
      setMember(payload?.data ?? null);
    }

    void loadMember();
  }, [session?.user?.email]);

  useEffect(() => {
    async function loadSchools() {
      const response = await fetch("/api/schools");
      const payload = await response.json();
      const allSchools = payload.data as SchoolProfile[];
      const nextSchools =
        member?.role === "company_admin"
          ? allSchools
          : allSchools.filter((school) => school.id === member?.schoolId);

      setSchools(nextSchools);
      if (nextSchools.length > 0) {
        setActiveSchoolId(nextSchools[0].id);
        setForm(nextSchools[0]);
      }
      setStatus("Schools loaded.");
    }

    if (member || !session?.user?.email) {
      void loadSchools();
    }
  }, [member, session?.user?.email]);

  useEffect(() => {
    const nextSchool = schools.find((school) => school.id === activeSchoolId);
    if (nextSchool) {
      setForm(nextSchool);
    }
  }, [activeSchoolId, schools]);

  const swatches = useMemo(
    () => [form.primaryColor, form.secondaryColor, form.accentColor, form.backgroundColor],
    [form]
  );

  const updateField = (field: keyof SchoolProfile, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  };

  const saveSchool = async () => {
    setStatus("Saving school profile...");
    const response = await fetch("/api/schools", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(form)
    });
    const payload = await response.json();

    if (!response.ok) {
      setStatus(payload?.message ?? "Unable to save school.");
      return;
    }

    const saved = payload.data as SchoolProfile;
    setSchools((current) => {
      const existing = current.find((school) => school.id === saved.id);
      if (existing) {
        return current.map((school) => (school.id === saved.id ? saved : school));
      }

      return [saved, ...current];
    });
    setActiveSchoolId(saved.id);
    setForm(saved);
    setStatus("School profile saved.");
  };

  const pullColors = async () => {
    try {
      setStatus("Pulling colors from logo...");
      const palette = await extractPaletteFromImage(form.logoUrl);
      setForm((current) => ({
        ...current,
        primaryColor: palette.primary,
        secondaryColor: palette.secondary,
        accentColor: palette.accent
      }));
      setStatus("Logo colors matched.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Color extraction failed.");
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
      <section className="rounded-editorial border border-slate-200 bg-[#F7F9FC] p-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.3em] text-brand-secondary">Schools</div>
            <h2 className="mt-2 font-display text-3xl text-brand-navy">Profiles</h2>
          </div>
          <button
            className="rounded-full bg-brand-primary px-4 py-2 text-sm font-semibold uppercase tracking-[0.12em] text-white"
            disabled={member?.role !== "company_admin"}
            onClick={() => {
              setActiveSchoolId("demo-new-school");
              setForm({ ...emptySchool, id: `demo-new-school-${Date.now()}` });
            }}
            type="button"
          >
            {member?.role === "company_admin" ? "Add school" : "Current school"}
          </button>
        </div>

        <div className="mt-5 grid gap-3">
          {schools.map((school) => (
            <button
              key={school.id}
              className={`rounded-[24px] border px-4 py-4 text-left ${
                activeSchoolId === school.id ? "border-brand-primary bg-white" : "border-slate-200 bg-white/70"
              }`}
              onClick={() => setActiveSchoolId(school.id)}
              type="button"
            >
              <div className="font-semibold text-brand-text">{school.name}</div>
              <div className="mt-1 text-sm text-brand-muted">{school.contactEmail || school.tagline}</div>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-editorial border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.3em] text-brand-secondary">School setup</div>
            <h2 className="mt-2 font-display text-3xl text-brand-navy">Profile and assistant connection</h2>
          </div>
          <div className="rounded-full bg-brand-background px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-brand-primary">
            {status}
          </div>
        </div>

        <div className="mt-6 rounded-[24px] bg-[#EAF2FB] p-5 text-sm leading-7 text-brand-muted">
          <p className="font-semibold text-brand-text">How to fill this out</p>
          <p className="mt-2">
            This page sets up one school&apos;s branding and assistant. Global API keys stay in Render.
            This form is only for the school-specific assistant ID, assistant chat link, and knowledge
            base reference.
          </p>
          <p className="mt-2">
            If this school uses ElevenLabs, choose ElevenLabs as the writing provider, enter that
            school&apos;s ElevenLabs agent ID, paste the assistant chat link, and choose where the
            knowledge lives.
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Input label="School name" value={form.name} onChange={(value) => updateField("name", value)} />
          <Input label="Tagline" value={form.tagline} onChange={(value) => updateField("tagline", value)} />
          <Input label="Website" value={form.websiteUrl} onChange={(value) => updateField("websiteUrl", value)} />
          <Input label="Contact email" value={form.contactEmail} onChange={(value) => updateField("contactEmail", value)} />
          <Input label="Phone" value={form.phone} onChange={(value) => updateField("phone", value)} />
          <Input label="Address" value={form.address} onChange={(value) => updateField("address", value)} />
          <Input label="Logo URL" value={form.logoUrl} onChange={(value) => updateField("logoUrl", value)} />
          <Input
            help="Enter the school's assistant or agent ID."
            label="Assistant ID"
            value={form.assistantReference}
            onChange={(value) => updateField("assistantReference", value)}
          />
          <Input
            help="Paste the full assistant chat or embed link if you want it inside the builder."
            label="Assistant chat link"
            value={form.integrationEndpoint}
            onChange={(value) => updateField("integrationEndpoint", value)}
          />
          <Input
            help="Enter the school-specific code or reference for the knowledge base."
            label="Knowledge base code"
            value={form.encryptedKnowledgeRef}
            onChange={(value) => updateField("encryptedKnowledgeRef", value)}
          />
          <SelectField
            help="Choose the system that should write this school's newsletters."
            label="Who writes the newsletter?"
            onChange={(value) =>
              updateField("generationProvider", value as SchoolProfile["generationProvider"])
            }
            options={[
              ["elevenlabs", "ElevenLabs"],
              ["openai", "OpenAI"],
              ["n8n", "n8n"],
              ["custom", "Custom bridge"],
              ["none", "Manual only"]
            ]}
            value={form.generationProvider}
          />
          <SelectField
            help="Choose where the assistant gets its knowledge."
            label="Where does the assistant's knowledge live?"
            onChange={(value) =>
              updateField("knowledgeProvider", value as SchoolProfile["knowledgeProvider"])
            }
            options={[
              ["supabase", "Supabase vector store"],
              ["openai", "OpenAI vector store"],
              ["elevenlabs", "ElevenLabs knowledge base"],
              ["n8n", "n8n"],
              ["custom", "Custom bridge"],
              ["none", "None"]
            ]}
            value={form.knowledgeProvider}
          />
          <SelectField
            help="Choose where finished newsletters should be sent back after publishing."
            label="Where should finished newsletters sync?"
            onChange={(value) => updateField("syncProvider", value as SchoolProfile["syncProvider"])}
            options={[
              ["elevenlabs", "ElevenLabs"],
              ["openai", "OpenAI"],
              ["supabase", "Supabase"],
              ["n8n", "n8n"],
              ["custom", "Custom bridge"],
              ["none", "No sync"]
            ]}
            value={form.syncProvider}
          />
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[24px] bg-brand-background p-4">
          <div>
            <div className="font-semibold text-brand-text">Brand colors</div>
            <div className="mt-1 text-sm text-brand-muted">Use logo colors or set exact hex values.</div>
          </div>
          <button
            className="rounded-full bg-brand-secondary px-4 py-2 text-sm font-semibold uppercase tracking-[0.12em] text-white"
            onClick={() => void pullColors()}
            type="button"
          >
            Match logo colors
          </button>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ColorField label="Primary" value={form.primaryColor} onChange={(value) => updateField("primaryColor", value)} />
          <ColorField label="Secondary" value={form.secondaryColor} onChange={(value) => updateField("secondaryColor", value)} />
          <ColorField label="Accent" value={form.accentColor} onChange={(value) => updateField("accentColor", value)} />
          <ColorField label="Background" value={form.backgroundColor} onChange={(value) => updateField("backgroundColor", value)} />
        </div>

        <div className="mt-6 rounded-[24px] border border-slate-200 p-4">
          <div className="text-sm font-semibold text-brand-text">Live palette</div>
          <div className="mt-3 flex flex-wrap gap-3">
            {swatches.map((swatch) => (
              <div key={swatch} className="flex items-center gap-3 rounded-full border border-slate-200 px-3 py-2">
                <span className="h-6 w-6 rounded-full border border-slate-200" style={{ backgroundColor: swatch }} />
                <span className="text-sm font-semibold text-brand-text">{swatch}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <button
            className="rounded-full bg-brand-primary px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white"
            onClick={() => void saveSchool()}
            type="button"
          >
            Save school profile
          </button>
        </div>
      </section>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  help
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  help?: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-brand-text">{label}</span>
      {help ? <span className="text-sm leading-6 text-brand-muted">{help}</span> : null}
      <input className="rounded-2xl border border-slate-200 px-4 py-3" onChange={(event) => onChange(event.target.value)} value={value} />
    </label>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-brand-text">{label}</span>
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 px-3 py-3">
        <input className="h-10 w-12 rounded border border-slate-200" onChange={(event) => onChange(event.target.value)} type="color" value={value} />
        <input className="w-full outline-none" onChange={(event) => onChange(event.target.value)} value={value} />
      </div>
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  help
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: [string, string][];
  help?: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-brand-text">{label}</span>
      {help ? <span className="text-sm leading-6 text-brand-muted">{help}</span> : null}
      <select
        className="rounded-2xl border border-slate-200 px-4 py-3"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}
