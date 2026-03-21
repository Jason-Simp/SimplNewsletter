"use client";

import { useEffect, useState } from "react";

import { useAuthSession } from "@/lib/auth-client";
import type { MemberRecord } from "@/types/member";
import type { SchoolProfile } from "@/types/school";

export function MemberManager() {
  const { session } = useAuthSession();
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [schools, setSchools] = useState<SchoolProfile[]>([]);
  const [status, setStatus] = useState("Loading members...");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"school_admin" | "editor">("editor");
  const [schoolId, setSchoolId] = useState("");
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
    async function loadData() {
      const [membersResponse, schoolsResponse] = await Promise.all([
        fetch("/api/members"),
        fetch("/api/schools")
      ]);

      const membersPayload = await membersResponse.json();
      const schoolsPayload = await schoolsResponse.json();

      const allMembers = membersPayload.data ?? [];
      const allSchools = schoolsPayload.data ?? [];
      const scopedMembers =
        member?.role === "company_admin"
          ? allMembers
          : allMembers.filter((item: MemberRecord) => item.schoolId === member?.schoolId);
      const scopedSchools =
        member?.role === "company_admin"
          ? allSchools
          : allSchools.filter((item: SchoolProfile) => item.id === member?.schoolId);

      setMembers(scopedMembers);
      setSchools(scopedSchools);
      setSchoolId(scopedSchools[0]?.id ?? "");
      setStatus("Members loaded.");
    }

    if (member || !session?.user?.email) {
      void loadData();
    }
  }, [member, session?.user?.email]);

  const inviteMember = async () => {
    setStatus("Saving member...");

    const response = await fetch("/api/members", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        schoolId,
        email,
        fullName,
        role,
        isActive: true
      })
    });

    const payload = await response.json();

    if (!response.ok) {
      setStatus(payload?.message ?? "Unable to save member.");
      return;
    }

    setMembers((current) => [payload.data, ...current.filter((item) => item.id !== payload.data.id)]);
    setEmail("");
    setFullName("");
    setRole("editor");
    setStatus("Member saved.");
  };

  return (
    <section className="grid gap-6">
      <div>
        <div className="text-xs font-bold uppercase tracking-[0.3em] text-brand-secondary">Members</div>
        <h1 className="mt-2 font-display text-4xl text-brand-navy">Login and access</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-brand-muted">
          {member?.role === "company_admin"
            ? "Manage member access across schools."
            : "Manage member access for your school dashboard and publishing team."}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded-editorial border border-slate-200 bg-[#F7F9FC] p-6">
          <div className="text-sm font-semibold text-brand-text">Invite member</div>
          <div className="mt-4 grid gap-3">
            <input
              className="rounded-2xl border border-slate-200 px-4 py-3"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email address"
              value={email}
            />
            <input
              className="rounded-2xl border border-slate-200 px-4 py-3"
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Full name"
              value={fullName}
            />
            <select
              className="rounded-2xl border border-slate-200 px-4 py-3"
              disabled={schools.length <= 1}
              onChange={(event) => setSchoolId(event.target.value)}
              value={schoolId}
            >
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>
            <select
              className="rounded-2xl border border-slate-200 px-4 py-3"
              onChange={(event) => setRole(event.target.value as "school_admin" | "editor")}
              value={role}
            >
              <option value="school_admin">school_admin</option>
              <option value="editor">editor</option>
            </select>
            <button
              className="rounded-full bg-brand-primary px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white"
              onClick={() => void inviteMember()}
            >
              Save member
            </button>
            <div className="rounded-2xl bg-white px-4 py-3 text-sm text-brand-muted">{status}</div>
          </div>
        </article>

        <article className="rounded-editorial border border-slate-200 bg-white p-6">
          <div className="text-sm font-semibold text-brand-text">Current members</div>
          <div className="mt-4 grid gap-3">
            {members.map((member) => (
              <div key={member.id} className="rounded-2xl border border-slate-200 px-4 py-4">
                <div className="font-semibold text-brand-text">{member.email}</div>
                <div className="mt-1 text-sm text-brand-muted">
                  {member.role} · {member.schoolName}
                </div>
                {member.fullName ? (
                  <div className="mt-1 text-sm text-brand-muted">{member.fullName}</div>
                ) : null}
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
