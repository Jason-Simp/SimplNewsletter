"use client";

import { useEffect, useState } from "react";

import { ActionNotice } from "@/components/ui/ActionNotice";
import { authFetch } from "@/lib/api-client";
import { useAuthSession } from "@/lib/auth-client";
import type { MemberRecord } from "@/types/member";
import type { SchoolProfile } from "@/types/school";

export function MemberManager() {
  const { session, supabase } = useAuthSession();
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [schools, setSchools] = useState<SchoolProfile[]>([]);
  const [status, setStatus] = useState("Loading members...");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"company_admin" | "school_admin" | "editor">("editor");
  const [schoolId, setSchoolId] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [member, setMember] = useState<MemberRecord | null>(null);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
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
    async function loadData() {
      const [membersResponse, schoolsResponse] = await Promise.all([
        authFetch(supabase, "/api/members"),
        authFetch(supabase, "/api/schools")
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
  }, [member, session?.user?.email, supabase]);

  const resetForm = () => {
    setEditingMemberId(null);
    setEmail("");
    setFullName("");
    setRole("editor");
    setIsActive(true);
    setSchoolId(schools[0]?.id ?? member?.schoolId ?? "");
  };

  const showNotice = (message: string, tone: "success" | "error" | "info") => {
    setNotice({ message, tone });
  };

  const visibleMembers = members
    .filter((item) => {
      if (statusFilter === "active") {
        return item.isActive;
      }

      if (statusFilter === "inactive") {
        return !item.isActive;
      }

      return true;
    })
    .filter((item) => {
      const haystack = `${item.email} ${item.fullName} ${item.schoolName} ${item.role}`.toLowerCase();
      return haystack.includes(search.trim().toLowerCase());
    });

  const saveOrUpdateMember = async () => {
    setStatus(editingMemberId ? "Updating member..." : "Saving member...");

    const response = await authFetch(supabase, "/api/members", {
      method: editingMemberId ? "PUT" : "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        id: editingMemberId,
        schoolId,
        email,
        fullName,
        role,
        isActive,
        invite: !editingMemberId
      })
    });

    const payload = await response.json();

    if (!response.ok) {
      const message = payload?.message ?? "Unable to save member.";
      setStatus(message);
      showNotice(message, "error");
      return;
    }

    const savedMember = (payload?.data?.member ?? payload?.data) as MemberRecord;

    setMembers((current) => [savedMember, ...current.filter((item) => item.id !== savedMember.id)]);

    if (savedMember.email.toLowerCase() === session?.user?.email?.toLowerCase()) {
      setMember(savedMember);
    }

    resetForm();
    const message =
      payload?.data?.warning ??
      (editingMemberId
        ? "Member updated."
        : payload?.data?.accessEmailMode === "reset"
          ? "Member saved. This account already existed, so a password reset email was sent."
          : "Member saved and invite sent.");
    setStatus(message);
    showNotice(message, payload?.data?.warning ? "info" : "success");
  };

  const startEdit = (memberToEdit: MemberRecord) => {
    setEditingMemberId(memberToEdit.id);
    setEmail(memberToEdit.email);
    setFullName(memberToEdit.fullName);
    setRole(memberToEdit.role);
    setIsActive(memberToEdit.isActive);
    setSchoolId(memberToEdit.schoolId);
    setStatus("Editing member.");
  };

  const removeMember = async (memberToRemove: MemberRecord) => {
    if (memberToRemove.email === session?.user?.email) {
      const message = "You cannot remove the account you are currently using.";
      setStatus(message);
      showNotice(message, "error");
      return;
    }

    const confirmed = window.confirm(`Remove ${memberToRemove.email} from this school?`);

    if (!confirmed) {
      return;
    }

    setStatus("Removing member...");

    const response = await authFetch(supabase, "/api/members", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        id: memberToRemove.id
      })
    });

    const payload = await response.json();

    if (!response.ok) {
      const message = payload?.message ?? "Unable to remove member.";
      setStatus(message);
      showNotice(message, "error");
      return;
    }

    setMembers((current) => current.filter((item) => item.id !== memberToRemove.id));
    if (editingMemberId === memberToRemove.id) {
      resetForm();
    }
    setStatus("Member removed.");
    showNotice("Member removed.", "success");
  };

  const runMemberAction = async (action: "password_reset" | "resend_invite") => {
    if (!editingMemberId || !email.trim()) {
      const message = "Open a member first so we know which account to manage.";
      setStatus(message);
      showNotice(message, "error");
      return;
    }

    setStatus(action === "password_reset" ? "Sending password reset..." : "Resending invite...");
    const targetMember = members.find((item) => item.id === editingMemberId);

    const response = await authFetch(supabase, "/api/members/actions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        action,
        email,
        schoolId: targetMember?.schoolId ?? schoolId
      })
    });

    const payload = await response.json();

    if (!response.ok) {
      const message = payload?.message ?? "Unable to complete that member action.";
      setStatus(message);
      showNotice(message, "error");
      return;
    }

    const message = payload?.message ?? "Member action completed.";
    setStatus(message);
    showNotice(message, "success");
  };

  return (
    <section className="grid gap-6">
      {notice ? <ActionNotice message={notice.message} onDismiss={() => setNotice(null)} tone={notice.tone} /> : null}
      <div>
        <div className="text-xs font-bold uppercase tracking-[0.3em] text-brand-secondary">Members</div>
        <h1 className="mt-2 font-display text-4xl text-brand-navy">Login and access</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-brand-muted">
          {member?.role === "company_admin"
            ? "Manage member access across schools."
            : "Manage member access for your school dashboard and publishing team."}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Visible members" value={String(visibleMembers.length)} />
        <SummaryCard label="Active members" value={String(members.filter((item) => item.isActive).length)} />
        <SummaryCard label="School admins" value={String(members.filter((item) => item.role === "school_admin").length)} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded-editorial border border-slate-200 bg-[#F7F9FC] p-6">
          <div className="text-sm font-semibold text-brand-text">
            {editingMemberId ? "Edit member" : "Invite member"}
          </div>
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
              onChange={(event) =>
                setRole(event.target.value as "company_admin" | "school_admin" | "editor")
              }
              value={role}
            >
              {member?.role === "company_admin" ? (
                <option value="company_admin">Company admin</option>
              ) : null}
              <option value="school_admin">School admin</option>
              <option value="editor">Editor</option>
            </select>
            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-brand-text">
              <input
                checked={isActive}
                onChange={(event) => setIsActive(event.target.checked)}
                type="checkbox"
              />
              Active member
            </label>
            <button
              className="rounded-full bg-brand-primary px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white"
              onClick={() => void saveOrUpdateMember()}
            >
              {editingMemberId ? "Update member" : "Save member"}
            </button>
            {editingMemberId ? (
              <button
                className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-brand-text"
                onClick={resetForm}
                type="button"
              >
                Cancel edit
              </button>
            ) : null}
            {editingMemberId ? (
              <div className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-sm font-semibold text-brand-text">Account actions</div>
                <p className="text-sm leading-6 text-brand-muted">
                  Send the member an email so they can set or reset their password without you having
                  to manage it directly.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-brand-text"
                    onClick={() => void runMemberAction("password_reset")}
                    type="button"
                  >
                    Send password reset
                  </button>
                  <button
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-brand-text"
                    onClick={() => void runMemberAction("resend_invite")}
                    type="button"
                  >
                    Resend invite
                  </button>
                </div>
              </div>
            ) : null}
            <div className="rounded-2xl bg-white px-4 py-3 text-sm text-brand-muted">{status}</div>
          </div>
        </article>

        <article className="rounded-editorial border border-slate-200 bg-white p-6">
          <div className="text-sm font-semibold text-brand-text">Current members</div>
          <div className="mt-4 grid gap-3">
            <div className="grid gap-3 md:grid-cols-[1fr_180px]">
              <input
                className="rounded-2xl border border-slate-200 px-4 py-3"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name, email, school, or role"
                value={search}
              />
              <select
                className="rounded-2xl border border-slate-200 px-4 py-3"
                onChange={(event) => setStatusFilter(event.target.value as "all" | "active" | "inactive")}
                value={statusFilter}
              >
                <option value="all">All members</option>
                <option value="active">Active only</option>
                <option value="inactive">Inactive only</option>
              </select>
            </div>
            {visibleMembers.map((member) => (
              <div key={member.id} className="rounded-2xl border border-slate-200 px-4 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-semibold text-brand-text">{member.fullName || member.email}</div>
                    <div className="mt-1 text-sm text-brand-muted">{member.email}</div>
                    <div className="mt-1 text-sm text-brand-muted">
                      {member.role === "school_admin" ? "School admin" : member.role === "company_admin" ? "Company admin" : "Editor"} · {member.schoolName}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] ${
                        member.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {member.isActive ? "Active" : "Inactive"}
                    </span>
                    <button
                      className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-brand-text"
                      onClick={() => startEdit(member)}
                      type="button"
                    >
                      Edit
                    </button>
                    <button
                      className="rounded-full bg-brand-secondary px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white"
                      onClick={() => void removeMember(member)}
                      type="button"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {visibleMembers.length === 0 ? (
              <div className="rounded-2xl bg-brand-background px-4 py-4 text-sm text-brand-muted">
                No members match the current search or filter.
              </div>
            ) : null}
          </div>
        </article>
      </div>
    </section>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-editorial border border-slate-200 bg-white p-6">
      <div className="text-xs font-bold uppercase tracking-[0.25em] text-brand-secondary">{label}</div>
      <div className="mt-3 text-2xl font-bold text-brand-navy">{value}</div>
    </article>
  );
}
