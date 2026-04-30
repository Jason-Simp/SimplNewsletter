"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

export async function authFetch(
  supabase: SupabaseClient | null,
  input: RequestInfo | URL,
  init?: RequestInit
) {
  const headers = new Headers(init?.headers);
  const activeSchoolId =
    typeof window !== "undefined" ? window.localStorage.getItem("the-wire-active-school-id") : null;

  if (supabase) {
    const {
      data: { session }
    } = await supabase.auth.getSession();

    if (session?.access_token) {
      headers.set("Authorization", `Bearer ${session.access_token}`);
    }
  }

  if (activeSchoolId?.trim()) {
    headers.set("x-active-school-id", activeSchoolId.trim());
  }

  return fetch(input, {
    ...init,
    headers
  });
}
