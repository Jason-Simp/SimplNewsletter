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
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [activeSchoolId, setActiveSchoolId] = useState("");
  const [form, setForm] = useState<SchoolProfile>(emptySchool);
  const [status, setStatus] = useState("Loading schools...");
  const [member, setMember] = useState<MemberRecord | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState<"school_admin" | "editor">("editor");
  const [logoStatus, setLogoStatus] = useState("No logo uploaded.");

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
      const [schoolsResponse, membersResponse] = await Promise.all([
        fetch("/api/schools"),
        fetch("/api/members")
      ]);
      const schoolsPayload = await schoolsResponse.json();
      const membersPayload = await membersResponse.json();
      const allSchools = schoolsPayload.data as SchoolProfile[];
      const allMembers = (membersPayload.data as MemberRecord[]) ?? [];
      const nextSchools =
        member?.role === "company_admin"
          ? allSchools
          : allSchools.filter((school) => school.id === member?.schoolId);
      const nextMembers =
        member?.role === "company_admin"
          ? allMembers
          : allMembers.filter((item) => item.schoolId === member?.schoolId);

      setSchools(nextSchools);
      setMembers(nextMembers);
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

  const updateField = (field: keyof SchoolProfile, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  };

  const schoolMembers = useMemo(
    () => members.filter((item) => item.schoolId === activeSchoolId),
    [activeSchoolId, members]
  );

  const saveSchool = async () => {
    setStatus("Saving school profile...");
    const response = await fetch("/api/schools", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        ...form,
        generationProvider: "elevenlabs",
        knowledgeProvider: "elevenlabs",
        syncProvider: "elevenlabs"
      })
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

  const uploadLogo = async (file: File | null) => {
    if (!file) {
      return;
    }

    if (!activeSchoolId) {
      setLogoStatus("Save the school once before uploading a logo.");
      return;
    }

    setLogoStatus("Uploading logo...");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("newsletterId", "");
      formData.append("schoolId", activeSchoolId);
      formData.append("organizationName", form.name || "school");

      const response = await fetch("/api/media/upload", {
        method: "POST",
        body: formData
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.message ?? "Unable to upload logo.");
      }

      const nextLogoUrl = payload?.data?.url ?? URL.createObjectURL(file);
      setForm((current) => ({
        ...current,
        logoUrl: nextLogoUrl
      }));
      setLogoStatus("Logo uploaded.");
      const palette = await extractPaletteFromImage(nextLogoUrl);
      setForm((current) => ({
        ...current,
        logoUrl: nextLogoUrl,
        primaryColor: palette.primary,
        secondaryColor: palette.secondary,
        accentColor: palette.accent
      }));
    } catch (error) {
      setLogoStatus(error instanceof Error ? error.message : "Logo upload failed.");
    }
  };

  const addSchoolUser = async () => {
    if (!activeSchoolId || !userEmail.trim()) {
      setStatus("Add a user email first.");
      return;
    }

    setStatus("Sending school invite...");

    const response = await fetch("/api/members", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        schoolId: activeSchoolId,
        email: userEmail.trim(),
        fullName: userName.trim(),
        role: userRole,
        isActive: true,
        invite: true
      })
    });

    const payload = await response.json();

    if (!response.ok) {
      setStatus(payload?.message ?? "Unable to save school user.");
      return;
    }

    const nextMember = payload?.data?.member ?? payload?.data;

    setMembers((current) => [nextMember, ...current.filter((item) => item.id !== nextMember.id)]);
    setUserEmail("");
    setUserName("");
    setUserRole("editor");
    setStatus(payload?.data?.inviteSent ? "Invite email sent." : "School user saved.");
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

        <div className="mt-6 rounded-[24px] border border-slate-200 p-5">
          <div className="text-xs font-bold uppercase tracking-[0.3em] text-brand-secondary">Basic school info</div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Input label="School name" value={form.name} onChange={(value) => updateField("name", value)} />
          <Input label="Tagline" value={form.tagline} onChange={(value) => updateField("tagline", value)} />
          <Input label="Website" value={form.websiteUrl} onChange={(value) => updateField("websiteUrl", value)} />
          <Input label="Contact email" value={form.contactEmail} onChange={(value) => updateField("contactEmail", value)} />
          <Input label="Phone" value={form.phone} onChange={(value) => updateField("phone", value)} />
          <Input label="Address" value={form.address} onChange={(value) => updateField("address", value)} />
          <Input label="Logo URL" value={form.logoUrl} onChange={(value) => updateField("logoUrl", value)} />
          </div>
        </div>

        <div className="mt-6 rounded-[24px] border border-slate-200 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs font-bold uppercase tracking-[0.3em] text-brand-secondary">Assistant setup</div>
            <div className="rounded-full bg-brand-background px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-brand-primary">
              ElevenLabs MVP
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Input
            help="Enter the school's assistant or agent ID."
            label="Agent ID"
            value={form.assistantReference}
            onChange={(value) => updateField("assistantReference", value)}
          />
          <Input
            help="Enter the API or connection value for this school's ElevenLabs agent."
            label="Agent API"
            value={form.integrationEndpoint}
            onChange={(value) => updateField("integrationEndpoint", value)}
          />
          </div>
        </div>

        <div className="mt-6 rounded-[24px] bg-brand-background p-4">
          <div className="font-semibold text-brand-text">Brand colors</div>
          <div className="mt-1 text-sm text-brand-muted">
            Colors are pulled automatically from the uploaded logo. You can still change them here if you
            want something different.
          </div>
        </div>

        <div className="mt-4 rounded-[24px] border border-slate-200 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-semibold text-brand-text">School logo</div>
              <div className="mt-1 text-sm text-brand-muted">
                Upload a logo, then the system will pull the main colors automatically.
              </div>
            </div>
            <label className="rounded-full bg-brand-primary px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white">
              Upload logo
              <input
                accept=".png,.jpg,.jpeg,.svg,.webp"
                className="hidden"
                onChange={(event) => void uploadLogo(event.target.files?.[0] ?? null)}
                type="file"
              />
            </label>
          </div>
          <div className="mt-4 rounded-2xl bg-brand-background px-4 py-3 text-sm text-brand-muted">
            {logoStatus}
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ColorField label="Primary" value={form.primaryColor} onChange={(value) => updateField("primaryColor", value)} />
          <ColorField label="Secondary" value={form.secondaryColor} onChange={(value) => updateField("secondaryColor", value)} />
          <ColorField label="Accent" value={form.accentColor} onChange={(value) => updateField("accentColor", value)} />
          <ColorField label="Background" value={form.backgroundColor} onChange={(value) => updateField("backgroundColor", value)} />
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

        <div className="mt-8 rounded-[24px] border border-slate-200 p-5">
          <div className="text-xs font-bold uppercase tracking-[0.3em] text-brand-secondary">School users</div>
          <h3 className="mt-2 text-xl font-semibold text-brand-text">Add users for this school</h3>
          <p className="mt-2 text-sm leading-6 text-brand-muted">
            Add the people at this school who should be able to log in and work on newsletters. They
            will get an invite email and can set their own password.
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Input label="Full name" value={userName} onChange={setUserName} />
            <Input label="Email" value={userEmail} onChange={setUserEmail} />
            <SelectField
              label="Access level"
              onChange={(value) => setUserRole(value as "school_admin" | "editor")}
              options={[
                ["school_admin", "School admin"],
                ["editor", "Editor"]
              ]}
              value={userRole}
            />
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              className="rounded-full bg-brand-primary px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white"
              onClick={() => void addSchoolUser()}
              type="button"
            >
              Send school invite
            </button>
          </div>

          <div className="mt-6 grid gap-3">
            {schoolMembers.map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-200 px-4 py-4">
                <div className="font-semibold text-brand-text">{item.fullName || item.email}</div>
                <div className="mt-1 text-sm text-brand-muted">
                  {item.email} · {item.role === "school_admin" ? "School admin" : "Editor"}
                </div>
              </div>
            ))}
            {schoolMembers.length === 0 ? (
              <div className="rounded-2xl bg-brand-background px-4 py-4 text-sm text-brand-muted">
                No users added for this school yet.
              </div>
            ) : null}
          </div>
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
