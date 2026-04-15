"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";

import { ActionNotice } from "@/components/ui/ActionNotice";
import { authFetch } from "@/lib/api-client";
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
  encryptedKnowledgeRef: "",
  webhookUrl: "",
  webhookSecret: ""
};

export function SchoolManager() {
  const { session, supabase } = useAuthSession();
  const [schools, setSchools] = useState<SchoolProfile[]>([]);
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [activeSchoolId, setActiveSchoolId] = useState("");
  const [form, setForm] = useState<SchoolProfile>(emptySchool);
  const [status, setStatus] = useState("Loading...");
  const [member, setMember] = useState<MemberRecord | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState<"school_admin" | "editor">("editor");
  const [logoStatus, setLogoStatus] = useState("Upload a logo to get started.");
  const [agentStatus, setAgentStatus] = useState("Not checked yet.");
  const [webhookStatus, setWebhookStatus] = useState("Not checked yet.");
  const [notice, setNotice] = useState<{ message: string; tone: "success" | "error" | "info" } | null>(null);

  useEffect(() => {
    async function loadMember() {
      if (!session?.user?.email) {
        return;
      }

      const response = await authFetch(supabase, "/api/members/me");
      const payload = response.ok ? await response.json() : null;
      setMember(payload?.data ?? null);
    }

    void loadMember();
  }, [session?.user?.email, supabase]);

  useEffect(() => {
    async function loadSchools() {
      const [schoolsResponse, membersResponse] = await Promise.all([
        authFetch(supabase, "/api/schools"),
        authFetch(supabase, "/api/members")
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
      setStatus("Ready.");
    }

    if (member || !session?.user?.email) {
      void loadSchools();
    }
  }, [member, session?.user?.email, supabase]);

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

  const showNotice = (message: string, tone: "success" | "error" | "info") => {
    setNotice({ message, tone });
  };

  const schoolMembers = useMemo(
    () => members.filter((item) => item.schoolId === activeSchoolId),
    [activeSchoolId, members]
  );
  const hasBasicSchoolInfo = Boolean(form.name.trim() && form.contactEmail.trim());
  const hasLogo = Boolean(form.logoUrl.trim());
  const hasAgent = Boolean(form.assistantReference.trim() && form.integrationEndpoint.trim());
  const hasWebhook = Boolean(form.webhookUrl.trim());
  const hasWebsitePublishing = Boolean(activeSchoolId);
  const readyItems = [
    {
      label: "School profile",
      ready: hasBasicSchoolInfo,
      detail: hasBasicSchoolInfo
        ? "School name and contact details are filled in."
        : "Add the school name and contact email first."
    },
    {
      label: "Logo and colors",
      ready: hasLogo,
      detail: hasLogo
        ? "Logo is ready and colors can be adjusted below."
        : "Upload the school logo so newsletters use the right brand."
    },
    {
      label: "Writing agent",
      ready: hasAgent,
      detail: hasAgent
        ? "Agent ID and Agent API are saved for this school."
        : "Add the Agent ID and Agent API so the system can write newsletters."
    },
    {
      label: "Client intranet",
      ready: true,
      detail: hasWebhook
        ? "The optional client intranet webhook is saved for this school."
        : "Optional: add a client intranet webhook only if this school needs an outside-system handoff."
    },
    {
      label: "Website archive",
      ready: hasWebsitePublishing,
      detail: hasWebsitePublishing
        ? "Archive and feed links are ready for the website team."
        : "Save the school once so the archive and feed links can be created."
    },
    {
      label: "School users",
      ready: schoolMembers.length > 0,
      detail:
        schoolMembers.length > 0
          ? `${schoolMembers.length} member${schoolMembers.length === 1 ? "" : "s"} can log in.`
          : "Add the first school user at the bottom of this page."
    }
  ];
  const readyCount = readyItems.filter((item) => item.ready).length;
  const schoolReadyToWrite = hasBasicSchoolInfo && hasLogo && hasAgent;
  const appOrigin = typeof window !== "undefined" ? window.location.origin : "";
  const feedUrl =
    activeSchoolId && appOrigin ? `${appOrigin}/schools/${activeSchoolId}/feed` : "";
  const archiveUrl =
    activeSchoolId && appOrigin ? `${appOrigin}/schools/${activeSchoolId}` : "";

  const copyFeedUrl = async () => {
    if (!feedUrl) {
      showNotice("Save the school profile first so the feed URL exists.", "error");
      return;
    }

    try {
      await navigator.clipboard.writeText(feedUrl);
      showNotice("Feed URL copied.", "success");
    } catch {
      showNotice("Could not copy the feed URL. You can still copy it manually.", "info");
    }
  };

  const copyArchiveUrl = async () => {
    if (!archiveUrl) {
      showNotice("Save the school profile first so the archive link exists.", "error");
      return;
    }

    try {
      await navigator.clipboard.writeText(archiveUrl);
      showNotice("Archive URL copied.", "success");
    } catch {
      showNotice("Could not copy the archive URL. You can still copy it manually.", "info");
    }
  };

  const saveSchool = async () => {
    setStatus("Saving...");
    const response = await authFetch(supabase, "/api/schools", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        ...form,
        generationProvider: "elevenlabs",
        knowledgeProvider: "none",
        syncProvider: "elevenlabs"
      })
    });
    const payload = await response.json();

    if (!response.ok) {
      const message = payload?.message ?? "We could not save this school yet.";
      setStatus(message);
      showNotice(message, "error");
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
    setStatus("Saved.");
    showNotice("School profile saved.", "success");
  };

  const uploadLogo = async (file: File | null) => {
    if (!file) {
      return;
    }

    if (!activeSchoolId) {
      setLogoStatus("Save the school first, then upload the logo.");
      showNotice("Save the school profile first, then upload the logo.", "error");
      return;
    }

    setLogoStatus("Uploading logo...");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("newsletterId", "");
      formData.append("schoolId", activeSchoolId);
      formData.append("organizationName", form.name || "school");

      const response = await authFetch(supabase, "/api/media/upload", {
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
      setLogoStatus("Logo uploaded. Colors updated automatically.");

      try {
        const localPreviewUrl = URL.createObjectURL(file);
        const palette = await extractPaletteFromImage(localPreviewUrl);
        URL.revokeObjectURL(localPreviewUrl);

        setForm((current) => ({
          ...current,
          logoUrl: nextLogoUrl,
          primaryColor: palette.primary,
          secondaryColor: palette.secondary,
          accentColor: palette.accent
        }));
        showNotice("Logo uploaded and colors updated.", "success");
      } catch {
        showNotice("Logo uploaded.", "success");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Logo upload failed.";
      setLogoStatus(message);
      showNotice(message, "error");
    }
  };

  const addSchoolUser = async () => {
    if (!activeSchoolId || !userEmail.trim()) {
      setStatus("Add a user email first.");
      showNotice("Add a user email before sending the invite.", "error");
      return;
    }

    setStatus("Sending invite...");

    const response = await authFetch(supabase, "/api/members", {
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
      const message = payload?.message ?? "We could not send that invite yet.";
      setStatus(message);
      showNotice(message, "error");
      return;
    }

    const nextMember = payload?.data?.member ?? payload?.data;

    setMembers((current) => [nextMember, ...current.filter((item) => item.id !== nextMember.id)]);
    setUserEmail("");
    setUserName("");
    setUserRole("editor");
    const message = payload?.data?.inviteSent ? "Invite email sent." : "User added.";
    setStatus(message);
    showNotice(message, "success");
  };

  const verifyAgent = async () => {
    if (!form.assistantReference.trim() || !form.integrationEndpoint.trim()) {
      const message = "Add both Agent ID and Agent API first.";
      setAgentStatus(message);
      showNotice(message, "error");
      return;
    }

    setAgentStatus("Checking connection...");

    const response = await authFetch(supabase, "/api/agent/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        schoolName: form.name,
        assistantReference: form.assistantReference,
        integrationEndpoint: form.integrationEndpoint,
        encryptedKnowledgeRef: form.encryptedKnowledgeRef
      })
    });

    const payload = await response.json();

    if (!response.ok) {
      const message = payload?.message ?? "Agent connection failed.";
      setAgentStatus(message);
      showNotice(message, "error");
      return;
    }

    const message = payload?.message ?? "Agent connected.";
    setAgentStatus(message);
    showNotice(message, "success");
  };

  const verifyWebhook = async () => {
    if (!activeSchoolId) {
      const message = "Save the school profile first.";
      setWebhookStatus(message);
      showNotice(message, "error");
      return;
    }

    if (!form.webhookUrl.trim()) {
      const message = "Add the client intranet webhook URL first.";
      setWebhookStatus(message);
      showNotice(message, "error");
      return;
    }

    setWebhookStatus("Checking connection...");

    const response = await authFetch(supabase, "/api/schools/webhook-test", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        schoolId: activeSchoolId
      })
    });

    const payload = await response.json();

    if (!response.ok) {
      const message = payload?.message ?? "Webhook connection failed.";
      setWebhookStatus(message);
      showNotice(message, "error");
      return;
    }

    const message = payload?.message ?? "Webhook connected.";
    setWebhookStatus(message);
    showNotice(message, "success");
  };

  return (
    <>
      {notice ? <ActionNotice message={notice.message} onDismiss={() => setNotice(null)} tone={notice.tone} /> : null}
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
            <h2 className="mt-2 font-display text-3xl text-brand-navy">School profile</h2>
          </div>
          <div className="rounded-full bg-brand-background px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-brand-primary">
            {status}
          </div>
        </div>

        <div className="mt-6 rounded-[24px] border border-slate-200 bg-[#F7F9FC] p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-brand-text">School setup progress</div>
              <div className="mt-1 text-sm leading-6 text-brand-muted">
                This is the checklist for getting one school fully ready to write and publish newsletters.
              </div>
            </div>
            <div
              className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] ${
                schoolReadyToWrite
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {schoolReadyToWrite ? "Ready to write" : `${readyCount}/${readyItems.length} ready`}
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {readyItems.map((item) => (
              <div key={item.label} className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-semibold text-brand-text">{item.label}</div>
                  <div
                    className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${
                      item.ready ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {item.ready ? "Ready" : "Needed"}
                  </div>
                </div>
                <div className="mt-2 text-sm leading-6 text-brand-muted">{item.detail}</div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            {!hasAgent ? (
              <button
                className="rounded-full bg-brand-primary px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white"
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                type="button"
              >
                Finish setup here
              </button>
            ) : null}
            {hasWebsitePublishing ? (
              <a
                className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-brand-text"
                href={archiveUrl}
                rel="noreferrer"
                target="_blank"
              >
                Open school archive
              </a>
            ) : null}
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
          </div>
        </div>

        <div className="mt-6 rounded-[24px] border border-slate-200 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.3em] text-brand-secondary">School writing agent</div>
              <div className="mt-2 text-sm leading-6 text-brand-muted">
                This is the one connection the system needs before it can write newsletters for this school.
              </div>
            </div>
            <div className="rounded-full bg-brand-background px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-brand-primary">
              ElevenLabs MVP
            </div>
          </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Input
            help="Paste the Agent ID for this school's writing agent."
            label="Agent ID"
            value={form.assistantReference}
            onChange={(value) => updateField("assistantReference", value)}
          />
          <Input
            help="Paste the Agent API for this school's writing agent."
            label="Agent API"
            value={form.integrationEndpoint}
            onChange={(value) => updateField("integrationEndpoint", value)}
          />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              className="rounded-full bg-brand-primary px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white"
              onClick={() => void verifyAgent()}
              type="button"
            >
              Check agent connection
            </button>
            <div
              className={`rounded-full px-4 py-2 text-sm ${
                agentStatus.toLowerCase().includes("connected")
                  ? "bg-emerald-100 text-emerald-700"
                  : agentStatus.toLowerCase().includes("checking")
                    ? "bg-amber-100 text-amber-700"
                    : agentStatus.toLowerCase().includes("not checked")
                      ? "bg-brand-background text-brand-muted"
                      : "bg-red-50 text-red-700"
              }`}
            >
              {agentStatus}
            </div>
          </div>
          <div className="mt-4 rounded-2xl bg-brand-background px-4 py-3 text-sm text-brand-muted">
            {hasAgent
              ? "The writing agent details are saved. Run the connection check if you want to confirm they still work."
              : "Once Agent ID and Agent API are filled in and saved, this school will be ready for the system to write newsletters."}
          </div>
        </div>

        <div className="mt-6 rounded-[24px] border border-slate-200 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.3em] text-brand-secondary">Client intranet webhook</div>
              <div className="mt-2 text-sm leading-6 text-brand-muted">
                This school-level webhook receives the notes, links, and uploaded media context when a newsletter request is submitted so your client intranet can track or process the job too.
              </div>
            </div>
            <div className="rounded-full bg-brand-background px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-brand-primary">
              Per-school connection
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Input
              help="Paste the webhook URL on the client's intranet that should receive newsletter request data."
              label="Webhook URL"
              value={form.webhookUrl}
              onChange={(value) => updateField("webhookUrl", value)}
            />
            <Input
              help="Optional secret or token for the client's intranet webhook."
              label="Webhook secret"
              value={form.webhookSecret}
              onChange={(value) => updateField("webhookSecret", value)}
            />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              className="rounded-full bg-brand-primary px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white"
              onClick={() => void verifyWebhook()}
              type="button"
            >
              Send test webhook
            </button>
            <div
              className={`rounded-full px-4 py-2 text-sm ${
                webhookStatus.toLowerCase().includes("successfully") || webhookStatus.toLowerCase().includes("connected")
                  ? "bg-emerald-100 text-emerald-700"
                  : webhookStatus.toLowerCase().includes("checking")
                    ? "bg-amber-100 text-amber-700"
                    : webhookStatus.toLowerCase().includes("not checked")
                      ? "bg-brand-background text-brand-muted"
                      : "bg-red-50 text-red-700"
              }`}
            >
              {webhookStatus}
            </div>
          </div>
          <div className="mt-4 rounded-2xl bg-brand-background px-4 py-3 text-sm text-brand-muted">
            {hasWebhook
              ? "When a user submits a newsletter request, The Wire will send the notes, links, and uploaded media context to this school's intranet webhook before the writing agent runs."
              : "This is optional. Add a webhook only if this school needs newsletter request data sent to an outside system like an intranet or automation tool."}
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
                accept=".png,.jpg,.jpeg,.gif,.svg,.webp"
                className="hidden"
                onChange={(event) => void uploadLogo(event.target.files?.[0] ?? null)}
                type="file"
              />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-4">
            <div className="h-16 w-32 overflow-hidden rounded-xl border border-slate-200 bg-white">
              <Image
                alt={`${form.name || "School"} logo`}
                className="h-full w-full object-contain"
                height={64}
                src={form.logoUrl}
                width={128}
              />
            </div>
            <div className="text-sm text-brand-muted">
              This logo will be used in the hosted newsletter, archive, and PDF view.
            </div>
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

        {activeSchoolId ? (
          <div className="mt-6 rounded-[24px] border border-slate-200 bg-[#F7F9FC] p-5">
            <div className="text-xs font-bold uppercase tracking-[0.3em] text-brand-secondary">Website publishing</div>
            <h3 className="mt-2 text-xl font-semibold text-brand-text">School website archive and feed</h3>
            <p className="mt-2 text-sm leading-6 text-brand-muted">
              This is the easiest website option. Published newsletters will appear on the hosted school
              archive and in the feed your web team can pull from.
            </p>
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-brand-text">
              {feedUrl || "Save the school profile to generate the feed URL."}
            </div>
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-brand-text">
              {archiveUrl || "Save the school profile to generate the archive URL."}
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                className="rounded-full bg-brand-primary px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white"
                onClick={() => void copyFeedUrl()}
                type="button"
              >
                Copy feed URL
              </button>
              <button
                className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-brand-text"
                onClick={() => void copyArchiveUrl()}
                type="button"
              >
                Copy archive URL
              </button>
              {archiveUrl ? (
                <a
                  className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-brand-text"
                  href={archiveUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  Open archive
                </a>
              ) : null}
            </div>
          </div>
        ) : null}

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
    </>
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
